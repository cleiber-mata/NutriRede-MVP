import {
  EmailAuthProvider,
  reauthenticateWithCredential,
  verifyBeforeUpdateEmail,
  updateEmail,
  User
} from 'firebase/auth';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  updateDoc,
  where
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase/config';
import { SecurityAuditLog, UserAccount } from '../types';

export interface RequestEmailChangeResult {
  success: boolean;
  message: string;
  isImmediateUpdate?: boolean;
}

export interface SyncEmailResult {
  success: boolean;
  alreadySynced: boolean;
  oldEmail?: string;
  newEmail: string;
  profilesUpdatedCount: number;
}

/**
 * Traduz códigos de erro do Firebase Auth para mensagens claras em português
 */
export function getAuthErrorMessage(errorCode: string): string {
  switch (errorCode) {
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'A senha atual informada está incorreta.';
    case 'auth/requires-recent-login':
      return 'Por motivos de segurança, informe sua senha atual para reautenticar antes de alterar o e-mail.';
    case 'auth/email-already-in-use':
      return 'O novo e-mail informado já está em uso por outra conta no sistema.';
    case 'auth/invalid-email':
      return 'O formato do endereço de e-mail é inválido.';
    case 'auth/too-many-requests':
      return 'Muitas tentativas consecutivas. Por favor, aguarde alguns instantes e tente novamente.';
    case 'auth/user-mismatch':
      return 'As credenciais fornecidas não correspondem ao usuário atual.';
    case 'auth/weak-password':
      return 'A senha fornecida é muito fraca.';
    case 'auth/user-not-found':
      return 'Usuário não encontrado na base de autenticação.';
    default:
      return 'Falha na autenticação ou alteração de credencial. Verifique os dados informados.';
  }
}

/**
 * Solicitação segura de alteração de e-mail pelo titular da conta (RF01 / PRD NutriRede)
 * 1. Reautentica o usuário com a senha atual para proteção contra sequestro de sessão
 * 2. Emite link de confirmação do novo e-mail via verifyBeforeUpdateEmail do Firebase Auth
 * 3. Registra evento de auditoria
 */
export async function requestUserEmailChange(
  currentUser: User,
  newEmail: string,
  currentPassword?: string
): Promise<RequestEmailChangeResult> {
  const trimmedNewEmail = newEmail.trim().toLowerCase();

  // Validação básica de formato
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(trimmedNewEmail)) {
    throw new Error('Informe um endereço de e-mail válido.');
  }

  if (currentUser.email && currentUser.email.toLowerCase() === trimmedNewEmail) {
    throw new Error('O novo e-mail deve ser diferente do e-mail atualmente em uso.');
  }

  // 1. Reautenticação se houver provedor de senha ou senha informada
  const isPasswordUser = currentUser.providerData.some(p => p.providerId === 'password');
  if (isPasswordUser || currentPassword) {
    if (!currentPassword) {
      throw new Error('Informe sua senha atual para confirmar a solicitação.');
    }
    if (!currentUser.email) {
      throw new Error('E-mail atual do usuário não encontrado para reautenticação.');
    }
    const credential = EmailAuthProvider.credential(currentUser.email, currentPassword);
    await reauthenticateWithCredential(currentUser, credential);
  }

  let isImmediate = false;

  // 2. Executa a alteração segura
  try {
    // Método oficial moderno do Firebase: envia link de confirmação à nova caixa postal
    await verifyBeforeUpdateEmail(currentUser, trimmedNewEmail);
  } catch (err: any) {
    // Se o Firebase project estiver configurado para permitir updateEmail direto
    if (err.code === 'auth/operation-not-allowed') {
      await updateEmail(currentUser, trimmedNewEmail);
      isImmediate = true;
    } else {
      throw err;
    }
  }

  // 3. Registra auditoria da solicitação
  try {
    const logId = `audit_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const auditRecord: SecurityAuditLog = {
      id: logId,
      userId: currentUser.uid,
      action: 'CHANGE_EMAIL_REQUESTED',
      oldEmail: currentUser.email || '',
      newEmailRequested: trimmedNewEmail,
      timestamp: new Date().toISOString(),
      status: 'VERIFICATION_SENT',
      details: isImmediate
        ? 'E-mail atualizado imediatamente via Firebase Auth.'
        : 'Link de confirmação enviado para a nova caixa postal.'
    };
    await setDoc(doc(db, 'audit_logs', logId), auditRecord);
  } catch (logErr) {
    console.warn('Registro em /audit_logs falhou (não bloqueante):', logErr);
  }

  return {
    success: true,
    isImmediateUpdate: isImmediate,
    message: isImmediate
      ? 'E-mail de acesso atualizado com sucesso no Firebase Authentication!'
      : `Link de confirmação enviado para ${trimmedNewEmail}. Acesse a caixa postal do novo e-mail e clique no link de validação para efetivar a mudança.`
  };
}

/**
 * Sincroniza o e-mail confirmado do Firebase Authentication com a conta em /users e perfis em /profiles
 * Preserva estritamente o UID, status de perfis aprovados, lotes e reservas.
 */
export async function syncVerifiedUserEmail(currentUser: User): Promise<SyncEmailResult> {
  // Recarrega os dados do Firebase Auth para capturar o e-mail atualizado após clique no link
  await currentUser.reload();

  const currentAuthEmail = currentUser.email;
  if (!currentAuthEmail) {
    throw new Error('Não foi possível identificar o e-mail atual no Firebase Authentication.');
  }

  // Consulta conta em /users/{uid}
  const userRef = doc(db, 'users', currentUser.uid);
  const userSnap = await getDoc(userRef);

  if (!userSnap.exists()) {
    throw new Error('Conta cadastral do usuário não encontrada no Firestore.');
  }

  const userData = userSnap.data() as UserAccount;
  const previousEmail = userData.email;

  // Se já estiver idêntico, nada a sincronizar
  if (userData.email.toLowerCase() === currentAuthEmail.toLowerCase()) {
    return {
      success: true,
      alreadySynced: true,
      newEmail: currentAuthEmail,
      profilesUpdatedCount: 0
    };
  }

  const now = new Date().toISOString();

  // 1. Atualiza conta central /users/{uid}
  try {
    await updateDoc(userRef, {
      email: currentAuthEmail,
      previousEmail: previousEmail,
      emailChangedAt: now,
      updatedAt: now
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `users/${currentUser.uid}`);
  }

  // 2. Atualiza todos os perfis do usuário em /profiles/{id}
  let profilesCount = 0;
  try {
    const profilesQuery = query(collection(db, 'profiles'), where('userId', '==', currentUser.uid));
    const profilesSnap = await getDocs(profilesQuery);

    for (const pDoc of profilesSnap.docs) {
      await updateDoc(doc(db, 'profiles', pDoc.id), {
        userEmail: currentAuthEmail,
        previousEmail: previousEmail,
        emailChangedAt: now,
        lastEditedAt: now,
        lastEditedBy: currentAuthEmail
      });
      profilesCount++;
    }
  } catch (err) {
    console.error('Falha ao sincronizar perfis:', err);
  }

  // 3. Se for administrador, sincroniza /admins/{uid}
  try {
    const adminRef = doc(db, 'admins', currentUser.uid);
    const adminSnap = await getDoc(adminRef);
    if (adminSnap.exists()) {
      await updateDoc(adminRef, {
        email: currentAuthEmail,
        updatedAt: now
      });
    }
  } catch {
    // Usuário comum não possui documento em /admins, ignorar
  }

  // 4. Se for proprietário do sistema, atualiza /system/config
  try {
    const sysRef = doc(db, 'system', 'config');
    const sysSnap = await getDoc(sysRef);
    if (sysSnap.exists() && sysSnap.data().ownerUid === currentUser.uid) {
      await updateDoc(sysRef, {
        ownerEmail: currentAuthEmail
      });
    }
  } catch {
    // Ignorar se não for owner
  }

  // 5. Registra auditoria de sincronização concluída
  try {
    const logId = `audit_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const auditRecord: SecurityAuditLog = {
      id: logId,
      userId: currentUser.uid,
      action: 'EMAIL_SYNCED',
      oldEmail: previousEmail,
      newEmail: currentAuthEmail,
      timestamp: now,
      status: 'SUCCESS',
      details: `E-mail sincronizado em /users e ${profilesCount} perfis. UID, aprovações e histórico mantidos intactos.`
    };
    await setDoc(doc(db, 'audit_logs', logId), auditRecord);
  } catch (logErr) {
    console.warn('Registro em /audit_logs falhou (não bloqueante):', logErr);
  }

  return {
    success: true,
    alreadySynced: false,
    oldEmail: previousEmail,
    newEmail: currentAuthEmail,
    profilesUpdatedCount: profilesCount
  };
}
