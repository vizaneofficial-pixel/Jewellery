import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { onAuthStateChanged, signInWithPopup, signOut, type User } from 'firebase/auth';
import { auth, googleProvider } from '../firebase';
import {
  addAiMemory,
  deleteAiMemory,
  ensureUserProfile,
  loadActiveWorkspace,
  loadAiMemories,
  saveActiveWorkspace,
  updateBusinessProfile,
} from '../services/userWorkspaceService';
import type {
  AccountAiContext,
  AiMemoryAddition,
  AiMemoryCategory,
  AiMemoryItem,
  PlannerSnapshot,
  UserProfile,
} from '../types/stall';

export type CloudSyncStatus = 'guest' | 'loading' | 'saving' | 'saved' | 'error';

interface AuthContextValue {
  authReady: boolean;
  user: User | null;
  profile: UserProfile | null;
  memories: AiMemoryItem[];
  accountContext: AccountAiContext | undefined;
  syncStatus: CloudSyncStatus;
  authError: string | null;
  signingIn: boolean;
  signInWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  updateMerchantProfile: (updates: { businessName: string; preferredScale: string }) => Promise<void>;
  addMemory: (fact: string, category: AiMemoryCategory, source: 'voice' | 'command' | 'manual') => Promise<void>;
  addMemoriesBatch: (items: AiMemoryAddition[], source: 'voice' | 'command' | 'manual') => Promise<void>;
  removeMemory: (memoryId: string) => Promise<void>;
  syncWorkspace: (snapshot: PlannerSnapshot) => Promise<void>;
  registerWorkspaceHydrator: (cb: (snapshot: PlannerSnapshot) => void) => void;
  clearAuthError: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [authReady, setAuthReady] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [memories, setMemories] = useState<AiMemoryItem[]>([]);
  const [syncStatus, setSyncStatus] = useState<CloudSyncStatus>('guest');
  const [authError, setAuthError] = useState<string | null>(null);
  const [signingIn, setSigningIn] = useState(false);

  const hydratorRef = useRef<((snapshot: PlannerSnapshot) => void) | null>(null);

  const registerWorkspaceHydrator = useCallback((cb: (snapshot: PlannerSnapshot) => void) => {
    hydratorRef.current = cb;
  }, []);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (nextUser) => {
      setUser(nextUser);
      if (!nextUser) {
        setProfile(null);
        setMemories([]);
        setSyncStatus('guest');
        setAuthReady(true);
        return;
      }

      setSyncStatus('loading');
      setAuthError(null);
      try {
        const [loadedProfile, loadedMemories, savedWorkspace] = await Promise.all([
          ensureUserProfile(nextUser),
          loadAiMemories(nextUser.uid),
          loadActiveWorkspace(nextUser.uid),
        ]);
        setProfile(loadedProfile);
        setMemories(loadedMemories);
        if (savedWorkspace && hydratorRef.current) {
          hydratorRef.current(savedWorkspace);
        }
        setSyncStatus('saved');
      } catch (err) {
        setSyncStatus('error');
        setAuthError(
          err instanceof Error ? err.message : 'Unable to sync your Google account workspace.'
        );
      } finally {
        setAuthReady(true);
      }
    });

    return () => unsub();
  }, []);

  const signInWithGoogle = useCallback(async () => {
    setSigningIn(true);
    setAuthError(null);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      const code = (err as { code?: string })?.code || '';
      if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
        return;
      }
      if (code === 'auth/popup-blocked') {
        setAuthError('Popup was blocked by your browser. Please allow popups and try again.');
        return;
      }
      setAuthError(err instanceof Error ? err.message : 'Google Sign-In failed.');
    } finally {
      setSigningIn(false);
    }
  }, []);

  const logout = useCallback(async () => {
    setAuthError(null);
    await signOut(auth);
  }, []);

  const updateMerchantProfile = useCallback(
    async (updates: { businessName: string; preferredScale: string }) => {
      if (!user) return;
      setSyncStatus('saving');
      try {
        await updateBusinessProfile(user.uid, updates);
        setProfile((prev) =>
          prev
            ? {
                ...prev,
                businessName: updates.businessName.trim().slice(0, 120),
                preferredScale: updates.preferredScale.trim().slice(0, 60) || prev.preferredScale,
              }
            : prev
        );
        setSyncStatus('saved');
      } catch (err) {
        setSyncStatus('error');
        setAuthError(err instanceof Error ? err.message : 'Failed to update profile.');
      }
    },
    [user]
  );

  const addMemory = useCallback(
    async (fact: string, category: AiMemoryCategory, source: 'voice' | 'command' | 'manual') => {
      if (!user) return;
      const normalized = fact.trim().toLowerCase();
      if (!normalized) return;
      const duplicate = memories.some((m) => m.fact.trim().toLowerCase() === normalized);
      if (duplicate) return;

      setSyncStatus('saving');
      try {
        const created = await addAiMemory(user.uid, { fact, category, source });
        if (created) {
          setMemories((prev) => [created, ...prev].slice(0, 40));
        }
        setSyncStatus('saved');
      } catch (err) {
        setSyncStatus('error');
        setAuthError(err instanceof Error ? err.message : 'Failed to save AI memory.');
      }
    },
    [user, memories]
  );

  const addMemoriesBatch = useCallback(
    async (items: AiMemoryAddition[], source: 'voice' | 'command' | 'manual') => {
      if (!user || items.length === 0) return;
      const existingSet = new Set(memories.map((m) => m.fact.trim().toLowerCase()));
      const fresh = items.filter((item) => {
        const k = item.fact.trim().toLowerCase();
        if (!k || existingSet.has(k)) return false;
        existingSet.add(k);
        return true;
      });
      if (fresh.length === 0) return;

      setSyncStatus('saving');
      try {
        const createdList = await Promise.all(
          fresh.map((item) =>
            addAiMemory(user.uid, {
              fact: item.fact,
              category: item.category,
              source,
            })
          )
        );
        const valid = createdList.filter((x): x is AiMemoryItem => Boolean(x));
        if (valid.length > 0) {
          setMemories((prev) => [...valid, ...prev].slice(0, 40));
        }
        setSyncStatus('saved');
      } catch (err) {
        setSyncStatus('error');
        setAuthError(err instanceof Error ? err.message : 'Failed to save AI memories.');
      }
    },
    [user, memories]
  );

  const removeMemory = useCallback(
    async (memoryId: string) => {
      if (!user) return;
      setSyncStatus('saving');
      try {
        await deleteAiMemory(user.uid, memoryId);
        setMemories((prev) => prev.filter((m) => m.id !== memoryId));
        setSyncStatus('saved');
      } catch (err) {
        setSyncStatus('error');
        setAuthError(err instanceof Error ? err.message : 'Failed to delete AI memory.');
      }
    },
    [user]
  );

  const syncWorkspace = useCallback(
    async (snapshot: PlannerSnapshot) => {
      if (!user) return;
      setSyncStatus('saving');
      try {
        await saveActiveWorkspace(user.uid, snapshot);
        setSyncStatus('saved');
      } catch (err) {
        setSyncStatus('error');
        setAuthError(err instanceof Error ? err.message : 'Failed to sync workspace.');
      }
    },
    [user]
  );

  const accountContext: AccountAiContext | undefined = useMemo(() => {
    if (!user || !profile) return undefined;
    return {
      displayName: profile.displayName,
      businessName: profile.businessName || undefined,
      preferredScale: profile.preferredScale || undefined,
      memories: memories.slice(0, 20).map((m) => ({
        fact: m.fact,
        category: m.category,
      })),
    };
  }, [user, profile, memories]);

  const value = useMemo<AuthContextValue>(
    () => ({
      authReady,
      user,
      profile,
      memories,
      accountContext,
      syncStatus,
      authError,
      signingIn,
      signInWithGoogle,
      logout,
      updateMerchantProfile,
      addMemory,
      addMemoriesBatch,
      removeMemory,
      syncWorkspace,
      registerWorkspaceHydrator,
      clearAuthError: () => setAuthError(null),
    }),
    [
      authReady,
      user,
      profile,
      memories,
      accountContext,
      syncStatus,
      authError,
      signingIn,
      signInWithGoogle,
      logout,
      updateMerchantProfile,
      addMemory,
      addMemoriesBatch,
      removeMemory,
      syncWorkspace,
      registerWorkspaceHydrator,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used inside AuthProvider');
  }
  return ctx;
}
