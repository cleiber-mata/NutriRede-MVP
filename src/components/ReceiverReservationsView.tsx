import React, { useEffect, useState } from 'react';
import {
  Package,
  Clock,
  MapPin,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Search,
  ArrowLeft,
  X,
  Truck,
  AlertTriangle
} from 'lucide-react';
import { collection, onSnapshot, query, where, doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from '../context/AuthContext';
import { FoodBatch, RESERVATION_STATUS_CONFIG, Reservation, ReservationStatus, Pickup, Occurrence } from '../types';
import { cancelReservationAtomic } from '../services/foodBatchService';
import { formatDateTimeBR } from '../utils/dateUtils';
import { ConfirmDeliveryModal } from './ConfirmDeliveryModal';
import { CreateOccurrenceModal } from './CreateOccurrenceModal';
import { OperationTimeline } from './OperationTimeline';

interface ReceiverReservationsViewProps {
  onBackToExplore: () => void;
}

export const ReceiverReservationsView: React.FC<ReceiverReservationsViewProps> = ({
  onBackToExplore
}) => {
  const { currentUser } = useAuth();

  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [batchesMap, setBatchesMap] = useState<Record<string, FoodBatch>>({});
  const [pickups, setPickups] = useState<Pickup[]>([]);
  const [occurrences, setOccurrences] = useState<Occurrence[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'ALL' | ReservationStatus>('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  // Cancelamento
  const [cancelModalRes, setCancelModalRes] = useState<Reservation | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelLoading, setCancelLoading] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Ciclo 3: Confirmação de Entrega (RF12) e Ocorrências (RF14)
  const [confirmDeliveryRes, setConfirmDeliveryRes] = useState<Reservation | null>(null);
  const [occurrenceTarget, setOccurrenceTarget] = useState<{ operationId: string; batchId: string; foodName: string } | null>(null);

  useEffect(() => {
    if (!currentUser) return;

    setLoading(true);

    // 1. Escuta em tempo real as reservas da entidade receptora
    const qRes = query(
      collection(db, 'reservations'),
      where('receiverId', '==', currentUser.uid)
    );

    const unsubRes = onSnapshot(
      qRes,
      async (snapshot) => {
        const list: Reservation[] = [];
        snapshot.forEach((docItem) => {
          list.push(docItem.data() as Reservation);
        });
        list.sort((a, b) => new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime());
        setReservations(list);

        // Carrega inicialmente os lotes correspondentes
        const batchIds = Array.from(new Set(list.map((r) => r.batchId)));
        const newMap: Record<string, FoodBatch> = {};
        for (const bId of batchIds) {
          try {
            const bSnap = await getDoc(doc(db, 'food_batches', bId));
            if (bSnap.exists()) {
              newMap[bId] = bSnap.data() as FoodBatch;
            }
          } catch (e) {
            console.warn('Erro ao carregar lote:', bId, e);
          }
        }
        setBatchesMap((prev) => ({ ...prev, ...newMap }));
        setLoading(false);
      },
      (error) => {
        console.error('Erro ao carregar reservas da entidade:', error);
        setLoading(false);
      }
    );

    // 2. Escuta em tempo real os lotes reservados por esta entidade receptora
    const qBatches = query(
      collection(db, 'food_batches'),
      where('reservedBy', '==', currentUser.uid)
    );

    const unsubBatches = onSnapshot(qBatches, (snapshot) => {
      setBatchesMap((prev) => {
        const updated = { ...prev };
        snapshot.forEach((d) => {
          updated[d.id] = d.data() as FoodBatch;
        });
        return updated;
      });
    });

    // 3. Escuta em tempo real as coletas vinculadas a esta entidade receptora
    const qPickups = query(
      collection(db, 'pickups'),
      where('receiverId', '==', currentUser.uid)
    );

    const unsubPickups = onSnapshot(qPickups, (snapshot) => {
      const list: Pickup[] = [];
      snapshot.forEach((d) => list.push(d.data() as Pickup));
      setPickups(list);
    });

    // 4. Escuta em tempo real as ocorrências vinculadas a esta entidade receptora
    const qOcc = query(
      collection(db, 'occurrences'),
      where('receiverId', '==', currentUser.uid)
    );

    const unsubOcc = onSnapshot(
      qOcc,
      (snapshot) => {
        const list: Occurrence[] = [];
        snapshot.forEach((d) => list.push(d.data() as Occurrence));
        setOccurrences(list);
      },
      () => {
        // Fallback silencioso caso não haja índice composto ou permissão restrita
      }
    );

    return () => {
      unsubRes();
      unsubBatches();
      unsubPickups();
      unsubOcc();
    };
  }, [currentUser]);

  const handleConfirmCancel = async () => {
    if (!cancelModalRes || !currentUser) return;

    setCancelLoading(true);
    setFeedbackMsg(null);

    try {
      await cancelReservationAtomic(
        cancelModalRes.id,
        currentUser.uid,
        cancelReason.trim() || 'Cancelamento solicitado pela entidade receptora.'
      );

      setFeedbackMsg({
        text: `Reserva do lote "${cancelModalRes.foodName}" foi cancelada e o lote foi liberado para novas ofertas se apto.`,
        type: 'success'
      });
      setCancelModalRes(null);
      setCancelReason('');
    } catch (err: unknown) {
      console.error('Erro ao cancelar reserva:', err);
      setFeedbackMsg({
        text: err instanceof Error ? err.message : 'Falha ao cancelar reserva.',
        type: 'error'
      });
    } finally {
      setCancelLoading(false);
    }
  };

  const filtered = reservations.filter((r) => {
    const matchStatus = statusFilter === 'ALL' || r.status === statusFilter;
    const matchSearch =
      searchTerm === '' ||
      r.foodName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.donorName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.pickupAddress.toLowerCase().includes(searchTerm.toLowerCase());
    return matchStatus && matchSearch;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-teal-900 via-stone-900 to-teal-900 rounded-3xl p-6 sm:p-8 text-white shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <button
            onClick={onBackToExplore}
            className="inline-flex items-center gap-1.5 text-xs text-teal-200 hover:text-white font-semibold mb-3 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Voltar para Ofertas Disponíveis
          </button>
          <h2 className="text-2xl sm:text-3xl font-bold font-serif">Minhas Reservas Solicitadas (RF07)</h2>
          <p className="text-teal-100/80 text-xs sm:text-sm mt-1 max-w-xl">
            Acompanhe a situação das suas reservas, pareceres administrativos de homologação e histórico operacional.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right text-xs">
            <span className="text-teal-300 font-semibold uppercase">Total Solicitado</span>
            <div className="text-2xl font-extrabold text-white">{reservations.length}</div>
          </div>
        </div>
      </div>

      {/* Alerta de Feedback */}
      {feedbackMsg && (
        <div
          className={`p-4 rounded-2xl text-xs flex items-center justify-between gap-3 ${
            feedbackMsg.type === 'success'
              ? 'bg-emerald-50 text-emerald-900 border border-emerald-300'
              : 'bg-rose-50 text-rose-900 border border-rose-300'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedbackMsg.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span className="font-semibold">{feedbackMsg.text}</span>
          </div>
          <button onClick={() => setFeedbackMsg(null)} className="text-stone-400 font-bold">
            ×
          </button>
        </div>
      )}

      {/* Filtros e Busca */}
      <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar em minhas reservas..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
        </div>

        <div className="flex items-center gap-1 bg-stone-100 p-1 rounded-xl text-xs w-full sm:w-auto overflow-x-auto">
          <span className="text-[10px] font-bold text-stone-500 px-2 uppercase">Status:</span>
          {(['ALL', 'PENDENTE_APROVACAO', 'APROVADA', 'REJEITADA', 'CANCELADA'] as const).map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-2.5 py-1 rounded-lg font-semibold whitespace-nowrap transition-colors ${
                statusFilter === st
                  ? 'bg-white text-stone-900 shadow-2xs'
                  : 'text-stone-500 hover:text-stone-900'
              }`}
            >
              {st === 'ALL' ? 'Todas' : RESERVATION_STATUS_CONFIG[st].label}
            </button>
          ))}
        </div>
      </div>

      {/* Listagem de Reservas */}
      {loading ? (
        <div className="text-center py-12">
          <div className="w-8 h-8 border-3 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
          <p className="text-xs text-stone-500">Carregando suas reservas...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-stone-200 space-y-3">
          <Package className="w-12 h-12 text-stone-300 mx-auto" />
          <h4 className="text-base font-bold text-stone-800 font-serif">Nenhuma reserva encontrada</h4>
          <p className="text-xs text-stone-500 max-w-sm mx-auto leading-relaxed">
            {reservations.length === 0
              ? 'Sua entidade ainda não solicitou nenhuma reserva de alimentos. Explore as ofertas disponíveis e solicite uma doação.'
              : 'Nenhuma reserva corresponde aos filtros selecionados.'}
          </p>
          {reservations.length === 0 && (
            <button
              onClick={onBackToExplore}
              className="mt-2 px-4 py-2 rounded-xl bg-teal-700 text-white font-semibold text-xs hover:bg-teal-800 shadow-xs inline-flex items-center gap-1.5"
            >
              Explorar Ofertas Disponíveis
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((res) => {
            const batch = batchesMap[res.batchId];
            const linkedPickup = pickups.find((p) => p.reservationId === res.id || p.batchId === res.batchId || p.id === res.activePickupId);
            const batchOccurrences = occurrences.filter((o) => o.batchId === res.batchId || o.operationId === res.id || (linkedPickup && o.operationId === linkedPickup.id));
            const isInTransit = batch?.status === 'EM_TRANSPORTE' || (linkedPickup?.status === 'RETIRADA' && batch?.status !== 'CONCLUIDO') || (!!res.pickedUpAt && !res.completedAt && batch?.status !== 'CONCLUIDO');
            const isConcluded = batch?.status === 'CONCLUIDO' || !!res.completedAt;
            const statusMeta = RESERVATION_STATUS_CONFIG[res.status];
            const canCancel =
              res.status === 'PENDENTE_APROVACAO' ||
              (res.status === 'APROVADA' && !res.pickedUpAt && !isInTransit && !isConcluded);

            return (
              <div
                key={res.id}
                className="bg-white rounded-3xl p-6 border border-stone-200 shadow-2xs hover:shadow-xs transition-shadow flex flex-col md:flex-row md:items-start justify-between gap-6"
              >
                <div className="space-y-3 flex-1">
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="text-base font-bold text-stone-900">{res.foodName}</span>
                    <span
                      className={`text-xs px-2.5 py-1 rounded-full font-bold border ${statusMeta.badgeClass}`}
                    >
                      {statusMeta.label}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 bg-stone-50 rounded-2xl border border-stone-100 text-xs text-stone-600">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-stone-400 block">
                        Quantidade Reservada
                      </span>
                      <strong className="text-stone-900 text-sm">
                        {res.batchQuantity} {res.batchUnit}
                      </strong>
                    </div>

                    <div>
                      <span className="text-[10px] uppercase font-bold text-stone-400 block">
                        Doador Responsável
                      </span>
                      <span className="text-stone-800 font-semibold">{res.donorName}</span>
                    </div>

                    <div>
                      <span className="text-[10px] uppercase font-bold text-stone-400 block">
                        Data da Solicitação
                      </span>
                      <span className="text-stone-800">
                        {formatDateTimeBR(res.requestedAt)}
                      </span>
                    </div>
                  </div>

                  <div className="text-xs text-stone-500 space-y-1">
                    <div className="flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-stone-400" />
                      <span>Local de Retirada: {res.pickupAddress}</span>
                    </div>
                    <div className="pt-2 border-t border-stone-200/60 space-y-1">
                      <div className="flex items-center gap-1.5 text-stone-700 font-semibold text-xs">
                        <Clock className="w-3.5 h-3.5 text-teal-700 shrink-0" />
                        <span>Janela de Retirada:</span>
                      </div>
                      <div className="pl-5 text-[11px] text-stone-800 space-y-0.5">
                        <div><strong className="text-stone-900">Início:</strong> {formatDateTimeBR(res.pickupWindowStart)}</div>
                        <div><strong className="text-stone-900">Término:</strong> {formatDateTimeBR(res.pickupWindowEnd)}</div>
                      </div>
                    </div>
                  </div>

                  {/* Banner de Doação em Transporte aguardando confirmação (RF12 / RN08) */}
                  {isInTransit && (
                    <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200 text-xs text-amber-900 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-start gap-2.5">
                        <Truck className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
                        <div>
                          <div className="font-bold text-amber-950">
                            Alimentos em Transporte — Aguardando Conferência de Recebimento
                          </div>
                          <p className="text-[11px] text-amber-800 mt-0.5">
                            Retirada confirmada pelo transportador ({res.transporterName || 'Atribuído'}). Após receber a entrega, confirme para finalizar oficialmente a doação (RN08).
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => setConfirmDeliveryRes(res)}
                        className="py-2.5 px-4 rounded-xl text-xs font-bold text-white bg-teal-700 hover:bg-teal-800 transition-colors flex items-center justify-center gap-1.5 shadow-2xs shrink-0"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        Confirmar Recebimento (RF12)
                      </button>
                    </div>
                  )}

                  {isConcluded && (
                    <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-200 text-xs text-emerald-900 flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <div>
                        <strong>Doação Concluída com Sucesso (RN08)!</strong> Alimentos recebidos e aproveitados socialmente.
                      </div>
                    </div>
                  )}

                  {/* Linha do Tempo Visual Integrada (RF13) */}
                  {batch && (
                    <OperationTimeline
                      batch={batch}
                      reservation={res}
                      pickup={linkedPickup}
                      occurrences={batchOccurrences}
                    />
                  )}

                  {/* Informações da Decisão Administrativa (RF08) */}
                  {res.decidedAt && (
                    <div
                      className={`p-3 rounded-2xl border text-xs ${
                        res.status === 'APROVADA'
                          ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                          : 'bg-rose-50 border-rose-200 text-rose-900'
                      }`}
                    >
                      <div className="font-bold">
                        {res.status === 'APROVADA' ? '✓ Homologada pelo Administrador' : '✕ Indeferida pelo Administrador'}
                      </div>
                      <p className="text-[11px] mt-0.5">
                        Decidida por <em>{res.decidedBy || 'Admin'}</em> em{' '}
                        {formatDateTimeBR(res.decidedAt)}
                        {res.decisionNotes && <span> — "{res.decisionNotes}"</span>}
                      </p>
                    </div>
                  )}

                  {/* Histórico de cancelamento */}
                  {res.status === 'CANCELADA' && (
                    <div className="p-3 rounded-2xl bg-stone-100 border border-stone-200 text-xs text-stone-600">
                      <strong>Cancelada em:</strong> {formatDateTimeBR(res.canceledAt || res.requestedAt)}
                      {res.cancelReason && <p className="italic text-[11px] mt-0.5">Motivo: "{res.cancelReason}"</p>}
                    </div>
                  )}
                </div>

                {/* Ações */}
                <div className="flex flex-col sm:flex-row md:flex-col items-end gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => setOccurrenceTarget({ operationId: res.id, batchId: res.batchId, foodName: res.foodName })}
                    className="px-3 py-1.5 rounded-xl text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition-colors flex items-center gap-1"
                  >
                    <AlertTriangle className="w-3.5 h-3.5" />
                    Registrar Ocorrência (RF14)
                  </button>

                  {canCancel && (
                    <button
                      onClick={() => {
                        setCancelReason('');
                        setCancelModalRes(res);
                      }}
                      className="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-stone-600 bg-stone-100 hover:bg-stone-200 border border-stone-200 transition-colors"
                    >
                      Cancelar Reserva (RF07)
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal de Confirmação de Cancelamento (RF07) */}
      {cancelModalRes && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-900/60 backdrop-blur-xs flex justify-center items-start sm:items-center p-2.5 sm:p-4 overscroll-contain">
          <div className="bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-6 max-w-md w-full shadow-2xl border border-stone-200 animate-in fade-in zoom-in-95 duration-150 my-auto max-h-[calc(100dvh-1.25rem)] sm:max-h-[min(90vh,750px)] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100 mb-4 shrink-0">
              <div className="flex items-center gap-2 text-rose-700">
                <XCircle className="w-5 h-5 shrink-0" />
                <h4 className="font-bold text-stone-900 text-base font-serif leading-tight">
                  Cancelar Reserva de Lote
                </h4>
              </div>
              <button onClick={() => setCancelModalRes(null)} aria-label="Fechar" className="p-1 rounded-lg text-stone-400 hover:text-stone-600 hover:bg-stone-100 shrink-0">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="overflow-y-auto overscroll-contain flex-1 pr-0.5">

            <p className="text-xs text-stone-600 leading-relaxed mb-3">
              Você está cancelando a reserva do lote <strong>"{cancelModalRes.foodName}"</strong> ({cancelModalRes.batchQuantity} {cancelModalRes.batchUnit}).
            </p>

            <div className="mb-4">
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Motivo do Cancelamento:
              </label>
              <textarea
                rows={3}
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Ex: Capacidade de armazenamento atingida ou alteração na demanda da cozinha comunitária."
                className="w-full p-2.5 text-xs rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-rose-500"
              />
            </div>

            <div className="text-[11px] text-stone-500 bg-stone-50 p-3 rounded-xl border border-stone-200 mb-4">
              * Nota: O histórico do cancelamento será registrado e o lote voltará a ficar disponível para outras entidades caso ainda esteja dentro do prazo de validade.
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone-100">
              <button
                type="button"
                onClick={() => setCancelModalRes(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-stone-600 hover:bg-stone-100"
              >
                Voltar
              </button>
              <button
                type="button"
                disabled={cancelLoading}
                onClick={handleConfirmCancel}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-rose-600 text-white hover:bg-rose-700 shadow-xs disabled:opacity-50"
              >
                {cancelLoading ? 'Cancelando...' : 'Confirmar Cancelamento'}
              </button>
            </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Confirmação de Recebimento da Doação (RF12 / RN08) */}
      {confirmDeliveryRes && currentUser && (
        <ConfirmDeliveryModal
          isOpen={true}
          onClose={() => setConfirmDeliveryRes(null)}
          reservation={confirmDeliveryRes}
          receiverUserId={currentUser.uid}
          receiverName={currentUser.displayName || currentUser.email || 'Entidade Receptora'}
          onSuccess={() => {
            setFeedbackMsg({
              text: `Doação do lote "${confirmDeliveryRes.foodName}" confirmada com sucesso! Conclusão oficializada no sistema (RN08).`,
              type: 'success'
            });
            setConfirmDeliveryRes(null);
          }}
        />
      )}

      {/* Modal de Registro de Ocorrência (RF14) */}
      {occurrenceTarget && currentUser && (
        <CreateOccurrenceModal
          isOpen={true}
          onClose={() => setOccurrenceTarget(null)}
          operationId={occurrenceTarget.operationId}
          batchId={occurrenceTarget.batchId}
          foodName={occurrenceTarget.foodName}
          authorUserId={currentUser.uid}
          authorName={currentUser.displayName || currentUser.email || 'Entidade Receptora'}
          authorProfile="RECEIVER"
          defaultStage="RECEBIMENTO"
          onSuccess={() => {
            setFeedbackMsg({
              text: 'Ocorrência registrada no histórico da doação.',
              type: 'success'
            });
          }}
        />
      )}
    </div>
  );
};
