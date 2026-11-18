import type { User } from 'firebase/auth';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import { EXTRA_CATEGORY_STYLES, INITIAL_CATEGORIES } from '../data/defaults';
import { OperationType, db, handleFirestoreError } from '../firebase';
import type {
  AiMemoryCategory,
  AiMemoryItem,
  BangleCategory,
  PlannerSnapshot,
  StallStockItem,
  UserProfile,
} from '../types/stall';

// Validation constants synchronized verbatim with firebase-blueprint.json & firestore.rules
export const BLUEPRINT_LIMITS = {
  MAX_UID_LEN: 128,
  MAX_EMAIL_LEN: 254,
  MAX_DISPLAY_NAME_LEN: 120,
  MAX_PHOTO_URL_LEN: 512,
  MAX_BUSINESS_NAME_LEN: 120,
  MAX_PREFERRED_SCALE_LEN: 60,
  MAX_EVENT_NAME_LEN: 120,
  MIN_FACT_LEN: 2,
  MAX_FACT_LEN: 500,
  MAX_CATEGORIES: 25,
  MAX_STALL_STOCK: 60,
  MAX_COMBO_ID_LEN: 128,
} as const;

const VALID_TABS = new Set(['optimizer', 'calculator', 'strategies']);
const VALID_MEMORY_CATEGORIES = new Set<AiMemoryCategory>([
  'inventory',
  'pricing',
  'event',
  'preference',
  'strategy',
]);

function clampStr(val: string | null | undefined, max: number, fallback = ''): string {
  const s = (val ?? fallback).trim();
  return s.slice(0, max);
}

function clampNum(val: number, min: number, max: number, fallback: number): number {
  const n = Number(val);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

function sanitizeCategories(cats: BangleCategory[]): BangleCategory[] {
  const pool = [
    ...INITIAL_CATEGORIES.map(({ barColor, textClass, bgClass }) => ({ barColor, textClass, bgClass })),
    ...EXTRA_CATEGORY_STYLES,
  ];
  const src = Array.isArray(cats) && cats.length > 0 ? cats : INITIAL_CATEGORIES;
  return src.slice(0, BLUEPRINT_LIMITS.MAX_CATEGORIES).map((c, idx) => {
    const style = pool[idx % pool.length];
    return {
      id: clampStr(c.id, 64, `cat_${idx + 1}`) || `cat_${idx + 1}`,
      name: clampStr(c.name, 80, `Category ${idx + 1}`) || `Category ${idx + 1}`,
      shortName: clampStr(c.shortName, 30, `Cat ${idx + 1}`) || `Cat ${idx + 1}`,
      cost: clampNum(c.cost, 0, 10000000, 100),
      price: clampNum(c.price, 0, 10000000, 249),
      beauty: clampNum(c.beauty, 1, 10, 8),
      barColor: clampStr(c.barColor, 32, style.barColor) || style.barColor,
      textClass: clampStr(c.textClass, 64, style.textClass) || style.textClass,
      bgClass: clampStr(c.bgClass, 64, style.bgClass) || style.bgClass,
    };
  });
}

function sanitizeStock(stock: StallStockItem[]): Array<Record<string, unknown>> {
  if (!Array.isArray(stock)) return [];
  return stock.slice(0, BLUEPRINT_LIMITS.MAX_STALL_STOCK).map((item, idx) => {
    const clean: Record<string, unknown> = {
      id: clampStr(item.id, 64, `stock_${idx + 1}`) || `stock_${idx + 1}`,
      name: clampStr(item.name, 100, `Stock Item ${idx + 1}`) || `Stock Item ${idx + 1}`,
      category: clampStr(item.category, 60, 'Jewellery') || 'Jewellery',
      cost: clampNum(item.cost, 0, 10000000, 0),
      price: clampNum(item.price, 0, 10000000, 0),
      qty: clampNum(item.qty, 0, 1000000, 0),
      sellThrough: clampNum(item.sellThrough, 0, 100, 90),
      isSyncedBundle: Boolean(item.isSyncedBundle),
    };
    if (typeof item.unitPieces === 'number' && Number.isFinite(item.unitPieces)) {
      clean.unitPieces = clampNum(item.unitPieces, 1, 100000, 1);
    }
    return clean;
  });
}

function sanitizeWorkspaceMutableFields(snapshot: PlannerSnapshot) {
  const categories = sanitizeCategories(snapshot.categories);
  const customQuantities =
    Array.isArray(snapshot.customQuantities)
      ? snapshot.customQuantities
          .slice(0, categories.length)
          .map((q) => clampNum(q, 0, 100000, 0))
      : null;

  return {
    eventName: clampStr(snapshot.eventName, BLUEPRINT_LIMITS.MAX_EVENT_NAME_LEN, 'Stall Event') || 'Stall Event',
    expectedFootfall: clampNum(snapshot.expectedFootfall, 10, 10000000, 10000),
    budgetCap: clampNum(snapshot.budgetCap, 100, 100000000, 3000),
    minProfitFloor: clampNum(snapshot.minProfitFloor, 0, 100000000, 3100),
    stallFee: clampNum(snapshot.stallFee, 0, 100000000, 9000),
    maxPerCategory: clampNum(snapshot.maxPerCategory, 1, 500, 6),
    minColoursRule: clampNum(snapshot.minColoursRule, 0, 25, 1),
    globalSellThrough: clampNum(snapshot.globalSellThrough, 10, 100, 90),
    activeTab: VALID_TABS.has(snapshot.activeTab) ? snapshot.activeTab : 'optimizer',
    rules: {
      allAtLeastOne: Boolean(snapshot.rules?.allAtLeastOne),
      evenDistribution: Boolean(snapshot.rules?.evenDistribution),
      beautyFirst: Boolean(snapshot.rules?.beautyFirst),
      maxProfitFocus: Boolean(snapshot.rules?.maxProfitFocus),
      safe90Mode: Boolean(snapshot.rules?.safe90Mode),
    },
    categories,
    stallStock: sanitizeStock(snapshot.stallStock),
    selectedComboId: snapshot.selectedComboId
      ? clampStr(snapshot.selectedComboId, BLUEPRINT_LIMITS.MAX_COMBO_ID_LEN)
      : null,
    customQuantities,
  };
}

export function normalizeMemoryCategory(raw?: string): AiMemoryCategory {
  if (raw && VALID_MEMORY_CATEGORIES.has(raw as AiMemoryCategory)) {
    return raw as AiMemoryCategory;
  }
  return 'preference';
}

export async function ensureUserProfile(user: User): Promise<UserProfile> {
  const path = `users/${user.uid}`;
  const ref = doc(db, 'users', user.uid);
  const email = clampStr(user.email, BLUEPRINT_LIMITS.MAX_EMAIL_LEN, '');
  const displayName =
    clampStr(user.displayName, BLUEPRINT_LIMITS.MAX_DISPLAY_NAME_LEN, 'Merchant') || 'Merchant';
  const photoURL = clampStr(user.photoURL, BLUEPRINT_LIMITS.MAX_PHOTO_URL_LEN, '');

  try {
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      const initialProfile = {
        uid: user.uid,
        email,
        displayName,
        photoURL,
        businessName: '',
        preferredScale: 'Exhibition Stall',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      await setDoc(ref, initialProfile);
      return {
        uid: user.uid,
        email,
        displayName,
        photoURL,
        businessName: '',
        preferredScale: 'Exhibition Stall',
      };
    }

    const existing = snap.data();
    // Action: Sync Google Auth identity fields (exact allowlist in firestore.rules)
    if (
      existing.email !== email ||
      existing.displayName !== displayName ||
      existing.photoURL !== photoURL
    ) {
      await updateDoc(ref, {
        email,
        displayName,
        photoURL,
        updatedAt: serverTimestamp(),
      });
    }

    return {
      uid: user.uid,
      email,
      displayName,
      photoURL,
      businessName: typeof existing.businessName === 'string' ? existing.businessName : '',
      preferredScale:
        typeof existing.preferredScale === 'string' && existing.preferredScale
          ? existing.preferredScale
          : 'Exhibition Stall',
    };
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

export async function updateBusinessProfile(
  uid: string,
  updates: { businessName: string; preferredScale: string }
): Promise<void> {
  const path = `users/${uid}`;
  const ref = doc(db, 'users', uid);
  try {
    await updateDoc(ref, {
      businessName: clampStr(updates.businessName, BLUEPRINT_LIMITS.MAX_BUSINESS_NAME_LEN, ''),
      preferredScale:
        clampStr(updates.preferredScale, BLUEPRINT_LIMITS.MAX_PREFERRED_SCALE_LEN, 'Exhibition Stall') ||
        'Exhibition Stall',
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
  }
}

export async function loadActiveWorkspace(uid: string): Promise<PlannerSnapshot | null> {
  const path = `users/${uid}/workspaces/active`;
  const ref = doc(db, 'users', uid, 'workspaces', 'active');
  try {
    const snap = await getDoc(ref);
    if (!snap.exists()) return null;
    const data = snap.data();
    return {
      eventName: typeof data.eventName === 'string' ? data.eventName : 'Grand Casa, Siliguri',
      expectedFootfall: typeof data.expectedFootfall === 'number' ? data.expectedFootfall : 10000,
      budgetCap: typeof data.budgetCap === 'number' ? data.budgetCap : 3000,
      minProfitFloor: typeof data.minProfitFloor === 'number' ? data.minProfitFloor : 3100,
      stallFee: typeof data.stallFee === 'number' ? data.stallFee : 9000,
      maxPerCategory: typeof data.maxPerCategory === 'number' ? data.maxPerCategory : 6,
      minColoursRule: typeof data.minColoursRule === 'number' ? data.minColoursRule : 1,
      globalSellThrough: typeof data.globalSellThrough === 'number' ? data.globalSellThrough : 90,
      activeTab: VALID_TABS.has(data.activeTab) ? data.activeTab : 'optimizer',
      rules: data.rules || {
        allAtLeastOne: true,
        evenDistribution: true,
        beautyFirst: false,
        maxProfitFocus: false,
        safe90Mode: false,
      },
      categories: Array.isArray(data.categories) && data.categories.length > 0
        ? (data.categories as BangleCategory[])
        : INITIAL_CATEGORIES,
      stallStock: Array.isArray(data.stallStock) ? (data.stallStock as StallStockItem[]) : [],
      selectedComboId: typeof data.selectedComboId === 'string' ? data.selectedComboId : null,
      customQuantities: Array.isArray(data.customQuantities)
        ? (data.customQuantities as number[])
        : null,
    };
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, path);
  }
}

export async function saveActiveWorkspace(uid: string, snapshot: PlannerSnapshot): Promise<void> {
  const path = `users/${uid}/workspaces/active`;
  const ref = doc(db, 'users', uid, 'workspaces', 'active');
  const mutableFields = sanitizeWorkspaceMutableFields(snapshot);

  try {
    const existing = await getDoc(ref);
    if (!existing.exists()) {
      await setDoc(ref, {
        ownerId: uid,
        ...mutableFields,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } else {
      await updateDoc(ref, {
        ...mutableFields,
        updatedAt: serverTimestamp(),
      });
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

export async function loadAiMemories(uid: string): Promise<AiMemoryItem[]> {
  const path = `users/${uid}/aiMemories`;
  try {
    const q = query(
      collection(db, 'users', uid, 'aiMemories'),
      where('ownerId', '==', uid),
      limit(40)
    );
    const snap = await getDocs(q);
    const items: AiMemoryItem[] = snap.docs.map((d) => {
      const data = d.data();
      const createdAtMs =
        typeof data.createdAt?.toMillis === 'function' ? data.createdAt.toMillis() : Date.now();
      const updatedAtMs =
        typeof data.updatedAt?.toMillis === 'function' ? data.updatedAt.toMillis() : createdAtMs;
      return {
        id: d.id,
        ownerId: typeof data.ownerId === 'string' ? data.ownerId : uid,
        fact: typeof data.fact === 'string' ? data.fact : '',
        category: normalizeMemoryCategory(data.category),
        source:
          data.source === 'voice' || data.source === 'command' || data.source === 'manual'
            ? data.source
            : 'manual',
        createdAtMs,
        updatedAtMs,
      };
    });

    return items
      .filter((m) => m.fact.length >= BLUEPRINT_LIMITS.MIN_FACT_LEN)
      .sort((a, b) => b.createdAtMs - a.createdAtMs);
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, path);
  }
}

export async function addAiMemory(
  uid: string,
  entry: { fact: string; category?: string; source: 'voice' | 'command' | 'manual' }
): Promise<AiMemoryItem | null> {
  const fact = clampStr(entry.fact, BLUEPRINT_LIMITS.MAX_FACT_LEN, '');
  if (fact.length < BLUEPRINT_LIMITS.MIN_FACT_LEN) return null;

  const category = normalizeMemoryCategory(entry.category);
  const path = `users/${uid}/aiMemories`;

  try {
    const docRef = await addDoc(collection(db, 'users', uid, 'aiMemories'), {
      ownerId: uid,
      fact,
      category,
      source: entry.source,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    const now = Date.now();
    return {
      id: docRef.id,
      ownerId: uid,
      fact,
      category,
      source: entry.source,
      createdAtMs: now,
      updatedAtMs: now,
    };
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, path);
  }
}

export async function deleteAiMemory(uid: string, memoryId: string): Promise<void> {
  const path = `users/${uid}/aiMemories/${memoryId}`;
  try {
    await deleteDoc(doc(db, 'users', uid, 'aiMemories', memoryId));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}
