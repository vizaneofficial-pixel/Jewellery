import React from 'react';
import {
  ArrowRight,
  Check,
  CheckCircle2,
  Copy,
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
import {
  Bar,
  BarChart,
  Cell,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type {
  BangleCategory,
  BangleCombo,
  CategoryGroupResolved,
  OptimizerRules,
} from '../types/stall';

interface OptimizerTabProps {
  eventName: string;
  resolvedGroups: CategoryGroupResolved[];
  activeGroupId: string;
  onSelectGroup: (groupId: string) => void;
  onAddGroup: () => void;
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
  copied: boolean;
  showItemEditor: boolean;
  onToggleItemEditor: () => void;
  onUpdateCat: (id: string, field: 'name' | 'cost' | 'price' | 'beauty', val: string) => void;
  onAddCat: () => void;
  onRemoveCat: (id: string) => void;
  onToggleRule: (key: keyof OptimizerRules) => void;
  onBudgetCapChange: (val: number) => void;
  onMinProfitFloorChange: (val: number) => void;
  onMaxPerCategoryChange: (val: number) => void;
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
  onAddGroup,
  onRemoveGroup,
  onRenameGroup,
  categories,
  generatedCombos,
  activeCombo,
  rules,
  budgetCap,
  minProfitFloor,
  maxPerCategory,
  copied,
  showItemEditor,
  onToggleItemEditor,
  onUpdateCat,
  onAddCat,
  onRemoveCat,
  onToggleRule,
  onBudgetCapChange,
  onMinProfitFloorChange,
  onMaxPerCategoryChange,
  onSelectCombo,
  onStepQty,
  onResetCustomQty,
  onCopyOrder,
  onOpenOverview,
  onOpenCalculator,
  onRelaxConstraints,
}: OptimizerTabProps) {
  const activeGroup =
    resolvedGroups.find((rg) => rg.group.id === activeGroupId)?.group ||
    resolvedGroups[0]?.group;

  const maxPerOptions = Array.from(
    new Set([3, 4, 5, 6, 8, 10, 15, 20, 30, 50, maxPerCategory])
  ).sort((a, b) => a - b);

  const displayedProfit = (combo: BangleCombo) =>
    rules.safe90Mode ? combo.prof90 : combo.prof100;
  const displayedRevenue = (combo: BangleCombo) =>
    rules.safe90Mode ? combo.rev90 : combo.rev100;

  const filterButtons: Array<{
    key: keyof OptimizerRules;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
  }> = [
    { key: 'allAtLeastOne', label: 'All Items', icon: Layers },
    { key: 'evenDistribution', label: `Even (Max ${maxPerCategory})`, icon: Scale },
    { key: 'beautyFirst', label: 'High Beauty', icon: Crown },
    { key: 'maxProfitFocus', label: 'Max Profit', icon: TrendingUp },
    { key: 'safe90Mode', label: '90% Safe', icon: ShieldCheck },
  ];

  return (
    <div className="space-y-4">
      {/* 1. Diversified Category Switcher Cards */}
      <section
        aria-label="Stock Categories"
        className="bg-[#111827] border border-slate-800 rounded-2xl p-3.5 space-y-3"
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-300">
              Stock Categories
            </span>
            <span className="text-xs font-mono text-slate-400 tabular-nums">
              ({resolvedGroups.length})
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onAddGroup}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/35 text-xs font-semibold transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Category</span>
            </button>

            <button
              type="button"
              onClick={onOpenOverview}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-700 text-xs font-semibold transition-colors"
            >
              <LayoutGrid className="w-3.5 h-3.5 text-cyan-300" />
              <span>View All in Overview</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
          {resolvedGroups.map(({ group, activeCombo: gCombo }) => {
            const isCurrent = group.id === activeGroup?.id;
            const gProfit = gCombo
              ? group.rules.safe90Mode
                ? gCombo.prof90
                : gCombo.prof100
              : 0;

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
                  <div className="flex items-center justify-between gap-2 pr-5">
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
                    <span className="text-slate-300">
                      ₹{group.budgetCap.toLocaleString('en-IN')}
                    </span>
                    <span className="text-emerald-400 font-bold">
                      +₹{gProfit.toLocaleString('en-IN')}
                    </span>
                  </div>

                  {/* Mini visual proportion bar */}
                  <div className="w-full h-1.5 rounded-full overflow-hidden flex bg-slate-900 gap-0.5">
                    {gCombo &&
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

                {resolvedGroups.length > 1 && (
                  <button
                    type="button"
                    aria-label={`Delete ${group.name} category`}
                    onClick={() => onRemoveGroup(group.id)}
                    className="absolute top-2.5 right-2.5 text-slate-500 hover:text-rose-400 p-1 transition-colors"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* 2. Active Category Budget, Rules & Items Bar */}
      {activeGroup && (
        <section
          aria-label="Active Category Configuration"
          className="bg-[#111827] border border-slate-800 rounded-2xl p-3.5 space-y-3"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            {/* Category Name + Budget + Profit Floor + Max/Item */}
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
                  className="w-28 sm:w-32 bg-transparent font-display font-bold text-white focus:outline-none focus:text-amber-300"
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
                    onBudgetCapChange(Math.max(200, Number(e.target.value) || 0))
                  }
                  className="w-20 bg-transparent font-mono font-bold text-amber-300 tabular-nums focus:outline-none"
                />
              </label>

              <label className="flex items-center gap-1.5 bg-[#090D16] border border-slate-800 rounded-xl px-2.5 py-1.5">
                <span className="text-slate-400">Min Profit</span>
                <span className="text-emerald-400 font-mono">₹</span>
                <input
                  type="number"
                  aria-label="Category Minimum Profit"
                  value={minProfitFloor}
                  onChange={(e) =>
                    onMinProfitFloorChange(
                      Math.max(50, Number(e.target.value) || 0)
                    )
                  }
                  className="w-20 bg-transparent font-mono font-bold text-emerald-400 tabular-nums focus:outline-none"
                />
              </label>

              <label className="flex items-center gap-1.5 bg-[#090D16] border border-slate-800 rounded-xl px-2.5 py-1.5">
                <span className="text-slate-400">Max/Item</span>
                <select
                  aria-label="Maximum quantity per item"
                  value={maxPerCategory}
                  onChange={(e) =>
                    onMaxPerCategoryChange(Number(e.target.value))
                  }
                  className="bg-transparent font-mono font-bold text-white focus:outline-none"
                >
                  {maxPerOptions.map((v) => (
                    <option key={v} value={v} className="bg-[#090D16]">
                      {v}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            {/* Condition Filters + Items Toggle */}
            <div className="flex flex-wrap items-center gap-1.5">
              {filterButtons.map((pill) => {
                const Icon = pill.icon;
                const active = rules[pill.key];
                return (
                  <button
                    key={pill.key}
                    type="button"
                    aria-pressed={active}
                    onClick={() => onToggleRule(pill.key)}
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
                    <span>{pill.label}</span>
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
                <span>Items ({categories.length})</span>
              </button>
            </div>
          </div>

          {/* Inline Collapsible Item Editor for Current Category */}
          {showItemEditor && (
            <div className="pt-3 border-t border-slate-800/80 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-300">
                  {activeGroup.name} Items · Cost, Price & Beauty (1–10)
                </span>
                <button
                  type="button"
                  onClick={onAddCat}
                  className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-lg bg-amber-500/15 text-amber-300 border border-amber-500/35 hover:bg-amber-500/25 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Item</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-2">
                {categories.map((cat) => (
                  <div
                    key={cat.id}
                    className="bg-[#090D16] border border-slate-800 rounded-xl p-2.5 space-y-2"
                  >
                    <div className="flex items-center justify-between gap-1.5">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: cat.barColor }}
                        />
                        <input
                          type="text"
                          aria-label={`Item name for ${cat.name}`}
                          value={cat.name}
                          onChange={(e) =>
                            onUpdateCat(cat.id, 'name', e.target.value)
                          }
                          className="bg-transparent text-xs font-semibold text-white w-full truncate focus:outline-none focus:text-amber-300"
                        />
                      </div>
                      {categories.length > 2 && (
                        <button
                          type="button"
                          onClick={() => onRemoveCat(cat.id)}
                          aria-label={`Remove ${cat.name}`}
                          className="text-slate-500 hover:text-rose-400 p-0.5"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-1.5 text-xs">
                      <label className="bg-slate-900/90 border border-slate-800 rounded-lg px-2 py-1">
                        <span className="block text-[10px] text-slate-400">
                          Cost ₹
                        </span>
                        <input
                          type="number"
                          aria-label={`${cat.name} cost`}
                          value={cat.cost}
                          onChange={(e) =>
                            onUpdateCat(cat.id, 'cost', e.target.value)
                          }
                          className="w-full bg-transparent font-mono font-semibold text-slate-100 tabular-nums focus:outline-none"
                        />
                      </label>
                      <label className="bg-slate-900/90 border border-slate-800 rounded-lg px-2 py-1">
                        <span className="block text-[10px] text-slate-400">
                          Sell ₹
                        </span>
                        <input
                          type="number"
                          aria-label={`${cat.name} price`}
                          value={cat.price}
                          onChange={(e) =>
                            onUpdateCat(cat.id, 'price', e.target.value)
                          }
                          className="w-full bg-transparent font-mono font-semibold text-amber-300 tabular-nums focus:outline-none"
                        />
                      </label>
                    </div>

                    <div className="flex items-center justify-between gap-1.5 text-xs">
                      <span className="text-amber-300 font-mono font-semibold tabular-nums flex items-center gap-0.5">
                        <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                        {cat.beauty}
                      </span>
                      <input
                        type="range"
                        aria-label={`${cat.name} beauty`}
                        min={1}
                        max={10}
                        step={0.5}
                        value={cat.beauty}
                        onChange={(e) =>
                          onUpdateCat(cat.id, 'beauty', e.target.value)
                        }
                        className="w-16 h-1 bg-slate-800 rounded-lg accent-amber-400 cursor-pointer"
                      />
                      <span className="text-[10px] font-mono text-emerald-400 tabular-nums">
                        +₹{cat.price - cat.cost}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      )}

      {/* Empty State when constraints are too tight */}
      {generatedCombos.length === 0 && (
        <section className="bg-[#111827] border border-slate-800 rounded-2xl p-6 text-center space-y-2.5">
          <h2 className="font-display text-base font-bold text-white">
            No combinations match these constraints
          </h2>
          <p className="text-xs text-slate-400">
            Budget ₹{budgetCap.toLocaleString('en-IN')} · Min Profit ₹
            {minProfitFloor.toLocaleString('en-IN')}
          </p>
          <button
            type="button"
            onClick={onRelaxConstraints}
            className="px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-semibold text-xs transition-colors"
          >
            Auto-Fit Profit Floor
          </button>
        </section>
      )}

      {/* 3. Visual Selected Choice Inspector */}
      {activeCombo && activeGroup && (
        <section
          aria-label="Selected Mix Inspector"
          className="bg-[#111827] border border-amber-400/45 rounded-2xl p-4 space-y-3.5"
        >
          <div className="flex flex-wrap items-center justify-between gap-2.5">
            <div className="flex items-center gap-2">
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
                  Reset
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

          {/* 4 Minimal Visual Stat Boxes */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
            <div className="bg-[#090D16] border border-slate-800/90 rounded-xl p-3">
              <div className="text-[11px] text-slate-400">Cost</div>
              <div
                className={`text-xl sm:text-2xl font-mono font-bold tabular-nums mt-0.5 ${
                  activeCombo.cost > budgetCap ? 'text-rose-400' : 'text-white'
                }`}
              >
                ₹{activeCombo.cost.toLocaleString('en-IN')}
              </div>
              <div className="text-[10px] font-mono text-slate-400 tabular-nums">
                / ₹{budgetCap.toLocaleString('en-IN')}
              </div>
            </div>

            <div className="bg-[#090D16] border border-emerald-500/35 rounded-xl p-3">
              <div className="text-[11px] text-emerald-400">
                Profit {rules.safe90Mode ? '(90%)' : '(100%)'}
              </div>
              <div className="text-xl sm:text-2xl font-mono font-bold text-emerald-400 tabular-nums mt-0.5">
                +₹{displayedProfit(activeCombo).toLocaleString('en-IN')}
              </div>
              <div className="text-[10px] font-mono text-slate-400 tabular-nums">
                {activeCombo.marginPct}% Margin
              </div>
            </div>

            <div className="bg-[#090D16] border border-slate-800/90 rounded-xl p-3">
              <div className="text-[11px] text-slate-400">Revenue</div>
              <div className="text-xl sm:text-2xl font-mono font-bold text-cyan-300 tabular-nums mt-0.5">
                ₹{displayedRevenue(activeCombo).toLocaleString('en-IN')}
              </div>
              <div className="text-[10px] font-mono text-slate-400 tabular-nums">
                {activeCombo.pieces} Pieces
              </div>
            </div>

            <div className="bg-[#090D16] border border-amber-500/35 rounded-xl p-3">
              <div className="text-[11px] text-amber-300">Appeal</div>
              <div className="text-xl sm:text-2xl font-mono font-bold text-amber-300 tabular-nums mt-0.5 flex items-center gap-1">
                <span>{activeCombo.avgBeauty}</span>
                <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
              </div>
              <div className="text-[10px] font-mono text-slate-400 tabular-nums">
                Balance {activeCombo.evenness}/10
              </div>
            </div>
          </div>

          {/* Interactive Visual Quantity Steppers */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
            {categories.map((cat, idx) => {
              const qty = activeCombo.counts[idx] || 0;
              return (
                <div
                  key={cat.id}
                  className={`flex items-center justify-between px-2.5 py-2 rounded-xl border ${cat.bgClass}`}
                >
                  <div className="min-w-0 pr-1">
                    <div
                      className={`text-xs font-semibold truncate ${cat.textClass}`}
                    >
                      {cat.shortName || cat.name}
                    </div>
                    <div className="text-[10px] font-mono text-slate-400 tabular-nums">
                      ₹{cat.cost}→₹{cat.price}
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      aria-label={`Decrease ${cat.name} quantity`}
                      onClick={() => onStepQty(idx, -1)}
                      className="w-6 h-6 rounded-md bg-slate-950/90 hover:bg-slate-900 text-slate-300 font-bold text-xs flex items-center justify-center border border-slate-700/70"
                    >
                      −
                    </button>
                    <span className="text-sm font-mono font-bold text-white w-5 text-center tabular-nums">
                      {qty}
                    </span>
                    <button
                      type="button"
                      aria-label={`Increase ${cat.name} quantity`}
                      onClick={() => onStepQty(idx, 1)}
                      className="w-6 h-6 rounded-md bg-slate-950/90 hover:bg-slate-900 text-amber-300 font-bold text-xs flex items-center justify-center border border-slate-700/70"
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

      {/* 4. 15 Minimal Visual Combination Cards */}
      {generatedCombos.length > 0 && (
        <section
          aria-label="15 Best Combinations"
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3"
        >
          {generatedCombos.map((combo) => {
            const isSelected = activeCombo?.id === combo.id;
            const profitVal = displayedProfit(combo);
            return (
              <button
                key={combo.id}
                type="button"
                onClick={() => onSelectCombo(combo.id)}
                className={`text-left rounded-2xl p-3.5 transition-colors border flex flex-col justify-between space-y-2.5 focus-visible:outline-2 focus-visible:outline-amber-400 ${
                  isSelected
                    ? 'bg-[#141E33] border-amber-400 ring-1 ring-amber-400/40'
                    : 'bg-[#111827] hover:bg-[#141D2F] border-slate-800 hover:border-slate-700'
                }`}
              >
                {/* Row 1: Rank + Condition + Star */}
                <div className="w-full flex items-center justify-between gap-2">
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
                    <span className="text-xs font-semibold text-white truncate">
                      {combo.badge}
                    </span>
                  </div>

                  <span className="text-xs font-mono font-semibold text-amber-300 tabular-nums flex items-center gap-1 shrink-0">
                    <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                    {combo.avgBeauty}
                  </span>
                </div>

                {/* Row 2: Big Profit & Cost/Pieces */}
                <div className="w-full flex items-baseline justify-between">
                  <div className="text-xl font-mono font-bold text-emerald-400 tabular-nums">
                    +₹{profitVal.toLocaleString('en-IN')}
                  </div>
                  <div className="text-xs font-mono text-slate-300 tabular-nums">
                    ₹{combo.cost.toLocaleString('en-IN')} · {combo.pieces} pcs
                  </div>
                </div>

                {/* Row 3: Visual Proportion Bar */}
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

                {/* Row 4: Visual Color Dot Chips */}
                <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
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
              </button>
            );
          })}
        </section>
      )}

      {/* 5. Compact Visual Profit Chart */}
      {generatedCombos.length > 0 && (
        <section className="bg-[#111827] border border-slate-800 rounded-2xl p-3.5">
          <div className="flex items-center justify-between gap-2 mb-2">
            <h2 className="text-xs font-semibold text-slate-300">
              Profit Across 15 Options
            </h2>
            <button
              type="button"
              onClick={onOpenCalculator}
              className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 flex items-center gap-1"
            >
              <span>Total Stall CFO</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>
          <div className="h-44 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={generatedCombos}
                layout="vertical"
                margin={{ top: 4, right: 20, left: 0, bottom: 4 }}
                onClick={(s) => {
                  const found = s?.activeLabel
                    ? generatedCombos.find(
                        (c) => c.label === String(s.activeLabel)
                      )
                    : undefined;
                  if (found) onSelectCombo(found.id);
                }}
              >
                <XAxis
                  type="number"
                  stroke="#64748b"
                  fontSize={11}
                  tickLine={false}
                  tickFormatter={(v) => `₹${v}`}
                />
                <YAxis
                  type="category"
                  dataKey="label"
                  stroke="#94a3b8"
                  fontSize={11}
                  width={36}
                  tickLine={false}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const d = payload[0].payload as BangleCombo;
                    return (
                      <div className="bg-[#090D16] border border-slate-700 rounded-xl p-2 text-xs shadow-xl">
                        <div className="font-semibold text-amber-300">
                          {d.label} · {d.badge}
                        </div>
                        <div className="text-emerald-400 font-mono font-bold tabular-nums">
                          +₹{displayedProfit(d).toLocaleString('en-IN')}
                        </div>
                      </div>
                    );
                  }}
                />
                <ReferenceLine
                  x={minProfitFloor}
                  stroke="#10b981"
                  strokeDasharray="3 3"
                />
                <Bar
                  dataKey={rules.safe90Mode ? 'prof90' : 'prof100'}
                  radius={[0, 5, 5, 0]}
                  cursor="pointer"
                >
                  {generatedCombos.map((entry) => {
                    const active = activeCombo?.id === entry.id;
                    return (
                      <Cell
                        key={entry.id}
                        fill={active ? '#fbbf24' : '#10b981'}
                        fillOpacity={active ? 1 : 0.65}
                      />
                    );
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
      )}
    </div>
  );
}
