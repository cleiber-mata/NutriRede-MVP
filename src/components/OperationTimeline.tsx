import React from 'react';
import {
  CheckCircle2,
  Clock,
  Truck,
  Package,
  HeartHandshake,
  ShieldCheck,
  AlertTriangle
} from 'lucide-react';
import { FoodBatch, Occurrence, Pickup, Reservation } from '../types';
import { formatDateTimeBR } from '../utils/dateUtils';

interface OperationTimelineProps {
  batch: FoodBatch;
  reservation?: Reservation | null;
  pickup?: Pickup | null;
  occurrences?: Occurrence[];
}

export const OperationTimeline: React.FC<OperationTimelineProps> = ({
  batch,
  reservation,
  pickup,
  occurrences = []
}) => {
  // 1. Conclusão progressiva e cumulativa de cada etapa (M37 / M15)
  // Se um estágio posterior foi atingido, todas as etapas anteriores são garantidamente concluídas.
  const isConcluded = batch.status === 'CONCLUIDO' || !!batch.completedAt || !!reservation?.completedAt;
  const isInTransit = batch.status === 'EM_TRANSPORTE' || isConcluded;
  const isPickedUp = !!batch.pickedUpAt || !!pickup?.pickedUpAt || !!reservation?.pickedUpAt || isInTransit;
  const isPickupAccepted = !!pickup || !!batch.transporterId || !!reservation?.transporterId || !!batch.activePickupId || !!reservation?.activePickupId || isPickedUp;
  const isApproved = reservation?.status === 'APROVADA' || isPickupAccepted;
  const isReserved = !!reservation || !!batch.reservedBy || !!batch.activeReservationId || isApproved;
  const isPublished = true;

  // 2. Determinação determinística da ÚNICA etapa atual (ou nenhuma se CONCLUIDO ou CANCELADO)
  // Regra fundamental: No máximo UMA etapa pode ser marcada como "Etapa Atual".
  // Após CONCLUIDO, nenhuma etapa é atual (o processo está 100% finalizado).
  let currentStepNumber = 0;

  if (isConcluded || batch.status === 'CANCELADO' || reservation?.status === 'CANCELADA') {
    currentStepNumber = 0;
  } else if (isInTransit) {
    // Alimentos retirados e em transporte: a etapa em andamento é a confirmação de recebimento no destino
    currentStepNumber = 6;
  } else if (isPickupAccepted) {
    // Coleta aceita pelo transportador: a etapa em andamento é a retirada física no doador
    currentStepNumber = 5;
  } else if (isApproved) {
    // Reserva homologada pelo admin: a etapa em andamento é a aceitação por um transportador
    currentStepNumber = 4;
  } else if (isReserved) {
    // Reserva solicitada: a etapa em andamento é a homologação administrativa (RF08)
    currentStepNumber = 3;
  } else if (batch.status === 'DISPONIVEL') {
    // Lote publicado e disponível para solicitação de reserva na vitrine
    currentStepNumber = 1;
  }

  // Datas e atores com fallbacks relacionais completos
  const step1Date = batch.createdAt;
  const step1Actor = batch.donorName;

  const step2Date = reservation?.requestedAt || batch.createdAt;
  const step2Actor = reservation?.receiverName || batch.reservedByName;

  const step3Date = reservation?.decidedAt;
  const step3Actor = reservation?.decidedBy || (isApproved ? 'Administrador' : undefined);

  const step4Date = pickup?.acceptedAt;
  const step4Actor = pickup?.transporterName || batch.transporterName || reservation?.transporterName;

  const step5Date = batch.pickedUpAt || pickup?.pickedUpAt || reservation?.pickedUpAt;
  const step5Actor = pickup?.transporterName || batch.transporterName;

  const step6Date = batch.completedAt || reservation?.completedAt;
  const step6Actor = reservation?.receiverName || batch.reservedByName;

  const steps = [
    {
      number: 1,
      title: 'Lote Publicado',
      description: 'Disponibilizado pelo doador',
      isCompleted: isPublished,
      isCurrent: currentStepNumber === 1,
      date: step1Date,
      actor: step1Actor,
      icon: Package
    },
    {
      number: 2,
      title: 'Reserva Solicitada',
      description: 'Solicitada por entidade receptora',
      isCompleted: isReserved,
      isCurrent: currentStepNumber === 2,
      date: step2Date,
      actor: step2Actor,
      icon: HeartHandshake
    },
    {
      number: 3,
      title: 'Reserva Aprovada',
      description: 'Homologada pelo administrador',
      isCompleted: isApproved,
      isCurrent: currentStepNumber === 3,
      date: step3Date,
      actor: step3Actor,
      icon: ShieldCheck
    },
    {
      number: 4,
      title: 'Coleta Aceita',
      description: 'Transportador atribuído',
      isCompleted: isPickupAccepted,
      isCurrent: currentStepNumber === 4,
      date: step4Date,
      actor: step4Actor,
      icon: Truck
    },
    {
      number: 5,
      title: 'Retirada dos Alimentos',
      description: 'Lote em trânsito (EM_TRANSPORTE)',
      isCompleted: isPickedUp,
      isCurrent: currentStepNumber === 5,
      date: step5Date,
      actor: step5Actor,
      icon: Truck
    },
    {
      number: 6,
      title: 'Recebimento Confirmado (RN08)',
      description: 'Entrega finalizada (CONCLUIDO)',
      isCompleted: isConcluded,
      isCurrent: currentStepNumber === 6,
      date: step6Date,
      actor: step6Actor,
      icon: CheckCircle2
    }
  ];

  return (
    <div className="bg-stone-50 rounded-2xl p-4 sm:p-5 border border-stone-200">
      <div className="flex items-center justify-between mb-4 pb-2 border-b border-stone-200">
        <h4 className="text-xs font-bold uppercase tracking-wider text-stone-600 flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5 text-stone-500" />
          Acompanhamento Operacional da Doação (RF13)
        </h4>
        <span
          className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${
            isConcluded
              ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
              : batch.status === 'EM_TRANSPORTE'
              ? 'bg-amber-100 text-amber-800 border-amber-300'
              : batch.status === 'RESERVADO'
              ? isApproved
                ? isPickupAccepted
                  ? 'bg-teal-100 text-teal-800 border-teal-300'
                  : 'bg-blue-100 text-blue-800 border-blue-300'
                : 'bg-amber-50 text-amber-900 border-amber-300'
              : 'bg-stone-200 text-stone-700 border-stone-300'
          }`}
        >
          {isConcluded
            ? 'Doação Concluída com Sucesso (RN08)'
            : batch.status === 'EM_TRANSPORTE'
            ? 'Em Transporte para Entrega'
            : batch.status === 'RESERVADO'
            ? isApproved
              ? isPickupAccepted
                ? 'Coleta Aceita (Aguardando Retirada)'
                : 'Aguardando Transportador'
              : 'Reserva Pendente de Homologação'
            : batch.status}
        </span>
      </div>

      {/* Grid da Linha do Tempo */}
      <div className="relative pl-6 sm:pl-8 space-y-4 before:content-[''] before:absolute before:left-3 sm:before:left-4 before:top-2 before:bottom-2 before:w-0.5 before:bg-stone-200">
        {steps.map((st) => {
          return (
            <div key={st.number} className="relative flex items-start gap-3">
              <div
                className={`absolute -left-6 sm:-left-8 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shadow-2xs border ${
                  st.isCompleted
                    ? 'bg-emerald-600 text-white border-emerald-700'
                    : st.isCurrent
                    ? 'bg-amber-500 text-white border-amber-600 ring-2 ring-amber-200'
                    : 'bg-stone-100 text-stone-400 border-stone-300'
                }`}
              >
                {st.isCompleted ? <CheckCircle2 className="w-3.5 h-3.5" /> : st.number}
              </div>

              <div className="flex-1">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-xs font-bold ${
                        st.isCompleted
                          ? 'text-stone-900'
                          : st.isCurrent
                          ? 'text-amber-900'
                          : 'text-stone-400'
                      }`}
                    >
                      {st.title}
                    </span>
                    {st.isCurrent && (
                      <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-sm bg-amber-100 text-amber-800">
                        Etapa Atual
                      </span>
                    )}
                  </div>

                  {st.date && (
                    <span className="text-[11px] text-stone-500 font-mono">
                      {formatDateTimeBR(st.date)}
                    </span>
                  )}
                </div>

                <p className="text-[11px] text-stone-500 mt-0.5">
                  {st.description}
                  {st.actor && <span className="font-semibold text-stone-700"> • {st.actor}</span>}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Seção de Ocorrências se houver (RF14) */}
      {occurrences.length > 0 && (
        <div className="mt-4 pt-3 border-t border-stone-200 space-y-2">
          <div className="flex items-center gap-1.5 text-xs font-bold text-rose-800">
            <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
            <span>Ocorrências Registradas ({occurrences.length})</span>
          </div>

          <div className="space-y-1.5">
            {occurrences.map((occ) => (
              <div
                key={occ.id}
                className="p-2.5 rounded-xl bg-rose-50/80 border border-rose-200 text-xs text-rose-900"
              >
                <div className="flex items-center justify-between gap-2 font-semibold">
                  <span>{occ.stage}: {occ.type || 'Ocorrência'}</span>
                  <span className="font-mono text-stone-500">{formatDateTimeBR(occ.createdAt)}</span>
                </div>
                <p className="text-[11px] text-rose-800 mt-0.5">{occ.description}</p>
                <div className="text-[10px] text-rose-600 mt-1">
                  Registrado por: {occ.authorName} ({occ.authorProfile})
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
