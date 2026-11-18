import React from 'react';
import {
  ArrowRight,
  Check,
  CheckCircle2,
  Copy,
  Crown,
  Layers,
  Scale,
  ShieldCheck,
  Star,
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
import type { BangleCategory, BangleCombo, OptimizerRules } from '../types/stall';

interface OptimizerTabProps {
  eventName: string;
  categories: BangleCategory[];
  generatedCombos: BangleCombo[];
  activeCombo: BangleCombo | null;
  rules: OptimizerRules;
  budgetCap: number;
  minProfitFloor: number;
  stallFee: number;
  maxPerCategory: number;
  copied: boolean;
  onToggleRule: (key: keyof OptimizerRules) => void;
  onBudgetCapChange: (val: number) => void;
  onMinProfitFloorChange: (val: number) => void;
  onMaxPerCategoryChange: (val: number) => void;
  onSelectCombo: (id: string) => void;
  onStepQty: (idx: number, delta: number) => void;
  onResetCustomQty: () => void;
  onCopyOrder: () => void;
  onOpenCalculator: () => void;
  onRelaxConstraints: () => void;
}

export function OptimizerTab({
  eventName,
  categories,
  generatedCombos,
  activeCombo,
  rules,
  budgetCap,
  minProfitFloor,
  stallFee,
  maxPerCategory,
  copied,
  onToggleRule,
  onBudgetCapChange,
  onMinProfitFloorChange,
  onMaxPerCategoryChange,
  onSelectCombo,
  onStepQty,
  onResetCustomQty,
  onCopyOrder,
  onOpenCalculator,
  onRelaxConstraints,
}: OptimizerTabProps) {
  const budgetMax = Math.max(10000, Math.ceil((budgetCap * 1.6) / 500) * 500);
  const budgetStep = budgetMax > 25000 ? 500 : 100;
  const profitMax = Math.max(8000, Math.ceil((minProfitFloor * 1.7) / 500) * 500);
  const profitStep = profitMax > 20000 ? 250 : 100;
  const maxPerOptions = Array.from(new Set([3, 4, 5, 6, 8, 10, 15, 20, 30, 50, maxPerCategory])).sort(
    (a, b) => a - b
  );
  const displayedProfit = (combo: BangleCombo) => (rules.safe90Mode ? combo.prof90 : combo.prof100);
  const displayedRevenue = (combo: BangleCombo) => (rules.safe90Mode ? combo.rev90 : combo.rev100);

  const stallCoveragePct = activeCombo
    ? Math.min(100, Math.max(0, Math.round((displayedProfit(activeCombo) / Math.max(1, stallFee)) * 100)))
    : 0;

  const filterButtons: Array<{
    key: keyof OptimizerRules;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
  }> = [
    { key: 'allAtLeastOne', label: 'All Included', icon: Layers },
    { key: 'evenDistribution', label: `Even Spread (Max ${maxPerCategory})`, icon: Scale },
    { key: 'beautyFirst', label: 'High Beauty (7.75+)', icon: Crown },
    { key: 'maxProfitFocus', label: 'Max Profit', icon: TrendingUp },
    { key: 'safe90Mode', label: '90% Sold Safe', icon: ShieldCheck },
  ];

  return (
    <div className="space-y-5">
      {/* Requirements & Sliders Bar */}
      <section
        aria-label="Optimization Requirements"
        className="flex flex-wrap items-center justify-between gap-3 bg-[#111827] border border-slate-800 rounded-2xl p-3.5"
      >
        <div className="flex flex-wrap items-center gap-2">
          {filterButtons.map((pill) => {
            const Icon = pill.icon;
            const active = rules[pill.key];
            return (
              <button
                key={pill.key}
                type="button"
                aria-pressed={active}
                onClick={() => onToggleRule(pill.key)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border whitespace-nowrap shrink-0 transition-colors ${
                  active
                    ? 'bg-amber-400 text-slate-950 border-amber-400'
                    : 'bg-[#090D16] text-slate-300 border-slate-800 hover:text-white hover:border-slate-700'
                }`}
              >
                {active ? <Check className="w-3.5 h-3.5 stroke-[2.5]" /> : <Icon className="w-3.5 h-3.5" />}
                <span>{pill.label}</span>
              </button>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center gap-4 text-xs">
          <label className="flex items-center gap-2">
            <span className="text-slate-400">Budget</span>
            <span className="font-mono font-semibold text-amber-300 tabular-nums">
              ₹{budgetCap.toLocaleString('en-IN')}
            </span>
            <input
              type="range"
              aria-label="Budget cap slider"
              min={500}
              max={budgetMax}
              step={budgetStep}
              value={budgetCap}
              onChange={(e) => onBudgetCapChange(Number(e.target.value))}
              className="w-20 h-1.5 bg-slate-800 rounded-lg accent-amber-400 cursor-pointer"
            />
          </label>

          <label className="flex items-center gap-2">
            <span className="text-slate-400">Profit Floor</span>
            <span className="font-mono font-semibold text-emerald-400 tabular-nums">
              ₹{minProfitFloor.toLocaleString('en-IN')}
            </span>
            <input
              type="range"
              aria-label="Minimum profit floor slider"
              min={200}
              max={profitMax}
              step={profitStep}
              value={minProfitFloor}
              onChange={(e) => onMinProfitFloorChange(Number(e.target.value))}
              className="w-20 h-1.5 bg-slate-800 rounded-lg accent-emerald-400 cursor-pointer"
            />
          </label>

          <label className="flex items-center gap-2">
            <span className="text-slate-400">Max/Type</span>
            <select
              aria-label="Maximum quantity per category"
              value={maxPerCategory}
              onChange={(e) => onMaxPerCategoryChange(Number(e.target.value))}
              className="bg-[#090D16] border border-slate-800 rounded-lg px-2 py-1 text-xs font-mono text-white"
            >
              {maxPerOptions.map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>
          </label>
        </div>
      </section>

      {/* Empty State when constraints are impossible */}
      {generatedCombos.length === 0 && (
        <section className="bg-[#111827] border border-slate-800 rounded-2xl p-8 text-center space-y-3">
          <h2 className="font-display text-lg font-bold text-white">No mixes match those strict constraints</h2>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            Your current budget cap (₹{budgetCap.toLocaleString('en-IN')}) or profit floor (₹
            {minProfitFloor.toLocaleString('en-IN')}) is too tight for all active filters.
          </p>
          <button
            type="button"
            onClick={onRelaxConstraints}
            className="px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-semibold text-xs transition-colors"
          >
            Reset Constraints & Show Best Mixes
          </button>
        </section>
      )}

      {/* Hero Selected Mix Inspector */}
      {activeCombo && (
        <section
          aria-label="Selected Bangle Mix Inspector"
          className="bg-[#111827] border border-amber-400/50 rounded-2xl p-4 sm:p-5 space-y-4"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="px-3 py-1 rounded-lg text-sm font-mono font-bold bg-amber-400 text-slate-950 tabular-nums">
                {activeCombo.label}
              </span>
              <span className="text-sm font-semibold text-white">{activeCombo.badge}</span>
              <span className="text-xs text-slate-400">
                {activeCombo.keywords.join(' · ')}
              </span>
              {activeCombo.isCustom && (
                <button
                  type="button"
                  onClick={onResetCustomQty}
                  className="text-xs font-semibold text-amber-300 underline ml-1"
                >
                  Reset Tweak
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onCopyOrder}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-amber-300 border border-slate-700 whitespace-nowrap shrink-0 transition-colors"
              >
                {copied ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied' : 'Copy Mix'}</span>
              </button>

              <button
                type="button"
                onClick={onOpenCalculator}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold whitespace-nowrap shrink-0 transition-colors"
              >
                <span>Open in Total Stall CFO</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* 5 Scannable KPI Tiles */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            <div className="bg-[#090D16] border border-slate-800/90 rounded-xl p-3">
              <div className="text-xs text-slate-400">Wholesale Cost</div>
              <div
                className={`text-2xl font-mono font-bold tabular-nums mt-0.5 ${
                  activeCombo.cost > budgetCap ? 'text-rose-400' : 'text-white'
                }`}
              >
                ₹{activeCombo.cost.toLocaleString('en-IN')}
              </div>
              <div className="text-[11px] text-slate-400 tabular-nums mt-0.5">
                Cap: ₹{budgetCap.toLocaleString('en-IN')}
              </div>
            </div>

            <div className="bg-[#090D16] border border-slate-800/90 rounded-xl p-3">
              <div className="text-xs text-slate-400">
                Revenue ({rules.safe90Mode ? '90% Sold' : '100% Sold'})
              </div>
              <div className="text-2xl font-mono font-bold text-slate-100 tabular-nums mt-0.5">
                ₹{displayedRevenue(activeCombo).toLocaleString('en-IN')}
              </div>
              <div className="text-[11px] text-slate-400 tabular-nums mt-0.5">
                {activeCombo.pieces} Total Pieces
              </div>
            </div>

            <div className="bg-[#090D16] border border-emerald-500/35 rounded-xl p-3">
              <div className="text-xs text-emerald-400">
                Net Profit ({rules.safe90Mode ? '90% Sold' : '100% Sold'})
              </div>
              <div className="text-2xl font-mono font-bold text-emerald-400 tabular-nums mt-0.5">
                +₹{displayedProfit(activeCombo).toLocaleString('en-IN')}
              </div>
              <div className="text-[11px] text-slate-400 tabular-nums mt-0.5">
                {rules.safe90Mode
                  ? `100%: +₹${activeCombo.prof100.toLocaleString('en-IN')}`
                  : `90%: +₹${activeCombo.prof90.toLocaleString('en-IN')}`}
              </div>
            </div>

            <div className="bg-[#090D16] border border-amber-500/35 rounded-xl p-3">
              <div className="text-xs text-amber-300">Weighted Beauty</div>
              <div className="text-2xl font-mono font-bold text-amber-300 tabular-nums mt-0.5">
                {activeCombo.avgBeauty} ★
              </div>
              <div className="text-[11px] text-slate-400 tabular-nums mt-0.5">
                Evenness {activeCombo.evenness}/10 · {activeCombo.marginPct}% Margin
              </div>
            </div>

            <div className="col-span-2 sm:col-span-1 bg-[#090D16] border border-slate-800/90 rounded-xl p-3 flex flex-col justify-between">
              <div className="flex items-center justify-between text-xs gap-1">
                <span className="text-slate-400 truncate" title={`${eventName} Stall Fee`}>
                  ₹{stallFee.toLocaleString('en-IN')} Fee Covered
                </span>
                <span className="text-emerald-400 font-mono font-bold tabular-nums shrink-0">{stallCoveragePct}%</span>
              </div>
              <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden my-2">
                <div
                  className="h-full bg-gradient-to-r from-emerald-500 to-amber-400 rounded-full transition-all duration-200"
                  style={{ width: `${stallCoveragePct}%` }}
                />
              </div>
              <div className="text-[11px] text-slate-400 tabular-nums">
                Remaining Gap: ₹{Math.max(0, stallFee - displayedProfit(activeCombo)).toLocaleString('en-IN')}
              </div>
            </div>
          </div>

          {/* Live + / - Quantity Tweaker */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
            {categories.map((cat, idx) => {
              const qty = activeCombo.counts[idx] || 0;
              return (
                <div
                  key={cat.id}
                  className={`flex items-center justify-between px-3 py-2 rounded-xl border ${cat.bgClass}`}
                >
                  <div className="min-w-0 pr-1">
                    <div className={`text-xs font-semibold truncate ${cat.textClass}`}>{cat.shortName || cat.name}</div>
                    <div className="text-[11px] font-mono text-slate-400 tabular-nums">
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
                    <span className="text-sm font-mono font-bold text-white w-5 text-center tabular-nums">{qty}</span>
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

      {/* Visual Profit Comparison Chart */}
      {generatedCombos.length > 0 && (
        <section className="bg-[#111827] border border-slate-800 rounded-2xl p-4">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <h2 className="text-xs font-semibold text-slate-300">
              Net Profit Comparison Across {generatedCombos.length} Mixes (Click a bar to inspect)
            </h2>
            <span className="text-xs font-mono text-emerald-400 tabular-nums">
              Profit Floor: ₹{minProfitFloor.toLocaleString('en-IN')}
            </span>
          </div>
          <div className="h-52 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={generatedCombos}
                layout="vertical"
                margin={{ top: 4, right: 24, left: 0, bottom: 10 }}
                onClick={(s) => {
                  const found = s?.activeLabel
                    ? generatedCombos.find((c) => c.label === String(s.activeLabel))
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
                <YAxis type="category" dataKey="label" stroke="#94a3b8" fontSize={11} width={38} tickLine={false} />
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const d = payload[0].payload as BangleCombo;
                    return (
                      <div className="bg-[#090D16] border border-slate-700 rounded-xl p-2.5 text-xs shadow-xl space-y-1">
                        <div className="font-semibold text-amber-300">
                          {d.label} · {d.badge}
                        </div>
                        <div className="text-emerald-400 font-mono font-bold tabular-nums">
                          Net Profit: +₹{displayedProfit(d).toLocaleString('en-IN')}
                        </div>
                        <div className="text-slate-300 font-mono tabular-nums">
                          Cost ₹{d.cost} ({d.pieces} pcs) · {d.avgBeauty} ★
                        </div>
                      </div>
                    );
                  }}
                />
                <ReferenceLine x={minProfitFloor} stroke="#10b981" strokeDasharray="3 3" />
                <Bar dataKey={rules.safe90Mode ? 'prof90' : 'prof100'} radius={[0, 5, 5, 0]} cursor="pointer">
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

      {/* 15 Compact Option Cards */}
      {generatedCombos.length > 0 && (
        <section aria-label="Smart Combination Options" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {generatedCombos.map((combo) => {
            const isSelected = activeCombo?.id === combo.id;
            const profitVal = displayedProfit(combo);
            return (
              <button
                key={combo.id}
                type="button"
                onClick={() => onSelectCombo(combo.id)}
                className={`text-left rounded-2xl p-4 transition-colors border flex flex-col justify-between space-y-3 focus-visible:outline-2 focus-visible:outline-amber-400 ${
                  isSelected
                    ? 'bg-[#131C2E] border-amber-400 ring-1 ring-amber-400/40'
                    : 'bg-[#111827] hover:bg-[#141D2F] border-slate-800 hover:border-slate-700'
                }`}
              >
                {/* Top Row: Rank + Differentiating Label + Beauty */}
                <div className="w-full flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className={`text-xs font-mono font-bold px-2 py-0.5 rounded-md tabular-nums ${
                        isSelected ? 'bg-amber-400 text-slate-950' : 'bg-slate-800 text-slate-200'
                      }`}
                    >
                      {combo.label}
                    </span>
                    <span className="text-xs font-semibold text-white truncate">{combo.badge}</span>
                  </div>

                  <span className="text-xs font-mono font-semibold text-amber-300 tabular-nums flex items-center gap-1 shrink-0">
                    <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                    {combo.avgBeauty}
                  </span>
                </div>

                {/* Unboxed keyword metadata */}
                <div className="text-[11px] text-slate-400 truncate w-full">
                  {combo.keywords.join(' · ')}
                </div>

                {/* Profit & Cost Numbers */}
                <div className="w-full flex items-baseline justify-between">
                  <div>
                    <div className="text-[11px] text-slate-400">
                      Net Profit {rules.safe90Mode ? '(90%)' : '(100%)'}
                    </div>
                    <div className="text-xl font-mono font-bold text-emerald-400 tabular-nums">
                      +₹{profitVal.toLocaleString('en-IN')}
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-[11px] text-slate-400 tabular-nums">Cost · {combo.pieces} Pcs</div>
                    <div className="text-sm font-mono font-semibold text-white tabular-nums">
                      ₹{combo.cost.toLocaleString('en-IN')}
                    </div>
                  </div>
                </div>

                {/* Stacked Category Proportion Bar */}
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

                {/* Clean quantity breakdown text */}
                <div className="text-[11px] text-slate-300 font-mono tabular-nums leading-relaxed">
                  {categories
                    .map((cat, idx) => {
                      const q = combo.counts[idx] || 0;
                      return q > 0 ? `${q} ${cat.shortName || cat.name}` : null;
                    })
                    .filter(Boolean)
                    .join(' · ')}
                </div>
              </button>
            );
          })}
        </section>
      )}
    </div>
  );
}
