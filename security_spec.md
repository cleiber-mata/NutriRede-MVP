# NutriRede — Especificação de Segurança e Auditoria Firestore (Ciclo 1)

## 1. Invariantes de Dados (Data Invariants)
1. **Identidade Inviolável (User Identity)**: Um usuário comum só pode ler seu próprio documento `/users/{userId}` e só pode criá-lo com `uid == request.auth.uid`. Não pode alterar `uid` nem forjar privilégios administrativos.
2. **Isolamento de Perfis (Profile Identity)**: Cada registro `/profiles/{profileId}` tem ID estrito `${userId}_${profileType}`. Um usuário comum só pode criar perfis para si mesmo (`userId == request.auth.uid`), e o status inicial OBRIGATORIAMENTE deve ser `"PENDENTE"`.
3. **Imutabilidade de Decisão por Usuário Comum**: Usuários comuns NÃO podem alterar os campos `status`, `decidedAt`, `decidedBy` ou `decisionNotes`. Apenas administradores previamente autenticados e reconhecidos em `/admins/{adminId}` ou pelo e-mail do operador do sistema têm permissão de aprovar ou rejeitar perfis.
4. **Independência de Perfis**: A aprovação ou rejeição de um perfil em `/profiles/{userId}_DONOR` não afeta nem altera automaticamente `/profiles/{userId}_TRANSPORTER`.
5. **Auditoria de Decisões**: Qualquer atualização de status administrativo deve registrar `decidedBy` e a data de decisão.
6. **Proteção Administrativa**: O documento em `/admins/{adminId}` só pode ser lido por administradores autenticados e não pode ser criado ou alterado por usuários públicos.

---

## 2. As 12 Cargas Invasivas ("Dirty Dozen" Payloads)

1. **Payload 1 (Self-Approval Attack)**: Usuário comum envia `status: 'APROVADO'` no momento do cadastro do seu perfil. (DEVE SER REJEITADO - apenas status 'PENDENTE' na criação pelo usuário).
2. **Payload 2 (User Identity Spoofing)**: Usuário autenticado como UID `user_abc` tenta criar documento em `/users/user_xyz` ou com `uid: 'user_xyz'`. (DEVE SER REJEITADO).
3. **Payload 3 (Profile Hijacking)**: Usuário tenta criar `/profiles/user_xyz_DONOR` atribuindo `userId: 'user_xyz'`. (DEVE SER REJEITADO).
4. **Payload 4 (Privilege Escalation via Shadow Fields)**: Usuário tenta injetar campo `role: 'ADMIN'` ou `isAdmin: true` em `/users/{uid}`. (DEVE SER REJEITADO).
5. **Payload 5 (Admin Impersonation in Update)**: Usuário comum tenta enviar `update` em `/profiles/{profileId}` modificando `status` de 'PENDENTE' para 'APROVADO'. (DEVE SER REJEITADO).
6. **Payload 6 (Admin Collection Self-Provisioning)**: Usuário anônimo ou usuário comum tenta gravar em `/admins/{uid}` para se tornar administrador. (DEVE SER REJEITADO).
7. **Payload 7 (Unauthenticated Read of Profiles)**: Cliente não autenticado tenta listar `/profiles` ou `/users`. (DEVE SER REJEITADO).
8. **Payload 8 (Foreign User List Scraping)**: Usuário comum tenta listar todos os `/users` ou perfis de outros usuários sem filtro `userId == request.auth.uid`. (DEVE SER REJEITADO).
9. **Payload 9 (ID Character Overflow / Poisoning)**: Requisição com `userId` contendo string de 2KB ou caracteres de injeção de script. (DEVE SER REJEITADO).
10. **Payload 10 (Invalid Profile Type Mutation)**: Tentativa de criar perfil com `profileType: 'SUPERUSER'` ou tipo desconhecido. (DEVE SER REJEITADO).
11. **Payload 11 (Decision Erasure Attack)**: Usuário comum tenta apagar registros de perfil já rejeitado ou alterar `decidedBy`. (DEVE SER REJEITADO).
12. **Payload 12 (Immortal Field Modification)**: Usuário tenta alterar `userId` ou `profileType` em atualização existente. (DEVE SER REJEITADO).

---

## 3. Test Runner (firestore.rules.test.ts)
Arquitetura de testes para validar se todos os 12 vetores retornam `PERMISSION_DENIED`.
