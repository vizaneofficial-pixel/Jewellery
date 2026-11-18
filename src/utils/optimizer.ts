import type {
  BangleCategory,
  BangleCombo,
  CategoryGroupResolved,
  DiversifiedOverviewTotals,
  LocalParseResult,
  OptimizerConfig,
  OptimizerRules,
  StallStockItem,
  StallTotals,
  StockCategoryGroup,
} from '../types/stall';

const BADGE_STYLE_BY_TYPE: Record<string, string> = {
  'Top Appeal': 'bg-amber-500/15 text-amber-300 border-amber-500/35',
  'Top Profit': 'bg-emerald-500/15 text-emerald-300 border-emerald-500/35',
  'Conservative Safe': 'bg-indigo-500/15 text-indigo-300 border-indigo-500/35',
  'Balanced Variety': 'bg-cyan-500/15 text-cyan-300 border-cyan-500/35',
  'Strong All-Round': 'bg-slate-800/90 text-slate-200 border-slate-700',
  default: 'bg-slate-800/90 text-slate-200 border-slate-700',
};

const TAG_POOL = [
  'Balanced Variety',
  'Strong All-Round',
  'High Margin Mix',
  'Curated Blend',
  'Steady Turnover',
  'Appeal Focus',
  'Broad Assortment',
  'Focused Lot',
];

export function resolveItemPriceBounds(cat: Pick<BangleCategory, 'price' | 'priceMin' | 'priceMax'>): {
  min: number;
  max: number;
  target: number;
  hasRange: boolean;
} {
  const pMin =
    typeof cat.priceMin === 'number' && Number.isFinite(cat.priceMin) && cat.priceMin >= 0
      ? cat.priceMin
      : null;
  const pMax =
    typeof cat.priceMax === 'number' && Number.isFinite(cat.priceMax) && cat.priceMax >= 0
      ? cat.priceMax
      : null;

  if (pMin !== null && pMax !== null && pMax >= pMin && pMax > 0) {
    const target = Math.round((pMin + pMax) / 2);
    return {
      min: pMin,
      max: pMax,
      target,
      hasRange: pMax > pMin,
    };
  }
  const fixed = Math.max(0, Number(cat.price) || 0);
  return { min: fixed, max: fixed, target: fixed, hasRange: false };
}

function computeKeywords(
  counts: number[],
  categories: BangleCategory[],
  avgBeauty: number,
  evenness: number,
  prof90: number,
  minProfitFloor: number
): string[] {
  const keywords: string[] = [];
  let maxQty = -1;
  let maxIdx = 0;
  let totalPieces = 0;
  counts.forEach((q, i) => {
    totalPieces += q;
    if (q > maxQty) {
      maxQty = q;
      maxIdx = i;
    }
  });
  const leadCat = categories[maxIdx];
  if (leadCat && maxQty > 0) {
    keywords.push(`${leadCat.shortName || leadCat.name}-led (${maxQty})`);
  }
  if (avgBeauty >= 8.2) keywords.push('Top Appeal');
  else if (avgBeauty >= 7.75) keywords.push('Strong Appeal');
  if (evenness >= 8.2) keywords.push('Even Variety');
  const overloadLimit = Math.max(5, Math.ceil(totalPieces / Math.max(1, categories.length)) + 1);
  if (maxQty <= overloadLimit) keywords.push('Balanced Spread');
  if (prof90 >= minProfitFloor) keywords.push('Conservative Safe');
  if (counts.length > 0 && counts.every((q) => q >= 1)) keywords.push('All Items Stocked');
  return keywords.slice(0, 3);
}

export function generateBangleCombinations(
  categories: BangleCategory[],
  config: OptimizerConfig,
  rules: OptimizerRules
): BangleCombo[] {
  const n = categories.length;
  if (n === 0 || config.budgetCap <= 0) return [];

  const safePct = Math.min(99, Math.max(50, Math.round(config.conservativeSellThroughPct ?? 90)));
  const safeRate = safePct / 100;

  const resolvedPrices = categories.map((c) => resolveItemPriceBounds(c));
  const sumAllCosts = categories.reduce((acc, c) => acc + Math.max(1, c.cost), 0);
  const hasHighBeauty = categories.some((c) => c.beauty > 6.5);

  const minNeededEvenMax = Math.ceil((config.budgetCap * 1.18) / Math.max(1, sumAllCosts));
  const effectiveEvenMax = Math.max(config.maxPerCategory, minNeededEvenMax);

  const bounds = categories.map((cat) => {
    const hasExplicitMin = typeof cat.minQty === 'number' && Number.isFinite(cat.minQty) && cat.minQty >= 0;
    const hasExplicitMax = typeof cat.maxQty === 'number' && Number.isFinite(cat.maxQty) && cat.maxQty >= 0;

    let min = hasExplicitMin ? Math.floor(cat.minQty as number) : rules.allAtLeastOne ? 1 : 0;
    if (!hasExplicitMin && cat.id === 'colours' && config.minColoursRule > min) {
      min = config.minColoursRule;
    }

    const maxAfford =
      cat.cost > 0 ? Math.floor(config.budgetCap / cat.cost) : hasExplicitMax ? Math.floor(cat.maxQty as number) : 50;

    let max = hasExplicitMax
      ? Math.min(maxAfford, Math.floor(cat.maxQty as number))
      : rules.evenDistribution
        ? Math.min(maxAfford, effectiveEvenMax)
        : maxAfford;

    if (!hasExplicitMax && rules.evenDistribution && cat.beauty <= 6.0 && hasHighBeauty) {
      const cappedLow = Math.max(2, Math.round(effectiveEvenMax * 0.35));
      max = Math.min(max, cappedLow);
    }

    max = Math.max(0, Math.min(max, maxAfford));
    min = Math.min(min, max);
    return { min, max, hasExplicitMax };
  });

  // Only relax implicit low-appeal cap if needed to reach budget; never override user-explicit maxQty
  const maxSpendCheck = bounds.reduce((acc, b, idx) => acc + b.max * categories[idx].cost, 0);
  if (maxSpendCheck < config.budgetCap * 0.92) {
    bounds.forEach((b, idx) => {
      if (b.hasExplicitMax) return;
      const cat = categories[idx];
      const maxAfford = cat.cost > 0 ? Math.floor(config.budgetCap / cat.cost) : 50;
      b.max = Math.min(maxAfford, Math.max(b.max, effectiveEvenMax));
    });
  }

  const minSum = bounds.reduce((acc, b, idx) => acc + b.min * categories[idx].cost, 0);
  if (minSum > config.budgetCap) {
    return [];
  }

  interface RawCandidate {
    counts: number[];
    cost: number;
    rev100: number;
    prof100: number;
    rev90: number;
    prof90: number;
    revMin100: number;
    revMax100: number;
    profMin100: number;
    profMax100: number;
    unsoldRiskCost: number;
    breakEvenSellThroughPct: number;
    pieces: number;
    avgBeauty: number;
    evenness: number;
    marginPct: number;
    score: number;
  }

  const results: RawCandidate[] = [];
  const defaultMinSpend = config.budgetCap * 0.88;
  let nodes = 0;

  const evaluate = (counts: number[], minSpendThreshold = defaultMinSpend) => {
    let cost = 0;
    let rev100 = 0;
    let revMin100 = 0;
    let revMax100 = 0;
    let pieces = 0;
    let beautySum = 0;

    for (let i = 0; i < n; i++) {
      const q = counts[i];
      if (!q) continue;
      cost += q * categories[i].cost;
      rev100 += q * resolvedPrices[i].target;
      revMin100 += q * resolvedPrices[i].min;
      revMax100 += q * resolvedPrices[i].max;
      pieces += q;
      beautySum += q * categories[i].beauty;
    }

    if (pieces === 0 || cost > config.budgetCap || cost < minSpendThreshold) return;
    const prof100 = rev100 - cost;
    const rev90 = Math.round(rev100 * safeRate);
    const prof90 = rev90 - cost;

    if (prof100 < config.minProfitFloor) return;
    const avgBeauty = Number((beautySum / pieces).toFixed(2));
    if (rules.beautyFirst && avgBeauty < 7.75) return;
    if (rules.safe90Mode && prof90 < config.minProfitFloor * 0.8) return;

    const mean = pieces / n;
    const variance = counts.reduce((a, q) => a + Math.pow(q - mean, 2), 0) / n;
    const stdScale = Math.max(1, Math.sqrt(Math.max(1, mean)) * 0.85);
    const evenness = Number(Math.max(1, 10 - (Math.sqrt(variance) / stdScale) * 2.4).toFixed(2));
    const marginPct = rev100 > 0 ? Number(((prof100 / rev100) * 100).toFixed(1)) : 0;
    const unsoldRiskCost = Math.round(cost * (1 - safeRate));
    const breakEvenSellThroughPct = rev100 > 0 ? Math.min(100, Math.ceil((cost / rev100) * 100)) : 100;

    let score = (prof100 / config.budgetCap) * 40 + (avgBeauty / 10) * 35 + (evenness / 10) * 25;
    if (rules.beautyFirst) score = (avgBeauty / 10) * 80 + (prof100 / config.budgetCap) * 20;
    if (rules.maxProfitFocus) score = (prof100 / config.budgetCap) * 85 + (avgBeauty / 10) * 15;
    if (rules.safe90Mode) score = (prof90 / config.budgetCap) * 75 + (avgBeauty / 10) * 25;

    results.push({
      counts: [...counts],
      cost,
      rev100,
      prof100,
      rev90,
      prof90,
      revMin100,
      revMax100,
      profMin100: revMin100 - cost,
      profMax100: revMax100 - cost,
      unsoldRiskCost,
      breakEvenSellThroughPct,
      pieces,
      avgBeauty,
      evenness,
      marginPct,
      score,
    });
  };

  // Exact DFS for manageable spaces (supports 1..6 items cleanly)
  const searchProduct = bounds.reduce((acc, b) => acc * (b.max - b.min + 1), 1);
  if (n <= 6 && searchProduct <= 50000) {
    const runDfs = (minSpend: number) => {
      nodes = 0;
      const dfs = (idx: number, counts: number[], cost: number) => {
        if (nodes > 55000) return;
        nodes++;
        if (idx === n) {
          evaluate(counts, minSpend);
          return;
        }
        const { min, max } = bounds[idx];
        const cCost = categories[idx].cost;
        for (let q = min; q <= max; q++) {
          if (cost + q * cCost > config.budgetCap) break;
          counts[idx] = q;
          dfs(idx + 1, counts, cost + q * cCost);
        }
      };
      dfs(0, new Array(n).fill(0), 0);
    };

    runDfs(defaultMinSpend);
    // If bulky unit costs or tight per-item caps prevent spending >= 88% of budget, allow any strictly valid mix under budget
    if (results.length < 5) {
      runDfs(0);
    }
  }

  // Multi-profile weighted greedy + deterministic perturbation generator (works for any budget & any item count)
  if (results.length < 30) {
    const buildGreedy = (weights: number[], minSpend: number) => {
      const counts = bounds.map((b) => b.min);
      let cost = counts.reduce((acc, q, idx) => acc + q * categories[idx].cost, 0);

      for (let step = 0; step < 300; step++) {
        let bestIdx = -1;
        let bestGain = -Infinity;
        for (let i = 0; i < n; i++) {
          if (counts[i] >= bounds[i].max) continue;
          const cCost = categories[i].cost;
          if (cost + cCost > config.budgetCap) continue;
          const balanceBonus = 1 / (1 + counts[i] * 0.35);
          const gain = weights[i] * balanceBonus;
          if (gain > bestGain) {
            bestGain = gain;
            bestIdx = i;
          }
        }
        if (bestIdx === -1) break;
        counts[bestIdx] += 1;
        cost += categories[bestIdx].cost;
      }
      evaluate(counts, minSpend);
      return counts;
    };

    const seedBases: number[][] = [];
    const baseProfiles: number[][] = [
      categories.map((c, i) => ((resolvedPrices[i].target - c.cost) / Math.max(1, c.cost)) * 50 + c.beauty * 6),
      categories.map((c, i) => ((resolvedPrices[i].target - c.cost) / Math.max(1, c.cost)) * 100),
      categories.map((c, i) => resolvedPrices[i].target - c.cost),
      categories.map((c, i) => c.beauty * 15 + (resolvedPrices[i].target - c.cost) * 0.05),
      categories.map((c, i) => c.beauty * 8 + ((resolvedPrices[i].target - c.cost) / Math.max(1, resolvedPrices[i].target)) * 60),
      categories.map((c) => 1000 / Math.max(20, c.cost)),
    ];
    for (let lead = 0; lead < n; lead++) {
      baseProfiles.push(
        categories.map((c, idx) =>
          idx === lead
            ? c.beauty * 18 + (resolvedPrices[idx].target - c.cost) * 0.2 + 50
            : c.beauty * 4 + 10
        )
      );
    }

    baseProfiles.forEach((profile) => {
      seedBases.push(buildGreedy(profile, defaultMinSpend));
    });

    let seed = 1337;
    const nextRand = () => {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      return seed / 4294967296;
    };

    const runPerturbations = (minSpend: number) => {
      for (let iter = 0; iter < 160; iter++) {
        const base = [...seedBases[iter % seedBases.length]];
        const moves = 2 + (iter % 3);
        for (let m = 0; m < moves; m++) {
          const decIdx = Math.floor(nextRand() * n);
          if (base[decIdx] > bounds[decIdx].min) {
            base[decIdx] -= 1;
          }
        }
        let currCost = base.reduce((acc, q, idx) => acc + q * categories[idx].cost, 0);
        for (let fill = 0; fill < 40; fill++) {
          const candidatesIdx: number[] = [];
          for (let i = 0; i < n; i++) {
            if (base[i] < bounds[i].max && currCost + categories[i].cost <= config.budgetCap) {
              candidatesIdx.push(i);
            }
          }
          if (candidatesIdx.length === 0) break;
          const pick = candidatesIdx[Math.floor(nextRand() * candidatesIdx.length)];
          base[pick] += 1;
          currCost += categories[pick].cost;
        }
        evaluate(base, minSpend);
      }
    };

    runPerturbations(defaultMinSpend);
    if (results.length < 5) {
      baseProfiles.forEach((profile) => buildGreedy(profile, 0));
      runPerturbations(0);
    }
  }

  const unique = new Map<string, RawCandidate>();
  results.forEach((r) => {
    const k = r.counts.join('-');
    if (!unique.has(k)) unique.set(k, r);
  });

  const sorted = Array.from(unique.values()).sort((a, b) => {
    if (rules.beautyFirst) return b.avgBeauty - a.avgBeauty || b.prof100 - a.prof100;
    if (rules.maxProfitFocus) return b.prof100 - a.prof100 || b.avgBeauty - a.avgBeauty;
    if (rules.safe90Mode) return b.prof90 - a.prof90 || b.avgBeauty - a.avgBeauty;
    return b.score - a.score;
  });

  const diverse: RawCandidate[] = [];
  for (const cand of sorted) {
    if (diverse.length >= 15) break;
    const tooClose = diverse.some((ex) => {
      let diff = 0;
      for (let i = 0; i < n; i++) diff += Math.abs(ex.counts[i] - cand.counts[i]);
      return diff < 2;
    });
    if (!tooClose || sorted.length <= 15) diverse.push(cand);
  }

  if (diverse.length === 0) return [];

  const maxProf = Math.max(...diverse.map((d) => d.prof100));
  const maxBeauty = Math.max(...diverse.map((d) => d.avgBeauty));
  const maxEven = Math.max(...diverse.map((d) => d.evenness));
  const maxProf90 = Math.max(...diverse.map((d) => d.prof90));

  return diverse.map((item, i) => {
    let badge = TAG_POOL[i % TAG_POOL.length];
    let reason = `Strong gross profit (+₹${item.prof100.toLocaleString('en-IN')}) with ${item.avgBeauty}/10 appeal and ${item.evenness}/10 variety.`;

    if (item.avgBeauty === maxBeauty) {
      badge = 'Top Appeal';
      reason = `Highest customer appeal (${item.avgBeauty}/10) across ${item.pieces} pcs; ${safePct}% sell-through yields +₹${item.prof90.toLocaleString('en-IN')}.`;
    } else if (item.prof100 === maxProf) {
      badge = 'Top Profit';
      reason = `Highest gross profit (+₹${item.prof100.toLocaleString('en-IN')}, ${item.marginPct}% margin) within ₹${config.budgetCap.toLocaleString('en-IN')} budget.`;
    } else if (item.prof90 === maxProf90 && item.prof90 >= config.minProfitFloor) {
      badge = 'Conservative Safe';
      reason = `Best ${safePct}% sell-through cushion (+₹${item.prof90.toLocaleString('en-IN')} profit) with ₹${item.unsoldRiskCost.toLocaleString('en-IN')} unsold-cost risk.`;
    } else if (item.evenness === maxEven) {
      badge = 'Balanced Variety';
      reason = `Most even product spread (${item.evenness}/10) across ${item.pieces} pcs to limit single-item overstock.`;
    } else if (i === 0) {
      badge = 'Strong All-Round';
      reason = `Best overall balance of profit (+₹${item.prof100.toLocaleString('en-IN')}), appeal (${item.avgBeauty}/10), and variety (${item.evenness}/10).`;
    }

    return {
      ...item,
      id: `c_${i + 1}`,
      rank: i + 1,
      label: `#${String(i + 1).padStart(2, '0')}`,
      badge,
      badgeColor: BADGE_STYLE_BY_TYPE[badge] || BADGE_STYLE_BY_TYPE.default,
      sellThroughPct: safePct,
      reason,
      keywords: computeKeywords(
        item.counts,
        categories,
        item.avgBeauty,
        item.evenness,
        item.prof90,
        config.minProfitFloor
      ),
    };
  });
}

export function applyCustomQuantities(
  base: BangleCombo,
  customQuantities: number[],
  categories: BangleCategory[],
  minProfitFloor: number,
  conservativeSellThroughPct = 90,
  budgetCap?: number
): BangleCombo {
  const safePct = Math.min(99, Math.max(50, Math.round(conservativeSellThroughPct || 90)));
  const safeRate = safePct / 100;
  let cost = 0;
  let rev100 = 0;
  let revMin100 = 0;
  let revMax100 = 0;
  let pieces = 0;
  let beautySum = 0;

  customQuantities.forEach((q, i) => {
    if (!categories[i] || q <= 0) return;
    const rp = resolveItemPriceBounds(categories[i]);
    cost += q * categories[i].cost;
    rev100 += q * rp.target;
    revMin100 += q * rp.min;
    revMax100 += q * rp.max;
    pieces += q;
    beautySum += q * categories[i].beauty;
  });

  const rev90 = Math.round(rev100 * safeRate);
  const prof100 = rev100 - cost;
  const prof90 = rev90 - cost;
  const avgBeauty = pieces > 0 ? Number((beautySum / pieces).toFixed(2)) : 0;
  const mean = categories.length > 0 ? pieces / categories.length : 0;
  const variance =
    categories.length > 0
      ? customQuantities.reduce((a, q) => a + Math.pow(q - mean, 2), 0) / categories.length
      : 0;
  const stdScale = Math.max(1, Math.sqrt(Math.max(1, mean)) * 0.85);
  const evenness = Number(Math.max(1, 10 - (Math.sqrt(variance) / stdScale) * 2.4).toFixed(2));
  const marginPct = rev100 > 0 ? Number(((prof100 / rev100) * 100).toFixed(1)) : 0;
  const unsoldRiskCost = Math.round(cost * (1 - safeRate));
  const breakEvenSellThroughPct = rev100 > 0 ? Math.min(100, Math.ceil((cost / rev100) * 100)) : 100;

  let reason = `Custom quantities: ${pieces} pcs costing ₹${cost.toLocaleString('en-IN')} (${safePct}% profit +₹${prof90.toLocaleString('en-IN')}).`;
  if (typeof budgetCap === 'number' && cost > budgetCap) {
    reason = `Custom quantities exceed your ₹${budgetCap.toLocaleString('en-IN')} budget by ₹${(cost - budgetCap).toLocaleString('en-IN')}.`;
  } else if (prof100 < minProfitFloor) {
    reason = `Custom quantities are within budget but ₹${(minProfitFloor - prof100).toLocaleString('en-IN')} below your target profit.`;
  }

  return {
    ...base,
    badge: 'Custom Quantities',
    badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
    counts: customQuantities,
    cost,
    rev100,
    prof100,
    rev90,
    prof90,
    revMin100,
    revMax100,
    profMin100: revMin100 - cost,
    profMax100: revMax100 - cost,
    sellThroughPct: safePct,
    unsoldRiskCost,
    breakEvenSellThroughPct,
    reason,
    pieces,
    avgBeauty,
    evenness,
    marginPct,
    keywords: computeKeywords(customQuantities, categories, avgBeauty, evenness, prof90, minProfitFloor),
    isCustom: true,
  };
}

export function calculateStallTotals(
  stallStock: StallStockItem[],
  stallFee: number,
  expectedFootfall = 10000
): StallTotals {
  let totalCost = 0;
  let otherEventCosts = 0;
  let rev100 = 0;
  let revRealistic = 0;
  let unsoldInventoryCost = 0;
  let totalUnits = 0;
  let topRoiItemName = '—';
  let topRoiPct = -Infinity;

  const itemRows: StallTotals['itemRows'] = [];
  const eventCostRows: StallTotals['eventCostRows'] = [];

  stallStock.forEach((item) => {
    const isExpense = item.itemType === 'event_cost';
    const lineCost = Math.max(0, item.cost) * Math.max(0, item.qty);

    if (isExpense) {
      otherEventCosts += lineCost;
      eventCostRows.push({
        ...item,
        itemType: 'event_cost',
        lineCost,
        lineRev100: 0,
        lineProfit100: -lineCost,
        lineRevReal: 0,
        lineProfitReal: -lineCost,
        roiPct: 0,
        marginPct: 0,
        unitsCount: 0,
      });
      return;
    }

    const lineRev100 = Math.max(0, item.price) * Math.max(0, item.qty);
    const lineProfit100 = lineRev100 - lineCost;
    const clampedSt = Math.min(100, Math.max(0, item.sellThrough));
    const lineRevReal = Math.round(lineRev100 * (clampedSt / 100));
    const lineProfitReal = lineRevReal - lineCost;
    const roiPct = lineCost > 0 ? Number(((lineProfit100 / lineCost) * 100).toFixed(1)) : 0;
    const marginPct = lineRev100 > 0 ? Number(((lineProfit100 / lineRev100) * 100).toFixed(1)) : 0;
    const unitsCount = item.isSyncedBundle ? (item.unitPieces || 17) * item.qty : item.qty;

    totalCost += lineCost;
    rev100 += lineRev100;
    revRealistic += lineRevReal;
    unsoldInventoryCost += Math.round(lineCost * Math.max(0, 1 - clampedSt / 100));
    totalUnits += unitsCount;

    if (roiPct > topRoiPct && lineCost > 0) {
      topRoiPct = roiPct;
      topRoiItemName = item.name;
    }

    itemRows.push({
      ...item,
      itemType: 'stock',
      lineCost,
      lineRev100,
      lineProfit100,
      lineRevReal,
      lineProfitReal,
      roiPct,
      marginPct,
      unitsCount,
    });
  });

  const safeStallFee = Math.max(0, Number(stallFee) || 0);
  const totalEventCosts = safeStallFee + otherEventCosts;
  const grossProfit100 = rev100 - totalCost;
  const grossProfitReal = revRealistic - totalCost;
  const netAfterStall100 = grossProfit100 - totalEventCosts;
  const netAfterStallReal = grossProfitReal - totalEventCosts;
  const totalOutlay = totalCost + totalEventCosts;
  const breakEvenCoveragePct = Math.min(
    100,
    Math.max(0, Math.round((revRealistic / Math.max(1, totalOutlay)) * 100))
  );
  const breakEvenSellThroughPct =
    rev100 > 0 ? Math.min(999, Number(((totalOutlay / rev100) * 100).toFixed(1))) : 100;
  const avgItemPrice = totalUnits > 0 ? Math.round(rev100 / totalUnits) : 220;
  const unitsToBreakEven =
    totalUnits > 0 && rev100 > 0
      ? Math.min(totalUnits, Math.ceil(totalOutlay / Math.max(1, rev100 / totalUnits)))
      : 0;
  const footfallConversionNeeded = Number(
    ((unitsToBreakEven / Math.max(1, expectedFootfall)) * 100).toFixed(2)
  );
  const blendedMarginPct =
    revRealistic > 0 ? Number(((grossProfitReal / revRealistic) * 100).toFixed(1)) : 0;
  const capitalMultiple =
    totalOutlay > 0 ? Number((revRealistic / totalOutlay).toFixed(2)) : 0;
  const rentBurdenPct =
    grossProfitReal > 0
      ? Math.min(100, Number(((totalEventCosts / grossProfitReal) * 100).toFixed(1)))
      : totalEventCosts > 0
        ? 100
        : 0;
  const weightedSellThroughPct =
    rev100 > 0 ? Math.round((revRealistic / rev100) * 100) : 90;

  return {
    itemRows,
    eventCostRows,
    totalCost,
    otherEventCosts,
    totalEventCosts,
    totalOutlay,
    rev100,
    revRealistic,
    grossProfit100,
    grossProfitReal,
    netAfterStall100,
    netAfterStallReal,
    unsoldInventoryCost,
    weightedSellThroughPct,
    totalUnits,
    breakEvenCoveragePct,
    breakEvenSellThroughPct,
    unitsToBreakEven,
    footfallConversionNeeded,
    blendedMarginPct,
    capitalMultiple,
    rentBurdenPct,
    avgItemPrice,
    topRoiItemName,
    topRoiPct: topRoiPct === -Infinity ? 0 : topRoiPct,
  };
}

export function parseLocalRawCommand(
  rawText: string,
  categories: BangleCategory[],
  globalSellThrough: number
): LocalParseResult {
  const lower = rawText.toLowerCase();
  const changes: string[] = [];
  const result: LocalParseResult = {
    ruleUpdates: {},
    categoryUpdates: [],
    stockAdditions: [],
    changes,
  };

  const budgetMatch = lower.match(/budget\s*(?:of|is|to|=)?\s*₹?\s*(\d{3,7})/);
  if (budgetMatch) {
    const val = Number(budgetMatch[1]);
    result.budgetCap = val;
    changes.push(`Budget → ₹${val}`);
  }

  const profitMatch = lower.match(/(?:profit|floor)\s*(?:above|atleast|at least|min|to|=)?\s*₹?\s*(\d{3,7})/);
  if (profitMatch) {
    const val = Number(profitMatch[1]);
    result.minProfitFloor = val;
    changes.push(`Min Profit → ₹${val}`);
  }

  const stallMatch = lower.match(/(?:stall|event)\s*(?:fee|cost|rent)?\s*(?:is|to|=)?\s*₹?\s*(\d{2,7})/);
  if (stallMatch) {
    const val = Number(stallMatch[1]);
    result.stallFee = val;
    changes.push(`Stall Fee → ₹${val}`);
  }

  const crowdMatch = lower.match(/(?:crowd|footfall|visitors)\s*(?:of|is|at|around|=)?\s*(\d{2,7})/);
  if (crowdMatch) {
    const val = Number(crowdMatch[1]);
    result.expectedFootfall = val;
    changes.push(`Footfall → ${val.toLocaleString('en-IN')}`);
  }

  const maxMatch = lower.match(
    /(?:max|cap)\s*(\d{1,3})\s*(?:cuff|cuffs|each|per item)?|(?:max|cap)\s*(?:cuff|cuffs|each|per item)\s*(?:at|to|=)?\s*(\d{1,3})/
  );
  if (maxMatch) {
    const val = Number(maxMatch[1] || maxMatch[2]);
    if (val >= 2) {
      result.maxPerCategory = val;
      result.ruleUpdates.evenDistribution = true;
      changes.push(`Max per category → ${val}`);
    }
  }

  const minColMatch = lower.match(/min\s*(\d{1,2})\s*colours?/);
  if (minColMatch) {
    const val = Number(minColMatch[1]);
    result.minColoursRule = val;
    changes.push(`Min Colours → ${val}`);
  }

  if (lower.includes('all 6') || lower.includes('all categories') || lower.includes('atleast 1') || lower.includes('at least 1')) {
    result.ruleUpdates.allAtLeastOne = true;
    changes.push('All categories included');
  }
  if (lower.includes('even') || lower.includes('spread') || lower.includes('balance')) {
    result.ruleUpdates.evenDistribution = true;
    changes.push('Even spread enabled');
  }
  if (lower.includes('high beauty') || lower.includes('beauty first')) {
    result.ruleUpdates.beautyFirst = true;
    result.ruleUpdates.maxProfitFocus = false;
    changes.push('High beauty priority enabled');
  }
  if (lower.includes('max profit')) {
    result.ruleUpdates.maxProfitFocus = true;
    result.ruleUpdates.beautyFirst = false;
    changes.push('Max profit priority enabled');
  }
  if (lower.includes('90%')) {
    result.ruleUpdates.safe90Mode = true;
    changes.push('90% safe mode enabled');
  }

  categories.forEach((cat) => {
    const cKey = (cat.shortName || cat.name).toLowerCase();
    if (!lower.includes(cKey)) return;
    const costRegex = new RegExp(`${cKey}[^,.;]*?cost\\s*₹?\\s*(\\d{2,4})`, 'i');
    const sellRegex = new RegExp(`${cKey}[^,.;]*?(?:sell|price)\\s*₹?\\s*(\\d{2,4})`, 'i');
    const beautyRegex = new RegExp(`${cKey}[^,.;]*?(?:beauty|star|score)\\s*(\\d+(?:\\.\\d+)?)`, 'i');
    const cM = rawText.match(costRegex);
    const sM = rawText.match(sellRegex);
    const bM = rawText.match(beautyRegex);

    if (cM || sM || bM) {
      const update: { id: string; cost?: number; price?: number; beauty?: number } = { id: cat.id };
      if (cM) {
        update.cost = Number(cM[1]);
        changes.push(`${cat.shortName || cat.name} Cost → ₹${cM[1]}`);
      }
      if (sM) {
        update.price = Number(sM[1]);
        changes.push(`${cat.shortName || cat.name} Sell → ₹${sM[1]}`);
      }
      if (bM) {
        update.beauty = Math.min(10, Math.max(1, Number(bM[1])));
        changes.push(`${cat.shortName || cat.name} Beauty → ${update.beauty}★`);
      }
      result.categoryUpdates.push(update);
    }
  });

  const addMatch = rawText.match(
    /add\s+([a-zA-Z\s]+?)\s+cost\s*₹?\s*(\d+)\s*(?:sell|price)\s*₹?\s*(\d+)(?:.*?qty\s*(\d+))?/i
  );
  if (addMatch) {
    const itemName = addMatch[1].trim();
    const itemCost = Number(addMatch[2]);
    const itemPrice = Number(addMatch[3]);
    const itemQty = addMatch[4] ? Number(addMatch[4]) : 25;
    const formattedName = itemName
      .split(/\s+/)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
    result.stockAdditions.push({
      id: `s_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      name: formattedName,
      category: 'Custom',
      cost: itemCost,
      price: itemPrice,
      qty: itemQty,
      sellThrough: globalSellThrough,
      isSyncedBundle: false,
    });
    changes.push(`Added ${itemQty}x ${formattedName} (₹${itemCost}→₹${itemPrice})`);
  }

  return result;
}

export function resolveCategoryGroups(groups: StockCategoryGroup[]): CategoryGroupResolved[] {
  return groups.map((group) => {
    const safePct = group.conservativeSellThroughPct ?? 90;
    const combos = generateBangleCombinations(
      group.categories,
      {
        budgetCap: group.budgetCap,
        minProfitFloor: group.minProfitFloor,
        maxPerCategory: group.maxPerCategory,
        minColoursRule: group.minColoursRule,
        conservativeSellThroughPct: safePct,
      },
      group.rules
    );
    const base =
      combos.find((c) => c.id === group.selectedComboId) || combos[0] || null;
    const fallbackBase: BangleCombo = {
      id: 'custom',
      rank: 0,
      label: 'Custom',
      badge: 'Custom Quantities',
      keywords: [],
      badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
      counts: new Array(group.categories.length).fill(0),
      cost: 0,
      rev100: 0,
      prof100: 0,
      rev90: 0,
      prof90: 0,
      sellThroughPct: safePct,
      unsoldRiskCost: 0,
      breakEvenSellThroughPct: 100,
      reason: '',
      pieces: 0,
      avgBeauty: 0,
      evenness: 0,
      marginPct: 0,
      score: 0,
      isCustom: true,
    };

    const activeCombo =
      group.customQuantities && group.customQuantities.length === group.categories.length
        ? applyCustomQuantities(
            base || fallbackBase,
            group.customQuantities,
            group.categories,
            group.minProfitFloor,
            safePct,
            group.budgetCap
          )
        : base;

    return {
      group,
      combos,
      activeCombo,
    };
  });
}

export function computeDiversifiedOverviewTotals(
  resolvedGroups: CategoryGroupResolved[],
  totalEventCosts = 0,
  expectedFootfall = 10000
): DiversifiedOverviewTotals {
  let totalAllocatedBudget = 0;
  let totalInvestment = 0;
  let totalRevenue100 = 0;
  let totalRevenue90 = 0;
  let totalProfit100 = 0;
  let totalProfit90 = 0;
  let unsoldInventoryCostConservative = 0;
  let totalPieces = 0;
  let weightedBeautySum = 0;

  resolvedGroups.forEach(({ group, activeCombo }) => {
    totalAllocatedBudget += group.budgetCap;
    if (!activeCombo) return;
    totalInvestment += activeCombo.cost;
    totalRevenue100 += activeCombo.rev100;
    totalRevenue90 += activeCombo.rev90;
    totalProfit100 += activeCombo.prof100;
    totalProfit90 += activeCombo.prof90;
    unsoldInventoryCostConservative += activeCombo.unsoldRiskCost;
    totalPieces += activeCombo.pieces;
    weightedBeautySum += activeCombo.avgBeauty * activeCombo.pieces;
  });

  const weightedBeauty =
    totalPieces > 0 ? Number((weightedBeautySum / totalPieces).toFixed(2)) : 0;
  const blendedMarginPct =
    totalRevenue100 > 0
      ? Number(((totalProfit100 / totalRevenue100) * 100).toFixed(1))
      : 0;
  const weightedConservativeSellThroughPct =
    totalRevenue100 > 0 ? Math.round((totalRevenue90 / totalRevenue100) * 100) : 90;

  const safeEventCosts = Math.max(0, Number(totalEventCosts) || 0);
  const totalOutlay = totalInvestment + safeEventCosts;
  const netProfit100AfterCosts = totalProfit100 - safeEventCosts;
  const netProfitConservativeAfterCosts = totalProfit90 - safeEventCosts;
  const breakEvenSellThroughPct =
    totalRevenue100 > 0
      ? Math.min(999, Number(((totalOutlay / totalRevenue100) * 100).toFixed(1)))
      : 100;
  const unitsToBreakEven =
    totalPieces > 0 && totalRevenue100 > 0
      ? Math.min(totalPieces, Math.ceil(totalOutlay / Math.max(1, totalRevenue100 / totalPieces)))
      : 0;
  const footfallConversionNeeded = Number(
    ((unitsToBreakEven / Math.max(1, expectedFootfall)) * 100).toFixed(2)
  );

  return {
    totalAllocatedBudget,
    totalInvestment,
    totalRevenue100,
    totalRevenue90,
    totalProfit100,
    totalProfit90,
    totalPieces,
    weightedBeauty,
    blendedMarginPct,
    weightedConservativeSellThroughPct,
    unsoldInventoryCostConservative,
    totalEventCosts: safeEventCosts,
    totalOutlay,
    netProfit100AfterCosts,
    netProfitConservativeAfterCosts,
    breakEvenSellThroughPct,
    unitsToBreakEven,
    footfallConversionNeeded,
  };
}

export function syncCategoryGroupsToStallStock(
  resolvedGroups: CategoryGroupResolved[],
  existingStock: StallStockItem[],
  globalSellThrough = 90
): StallStockItem[] {
  const existingBundlesByGroup = new Map<string, StallStockItem>();
  const activeGroupIds = new Set(resolvedGroups.map((rg) => rg.group.id));

  existingStock.forEach((item) => {
    if (!item.isSyncedBundle || item.itemType === 'event_cost') return;
    const key =
      item.groupId ||
      (item.id === 's_bangles' ? 'grp_bangles' : item.id.replace(/^sync_/, ''));
    if (key && activeGroupIds.has(key) && !existingBundlesByGroup.has(key)) {
      existingBundlesByGroup.set(key, item);
    }
  });

  const seenSyncedIds = new Set<string>();
  const syncedRows: StallStockItem[] = resolvedGroups
    .filter((rg) => rg.activeCombo !== null)
    .map(({ group, activeCombo }) => {
      const prev = existingBundlesByGroup.get(group.id);
      const combo = activeCombo!;
      const canonicalId = `sync_${group.id}`;
      seenSyncedIds.add(canonicalId);
      const usePrevSellThrough = Boolean(prev && prev.sellThroughManual);
      return {
        id: canonicalId,
        name: `${group.name} Mix (${combo.label} · ${combo.pieces} pcs)`,
        category: group.name,
        cost: combo.cost,
        price: combo.rev100,
        qty: prev ? Math.max(1, prev.qty) : 1,
        sellThrough: usePrevSellThrough
          ? prev!.sellThrough
          : group.conservativeSellThroughPct ?? combo.sellThroughPct ?? globalSellThrough,
        isSyncedBundle: true,
        unitPieces: combo.pieces,
        groupId: group.id,
        itemType: 'stock',
        ...(usePrevSellThrough ? { sellThroughManual: true } : {}),
      };
    });

  // Deduplicate manual/expense rows and prevent any legacy synced clone from persisting
  const seenNonSyncedIds = new Set<string>();
  const nonSyncedRows = existingStock.filter((item) => {
    if (item.isSyncedBundle && item.itemType !== 'event_cost') return false;
    if (seenSyncedIds.has(item.id) || seenNonSyncedIds.has(item.id)) return false;
    seenNonSyncedIds.add(item.id);
    return true;
  });

  return [...syncedRows, ...nonSyncedRows];
}

