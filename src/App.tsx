import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AccountMemoryDrawer } from './components/AccountMemoryDrawer';
import { AiCommandBar } from './components/AiCommandBar';
import { CalculatorTab } from './components/CalculatorTab';
import { Header } from './components/Header';
import { OptimizerTab } from './components/OptimizerTab';
import { OverviewTab } from './components/OverviewTab';
import { StrategiesTab } from './components/StrategiesTab';
import { VoiceCoachModal } from './components/VoiceCoachModal';
import { useAuth } from './context/AuthContext';
import {
  EXTRA_CATEGORY_STYLES,
  GROUP_ACCENT_COLORS,
  INITIAL_CATEGORIES,
  INITIAL_CATEGORY_GROUPS,
} from './data/defaults';
import type {
  AiMemoryCategory,
  AppTab,
  BangleCategory,
  OptimizerRules,
  PlannerSnapshot,
  SaleScalePreset,
  StallStockItem,
  StockCategoryGroup,
} from './types/stall';
import { estimateRetailPrice } from './utils/aiActions';
import {
  calculateStallTotals,
  computeDiversifiedOverviewTotals,
  parseLocalRawCommand,
  resolveCategoryGroups,
  syncCategoryGroupsToStallStock,
} from './utils/optimizer';

export default function App() {
  const [activeTab, setActiveTab] = useState<AppTab>('optimizer');
  const [eventName, setEventName] = useState('Grand Casa, Siliguri');
  const [expectedFootfall, setExpectedFootfall] = useState(10000);
  const [stallFee, setStallFee] = useState(9000);
  const [globalSellThrough, setGlobalSellThrough] = useState(90);

  // Diversified Multi-Category Groups State
  const [categoryGroups, setCategoryGroups] = useState<StockCategoryGroup[]>(
    INITIAL_CATEGORY_GROUPS
  );
  const [activeGroupId, setActiveGroupId] = useState<string>(
    INITIAL_CATEGORY_GROUPS[0].id
  );
  const [showItemEditor, setShowItemEditor] = useState(false);
  const [copied, setCopied] = useState(false);

  // Smart AI Command Bar state
  const [aiInput, setAiInput] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiFeedback, setAiFeedback] = useState('');

  // Total Stall Calculator state
  const [stallStock, setStallStock] = useState<StallStockItem[]>(() =>
    syncCategoryGroupsToStallStock(
      resolveCategoryGroups(INITIAL_CATEGORY_GROUPS),
      [],
      90
    )
  );
  const [aiAuditLoading, setAiAuditLoading] = useState(false);
  const [aiAuditReport, setAiAuditReport] = useState<string | null>(null);
  const [aiAuditError, setAiAuditError] = useState<string | null>(null);

  // Floating Voice Coach Co-Pilot & Account Memory Drawer
  const [voiceModalOpen, setVoiceModalOpen] = useState(false);
  const [accountDrawerOpen, setAccountDrawerOpen] = useState(false);

  const {
    user,
    accountContext,
    syncStatus,
    authError,
    clearAuthError,
    addMemoriesBatch,
    syncWorkspace,
    registerWorkspaceHydrator,
  } = useAuth();
  const skipNextCloudSaveRef = useRef(true);
  const prevUidRef = useRef<string | null>(null);

  // Resolve all category groups (15 combinations + active preferred combo per category)
  const resolvedGroups = useMemo(
    () => resolveCategoryGroups(categoryGroups),
    [categoryGroups]
  );

  const overviewTotals = useMemo(
    () => computeDiversifiedOverviewTotals(resolvedGroups),
    [resolvedGroups]
  );

  const activeResolved = useMemo(
    () =>
      resolvedGroups.find((rg) => rg.group.id === activeGroupId) ||
      resolvedGroups[0],
    [resolvedGroups, activeGroupId]
  );

  const activeGroup = activeResolved.group;
  const generatedCombos = activeResolved.combos;
  const activeCombo = activeResolved.activeCombo;

  const updateActiveGroup = useCallback(
    (updater: (group: StockCategoryGroup) => StockCategoryGroup) => {
      setCategoryGroups((prev) =>
        prev.map((g) => (g.id === activeGroup.id ? updater(g) : g))
      );
    },
    [activeGroup.id]
  );

  // Keep synced category bundles updated inside Total Stall Stock
  useEffect(() => {
    setStallStock((prev) =>
      syncCategoryGroupsToStallStock(resolvedGroups, prev, globalSellThrough)
    );
  }, [resolvedGroups, globalSellThrough]);

  const addCategoryGroup = () => {
    const nextIdx = categoryGroups.length + 1;
    const accent =
      GROUP_ACCENT_COLORS[(nextIdx - 1) % GROUP_ACCENT_COLORS.length];
    const newId = `grp_${Date.now()}`;
    const newGroup: StockCategoryGroup = {
      id: newId,
      name: `Category ${nextIdx}`,
      accentColor: accent,
      budgetCap: 2500,
      minProfitFloor: 2600,
      maxPerCategory: 6,
      minColoursRule: 1,
      rules: {
        allAtLeastOne: true,
        evenDistribution: true,
        beautyFirst: false,
        maxProfitFocus: false,
        safe90Mode: false,
      },
      categories: [
        {
          id: `${newId}_1`,
          name: 'Hero Piece',
          shortName: 'Hero',
          cost: 220,
          price: 499,
          beauty: 9.2,
          barColor: '#fbbf24',
          textClass: 'text-amber-300',
          bgClass: 'bg-amber-500/12 border-amber-500/35',
        },
        {
          id: `${newId}_2`,
          name: 'Signature Set',
          shortName: 'Signature',
          cost: 160,
          price: 379,
          beauty: 8.6,
          barColor: '#06b6d4',
          textClass: 'text-cyan-300',
          bgClass: 'bg-cyan-500/12 border-cyan-500/35',
        },
        {
          id: `${newId}_3`,
          name: 'Daily Classic',
          shortName: 'Classic',
          cost: 120,
          price: 279,
          beauty: 8.0,
          barColor: '#10b981',
          textClass: 'text-emerald-300',
          bgClass: 'bg-emerald-500/12 border-emerald-500/35',
        },
        {
          id: `${newId}_4`,
          name: 'Impulse Add-On',
          shortName: 'Impulse',
          cost: 80,
          price: 199,
          beauty: 7.5,
          barColor: '#ec4899',
          textClass: 'text-pink-300',
          bgClass: 'bg-pink-500/12 border-pink-500/35',
        },
      ],
      selectedComboId: 'c_1',
      customQuantities: null,
    };

    setCategoryGroups((prev) => [...prev, newGroup]);
    setActiveGroupId(newId);
    setActiveTab('optimizer');
  };

  const removeCategoryGroup = (groupId: string) => {
    if (categoryGroups.length <= 1) return;
    setCategoryGroups((prev) => {
      const filtered = prev.filter((g) => g.id !== groupId);
      if (activeGroupId === groupId && filtered.length > 0) {
        setActiveGroupId(filtered[0].id);
      }
      return filtered;
    });
  };

  const renameCategoryGroup = (groupId: string, name: string) => {
    setCategoryGroups((prev) =>
      prev.map((g) => (g.id === groupId ? { ...g, name } : g))
    );
  };

  const selectGroupCombo = (groupId: string, comboId: string) => {
    setCategoryGroups((prev) =>
      prev.map((g) =>
        g.id === groupId
          ? { ...g, selectedComboId: comboId, customQuantities: null }
          : g
      )
    );
  };

  const toggleRule = (key: keyof OptimizerRules) => {
    updateActiveGroup((g) => {
      const nextRules = { ...g.rules, [key]: !g.rules[key] };
      if (key === 'beautyFirst' && nextRules.beautyFirst) {
        nextRules.maxProfitFocus = false;
      }
      if (key === 'maxProfitFocus' && nextRules.maxProfitFocus) {
        nextRules.beautyFirst = false;
      }
      return { ...g, rules: nextRules };
    });
  };

  const updateCat = (
    id: string,
    field: 'name' | 'cost' | 'price' | 'beauty',
    val: string
  ) => {
    updateActiveGroup((g) => ({
      ...g,
      categories: g.categories.map((c) => {
        if (c.id !== id) return c;
        if (field === 'name') {
          return { ...c, name: val, shortName: val.split(' ')[0] || val };
        }
        const num = Math.max(0, Number(val) || 0);
        return {
          ...c,
          [field]: field === 'beauty' ? Math.min(10, Math.max(1, num)) : num,
        };
      }),
    }));
  };

  const addCat = () => {
    updateActiveGroup((g) => {
      const style =
        EXTRA_CATEGORY_STYLES[
          g.categories.length % EXTRA_CATEGORY_STYLES.length
        ];
      const nextIdx = g.categories.length + 1;
      return {
        ...g,
        categories: [
          ...g.categories,
          {
            id: `item_${Date.now()}`,
            name: `Item ${nextIdx}`,
            shortName: `Item ${nextIdx}`,
            cost: 150,
            price: 349,
            beauty: 8.0,
            ...style,
          },
        ],
      };
    });
  };

  const removeCat = (id: string) => {
    updateActiveGroup((g) => {
      if (g.categories.length <= 2) return g;
      return {
        ...g,
        categories: g.categories.filter((c) => c.id !== id),
        customQuantities: null,
      };
    });
  };

  const applyScalePreset = (preset: SaleScalePreset) => {
    setEventName(preset.eventName);
    setExpectedFootfall(preset.expectedFootfall);
    setStallFee(preset.stallFee);
    const scaleRatio = preset.budgetCap / 3000;
    setCategoryGroups((prev) =>
      prev.map((g, idx) => {
        const baseBudget =
          INITIAL_CATEGORY_GROUPS[idx]?.budgetCap || g.budgetCap;
        const nextBudget = Math.max(500, Math.round(baseBudget * scaleRatio));
        const nextProfit = Math.max(
          400,
          Math.round(nextBudget * (preset.minProfitFloor / preset.budgetCap))
        );
        return {
          ...g,
          budgetCap: nextBudget,
          minProfitFloor: nextProfit,
          maxPerCategory: preset.maxPerCategory,
          customQuantities: null,
        };
      })
    );
    setAiAuditReport(null);
    setAiFeedback(`Updated to ${preset.label}`);
  };

  const resetAll = () => {
    setEventName('Grand Casa, Siliguri');
    setExpectedFootfall(10000);
    setStallFee(9000);
    setCategoryGroups(INITIAL_CATEGORY_GROUPS);
    setActiveGroupId(INITIAL_CATEGORY_GROUPS[0].id);
    setStallStock(
      syncCategoryGroupsToStallStock(
        resolveCategoryGroups(INITIAL_CATEGORY_GROUPS),
        [],
        90
      )
    );
    setGlobalSellThrough(90);
    setAiError(null);
    setAiAuditReport(null);
    setAiAuditError(null);
    setAiFeedback('');
  };

  const relaxConstraints = () => {
    updateActiveGroup((g) => ({
      ...g,
      rules: {
        allAtLeastOne: false,
        evenDistribution: false,
        beautyFirst: false,
        maxProfitFocus: false,
        safe90Mode: false,
      },
      minProfitFloor: Math.min(
        g.minProfitFloor,
        Math.max(100, Math.round(g.budgetCap * 0.4))
      ),
    }));
  };

  const stallTotals = useMemo(
    () => calculateStallTotals(stallStock, stallFee, expectedFootfall),
    [stallStock, stallFee, expectedFootfall]
  );

  const plannerSnapshot: PlannerSnapshot = useMemo(
    () => ({
      eventName,
      expectedFootfall,
      budgetCap: activeGroup.budgetCap,
      minProfitFloor: activeGroup.minProfitFloor,
      stallFee,
      maxPerCategory: activeGroup.maxPerCategory,
      minColoursRule: activeGroup.minColoursRule,
      globalSellThrough,
      rules: activeGroup.rules,
      categories: activeGroup.categories,
      selectedComboId: activeGroup.selectedComboId,
      customQuantities: activeGroup.customQuantities,
      stallStock,
      activeTab,
      categoryGroups,
      activeGroupId,
    }),
    [
      eventName,
      expectedFootfall,
      activeGroup,
      stallFee,
      globalSellThrough,
      stallStock,
      activeTab,
      categoryGroups,
      activeGroupId,
    ]
  );

  const applyAiPlannerSnapshot = useCallback(
    (next: PlannerSnapshot, changes: string[]) => {
      setEventName(next.eventName);
      setExpectedFootfall(next.expectedFootfall);
      setStallFee(next.stallFee);
      setGlobalSellThrough(next.globalSellThrough);
      if (
        Array.isArray(next.categoryGroups) &&
        next.categoryGroups.length > 0
      ) {
        setCategoryGroups(next.categoryGroups);
        if (next.activeGroupId) setActiveGroupId(next.activeGroupId);
      } else {
        setCategoryGroups((prev) =>
          prev.map((g, idx) =>
            idx === 0
              ? {
                  ...g,
                  budgetCap: next.budgetCap,
                  minProfitFloor: next.minProfitFloor,
                  maxPerCategory: next.maxPerCategory,
                  minColoursRule: next.minColoursRule,
                  rules: next.rules,
                  categories: next.categories,
                  selectedComboId: next.selectedComboId,
                  customQuantities: next.customQuantities,
                }
              : g
          )
        );
      }
      setStallStock(next.stallStock);
      setActiveTab(next.activeTab);
      setAiAuditReport(null);
      if (changes.length > 0) {
        setAiFeedback(`Updated: ${changes.slice(0, 4).join(' · ')}`);
      }
    },
    []
  );

  useEffect(() => {
    registerWorkspaceHydrator((saved) => {
      skipNextCloudSaveRef.current = true;
      applyAiPlannerSnapshot(saved, []);
    });
  }, [registerWorkspaceHydrator, applyAiPlannerSnapshot]);

  // Debounced cloud sync whenever plannerSnapshot changes while signed in
  useEffect(() => {
    if (!user) {
      prevUidRef.current = null;
      skipNextCloudSaveRef.current = true;
      return;
    }
    if (prevUidRef.current !== user.uid) {
      prevUidRef.current = user.uid;
      skipNextCloudSaveRef.current = true;
      return;
    }
    if (syncStatus === 'loading') return;
    if (skipNextCloudSaveRef.current) {
      skipNextCloudSaveRef.current = false;
      return;
    }

    const timer = window.setTimeout(() => {
      void syncWorkspace(plannerSnapshot);
    }, 1200);
    return () => window.clearTimeout(timer);
  }, [user, syncStatus, plannerSnapshot, syncWorkspace]);

  const stepQty = (idx: number, delta: number) => {
    if (!activeCombo) return;
    const next = [...activeCombo.counts];
    next[idx] = Math.max(0, (next[idx] || 0) + delta);
    updateActiveGroup((g) => ({ ...g, customQuantities: next }));
  };

  const copyOrder = () => {
    if (!activeCombo) return;
    const items = activeGroup.categories
      .map((c, i) =>
        activeCombo.counts[i] > 0
          ? `${activeCombo.counts[i]}x ${c.name} (₹${c.cost}→₹${c.price})`
          : null
      )
      .filter(Boolean)
      .join(' | ');
    const text = `StallIQ ${activeGroup.name} (${eventName}) ${activeCombo.label}: ${items} — Cost: ₹${activeCombo.cost} | Profit: +₹${activeCombo.prof100} | Beauty: ${activeCombo.avgBeauty}★`;
    navigator.clipboard?.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  // Dual-speed Smart Command Handler: instant local parse + low-latency Gemini API
  const handleSmartAiSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiInput.trim()) return;
    const rawText = aiInput.trim();
    setAiLoading(true);
    setAiError(null);

    const local = parseLocalRawCommand(
      rawText,
      activeGroup.categories,
      globalSellThrough
    );
    if (local.budgetCap) {
      updateActiveGroup((g) => ({ ...g, budgetCap: local.budgetCap! }));
    }
    if (local.minProfitFloor) {
      updateActiveGroup((g) => ({
        ...g,
        minProfitFloor: local.minProfitFloor!,
      }));
    }
    if (typeof local.stallFee === 'number') setStallFee(local.stallFee);
    if (local.expectedFootfall) setExpectedFootfall(local.expectedFootfall);
    if (local.maxPerCategory) {
      updateActiveGroup((g) => ({
        ...g,
        maxPerCategory: local.maxPerCategory!,
      }));
    }
    if (local.minColoursRule) {
      updateActiveGroup((g) => ({
        ...g,
        minColoursRule: local.minColoursRule!,
      }));
    }
    if (Object.keys(local.ruleUpdates).length > 0) {
      updateActiveGroup((g) => ({
        ...g,
        rules: { ...g.rules, ...local.ruleUpdates },
      }));
    }
    if (local.categoryUpdates.length > 0) {
      updateActiveGroup((g) => ({
        ...g,
        categories: g.categories.map((cat) => {
          const u = local.categoryUpdates.find((x) => x.id === cat.id);
          return u
            ? {
                ...cat,
                cost: u.cost ?? cat.cost,
                price: u.price ?? cat.price,
                beauty: u.beauty ?? cat.beauty,
              }
            : cat;
        }),
      }));
    }
    if (local.stockAdditions.length > 0) {
      setStallStock((prev) => [...prev, ...local.stockAdditions]);
    }

    try {
      const res = await fetch('/api/ai/parse-command', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          input: rawText,
          categories: activeGroup.categories.map((c) => ({
            name: c.name,
            cost: c.cost,
            price: c.price,
            beauty: c.beauty,
          })),
          settings: {
            eventName,
            expectedFootfall,
            budgetCap: activeGroup.budgetCap,
            minProfitFloor: activeGroup.minProfitFloor,
            stallFee,
            maxPerCategory: activeGroup.maxPerCategory,
          },
          accountContext,
        }),
      });

      const parsed = await res.json();
      if (!res.ok)
        throw new Error(parsed.error || 'AI command parsing unavailable');

      if (typeof parsed.eventName === 'string' && parsed.eventName.trim()) {
        setEventName(parsed.eventName.trim());
      }
      if (parsed.expectedFootfall && parsed.expectedFootfall >= 50) {
        setExpectedFootfall(parsed.expectedFootfall);
      }
      if (typeof parsed.stallFee === 'number' && parsed.stallFee >= 0) {
        setStallFee(parsed.stallFee);
      }

      updateActiveGroup((g) => {
        let nextCategories = g.categories;
        let nextCustom = g.customQuantities;

        if (
          Array.isArray(parsed.categoryUpdates) &&
          parsed.categoryUpdates.length > 0
        ) {
          if (parsed.replaceCategories) {
            const stylePool = [
              ...INITIAL_CATEGORIES.map(({ barColor, textClass, bgClass }) => ({
                barColor,
                textClass,
                bgClass,
              })),
              ...EXTRA_CATEGORY_STYLES,
            ];
            const rebuilt: BangleCategory[] = parsed.categoryUpdates
              .filter((u: { name?: string }) => u.name)
              .map(
                (
                  u: {
                    name: string;
                    cost?: number;
                    price?: number;
                    beauty?: number;
                  },
                  idx: number
                ) => {
                  const cost = u.cost && u.cost > 0 ? u.cost : 120;
                  const price =
                    u.price && u.price > 0
                      ? u.price
                      : estimateRetailPrice(cost);
                  return {
                    id: `cat_${Date.now()}_${idx}`,
                    name: u.name,
                    shortName: u.name.split(' ')[0],
                    cost,
                    price,
                    beauty: u.beauty
                      ? Math.min(10, Math.max(1, u.beauty))
                      : 8.0,
                    ...stylePool[idx % stylePool.length],
                  };
                }
              );
            if (rebuilt.length >= 2) {
              nextCategories = rebuilt;
              nextCustom = null;
            }
          } else {
            nextCategories = [...g.categories];
            parsed.categoryUpdates.forEach(
              (u: {
                name?: string;
                cost?: number;
                price?: number;
                beauty?: number;
                isNewBangleCategory?: boolean;
              }) => {
                if (!u.name) return;
                const uName = u.name.toLowerCase();
                const exists = nextCategories.some(
                  (c) =>
                    c.name.toLowerCase().includes(uName) ||
                    c.shortName.toLowerCase() === uName
                );
                if (exists) {
                  nextCategories = nextCategories.map((c) =>
                    c.name.toLowerCase().includes(uName) ||
                    c.shortName.toLowerCase() === uName
                      ? {
                          ...c,
                          cost: u.cost && u.cost > 0 ? u.cost : c.cost,
                          price: u.price && u.price > 0 ? u.price : c.price,
                          beauty:
                            u.beauty && u.beauty > 0
                              ? Math.min(10, u.beauty)
                              : c.beauty,
                        }
                      : c
                  );
                } else if (u.isNewBangleCategory) {
                  const style =
                    EXTRA_CATEGORY_STYLES[
                      nextCategories.length % EXTRA_CATEGORY_STYLES.length
                    ];
                  const cost = u.cost && u.cost > 0 ? u.cost : 150;
                  nextCategories.push({
                    id: `cat_${Date.now()}_${Math.random()
                      .toString(36)
                      .slice(2, 6)}`,
                    name: u.name || 'New Item',
                    shortName: (u.name || 'New').split(' ')[0],
                    cost,
                    price:
                      u.price && u.price > 0
                        ? u.price
                        : estimateRetailPrice(cost),
                    beauty: u.beauty || 8.0,
                    ...style,
                  });
                }
              }
            );
          }
        }

        return {
          ...g,
          budgetCap:
            parsed.budgetCap && parsed.budgetCap >= 200
              ? parsed.budgetCap
              : g.budgetCap,
          minProfitFloor:
            typeof parsed.minProfitFloor === 'number' &&
            parsed.minProfitFloor >= 50
              ? parsed.minProfitFloor
              : g.minProfitFloor,
          maxPerCategory:
            parsed.maxPerCategory && parsed.maxPerCategory >= 2
              ? parsed.maxPerCategory
              : g.maxPerCategory,
          rules: {
            allAtLeastOne:
              typeof parsed.allAtLeastOne === 'boolean'
                ? parsed.allAtLeastOne
                : g.rules.allAtLeastOne,
            evenDistribution:
              typeof parsed.evenDistribution === 'boolean'
                ? parsed.evenDistribution
                : g.rules.evenDistribution,
            beautyFirst:
              typeof parsed.beautyFirst === 'boolean'
                ? parsed.beautyFirst
                : g.rules.beautyFirst,
            maxProfitFocus:
              typeof parsed.maxProfitFocus === 'boolean'
                ? parsed.maxProfitFocus
                : g.rules.maxProfitFocus,
            safe90Mode:
              typeof parsed.safe90Mode === 'boolean'
                ? parsed.safe90Mode
                : g.rules.safe90Mode,
          },
          categories: nextCategories,
          customQuantities: nextCustom,
        };
      });

      if (
        Array.isArray(parsed.stallStockAdditions) &&
        parsed.stallStockAdditions.length > 0 &&
        local.stockAdditions.length === 0
      ) {
        setStallStock((prev) => [
          ...prev,
          ...parsed.stallStockAdditions.map(
            (
              s: {
                name?: string;
                category?: string;
                cost?: number;
                price?: number;
                qty?: number;
                sellThrough?: number;
              },
              idx: number
            ) => ({
              id: `ai_s_${Date.now()}_${idx}`,
              name: s.name || 'New Stock Item',
              category: s.category || 'Jewellery',
              cost: s.cost || 80,
              price: s.price || 249,
              qty: s.qty || 20,
              sellThrough: s.sellThrough || globalSellThrough,
              isSyncedBundle: false,
            })
          ),
        ]);
      }

      if (
        Array.isArray(parsed.memoryNotes) &&
        parsed.memoryNotes.length > 0 &&
        user
      ) {
        const cleanNotes = parsed.memoryNotes
          .filter(
            (m: { fact?: unknown }) =>
              typeof m?.fact === 'string' && m.fact.trim().length > 1
          )
          .map((m: { fact: string; category?: string }) => ({
            fact: m.fact.trim(),
            category: ([
              'inventory',
              'pricing',
              'event',
              'preference',
              'strategy',
            ].includes(m.category || '')
              ? m.category
              : 'preference') as AiMemoryCategory,
          }));
        if (cleanNotes.length > 0) {
          void addMemoriesBatch(cleanNotes, 'command');
        }
      }

      setAiFeedback(
        `Updated: ${local.changes.join(' · ') || 'parameters applied'}`
      );
      setAiInput('');
    } catch (err) {
      if (local.changes.length > 0) {
        setAiFeedback(`Updated: ${local.changes.join(' · ')}`);
        setAiInput('');
      } else {
        setAiError(
          err instanceof Error ? err.message : 'Unable to interpret command.'
        );
      }
    } finally {
      setAiLoading(false);
    }
  };

  // Total Stall stock handlers
  const applyGlobalSellThrough = (pct: number) => {
    setGlobalSellThrough(pct);
    setStallStock((prev) =>
      prev.map((item) => ({ ...item, sellThrough: pct }))
    );
  };

  const updateStockItem = (
    id: string,
    field: keyof StallStockItem,
    val: string
  ) => {
    setStallStock((prev) =>
      prev.map((item) =>
        item.id === id
          ? {
              ...item,
              [field]:
                field === 'name' || field === 'category'
                  ? val
                  : Math.max(0, Number(val) || 0),
            }
          : item
      )
    );
  };

  const addBlankStockItem = () => {
    setStallStock((prev) => [
      ...prev,
      {
        id: `stock_${Date.now()}`,
        name: `New Stall Item ${prev.length}`,
        category: 'Accessories',
        cost: 75,
        price: 229,
        qty: 20,
        sellThrough: globalSellThrough,
        isSyncedBundle: false,
      },
    ]);
  };

  const removeStockItem = (id: string) => {
    setStallStock((prev) => prev.filter((i) => i.id !== id));
  };

  const runAiCfoAudit = async () => {
    setAiAuditLoading(true);
    setAiAuditError(null);
    try {
      const res = await fetch('/api/ai/cfo-audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventName,
          stallFee,
          expectedFootfall,
          accountContext,
          totals: {
            totalCost: stallTotals.totalCost,
            totalOutlay: stallTotals.totalOutlay,
            revRealistic: stallTotals.revRealistic,
            netAfterStallReal: stallTotals.netAfterStallReal,
            unitsToBreakEven: stallTotals.unitsToBreakEven,
            footfallConversionNeeded: stallTotals.footfallConversionNeeded,
            blendedMarginPct: stallTotals.blendedMarginPct,
            rentBurdenPct: stallTotals.rentBurdenPct,
          },
          items: stallTotals.itemRows.map((r) => ({
            name: r.name,
            category: r.category,
            cost: r.cost,
            price: r.price,
            qty: r.qty,
            sellThrough: r.sellThrough,
            lineProfitReal: r.lineProfitReal,
            roiPct: r.roiPct,
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'CFO Audit request failed');
      setAiAuditReport(data.audit);
    } catch (err) {
      setAiAuditError(
        err instanceof Error ? err.message : 'Unable to run AI CFO Audit.'
      );
    } finally {
      setAiAuditLoading(false);
    }
  };

  const activeMixSummary = resolvedGroups
    .map(({ group, activeCombo: c }) =>
      c
        ? `${group.name}: ${c.label} (${c.badge}, ${c.pieces} pcs, Cost ₹${c.cost}, Profit +₹${c.prof100})`
        : `${group.name}: No mix`
    )
    .join(' | ');

  return (
    <div
      id="top"
      className="min-h-screen bg-[#090D16] text-slate-100 pb-20 selection:bg-amber-500/30"
    >
      <Header
        activeTab={activeTab}
        onTabChange={setActiveTab}
        eventName={eventName}
        onEventNameChange={setEventName}
        expectedFootfall={expectedFootfall}
        onExpectedFootfallChange={setExpectedFootfall}
        onApplyScalePreset={applyScalePreset}
        budgetCap={activeGroup.budgetCap}
        stallFee={stallFee}
        onStallFeeChange={setStallFee}
        totalAllocatedBudget={overviewTotals.totalAllocatedBudget}
        totalCategoriesCount={categoryGroups.length}
        onResetAll={resetAll}
        onOpenVoiceCoach={() => setVoiceModalOpen((prev) => !prev)}
        onOpenAccountDrawer={() => setAccountDrawerOpen(true)}
      />

      <main className="max-w-7xl mx-auto px-4 lg:px-8 pt-4 space-y-4">
        {authError && (
          <div className="bg-rose-950/50 border border-rose-500/40 rounded-xl px-4 py-2.5 flex items-center justify-between gap-3 text-xs text-rose-200">
            <span>{authError}</span>
            <button
              type="button"
              onClick={clearAuthError}
              className="text-rose-300 hover:text-white font-semibold shrink-0"
            >
              Dismiss
            </button>
          </div>
        )}

        {activeTab === 'optimizer' && (
          <AiCommandBar
            aiInput={aiInput}
            onAiInputChange={setAiInput}
            onSubmit={handleSmartAiSubmit}
            aiLoading={aiLoading}
            aiFeedback={aiFeedback}
            aiError={aiError}
          />
        )}

        {activeTab === 'optimizer' && (
          <OptimizerTab
            eventName={eventName}
            resolvedGroups={resolvedGroups}
            activeGroupId={activeGroup.id}
            onSelectGroup={(id) => setActiveGroupId(id)}
            onAddGroup={addCategoryGroup}
            onRemoveGroup={removeCategoryGroup}
            onRenameGroup={renameCategoryGroup}
            categories={activeGroup.categories}
            generatedCombos={generatedCombos}
            activeCombo={activeCombo}
            rules={activeGroup.rules}
            budgetCap={activeGroup.budgetCap}
            minProfitFloor={activeGroup.minProfitFloor}
            stallFee={stallFee}
            maxPerCategory={activeGroup.maxPerCategory}
            copied={copied}
            showItemEditor={showItemEditor}
            onToggleItemEditor={() => setShowItemEditor((prev) => !prev)}
            onUpdateCat={updateCat}
            onAddCat={addCat}
            onRemoveCat={removeCat}
            onToggleRule={toggleRule}
            onBudgetCapChange={(val) =>
              updateActiveGroup((g) => ({ ...g, budgetCap: val }))
            }
            onMinProfitFloorChange={(val) =>
              updateActiveGroup((g) => ({ ...g, minProfitFloor: val }))
            }
            onMaxPerCategoryChange={(val) =>
              updateActiveGroup((g) => ({ ...g, maxPerCategory: val }))
            }
            onSelectCombo={(id) =>
              updateActiveGroup((g) => ({
                ...g,
                selectedComboId: id,
                customQuantities: null,
              }))
            }
            onStepQty={stepQty}
            onResetCustomQty={() =>
              updateActiveGroup((g) => ({ ...g, customQuantities: null }))
            }
            onCopyOrder={copyOrder}
            onOpenOverview={() => setActiveTab('overview')}
            onOpenCalculator={() => setActiveTab('calculator')}
            onRelaxConstraints={relaxConstraints}
          />
        )}

        {activeTab === 'overview' && (
          <OverviewTab
            resolvedGroups={resolvedGroups}
            overviewTotals={overviewTotals}
            stallFee={stallFee}
            onSelectGroupCombo={selectGroupCombo}
            onEditCategoryGroup={(groupId) => {
              setActiveGroupId(groupId);
              setActiveTab('optimizer');
            }}
            onAddCategoryGroup={addCategoryGroup}
            onTransferToCfo={() => {
              setStallStock((prev) =>
                syncCategoryGroupsToStallStock(
                  resolvedGroups,
                  prev,
                  globalSellThrough
                )
              );
              setActiveTab('calculator');
            }}
          />
        )}

        {activeTab === 'calculator' && (
          <CalculatorTab
            eventName={eventName}
            expectedFootfall={expectedFootfall}
            activeCombo={activeCombo}
            stallTotals={stallTotals}
            stallFee={stallFee}
            globalSellThrough={globalSellThrough}
            onApplyGlobalSellThrough={applyGlobalSellThrough}
            onUpdateStockItem={updateStockItem}
            onAddStockItem={addBlankStockItem}
            onAddParsedStockItems={(items) =>
              setStallStock((prev) => [...prev, ...items])
            }
            onRemoveStockItem={removeStockItem}
            aiAuditLoading={aiAuditLoading}
            aiAuditReport={aiAuditReport}
            aiAuditError={aiAuditError}
            onRunAiCfoAudit={runAiCfoAudit}
          />
        )}

        {activeTab === 'strategies' && (
          <StrategiesTab
            eventName={eventName}
            expectedFootfall={expectedFootfall}
            activeMixSummary={activeMixSummary}
            stallFee={stallFee}
            accountContext={accountContext}
          />
        )}
      </main>

      <AccountMemoryDrawer
        isOpen={accountDrawerOpen}
        onClose={() => setAccountDrawerOpen(false)}
      />

      <VoiceCoachModal
        isOpen={voiceModalOpen}
        onClose={() => setVoiceModalOpen(false)}
        contextSummary={`Event: ${eventName} (${expectedFootfall} footfall); Portfolio: ${activeMixSummary}; Total Outlay: ₹${stallTotals.totalOutlay}; Projected Net Profit: ₹${stallTotals.netAfterStallReal}`}
        plannerSnapshot={plannerSnapshot}
        accountContext={accountContext}
        onApplyAiState={applyAiPlannerSnapshot}
        onMemoryAdditions={(items) => {
          if (user) {
            void addMemoriesBatch(items, 'voice');
          }
        }}
      />
    </div>
  );
}
