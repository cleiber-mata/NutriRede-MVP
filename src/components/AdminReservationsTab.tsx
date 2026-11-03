import React, { useEffect, useState } from 'react';
import {
  Package,
  Calendar,
  Clock,
  MapPin,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Search,
  Filter,
  Check,
  X,
  Building2,
  Store,
  Scale
} from 'lucide-react';
import { collection, onSnapshot, query } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from '../context/AuthContext';
import { RESERVATION_STATUS_CONFIG, Reservation, ReservationStatus } from '../types';
import { decideReservationAtomic } from '../services/foodBatchService';
import { formatDateBR, formatDateTimeBR } from '../utils/dateUtils';

export const AdminReservationsTab: React.FC = () => {
  const { currentUser, isOwner, userAccount } = useAuth();

  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'ALL' | ReservationStatus>('PENDENTE_APROVACAO');
  const [searchTerm, setSearchTerm] = useState('');

  // Ações de Decisão
  const [rejectModalRes, setRejectModalRes] = useState<Reservation | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [operatingId, setOperatingId] = useState<string | null>(null);
  const [feedbackMsg, setFeedbackMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    setLoading(true);
    const q = query(collection(db, 'reservations'));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const list: Reservation[] = [];
        snapshot.forEach((docItem) => {
          list.push(docItem.data() as Reservation);
        });
        list.sort((a, b) => new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime());
        setReservations(list);
        setLoading(false);
      },
      (error) => {
        console.error('Erro ao ler solicitações de reserva:', error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const handleApprove = async (res: Reservation) => {
    setOperatingId(res.id);
    setFeedbackMsg(null);

    const adminName = isOwner
      ? `Proprietário (${userAccount?.name || currentUser?.email})`
      : `Administrador (${userAccount?.name || currentUser?.email})`;

    try {
      await decideReservationAtomic(
        res.id,
        'APROVADA',
        adminName,
        'Reserva homologada após análise da conformidade e capacidade da entidade.'
      );

      setFeedbackMsg({
        text: `Solicitação do lote "${res.foodName}" para a entidade "${res.receiverName}" foi APROVADA com sucesso!`,
        type: 'success'
      });
    } catch (err: unknown) {
      console.error('Erro ao aprovar reserva:', err);
      setFeedbackMsg({
        text: err instanceof Error ? err.message : 'Falha ao aprovar reserva.',
        type: 'error'
      });
    } finally {
      setOperatingId(null);
    }
  };

  const handleConfirmReject = async () => {
    if (!rejectModalRes) return;

    setOperatingId(rejectModalRes.id);
    setFeedbackMsg(null);

    const adminName = isOwner
      ? `Proprietário (${userAccount?.name || currentUser?.email})`
      : `Administrador (${userAccount?.name || currentUser?.email})`;

    try {
      await decideReservationAtomic(
        rejectModalRes.id,
        'REJEITADA',
        adminName,
        rejectReason.trim() || 'Solicitação indeferida na triagem administrativa.'
      );

      setFeedbackMsg({
        text: `Solicitação do lote "${rejectModalRes.foodName}" foi REJEITADA e o lote foi liberado se ainda estiver apto.`,
        type: 'success'
      });
      setRejectModalRes(null);
      setRejectReason('');
    } catch (err: unknown) {
      console.error('Erro ao rejeitar reserva:', err);
      setFeedbackMsg({
        text: err instanceof Error ? err.message : 'Falha ao rejeitar reserva.',
        type: 'error'
      });
    } finally {
      setOperatingId(null);
    }
  };

  const pendingCount = reservations.filter((r) => r.status === 'PENDENTE_APROVACAO').length;
  const approvedCount = reservations.filter((r) => r.status === 'APROVADA').length;
  const rejectedCount = reservations.filter((r) => r.status === 'REJEITADA').length;
  const canceledCount = reservations.filter((r) => r.status === 'CANCELADA').length;

  const filtered = reservations.filter((r) => {
    const matchStatus = statusFilter === 'ALL' || r.status === statusFilter;
    const matchSearch =
      searchTerm === '' ||
      r.foodName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.donorName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.receiverName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.receiverEmail.toLowerCase().includes(searchTerm.toLowerCase());
    return matchStatus && matchSearch;
  });

  return (
    <div className="space-y-6">
      {/* Alerta de Feedback */}
      {feedbackMsg && (
        <div
          className={`p-4 rounded-2xl text-xs flex items-center justify-between gap-3 animate-in fade-in ${
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

      {/* Métricas das Reservas */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div
          onClick={() => setStatusFilter('PENDENTE_APROVACAO')}
          className={`p-4 rounded-2xl border-2 cursor-pointer transition-all ${
            statusFilter === 'PENDENTE_APROVACAO'
              ? 'border-amber-500 bg-amber-50/70 shadow-xs'
              : 'border-stone-200 bg-white hover:border-amber-300'
          }`}
        >
          <div className="flex items-center justify-between text-amber-700 mb-1 text-xs font-bold uppercase">
            <span>Pendentes</span>
            <Clock className="w-4 h-4" />
          </div>
          <div className="text-2xl font-extrabold text-stone-900">{pendingCount}</div>
          <p className="text-[11px] text-amber-800 mt-0.5">Aguardam homologação (RF08)</p>
        </div>

        <div
          onClick={() => setStatusFilter('APROVADA')}
          className={`p-4 rounded-2xl border-2 cursor-pointer transition-all ${
            statusFilter === 'APROVADA'
              ? 'border-emerald-500 bg-emerald-50/70 shadow-xs'
              : 'border-stone-200 bg-white hover:border-emerald-300'
          }`}
        >
          <div className="flex items-center justify-between text-emerald-700 mb-1 text-xs font-bold uppercase">
            <span>Aprovadas</span>
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <div className="text-2xl font-extrabold text-stone-900">{approvedCount}</div>
          <p className="text-[11px] text-emerald-800 mt-0.5">Prontas para Ciclo 3</p>
        </div>

        <div
          onClick={() => setStatusFilter('REJEITADA')}
          className={`p-4 rounded-2xl border-2 cursor-pointer transition-all ${
            statusFilter === 'REJEITADA'
              ? 'border-rose-500 bg-rose-50/70 shadow-xs'
              : 'border-stone-200 bg-white hover:border-rose-300'
          }`}
        >
          <div className="flex items-center justify-between text-rose-700 mb-1 text-xs font-bold uppercase">
            <span>Rejeitadas</span>
            <XCircle className="w-4 h-4" />
          </div>
          <div className="text-2xl font-extrabold text-stone-900">{rejectedCount}</div>
          <p className="text-[11px] text-rose-800 mt-0.5">Indeferidas na triagem</p>
        </div>

        <div
          onClick={() => setStatusFilter('CANCELADA')}
          className={`p-4 rounded-2xl border-2 cursor-pointer transition-all ${
            statusFilter === 'CANCELADA'
              ? 'border-stone-600 bg-stone-100 shadow-xs'
              : 'border-stone-200 bg-white hover:border-stone-400'
          }`}
        >
          <div className="flex items-center justify-between text-stone-600 mb-1 text-xs font-bold uppercase">
            <span>Canceladas</span>
            <X className="w-4 h-4" />
          </div>
          <div className="text-2xl font-extrabold text-stone-900">{canceledCount}</div>
          <p className="text-[11px] text-stone-500 mt-0.5">Pela entidade receptora</p>
        </div>
      </div>

      {/* Filtros e Busca */}
      <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-2xs flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar por alimento, doador ou entidade..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
        </div>

        <div className="flex items-center gap-1 bg-stone-100 p-1 rounded-xl text-xs w-full md:w-auto overflow-x-auto">
          <span className="text-[10px] font-bold text-stone-500 px-2 uppercase">Status:</span>
          {(['PENDENTE_APROVACAO', 'APROVADA', 'REJEITADA', 'CANCELADA', 'ALL'] as const).map((st) => (
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

      {/* Lista de Reservas para Homologação */}
      {loading ? (
        <div className="text-center py-12">
          <div className="w-8 h-8 border-3 border-amber-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
          <p className="text-xs text-stone-500">Consultando solicitações de reserva...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-stone-200 space-y-2">
          <Package className="w-10 h-10 text-stone-300 mx-auto" />
          <h4 className="text-base font-bold text-stone-800 font-serif">Nenhuma solicitação de reserva encontrada</h4>
          <p className="text-xs text-stone-500">
            Ajuste os filtros de status ou a busca acima para visualizar outros registros.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((res) => {
            const statusMeta = RESERVATION_STATUS_CONFIG[res.status];
            const isOperating = operatingId === res.id;
            const isPending = res.status === 'PENDENTE_APROVACAO';

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

                  {/* Informações dos participantes */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 bg-stone-50 rounded-2xl border border-stone-100 text-xs text-stone-600">
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5 font-bold text-stone-900">
                        <Building2 className="w-4 h-4 text-teal-700" />
                        Entidade Solicitante:
                      </div>
                      <p className="text-stone-800 font-semibold">{res.receiverName}</p>
                      <p className="text-[11px] text-stone-500">{res.receiverEmail}</p>
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5 font-bold text-stone-900">
                        <Store className="w-4 h-4 text-emerald-700" />
                        Doador do Lote:
                      </div>
                      <p className="text-stone-800 font-semibold">{res.donorName}</p>
                      <p className="text-[11px] text-stone-500">
                        Quantidade: <strong>{res.batchQuantity} {res.batchUnit}</strong>
                      </p>
                    </div>
                  </div>

                  {/* Detalhes operacionais */}
                  <div className="text-xs text-stone-500 space-y-1">
                    <div className="flex items-center gap-4 flex-wrap">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-stone-400" />
                        Validade: <strong>{formatDateBR(res.expirationDate)}</strong>
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-stone-400" />
                        Solicitado em {formatDateTimeBR(res.requestedAt)}
                      </span>
                    </div>

                    <div className="pt-2 border-t border-stone-200/60 space-y-1">
                      <div className="flex items-center gap-1.5 text-stone-700 font-semibold text-xs">
                        <Clock className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                        <span>Janela de Retirada:</span>
                      </div>
                      <div className="pl-5 text-[11px] text-stone-800 space-y-0.5">
                        <div><strong className="text-stone-900">Início:</strong> {formatDateTimeBR(res.pickupWindowStart)}</div>
                        <div><strong className="text-stone-900">Término:</strong> {formatDateTimeBR(res.pickupWindowEnd)}</div>
                      </div>
                    </div>

                    <div className="flex items-start gap-1 pt-1">
                      <MapPin className="w-3.5 h-3.5 text-stone-400 shrink-0 mt-0.5" />
                      <span>Local de Retirada: {res.pickupAddress}</span>
                    </div>
                  </div>

                  {/* Registro da decisão administrativa quando houver */}
                  {res.decidedAt && (
                    <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 text-xs text-stone-700">
                      <strong>Parecer Administrativo:</strong> {res.status} por <em>{res.decidedBy || 'Admin'}</em> em{' '}
                      {formatDateTimeBR(res.decidedAt)}
                      {res.decisionNotes && <p className="italic text-[11px] mt-0.5">"{res.decisionNotes}"</p>}
                    </div>
                  )}

                  {res.status === 'CANCELADA' && (
                    <div className="p-2.5 bg-stone-100 rounded-xl text-xs text-stone-600">
                      Cancelada pela entidade em {formatDateTimeBR(res.canceledAt || res.requestedAt)}
                      {res.cancelReason && <span> — "{res.cancelReason}"</span>}
                    </div>
                  )}
                </div>

                {/* Ações de Homologação Administrativa (RF08) */}
                <div className="self-end md:self-center shrink-0 flex items-center gap-2">
                  {isPending ? (
                    <>
                      <button
                        onClick={() => handleApprove(res)}
                        disabled={isOperating}
                        className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-2xs flex items-center gap-1.5 transition-colors disabled:opacity-50"
                      >
                        <Check className="w-4 h-4" />
                        <span>{isOperating ? 'Gravando...' : 'Aprovar Reserva'}</span>
                      </button>

                      <button
                        onClick={() => {
                          setRejectReason('');
                          setRejectModalRes(res);
                        }}
                        disabled={isOperating}
                        className="px-3.5 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-semibold text-xs flex items-center gap-1.5 transition-colors disabled:opacity-50"
                      >
                        <X className="w-4 h-4" />
                        <span>Rejeitar</span>
                      </button>
                    </>
                  ) : (
                    <span className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-stone-100 text-stone-700 border border-stone-200">
                      Decisão Concluída
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal de Justificativa para Rejeição de Reserva (RF08) */}
      {rejectModalRes && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-900/60 backdrop-blur-xs flex justify-center items-start sm:items-center p-2.5 sm:p-4 overscroll-contain">
          <div className="bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-6 max-w-md w-full shadow-2xl border border-stone-200 animate-in fade-in zoom-in-95 duration-150 my-auto max-h-[calc(100dvh-1.25rem)] sm:max-h-[min(90vh,750px)] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100 mb-4 shrink-0">
              <div className="flex items-center gap-2 text-rose-700">
                <XCircle className="w-5 h-5 shrink-0" />
                <h4 className="font-bold text-stone-900 text-base font-serif leading-tight">
                  Rejeitar Solicitação de Reserva
                </h4>
              </div>
              <button onClick={() => setRejectModalRes(null)} aria-label="Fechar" className="p-1 rounded-lg text-stone-400 hover:text-stone-600 hover:bg-stone-100 shrink-0">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="overflow-y-auto overscroll-contain flex-1 pr-0.5">

            <p className="text-xs text-stone-600 leading-relaxed mb-3">
              Você está rejeitando a solicitação do lote <strong>"{rejectModalRes.foodName}"</strong> feito pela entidade <strong>"{rejectModalRes.receiverName}"</strong>.
            </p>

            <div className="mb-4">
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Justificativa da Rejeição:
              </label>
              <textarea
                rows={3}
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Ex: Incompatibilidade de capacidade de recebimento ou lote redistribuído para entidade de emergência."
                className="w-full p-2.5 text-xs rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-rose-500"
              />
            </div>

            <div className="text-[11px] text-stone-500 bg-stone-50 p-3 rounded-xl border border-stone-200 mb-4">
              * Nota: Ao rejeitar, a decisão é persistida para auditoria e o lote volta automaticamente para o estado <strong>DISPONÍVEL</strong> caso ainda esteja dentro do prazo de validade.
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone-100">
              <button
                type="button"
                onClick={() => setRejectModalRes(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-stone-600 hover:bg-stone-100"
              >
                Voltar
              </button>
              <button
                type="button"
                disabled={operatingId === rejectModalRes.id}
                onClick={handleConfirmReject}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-rose-600 text-white hover:bg-rose-700 shadow-xs"
              >
                Confirmar Rejeição
              </button>
            </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
