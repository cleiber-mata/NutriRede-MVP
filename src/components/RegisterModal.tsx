import React, { useState } from 'react';
import {
  X,
  UserPlus,
  Store,
  Building2,
  Truck,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  Phone,
  Mail,
  Lock,
  User as UserIcon
} from 'lucide-react';
import { createUserWithEmailAndPassword, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from '../firebase/config';
import { ProfileType, UserAccount, UserProfileDoc } from '../types';

interface RegisterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccessGoToLogin: () => void;
  onSwitchToLogin: () => void;
}

export const RegisterModal: React.FC<RegisterModalProps> = ({
  isOpen,
  onClose,
  onSuccessGoToLogin,
  onSwitchToLogin,
}) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Perfis selecionados: pelo menos um é obrigatório
  const [selectedProfiles, setSelectedProfiles] = useState<Record<ProfileType, boolean>>({
    DONOR: true, // Pré-seleciona um por conveniência
    RECEIVER: false,
    TRANSPORTER: false,
  });

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  const toggleProfile = (type: ProfileType) => {
    setSelectedProfiles((prev) => ({
      ...prev,
      [type]: !prev[type],
    }));
  };

  const handleGoogleSignUp = async () => {
    setErrorMsg(null);
    setLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      onClose();
    } catch (err: unknown) {
      console.error('Erro no cadastro com Google:', err);
      const firebaseError = err as { code?: string; message?: string };
      setErrorMsg(firebaseError.message || 'Falha no cadastro com Google.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    // Validações locais
    if (!name.trim()) {
      setErrorMsg('Por favor, informe seu nome completo ou razão social.');
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      setErrorMsg('Por favor, informe um endereço de e-mail válido.');
      return;
    }
    if (password.length < 6) {
      setErrorMsg('A senha de segurança deve conter no mínimo 6 caracteres.');
      return;
    }
    if (password !== confirmPassword) {
      setErrorMsg('A confirmação de senha não confere com a senha digitada.');
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
      // 1. Cria usuário no Firebase Authentication
      const userCredential = await createUserWithEmailAndPassword(auth, email.trim(), password);
      const user = userCredential.user;

      // 2. Cria documento da conta em /users/{uid}
      const userAccountData: UserAccount = {
        uid: user.uid,
        name: name.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim() || undefined,
        createdAt: new Date().toISOString(),
        accountStatus: 'ACTIVE',
      };

      try {
        await setDoc(doc(db, 'users', user.uid), userAccountData);
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `users/${user.uid}`);
      }

      // 3. Cria os perfis selecionados em /profiles/${uid}_${type}
      // Regra fundamental: todos iniciam com status "PENDENTE"
      const now = new Date().toISOString();
      for (const pType of activeTypes) {
        const profileId = `${user.uid}_${pType}`;
        const profileDoc: UserProfileDoc = {
          id: profileId,
          userId: user.uid,
          userName: name.trim(),
          userEmail: email.trim().toLowerCase(),
          userPhone: phone.trim() || '',
          profileType: pType,
          status: 'PENDENTE',
          requestedAt: now,
          decidedAt: null,
          decidedBy: null,
        };

        try {
          await setDoc(doc(db, 'profiles', profileId), profileDoc);
        } catch (err) {
          handleFirestoreError(err, OperationType.WRITE, `profiles/${profileId}`);
        }
      }

      setSuccess(true);
    } catch (err: unknown) {
      console.error('Erro no cadastro:', err);
      const firebaseError = err as { code?: string; message?: string };
      if (firebaseError.code === 'auth/email-already-in-use') {
        setErrorMsg('Este e-mail já está cadastrado no sistema. Faça login com suas credenciais.');
      } else if (firebaseError.code === 'auth/weak-password') {
        setErrorMsg('A senha informada é fraca. Utilize no mínimo 6 caracteres.');
      } else if (firebaseError.code === 'auth/invalid-email') {
        setErrorMsg('O formato do e-mail é inválido.');
      } else if (firebaseError.code === 'auth/operation-not-allowed') {
        setErrorMsg('O provedor de e-mail e senha precisa estar habilitado no console do Firebase.');
      } else {
        setErrorMsg(firebaseError.message || 'Erro ao processar o cadastro. Verifique os dados e tente novamente.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-900/60 backdrop-blur-xs flex justify-center items-start sm:items-center p-2.5 sm:p-4 overscroll-contain">
      <div className="relative bg-white w-full max-w-lg rounded-2xl sm:rounded-3xl shadow-2xl border border-stone-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200 my-auto max-h-[calc(100dvh-1.25rem)] sm:max-h-[min(90vh,860px)] flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-700 to-teal-800 p-4 sm:p-6 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg sm:text-xl font-bold font-serif leading-tight">Cadastrar no NutriRede</h3>
              <p className="text-xs text-emerald-100">
                RF01 • Cadastro Único com Seleção de Múltiplos Perfis
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
            <div className="text-center py-6">
              <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <h4 className="text-2xl font-bold text-stone-900 mb-2">Cadastro Realizado com Sucesso!</h4>
              <p className="text-stone-600 text-sm max-w-md mx-auto mb-6">
                Sua conta foi criada no NutriRede. Os perfis selecionados iniciam com a situação{' '}
                <span className="font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                  PENDENTE
                </span>{' '}
                aguardando avaliação do administrador.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <button
                  onClick={onSuccessGoToLogin}
                  className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm shadow-md transition-colors"
                >
                  Ir para o Login
                </button>
                <button
                  onClick={onClose}
                  className="px-6 py-2.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 font-semibold text-sm transition-colors"
                >
                  Fechar
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

              {/* Cadastro Ágil com Google */}
              <div className="space-y-3">
                <button
                  type="button"
                  onClick={handleGoogleSignUp}
                  disabled={loading}
                  className="w-full py-2.5 px-4 rounded-xl border border-stone-300 bg-white hover:bg-stone-50 text-stone-700 font-semibold text-xs shadow-2xs transition-colors flex items-center justify-center gap-2"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                  <span>Cadastrar com Conta Google</span>
                </button>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-stone-200" />
                  </div>
                  <div className="relative flex justify-center text-xs">
                    <span className="px-2 bg-white text-stone-400 uppercase tracking-wider text-[10px]">
                      ou preencha com e-mail e senha
                    </span>
                  </div>
                </div>
              </div>

              {/* Nome */}
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Nome Completo ou Razão Social <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <UserIcon className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ex: João da Silva ou Mercado São José"
                    className="w-full pl-10 pr-3 py-2 text-sm rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* E-mail e Telefone em grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    E-mail <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="usuario@exemplo.com"
                      className="w-full pl-10 pr-3 py-2 text-sm rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Telefone / WhatsApp <span className="text-stone-400">(opcional)</span>
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="(11) 98765-4321"
                      className="w-full pl-10 pr-3 py-2 text-sm rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    />
                  </div>
                </div>
              </div>

              {/* Senha e Confirmação */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Senha de Acesso <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      minLength={6}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Mínimo 6 dígitos"
                      className="w-full pl-10 pr-9 py-2 text-sm rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Confirmar Senha <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Repita a senha"
                      className="w-full pl-10 pr-3 py-2 text-sm rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    />
                  </div>
                </div>
              </div>

              {/* Seleção dos Perfis de Atuação (RN01) */}
              <div className="pt-2">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 mb-2">
                  <label className="block text-xs font-bold text-stone-800">
                    Selecione os Perfis de Atuação Desejados <span className="text-rose-500">*</span>
                  </label>
                  <span className="text-[11px] text-emerald-700 font-medium">
                    (Escolha 1, 2 ou os 3)
                  </span>
                </div>

                <div className="space-y-2">
                  {/* Perfil Doador */}
                  <label
                    className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                      selectedProfiles.DONOR
                        ? 'border-emerald-500 bg-emerald-50/70 shadow-xs'
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
                        <span className="text-sm font-bold text-stone-900">Doador</span>
                      </div>
                      <p className="text-xs text-stone-500 mt-0.5">
                        Para supermercados, feiras, restaurantes e agricultores que desejam ofertar alimentos.
                      </p>
                    </div>
                  </label>

                  {/* Perfil Entidade Receptora */}
                  <label
                    className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                      selectedProfiles.RECEIVER
                        ? 'border-teal-500 bg-teal-50/70 shadow-xs'
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
                        <span className="text-sm font-bold text-stone-900">Entidade Receptora</span>
                      </div>
                      <p className="text-xs text-stone-500 mt-0.5">
                        Para ONGs, creches, asilos e cozinhas comunitárias que distribuem refeições a quem precisa.
                      </p>
                    </div>
                  </label>

                  {/* Perfil Transportador */}
                  <label
                    className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                      selectedProfiles.TRANSPORTER
                        ? 'border-amber-500 bg-amber-50/70 shadow-xs'
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
                        <span className="text-sm font-bold text-stone-900">Transportador</span>
                      </div>
                      <p className="text-xs text-stone-500 mt-0.5">
                        Para motoristas ou equipes de frete voluntário que realizam a rota de coleta e entrega.
                      </p>
                    </div>
                  </label>
                </div>
                <p className="text-[11px] text-stone-500 mt-1.5 italic">
                  * Nota: Todos os perfis selecionados iniciarão com status <strong>PENDENTE</strong> e passarão pela aprovação administrativa.
                </p>
              </div>

              {/* Botão de Envio */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <UserPlus className="w-4 h-4" />
                  )}
                  <span>{loading ? 'Cadastrando...' : 'Concluir Cadastro'}</span>
                </button>
              </div>

              {/* Rodapé do modal */}
              <div className="text-center pt-2 border-t border-stone-100">
                <p className="text-xs text-stone-600">
                  Já possui uma conta?{' '}
                  <button
                    type="button"
                    onClick={onSwitchToLogin}
                    className="font-semibold text-emerald-700 hover:underline"
                  >
                    Fazer Login
                  </button>
                </p>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
