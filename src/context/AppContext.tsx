import React, { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { storage } from '../backend/utils/storage';
import type { User, Community, PrivacySettings, PublicDonorProfile } from '../backend/types';
import { authService } from '../backend/services/authService';
import { communityService } from '../backend/services/communityService';
import { rankingService } from '../backend/services/rankingService';
import { usersApi, type UpdateMeInput } from '../api/usersApi';
import SplashScreen from '../components/ui/SplashScreen';

/** Tempo mínimo de exibição do splash, para a barra de progresso ser visível. */
const SPLASH_MIN_MS = 2600;
const STORIES_KEY = 'stories_v1';

interface AppContextType {
  isAuthenticated: boolean;
  user: User | null;
  /** Nova autenticação por email/senha — usa MockAuthProvider */
  signIn: (email: string, password: string) => Promise<void>;
  /** Login Google simulado — recebe o usuário escolhido no modal DEV */
  signInWithGoogle: (selectedUser: User) => Promise<void>;
  /** Encerra a sessão e limpa os dados locais do usuário */
  logout: () => Promise<void>;
  /** Recarrega o usuário da sessão local — usado por Register.tsx após cadastro */
  fetchSession: () => Promise<void>;
  communities: Community[];
  selectedCommunity: Community | null;
  setSelectedCommunity: (community: Community) => void;
  updateUserPrivacy: (settings: Partial<PrivacySettings>) => Promise<void>;
  updateUserProfile: (updates: Partial<User>) => Promise<void>;
  selectedRegion: string | null;
  setSelectedRegion: (region: string | null) => void;
  clearSelectedRegion: () => void;
  /** Alterna o estado "salvo" de uma família para o usuário logado (Mapa) */
  toggleSavedFamily: (familyId: string) => Promise<void>;
  /** Carrossel de stories (top 20 doadores) — editável pelo admin, persistido localmente */
  stories: PublicDonorProfile[];
  /** Substitui a lista de stories (usado pelo painel admin) */
  updateStories: (next: PublicDonorProfile[]) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isInitializing, setIsInitializing] = useState(true);
  const [showSplash, setShowSplash] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<User | null>(null);

  const [communities, setCommunities] = useState<Community[]>([]);
  const [selectedCommunity, setSelectedCommunity] = useState<Community | null>(null);
  const [selectedRegion, setSelectedRegionState] = useState<string | null>(null);

  // Stories (top 20) — vêm do ranking real (GET /ranking) e ficam em cache
  // local só para o carrossel não piscar entre sessões. O default é VAZIO:
  // semear com doadores fictícios os exibia como se fossem apoiadores reais.
  const [stories, setStoriesState] = useState<PublicDonorProfile[]>(
    () => storage.get<PublicDonorProfile[]>(STORIES_KEY, [])
  );

  const updateStories = (next: PublicDonorProfile[]) => {
    setStoriesState(next);
    storage.set(STORIES_KEY, next);
  };

  /**
   * Carrega as regiões onde a rede atua. Exige sessão.
   *
   * Falha própria em vez de derrubar quem chamou: sem a lista o app continua
   * utilizável — o doador só não vê o seletor de região preenchido.
   */
  const loadCommunities = async (): Promise<void> => {
    try {
      const comms = await communityService.getCommunities();
      setCommunities(comms);
      setSelectedCommunity(comms[0] || null);
    } catch (err) {
      console.error('Não foi possível carregar as regiões', err);
    }
  };

  useEffect(() => {
    const start = Date.now();
    const initApp = async () => {
      try {
        const sessionUser = await authService.getCurrentSession();
        if (sessionUser) {
          setIsAuthenticated(true);
          setUser(sessionUser);
          if (sessionUser.role === 'donor' && sessionUser.impactPreferences?.preferredRegion) {
            setSelectedRegionState(sessionUser.impactPreferences.preferredRegion);
          }
        }
        // Só com sessão: a lista de regiões vem de endpoint autenticado, e
        // pedi-la deslogado devolvia 401 e abortava o resto desta função —
        // o ranking abaixo nem chegava a ser buscado na tela de login.
        if (sessionUser) await loadCommunities();

        // Atualiza stories a partir do backend (não-bloqueante — falha silenciosa).
        // Aplica o resultado mesmo VAZIO: se ninguém optou por aparecer no
        // ranking, o carrossel deve esvaziar em vez de manter nomes antigos.
        rankingService.getTopDonors().then((donors) => {
          updateStories(donors);
        }).catch(() => {});
      } catch (err) {
        console.error('Erro inicializando app', err);
      } finally {
        // Mantém o splash por um tempo mínimo para a barra de progresso ser vista.
        const elapsed = Date.now() - start;
        const wait = Math.max(0, SPLASH_MIN_MS - elapsed);
        setTimeout(() => {
          setIsInitializing(false);        // dispara a barra -> 100%
          setTimeout(() => setShowSplash(false), 600); // aguarda o fade-out
        }, wait);
      }
    };
    initApp();
  }, []);

  // ─── Helpers de sessão ───────────────────────────────────────────────────

  const applySession = (loggedUser: User) => {
    if (!loggedUser.privacySettings) {
      loggedUser.privacySettings = { showOnRanking: true, showInstagram: true, anonymousMode: false };
    }
    setUser(loggedUser);
    setIsAuthenticated(true);
    if (loggedUser.role === 'donor' && loggedUser.impactPreferences?.preferredRegion) {
      setSelectedRegionState(loggedUser.impactPreferences.preferredRegion);
    }
    // Agora há sessão: é aqui que as regiões podem ser buscadas. Sem isto,
    // quem entra sem recarregar a página fica com a lista vazia.
    void loadCommunities();
  };

  // ─── Nova autenticação — delegada ao MockAuthProvider via authService ────

  const signIn = async (email: string, password: string): Promise<void> => {
    const loggedUser = await authService.signInWithEmail(email, password);
    applySession(loggedUser);
  };

  const signInWithGoogle = async (selectedUser: User): Promise<void> => {
    const loggedUser = await authService.signInWithGoogle(selectedUser);
    applySession(loggedUser);
  };

  // ─── Sessão e logout ────────────────────────────────────────────────────

  const fetchSession = async (): Promise<void> => {
    const sessionUser = await authService.getCurrentSession();
    if (sessionUser) {
      setUser(sessionUser);
      setIsAuthenticated(true);
    }
  };

  const logout = async (): Promise<void> => {
    await authService.logout();
    setUser(null);
    setIsAuthenticated(false);
    setSelectedRegionState(null);
  };

  // ─── Região e privacidade ───────────────────────────────────────────────

  const setSelectedRegion = async (region: string | null) => {
    setSelectedRegionState(region);
    if (user && user.role === 'donor') {
      const newPreferences = { ...user.impactPreferences, preferredRegion: region || undefined };
      try {
        await usersApi.updateImpactPreferences(newPreferences);
      } catch (e) {
        console.warn('Failed to save preference in API', e);
      }
      const newUser = { ...user, impactPreferences: newPreferences };
      setUser(newUser);
      const users = storage.get<User[]>('users_db', []);
      const idx = users.findIndex((u) => u.id === user.id);
      if (idx !== -1) {
        users[idx] = newUser;
        storage.set('users_db', users);
      }
      storage.set('current_user', newUser);
    }
  };

  const clearSelectedRegion = () => setSelectedRegion(null);

  const updateUserPrivacy = async (settings: Partial<PrivacySettings>): Promise<void> => {
    if (!user) return;
    const newSettings = { ...user.privacySettings!, ...settings };
    const newUser = { ...user, privacySettings: newSettings };
    // Atualiza local imediatamente (otimista)
    setUser(newUser);
    storage.set('current_user', newUser);
    // Persiste no backend
    try {
      await usersApi.updatePrivacy(newSettings);
    } catch (e) {
      console.warn('[AppContext] Falha ao salvar privacidade no backend:', e);
    }
  };

  /**
   * Atualiza o perfil: aplica local na hora (otimista) e persiste no backend.
   *
   * Só os campos que o backend modela vão para `PATCH /me` — `avatar` do front
   * corresponde a `avatarUrl` na API. Preferências que a API ainda não guarda
   * (missão pessoal, famílias salvas, preferências de impacto) seguem só locais,
   * e `privacySettings` tem endpoint próprio.
   */
  const updateUserProfile = async (updates: Partial<User>): Promise<void> => {
    if (!user) return;
    const newUser = { ...user, ...updates };
    setUser(newUser);
    const users = storage.get<User[]>('users_db', []);
    const idx = users.findIndex((u) => u.id === user.id);
    if (idx !== -1) {
      users[idx] = newUser;
      storage.set('users_db', users);
    }
    storage.set('current_user', newUser);

    // ── Persistência no backend ──
    const remote: UpdateMeInput = {};
    if ('name' in updates) remote.name = updates.name;
    // `undefined` no front significa "remover" — a API espera null explícito.
    if ('avatar' in updates) remote.avatarUrl = updates.avatar ?? null;
    if ('instagram' in updates) remote.instagram = updates.instagram ?? null;
    if ('phone' in updates) remote.phone = updates.phone ?? null;

    if (Object.keys(remote).length > 0) {
      try {
        await usersApi.updateMe(remote);
      } catch (e) {
        console.warn('[AppContext] Falha ao salvar perfil no backend:', e);
      }
    }

    if (updates.privacySettings) {
      try {
        await usersApi.updatePrivacy(updates.privacySettings);
      } catch (e) {
        console.warn('[AppContext] Falha ao salvar privacidade no backend:', e);
      }
    }
  };

  const toggleSavedFamily = async (familyId: string): Promise<void> => {
    if (!user) return;
    const current = user.savedFamilyIds || [];
    const savedFamilyIds = current.includes(familyId)
      ? current.filter((id) => id !== familyId)
      : [...current, familyId];
    await updateUserProfile({ savedFamilyIds });
  };

  if (showSplash) {
    return <SplashScreen isLoaded={!isInitializing} />;
  }

  return (
    <AppContext.Provider
      value={{
        isAuthenticated,
        user,
        signIn,
        signInWithGoogle,
        logout,
        fetchSession,
        communities,
        selectedCommunity,
        setSelectedCommunity,
        updateUserPrivacy,
        updateUserProfile,
        selectedRegion,
        setSelectedRegion,
        clearSelectedRegion,
        toggleSavedFamily,
        stories,
        updateStories,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};
