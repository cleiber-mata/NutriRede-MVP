import React, { useState } from 'react';
import {
  X,
  AlertTriangle,
  Send,
  FileText,
  Clock,
  Layers,
  CheckCircle2
} from 'lucide-react';
import { OccurrenceStage, ProfileType } from '../types';
import { createOccurrence } from '../services/transportService';

interface CreateOccurrenceModalProps {
  isOpen: boolean;
  onClose: () => void;
  operationId: string;
  batchId: string;
  foodName?: string;
  authorUserId: string;
  authorName: string;
  authorProfile: ProfileType | 'ADMIN';
  defaultStage?: OccurrenceStage;
  onSuccess?: () => void;
}

export const CreateOccurrenceModal: React.FC<CreateOccurrenceModalProps> = ({
  isOpen,
  onClose,
  operationId,
  batchId,
  foodName,
  authorUserId,
  authorName,
  authorProfile,
  defaultStage = 'TRANSPORTE',
  onSuccess
}) => {
  const [stage, setStage] = useState<OccurrenceStage>(defaultStage);
  const [type, setType] = useState('Alimento indisponível no local de retirada');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (description.trim().length < 5) {
      setErrorMsg('A descrição detalhada do problema deve conter pelo menos 5 caracteres.');
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      await createOccurrence({
        operationId,
        batchId,
        foodName,
        authorUserId,
        authorName,
        authorProfile,
        stage,
        type,
        description: description.trim()
      });

      setSuccessMsg('Ocorrência registrada com sucesso no histórico da doação.');
      setTimeout(() => {
        setSuccessMsg(null);
        setDescription('');
        onSuccess?.();
        onClose();
      }, 1200);
    } catch (err: any) {
      console.error('Erro ao registrar ocorrência:', err);
      setErrorMsg(err.message || 'Falha ao registrar ocorrência.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-900/60 backdrop-blur-xs flex justify-center items-start sm:items-center p-2.5 sm:p-4 overscroll-contain">
      <div className="bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-7 max-w-lg w-full shadow-2xl border border-stone-200 animate-in fade-in zoom-in-95 duration-150 my-auto max-h-[calc(100dvh-1.25rem)] sm:max-h-[min(90vh,850px)] flex flex-col">
        <div className="flex items-center justify-between pb-3 sm:pb-4 border-b border-stone-100 mb-4 sm:mb-5 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-700 flex items-center justify-center border border-rose-200 shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-stone-900 font-serif leading-tight">
                Registrar Ocorrência (RF14)
              </h3>
              <p className="text-xs text-stone-500">
                Relatar divergências ou impedimentos operacionais
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Fechar"
            className="p-1.5 text-stone-400 hover:text-stone-600 rounded-xl hover:bg-stone-100 transition-colors shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="overflow-y-auto overscroll-contain flex-1 pr-0.5">

        {foodName && (
          <div className="mb-4 p-3 bg-stone-50 rounded-2xl border border-stone-200 text-xs">
            <span className="text-stone-500">Alimento em questão:</span>{' '}
            <strong className="text-stone-900">{foodName}</strong>
          </div>
        )}

        {errorMsg && (
          <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 font-medium">
            {errorMsg}
          </div>
        )}

        {successMsg && (
          <div className="mb-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 font-medium flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            {successMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Etapa da Ocorrência <span className="text-rose-600">*</span>
            </label>
            <select
              value={stage}
              onChange={(e) => setStage(e.target.value as OccurrenceStage)}
              className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-rose-500/20 focus:border-rose-600 outline-hidden"
            >
              <option value="RETIRADA">Na Retirada / Local de Coleta</option>
              <option value="TRANSPORTE">Durante o Transporte</option>
              <option value="RECEBIMENTO">No Recebimento / Entrega</option>
              <option value="OUTRO">Outra Etapa</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Tipo de Problema <span className="text-rose-600">*</span>
            </label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-rose-500/20 focus:border-rose-600 outline-hidden"
            >
              <option value="Alimento indisponível no local de retirada">Alimento indisponível no local de retirada</option>
              <option value="Quantidade divergente do anunciado">Quantidade divergente do anunciado</option>
              <option value="Problema com veículo ou atraso no transporte">Problema com veículo ou atraso no transporte</option>
              <option value="Embalagem danificada ou alimento não conforme">Embalagem danificada ou alimento não conforme</option>
              <option value="Problema ou recusa no momento da entrega">Problema ou recusa no momento da entrega</option>
              <option value="Outro problema operacional">Outro problema operacional</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Descrição Detalhada do Problema <span className="text-rose-600">*</span>
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descreva com clareza o ocorrido para registro no histórico da doação..."
              required
              className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-rose-500/20 focus:border-rose-600 outline-hidden resize-none"
            />
            <p className="text-[11px] text-stone-400 mt-1">
              O registro de ocorrência não cancela a doação nem substitui as validações das etapas.
            </p>
          </div>

          <div className="pt-2 flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl text-xs font-semibold text-stone-700 bg-stone-100 hover:bg-stone-200 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2.5 rounded-xl text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-1.5 shadow-xs"
            >
              <Send className="w-3.5 h-3.5" />
              {loading ? 'Registrando...' : 'Registrar Ocorrência'}
            </button>
          </div>
        </form>
        </div>
      </div>
    </div>
  );
};
