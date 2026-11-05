import React, { useEffect, useState } from 'react';
import {
  Shield,
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Clock,
  Filter,
  Search,
  Store,
  Building2,
  Truck,
  AlertCircle,
  Calendar,
  Mail,
  Phone,
  Check,
  X,
  Layers,
  Users,
  Crown,
  Package
} from 'lucide-react';
import {
  collection,
  doc,
  getDocs,
  onSnapshot,
  query,
  updateDoc
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from '../context/AuthContext';
import {
  PROFILE_DEFINITIONS,
  ProfileStatus,
  ProfileType,
  STATUS_CONFIG,
  UserAccount,
  UserProfileDoc
} from '../types';

import { AdminReservationsTab } from './AdminReservationsTab';
import { AdminUserActivityModal } from './AdminUserActivityModal';
import { AdminManagementTab } from './AdminManagementTab';
import { formatDateBR, formatDateTimeBR } from '../utils/dateUtils';

interface AdminDashboardProps {
  onBackToHome: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onBackToHome }) => {
  const { currentUser, userAccount, isAdmin, isOwner, adminRole } = useAuth();

  const [profiles, setProfiles] = useState<UserProfileDoc[]>([]);
  const [users, setUsers] = useState<UserAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'profiles' | 'reservations' | 'users' | 'admins'>('reservations');

  // Filtros
  const [statusFilter, setStatusFilter] = useState<'ALL' | ProfileStatus>('PENDENTE');
  const [typeFilter, setTypeFilter] = useState<'ALL' | ProfileType>('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  // Ação de rejeição com modal de motivo
  const [rejectModalProfile, setRejectModalProfile] = useState<UserProfileDoc | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [feedbackMsg, setFeedbackMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const [selectedAuditUser, setSelectedAuditUser] = useState<UserAccount | null>(null);

  // Carrega contas de usuários cadastradas
  const loadUsers = async () => {
    try {
      const usersSnap = await getDocs(collection(db, 'users'));
      const loadedUsers: UserAccount[] = [];
      usersSnap.forEach((d) => loadedUsers.push(d.data() as UserAccount));
      setUsers(loadedUsers);
    } catch (e) {
      console.warn('Erro ao carregar lista de usuários:', e);
    }
  };

  // Escuta perfis em tempo real
  useEffect(() => {
    if (!isAdmin) {
      setLoading(false);
      return;
    }

    setLoading(true);

    // Snapshot em tempo real da coleção profiles
    const profilesQuery = query(collection(db, 'profiles'));
    const unsubscribeProfiles = onSnapshot(
      profilesQuery,
      (snapshot) => {
        const loaded: UserProfileDoc[] = [];
        snapshot.forEach((d) => loaded.push(d.data() as UserProfileDoc));
        loaded.sort((a, b) => new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime());
        setProfiles(loaded);
        setLoading(false);
      },
      (error) => {
        console.error('Erro ao ler perfis administrativos:', error);
        setLoading(false);
      }
    );

    loadUsers();

    return () => unsubscribeProfiles();
  }, [isAdmin]);

  // Aprova um perfil individualmente (RF03)
  const handleApprove = async (profile: UserProfileDoc) => {
    setActionLoadingId(profile.id);
    setFeedbackMsg(null);

    const now = new Date().toISOString();
    const decidedBy = currentUser?.email || currentUser?.uid || (isOwner ? 'Proprietário NutriRede' : 'Administrador NutriRede');

    try {
      const profileRef = doc(db, 'profiles', profile.id);
      await updateDoc(profileRef, {
        status: 'APROVADO',
        decidedAt: now,
        decidedBy: decidedBy,
        decisionNotes: 'Aprovado após análise cadastral e conformidade com os critérios do PRD.',
      });

      setFeedbackMsg({
        text: `Perfil de ${PROFILE_DEFINITIONS[profile.profileType].title} de "${profile.userName}" foi APROVADO com sucesso.`,
        type: 'success',
      });
    } catch (err: unknown) {
      console.error('Erro ao aprovar perfil:', err);
      setFeedbackMsg({
        text: 'Não foi possível aprovar o perfil. Operação bloqueada pelas regras de segurança.',
        type: 'error',
      });
    } finally {
      setActionLoadingId(null);
    }
  };

  // Rejeita um perfil individualmente com justificativa
  const handleConfirmReject = async () => {
    if (!rejectModalProfile) return;

    setActionLoadingId(rejectModalProfile.id);
    setFeedbackMsg(null);

    const now = new Date().toISOString();
    const decidedBy = currentUser?.email || currentUser?.uid || (isOwner ? 'Proprietário NutriRede' : 'Administrador NutriRede');
    const notes = rejectReason.trim() || 'Documentação ou dados cadastrais insuficientes para homologação.';

    try {
      const profileRef = doc(db, 'profiles', rejectModalProfile.id);
      await updateDoc(profileRef, {
        status: 'REJEITADO',
        decidedAt: now,
        decidedBy: decidedBy,
        decisionNotes: notes,
      });

      setFeedbackMsg({
        text: `Perfil de ${PROFILE_DEFINITIONS[rejectModalProfile.profileType].title} de "${rejectModalProfile.userName}" foi REJEITADO.`,
        type: 'success',
      });
      setRejectModalProfile(null);
      setRejectReason('');
    } catch (err: unknown) {
      console.error('Erro ao rejeitar perfil:', err);
      setFeedbackMsg({
        text: 'Falha ao rejeitar perfil.',
        type: 'error',
      });
    } finally {
      setActionLoadingId(null);
    }
  };

  // Se o usuário atual NÃO for reconhecido como administrador nem proprietário
  if (!isAdmin) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center">
        <div className="bg-white rounded-3xl p-8 border border-stone-200 shadow-sm space-y-4">
          <div className="w-16 h-16 rounded-3xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto border border-rose-200">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold text-stone-900 font-serif">Acesso Administrativo Restrito</h2>
          <p className="text-stone-600 text-xs sm:text-sm leading-relaxed">
            Esta área é exclusiva para a supervisão e homologação de perfis.
            Sua conta atual <strong className="text-stone-800">({currentUser?.email || 'Não identificada'})</strong> não possui credenciais administrativas ativas.
          </p>

          <div className="p-3.5 bg-stone-50 rounded-2xl border border-stone-200 text-xs text-stone-500 text-left space-y-1">
            <p className="font-semibold text-stone-700">Política de Segurança Zero-Trust:</p>
            <p className="text-[11px] text-stone-500 leading-normal">
              O autocadastramento administrativo foi totalmente desativado. Privilégios administrativos são concedidos exclusivamente pelo Proprietário (OWNER) no banco de dados com validação de regras no servidor.
            </p>
          </div>

          <div className="pt-2">
            <button
              onClick={onBackToHome}
              className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 text-white font-semibold text-xs hover:bg-emerald-700 transition-colors shadow-xs"
            >
              Voltar à Página Inicial
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Estatísticas
  const pendingCount = profiles.filter((p) => p.status === 'PENDENTE').length;
  const approvedCount = profiles.filter((p) => p.status === 'APROVADO').length;
  const rejectedCount = profiles.filter((p) => p.status === 'REJEITADO').length;
  const totalCount = profiles.length;

  // Filtragem
  const filteredProfiles = profiles.filter((p) => {
    const matchStatus = statusFilter === 'ALL' || p.status === statusFilter;
    const matchType = typeFilter === 'ALL' || p.profileType === typeFilter;
    const matchSearch =
      searchTerm === '' ||
      p.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.userEmail.toLowerCase().includes(searchTerm.toLowerCase());
    return matchStatus && matchType && matchSearch;
  });

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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Top Header com identificação OWNER / ADMIN */}
      <div className="bg-gradient-to-r from-stone-900 via-amber-950 to-stone-900 rounded-3xl p-6 sm:p-8 text-white shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-6 border border-amber-900/40">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 text-amber-200 border border-amber-500/30 text-xs font-semibold mb-3">
            {isOwner ? <Crown className="w-3.5 h-3.5 text-amber-300" /> : <Shield className="w-3.5 h-3.5" />}
            {isOwner ? 'Proprietário do Sistema (OWNER)' : 'Administrador Autorizado (ADMIN)'}
            <span className="text-amber-400">•</span>
            <span>Governança & Homologação</span>
          </div>
          <h1 className="text-3xl font-bold font-serif">Painel de Homologação e Auditoria</h1>
          <p className="text-amber-100/80 text-xs sm:text-sm mt-1 max-w-xl">
            Supervisão e aprovação individual de perfis de atuação. Arquitetura protegida com autoridade restrita no Cloud Firestore.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right text-xs">
            <div className="flex items-center gap-1.5 justify-end">
              <span className="font-bold text-amber-200">
                {isOwner ? 'Proprietário (OWNER)' : 'Administrador (ADMIN)'}
              </span>
              {isOwner && <Crown className="w-3.5 h-3.5 text-amber-300" />}
            </div>
            <p className="font-semibold text-white truncate max-w-[220px]">
              {userAccount?.name || currentUser?.displayName || 'Administrador Responsável'}
            </p>
            <p className="text-amber-100/70 truncate max-w-[220px] text-[11px]">
              {currentUser?.email}
            </p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500/40 to-amber-700/40 border border-amber-400/40 flex items-center justify-center text-amber-300 font-bold text-sm shadow-inner">
            {isOwner ? 'OWN' : 'ADM'}
          </div>
        </div>
      </div>

      {/* Alerta de Feedback */}
      {feedbackMsg && (
        <div
          className={`p-4 rounded-2xl text-xs flex items-center justify-between gap-3 animate-in fade-in duration-150 ${
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
            <span className="font-medium">{feedbackMsg.text}</span>
          </div>
          <button
            onClick={() => setFeedbackMsg(null)}
            className="text-stone-400 hover:text-stone-600 font-bold"
          >
            ×
          </button>
        </div>
      )}

      {/* Cards de Métricas */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div
          onClick={() => {
            setActiveTab('profiles');
            setStatusFilter('PENDENTE');
          }}
          className={`p-4 rounded-2xl border-2 cursor-pointer transition-all ${
            statusFilter === 'PENDENTE' && activeTab === 'profiles'
              ? 'border-amber-500 bg-amber-50/70 shadow-sm'
              : 'border-stone-200 bg-white hover:border-amber-300'
          }`}
        >
          <div className="flex items-center justify-between text-amber-700 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider">Pendentes</span>
            <Clock className="w-4 h-4" />
          </div>
          <div className="text-2xl font-extrabold text-stone-900">{pendingCount}</div>
          <p className="text-[11px] text-amber-800 mt-1">Requerem análise imediata</p>
        </div>

        <div
          onClick={() => {
            setActiveTab('profiles');
            setStatusFilter('APROVADO');
          }}
          className={`p-4 rounded-2xl border-2 cursor-pointer transition-all ${
            statusFilter === 'APROVADO' && activeTab === 'profiles'
              ? 'border-emerald-500 bg-emerald-50/70 shadow-sm'
              : 'border-stone-200 bg-white hover:border-emerald-300'
          }`}
        >
          <div className="flex items-center justify-between text-emerald-700 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider">Aprovados</span>
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <div className="text-2xl font-extrabold text-stone-900">{approvedCount}</div>
          <p className="text-[11px] text-emerald-800 mt-1">Operações liberadas</p>
        </div>

        <div
          onClick={() => {
            setActiveTab('profiles');
            setStatusFilter('REJEITADO');
          }}
          className={`p-4 rounded-2xl border-2 cursor-pointer transition-all ${
            statusFilter === 'REJEITADO' && activeTab === 'profiles'
              ? 'border-rose-500 bg-rose-50/70 shadow-sm'
              : 'border-stone-200 bg-white hover:border-rose-300'
          }`}
        >
          <div className="flex items-center justify-between text-rose-700 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider">Rejeitados</span>
            <XCircle className="w-4 h-4" />
          </div>
          <div className="text-2xl font-extrabold text-stone-900">{rejectedCount}</div>
          <p className="text-[11px] text-rose-800 mt-1">Recusados na triagem</p>
        </div>

        <div
          onClick={() => setActiveTab('users')}
          className={`p-4 rounded-2xl border-2 cursor-pointer transition-all ${
            activeTab === 'users'
              ? 'border-stone-800 bg-stone-100 shadow-sm'
              : 'border-stone-200 bg-white hover:border-stone-400'
          }`}
        >
          <div className="flex items-center justify-between text-stone-700 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider">Contas</span>
            <Users className="w-4 h-4" />
          </div>
          <div className="text-2xl font-extrabold text-stone-900">{users.length || totalCount}</div>
          <p className="text-[11px] text-stone-600 mt-1">Total de contas únicas</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-stone-200 pb-3 overflow-x-auto">
        <button
          onClick={() => setActiveTab('reservations')}
          className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-colors flex items-center gap-2 ${
            activeTab === 'reservations'
              ? 'bg-amber-100 text-amber-900 border border-amber-300'
              : 'text-stone-600 hover:bg-stone-100'
          }`}
        >
          <Package className="w-4 h-4 text-amber-700" />
          Solicitações de Reserva de Alimentos
        </button>

        <button
          onClick={() => setActiveTab('profiles')}
          className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-colors flex items-center gap-2 ${
            activeTab === 'profiles'
              ? 'bg-amber-100 text-amber-900 border border-amber-300'
              : 'text-stone-600 hover:bg-stone-100'
          }`}
        >
          <Layers className="w-4 h-4" />
          Perfis de Atuação para Homologação ({profiles.length})
        </button>

        <button
          onClick={() => setActiveTab('users')}
          className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-colors flex items-center gap-2 ${
            activeTab === 'users'
              ? 'bg-amber-100 text-amber-900 border border-amber-300'
              : 'text-stone-600 hover:bg-stone-100'
          }`}
        >
          <Users className="w-4 h-4" />
          Contas Cadastradas ({users.length})
        </button>

        {isOwner && (
          <button
            onClick={() => setActiveTab('admins')}
            className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-colors flex items-center gap-2 ${
              activeTab === 'admins'
                ? 'bg-amber-100 text-amber-900 border border-amber-300'
                : 'text-stone-600 hover:bg-stone-100'
            }`}
          >
            <Crown className="w-4 h-4 text-amber-700" />
            Gerenciar Administradores
          </button>
        )}
      </div>

      {activeTab === 'reservations' && <AdminReservationsTab />}

      {activeTab === 'profiles' && (
        <div className="space-y-4">
          {/* Barra de Filtros e Busca */}
          <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-2xs flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="relative w-full md:w-80">
              <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar por usuário ou e-mail..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
              {/* Filtro Status */}
              <div className="flex items-center gap-1 bg-stone-100 p-1 rounded-xl text-xs">
                <span className="text-[10px] font-bold text-stone-500 px-2 uppercase">Status:</span>
                {(['PENDENTE', 'APROVADO', 'REJEITADO', 'ALL'] as const).map((st) => (
                  <button
                    key={st}
                    onClick={() => setStatusFilter(st)}
                    className={`px-2.5 py-1 rounded-lg font-semibold transition-colors ${
                      statusFilter === st
                        ? 'bg-white text-stone-900 shadow-2xs'
                        : 'text-stone-500 hover:text-stone-900'
                    }`}
                  >
                    {st === 'ALL' ? 'Todos' : STATUS_CONFIG[st].label}
                  </button>
                ))}
              </div>

              {/* Filtro Tipo de Perfil */}
              <div className="flex items-center gap-1 bg-stone-100 p-1 rounded-xl text-xs">
                <span className="text-[10px] font-bold text-stone-500 px-2 uppercase">Tipo:</span>
                {(['ALL', 'DONOR', 'RECEIVER', 'TRANSPORTER'] as const).map((tp) => (
                  <button
                    key={tp}
                    onClick={() => setTypeFilter(tp)}
                    className={`px-2 py-1 rounded-lg font-semibold transition-colors ${
                      typeFilter === tp
                        ? 'bg-white text-stone-900 shadow-2xs'
                        : 'text-stone-500 hover:text-stone-900'
                    }`}
                  >
                    {tp === 'ALL' ? 'Todos' : PROFILE_DEFINITIONS[tp].title}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Lista de Perfis */}
          {filteredProfiles.length === 0 ? (
            <div className="bg-white rounded-3xl p-12 text-center border border-stone-200">
              <Clock className="w-10 h-10 text-stone-300 mx-auto mb-3" />
              <h4 className="text-base font-bold text-stone-700">Nenhum perfil encontrado</h4>
              <p className="text-xs text-stone-400 mt-1">
                Tente ajustar os filtros de status ou o termo de busca acima.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredProfiles.map((profile) => {
                const meta = PROFILE_DEFINITIONS[profile.profileType];
                const statusMeta = STATUS_CONFIG[profile.status];
                const isOperating = actionLoadingId === profile.id;

                return (
                  <div
                    key={profile.id}
                    className="bg-white rounded-2xl p-5 border border-stone-200 shadow-2xs hover:shadow-xs transition-shadow flex flex-col md:flex-row md:items-center justify-between gap-4"
                  >
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-xl bg-stone-50 border border-stone-200 flex items-center justify-center shrink-0 mt-0.5">
                        {getProfileIcon(profile.profileType)}
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-sm text-stone-900">
                            {profile.userName}
                          </span>
                          <span className="text-xs text-stone-400">•</span>
                          <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-stone-100 text-stone-700">
                            {meta?.title}
                          </span>
                          <span
                            className={`text-xs px-2.5 py-0.5 rounded-full font-semibold border ${statusMeta?.badgeClass}`}
                          >
                            {statusMeta?.label}
                          </span>
                        </div>

                        <div className="flex items-center gap-4 text-xs text-stone-500 flex-wrap">
                          <span className="flex items-center gap-1">
                            <Mail className="w-3.5 h-3.5" />
                            {profile.userEmail}
                          </span>
                          {profile.userPhone && (
                            <span className="flex items-center gap-1">
                              <Phone className="w-3.5 h-3.5" />
                              {profile.userPhone}
                            </span>
                          )}
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5" />
                            Solicitado em {formatDateTimeBR(profile.requestedAt)}
                          </span>
                        </div>

                        {profile.decidedAt && (
                          <div className="text-[11px] text-stone-500 bg-stone-50 p-2 rounded-lg border border-stone-100 inline-block mt-1">
                            <strong>Decisão:</strong> {profile.status} por <em>{profile.decidedBy || 'Admin'}</em> em{' '}
                            {formatDateTimeBR(profile.decidedAt)}
                            {profile.decisionNotes && <span> — "{profile.decisionNotes}"</span>}
                          </div>
                        )}

                        {profile.status === 'DESATIVADO' && (
                          <div className="text-[11px] text-stone-600 bg-stone-100 p-2 rounded-lg border border-stone-200 inline-block mt-1">
                            <strong>Desativado:</strong> {formatDateTimeBR(profile.deactivatedAt)} por <em>{profile.deactivatedBy || 'Admin'}</em>
                            {profile.deactivationReason && <span> — "{profile.deactivationReason}"</span>}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Ações Administrativas Individuais (RF03) */}
                    <div className="flex items-center gap-2 self-end md:self-center shrink-0">
                      {profile.status !== 'APROVADO' && (
                        <button
                          onClick={() => handleApprove(profile)}
                          disabled={isOperating}
                          className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-2xs flex items-center gap-1.5 transition-colors disabled:opacity-50"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>{isOperating ? 'Gravando...' : 'Aprovar Perfil'}</span>
                        </button>
                      )}

                      {profile.status !== 'REJEITADO' && (
                        <button
                          onClick={() => {
                            setRejectModalProfile(profile);
                            setRejectReason('');
                          }}
                          disabled={isOperating}
                          className="px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-semibold text-xs flex items-center gap-1.5 transition-colors disabled:opacity-50"
                        >
                          <X className="w-3.5 h-3.5" />
                          <span>Rejeitar</span>
                        </button>
                      )}

                      {profile.status === 'APROVADO' && (
                        <span className="text-xs text-emerald-700 font-semibold px-2 py-1 bg-emerald-50 rounded-lg border border-emerald-200">
                          ✓ Homologado
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {activeTab === 'users' && (
        /* Aba de Contas Cadastradas */
        <div className="bg-white rounded-3xl p-6 border border-stone-200 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-stone-100">
            <div>
              <h3 className="text-lg font-bold text-stone-900 font-serif">Contas de Usuários Cadastradas</h3>
              <p className="text-xs text-stone-500">
                Uma conta pode possuir 1, 2 ou 3 perfis vinculados ao seu ID único.
              </p>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 bg-stone-100 text-stone-700 rounded-lg">
              {users.length} usuários
            </span>
          </div>

          <div className="divide-y divide-stone-100">
            {users.map((usr) => {
              const userProfs = profiles.filter((p) => p.userId === usr.uid);

              return (
                <div key={usr.uid} className="py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <h4 className="font-bold text-sm text-stone-900">{usr.name}</h4>
                    <div className="flex items-center gap-3 text-xs text-stone-500 mt-0.5">
                      <span>{usr.email}</span>
                      {usr.phone && <span>• {usr.phone}</span>}
                      <span>• Cadastrado em {formatDateBR(usr.createdAt)}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 flex-wrap">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {userProfs.length > 0 ? (
                        userProfs.map((up) => {
                          const statusConfig = STATUS_CONFIG[up.status];
                          return (
                            <div
                              key={up.id}
                              className={`text-xs px-2.5 py-1 rounded-xl border flex items-center gap-1.5 ${statusConfig.badgeClass}`}
                            >
                              {getProfileIcon(up.profileType)}
                              <span className="font-bold">{PROFILE_DEFINITIONS[up.profileType].title}:</span>
                              <span>{statusConfig.label}</span>
                            </div>
                          );
                        })
                      ) : (
                        <span className="text-xs text-stone-400 italic">Nenhum perfil solicitado</span>
                      )}
                    </div>

                    <button
                      onClick={() => setSelectedAuditUser(usr)}
                      className="px-3 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 font-semibold text-xs flex items-center gap-1.5 transition-colors shadow-2xs"
                    >
                      <Search className="w-3.5 h-3.5 text-amber-700" />
                      <span>Auditar Atividades</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {activeTab === 'admins' && isOwner && (
        <AdminManagementTab users={users} onRefreshUsers={loadUsers} />
      )}

      {/* Modal de Rejeição com Motivo */}
      {rejectModalProfile && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-900/60 backdrop-blur-xs flex justify-center items-start sm:items-center p-2.5 sm:p-4 overscroll-contain">
          <div className="bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-6 max-w-md w-full shadow-2xl border border-stone-200 animate-in fade-in zoom-in-95 duration-150 my-auto max-h-[calc(100dvh-1.25rem)] sm:max-h-[min(90vh,750px)] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100 mb-4 shrink-0">
              <div className="flex items-center gap-2 text-rose-700">
                <XCircle className="w-5 h-5 shrink-0" />
                <h4 className="font-bold text-stone-900 text-base font-serif leading-tight">Rejeitar Perfil</h4>
              </div>
              <button
                onClick={() => setRejectModalProfile(null)}
                aria-label="Fechar"
                className="p-1 rounded-lg text-stone-400 hover:text-stone-600 hover:bg-stone-100 shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="overflow-y-auto overscroll-contain flex-1 pr-0.5">

            <p className="text-xs text-stone-600 leading-relaxed mb-3">
              Você está rejeitando o perfil de <strong>{PROFILE_DEFINITIONS[rejectModalProfile.profileType].title}</strong> para a conta de <strong>{rejectModalProfile.userName}</strong> ({rejectModalProfile.userEmail}).
            </p>

            <div className="mb-4">
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Motivo / Justificativa da Rejeição:
              </label>
              <textarea
                rows={3}
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Ex: Documento de alvará sanitário pendente ou dados de contato não validados."
                className="w-full p-2.5 text-xs rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-rose-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => setRejectModalProfile(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-stone-700 hover:bg-stone-100"
              >
                Cancelar
              </button>
              <button
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

      {/* Modal Administrativo de Atividades e Auditoria Completa do Usuário (Ciclo 2.1) */}
      <AdminUserActivityModal
        user={selectedAuditUser}
        isOpen={!!selectedAuditUser}
        onClose={() => setSelectedAuditUser(null)}
        adminIdentifier={isOwner ? 'Proprietário (OWNER)' : 'Administrador (ADMIN)'}
        onRefresh={loadUsers}
      />
    </div>
  );
};
