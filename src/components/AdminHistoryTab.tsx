import React, { useEffect, useState } from 'react';
import {
  History,
  Search,
  Filter,
  Package,
  HeartHandshake,
  Truck,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Calendar,
  User,
  Clock
} from 'lucide-react';
import { collection, onSnapshot, query, orderBy, limit } from 'firebase/firestore';
import { db } from '../firebase/config';
import { HistoryObjectType, OperationHistoryEvent } from '../types';
import { formatDateTimeBR } from '../utils/dateUtils';

export const AdminHistoryTab: React.FC = () => {
  const [historyEvents, setHistoryEvents] = useState<OperationHistoryEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState<'ALL' | HistoryObjectType>('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    // Escuta eventos de histórico em tempo real
    const qHistory = query(collection(db, 'operation_history'), limit(150));

    const unsubscribe = onSnapshot(
      qHistory,
      (snapshot) => {
        const list: OperationHistoryEvent[] = [];
        snapshot.forEach((d) => list.push(d.data() as OperationHistoryEvent));
        // Ordena do mais recente para o mais antigo
        list.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        setHistoryEvents(list);
        setLoading(false);
      },
      (error) => {
        console.warn('Erro ao escutar histórico de operações:', error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const filtered = historyEvents.filter((ev) => {
    const matchType = typeFilter === 'ALL' || ev.objectType === typeFilter;
    const matchSearch =
      searchTerm === '' ||
      ev.event.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ev.details.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (ev.actorName && ev.actorName.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (ev.activeProfile && ev.activeProfile.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchType && matchSearch;
  });

  const getEventIcon = (type: HistoryObjectType) => {
    switch (type) {
      case 'LOTE':
        return <Package className="w-4 h-4 text-emerald-600" />;
      case 'RESERVA':
        return <HeartHandshake className="w-4 h-4 text-teal-600" />;
      case 'COLETA':
        return <Truck className="w-4 h-4 text-amber-600" />;
      case 'ENTREGA':
        return <CheckCircle2 className="w-4 h-4 text-emerald-600" />;
      case 'OCORRENCIA':
        return <AlertTriangle className="w-4 h-4 text-rose-600" />;
      default:
        return <History className="w-4 h-4 text-stone-600" />;
    }
  };

  const getTypeBadge = (type: HistoryObjectType) => {
    switch (type) {
      case 'LOTE':
        return 'bg-emerald-100 text-emerald-800 border-emerald-300';
      case 'RESERVA':
        return 'bg-teal-100 text-teal-800 border-teal-300';
      case 'COLETA':
        return 'bg-amber-100 text-amber-800 border-amber-300';
      case 'ENTREGA':
        return 'bg-emerald-100 text-emerald-900 border-emerald-400 font-bold';
      case 'OCORRENCIA':
        return 'bg-rose-100 text-rose-800 border-rose-300';
      default:
        return 'bg-stone-100 text-stone-700 border-stone-200';
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Top Banner */}
      <div className="bg-white rounded-3xl p-6 border border-stone-200 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-bold text-stone-900 font-serif flex items-center gap-2">
            <History className="w-5 h-5 text-amber-700" />
            Trilha de Auditoria e Histórico Geral (RF15)
          </h3>
          <p className="text-xs text-stone-500 mt-1">
            Registro cronológico imutável de todas as ações executadas no fluxo de doação de alimentos.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs font-semibold text-stone-600 bg-stone-50 px-3 py-1.5 rounded-xl border border-stone-200">
          <Clock className="w-3.5 h-3.5 text-stone-400" />
          <span>{historyEvents.length} eventos registrados no banco</span>
        </div>
      </div>

      {/* Filtros e Busca */}
      <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar por ator, evento ou detalhes..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
        </div>

        <div className="flex items-center gap-1 bg-stone-100 p-1 rounded-xl text-xs w-full sm:w-auto overflow-x-auto">
          <span className="text-[10px] font-bold text-stone-500 px-2 uppercase">Tipo:</span>
          {(['ALL', 'LOTE', 'RESERVA', 'COLETA', 'ENTREGA', 'OCORRENCIA'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              className={`px-2.5 py-1 rounded-lg font-semibold whitespace-nowrap transition-colors ${
                typeFilter === t
                  ? 'bg-white text-stone-900 shadow-2xs'
                  : 'text-stone-500 hover:text-stone-900'
              }`}
            >
              {t === 'ALL' ? 'Todos' : t}
            </button>
          ))}
        </div>
      </div>

      {/* Lista de Eventos */}
      {loading ? (
        <div className="p-12 text-center text-xs text-stone-500">
          <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-stone-400" />
          Carregando histórico de operações...
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-stone-200 max-w-lg mx-auto">
          <History className="w-12 h-12 text-stone-300 mx-auto mb-3" />
          <h4 className="text-base font-bold text-stone-800 font-serif">
            Nenhum evento registrado com os filtros selecionados
          </h4>
          <p className="text-xs text-stone-500 mt-1">
            Os eventos de histórico são gerados automaticamente pelas operações de lote, reserva, transporte e recebimento.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-stone-200 overflow-hidden shadow-2xs divide-y divide-stone-100">
          {filtered.map((item) => (
            <div key={item.id} className="p-4 sm:p-5 hover:bg-stone-50/60 transition-colors space-y-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="w-7 h-7 rounded-lg bg-stone-100 flex items-center justify-center">
                    {getEventIcon(item.objectType)}
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${getTypeBadge(item.objectType)}`}>
                    {item.objectType}
                  </span>
                  <span className="text-xs font-bold text-stone-900 font-mono">
                    {item.event}
                  </span>
                </div>

                <div className="text-[11px] font-mono text-stone-500">
                  {formatDateTimeBR(item.timestamp)}
                </div>
              </div>

              <p className="text-xs text-stone-700 pl-9 leading-relaxed">
                {item.details}
              </p>

              <div className="flex items-center gap-4 text-[11px] text-stone-500 pl-9 pt-1">
                {item.actorName && (
                  <span className="flex items-center gap-1 font-semibold text-stone-800">
                    <User className="w-3 h-3 text-stone-400" />
                    {item.actorName} ({item.activeProfile})
                  </span>
                )}
                {item.objectId && (
                  <span className="text-stone-400 font-mono">ID: {item.objectId}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
