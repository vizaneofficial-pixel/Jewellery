import { EXTRA_CATEGORY_STYLES, INITIAL_CATEGORIES } from '../data/defaults.js';
import type {
  AccountAiContext,
  AiMemoryAddition,
  AiMemoryCategory,
  AppTab,
  BangleCategory,
  BangleCombo,
  PlannerSnapshot,
  StallStockItem,
  StallTotals,
} from '../types/stall';
import {
  applyCustomQuantities,
  calculateStallTotals,
  generateBangleCombinations,
  resolveCategoryGroups,
  syncCategoryGroupsToStallStock,
} from './optimizer.js';

const VALID_MEMORY_CATEGORIES = new Set<AiMemoryCategory>([
  'inventory',
  'pricing',
  'event',
  'preference',
  'strategy',
]);

function sanitizeMemoryAdditions(raw: unknown): AiMemoryAddition[] {
  if (!Array.isArray(raw)) return [];
  const out: AiMemoryAddition[] = [];
  for (const entry of raw) {
    if (!entry || typeof entry !== 'object') continue;
    const obj = entry as { fact?: unknown; category?: unknown };
    const fact = typeof obj.fact === 'string' ? obj.fact.trim().slice(0, 500) : '';
    if (fact.length < 2) continue;
    const catRaw = typeof obj.category === 'string' ? obj.category.trim().toLowerCase() : 'preference';
    const category: AiMemoryCategory = VALID_MEMORY_CATEGORIES.has(catRaw as AiMemoryCategory)
      ? (catRaw as AiMemoryCategory)
      : 'preference';
    out.push({ fact, category });
  }
  return out.slice(0, 10);
}

const STYLE_POOL = [
  ...INITIAL_CATEGORIES.map(({ barColor, textClass, bgClass }) => ({ barColor, textClass, bgClass })),
  ...EXTRA_CATEGORY_STYLES,
];

function slugifyId(name: string, idx: number): string {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
  return base ? `${base}_${idx}` : `cat_${idx}`;
}

export function estimateRetailPrice(cost: number): number {
  const safeCost = Math.max(1, Math.round(cost));
  const raw = safeCost * 2.5;
  if (raw < 100) {
    return Math.max(safeCost + 25, Math.round(raw / 10) * 10 - 1);
  }
  if (raw < 1000) {
    return Math.max(safeCost + 50, Math.round(raw / 50) * 50 - 1);
  }
  return Math.max(safeCost + 150, Math.round(raw / 100) * 100 - 1);
}

function makeShortName(name: string, shortName?: string): string {
  if (shortName && shortName.trim()) return shortName.trim();
  const cleaned = name.replace(/\(.*?\)/g, '').trim();
  const words = cleaned.split(/\s+/).filter(Boolean);
  if (words.length <= 2) return cleaned.slice(0, 14);
  return `${words[0]} ${words[1]}`.slice(0, 14);
}

export interface AiActionExecutionResult {
  nextState: PlannerSnapshot;
  changes: string[];
  memoryAdditions: AiMemoryAddition[];
  activeCombo: BangleCombo | null;
  topCombos: BangleCombo[];
  stallTotals: StallTotals;
  toolResponse: Record<string, unknown>;
}

function finalizeSnapshot(
  candidate: PlannerSnapshot,
  changes: string[],
  selectRank?: number,
  memoryAdditions: AiMemoryAddition[] = [],
  accountContext?: AccountAiContext
): AiActionExecutionResult {
  const combos = generateBangleCombinations(
    candidate.categories,
    {
      budgetCap: candidate.budgetCap,
      minProfitFloor: candidate.minProfitFloor,
      maxPerCategory: candidate.maxPerCategory,
      minColoursRule: candidate.minColoursRule,
    },
    candidate.rules
  );

  let selectedId = candidate.selectedComboId;
  if (typeof selectRank === 'number' && combos.length > 0) {
    const idx = Math.min(combos.length - 1, Math.max(0, Math.round(selectRank) - 1));
    selectedId = combos[idx].id;
  } else if (combos.length > 0 && !combos.some((c) => c.id === selectedId)) {
    selectedId = combos[0].id;
  }

  const baseCombo = combos.find((c) => c.id === selectedId) || combos[0] || null;
  const activeCombo =
    baseCombo && candidate.customQuantities && candidate.customQuantities.length === candidate.categories.length
      ? applyCustomQuantities(
          baseCombo,
          candidate.customQuantities,
          candidate.categories,
          candidate.minProfitFloor
        )
      : baseCombo;

  const nextSelectedComboId = baseCombo ? baseCombo.id : null;

  let nextCategoryGroups = candidate.categoryGroups;
  let syncedStock = candidate.stallStock;

  if (Array.isArray(candidate.categoryGroups) && candidate.categoryGroups.length > 0) {
    const targetGroupId = candidate.activeGroupId || candidate.categoryGroups[0].id;
    nextCategoryGroups = candidate.categoryGroups.map((g) =>
      g.id === targetGroupId
        ? {
            ...g,
            budgetCap: candidate.budgetCap,
            minProfitFloor: candidate.minProfitFloor,
            maxPerCategory: candidate.maxPerCategory,
            minColoursRule: candidate.minColoursRule,
            rules: candidate.rules,
            categories: candidate.categories,
            selectedComboId: nextSelectedComboId,
            customQuantities: candidate.customQuantities,
          }
        : g
    );
    const resolved = resolveCategoryGroups(nextCategoryGroups);
    syncedStock = syncCategoryGroupsToStallStock(
      resolved,
      candidate.stallStock,
      candidate.globalSellThrough
    );
  } else if (activeCombo) {
    syncedStock = candidate.stallStock.map((item) =>
      item.isSyncedBundle
        ? {
            ...item,
            name: `Selected Bangle Mix (${activeCombo.pieces} pcs)`,
            cost: activeCombo.cost,
            price: activeCombo.rev100,
            unitPieces: activeCombo.pieces,
          }
        : item
    );
  }

  const nextState: PlannerSnapshot = {
    ...candidate,
    selectedComboId: nextSelectedComboId,
    stallStock: syncedStock,
    ...(nextCategoryGroups ? { categoryGroups: nextCategoryGroups } : {}),
  };

  const stallTotals = calculateStallTotals(
    nextState.stallStock,
    nextState.stallFee,
    nextState.expectedFootfall
  );

  const activeBreakdown = activeCombo
    ? nextState.categories.map((cat, idx) => ({
        name: cat.name,
        qty: activeCombo.counts[idx] || 0,
        unitCost: cat.cost,
        sellPrice: cat.price,
        beauty: cat.beauty,
        lineCost: (activeCombo.counts[idx] || 0) * cat.cost,
        lineRev: (activeCombo.counts[idx] || 0) * cat.price,
      }))
    : [];

  return {
    nextState,
    changes,
    memoryAdditions,
    activeCombo,
    topCombos: combos.slice(0, 5),
    stallTotals,
    toolResponse: {
      ok: true,
      appliedChanges: changes,
      savedMemories: memoryAdditions,
      accountProfile: accountContext
        ? {
            preferredName: accountContext.preferredName || accountContext.displayName,
            merchantName: accountContext.displayName,
            businessName: accountContext.businessName,
            rememberedFacts: accountContext.memories.slice(0, 20),
          }
        : null,
      eventName: nextState.eventName,
      expectedFootfall: nextState.expectedFootfall,
      budgetCap: nextState.budgetCap,
      minProfitFloor: nextState.minProfitFloor,
      stallFee: nextState.stallFee,
      activeTab: nextState.activeTab,
      categoriesCount: nextState.categories.length,
      combosFound: combos.length,
      activeCombo: activeCombo
        ? {
            label: activeCombo.label,
            badge: activeCombo.badge,
            keywords: activeCombo.keywords,
            cost: activeCombo.cost,
            rev100: activeCombo.rev100,
            prof100: activeCombo.prof100,
            rev90: activeCombo.rev90,
            prof90: activeCombo.prof90,
            pieces: activeCombo.pieces,
            avgBeauty: activeCombo.avgBeauty,
            marginPct: activeCombo.marginPct,
            breakdown: activeBreakdown,
          }
        : null,
      topCombosSummary: combos.slice(0, 5).map((c) => ({
        rank: c.rank,
        label: c.label,
        badge: c.badge,
        cost: c.cost,
        rev100: c.rev100,
        prof100: c.prof100,
        prof90: c.prof90,
        pieces: c.pieces,
        avgBeauty: c.avgBeauty,
        breakdownText: nextState.categories
          .map((cat, i) => (c.counts[i] > 0 ? `${c.counts[i]} ${cat.shortName}` : null))
          .filter(Boolean)
          .join(', '),
      })),
      totalStallSummary: {
        totalStockCost: stallTotals.totalCost,
        totalOutlayWithStallFee: stallTotals.totalOutlay,
        realisticRevenue: stallTotals.revRealistic,
        fullRevenue100Pct: stallTotals.rev100,
        netTakeHomeProfit: stallTotals.netAfterStallReal,
        totalUnits: stallTotals.totalUnits,
        unitsToBreakEven: stallTotals.unitsToBreakEven,
        footfallConversionNeededPct: stallTotals.footfallConversionNeeded,
        blendedMarginPct: stallTotals.blendedMarginPct,
        capitalMultiple: stallTotals.capitalMultiple,
        rentBurdenPct: stallTotals.rentBurdenPct,
        topRoiDriver: `${stallTotals.topRoiItemName} (${stallTotals.topRoiPct}% ROI)`,
      },
    },
  };
}

export function applyAiToolAction(
  snapshot: PlannerSnapshot,
  toolName: string,
  rawArgs: Record<string, unknown> | undefined,
  accountContext?: AccountAiContext
): AiActionExecutionResult {
  const args = rawArgs || {};
  const changes: string[] = [];

  if (toolName === 'get_live_plan_summary') {
    return finalizeSnapshot(snapshot, ['Read current live plan'], undefined, [], accountContext);
  }

  if (toolName === 'save_ai_memory') {
    const memoryAdditions = sanitizeMemoryAdditions(args.memories);
    const memChanges = memoryAdditions.map((m) => `Remembered: ${m.fact}`);
    return finalizeSnapshot(snapshot, memChanges, undefined, memoryAdditions, accountContext);
  }

  let next: PlannerSnapshot = {
    ...snapshot,
    rules: { ...snapshot.rules },
    categories: snapshot.categories.map((c) => ({ ...c })),
    stallStock: snapshot.stallStock.map((s) => ({ ...s })),
    customQuantities: snapshot.customQuantities ? [...snapshot.customQuantities] : null,
    categoryGroups: snapshot.categoryGroups
      ? snapshot.categoryGroups.map((g) => ({
          ...g,
          rules: { ...g.rules },
          categories: g.categories.map((c) => ({ ...c })),
          customQuantities: g.customQuantities ? [...g.customQuantities] : null,
        }))
      : undefined,
  };

  if (toolName === 'configure_planner') {
    if (typeof args.eventName === 'string' && args.eventName.trim()) {
      next.eventName = args.eventName.trim();
      changes.push(`Event → ${next.eventName}`);
    }
    if (typeof args.expectedFootfall === 'number' && args.expectedFootfall >= 50) {
      next.expectedFootfall = Math.round(args.expectedFootfall);
      changes.push(`Footfall → ${next.expectedFootfall.toLocaleString('en-IN')}`);
    }

    const budgetChanged = typeof args.budgetCap === 'number' && args.budgetCap >= 200;
    if (budgetChanged) {
      next.budgetCap = Math.round(args.budgetCap as number);
      changes.push(`Budget → ₹${next.budgetCap.toLocaleString('en-IN')}`);
    }

    const explicitFloor = typeof args.minProfitFloor === 'number' && args.minProfitFloor >= 0;
    if (explicitFloor) {
      next.minProfitFloor = Math.round(args.minProfitFloor as number);
      changes.push(`Min Profit → ₹${next.minProfitFloor.toLocaleString('en-IN')}`);
    }

    if (typeof args.stallFee === 'number' && args.stallFee >= 0) {
      next.stallFee = Math.round(args.stallFee);
      changes.push(`Event/Stall Fee → ₹${next.stallFee.toLocaleString('en-IN')}`);
    }

    if (typeof args.maxPerCategory === 'number' && args.maxPerCategory >= 2) {
      next.maxPerCategory = Math.round(args.maxPerCategory);
      changes.push(`Max/Type → ${next.maxPerCategory}`);
    }

    if (typeof args.minColoursRule === 'number' && args.minColoursRule >= 0) {
      next.minColoursRule = Math.round(args.minColoursRule);
    }

    if (typeof args.globalSellThrough === 'number' && args.globalSellThrough >= 30) {
      const pct = Math.min(100, Math.round(args.globalSellThrough));
      next.globalSellThrough = pct;
      next.stallStock = next.stallStock.map((item) => ({ ...item, sellThrough: pct }));
      changes.push(`Sell-Through → ${pct}%`);
    }

    if (typeof args.allAtLeastOne === 'boolean') {
      next.rules.allAtLeastOne = args.allAtLeastOne;
    }
    if (typeof args.evenDistribution === 'boolean') {
      next.rules.evenDistribution = args.evenDistribution;
    }
    if (typeof args.beautyFirst === 'boolean') {
      next.rules.beautyFirst = args.beautyFirst;
      if (args.beautyFirst) next.rules.maxProfitFocus = false;
    }
    if (typeof args.maxProfitFocus === 'boolean') {
      next.rules.maxProfitFocus = args.maxProfitFocus;
      if (args.maxProfitFocus) next.rules.beautyFirst = false;
    }
    if (typeof args.safe90Mode === 'boolean') {
      next.rules.safe90Mode = args.safe90Mode;
    }

    const incomingCats = Array.isArray(args.categories)
      ? (args.categories as Array<{
          name?: string;
          shortName?: string;
          cost?: number;
          price?: number;
          beauty?: number;
        }>)
      : [];

    let categoriesChanged = false;
    if (incomingCats.length > 0) {
      categoriesChanged = true;
      if (args.replaceCategories === true) {
        const built: BangleCategory[] = incomingCats
          .filter((c) => c && typeof c.name === 'string' && c.name.trim())
          .map((c, idx) => {
            const name = c.name!.trim();
            const cost = Math.max(10, Math.round(Number(c.cost) || 120));
            const price =
              typeof c.price === 'number' && c.price > 0
                ? Math.round(c.price)
                : estimateRetailPrice(cost);
            const beauty = Math.min(10, Math.max(1, Number(c.beauty) || 7.5));
            const style = STYLE_POOL[idx % STYLE_POOL.length];
            return {
              id: slugifyId(name, idx + 1),
              name,
              shortName: makeShortName(name, c.shortName),
              cost,
              price,
              beauty,
              ...style,
            };
          });
        if (built.length >= 1) {
          next.categories = built;
          next.customQuantities = null;
          next.selectedComboId = null;
          changes.push(`Loaded ${built.length} categories`);
        }
      } else {
        incomingCats.forEach((u) => {
          if (!u?.name || !u.name.trim()) return;
          const rawName = u.name.trim();
          const key = rawName.toLowerCase();
          const existingIdx = next.categories.findIndex(
            (c) =>
              c.name.toLowerCase() === key ||
              c.shortName.toLowerCase() === key ||
              c.name.toLowerCase().includes(key) ||
              key.includes(c.shortName.toLowerCase())
          );

          if (existingIdx >= 0) {
            const existing = next.categories[existingIdx];
            const cost =
              typeof u.cost === 'number' && u.cost > 0 ? Math.round(u.cost) : existing.cost;
            const price =
              typeof u.price === 'number' && u.price > 0 ? Math.round(u.price) : existing.price;
            const beauty =
              typeof u.beauty === 'number' && u.beauty > 0
                ? Math.min(10, Math.max(1, Number(u.beauty)))
                : existing.beauty;
            next.categories[existingIdx] = {
              ...existing,
              cost,
              price,
              beauty,
            };
            changes.push(`${existing.shortName}: ₹${cost}→₹${price} (${beauty}★)`);
          } else {
            const cost = Math.max(10, Math.round(Number(u.cost) || 120));
            const price =
              typeof u.price === 'number' && u.price > 0
                ? Math.round(u.price)
                : estimateRetailPrice(cost);
            const beauty = Math.min(10, Math.max(1, Number(u.beauty) || 8.0));
            const style = STYLE_POOL[next.categories.length % STYLE_POOL.length];
            const added: BangleCategory = {
              id: slugifyId(rawName, next.categories.length + 1),
              name: rawName,
              shortName: makeShortName(rawName, u.shortName),
              cost,
              price,
              beauty,
              ...style,
            };
            next.categories.push(added);
            next.customQuantities = null;
            changes.push(`Added ${added.name} (₹${cost}→₹${price}, ${beauty}★)`);
          }
        });
      }
    }

    // Auto-scale minProfitFloor when budget or categories change without explicit profit floor
    if ((budgetChanged || categoriesChanged || args.replaceCategories === true) && !explicitFloor) {
      const avgRoi =
        next.categories.reduce(
          (acc, c) => acc + (c.price - c.cost) / Math.max(1, c.cost),
          0
        ) / Math.max(1, next.categories.length);
      const targetFloor = Math.max(
        150,
        Math.round(next.budgetCap * Math.min(1.05, Math.max(0.35, avgRoi * 0.7)))
      );
      next.minProfitFloor = targetFloor;
      changes.push(`Auto Profit Floor → ₹${targetFloor.toLocaleString('en-IN')}`);

      // Verify combos exist; if still empty, ease floor once more so user always gets valid mixes
      const testCombos = generateBangleCombinations(
        next.categories,
        {
          budgetCap: next.budgetCap,
          minProfitFloor: next.minProfitFloor,
          maxPerCategory: next.maxPerCategory,
          minColoursRule: next.minColoursRule,
        },
        next.rules
      );
      if (testCombos.length === 0) {
        next.minProfitFloor = Math.max(50, Math.round(next.budgetCap * 0.25));
      }
    }

    if (Array.isArray(args.customQuantities) && args.customQuantities.length > 0) {
      const baseCounts = new Array(next.categories.length).fill(0);
      (args.customQuantities as Array<{ name?: string; qty?: number }>).forEach((entry) => {
        if (!entry?.name) return;
        const k = entry.name.toLowerCase();
        const idx = next.categories.findIndex(
          (c) =>
            c.name.toLowerCase().includes(k) ||
            c.shortName.toLowerCase().includes(k) ||
            k.includes(c.shortName.toLowerCase())
        );
        if (idx >= 0) {
          baseCounts[idx] = Math.max(0, Math.round(Number(entry.qty) || 0));
        }
      });
      next.customQuantities = baseCounts;
      changes.push('Applied custom mix quantities');
    } else if (typeof args.selectComboRank === 'number') {
      next.customQuantities = null;
      changes.push(`Selected mix #${Math.round(args.selectComboRank)}`);
    }

    if (
      args.navigateToTab === 'optimizer' ||
      args.navigateToTab === 'overview' ||
      args.navigateToTab === 'calculator' ||
      args.navigateToTab === 'strategies'
    ) {
      next.activeTab = args.navigateToTab as AppTab;
      changes.push(`Tab → ${args.navigateToTab}`);
    }

    return finalizeSnapshot(
      next,
      changes,
      typeof args.selectComboRank === 'number' ? args.selectComboRank : undefined,
      [],
      accountContext
    );
  }

  if (toolName === 'manage_inventory_stock') {
    if (typeof args.stallFee === 'number' && args.stallFee >= 0) {
      next.stallFee = Math.round(args.stallFee);
      changes.push(`Stall Fee → ₹${next.stallFee.toLocaleString('en-IN')}`);
    }
    if (typeof args.expectedFootfall === 'number' && args.expectedFootfall >= 50) {
      next.expectedFootfall = Math.round(args.expectedFootfall);
      changes.push(`Footfall → ${next.expectedFootfall.toLocaleString('en-IN')}`);
    }
    if (typeof args.globalSellThrough === 'number' && args.globalSellThrough >= 30) {
      const pct = Math.min(100, Math.round(args.globalSellThrough));
      next.globalSellThrough = pct;
      next.stallStock = next.stallStock.map((item) => ({ ...item, sellThrough: pct }));
      changes.push(`Sell-Through → ${pct}%`);
    }

    if (typeof args.activeMixLotQty === 'number' && args.activeMixLotQty >= 0) {
      const lotQty = Math.round(args.activeMixLotQty);
      next.stallStock = next.stallStock.map((item) =>
        item.isSyncedBundle ? { ...item, qty: lotQty } : item
      );
      changes.push(`Mix Lot Qty → ${lotQty}`);
    }

    if (args.replaceStock === true) {
      const synced = next.stallStock.filter((s) => s.isSyncedBundle);
      next.stallStock = synced;
      changes.push('Replaced non-synced stall inventory');
    }

    if (Array.isArray(args.removeItemNames)) {
      const removeKeys = (args.removeItemNames as unknown[])
        .filter((x): x is string => typeof x === 'string' && x.trim().length > 0)
        .map((x) => x.trim().toLowerCase());
      if (removeKeys.length > 0) {
        const before = next.stallStock.length;
        next.stallStock = next.stallStock.filter(
          (item) =>
            item.isSyncedBundle || !removeKeys.some((k) => item.name.toLowerCase().includes(k))
        );
        if (next.stallStock.length < before) {
          changes.push(`Removed ${before - next.stallStock.length} stock item(s)`);
        }
      }
    }

    if (Array.isArray(args.items)) {
      (
        args.items as Array<{
          name?: string;
          category?: string;
          cost?: number;
          price?: number;
          qty?: number;
          sellThrough?: number;
        }>
      ).forEach((entry, idx) => {
        if (!entry?.name || !entry.name.trim()) return;
        const name = entry.name.trim();
        const key = name.toLowerCase();
        const existingIdx = next.stallStock.findIndex(
          (s) => !s.isSyncedBundle && s.name.toLowerCase().includes(key)
        );
        const cost = Math.max(0, Math.round(Number(entry.cost) || 60));
        const price =
          typeof entry.price === 'number' && entry.price > 0
            ? Math.round(entry.price)
            : estimateRetailPrice(cost);
        const qty = Math.max(1, Math.round(Number(entry.qty) || 20));
        const sellThrough =
          typeof entry.sellThrough === 'number'
            ? Math.min(100, Math.max(20, Math.round(entry.sellThrough)))
            : next.globalSellThrough;

        if (existingIdx >= 0) {
          const prev = next.stallStock[existingIdx];
          next.stallStock[existingIdx] = {
            ...prev,
            category: entry.category || prev.category,
            cost: typeof entry.cost === 'number' ? cost : prev.cost,
            price: typeof entry.price === 'number' ? price : prev.price,
            qty: typeof entry.qty === 'number' ? qty : prev.qty,
            sellThrough:
              typeof entry.sellThrough === 'number' ? sellThrough : prev.sellThrough,
          };
          changes.push(`Updated ${prev.name}`);
        } else {
          const row: StallStockItem = {
            id: `ai_stock_${Date.now()}_${idx}`,
            name,
            category: entry.category || 'Jewellery',
            cost,
            price,
            qty,
            sellThrough,
            isSyncedBundle: false,
          };
          next.stallStock.push(row);
          changes.push(`Added ${qty}x ${name} (₹${cost}→₹${price})`);
        }
      });
    }

    if (
      args.navigateToTab === 'optimizer' ||
      args.navigateToTab === 'overview' ||
      args.navigateToTab === 'calculator' ||
      args.navigateToTab === 'strategies'
    ) {
      next.activeTab = args.navigateToTab as AppTab;
      changes.push(`Tab → ${args.navigateToTab}`);
    }

    return finalizeSnapshot(next, changes, undefined, [], accountContext);
  }

  return finalizeSnapshot(next, changes, undefined, [], accountContext);
}
