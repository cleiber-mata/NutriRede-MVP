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
  Filter
} from 'lucide-react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from '../context/AuthContext';
import { FoodBatch, FoodCategory } from '../types';
import { reserveFoodBatchAtomic } from '../services/foodBatchService';
import { formatDateBR, formatDateTimeBR } from '../utils/dateUtils';

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
        const todayZero = new Date().setHours(0, 0, 0, 0);

        snapshot.forEach((docItem) => {
          const batch = docItem.data() as FoodBatch;
          // Filtra somente lotes aptos e não vencidos, e oculta doações publicadas pela própria conta (CORREÇÃO 1)
          const expTime = new Date(batch.expirationDate).getTime();
          const isOwnBatch = currentUser && batch.donorId === currentUser.uid;

          if (expTime >= todayZero && !batch.activeReservationId && !isOwnBatch) {
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

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-teal-800 to-emerald-900 rounded-3xl p-6 sm:p-8 text-white shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-500/20 text-teal-200 border border-teal-400/30 text-xs font-semibold mb-3">
            <Building2 className="w-3.5 h-3.5" />
            Módulo Operacional da Entidade Receptora (RF05 / RF06)
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((batch) => {
            const expDate = new Date(batch.expirationDate);
            const daysLeft = Math.ceil((expDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));

            return (
              <div
                key={batch.id}
                className="bg-white rounded-3xl p-6 border border-stone-200 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between space-y-4"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-teal-50 text-teal-800 border border-teal-200">
                      {batch.category}
                    </span>
                    <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                      Disponível
                    </span>
                  </div>

                  <h3 className="text-lg font-bold text-stone-900 leading-tight mb-1">
                    {batch.foodName}
                  </h3>

                  <p className="text-xs text-stone-500 font-medium mb-3">
                    Doador: <strong className="text-stone-700">{batch.donorName}</strong>
                  </p>

                  <div className="p-3.5 bg-stone-50 rounded-2xl border border-stone-100 space-y-2 text-xs text-stone-600">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5 font-semibold text-stone-900">
                        <Scale className="w-4 h-4 text-teal-700" />
                        Quantidade:
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
                      <span
                        className={`font-semibold ${
                          daysLeft <= 2 ? 'text-amber-700 font-bold' : 'text-stone-800'
                        }`}
                      >
                        {expDate.toLocaleDateString('pt-BR')}{' '}
                        <span className="text-[10px] font-normal text-stone-500">
                          ({daysLeft === 0 ? 'Hoje' : `${daysLeft}d restantes`})
                        </span>
                      </span>
                    </div>

                    <div className="pt-2 border-t border-stone-200/60 space-y-1">
                      <div className="flex items-center gap-1.5 text-stone-700 font-semibold text-xs">
                        <Clock className="w-3.5 h-3.5 text-teal-700 shrink-0" />
                        <span>Janela de Retirada:</span>
                      </div>
                      <div className="pl-5 text-[11px] text-stone-800 space-y-0.5">
                        <div><strong className="text-stone-900">Início:</strong> {formatDateTimeBR(batch.pickupWindowStart)}</div>
                        <div><strong className="text-stone-900">Término:</strong> {formatDateTimeBR(batch.pickupWindowEnd)}</div>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-stone-200/60 space-y-1">
                      <div className="flex items-start gap-1.5">
                        <MapPin className="w-4 h-4 text-stone-400 shrink-0 mt-0.5" />
                        <span className="text-[11px] text-stone-600 line-clamp-1">
                          {batch.pickupAddress}
                        </span>
                      </div>
                      <div className="text-[10px] text-stone-500 italic">
                        Conservação: {batch.storageCondition}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    onClick={() => {
                      setReserveError(null);
                      setReservingBatch(batch);
                    }}
                    className="w-full py-2.5 px-4 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-semibold text-xs shadow-xs transition-colors flex items-center justify-center gap-1.5"
                  >
                    <span>Solicitar Reserva (RF06)</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal de Confirmação da Reserva Exclusiva (RF06 / RN04) */}
      {reservingBatch && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl border border-stone-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100 mb-4">
              <div className="flex items-center gap-2 text-teal-800">
                <Package className="w-5 h-5" />
                <h4 className="font-bold text-stone-900 text-base font-serif">
                  Confirmar Solicitação de Reserva
                </h4>
              </div>
              <button
                onClick={() => setReservingBatch(null)}
                className="text-stone-400 hover:text-stone-600"
              >
                ×
              </button>
            </div>

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
                  Regras do PRD (RN04 / RF06 / RF08):
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
      )}
    </div>
  );
};
