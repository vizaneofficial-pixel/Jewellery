import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { onAuthStateChanged, signInWithPopup, signOut, type User } from 'firebase/auth';
import { auth, firebaseConfigStatus, googleProvider } from '../firebase';
import {
  addAiMemory,
  clearAllAiMemories,
  deleteAiMemory,
  ensureUserProfile,
  loadActiveWorkspace,
  loadAiMemories,
  saveActiveWorkspace,
  updateAiMemory,
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
import {
  BLUEPRINT_LIMITS,
  clampStr,
  formatAuthOrSyncError,
  resolvePreferredName,
} from '../utils/accountHelpers';

export type CloudSyncStatus = 'guest' | 'loading' | 'saving' | 'saved' | 'error';

interface AuthContextValue {
  authReady: boolean;
  isFirebaseConfigured: boolean;
  configError: string | null;
  user: User | null;
  profile: UserProfile | null;
  memories: AiMemoryItem[];
  accountContext: AccountAiContext | undefined;
  syncStatus: CloudSyncStatus;
  authError: string | null;
  signingIn: boolean;
  signInWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  retryCloudSync: () => Promise<void>;
  updateMerchantProfile: (updates: {
    preferredName: string;
    businessName: string;
    preferredScale: string;
  }) => Promise<void>;
  addMemory: (fact: string, category: AiMemoryCategory, source: 'voice' | 'command' | 'manual') => Promise<void>;
  addMemoriesBatch: (items: AiMemoryAddition[], source: 'voice' | 'command' | 'manual') => Promise<void>;
  editMemory: (memoryId: string, updates: { fact: string; category: AiMemoryCategory }) => Promise<void>;
  removeMemory: (memoryId: string) => Promise<void>;
  clearAllMemories: () => Promise<void>;
  syncWorkspace: (snapshot: PlannerSnapshot) => Promise<void>;
  registerWorkspaceHydrator: (cb: (snapshot: PlannerSnapshot) => void) => void;
  registerWorkspaceResetter: (cb: () => void) => void;
  clearAuthError: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [authReady, setAuthReady] = useState(!firebaseConfigStatus.isConfigured);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [memories, setMemories] = useState<AiMemoryItem[]>([]);
  const [syncStatus, setSyncStatus] = useState<CloudSyncStatus>('guest');
  const [authError, setAuthError] = useState<string | null>(null);
  const [signingIn, setSigningIn] = useState(false);

  const hydratorRef = useRef<((snapshot: PlannerSnapshot) => void) | null>(null);
  const resetterRef = useRef<(() => void) | null>(null);
  const lastLoadedUidRef = useRef<string | null>(null);

  const registerWorkspaceHydrator = useCallback((cb: (snapshot: PlannerSnapshot) => void) => {
    hydratorRef.current = cb;
  }, []);

  const registerWorkspaceResetter = useCallback((cb: () => void) => {
    resetterRef.current = cb;
  }, []);

  const hydrateForUser = useCallback(async (targetUser: User) => {
    setSyncStatus('loading');
    setAuthError(null);

    if (!targetUser.emailVerified) {
      setProfile({
        uid: targetUser.uid,
        email: targetUser.email || '',
        displayName: targetUser.displayName || 'Merchant',
        preferredName: '',
        photoURL: targetUser.photoURL || '',
        businessName: '',
        preferredScale: 'Exhibition Stall',
      });
      setMemories([]);
      setSyncStatus('error');
      setAuthError(
        'Your Google account email is not marked verified, so cloud saves are paused. Verify your email or continue in local preview.'
      );
      return;
    }

    try {
      const [loadedProfile, loadedMemories, savedWorkspace] = await Promise.all([
        ensureUserProfile(targetUser),
        loadAiMemories(targetUser.uid),
        loadActiveWorkspace(targetUser.uid),
      ]);
      setProfile(loadedProfile);
      setMemories(loadedMemories);
      if (savedWorkspace && hydratorRef.current) {
        hydratorRef.current(savedWorkspace);
      } else {
        resetterRef.current?.();
      }
      setSyncStatus('saved');
    } catch (err) {
      const hostname = typeof window !== 'undefined' ? window.location.hostname : '';
      setSyncStatus('error');
      setAuthError(formatAuthOrSyncError(err, hostname));
    }
  }, []);

  useEffect(() => {
    if (!firebaseConfigStatus.isConfigured || !auth) {
      setAuthReady(true);
      return;
    }

    const unsub = onAuthStateChanged(auth, async (nextUser) => {
      if (!nextUser) {
        const hadUser = Boolean(lastLoadedUidRef.current);
        lastLoadedUidRef.current = null;
        setUser(null);
        setProfile(null);
        setMemories([]);
        setSyncStatus('guest');
        if (hadUser) {
          resetterRef.current?.();
        }
        setAuthReady(true);
        return;
      }

      if (lastLoadedUidRef.current && lastLoadedUidRef.current !== nextUser.uid) {
        resetterRef.current?.();
      }
      lastLoadedUidRef.current = nextUser.uid;
      setUser(nextUser);
      await hydrateForUser(nextUser);
      setAuthReady(true);
    });

    return () => unsub();
  }, [hydrateForUser]);

  const signInWithGoogle = useCallback(async () => {
    if (!firebaseConfigStatus.isConfigured || !auth || !googleProvider) {
      setAuthError(
        firebaseConfigStatus.configError ||
          'Firebase Authentication is not configured for this environment.'
      );
      return;
    }
    setSigningIn(true);
    setAuthError(null);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      const code = (err as { code?: string })?.code || '';
      if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
        return;
      }
      const hostname = typeof window !== 'undefined' ? window.location.hostname : '';
      setAuthError(formatAuthOrSyncError(err, hostname));
    } finally {
      setSigningIn(false);
    }
  }, []);

  const logout = useCallback(async () => {
    setAuthError(null);
    lastLoadedUidRef.current = null;
    setProfile(null);
    setMemories([]);
    setSyncStatus('guest');
    resetterRef.current?.();
    if (auth) {
      await signOut(auth);
    }
  }, []);

  const retryCloudSync = useCallback(async () => {
    if (!user) return;
    await hydrateForUser(user);
  }, [user, hydrateForUser]);

  const updateMerchantProfile = useCallback(
    async (updates: { preferredName: string; businessName: string; preferredScale: string }) => {
      if (!user) return;
      setSyncStatus('saving');
      setAuthError(null);
      try {
        await updateBusinessProfile(user.uid, updates);
        setProfile((prev) =>
          prev
            ? {
                ...prev,
                preferredName: clampStr(updates.preferredName, BLUEPRINT_LIMITS.MAX_PREFERRED_NAME_LEN, ''),
                businessName: clampStr(updates.businessName, BLUEPRINT_LIMITS.MAX_BUSINESS_NAME_LEN, ''),
                preferredScale:
                  clampStr(updates.preferredScale, BLUEPRINT_LIMITS.MAX_PREFERRED_SCALE_LEN, '') ||
                  prev.preferredScale,
              }
            : prev
        );
        setSyncStatus('saved');
      } catch (err) {
        setSyncStatus('error');
        setAuthError(formatAuthOrSyncError(err));
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
        setAuthError(formatAuthOrSyncError(err));
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
        setAuthError(formatAuthOrSyncError(err));
      }
    },
    [user, memories]
  );

  const editMemory = useCallback(
    async (memoryId: string, updates: { fact: string; category: AiMemoryCategory }) => {
      if (!user) return;
      setSyncStatus('saving');
      try {
        const saved = await updateAiMemory(user.uid, memoryId, updates);
        if (saved) {
          setMemories((prev) =>
            prev.map((m) =>
              m.id === memoryId
                ? {
                    ...m,
                    fact: saved.fact,
                    category: saved.category,
                    updatedAtMs: saved.updatedAtMs,
                  }
                : m
            )
          );
        }
        setSyncStatus('saved');
      } catch (err) {
        setSyncStatus('error');
        setAuthError(formatAuthOrSyncError(err));
      }
    },
    [user]
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
        setAuthError(formatAuthOrSyncError(err));
      }
    },
    [user]
  );

  const clearAllMemories = useCallback(async () => {
    if (!user) return;
    setSyncStatus('saving');
    try {
      await clearAllAiMemories(user.uid);
      setMemories([]);
      setSyncStatus('saved');
    } catch (err) {
      setSyncStatus('error');
      setAuthError(formatAuthOrSyncError(err));
    }
  }, [user]);

  const syncWorkspace = useCallback(
    async (snapshot: PlannerSnapshot) => {
      if (!user) return;
      setSyncStatus('saving');
      try {
        await saveActiveWorkspace(user.uid, snapshot);
        setSyncStatus('saved');
      } catch (err) {
        setSyncStatus('error');
        setAuthError(formatAuthOrSyncError(err));
      }
    },
    [user]
  );

  const accountContext: AccountAiContext | undefined = useMemo(() => {
    if (!user || !profile) return undefined;
    return {
      preferredName: resolvePreferredName(profile),
      displayName: profile.displayName,
      businessName: profile.businessName || undefined,
      preferredScale: profile.preferredScale || undefined,
      memories: memories.slice(0, 20).map((m) => ({
        fact: m.fact,
        category: m.category,
      })),
    };
  }, [user, profile, memories]);

  const clearAuthError = useCallback(() => setAuthError(null), []);

  const value = useMemo<AuthContextValue>(
    () => ({
      authReady,
      isFirebaseConfigured: firebaseConfigStatus.isConfigured,
      configError: firebaseConfigStatus.configError,
      user,
      profile,
      memories,
      accountContext,
      syncStatus,
      authError,
      signingIn,
      signInWithGoogle,
      logout,
      retryCloudSync,
      updateMerchantProfile,
      addMemory,
      addMemoriesBatch,
      editMemory,
      removeMemory,
      clearAllMemories,
      syncWorkspace,
      registerWorkspaceHydrator,
      registerWorkspaceResetter,
      clearAuthError,
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
      retryCloudSync,
      updateMerchantProfile,
      addMemory,
      addMemoriesBatch,
      editMemory,
      removeMemory,
      clearAllMemories,
      syncWorkspace,
      registerWorkspaceHydrator,
      registerWorkspaceResetter,
      clearAuthError,
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
