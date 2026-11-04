import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  User,
  onAuthStateChanged,
  signOut
} from 'firebase/auth';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  setDoc,
  where
} from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType, testConnection } from '../firebase/config';
import { AdminDoc, AdminRole, ProfileType, SystemConfigDoc, UserAccount, UserProfileDoc } from '../types';

interface AuthContextType {
  currentUser: User | null;
  userAccount: UserAccount | null;
  userProfiles: UserProfileDoc[];
  activeProfile: UserProfileDoc | null;
  isAdmin: boolean;
  isOwner: boolean;
  adminRole: AdminRole | null;
  isLoading: boolean;
  isProfilesLoaded: boolean;
  error: string | null;
  systemConfig: SystemConfigDoc | null;
  setActiveProfile: (profile: UserProfileDoc | null) => void;
  switchActiveProfileType: (type: ProfileType) => void;
  requestAdditionalProfile: (type: ProfileType) => Promise<void>;
  reloadUserData: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userAccount, setUserAccount] = useState<UserAccount | null>(null);
  const [userProfiles, setUserProfiles] = useState<UserProfileDoc[]>([]);
  const [activeProfile, setActiveProfile] = useState<UserProfileDoc | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [isOwner, setIsOwner] = useState<boolean>(false);
  const [adminRole, setAdminRole] = useState<AdminRole | null>(null);
  const [systemConfig, setSystemConfig] = useState<SystemConfigDoc | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isProfilesLoaded, setIsProfilesLoaded] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Testa conectividade no boot
  useEffect(() => {
    testConnection();
  }, []);

  // Monitora autenticação do Firebase Auth
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      setError(null);

      if (!user) {
        setUserAccount(null);
        setUserProfiles([]);
        setActiveProfile(null);
        setIsAdmin(false);
        setIsOwner(false);
        setAdminRole(null);
        setSystemConfig(null);
        setIsLoading(false);
        setIsProfilesLoaded(true);
        return;
      }

      try {
        setIsLoading(true);

        // 1. Consulta governança central em /system/config (apenas leitura das diretivas públicas de versão e posse)
        const systemConfigRef = doc(db, 'system', 'config');
        const sysSnap = await getDoc(systemConfigRef);

        if (sysSnap.exists()) {
          setSystemConfig(sysSnap.data() as SystemConfigDoc);
        } else {
          setSystemConfig(null);
        }

        // 2. Consulta credencial em /admins/{uid}
        let userRole: AdminRole | null = null;
        let userIsOwner = false;
        let userIsAdmin = false;

        try {
          const adminDocRef = doc(db, 'admins', user.uid);
          const adminSnap = await getDoc(adminDocRef);

          if (adminSnap.exists()) {
            const data = adminSnap.data() as AdminDoc;
            userRole = data.role;
            const matchesSystemOwner = sysSnap?.exists() && (sysSnap.data() as SystemConfigDoc).ownerUid === user.uid;
            userIsOwner = data.role === 'OWNER' && matchesSystemOwner;
            userIsAdmin = userIsOwner || data.role === 'ADMIN';
          } else {
            userRole = null;
            userIsOwner = false;
            userIsAdmin = false;
          }
        } catch {
          // Permissão negada ou não existe doc: usuário comum
          userRole = null;
          userIsOwner = false;
          userIsAdmin = false;
        }

        setAdminRole(userRole);
        setIsOwner(userIsOwner);
        setIsAdmin(userIsAdmin);

        // 3. Carrega ou inicializa perfil cadastral da conta em /users/{uid}
        const userDocRef = doc(db, 'users', user.uid);
        const userSnap = await getDoc(userDocRef);
        if (userSnap.exists()) {
          setUserAccount(userSnap.data() as UserAccount);
        } else {
          const newAccount: UserAccount = {
            uid: user.uid,
            name: user.displayName || user.email?.split('@')[0] || 'Usuário NutriRede',
            email: user.email || '',
            createdAt: new Date().toISOString(),
            accountStatus: 'ACTIVE'
          };
          try {
            await setDoc(userDocRef, newAccount);
            setUserAccount(newAccount);
          } catch (writeErr) {
            console.error('Erro ao inicializar perfil de usuário:', writeErr);
          }
        }
      } catch (err: unknown) {
        console.error('Erro ao carregar contexto de usuário:', err);
        setError('Não foi possível carregar os dados cadastrais.');
      } finally {
        setIsLoading(false);
      }
    });

    return () => unsubscribeAuth();
  }, []);

  // Monitora em tempo real os perfis do usuário atual
  useEffect(() => {
    if (!currentUser) return;

    const profilesQuery = query(
      collection(db, 'profiles'),
      where('userId', '==', currentUser.uid)
    );

    const unsubscribeProfiles = onSnapshot(
      profilesQuery,
      (snapshot) => {
        const loadedProfiles: UserProfileDoc[] = [];
        snapshot.forEach((docItem) => {
          loadedProfiles.push(docItem.data() as UserProfileDoc);
        });

        // Ordena por tipo
        loadedProfiles.sort((a, b) => a.profileType.localeCompare(b.profileType));
        setUserProfiles(loadedProfiles);

        // Atualiza ou seleciona o perfil ativo
        setActiveProfile((prev) => {
          if (!prev) {
            const firstApproved = loadedProfiles.find((p) => p.status === 'APROVADO');
            return firstApproved || loadedProfiles[0] || null;
          }
          const updated = loadedProfiles.find((p) => p.id === prev.id);
          return updated || loadedProfiles[0] || null;
        });
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, 'profiles');
      }
    );

    return () => unsubscribeProfiles();
  }, [currentUser]);

  // Alterna o perfil ativo
  const switchActiveProfileType = (type: ProfileType) => {
    const target = userProfiles.find((p) => p.profileType === type);
    if (target) {
      setActiveProfile(target);
    }
  };

  // Solicita um novo perfil adicional para a conta existente
  const requestAdditionalProfile = async (type: ProfileType) => {
    if (!currentUser || !userAccount) {
      throw new Error('Usuário precisa estar autenticado para solicitar perfil.');
    }

    const profileId = `${currentUser.uid}_${type}`;
    const newProfile: UserProfileDoc = {
      id: profileId,
      userId: currentUser.uid,
      userName: userAccount.name,
      userEmail: userAccount.email,
      userPhone: userAccount.phone || '',
      profileType: type,
      status: 'PENDENTE',
      requestedAt: new Date().toISOString()
    };

    try {
      await setDoc(doc(db, 'profiles', profileId), newProfile);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `profiles/${profileId}`);
    }
  };

  const reloadUserData = async () => {
    if (!currentUser) return;
    try {
      const userSnap = await getDoc(doc(db, 'users', currentUser.uid));
      if (userSnap.exists()) {
        setUserAccount(userSnap.data() as UserAccount);
      }
      const q = query(collection(db, 'profiles'), where('userId', '==', currentUser.uid));
      const profilesSnap = await getDocs(q);
      const list: UserProfileDoc[] = [];
      profilesSnap.forEach((d) => list.push(d.data() as UserProfileDoc));
      setUserProfiles(list);
    } catch (e) {
      console.error('Erro ao recarregar dados:', e);
    }
  };

  const logout = async () => {
    await signOut(auth);
    setCurrentUser(null);
    setUserAccount(null);
    setUserProfiles([]);
    setActiveProfile(null);
    setIsAdmin(false);
    setIsOwner(false);
    setAdminRole(null);
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        userAccount,
        userProfiles,
        activeProfile,
        isAdmin,
        isOwner,
        adminRole,
        systemConfig,
        isLoading,
        error,
        setActiveProfile,
        switchActiveProfileType,
        requestAdditionalProfile,
        reloadUserData,
        logout
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider');
  }
  return context;
};
