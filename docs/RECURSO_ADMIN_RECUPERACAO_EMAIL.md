# NutriRede — Procedimento Administrativo Privilegiado de Recuperação e Alteração de E-mail
**Referência:** PRD NutriRede v1.1 | Governança OWNER/ADMIN | Ciclo 2.1

---

## 1. Contexto e Princípio de Segurança

No NutriRede, contas comuns e navegadores clientes **nunca possuem permissão para sobrescrever arbitrariamente credenciais ou e-mails de outros usuários**.

Para **endereços reais**, o titular solicita a alteração no aplicativo cliente com reautenticação (`reauthenticateWithCredential`), e o Firebase Authentication despacha um link de validação para a nova caixa postal via `verifyBeforeUpdateEmail`.

Em **ambientes de teste acadêmico ou homologação com caixas postais fictícias** (ex.: `doador1@nutrirede.org`, `entidade@ficticio.edu`), o recebimento de e-mails externos pode não estar disponível. Para evitar a criação de brechas de segurança no aplicativo cliente (como painéis com bypass no navegador), o PRD determina que tais exceções sejam tratadas exclusivamente por **procedimento administrativo privilegiado de servidor**, utilizando o **Firebase Admin SDK**.

---

## 2. Script Administrativo Privilegiado (Firebase Admin SDK)

Em ambiente seguro de servidor ou terminal de homologação com credenciais de Service Account:

### Exemplo de Script Node.js / TypeScript (`scripts/adminUpdateEmail.ts`):

```typescript
import * as admin from 'firebase-admin';

// Inicialização com chave de serviço privilegiada
admin.initializeApp({
  credential: admin.credential.applicationDefault(), // ou admin.credential.cert(serviceAccountKey)
});

const auth = admin.auth();
const db = admin.firestore();

interface UpdateEmailParams {
  userId: string;
  newEmail: string;
  adminIdentifier: string;
}

export async function adminOverrideUserEmail({
  userId,
  newEmail,
  adminIdentifier
}: UpdateEmailParams) {
  const trimmedEmail = newEmail.trim().toLowerCase();

  console.log(`[ADMIN-AUDIT] Iniciando alteração privilegiada de e-mail para UID: ${userId}`);

  // 1. Atualiza no Firebase Authentication com emailVerified = true
  // Evita o bloqueio de caixa postal fictícia sem acesso a links externos
  const updatedUserRecord = await auth.updateUser(userId, {
    email: trimmedEmail,
    emailVerified: true
  });

  console.log(`[ADMIN-AUDIT] Firebase Auth atualizado com sucesso: ${updatedUserRecord.email}`);

  // 2. Consulta registro atual em /users/{userId}
  const userRef = db.collection('users').doc(userId);
  const userSnap = await userRef.get();

  if (!userSnap.exists) {
    throw new Error(`Documento do usuário /users/${userId} não encontrado no Firestore.`);
  }

  const previousEmail = userSnap.data()?.email || '';
  const now = new Date().toISOString();

  // 3. Atualiza cadastro central /users/{userId} preservando UID
  await userRef.update({
    email: trimmedEmail,
    previousEmail: previousEmail,
    emailChangedAt: now,
    updatedAt: now,
    updatedBy: `ADMIN:${adminIdentifier}`
  });

  // 4. Sincroniza perfis associados em /profiles
  const profilesSnap = await db.collection('profiles').where('userId', '==', userId).get();
  const batch = db.batch();

  profilesSnap.forEach(pDoc => {
    batch.update(pDoc.ref, {
      userEmail: trimmedEmail,
      previousEmail: previousEmail,
      emailChangedAt: now,
      lastEditedAt: now,
      lastEditedBy: `ADMIN:${adminIdentifier}`
    });
  });

  // 5. Se o usuário for administrador, atualiza /admins/{userId}
  const adminDocRef = db.collection('admins').doc(userId);
  const adminSnap = await adminDocRef.get();
  if (adminSnap.exists) {
    batch.update(adminDocRef, {
      email: trimmedEmail,
      updatedAt: now
    });
  }

  // 6. Se for o proprietário do sistema, atualiza /system/config
  const sysConfigRef = db.collection('system').doc('config');
  const sysSnap = await sysConfigRef.get();
  if (sysSnap.exists && sysSnap.data()?.ownerUid === userId) {
    batch.update(sysConfigRef, {
      ownerEmail: trimmedEmail,
      updatedAt: now
    });
  }

  // 7. Registra auditoria imutável em /audit_logs
  const auditRef = db.collection('audit_logs').doc(`audit_${Date.now()}`);
  batch.set(auditRef, {
    id: auditRef.id,
    userId: userId,
    action: 'EMAIL_SYNCED',
    oldEmail: previousEmail,
    newEmail: trimmedEmail,
    timestamp: now,
    status: 'SUCCESS',
    details: `Alteração privilegiada efetuada por administrador: ${adminIdentifier}. Histórico e UID preservados.`
  });

  await batch.commit();

  console.log(`[ADMIN-AUDIT] Sincronização concluída com sucesso para ${profilesSnap.size} perfil(is).`);
  return {
    userId,
    previousEmail,
    newEmail: trimmedEmail,
    profilesCount: profilesSnap.size
  };
}
```

---

## 3. Fluxo de Sincronização Integrado na Interface do Usuário

Após a alteração realizada pelo Firebase Admin SDK (ou no Firebase Console):

1. O usuário pode efetuar login normalmente com o novo e-mail.
2. Caso o usuário já esteja autenticado na sessão do navegador:
   - Acessa o painel do usuário no NutriRede.
   - Clica no botão **"Alterar E-mail de Acesso"**.
   - Clica em **"Sincronizar E-mail Verificado com Cadastro"**.
3. O NutriRede executa `currentUser.reload()`, detecta a nova credencial autenticada no Firebase Authentication e sincroniza os documentos Firestore atômica e seguramente, registrando o e-mail anterior em `previousEmail` e gerando o log de auditoria em `/audit_logs`.

---

## 4. Garantias de Integridade

- **Preservação de UID:** O UID permanece estritamente idêntico.
- **Perfis Aprovados:** Nenhum perfil tem seu status de `APROVADO` alterado.
- **Doações (`/food_batches`) e Reservas (`/reservations`):** Todas as referências vinculadas a `donorId` e `receiverId` continuam válidas e consistentes.
- **Rastreabilidade:** O e-mail anterior fica registrado tanto nos dados cadastrais (`previousEmail`, `emailChangedAt`) quanto na coleção de auditoria (`/audit_logs`).
