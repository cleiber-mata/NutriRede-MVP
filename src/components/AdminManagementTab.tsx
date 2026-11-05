import React, { useState, useEffect } from 'react';
import {
  Shield,
  ShieldCheck,
  ShieldAlert,
  Crown,
  User,
  Users,
  Search,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  UserPlus,
  UserMinus,
  Clock,
  Mail,
  Calendar,
  Lock,
  RefreshCw,
  X,
  Info
} from 'lucide-react';
import {
  collection,
  doc,
  onSnapshot,
  query,
  runTransaction
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from '../context/AuthContext';
import { AdminDoc, UserAccount } from '../types';
import { formatDateBR, formatDateTimeBR } from '../utils/dateUtils';

interface AdminManagementTabProps {
  users: UserAccount[];
  onRefreshUsers?: () => void;
}

export const AdminManagementTab: React.FC<AdminManagementTabProps> = ({
  users,
  onRefreshUsers
}) => {
  const { currentUser, isOwner, systemConfig } = useAuth();

  const [admins, setAdmins] = useState<AdminDoc[]>([]);
  const [loadingAdmins, setLoadingAdmins] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<'ALL' | 'ADMINS' | 'REGULAR'>('ALL');

  // Modais de confirmação
  const [promoteCandidate, setPromoteCandidate] = useState<UserAccount | null>(null);
  const [revokeCandidate, setRevokeCandidate] = useState<{ user?: UserAccount; adminDoc: AdminDoc } | null>(null);

  // Estados de carregamento e feedback
  const [processingAction, setProcessingAction] = useState(false);
  const [feedback, setFeedback] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Escuta em tempo real da coleção /admins
  useEffect(() => {
    if (!isOwner) return;

    setLoadingAdmins(true);
    const adminsQuery = query(collection(db, 'admins'));
    const unsubscribe = onSnapshot(
      adminsQuery,
      (snapshot) => {
        const loadedAdmins: AdminDoc[] = [];
        snapshot.forEach((d) => {
          loadedAdmins.push(d.data() as AdminDoc);
        });
        setAdmins(loadedAdmins);
        setLoadingAdmins(false);
      },
      (err) => {
        console.error('Erro ao escutar coleção de administradores:', err);
        setFeedback({
          type: 'error',
          text: 'Falha ao sincronizar lista de administradores do Firestore.'
        });
        setLoadingAdmins(false);
      }
    );

    return () => unsubscribe();
  }, [isOwner]);

  // Mapa de administradores por UID para consulta rápida
  const adminMap = React.useMemo(() => {
    const map = new Map<string, AdminDoc>();
    admins.forEach((adm) => {
      map.set(adm.uid, adm);
    });
    return map;
  }, [admins]);

  // Estatísticas
  const ownerAdmin = admins.find((a) => a.role === 'OWNER' || a.uid === systemConfig?.ownerUid);
  const regularAdmins = admins.filter((a) => a.role === 'ADMIN' && a.uid !== systemConfig?.ownerUid);
  const regularUsersCount = users.filter((u) => !adminMap.has(u.uid)).length;

  // Filtragem dos usuários
  const filteredUsers = React.useMemo(() => {
    return users.filter((user) => {
      const isAdmin = adminMap.has(user.uid);
      const isUserOwner = user.uid === systemConfig?.ownerUid || adminMap.get(user.uid)?.role === 'OWNER';

      // Filtro de papel
      if (roleFilter === 'ADMINS' && !isAdmin) return false;
      if (roleFilter === 'REGULAR' && isAdmin) return false;

      // Busca por nome ou e-mail
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const matchName = user.name.toLowerCase().includes(term);
        const matchEmail = user.email.toLowerCase().includes(term);
        if (!matchName && !matchEmail) return false;
      }

      return true;
    }).sort((a, b) => {
      // Ordenação: OWNER primeiro, depois ADMINs, depois usuários comuns por data de criação
      const aIsOwner = a.uid === systemConfig?.ownerUid || adminMap.get(a.uid)?.role === 'OWNER';
      const bIsOwner = b.uid === systemConfig?.ownerUid || adminMap.get(b.uid)?.role === 'OWNER';
      if (aIsOwner) return -1;
      if (bIsOwner) return 1;

      const aIsAdmin = adminMap.has(a.uid);
      const bIsAdmin = adminMap.has(b.uid);
      if (aIsAdmin && !bIsAdmin) return -1;
      if (!aIsAdmin && bIsAdmin) return 1;

      return a.name.localeCompare(b.name);
    });
  }, [users, adminMap, systemConfig, roleFilter, searchTerm]);

  // Operação atômica de Promoção a Administrador (apenas ADMIN, nunca OWNER)
  const handleConfirmPromote = async () => {
    if (!promoteCandidate || !currentUser || !isOwner) return;

    // Regra de segurança rígida: nunca promover a si mesmo ou criar OWNER
    if (promoteCandidate.uid === systemConfig?.ownerUid || promoteCandidate.uid === currentUser.uid) {
      setFeedback({
        type: 'error',
        text: 'A conta do Proprietário já possui autoridade máxima do sistema.'
      });
      setPromoteCandidate(null);
      return;
    }

    setProcessingAction(true);
    setFeedback(null);

    try {
      const adminDocRef = doc(db, 'admins', promoteCandidate.uid);

      await runTransaction(db, async (transaction) => {
        const existingSnap = await transaction.get(adminDocRef);
        if (existingSnap.exists()) {
          throw new Error('Este usuário já possui atribuição administrativa ativa.');
        }

        const now = new Date().toISOString();
        const newAdminData: AdminDoc = {
          uid: promoteCandidate.uid,
          email: promoteCandidate.email.trim().toLowerCase(),
          role: 'ADMIN', // Obrigatoriamente 'ADMIN'
          assignedBy: currentUser.uid,
          assignedAt: now,
          updatedAt: now
        };

        transaction.set(adminDocRef, newAdminData);
      });

      setFeedback({
        type: 'success',
        text: `Usuário ${promoteCandidate.name} promovido a Administrador (ADMIN) com sucesso! Notifique o colega para atualizar ou reiniciar sua sessão na plataforma.`
      });
      setPromoteCandidate(null);
    } catch (err: unknown) {
      console.error('Erro ao promover administrador:', err);
      const errorMsg = err instanceof Error ? err.message : 'Falha na transação de promoção.';
      setFeedback({
        type: 'error',
        text: `Não foi possível concluir a promoção: ${errorMsg}`
      });
    } finally {
      setProcessingAction(false);
    }
  };

  // Operação atômica de Revogação de Administrador
  const handleConfirmRevoke = async () => {
    if (!revokeCandidate || !currentUser || !isOwner) return;

    const targetUid = revokeCandidate.adminDoc.uid;

    // Regra de proteção inviolável: OWNER nunca pode ser revogado
    if (
      targetUid === systemConfig?.ownerUid ||
      targetUid === currentUser.uid ||
      revokeCandidate.adminDoc.role === 'OWNER'
    ) {
      setFeedback({
        type: 'error',
        text: 'Ação Bloqueada: A conta do Proprietário Principal (OWNER) é permanentemente protegida e não pode ter seu papel revogado.'
      });
      setRevokeCandidate(null);
      return;
    }

    setProcessingAction(true);
    setFeedback(null);

    try {
      const adminDocRef = doc(db, 'admins', targetUid);

      await runTransaction(db, async (transaction) => {
        const adminSnap = await transaction.get(adminDocRef);
        if (!adminSnap.exists()) {
          throw new Error('O registro deste administrador já não existe.');
        }

        const data = adminSnap.data() as AdminDoc;
        if (data.role === 'OWNER' || data.uid === systemConfig?.ownerUid) {
          throw new Error('Proteção do Sistema: O Proprietário (OWNER) não pode ser revogado.');
        }

        // Exclusão segura apenas da credencial administrativa em /admins/{uid}
        transaction.delete(adminDocRef);
      });

      const targetName = revokeCandidate.user?.name || revokeCandidate.adminDoc.email;
      setFeedback({
        type: 'success',
        text: `O papel de Administrador de ${targetName} foi revogado com sucesso. Sua conta cadastral e perfis operacionais permanecem totalmente preservados.`
      });
      setRevokeCandidate(null);
    } catch (err: unknown) {
      console.error('Erro ao revogar administrador:', err);
      const errorMsg = err instanceof Error ? err.message : 'Falha na transação de revogação.';
      setFeedback({
        type: 'error',
        text: `Não foi possível revogar a administração: ${errorMsg}`
      });
    } finally {
      setProcessingAction(false);
    }
  };

  if (!isOwner) {
    return (
      <div className="bg-rose-50 border border-rose-200 rounded-3xl p-8 text-center text-rose-900">
        <ShieldAlert className="w-12 h-12 text-rose-600 mx-auto mb-3" />
        <h3 className="text-lg font-bold font-serif mb-1">Acesso Restrito ao Proprietário</h3>
        <p className="text-xs text-rose-700 max-w-md mx-auto">
          Esta funcionalidade de governança de administradores é exclusiva da conta do Proprietário Principal (OWNER).
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Alerta de Feedback */}
      {feedback && (
        <div
          className={`p-4 rounded-2xl text-xs flex items-center justify-between gap-3 ${
            feedback.type === 'success'
              ? 'bg-emerald-50 text-emerald-900 border border-emerald-300'
              : 'bg-rose-50 text-rose-900 border border-rose-300'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span className="font-medium">{feedback.text}</span>
          </div>
          <button
            onClick={() => setFeedback(null)}
            className="text-stone-400 hover:text-stone-600 font-bold text-sm"
          >
            ×
          </button>
        </div>
      )}

      {/* Painel de Contexto Institucional / Governança */}
      <div className="bg-amber-950/10 border border-amber-900/20 rounded-3xl p-5 sm:p-6 text-stone-800">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-800 shrink-0">
              <Crown className="w-5 h-5 text-amber-700" />
            </div>
            <div>
              <h2 className="text-base font-bold text-stone-900 font-serif">
                Governança de Acessos Administrativos
              </h2>
              <p className="text-xs text-stone-600 mt-0.5">
                Permita que colegas autorizados auxiliem na homologação e supervisão do MVP acadêmico. Apenas o Proprietário pode conceder ou revogar este acesso.
              </p>
            </div>
          </div>
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-100 text-amber-950 text-xs font-semibold border border-amber-300">
            <Lock className="w-3.5 h-3.5 text-amber-800" />
            <span>OWNER Protegido Permanentemente</span>
          </div>
        </div>
      </div>

      {/* Cards de Métricas Rápidas */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Card Proprietário */}
        <div className="p-4 rounded-2xl border-2 border-amber-400/80 bg-gradient-to-br from-amber-50/80 to-amber-100/50 shadow-2xs">
          <div className="flex items-center justify-between text-amber-800 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5">
              <Crown className="w-3.5 h-3.5 text-amber-600" />
              Proprietário (OWNER)
            </span>
            <span className="px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-900 text-[10px] font-extrabold">
              1 Ativo
            </span>
          </div>
          <div className="text-sm font-bold text-stone-900 truncate mt-2">
            {ownerAdmin?.email || currentUser?.email}
          </div>
          <p className="text-[11px] text-amber-900/80 mt-1 flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-amber-700" />
            Autoridade máxima inalterável
          </p>
        </div>

        {/* Card Administradores Comuns */}
        <div
          onClick={() => setRoleFilter(roleFilter === 'ADMINS' ? 'ALL' : 'ADMINS')}
          className={`p-4 rounded-2xl border-2 cursor-pointer transition-all ${
            roleFilter === 'ADMINS'
              ? 'border-emerald-600 bg-emerald-50/70 shadow-sm'
              : 'border-stone-200 bg-white hover:border-emerald-400'
          }`}
        >
          <div className="flex items-center justify-between text-emerald-800 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-emerald-600" />
              Administradores (ADMIN)
            </span>
            <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-900">
              {regularAdmins.length}
            </span>
          </div>
          <div className="text-2xl font-extrabold text-stone-900 mt-1">{regularAdmins.length}</div>
          <p className="text-[11px] text-emerald-800 mt-1">Homologadores delegados</p>
        </div>

        {/* Card Usuários Comuns */}
        <div
          onClick={() => setRoleFilter(roleFilter === 'REGULAR' ? 'ALL' : 'REGULAR')}
          className={`p-4 rounded-2xl border-2 cursor-pointer transition-all ${
            roleFilter === 'REGULAR'
              ? 'border-stone-800 bg-stone-100 shadow-sm'
              : 'border-stone-200 bg-white hover:border-stone-400'
          }`}
        >
          <div className="flex items-center justify-between text-stone-700 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-stone-600" />
              Usuários Comuns
            </span>
            <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-stone-200 text-stone-900">
              {regularUsersCount}
            </span>
          </div>
          <div className="text-2xl font-extrabold text-stone-900 mt-1">{regularUsersCount}</div>
          <p className="text-[11px] text-stone-600 mt-1">Elegíveis para promoção</p>
        </div>
      </div>

      {/* Barra de Filtros e Busca */}
      <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-2xs flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-96">
          <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar por nome ou e-mail cadastrado..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto justify-between md:justify-end">
          <div className="flex items-center gap-1 bg-stone-100 p-1 rounded-xl text-xs">
            <span className="text-[10px] font-bold text-stone-500 px-2 uppercase">Filtrar:</span>
            <button
              onClick={() => setRoleFilter('ALL')}
              className={`px-3 py-1 rounded-lg font-medium transition-colors ${
                roleFilter === 'ALL'
                  ? 'bg-white text-stone-900 shadow-2xs font-bold'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              Todos ({users.length})
            </button>
            <button
              onClick={() => setRoleFilter('ADMINS')}
              className={`px-3 py-1 rounded-lg font-medium transition-colors ${
                roleFilter === 'ADMINS'
                  ? 'bg-emerald-600 text-white shadow-2xs font-bold'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              Admins ({admins.length})
            </button>
            <button
              onClick={() => setRoleFilter('REGULAR')}
              className={`px-3 py-1 rounded-lg font-medium transition-colors ${
                roleFilter === 'REGULAR'
                  ? 'bg-stone-800 text-white shadow-2xs font-bold'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              Comuns ({regularUsersCount})
            </button>
          </div>

          {onRefreshUsers && (
            <button
              onClick={onRefreshUsers}
              title="Atualizar lista"
              className="p-2 rounded-xl text-stone-500 hover:text-stone-800 hover:bg-stone-100 border border-stone-200 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Lista de Usuários e Gestão de Papéis */}
      <div className="space-y-3">
        {loadingAdmins ? (
          <div className="bg-white rounded-2xl border border-stone-200 p-12 text-center text-stone-500">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-amber-600" />
            <p className="text-xs">Carregando governança de administradores...</p>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="bg-white rounded-2xl border border-stone-200 p-12 text-center text-stone-500">
            <Users className="w-8 h-8 mx-auto mb-2 text-stone-300" />
            <p className="text-sm font-semibold text-stone-700">Nenhum usuário encontrado</p>
            <p className="text-xs text-stone-500 mt-1">
              Ajuste os filtros ou o termo de busca para localizar contas.
            </p>
          </div>
        ) : (
          filteredUsers.map((user) => {
            const adminDoc = adminMap.get(user.uid);
            const isUserOwner = user.uid === systemConfig?.ownerUid || adminDoc?.role === 'OWNER';
            const isUserAdmin = !isUserOwner && adminDoc?.role === 'ADMIN';

            return (
              <div
                key={user.uid}
                className={`bg-white rounded-2xl p-4 sm:p-5 border transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                  isUserOwner
                    ? 'border-amber-400 bg-gradient-to-r from-amber-50/40 via-white to-amber-50/20 shadow-xs'
                    : isUserAdmin
                    ? 'border-emerald-300 bg-emerald-50/20 shadow-2xs'
                    : 'border-stone-200 hover:border-stone-300'
                }`}
              >
                {/* Dados do Usuário */}
                <div className="flex items-start sm:items-center gap-3">
                  <div
                    className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${
                      isUserOwner
                        ? 'bg-amber-100 text-amber-800 border border-amber-300 shadow-inner'
                        : isUserAdmin
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                        : 'bg-stone-100 text-stone-600 border border-stone-200'
                    }`}
                  >
                    {isUserOwner ? (
                      <Crown className="w-5 h-5 text-amber-600" />
                    ) : isUserAdmin ? (
                      <ShieldCheck className="w-5 h-5 text-emerald-700" />
                    ) : (
                      <User className="w-5 h-5 text-stone-500" />
                    )}
                  </div>

                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-bold text-stone-900 text-sm">{user.name}</span>

                      {/* Badges de papel administrativo */}
                      {isUserOwner && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-950 border border-amber-300 shadow-2xs">
                          <Crown className="w-3 h-3 text-amber-700" />
                          Proprietário Principal (OWNER)
                        </span>
                      )}

                      {isUserAdmin && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-900 border border-emerald-300">
                          <ShieldCheck className="w-3 h-3 text-emerald-700" />
                          Administrador (ADMIN)
                        </span>
                      )}

                      {!isUserOwner && !isUserAdmin && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-stone-100 text-stone-600 border border-stone-200">
                          Usuário Comum
                        </span>
                      )}

                      {user.accountStatus === 'BLOCKED' && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-300">
                          Conta Bloqueada
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-stone-500 mt-1">
                      <span className="flex items-center gap-1 text-stone-600">
                        <Mail className="w-3 h-3 text-stone-400" />
                        {user.email}
                      </span>
                      {user.createdAt && (
                        <span className="flex items-center gap-1 text-stone-400">
                          <Calendar className="w-3 h-3" />
                          Cadastro em {formatDateBR(user.createdAt)}
                        </span>
                      )}
                      {adminDoc?.assignedAt && isUserAdmin && (
                        <span className="flex items-center gap-1 text-emerald-700 text-[11px]">
                          <Clock className="w-3 h-3" />
                          Promovido em {formatDateBR(adminDoc.assignedAt)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Ações Administrativas */}
                <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                  {isUserOwner ? (
                    <div className="px-3 py-1.5 rounded-xl bg-amber-50 text-amber-900 border border-amber-300/80 text-xs font-semibold flex items-center gap-1.5 shadow-2xs">
                      <Lock className="w-3.5 h-3.5 text-amber-700" />
                      <span>Permanentemente Protegido</span>
                    </div>
                  ) : isUserAdmin ? (
                    <button
                      onClick={() => setRevokeCandidate({ user, adminDoc: adminDoc! })}
                      className="px-3.5 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 hover:border-rose-300 text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-2xs cursor-pointer"
                    >
                      <UserMinus className="w-3.5 h-3.5 text-rose-600" />
                      <span>Revogar Administração</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => setPromoteCandidate(user)}
                      className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer"
                    >
                      <UserPlus className="w-3.5 h-3.5" />
                      <span>Promover a Administrador</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Modal de Confirmação: PROMOVER USUÁRIO */}
      {promoteCandidate && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-900/60 backdrop-blur-xs flex justify-center items-start sm:items-center p-2.5 sm:p-4 overscroll-contain">
          <div className="bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-6 max-w-lg w-full shadow-2xl border border-stone-200 animate-in fade-in zoom-in-95 duration-150 my-auto flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100 mb-4 shrink-0">
              <div className="flex items-center gap-2 text-emerald-800">
                <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center">
                  <UserPlus className="w-4 h-4" />
                </div>
                <h4 className="font-bold text-stone-900 text-base font-serif">
                  Promover a Administrador (ADMIN)
                </h4>
              </div>
              <button
                onClick={() => setPromoteCandidate(null)}
                disabled={processingAction}
                aria-label="Fechar"
                className="p-1 rounded-lg text-stone-400 hover:text-stone-600 hover:bg-stone-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs text-stone-700">
              <div className="p-3.5 rounded-2xl bg-stone-50 border border-stone-200 space-y-1">
                <p className="text-[11px] font-bold text-stone-500 uppercase tracking-wider">
                  Usuário Selecionado:
                </p>
                <p className="font-bold text-sm text-stone-900">{promoteCandidate.name}</p>
                <p className="text-stone-600 flex items-center gap-1">
                  <Mail className="w-3.5 h-3.5 text-stone-400" />
                  {promoteCandidate.email}
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-950 space-y-1.5">
                <div className="flex items-center gap-1.5 font-bold text-amber-900">
                  <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0" />
                  <span>Privilégios Concedidos</span>
                </div>
                <p className="text-[11px] text-amber-900/90 leading-relaxed">
                  Este usuário terá acesso imediato à aba administrativa para homologar perfis de Doador, Entidade Receptora e Transportador, auditar contas e gerenciar solicitações de reserva.
                </p>
                <p className="text-[11px] text-amber-900/90 font-medium">
                  • <strong>Papel atribuído:</strong> ADMIN (ele não terá poder para promover outros administradores nem alterar a conta OWNER).
                </p>
              </div>

              <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 text-blue-900 text-[11px] flex items-start gap-2">
                <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <span>
                  <strong>Aviso ao usuário:</strong> Após a confirmação, o usuário promovido deverá recarregar a aplicação ou efetuar novo login para que as opções administrativas apareçam em sua interface.
                </span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 mt-6 pt-4 border-t border-stone-100">
              <button
                onClick={() => setPromoteCandidate(null)}
                disabled={processingAction}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-stone-700 hover:bg-stone-100 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmPromote}
                disabled={processingAction}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white transition-colors shadow-xs flex items-center gap-1.5 disabled:opacity-50"
              >
                {processingAction ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Promovendo...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>Confirmar Promoção</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Confirmação: REVOGAR ADMINISTRAÇÃO */}
      {revokeCandidate && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-900/60 backdrop-blur-xs flex justify-center items-start sm:items-center p-2.5 sm:p-4 overscroll-contain">
          <div className="bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-6 max-w-lg w-full shadow-2xl border border-stone-200 animate-in fade-in zoom-in-95 duration-150 my-auto flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100 mb-4 shrink-0">
              <div className="flex items-center gap-2 text-rose-800">
                <div className="w-8 h-8 rounded-xl bg-rose-100 text-rose-800 flex items-center justify-center">
                  <UserMinus className="w-4 h-4" />
                </div>
                <h4 className="font-bold text-stone-900 text-base font-serif">
                  Revogar Papel de Administrador
                </h4>
              </div>
              <button
                onClick={() => setRevokeCandidate(null)}
                disabled={processingAction}
                aria-label="Fechar"
                className="p-1 rounded-lg text-stone-400 hover:text-stone-600 hover:bg-stone-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs text-stone-700">
              <div className="p-3.5 rounded-2xl bg-stone-50 border border-stone-200 space-y-1">
                <p className="text-[11px] font-bold text-stone-500 uppercase tracking-wider">
                  Administrador a Revogar:
                </p>
                <p className="font-bold text-sm text-stone-900">
                  {revokeCandidate.user?.name || revokeCandidate.adminDoc.email}
                </p>
                <p className="text-stone-600 flex items-center gap-1">
                  <Mail className="w-3.5 h-3.5 text-stone-400" />
                  {revokeCandidate.adminDoc.email}
                </p>
                {revokeCandidate.adminDoc.assignedAt && (
                  <p className="text-[11px] text-stone-400 flex items-center gap-1 pt-1">
                    <Clock className="w-3 h-3" />
                    Atribuído em: {formatDateTimeBR(revokeCandidate.adminDoc.assignedAt)}
                  </p>
                )}
              </div>

              <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-950 space-y-1.5">
                <div className="flex items-center gap-1.5 font-bold text-rose-900">
                  <AlertCircle className="w-4 h-4 text-rose-700 shrink-0" />
                  <span>Consequências da Revogação</span>
                </div>
                <p className="text-[11px] text-rose-900/90 leading-relaxed">
                  O usuário deixará imediatamente de ter acesso ao Painel de Homologação, auditorias e ferramentas administrativas.
                </p>
                <p className="text-[11px] text-emerald-900 bg-emerald-50 p-2 rounded-lg border border-emerald-200">
                  ✓ <strong>Preservação Integral:</strong> A conta de usuário, autenticação do Google e todos os perfis operacionais (Doador, Receptor, Transportador) permanecerão 100% ativos e sem alterações.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 mt-6 pt-4 border-t border-stone-100">
              <button
                onClick={() => setRevokeCandidate(null)}
                disabled={processingAction}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-stone-700 hover:bg-stone-100 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmRevoke}
                disabled={processingAction}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white transition-colors shadow-xs flex items-center gap-1.5 disabled:opacity-50"
              >
                {processingAction ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Revogando...</span>
                  </>
                ) : (
                  <>
                    <UserMinus className="w-3.5 h-3.5" />
                    <span>Confirmar Revogação</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
