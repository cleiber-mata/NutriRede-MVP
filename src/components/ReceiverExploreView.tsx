import React, { useEffect, useState } from 'react';
import {
  Package,
  Calendar,
  Clock,
  MapPin,
  Building2,
  Search,
  Scale,
  CheckCircle2,
  AlertCircle,
  Thermometer,
  Sparkles,
  ArrowRight,
  Filter,
  X,
  ChevronDown,
  Info
} from 'lucide-react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from '../context/AuthContext';
import { FoodBatch, FoodCategory } from '../types';
import { reserveFoodBatchAtomic } from '../services/foodBatchService';
import { formatDateBR, formatDateTimeBR, isBatchExpired } from '../utils/dateUtils';

interface ReceiverExploreViewProps {
  onGoToReservations: () => void;
}

const CATEGORIES: ('ALL' | FoodCategory)[] = [
  'ALL',
  'Hortifruti',
  'Padaria e Grãos',
  'Laticínios e Derivados',
  'Refeições Preparadas',
  'Mercearia e Embalados',
  'Outros'
];

export const ReceiverExploreView: React.FC<ReceiverExploreViewProps> = ({
  onGoToReservations
}) => {
  const { currentUser, userAccount } = useAuth();

  const [availableBatches, setAvailableBatches] = useState<FoodBatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<'ALL' | FoodCategory>('ALL');

  // M50: Apenas uma oferta expandida por vez. Todas iniciam recolhidas.
  const [expandedBatchId, setExpandedBatchId] = useState<string | null>(null);

  const toggleExpand = (batchId: string) => {
    setExpandedBatchId((prev) => (prev === batchId ? null : batchId));
  };

  // Modal de confirmação de reserva
  const [reservingBatch, setReservingBatch] = useState<FoodBatch | null>(null);
  const [reserveLoading, setReserveLoading] = useState(false);
  const [reserveError, setReserveError] = useState<string | null>(null);
  const [reserveSuccessMsg, setReserveSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    // Consulta lotes com estado 'DISPONIVEL'
    const q = query(
      collection(db, 'food_batches'),
      where('status', '==', 'DISPONIVEL')
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const list: FoodBatch[] = [];

        snapshot.forEach((docItem) => {
          const batch = docItem.data() as FoodBatch;
          // M41: Filtra somente lotes aptos e não vencidos usando calendário de Brasília e horário-limite seguro
          const isExpired = isBatchExpired(batch.expirationDate, batch.consumptionDeadline);
          const isOwnBatch = currentUser && batch.donorId === currentUser.uid;

          if (!isExpired && !batch.activeReservationId && !isOwnBatch) {
            list.push(batch);
          }
        });

        // Ordena por validade mais próxima (prioridade para evitar desperdício!)
        list.sort((a, b) => new Date(a.expirationDate).getTime() - new Date(b.expirationDate).getTime());
        setAvailableBatches(list);
        setLoading(false);
      },
      (error) => {
        console.error('Erro ao consultar lotes disponíveis:', error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [currentUser]);

  const handleConfirmReservation = async () => {
    if (!reservingBatch || !currentUser) return;

    setReserveLoading(true);
    setReserveError(null);

    // CORREÇÃO 1 — Proibição estrita de autorreserva
    if (reservingBatch.donorId === currentUser.uid) {
      setReserveError('Nenhum usuário pode reservar uma doação cadastrada pela sua própria conta.');
      setReserveLoading(false);
      return;
    }

    try {
      await reserveFoodBatchAtomic({
        batchId: reservingBatch.id,
        receiverId: currentUser.uid,
        receiverName: userAccount?.name || currentUser.displayName || 'Entidade Receptora',
        receiverEmail: currentUser.email || '',
        receiverPhone: userAccount?.phone || ''
      });

      setReserveSuccessMsg(
        `Reserva do lote "${reservingBatch.foodName}" solicitada com sucesso! Situação: PENDENTE_APROVACAO.`
      );
      setReservingBatch(null);
    } catch (err: unknown) {
      console.error('Erro na reserva:', err);
      setReserveError(
        err instanceof Error ? err.message : 'Falha ao solicitar reserva. Tente novamente.'
      );
    } finally {
      setReserveLoading(false);
    }
  };

  const filtered = availableBatches.filter((b) => {
    const matchCat = selectedCategory === 'ALL' || b.category === selectedCategory;
    const matchSearch =
      searchTerm === '' ||
      b.foodName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.donorName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.pickupAddress.toLowerCase().includes(searchTerm.toLowerCase());
    return matchCat && matchSearch;
  });

  // M50: Ajusta o estado de expansão caso a oferta atualmente expandida deixe de estar visível
  useEffect(() => {
    if (expandedBatchId && !filtered.some((b) => b.id === expandedBatchId)) {
      setExpandedBatchId(null);
    }
  }, [filtered, expandedBatchId]);

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-teal-800 to-emerald-900 rounded-3xl p-6 sm:p-8 text-white shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-500/20 text-teal-200 border border-teal-400/30 text-xs font-semibold mb-3">
            <Building2 className="w-3.5 h-3.5" />
            Módulo Operacional da Entidade Receptora
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold font-serif">Ofertas de Alimentos Disponíveis</h2>
          <p className="text-teal-100/80 text-xs sm:text-sm mt-1 max-w-xl leading-relaxed">
            Consulte doações de excedentes alimentares e solicite a reserva exclusiva para atendimento comunitário das famílias assistidas.
          </p>
        </div>

        <button
          onClick={onGoToReservations}
          className="px-5 py-3 rounded-2xl bg-white text-teal-900 hover:bg-teal-50 font-bold text-xs shadow-md transition-all hover:scale-[1.02] flex items-center justify-center gap-2 shrink-0"
        >
          <span>Minhas Reservas Solicitadas</span>
          <ArrowRight className="w-4 h-4 text-teal-700" />
        </button>
      </div>

      {/* Alerta de Feedback de Sucesso */}
      {reserveSuccessMsg && (
        <div className="p-4 rounded-2xl bg-emerald-50 text-emerald-900 border border-emerald-300 text-xs flex items-center justify-between gap-3 animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="font-semibold">{reserveSuccessMsg}</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onGoToReservations}
              className="underline font-bold text-emerald-800 hover:text-emerald-950"
            >
              Ver em Minhas Reservas
            </button>
            <button
              onClick={() => setReserveSuccessMsg(null)}
              className="text-stone-400 hover:text-stone-600 font-bold ml-2"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* Filtros e Busca */}
      <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-2xs flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar por alimento, doador ou local..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
        </div>

        <div className="flex items-center gap-1 bg-stone-100 p-1 rounded-xl text-xs w-full md:w-auto overflow-x-auto">
          <span className="text-[10px] font-bold text-stone-500 px-2 uppercase">Categoria:</span>
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-2.5 py-1 rounded-lg font-semibold whitespace-nowrap transition-colors ${
                selectedCategory === cat
                  ? 'bg-white text-stone-900 shadow-2xs'
                  : 'text-stone-500 hover:text-stone-900'
              }`}
            >
              {cat === 'ALL' ? 'Todas' : cat}
            </button>
          ))}
        </div>
      </div>

      {/* Listagem de Ofertas Disponíveis */}
      {loading ? (
        <div className="text-center py-12">
          <div className="w-8 h-8 border-3 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
          <p className="text-xs text-stone-500">Consultando ofertas disponíveis no Cloud Firestore...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-stone-200 space-y-3">
          <Package className="w-12 h-12 text-stone-300 mx-auto" />
          <h4 className="text-base font-bold text-stone-800 font-serif">Nenhum lote disponível no momento</h4>
          <p className="text-xs text-stone-500 max-w-sm mx-auto leading-relaxed">
            {availableBatches.length === 0
              ? 'Não há ofertas ativas no momento. Novos lotes cadastrados por doadores homologados aparecerão aqui em tempo real.'
              : 'Nenhuma oferta atende aos critérios do filtro selecionado.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((batch) => {
            // Previne desvio de fuso horário UTC: se YYYY-MM-DD, avalia no final do dia local
            const expDateStr = batch.expirationDate.includes('T') ? batch.expirationDate : `${batch.expirationDate}T23:59:59`;
            const expDate = new Date(expDateStr);
            const daysLeft = Math.max(0, Math.ceil((expDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)));
            const isExpanded = expandedBatchId === batch.id;

            return (
              <div
                key={batch.id}
                className={`bg-white rounded-2xl sm:rounded-3xl border transition-all duration-200 overflow-hidden ${
                  isExpanded
                    ? 'border-teal-500 shadow-md ring-1 ring-teal-500/20'
                    : 'border-stone-200 shadow-2xs hover:border-teal-300 hover:shadow-xs'
                }`}
              >
                {/* Linha Compacta Clicável (M50) */}
                <button
                  type="button"
                  onClick={() => toggleExpand(batch.id)}
                  aria-expanded={isExpanded}
                  aria-controls={`batch-details-${batch.id}`}
                  className="w-full text-left p-4 sm:p-5 flex items-center justify-between gap-3 sm:gap-4 transition-colors hover:bg-stone-50/70 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 group"
                >
                  <div className="flex items-center gap-2 sm:gap-3 flex-wrap sm:flex-nowrap flex-1 min-w-0">
                    {/* Nome do alimento */}
                    <div className="flex items-center gap-2 min-w-0">
                      <Package className="w-4 h-4 text-teal-700 shrink-0" />
                      <span className="font-bold text-stone-900 text-sm sm:text-base font-serif truncate">
                        {batch.foodName}
                      </span>
                    </div>

                    <span className="text-stone-300 hidden sm:inline select-none">|</span>

                    {/* Quantidade e unidade */}
                    <span className="text-xs font-bold text-teal-900 bg-teal-50 px-2.5 py-0.5 rounded-full border border-teal-200 shrink-0">
                      {batch.quantity} {batch.unit}
                    </span>

                    <span className="text-stone-300 hidden sm:inline select-none">|</span>

                    {/* Data de validade */}
                    <span className="text-xs text-stone-600 shrink-0 flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-stone-400" />
                      <span className={daysLeft <= 2 ? 'text-amber-700 font-semibold' : ''}>
                        {formatDateBR(batch.expirationDate)}
                        {daysLeft <= 2 && (
                          <span className="text-[10px] ml-1 font-normal text-amber-700">
                            ({daysLeft === 0 ? 'Hoje' : `${daysLeft}d restantes`})
                          </span>
                        )}
                      </span>
                    </span>

                    <span className="text-stone-300 hidden sm:inline select-none">|</span>

                    {/* Status de disponibilidade */}
                    <div className="shrink-0">
                      <span className="text-xs px-2.5 py-0.5 rounded-full font-bold border inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 border-emerald-200">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        Disponível
                      </span>
                    </div>
                  </div>

                  {/* Ícone para expandir/recolher */}
                  <div className="shrink-0 pl-1 sm:pl-2">
                    <span
                      className={`w-7 h-7 rounded-xl flex items-center justify-center transition-all duration-200 ${
                        isExpanded
                          ? 'bg-teal-100 text-teal-800 rotate-180'
                          : 'bg-stone-100 text-stone-500 group-hover:bg-stone-200 group-hover:text-stone-800'
                      }`}
                      aria-hidden="true"
                    >
                      <ChevronDown className="w-4 h-4 transition-transform duration-200" />
                    </span>
                  </div>
                </button>

                {/* Detalhes Expansíveis (M50) */}
                {isExpanded && (
                  <div
                    id={`batch-details-${batch.id}`}
                    className="border-t border-stone-100 p-5 sm:p-6 bg-stone-50/40 space-y-4 animate-in fade-in slide-in-from-top-1 duration-150"
                  >
                    {/* Grid com Categoria, Doador, Quantidade e Validade */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 p-4 bg-white rounded-2xl border border-stone-200/80 text-xs text-stone-600 shadow-2xs">
                      <div>
                        <span className="text-[10px] uppercase font-bold text-stone-400 block">
                          Categoria do Alimento
                        </span>
                        <span className="inline-block mt-1 text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-teal-50 text-teal-800 border border-teal-200">
                          {batch.category}
                        </span>
                      </div>

                      <div>
                        <span className="text-[10px] uppercase font-bold text-stone-400 block">
                          Doador Responsável
                        </span>
                        <strong className="text-stone-900 text-sm block mt-0.5">
                          {batch.donorName}
                        </strong>
                        {batch.donorEmail && (
                          <span className="text-[11px] text-stone-500 block truncate">
                            {batch.donorEmail}
                          </span>
                        )}
                      </div>

                      <div>
                        <span className="text-[10px] uppercase font-bold text-stone-400 block">
                          Quantidade Disponível
                        </span>
                        <strong className="text-stone-900 text-sm block mt-0.5">
                          {batch.quantity} {batch.unit}
                        </strong>
                      </div>

                      <div>
                        <span className="text-[10px] uppercase font-bold text-stone-400 block">
                          Data de Validade
                        </span>
                        <span
                          className={`text-sm font-semibold block mt-0.5 ${
                            daysLeft <= 2 ? 'text-amber-700 font-bold' : 'text-stone-800'
                          }`}
                        >
                          {formatDateBR(batch.expirationDate)}
                          <span className="text-xs font-normal text-stone-500 ml-1">
                            ({daysLeft === 0 ? 'Hoje' : `${daysLeft}d restantes`})
                          </span>
                        </span>
                        {batch.consumptionDeadline && (
                          <span className="text-[11px] text-amber-800 font-semibold block mt-0.5">
                            Horário-limite: {batch.consumptionDeadline.replace(':', 'h')}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Condições de Conservação, Janela de Retirada, Local e Observações */}
                    <div className="p-4 bg-white rounded-2xl border border-stone-200/80 text-xs text-stone-600 shadow-2xs space-y-3">
                      {batch.storageCondition && (
                        <div className="flex items-start gap-2">
                          <Thermometer className="w-4 h-4 text-teal-700 shrink-0 mt-0.5" />
                          <div>
                            <span className="font-semibold text-stone-900 block">Condições de Conservação:</span>
                            <span className="text-stone-700">{batch.storageCondition}</span>
                          </div>
                        </div>
                      )}

                      <div className="flex items-start gap-2 pt-2 border-t border-stone-100">
                        <Clock className="w-4 h-4 text-teal-700 shrink-0 mt-0.5" />
                        <div className="space-y-0.5">
                          <span className="font-semibold text-stone-900 block">Janela de Retirada:</span>
                          <div className="text-[11px] text-stone-700">
                            <div><strong className="text-stone-900">Início:</strong> {formatDateTimeBR(batch.pickupWindowStart)}</div>
                            <div><strong className="text-stone-900">Término:</strong> {formatDateTimeBR(batch.pickupWindowEnd)}</div>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-start gap-2 pt-2 border-t border-stone-100">
                        <MapPin className="w-4 h-4 text-teal-700 shrink-0 mt-0.5" />
                        <div>
                          <span className="font-semibold text-stone-900 block">Local de Retirada:</span>
                          <span className="text-stone-700">{batch.pickupAddress}</span>
                        </div>
                      </div>

                      {((batch as any).notes || batch.fitForConsumption) && (
                        <div className="flex items-start gap-2 pt-2 border-t border-stone-100">
                          <Info className="w-4 h-4 text-teal-700 shrink-0 mt-0.5" />
                          <div>
                            <span className="font-semibold text-stone-900 block">Observações e Declarações:</span>
                            {(batch as any).notes && (
                              <p className="text-stone-700 mb-1">{(batch as any).notes}</p>
                            )}
                            {batch.fitForConsumption && (
                              <span className="text-[11px] text-emerald-700 inline-flex items-center gap-1 font-medium">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                Alimento declarado próprio para consumo humano pelo doador.
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Ações: Botão Solicitar Reserva */}
                    <div className="pt-1 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                      <div className="text-[11px] text-stone-500 flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                        <span>Reserva com bloqueio atômico contra concorrência entre entidades.</span>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          setReserveError(null);
                          setReservingBatch(batch);
                        }}
                        className="w-full sm:w-auto py-2.5 px-5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-semibold text-xs shadow-xs transition-colors flex items-center justify-center gap-2 shrink-0"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Solicitar Reserva</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Modal de Confirmação da Reserva Exclusiva (RF06 / RN04) */}
      {reservingBatch && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-900/60 backdrop-blur-xs flex justify-center items-start sm:items-center p-2.5 sm:p-4 overscroll-contain">
          <div className="bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-6 max-w-lg w-full shadow-2xl border border-stone-200 animate-in fade-in zoom-in-95 duration-150 my-auto max-h-[calc(100dvh-1.25rem)] sm:max-h-[min(90vh,800px)] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100 mb-4 shrink-0">
              <div className="flex items-center gap-2 text-teal-800">
                <Package className="w-5 h-5 shrink-0" />
                <h4 className="font-bold text-stone-900 text-base font-serif leading-tight">
                  Confirmar Solicitação de Reserva
                </h4>
              </div>
              <button
                onClick={() => setReservingBatch(null)}
                aria-label="Fechar"
                className="p-1 rounded-lg text-stone-400 hover:text-stone-600 hover:bg-stone-100 shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="overflow-y-auto overscroll-contain flex-1 pr-0.5">

            {reserveError && (
              <div className="p-3 mb-3 bg-rose-50 text-rose-800 border border-rose-200 rounded-xl text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <div>{reserveError}</div>
              </div>
            )}

            <div className="space-y-3 text-xs text-stone-600 mb-6">
              <p>
                Você está solicitando a reserva exclusiva do lote de alimentos abaixo:
              </p>

              <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200 space-y-1.5">
                <div className="text-sm font-bold text-stone-900">{reservingBatch.foodName}</div>
                <div className="text-xs text-teal-800 font-semibold">
                  Quantidade: {reservingBatch.quantity} {reservingBatch.unit}
                </div>
                <div className="text-xs text-stone-600">
                  Doador: {reservingBatch.donorName}
                </div>
                <div className="text-xs text-stone-600">
                  Validade: {formatDateBR(reservingBatch.expirationDate)}
                </div>
                <div className="text-xs text-stone-700 pt-1 border-t border-stone-200/60 space-y-0.5">
                  <div className="font-semibold text-stone-900">Janela de Retirada:</div>
                  <div><strong>Início:</strong> {formatDateTimeBR(reservingBatch.pickupWindowStart)}</div>
                  <div><strong>Término:</strong> {formatDateTimeBR(reservingBatch.pickupWindowEnd)}</div>
                </div>
                <div className="text-xs text-stone-600">
                  Local de Retirada: {reservingBatch.pickupAddress}
                </div>
              </div>

              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-[11px] text-amber-900 space-y-1">
                <div className="font-bold flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-amber-700" />
                  Regras Operacionais da Reserva:
                </div>
                <p>
                  • A solicitação passará por <strong>Homologação Administrativa</strong> antes de ser liberada para transporte no Ciclo 3.
                </p>
                <p>
                  • Este lote ficará bloqueado atomicamente contra reservas por outras entidades.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2 border-t border-stone-100">
              <button
                type="button"
                onClick={() => setReservingBatch(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-stone-600 hover:bg-stone-100"
              >
                Voltar
              </button>
              <button
                type="button"
                disabled={reserveLoading}
                onClick={handleConfirmReservation}
                className="px-5 py-2.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-semibold text-xs shadow-xs transition-colors flex items-center gap-1.5 disabled:opacity-50"
              >
                {reserveLoading ? (
                  <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <CheckCircle2 className="w-4 h-4" />
                )}
                <span>{reserveLoading ? 'Gravando Reserva...' : 'Confirmar Reserva Exclusiva'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    )}
  </div>
);
};
