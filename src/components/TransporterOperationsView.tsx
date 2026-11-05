import React, { useEffect, useState } from 'react';
import {
  Truck,
  Package,
  Calendar,
  Clock,
  MapPin,
  CheckCircle2,
  AlertTriangle,
  FileText,
  User,
  Power,
  RefreshCw,
  ArrowRight,
  ShieldAlert,
  Info,
  X,
  ChevronDown,
  Sparkles,
  Thermometer
} from 'lucide-react';
import { collection, onSnapshot, query, where, doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from '../context/AuthContext';
import { FoodBatch, Occurrence, Pickup, Reservation, UserProfileDoc, Delivery } from '../types';
import {
  acceptPickupAtomic,
  confirmPickupAtomic,
  getTransporterAvailability,
  setTransporterAvailability
} from '../services/transportService';
import { formatDateBR, formatDateTimeBR } from '../utils/dateUtils';
import { OperationTimeline } from './OperationTimeline';
import { CreateOccurrenceModal } from './CreateOccurrenceModal';

// M51: Formatação resumida da janela de retirada no padrão "Retirada: 11h–14h"
function formatShortPickupWindow(startStr?: string | null, endStr?: string | null): string {
  if (!startStr && !endStr) return 'Janela a definir';

  const extractTime = (str?: string | null) => {
    if (!str) return '';
    // YYYY-MM-DDTHH:mm
    const match = str.match(/T(\d{2}):(\d{2})/);
    if (match) {
      const [, h, m] = match;
      const numH = parseInt(h, 10);
      return m === '00' ? `${numH}h` : `${numH}h${m}`;
    }
    try {
      const d = new Date(str);
      if (!isNaN(d.getTime())) {
        const parts = new Intl.DateTimeFormat('pt-BR', {
          timeZone: 'America/Sao_Paulo',
          hour: '2-digit',
          minute: '2-digit',
          hour12: false
        }).formatToParts(d);
        const h = parts.find((p) => p.type === 'hour')?.value || '';
        const m = parts.find((p) => p.type === 'minute')?.value || '';
        const numH = parseInt(h, 10);
        return m === '00' ? `${numH}h` : `${numH}h${m}`;
      }
    } catch {
      // Fallback
    }
    return '';
  };

  const startTime = extractTime(startStr);
  const endTime = extractTime(endStr);

  if (startTime && endTime) {
    return `Retirada: ${startTime}–${endTime}`;
  }
  if (startTime) {
    return `Retirada a partir de ${startTime}`;
  }
  return 'Retirada: ver detalhes';
}

export const TransporterOperationsView: React.FC = () => {
  const { currentUser, userAccount, activeProfile, reloadUserData } = useAuth();

  const [activeTab, setActiveTab] = useState<'available' | 'my_pickups' | 'history'>('available');
  const [availability, setAvailability] = useState<'DISPONIVEL' | 'INDISPONIVEL'>('DISPONIVEL');
  const [availabilityLoading, setAvailabilityLoading] = useState(false);

  // M51: Controle de expansão exclusiva da aba "Coletas Disponíveis" (apenas uma expandida por vez)
  const [expandedResId, setExpandedResId] = useState<string | null>(null);

  const toggleExpand = (resId: string) => {
    setExpandedResId((prev) => (prev === resId ? null : resId));
  };

  // M52: Controle de expansão exclusiva da aba "Minhas Coletas em Andamento"
  const [expandedMyPickupId, setExpandedMyPickupId] = useState<string | null>(null);

  const toggleExpandMyPickup = (pickupId: string) => {
    setExpandedMyPickupId((prev) => (prev === pickupId ? null : pickupId));
  };

  // M53: Controle de expansão exclusiva da aba "Histórico de Entregas"
  const [expandedHistoryId, setExpandedHistoryId] = useState<string | null>(null);

  const toggleExpandHistory = (pickupId: string) => {
    setExpandedHistoryId((prev) => (prev === pickupId ? null : pickupId));
  };

  // Dados em tempo real
  const [approvedReservations, setApprovedReservations] = useState<Reservation[]>([]);
  const [myPickups, setMyPickups] = useState<Pickup[]>([]);
  const [batchesMap, setBatchesMap] = useState<Record<string, FoodBatch>>({});
  const [occurrencesMap, setOccurrencesMap] = useState<Record<string, Occurrence[]>>({});
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [loading, setLoading] = useState(true);

  // Ações e Modais
  const [acceptingRes, setAcceptingRes] = useState<Reservation | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [confirmPickupTarget, setConfirmPickupTarget] = useState<Pickup | null>(null);
  const [occurrenceTarget, setOccurrenceTarget] = useState<{ operationId: string; batchId: string; foodName: string } | null>(null);
  const [feedbackMsg, setFeedbackMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // M51: Se a coleta atualmente expandida deixar de estar disponível, recolhe automaticamente
  useEffect(() => {
    if (expandedResId && !approvedReservations.some((r) => r.id === expandedResId)) {
      setExpandedResId(null);
    }
  }, [approvedReservations, expandedResId]);

  // 1. Carrega disponibilidade inicial do transportador
  useEffect(() => {
    if (!currentUser) return;
    getTransporterAvailability(currentUser.uid).then((res) => {
      setAvailability(res);
    });
  }, [currentUser, activeProfile]);

  // 2. Monitora reservas aprovadas elegíveis para coleta
  useEffect(() => {
    if (!currentUser) return;

    // Reservas com status APROVADA
    const qRes = query(
      collection(db, 'reservations'),
      where('status', '==', 'APROVADA')
    );

    const unsubRes = onSnapshot(qRes, async (snap) => {
      const list: Reservation[] = [];
      snap.forEach((d) => list.push(d.data() as Reservation));
      // Filtra apenas as que ainda não possuem transportador vinculado
      const available = list.filter((r) => !r.activePickupId);
      setApprovedReservations(available);
      setLoading(false);

      // Carrega lotes associados para detalhes sob demanda (categoria, conservação, validade)
      const batchIds = Array.from(new Set(available.map((r) => r.batchId)));
      const newMap: Record<string, FoodBatch> = {};

      for (const bId of batchIds) {
        try {
          const bSnap = await getDoc(doc(db, 'food_batches', bId));
          if (bSnap.exists()) {
            newMap[bId] = bSnap.data() as FoodBatch;
          }
        } catch (e) {
          console.warn('Erro ao carregar lote associado à reserva:', bId, e);
        }
      }

      if (Object.keys(newMap).length > 0) {
        setBatchesMap((prev) => ({ ...prev, ...newMap }));
      }
    });

    return () => unsubRes();
  }, [currentUser]);

  // 3. Monitora coletas, lotes vinculados, entregas e ocorrências em tempo real
  useEffect(() => {
    if (!currentUser) return;

    // Escuta coletas atribuídas ao transportador
    const qPick = query(
      collection(db, 'pickups'),
      where('transporterUserId', '==', currentUser.uid)
    );

    const unsubPick = onSnapshot(qPick, async (snap) => {
      const list: Pickup[] = [];
      snap.forEach((d) => list.push(d.data() as Pickup));
      setMyPickups(list);

      // Carrega lotes associados que ainda não estejam em batchesMap
      const batchIds = Array.from(new Set(list.map((p) => p.batchId)));
      const newMap: Record<string, FoodBatch> = {};

      for (const bId of batchIds) {
        try {
          const bSnap = await getDoc(doc(db, 'food_batches', bId));
          if (bSnap.exists()) {
            newMap[bId] = bSnap.data() as FoodBatch;
          }
        } catch (e) {
          console.warn('Erro ao carregar lote pontual:', bId, e);
        }
      }
      setBatchesMap((prev) => ({ ...prev, ...newMap }));
    });

    // Escuta em tempo real atualizações nos lotes vinculados a este transportador (RF11 / RF12 / RN08)
    const qBatches = query(
      collection(db, 'food_batches'),
      where('transporterId', '==', currentUser.uid)
    );

    const unsubBatches = onSnapshot(qBatches, (snap) => {
      setBatchesMap((prev) => {
        const updated = { ...prev };
        snap.forEach((d) => {
          updated[d.id] = d.data() as FoodBatch;
        });
        return updated;
      });
    });

    // Escuta em tempo real entregas concluídas deste transportador (RF12 / RF15)
    const qDeliveries = query(
      collection(db, 'deliveries'),
      where('transporterUserId', '==', currentUser.uid)
    );

    const unsubDeliveries = onSnapshot(
      qDeliveries,
      (snap) => {
        const list: Delivery[] = [];
        snap.forEach((d) => list.push(d.data() as Delivery));
        setDeliveries(list);
      },
      () => {
        // Fallback silencioso
      }
    );

    // Escuta em tempo real ocorrências operacionais deste transportador (RF14)
    const qOcc = query(
      collection(db, 'occurrences'),
      where('transporterId', '==', currentUser.uid)
    );

    const unsubOcc = onSnapshot(
      qOcc,
      (snap) => {
        const map: Record<string, Occurrence[]> = {};
        snap.forEach((d) => {
          const occ = d.data() as Occurrence;
          if (!map[occ.batchId]) map[occ.batchId] = [];
          map[occ.batchId].push(occ);
        });
        setOccurrencesMap(map);
      },
      () => {
        // Fallback silencioso
      }
    );

    return () => {
      unsubPick();
      unsubBatches();
      unsubDeliveries();
      unsubOcc();
    };
  }, [currentUser]);

  // Alterna disponibilidade
  const handleToggleAvailability = async (newVal: 'DISPONIVEL' | 'INDISPONIVEL') => {
    if (!currentUser || availabilityLoading) return;
    setAvailabilityLoading(true);
    setFeedbackMsg(null);
    try {
      await setTransporterAvailability(
        currentUser.uid,
        newVal,
        userAccount?.name || currentUser.email || 'Transportador'
      );
      setAvailability(newVal);
      await reloadUserData();
      setFeedbackMsg({
        text: `Disponibilidade operacional atualizada para: ${
          newVal === 'DISPONIVEL' ? 'DISPONÍVEL PARA COLETAS' : 'INDISPONÍVEL'
        }.`,
        type: 'success'
      });
    } catch (err: any) {
      console.error('Erro ao alternar disponibilidade:', err);
      setFeedbackMsg({
        text: err.message || 'Falha ao atualizar disponibilidade.',
        type: 'error'
      });
    } finally {
      setAvailabilityLoading(false);
    }
  };

  // Aceitar Coleta (RF10)
  const handleAcceptPickup = async () => {
    if (!acceptingRes || !currentUser) return;
    setActionLoading(true);
    setFeedbackMsg(null);

    try {
      await acceptPickupAtomic({
        reservationId: acceptingRes.id,
        transporterUserId: currentUser.uid,
        transporterName: userAccount?.name || currentUser.email || 'Transportador Voluntário',
        transporterEmail: currentUser.email || '',
        transporterPhone: userAccount?.phone || ''
      });

      setFeedbackMsg({
        text: `Coleta aceita com sucesso para "${acceptingRes.foodName}"! O lote agora aguarda sua confirmação de retirada no local.`,
        type: 'success'
      });
      setAcceptingRes(null);
      setActiveTab('my_pickups');
    } catch (err: any) {
      console.error('Erro ao aceitar coleta:', err);
      setFeedbackMsg({
        text: err.message || 'Falha ao aceitar a coleta.',
        type: 'error'
      });
    } finally {
      setActionLoading(false);
    }
  };

  // Confirmar Retirada (RF11)
  const handleConfirmPickup = async () => {
    if (!confirmPickupTarget || !currentUser) return;
    setActionLoading(true);
    setFeedbackMsg(null);

    try {
      await confirmPickupAtomic({
        pickupId: confirmPickupTarget.id,
        transporterUserId: currentUser.uid,
        transporterName: userAccount?.name || currentUser.email || 'Transportador Voluntário'
      });

      setFeedbackMsg({
        text: `Retirada registrada com sucesso! O lote de "${confirmPickupTarget.foodName}" passou para EM TRANSPORTE. Entregue à entidade receptora no destino.`,
        type: 'success'
      });
      setConfirmPickupTarget(null);
    } catch (err: any) {
      console.error('Erro ao registrar retirada:', err);
      setFeedbackMsg({
        text: err.message || 'Falha ao registrar a retirada dos alimentos.',
        type: 'error'
      });
    } finally {
      setActionLoading(false);
    }
  };

  const completedPickups = myPickups.filter((p) => {
    const batch = batchesMap[p.batchId];
    const hasDelivery = deliveries.some((d) => d.pickupId === p.id || d.batchId === p.batchId);
    return batch?.status === 'CONCLUIDO' || hasDelivery;
  });

  const inTransitPickups = myPickups.filter((p) => {
    const batch = batchesMap[p.batchId];
    const isCompleted = batch?.status === 'CONCLUIDO' || deliveries.some((d) => d.pickupId === p.id || d.batchId === p.batchId);
    if (isCompleted) return false;
    return p.status === 'RETIRADA' || batch?.status === 'EM_TRANSPORTE';
  });

  const pendingPickups = myPickups.filter((p) => {
    const batch = batchesMap[p.batchId];
    const isCompleted = batch?.status === 'CONCLUIDO' || deliveries.some((d) => d.pickupId === p.id || d.batchId === p.batchId);
    const isInTransit = p.status === 'RETIRADA' || batch?.status === 'EM_TRANSPORTE';
    return !isCompleted && !isInTransit && p.status === 'ACEITA';
  });

  // M52: Se a coleta em andamento expandida deixar de estar ativa, recolhe automaticamente
  useEffect(() => {
    const activeList = [...pendingPickups, ...inTransitPickups];
    if (expandedMyPickupId && !activeList.some((p) => p.id === expandedMyPickupId)) {
      setExpandedMyPickupId(null);
    }
  }, [pendingPickups, inTransitPickups, expandedMyPickupId]);

  // M53: Se a entrega do histórico expandida deixar de estar na lista, recolhe automaticamente
  useEffect(() => {
    if (expandedHistoryId && !completedPickups.some((p) => p.id === expandedHistoryId)) {
      setExpandedHistoryId(null);
    }
  }, [completedPickups, expandedHistoryId]);

  // M53: Ordenação das entregas concluídas por data mais recente primeiro
  const sortedCompletedPickups = [...completedPickups].sort((a, b) => {
    const deliveryA = deliveries.find((d) => d.pickupId === a.id || d.batchId === a.batchId);
    const deliveryB = deliveries.find((d) => d.pickupId === b.id || d.batchId === b.batchId);
    const dateA = new Date(deliveryA?.confirmedAt || batchesMap[a.batchId]?.completedAt || a.pickedUpAt || a.acceptedAt || 0).getTime();
    const dateB = new Date(deliveryB?.confirmedAt || batchesMap[b.batchId]?.completedAt || b.pickedUpAt || b.acceptedAt || 0).getTime();
    return dateB - dateA;
  });

  return (
    <div className="space-y-6">
      {/* Barra de Controle de Disponibilidade (RF09) */}
      <div className="bg-white rounded-2xl p-5 border border-stone-200 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div
            className={`w-11 h-11 rounded-xl flex items-center justify-center border ${
              availability === 'DISPONIVEL'
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : 'bg-stone-100 text-stone-500 border-stone-300'
            }`}
          >
            <Power className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-stone-900">
                Disponibilidade do Transportador
              </h3>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                  availability === 'DISPONIVEL'
                    ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                    : 'bg-stone-200 text-stone-700 border-stone-300'
                }`}
              >
                {availability === 'DISPONIVEL' ? 'DISPONÍVEL' : 'INDISPONÍVEL'}
              </span>
            </div>
            <p className="text-xs text-stone-500">
              {availability === 'DISPONIVEL'
                ? 'Você está ativo e visível para aceitar coletas de alimentos no sistema.'
                : 'Você está indisponível para aceitar novas coletas no momento. Coletas em andamento continuam sob sua responsabilidade.'}
            </p>
          </div>
        </div>

        {/* Alternador de Status */}
        <div className="flex items-center gap-1.5 bg-stone-100 p-1 rounded-xl border border-stone-200 self-start md:self-auto">
          <button
            type="button"
            disabled={availabilityLoading}
            onClick={() => handleToggleAvailability('DISPONIVEL')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
              availability === 'DISPONIVEL'
                ? 'bg-emerald-600 text-white shadow-2xs'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            Disponível
          </button>
          <button
            type="button"
            disabled={availabilityLoading}
            onClick={() => handleToggleAvailability('INDISPONIVEL')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
              availability === 'INDISPONIVEL'
                ? 'bg-stone-700 text-white shadow-2xs'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            Indisponível
          </button>
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
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span className="font-semibold">{feedbackMsg.text}</span>
          </div>
          <button onClick={() => setFeedbackMsg(null)} className="text-stone-400 font-bold">×</button>
        </div>
      )}

      {/* Abas de Navegação */}
      <div className="flex items-center gap-2 border-b border-stone-200 pb-2 flex-wrap">
        <button
          onClick={() => setActiveTab('available')}
          className={`pb-2 px-3 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'available'
              ? 'border-amber-600 text-amber-900'
              : 'border-transparent text-stone-500 hover:text-stone-800'
          }`}
        >
          <Package className="w-4 h-4" />
          Coletas Disponíveis
          {approvedReservations.length > 0 && (
            <span className="ml-1 text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-amber-100 text-amber-800">
              {approvedReservations.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('my_pickups')}
          className={`pb-2 px-3 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'my_pickups'
              ? 'border-amber-600 text-amber-900'
              : 'border-transparent text-stone-500 hover:text-stone-800'
          }`}
        >
          <Truck className="w-4 h-4" />
          Minhas Coletas em Andamento
          {(pendingPickups.length + inTransitPickups.length) > 0 && (
            <span className="ml-1 text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-teal-100 text-teal-800">
              {pendingPickups.length + inTransitPickups.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('history')}
          className={`pb-2 px-3 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'history'
              ? 'border-amber-600 text-amber-900'
              : 'border-transparent text-stone-500 hover:text-stone-800'
          }`}
        >
          <CheckCircle2 className="w-4 h-4" />
          Histórico de Entregas
          {completedPickups.length > 0 && (
            <span className="ml-1 text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-emerald-100 text-emerald-800">
              {completedPickups.length}
            </span>
          )}
        </button>
      </div>

      {/* Conteúdo da Aba 1: Coletas Disponíveis para Aceite (RF10) */}
      {activeTab === 'available' && (
        <div className="space-y-4">
          {availability === 'INDISPONIVEL' && (
            <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-900 flex items-center gap-2">
              <Info className="w-4 h-4 text-amber-700 shrink-0" />
              <span>
                Seu status está como <strong>INDISPONÍVEL</strong>. Alterne para <strong>DISPONÍVEL</strong> no painel superior para poder aceitar coletas.
              </span>
            </div>
          )}

          {loading ? (
            <div className="p-8 text-center text-xs text-stone-500">
              <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-stone-400" />
              Carregando coletas disponíveis...
            </div>
          ) : approvedReservations.length === 0 ? (
            <div className="bg-white rounded-3xl p-12 text-center border border-stone-200 max-w-lg mx-auto">
              <Truck className="w-12 h-12 text-stone-300 mx-auto mb-3" />
              <h4 className="text-base font-bold text-stone-800 font-serif">
                Nenhuma coleta aguardando transportador
              </h4>
              <p className="text-xs text-stone-500 mt-1">
                Todas as reservas aprovadas já possuem transportador atribuído ou ainda não foram homologadas pela administração.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {approvedReservations.map((res) => {
                const batch = batchesMap[res.batchId];
                const isExpanded = expandedResId === res.id;
                const shortWindow = formatShortPickupWindow(res.pickupWindowStart, res.pickupWindowEnd);

                return (
                  <div
                    key={res.id}
                    className={`bg-white rounded-2xl sm:rounded-3xl border transition-all duration-200 overflow-hidden ${
                      isExpanded
                        ? 'border-amber-500 shadow-md ring-1 ring-amber-500/20'
                        : 'border-stone-200 shadow-2xs hover:border-amber-300 hover:shadow-xs'
                    }`}
                  >
                    {/* Linha Compacta Clicável (M51) */}
                    <button
                      type="button"
                      onClick={() => toggleExpand(res.id)}
                      aria-expanded={isExpanded}
                      aria-controls={`pickup-details-${res.id}`}
                      className="w-full text-left p-4 sm:p-5 flex items-center justify-between gap-3 sm:gap-4 transition-colors hover:bg-stone-50/70 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 group"
                    >
                      <div className="flex items-center gap-2 sm:gap-3 flex-wrap sm:flex-nowrap flex-1 min-w-0">
                        {/* Nome do alimento */}
                        <div className="flex items-center gap-2 min-w-0">
                          <Package className="w-4 h-4 text-amber-700 shrink-0" />
                          <span className="font-bold text-stone-900 text-sm sm:text-base font-serif truncate">
                            {res.foodName}
                          </span>
                        </div>

                        <span className="text-stone-300 hidden sm:inline select-none">|</span>

                        {/* Quantidade e unidade */}
                        <span className="text-xs font-bold text-amber-900 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200 shrink-0">
                          {res.batchQuantity} {res.batchUnit}
                        </span>

                        <span className="text-stone-300 hidden sm:inline select-none">|</span>

                        {/* Localidade de retirada resumida */}
                        {res.pickupAddress && (
                          <>
                            <span className="text-xs text-stone-600 shrink-0 flex items-center gap-1 max-w-[180px] sm:max-w-[220px] truncate">
                              <MapPin className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                              <span className="truncate">{res.pickupAddress}</span>
                            </span>
                            <span className="text-stone-300 hidden sm:inline select-none">|</span>
                          </>
                        )}

                        {/* Janela de retirada resumida */}
                        <span className="text-xs text-stone-600 shrink-0 flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                          <span>{shortWindow}</span>
                        </span>

                        <span className="text-stone-300 hidden sm:inline select-none">|</span>

                        {/* Situação da coleta */}
                        <div className="shrink-0">
                          <span className="text-xs px-2.5 py-0.5 rounded-full font-bold border inline-flex items-center gap-1 bg-emerald-50 text-emerald-800 border-emerald-200">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            Disponível
                          </span>
                        </div>
                      </div>

                      {/* Ícone de Expansão / Recolhimento */}
                      <div className="shrink-0 pl-1 sm:pl-2">
                        <span
                          className={`w-7 h-7 rounded-xl flex items-center justify-center transition-all duration-200 ${
                            isExpanded
                              ? 'bg-amber-100 text-amber-800 rotate-180'
                              : 'bg-stone-100 text-stone-500 group-hover:bg-stone-200 group-hover:text-stone-800'
                          }`}
                          aria-hidden="true"
                        >
                          <ChevronDown className="w-4 h-4 transition-transform duration-200" />
                        </span>
                      </div>
                    </button>

                    {/* Detalhes Expansíveis Sob Demanda (M51) */}
                    {isExpanded && (
                      <div
                        id={`pickup-details-${res.id}`}
                        className="border-t border-stone-100 p-5 sm:p-6 bg-stone-50/40 space-y-4 animate-in fade-in slide-in-from-top-1 duration-150"
                      >
                        {/* Grid Superior: Alimento/Quantidade, Doador, Entidade Receptora e Validade */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 p-4 bg-white rounded-2xl border border-stone-200/80 text-xs text-stone-600 shadow-2xs">
                          <div>
                            <span className="text-[10px] uppercase font-bold text-stone-400 block">
                              Alimento & Quantidade
                            </span>
                            <strong className="text-stone-900 text-sm block mt-0.5">
                              {res.foodName}
                            </strong>
                            <span className="inline-block mt-1 text-xs font-bold text-amber-900 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                              {res.batchQuantity} {res.batchUnit}
                            </span>
                            {batch?.category && (
                              <span className="text-[11px] text-stone-500 block mt-1">
                                Categoria: <strong>{batch.category}</strong>
                              </span>
                            )}
                          </div>

                          <div>
                            <span className="text-[10px] uppercase font-bold text-stone-400 block">
                              Doador Responsável (Origem)
                            </span>
                            <strong className="text-stone-900 text-sm block mt-0.5">
                              {res.donorName}
                            </strong>
                            {batch?.donorEmail && (
                              <span className="text-[11px] text-stone-500 block truncate">
                                {batch.donorEmail}
                              </span>
                            )}
                          </div>

                          <div>
                            <span className="text-[10px] uppercase font-bold text-stone-400 block">
                              Entidade Receptora (Destino)
                            </span>
                            <strong className="text-stone-900 text-sm block mt-0.5">
                              {res.receiverName}
                            </strong>
                            {res.receiverPhone && (
                              <span className="text-[11px] text-stone-500 block">
                                Contato: {res.receiverPhone}
                              </span>
                            )}
                          </div>

                          <div>
                            <span className="text-[10px] uppercase font-bold text-stone-400 block">
                              Validade do Alimento
                            </span>
                            <span className="text-sm font-semibold text-stone-800 block mt-0.5">
                              {formatDateBR(res.expirationDate || batch?.expirationDate)}
                            </span>
                            {(res.consumptionDeadline || batch?.consumptionDeadline) && (
                              <span className="text-[11px] text-amber-800 font-semibold block mt-0.5">
                                Horário-limite: {(res.consumptionDeadline || batch?.consumptionDeadline)?.replace(':', 'h')}
                              </span>
                            )}
                            <span className="inline-flex items-center gap-1 mt-1 text-[11px] font-bold text-emerald-700">
                              <CheckCircle2 className="w-3.5 h-3.5" /> Reserva Aprovada
                            </span>
                          </div>
                        </div>

                        {/* Bloco Operacional: Endereço de Retirada, Janela e Conservação */}
                        <div className="p-4 bg-white rounded-2xl border border-stone-200/80 text-xs text-stone-600 shadow-2xs space-y-3">
                          <div className="flex items-start gap-2">
                            <MapPin className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                            <div>
                              <span className="font-semibold text-stone-900 block">Endereço de Retirada:</span>
                              <span className="text-stone-700">{res.pickupAddress}</span>
                            </div>
                          </div>

                          <div className="flex items-start gap-2 pt-2 border-t border-stone-100">
                            <Clock className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                            <div className="space-y-0.5">
                              <span className="font-semibold text-stone-900 block">Janela de Retirada (Horário de Brasília):</span>
                              <div className="text-[11px] text-stone-700">
                                <div><strong className="text-stone-900">Início:</strong> {formatDateTimeBR(res.pickupWindowStart)}</div>
                                <div><strong className="text-stone-900">Término:</strong> {formatDateTimeBR(res.pickupWindowEnd)}</div>
                              </div>
                            </div>
                          </div>

                          {batch?.storageCondition && (
                            <div className="flex items-start gap-2 pt-2 border-t border-stone-100">
                              <Thermometer className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                              <div>
                                <span className="font-semibold text-stone-900 block">Condições de Conservação:</span>
                                <span className="text-stone-700">{batch.storageCondition}</span>
                              </div>
                            </div>
                          )}

                          {(res.decisionNotes || (batch as any)?.notes) && (
                            <div className="flex items-start gap-2 pt-2 border-t border-stone-100">
                              <Info className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                              <div>
                                <span className="font-semibold text-stone-900 block">Observações e Parecer Administrativo:</span>
                                {res.decisionNotes && (
                                  <p className="text-stone-700 mb-1">
                                    <strong>Parecer:</strong> {res.decisionNotes}
                                  </p>
                                )}
                                {(batch as any)?.notes && (
                                  <p className="text-stone-600 text-[11px]">{(batch as any).notes}</p>
                                )}
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Ações: Aceitar Coleta */}
                        <div className="pt-1 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                          <div className="text-[11px] text-stone-500 flex items-center gap-1.5">
                            <Sparkles className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                            <span>O aceite atribui a coleta com exclusividade para você no Ciclo 3.</span>
                          </div>

                          <button
                            type="button"
                            disabled={availability === 'INDISPONIVEL'}
                            onClick={() => setAcceptingRes(res)}
                            className="py-2.5 px-5 rounded-xl text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2 shadow-2xs shrink-0"
                          >
                            <Truck className="w-4 h-4" />
                            <span>Aceitar Coleta</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Conteúdo da Aba 2: Minhas Coletas em Andamento (M52) */}
      {activeTab === 'my_pickups' && (
        <div className="space-y-6">
          {(pendingPickups.length + inTransitPickups.length) === 0 ? (
            <div className="bg-white rounded-3xl p-12 text-center border border-stone-200 max-w-lg mx-auto">
              <Truck className="w-12 h-12 text-stone-300 mx-auto mb-3" />
              <h4 className="text-base font-bold text-stone-800 font-serif">
                Você não possui coletas em andamento
              </h4>
              <p className="text-xs text-stone-500 mt-1">
                Consulte a aba "Coletas Disponíveis" para aceitar novas coletas aprovadas.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {[...pendingPickups, ...inTransitPickups].map((pickup) => {
                const batch = batchesMap[pickup.batchId];
                const isPickedUp = pickup.status === 'RETIRADA' || batch?.status === 'EM_TRANSPORTE';
                const isExpanded = expandedMyPickupId === pickup.id;
                const shortWindow = formatShortPickupWindow(pickup.pickupWindowStart, pickup.pickupWindowEnd);

                return (
                  <div
                    key={pickup.id}
                    className={`bg-white rounded-2xl sm:rounded-3xl border transition-all duration-200 overflow-hidden ${
                      isExpanded
                        ? 'border-amber-500 shadow-md ring-1 ring-amber-500/20'
                        : 'border-stone-200 shadow-2xs hover:border-amber-300 hover:shadow-xs'
                    }`}
                  >
                    {/* Linha Compacta Clicável (M52) */}
                    <button
                      type="button"
                      onClick={() => toggleExpandMyPickup(pickup.id)}
                      aria-expanded={isExpanded}
                      aria-controls={`my-pickup-details-${pickup.id}`}
                      className="w-full text-left p-4 sm:p-5 flex items-center justify-between gap-3 sm:gap-4 transition-colors hover:bg-stone-50/70 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 group"
                    >
                      <div className="flex items-center gap-2 sm:gap-3 flex-wrap sm:flex-nowrap flex-1 min-w-0">
                        {/* Nome do alimento */}
                        <div className="flex items-center gap-2 min-w-0">
                          <Package className="w-4 h-4 text-amber-700 shrink-0" />
                          <span className="font-bold text-stone-900 text-sm sm:text-base font-serif truncate">
                            {pickup.foodName}
                          </span>
                        </div>

                        <span className="text-stone-300 hidden sm:inline select-none">|</span>

                        {/* Quantidade e unidade */}
                        <span className="text-xs font-bold text-amber-900 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200 shrink-0">
                          {pickup.batchQuantity} {pickup.batchUnit}
                        </span>

                        <span className="text-stone-300 hidden sm:inline select-none">|</span>

                        {/* Local de retirada resumido */}
                        {pickup.pickupAddress && (
                          <>
                            <span className="text-xs text-stone-600 shrink-0 flex items-center gap-1 max-w-[180px] sm:max-w-[220px] truncate">
                              <MapPin className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                              <span className="truncate">{pickup.pickupAddress}</span>
                            </span>
                            <span className="text-stone-300 hidden sm:inline select-none">|</span>
                          </>
                        )}

                        {/* Janela ou data de retirada */}
                        <span className="text-xs text-stone-600 shrink-0 flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                          <span>{shortWindow}</span>
                        </span>

                        <span className="text-stone-300 hidden sm:inline select-none">|</span>

                        {/* Situação operacional atual */}
                        <div className="shrink-0">
                          <span
                            className={`text-xs px-2.5 py-0.5 rounded-full font-bold border inline-flex items-center gap-1 ${
                              isPickedUp
                                ? 'bg-amber-100 text-amber-800 border-amber-300'
                                : 'bg-teal-100 text-teal-800 border-teal-300'
                            }`}
                          >
                            {isPickedUp ? (
                              <>
                                <Truck className="w-3 h-3 text-amber-700" />
                                Retirada Confirmada
                              </>
                            ) : (
                              <>
                                <CheckCircle2 className="w-3 h-3 text-teal-700" />
                                Coleta Aceita
                              </>
                            )}
                          </span>
                        </div>
                      </div>

                      {/* Ícone de Expansão / Recolhimento */}
                      <div className="shrink-0 pl-1 sm:pl-2">
                        <span
                          className={`w-7 h-7 rounded-xl flex items-center justify-center transition-all duration-200 ${
                            isExpanded
                              ? 'bg-amber-100 text-amber-800 rotate-180'
                              : 'bg-stone-100 text-stone-500 group-hover:bg-stone-200 group-hover:text-stone-800'
                          }`}
                          aria-hidden="true"
                        >
                          <ChevronDown className="w-4 h-4 transition-transform duration-200" />
                        </span>
                      </div>
                    </button>

                    {/* Detalhes Expansíveis Sob Demanda (M52) */}
                    {isExpanded && (
                      <div
                        id={`my-pickup-details-${pickup.id}`}
                        className="border-t border-stone-100 p-5 sm:p-6 bg-stone-50/40 space-y-4 animate-in fade-in slide-in-from-top-1 duration-150"
                      >
                        {/* Grid Superior: Alimento/Quantidade/Lote, Doador, Entidade Receptora e Validade */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 p-4 bg-white rounded-2xl border border-stone-200/80 text-xs text-stone-600 shadow-2xs">
                          <div>
                            <span className="text-[10px] uppercase font-bold text-stone-400 block">
                              Alimento & Quantidade
                            </span>
                            <strong className="text-stone-900 text-sm block mt-0.5">
                              {pickup.foodName}
                            </strong>
                            <span className="inline-block mt-1 text-xs font-bold text-amber-900 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                              {pickup.batchQuantity} {pickup.batchUnit}
                            </span>
                            <span className="text-[11px] text-stone-400 block mt-1 font-mono">
                              Lote: {pickup.batchId.slice(0, 8)}...
                            </span>
                          </div>

                          <div>
                            <span className="text-[10px] uppercase font-bold text-stone-400 block">
                              Origem / Doador
                            </span>
                            <strong className="text-stone-900 text-sm block mt-0.5">
                              {pickup.donorName}
                            </strong>
                            <span className="text-[11px] text-stone-500 block truncate">
                              {pickup.pickupAddress}
                            </span>
                          </div>

                          <div>
                            <span className="text-[10px] uppercase font-bold text-stone-400 block">
                              Destino / Entidade Receptora
                            </span>
                            <strong className="text-stone-900 text-sm block mt-0.5">
                              {pickup.receiverName}
                            </strong>
                            <span className="text-[11px] text-stone-500 block">
                              Entidade Receptora Homologada
                            </span>
                          </div>

                          <div>
                            <span className="text-[10px] uppercase font-bold text-stone-400 block">
                              Validade & Horário-Limite
                            </span>
                            <span className="text-sm font-semibold text-stone-800 block mt-0.5">
                              {formatDateBR(batch?.expirationDate)}
                            </span>
                            {batch?.consumptionDeadline && (
                              <span className="text-[11px] text-amber-800 font-semibold block mt-0.5">
                                Horário-limite: {batch.consumptionDeadline.replace(':', 'h')}
                              </span>
                            )}
                            <p className="text-[11px] text-stone-400 mt-1">
                              Aceita em {formatDateTimeBR(pickup.acceptedAt)}
                            </p>
                          </div>
                        </div>

                        {/* Bloco Operacional: Janela, Conservação e Endereço */}
                        <div className="p-4 bg-white rounded-2xl border border-stone-200/80 text-xs text-stone-600 shadow-2xs space-y-3">
                          <div className="flex items-start gap-2">
                            <Clock className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                            <div className="space-y-0.5">
                              <span className="font-semibold text-stone-900 block">Janela de Retirada (Horário de Brasília):</span>
                              <div className="text-[11px] text-stone-700">
                                <div><strong className="text-stone-900">Início:</strong> {formatDateTimeBR(pickup.pickupWindowStart)}</div>
                                <div><strong className="text-stone-900">Término:</strong> {formatDateTimeBR(pickup.pickupWindowEnd)}</div>
                              </div>
                            </div>
                          </div>

                          {batch?.storageCondition && (
                            <div className="flex items-start gap-2 pt-2 border-t border-stone-100">
                              <Thermometer className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                              <div>
                                <span className="font-semibold text-stone-900 block">Condições de Conservação:</span>
                                <span className="text-stone-700">{batch.storageCondition}</span>
                              </div>
                            </div>
                          )}

                          <div className="flex items-start gap-2 pt-2 border-t border-stone-100">
                            <Info className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                            <div>
                              <span className="font-semibold text-stone-900 block">Situação Operacional:</span>
                              <span className="text-stone-700">
                                {isPickedUp
                                  ? 'Alimentos retirados e em trânsito. Entregue à entidade no destino.'
                                  : 'Coleta sob sua responsabilidade. Dirija-se ao local do doador dentro da janela para retirar o lote.'}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Linha do Tempo Visual Integrada */}
                        {batch && (
                          <OperationTimeline
                            batch={batch}
                            pickup={pickup}
                            occurrences={occurrencesMap[pickup.batchId] || []}
                          />
                        )}

                        {/* Ações Operacionais */}
                        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                          <button
                            type="button"
                            onClick={() => setOccurrenceTarget({ operationId: pickup.reservationId, batchId: pickup.batchId, foodName: pickup.foodName })}
                            className="py-2 px-3.5 rounded-xl text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 flex items-center gap-1.5 transition-colors"
                          >
                            <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                            Registrar Ocorrência
                          </button>

                          {!isPickedUp ? (
                            <button
                              type="button"
                              onClick={() => setConfirmPickupTarget(pickup)}
                              className="py-2.5 px-5 rounded-xl text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 transition-colors flex items-center gap-1.5 shadow-2xs"
                            >
                              <CheckCircle2 className="w-4 h-4" />
                              Confirmar retirada dos alimentos
                            </button>
                          ) : (
                            <div className="text-xs font-semibold text-amber-800 bg-amber-50 px-3 py-1.5 rounded-xl border border-amber-200 flex items-center gap-1.5">
                              <Clock className="w-3.5 h-3.5 text-amber-600" />
                              Retirada registrada em {formatDateTimeBR(pickup.pickedUpAt || '')}. Aguardando entrega no destino.
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Conteúdo da Aba 3: Histórico de Entregas (M53) */}
      {activeTab === 'history' && (
        <div className="space-y-4">
          {completedPickups.length === 0 ? (
            <div className="bg-white rounded-3xl p-12 text-center border border-stone-200 max-w-lg mx-auto">
              <CheckCircle2 className="w-12 h-12 text-stone-300 mx-auto mb-3" />
              <h4 className="text-base font-bold text-stone-800 font-serif">
                Nenhuma entrega finalizada ainda
              </h4>
              <p className="text-xs text-stone-500 mt-1">
                Suas entregas concluídas pela entidade receptora aparecerão neste histórico com todos os registros de auditoria.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {sortedCompletedPickups.map((pickup) => {
                const batch = batchesMap[pickup.batchId];
                const delivery = deliveries.find((d) => d.pickupId === pickup.id || d.batchId === pickup.batchId);
                const batchOccs = occurrencesMap[pickup.batchId] || [];
                const isExpanded = expandedHistoryId === pickup.id;
                const completionDateStr = delivery?.confirmedAt || batch?.completedAt || pickup.pickedUpAt || pickup.acceptedAt;
                const completionDate = formatDateBR(completionDateStr);

                return (
                  <div
                    key={pickup.id}
                    className={`bg-white rounded-2xl sm:rounded-3xl border transition-all duration-200 overflow-hidden ${
                      isExpanded
                        ? 'border-emerald-500 shadow-md ring-1 ring-emerald-500/20'
                        : 'border-stone-200 shadow-2xs hover:border-emerald-300 hover:shadow-xs'
                    }`}
                  >
                    {/* Linha Compacta Clicável (M53) */}
                    <button
                      type="button"
                      onClick={() => toggleExpandHistory(pickup.id)}
                      aria-expanded={isExpanded}
                      aria-controls={`history-details-${pickup.id}`}
                      className="w-full text-left p-4 sm:p-5 flex items-center justify-between gap-3 sm:gap-4 transition-colors hover:bg-stone-50/70 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 group"
                    >
                      <div className="flex items-center gap-2 sm:gap-3 flex-wrap sm:flex-nowrap flex-1 min-w-0">
                        {/* Nome do alimento */}
                        <div className="flex items-center gap-2 min-w-0">
                          <Package className="w-4 h-4 text-emerald-700 shrink-0" />
                          <span className="font-bold text-stone-900 text-sm sm:text-base font-serif truncate">
                            {pickup.foodName}
                          </span>
                        </div>

                        <span className="text-stone-300 hidden sm:inline select-none">|</span>

                        {/* Quantidade e unidade */}
                        <span className="text-xs font-bold text-emerald-900 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200 shrink-0">
                          {pickup.batchQuantity} {pickup.batchUnit}
                        </span>

                        <span className="text-stone-300 hidden sm:inline select-none">|</span>

                        {/* Data da operação ou conclusão */}
                        <span className="text-xs text-stone-600 shrink-0 flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                          <span>{completionDate}</span>
                        </span>

                        <span className="text-stone-300 hidden sm:inline select-none">|</span>

                        {/* Situação final registrada */}
                        <div className="shrink-0">
                          <span className="text-xs px-2.5 py-0.5 rounded-full font-bold border inline-flex items-center gap-1 bg-emerald-100 text-emerald-800 border-emerald-300">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            Concluída
                          </span>
                        </div>
                      </div>

                      {/* Ícone de Expansão / Detalhes */}
                      <div className="shrink-0 pl-1 sm:pl-2">
                        <span
                          className={`w-7 h-7 rounded-xl flex items-center justify-center transition-all duration-200 ${
                            isExpanded
                              ? 'bg-emerald-100 text-emerald-800 rotate-180'
                              : 'bg-stone-100 text-stone-500 group-hover:bg-stone-200 group-hover:text-stone-800'
                          }`}
                          aria-hidden="true"
                        >
                          <ChevronDown className="w-4 h-4 transition-transform duration-200" />
                        </span>
                      </div>
                    </button>

                    {/* Detalhes do Histórico Sob Demanda (M53) */}
                    {isExpanded && (
                      <div
                        id={`history-details-${pickup.id}`}
                        className="border-t border-stone-100 p-5 sm:p-6 bg-stone-50/40 space-y-4 animate-in fade-in slide-in-from-top-1 duration-150"
                      >
                        {/* Grid Superior: Identificação da doação, Doador, Entidade e Transportador */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 p-4 bg-white rounded-2xl border border-stone-200/80 text-xs text-stone-600 shadow-2xs">
                          <div>
                            <span className="text-[10px] uppercase font-bold text-stone-400 block">
                              Doação & Quantidade
                            </span>
                            <strong className="text-stone-900 text-sm block mt-0.5">
                              {pickup.foodName}
                            </strong>
                            <span className="inline-block mt-1 text-xs font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                              {pickup.batchQuantity} {pickup.batchUnit}
                            </span>
                            <span className="text-[11px] text-stone-400 block mt-1 font-mono">
                              Lote: {pickup.batchId.slice(0, 8)}...
                            </span>
                          </div>

                          <div>
                            <span className="text-[10px] uppercase font-bold text-stone-400 block">
                              Doador (Origem)
                            </span>
                            <strong className="text-stone-900 text-sm block mt-0.5">
                              {pickup.donorName}
                            </strong>
                            <span className="text-[11px] text-stone-500 block truncate">
                              {pickup.pickupAddress}
                            </span>
                          </div>

                          <div>
                            <span className="text-[10px] uppercase font-bold text-stone-400 block">
                              Entidade Receptora (Destino)
                            </span>
                            <strong className="text-stone-900 text-sm block mt-0.5">
                              {pickup.receiverName}
                            </strong>
                            <span className="text-[11px] text-stone-500 block">
                              Entidade Receptora Homologada
                            </span>
                          </div>

                          <div>
                            <span className="text-[10px] uppercase font-bold text-stone-400 block">
                              Transportador Responsável
                            </span>
                            <strong className="text-stone-900 text-sm block mt-0.5">
                              {pickup.transporterName || userAccount?.name || 'Transportador'}
                            </strong>
                            <span className="inline-flex items-center gap-1 mt-1 text-[11px] font-bold text-emerald-700">
                              <CheckCircle2 className="w-3.5 h-3.5" /> Entrega Concluída
                            </span>
                          </div>
                        </div>

                        {/* Bloco de Rastreabilidade / Datas Operacionais */}
                        <div className="p-4 bg-white rounded-2xl border border-stone-200/80 text-xs text-stone-600 shadow-2xs space-y-2">
                          <span className="text-[10px] uppercase font-bold text-stone-400 block mb-1">
                            Rastreabilidade do Ciclo de Vida (Auditoria M15 / M31 / M37)
                          </span>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div className="p-2.5 bg-stone-50 rounded-xl border border-stone-200/60">
                              <span className="text-[10px] text-stone-400 font-bold uppercase block">1. Aceite da Coleta</span>
                              <strong className="text-stone-800 text-xs">{formatDateTimeBR(pickup.acceptedAt)}</strong>
                            </div>

                            <div className="p-2.5 bg-stone-50 rounded-xl border border-stone-200/60">
                              <span className="text-[10px] text-stone-400 font-bold uppercase block">2. Retirada no Doador</span>
                              <strong className="text-stone-800 text-xs">{formatDateTimeBR(pickup.pickedUpAt)}</strong>
                            </div>

                            <div className="p-2.5 bg-emerald-50 rounded-xl border border-emerald-200/80">
                              <span className="text-[10px] text-emerald-700 font-bold uppercase block">3. Recebimento no Destino</span>
                              <strong className="text-emerald-900 text-xs">
                                {formatDateTimeBR(delivery?.confirmedAt || batch?.completedAt || pickup.pickedUpAt || pickup.acceptedAt)}
                              </strong>
                            </div>
                          </div>
                        </div>

                        {/* Linha do tempo visual da doação concluída */}
                        {batch && (
                          <div className="pt-2">
                            <OperationTimeline
                              batch={batch}
                              pickup={pickup}
                              occurrences={batchOccs}
                            />
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Modal de Confirmação de Aceite de Coleta */}
      {acceptingRes && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-900/60 backdrop-blur-xs flex justify-center items-start sm:items-center p-2.5 sm:p-4 overscroll-contain">
          <div className="bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-7 max-w-md w-full shadow-2xl border border-stone-200 animate-in fade-in zoom-in-95 duration-150 space-y-4 my-auto max-h-[calc(100dvh-1.25rem)] sm:max-h-[min(90vh,750px)] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100 shrink-0">
              <h3 className="text-base font-bold text-stone-900 font-serif flex items-center gap-2">
                <Truck className="w-5 h-5 text-amber-600 shrink-0" />
                <span>Confirmar aceite da coleta</span>
              </h3>
              <button onClick={() => setAcceptingRes(null)} aria-label="Fechar" className="p-1 rounded-lg text-stone-400 hover:text-stone-600 hover:bg-stone-100 shrink-0">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-stone-600 leading-relaxed">
              Você está assumindo a responsabilidade pela coleta e entrega dos alimentos abaixo:
            </p>

            <div className="p-3.5 bg-stone-50 rounded-2xl border border-stone-200 text-xs space-y-1.5">
              <div className="font-bold text-stone-900 text-sm">{acceptingRes.foodName} ({acceptingRes.batchQuantity} {acceptingRes.batchUnit})</div>
              <div><strong>Local de Coleta:</strong> {acceptingRes.pickupAddress}</div>
              <div><strong>Entidade Receptora:</strong> {acceptingRes.receiverName}</div>
              <div className="text-[11px] text-stone-500">
                Janela: {formatDateTimeBR(acceptingRes.pickupWindowStart)} até {formatDateTimeBR(acceptingRes.pickupWindowEnd)}
              </div>
            </div>

            <p className="text-[11px] text-amber-900 bg-amber-50 p-2.5 rounded-xl border border-amber-200">
              Ao aceitar, a coleta será atribuída exclusivamente a você e deixará de aparecer para outros transportadores.
            </p>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setAcceptingRes(null)}
                className="flex-1 py-2 rounded-xl text-xs font-semibold text-stone-700 bg-stone-100 hover:bg-stone-200 transition-colors"
              >
                Voltar
              </button>
              <button
                type="button"
                disabled={actionLoading}
                onClick={handleAcceptPickup}
                className="flex-1 py-2 rounded-xl text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-1.5 shadow-2xs"
              >
                {actionLoading ? 'Processando...' : 'Confirmar aceite da coleta'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Confirmação de Retirada dos Alimentos */}
      {confirmPickupTarget && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-900/60 backdrop-blur-xs flex justify-center items-start sm:items-center p-2.5 sm:p-4 overscroll-contain">
          <div className="bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-7 max-w-md w-full shadow-2xl border border-stone-200 animate-in fade-in zoom-in-95 duration-150 space-y-4 my-auto max-h-[calc(100dvh-1.25rem)] sm:max-h-[min(90vh,750px)] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100 shrink-0">
              <h3 className="text-base font-bold text-stone-900 font-serif flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-amber-600 shrink-0" />
                <span>Confirmar retirada dos alimentos</span>
              </h3>
              <button onClick={() => setConfirmPickupTarget(null)} aria-label="Fechar" className="p-1 rounded-lg text-stone-400 hover:text-stone-600 hover:bg-stone-100 shrink-0">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-stone-600 leading-relaxed">
              Confirme que você compareceu ao local de doação e retirou efetivamente o lote de alimentos:
            </p>

            <div className="p-3.5 bg-stone-50 rounded-2xl border border-stone-200 text-xs space-y-1.5">
              <div className="font-bold text-stone-900 text-sm">{confirmPickupTarget.foodName} ({confirmPickupTarget.batchQuantity} {confirmPickupTarget.batchUnit})</div>
              <div><strong>Doador:</strong> {confirmPickupTarget.donorName}</div>
              <div><strong>Endereço de Coleta:</strong> {confirmPickupTarget.pickupAddress}</div>
              <div><strong>Destino:</strong> {confirmPickupTarget.receiverName}</div>
            </div>

            <p className="text-[11px] text-amber-900 bg-amber-50 p-2.5 rounded-xl border border-amber-200">
              Após confirmar, a situação do lote mudará para <strong>EM TRANSPORTE</strong> e a entidade receptora será notificada para conferência da entrega.
            </p>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setConfirmPickupTarget(null)}
                className="flex-1 py-2 rounded-xl text-xs font-semibold text-stone-700 bg-stone-100 hover:bg-stone-200 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={actionLoading}
                onClick={handleConfirmPickup}
                className="flex-1 py-2 rounded-xl text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-1.5 shadow-2xs"
              >
                {actionLoading ? 'Registrando...' : 'Confirmar retirada dos alimentos'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Ocorrência (RF14) */}
      {occurrenceTarget && currentUser && (
        <CreateOccurrenceModal
          isOpen={true}
          onClose={() => setOccurrenceTarget(null)}
          operationId={occurrenceTarget.operationId}
          batchId={occurrenceTarget.batchId}
          foodName={occurrenceTarget.foodName}
          authorUserId={currentUser.uid}
          authorName={userAccount?.name || currentUser.email || 'Transportador'}
          authorProfile="TRANSPORTER"
          defaultStage="TRANSPORTE"
          onSuccess={() => {
            setFeedbackMsg({
              text: 'Ocorrência registrada no histórico com sucesso.',
              type: 'success'
            });
          }}
        />
      )}
    </div>
  );
};
