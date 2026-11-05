import React, { useState, useEffect } from 'react';
import {
  X,
  User,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Edit3,
  KeyRound,
  PlusCircle,
  LogOut,
  Store,
  Building2,
  Truck,
  CheckCircle2,
  Clock,
  XCircle,
  PowerOff,
  Check,
  Shield,
  ArrowRight
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import {
  PROFILE_DEFINITIONS,
  ProfileType,
  STATUS_CONFIG,
  UserProfileDoc
} from '../types';
import { formatDateBR, formatDateTimeBR } from '../utils/dateUtils';
import { reactivateProfileByUser } from '../services/profileService';

interface AccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenEditProfile: () => void;
  onOpenChangeEmail: () => void;
  onOpenRequestProfile: () => void;
  onOpenDeactivateProfile: (profile: UserProfileDoc) => void;
  onSelectProfile: (profileType: ProfileType) => void;
}

export const AccountModal: React.FC<AccountModalProps> = ({
  isOpen,
  onClose,
  onOpenEditProfile,
  onOpenChangeEmail,
  onOpenRequestProfile,
  onOpenDeactivateProfile,
  onSelectProfile,
}) => {
  const {
    currentUser,
    userAccount,
    userProfiles,
    activeProfile,
    isAdmin,
    reloadUserData,
    logout
  } = useAuth();

  const [reactivatingId, setReactivatingId] = useState<string | null>(null);
  const [feedbackMsg, setFeedbackMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Fecha o modal ao pressionar Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Bloqueia rolagem do fundo
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen || !currentUser) return null;

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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'APROVADO':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            Aprovado
          </span>
        );
      case 'REJEITADO':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-rose-100 text-rose-800 border border-rose-300">
            <XCircle className="w-3 h-3 text-rose-600" />
            Rejeitado
          </span>
        );
      case 'DESATIVADO':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-stone-200 text-stone-700 border border-stone-300">
            <PowerOff className="w-3 h-3 text-stone-600" />
            Desativado
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-100 text-amber-800 border border-amber-300">
            <Clock className="w-3 h-3 text-amber-600" />
            Pendente
          </span>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-900/60 backdrop-blur-xs flex justify-center items-start sm:items-center p-3 sm:p-4 overscroll-contain animate-in fade-in duration-150">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="account-modal-title"
        className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl border border-stone-200 my-auto max-h-[calc(100dvh-1.5rem)] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150"
      >
        {/* Cabeçalho do Modal */}
        <div className="p-5 sm:p-6 border-b border-stone-100 flex items-center justify-between shrink-0 bg-stone-50/70">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-700 via-emerald-600 to-teal-500 text-white flex items-center justify-center font-bold text-xl shadow-xs shrink-0">
              {userAccount?.name?.charAt(0).toUpperCase() || currentUser.email?.charAt(0).toUpperCase() || 'U'}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 id="account-modal-title" className="text-lg sm:text-xl font-bold text-stone-900 font-serif">
                  Minha Conta
                </h2>
                <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                  Conta Única
                </span>
                {isAdmin && (
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300 flex items-center gap-1">
                    <Shield className="w-3 h-3 text-amber-700" />
                    Admin
                  </span>
                )}
              </div>
              <p className="text-xs text-stone-500 mt-0.5">
                Gerenciamento de dados cadastrais, e-mail e perfis de atuação
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar Minha Conta"
            className="p-2 rounded-xl text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Corpo com Rolagem */}
        <div className="p-5 sm:p-6 space-y-6 overflow-y-auto flex-1">
          {/* Alerta de Feedback */}
          {feedbackMsg && (
            <div
              className={`p-3.5 rounded-xl text-xs flex items-center justify-between gap-3 ${
                feedbackMsg.type === 'success'
                  ? 'bg-emerald-50 text-emerald-900 border border-emerald-300'
                  : 'bg-rose-50 text-rose-900 border border-rose-300'
              }`}
            >
              <div className="flex items-center gap-2">
                {feedbackMsg.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                ) : (
                  <XCircle className="w-4 h-4 text-rose-600 shrink-0" />
                )}
                <span className="font-semibold">{feedbackMsg.text}</span>
              </div>
              <button
                type="button"
                onClick={() => setFeedbackMsg(null)}
                className="text-stone-400 font-bold hover:text-stone-700"
              >
                ×
              </button>
            </div>
          )}

          {/* 1. DADOS CADASTRAIS (Sob demanda) */}
          <div className="p-4 bg-stone-50/80 rounded-2xl border border-stone-200/80 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-stone-200/60">
              <span className="text-xs font-bold text-stone-800 uppercase tracking-wider flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-emerald-700" />
                Dados Cadastrais da Conta
              </span>
              <span className="text-[11px] text-stone-500 flex items-center gap-1">
                <Calendar className="w-3 h-3 text-stone-400" />
                Cadastrado em {formatDateBR(userAccount?.createdAt)}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-[10px] uppercase font-bold text-stone-400 block">Nome Completo</span>
                <span className="font-semibold text-stone-900 text-sm">
                  {userAccount?.name || 'Não informado'}
                </span>
              </div>

              <div>
                <span className="text-[10px] uppercase font-bold text-stone-400 block">E-mail Principal</span>
                <span className="font-medium text-stone-800 break-all flex items-center gap-1">
                  <Mail className="w-3 h-3 text-stone-400 shrink-0" />
                  {currentUser.email}
                </span>
              </div>

              <div>
                <span className="text-[10px] uppercase font-bold text-stone-400 block">Telefone</span>
                <span className="font-medium text-stone-800 flex items-center gap-1">
                  <Phone className="w-3 h-3 text-stone-400 shrink-0" />
                  {userAccount?.phone || 'Não informado'}
                </span>
              </div>

              <div>
                <span className="text-[10px] uppercase font-bold text-stone-400 block">Endereço Principal</span>
                <span className="font-medium text-stone-800 truncate flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-stone-400 shrink-0" />
                  {userAccount?.address || 'Não informado'}
                </span>
              </div>
            </div>

            {/* Ações de Gestão de Conta */}
            <div className="pt-2 border-t border-stone-200/60 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenEditProfile();
                }}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold text-stone-700 bg-white hover:bg-stone-100 border border-stone-300 shadow-2xs inline-flex items-center gap-1.5 transition-colors"
              >
                <Edit3 className="w-3.5 h-3.5 text-stone-600" />
                Editar Meus Dados
              </button>

              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenChangeEmail();
                }}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold text-blue-700 bg-white hover:bg-blue-50 border border-blue-200 shadow-2xs inline-flex items-center gap-1.5 transition-colors"
              >
                <KeyRound className="w-3.5 h-3.5 text-blue-600" />
                Alterar E-mail de Acesso
              </button>

              {userProfiles.length < 3 && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenRequestProfile();
                  }}
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 shadow-2xs inline-flex items-center gap-1.5 transition-colors"
                >
                  <PlusCircle className="w-3.5 h-3.5 text-emerald-700" />
                  Solicitar Perfil Adicional
                </button>
              )}
            </div>
          </div>

          {/* 2. PERFIS CADASTRADOS & HOMOLOGAÇÃO */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-stone-800 uppercase tracking-wider">
                Perfis de Atuação Cadastrados ({userProfiles.length} de 3)
              </span>
              <span className="text-[11px] text-stone-500">
                Aprovação independente por perfil
              </span>
            </div>

            <div className="space-y-2.5">
              {userProfiles.map((profile) => {
                const meta = PROFILE_DEFINITIONS[profile.profileType];
                const statusConfig = STATUS_CONFIG[profile.status];
                const isActive = activeProfile?.id === profile.id;
                const isApproved = profile.status === 'APROVADO';
                const isDeactivated = profile.status === 'DESATIVADO';

                return (
                  <div
                    key={profile.id}
                    className={`p-3.5 rounded-2xl border transition-all ${
                      isActive
                        ? 'border-emerald-500 bg-emerald-50/30 shadow-2xs ring-1 ring-emerald-500/20'
                        : 'border-stone-200 bg-white hover:border-emerald-200'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div
                          className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                            isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-stone-100 text-stone-600'
                          }`}
                        >
                          {getProfileIcon(profile.profileType)}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-stone-900 font-serif truncate">
                              {meta?.title || profile.profileType}
                            </span>
                            {isActive && (
                              <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-md border border-emerald-300 flex items-center gap-1 shrink-0">
                                <Check className="w-3 h-3" />
                                Ativo
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-stone-500 truncate">{meta?.subtitle}</p>
                        </div>
                      </div>

                      <div className="shrink-0">{getStatusBadge(profile.status)}</div>
                    </div>

                    {/* Informações de Homologação / Decisão Administrativa */}
                    <div className="mt-2.5 pt-2 border-t border-stone-100 text-xs text-stone-600 space-y-1">
                      {profile.decidedAt && (
                        <p className="text-[10px] text-stone-500">
                          Homologado em {formatDateTimeBR(profile.decidedAt)} por {profile.decidedBy || 'Administrador'}
                        </p>
                      )}
                      {profile.decisionNotes && (
                        <p className="text-[10px] text-stone-700 italic bg-stone-50 p-1.5 rounded-lg border border-stone-200/60">
                          "Parecer: {profile.decisionNotes}"
                        </p>
                      )}
                      {isDeactivated && profile.deactivatedAt && (
                        <p className="text-[10px] text-stone-500">
                          Desativado em {formatDateTimeBR(profile.deactivatedAt)}
                          {profile.deactivationReason && ` • Motivo: "${profile.deactivationReason}"`}
                        </p>
                      )}
                    </div>

                    {/* Ações do Perfil */}
                    <div className="mt-3 pt-2 border-t border-stone-100 flex items-center justify-between gap-2">
                      <div>
                        {!isActive && !isDeactivated ? (
                          <button
                            type="button"
                            onClick={() => {
                              onSelectProfile(profile.profileType);
                              onClose();
                            }}
                            className="px-3 py-1 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 rounded-lg transition-colors inline-flex items-center gap-1 shadow-2xs"
                          >
                            <span>Ativar este perfil</span>
                            <ArrowRight className="w-3 h-3" />
                          </button>
                        ) : isActive ? (
                          <span className="text-[11px] font-medium text-emerald-700 flex items-center gap-1">
                            ✓ Em operação no Meu Painel
                          </span>
                        ) : null}
                      </div>

                      <div className="flex items-center gap-2">
                        {isApproved && !isDeactivated && (
                          <button
                            type="button"
                            onClick={() => {
                              onClose();
                              onOpenDeactivateProfile(profile);
                            }}
                            className="px-2.5 py-1 text-[11px] font-medium text-stone-500 hover:text-rose-700 hover:bg-rose-50 border border-stone-200 rounded-lg transition-colors flex items-center gap-1"
                          >
                            <PowerOff className="w-3 h-3" />
                            <span>Desativar</span>
                          </button>
                        )}

                        {isDeactivated && (
                          <button
                            type="button"
                            disabled={reactivatingId === profile.id}
                            onClick={() => handleRequestReactivation(profile.id)}
                            className="px-3 py-1 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded-lg transition-colors shadow-2xs disabled:opacity-50 inline-flex items-center gap-1"
                          >
                            <CheckCircle2 className="w-3 h-3" />
                            <span>{reactivatingId === profile.id ? 'Enviando...' : 'Solicitar Reativação'}</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Rodapé do Modal com Botão Sair */}
        <div className="p-4 sm:p-5 border-t border-stone-100 bg-stone-50/80 flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={() => {
              onClose();
              logout();
            }}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-rose-700 bg-white hover:bg-rose-50 border border-rose-200 shadow-2xs inline-flex items-center gap-2 transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4 text-rose-600" />
            <span>Encerrar Sessão</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl text-xs font-semibold text-stone-700 bg-white hover:bg-stone-100 border border-stone-300 shadow-2xs transition-colors cursor-pointer"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
