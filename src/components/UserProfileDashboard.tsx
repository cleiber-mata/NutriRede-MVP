import React, { useState } from 'react';
import {
  Store,
  Building2,
  Truck,
  CheckCircle2,
  Clock,
  XCircle,
  AlertTriangle,
  PlusCircle,
  User,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Lock,
  ArrowRight,
  ShieldAlert,
  Info,
  Check,
  Package,
  Route,
  HeartHandshake,
  Edit3,
  PowerOff,
  KeyRound,
  ChevronDown
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import {
  PROFILE_DEFINITIONS,
  ProfileType,
  STATUS_CONFIG,
  UserProfileDoc
} from '../types';
import { DonorBatchesView } from './DonorBatchesView';
import { ReceiverExploreView } from './ReceiverExploreView';
import { ReceiverReservationsView } from './ReceiverReservationsView';
import { TransporterOperationsView } from './TransporterOperationsView';
import { EditProfileModal } from './EditProfileModal';
import { DeactivateProfileModal } from './DeactivateProfileModal';
import { ChangeEmailModal } from './ChangeEmailModal';
import { reactivateProfileByUser } from '../services/profileService';
import { formatDateBR, formatDateTimeBR } from '../utils/dateUtils';

interface UserProfileDashboardProps {
  onOpenRequestProfile: () => void;
  onOpenAdmin: () => void;
  onOpenInitialProfileSetup?: () => void;
}

export const UserProfileDashboard: React.FC<UserProfileDashboardProps> = ({
  onOpenRequestProfile,
  onOpenAdmin,
  onOpenInitialProfileSetup,
}) => {
  const {
    currentUser,
    userAccount,
    userProfiles,
    activeProfile,
    switchActiveProfileType,
    isAdmin,
    reloadUserData,
  } = useAuth();

  const [receiverTab, setReceiverTab] = useState<'explore' | 'my_reservations'>('explore');
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isChangeEmailOpen, setIsChangeEmailOpen] = useState(false);
  const [deactivateTarget, setDeactivateTarget] = useState<UserProfileDoc | null>(null);
  const [reactivatingId, setReactivatingId] = useState<string | null>(null);
  const [feedbackMsg, setFeedbackMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Controle de detalhes expansíveis dos perfis (M45)
  const [expandedProfileDetails, setExpandedProfileDetails] = useState<Record<string, boolean>>({});

  const toggleProfileDetails = (profileId: string) => {
    setExpandedProfileDetails((prev) => ({
      ...prev,
      [profileId]: !prev[profileId]
    }));
  };

  if (!currentUser) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        <div className="w-16 h-16 rounded-2xl bg-stone-100 text-stone-500 flex items-center justify-center mx-auto mb-4">
          <User className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-bold text-stone-800 font-serif">Acesso Restrito</h2>
        <p className="text-stone-500 text-sm mt-2">
          Faça login com sua conta para acessar os perfis e funcionalidades do NutriRede.
        </p>
      </div>
    );
  }

  const handleRequestReactivation = async (profileId: string) => {
    setReactivatingId(profileId);
    setFeedbackMsg(null);
    try {
      await reactivateProfileByUser(profileId, currentUser.email || currentUser.uid);
      await reloadUserData();
      setFeedbackMsg({
        text: 'Solicitação de reativação enviada com sucesso! O perfil aguarda reavaliação administrativa.',
        type: 'success'
      });
    } catch (err: unknown) {
      console.error('Erro ao solicitar reativação:', err);
      setFeedbackMsg({
        text: 'Falha ao solicitar reativação do perfil.',
        type: 'error'
      });
    } finally {
      setReactivatingId(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'APROVADO':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            Aprovado
          </span>
        );
      case 'REJEITADO':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-100 text-rose-800 border border-rose-300">
            <XCircle className="w-3.5 h-3.5 text-rose-600" />
            Rejeitado
          </span>
        );
      case 'DESATIVADO':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-stone-200 text-stone-700 border border-stone-300">
            <PowerOff className="w-3.5 h-3.5 text-stone-600" />
            Desativado
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-300">
            <Clock className="w-3.5 h-3.5 text-amber-600" />
            Pendente
          </span>
        );
    }
  };

  const getProfileIcon = (type: ProfileType) => {
    switch (type) {
      case 'DONOR':
        return <Store className="w-5 h-5 text-emerald-700" />;
      case 'RECEIVER':
        return <Building2 className="w-5 h-5 text-teal-700" />;
      case 'TRANSPORTER':
        return <Truck className="w-5 h-5 text-amber-700" />;
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Top Banner: Informações do Usuário Autenticado (Sem UID bruto) */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-stone-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-700 to-teal-500 text-white flex items-center justify-center font-bold text-2xl shadow-sm">
            {userAccount?.name?.charAt(0).toUpperCase() || currentUser.email?.charAt(0).toUpperCase() || 'U'}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-bold text-stone-900 font-serif">
                {userAccount?.name || 'Usuário NutriRede'}
              </h1>
              <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold bg-stone-100 text-stone-700 border border-stone-200">
                Conta Única
              </span>
              {isAdmin && (
                <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-amber-100 text-amber-900 border border-amber-300 flex items-center gap-1">
                  Administrador
                </span>
              )}
            </div>

            <div className="flex items-center gap-4 text-xs text-stone-500 mt-2 flex-wrap">
              <span className="flex items-center gap-1">
                <Mail className="w-3.5 h-3.5" />
                {currentUser.email}
              </span>
              {userAccount?.phone && (
                <span className="flex items-center gap-1">
                  <Phone className="w-3.5 h-3.5" />
                  {userAccount.phone}
                </span>
              )}
              {userAccount?.address && (
                <span className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5" />
                  {userAccount.address}
                </span>
              )}
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                Cadastrado em {formatDateBR(userAccount?.createdAt)}
              </span>
            </div>
          </div>
        </div>

        {/* Status de Perfis & Ações Rápidas */}
        <div className="flex flex-wrap items-center gap-2 pt-2 md:pt-0 border-t md:border-t-0 border-stone-100">
          <button
            onClick={() => setIsEditModalOpen(true)}
            className="px-3.5 py-2 rounded-xl text-xs font-semibold text-stone-700 bg-stone-100 hover:bg-stone-200 border border-stone-300 flex items-center gap-1.5 transition-colors"
          >
            <Edit3 className="w-4 h-4 text-stone-600" />
            Editar Meus Dados
          </button>

          <button
            onClick={() => setIsChangeEmailOpen(true)}
            className="px-3.5 py-2 rounded-xl text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 flex items-center gap-1.5 transition-colors"
            title="Alteração segura com reautenticação e validação no Firebase Authentication"
          >
            <KeyRound className="w-4 h-4 text-blue-600" />
            Alterar E-mail de Acesso
          </button>

          {userProfiles.length < 3 && (
            <button
              onClick={onOpenRequestProfile}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 flex items-center gap-1.5 transition-colors"
            >
              <PlusCircle className="w-4 h-4" />
              Solicitar Perfil Adicional
            </button>
          )}

          {isAdmin && (
            <button
              onClick={onOpenAdmin}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold text-amber-900 bg-amber-100 hover:bg-amber-200 border border-amber-300 flex items-center gap-1.5 transition-colors"
            >
              <ShieldAlert className="w-4 h-4 text-amber-700" />
              Painel de Aprovações
            </button>
          )}
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

      {/* Seção Central: RF02 - Consulta e Seleção de Perfis */}
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-2">
          <div>
            <h2 className="text-xl font-bold text-stone-900 font-serif">
              Perfis Associados à sua Conta
            </h2>
            <p className="text-xs text-stone-500">
              Uma mesma conta pode atuar em múltiplos papéis. Clique em um perfil para torná-lo ativo sem precisar fazer novo login.
            </p>
          </div>
          <span className="text-xs text-stone-500 font-medium self-start sm:self-center">
            {userProfiles.length} de 3 perfis cadastrados
          </span>
        </div>

        {/* Grade de Perfis */}
        {userProfiles.length === 0 ? (
          <div className="bg-amber-50/70 border-2 border-dashed border-amber-300 rounded-3xl p-8 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center mx-auto">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-amber-950 font-serif">
              Nenhum perfil de atuação selecionado ainda
            </h3>
            <p className="text-xs sm:text-sm text-amber-800 max-w-lg mx-auto leading-relaxed">
              Sua conta Google está autenticada, mas você ainda não definiu seus papéis no NutriRede.
              Selecione pelo menos um perfil (Doador, Entidade Receptora ou Transportador) para encaminhar seu cadastro para homologação.
            </p>
            {onOpenInitialProfileSetup && (
              <div className="pt-2">
                <button
                  onClick={onOpenInitialProfileSetup}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-md transition-colors inline-flex items-center gap-2"
                >
                  <PlusCircle className="w-4 h-4" />
                  Definir Meus Perfis de Atuação Agora
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
            {userProfiles.map((profile) => {
              const meta = PROFILE_DEFINITIONS[profile.profileType];
              const statusConfig = STATUS_CONFIG[profile.status];
              const isActive = activeProfile?.id === profile.id;
              const isApproved = profile.status === 'APROVADO';
              const isDeactivated = profile.status === 'DESATIVADO';
              const isDetailsOpen = !!expandedProfileDetails[profile.id];

              return (
                <div
                  key={profile.id}
                  onClick={() => {
                    if (!isDeactivated && !isActive) {
                      switchActiveProfileType(profile.profileType);
                    }
                  }}
                  className={`relative rounded-2xl border transition-all duration-200 overflow-hidden flex flex-col justify-between ${
                    isActive
                      ? 'border-emerald-600 bg-emerald-50/25 shadow-xs ring-2 ring-emerald-500/20'
                      : isDeactivated
                      ? 'border-stone-200 bg-stone-50/80 opacity-80'
                      : 'border-stone-200 bg-white hover:border-emerald-300 hover:shadow-2xs cursor-pointer'
                  }`}
                >
                  {/* Faixa superior do Perfil Ativo */}
                  {isActive && (
                    <div className="bg-emerald-700 text-white text-[10px] font-bold uppercase tracking-wider px-3 py-0.5 flex items-center justify-between">
                      <span className="flex items-center gap-1">
                        <Check className="w-3 h-3" />
                        Perfil Ativo
                      </span>
                      <span className="text-[9px] font-normal opacity-90">Em operação no painel</span>
                    </div>
                  )}

                  {/* Face Compacta do Cartão (sempre visível) */}
                  <div className="p-3.5 sm:p-4 space-y-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div
                          className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                            isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-stone-100 text-stone-700'
                          }`}
                        >
                          {getProfileIcon(profile.profileType)}
                        </div>
                        <div className="min-w-0">
                          <h3 className="text-sm font-bold text-stone-900 truncate font-serif">
                            {meta?.title || profile.profileType}
                          </h3>
                          <span className="text-[11px] text-stone-500 truncate block">
                            {meta?.subtitle || 'Perfil do NutriRede'}
                          </span>
                        </div>
                      </div>

                      <div className="shrink-0">
                        {getStatusBadge(profile.status)}
                      </div>
                    </div>

                    {/* Ações Compactas e Separadas: Selecionar vs Ver Detalhes */}
                    <div className="pt-2 border-t border-stone-100 flex items-center justify-between gap-2">
                      {/* Ação 1: Selecionar Perfil */}
                      {isActive ? (
                        <span className="text-[11px] font-bold text-emerald-800 bg-emerald-100/90 px-2.5 py-1 rounded-lg border border-emerald-300 flex items-center gap-1">
                          <Check className="w-3.5 h-3.5" />
                          Selecionado
                        </span>
                      ) : isDeactivated ? (
                        <span className="text-[11px] font-medium text-stone-500 bg-stone-100 px-2.5 py-1 rounded-lg flex items-center gap-1">
                          <PowerOff className="w-3 h-3 text-stone-400" />
                          Desativado
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            switchActiveProfileType(profile.profileType);
                          }}
                          className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 bg-white hover:bg-emerald-50 border border-emerald-300 px-2.5 py-1 rounded-lg transition-colors flex items-center gap-1 shadow-2xs"
                        >
                          <span>Selecionar</span>
                          <ArrowRight className="w-3 h-3" />
                        </button>
                      )}

                      {/* Ação 2: Ver / Ocultar Detalhes */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleProfileDetails(profile.id);
                        }}
                        className="text-[11px] font-semibold text-stone-600 hover:text-stone-900 flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-stone-100 transition-colors"
                        aria-expanded={isDetailsOpen}
                      >
                        <span>{isDetailsOpen ? 'Ocultar detalhes' : 'Ver detalhes'}</span>
                        <ChevronDown
                          className={`w-3.5 h-3.5 transition-transform duration-200 ${
                            isDetailsOpen ? 'rotate-180' : ''
                          }`}
                        />
                      </button>
                    </div>
                  </div>

                  {/* Detalhes Expansíveis Sob Demanda */}
                  {isDetailsOpen && (
                    <div className="border-t border-stone-100 p-3.5 sm:p-4 bg-stone-50/70 text-xs space-y-2.5 animate-in fade-in duration-150">
                      <p className="text-stone-600 text-[11px] leading-relaxed">
                        {meta?.description}
                      </p>

                      {/* Box de Informações da Situação e Decisão Administrativa */}
                      <div className={`p-2.5 rounded-xl ${statusConfig.bgLight} border ${statusConfig.borderColor} text-xs space-y-1`}>
                        <div className="flex items-center gap-1.5 font-bold">
                          {profile.status === 'APROVADO' && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />}
                          {profile.status === 'PENDENTE' && <Clock className="w-3.5 h-3.5 text-amber-600 shrink-0" />}
                          {profile.status === 'REJEITADO' && <XCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />}
                          {profile.status === 'DESATIVADO' && <PowerOff className="w-3.5 h-3.5 text-stone-600 shrink-0" />}
                          <span className={statusConfig.textColor}>
                            {statusConfig.label}
                          </span>
                        </div>
                        <p className={`text-[11px] ${statusConfig.textColor} leading-tight`}>
                          {statusConfig.description}
                        </p>

                        {profile.decidedAt && (
                          <p className="text-[10px] text-stone-500 pt-1 border-t border-stone-200/50">
                            Decisão registrada em: {formatDateTimeBR(profile.decidedAt)}
                          </p>
                        )}

                        {profile.decisionNotes && (
                          <p className="text-[10px] text-stone-700 italic bg-white/80 p-1.5 rounded border border-stone-200/50">
                            "Parecer: {profile.decisionNotes}"
                          </p>
                        )}

                        {isDeactivated && profile.deactivatedAt && (
                          <p className="text-[10px] text-stone-500 pt-1 border-t border-stone-200/50">
                            Desativado em: {formatDateTimeBR(profile.deactivatedAt)}
                            {profile.deactivationReason && ` • Motivo: "${profile.deactivationReason}"`}
                          </p>
                        )}
                      </div>

                      {/* Ações de Gestão de Ciclo de Vida: Desativação / Reativação */}
                      <div className="pt-1">
                        {isApproved && !isDeactivated && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeactivateTarget(profile);
                            }}
                            className="w-full py-1.5 px-3 rounded-xl text-xs font-medium text-stone-600 hover:text-rose-700 hover:bg-rose-50 flex items-center justify-center gap-1.5 border border-stone-200 transition-colors"
                          >
                            <PowerOff className="w-3.5 h-3.5 text-stone-400" />
                            Desativar este perfil voluntariamente
                          </button>
                        )}

                        {isDeactivated && (
                          <button
                            type="button"
                            disabled={reactivatingId === profile.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRequestReactivation(profile.id);
                            }}
                            className="w-full py-2 px-3 rounded-xl text-xs font-semibold bg-amber-600 hover:bg-amber-700 text-white flex items-center justify-center gap-1.5 transition-colors shadow-2xs disabled:opacity-50"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>{reactivatingId === profile.id ? 'Enviando...' : 'Solicitar Reativação'}</span>
                          </button>
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

      {/* Detalhe do Ambiente do Perfil Ativo */}
      {activeProfile && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-stone-200 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-stone-100 gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-200">
                {getProfileIcon(activeProfile.profileType)}
              </div>
              <div>
                <span className="text-xs uppercase tracking-wider font-bold text-stone-400">
                  Ambiente de Atuação Ativo
                </span>
                <h3 className="text-xl font-bold text-stone-900">
                  {PROFILE_DEFINITIONS[activeProfile.profileType]?.title} — Visão Operacional
                </h3>
              </div>
            </div>

            <div>{getStatusBadge(activeProfile.status)}</div>
          </div>

          {/* Comportamento Condicionado ao Status */}
          <div className="pt-6">
            {activeProfile.status === 'APROVADO' ? (
              <div className="animate-in fade-in duration-200">
                {activeProfile.profileType === 'DONOR' && (
                  <DonorBatchesView />
                )}

                {activeProfile.profileType === 'RECEIVER' && (
                  <div className="space-y-6">
                    {/* Navegação entre Exploração e Minhas Reservas */}
                    <div className="flex items-center gap-3 border-b border-stone-200 pb-2">
                      <button
                        onClick={() => setReceiverTab('explore')}
                        className={`pb-2 px-3 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 ${
                          receiverTab === 'explore'
                            ? 'border-emerald-600 text-emerald-800'
                            : 'border-transparent text-stone-500 hover:text-stone-800'
                        }`}
                      >
                        <Package className="w-4 h-4" />
                        Explorar Ofertas Disponíveis
                      </button>

                      <button
                        onClick={() => setReceiverTab('my_reservations')}
                        className={`pb-2 px-3 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 ${
                          receiverTab === 'my_reservations'
                            ? 'border-emerald-600 text-emerald-800'
                            : 'border-transparent text-stone-500 hover:text-stone-800'
                        }`}
                      >
                        <HeartHandshake className="w-4 h-4" />
                        Minhas Reservas Solicitadas
                      </button>
                    </div>

                    {receiverTab === 'explore' ? (
                      <ReceiverExploreView onGoToReservations={() => setReceiverTab('my_reservations')} />
                    ) : (
                      <ReceiverReservationsView onBackToExplore={() => setReceiverTab('explore')} />
                    )}
                  </div>
                )}

                {activeProfile.profileType === 'TRANSPORTER' && (
                  <TransporterOperationsView />
                )}
              </div>
            ) : activeProfile.status === 'DESATIVADO' ? (
              <div className="p-6 rounded-2xl bg-stone-100 border border-stone-300 text-center max-w-xl mx-auto space-y-4">
                <div className="w-12 h-12 rounded-full bg-stone-200 text-stone-600 flex items-center justify-center mx-auto">
                  <PowerOff className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-lg font-bold text-stone-900">
                    Perfil Desativado Voluntariamente
                  </h4>
                  <p className="text-xs sm:text-sm text-stone-600 mt-1 leading-relaxed">
                    Você optou por desativar o perfil de <strong>{PROFILE_DEFINITIONS[activeProfile.profileType]?.title}</strong>. Suas operações estão temporariamente suspensas, mas todos os registros históricos de doações e reservas foram integralmente preservados.
                  </p>
                  {activeProfile.deactivationReason && (
                    <div className="mt-2 p-2.5 bg-white rounded-xl border border-stone-200 text-xs text-stone-700">
                      <strong>Motivo:</strong> {activeProfile.deactivationReason}
                    </div>
                  )}
                </div>

                <div className="pt-2">
                  <button
                    onClick={() => handleRequestReactivation(activeProfile.id)}
                    disabled={reactivatingId === activeProfile.id}
                    className="px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs inline-flex items-center gap-1.5 disabled:opacity-50"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{reactivatingId === activeProfile.id ? 'Enviando...' : 'Solicitar Reativação'}</span>
                  </button>
                </div>
              </div>
            ) : activeProfile.status === 'PENDENTE' ? (
              <div className="p-6 rounded-2xl bg-amber-50/70 border border-amber-300 text-center max-w-xl mx-auto space-y-4">
                <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center mx-auto">
                  <Lock className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-lg font-bold text-amber-950">
                    Acesso Operacional Bloqueado
                  </h4>
                  <p className="text-xs sm:text-sm text-amber-800 mt-1 leading-relaxed">
                    Seu perfil de <strong>{PROFILE_DEFINITIONS[activeProfile.profileType]?.title}</strong> está sob{' '}
                    <span className="font-bold underline">ANÁLISE PENDENTE</span>.
                    Para garantir a segurança dos alimentos e das entidades, as ações operacionais permanecem bloqueadas até a aprovação administrativa.
                  </p>
                </div>

                <div className="p-3 bg-white/80 rounded-xl text-left border border-amber-200 text-xs text-amber-900 space-y-1">
                  <div className="font-semibold flex items-center gap-1">
                    <Info className="w-3.5 h-3.5 text-amber-700" />
                    Exemplo Obrigatório do PRD:
                  </div>
                  <p className="text-[11px] text-amber-800">
                    Se você possui outro perfil aprovado (ex: Doador), basta clicar sobre ele na grade acima para operar suas funções liberadas, enquanto este perfil aguarda análise.
                  </p>
                </div>
              </div>
            ) : (
              <div className="p-6 rounded-2xl bg-rose-50/70 border border-rose-300 text-center max-w-xl mx-auto space-y-4">
                <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-700 flex items-center justify-center mx-auto">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-lg font-bold text-rose-950">
                    Perfil Não Aprovado
                  </h4>
                  <p className="text-xs sm:text-sm text-rose-800 mt-1 leading-relaxed">
                    O pedido para o perfil de <strong>{PROFILE_DEFINITIONS[activeProfile.profileType]?.title}</strong> foi rejeitado pela administração.
                  </p>
                  {activeProfile.decisionNotes && (
                    <div className="mt-3 p-3 bg-white rounded-xl border border-rose-200 text-xs text-rose-900">
                      <strong>Motivo:</strong> {activeProfile.decisionNotes}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modais de Edição, Alteração de E-mail e Desativação Segura */}
      <EditProfileModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
      />

      <ChangeEmailModal
        isOpen={isChangeEmailOpen}
        onClose={() => setIsChangeEmailOpen(false)}
      />

      <DeactivateProfileModal
        profile={deactivateTarget}
        isOpen={!!deactivateTarget}
        onClose={() => setDeactivateTarget(null)}
        onSuccess={() => {
          reloadUserData();
          setFeedbackMsg({
            text: 'Perfil desativado com sucesso. O histórico de atividades foi preservado.',
            type: 'success'
          });
        }}
      />
    </div>
  );
};
