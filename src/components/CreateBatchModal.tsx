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
import {
  getTodayCivilDateBR,
  validatePickupWindowAgainstExpiration,
  isDateBeforeTodayCivilBR,
  isBatchExpired,
  formatDateTimeBR,
  formatDateBR
} from '../utils/dateUtils';

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

// Formata objeto Date para o formato compatível com input datetime-local (YYYY-MM-DDTHH:mm)
const toDateTimeLocalString = (date: Date): string => {
  const pad = (n: number) => n.toString().padStart(2, '0');
  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());
  return `${year}-${month}-${day}T${hours}:${minutes}`;
};

// Adiciona horas a uma data/hora no formato local
const addHoursToDateTime = (isoOrDate: string | Date, hours: number): string => {
  const base = typeof isoOrDate === 'string' ? new Date(isoOrDate) : isoOrDate;
  if (isNaN(base.getTime())) return '';
  const target = new Date(base.getTime() + hours * 60 * 60 * 1000);
  return toDateTimeLocalString(target);
};

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
  const [consumptionDeadline, setConsumptionDeadline] = useState('');
  const [storageCondition, setStorageCondition] = useState('Refrigerado (4°C a 8°C)');
  const [pickupAddress, setPickupAddress] = useState('');
  const [pickupWindowStart, setPickupWindowStart] = useState('');
  const [pickupWindowEnd, setPickupWindowEnd] = useState('');
  // Flag para rastrear se o usuário alterou manualmente o término, evitando sobrescrita indevida
  const [isEndManuallyEdited, setIsEndManuallyEdited] = useState(false);
  const [fitForConsumption, setFitForConsumption] = useState(false);

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  // Data mínima civil de hoje em Brasília (M41)
  const todayStr = getTodayCivilDateBR();

  // Edição manual do Início da janela
  const handleStartChange = (val: string) => {
    setPickupWindowStart(val);
    if (val) {
      // Sugere término 2 horas após o início APENAS se o usuário não tiver personalizado manualmente
      if (!isEndManuallyEdited || !pickupWindowEnd) {
        const endFormatted = addHoursToDateTime(val, 2);
        if (endFormatted) {
          setPickupWindowEnd(endFormatted);
        }
      }
    }
  };

  // Edição manual do Término da janela pelo usuário (nunca reverte automaticamente)
  const handleEndChange = (val: string) => {
    setPickupWindowEnd(val);
    if (!val) {
      // Se o usuário limpou o campo, permite nova sugestão automática quando alterar o início
      setIsEndManuallyEdited(false);
    } else {
      setIsEndManuallyEdited(true);
    }
  };

  // Atalhos rápidos para ajustar o término em dispositivos móveis
  const applySuggestedHours = (hours: number) => {
    if (!pickupWindowStart) {
      const now = new Date();
      const startFormatted = toDateTimeLocalString(now);
      const endFormatted = addHoursToDateTime(now, hours);
      setPickupWindowStart(startFormatted);
      setPickupWindowEnd(endFormatted);
      setIsEndManuallyEdited(hours !== 2);
    } else {
      const endFormatted = addHoursToDateTime(pickupWindowStart, hours);
      if (endFormatted) {
        setPickupWindowEnd(endFormatted);
        setIsEndManuallyEdited(hours !== 2);
      }
    }
  };

  // Atalho para definir início como agora no relógio
  const handleSetStartNow = () => {
    const now = new Date();
    const startFormatted = toDateTimeLocalString(now);
    setPickupWindowStart(startFormatted);
    if (!isEndManuallyEdited || !pickupWindowEnd) {
      const endFormatted = addHoursToDateTime(now, 2);
      if (endFormatted) {
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

    // Validação M41: Alimentos preparados exigem horário-limite de consumo seguro explícito
    if (category === 'Refeições Preparadas' && !consumptionDeadline) {
      setErrorMsg('Para refeições preparadas (ex: marmitas), é obrigatório informar o horário-limite de consumo seguro.');
      return;
    }

    if (isDateBeforeTodayCivilBR(expirationDate)) {
      setErrorMsg('A data de validade não pode ser anterior à data de hoje.');
      return;
    }

    if (isBatchExpired(expirationDate, consumptionDeadline)) {
      setErrorMsg('O horário-limite de consumo seguro deste alimento já expirou no dia de hoje.');
      return;
    }

    const windowCheck = validatePickupWindowAgainstExpiration(
      pickupWindowEnd,
      expirationDate,
      consumptionDeadline
    );
    if (!windowCheck.valid) {
      setErrorMsg(windowCheck.error || 'A janela de retirada não pode ultrapassar o limite de validade.');
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
        consumptionDeadline: consumptionDeadline || null,
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
    setConsumptionDeadline('');
    setStorageCondition('Refrigerado (4°C a 8°C)');
    setPickupAddress('');
    setPickupWindowStart('');
    setPickupWindowEnd('');
    setIsEndManuallyEdited(false);
    setFitForConsumption(false);
    setErrorMsg(null);
    setSuccess(false);
  };

  // Validação e cálculo da duração da janela em tempo real para feedback visual mobile
  let durationLabel: string | null = null;
  let durationAlert: { type: 'valid' | 'warning' | 'error'; message: string } | null = null;

  if (pickupWindowStart && pickupWindowEnd) {
    const startMs = new Date(pickupWindowStart).getTime();
    const endMs = new Date(pickupWindowEnd).getTime();

    if (!isNaN(startMs) && !isNaN(endMs)) {
      if (endMs <= startMs) {
        durationAlert = {
          type: 'error',
          message: 'O término da retirada deve ser estritamente posterior ao horário de início.'
        };
      } else {
        const diffHours = (endMs - startMs) / (1000 * 60 * 60);
        durationLabel = diffHours < 1
          ? `${Math.round(diffHours * 60)} min`
          : diffHours === 1
          ? '1 hora'
          : `${Math.round(diffHours * 10) / 10} horas`;

        if (diffHours > 72) {
          durationAlert = {
            type: 'error',
            message: `Duração calculada (${durationLabel}) excede o limite máximo permitido de 72 horas.`
          };
        } else if (expirationDate) {
          const check = validatePickupWindowAgainstExpiration(
            pickupWindowEnd,
            expirationDate,
            consumptionDeadline
          );
          if (!check.valid) {
            durationAlert = {
              type: 'error',
              message: check.error || 'O término ultrapassa a validade informada.'
            };
          } else {
            durationAlert = {
              type: 'valid',
              message: `Duração da janela: ${durationLabel}. Compatível com a validade e normas do PRD.`
            };
          }
        } else {
          durationAlert = {
            type: 'valid',
            message: `Duração da janela: ${durationLabel}.`
          };
        }
      }
    }
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-900/60 backdrop-blur-xs flex justify-center items-start sm:items-center p-2.5 sm:p-4 overscroll-contain">
      <div className="relative bg-white w-full max-w-2xl rounded-2xl sm:rounded-3xl shadow-2xl border border-stone-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200 my-auto max-h-[calc(100dvh-1.25rem)] sm:max-h-[min(90vh,880px)] flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-800 to-teal-900 p-4 sm:p-6 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center text-white shrink-0">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg sm:text-xl font-bold font-serif leading-tight">Cadastrar Lote de Alimentos</h3>
              <p className="text-xs text-emerald-200">
                RF04 • Oferta de Excedente por Doador Homologado
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Fechar"
            className="p-1.5 rounded-lg text-emerald-200 hover:text-white hover:bg-white/10 transition-colors shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 overflow-y-auto overscroll-contain flex-1">
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
            <form onSubmit={handleSubmit} className="space-y-4 pb-8 sm:pb-4">
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
                    className="w-full px-3 py-2 text-base sm:text-xs min-h-[42px] rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-stone-900 bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Categoria <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as FoodCategory)}
                    className="w-full px-3 py-2 text-base sm:text-xs min-h-[42px] rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white text-stone-900"
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
                      className="w-full px-3 py-2 text-base sm:text-xs min-h-[42px] rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-stone-900 bg-white"
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
                    className="w-full px-3 py-2 text-base sm:text-xs min-h-[42px] rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white text-stone-900"
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
                    className="w-full px-3 py-2 text-base sm:text-xs min-h-[42px] rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-stone-900 bg-white"
                  />
                  {expirationDate && (
                    <p className="text-[11px] text-stone-500 mt-1">
                      Validade: <strong>{formatDateBR(expirationDate)}</strong>
                    </p>
                  )}
                </div>
              </div>

              {/* Campo Específico M41: Horário-Limite para Refeições Preparadas / Marmitas */}
              {category === 'Refeições Preparadas' && (
                <div className="p-3.5 bg-amber-50 rounded-2xl border border-amber-200 space-y-1.5 animate-in fade-in duration-150">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-amber-900">
                    <Clock className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                    <span>Horário-Limite para Consumo Seguro (Marmitas / Refeições) <span className="text-rose-500">*</span></span>
                  </div>
                  <p className="text-[11px] text-amber-800 leading-tight">
                    Para refeições preparadas, informe até que horário o alimento pode ser consumido com segurança sanitária. O término da janela de retirada deverá encerrar antes deste horário.
                  </p>
                  <input
                    type="time"
                    required
                    value={consumptionDeadline}
                    onChange={(e) => setConsumptionDeadline(e.target.value)}
                    className="w-full sm:w-44 px-3 py-2 text-base sm:text-xs min-h-[42px] rounded-xl border border-amber-300 focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white font-semibold text-stone-900"
                  />
                </div>
              )}

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
                  className="w-full px-3 py-2 text-base sm:text-xs min-h-[42px] rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-stone-900 bg-white"
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
                    className="w-full pl-9 pr-3 py-2 text-base sm:text-xs min-h-[42px] rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-stone-900 bg-white"
                  />
                </div>
              </div>

              {/* Linha 5: Janela de Retirada (Início e Término - Mobile M35/M26/M30) */}
              <div className="p-3.5 bg-stone-50 rounded-2xl border border-stone-200 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                  <label className="text-xs font-bold text-stone-800 flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-emerald-700" />
                    <span>Janela de Retirada dos Alimentos <span className="text-rose-500">*</span></span>
                  </label>
                  <span className="text-[11px] text-stone-500">
                    Fuso de Brasília • Limite máx: 72 horas
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Início da Retirada */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <label className="font-semibold text-stone-700">Início da Retirada</label>
                      <button
                        type="button"
                        onClick={handleSetStartNow}
                        className="text-[11px] font-semibold text-emerald-700 hover:text-emerald-800 underline transition-colors"
                      >
                        Definir agora
                      </button>
                    </div>
                    <input
                      type="datetime-local"
                      required
                      step="60"
                      value={pickupWindowStart}
                      onChange={(e) => handleStartChange(e.target.value)}
                      className="w-full min-h-[44px] px-3 py-2 text-base sm:text-xs rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white text-stone-900"
                    />
                    {pickupWindowStart && (
                      <p className="text-[11px] text-stone-600">
                        Início: <strong>{formatDateTimeBR(pickupWindowStart)}</strong>
                      </p>
                    )}
                  </div>

                  {/* Término da Retirada */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5">
                        <label className="font-semibold text-stone-700">Término da Retirada</label>
                        {isEndManuallyEdited && (
                          <span className="text-[10px] font-semibold text-amber-800 bg-amber-100 px-1.5 py-0.5 rounded border border-amber-200">
                            Manual
                          </span>
                        )}
                      </div>
                      {isEndManuallyEdited && (
                        <button
                          type="button"
                          onClick={() => applySuggestedHours(2)}
                          className="text-[11px] font-semibold text-emerald-700 hover:text-emerald-800 underline transition-colors"
                          title="Redefinir para a sugestão padrão de 2 horas após o início"
                        >
                          Sugerir +2h
                        </button>
                      )}
                    </div>
                    <input
                      type="datetime-local"
                      required
                      step="60"
                      value={pickupWindowEnd}
                      onChange={(e) => handleEndChange(e.target.value)}
                      className="w-full min-h-[44px] px-3 py-2 text-base sm:text-xs rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white text-stone-900"
                    />
                    {pickupWindowEnd && (
                      <p className="text-[11px] text-stone-600">
                        Término: <strong>{formatDateTimeBR(pickupWindowEnd)}</strong>
                      </p>
                    )}
                  </div>
                </div>

                {/* Botões de atalho rápido para dispositivos móveis */}
                <div className="pt-1 flex flex-wrap items-center gap-1.5 text-xs">
                  <span className="text-[11px] text-stone-500 font-medium mr-1">Atalhos para término:</span>
                  <button
                    type="button"
                    onClick={() => applySuggestedHours(2)}
                    className="px-2.5 py-1 rounded-lg text-xs font-semibold text-stone-700 bg-white hover:bg-stone-100 border border-stone-200 transition-colors shadow-2xs"
                  >
                    +2 horas
                  </button>
                  <button
                    type="button"
                    onClick={() => applySuggestedHours(4)}
                    className="px-2.5 py-1 rounded-lg text-xs font-semibold text-stone-700 bg-white hover:bg-stone-100 border border-stone-200 transition-colors shadow-2xs"
                  >
                    +4 horas
                  </button>
                  <button
                    type="button"
                    onClick={() => applySuggestedHours(24)}
                    className="px-2.5 py-1 rounded-lg text-xs font-semibold text-stone-700 bg-white hover:bg-stone-100 border border-stone-200 transition-colors shadow-2xs"
                  >
                    +24 horas (amanhã)
                  </button>
                </div>

                {/* Alerta de validação em tempo real da duração da janela */}
                {durationAlert && (
                  <div
                    className={`p-2.5 rounded-xl text-xs flex items-center gap-2 ${
                      durationAlert.type === 'valid'
                        ? 'bg-emerald-50 text-emerald-900 border border-emerald-200'
                        : 'bg-rose-50 text-rose-900 border border-rose-200'
                    }`}
                  >
                    {durationAlert.type === 'valid' ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                    )}
                    <span className="leading-tight">{durationAlert.message}</span>
                  </div>
                )}

                <p className="text-[10px] text-stone-500 leading-normal">
                  * Sugestão automática inicial de 2 horas após o início. Você pode alterar livremente a data e horário de término pelos campos ou atalhos sem que o sistema reverta sua personalização.
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
