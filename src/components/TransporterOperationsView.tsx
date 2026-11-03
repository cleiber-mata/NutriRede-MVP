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
  Info
} from 'lucide-react';
import { collection, onSnapshot, query, where, doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from '../context/AuthContext';
import { FoodBatch, Occurrence, Pickup, Reservation, UserProfileDoc } from '../types';
import {
  acceptPickupAtomic,
  confirmPickupAtomic,
  getTransporterAvailability,
  setTransporterAvailability
} from '../services/transportService';
import { formatDateTimeBR } from '../utils/dateUtils';
import { OperationTimeline } from './OperationTimeline';
import { CreateOccurrenceModal } from './CreateOccurrenceModal';

export const TransporterOperationsView: React.FC = () => {
  const { currentUser, userAccount, activeProfile, reloadUserData } = useAuth();

  const [activeTab, setActiveTab] = useState<'available' | 'my_pickups' | 'history'>('available');
  const [availability, setAvailability] = useState<'DISPONIVEL' | 'INDISPONIVEL'>('DISPONIVEL');
  const [availabilityLoading, setAvailabilityLoading] = useState(false);

  // Dados em tempo real
  const [approvedReservations, setApprovedReservations] = useState<Reservation[]>([]);
  const [myPickups, setMyPickups] = useState<Pickup[]>([]);
  const [batchesMap, setBatchesMap] = useState<Record<string, FoodBatch>>({});
  const [occurrencesMap, setOccurrencesMap] = useState<Record<string, Occurrence[]>>({});
  const [loading, setLoading] = useState(true);

  // Ações e Modais
  const [acceptingRes, setAcceptingRes] = useState<Reservation | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [confirmPickupTarget, setConfirmPickupTarget] = useState<Pickup | null>(null);
  const [occurrenceTarget, setOccurrenceTarget] = useState<{ operationId: string; batchId: string; foodName: string } | null>(null);
  const [feedbackMsg, setFeedbackMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

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

    const unsubRes = onSnapshot(qRes, (snap) => {
      const list: Reservation[] = [];
      snap.forEach((d) => list.push(d.data() as Reservation));
      // Filtra apenas as que ainda não possuem transportador vinculado
      const available = list.filter((r) => !r.activePickupId);
      setApprovedReservations(available);
      setLoading(false);
    });

    return () => unsubRes();
  }, [currentUser]);

  // 3. Monitora coletas atribuídas ao transportador atual
  useEffect(() => {
    if (!currentUser) return;

    const qPick = query(
      collection(db, 'pickups'),
      where('transporterUserId', '==', currentUser.uid)
    );

    const unsubPick = onSnapshot(qPick, async (snap) => {
      const list: Pickup[] = [];
      snap.forEach((d) => list.push(d.data() as Pickup));
      setMyPickups(list);

      // Carrega lotes associados em lote para detalhes e timeline
      const batchIds = Array.from(new Set(list.map((p) => p.batchId)));
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
      setBatchesMap(newMap);
    });

    return () => unsubPick();
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

  const pendingPickups = myPickups.filter((p) => p.status === 'ACEITA');
  const inTransitPickups = myPickups.filter((p) => p.status === 'RETIRADA' && batchesMap[p.batchId]?.status === 'EM_TRANSPORTE');
  const completedPickups = myPickups.filter((p) => batchesMap[p.batchId]?.status === 'CONCLUIDO');

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
                Disponibilidade do Transportador (RF09)
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
          Coletas Disponíveis (RF10)
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
          Minhas Coletas em Andamento (RF11)
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
          Histórico de Entregas (RF15)
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {approvedReservations.map((res) => (
                <div
                  key={res.id}
                  className="bg-white rounded-3xl p-5 border border-stone-200 shadow-2xs hover:border-amber-300 transition-all space-y-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-[11px] font-bold text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full border border-emerald-300">
                        {res.batchQuantity} {res.batchUnit}
                      </span>
                      <h4 className="text-base font-bold text-stone-900 font-serif mt-2">
                        {res.foodName}
                      </h4>
                    </div>

                    <span className="text-[11px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full border border-amber-300">
                      Reserva Aprovada
                    </span>
                  </div>

                  <div className="space-y-1.5 text-xs text-stone-600 pt-2 border-t border-stone-100">
                    <div className="flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                      <span>Doador: <strong>{res.donorName}</strong></span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                      <span>Retirada em: <strong>{res.pickupAddress}</strong></span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                      <span>Janela: {formatDateTimeBR(res.pickupWindowStart)} até {formatDateTimeBR(res.pickupWindowEnd)}</span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <Package className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                      <span>Destino: <strong>{res.receiverName}</strong></span>
                    </div>
                  </div>

                  <div className="pt-2">
                    <button
                      type="button"
                      disabled={availability === 'INDISPONIVEL'}
                      onClick={() => setAcceptingRes(res)}
                      className="w-full py-2.5 px-4 rounded-xl text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-1.5 shadow-2xs"
                    >
                      <Truck className="w-4 h-4" />
                      Aceitar Coleta (RF10)
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Conteúdo da Aba 2: Minhas Coletas em Andamento (RF11) */}
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
            <div className="space-y-6">
              {[...pendingPickups, ...inTransitPickups].map((pickup) => {
                const batch = batchesMap[pickup.batchId];
                const isPickedUp = pickup.status === 'RETIRADA' || batch?.status === 'EM_TRANSPORTE';

                return (
                  <div
                    key={pickup.id}
                    className="bg-white rounded-3xl p-6 border border-stone-200 shadow-2xs space-y-4"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-stone-100">
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-lg font-bold text-stone-900 font-serif">
                            {pickup.foodName}
                          </h4>
                          <span className="text-xs font-bold text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full border border-emerald-300">
                            {pickup.batchQuantity} {pickup.batchUnit}
                          </span>
                        </div>
                        <p className="text-xs text-stone-500 mt-0.5">
                          Aceita em {formatDateTimeBR(pickup.acceptedAt)}
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <span
                          className={`text-xs font-bold px-3 py-1 rounded-full border ${
                            isPickedUp
                              ? 'bg-amber-100 text-amber-800 border-amber-300'
                              : 'bg-teal-100 text-teal-800 border-teal-300'
                          }`}
                        >
                          {isPickedUp ? 'Alimentos em Transporte (RF11)' : 'Coleta Aceita — Aguardando Retirada'}
                        </span>
                      </div>
                    </div>

                    {/* Dados Operacionais de Origem e Destino */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-stone-700 bg-stone-50 p-4 rounded-2xl border border-stone-200">
                      <div className="space-y-1">
                        <span className="text-[10px] uppercase font-bold text-stone-400">Origem / Retirada</span>
                        <div className="font-semibold text-stone-900">{pickup.donorName}</div>
                        <div className="text-stone-500">{pickup.pickupAddress}</div>
                        <div className="text-[11px] text-stone-500 mt-1">
                          Janela: {formatDateTimeBR(pickup.pickupWindowStart)} até {formatDateTimeBR(pickup.pickupWindowEnd)}
                        </div>
                      </div>

                      <div className="space-y-1 md:border-l md:border-stone-200 md:pl-4">
                        <span className="text-[10px] uppercase font-bold text-stone-400">Destino / Entrega</span>
                        <div className="font-semibold text-stone-900">{pickup.receiverName}</div>
                        <div className="text-stone-500">Entidade Receptora Homologada</div>
                        <div className="text-[11px] text-stone-500 mt-1">
                          {isPickedUp
                            ? 'Aguardando confirmação de recebimento pela entidade no destino (RN08).'
                            : 'Retire os alimentos no doador para iniciar o transporte.'}
                        </div>
                      </div>
                    </div>

                    {/* Linha do Tempo Visual Integrada (RF13) */}
                    {batch && (
                      <OperationTimeline
                        batch={batch}
                        pickup={pickup}
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
                        Registrar Ocorrência (RF14)
                      </button>

                      {!isPickedUp ? (
                        <button
                          type="button"
                          onClick={() => setConfirmPickupTarget(pickup)}
                          className="py-2.5 px-5 rounded-xl text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 transition-colors flex items-center gap-1.5 shadow-2xs"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          Confirmar Retirada dos Alimentos (RF11)
                        </button>
                      ) : (
                        <div className="text-xs font-semibold text-amber-800 bg-amber-50 px-3 py-1.5 rounded-xl border border-amber-200 flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-amber-600" />
                          Retirada registrada em {formatDateTimeBR(pickup.pickedUpAt || '')}. Aguardando entrega no destino.
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Conteúdo da Aba 3: Histórico de Entregas (RF15) */}
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
            <div className="grid grid-cols-1 gap-4">
              {completedPickups.map((pickup) => (
                <div
                  key={pickup.id}
                  className="bg-white rounded-3xl p-5 border border-stone-200 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                      <h4 className="text-base font-bold text-stone-900 font-serif">
                        {pickup.foodName}
                      </h4>
                      <span className="text-xs font-bold text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full border border-emerald-300">
                        {pickup.batchQuantity} {pickup.batchUnit}
                      </span>
                    </div>

                    <span className="text-xs font-bold text-emerald-800 bg-emerald-100 px-3 py-1 rounded-full border border-emerald-300">
                      Doação Concluída (RN08)
                    </span>
                  </div>

                  <div className="text-xs text-stone-600 grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2 border-t border-stone-100">
                    <div>
                      <span className="text-stone-400">Doador:</span> {pickup.donorName}
                    </div>
                    <div>
                      <span className="text-stone-400">Entidade:</span> {pickup.receiverName}
                    </div>
                    <div>
                      <span className="text-stone-400">Aceito em:</span> {formatDateTimeBR(pickup.acceptedAt)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Modal de Confirmação de Aceite de Coleta (RF10) */}
      {acceptingRes && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border border-stone-200 animate-in fade-in zoom-in-95 duration-150 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100">
              <h3 className="text-base font-bold text-stone-900 font-serif flex items-center gap-2">
                <Truck className="w-5 h-5 text-amber-600" />
                Confirmar Aceite de Coleta
              </h3>
              <button onClick={() => setAcceptingRes(null)} className="text-stone-400 hover:text-stone-600">
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
                {actionLoading ? 'Processando...' : 'Confirmar Aceite'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Confirmação de Retirada dos Alimentos (RF11) */}
      {confirmPickupTarget && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border border-stone-200 animate-in fade-in zoom-in-95 duration-150 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100">
              <h3 className="text-base font-bold text-stone-900 font-serif flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-amber-600" />
                Registrar Retirada dos Alimentos (RF11)
              </h3>
              <button onClick={() => setConfirmPickupTarget(null)} className="text-stone-400 hover:text-stone-600">
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
                {actionLoading ? 'Registrando...' : 'Confirmar Retirada'}
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
