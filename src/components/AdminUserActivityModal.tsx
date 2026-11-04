import React, { useEffect, useState } from 'react';
import {
  X,
  User,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Store,
  Building2,
  Truck,
  Package,
  HeartHandshake,
  CheckCircle2,
  Clock,
  XCircle,
  PowerOff,
  AlertCircle,
  Edit3,
  Save,
  ShieldCheck,
  Info
} from 'lucide-react';
import { collection, getDocs, query, where, updateDoc, doc } from 'firebase/firestore';
import { db } from '../firebase/config';
import {
  FoodBatch,
  PROFILE_DEFINITIONS,
  ProfileType,
  Reservation,
  STATUS_CONFIG,
  UserAccount,
  UserProfileDoc,
  BATCH_STATUS_CONFIG,
  RESERVATION_STATUS_CONFIG
} from '../types';
import { adminDeactivateProfile, adminReactivateProfile, updateUserAccount } from '../services/profileService';
import { formatDateBR, formatDateTimeBR } from '../utils/dateUtils';

interface AdminUserActivityModalProps {
  user: UserAccount | null;
  isOpen: boolean;
  onClose: () => void;
  adminIdentifier: string;
  onRefresh: () => void;
}

export const AdminUserActivityModal: React.FC<AdminUserActivityModalProps> = ({
  user,
  isOpen,
  onClose,
  adminIdentifier,
  onRefresh
}) => {
  const [profiles, setProfiles] = useState<UserProfileDoc[]>([]);
  const [batches, setBatches] = useState<FoodBatch[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'batches' | 'reservations' | 'transport'>('overview');

  // Modo de edição de dados pelo admin
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [saveLoading, setSaveLoading] = useState(false);

  // Ação de desativação administrativa
  const [deactivatingProfile, setDeactivatingProfile] = useState<UserProfileDoc | null>(null);
  const [adminDeactReason, setAdminDeactReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    if (!isOpen || !user) return;

    setEditName(user.name || '');
    setEditPhone(user.phone || '');
    setEditAddress(user.address || '');
    setEditNotes(user.notes || '');

    const loadData = async () => {
      setLoading(true);
      try {
        // Carrega perfis do usuário
        const profilesSnap = await getDocs(
          query(collection(db, 'profiles'), where('userId', '==', user.uid))
        );
        const loadedProfiles: UserProfileDoc[] = [];
        profilesSnap.forEach((d) => loadedProfiles.push(d.data() as UserProfileDoc));
        setProfiles(loadedProfiles);

        // Carrega lotes publicados como doador
        const batchesSnap = await getDocs(
          query(collection(db, 'food_batches'), where('donorId', '==', user.uid))
        );
        const loadedBatches: FoodBatch[] = [];
        batchesSnap.forEach((d) => loadedBatches.push(d.data() as FoodBatch));
        loadedBatches.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setBatches(loadedBatches);

        // Carrega reservas solicitadas como entidade receptora
        const resSnap = await getDocs(
          query(collection(db, 'reservations'), where('receiverId', '==', user.uid))
        );
        const loadedRes: Reservation[] = [];
        resSnap.forEach((d) => loadedRes.push(d.data() as Reservation));
        loadedRes.sort((a, b) => new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime());
        setReservations(loadedRes);
      } catch (err) {
        console.error('Erro ao carregar auditoria do usuário:', err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [isOpen, user]);

  if (!isOpen || !user) return null;

  const handleSaveUserData = async () => {
    setSaveLoading(true);
    setFeedback(null);
    try {
      await updateUserAccount(
        user.uid,
        {
          name: editName.trim(),
          phone: editPhone.trim(),
          address: editAddress.trim(),
          notes: editNotes.trim()
        },
        adminIdentifier
      );
      setFeedback({ text: 'Dados do usuário atualizados com sucesso.', type: 'success' });
      setIsEditing(false);
      onRefresh();
    } catch (err: unknown) {
      setFeedback({ text: 'Falha ao atualizar dados do usuário.', type: 'error' });
    } finally {
      setSaveLoading(false);
    }
  };

  const handleAdminDeactivate = async () => {
    if (!deactivatingProfile) return;
    if (!adminDeactReason.trim()) {
      alert('A justificativa é obrigatória para desativações administrativas.');
      return;
    }

    setActionLoading(true);
    try {
      await adminDeactivateProfile(deactivatingProfile.id, adminIdentifier, adminDeactReason);
      setFeedback({ text: 'Perfil desativado administrativamente.', type: 'success' });
      setDeactivatingProfile(null);
      setAdminDeactReason('');
      // Atualiza lista local
      setProfiles((prev) =>
        prev.map((p) =>
          p.id === deactivatingProfile.id
            ? { ...p, status: 'DESATIVADO', deactivationReason: adminDeactReason }
            : p
        )
      );
      onRefresh();
    } catch (err: unknown) {
      setFeedback({ text: 'Erro ao desativar perfil.', type: 'error' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleAdminReactivate = async (profileId: string) => {
    setActionLoading(true);
    try {
      await adminReactivateProfile(profileId, adminIdentifier, 'Reativação e aprovação administrativa concedida.');
      setFeedback({ text: 'Perfil reativado e homologado com sucesso.', type: 'success' });
      setProfiles((prev) =>
        prev.map((p) =>
          p.id === profileId ? { ...p, status: 'APROVADO' } : p
        )
      );
      onRefresh();
    } catch (err: unknown) {
      setFeedback({ text: 'Erro ao reativar perfil.', type: 'error' });
    } finally {
      setActionLoading(false);
    }
  };

  const getProfileIcon = (type: ProfileType) => {
    switch (type) {
      case 'DONOR':
        return <Store className="w-4 h-4 text-emerald-700" />;
      case 'RECEIVER':
        return <Building2 className="w-4 h-4 text-teal-700" />;
      case 'TRANSPORTER':
        return <Truck className="w-4 h-4 text-amber-700" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-900/60 backdrop-blur-xs flex justify-center items-start sm:items-center p-2.5 sm:p-4 overscroll-contain">
      <div className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-7 max-w-4xl w-full shadow-2xl border border-stone-200 animate-in fade-in zoom-in-95 duration-150 my-auto max-h-[calc(100dvh-1.25rem)] sm:max-h-[min(90vh,880px)] flex flex-col">
        {/* Header com Identificação pelo Nome e Papel (Sem UIDs brutos) */}
        <div className="flex items-start justify-between pb-3 sm:pb-4 border-b border-stone-100 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-900 border border-amber-200 flex items-center justify-center font-bold text-xl">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xl font-bold text-stone-900 font-serif">{user.name}</h3>
                <span className="text-xs px-2 py-0.5 rounded-full font-semibold bg-stone-100 text-stone-700 border border-stone-200">
                  {user.accountStatus === 'ACTIVE' ? 'Conta Ativa' : 'Bloqueada'}
                </span>
              </div>
              <p className="text-xs text-stone-500 mt-0.5">{user.email}</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Feedback Alert */}
        {feedback && (
          <div
            className={`mt-3 p-3 rounded-xl text-xs flex items-center justify-between gap-2 shrink-0 ${
              feedback.type === 'success'
                ? 'bg-emerald-50 text-emerald-900 border border-emerald-300'
                : 'bg-rose-50 text-rose-900 border border-rose-300'
            }`}
          >
            <span>{feedback.text}</span>
            <button onClick={() => setFeedback(null)} className="font-bold">×</button>
          </div>
        )}

        {/* Tabs de Navegação */}
        <div className="flex items-center gap-2 border-b border-stone-200 py-3 shrink-0 overflow-x-auto text-xs">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-colors flex items-center gap-1.5 ${
              activeTab === 'overview'
                ? 'bg-amber-100 text-amber-900 border border-amber-300'
                : 'text-stone-600 hover:bg-stone-100'
            }`}
          >
            <User className="w-3.5 h-3.5" />
            Visão Geral & Perfis ({profiles.length})
          </button>

          <button
            onClick={() => setActiveTab('batches')}
            className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-colors flex items-center gap-1.5 ${
              activeTab === 'batches'
                ? 'bg-amber-100 text-amber-900 border border-amber-300'
                : 'text-stone-600 hover:bg-stone-100'
            }`}
          >
            <Package className="w-3.5 h-3.5 text-emerald-700" />
            Lotes Ofertados ({batches.length})
          </button>

          <button
            onClick={() => setActiveTab('reservations')}
            className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-colors flex items-center gap-1.5 ${
              activeTab === 'reservations'
                ? 'bg-amber-100 text-amber-900 border border-amber-300'
                : 'text-stone-600 hover:bg-stone-100'
            }`}
          >
            <HeartHandshake className="w-3.5 h-3.5 text-teal-700" />
            Reservas Solicitadas ({reservations.length})
          </button>

          <button
            onClick={() => setActiveTab('transport')}
            className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-colors flex items-center gap-1.5 ${
              activeTab === 'transport'
                ? 'bg-amber-100 text-amber-900 border border-amber-300'
                : 'text-stone-600 hover:bg-stone-100'
            }`}
          >
            <Truck className="w-3.5 h-3.5 text-amber-700" />
            Transporte (Ciclo 3)
          </button>
        </div>

        {/* Conteúdo com rolagem */}
        <div className="flex-1 overflow-y-auto py-4 space-y-4">
          {loading ? (
            <div className="text-center py-12">
              <div className="w-8 h-8 border-3 border-amber-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              <p className="text-xs text-stone-500">Consultando histórico e atividades no Firestore...</p>
            </div>
          ) : (
            <>
              {/* TAB 1: VISÃO GERAL */}
              {activeTab === 'overview' && (
                <div className="space-y-5">
                  {/* Informações Cadastrais */}
                  <div className="bg-stone-50 rounded-2xl p-4 border border-stone-200">
                    <div className="flex items-center justify-between pb-2 mb-3 border-b border-stone-200">
                      <span className="text-xs font-bold text-stone-700 uppercase tracking-wider">
                        Dados de Contato e Cadastro
                      </span>
                      {!isEditing ? (
                        <button
                          onClick={() => setIsEditing(true)}
                          className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-white border border-stone-300 text-stone-700 hover:bg-stone-100 flex items-center gap-1"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>Editar Dados</span>
                        </button>
                      ) : (
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => setIsEditing(false)}
                            className="px-2.5 py-1 rounded-lg text-xs font-semibold text-stone-600 hover:bg-stone-200"
                          >
                            Cancelar
                          </button>
                          <button
                            onClick={handleSaveUserData}
                            disabled={saveLoading}
                            className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-700 flex items-center gap-1"
                          >
                            <Save className="w-3.5 h-3.5" />
                            <span>{saveLoading ? 'Salvando...' : 'Salvar'}</span>
                          </button>
                        </div>
                      )}
                    </div>

                    {!isEditing ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-stone-600">
                        <div>
                          <strong className="text-stone-900 block">Nome Cadastral:</strong>
                          <span>{user.name}</span>
                        </div>
                        <div>
                          <strong className="text-stone-900 block">E-mail:</strong>
                          <span>{user.email}</span>
                        </div>
                        <div>
                          <strong className="text-stone-900 block">Telefone:</strong>
                          <span>{user.phone || 'Não informado'}</span>
                        </div>
                        <div>
                          <strong className="text-stone-900 block">Endereço Operacional:</strong>
                          <span>{user.address || 'Não informado'}</span>
                        </div>
                        <div className="sm:col-span-2">
                          <strong className="text-stone-900 block">Observações:</strong>
                          <span>{user.notes || 'Nenhuma observação registrada.'}</span>
                        </div>
                        <div className="sm:col-span-2 text-[10px] text-stone-400 pt-1 border-t border-stone-200">
                          Cadastrado em {formatDateTimeBR(user.createdAt)}
                          {user.updatedAt && ` • Atualizado em ${formatDateTimeBR(user.updatedAt)}`}
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-3 text-xs">
                        <div>
                          <label className="block text-stone-700 font-semibold mb-1">Nome:</label>
                          <input
                            type="text"
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            className="w-full p-2 rounded-xl border border-stone-300"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-stone-700 font-semibold mb-1">Telefone:</label>
                            <input
                              type="text"
                              value={editPhone}
                              onChange={(e) => setEditPhone(e.target.value)}
                              className="w-full p-2 rounded-xl border border-stone-300"
                            />
                          </div>
                          <div>
                            <label className="block text-stone-700 font-semibold mb-1">Endereço:</label>
                            <input
                              type="text"
                              value={editAddress}
                              onChange={(e) => setEditAddress(e.target.value)}
                              className="w-full p-2 rounded-xl border border-stone-300"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-stone-700 font-semibold mb-1">Observações:</label>
                          <textarea
                            rows={2}
                            value={editNotes}
                            onChange={(e) => setEditNotes(e.target.value)}
                            className="w-full p-2 rounded-xl border border-stone-300"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Perfis de Atuação e Histórico de Decisões */}
                  <div className="space-y-3">
                    <h4 className="text-sm font-bold text-stone-900 font-serif">
                      Perfis de Atuação Vinculados à Conta
                    </h4>

                    {profiles.length === 0 ? (
                      <p className="text-xs text-stone-400 italic">Nenhum perfil solicitado até o momento.</p>
                    ) : (
                      <div className="space-y-3">
                        {profiles.map((p) => {
                          const meta = PROFILE_DEFINITIONS[p.profileType];
                          const statusConfig = STATUS_CONFIG[p.status];

                          return (
                            <div
                              key={p.id}
                              className="p-4 rounded-2xl bg-white border border-stone-200 shadow-2xs space-y-2.5"
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <div className="w-8 h-8 rounded-lg bg-stone-100 flex items-center justify-center">
                                    {getProfileIcon(p.profileType)}
                                  </div>
                                  <div>
                                    <span className="font-bold text-xs text-stone-900">
                                      {meta?.title}
                                    </span>
                                    <span className="text-[10px] text-stone-400 ml-2">
                                      Solicitado em {formatDateTimeBR(p.requestedAt)}
                                    </span>
                                  </div>
                                </div>

                                <span
                                  className={`text-xs px-2.5 py-0.5 rounded-full font-semibold border ${statusConfig.badgeClass}`}
                                >
                                  {statusConfig.label}
                                </span>
                              </div>

                              {/* Histórico de Decisão */}
                              {p.decidedAt && (
                                <div className="text-[11px] text-stone-600 bg-stone-50 p-2.5 rounded-xl border border-stone-100 space-y-0.5">
                                  <div>
                                    <strong>Última Decisão:</strong> {p.status} por <em>{p.decidedBy}</em> em {formatDateTimeBR(p.decidedAt)}
                                  </div>
                                  {p.decisionNotes && (
                                    <div className="text-stone-700 italic">"{p.decisionNotes}"</div>
                                  )}
                                </div>
                              )}

                              {/* Histórico de Desativação */}
                              {p.status === 'DESATIVADO' && (
                                <div className="text-[11px] text-stone-700 bg-stone-100 p-2.5 rounded-xl border border-stone-200 space-y-0.5">
                                  <div>
                                    <strong>Desativado em:</strong> {formatDateTimeBR(p.deactivatedAt)} por <em>{p.deactivatedBy}</em>
                                  </div>
                                  {p.deactivationReason && (
                                    <div className="italic">"Motivo: {p.deactivationReason}"</div>
                                  )}
                                </div>
                              )}

                              {/* Ações Administrativas de Perfil */}
                              <div className="pt-2 border-t border-stone-100 flex items-center justify-end gap-2">
                                {p.status !== 'DESATIVADO' ? (
                                  <button
                                    onClick={() => {
                                      setDeactivatingProfile(p);
                                      setAdminDeactReason('');
                                    }}
                                    disabled={actionLoading}
                                    className="px-2.5 py-1 rounded-lg text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 flex items-center gap-1"
                                  >
                                    <PowerOff className="w-3.5 h-3.5" />
                                    <span>Desativar Perfil</span>
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => handleAdminReactivate(p.id)}
                                    disabled={actionLoading}
                                    className="px-2.5 py-1 rounded-lg text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 flex items-center gap-1"
                                  >
                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                    <span>Aprovar / Reativar Perfil</span>
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 2: LOTES DO DOADOR */}
              {activeTab === 'batches' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-stone-100">
                    <span className="text-xs font-bold text-stone-700 uppercase tracking-wider">
                      Lotes Cadastrados pelo Usuário ({batches.length})
                    </span>
                  </div>

                  {batches.length === 0 ? (
                    <div className="text-center py-8 text-xs text-stone-400">
                      Nenhum lote ofertado por este usuário.
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {batches.map((b) => {
                        const bStatus = BATCH_STATUS_CONFIG[b.status];
                        return (
                          <div
                            key={b.id}
                            className="p-3.5 rounded-2xl bg-white border border-stone-200 text-xs space-y-2"
                          >
                            <div className="flex items-start justify-between">
                              <div>
                                <span className="font-bold text-stone-900 text-sm">{b.foodName}</span>
                                <span className="text-[10px] text-stone-500 ml-2">({b.category})</span>
                              </div>
                              <span className={`px-2 py-0.5 rounded-full font-bold border ${bStatus.badgeClass}`}>
                                {bStatus.label}
                              </span>
                            </div>

                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] text-stone-600 bg-stone-50 p-2 rounded-xl">
                              <div>
                                <span className="font-semibold block text-stone-800">Quantidade:</span>
                                {b.quantity} {b.unit}
                              </div>
                              <div>
                                <span className="font-semibold block text-stone-800">Validade:</span>
                                {formatDateBR(b.expirationDate)}
                              </div>
                              <div>
                                <span className="font-semibold block text-stone-800">Janela Início:</span>
                                {formatDateTimeBR(b.pickupWindowStart)}
                              </div>
                              <div>
                                <span className="font-semibold block text-stone-800">Janela Fim:</span>
                                {formatDateTimeBR(b.pickupWindowEnd)}
                              </div>
                            </div>

                            {b.status === 'RESERVADO' && b.reservedByName && (
                              <div className="p-2 bg-amber-50 rounded-lg border border-amber-200 text-[11px] text-amber-900">
                                <strong>Reserva Solicitada:</strong> Entidade {b.reservedByName}
                                {b.activeReservationStatus && ` • Situação: ${b.activeReservationStatus}`}
                              </div>
                            )}

                            <div className="text-[10px] text-stone-400 flex items-center justify-between">
                              <span>Local: {b.pickupAddress}</span>
                              <span>Criado em {formatDateTimeBR(b.createdAt)}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 3: RESERVAS SOLICITADAS */}
              {activeTab === 'reservations' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-stone-100">
                    <span className="text-xs font-bold text-stone-700 uppercase tracking-wider">
                      Reservas Solicitadas pela Entidade ({reservations.length})
                    </span>
                  </div>

                  {reservations.length === 0 ? (
                    <div className="text-center py-8 text-xs text-stone-400">
                      Nenhuma solicitação de reserva realizada por esta entidade.
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {reservations.map((r) => {
                        const rStatus = RESERVATION_STATUS_CONFIG[r.status];
                        return (
                          <div
                            key={r.id}
                            className="p-3.5 rounded-2xl bg-white border border-stone-200 text-xs space-y-2"
                          >
                            <div className="flex items-start justify-between">
                              <div>
                                <span className="font-bold text-stone-900 text-sm">{r.foodName}</span>
                                <span className="text-[11px] text-stone-500 ml-2">Doador: {r.donorName}</span>
                              </div>
                              <span className={`px-2 py-0.5 rounded-full font-bold border ${rStatus.badgeClass}`}>
                                {rStatus.label}
                              </span>
                            </div>

                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px] text-stone-600 bg-stone-50 p-2 rounded-xl">
                              <div>
                                <span className="font-semibold block text-stone-800">Qtd Reservada:</span>
                                {r.batchQuantity} {r.batchUnit}
                              </div>
                              <div>
                                <span className="font-semibold block text-stone-800">Validade:</span>
                                {formatDateBR(r.expirationDate)}
                              </div>
                              <div>
                                <span className="font-semibold block text-stone-800">Solicitado em:</span>
                                {formatDateTimeBR(r.requestedAt)}
                              </div>
                            </div>

                            {r.decidedAt && (
                              <div className="p-2 bg-stone-50 rounded-lg border border-stone-200 text-[11px] text-stone-700">
                                <strong>Parecer Administrativo:</strong> {r.status} por <em>{r.decidedBy}</em> em {formatDateTimeBR(r.decidedAt)}
                                {r.decisionNotes && <span> — "{r.decisionNotes}"</span>}
                              </div>
                            )}

                            {r.status === 'CANCELADA' && (
                              <div className="p-2 bg-stone-100 rounded-lg text-[11px] text-stone-600">
                                Cancelada pela entidade em {formatDateTimeBR(r.canceledAt)}
                                {r.cancelReason && <span> — "{r.cancelReason}"</span>}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 4: TRANSPORTE (CICLO 3) */}
              {activeTab === 'transport' && (
                <div className="p-6 rounded-2xl bg-amber-50/70 border border-amber-200 text-center space-y-3">
                  <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center mx-auto">
                    <Truck className="w-6 h-6" />
                  </div>
                  <h4 className="text-base font-bold text-amber-950">
                    Histórico de Transportes e Rotas (Ciclo 3)
                  </h4>
                  <p className="text-xs text-amber-900 max-w-lg mx-auto leading-relaxed">
                    As operações físicas de <strong>Mural de Rotas, Aceite de Transporte, Coleta e Confirmação de Entrega</strong> pertencem ao <strong>Ciclo 3</strong>.
                  </p>
                  <div className="p-3 bg-white/80 rounded-xl text-left text-xs text-amber-800 border border-amber-200 max-w-md mx-auto space-y-1">
                    <div className="font-semibold flex items-center gap-1">
                      <Info className="w-3.5 h-3.5 text-amber-700" />
                      Auditoria de Integridade:
                    </div>
                    <p className="text-[11px]">
                      Nenhum transporte falso foi gerado. Os perfis aprovados de transportador já estão devidamente aptos para receberem o módulo de roteirização no próximo ciclo.
                    </p>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Modal interno para justificativa de desativação administrativa */}
        {deactivatingProfile && (
          <div className="fixed inset-0 z-60 overflow-y-auto bg-stone-900/60 backdrop-blur-xs flex justify-center items-start sm:items-center p-2.5 sm:p-4 overscroll-contain">
            <div className="bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-6 max-w-sm w-full shadow-2xl border border-stone-200 space-y-3 my-auto max-h-[calc(100dvh-1.25rem)] sm:max-h-[min(90vh,700px)] overflow-y-auto">
              <h4 className="text-sm font-bold text-stone-900">Desativar Perfil Administrativamente</h4>
              <p className="text-xs text-stone-600">
                Informe o motivo da desativação para auditoria:
              </p>
              <textarea
                rows={3}
                required
                value={adminDeactReason}
                onChange={(e) => setAdminDeactReason(e.target.value)}
                placeholder="Ex: Suspensão preventiva por pendência na documentação sanitária."
                className="w-full p-2 text-xs rounded-xl border border-stone-300"
              />
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  onClick={() => setDeactivatingProfile(null)}
                  className="px-3 py-1.5 text-xs text-stone-600 hover:bg-stone-100 rounded-lg"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleAdminDeactivate}
                  disabled={actionLoading}
                  className="px-3 py-1.5 text-xs bg-rose-600 text-white rounded-lg hover:bg-rose-700"
                >
                  Confirmar Desativação
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
