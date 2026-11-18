import React, { useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Copy,
  CopyPlus,
  Crown,
  LayoutGrid,
  Layers,
  Plus,
  Scale,
  ShieldCheck,
  SlidersHorizontal,
  Star,
  Trash2,
  TrendingUp,
} from 'lucide-react';
import { CATEGORY_TEMPLATES } from '../data/defaults';
import type {
  BangleCategory,
  BangleCombo,
  CategoryGroupResolved,
  OptimizerRules,
} from '../types/stall';
import { resolveItemPriceBounds } from '../utils/optimizer';

interface OptimizerTabProps {
  eventName: string;
  resolvedGroups: CategoryGroupResolved[];
  activeGroupId: string;
  onSelectGroup: (groupId: string) => void;
  onCreateGroup: (templateId?: string, customName?: string) => void;
  onDuplicateGroup: (groupId: string) => void;
  onRemoveGroup: (groupId: string) => void;
  onRenameGroup: (groupId: string, name: string) => void;
  categories: BangleCategory[];
  generatedCombos: BangleCombo[];
  activeCombo: BangleCombo | null;
  rules: OptimizerRules;
  budgetCap: number;
  minProfitFloor: number;
  stallFee: number;
  maxPerCategory: number;
  conservativeSellThroughPct: number;
  copied: boolean;
  showItemEditor: boolean;
  onToggleItemEditor: () => void;
  onUpdateCatFields: (id: string, patch: Partial<BangleCategory>) => void;
  onAddCat: () => void;
  onRemoveCat: (id: string) => void;
  onToggleRule: (key: keyof OptimizerRules) => void;
  onBudgetCapChange: (val: number) => void;
  onMinProfitFloorChange: (val: number) => void;
  onMaxPerCategoryChange: (val: number) => void;
  onConservativeSellThroughChange: (pct: number) => void;
  onSelectCombo: (id: string) => void;
  onStepQty: (idx: number, delta: number) => void;
  onResetCustomQty: () => void;
  onCopyOrder: () => void;
  onOpenOverview: () => void;
  onOpenCalculator: () => void;
  onRelaxConstraints: () => void;
}

export function OptimizerTab({
  resolvedGroups,
  activeGroupId,
  onSelectGroup,
  onCreateGroup,
  onDuplicateGroup,
  onRemoveGroup,
  onRenameGroup,
  categories,
  generatedCombos,
  activeCombo,
  rules,
  budgetCap,
  minProfitFloor,
  maxPerCategory,
  conservativeSellThroughPct,
  copied,
  showItemEditor,
  onToggleItemEditor,
  onUpdateCatFields,
  onAddCat,
  onRemoveCat,
  onToggleRule,
  onBudgetCapChange,
  onMinProfitFloorChange,
  onMaxPerCategoryChange,
  onConservativeSellThroughChange,
  onSelectCombo,
  onStepQty,
  onResetCustomQty,
  onCopyOrder,
  onOpenOverview,
  onOpenCalculator,
  onRelaxConstraints,
}: OptimizerTabProps) {
  const [showNewCategoryBar, setShowNewCategoryBar] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [showRemainingOptions, setShowRemainingOptions] = useState(false);

  const activeGroup =
    resolvedGroups.find((rg) => rg.group.id === activeGroupId)?.group ||
    resolvedGroups[0]?.group;

  const maxPerOptions = Array.from(
    new Set([3, 4, 5, 6, 8, 10, 15, 20, 30, 50, maxPerCategory])
  ).sort((a, b) => a - b);

  const sellThroughOptions = [75, 80, 85, 90, 95];

  const topThreeCombos = generatedCombos.slice(0, 3);
  const remainingCombos = generatedCombos.slice(3);

  const filterButtons: Array<{
    key: keyof OptimizerRules;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
  }> = [
    { key: 'allAtLeastOne', label: 'Include All', icon: Layers },
    { key: 'evenDistribution', label: `Cap / Item (${maxPerCategory})`, icon: Scale },
    { key: 'beautyFirst', label: 'Prioritize Appeal', icon: Crown },
    { key: 'maxProfitFocus', label: 'Prioritize Profit', icon: TrendingUp },
    { key: 'safe90Mode', label: `${conservativeSellThroughPct}% Focus`, icon: ShieldCheck },
  ];

  const handleCreateCustom = (e: React.FormEvent) => {
    e.preventDefault();
    onCreateGroup('custom', newCategoryName.trim() || undefined);
    setNewCategoryName('');
    setShowNewCategoryBar(false);
  };

  const isOverBudget = activeCombo ? activeCombo.cost > budgetCap : false;
  const overBudgetAmount = activeCombo ? Math.max(0, activeCombo.cost - budgetCap) : 0;
  const activeSafePct = activeCombo?.sellThroughPct ?? conservativeSellThroughPct;
  const activeUnsoldPct = Math.max(1, 100 - activeSafePct);
  const activePrimaryProfit = activeCombo
    ? rules.safe90Mode
      ? activeCombo.prof90
      : activeCombo.prof100
    : 0;
  const isBelowTargetProfit = activeCombo
    ? activeCombo.prof100 < minProfitFloor
    : false;
  const hasPriceRangeInActive =
    activeCombo &&
    typeof activeCombo.revMin100 === 'number' &&
    typeof activeCombo.revMax100 === 'number' &&
    activeCombo.revMax100 > activeCombo.revMin100;

  return (
    <div className="space-y-4">
      {/* 1. Product-Agnostic Category Switcher */}
      <section
        aria-label="Stock Categories"
        className="bg-[#111827] border border-slate-800 rounded-2xl p-3.5 space-y-3"
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-xs">
            <h1 className="font-display font-bold text-slate-100">
              Stock Categories
            </h1>
            <span className="text-slate-500" aria-hidden="true">·</span>
            <span className="font-mono text-slate-400 tabular-nums">
              {resolvedGroups.length} active
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              aria-expanded={showNewCategoryBar}
              onClick={() => setShowNewCategoryBar((prev) => !prev)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-bold transition-colors whitespace-nowrap shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Category</span>
            </button>

            <button
              type="button"
              onClick={onOpenOverview}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#090D16] hover:bg-slate-800 text-slate-100 border border-slate-800 text-xs font-semibold transition-colors whitespace-nowrap shrink-0"
            >
              <LayoutGrid className="w-3.5 h-3.5 text-cyan-300" />
              <span>Overview</span>
            </button>
          </div>
        </div>

        {/* Quick Create Category / Starter Templates Bar */}
        {showNewCategoryBar && (
          <div className="bg-[#090D16] border border-slate-800 rounded-xl p-3 space-y-2.5">
            <form onSubmit={handleCreateCustom} className="flex flex-wrap items-center gap-2">
              <input
                type="text"
                aria-label="New category name"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                placeholder="Category name (e.g. Clothing, Crafts, Photos, Snacks)"
                className="flex-1 min-w-[200px] bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-400"
              />
              <button
                type="submit"
                className="px-3 py-1.5 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-bold whitespace-nowrap"
              >
                Create Custom
              </button>
              <button
                type="button"
                onClick={() => setShowNewCategoryBar(false)}
                className="px-2.5 py-1.5 rounded-lg text-xs text-slate-400 hover:text-white"
              >
                Cancel
              </button>
            </form>

            <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
              <span className="text-slate-400 mr-1">Starter samples (editable):</span>
              {CATEGORY_TEMPLATES.map((tpl) => (
                <button
                  key={tpl.id}
                  type="button"
                  onClick={() => {
                    onCreateGroup(tpl.id, newCategoryName.trim() || undefined);
                    setNewCategoryName('');
                    setShowNewCategoryBar(false);
                  }}
                  className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-800 font-medium transition-colors"
                >
                  + {tpl.label}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
          {resolvedGroups.map(({ group, activeCombo: gCombo }) => {
            const isCurrent = group.id === activeGroup?.id;
            const gProfit = gCombo
              ? group.rules.safe90Mode
                ? gCombo.prof90
                : gCombo.prof100
              : 0;
            const gOverBudget = gCombo ? gCombo.cost > group.budgetCap : false;

            return (
              <div
                key={group.id}
                className={`relative rounded-xl border transition-colors ${
                  isCurrent
                    ? 'bg-[#151F34] border-amber-400 ring-1 ring-amber-400/35'
                    : 'bg-[#090D16] hover:bg-[#0E1525] border-slate-800/90'
                }`}
              >
                <button
                  type="button"
                  onClick={() => onSelectGroup(group.id)}
                  className="w-full text-left p-3 flex flex-col justify-between space-y-2 focus-visible:outline-2 focus-visible:outline-amber-400 rounded-xl"
                >
                  <div className="flex items-center justify-between gap-2 pr-12">
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: group.accentColor }}
                      />
                      <span className="font-display text-xs font-bold text-white truncate">
                        {group.name}
                      </span>
                    </div>
                    {gCombo && (
                      <span className="text-[11px] font-mono font-bold text-amber-300 tabular-nums shrink-0">
                        {gCombo.label}
                      </span>
                    )}
                  </div>

                  <div className="flex items-baseline justify-between text-xs font-mono tabular-nums">
                    <span className={gOverBudget ? 'text-rose-400 font-semibold' : 'text-slate-300'}>
                      ₹{group.budgetCap.toLocaleString('en-IN')} cap
                    </span>
                    <span className="text-emerald-400 font-bold">
                      +₹{gProfit.toLocaleString('en-IN')} gross
                    </span>
                  </div>

                  {/* Mini proportion bar */}
                  <div className="w-full h-1.5 rounded-full overflow-hidden flex bg-slate-900 gap-0.5">
                    {gCombo &&
                      gCombo.pieces > 0 &&
                      group.categories.map((cat, idx) => {
                        const q = gCombo.counts[idx] || 0;
                        if (!q) return null;
                        return (
                          <div
                            key={cat.id}
                            style={{
                              width: `${(q / gCombo.pieces) * 100}%`,
                              backgroundColor: cat.barColor,
                            }}
                            className="h-full"
                          />
                        );
                      })}
                  </div>
                </button>

                <div className="absolute top-2.5 right-2 flex items-center gap-0.5">
                  <button
                    type="button"
                    aria-label={`Duplicate ${group.name} category`}
                    title="Duplicate category"
                    onClick={() => onDuplicateGroup(group.id)}
                    className="text-slate-400 hover:text-amber-300 p-1 transition-colors"
                  >
                    <CopyPlus className="w-3.5 h-3.5" />
                  </button>
                  {resolvedGroups.length > 1 && (
                    <button
                      type="button"
                      aria-label={`Delete ${group.name} category`}
                      title="Remove category"
                      onClick={() => onRemoveGroup(group.id)}
                      className="text-slate-500 hover:text-rose-400 p-1 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 2. Active Category Targets, Constraints & Product Editor */}
      {activeGroup && (
        <section
          aria-label="Active Category Configuration"
          className="bg-[#111827] border border-slate-800 rounded-2xl p-3.5 space-y-3"
        >
          <div className="flex flex-wrap items-center justify-between gap-2.5">
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <div className="flex items-center gap-1.5 bg-[#090D16] border border-slate-800 rounded-xl px-2.5 py-1.5">
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: activeGroup.accentColor }}
                />
                <input
                  type="text"
                  aria-label="Active Category Name"
                  value={activeGroup.name}
                  onChange={(e) => onRenameGroup(activeGroup.id, e.target.value)}
                  className="w-28 sm:w-36 bg-transparent font-display font-bold text-white focus:outline-none focus:text-amber-300"
                />
              </div>

              <label className="flex items-center gap-1.5 bg-[#090D16] border border-slate-800 rounded-xl px-2.5 py-1.5">
                <span className="text-slate-400">Budget</span>
                <span className="text-amber-300 font-mono">₹</span>
                <input
                  type="number"
                  aria-label="Category Budget"
                  value={budgetCap}
                  onChange={(e) =>
                    onBudgetCapChange(Math.max(100, Number(e.target.value) || 0))
                  }
                  className="w-20 bg-transparent font-mono font-bold text-amber-300 tabular-nums focus:outline-none"
                />
              </label>

              <label className="flex items-center gap-1.5 bg-[#090D16] border border-slate-800 rounded-xl px-2.5 py-1.5">
                <span className="text-slate-400">Profit Target</span>
                <span className="text-emerald-400 font-mono">₹</span>
                <input
                  type="number"
                  aria-label="Category Minimum Profit"
                  value={minProfitFloor}
                  onChange={(e) =>
                    onMinProfitFloorChange(Math.max(0, Number(e.target.value) || 0))
                  }
                  className="w-20 bg-transparent font-mono font-bold text-emerald-400 tabular-nums focus:outline-none"
                />
              </label>

              <label className="flex items-center gap-1.5 bg-[#090D16] border border-slate-800 rounded-xl px-2.5 py-1.5">
                <span className="text-slate-400">Conservative Sold</span>
                <select
                  aria-label="Conservative sell-through percentage"
                  value={conservativeSellThroughPct}
                  onChange={(e) =>
                    onConservativeSellThroughChange(Number(e.target.value))
                  }
                  className="bg-transparent font-mono font-bold text-indigo-300 focus:outline-none"
                >
                  {sellThroughOptions.map((pct) => (
                    <option key={pct} value={pct} className="bg-[#090D16]">
                      {pct}%
                    </option>
                  ))}
                </select>
              </label>

              {rules.evenDistribution && (
                <label className="flex items-center gap-1.5 bg-[#090D16] border border-slate-800 rounded-xl px-2.5 py-1.5">
                  <span className="text-slate-400">Max / Item</span>
                  <select
                    aria-label="Maximum quantity per item"
                    value={maxPerCategory}
                    onChange={(e) => onMaxPerCategoryChange(Number(e.target.value))}
                    className="bg-transparent font-mono font-bold text-white focus:outline-none"
                  >
                    {maxPerOptions.map((v) => (
                      <option key={v} value={v} className="bg-[#090D16]">
                        {v}
                      </option>
                    ))}
                  </select>
                </label>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              {filterButtons.map((btn) => {
                const Icon = btn.icon;
                const active = rules[btn.key];
                return (
                  <button
                    key={btn.key}
                    type="button"
                    aria-pressed={active}
                    onClick={() => onToggleRule(btn.key)}
                    className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold border whitespace-nowrap shrink-0 transition-colors ${
                      active
                        ? 'bg-amber-400 text-slate-950 border-amber-400'
                        : 'bg-[#090D16] text-slate-300 border-slate-800 hover:text-white'
                    }`}
                  >
                    {active ? (
                      <Check className="w-3 h-3 stroke-[2.5]" />
                    ) : (
                      <Icon className="w-3 h-3" />
                    )}
                    <span>{btn.label}</span>
                  </button>
                );
              })}

              <button
                type="button"
                aria-expanded={showItemEditor}
                onClick={onToggleItemEditor}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border whitespace-nowrap shrink-0 transition-colors ${
                  showItemEditor
                    ? 'bg-cyan-400 text-slate-950 border-cyan-400'
                    : 'bg-[#090D16] text-cyan-300 border-slate-800 hover:border-slate-700'
                }`}
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                <span>Products ({categories.length})</span>
              </button>
            </div>
          </div>

          {/* Inline Collapsible Product Editor (Fixed/Range Price, Appeal 1-10, Optional Qty Limits) */}
          {showItemEditor && (
            <div className="pt-3 border-t border-slate-800/80 space-y-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="text-xs text-slate-400">
                  <span className="font-semibold text-slate-200">
                    {activeGroup.name} Products
                  </span>
                  <span className="mx-1.5 text-slate-600" aria-hidden="true">·</span>
                  <span>
                    Prices, ranges & appeal (1–10) are your own assumptions. Qty limits are optional.
                  </span>
                </div>
                <button
                  type="button"
                  onClick={onAddCat}
                  className="flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-lg bg-amber-400/15 text-amber-300 border border-amber-500/35 hover:bg-amber-400/25 transition-colors whitespace-nowrap"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Product</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                {categories.map((cat) => {
                  const priceBounds = resolveItemPriceBounds(cat);
                  const isRangeMode =
                    typeof cat.priceMin === 'number' && typeof cat.priceMax === 'number';
                  const unitMargin = priceBounds.target - cat.cost;

                  return (
                    <div
                      key={cat.id}
                      className="bg-[#090D16] border border-slate-800 rounded-xl p-3 space-y-2.5"
                    >
                      {/* Product Name + Delete */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <span
                            className="w-2.5 h-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: cat.barColor }}
                          />
                          <input
                            type="text"
                            aria-label={`Product name for ${cat.name}`}
                            value={cat.name}
                            onChange={(e) =>
                              onUpdateCatFields(cat.id, {
                                name: e.target.value,
                                shortName:
                                  e.target.value
                                    .trim()
                                    .split(/[\s/]+/)
                                    .filter(Boolean)
                                    .slice(0, 2)
                                    .join(' ') || e.target.value,
                              })
                            }
                            className="bg-transparent text-xs font-bold text-white w-full focus:outline-none focus:text-amber-300"
                          />
                        </div>
                        {categories.length > 1 && (
                          <button
                            type="button"
                            onClick={() => onRemoveCat(cat.id)}
                            aria-label={`Remove ${cat.name}`}
                            className="text-slate-500 hover:text-rose-400 p-1 shrink-0"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>

                      {/* Unit Cost + Fixed/Range Price Mode */}
                      <div className="grid grid-cols-3 gap-1.5 text-xs">
                        <label className="bg-slate-900/90 border border-slate-800 rounded-lg px-2 py-1.5">
                          <span className="block text-[10px] text-slate-400">
                            Unit Cost ₹
                          </span>
                          <input
                            type="number"
                            aria-label={`${cat.name} unit cost`}
                            value={cat.cost}
                            onChange={(e) =>
                              onUpdateCatFields(cat.id, {
                                cost: Math.max(0, Number(e.target.value) || 0),
                              })
                            }
                            className="w-full bg-transparent font-mono font-semibold text-slate-100 tabular-nums focus:outline-none"
                          />
                        </label>

                        {!isRangeMode ? (
                          <div className="col-span-2 bg-slate-900/90 border border-slate-800 rounded-lg px-2 py-1.5">
                            <div className="flex items-center justify-between text-[10px] text-slate-400">
                              <label htmlFor={`sell-price-${cat.id}`}>Sell Price ₹</label>
                              <button
                                type="button"
                                onClick={() => {
                                  const spread = Math.max(20, Math.round(cat.price * 0.12));
                                  const minP = Math.max(cat.cost, cat.price - spread);
                                  const maxP = cat.price + spread;
                                  onUpdateCatFields(cat.id, {
                                    priceMin: minP,
                                    priceMax: maxP,
                                    price: Math.round((minP + maxP) / 2),
                                  });
                                }}
                                className="text-cyan-300 hover:text-white underline"
                              >
                                Use Range
                              </button>
                            </div>
                            <input
                              id={`sell-price-${cat.id}`}
                              type="number"
                              aria-label={`${cat.name} sell price`}
                              value={cat.price}
                              onChange={(e) =>
                                onUpdateCatFields(cat.id, {
                                  price: Math.max(0, Number(e.target.value) || 0),
                                })
                              }
                              className="w-full bg-transparent font-mono font-semibold text-amber-300 tabular-nums focus:outline-none"
                            />
                          </div>
                        ) : (
                          <div className="col-span-2 bg-slate-900/90 border border-slate-800 rounded-lg px-2 py-1.5">
                            <div className="flex items-center justify-between text-[10px] text-slate-400">
                              <span>Price Range (est. ₹{priceBounds.target})</span>
                              <button
                                type="button"
                                onClick={() =>
                                  onUpdateCatFields(cat.id, {
                                    price: priceBounds.target,
                                    priceMin: null,
                                    priceMax: null,
                                  })
                                }
                                className="text-cyan-300 hover:text-white underline"
                              >
                                Fixed
                              </button>
                            </div>
                            <div className="flex items-center gap-1">
                              <input
                                type="number"
                                aria-label={`${cat.name} minimum selling price`}
                                value={cat.priceMin ?? priceBounds.min}
                                onChange={(e) => {
                                  const nextMin = Math.max(0, Number(e.target.value) || 0);
                                  const nextMax = Math.max(nextMin, cat.priceMax ?? nextMin);
                                  onUpdateCatFields(cat.id, {
                                    priceMin: nextMin,
                                    priceMax: nextMax,
                                    price: Math.round((nextMin + nextMax) / 2),
                                  });
                                }}
                                className="w-full bg-transparent font-mono font-semibold text-amber-300 tabular-nums focus:outline-none"
                              />
                              <span className="text-slate-500">–</span>
                              <input
                                type="number"
                                aria-label={`${cat.name} maximum selling price`}
                                value={cat.priceMax ?? priceBounds.max}
                                onChange={(e) => {
                                  const nextMax = Math.max(0, Number(e.target.value) || 0);
                                  const curMin = Math.min(cat.priceMin ?? nextMax, nextMax);
                                  onUpdateCatFields(cat.id, {
                                    priceMin: curMin,
                                    priceMax: nextMax,
                                    price: Math.round((curMin + nextMax) / 2),
                                  });
                                }}
                                className="w-full bg-transparent font-mono font-semibold text-amber-300 tabular-nums focus:outline-none"
                              />
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Attractiveness (1-10) + Unit Gross Profit */}
                      <div className="flex items-center justify-between gap-2 text-xs">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[11px] text-slate-400">Appeal</span>
                          <span className="text-amber-300 font-mono font-semibold tabular-nums flex items-center gap-0.5">
                            <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                            {cat.beauty}
                          </span>
                        </div>
                        <input
                          type="range"
                          aria-label={`${cat.name} customer appeal`}
                          min={1}
                          max={10}
                          step={0.5}
                          value={cat.beauty}
                          onChange={(e) =>
                            onUpdateCatFields(cat.id, {
                              beauty: Math.min(10, Math.max(1, Number(e.target.value) || 1)),
                            })
                          }
                          className="flex-1 max-w-[100px] h-1 bg-slate-800 rounded-lg accent-amber-400 cursor-pointer"
                        />
                        <span
                          className={`text-[11px] font-mono font-semibold tabular-nums ${
                            unitMargin >= 0 ? 'text-emerald-400' : 'text-rose-400'
                          }`}
                        >
                          {unitMargin >= 0 ? '+' : ''}₹{unitMargin}
                        </span>
                      </div>

                      {/* Optional Quantity Limits */}
                      <div className="grid grid-cols-2 gap-1.5 text-[11px] pt-1 border-t border-slate-800/70">
                        <label className="flex items-center justify-between gap-1 bg-slate-900/70 rounded-lg px-2 py-1">
                          <span className="text-slate-400">Min Qty</span>
                          <input
                            type="number"
                            min={0}
                            aria-label={`${cat.name} optional minimum quantity`}
                            placeholder="Any"
                            value={cat.minQty ?? ''}
                            onChange={(e) => {
                              const raw = e.target.value.trim();
                              onUpdateCatFields(cat.id, {
                                minQty: raw === '' ? null : Math.max(0, Math.floor(Number(raw) || 0)),
                              });
                            }}
                            className="w-14 bg-transparent font-mono text-right text-slate-200 placeholder:text-slate-500 focus:outline-none"
                          />
                        </label>
                        <label className="flex items-center justify-between gap-1 bg-slate-900/70 rounded-lg px-2 py-1">
                          <span className="text-slate-400">Max Qty</span>
                          <input
                            type="number"
                            min={0}
                            aria-label={`${cat.name} optional maximum quantity`}
                            placeholder="Any"
                            value={cat.maxQty ?? ''}
                            onChange={(e) => {
                              const raw = e.target.value.trim();
                              onUpdateCatFields(cat.id, {
                                maxQty: raw === '' ? null : Math.max(0, Math.floor(Number(raw) || 0)),
                              });
                            }}
                            className="w-14 bg-transparent font-mono text-right text-slate-200 placeholder:text-slate-500 focus:outline-none"
                          />
                        </label>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </section>
      )}

      {/* Empty State when constraints leave 0 valid combinations */}
      {generatedCombos.length === 0 && (
        <section className="bg-[#111827] border border-slate-800 rounded-2xl p-6 text-center space-y-2.5">
          <h2 className="font-display text-base font-bold text-white">
            No valid combinations match these limits
          </h2>
          <p className="text-xs text-slate-400">
            Budget ₹{budgetCap.toLocaleString('en-IN')} · Target Gross Profit ₹
            {minProfitFloor.toLocaleString('en-IN')}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
            <button
              type="button"
              onClick={onRelaxConstraints}
              className="px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-semibold text-xs transition-colors"
            >
              Auto-Fit Profit Target
            </button>
            {!showItemEditor && (
              <button
                type="button"
                onClick={onToggleItemEditor}
                className="px-4 py-2 rounded-xl bg-[#090D16] hover:bg-slate-800 text-slate-200 border border-slate-700 font-semibold text-xs transition-colors"
              >
                Review Products & Limits
              </button>
            )}
          </div>
        </section>
      )}

      {/* 3. Selected Mix Inspector & Immediate Recalculation */}
      {activeCombo && activeGroup && (
        <section
          aria-label="Selected Mix Inspector"
          className={`bg-[#111827] rounded-2xl p-4 space-y-3.5 border ${
            isOverBudget ? 'border-rose-500/70' : 'border-amber-400/45'
          }`}
        >
          <div className="flex flex-wrap items-center justify-between gap-2.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2.5 py-1 rounded-lg text-xs font-mono font-bold bg-amber-400 text-slate-950 tabular-nums">
                {activeCombo.label}
              </span>
              <span className="font-display text-sm font-bold text-white">
                {activeGroup.name} · {activeCombo.badge}
              </span>
              {activeCombo.isCustom && (
                <button
                  type="button"
                  onClick={onResetCustomQty}
                  className="text-xs font-semibold text-amber-300 underline ml-1"
                >
                  Reset to mix
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onCopyOrder}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#090D16] hover:bg-slate-800 text-xs font-semibold text-slate-200 border border-slate-800 transition-colors"
              >
                {copied ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <Copy className="w-3.5 h-3.5 text-amber-300" />
                )}
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>

              <button
                type="button"
                onClick={onOpenOverview}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold transition-colors"
              >
                <span>Stock Overview</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Explicit Over-Budget / Below-Target State */}
          {(isOverBudget || isBelowTargetProfit) && (
            <div
              role="status"
              className={`rounded-xl px-3 py-2 text-xs flex flex-wrap items-center justify-between gap-2 border ${
                isOverBudget
                  ? 'bg-rose-950/50 border-rose-500/40 text-rose-200'
                  : 'bg-amber-950/40 border-amber-500/40 text-amber-200'
              }`}
            >
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>
                  {isOverBudget
                    ? `Over budget by ₹${overBudgetAmount.toLocaleString('en-IN')} (Inventory cost ₹${activeCombo.cost.toLocaleString('en-IN')} vs ₹${budgetCap.toLocaleString('en-IN')} budget).`
                    : `Gross profit (+₹${activeCombo.prof100.toLocaleString('en-IN')}) is below your ₹${minProfitFloor.toLocaleString('en-IN')} target.`}
                </span>
              </div>
              {activeCombo.isCustom && (
                <button
                  type="button"
                  onClick={onResetCustomQty}
                  className="font-semibold underline whitespace-nowrap"
                >
                  Revert within budget
                </button>
              )}
            </div>
          )}

          {/* 5 Clear Financial & Assumption Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
            <div
              className={`bg-[#090D16] border rounded-xl p-3 ${
                isOverBudget ? 'border-rose-500/50' : 'border-slate-800/90'
              }`}
            >
              <div className="text-[11px] text-slate-400">Inventory Cost</div>
              <div
                className={`text-xl font-mono font-bold tabular-nums mt-0.5 ${
                  isOverBudget ? 'text-rose-400' : 'text-white'
                }`}
              >
                ₹{activeCombo.cost.toLocaleString('en-IN')}
              </div>
              <div className="text-[11px] font-mono text-slate-400 tabular-nums mt-0.5">
                {isOverBudget
                  ? `+₹${overBudgetAmount.toLocaleString('en-IN')} over cap`
                  : `of ₹${budgetCap.toLocaleString('en-IN')} budget`}
              </div>
            </div>

            <div className="bg-[#090D16] border border-slate-800/90 rounded-xl p-3">
              <div className="text-[11px] text-slate-400">Projected Revenue</div>
              <div className="text-xl font-mono font-bold text-cyan-300 tabular-nums mt-0.5">
                ₹{activeCombo.rev100.toLocaleString('en-IN')}
              </div>
              <div className="text-[11px] font-mono text-slate-400 tabular-nums mt-0.5">
                {hasPriceRangeInActive
                  ? `Range ₹${activeCombo.revMin100!.toLocaleString('en-IN')}–₹${activeCombo.revMax100!.toLocaleString('en-IN')}`
                  : `At 100% sold · ${activeCombo.pieces} pcs`}
              </div>
            </div>

            <div className="bg-[#090D16] border border-emerald-500/35 rounded-xl p-3">
              <div className="text-[11px] text-emerald-400">
                Est. Gross Profit
              </div>
              <div className="text-xl font-mono font-bold text-emerald-400 tabular-nums mt-0.5">
                {activeCombo.prof100 >= 0 ? '+' : ''}₹
                {activeCombo.prof100.toLocaleString('en-IN')}
              </div>
              <div className="text-[11px] font-mono text-slate-400 tabular-nums mt-0.5">
                {activeCombo.marginPct}% margin · Before stall fees
              </div>
            </div>

            <div className="bg-[#090D16] border border-indigo-500/35 rounded-xl p-3">
              <div className="text-[11px] text-indigo-300">
                {activeSafePct}% Sell-Through
              </div>
              <div
                className={`text-xl font-mono font-bold tabular-nums mt-0.5 ${
                  activeCombo.prof90 >= 0 ? 'text-indigo-300' : 'text-rose-400'
                }`}
              >
                {activeCombo.prof90 >= 0 ? '+' : ''}₹
                {activeCombo.prof90.toLocaleString('en-IN')}
              </div>
              <div className="text-[11px] font-mono text-slate-400 tabular-nums mt-0.5">
                {activeUnsoldPct}% unsold risk: ₹{activeCombo.unsoldRiskCost.toLocaleString('en-IN')} · BE {activeCombo.breakEvenSellThroughPct}%
              </div>
            </div>

            <div className="col-span-2 sm:col-span-1 bg-[#090D16] border border-amber-500/35 rounded-xl p-3">
              <div className="text-[11px] text-amber-300">Customer Appeal</div>
              <div className="text-xl font-mono font-bold text-amber-300 tabular-nums mt-0.5 flex items-center gap-1">
                <span>{activeCombo.avgBeauty}</span>
                <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                <span className="text-xs text-slate-400 font-normal">/ 10</span>
              </div>
              <div className="text-[11px] font-mono text-slate-400 tabular-nums mt-0.5">
                Variety {activeCombo.evenness}/10 · Your score
              </div>
            </div>
          </div>

          {/* Interactive Quantity Steppers */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-2">
            {categories.map((cat, idx) => {
              const qty = activeCombo.counts[idx] || 0;
              const rp = resolveItemPriceBounds(cat);
              return (
                <div
                  key={cat.id}
                  className={`flex items-center justify-between px-2.5 py-2 rounded-xl border ${cat.bgClass}`}
                >
                  <div className="min-w-0 pr-1">
                    <div className={`text-xs font-semibold truncate ${cat.textClass}`}>
                      {cat.shortName || cat.name}
                    </div>
                    <div className="text-[10px] font-mono text-slate-400 tabular-nums">
                      ₹{cat.cost} → {rp.hasRange ? `₹${rp.min}–₹${rp.max}` : `₹${rp.target}`}
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      aria-label={`Decrease ${cat.name} quantity`}
                      onClick={() => onStepQty(idx, -1)}
                      className="w-7 h-7 rounded-md bg-slate-950/90 hover:bg-slate-900 text-slate-300 font-bold text-xs flex items-center justify-center border border-slate-700/70"
                    >
                      −
                    </button>
                    <span className="text-sm font-mono font-bold text-white w-6 text-center tabular-nums">
                      {qty}
                    </span>
                    <button
                      type="button"
                      aria-label={`Increase ${cat.name} quantity`}
                      onClick={() => onStepQty(idx, 1)}
                      className="w-7 h-7 rounded-md bg-slate-950/90 hover:bg-slate-900 text-amber-300 font-bold text-xs flex items-center justify-center border border-slate-700/70"
                    >
                      +
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* 4. Compact Visual Top 3 Comparison */}
      {topThreeCombos.length > 0 && (
        <section aria-label="Top 3 Combinations" className="space-y-2.5">
          <div className="flex flex-wrap items-center justify-between gap-2 px-1">
            <div>
              <h2 className="font-display text-sm font-bold text-white">
                Top {topThreeCombos.length} Options for {activeGroup?.name}
              </h2>
              <p className="text-xs text-slate-400">
                Ranked using your price & appeal assumptions. Gross profit is before stall fees; conservative view assumes {conservativeSellThroughPct}% sell-through.
              </p>
            </div>
            <button
              type="button"
              onClick={onOpenCalculator}
              className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 flex items-center gap-1 whitespace-nowrap"
            >
              <span>Include Stall Fees in CFO</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
            {topThreeCombos.map((combo) => {
              const isSelected = activeCombo?.id === combo.id;
              const displayedProfit = rules.safe90Mode ? combo.prof90 : combo.prof100;

              return (
                <button
                  key={combo.id}
                  type="button"
                  onClick={() => onSelectCombo(combo.id)}
                  className={`text-left rounded-2xl p-4 transition-colors border flex flex-col justify-between space-y-3 focus-visible:outline-2 focus-visible:outline-amber-400 ${
                    isSelected
                      ? 'bg-[#141E33] border-amber-400 ring-1 ring-amber-400/40'
                      : 'bg-[#111827] hover:bg-[#141D2F] border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="space-y-2.5 w-full">
                    {/* Rank + Focus + Appeal */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          className={`text-xs font-mono font-bold px-2 py-0.5 rounded-md tabular-nums ${
                            isSelected
                              ? 'bg-amber-400 text-slate-950'
                              : 'bg-slate-800 text-slate-200'
                          }`}
                        >
                          {combo.label}
                        </span>
                        <span className="text-xs font-bold text-white truncate">
                          {combo.badge}
                        </span>
                      </div>

                      <span className="text-xs font-mono font-semibold text-amber-300 tabular-nums flex items-center gap-1 shrink-0">
                        <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                        {combo.avgBeauty}
                      </span>
                    </div>

                    {/* Short 1-line explanation */}
                    <p className="text-xs text-slate-300 leading-snug">
                      {combo.reason}
                    </p>

                    {/* Distinct Key Numbers */}
                    <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-800/80 text-xs font-mono tabular-nums">
                      <div>
                        <span className="block text-[10px] font-sans text-slate-400">
                          {rules.safe90Mode
                            ? `${combo.sellThroughPct}% Gross Profit`
                            : 'Gross Profit (100%)'}
                        </span>
                        <span className="text-base font-bold text-emerald-400">
                          +₹{displayedProfit.toLocaleString('en-IN')}
                        </span>
                        <span className="block text-[10px] text-slate-400">
                          {combo.marginPct}% margin
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="block text-[10px] font-sans text-slate-400">
                          Inventory Cost
                        </span>
                        <span className="text-base font-bold text-white">
                          ₹{combo.cost.toLocaleString('en-IN')}
                        </span>
                        <span className="block text-[10px] text-slate-400">
                          Rev ₹{combo.rev100.toLocaleString('en-IN')} · {combo.pieces} pcs
                        </span>
                      </div>
                    </div>

                    {/* Conservative + Risk line */}
                    <div className="flex items-center justify-between text-[11px] font-mono tabular-nums text-slate-400 bg-[#090D16] rounded-lg px-2.5 py-1.5 border border-slate-800/80">
                      <span>
                        {combo.sellThroughPct}% profit:{' '}
                        <strong className="text-indigo-300">
                          +₹{combo.prof90.toLocaleString('en-IN')}
                        </strong>
                      </span>
                      <span>
                        Unsold risk:{' '}
                        <strong className="text-slate-200">
                          ₹{combo.unsoldRiskCost.toLocaleString('en-IN')}
                        </strong>
                      </span>
                    </div>
                  </div>

                  {/* Proportion Bar + Item Quantities */}
                  <div className="w-full space-y-2">
                    <div className="w-full h-2 rounded-full overflow-hidden flex bg-[#090D16] gap-0.5 p-0.5 border border-slate-800">
                      {categories.map((cat, idx) => {
                        const q = combo.counts[idx] || 0;
                        if (!q) return null;
                        return (
                          <div
                            key={cat.id}
                            style={{
                              width: `${(q / combo.pieces) * 100}%`,
                              backgroundColor: cat.barColor,
                            }}
                            className="h-full first:rounded-l-full last:rounded-r-full"
                          />
                        );
                      })}
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5">
                      {categories.map((cat, idx) => {
                        const q = combo.counts[idx] || 0;
                        if (q <= 0) return null;
                        return (
                          <span
                            key={cat.id}
                            className="inline-flex items-center gap-1 text-[11px] font-mono text-slate-200 bg-[#090D16] border border-slate-800/80 rounded-md px-1.5 py-0.5 tabular-nums"
                          >
                            <span
                              className="w-1.5 h-1.5 rounded-full shrink-0"
                              style={{ backgroundColor: cat.barColor }}
                            />
                            <span className="font-bold text-white">{q}</span>
                            <span className="text-slate-400 font-sans">
                              {cat.shortName || cat.name}
                            </span>
                          </span>
                        );
                      })}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </section>
      )}

      {/* 5. Expandable Remaining Combinations (Options #4 to #15) */}
      {remainingCombos.length > 0 && (
        <section
          aria-label="Additional Combinations"
          className="bg-[#111827] border border-slate-800 rounded-2xl overflow-hidden"
        >
          <button
            type="button"
            aria-expanded={showRemainingOptions}
            onClick={() => setShowRemainingOptions((prev) => !prev)}
            className="w-full px-4 py-3 flex items-center justify-between text-xs font-semibold text-slate-200 hover:bg-[#141D2F] transition-colors"
          >
            <span>
              {showRemainingOptions
                ? `Hide options #4–#${generatedCombos.length}`
                : `Show all ${generatedCombos.length} options (${remainingCombos.length} more)`}
            </span>
            {showRemainingOptions ? (
              <ChevronUp className="w-4 h-4 text-amber-300" />
            ) : (
              <ChevronDown className="w-4 h-4 text-amber-300" />
            )}
          </button>

          {showRemainingOptions && (
            <div className="border-t border-slate-800 divide-y divide-slate-800/70">
              {remainingCombos.map((combo) => {
                const isSelected = activeCombo?.id === combo.id;
                return (
                  <button
                    key={combo.id}
                    type="button"
                    onClick={() => onSelectCombo(combo.id)}
                    className={`w-full text-left px-4 py-3 transition-colors flex flex-col md:flex-row md:items-center md:justify-between gap-2.5 ${
                      isSelected
                        ? 'bg-[#141E33]'
                        : 'hover:bg-[#141D2F]'
                    }`}
                  >
                    <div className="space-y-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        <span
                          className={`font-mono font-bold px-2 py-0.5 rounded-md tabular-nums ${
                            isSelected
                              ? 'bg-amber-400 text-slate-950'
                              : 'bg-slate-800 text-slate-200'
                          }`}
                        >
                          {combo.label}
                        </span>
                        <span className="font-semibold text-white">
                          {combo.badge}
                        </span>
                        <span className="text-slate-400">·</span>
                        <span className="font-mono text-amber-300 tabular-nums">
                          {combo.avgBeauty}★ appeal
                        </span>
                        <span className="text-slate-400">·</span>
                        <span className="font-mono text-slate-400 tabular-nums">
                          {combo.evenness}/10 variety
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-mono text-slate-300 tabular-nums">
                        {categories
                          .map((cat, idx) => ({ cat, q: combo.counts[idx] || 0 }))
                          .filter((x) => x.q > 0)
                          .map(({ cat, q }, i, arr) => (
                            <span key={cat.id} className="text-slate-300">
                              <strong className="text-white">{q}</strong> {cat.shortName || cat.name}
                              {i < arr.length - 1 ? ' ·' : ''}
                            </span>
                          ))}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-4 text-xs font-mono tabular-nums shrink-0">
                      <div>
                        <span className="block text-[10px] font-sans text-slate-400">
                          Cost
                        </span>
                        <span className="font-bold text-white">
                          ₹{combo.cost.toLocaleString('en-IN')}
                        </span>
                      </div>
                      <div>
                        <span className="block text-[10px] font-sans text-slate-400">
                          Rev (100%)
                        </span>
                        <span className="font-bold text-cyan-300">
                          ₹{combo.rev100.toLocaleString('en-IN')}
                        </span>
                      </div>
                      <div>
                        <span className="block text-[10px] font-sans text-slate-400">
                          Gross Profit
                        </span>
                        <span className="font-bold text-emerald-400">
                          +₹{combo.prof100.toLocaleString('en-IN')} ({combo.marginPct}%)
                        </span>
                      </div>
                      <div>
                        <span className="block text-[10px] font-sans text-slate-400">
                          {combo.sellThroughPct}% / Risk
                        </span>
                        <span className="font-bold text-indigo-300">
                          +₹{combo.prof90.toLocaleString('en-IN')} / ₹{combo.unsoldRiskCost.toLocaleString('en-IN')}
                        </span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
