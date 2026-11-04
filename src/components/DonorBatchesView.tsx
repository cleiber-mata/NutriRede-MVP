import React, { useEffect, useState } from 'react';
import {
  Package,
  PlusCircle,
  Clock,
  CheckCircle2,
  AlertCircle,
  MapPin,
  Calendar,
  XCircle,
  Filter,
  Search,
  Scale,
  Sparkles,
  Info,
  Truck
} from 'lucide-react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from '../context/AuthContext';
import { BATCH_STATUS_CONFIG, FoodBatch, FoodBatchStatus, Occurrence, Pickup, Reservation } from '../types';
import { cancelFoodBatch } from '../services/foodBatchService';
import { CreateBatchModal } from './CreateBatchModal';
import { formatDateBR, formatDateTimeBR } from '../utils/dateUtils';
import { OperationTimeline } from './OperationTimeline';

export const DonorBatchesView: React.FC = () => {
  const { currentUser, userAccount } = useAuth();

  const [batches, setBatches] = useState<FoodBatch[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [pickups, setPickups] = useState<Pickup[]>([]);
  const [occurrences, setOccurrences] = useState<Occurrence[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'ALL' | FoodBatchStatus>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [cancelingId, setCancelingId] = useState<string | null>(null);
  const [actionMsg, setActionMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    if (!currentUser) return;

    setLoading(true);
    const qBatches = query(
      collection(db, 'food_batches'),
      where('donorId', '==', currentUser.uid)
    );

    const qReservations = query(
      collection(db, 'reservations'),
      where('donorId', '==', currentUser.uid)
    );

    const qPickups = query(
      collection(db, 'pickups'),
      where('donorId', '==', currentUser.uid)
    );

    const qOccurrences = query(
      collection(db, 'occurrences'),
      where('donorId', '==', currentUser.uid)
    );

    const unsubscribeBatches = onSnapshot(
      qBatches,
      (snapshot) => {
        const list: FoodBatch[] = [];
        snapshot.forEach((docItem) => {
          list.push(docItem.data() as FoodBatch);
        });
        list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setBatches(list);
        setLoading(false);
      },
      (error) => {
        console.error('Erro ao carregar lotes do doador:', error);
        setLoading(false);
      }
    );

    const unsubscribeReservations = onSnapshot(
      qReservations,
      (snapshot) => {
        const list: Reservation[] = [];
        snapshot.forEach((docItem) => {
          list.push(docItem.data() as Reservation);
        });
        setReservations(list);
      },
      (error) => {
        console.warn('Erro ao escutar reservas do doador:', error);
      }
    );

    const unsubscribePickups = onSnapshot(
      qPickups,
      (snapshot) => {
        const list: Pickup[] = [];
        snapshot.forEach((docItem) => {
          list.push(docItem.data() as Pickup);
        });
        setPickups(list);
      },
      (error) => {
        console.warn('Erro ao escutar coletas do doador:', error);
      }
    );

    const unsubscribeOccurrences = onSnapshot(
      qOccurrences,
      (snapshot) => {
        const list: Occurrence[] = [];
        snapshot.forEach((docItem) => {
          list.push(docItem.data() as Occurrence);
        });
        setOccurrences(list);
      },
      (error) => {
        console.warn('Erro ao escutar ocorrências do doador:', error);
      }
    );

    return () => {
      unsubscribeBatches();
      unsubscribeReservations();
      unsubscribePickups();
      unsubscribeOccurrences();
    };
  }, [currentUser]);

  const handleCancelBatch = async (batchId: string, foodName: string) => {
    if (!confirm(`Tem certeza que deseja cancelar a oferta do lote "${foodName}"?`)) return;

    setCancelingId(batchId);
    setActionMsg(null);
    try {
      if (currentUser) {
        await cancelFoodBatch(batchId, currentUser.uid);
        setActionMsg({ text: `Oferta do lote "${foodName}" cancelada com sucesso.`, type: 'success' });
      }
    } catch (err: unknown) {
      console.error('Erro ao cancelar lote:', err);
      setActionMsg({ text: 'Falha ao cancelar o lote.', type: 'error' });
    } finally {
      setCancelingId(null);
    }
  };

  const filteredBatches = batches.filter((b) => {
    const matchStatus = statusFilter === 'ALL' || b.status === statusFilter;
    const matchSearch =
      searchTerm === '' ||
      b.foodName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.pickupAddress.toLowerCase().includes(searchTerm.toLowerCase());
    return matchStatus && matchSearch;
  });

  const availableCount = batches.filter((b) => b.status === 'DISPONIVEL').length;
  const reservedCount = batches.filter((b) => b.status === 'RESERVADO').length;
  const canceledCount = batches.filter((b) => b.status === 'CANCELADO').length;

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header da Área Minhas Doações */}
      <div className="bg-gradient-to-r from-emerald-800 to-teal-900 rounded-3xl p-6 sm:p-8 text-white shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-200 border border-emerald-400/30 text-xs font-semibold mb-3">
            <Package className="w-3.5 h-3.5" />
            Módulo Operacional do Doador (RF04)
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold font-serif">Minhas Doações Ofertadas</h2>
          <p className="text-emerald-100/80 text-xs sm:text-sm mt-1 max-w-xl">
            Cadastre excedentes próprios para consumo e acompanhe em tempo real a situação e reservas dos seus lotes.
          </p>
        </div>

        <button
          onClick={() => setIsCreateOpen(true)}
          className="px-5 py-3 rounded-2xl bg-white text-emerald-900 hover:bg-emerald-50 font-bold text-xs shadow-md transition-all hover:scale-[1.02] flex items-center justify-center gap-2 shrink-0"
        >
          <PlusCircle className="w-4 h-4 text-emerald-700" />
          <span>Cadastrar Novo Lote</span>
        </button>
      </div>

      {/* Alerta de Feedback */}
      {actionMsg && (
        <div
          className={`p-3.5 rounded-2xl text-xs flex items-center justify-between gap-3 ${
            actionMsg.type === 'success'
              ? 'bg-emerald-50 text-emerald-900 border border-emerald-300'
              : 'bg-rose-50 text-rose-900 border border-rose-300'
          }`}
        >
          <div className="flex items-center gap-2">
            {actionMsg.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span className="font-medium">{actionMsg.text}</span>
          </div>
          <button onClick={() => setActionMsg(null)} className="text-stone-400 font-bold">
            ×
          </button>
        </div>
      )}

      {/* Métricas Rápidas */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div
          onClick={() => setStatusFilter('ALL')}
          className={`p-4 rounded-2xl border-2 cursor-pointer transition-all ${
            statusFilter === 'ALL'
              ? 'border-emerald-600 bg-white shadow-xs'
              : 'border-stone-200 bg-white hover:border-emerald-300'
          }`}
        >
          <div className="flex items-center justify-between text-stone-500 mb-1 text-xs font-bold uppercase">
            <span>Total Ofertado</span>
            <Package className="w-4 h-4 text-stone-400" />
          </div>
          <div className="text-2xl font-extrabold text-stone-900">{batches.length}</div>
          <p className="text-[11px] text-stone-500 mt-0.5">Lotes cadastrados</p>
        </div>

        <div
          onClick={() => setStatusFilter('DISPONIVEL')}
          className={`p-4 rounded-2xl border-2 cursor-pointer transition-all ${
            statusFilter === 'DISPONIVEL'
              ? 'border-emerald-500 bg-emerald-50/70 shadow-xs'
              : 'border-stone-200 bg-white hover:border-emerald-300'
          }`}
        >
          <div className="flex items-center justify-between text-emerald-700 mb-1 text-xs font-bold uppercase">
            <span>Disponíveis</span>
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <div className="text-2xl font-extrabold text-stone-900">{availableCount}</div>
          <p className="text-[11px] text-emerald-800 mt-0.5">Aguardando reservas</p>
        </div>

        <div
          onClick={() => setStatusFilter('RESERVADO')}
          className={`p-4 rounded-2xl border-2 cursor-pointer transition-all ${
            statusFilter === 'RESERVADO'
              ? 'border-amber-500 bg-amber-50/70 shadow-xs'
              : 'border-stone-200 bg-white hover:border-amber-300'
          }`}
        >
          <div className="flex items-center justify-between text-amber-700 mb-1 text-xs font-bold uppercase">
            <span>Reservados</span>
            <Clock className="w-4 h-4" />
          </div>
          <div className="text-2xl font-extrabold text-stone-900">{reservedCount}</div>
          <p className="text-[11px] text-amber-800 mt-0.5">Reserva solicitada/aprovada</p>
        </div>

        <div
          onClick={() => setStatusFilter('CANCELADO')}
          className={`p-4 rounded-2xl border-2 cursor-pointer transition-all ${
            statusFilter === 'CANCELADO'
              ? 'border-stone-600 bg-stone-100 shadow-xs'
              : 'border-stone-200 bg-white hover:border-stone-400'
          }`}
        >
          <div className="flex items-center justify-between text-stone-600 mb-1 text-xs font-bold uppercase">
            <span>Cancelados</span>
            <XCircle className="w-4 h-4" />
          </div>
          <div className="text-2xl font-extrabold text-stone-900">{canceledCount}</div>
          <p className="text-[11px] text-stone-500 mt-0.5">Retirados da plataforma</p>
        </div>
      </div>

      {/* Filtros e Busca */}
      <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar por alimento, categoria ou local..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        <div className="flex items-center gap-1 bg-stone-100 p-1 rounded-xl text-xs w-full sm:w-auto overflow-x-auto">
          <span className="text-[10px] font-bold text-stone-500 px-2 uppercase">Status:</span>
          {(['ALL', 'DISPONIVEL', 'RESERVADO', 'CANCELADO'] as const).map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-2.5 py-1 rounded-lg font-semibold whitespace-nowrap transition-colors ${
                statusFilter === st
                  ? 'bg-white text-stone-900 shadow-2xs'
                  : 'text-stone-500 hover:text-stone-900'
              }`}
            >
              {st === 'ALL' ? 'Todos' : BATCH_STATUS_CONFIG[st].label}
            </button>
          ))}
        </div>
      </div>

      {/* Lista de Lotes */}
      {loading ? (
        <div className="text-center py-12">
          <div className="w-8 h-8 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
          <p className="text-xs text-stone-500">Carregando lotes cadastrados...</p>
        </div>
      ) : filteredBatches.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-stone-200 space-y-3">
          <Package className="w-12 h-12 text-stone-300 mx-auto" />
          <h4 className="text-base font-bold text-stone-800 font-serif">Nenhum lote de doação encontrado</h4>
          <p className="text-xs text-stone-500 max-w-sm mx-auto">
            {batches.length === 0
              ? 'Você ainda não cadastrou nenhum lote de alimentos. Cadastre sua primeira doação e ajude a combater o desperdício!'
              : 'Nenhum lote corresponde aos filtros selecionados acima.'}
          </p>
          {batches.length === 0 && (
            <button
              onClick={() => setIsCreateOpen(true)}
              className="mt-2 px-4 py-2 rounded-xl bg-emerald-600 text-white font-semibold text-xs hover:bg-emerald-700 shadow-xs inline-flex items-center gap-1.5"
            >
              <PlusCircle className="w-4 h-4" />
              Cadastrar Meu Primeiro Lote
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredBatches.map((batch) => {
            const statusMeta = BATCH_STATUS_CONFIG[batch.status];
            const isOperating = cancelingId === batch.id;
            const isExpired = new Date(batch.expirationDate).getTime() < new Date().setHours(0, 0, 0, 0);
            const linkedRes = reservations.find((r) => r.id === batch.activeReservationId || r.batchId === batch.id);
            const linkedPickup = pickups.find((p) => p.batchId === batch.id || (linkedRes && p.reservationId === linkedRes.id) || p.id === batch.activePickupId);
            const batchOccurrences = occurrences.filter((o) => o.batchId === batch.id || (linkedRes && o.operationId === linkedRes.id) || (linkedPickup && o.operationId === linkedPickup.id));
            const isApprovedReservation =
              batch.activeReservationStatus === 'APROVADA' || linkedRes?.status === 'APROVADA';

            return (
              <div
                key={batch.id}
                className="bg-white rounded-3xl p-6 border border-stone-200 shadow-2xs hover:shadow-xs transition-shadow flex flex-col justify-between space-y-4"
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-stone-100 text-stone-700">
                        {batch.category}
                      </span>
                      <h3 className="text-lg font-bold text-stone-900 mt-1">{batch.foodName}</h3>
                    </div>

                    {batch.status === 'RESERVADO' ? (
                      isApprovedReservation ? (
                        <span className="text-xs px-2.5 py-1 rounded-full font-bold border shrink-0 bg-emerald-100 text-emerald-800 border-emerald-300 flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          Reserva Aprovada
                        </span>
                      ) : (
                        <span className="text-xs px-2.5 py-1 rounded-full font-bold border shrink-0 bg-amber-100 text-amber-900 border-amber-300 flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-amber-700" />
                          Reserva Solicitada
                        </span>
                      )
                    ) : (
                      <span
                        className={`text-xs px-2.5 py-1 rounded-full font-bold border shrink-0 ${statusMeta.badgeClass}`}
                      >
                        {statusMeta.label}
                      </span>
                    )}
                  </div>

                  <div className="p-3 bg-stone-50 rounded-2xl border border-stone-100 space-y-2 text-xs text-stone-600">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5 font-semibold text-stone-900">
                        <Scale className="w-4 h-4 text-emerald-700" />
                        Quantidade Ofertada:
                      </span>
                      <span className="font-extrabold text-stone-900 text-sm">
                        {batch.quantity} {batch.unit}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <Calendar className="w-4 h-4 text-stone-400" />
                        Validade:
                      </span>
                      <span className={`font-semibold ${isExpired ? 'text-rose-600' : 'text-stone-800'}`}>
                        {formatDateBR(batch.expirationDate)}
                        {isExpired && ' (Vencido)'}
                      </span>
                    </div>

                    <div className="pt-2 border-t border-stone-200/60 space-y-1">
                      <div className="flex items-center gap-1.5 text-stone-700 font-semibold text-xs">
                        <Clock className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                        <span>Janela de Retirada:</span>
                      </div>
                      <div className="pl-5 text-[11px] text-stone-800 space-y-0.5">
                        <div><strong className="text-stone-900">Início:</strong> {formatDateTimeBR(batch.pickupWindowStart)}</div>
                        <div><strong className="text-stone-900">Término:</strong> {formatDateTimeBR(batch.pickupWindowEnd)}</div>
                      </div>
                    </div>

                    <div className="flex items-start gap-1.5 pt-1 border-t border-stone-200/60">
                      <MapPin className="w-4 h-4 text-stone-400 shrink-0 mt-0.5" />
                      <span className="text-[11px] text-stone-600 line-clamp-1">{batch.pickupAddress}</span>
                    </div>
                  </div>

                  {/* Informação sobre reserva vinculada com distinção clara de situações */}
                  {batch.status === 'RESERVADO' && (
                    isApprovedReservation ? (
                      <div className="mt-3 p-3 bg-emerald-50 rounded-xl border border-emerald-300 text-xs text-emerald-950 space-y-1">
                        <div className="font-bold flex items-center gap-1.5 text-emerald-800">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                          {batch.activePickupId ? 'Coleta Aceita por Transportador' : 'Reserva Aprovada — Aguardando Transportador'}
                        </div>
                        <p className="text-[11px] text-emerald-900">
                          Entidade Receptora: <strong>{batch.reservedByName || linkedRes?.receiverName || 'Entidade Homologada'}</strong>.
                          {batch.transporterName && <span> • Transportador: <strong>{batch.transporterName}</strong></span>}
                        </p>
                        {linkedRes?.decidedAt && (
                          <p className="text-[10px] text-emerald-700">
                            Homologada em {formatDateTimeBR(linkedRes.decidedAt)} por {linkedRes.decidedBy || 'Administrador'}
                          </p>
                        )}
                      </div>
                    ) : (
                      <div className="mt-3 p-3 bg-amber-50 rounded-xl border border-amber-300 text-xs text-amber-950 space-y-1">
                        <div className="font-bold flex items-center gap-1.5 text-amber-800">
                          <Clock className="w-4 h-4 text-amber-700 shrink-0" />
                          Reserva Solicitada — Aguardando Homologação Administrativa (RF08)
                        </div>
                        <p className="text-[11px] text-amber-900">
                          Solicitada pela entidade: <strong>{batch.reservedByName || linkedRes?.receiverName || 'Entidade Receptora'}</strong>. Em avaliação pela administração.
                        </p>
                        {linkedRes?.requestedAt && (
                          <p className="text-[10px] text-amber-700">
                            Solicitada em {formatDateTimeBR(linkedRes.requestedAt)}
                          </p>
                        )}
                      </div>
                    )
                  )}

                  {batch.status === 'EM_TRANSPORTE' && (
                    <div className="mt-3 p-3 bg-blue-50 rounded-xl border border-blue-300 text-xs text-blue-950 space-y-1">
                      <div className="font-bold flex items-center gap-1.5 text-blue-800">
                        <Truck className="w-4 h-4 text-blue-600 shrink-0" />
                        Alimentos Retirados — Em Transporte
                      </div>
                      <p className="text-[11px] text-blue-900">
                        Retirada confirmada por <strong>{batch.transporterName || 'Transportador'}</strong> e a caminho da entidade receptora.
                      </p>
                      {batch.pickedUpAt && (
                        <p className="text-[10px] text-blue-700">
                          Retirada em {formatDateTimeBR(batch.pickedUpAt)}
                        </p>
                      )}
                    </div>
                  )}

                  {batch.status === 'CONCLUIDO' && (
                    <div className="mt-3 p-3 bg-emerald-50 rounded-xl border border-emerald-300 text-xs text-emerald-950 space-y-1">
                      <div className="font-bold flex items-center gap-1.5 text-emerald-800">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        Doação Concluída com Sucesso (RN08)
                      </div>
                      <p className="text-[11px] text-emerald-900">
                        Recebimento confirmado no destino pela entidade receptora ({batch.reservedByName || linkedRes?.receiverName}).
                      </p>
                      {batch.completedAt && (
                        <p className="text-[10px] text-emerald-700">
                          Finalizada em {formatDateTimeBR(batch.completedAt)}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Linha do Tempo da Operação (RF13) */}
                  {(linkedRes || batch.status !== 'DISPONIVEL') && (
                    <div className="mt-3">
                      <OperationTimeline
                        batch={batch}
                        reservation={linkedRes}
                        pickup={linkedPickup}
                        occurrences={batchOccurrences}
                      />
                    </div>
                  )}
                </div>

                {/* Ações */}
                <div className="pt-3 border-t border-stone-100 flex items-center justify-between text-xs text-stone-500">
                  <span className="text-[10px]">
                    Cadastrado em {formatDateBR(batch.createdAt)}
                  </span>

                  {batch.status === 'DISPONIVEL' && (
                    <button
                      onClick={() => handleCancelBatch(batch.id, batch.foodName)}
                      disabled={isOperating}
                      className="px-3 py-1.5 rounded-xl text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition-colors disabled:opacity-50"
                    >
                      {isOperating ? 'Cancelando...' : 'Cancelar Oferta'}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal de Cadastro */}
      <CreateBatchModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onBatchCreated={() => setIsCreateOpen(false)}
      />
    </div>
  );
};
