import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  User,
  Phone,
  MapPin,
  FileText,
  Save,
  AlertCircle,
  CheckCircle2,
  Lock,
  Building2,
  RefreshCw
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { updateUserAccount, updateUserProfileContact } from '../services/profileService';
import { formatDateBR, formatDateTimeBR } from '../utils/dateUtils';

interface EditProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const EditProfileModal: React.FC<EditProfileModalProps> = ({ isOpen, onClose }) => {
  const { currentUser, userAccount, activeProfile, isLoading, reloadUserData } = useAuth();

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [isDirty, setIsDirty] = useState(false);

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const prevIsOpenRef = useRef(false);
  const prevUserIdRef = useRef<string | null>(null);

  // M54: Sincronização dos campos com os dados existentes em /users/{uid}
  useEffect(() => {
    if (!currentUser) {
      setName('');
      setPhone('');
      setAddress('');
      setNotes('');
      setIsDirty(false);
      prevUserIdRef.current = null;
      prevIsOpenRef.current = false;
      return;
    }

    const isUserChanged = prevUserIdRef.current !== currentUser.uid;
    const isJustOpened = isOpen && !prevIsOpenRef.current;

    prevUserIdRef.current = currentUser.uid;
    prevIsOpenRef.current = isOpen;

    if (!isOpen) {
      // Quando o modal é fechado, limpa mensagens de erro/sucesso e status de edição
      setErrorMsg(null);
      setSuccessMsg(null);
      setIsDirty(false);
      return;
    }

    // Modal aberto:
    // 1. Se acabou de abrir ou mudou de usuário: reinicializa sempre com os dados atuais do Firestore
    // 2. Se os dados de userAccount acabaram de carregar e o usuário ainda não digitou (!isDirty): preenche
    if (isJustOpened || isUserChanged || !isDirty) {
      const currentName = userAccount?.name || currentUser.displayName || '';
      const currentPhone = userAccount?.phone ?? activeProfile?.userPhone ?? '';
      const currentAddress = userAccount?.address ?? activeProfile?.address ?? '';
      const currentNotes = userAccount?.notes ?? activeProfile?.operationalNotes ?? '';

      setName(currentName);
      setPhone(currentPhone);
      setAddress(currentAddress);
      setNotes(currentNotes);
      setIsDirty(false);
      setErrorMsg(null);
      setSuccessMsg(null);
    }
  }, [isOpen, currentUser, userAccount, activeProfile, isDirty]);

  // Fecha o modal ao pressionar Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        setIsDirty(false);
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Bloqueia rolagem do fundo enquanto o modal estiver aberto
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

  const isDataLoading = !userAccount && isLoading;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || name.trim().length < 2) {
      setErrorMsg('O nome deve conter pelo menos 2 caracteres.');
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    const userIdentifier = currentUser.email || currentUser.uid;

    try {
      // 1. Atualiza conta central (/users/{uid})
      await updateUserAccount(
        currentUser.uid,
        {
          name: name.trim(),
          phone: phone.trim(),
          address: address.trim(),
          notes: notes.trim()
        },
        userIdentifier
      );

      // 2. Se houver perfil ativo, atualiza também os dados de contato do perfil (/profiles/{profileId})
      if (activeProfile) {
        await updateUserProfileContact(
          activeProfile.id,
          {
            userName: name.trim(),
            userPhone: phone.trim(),
            address: address.trim(),
            operationalNotes: notes.trim()
          },
          userIdentifier
        );
      }

      await reloadUserData();
      setIsDirty(false);
      setSuccessMsg('Dados cadastrais atualizados com sucesso!');
      setTimeout(() => {
        setSuccessMsg(null);
        onClose();
      }, 1200);
    } catch (err: unknown) {
      console.error('Erro ao atualizar dados cadastrais:', err);
      setErrorMsg(err instanceof Error ? err.message : 'Falha ao salvar as alterações.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-900/60 backdrop-blur-xs flex justify-center items-start sm:items-center p-2.5 sm:p-4 overscroll-contain">
      <div className="bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-7 max-w-lg w-full shadow-2xl border border-stone-200 animate-in fade-in zoom-in-95 duration-150 my-auto max-h-[calc(100dvh-1.25rem)] sm:max-h-[min(90vh,850px)] flex flex-col">
        <div className="flex items-center justify-between pb-3 sm:pb-4 border-b border-stone-100 mb-4 sm:mb-6 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-200 shrink-0">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-stone-900 font-serif leading-tight">Editar Meus Dados Cadastrais</h3>
              <p className="text-xs text-stone-500">Atualize informações de contato e atuação</p>
            </div>
          </div>
          <button
            onClick={() => {
              setIsDirty(false);
              onClose();
            }}
            aria-label="Fechar"
            className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="overflow-y-auto overscroll-contain flex-1 pr-0.5">

        {errorMsg && (
          <div className="mb-4 p-3.5 rounded-xl bg-rose-50 text-rose-800 border border-rose-200 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="mb-4 p-3.5 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {isDataLoading ? (
          <div className="py-12 flex flex-col items-center justify-center gap-2">
            <RefreshCw className="w-6 h-6 text-emerald-600 animate-spin" />
            <p className="text-xs text-stone-500 font-medium">Carregando dados cadastrais...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Identificadores Protegidos (Apenas Leitura) */}
            <div className="p-3 bg-stone-50 rounded-2xl border border-stone-200 space-y-1.5 text-xs text-stone-600">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-stone-500 font-medium">
                  <Lock className="w-3.5 h-3.5 text-stone-400" />
                  E-mail da Conta (Credencial de Acesso):
                </span>
                <span className="font-semibold text-stone-800">{currentUser.email}</span>
              </div>
              {userAccount?.updatedAt && (
                <p className="text-[10px] text-stone-400 pl-5">
                  Última alteração: {formatDateTimeBR(userAccount.updatedAt)}
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
                Nome Completo / Razão Social *
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    setIsDirty(true);
                  }}
                  placeholder="Seu nome ou nome da instituição"
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
                Telefone / WhatsApp de Contato
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => {
                    setPhone(e.target.value);
                    setIsDirty(true);
                  }}
                  placeholder="(00) 00000-0000"
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
                Endereço Operacional / Base de Atuação
              </label>
              <div className="relative">
                <MapPin className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={address}
                  onChange={(e) => {
                    setAddress(e.target.value);
                    setIsDirty(true);
                  }}
                  placeholder="Ex: Av. Paulista, 1000 - São Paulo, SP"
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
                Informações de Atuação / Observações
              </label>
              <div className="relative">
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => {
                    setNotes(e.target.value);
                    setIsDirty(true);
                  }}
                  placeholder="Ex: Entidade sem fins lucrativos focada em famílias em situação de vulnerabilidade."
                  className="w-full p-2.5 text-xs rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            <div className="pt-3 border-t border-stone-100 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setIsDirty(false);
                  onClose();
                }}
                disabled={loading}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-stone-600 hover:bg-stone-100 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={loading || isDataLoading}
                className="px-5 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs flex items-center gap-1.5 transition-colors disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                <span>{loading ? 'Salvando...' : 'Salvar Alterações'}</span>
              </button>
            </div>
          </form>
        )}
        </div>
      </div>
    </div>
  );
};
