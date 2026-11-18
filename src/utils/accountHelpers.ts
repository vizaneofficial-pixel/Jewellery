import {
  EXTRA_CATEGORY_STYLES,
  GROUP_ACCENT_COLORS,
  INITIAL_CATEGORIES,
  INITIAL_CATEGORY_GROUPS,
} from '../data/defaults';
import type {
  AiMemoryCategory,
  AppTab,
  BangleCategory,
  OptimizerRules,
  PlannerSnapshot,
  StallStockItem,
  StockCategoryGroup,
  UserProfile,
} from '../types/stall';

// Validation constants synchronized verbatim with firebase-blueprint.json & firestore.rules
export const BLUEPRINT_LIMITS = {
  MAX_UID_LEN: 128,
  MAX_EMAIL_LEN: 254,
  MAX_DISPLAY_NAME_LEN: 120,
  MAX_PREFERRED_NAME_LEN: 80,
  MAX_PHOTO_URL_LEN: 512,
  MAX_BUSINESS_NAME_LEN: 120,
  MAX_PREFERRED_SCALE_LEN: 60,
  MAX_EVENT_NAME_LEN: 120,
  MIN_FACT_LEN: 2,
  MAX_FACT_LEN: 500,
  MAX_CATEGORIES: 25,
  MAX_CATEGORY_GROUPS: 20,
  MAX_GROUP_NAME_LEN: 80,
  MAX_STALL_STOCK: 60,
  MAX_COMBO_ID_LEN: 128,
} as const;

export const VALID_TABS = new Set<AppTab>(['optimizer', 'calculator', 'strategies', 'overview']);

const VALID_MEMORY_CATEGORIES = new Set<AiMemoryCategory>([
  'inventory',
  'pricing',
  'event',
  'preference',
  'strategy',
]);

export function clampStr(val: string | null | undefined, max: number, fallback = ''): string {
  const s = typeof val === 'string' ? val.trim() : fallback.trim();
  return s.slice(0, max);
}

export function clampNum(val: number, min: number, max: number, fallback: number): number {
  const n = Number(val);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

export function normalizeMemoryCategory(raw?: string): AiMemoryCategory {
  if (raw && VALID_MEMORY_CATEGORIES.has(raw as AiMemoryCategory)) {
    return raw as AiMemoryCategory;
  }
  return 'preference';
}

export function resolvePreferredName(
  profile: Pick<UserProfile, 'preferredName' | 'displayName'> | null | undefined
): string {
  const pref = profile?.preferredName?.trim();
  if (pref) return pref;
  const first = profile?.displayName?.trim().split(/\s+/)[0];
  return first || 'Merchant';
}

export function sanitizeRules(raw?: Partial<OptimizerRules> | null): OptimizerRules {
  return {
    allAtLeastOne: typeof raw?.allAtLeastOne === 'boolean' ? raw.allAtLeastOne : true,
    evenDistribution: typeof raw?.evenDistribution === 'boolean' ? raw.evenDistribution : true,
    beautyFirst: Boolean(raw?.beautyFirst),
    maxProfitFocus: Boolean(raw?.maxProfitFocus) && !Boolean(raw?.beautyFirst),
    safe90Mode: Boolean(raw?.safe90Mode),
  };
}

export function sanitizeCategories(cats: BangleCategory[] | undefined | null): BangleCategory[] {
  const pool = [
    ...INITIAL_CATEGORIES.map(({ barColor, textClass, bgClass }) => ({ barColor, textClass, bgClass })),
    ...EXTRA_CATEGORY_STYLES,
  ];
  const src = Array.isArray(cats) && cats.length > 0 ? cats : INITIAL_CATEGORIES;
  return src.slice(0, BLUEPRINT_LIMITS.MAX_CATEGORIES).map((c, idx) => {
    const style = pool[idx % pool.length];
    const hasMin = typeof c?.priceMin === 'number' && Number.isFinite(c.priceMin) && c.priceMin >= 0;
    const hasMax = typeof c?.priceMax === 'number' && Number.isFinite(c.priceMax) && c.priceMax >= 0;
    const priceMin = hasMin ? clampNum(c!.priceMin as number, 0, 10000000, 0) : null;
    const priceMax = hasMax ? clampNum(c!.priceMax as number, priceMin ?? 0, 10000000, priceMin ?? 0) : null;
    const minQty =
      typeof c?.minQty === 'number' && Number.isFinite(c.minQty) && c.minQty >= 0
        ? Math.floor(clampNum(c.minQty, 0, 10000, 0))
        : null;
    const maxQty =
      typeof c?.maxQty === 'number' && Number.isFinite(c.maxQty) && c.maxQty >= 0
        ? Math.floor(clampNum(c.maxQty, minQty ?? 0, 10000, minQty ?? 0))
        : null;

    const clean: BangleCategory = {
      id: clampStr(c?.id, 64, `cat_${idx + 1}`) || `cat_${idx + 1}`,
      name: clampStr(c?.name, 80, `Item ${idx + 1}`) || `Item ${idx + 1}`,
      shortName: clampStr(c?.shortName, 30, `Item ${idx + 1}`) || `Item ${idx + 1}`,
      cost: clampNum(c?.cost ?? 100, 0, 10000000, 100),
      price: clampNum(c?.price ?? 249, 0, 10000000, 249),
      beauty: clampNum(c?.beauty ?? 8, 1, 10, 8),
      barColor: clampStr(c?.barColor, 32, style.barColor) || style.barColor,
      textClass: clampStr(c?.textClass, 64, style.textClass) || style.textClass,
      bgClass: clampStr(c?.bgClass, 64, style.bgClass) || style.bgClass,
    };
    if (priceMin !== null && priceMax !== null && priceMax >= priceMin) {
      clean.priceMin = priceMin;
      clean.priceMax = priceMax;
      clean.price = Math.round((priceMin + priceMax) / 2);
    }
    if (minQty !== null) clean.minQty = minQty;
    if (maxQty !== null) clean.maxQty = maxQty;
    return clean;
  });
}

export function sanitizeCategoryGroups(
  groups: StockCategoryGroup[] | undefined | null,
  legacyFallback?: {
    budgetCap?: number;
    minProfitFloor?: number;
    maxPerCategory?: number;
    minColoursRule?: number;
    rules?: OptimizerRules;
    categories?: BangleCategory[];
    selectedComboId?: string | null;
    customQuantities?: number[] | null;
  }
): StockCategoryGroup[] {
  if (!Array.isArray(groups) || groups.length === 0) {
    if (legacyFallback && Array.isArray(legacyFallback.categories) && legacyFallback.categories.length > 0) {
      const cats = sanitizeCategories(legacyFallback.categories);
      const customQuantities =
        Array.isArray(legacyFallback.customQuantities) &&
        legacyFallback.customQuantities.length === cats.length
          ? legacyFallback.customQuantities.map((q) => clampNum(q, 0, 100000, 0))
          : null;
      return [
        {
          id: 'grp_bangles',
          name: 'Primary Category',
          accentColor: GROUP_ACCENT_COLORS[0],
          budgetCap: clampNum(legacyFallback.budgetCap ?? 3000, 100, 100000000, 3000),
          minProfitFloor: clampNum(legacyFallback.minProfitFloor ?? 3100, 0, 100000000, 3100),
          maxPerCategory: clampNum(legacyFallback.maxPerCategory ?? 6, 1, 500, 6),
          minColoursRule: clampNum(legacyFallback.minColoursRule ?? 1, 0, 25, 1),
          conservativeSellThroughPct: 90,
          rules: sanitizeRules(legacyFallback.rules),
          categories: cats,
          selectedComboId: legacyFallback.selectedComboId
            ? clampStr(legacyFallback.selectedComboId, BLUEPRINT_LIMITS.MAX_COMBO_ID_LEN)
            : 'c_1',
          customQuantities,
        },
        ...INITIAL_CATEGORY_GROUPS.slice(1),
      ];
    }
    return INITIAL_CATEGORY_GROUPS;
  }

  return groups.slice(0, BLUEPRINT_LIMITS.MAX_CATEGORY_GROUPS).map((g, idx) => {
    const categories = sanitizeCategories(g?.categories);
    const customQuantities =
      Array.isArray(g?.customQuantities) && g.customQuantities.length === categories.length
        ? g.customQuantities.map((q) => clampNum(q, 0, 100000, 0))
        : null;
    const conservativeSellThroughPct =
      typeof g?.conservativeSellThroughPct === 'number' && Number.isFinite(g.conservativeSellThroughPct)
        ? Math.round(clampNum(g.conservativeSellThroughPct, 50, 99, 90))
        : 90;

    return {
      id: clampStr(g?.id, BLUEPRINT_LIMITS.MAX_UID_LEN, `grp_${idx + 1}`) || `grp_${idx + 1}`,
      name:
        clampStr(g?.name, BLUEPRINT_LIMITS.MAX_GROUP_NAME_LEN, `Category ${idx + 1}`) ||
        `Category ${idx + 1}`,
      accentColor:
        clampStr(
          g?.accentColor,
          32,
          GROUP_ACCENT_COLORS[idx % GROUP_ACCENT_COLORS.length]
        ) || GROUP_ACCENT_COLORS[idx % GROUP_ACCENT_COLORS.length],
      budgetCap: clampNum(g?.budgetCap ?? 3000, 100, 100000000, 3000),
      minProfitFloor: clampNum(g?.minProfitFloor ?? 2500, 0, 100000000, 2500),
      maxPerCategory: clampNum(g?.maxPerCategory ?? 6, 1, 500, 6),
      minColoursRule: clampNum(g?.minColoursRule ?? 1, 0, 25, 1),
      conservativeSellThroughPct,
      rules: sanitizeRules(g?.rules),
      categories,
      selectedComboId: g?.selectedComboId
        ? clampStr(g.selectedComboId, BLUEPRINT_LIMITS.MAX_COMBO_ID_LEN)
        : null,
      customQuantities,
    };
  });
}

export function sanitizeStock(stock: StallStockItem[] | undefined | null): Array<Record<string, unknown>> {
  if (!Array.isArray(stock)) return [];
  return stock.slice(0, BLUEPRINT_LIMITS.MAX_STALL_STOCK).map((item, idx) => {
    const clean: Record<string, unknown> = {
      id: clampStr(item?.id, 64, `stock_${idx + 1}`) || `stock_${idx + 1}`,
      name: clampStr(item?.name, 100, `Stock Item ${idx + 1}`) || `Stock Item ${idx + 1}`,
      category: clampStr(item?.category, 60, 'Jewellery') || 'Jewellery',
      cost: clampNum(item?.cost ?? 0, 0, 10000000, 0),
      price: clampNum(item?.price ?? 0, 0, 10000000, 0),
      qty: clampNum(item?.qty ?? 0, 0, 1000000, 0),
      sellThrough: clampNum(item?.sellThrough ?? 90, 0, 100, 90),
      isSyncedBundle: Boolean(item?.isSyncedBundle),
    };
    if (typeof item?.unitPieces === 'number' && Number.isFinite(item.unitPieces)) {
      clean.unitPieces = clampNum(item.unitPieces, 1, 100000, 1);
    }
    if (typeof item?.groupId === 'string' && item.groupId.trim()) {
      clean.groupId = clampStr(item.groupId, BLUEPRINT_LIMITS.MAX_UID_LEN);
    }
    if (item?.itemType === 'event_cost' || item?.itemType === 'stock') {
      clean.itemType = item.itemType;
    }
    if (item?.sellThroughManual === true) {
      clean.sellThroughManual = true;
    }
    return clean;
  });
}

export function sanitizeWorkspaceMutableFields(snapshot: PlannerSnapshot) {
  const categoryGroups = sanitizeCategoryGroups(snapshot.categoryGroups, {
    budgetCap: snapshot.budgetCap,
    minProfitFloor: snapshot.minProfitFloor,
    maxPerCategory: snapshot.maxPerCategory,
    minColoursRule: snapshot.minColoursRule,
    rules: snapshot.rules,
    categories: snapshot.categories,
    selectedComboId: snapshot.selectedComboId,
    customQuantities: snapshot.customQuantities,
  });

  const activeGroup =
    categoryGroups.find((g) => g.id === snapshot.activeGroupId) || categoryGroups[0];

  const categories = activeGroup.categories;
  const customQuantities =
    Array.isArray(activeGroup.customQuantities) &&
    activeGroup.customQuantities.length === categories.length
      ? activeGroup.customQuantities
      : null;

  return {
    eventName:
      clampStr(snapshot.eventName, BLUEPRINT_LIMITS.MAX_EVENT_NAME_LEN, 'Stall Event') ||
      'Stall Event',
    expectedFootfall: clampNum(snapshot.expectedFootfall, 10, 10000000, 10000),
    budgetCap: activeGroup.budgetCap,
    minProfitFloor: activeGroup.minProfitFloor,
    stallFee: clampNum(snapshot.stallFee, 0, 100000000, 9000),
    maxPerCategory: activeGroup.maxPerCategory,
    minColoursRule: activeGroup.minColoursRule,
    globalSellThrough: clampNum(snapshot.globalSellThrough, 10, 100, 90),
    activeTab: VALID_TABS.has(snapshot.activeTab) ? snapshot.activeTab : 'optimizer',
    rules: activeGroup.rules,
    categories,
    stallStock: sanitizeStock(snapshot.stallStock),
    selectedComboId: activeGroup.selectedComboId,
    customQuantities,
    categoryGroups,
    activeGroupId: activeGroup.id,
  };
}

export function hydrateWorkspaceSnapshot(data: Record<string, unknown>): PlannerSnapshot {
  const legacyCategories =
    Array.isArray(data.categories) && data.categories.length > 0
      ? sanitizeCategories(data.categories as BangleCategory[])
      : INITIAL_CATEGORIES;
  const legacyRules = sanitizeRules((data.rules as Partial<OptimizerRules>) || undefined);
  const categoryGroups = sanitizeCategoryGroups(
    data.categoryGroups as StockCategoryGroup[] | undefined,
    {
      budgetCap: typeof data.budgetCap === 'number' ? data.budgetCap : 3000,
      minProfitFloor: typeof data.minProfitFloor === 'number' ? data.minProfitFloor : 3100,
      maxPerCategory: typeof data.maxPerCategory === 'number' ? data.maxPerCategory : 6,
      minColoursRule: typeof data.minColoursRule === 'number' ? data.minColoursRule : 1,
      rules: legacyRules,
      categories: legacyCategories,
      selectedComboId: typeof data.selectedComboId === 'string' ? data.selectedComboId : null,
      customQuantities: Array.isArray(data.customQuantities)
        ? (data.customQuantities as number[])
        : null,
    }
  );

  const rawActiveId = typeof data.activeGroupId === 'string' ? data.activeGroupId : '';
  const activeGroup = categoryGroups.find((g) => g.id === rawActiveId) || categoryGroups[0];
  const rawTab = typeof data.activeTab === 'string' ? (data.activeTab as AppTab) : 'optimizer';

  const stallStock: StallStockItem[] = Array.isArray(data.stallStock)
    ? (data.stallStock as StallStockItem[]).map((item, idx) => ({
        id: clampStr(item?.id, 64, `stock_${idx + 1}`) || `stock_${idx + 1}`,
        name: clampStr(item?.name, 100, `Stock Item ${idx + 1}`) || `Stock Item ${idx + 1}`,
        category: clampStr(item?.category, 60, 'Jewellery') || 'Jewellery',
        cost: clampNum(item?.cost ?? 0, 0, 10000000, 0),
        price: clampNum(item?.price ?? 0, 0, 10000000, 0),
        qty: clampNum(item?.qty ?? 0, 0, 1000000, 0),
        sellThrough: clampNum(item?.sellThrough ?? 90, 0, 100, 90),
        isSyncedBundle: Boolean(item?.isSyncedBundle),
        ...(typeof item?.unitPieces === 'number' && Number.isFinite(item.unitPieces)
          ? { unitPieces: clampNum(item.unitPieces, 1, 100000, 1) }
          : {}),
        ...(typeof item?.groupId === 'string' && item.groupId.trim()
          ? { groupId: clampStr(item.groupId, BLUEPRINT_LIMITS.MAX_UID_LEN) }
          : {}),
        ...(item?.itemType === 'event_cost' || item?.itemType === 'stock'
          ? { itemType: item.itemType }
          : {}),
        ...(item?.sellThroughManual === true ? { sellThroughManual: true } : {}),
      }))
    : [];

  return {
    eventName:
      typeof data.eventName === 'string' && data.eventName.trim()
        ? clampStr(data.eventName, BLUEPRINT_LIMITS.MAX_EVENT_NAME_LEN)
        : 'Grand Casa, Siliguri',
    expectedFootfall:
      typeof data.expectedFootfall === 'number'
        ? clampNum(data.expectedFootfall, 10, 10000000, 10000)
        : 10000,
    budgetCap: activeGroup.budgetCap,
    minProfitFloor: activeGroup.minProfitFloor,
    stallFee:
      typeof data.stallFee === 'number' ? clampNum(data.stallFee, 0, 100000000, 9000) : 9000,
    maxPerCategory: activeGroup.maxPerCategory,
    minColoursRule: activeGroup.minColoursRule,
    globalSellThrough:
      typeof data.globalSellThrough === 'number'
        ? clampNum(data.globalSellThrough, 10, 100, 90)
        : 90,
    activeTab: VALID_TABS.has(rawTab) ? rawTab : 'optimizer',
    rules: activeGroup.rules,
    categories: activeGroup.categories,
    stallStock,
    selectedComboId: activeGroup.selectedComboId,
    customQuantities: activeGroup.customQuantities,
    categoryGroups,
    activeGroupId: activeGroup.id,
  };
}

export function formatAuthOrSyncError(err: unknown, hostname = ''): string {
  const code =
    err && typeof err === 'object' && typeof (err as { code?: unknown }).code === 'string'
      ? (err as { code: string }).code
      : '';

  if (code === 'auth/popup-blocked') {
    return 'Sign-in popup was blocked by your browser. Allow popups for this site and try again.';
  }
  if (code === 'auth/unauthorized-domain') {
    const hostLabel = hostname ? `"${hostname}"` : 'this domain';
    return `Google Sign-In is not yet authorized for ${hostLabel}. Add this hostname under Firebase Console → Authentication → Settings → Authorized domains.`;
  }
  if (code === 'auth/operation-not-allowed') {
    return 'Google Sign-In is disabled in Firebase Authentication. Enable the Google provider in Firebase Console → Authentication → Sign-in method.';
  }
  if (code === 'auth/invalid-api-key' || code === 'auth/configuration-not-found') {
    return 'Firebase project configuration is incomplete or invalid. Verify your VITE_FIREBASE_* environment variables without exposing client credentials.';
  }
  if (code === 'auth/network-request-failed') {
    return 'Network connection error while contacting Google Sign-In. Check your connection and try again.';
  }
  if (code === 'auth/user-disabled') {
    return 'This account has been disabled in Firebase Authentication.';
  }

  let rawMsg = err instanceof Error ? err.message : String(err || '');
  try {
    const parsed = JSON.parse(rawMsg);
    if (parsed && typeof parsed.error === 'string') {
      rawMsg = parsed.error;
    }
  } catch {
    // Plain message
  }

  const lower = rawMsg.toLowerCase();
  if (lower.includes('permission') || lower.includes('insufficient')) {
    return 'Cloud workspace sync was denied by Firestore rules. Verify your Google account email and ensure the latest firestore.rules are deployed.';
  }
  if (lower.includes('quota exceeded')) {
    return 'Firestore free-tier daily quota has been reached for this project. Your work remains editable locally; cloud sync will resume after quota resets.';
  }
  if (lower.includes('offline') || lower.includes('unavailable')) {
    return 'Firestore is currently unreachable or offline. Check your connection and Firebase database settings.';
  }

  if (rawMsg && !rawMsg.startsWith('{') && rawMsg.length <= 200) {
    return rawMsg;
  }

  return 'Unable to complete account sync right now. Please try again.';
}
