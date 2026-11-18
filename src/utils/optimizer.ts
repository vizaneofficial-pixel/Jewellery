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
  'Peak Beauty': 'bg-amber-500/15 text-amber-300 border-amber-500/35',
  'Max Profit': 'bg-emerald-500/15 text-emerald-300 border-emerald-500/35',
  '90% Safe': 'bg-indigo-500/15 text-indigo-300 border-indigo-500/35',
  'Balanced Mix': 'bg-cyan-500/15 text-cyan-300 border-cyan-500/35',
  'Zero Overload': 'bg-pink-500/15 text-pink-300 border-pink-500/35',
  default: 'bg-slate-800/90 text-slate-200 border-slate-700',
};

const TAG_POOL = [
  'Balanced Mix',
  'Zero Overload',
  'Colours Lead',
  'Festive Bright',
  'Sweet Spot',
  'Boutique Curated',
  'High Impulse',
  'Crowd Magnet',
];

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
  if (avgBeauty >= 8.2) keywords.push('Showstopper Aesthetic');
  else if (avgBeauty >= 7.75) keywords.push('High Appeal');
  if (evenness >= 8.2) keywords.push('Even Spread');
  const overloadLimit = Math.max(5, Math.ceil(totalPieces / Math.max(1, categories.length)) + 1);
  if (maxQty <= overloadLimit) keywords.push('No Category Overload');
  if (prof90 >= minProfitFloor) keywords.push('90% Sell-Safe');
  if (counts.every((q) => q >= 1)) keywords.push('Full Variety');
  return keywords.slice(0, 3);
}

export function generateBangleCombinations(
  categories: BangleCategory[],
  config: OptimizerConfig,
  rules: OptimizerRules
): BangleCombo[] {
  const n = categories.length;
  if (n === 0 || config.budgetCap <= 0) return [];

  const sumAllCosts = categories.reduce((acc, c) => acc + Math.max(1, c.cost), 0);
  const hasHighBeauty = categories.some((c) => c.beauty > 6.5);

  // Auto-scale maxPerCategory when budget exceeds what maxPerCategory * sumAllCosts can cover
  const minNeededEvenMax = Math.ceil((config.budgetCap * 1.18) / Math.max(1, sumAllCosts));
  const effectiveEvenMax = Math.max(config.maxPerCategory, minNeededEvenMax);

  const bounds = categories.map((cat) => {
    let min = rules.allAtLeastOne ? 1 : 0;
    if (cat.id === 'colours' && config.minColoursRule > min) min = config.minColoursRule;
    let max = rules.evenDistribution
      ? effectiveEvenMax
      : Math.max(11, Math.ceil((config.budgetCap * 0.55) / Math.max(1, cat.cost)));
    if (rules.evenDistribution && cat.beauty <= 6.0 && hasHighBeauty) {
      const cappedLow = Math.max(2, Math.round(effectiveEvenMax * 0.35));
      max = Math.min(max, cappedLow);
    }
    const maxAfford = cat.cost > 0 ? Math.floor(config.budgetCap / cat.cost) : 10;
    max = Math.max(0, Math.min(max, maxAfford));
    min = Math.min(min, max);
    return { min, max };
  });

  // If low-beauty cap made hitting 92% of budget impossible, relax the low-beauty cap
  const maxSpendCheck = bounds.reduce((acc, b, idx) => acc + b.max * categories[idx].cost, 0);
  if (maxSpendCheck < config.budgetCap * 0.92) {
    bounds.forEach((b, idx) => {
      const cat = categories[idx];
      const maxAfford = cat.cost > 0 ? Math.floor(config.budgetCap / cat.cost) : 10;
      b.max = Math.min(maxAfford, Math.max(b.max, effectiveEvenMax));
    });
  }

  // Ensure minimum baseline cost does not exceed budgetCap
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
    pieces: number;
    avgBeauty: number;
    evenness: number;
    marginPct: number;
    score: number;
  }

  const results: RawCandidate[] = [];
  const minBudgetUse = config.budgetCap * 0.88;
  let nodes = 0;

  const evaluate = (counts: number[], relaxed = false) => {
    let cost = 0;
    let rev100 = 0;
    let pieces = 0;
    let beautySum = 0;

    for (let i = 0; i < n; i++) {
      const q = counts[i];
      if (!q) continue;
      cost += q * categories[i].cost;
      rev100 += q * categories[i].price;
      pieces += q;
      beautySum += q * categories[i].beauty;
    }

    const minUse = relaxed ? config.budgetCap * 0.7 : minBudgetUse;
    if (pieces === 0 || cost > config.budgetCap || cost < minUse) return;
    const prof100 = rev100 - cost;
    const rev90 = Math.round(rev100 * 0.9);
    const prof90 = rev90 - cost;

    const minFloor = relaxed ? config.minProfitFloor * 0.72 : config.minProfitFloor;
    if (prof100 < minFloor) return;
    const avgBeauty = Number((beautySum / pieces).toFixed(2));
    if (!relaxed && rules.beautyFirst && avgBeauty < 7.75) return;
    if (!relaxed && rules.safe90Mode && prof90 < config.minProfitFloor * 0.8) return;

    const mean = pieces / n;
    const variance = counts.reduce((a, q) => a + Math.pow(q - mean, 2), 0) / n;
    const stdScale = Math.max(1, Math.sqrt(Math.max(1, mean)) * 0.85);
    const evenness = Number(Math.max(1, 10 - (Math.sqrt(variance) / stdScale) * 2.4).toFixed(2));
    const marginPct = rev100 > 0 ? Number(((prof100 / rev100) * 100).toFixed(1)) : 0;

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
      pieces,
      avgBeauty,
      evenness,
      marginPct,
      score,
    });
  };

  // Exact DFS for manageable category counts & piece ranges
  const avgRange = bounds.reduce((acc, b) => acc + (b.max - b.min + 1), 0) / n;
  if (n <= 6 && avgRange <= 10) {
    const dfs = (idx: number, counts: number[], cost: number) => {
      if (nodes > 45000) return;
      nodes++;
      if (idx === n) {
        evaluate(counts, false);
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
  }

  // Multi-profile weighted greedy + deterministic perturbation generator (works for any budget & any category count)
  if (results.length < 30) {
    const buildGreedy = (weights: number[], relaxed = false) => {
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
      evaluate(counts, relaxed);
      return counts;
    };

    const seedBases: number[][] = [];
    // Profile weights: balanced, profit ROI, raw profit, beauty first, plus leading each category
    const baseProfiles: number[][] = [
      categories.map((c) => ((c.price - c.cost) / Math.max(1, c.cost)) * 50 + c.beauty * 6),
      categories.map((c) => ((c.price - c.cost) / Math.max(1, c.cost)) * 100),
      categories.map((c) => c.price - c.cost),
      categories.map((c) => c.beauty * 15 + (c.price - c.cost) * 0.05),
      categories.map((c) => c.beauty * 8 + ((c.price - c.cost) / Math.max(1, c.price)) * 60),
      categories.map((c) => 1000 / Math.max(20, c.cost)),
    ];
    for (let lead = 0; lead < n; lead++) {
      baseProfiles.push(
        categories.map((c, idx) =>
          idx === lead ? c.beauty * 18 + (c.price - c.cost) * 0.2 + 50 : c.beauty * 4 + 10
        )
      );
    }

    baseProfiles.forEach((profile) => {
      seedBases.push(buildGreedy(profile, false));
    });

    // Deterministic perturbations across seed bases to explore diverse mixes
    let seed = 1337;
    const nextRand = () => {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      return seed / 4294967296;
    };

    for (let iter = 0; iter < 160; iter++) {
      const base = [...seedBases[iter % seedBases.length]];
      // Apply 2-4 swap/tweak moves
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
      evaluate(base, false);
    }

    // If strict constraints yielded < 15, run relaxed evaluation pass across profiles
    if (results.length < 15) {
      baseProfiles.forEach((profile) => {
        buildGreedy(profile, true);
      });
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
    const overloadLimit = Math.max(5, Math.ceil(item.pieces / Math.max(1, n)) + 1);

    if (item.avgBeauty === maxBeauty) {
      badge = 'Peak Beauty';
    } else if (item.prof100 === maxProf) {
      badge = 'Max Profit';
    } else if (item.prof90 === maxProf90 && item.prof90 >= config.minProfitFloor) {
      badge = '90% Safe';
    } else if (item.evenness === maxEven) {
      badge = 'Balanced Mix';
    } else if (Math.max(...item.counts) <= overloadLimit) {
      badge = 'Zero Overload';
    }

    return {
      ...item,
      id: `c_${i + 1}`,
      rank: i + 1,
      label: `#${String(i + 1).padStart(2, '0')}`,
      badge,
      badgeColor: BADGE_STYLE_BY_TYPE[badge] || BADGE_STYLE_BY_TYPE.default,
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
  minProfitFloor: number
): BangleCombo {
  let cost = 0;
  let rev100 = 0;
  let pieces = 0;
  let beautySum = 0;

  customQuantities.forEach((q, i) => {
    if (!categories[i] || q <= 0) return;
    cost += q * categories[i].cost;
    rev100 += q * categories[i].price;
    pieces += q;
    beautySum += q * categories[i].beauty;
  });

  const rev90 = Math.round(rev100 * 0.9);
  const prof100 = rev100 - cost;
  const prof90 = rev90 - cost;
  const avgBeauty = pieces > 0 ? Number((beautySum / pieces).toFixed(2)) : 0;
  const mean = categories.length > 0 ? pieces / categories.length : 0;
  const variance =
    categories.length > 0
      ? customQuantities.reduce((a, q) => a + Math.pow(q - mean, 2), 0) / categories.length
      : 0;
  const evenness = Number(Math.max(1, 10 - Math.sqrt(variance) * 1.5).toFixed(2));
  const marginPct = rev100 > 0 ? Number(((prof100 / rev100) * 100).toFixed(1)) : 0;

  return {
    ...base,
    badge: 'Custom Mix',
    badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
    counts: customQuantities,
    cost,
    rev100,
    prof100,
    rev90,
    prof90,
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
  let rev100 = 0;
  let revRealistic = 0;
  let totalUnits = 0;
  let topRoiItemName = '—';
  let topRoiPct = -Infinity;

  const itemRows = stallStock.map((item) => {
    const lineCost = item.cost * item.qty;
    const lineRev100 = item.price * item.qty;
    const lineProfit100 = lineRev100 - lineCost;
    const lineRevReal = Math.round(lineRev100 * (item.sellThrough / 100));
    const lineProfitReal = lineRevReal - lineCost;
    const roiPct = lineCost > 0 ? Number(((lineProfit100 / lineCost) * 100).toFixed(1)) : 0;
    const marginPct = lineRev100 > 0 ? Number(((lineProfit100 / lineRev100) * 100).toFixed(1)) : 0;
    const unitsCount = item.isSyncedBundle ? (item.unitPieces || 17) * item.qty : item.qty;

    totalCost += lineCost;
    rev100 += lineRev100;
    revRealistic += lineRevReal;
    totalUnits += unitsCount;

    if (roiPct > topRoiPct) {
      topRoiPct = roiPct;
      topRoiItemName = item.name;
    }

    return {
      ...item,
      lineCost,
      lineRev100,
      lineProfit100,
      lineRevReal,
      lineProfitReal,
      roiPct,
      marginPct,
      unitsCount,
    };
  });

  const grossProfit100 = rev100 - totalCost;
  const grossProfitReal = revRealistic - totalCost;
  const netAfterStall100 = grossProfit100 - stallFee;
  const netAfterStallReal = grossProfitReal - stallFee;
  const totalOutlay = totalCost + stallFee;
  const breakEvenCoveragePct = Math.min(100, Math.max(0, Math.round((revRealistic / Math.max(1, totalOutlay)) * 100)));
  const avgItemPrice = totalUnits > 0 ? Math.round(rev100 / totalUnits) : 220;
  const unitsToBreakEven = totalUnits > 0 ? Math.min(totalUnits, Math.ceil(totalOutlay / Math.max(1, avgItemPrice))) : 0;
  const footfallConversionNeeded = Number(((unitsToBreakEven / Math.max(1, expectedFootfall)) * 100).toFixed(2));
  const blendedMarginPct = revRealistic > 0 ? Number(((grossProfitReal / revRealistic) * 100).toFixed(1)) : 0;
  const capitalMultiple = totalOutlay > 0 ? Number((revRealistic / totalOutlay).toFixed(2)) : 0;
  const rentBurdenPct =
    grossProfitReal > 0 ? Math.min(100, Number(((stallFee / grossProfitReal) * 100).toFixed(1))) : 100;

  return {
    itemRows,
    totalCost,
    totalOutlay,
    rev100,
    revRealistic,
    grossProfit100,
    grossProfitReal,
    netAfterStall100,
    netAfterStallReal,
    totalUnits,
    breakEvenCoveragePct,
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
    const combos = generateBangleCombinations(
      group.categories,
      {
        budgetCap: group.budgetCap,
        minProfitFloor: group.minProfitFloor,
        maxPerCategory: group.maxPerCategory,
        minColoursRule: group.minColoursRule,
      },
      group.rules
    );
    const base =
      combos.find((c) => c.id === group.selectedComboId) || combos[0] || null;
    const activeCombo =
      base &&
      group.customQuantities &&
      group.customQuantities.length === group.categories.length
        ? applyCustomQuantities(
            base,
            group.customQuantities,
            group.categories,
            group.minProfitFloor
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
  resolvedGroups: CategoryGroupResolved[]
): DiversifiedOverviewTotals {
  let totalAllocatedBudget = 0;
  let totalInvestment = 0;
  let totalRevenue100 = 0;
  let totalRevenue90 = 0;
  let totalProfit100 = 0;
  let totalProfit90 = 0;
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
    totalPieces += activeCombo.pieces;
    weightedBeautySum += activeCombo.avgBeauty * activeCombo.pieces;
  });

  const weightedBeauty =
    totalPieces > 0 ? Number((weightedBeautySum / totalPieces).toFixed(2)) : 0;
  const blendedMarginPct =
    totalRevenue100 > 0
      ? Number(((totalProfit100 / totalRevenue100) * 100).toFixed(1))
      : 0;

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
  };
}

export function syncCategoryGroupsToStallStock(
  resolvedGroups: CategoryGroupResolved[],
  existingStock: StallStockItem[],
  globalSellThrough = 90
): StallStockItem[] {
  const existingBundlesByGroup = new Map<string, StallStockItem>();
  existingStock.forEach((item) => {
    if (item.isSyncedBundle && item.groupId) {
      existingBundlesByGroup.set(item.groupId, item);
    } else if (item.isSyncedBundle && item.id === 's_bangles') {
      existingBundlesByGroup.set('grp_bangles', item);
    }
  });

  const syncedRows: StallStockItem[] = resolvedGroups
    .filter((rg) => rg.activeCombo !== null)
    .map(({ group, activeCombo }) => {
      const prev = existingBundlesByGroup.get(group.id);
      const combo = activeCombo!;
      return {
        id: prev?.id || `sync_${group.id}`,
        name: `${group.name} Mix (${combo.label} · ${combo.pieces} pcs)`,
        category: group.name,
        cost: combo.cost,
        price: combo.rev100,
        qty: prev ? Math.max(1, prev.qty) : 1,
        sellThrough: prev ? prev.sellThrough : globalSellThrough,
        isSyncedBundle: true,
        unitPieces: combo.pieces,
        groupId: group.id,
      };
    });

  const manualRows = existingStock.filter((item) => !item.isSyncedBundle);
  return [...syncedRows, ...manualRows];
}

