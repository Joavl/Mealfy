import React, { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { storage } from '../backend/utils/storage';
import type { User, Community, UserRole, PrivacySettings } from '../backend/types';
import { authService } from '../backend/services/authService';
import { communityService } from '../backend/services/communityService';
import { usersApi } from '../api/usersApi';
import { AppLoadingScreen } from '../components/ui/AppLoadingScreen';
import { useAppInitialization } from '../hooks/useAppInitialization';

interface AppContextType {
  isAuthenticated: boolean;
  user: User | null;
  login: (method: 'google'|'apple'|'phone'|'facebook', role?: UserRole) => Promise<void>;
  loginAsRole: (role: UserRole, identifier: string, password?: string) => Promise<void>;
  logout: () => Promise<void>;
  fetchSession: () => Promise<void>;
  communities: Community[];
  selectedCommunity: Community | null;
  setSelectedCommunity: (community: Community) => void;
  updateUserPrivacy: (settings: Partial<PrivacySettings>) => Promise<void>;
  selectedRegion: string | null;
  setSelectedRegion: (region: string | null) => void;
  clearSelectedRegion: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { status, setStatus, isAppReady, initializationComplete } = useAppInitialization();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  
  const [communities, setCommunities] = useState<Community[]>([]);
  const [selectedCommunity, setSelectedCommunity] = useState<Community | null>(null);
  const [selectedRegion, setSelectedRegionState] = useState<string | null>(null);

  useEffect(() => {
    const initApp = async () => {
      try {
        // Fetch session
        const sessionUser = await authService.getCurrentSession();
        if (sessionUser) {
          setIsAuthenticated(true);
          setUser(sessionUser);
          if (sessionUser.role === 'donor' && sessionUser.impactPreferences?.preferredRegion) {
            setSelectedRegionState(sessionUser.impactPreferences.preferredRegion);
          }
        }

        // Fetch initial communities
        const comms = await communityService.getCommunities();
        setCommunities(comms);
        setSelectedCommunity(comms[0] || null);

      } catch (err) {
        console.error("Erro carregando dados de sessão/comunidades", err);
      }
    };

    initApp();
  }, []);

  const fetchSession = async () => {
    const sessionUser = await authService.getCurrentSession();
    setUser(sessionUser);
    setIsAuthenticated(Boolean(sessionUser));
    if (sessionUser?.role === 'donor' && sessionUser.impactPreferences?.preferredRegion) {
      setSelectedRegionState(sessionUser.impactPreferences.preferredRegion);
    }
  };

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
      
      const USERS_KEY = 'users_db';
      const users = storage.get<User[]>(USERS_KEY, []);
      const idx = users.findIndex(u => u.id === user.id);
      if (idx !== -1) {
        users[idx] = newUser;
        storage.set(USERS_KEY, users);
      }
      storage.set('current_user', newUser);
    }
  };

  const clearSelectedRegion = () => setSelectedRegion(null);

  const login = async (method: 'google'|'apple'|'phone'|'facebook', role: UserRole = 'donor') => {
    let loggedUser: User;
    if (method === 'google') loggedUser = await authService.loginWithGoogle(role);
    else if (method === 'apple') loggedUser = await authService.loginWithGoogle(role);
    else if (method === 'facebook') loggedUser = await authService.loginWithGoogle(role);
    else loggedUser = await authService.loginWithGoogle(role);

    if (!loggedUser.privacySettings) {
      loggedUser.privacySettings = { showOnRanking: true, showInstagram: true, anonymousMode: false };
    }

    setUser(loggedUser);
    setIsAuthenticated(true);
    if (loggedUser.role === 'donor' && loggedUser.impactPreferences?.preferredRegion) {
      setSelectedRegionState(loggedUser.impactPreferences.preferredRegion);
    }
  };

  const loginAsRole = async (role: UserRole, identifier: string, password?: string) => {
    const loggedUser = await authService.loginAsRole(role, identifier, password);
    
    if (!loggedUser.privacySettings) {
      loggedUser.privacySettings = { showOnRanking: true, showInstagram: true, anonymousMode: false };
    }

    setUser(loggedUser);
    setIsAuthenticated(true);
    if (loggedUser.role === 'donor' && loggedUser.impactPreferences?.preferredRegion) {
      setSelectedRegionState(loggedUser.impactPreferences.preferredRegion);
    }
  };

  const updateUserPrivacy = async (settings: Partial<PrivacySettings>) => {
    if (!user) return;
    const newUser = {
      ...user,
      privacySettings: {
        ...user.privacySettings!,
        ...settings
      }
    };
    setUser(newUser);
    const USERS_KEY = 'users_db';
    const users = storage.get<User[]>(USERS_KEY, []);
    const idx = users.findIndex(u => u.id === user.id);
    if (idx !== -1) {
      users[idx] = newUser;
      storage.set(USERS_KEY, users);
    }
    storage.set('current_user', newUser);
  };

  const logout = async () => {
    await authService.logout();
    setUser(null);
    setIsAuthenticated(false);
    setSelectedRegionState(null);
  };

  return (
    <AppContext.Provider
      value={{
        isAuthenticated,
        user,
        login,
        loginAsRole,
        logout,
        fetchSession,
        communities,
        selectedCommunity,
        setSelectedCommunity,
        updateUserPrivacy,
        selectedRegion,
        setSelectedRegion,
        clearSelectedRegion,
      }}
    >
      {isAppReady && children}
      {!initializationComplete && (
        <AppLoadingScreen
          status={status}
          setStatus={setStatus}
          onExitComplete={() => setStatus('complete')}
        />
      )}
    </AppContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useAppContext = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};
