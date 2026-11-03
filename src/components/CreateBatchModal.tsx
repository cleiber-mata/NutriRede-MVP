import React, { useState } from 'react';
import {
  X,
  Package,
  Calendar,
  Clock,
  MapPin,
  Thermometer,
  CheckCircle2,
  AlertCircle,
  ShieldAlert,
  Scale
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { BatchUnit, FoodCategory } from '../types';
import { createFoodBatch } from '../services/foodBatchService';

interface CreateBatchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onBatchCreated?: () => void;
}

const CATEGORIES: FoodCategory[] = [
  'Hortifruti',
  'Padaria e Grãos',
  'Laticínios e Derivados',
  'Refeições Preparadas',
  'Mercearia e Embalados',
  'Outros'
];

const UNITS: BatchUnit[] = ['kg', 'g', 'litros', 'unidades'];

export const CreateBatchModal: React.FC<CreateBatchModalProps> = ({
  isOpen,
  onClose,
  onBatchCreated
}) => {
  const { currentUser, userAccount } = useAuth();

  const [foodName, setFoodName] = useState('');
  const [category, setCategory] = useState<FoodCategory>('Hortifruti');
  const [quantity, setQuantity] = useState<number | ''>('');
  const [unit, setUnit] = useState<BatchUnit>('kg');
  const [expirationDate, setExpirationDate] = useState('');
  const [storageCondition, setStorageCondition] = useState('Refrigerado (4°C a 8°C)');
  const [pickupAddress, setPickupAddress] = useState('');
  const [pickupWindowStart, setPickupWindowStart] = useState('');
  const [pickupWindowEnd, setPickupWindowEnd] = useState('');
  const [fitForConsumption, setFitForConsumption] = useState(false);

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  // Data mínima: hoje
  const todayStr = new Date().toISOString().split('T')[0];

  const handleStartChange = (val: string) => {
    setPickupWindowStart(val);
    if (val) {
      // Sugestão automática de término 2 horas após o início, permitindo ajuste manual
      const startDate = new Date(val);
      if (!isNaN(startDate.getTime())) {
        const suggestedEnd = new Date(startDate.getTime() + 2 * 60 * 60 * 1000);
        const pad = (n: number) => n.toString().padStart(2, '0');
        const endFormatted = `${suggestedEnd.getFullYear()}-${pad(suggestedEnd.getMonth() + 1)}-${pad(suggestedEnd.getDate())}T${pad(suggestedEnd.getHours())}:${pad(suggestedEnd.getMinutes())}`;
        setPickupWindowEnd(endFormatted);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!currentUser) {
      setErrorMsg('Você precisa estar autenticado como Doador para cadastrar ofertas.');
      return;
    }

    if (!quantity || Number(quantity) <= 0) {
      setErrorMsg('A quantidade deve ser um número maior que zero.');
      return;
    }

    if (!fitForConsumption) {
      setErrorMsg('É obrigatório declarar formalmente que o alimento está próprio para consumo.');
      return;
    }

    if (!pickupWindowStart || !pickupWindowEnd) {
      setErrorMsg('A janela de retirada (início e término) é obrigatória.');
      return;
    }

    const startMs = new Date(pickupWindowStart).getTime();
    const endMs = new Date(pickupWindowEnd).getTime();

    if (startMs < Date.now() - 5 * 60 * 1000) {
      setErrorMsg('O início da retirada deve ser igual ou posterior ao momento do cadastro.');
      return;
    }

    if (startMs >= endMs) {
      setErrorMsg('O horário de término da retirada deve ser estritamente posterior ao início.');
      return;
    }

    const durationHours = (endMs - startMs) / (1000 * 60 * 60);
    if (durationHours > 72) {
      setErrorMsg('A janela de retirada não pode ultrapassar 72 horas. Ajuste a data ou o horário de término.');
      return;
    }

    if (new Date(pickupWindowEnd) > new Date(expirationDate + 'T23:59:59')) {
      setErrorMsg('A janela de retirada deve terminar antes da data de validade do alimento.');
      return;
    }

    setLoading(true);

    try {
      await createFoodBatch({
        foodName,
        category,
        quantity: Number(quantity),
        unit,
        expirationDate,
        storageCondition,
        pickupAddress,
        pickupWindowStart,
        pickupWindowEnd,
        fitForConsumption: true,
        donorId: currentUser.uid,
        donorName: userAccount?.name || currentUser.displayName || 'Doador NutriRede',
        donorEmail: currentUser.email || '',
        donorPhone: userAccount?.phone || ''
      });

      setSuccess(true);
      if (onBatchCreated) onBatchCreated();
    } catch (err: unknown) {
      console.error('Erro ao cadastrar lote:', err);
      setErrorMsg(err instanceof Error ? err.message : 'Erro ao cadastrar o lote de alimentos.');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setFoodName('');
    setCategory('Hortifruti');
    setQuantity('');
    setUnit('kg');
    setExpirationDate('');
    setStorageCondition('Refrigerado (4°C a 8°C)');
    setPickupAddress('');
    setPickupWindowStart('');
    setPickupWindowEnd('');
    setFitForConsumption(false);
    setErrorMsg(null);
    setSuccess(false);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="relative bg-white w-full max-w-2xl rounded-3xl shadow-2xl border border-stone-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200 my-8">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-800 to-teal-900 p-6 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center text-white">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-xl font-bold font-serif">Cadastrar Lote de Alimentos</h3>
              <p className="text-xs text-emerald-200">
                RF04 • Oferta de Excedente por Doador Homologado
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-emerald-200 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {success ? (
            <div className="text-center py-6 space-y-4">
              <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <h4 className="text-2xl font-bold text-stone-900 font-serif">Lote Publicado com Sucesso!</h4>
              <p className="text-stone-600 text-xs sm:text-sm max-w-md mx-auto leading-relaxed">
                O lote foi registrado com a situação <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">DISPONÍVEL</span> e já pode ser consultado e reservado por entidades receptoras aprovadas.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
                <button
                  onClick={() => {
                    handleReset();
                  }}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 text-white font-semibold text-xs hover:bg-emerald-700 transition-colors shadow-xs"
                >
                  Cadastrar Outro Lote
                </button>
                <button
                  onClick={() => {
                    handleReset();
                    onClose();
                  }}
                  className="px-5 py-2.5 rounded-xl bg-stone-100 text-stone-700 font-semibold text-xs hover:bg-stone-200 transition-colors"
                >
                  Ver Minhas Doações
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {errorMsg && (
                <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <div className="leading-relaxed">{errorMsg}</div>
                </div>
              )}

              {/* Linha 1: Alimento e Categoria */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Identificação do Alimento <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={foodName}
                    onChange={(e) => setFoodName(e.target.value)}
                    placeholder="Ex: Pães franceses do dia, Tomates e Alfaces hidropônicas"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Categoria <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as FoodCategory)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Linha 2: Quantidade, Unidade e Validade */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Quantidade <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      required
                      min="0.1"
                      step="any"
                      value={quantity}
                      onChange={(e) => setQuantity(e.target.value === '' ? '' : Number(e.target.value))}
                      placeholder="Ex: 50"
                      className="w-full px-3 py-2 text-xs rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Unidade de Medida <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={unit}
                    onChange={(e) => setUnit(e.target.value as BatchUnit)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                  >
                    {UNITS.map((u) => (
                      <option key={u} value={u}>
                        {u}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Data de Validade <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    min={todayStr}
                    value={expirationDate}
                    onChange={(e) => setExpirationDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              {/* Linha 3: Condições de Conservação */}
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Condições de Conservação e Armazenamento <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={storageCondition}
                  onChange={(e) => setStorageCondition(e.target.value)}
                  placeholder="Ex: Refrigerado (4°C a 8°C), Ambiente seco e arejado, Congelado"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* Linha 4: Endereço do Local de Retirada */}
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Endereço / Local de Retirada <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <MapPin className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={pickupAddress}
                    onChange={(e) => setPickupAddress(e.target.value)}
                    placeholder="Ex: Av. Paulista, 1000 - Doca 3 - Bela Vista, São Paulo - SP"
                    className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              {/* Linha 5: Janela de Retirada (Início e Término) */}
              <div className="p-3.5 bg-stone-50 rounded-2xl border border-stone-200 space-y-2">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-stone-700 mb-1 flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-stone-500" />
                      Início da Janela de Retirada <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="datetime-local"
                      required
                      value={pickupWindowStart}
                      onChange={(e) => handleStartChange(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-stone-700 mb-1 flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-stone-500" />
                      Término da Janela de Retirada <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="datetime-local"
                      required
                      value={pickupWindowEnd}
                      onChange={(e) => setPickupWindowEnd(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                    />
                  </div>
                </div>
                <p className="text-[10px] text-stone-500">
                  * Sugestão automática de término 2 horas após o início (ajuste manual permitido). Duração máxima permitida: 72 horas.
                </p>
              </div>

              {/* Declaração Obrigatória de Aptidão (RN02 / RF04) */}
              <div className="p-3.5 bg-amber-50/80 rounded-2xl border border-amber-300 space-y-2">
                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    required
                    checked={fitForConsumption}
                    onChange={(e) => setFitForConsumption(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded text-emerald-600 focus:ring-emerald-500 border-amber-400"
                  />
                  <div className="text-xs text-amber-950">
                    <span className="font-bold">Declaração Obrigatória de Aptidão para Consumo:</span>
                    <p className="mt-0.5 text-[11px] text-amber-800 leading-normal">
                      Declaro formalmente que o alimento cadastrado encontra-se próprio para consumo humano, mantido sob as condições sanitárias declaradas e com prazo de validade compatível para retirada e distribuição.
                    </p>
                  </div>
                </label>

                <div className="text-[10px] text-stone-500 italic pt-1 border-t border-amber-200">
                  * Aviso Legal (PRD v1.1): A aptidão é declarada pelo doador. A plataforma NutriRede não realiza inspeção sanitária in loco nem oferece garantia de segurança alimentar.
                </div>
              </div>

              {/* Botões */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-stone-600 hover:bg-stone-100 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading || !fitForConsumption}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-md transition-all disabled:opacity-50 flex items-center gap-1.5"
                >
                  {loading ? (
                    <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Package className="w-4 h-4" />
                  )}
                  <span>{loading ? 'Publicando...' : 'Publicar Lote de Doação'}</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
