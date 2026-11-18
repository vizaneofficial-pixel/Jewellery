import test from 'node:test';
import assert from 'node:assert/strict';
import { INITIAL_CATEGORIES, INITIAL_CATEGORY_GROUPS, INITIAL_STALL_STOCK } from '../data/defaults';
import {
  applyCustomQuantities,
  calculateStallTotals,
  computeDiversifiedOverviewTotals,
  generateBangleCombinations,
  parseLocalRawCommand,
  resolveCategoryGroups,
  syncCategoryGroupsToStallStock,
} from './optimizer';

test('generateBangleCombinations respects budgetCap, minProfitFloor, and allAtLeastOne', () => {
  const combos = generateBangleCombinations(
    INITIAL_CATEGORIES,
    { budgetCap: 3000, minProfitFloor: 3100, maxPerCategory: 6, minColoursRule: 1 },
    {
      allAtLeastOne: true,
      evenDistribution: true,
      beautyFirst: false,
      maxProfitFocus: false,
      safe90Mode: false,
    }
  );

  assert.ok(combos.length > 0, 'Should return valid combinations');
  assert.ok(combos.length <= 15, 'Should return at most 15 combinations');

  combos.forEach((combo) => {
    assert.ok(combo.cost <= 3000, `Combo ${combo.label} exceeded budget cap: ${combo.cost}`);
    assert.ok(combo.prof100 >= 3100, `Combo ${combo.label} below min profit floor: ${combo.prof100}`);
    combo.counts.forEach((qty, idx) => {
      assert.ok(qty >= 1, `Category ${INITIAL_CATEGORIES[idx].name} must have >= 1 piece`);
    });
  });
});

test('beautyFirst filter guarantees >= 7.75 average beauty score', () => {
  const combos = generateBangleCombinations(
    INITIAL_CATEGORIES,
    { budgetCap: 3000, minProfitFloor: 3100, maxPerCategory: 6, minColoursRule: 1 },
    {
      allAtLeastOne: true,
      evenDistribution: true,
      beautyFirst: true,
      maxProfitFocus: false,
      safe90Mode: false,
    }
  );

  assert.ok(combos.length > 0);
  combos.forEach((c) => {
    assert.ok(c.avgBeauty >= 7.75, `Expected avgBeauty >= 7.75, got ${c.avgBeauty}`);
  });
});

test('applyCustomQuantities updates cost, revenue, profit, and beauty accurately', () => {
  const combos = generateBangleCombinations(
    INITIAL_CATEGORIES,
    { budgetCap: 3000, minProfitFloor: 3100, maxPerCategory: 6, minColoursRule: 1 },
    {
      allAtLeastOne: true,
      evenDistribution: true,
      beautyFirst: false,
      maxProfitFocus: false,
      safe90Mode: false,
    }
  );
  const base = combos[0];
  const updated = applyCustomQuantities(base, [2, 4, 3, 4, 1, 1], INITIAL_CATEGORIES, 3100);

  // Cost = 2*280 + 4*210 + 3*180 + 4*150 + 1*120 + 1*100 = 560+840+540+600+120+100 = 2760
  assert.equal(updated.cost, 2760);
  assert.equal(updated.pieces, 15);
  assert.equal(updated.isCustom, true);
  assert.equal(updated.prof100, updated.rev100 - 2760);
});

test('calculateStallTotals computes outlay, realistic revenue, net take-home profit, and break-even', () => {
  const totals = calculateStallTotals(INITIAL_STALL_STOCK, 9000, 10000);

  // Stock cost = 2990 + 25*65 + 30*45 + 25*55 + 15*95 + 10*140 = 2990 + 1625 + 1350 + 1375 + 1425 + 1400 = 10165
  assert.equal(totals.totalCost, 10165);
  assert.equal(totals.totalOutlay, 19165);
  assert.equal(totals.netAfterStallReal, totals.grossProfitReal - 9000);
  assert.ok(totals.footfallConversionNeeded > 0 && totals.footfallConversionNeeded < 2);
  assert.ok(totals.capitalMultiple > 1);
});

test('parseLocalRawCommand parses budget, max cuff, category price update, and new stock additions', () => {
  const parsed = parseLocalRawCommand(
    'Budget 3500, max 5 Cuff, White cost 250 sell 499, add Nose Pins cost 30 sell 99 qty 30',
    INITIAL_CATEGORIES,
    90
  );

  assert.equal(parsed.budgetCap, 3500);
  assert.equal(parsed.maxPerCategory, 5);
  assert.equal(parsed.ruleUpdates.evenDistribution, true);
  assert.equal(parsed.categoryUpdates.length, 1);
  assert.equal(parsed.categoryUpdates[0].id, 'white');
  assert.equal(parsed.categoryUpdates[0].cost, 250);
  assert.equal(parsed.categoryUpdates[0].price, 499);
  assert.equal(parsed.stockAdditions.length, 1);
  assert.equal(parsed.stockAdditions[0].name, 'Nose Pins');
  assert.equal(parsed.stockAdditions[0].qty, 30);
});

test('parseLocalRawCommand extracts expectedFootfall for any scale', () => {
  const parsed = parseLocalRawCommand(
    'Budget 15000, stall fee 22000, crowd 25000',
    INITIAL_CATEGORIES,
    90
  );
  assert.equal(parsed.budgetCap, 15000);
  assert.equal(parsed.stallFee, 22000);
  assert.equal(parsed.expectedFootfall, 25000);
});

test('generateBangleCombinations scales smoothly for large budgets and 8+ categories', () => {
  const eightCategories = [
    ...INITIAL_CATEGORIES,
    {
      id: 'kundan',
      name: 'Kundan Choker',
      shortName: 'Kundan',
      cost: 350,
      price: 899,
      beauty: 9.4,
      barColor: '#06b6d4',
      textClass: 'text-cyan-300',
      bgClass: 'bg-cyan-500/12 border-cyan-500/35',
    },
    {
      id: 'meenakari',
      name: 'Meenakari Kada',
      shortName: 'Meenakari',
      cost: 240,
      price: 599,
      beauty: 8.8,
      barColor: '#10b981',
      textClass: 'text-emerald-300',
      bgClass: 'bg-emerald-500/12 border-emerald-500/35',
    },
  ];

  const combos = generateBangleCombinations(
    eightCategories,
    { budgetCap: 25000, minProfitFloor: 24000, maxPerCategory: 6, minColoursRule: 1 },
    {
      allAtLeastOne: true,
      evenDistribution: true,
      beautyFirst: false,
      maxProfitFocus: false,
      safe90Mode: false,
    }
  );

  assert.equal(combos.length, 15, 'Should return 15 diverse combinations at ₹25,000 scale');
  combos.forEach((combo) => {
    assert.ok(combo.cost <= 25000);
    assert.ok(combo.cost >= 21000, `Combo ${combo.label} spent too little: ${combo.cost}`);
    assert.ok(combo.counts.every((q) => q >= 1));
  });
});

import { applyAiToolAction } from './aiActions';
import type { PlannerSnapshot } from '../types/stall';

test('applyAiToolAction configures entire website from dictated items, costs, beauty scores & event scale', () => {
  const initialSnapshot: PlannerSnapshot = {
    eventName: 'Grand Casa, Siliguri',
    expectedFootfall: 10000,
    budgetCap: 3000,
    minProfitFloor: 3100,
    stallFee: 9000,
    maxPerCategory: 6,
    minColoursRule: 1,
    globalSellThrough: 90,
    rules: {
      allAtLeastOne: true,
      evenDistribution: true,
      beautyFirst: false,
      maxProfitFocus: false,
      safe90Mode: false,
    },
    categories: INITIAL_CATEGORIES,
    selectedComboId: 'c_1',
    customQuantities: null,
    stallStock: INITIAL_STALL_STOCK,
    activeTab: 'optimizer',
  };

  const result = applyAiToolAction(initialSnapshot, 'configure_planner', {
    eventName: 'Diwali Mega Expo',
    expectedFootfall: 25000,
    budgetCap: 12000,
    stallFee: 18000,
    replaceCategories: true,
    beautyFirst: true,
    categories: [
      { name: 'Kundan Choker', cost: 350, beauty: 9.5 },
      { name: 'Pearl Jhumka', cost: 90, price: 249, beauty: 8.5 },
      { name: 'Oxidized Cuff', cost: 150, beauty: 8.0 },
      { name: 'Mirror Bangle', cost: 120, beauty: 7.5 },
    ],
  });

  assert.equal(result.nextState.eventName, 'Diwali Mega Expo');
  assert.equal(result.nextState.expectedFootfall, 25000);
  assert.equal(result.nextState.budgetCap, 12000);
  assert.equal(result.nextState.categories.length, 4);
  assert.ok(result.nextState.categories[0].price > 350, 'Missing sell price should auto-estimate cleanly');
  assert.ok(result.activeCombo !== null && result.activeCombo.cost <= 12000);
  assert.ok(result.topCombos.length >= 1);

  const syncedRow = result.nextState.stallStock.find((s) => s.isSyncedBundle);
  assert.ok(syncedRow && syncedRow.cost === result.activeCombo!.cost);

  const lotUpdate = applyAiToolAction(result.nextState, 'manage_inventory_stock', {
    activeMixLotQty: 3,
    navigateToTab: 'calculator',
  });
  assert.equal(lotUpdate.nextState.activeTab, 'calculator');
  const updatedSynced = lotUpdate.nextState.stallStock.find((s) => s.isSyncedBundle);
  assert.equal(updatedSynced?.qty, 3);
  assert.ok(lotUpdate.stallTotals.totalUnits > result.stallTotals.totalUnits);
});

test('resolveCategoryGroups, computeDiversifiedOverviewTotals, and syncCategoryGroupsToStallStock handle multi-category portfolios', () => {
  const resolved = resolveCategoryGroups(INITIAL_CATEGORY_GROUPS);
  assert.equal(resolved.length, 3, 'Should resolve all 3 default category groups');

  resolved.forEach(({ group, combos, activeCombo }) => {
    assert.ok(combos.length > 0 && combos.length <= 15, `${group.name} should generate up to 15 combinations`);
    assert.ok(activeCombo !== null, `${group.name} should have an active preferred combination`);
    assert.ok(activeCombo!.cost <= group.budgetCap, `${group.name} active combo should respect its budgetCap`);
  });

  const overview = computeDiversifiedOverviewTotals(resolved);
  assert.equal(overview.totalAllocatedBudget, 11000, '3000 + 6000 + 2000 = 11000 total budget');
  assert.ok(overview.totalInvestment > 9000 && overview.totalInvestment <= 11000);
  assert.ok(overview.totalProfit100 > 11000);
  assert.ok(overview.totalPieces > 30);
  assert.ok(overview.weightedBeauty >= 7.5);

  const manualItems = INITIAL_STALL_STOCK.filter((s) => !s.isSyncedBundle);
  const syncedStock = syncCategoryGroupsToStallStock(resolved, manualItems, 90);
  const syncedBundles = syncedStock.filter((s) => s.isSyncedBundle);
  assert.equal(syncedBundles.length, 3, 'Should create 1 synced bundle row per category group');
  assert.equal(
    syncedBundles.reduce((sum, b) => sum + b.cost, 0),
    overview.totalInvestment,
    'Sum of synced bundle costs in Total Stall CFO must match Stock Overview total investment'
  );
});

import {
  formatAuthOrSyncError,
  hydrateWorkspaceSnapshot,
  resolvePreferredName,
  sanitizeWorkspaceMutableFields,
} from './accountHelpers';
import { formatAccountContextBlock } from '../server/stallTools';

test('sanitizeWorkspaceMutableFields and hydrateWorkspaceSnapshot round-trip multi-category groups and overview tab', () => {
  const customSnapshot: PlannerSnapshot = {
    eventName: 'Winter Crafts Fair',
    expectedFootfall: 8500,
    budgetCap: 3500,
    minProfitFloor: 3200,
    stallFee: 7500,
    maxPerCategory: 7,
    minColoursRule: 1,
    globalSellThrough: 85,
    activeTab: 'overview',
    rules: INITIAL_CATEGORY_GROUPS[0].rules,
    categories: INITIAL_CATEGORY_GROUPS[0].categories,
    selectedComboId: 'c_2',
    customQuantities: null,
    categoryGroups: [
      { ...INITIAL_CATEGORY_GROUPS[0], budgetCap: 3500, selectedComboId: 'c_2' },
      { ...INITIAL_CATEGORY_GROUPS[1], budgetCap: 7000, selectedComboId: 'c_3' },
    ],
    activeGroupId: INITIAL_CATEGORY_GROUPS[0].id,
    stallStock: [
      {
        id: 'sync_grp_bangles',
        name: 'Bangles Mix',
        category: 'Bangles',
        cost: 3500,
        price: 7200,
        qty: 1,
        sellThrough: 85,
        isSyncedBundle: true,
        unitPieces: 18,
        groupId: 'grp_bangles',
      },
    ],
  };

  const serialized = sanitizeWorkspaceMutableFields(customSnapshot);
  assert.equal(serialized.activeTab, 'overview');
  assert.equal(serialized.categoryGroups.length, 2);
  assert.equal(serialized.categoryGroups[1].budgetCap, 7000);
  assert.equal(serialized.stallStock[0].groupId, 'grp_bangles');

  const hydrated = hydrateWorkspaceSnapshot(serialized as unknown as Record<string, unknown>);
  assert.equal(hydrated.activeTab, 'overview');
  assert.equal(hydrated.categoryGroups?.length, 2);
  assert.equal(hydrated.categoryGroups?.[1].selectedComboId, 'c_3');
  assert.equal(hydrated.stallStock[0].groupId, 'grp_bangles');

  // Legacy single-group doc migration (without categoryGroups)
  const legacyHydrated = hydrateWorkspaceSnapshot({
    eventName: 'Legacy Event',
    budgetCap: 4500,
    minProfitFloor: 4000,
    categories: INITIAL_CATEGORIES,
    activeTab: 'optimizer',
  });
  assert.ok(legacyHydrated.categoryGroups && legacyHydrated.categoryGroups.length >= 1);
  assert.equal(legacyHydrated.categoryGroups[0].budgetCap, 4500);
});

test('applyAiToolAction keeps categoryGroups synchronized and supports overview tab navigation', () => {
  const resolved = resolveCategoryGroups(INITIAL_CATEGORY_GROUPS);
  const snapshot: PlannerSnapshot = {
    eventName: 'Grand Casa, Siliguri',
    expectedFootfall: 10000,
    budgetCap: INITIAL_CATEGORY_GROUPS[0].budgetCap,
    minProfitFloor: INITIAL_CATEGORY_GROUPS[0].minProfitFloor,
    stallFee: 9000,
    maxPerCategory: INITIAL_CATEGORY_GROUPS[0].maxPerCategory,
    minColoursRule: 1,
    globalSellThrough: 90,
    rules: INITIAL_CATEGORY_GROUPS[0].rules,
    categories: INITIAL_CATEGORY_GROUPS[0].categories,
    selectedComboId: 'c_1',
    customQuantities: null,
    stallStock: syncCategoryGroupsToStallStock(resolved, [], 90),
    activeTab: 'optimizer',
    categoryGroups: INITIAL_CATEGORY_GROUPS,
    activeGroupId: INITIAL_CATEGORY_GROUPS[0].id,
  };

  const result = applyAiToolAction(snapshot, 'configure_planner', {
    budgetCap: 4200,
    navigateToTab: 'overview',
  });

  assert.equal(result.nextState.activeTab, 'overview');
  assert.equal(result.nextState.categoryGroups?.[0].budgetCap, 4200);
  const banglesRow = result.nextState.stallStock.find((s) => s.groupId === 'grp_bangles');
  assert.ok(banglesRow && banglesRow.cost <= 4200 && banglesRow.cost > 3000);
});

test('resolvePreferredName, formatAccountContextBlock, and formatAuthOrSyncError behave cleanly without secrets', () => {
  assert.equal(resolvePreferredName({ preferredName: 'Aarav', displayName: 'Aarav Sen' }), 'Aarav');
  assert.equal(resolvePreferredName({ preferredName: '', displayName: 'Meera Das' }), 'Meera');
  assert.equal(resolvePreferredName(null), 'Merchant');

  const signedInBlock = formatAccountContextBlock({
    preferredName: 'Riya',
    displayName: 'Riya Kapoor',
    businessName: 'Riya Gems',
    memories: [{ fact: 'Focus on 2.8x markup', category: 'pricing' }],
  });
  assert.ok(signedInBlock.includes('Preferred Name="Riya"'));
  assert.ok(signedInBlock.includes('Focus on 2.8x markup'));

  const guestBlock = formatAccountContextBlock(undefined);
  assert.ok(!guestBlock.includes('Riya'));

  const domainMsg = formatAuthOrSyncError(
    { code: 'auth/unauthorized-domain' },
    'stalliq.vercel.app'
  );
  assert.ok(domainMsg.includes('stalliq.vercel.app'));
  assert.ok(domainMsg.includes('Authorized domains'));

  const firestoreJsonErr = new Error(
    JSON.stringify({
      error: 'Missing or insufficient permissions.',
      operationType: 'write',
      path: 'users/abc123/workspaces/active',
    })
  );
  const friendlyPerm = formatAuthOrSyncError(firestoreJsonErr);
  assert.ok(!friendlyPerm.startsWith('{'));
  assert.ok(!friendlyPerm.includes('abc123'));
  assert.ok(friendlyPerm.includes('firestore.rules'));
});

import { resolveItemPriceBounds } from './optimizer';
import { sanitizeCategories, sanitizeCategoryGroups } from './accountHelpers';
import type { BangleCategory } from '../types/stall';

test('resolveItemPriceBounds and generateBangleCombinations support optional price ranges, qty limits, and conservative sell-through risk', () => {
  const craftsItems: BangleCategory[] = [
    {
      id: 'craft_1',
      name: 'Macrame Wall Hanging',
      shortName: 'Macrame',
      cost: 280,
      price: 650,
      priceMin: 550,
      priceMax: 750,
      beauty: 9.0,
      minQty: 2,
      maxQty: 4,
      barColor: '#f59e0b',
      textClass: 'text-amber-300',
      bgClass: 'bg-amber-500/12 border-amber-500/35',
    },
    {
      id: 'craft_2',
      name: 'Scented Jar Candle',
      shortName: 'Candles',
      cost: 120,
      price: 299,
      beauty: 8.2,
      minQty: 3,
      maxQty: 8,
      barColor: '#10b981',
      textClass: 'text-emerald-300',
      bgClass: 'bg-emerald-500/12 border-emerald-500/35',
    },
  ];

  const bounds = resolveItemPriceBounds(craftsItems[0]);
  assert.equal(bounds.hasRange, true);
  assert.equal(bounds.min, 550);
  assert.equal(bounds.max, 750);
  assert.equal(bounds.target, 650);

  const combos = generateBangleCombinations(
    craftsItems,
    {
      budgetCap: 2000,
      minProfitFloor: 1500,
      maxPerCategory: 6,
      minColoursRule: 0,
      conservativeSellThroughPct: 80,
    },
    {
      allAtLeastOne: true,
      evenDistribution: false,
      beautyFirst: false,
      maxProfitFocus: false,
      safe90Mode: false,
    }
  );

  assert.ok(combos.length > 0, 'Should produce valid combinations honoring minQty/maxQty and 80% sell-through');
  const top = combos[0];
  assert.ok(top.counts[0] >= 2 && top.counts[0] <= 4);
  assert.ok(top.counts[1] >= 3 && top.counts[1] <= 8);
  assert.equal(top.sellThroughPct, 80);
  assert.equal(top.unsoldRiskCost, Math.round(top.cost * 0.2));
  assert.ok(top.revMin100! < top.rev100 && top.revMax100! > top.rev100);
  assert.ok(top.breakEvenSellThroughPct! > 0 && top.breakEvenSellThroughPct! < 100);
});

test('generateBangleCombinations handles 1-item category and bulky spend under 88%, and applyCustomQuantities flags over-budget cleanly', () => {
  const singleProduct: BangleCategory[] = [
    {
      id: 'kurti_1',
      name: 'Block Print Kurti',
      shortName: 'Kurti',
      cost: 420,
      price: 950,
      beauty: 8.6,
      barColor: '#ec4899',
      textClass: 'text-pink-300',
      bgClass: 'bg-pink-500/12 border-pink-500/35',
    },
  ];

  // Budget 1000 only fits 2 kurtis (cost 840 = 84% < 88% default spend floor) -> second DFS pass catches it
  const combos = generateBangleCombinations(
    singleProduct,
    {
      budgetCap: 1000,
      minProfitFloor: 800,
      maxPerCategory: 6,
      minColoursRule: 0,
      conservativeSellThroughPct: 85,
    },
    {
      allAtLeastOne: true,
      evenDistribution: false,
      beautyFirst: false,
      maxProfitFocus: false,
      safe90Mode: false,
    }
  );

  assert.equal(combos.length, 1);
  assert.deepEqual(combos[0].counts, [2]);
  assert.equal(combos[0].cost, 840);
  assert.equal(combos[0].sellThroughPct, 85);

  const overBudget = applyCustomQuantities(combos[0], [3], singleProduct, 800, 85, 1000);
  assert.equal(overBudget.cost, 1260);
  assert.equal(overBudget.isCustom, true);
  assert.ok(overBudget.reason?.includes('exceed your ₹1,000 budget by ₹260'));
  assert.equal(overBudget.unsoldRiskCost, Math.round(1260 * 0.15));
});

test('sanitizeCategories and sanitizeCategoryGroups preserve optional price ranges and qty limits without undefined keys', () => {
  const dirty: BangleCategory[] = [
    {
      id: 'photo_1',
      name: 'Instant Polaroid Print',
      shortName: 'Polaroid',
      cost: 35,
      price: 120,
      priceMin: 100,
      priceMax: 150,
      beauty: 9.2,
      minQty: 10,
      maxQty: 40,
      barColor: '#06b6d4',
      textClass: 'text-cyan-300',
      bgClass: 'bg-cyan-500/12 border-cyan-500/35',
    },
    {
      id: 'photo_2',
      name: 'Wooden Frame',
      shortName: 'Frame',
      cost: 90,
      price: 220,
      beauty: 7.8,
      barColor: '#8b5cf6',
      textClass: 'text-violet-300',
      bgClass: 'bg-violet-500/12 border-violet-500/35',
    },
  ];

  const cleanCats = sanitizeCategories(dirty);
  assert.equal(cleanCats[0].priceMin, 100);
  assert.equal(cleanCats[0].priceMax, 150);
  assert.equal(cleanCats[0].price, 125); // Midpoint
  assert.equal(cleanCats[0].minQty, 10);
  assert.equal(cleanCats[0].maxQty, 40);
  assert.equal('priceMin' in cleanCats[1], false);
  assert.equal('minQty' in cleanCats[1], false);

  const cleanGroups = sanitizeCategoryGroups([
    {
      ...INITIAL_CATEGORY_GROUPS[0],
      id: 'grp_photos',
      name: 'Photos & Prints',
      conservativeSellThroughPct: 80,
      categories: dirty,
    },
  ]);
  assert.equal(cleanGroups[0].conservativeSellThroughPct, 80);
  assert.equal(cleanGroups[0].categories[0].priceMin, 100);
});

import { sanitizeStock } from './accountHelpers';
import type { StallStockItem } from '../types/stall';

test('computeDiversifiedOverviewTotals accounts for event costs, net profit after fees, unsold inventory, and break-even', () => {
  const groups = [
    {
      ...INITIAL_CATEGORY_GROUPS[0],
      id: 'grp_1',
      name: 'Bangles',
      budgetCap: 3000,
      conservativeSellThroughPct: 85,
    },
    {
      ...INITIAL_CATEGORY_GROUPS[1],
      id: 'grp_2',
      name: 'Jewellery',
      budgetCap: 6000,
      conservativeSellThroughPct: 80,
    },
  ];
  const resolved = resolveCategoryGroups(groups);
  const noCostOverview = computeDiversifiedOverviewTotals(resolved, 0, 10000);
  assert.equal(noCostOverview.totalEventCosts, 0);
  assert.equal(noCostOverview.totalOutlay, noCostOverview.totalInvestment);
  assert.equal(noCostOverview.netProfit100AfterCosts, noCostOverview.totalProfit100);
  assert.ok(
    noCostOverview.weightedConservativeSellThroughPct >= 80 &&
      noCostOverview.weightedConservativeSellThroughPct <= 85
  );
  assert.ok(noCostOverview.unsoldInventoryCostConservative > 0);

  const eventCosts = 9000 + 1500;
  const withCostOverview = computeDiversifiedOverviewTotals(resolved, eventCosts, 5000);
  assert.equal(withCostOverview.totalEventCosts, 10500);
  assert.equal(withCostOverview.totalOutlay, withCostOverview.totalInvestment + 10500);
  assert.equal(withCostOverview.netProfit100AfterCosts, withCostOverview.totalProfit100 - 10500);
  assert.equal(withCostOverview.netProfitConservativeAfterCosts, withCostOverview.totalProfit90 - 10500);
  assert.ok(withCostOverview.breakEvenSellThroughPct > noCostOverview.breakEvenSellThroughPct);
  assert.ok(withCostOverview.unitsToBreakEven > noCostOverview.unitsToBreakEven);
  assert.ok(withCostOverview.footfallConversionNeeded > 0);
});

test('calculateStallTotals separates event_cost rows from stock metrics while including them in outlay and net profit', () => {
  const stockWithExpense: StallStockItem[] = [
    {
      id: 'sync_grp_a',
      name: 'Bangles Mix',
      category: 'Bangles',
      cost: 3000,
      price: 6800,
      qty: 1,
      sellThrough: 90,
      isSyncedBundle: true,
      unitPieces: 15,
      groupId: 'grp_a',
      itemType: 'stock',
    },
    {
      id: 'exp_display',
      name: 'Acrylic Display Risers',
      category: 'Display & Lighting',
      cost: 1200,
      price: 0,
      qty: 1,
      sellThrough: 100,
      isSyncedBundle: false,
      itemType: 'event_cost',
    },
  ];

  const totals = calculateStallTotals(stockWithExpense, 9000, 10000);
  assert.equal(totals.itemRows.length, 1);
  assert.equal(totals.eventCostRows.length, 1);
  assert.equal(totals.totalUnits, 15);
  assert.equal(totals.totalCost, 3000);
  assert.equal(totals.otherEventCosts, 1200);
  assert.equal(totals.totalEventCosts, 10200);
  assert.equal(totals.totalOutlay, 13200);
  assert.equal(totals.rev100, 6800);
  assert.equal(totals.grossProfit100, 3800);
  assert.equal(totals.netAfterStall100, 3800 - 10200);
  assert.equal(totals.unsoldInventoryCost, 300);
  assert.equal(totals.weightedSellThroughPct, 90);
});

test('syncCategoryGroupsToStallStock prevents duplicates, removes deleted categories, preserves qty and manual sellThrough', () => {
  const resolved = resolveCategoryGroups(INITIAL_CATEGORY_GROUPS);
  const legacyAndDuplicateStock: StallStockItem[] = [
    {
      id: 's_bangles',
      name: 'Legacy Bangles',
      category: 'Bangles',
      cost: 2990,
      price: 6500,
      qty: 2,
      sellThrough: 90,
      isSyncedBundle: true,
      unitPieces: 17,
    },
    {
      id: 'sync_grp_bangles',
      name: 'Duplicate Bangles',
      category: 'Bangles',
      cost: 2990,
      price: 6500,
      qty: 4,
      sellThrough: 80,
      isSyncedBundle: true,
      unitPieces: 17,
      groupId: 'grp_bangles',
    },
    {
      id: 'sync_grp_jewellery',
      name: 'Jewellery Manual ST',
      category: 'Jewellery',
      cost: 5900,
      price: 12000,
      qty: 1,
      sellThrough: 77,
      sellThroughManual: true,
      isSyncedBundle: true,
      unitPieces: 24,
      groupId: 'grp_jewellery',
    },
    {
      id: 'sync_deleted_category',
      name: 'Deleted Category',
      category: 'Old Cat',
      cost: 1500,
      price: 3000,
      qty: 1,
      sellThrough: 90,
      isSyncedBundle: true,
      groupId: 'grp_deleted',
    },
    {
      id: 'exp_1',
      name: 'Travel & Packaging',
      category: 'Event Cost',
      cost: 800,
      price: 0,
      qty: 1,
      sellThrough: 100,
      isSyncedBundle: false,
      itemType: 'event_cost',
    },
  ];

  const syncedOnce = syncCategoryGroupsToStallStock(resolved, legacyAndDuplicateStock, 90);
  const syncedTwice = syncCategoryGroupsToStallStock(resolved, syncedOnce, 90);

  const syncedBundles = syncedTwice.filter((r) => r.isSyncedBundle);
  assert.equal(syncedBundles.length, 3, 'Must produce exactly 1 bundle row per active category');
  assert.ok(!syncedTwice.some((r) => r.groupId === 'grp_deleted' || r.id === 's_bangles'));

  const banglesRow = syncedTwice.find((r) => r.groupId === 'grp_bangles')!;
  assert.equal(banglesRow.qty, 2, 'First matching legacy/canonical qty preserved without duplicating');
  assert.equal(
    banglesRow.sellThrough,
    resolved[0].group.conservativeSellThroughPct ?? 90,
    'Non-manual sellThrough follows category assumption'
  );

  const jewelleryRow = syncedTwice.find((r) => r.groupId === 'grp_jewellery')!;
  assert.equal(jewelleryRow.sellThrough, 77, 'Manual CFO sellThrough override is preserved');
  assert.equal(jewelleryRow.sellThroughManual, true);

  const expRow = syncedTwice.find((r) => r.id === 'exp_1');
  assert.ok(expRow && expRow.itemType === 'event_cost', 'Event cost rows remain intact');
});

test('sanitizeStock and hydrateWorkspaceSnapshot round-trip itemType and sellThroughManual without undefined keys', () => {
  const inputStock: StallStockItem[] = [
    {
      id: 'sync_grp_bangles',
      name: 'Bangles Mix',
      category: 'Bangles',
      cost: 3000,
      price: 6800,
      qty: 1,
      sellThrough: 82,
      sellThroughManual: true,
      isSyncedBundle: true,
      unitPieces: 16,
      groupId: 'grp_bangles',
      itemType: 'stock',
    },
    {
      id: 'exp_travel',
      name: 'Banner & Lighting',
      category: 'Event Cost',
      cost: 1500,
      price: 0,
      qty: 1,
      sellThrough: 100,
      isSyncedBundle: false,
      itemType: 'event_cost',
    },
  ];

  const clean = sanitizeStock(inputStock);
  assert.equal(clean[0].itemType, 'stock');
  assert.equal(clean[0].sellThroughManual, true);
  assert.equal(clean[1].itemType, 'event_cost');
  assert.equal('sellThroughManual' in clean[1], false);

  const hydrated = hydrateWorkspaceSnapshot({ stallStock: clean });
  assert.equal(hydrated.stallStock[0].sellThroughManual, true);
  assert.equal(hydrated.stallStock[1].itemType, 'event_cost');
});




