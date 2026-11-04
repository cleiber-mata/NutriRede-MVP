import React, { useState } from 'react';
import {
  X,
  Store,
  Building2,
  Truck,
  CheckCircle2,
  AlertCircle,
  User,
  Phone,
  MapPin,
  Clock,
  ShieldAlert
} from 'lucide-react';
import { doc, setDoc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from '../context/AuthContext';
import { ProfileType, UserProfileDoc } from '../types';

interface InitialProfileSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const InitialProfileSetupModal: React.FC<InitialProfileSetupModalProps> = ({
  isOpen,
  onClose,
  onSuccess
}) => {
  const { currentUser, userAccount, reloadUserData } = useAuth();

  const [name, setName] = useState(userAccount?.name || currentUser?.displayName || '');
  const [phone, setPhone] = useState(userAccount?.phone || '');
  const [address, setAddress] = useState(userAccount?.address || '');

  const [selectedProfiles, setSelectedProfiles] = useState<Record<ProfileType, boolean>>({
    DONOR: false,
    RECEIVER: false,
    TRANSPORTER: false
  });

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isCompleted, setIsCompleted] = useState(false);

  if (!isOpen || !currentUser) return null;

  const toggleProfile = (type: ProfileType) => {
    setSelectedProfiles((prev) => ({
      ...prev,
      [type]: !prev[type]
    }));
  };

  const selectedCount = Object.values(selectedProfiles).filter(Boolean).length;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!name.trim()) {
      setErrorMsg('Por favor, informe seu nome completo ou razão social.');
      return;
    }

    const activeTypes = (Object.keys(selectedProfiles) as ProfileType[]).filter(
      (type) => selectedProfiles[type]
    );

    if (activeTypes.length === 0) {
      setErrorMsg('Selecione pelo menos um perfil de atuação (Doador, Entidade Receptora ou Transportador).');
      return;
    }

    setLoading(true);

    try {
      const now = new Date().toISOString();

      // 1. Atualiza dados cadastrais em /users/{uid} preservando o e-mail Google
      const userRef = doc(db, 'users', currentUser.uid);
      await updateDoc(userRef, {
        name: name.trim(),
        phone: phone.trim() || null,
        address: address.trim() || null,
        updatedAt: now
      });

      // 2. Grava cada perfil selecionado com status PENDENTE em /profiles/{uid}_{type} (RF01/RF03)
      for (const pType of activeTypes) {
        const profileId = `${currentUser.uid}_${pType}`;
        const profileDoc: UserProfileDoc = {
          id: profileId,
          userId: currentUser.uid,
          userName: name.trim(),
          userEmail: currentUser.email || '',
          userPhone: phone.trim() || '',
          profileType: pType,
          status: 'PENDENTE',
          requestedAt: now,
          decidedAt: null,
          decidedBy: null
        };

        await setDoc(doc(db, 'profiles', profileId), profileDoc);
      }

      await reloadUserData();
      setIsCompleted(true);
      if (onSuccess) onSuccess();
    } catch (err: unknown) {
      console.error('Erro ao configurar perfis iniciais:', err);
      setErrorMsg(err instanceof Error ? err.message : 'Falha ao salvar seus perfis de atuação.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-start sm:items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl border border-stone-200 w-full max-w-xl my-4 sm:my-8 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Cabeçalho */}
        <div className="bg-gradient-to-r from-emerald-800 to-teal-800 px-6 py-5 text-white flex items-center justify-between shrink-0">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-200 block">
              Primeiro Acesso — Google
            </span>
            <h3 className="text-xl font-bold font-serif">Escolha seu Perfil de Atuação</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-emerald-200 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Conteúdo */}
        <div className="p-6 overflow-y-auto overscroll-contain flex-1">
          {isCompleted ? (
            <div className="text-center py-6 space-y-4">
              <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <h4 className="text-2xl font-bold text-stone-900 font-serif">
                Perfis Cadastrados com Sucesso!
              </h4>
              <p className="text-stone-600 text-xs sm:text-sm max-w-md mx-auto leading-relaxed">
                Seus perfis de atuação foram registrados e iniciam na situação{' '}
                <span className="font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-300">
                  PENDENTE
                </span>
                . Conforme as regras do PRD (RF03), o administrador do sistema avaliará seu cadastro antes de liberar as operações ativas.
              </p>
              <div className="p-3.5 bg-stone-50 rounded-2xl border border-stone-200 text-left text-xs text-stone-600 max-w-md mx-auto space-y-1">
                <div className="font-bold text-stone-800 flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-amber-600" />
                  Próximos passos da homologação:
                </div>
                <p>• Você já pode visualizar o seu painel de usuário e editar seus dados cadastrais.</p>
                <p>• As áreas de doação, reserva e transporte serão ativadas após a aprovação pelo administrador.</p>
              </div>
              <div className="pt-2">
                <button
                  onClick={onClose}
                  className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm shadow-md transition-colors"
                >
                  Acessar Meu Painel
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {errorMsg && (
                <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <div>{errorMsg}</div>
                </div>
              )}

              {/* Informações da Conta Google */}
              <div className="p-3.5 bg-emerald-50/70 rounded-2xl border border-emerald-200 text-xs text-emerald-900 flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold text-sm shrink-0">
                  {currentUser.photoURL ? (
                    <img src={currentUser.photoURL} alt="" className="w-9 h-9 rounded-xl object-cover" />
                  ) : (
                    currentUser.displayName?.charAt(0) || 'G'
                  )}
                </div>
                <div className="flex-1">
                  <p className="font-bold">Conta Google Vinculada</p>
                  <p className="text-emerald-800 text-[11px]">{currentUser.email}</p>
                  <p className="text-stone-500 text-[10px] mt-0.5">
                    Seus dados de autenticação foram preservados. Complete seu cadastro abaixo:
                  </p>
                </div>
              </div>

              {/* Nome */}
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Nome Completo ou Razão Social <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ex: João da Silva ou Supermercado Bom Preço"
                    className="w-full pl-10 pr-3 py-2 text-xs rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              {/* Telefone e Endereço */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Telefone de Contato (WhatsApp)
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="(11) 98765-4321"
                      className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Cidade / Bairro
                  </label>
                  <div className="relative">
                    <MapPin className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="Ex: São Paulo - SP"
                      className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>
              </div>

              {/* Seleção Obrigatória de Perfis */}
              <div className="space-y-2 pt-1">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-stone-800">
                    Selecione seus Perfis de Atuação <span className="text-rose-500">*</span>
                  </label>
                  <span className="text-[11px] text-stone-500 font-semibold">
                    {selectedCount} de 3 selecionados
                  </span>
                </div>
                <p className="text-[11px] text-stone-500">
                  Você pode escolher 1, 2 ou os 3 papéis. Todos podem ser operados pela mesma conta:
                </p>

                <div className="space-y-2">
                  {/* Perfil Doador */}
                  <label
                    className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                      selectedProfiles.DONOR
                        ? 'border-emerald-600 bg-emerald-50/70 shadow-xs ring-2 ring-emerald-500/20'
                        : 'border-stone-200 hover:bg-stone-50'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedProfiles.DONOR}
                      onChange={() => toggleProfile('DONOR')}
                      className="mt-1 h-4 w-4 rounded text-emerald-600 focus:ring-emerald-500 border-stone-300"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <Store className="w-4 h-4 text-emerald-700" />
                        <span className="text-xs font-bold text-stone-900">Doador de Alimentos</span>
                      </div>
                      <p className="text-[11px] text-stone-500 mt-0.5">
                        Para supermercados, feiras, restaurantes ou produtores que possuem excedentes aptos para doação.
                      </p>
                    </div>
                  </label>

                  {/* Perfil Entidade Receptora */}
                  <label
                    className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                      selectedProfiles.RECEIVER
                        ? 'border-teal-600 bg-teal-50/70 shadow-xs ring-2 ring-teal-500/20'
                        : 'border-stone-200 hover:bg-stone-50'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedProfiles.RECEIVER}
                      onChange={() => toggleProfile('RECEIVER')}
                      className="mt-1 h-4 w-4 rounded text-teal-600 focus:ring-teal-500 border-stone-300"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-teal-700" />
                        <span className="text-xs font-bold text-stone-900">Entidade Receptora (ONG / Beneficiária)</span>
                      </div>
                      <p className="text-[11px] text-stone-500 mt-0.5">
                        Para ONGs, creches, asilos e cozinhas comunitárias que distribuem refeições a quem precisa.
                      </p>
                    </div>
                  </label>

                  {/* Perfil Transportador */}
                  <label
                    className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                      selectedProfiles.TRANSPORTER
                        ? 'border-amber-600 bg-amber-50/70 shadow-xs ring-2 ring-amber-500/20'
                        : 'border-stone-200 hover:bg-stone-50'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedProfiles.TRANSPORTER}
                      onChange={() => toggleProfile('TRANSPORTER')}
                      className="mt-1 h-4 w-4 rounded text-amber-600 focus:ring-amber-500 border-stone-300"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <Truck className="w-4 h-4 text-amber-700" />
                        <span className="text-xs font-bold text-stone-900">Transportador Voluntário / Frete</span>
                      </div>
                      <p className="text-[11px] text-stone-500 mt-0.5">
                        Para motoristas ou voluntários que realizam a rota de coleta e entrega dos lotes.
                      </p>
                    </div>
                  </label>
                </div>
              </div>

              {/* Aviso RF03 de Aprovação Administrativa */}
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-[11px] flex items-start gap-2">
                <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <p>
                  <strong>Regra de Integridade (RF03):</strong> Cada perfil selecionado iniciará na situação{' '}
                  <span className="font-bold underline">PENDENTE</span> e passará pela avaliação de conformidade do administrador. As funções operacionais de doação e reserva serão liberadas individualmente após a homologação.
                </p>
              </div>

              {/* Botões */}
              <div className="pt-2 flex flex-col sm:flex-row gap-2">
                <button
                  type="submit"
                  disabled={loading || selectedCount === 0}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4" />
                  )}
                  <span>{loading ? 'Cadastrando Perfis...' : 'Confirmar Perfis e Concluir'}</span>
                </button>

                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 font-semibold text-xs transition-colors"
                >
                  Definir Depois
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
