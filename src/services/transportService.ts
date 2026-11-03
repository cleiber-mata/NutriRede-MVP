import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  runTransaction,
  setDoc,
  updateDoc,
  where
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase/config';
import {
  Delivery,
  FoodBatch,
  Occurrence,
  OccurrenceStage,
  OperationHistoryEvent,
  Pickup,
  ProfileType,
  Reservation,
  UserProfileDoc
} from '../types';

/**
 * RF09 — Consultar disponibilidade do perfil de Transportador
 */
export async function getTransporterAvailability(userId: string): Promise<'DISPONIVEL' | 'INDISPONIVEL'> {
  const profileId = `${userId}_TRANSPORTER`;
  try {
    const snap = await getDoc(doc(db, 'profiles', profileId));
    if (!snap.exists()) return 'INDISPONIVEL';
    const data = snap.data() as UserProfileDoc;
    if (data.status !== 'APROVADO') return 'INDISPONIVEL';
    return data.transporterAvailability || 'DISPONIVEL';
  } catch (err) {
    console.error('Erro ao consultar disponibilidade do transportador:', err);
    return 'INDISPONIVEL';
  }
}

/**
 * RF09 — Alterar disponibilidade do Transportador (DISPONÍVEL / INDISPONÍVEL)
 * Somente transportador APROVADO pode alterar sua disponibilidade
 */
export async function setTransporterAvailability(
  userId: string,
  availability: 'DISPONIVEL' | 'INDISPONIVEL',
  userName?: string
): Promise<void> {
  const profileId = `${userId}_TRANSPORTER`;
  const profileRef = doc(db, 'profiles', profileId);
  const now = new Date().toISOString();

  const profileSnap = await getDoc(profileRef);
  if (!profileSnap.exists()) {
    throw new Error('Perfil de transportador não encontrado.');
  }

  const profileData = profileSnap.data() as UserProfileDoc;
  if (profileData.status !== 'APROVADO') {
    throw new Error('Apenas transportadores com perfil APROVADO podem alterar a disponibilidade operacional.');
  }

  try {
    await updateDoc(profileRef, {
      transporterAvailability: availability,
      availabilityUpdatedAt: now,
      lastEditedAt: now,
      lastEditedBy: userName || userId
    });

    // Registra evento no histórico
    await logOperationHistory({
      objectType: 'COLETA',
      objectId: profileId,
      event: 'DISPONIBILIDADE_ALTERADA',
      actorUserId: userId,
      actorName: userName,
      activeProfile: 'TRANSPORTER',
      details: `Disponibilidade alterada para ${availability}.`
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `profiles/${profileId}`);
  }
}

export interface AcceptPickupParams {
  reservationId: string;
  transporterUserId: string;
  transporterName: string;
  transporterEmail: string;
  transporterPhone?: string;
}

/**
 * RF10 — Aceite Exclusivo de Coleta (Transação Atômica ACID)
 * Impede que dois transportadores aceitem simultaneamente a mesma coleta
 */
export async function acceptPickupAtomic(params: AcceptPickupParams): Promise<string> {
  const reservationRef = doc(db, 'reservations', params.reservationId);
  const pickupRef = doc(collection(db, 'pickups'));
  const now = new Date().toISOString();

  // Verifica se o transportador está aprovado e disponível
  const availability = await getTransporterAvailability(params.transporterUserId);
  if (availability !== 'DISPONIVEL') {
    throw new Error('Você precisa estar com o perfil APROVADO e marcar seu status como DISPONÍVEL para aceitar coletas.');
  }

  try {
    await runTransaction(db, async (transaction) => {
      // 1. Consulta e valida a reserva
      const resSnap = await transaction.get(reservationRef);
      if (!resSnap.exists()) {
        throw new Error('A solicitação de reserva não foi encontrada.');
      }

      const res = resSnap.data() as Reservation;

      if (res.status !== 'APROVADA') {
        throw new Error('Apenas reservas administrativamente APROVADAS podem receber atribuição de transporte.');
      }

      if (res.activePickupId) {
        throw new Error('Esta coleta já foi aceita por outro transportador.');
      }

      // 2. Consulta e valida o lote associado
      const batchRef = doc(db, 'food_batches', res.batchId);
      const batchSnap = await transaction.get(batchRef);
      if (!batchSnap.exists()) {
        throw new Error('O lote de alimentos associado não foi encontrado.');
      }

      const batch = batchSnap.data() as FoodBatch;

      if (batch.status !== 'RESERVADO') {
        throw new Error('O lote não está em estado reservado para coleta.');
      }

      if (batch.activePickupId) {
        throw new Error('O lote já possui uma coleta ativa vinculada.');
      }

      // Validação de validade
      if (new Date(batch.expirationDate).getTime() < new Date().setHours(0, 0, 0, 0)) {
        throw new Error('O alimento ultrapassou a data de validade. Coleta não permitida.');
      }

      // 3. Cria documento da Coleta (COLETA)
      const newPickup: Pickup = {
        id: pickupRef.id,
        reservationId: res.id,
        batchId: batch.id,
        foodName: batch.foodName,
        batchQuantity: batch.quantity,
        batchUnit: batch.unit,
        donorId: batch.donorId,
        donorName: batch.donorName,
        pickupAddress: batch.pickupAddress,
        pickupWindowStart: batch.pickupWindowStart,
        pickupWindowEnd: batch.pickupWindowEnd,
        receiverId: res.receiverId,
        receiverName: res.receiverName,
        transporterUserId: params.transporterUserId,
        transporterName: params.transporterName,
        transporterEmail: params.transporterEmail,
        transporterPhone: params.transporterPhone || '',
        status: 'ACEITA',
        acceptedAt: now,
        pickedUpAt: null
      };

      transaction.set(pickupRef, newPickup);

      // 4. Vincula coleta à reserva
      transaction.update(reservationRef, {
        activePickupId: pickupRef.id,
        transporterId: params.transporterUserId,
        transporterName: params.transporterName,
        updatedAt: now
      });

      // 5. Vincula coleta ao lote
      transaction.update(batchRef, {
        activePickupId: pickupRef.id,
        transporterId: params.transporterUserId,
        transporterName: params.transporterName,
        updatedAt: now
      });

      // 6. Registra histórico da operação
      const historyRef = doc(collection(db, 'operation_history'));
      const historyEvent: OperationHistoryEvent = {
        id: historyRef.id,
        objectType: 'COLETA',
        objectId: pickupRef.id,
        event: 'COLETA_ACEITA',
        actorUserId: params.transporterUserId,
        actorName: params.transporterName,
        activeProfile: 'TRANSPORTER',
        timestamp: now,
        details: `Coleta de ${batch.quantity} ${batch.unit} de ${batch.foodName} aceita pelo transportador.`,
        batchId: batch.id,
        reservationId: res.id
      };
      transaction.set(historyRef, historyEvent);
    });

    return pickupRef.id;
  } catch (error) {
    if (error instanceof Error && (error.message.includes('já foi aceita') || error.message.includes('DISPONÍVEL'))) {
      throw error;
    }
    handleFirestoreError(error, OperationType.WRITE, `pickups/${pickupRef.id}`);
  }
}

export interface ConfirmPickupParams {
  pickupId: string;
  transporterUserId: string;
  transporterName?: string;
}

/**
 * RF11 — Registrar Retirada dos Alimentos (Transportador Responsável)
 * Altera o estado do lote para EM_TRANSPORTE e da coleta para RETIRADA
 */
export async function confirmPickupAtomic(params: ConfirmPickupParams): Promise<void> {
  const pickupRef = doc(db, 'pickups', params.pickupId);
  const now = new Date().toISOString();

  try {
    await runTransaction(db, async (transaction) => {
      const pickupSnap = await transaction.get(pickupRef);
      if (!pickupSnap.exists()) {
        throw new Error('Registro de coleta não encontrado.');
      }

      const pickup = pickupSnap.data() as Pickup;

      // Validação de titularidade: somente o transportador vinculado pode confirmar
      if (pickup.transporterUserId !== params.transporterUserId) {
        throw new Error('Somente o transportador vinculado a esta coleta pode confirmar a retirada dos alimentos.');
      }

      if (pickup.status === 'RETIRADA') {
        throw new Error('A retirada deste lote já foi registrada previamente.');
      }

      if (pickup.status !== 'ACEITA') {
        throw new Error('A coleta não se encontra em estado apto para registro de retirada.');
      }

      const batchRef = doc(db, 'food_batches', pickup.batchId);
      const batchSnap = await transaction.get(batchRef);
      if (!batchSnap.exists()) {
        throw new Error('Lote de alimentos não encontrado.');
      }

      const batch = batchSnap.data() as FoodBatch;
      if (batch.status === 'EM_TRANSPORTE' || batch.status === 'CONCLUIDO') {
        throw new Error('O lote já se encontra em transporte ou já foi concluído.');
      }

      const resRef = doc(db, 'reservations', pickup.reservationId);

      // 1. Atualiza documento da Coleta para RETIRADA
      transaction.update(pickupRef, {
        status: 'RETIRADA',
        pickedUpAt: now
      });

      // 2. Atualiza Lote de Alimentos para EM_TRANSPORTE
      transaction.update(batchRef, {
        status: 'EM_TRANSPORTE',
        pickedUpAt: now,
        updatedAt: now
      });

      // 3. Atualiza Reserva com registro de retirada
      transaction.update(resRef, {
        pickedUpAt: now
      });

      // 4. Registra evento imutável de histórico
      const historyRef = doc(collection(db, 'operation_history'));
      const historyEvent: OperationHistoryEvent = {
        id: historyRef.id,
        objectType: 'COLETA',
        objectId: pickup.id,
        event: 'RETIRADA_REGISTRADA',
        actorUserId: params.transporterUserId,
        actorName: params.transporterName || pickup.transporterName,
        activeProfile: 'TRANSPORTER',
        timestamp: now,
        details: `Alimentos retirados pelo transportador no local de coleta. Lote em trânsito para entrega à entidade receptora.`,
        batchId: pickup.batchId,
        reservationId: pickup.reservationId
      };
      transaction.set(historyRef, historyEvent);
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `pickups/${params.pickupId}`);
  }
}

export interface ConfirmDeliveryParams {
  reservationId: string;
  receiverUserId: string;
  receiverName: string;
  notes?: string;
}

/**
 * RF12 — Confirmar Recebimento da Doação (Entidade Receptora Vinculada)
 * REGRA FUNDAMENTAL RN08: A doação somente estará concluída após confirmação pela Entidade Receptora!
 * Transição de estado: Lote passa para CONCLUIDO
 */
export async function confirmDeliveryAtomic(params: ConfirmDeliveryParams): Promise<string> {
  const reservationRef = doc(db, 'reservations', params.reservationId);
  const deliveryRef = doc(collection(db, 'deliveries'));
  const now = new Date().toISOString();

  try {
    await runTransaction(db, async (transaction) => {
      const resSnap = await transaction.get(reservationRef);
      if (!resSnap.exists()) {
        throw new Error('Reserva não encontrada.');
      }

      const res = resSnap.data() as Reservation;

      // Validação de titularidade: somente a entidade receptora vinculada pode confirmar
      if (res.receiverId !== params.receiverUserId) {
        throw new Error('Apenas a entidade receptora titular desta reserva pode confirmar o recebimento da doação.');
      }

      if (res.completedAt || res.deliveryId) {
        throw new Error('O recebimento desta doação já foi confirmado previamente.');
      }

      // Validação de Lote
      const batchRef = doc(db, 'food_batches', res.batchId);
      const batchSnap = await transaction.get(batchRef);
      if (!batchSnap.exists()) {
        throw new Error('Lote de alimentos não encontrado.');
      }

      const batch = batchSnap.data() as FoodBatch;

      // RN08: Exige que a retirada tenha sido efetivamente registrada (status EM_TRANSPORTE)
      if (batch.status !== 'EM_TRANSPORTE') {
        throw new Error(
          'Não é permitido concluir a doação antes da retirada efetiva dos alimentos pelo transportador.'
        );
      }

      // Validação de Coleta
      if (!res.activePickupId) {
        throw new Error('Nenhuma coleta ativa vinculada a esta reserva.');
      }

      const pickupRef = doc(db, 'pickups', res.activePickupId);
      const pickupSnap = await transaction.get(pickupRef);
      if (!pickupSnap.exists()) {
        throw new Error('Registro de coleta associado não foi encontrado.');
      }

      const pickup = pickupSnap.data() as Pickup;
      if (pickup.status !== 'RETIRADA') {
        throw new Error('A coleta precisa ter sido registrada como retirada antes da confirmação de entrega.');
      }

      // 1. Cria documento de Entrega (ENTREGA)
      const newDelivery: Delivery = {
        id: deliveryRef.id,
        pickupId: pickup.id,
        reservationId: res.id,
        batchId: batch.id,
        foodName: batch.foodName,
        batchQuantity: batch.quantity,
        batchUnit: batch.unit,
        donorId: batch.donorId,
        donorName: batch.donorName,
        receiverUserId: params.receiverUserId,
        receiverName: params.receiverName,
        transporterUserId: pickup.transporterUserId,
        transporterName: pickup.transporterName,
        confirmedAt: now,
        notes: params.notes?.trim() || ''
      };

      transaction.set(deliveryRef, newDelivery);

      // 2. Transição final do lote para CONCLUIDO (RN08)
      transaction.update(batchRef, {
        status: 'CONCLUIDO',
        completedAt: now,
        updatedAt: now
      });

      // 3. Atualiza reserva com vínculo de entrega e conclusão
      transaction.update(reservationRef, {
        completedAt: now,
        deliveryId: deliveryRef.id,
        updatedAt: now
      });

      // 4. Registra histórico oficial de entrega concluída
      const historyRef = doc(collection(db, 'operation_history'));
      const historyEvent: OperationHistoryEvent = {
        id: historyRef.id,
        objectType: 'ENTREGA',
        objectId: deliveryRef.id,
        event: 'RECEBIMENTO_CONFIRMADO',
        actorUserId: params.receiverUserId,
        actorName: params.receiverName,
        activeProfile: 'RECEIVER',
        timestamp: now,
        details: `Recebimento de ${batch.quantity} ${batch.unit} de ${batch.foodName} confirmado pela entidade receptora. Doação CONCLUÍDA com sucesso (RN08).`,
        batchId: batch.id,
        reservationId: res.id
      };
      transaction.set(historyRef, historyEvent);
    });

    return deliveryRef.id;
  } catch (error) {
    if (error instanceof Error && error.message.includes('Não é permitido concluir')) {
      throw error;
    }
    handleFirestoreError(error, OperationType.WRITE, `deliveries/${deliveryRef.id}`);
  }
}

export interface CreateOccurrenceInput {
  operationId: string;
  batchId: string;
  foodName?: string;
  authorUserId: string;
  authorName: string;
  authorProfile: ProfileType | 'ADMIN';
  stage: OccurrenceStage;
  type: string;
  description: string;
}

/**
 * RF14 — Registrar Ocorrência Operacional
 * Permite que participantes autorizados reportem problemas sem cancelar nem apagar histórico
 */
export async function createOccurrence(input: CreateOccurrenceInput): Promise<string> {
  const desc = input.description.trim();
  if (!desc || desc.length < 5) {
    throw new Error('A descrição da ocorrência é obrigatória e deve conter pelo menos 5 caracteres.');
  }

  const occRef = doc(collection(db, 'occurrences'));
  const now = new Date().toISOString();

  const newOccurrence: Occurrence = {
    id: occRef.id,
    operationId: input.operationId,
    batchId: input.batchId,
    foodName: input.foodName || '',
    authorUserId: input.authorUserId,
    authorName: input.authorName,
    authorProfile: input.authorProfile,
    stage: input.stage,
    type: input.type,
    description: desc,
    createdAt: now
  };

  try {
    await setDoc(occRef, newOccurrence);

    // Registra evento no histórico
    await logOperationHistory({
      objectType: 'OCORRENCIA',
      objectId: occRef.id,
      event: 'OCORRENCIA_REGISTRADA',
      actorUserId: input.authorUserId,
      actorName: input.authorName,
      activeProfile: input.authorProfile,
      details: `[${input.stage}] ${input.type}: ${desc}`,
      batchId: input.batchId,
      reservationId: input.operationId
    });

    return occRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `occurrences/${occRef.id}`);
  }
}

/**
 * Registra um evento no histórico de auditoria operacional (/operation_history)
 */
export async function logOperationHistory(
  event: Omit<OperationHistoryEvent, 'id' | 'timestamp'>
): Promise<void> {
  const historyRef = doc(collection(db, 'operation_history'));
  const historyItem: OperationHistoryEvent = {
    id: historyRef.id,
    timestamp: new Date().toISOString(),
    ...event
  };

  try {
    await setDoc(historyRef, historyItem);
  } catch (err) {
    console.warn('Falha ao registrar histórico de operação (não bloqueante):', err);
  }
}

/**
 * RF15 — Consultar histórico de eventos de uma operação ou participante
 */
export async function getOperationHistoryByBatch(batchId: string): Promise<OperationHistoryEvent[]> {
  try {
    const q = query(
      collection(db, 'operation_history'),
      where('batchId', '==', batchId),
      orderBy('timestamp', 'asc'),
      limit(50)
    );
    const snap = await getDocs(q);
    const list: OperationHistoryEvent[] = [];
    snap.forEach((d) => list.push(d.data() as OperationHistoryEvent));
    return list;
  } catch (e) {
    // Se não houver índice composto, busca simples sem ordenação estrita
    try {
      const simpleQuery = query(
        collection(db, 'operation_history'),
        where('batchId', '==', batchId),
        limit(50)
      );
      const snap = await getDocs(simpleQuery);
      const list: OperationHistoryEvent[] = [];
      snap.forEach((d) => list.push(d.data() as OperationHistoryEvent));
      list.sort((a, b) => a.timestamp.localeCompare(b.timestamp));
      return list;
    } catch {
      return [];
    }
  }
}

/**
 * Consulta ocorrências vinculadas a um lote específico
 */
export async function getOccurrencesByBatch(batchId: string): Promise<Occurrence[]> {
  try {
    const q = query(
      collection(db, 'occurrences'),
      where('batchId', '==', batchId),
      limit(50)
    );
    const snap = await getDocs(q);
    const list: Occurrence[] = [];
    snap.forEach((d) => list.push(d.data() as Occurrence));
    list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return list;
  } catch (e) {
    console.warn('Erro ao consultar ocorrências:', e);
    return [];
  }
}
