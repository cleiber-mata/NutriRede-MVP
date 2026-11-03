import React, { useState } from 'react';
import {
  AlertTriangle,
  X,
  ShieldAlert,
  PowerOff,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { PROFILE_DEFINITIONS, UserProfileDoc } from '../types';
import { deactivateProfileByUser } from '../services/profileService';

interface DeactivateProfileModalProps {
  profile: UserProfileDoc | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const DeactivateProfileModal: React.FC<DeactivateProfileModalProps> = ({
  profile,
  isOpen,
  onClose,
  onSuccess
}) => {
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen || !profile) return null;

  const meta = PROFILE_DEFINITIONS[profile.profileType];

  const handleConfirm = async () => {
    setLoading(true);
    setErrorMsg(null);

    try {
      await deactivateProfileByUser(
        profile,
        reason.trim(),
        profile.userEmail || profile.userId
      );
      onSuccess();
      onClose();
    } catch (err: unknown) {
      console.error('Erro ao desativar perfil:', err);
      setErrorMsg(err instanceof Error ? err.message : 'Falha ao desativar perfil.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-900/60 backdrop-blur-xs flex justify-center items-start sm:items-center p-2.5 sm:p-4 overscroll-contain">
      <div className="bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-7 max-w-md w-full shadow-2xl border border-stone-200 animate-in fade-in zoom-in-95 duration-150 my-auto max-h-[calc(100dvh-1.25rem)] sm:max-h-[min(90vh,750px)] flex flex-col">
        <div className="flex items-center justify-between pb-3 border-b border-stone-100 mb-4 shrink-0">
          <div className="flex items-center gap-2 text-stone-900">
            <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center border border-amber-200 shrink-0">
              <PowerOff className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold font-serif leading-tight">Desativar Perfil de Atuação</h3>
              <p className="text-xs text-stone-500">Deixar de atuar temporariamente</p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Fechar"
            className="p-1 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100 shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="overflow-y-auto overscroll-contain flex-1 pr-0.5">

        {errorMsg && (
          <div className="mb-4 p-3.5 rounded-xl bg-rose-50 text-rose-800 border border-rose-200 text-xs flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <span className="leading-relaxed">{errorMsg}</span>
          </div>
        )}

        <div className="space-y-3 text-xs text-stone-600">
          <p className="leading-relaxed">
            Você está solicitando a desativação do perfil de{' '}
            <strong className="text-stone-900">{meta?.title || profile.profileType}</strong>.
          </p>

          <div className="p-3.5 bg-stone-50 rounded-2xl border border-stone-200 space-y-2">
            <div className="font-semibold text-stone-800 flex items-center gap-1.5">
              <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
              Garantias e Regras de Segurança:
            </div>
            <ul className="space-y-1 text-[11px] text-stone-600 list-disc pl-4">
              <li>Seus outros perfis cadastrados continuam ativos e inalterados.</li>
              <li>Todo o histórico de doações, reservas e aprovações é <strong>integralmente preservado</strong> para auditoria.</li>
              <li>Não é permitida a desativação caso existam lotes ou reservas ativas em andamento.</li>
              <li>Você poderá solicitar a reativação deste perfil a qualquer momento pelo painel.</li>
            </ul>
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Motivo da Desativação (Opcional):
            </label>
            <textarea
              rows={2}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Ex: Pausa temporária nas operações ou mudança de foco institucional."
              className="w-full p-2.5 text-xs rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>
        </div>

        <div className="pt-4 mt-4 border-t border-stone-100 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-stone-600 hover:bg-stone-100"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={loading}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-stone-800 hover:bg-stone-900 text-white shadow-xs flex items-center gap-1.5 disabled:opacity-50"
          >
            <PowerOff className="w-3.5 h-3.5" />
            <span>{loading ? 'Processando...' : 'Confirmar Desativação'}</span>
          </button>
        </div>
        </div>
      </div>
    </div>
  );
};
