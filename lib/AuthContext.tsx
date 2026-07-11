import React, { createContext, useContext, useEffect, useState } from 'react';
import * as http from './http';
import * as SecureStore from 'expo-secure-store';

type SavedAccount = {
  email: string;
  name: string;
  token: string;
  tenant_id: string;
};

type User = {
  id: string;
  email: string;
  name: string;
  role: string;
  tenant_id: string;
};

type AuthContextType = {
  user: User | null;
  loading: boolean;
  savedAccounts: SavedAccount[];
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  switchAccount: (email: string) => Promise<void>;
  removeSavedAccount: (email: string) => Promise<void>;
  isSuperAdmin: boolean;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);
const SAVED_ACCOUNTS_KEY = 'funnelswift_saved_accounts';

function getSavedAccounts(): SavedAccount[] {
  // This will only work during runtime — we load from SecureStore in useEffect
  return [];
}

async function loadSavedAccounts(): Promise<SavedAccount[]> {
  try {
    const raw = await SecureStore.getItemAsync(SAVED_ACCOUNTS_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return [];
}

async function storeSavedAccounts(accounts: SavedAccount[]) {
  await SecureStore.setItemAsync(SAVED_ACCOUNTS_KEY, JSON.stringify(accounts));
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [savedAccounts, setSavedAccounts] = useState<SavedAccount[]>([]);

  useEffect(() => {
    (async () => {
      try {
        // Load saved accounts
        const accounts = await loadSavedAccounts();
        setSavedAccounts(accounts);

        // Try to restore session from stored token
        const token = await http.getToken();
        if (token) {
          // Find matching account for name
          const matchingAccount = accounts.find(a => a.token === token);
          const me = await http.getMe();
          setUser({
            ...me,
            name: me.name || matchingAccount?.name || me.email,
          });
          setIsSuperAdmin(me.role === 'admin' || me.is_admin === true);
        }
      } catch {
        await http.removeToken();
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function signIn(email: string, password: string) {
    try {
      const result = await http.login(email, password);
      await http.setToken(result.token);

      const userData: User = result.user;
      setUser(userData);
      setIsSuperAdmin(userData.role === 'admin');

      // Add to saved accounts
      const updated = [
        ...savedAccounts.filter(a => a.email !== email),
        { email, name: userData.name || email, token: result.token, tenant_id: userData.tenant_id },
      ];
      setSavedAccounts(updated);
      await storeSavedAccounts(updated);

      return { error: null };
    } catch (err: any) {
      return { error: err };
    }
  }

  async function signOut() {
    await http.removeToken();
    setUser(null);
    setIsSuperAdmin(false);
    // Keep saved accounts on sign out
  }

  async function switchAccount(email: string) {
    const account = savedAccounts.find(a => a.email === email);
    if (!account) return;

    // Set this account's token as active
    await http.setToken(account.token);

    try {
      const me = await http.getMe();
      setUser(me);
      setIsSuperAdmin(me.role === 'admin');
    } catch {
      // Token expired — remove from saved
      await removeSavedAccount(email);
      await http.removeToken();
    }
  }

  async function removeSavedAccount(email: string) {
    const updated = savedAccounts.filter(a => a.email !== email);
    setSavedAccounts(updated);
    await storeSavedAccounts(updated);

    // If we removed the current account, sign out
    if (user?.email === email) {
      await http.removeToken();
      setUser(null);
      setIsSuperAdmin(false);
    }
  }

  return (
    <AuthContext.Provider
      value={{ user, loading, savedAccounts, signIn, signOut, switchAccount, removeSavedAccount, isSuperAdmin }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
