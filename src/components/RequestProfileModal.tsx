import React, { useState } from 'react';
import {
  X,
  PlusCircle,
  Store,
  Building2,
  Truck,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { PROFILE_DEFINITIONS, ProfileType } from '../types';

interface RequestProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const RequestProfileModal: React.FC<RequestProfileModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { userProfiles, requestAdditionalProfile } = useAuth();
  const [selectedType, setSelectedType] = useState<ProfileType | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  const existingTypes = userProfiles.map((p) => p.profileType);
  const availableTypes: ProfileType[] = (['DONOR', 'RECEIVER', 'TRANSPORTER'] as ProfileType[]).filter(
    (t) => !existingTypes.includes(t)
  );

  const handleRequest = async () => {
    if (!selectedType) {
      setErrorMsg('Selecione o perfil que deseja solicitar.');
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    try {
      await requestAdditionalProfile(selectedType);
      setSuccess(true);
    } catch (err: unknown) {
      console.error('Erro ao solicitar perfil:', err);
      setErrorMsg('Não foi possível registrar a solicitação. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const getIcon = (type: ProfileType) => {
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
    <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-stone-200 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between pb-3 border-b border-stone-100 mb-4">
          <div className="flex items-center gap-2">
            <PlusCircle className="w-5 h-5 text-emerald-600" />
            <h4 className="font-bold text-stone-900 text-base font-serif">
              Solicitar Perfil Adicional
            </h4>
          </div>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        {success ? (
          <div className="text-center py-4">
            <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-3">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h5 className="font-bold text-stone-900 text-lg">Perfil Solicitado com Sucesso!</h5>
            <p className="text-xs text-stone-600 mt-2">
              O novo perfil foi adicionado à sua conta com status{' '}
              <span className="font-bold text-amber-700">PENDENTE</span>. O administrador avaliará sua solicitação em breve.
            </p>
            <button
              onClick={() => {
                setSuccess(false);
                setSelectedType(null);
                onClose();
              }}
              className="mt-5 w-full py-2.5 rounded-xl bg-emerald-600 text-white font-semibold text-xs hover:bg-emerald-700"
            >
              Concluir
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-xs text-stone-600">
              Uma mesma conta pode atuar em mais de um papel no NutriRede. Escolha abaixo qual perfil adicional você deseja solicitar:
            </p>

            {errorMsg && (
              <div className="p-3 bg-rose-50 text-rose-800 text-xs rounded-xl flex items-center gap-2 border border-rose-200">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{errorMsg}</span>
              </div>
            )}

            {availableTypes.length === 0 ? (
              <div className="p-4 bg-stone-50 rounded-2xl text-center text-xs text-stone-500">
                Sua conta já possui todos os 3 perfis disponíveis cadastrados!
              </div>
            ) : (
              <div className="space-y-2">
                {availableTypes.map((type) => {
                  const meta = PROFILE_DEFINITIONS[type];
                  const isSelected = selectedType === type;

                  return (
                    <div
                      key={type}
                      onClick={() => setSelectedType(type)}
                      className={`p-3.5 rounded-2xl border-2 cursor-pointer transition-all flex items-start gap-3 ${
                        isSelected
                          ? 'border-emerald-600 bg-emerald-50/70 shadow-xs'
                          : 'border-stone-200 hover:border-emerald-300'
                      }`}
                    >
                      <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center border border-stone-200 shrink-0">
                        {getIcon(type)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-stone-900">{meta.title}</span>
                          <span className="text-[10px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 font-semibold">
                            Iniciará como Pendente
                          </span>
                        </div>
                        <p className="text-xs text-stone-500 mt-0.5">{meta.subtitle}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone-100">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-stone-700 hover:bg-stone-100"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={loading || !selectedType || availableTypes.length === 0}
                onClick={handleRequest}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 transition-colors"
              >
                {loading ? 'Enviando...' : 'Confirmar Solicitação'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
