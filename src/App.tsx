import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AccountMemoryDrawer } from './components/AccountMemoryDrawer';
import { AiCommandBar } from './components/AiCommandBar';
import { CalculatorTab } from './components/CalculatorTab';
import { Header } from './components/Header';
import { OptimizerTab } from './components/OptimizerTab';
import { StrategiesTab } from './components/StrategiesTab';
import { VoiceCoachModal } from './components/VoiceCoachModal';
import { useAuth } from './context/AuthContext';
import { EXTRA_CATEGORY_STYLES, INITIAL_CATEGORIES, INITIAL_STALL_STOCK } from './data/defaults';
import type {
  AiMemoryCategory,
  AppTab,
  BangleCategory,
  OptimizerRules,
  PlannerSnapshot,
  SaleScalePreset,
  StallStockItem,
} from './types/stall';
import { estimateRetailPrice } from './utils/aiActions';
import {
  applyCustomQuantities,
  calculateStallTotals,
  generateBangleCombinations,
  parseLocalRawCommand,
} from './utils/optimizer';

export default function App() {
  const [activeTab, setActiveTab] = useState<AppTab>('optimizer');
  const [eventName, setEventName] = useState('Grand Casa, Siliguri');
  const [expectedFootfall, setExpectedFootfall] = useState(10000);
  const [budgetCap, setBudgetCap] = useState(3000);
  const [minProfitFloor, setMinProfitFloor] = useState(3100);
  const [stallFee, setStallFee] = useState(9000);
  const [maxPerCategory, setMaxPerCategory] = useState(6);
  const [minColoursRule, setMinColoursRule] = useState(1);
  const [globalSellThrough, setGlobalSellThrough] = useState(90);
  const [categories, setCategories] = useState<BangleCategory[]>(INITIAL_CATEGORIES);
  const [showItemEditor, setShowItemEditor] = useState(false);

  const [rules, setRules] = useState<OptimizerRules>({
    allAtLeastOne: true,
    evenDistribution: true,
    beautyFirst: false,
    maxProfitFocus: false,
    safe90Mode: false,
  });

  const [selectedComboId, setSelectedComboId] = useState<string | null>(null);
  const [customQuantities, setCustomQuantities] = useState<number[] | null>(null);
  const [copied, setCopied] = useState(false);

  // Smart AI Command Bar state
  const [aiInput, setAiInput] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiFeedback, setAiFeedback] = useState(
    'Ready for any sale scale, rule changes, or spoken/rough item lists.'
  );

  // Total Stall Calculator state
  const [stallStock, setStallStock] = useState<StallStockItem[]>(INITIAL_STALL_STOCK);
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

  const toggleRule = (key: keyof OptimizerRules) => {
    setRules((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      if (key === 'beautyFirst' && next.beautyFirst) next.maxProfitFocus = false;
      if (key === 'maxProfitFocus' && next.maxProfitFocus) next.beautyFirst = false;
      return next;
    });
  };

  const updateCat = (id: string, field: 'name' | 'cost' | 'price' | 'beauty', val: string) => {
    setCategories((prev) =>
      prev.map((c) => {
        if (c.id !== id) return c;
        if (field === 'name') return { ...c, name: val, shortName: val.split(' ')[0] || val };
        const num = Math.max(0, Number(val) || 0);
        return { ...c, [field]: field === 'beauty' ? Math.min(10, Math.max(1, num)) : num };
      })
    );
  };

  const addCat = () => {
    const style = EXTRA_CATEGORY_STYLES[categories.length % EXTRA_CATEGORY_STYLES.length];
    const nextIdx = categories.length + 1;
    setCategories((prev) => [
      ...prev,
      {
        id: `item_${Date.now()}`,
        name: `Category ${nextIdx}`,
        shortName: `Cat ${nextIdx}`,
        cost: 150,
        price: 349,
        beauty: 8.0,
        ...style,
      },
    ]);
  };

  const removeCat = (id: string) => {
    if (categories.length <= 2) return;
    setCategories((prev) => prev.filter((c) => c.id !== id));
    setCustomQuantities(null);
  };

  const applyScalePreset = (preset: SaleScalePreset) => {
    setEventName(preset.eventName);
    setExpectedFootfall(preset.expectedFootfall);
    setBudgetCap(preset.budgetCap);
    setMinProfitFloor(preset.minProfitFloor);
    setStallFee(preset.stallFee);
    setMaxPerCategory(preset.maxPerCategory);
    setCustomQuantities(null);
    setAiAuditReport(null);
    setAiFeedback(
      `Switched to ${preset.label}: ${preset.eventName} · ₹${preset.budgetCap.toLocaleString('en-IN')} budget · ${preset.expectedFootfall.toLocaleString('en-IN')} crowd.`
    );
  };

  const resetAll = () => {
    setEventName('Grand Casa, Siliguri');
    setExpectedFootfall(10000);
    setBudgetCap(3000);
    setMinProfitFloor(3100);
    setStallFee(9000);
    setMaxPerCategory(6);
    setMinColoursRule(1);
    setCategories(INITIAL_CATEGORIES);
    setRules({
      allAtLeastOne: true,
      evenDistribution: true,
      beautyFirst: false,
      maxProfitFocus: false,
      safe90Mode: false,
    });
    setCustomQuantities(null);
    setStallStock(INITIAL_STALL_STOCK);
    setGlobalSellThrough(90);
    setAiError(null);
    setAiAuditReport(null);
    setAiAuditError(null);
    setAiFeedback('Restored default Grand Casa Siliguri settings.');
  };

  const relaxConstraints = () => {
    setRules({
      allAtLeastOne: false,
      evenDistribution: false,
      beautyFirst: false,
      maxProfitFocus: false,
      safe90Mode: false,
    });
    setMinProfitFloor((prev) => Math.min(prev, Math.max(100, Math.round(budgetCap * 0.4))));
  };

  // Core Memoized Optimizer
  const generatedCombos = useMemo(
    () =>
      generateBangleCombinations(
        categories,
        { budgetCap, minProfitFloor, maxPerCategory, minColoursRule },
        rules
      ),
    [categories, budgetCap, minProfitFloor, maxPerCategory, minColoursRule, rules]
  );

  useEffect(() => {
    if (generatedCombos.length > 0 && !generatedCombos.some((c) => c.id === selectedComboId)) {
      setSelectedComboId(generatedCombos[0].id);
      setCustomQuantities(null);
    }
  }, [generatedCombos, selectedComboId]);

  const activeCombo = useMemo(() => {
    const base = generatedCombos.find((c) => c.id === selectedComboId) || generatedCombos[0] || null;
    if (!base) return null;
    if (!customQuantities) return base;
    return applyCustomQuantities(base, customQuantities, categories, minProfitFloor);
  }, [generatedCombos, selectedComboId, customQuantities, categories, minProfitFloor]);

  // Keep synced mix updated inside Total Stall Stock
  useEffect(() => {
    if (!activeCombo) return;
    setStallStock((prev) =>
      prev.map((item) =>
        item.isSyncedBundle
          ? {
              ...item,
              name: `Selected Bangle Mix (${activeCombo.pieces} pcs)`,
              cost: activeCombo.cost,
              price: activeCombo.rev100,
              unitPieces: activeCombo.pieces,
            }
          : item
      )
    );
  }, [activeCombo]);

  const stallTotals = useMemo(
    () => calculateStallTotals(stallStock, stallFee, expectedFootfall),
    [stallStock, stallFee, expectedFootfall]
  );

  const plannerSnapshot: PlannerSnapshot = useMemo(
    () => ({
      eventName,
      expectedFootfall,
      budgetCap,
      minProfitFloor,
      stallFee,
      maxPerCategory,
      minColoursRule,
      globalSellThrough,
      rules,
      categories,
      selectedComboId,
      customQuantities,
      stallStock,
      activeTab,
    }),
    [
      eventName,
      expectedFootfall,
      budgetCap,
      minProfitFloor,
      stallFee,
      maxPerCategory,
      minColoursRule,
      globalSellThrough,
      rules,
      categories,
      selectedComboId,
      customQuantities,
      stallStock,
      activeTab,
    ]
  );

  const applyAiPlannerSnapshot = useCallback((next: PlannerSnapshot, changes: string[]) => {
    setEventName(next.eventName);
    setExpectedFootfall(next.expectedFootfall);
    setBudgetCap(next.budgetCap);
    setMinProfitFloor(next.minProfitFloor);
    setStallFee(next.stallFee);
    setMaxPerCategory(next.maxPerCategory);
    setMinColoursRule(next.minColoursRule);
    setGlobalSellThrough(next.globalSellThrough);
    setRules(next.rules);
    setCategories(next.categories);
    setSelectedComboId(next.selectedComboId);
    setCustomQuantities(next.customQuantities);
    setStallStock(next.stallStock);
    setActiveTab(next.activeTab);
    setAiAuditReport(null);
    if (changes.length > 0) {
      setAiFeedback(`Voice AI updated: ${changes.slice(0, 5).join(' · ')}`);
    }
  }, []);

  useEffect(() => {
    registerWorkspaceHydrator((saved) => {
      skipNextCloudSaveRef.current = true;
      applyAiPlannerSnapshot(saved, []);
      setAiFeedback('Loaded saved plan & AI memory from your Google account.');
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
    setCustomQuantities(next);
  };

  const copyOrder = () => {
    if (!activeCombo) return;
    const items = categories
      .map((c, i) =>
        activeCombo.counts[i] > 0 ? `${activeCombo.counts[i]}x ${c.name} (₹${c.cost}→₹${c.price})` : null
      )
      .filter(Boolean)
      .join(' | ');
    const text = `StallIQ Mix (${eventName}) ${activeCombo.label}: ${items} — Cost: ₹${activeCombo.cost} | Profit: +₹${activeCombo.prof100} | Beauty: ${activeCombo.avgBeauty}★`;
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

    const local = parseLocalRawCommand(rawText, categories, globalSellThrough);
    if (local.budgetCap) setBudgetCap(local.budgetCap);
    if (local.minProfitFloor) setMinProfitFloor(local.minProfitFloor);
    if (typeof local.stallFee === 'number') setStallFee(local.stallFee);
    if (local.expectedFootfall) setExpectedFootfall(local.expectedFootfall);
    if (local.maxPerCategory) setMaxPerCategory(local.maxPerCategory);
    if (local.minColoursRule) setMinColoursRule(local.minColoursRule);
    if (Object.keys(local.ruleUpdates).length > 0) {
      setRules((prev) => ({ ...prev, ...local.ruleUpdates }));
    }
    if (local.categoryUpdates.length > 0) {
      setCategories((prev) =>
        prev.map((cat) => {
          const u = local.categoryUpdates.find((x) => x.id === cat.id);
          return u
            ? {
                ...cat,
                cost: u.cost ?? cat.cost,
                price: u.price ?? cat.price,
                beauty: u.beauty ?? cat.beauty,
              }
            : cat;
        })
      );
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
          categories: categories.map((c) => ({
            name: c.name,
            cost: c.cost,
            price: c.price,
            beauty: c.beauty,
          })),
          settings: { eventName, expectedFootfall, budgetCap, minProfitFloor, stallFee, maxPerCategory },
          accountContext,
        }),
      });

      const parsed = await res.json();
      if (!res.ok) throw new Error(parsed.error || 'AI command parsing unavailable');

      if (typeof parsed.eventName === 'string' && parsed.eventName.trim()) {
        setEventName(parsed.eventName.trim());
      }
      if (parsed.expectedFootfall && parsed.expectedFootfall >= 50) {
        setExpectedFootfall(parsed.expectedFootfall);
      }
      if (parsed.budgetCap && parsed.budgetCap >= 200) setBudgetCap(parsed.budgetCap);
      if (typeof parsed.minProfitFloor === 'number' && parsed.minProfitFloor >= 50) {
        setMinProfitFloor(parsed.minProfitFloor);
      }
      if (typeof parsed.stallFee === 'number' && parsed.stallFee >= 0) setStallFee(parsed.stallFee);
      if (parsed.maxPerCategory && parsed.maxPerCategory >= 2) setMaxPerCategory(parsed.maxPerCategory);

      setRules((prev) => ({
        allAtLeastOne: typeof parsed.allAtLeastOne === 'boolean' ? parsed.allAtLeastOne : prev.allAtLeastOne,
        evenDistribution:
          typeof parsed.evenDistribution === 'boolean' ? parsed.evenDistribution : prev.evenDistribution,
        beautyFirst: typeof parsed.beautyFirst === 'boolean' ? parsed.beautyFirst : prev.beautyFirst,
        maxProfitFocus: typeof parsed.maxProfitFocus === 'boolean' ? parsed.maxProfitFocus : prev.maxProfitFocus,
        safe90Mode: typeof parsed.safe90Mode === 'boolean' ? parsed.safe90Mode : prev.safe90Mode,
      }));

      if (Array.isArray(parsed.categoryUpdates) && parsed.categoryUpdates.length > 0) {
        if (parsed.replaceCategories) {
          const stylePool = [
            ...INITIAL_CATEGORIES.map(({ barColor, textClass, bgClass }) => ({ barColor, textClass, bgClass })),
            ...EXTRA_CATEGORY_STYLES,
          ];
          const rebuilt: BangleCategory[] = parsed.categoryUpdates
            .filter((u: { name?: string }) => u.name)
            .map(
              (
                u: { name: string; cost?: number; price?: number; beauty?: number },
                idx: number
              ) => {
                const cost = u.cost && u.cost > 0 ? u.cost : 120;
                const price = u.price && u.price > 0 ? u.price : estimateRetailPrice(cost);
                return {
                  id: `cat_${Date.now()}_${idx}`,
                  name: u.name,
                  shortName: u.name.split(' ')[0],
                  cost,
                  price,
                  beauty: u.beauty ? Math.min(10, Math.max(1, u.beauty)) : 8.0,
                  ...stylePool[idx % stylePool.length],
                };
              }
            );
          if (rebuilt.length >= 2) {
            setCategories(rebuilt);
            setCustomQuantities(null);
          }
        } else {
          parsed.categoryUpdates.forEach(
            (u: { name?: string; cost?: number; price?: number; beauty?: number; isNewBangleCategory?: boolean }) => {
              if (!u.name) return;
              const uName = u.name.toLowerCase();
              setCategories((prev) => {
                const exists = prev.some(
                  (c) => c.name.toLowerCase().includes(uName) || c.shortName.toLowerCase() === uName
                );
                if (exists) {
                  return prev.map((c) =>
                    c.name.toLowerCase().includes(uName) || c.shortName.toLowerCase() === uName
                      ? {
                          ...c,
                          cost: u.cost && u.cost > 0 ? u.cost : c.cost,
                          price: u.price && u.price > 0 ? u.price : c.price,
                          beauty: u.beauty && u.beauty > 0 ? Math.min(10, u.beauty) : c.beauty,
                        }
                      : c
                  );
                } else if (u.isNewBangleCategory) {
                  const style = EXTRA_CATEGORY_STYLES[prev.length % EXTRA_CATEGORY_STYLES.length];
                  const cost = u.cost && u.cost > 0 ? u.cost : 150;
                  return [
                    ...prev,
                    {
                      id: `cat_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
                      name: u.name || 'New Category',
                      shortName: (u.name || 'New').split(' ')[0],
                      cost,
                      price: u.price && u.price > 0 ? u.price : estimateRetailPrice(cost),
                      beauty: u.beauty || 8.0,
                      ...style,
                    },
                  ];
                }
                return prev;
              });
            }
          );
        }
      }

      if (
        Array.isArray(parsed.stallStockAdditions) &&
        parsed.stallStockAdditions.length > 0 &&
        local.stockAdditions.length === 0
      ) {
        setStallStock((prev) => [
          ...prev,
          ...parsed.stallStockAdditions.map(
            (s: { name?: string; category?: string; cost?: number; price?: number; qty?: number; sellThrough?: number }, idx: number) => ({
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

      if (Array.isArray(parsed.memoryNotes) && parsed.memoryNotes.length > 0 && user) {
        const cleanNotes = parsed.memoryNotes
          .filter((m: { fact?: unknown }) => typeof m?.fact === 'string' && m.fact.trim().length > 1)
          .map((m: { fact: string; category?: string }) => ({
            fact: m.fact.trim(),
            category: (['inventory', 'pricing', 'event', 'preference', 'strategy'].includes(
              m.category || ''
            )
              ? m.category
              : 'preference') as AiMemoryCategory,
          }));
        if (cleanNotes.length > 0) {
          void addMemoriesBatch(cleanNotes, 'command');
        }
      }

      setAiFeedback(parsed.summaryMessage || `Updated: ${local.changes.join(' · ') || 'parameters applied'}.`);
      setAiInput('');
    } catch (err) {
      if (local.changes.length > 0) {
        setAiFeedback(`Applied locally: ${local.changes.join(' · ')}`);
        setAiInput('');
      } else {
        setAiError(err instanceof Error ? err.message : 'Unable to interpret command.');
      }
    } finally {
      setAiLoading(false);
    }
  };

  // Total Stall stock handlers
  const applyGlobalSellThrough = (pct: number) => {
    setGlobalSellThrough(pct);
    setStallStock((prev) => prev.map((item) => ({ ...item, sellThrough: pct })));
  };

  const updateStockItem = (id: string, field: keyof StallStockItem, val: string) => {
    setStallStock((prev) =>
      prev.map((item) =>
        item.id === id
          ? {
              ...item,
              [field]: field === 'name' || field === 'category' ? val : Math.max(0, Number(val) || 0),
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
      setAiAuditError(err instanceof Error ? err.message : 'Unable to run AI CFO Audit.');
    } finally {
      setAiAuditLoading(false);
    }
  };

  const activeMixSummary = activeCombo
    ? `${activeCombo.label} (${activeCombo.badge}, ${activeCombo.pieces} pcs, Cost ₹${activeCombo.cost}, Profit +₹${activeCombo.prof100}, Beauty ${activeCombo.avgBeauty}★)`
    : 'No active bangle mix';

  return (
    <div id="top" className="min-h-screen bg-[#090D16] text-slate-100 pb-20 selection:bg-amber-500/30">
      <Header
        activeTab={activeTab}
        onTabChange={setActiveTab}
        eventName={eventName}
        onEventNameChange={setEventName}
        expectedFootfall={expectedFootfall}
        onExpectedFootfallChange={setExpectedFootfall}
        onApplyScalePreset={applyScalePreset}
        budgetCap={budgetCap}
        onBudgetCapChange={setBudgetCap}
        minProfitFloor={minProfitFloor}
        onMinProfitFloorChange={setMinProfitFloor}
        stallFee={stallFee}
        onStallFeeChange={setStallFee}
        showItemEditor={showItemEditor}
        onToggleItemEditor={() => setShowItemEditor(!showItemEditor)}
        onResetAll={resetAll}
        onOpenVoiceCoach={() => setVoiceModalOpen((prev) => !prev)}
        onOpenAccountDrawer={() => setAccountDrawerOpen(true)}
        categories={categories}
        onUpdateCat={updateCat}
        onAddCat={addCat}
        onRemoveCat={removeCat}
      />

      <main className="max-w-7xl mx-auto px-4 lg:px-8 pt-5 space-y-5">
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

        <AiCommandBar
          aiInput={aiInput}
          onAiInputChange={setAiInput}
          onSubmit={handleSmartAiSubmit}
          aiLoading={aiLoading}
          aiFeedback={aiFeedback}
          aiError={aiError}
        />

        {activeTab === 'optimizer' && (
          <OptimizerTab
            eventName={eventName}
            categories={categories}
            generatedCombos={generatedCombos}
            activeCombo={activeCombo}
            rules={rules}
            budgetCap={budgetCap}
            minProfitFloor={minProfitFloor}
            stallFee={stallFee}
            maxPerCategory={maxPerCategory}
            copied={copied}
            onToggleRule={toggleRule}
            onBudgetCapChange={setBudgetCap}
            onMinProfitFloorChange={setMinProfitFloor}
            onMaxPerCategoryChange={setMaxPerCategory}
            onSelectCombo={(id) => {
              setSelectedComboId(id);
              setCustomQuantities(null);
            }}
            onStepQty={stepQty}
            onResetCustomQty={() => setCustomQuantities(null)}
            onCopyOrder={copyOrder}
            onOpenCalculator={() => setActiveTab('calculator')}
            onRelaxConstraints={relaxConstraints}
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
            onAddParsedStockItems={(items) => setStallStock((prev) => [...prev, ...items])}
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
        contextSummary={`Event: ${eventName} (${expectedFootfall} footfall); Active Mix: ${activeMixSummary}; Total Outlay: ₹${stallTotals.totalOutlay}; Projected Net Profit: ₹${stallTotals.netAfterStallReal}`}
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
