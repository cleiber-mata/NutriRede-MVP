import {
  collection,
  doc,
  getDocs,
  query,
  updateDoc,
  where
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase/config';
import { FoodBatch, ProfileType, Reservation, UserAccount, UserProfileDoc } from '../types';

export interface UpdateUserProfileInput {
  userName?: string;
  userPhone?: string;
  address?: string;
  operationalNotes?: string;
}

export interface UpdateUserAccountInput {
  name?: string;
  phone?: string;
  address?: string;
  notes?: string;
}

/**
 * Atualiza dados cadastrais da conta em /users/{uid}
 * Impede estritamente alterações em uid, email, role ou accountStatus
 */
export async function updateUserAccount(
  userId: string,
  input: UpdateUserAccountInput,
  editorIdentifier: string
): Promise<void> {
  const userRef = doc(db, 'users', userId);
  const now = new Date().toISOString();

  const updatePayload: Record<string, any> = {
    updatedAt: now
  };

  if (input.name !== undefined && input.name.trim().length >= 2) {
    updatePayload.name = input.name.trim();
  }
  if (input.phone !== undefined) {
    updatePayload.phone = input.phone.trim();
  }
  if (input.address !== undefined) {
    updatePayload.address = input.address.trim();
  }
  if (input.notes !== undefined) {
    updatePayload.notes = input.notes.trim();
  }

  try {
    await updateDoc(userRef, updatePayload);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `users/${userId}`);
  }
}

/**
 * Atualiza dados de contato de um perfil de atuação específico em /profiles/{profileId}
 */
export async function updateUserProfileContact(
  profileId: string,
  input: UpdateUserProfileInput,
  editorIdentifier: string
): Promise<void> {
  const profileRef = doc(db, 'profiles', profileId);
  const now = new Date().toISOString();

  const updatePayload: Record<string, any> = {
    lastEditedAt: now,
    lastEditedBy: editorIdentifier
  };

  if (input.userName !== undefined && input.userName.trim().length >= 2) {
    updatePayload.userName = input.userName.trim();
  }
  if (input.userPhone !== undefined) {
    updatePayload.userPhone = input.userPhone.trim();
  }
  if (input.address !== undefined) {
    updatePayload.address = input.address.trim();
  }
  if (input.operationalNotes !== undefined) {
    updatePayload.operationalNotes = input.operationalNotes.trim();
  }

  try {
    await updateDoc(profileRef, updatePayload);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `profiles/${profileId}`);
  }
}

/**
 * Desativação segura de perfil (Usuário Titular)
 * Verifica pendências ativas antes de desativar:
 * - Doador: bloqueia se houver lotes DISPONIVEL ou RESERVADO
 * - Entidade: bloqueia se houver reservas PENDENTE_APROVACAO ou APROVADA
 * Preserva histórico integral (soft status DESATIVADO, nunca exclusão física)
 */
export async function deactivateProfileByUser(
  profile: UserProfileDoc,
  reason: string,
  userIdentifier: string
): Promise<void> {
  // 1. Verificação de integridade operacional
  if (profile.profileType === 'DONOR') {
    const batchesQuery = query(
      collection(db, 'food_batches'),
      where('donorId', '==', profile.userId),
      where('status', 'in', ['DISPONIVEL', 'RESERVADO'])
    );
    const snap = await getDocs(batchesQuery);
    if (!snap.empty) {
      throw new Error(
        'Não é possível desativar o perfil de Doador enquanto houver lotes disponíveis ou com reservas em andamento. Cancele as ofertas disponíveis primeiro.'
      );
    }
  } else if (profile.profileType === 'RECEIVER') {
    const resQuery = query(
      collection(db, 'reservations'),
      where('receiverId', '==', profile.userId),
      where('status', 'in', ['PENDENTE_APROVACAO', 'APROVADA'])
    );
    const snap = await getDocs(resQuery);
    if (!snap.empty) {
      throw new Error(
        'Não é possível desativar o perfil de Entidade Receptora enquanto houver solicitações de reserva pendentes ou aprovadas em andamento.'
      );
    }
  }

  // 2. Aplica desativação segura
  const profileRef = doc(db, 'profiles', profile.id);
  const now = new Date().toISOString();

  try {
    await updateDoc(profileRef, {
      status: 'DESATIVADO',
      deactivatedAt: now,
      deactivatedBy: userIdentifier,
      deactivationReason: reason.trim() || 'Desativação voluntária solicitada pelo usuário titular.',
      lastEditedAt: now
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `profiles/${profile.id}`);
  }
}

/**
 * Reativação de perfil solicitada pelo próprio usuário
 * Retorna para análise (status PENDENTE) com histórico de reativação
 */
export async function reactivateProfileByUser(
  profileId: string,
  userIdentifier: string
): Promise<void> {
  const profileRef = doc(db, 'profiles', profileId);
  const now = new Date().toISOString();

  try {
    await updateDoc(profileRef, {
      status: 'PENDENTE',
      reactivatedAt: now,
      decisionNotes: 'Reativação solicitada pelo usuário titular. Aguardando reavaliação da administração.',
      lastEditedAt: now
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `profiles/${profileId}`);
  }
}

/**
 * Desativação Administrativa de Perfil (OWNER / ADMIN)
 * Permite desativação cautelar ou por não conformidade com justificativa obrigatória
 */
export async function adminDeactivateProfile(
  profileId: string,
  adminIdentifier: string,
  reason: string
): Promise<void> {
  if (!reason.trim()) {
    throw new Error('A justificativa da desativação administrativa é obrigatória.');
  }

  const profileRef = doc(db, 'profiles', profileId);
  const now = new Date().toISOString();

  try {
    await updateDoc(profileRef, {
      status: 'DESATIVADO',
      deactivatedAt: now,
      deactivatedBy: adminIdentifier,
      deactivationReason: reason.trim(),
      lastEditedAt: now
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `profiles/${profileId}`);
  }
}

/**
 * Reativação Administrativa de Perfil (OWNER / ADMIN)
 * Restaura o perfil diretamente para APROVADO com registro de auditoria
 */
export async function adminReactivateProfile(
  profileId: string,
  adminIdentifier: string,
  notes?: string
): Promise<void> {
  const profileRef = doc(db, 'profiles', profileId);
  const now = new Date().toISOString();

  try {
    await updateDoc(profileRef, {
      status: 'APROVADO',
      decidedAt: now,
      decidedBy: adminIdentifier,
      decisionNotes: notes?.trim() || 'Perfil reativado e homologado pela administração.',
      reactivatedAt: now,
      lastEditedAt: now
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `profiles/${profileId}`);
  }
}
