import React, { useState } from 'react';
import {
  X,
  CheckCircle2,
  Package,
  Building2,
  Truck,
  Calendar,
  AlertCircle,
  FileText,
  MapPin
} from 'lucide-react';
import { Reservation } from '../types';
import { confirmDeliveryAtomic } from '../services/transportService';
import { formatDateTimeBR } from '../utils/dateUtils';

interface ConfirmDeliveryModalProps {
  isOpen: boolean;
  onClose: () => void;
  reservation: Reservation;
  receiverUserId: string;
  receiverName: string;
  onSuccess?: () => void;
}

export const ConfirmDeliveryModal: React.FC<ConfirmDeliveryModalProps> = ({
  isOpen,
  onClose,
  reservation,
  receiverUserId,
  receiverName,
  onSuccess
}) => {
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleConfirm = async () => {
    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      await confirmDeliveryAtomic({
        reservationId: reservation.id,
        receiverUserId,
        receiverName,
        notes: notes.trim()
      });

      setSuccessMsg(
        'Recebimento confirmado com sucesso! A doação foi oficialmente CONCLUÍDA (RN08) e computada nos indicadores.'
      );
      setTimeout(() => {
        setSuccessMsg(null);
        onSuccess?.();
        onClose();
      }, 1500);
    } catch (err: any) {
      console.error('Erro ao confirmar entrega:', err);
      setErrorMsg(err.message || 'Falha ao confirmar o recebimento da doação.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl border border-stone-200 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between pb-4 border-b border-stone-100 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center border border-teal-200">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-stone-900 font-serif">
                Confirmar Recebimento da Doação (RF12)
              </h3>
              <p className="text-xs text-stone-500">
                Regra RN08: Conclusão oficial da doação de alimentos
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-stone-400 hover:text-stone-600 rounded-xl hover:bg-stone-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {errorMsg && (
          <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 font-medium">
            {errorMsg}
          </div>
        )}

        {successMsg && (
          <div className="mb-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 font-medium flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Conferência dos Dados da Doação */}
        <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200 space-y-3 mb-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-stone-500 uppercase">Alimento / Volume</span>
            <span className="text-xs font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full border border-emerald-300">
              {reservation.batchQuantity} {reservation.batchUnit}
            </span>
          </div>
          <h4 className="text-base font-bold text-stone-900 font-serif">
            {reservation.foodName}
          </h4>

          <div className="space-y-1.5 text-xs text-stone-600 pt-2 border-t border-stone-200">
            <div className="flex items-center justify-between">
              <span className="text-stone-500">Doador:</span>
              <strong className="text-stone-800">{reservation.donorName}</strong>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-stone-500">Transportador:</span>
              <strong className="text-stone-800">{reservation.transporterName || 'Atribuído'}</strong>
            </div>
            {reservation.pickedUpAt && (
              <div className="flex items-center justify-between">
                <span className="text-stone-500">Retirada registrada em:</span>
                <span className="font-mono text-stone-700">{formatDateTimeBR(reservation.pickedUpAt)}</span>
              </div>
            )}
          </div>
        </div>

        {/* Observações da Entidade */}
        <div className="mb-5">
          <label className="block text-xs font-semibold text-stone-700 mb-1">
            Observações do Recebimento (Opcional)
          </label>
          <textarea
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Ex: Alimentos recebidos em perfeitas condições sanitárias e conferidos com a nota."
            className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 outline-hidden resize-none"
          />
        </div>

        <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-[11px] text-amber-900 mb-5 leading-relaxed">
          <strong>Atenção:</strong> Ao confirmar o recebimento, o lote passará para o estado <strong>CONCLUIDO</strong> e será registrado no histórico e nos indicadores estatísticos como alimento efetivamente aproveitado.
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl text-xs font-semibold text-stone-700 bg-stone-100 hover:bg-stone-200 transition-colors"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={loading}
            className="flex-1 py-2.5 rounded-xl text-xs font-semibold text-white bg-teal-700 hover:bg-teal-800 disabled:opacity-50 transition-colors flex items-center justify-center gap-1.5 shadow-xs"
          >
            <CheckCircle2 className="w-4 h-4" />
            {loading ? 'Confirmando...' : 'Confirmar Recebimento da Doação'}
          </button>
        </div>
      </div>
    </div>
  );
};
