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

