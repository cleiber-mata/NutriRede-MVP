import React, { useEffect, useState } from 'react';
import {
  BarChart3,
  CheckCircle2,
  Package,
  Clock,
  Truck,
  AlertTriangle,
  Scale,
  RefreshCw,
  Layers,
  HeartHandshake
} from 'lucide-react';
import { collection, onSnapshot, query } from 'firebase/firestore';
import { db } from '../firebase/config';
import { BatchUnit, FoodBatch, Occurrence, Pickup, Reservation } from '../types';

export const AdminIndicatorsTab: React.FC = () => {
  const [batches, setBatches] = useState<FoodBatch[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [pickups, setPickups] = useState<Pickup[]>([]);
  const [occurrences, setOccurrences] = useState<Occurrence[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1. Escuta lotes de alimentos
    const unsubBatches = onSnapshot(collection(db, 'food_batches'), (snap) => {
      const list: FoodBatch[] = [];
      snap.forEach((d) => list.push(d.data() as FoodBatch));
      setBatches(list);
      setLoading(false);
    });

    // 2. Escuta reservas
    const unsubRes = onSnapshot(collection(db, 'reservations'), (snap) => {
      const list: Reservation[] = [];
      snap.forEach((d) => list.push(d.data() as Reservation));
      setReservations(list);
    });

    // 3. Escuta coletas
    const unsubPickups = onSnapshot(collection(db, 'pickups'), (snap) => {
      const list: Pickup[] = [];
      snap.forEach((d) => list.push(d.data() as Pickup));
      setPickups(list);
    });

    // 4. Escuta ocorrências
    const unsubOccurrences = onSnapshot(collection(db, 'occurrences'), (snap) => {
      const list: Occurrence[] = [];
      snap.forEach((d) => list.push(d.data() as Occurrence));
      setOccurrences(list);
    });

    return () => {
      unsubBatches();
      unsubRes();
      unsubPickups();
      unsubOccurrences();
    };
  }, []);

  // CÁLCULO RIGOROSO DOS INDICADORES REAIS (RF16)
  // Regra 1: Apenas doações com status CONCLUIDO (RN08) são computadas como entregues!
  const concludedBatches = batches.filter((b) => b.status === 'CONCLUIDO');
  const totalConcludedCount = concludedBatches.length;

  // Regra 3 & 4: Não somar unidades incompatíveis!
  // Exemplo: 20 kg e 10 unidades aparecem em categorias separadas
  const quantityByUnit: Record<string, number> = {};
  concludedBatches.forEach((b) => {
    const unit = b.unit || 'unidades';
    quantityByUnit[unit] = (quantityByUnit[unit] || 0) + Number(b.quantity || 0);
  });

  // Indicadores operacionais complementares (obtidos diretamente do Firestore)
  const availableBatchesCount = batches.filter((b) => b.status === 'DISPONIVEL').length;
  const pendingReservationsCount = reservations.filter((r) => r.status === 'PENDENTE_APROVACAO').length;
  const approvedReservationsCount = reservations.filter((r) => r.status === 'APROVADA').length;

  // Coletas aguardando transportador: reservas aprovadas sem coleta vinculada
  const waitingTransporterCount = reservations.filter(
    (r) => r.status === 'APROVADA' && !r.activePickupId
  ).length;

  // Coletas em andamento (aceitas ou em trânsito)
  const inProgressPickupsCount = pickups.filter(
    (p) => p.status === 'ACEITA' || p.status === 'RETIRADA'
  ).length;

  const inTransitBatchesCount = batches.filter((b) => b.status === 'EM_TRANSPORTE').length;
  const totalOccurrencesCount = occurrences.length;

  if (loading) {
    return (
      <div className="p-12 text-center text-xs text-stone-500">
        <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-3 text-stone-400" />
        Carregando indicadores em tempo real...
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Banner de Contexto */}
      <div className="bg-gradient-to-r from-emerald-950 via-stone-900 to-teal-950 rounded-3xl p-6 sm:p-8 text-white shadow-md">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                Dados Reais do Cloud Firestore
              </span>
              <span className="text-xs text-stone-400">• Sem métricas fictícias</span>
            </div>
            <h2 className="text-2xl font-bold font-serif">Indicadores Administrativos</h2>
            <p className="text-xs sm:text-sm text-stone-300 mt-1 max-w-2xl leading-relaxed">
              Painel gerencial de acompanhamento de impacto social e conformidade operacional. Somente doações com recebimento confirmado pela entidade receptora são computadas como concluídas.
            </p>
          </div>
        </div>
      </div>

      {/* SEÇÃO PRINCIPAL: Doações Concluídas e Volume por Unidade de Medida */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-stone-200 shadow-2xs space-y-6">
        <div>
          <h3 className="text-base font-bold text-stone-900 font-serif flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            Impacto Social Efetivo — Doações Concluídas
          </h3>
          <p className="text-xs text-stone-500 mt-1">
            Contabilização estrita de lotes entregues e confirmados pela entidade receptora no destino final.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card: Total de Doações Concluídas */}
          <div className="p-5 rounded-2xl bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-200 shadow-2xs">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800">
              Total de Doações Concluídas
            </span>
            <div className="text-3xl font-extrabold text-emerald-950 font-serif mt-2">
              {totalConcludedCount}
            </div>
            <p className="text-[11px] text-emerald-700 mt-1">
              {totalConcludedCount === 1 ? '1 lote concluído' : `${totalConcludedCount} lotes entregues`}
            </p>
          </div>

          {/* Cards de Volume por Unidade (RN08: NUNCA somar unidades incompatíveis) */}
          {Object.keys(quantityByUnit).length === 0 ? (
            <div className="sm:col-span-1 lg:col-span-3 p-5 rounded-2xl bg-stone-50 border border-stone-200 text-xs text-stone-500 flex items-center justify-center text-center">
              <div>
                <Scale className="w-6 h-6 text-stone-400 mx-auto mb-1" />
                <span>Nenhuma doação concluída registrada ainda. Os volumes aparecerão aqui por unidade compatível após a primeira confirmação de recebimento.</span>
              </div>
            </div>
          ) : (
            Object.entries(quantityByUnit).map(([unit, totalQty]) => (
              <div
                key={unit}
                className="p-5 rounded-2xl bg-white border border-stone-200 shadow-2xs space-y-1"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-stone-500">
                    Volume ({unit})
                  </span>
                  <Scale className="w-4 h-4 text-emerald-600" />
                </div>
                <div className="text-2xl font-extrabold text-stone-900 font-serif mt-1">
                  {totalQty.toLocaleString('pt-BR')} <span className="text-sm font-sans font-semibold text-stone-500">{unit}</span>
                </div>
                <p className="text-[10px] text-stone-400">
                  Total de alimentos entregues nesta métrica
                </p>
              </div>
            ))
          )}
        </div>
      </div>

      {/* SEÇÃO COMPLEMENTAR: Indicadores Operacionais da Cadeia de Doação */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-stone-200 shadow-2xs space-y-6">
        <div>
          <h3 className="text-base font-bold text-stone-900 font-serif flex items-center gap-2">
            <Layers className="w-5 h-5 text-teal-700" />
            Situação da Cadeia Operacional em Tempo Real
          </h3>
          <p className="text-xs text-stone-500 mt-1">
            Monitoramento do fluxo entre doadores, entidades receptoras e transportadores.
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {/* Lotes Disponíveis */}
          <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200 space-y-1">
            <span className="text-[10px] font-bold uppercase text-stone-500 block">
              Lotes Disponíveis
            </span>
            <div className="text-xl font-bold text-stone-900">
              {availableBatchesCount}
            </div>
            <span className="text-[10px] text-stone-400">Aguardando reserva</span>
          </div>

          {/* Reservas Pendentes */}
          <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200 space-y-1">
            <span className="text-[10px] font-bold uppercase text-amber-800 block">
              Reservas Pendentes
            </span>
            <div className="text-xl font-bold text-amber-950">
              {pendingReservationsCount}
            </div>
            <span className="text-[10px] text-amber-700">Aguardando homologação</span>
          </div>

          {/* Reservas Aprovadas */}
          <div className="p-4 rounded-2xl bg-teal-50/70 border border-teal-200 space-y-1">
            <span className="text-[10px] font-bold uppercase text-teal-800 block">
              Reservas Aprovadas
            </span>
            <div className="text-xl font-bold text-teal-950">
              {approvedReservationsCount}
            </div>
            <span className="text-[10px] text-teal-700">Homologadas pelo Admin</span>
          </div>

          {/* Coletas Aguardando Transportador */}
          <div className="p-4 rounded-2xl bg-blue-50/70 border border-blue-200 space-y-1">
            <span className="text-[10px] font-bold uppercase text-blue-800 block">
              Aguardando Transporte
            </span>
            <div className="text-xl font-bold text-blue-950">
              {waitingTransporterCount}
            </div>
            <span className="text-[10px] text-blue-700">Sem motorista vinculado</span>
          </div>

          {/* Em Transporte */}
          <div className="p-4 rounded-2xl bg-indigo-50/70 border border-indigo-200 space-y-1">
            <span className="text-[10px] font-bold uppercase text-indigo-800 block">
              Em Transporte
            </span>
            <div className="text-xl font-bold text-indigo-950">
              {inTransitBatchesCount}
            </div>
            <span className="text-[10px] text-indigo-700">Retirada confirmada</span>
          </div>

          {/* Ocorrências */}
          <div className="p-4 rounded-2xl bg-rose-50/70 border border-rose-200 space-y-1">
            <span className="text-[10px] font-bold uppercase text-rose-800 block">
              Ocorrências
            </span>
            <div className="text-xl font-bold text-rose-950">
              {totalOccurrencesCount}
            </div>
            <span className="text-[10px] text-rose-700">Reportadas no fluxo</span>
          </div>
        </div>
      </div>
    </div>
  );
};
