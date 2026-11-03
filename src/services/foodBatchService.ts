import {
  collection,
  doc,
  runTransaction,
  setDoc,
  updateDoc
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase/config';
import { FoodBatch, Reservation } from '../types';

export interface CreateBatchInput {
  foodName: string;
  category: FoodBatch['category'];
  quantity: number;
  unit: FoodBatch['unit'];
  expirationDate: string;
  storageCondition: string;
  pickupAddress: string;
  pickupWindowStart: string;
  pickupWindowEnd: string;
  fitForConsumption: boolean;
  donorId: string;
  donorName: string;
  donorEmail: string;
  donorPhone?: string;
}

export interface ReserveBatchInput {
  batchId: string;
  receiverId: string;
  receiverName: string;
  receiverEmail: string;
  receiverPhone?: string;
}

/**
 * RF04 — Cadastrar novo lote de alimentos (Doador Aprovado)
 */
export async function createFoodBatch(input: CreateBatchInput): Promise<string> {
  // Validações obrigatórias
  if (!input.foodName.trim() || input.foodName.length < 3) {
    throw new Error('Identificação do alimento deve conter no mínimo 3 caracteres.');
  }
  if (!input.quantity || input.quantity <= 0) {
    throw new Error('A quantidade do lote deve ser maior que zero.');
  }
  if (!input.expirationDate) {
    throw new Error('A data de validade é obrigatória.');
  }
  if (new Date(input.expirationDate).getTime() < new Date().setHours(0, 0, 0, 0)) {
    throw new Error('O alimento está com data de validade vencida. Publicação bloqueada.');
  }
  if (!input.pickupWindowStart || !input.pickupWindowEnd) {
    throw new Error('A janela de retirada (início e término) é obrigatória.');
  }
  const startMs = new Date(input.pickupWindowStart).getTime();
  const endMs = new Date(input.pickupWindowEnd).getTime();
  // Início deve ser igual ou posterior ao momento do cadastro (tolerância de 5 minutos)
  if (startMs < Date.now() - 5 * 60 * 1000) {
    throw new Error('O início da retirada deve ser igual ou posterior ao momento do cadastro.');
  }
  if (startMs >= endMs) {
    throw new Error('O horário de término da retirada deve ser estritamente posterior ao início.');
  }
  // Duração máxima da janela de retirada: 72 horas
  const durationHours = (endMs - startMs) / (1000 * 60 * 60);
  if (durationHours > 72) {
    throw new Error('A janela de retirada não pode ultrapassar 72 horas. Ajuste a data ou o horário de término.');
  }
  if (new Date(input.pickupWindowEnd) > new Date(input.expirationDate + 'T23:59:59')) {
    throw new Error('O término da janela de retirada não pode ultrapassar a data de validade do alimento.');
  }
  if (!input.fitForConsumption) {
    throw new Error('É obrigatória a declaração explícita de que o alimento está próprio para consumo.');
  }
  if (!input.pickupAddress.trim()) {
    throw new Error('O endereço do local de retirada é obrigatório.');
  }
  if (!input.storageCondition.trim()) {
    throw new Error('As condições de conservação são obrigatórias.');
  }

  const batchRef = doc(collection(db, 'food_batches'));
  const now = new Date().toISOString();

  const newBatch: FoodBatch = {
    id: batchRef.id,
    donorId: input.donorId,
    donorName: input.donorName,
    donorEmail: input.donorEmail,
    donorPhone: input.donorPhone || '',
    foodName: input.foodName.trim(),
    category: input.category,
    quantity: Number(input.quantity),
    unit: input.unit,
    expirationDate: input.expirationDate,
    storageCondition: input.storageCondition.trim(),
    pickupAddress: input.pickupAddress.trim(),
    pickupWindowStart: input.pickupWindowStart,
    pickupWindowEnd: input.pickupWindowEnd,
    fitForConsumption: true,
    status: 'DISPONIVEL',
    activeReservationId: null,
    activeReservationStatus: null,
    reservedBy: null,
    reservedByName: null,
    createdAt: now,
    updatedAt: now
  };

  try {
    await setDoc(batchRef, newBatch);
    return batchRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `food_batches/${batchRef.id}`);
  }
}

/**
 * Doador cancelando sua própria oferta de lote disponível
 */
export async function cancelFoodBatch(batchId: string, donorId: string): Promise<void> {
  const batchRef = doc(db, 'food_batches', batchId);
  try {
    await updateDoc(batchRef, {
      status: 'CANCELADO',
      updatedAt: new Date().toISOString()
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `food_batches/${batchId}`);
  }
}

/**
 * RF06 — Reserva Exclusiva Atômica de Lote (RN04)
 * Garante bloqueio contra reservas simultâneas na camada de persistência
 */
export async function reserveFoodBatchAtomic(input: ReserveBatchInput): Promise<string> {
  const batchRef = doc(db, 'food_batches', input.batchId);
  const reservationRef = doc(collection(db, 'reservations'));
  const now = new Date().toISOString();

  try {
    await runTransaction(db, async (transaction) => {
      const batchSnap = await transaction.get(batchRef);

      if (!batchSnap.exists()) {
        throw new Error('O lote solicitado não foi encontrado no sistema.');
      }

      const batch = batchSnap.data() as FoodBatch;

      // CORREÇÃO 1 — Bloqueio de autorreserva (Refinamento de integridade RF06 / RN04/RN05)
      if (batch.donorId === input.receiverId) {
        throw new Error('Nenhum usuário pode reservar uma doação cadastrada pela sua própria conta.');
      }

      // RN04 & RN05: Apenas lotes DISPONÍVEIS e sem reserva ativa podem ser reservados
      if (batch.status !== 'DISPONIVEL' || batch.activeReservationId) {
        throw new Error(
          'Este lote já foi reservado por outra entidade receptora ou não está mais disponível.'
        );
      }

      // Validação de validade
      if (new Date(batch.expirationDate).getTime() < new Date().setHours(0, 0, 0, 0)) {
        throw new Error('Este lote está com data de validade vencida e não pode ser reservado.');
      }

      // Monta registro da reserva (RF06)
      const newReservation: Reservation = {
        id: reservationRef.id,
        batchId: batch.id,
        foodName: batch.foodName,
        batchQuantity: batch.quantity,
        batchUnit: batch.unit,
        expirationDate: batch.expirationDate,
        pickupAddress: batch.pickupAddress,
        pickupWindowStart: batch.pickupWindowStart,
        pickupWindowEnd: batch.pickupWindowEnd,
        donorId: batch.donorId,
        donorName: batch.donorName,
        receiverId: input.receiverId,
        receiverName: input.receiverName,
        receiverEmail: input.receiverEmail,
        receiverPhone: input.receiverPhone || '',
        status: 'PENDENTE_APROVACAO',
        requestedAt: now,
        decidedAt: null,
        decidedBy: null,
        decisionNotes: null
      };

      // 1. Cria a reserva
      transaction.set(reservationRef, newReservation);

      // 2. Trava atômica no lote: status RESERVADO + activeReservationId + activeReservationStatus
      transaction.update(batchRef, {
        status: 'RESERVADO',
        activeReservationId: reservationRef.id,
        activeReservationStatus: 'PENDENTE_APROVACAO',
        reservedBy: input.receiverId,
        reservedByName: input.receiverName,
        updatedAt: now
      });
    });

    return reservationRef.id;
  } catch (error) {
    if (error instanceof Error && error.message.includes('já foi reservado')) {
      throw error;
    }
    handleFirestoreError(error, OperationType.WRITE, `reservations/${reservationRef.id}`);
  }
}

/**
 * RF07 — Cancelar Reserva pela Entidade Receptora
 * Libera o lote para DISPONÍVEL caso ainda esteja apto e dentro da validade
 */
export async function cancelReservationAtomic(
  reservationId: string,
  receiverId: string,
  reason: string
): Promise<void> {
  const reservationRef = doc(db, 'reservations', reservationId);
  const now = new Date().toISOString();

  try {
    await runTransaction(db, async (transaction) => {
      const resSnap = await transaction.get(reservationRef);
      if (!resSnap.exists()) {
        throw new Error('Reserva não encontrada.');
      }

      const res = resSnap.data() as Reservation;

      if (res.receiverId !== receiverId) {
        throw new Error('Apenas a entidade receptora titular pode cancelar esta reserva.');
      }

      if (res.status === 'CANCELADA') {
        throw new Error('Esta reserva já se encontra cancelada.');
      }

      const batchRef = doc(db, 'food_batches', res.batchId);
      const batchSnap = await transaction.get(batchRef);

      // 1. Atualiza a reserva para CANCELADA preservando histórico
      transaction.update(reservationRef, {
        status: 'CANCELADA',
        canceledAt: now,
        cancelReason: reason.trim() || 'Cancelamento solicitado pela entidade receptora.'
      });

      // 2. Se o lote existir, verifica se ainda está na validade para voltar a DISPONÍVEL
      if (batchSnap.exists()) {
        const batch = batchSnap.data() as FoodBatch;
        const isNotExpired = new Date(batch.expirationDate).getTime() >= new Date().setHours(0, 0, 0, 0);

        transaction.update(batchRef, {
          status: isNotExpired ? 'DISPONIVEL' : 'EXPIRADO',
          activeReservationId: null,
          activeReservationStatus: null,
          reservedBy: null,
          reservedByName: null,
          updatedAt: now
        });
      }
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `reservations/${reservationId}`);
  }
}

/**
 * RF08 — Análise Administrativa da Solicitação de Reserva (OWNER / ADMIN)
 * Aprova ou Rejeita a reserva com atualização atômica de disponibilidade
 */
export async function decideReservationAtomic(
  reservationId: string,
  decision: 'APROVADA' | 'REJEITADA',
  adminIdentifier: string,
  notes: string
): Promise<void> {
  const reservationRef = doc(db, 'reservations', reservationId);
  const now = new Date().toISOString();

  try {
    await runTransaction(db, async (transaction) => {
      const resSnap = await transaction.get(reservationRef);
      if (!resSnap.exists()) {
        throw new Error('Reserva não encontrada.');
      }

      const res = resSnap.data() as Reservation;

      if (res.status !== 'PENDENTE_APROVACAO') {
        throw new Error('Esta solicitação já foi decidida ou cancelada previamente.');
      }

      const batchRef = doc(db, 'food_batches', res.batchId);
      const batchSnap = await transaction.get(batchRef);

      // 1. Atualiza status da reserva com registro de auditoria
      transaction.update(reservationRef, {
        status: decision,
        decidedAt: now,
        decidedBy: adminIdentifier,
        decisionNotes: notes.trim() || (decision === 'APROVADA' ? 'Reserva homologada pelo administrador.' : 'Solicitação indeferida.')
      });

      // 2. Se for rejeitada, libera o lote se ainda estiver dentro da validade
      if (decision === 'REJEITADA' && batchSnap.exists()) {
        const batch = batchSnap.data() as FoodBatch;
        const isNotExpired = new Date(batch.expirationDate).getTime() >= new Date().setHours(0, 0, 0, 0);

        transaction.update(batchRef, {
          status: isNotExpired ? 'DISPONIVEL' : 'EXPIRADO',
          activeReservationId: null,
          activeReservationStatus: null,
          reservedBy: null,
          reservedByName: null,
          updatedAt: now
        });
      } else if (decision === 'APROVADA' && batchSnap.exists()) {
        // Se for APROVADA, atualiza activeReservationStatus para APROVADA (Ciclo 2.1)
        transaction.update(batchRef, {
          activeReservationStatus: 'APROVADA',
          updatedAt: now
        });
      }
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `reservations/${reservationId}`);
  }
}
