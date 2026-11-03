import React, { useState } from 'react';
import {
  X,
  Mail,
  Lock,
  KeyRound,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  ShieldCheck,
  HelpCircle,
  ArrowRight,
  Info
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import {
  getAuthErrorMessage,
  requestUserEmailChange,
  syncVerifiedUserEmail
} from '../services/authSecurityService';

interface ChangeEmailModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ChangeEmailModal: React.FC<ChangeEmailModalProps> = ({ isOpen, onClose }) => {
  const { currentUser, userAccount, reloadUserData } = useAuth();

  const [newEmail, setNewEmail] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [verificationPendingEmail, setVerificationPendingEmail] = useState<string | null>(null);
  const [showAcademicGuidance, setShowAcademicGuidance] = useState(false);

  if (!isOpen || !currentUser) return null;

  const currentEmail = currentUser.email || userAccount?.email || '';
  const isPasswordAccount = currentUser.providerData.some(p => p.providerId === 'password');

  const handleRequestChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    const trimmedNew = newEmail.trim().toLowerCase();
    if (!trimmedNew) {
      setErrorMsg('Informe o novo endereço de e-mail.');
      return;
    }
    if (trimmedNew === currentEmail.toLowerCase()) {
      setErrorMsg('O novo e-mail não pode ser idêntico ao e-mail atual.');
      return;
    }
    if (isPasswordAccount && !currentPassword) {
      setErrorMsg('Informe sua senha atual para autorizar a operação.');
      return;
    }

    setLoading(true);

    try {
      const res = await requestUserEmailChange(currentUser, trimmedNew, currentPassword);

      if (res.isImmediateUpdate) {
        // Atualização direta pelo Firebase Auth: sincroniza imediatamente
        const syncRes = await syncVerifiedUserEmail(currentUser);
        await reloadUserData();
        setSuccessMsg(
          `E-mail de acesso atualizado e sincronizado com sucesso para: ${syncRes.newEmail} (${syncRes.profilesUpdatedCount} perfil(is) atualizado(s)).`
        );
        setNewEmail('');
        setCurrentPassword('');
      } else {
        // Envio de verificação para a nova caixa postal
        setVerificationPendingEmail(trimmedNew);
        setSuccessMsg(res.message);
      }
    } catch (err: any) {
      console.error('Erro na solicitação de alteração de e-mail:', err);
      const friendly = err.code ? getAuthErrorMessage(err.code) : err.message;
      setErrorMsg(friendly || 'Falha ao solicitar alteração de e-mail.');
    } finally {
      setLoading(false);
    }
  };

  const handleSyncEmail = async () => {
    setSyncing(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const syncRes = await syncVerifiedUserEmail(currentUser);
      await reloadUserData();

      if (syncRes.alreadySynced) {
        setSuccessMsg(
          `O e-mail da sua conta já está plenamente sincronizado (${syncRes.newEmail}). Nenhuma divergência encontrada.`
        );
      } else {
        setSuccessMsg(
          `Sincronização concluída! E-mail anterior (${syncRes.oldEmail}) atualizado para ${syncRes.newEmail} no cadastro e em ${syncRes.profilesUpdatedCount} perfil(is) associado(s). O UID e histórico foram 100% preservados.`
        );
        setVerificationPendingEmail(null);
        setNewEmail('');
        setCurrentPassword('');
      }
    } catch (err: any) {
      console.error('Erro ao sincronizar e-mail verificado:', err);
      const friendly = err.code ? getAuthErrorMessage(err.code) : err.message;
      setErrorMsg(friendly || 'Não foi possível sincronizar o e-mail verificado.');
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-900/60 backdrop-blur-xs flex justify-center items-start sm:items-center p-2.5 sm:p-4 overscroll-contain">
      <div className="bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-7 max-w-lg w-full shadow-2xl border border-stone-200 animate-in fade-in zoom-in-95 duration-150 my-auto max-h-[calc(100dvh-1.25rem)] sm:max-h-[min(90vh,850px)] flex flex-col">
        {/* Cabeçalho */}
        <div className="flex items-center justify-between pb-3 sm:pb-4 border-b border-stone-100 mb-4 sm:mb-6 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center border border-blue-200 shrink-0">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-stone-900 font-serif leading-tight">
                Alterar E-mail de Acesso
              </h3>
              <p className="text-xs text-stone-500">
                Procedimento seguro com validação no Firebase Authentication
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-stone-400 hover:text-stone-600 rounded-xl hover:bg-stone-100 transition-colors shrink-0"
            title="Fechar"
            aria-label="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="overflow-y-auto overscroll-contain flex-1 pr-0.5 space-y-4">

        {/* E-mail Atual Registrado */}
        <div className="p-3.5 rounded-2xl bg-stone-50 border border-stone-200 mb-5">
          <div className="text-[11px] font-semibold text-stone-500 uppercase tracking-wider mb-1">
            E-mail de Acesso Atual
          </div>
          <div className="flex items-center gap-2 text-sm font-semibold text-stone-800">
            <Mail className="w-4 h-4 text-stone-500" />
            <span>{currentEmail}</span>
            {userAccount?.previousEmail && (
              <span className="text-[10px] text-stone-400 font-normal">
                (anterior: {userAccount.previousEmail})
              </span>
            )}
          </div>
        </div>

        {/* Mensagens de Feedback */}
        {errorMsg && (
          <div className="mb-5 p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">{errorMsg}</p>
            </div>
          </div>
        )}

        {successMsg && (
          <div className="mb-5 p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-start gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">{successMsg}</p>
            </div>
          </div>
        )}

        {/* Formulário de Alteração de E-mail */}
        <form onSubmit={handleRequestChange} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1.5">
              Novo E-mail de Acesso <span className="text-rose-600">*</span>
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="novo.email@exemplo.com"
                required
                className="w-full pl-10 pr-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all"
              />
            </div>
            <p className="text-[11px] text-stone-500 mt-1">
              O Firebase enviará um link de confirmação para validar a posse da nova caixa postal.
            </p>
          </div>

          {isPasswordAccount && (
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1.5">
                Senha Atual da Conta <span className="text-rose-600">*</span>
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Digite sua senha atual"
                  required
                  className="w-full pl-10 pr-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all"
                />
              </div>
              <p className="text-[11px] text-stone-500 mt-1">
                Reautenticação obrigatória para certificar a legitimidade do titular.
              </p>
            </div>
          )}

          <div className="pt-2 flex flex-col sm:flex-row gap-2">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2.5 px-4 rounded-xl text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2 shadow-xs"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Processando Reautenticação...
                </>
              ) : (
                <>
                  <KeyRound className="w-4 h-4" />
                  Solicitar Alteração de E-mail
                </>
              )}
            </button>
          </div>
        </form>

        {/* Área de Sincronização de E-mail Confirmado */}
        <div className="mt-6 pt-5 border-t border-stone-100">
          <div className="bg-blue-50/60 rounded-2xl p-4 border border-blue-100 space-y-3">
            <div className="flex items-start gap-2.5">
              <RefreshCw className="w-4 h-4 text-blue-700 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-bold text-blue-900">
                  Já confirmou na caixa postal ou alterou via Console/Admin?
                </h4>
                <p className="text-[11px] text-blue-700/90 mt-0.5">
                  Após validar o link no e-mail recebido, clique no botão abaixo para recarregar sua credencial e sincronizar o Firestore mantendo todos os seus dados.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleSyncEmail}
              disabled={syncing}
              className="w-full py-2 px-3.5 rounded-xl text-xs font-semibold text-blue-800 bg-white hover:bg-blue-100/60 border border-blue-300 disabled:opacity-50 transition-colors flex items-center justify-center gap-1.5 shadow-xs"
            >
              {syncing ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  Sincronizando com Firestore...
                </>
              ) : (
                <>
                  <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
                  Sincronizar E-mail Verificado com Cadastro
                </>
              )}
            </button>
          </div>
        </div>

        {/* Instruções do Ambiente Acadêmico (Exceção sem caixa postal real) */}
        <div className="mt-4 pt-3">
          <button
            type="button"
            onClick={() => setShowAcademicGuidance(!showAcademicGuidance)}
            className="w-full text-left text-[11px] font-semibold text-stone-500 hover:text-stone-800 flex items-center justify-between py-1 transition-colors"
          >
            <span className="flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5 text-stone-400" />
              Ambiente Acadêmico e Contas Fictícias
            </span>
            <span className="text-stone-400">{showAcademicGuidance ? '▲ Ocultar' : '▼ Ver procedimento'}</span>
          </button>

          {showAcademicGuidance && (
            <div className="mt-2 p-3 bg-stone-50 rounded-xl border border-stone-200 text-[11px] text-stone-600 space-y-1.5 leading-relaxed">
              <p className="font-semibold text-stone-800">
                Procedimento Administrativo Privilegiado de Servidor (Firebase Admin SDK):
              </p>
              <p>
                Para contas de simulação sem caixa postal real ativa, a governança do NutriRede prevê o uso do Firebase Admin SDK em ambiente de servidor seguro para atualizar o e-mail diretamente (<code className="text-stone-800 font-mono">auth.updateUser(uid, &#123; email: novoEmail, emailVerified: true &#125;)</code>).
              </p>
              <p>
                Após a execução no servidor, o usuário entra com a nova credencial ou clica em <strong>"Sincronizar E-mail Verificado com Cadastro"</strong> para persistir a integridade cadastral sem quebrar aprovações nem histórico.
              </p>
              <p className="text-[10px] text-stone-500">
                Documentação técnica disponível em: <span className="font-mono text-stone-700">docs/RECURSO_ADMIN_RECUPERACAO_EMAIL.md</span>.
              </p>
            </div>
          )}
        </div>
        </div>
      </div>
    </div>
  );
};
