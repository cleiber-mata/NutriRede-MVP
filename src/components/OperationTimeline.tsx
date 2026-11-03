import React from 'react';
import {
  CheckCircle2,
  Clock,
  Truck,
  Package,
  HeartHandshake,
  ShieldCheck,
  AlertTriangle,
  ArrowRight
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
  // Determina o estágio de cada etapa do fluxo do PRD v1.1
  // 1. Lote Publicado
  const step1Done = true;
  const step1Date = batch.createdAt;

  // 2. Reserva Solicitada
  const step2Done = !!reservation;
  const step2Date = reservation?.requestedAt;

  // 3. Reserva Aprovada pelo Administrador
  const step3Done = reservation?.status === 'APROVADA';
  const step3Date = reservation?.decidedAt;

  // 4. Coleta Aguardando Transportador
  const step4Done = step3Done && !pickup;

  // 5. Coleta Aceita pelo Transportador
  const step5Done = !!pickup && (pickup.status === 'ACEITA' || pickup.status === 'RETIRADA');
  const step5Date = pickup?.acceptedAt;

  // 6. Retirada Realizada (Lote EM_TRANSPORTE)
  const step6Done = batch.status === 'EM_TRANSPORTE' || batch.status === 'CONCLUIDO' || pickup?.status === 'RETIRADA';
  const step6Date = batch.pickedUpAt || pickup?.pickedUpAt;

  // 7. Recebimento Confirmado pela Entidade Receptora (CONCLUIDO - RN08)
  const step7Done = batch.status === 'CONCLUIDO';
  const step7Date = batch.completedAt || reservation?.completedAt;

  const steps = [
    {
      number: 1,
      title: 'Lote Publicado',
      description: 'Disponibilizado pelo doador',
      isCompleted: step1Done,
      isCurrent: batch.status === 'DISPONIVEL' && !reservation,
      date: step1Date,
      actor: batch.donorName,
      icon: Package
    },
    {
      number: 2,
      title: 'Reserva Solicitada',
      description: 'Solicitada por entidade receptora',
      isCompleted: step2Done,
      isCurrent: reservation?.status === 'PENDENTE_APROVACAO',
      date: step2Date,
      actor: reservation?.receiverName,
      icon: HeartHandshake
    },
    {
      number: 3,
      title: 'Reserva Aprovada',
      description: 'Homologada pelo administrador',
      isCompleted: step3Done,
      isCurrent: step3Done && !pickup,
      date: step3Date,
      actor: reservation?.decidedBy || 'Administrador',
      icon: ShieldCheck
    },
    {
      number: 4,
      title: 'Coleta Aceita',
      description: 'Transportador atribuído',
      isCompleted: step5Done,
      isCurrent: pickup?.status === 'ACEITA' && batch.status === 'RESERVADO',
      date: step5Date,
      actor: pickup?.transporterName || reservation?.transporterName,
      icon: Truck
    },
    {
      number: 5,
      title: 'Retirada dos Alimentos',
      description: 'Lote em trânsito (EM_TRANSPORTE)',
      isCompleted: step6Done,
      isCurrent: batch.status === 'EM_TRANSPORTE',
      date: step6Date,
      actor: pickup?.transporterName,
      icon: Truck
    },
    {
      number: 6,
      title: 'Recebimento Confirmado (RN08)',
      description: 'Entrega finalizada (CONCLUIDO)',
      isCompleted: step7Done,
      isCurrent: step7Done,
      date: step7Date,
      actor: reservation?.receiverName,
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
            batch.status === 'CONCLUIDO'
              ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
              : batch.status === 'EM_TRANSPORTE'
              ? 'bg-amber-100 text-amber-800 border-amber-300'
              : batch.status === 'RESERVADO'
              ? 'bg-teal-100 text-teal-800 border-teal-300'
              : 'bg-stone-200 text-stone-700 border-stone-300'
          }`}
        >
          {batch.status === 'CONCLUIDO'
            ? 'Doação Concluída'
            : batch.status === 'EM_TRANSPORTE'
            ? 'Em Transporte'
            : batch.status === 'RESERVADO'
            ? reservation?.status === 'APROVADA'
              ? pickup
                ? 'Coleta Aceita'
                : 'Aguardando Transportador'
              : 'Reserva Pendente'
            : batch.status}
        </span>
      </div>

      {/* Grid de Linha do Tempo */}
      <div className="relative pl-6 sm:pl-8 space-y-4 before:content-[''] before:absolute before:left-3 sm:before:left-4 before:top-2 before:bottom-2 before:w-0.5 before:bg-stone-200">
        {steps.map((st) => {
          const Icon = st.icon;
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

      {/* Seção de Ocorrências se houver */}
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
                <div className="flex items-center justify-between text-[11px] font-semibold text-rose-800">
                  <span>[{occ.stage}] {occ.type}</span>
                  <span className="font-mono text-stone-500">{formatDateTimeBR(occ.createdAt)}</span>
                </div>
                <p className="mt-1 text-rose-950 font-medium">{occ.description}</p>
                <p className="text-[10px] text-rose-700 mt-1">
                  Reportado por: <strong>{occ.authorName}</strong> ({occ.authorProfile})
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
