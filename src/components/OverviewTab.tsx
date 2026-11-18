import React, { useState } from 'react';
import {
  ArrowRight,
  CheckCircle2,
  Plus,
  SlidersHorizontal,
  Star,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type {
  CategoryGroupResolved,
  DiversifiedOverviewTotals,
} from '../types/stall';

interface OverviewTabProps {
  resolvedGroups: CategoryGroupResolved[];
  overviewTotals: DiversifiedOverviewTotals;
  stallFee: number;
  onSelectGroupCombo: (groupId: string, comboId: string) => void;
  onEditCategoryGroup: (groupId: string) => void;
  onAddCategoryGroup: () => void;
  onTransferToCfo: () => void;
}

export function OverviewTab({
  resolvedGroups,
  overviewTotals,
  stallFee,
  onSelectGroupCombo,
  onEditCategoryGroup,
  onAddCategoryGroup,
  onTransferToCfo,
}: OverviewTabProps) {
  const [safe90View, setSafe90View] = useState(false);
  const [transferredFlash, setTransferredFlash] = useState(false);

  const totalProfit = safe90View
    ? overviewTotals.totalProfit90
    : overviewTotals.totalProfit100;
  const totalRevenue = safe90View
    ? overviewTotals.totalRevenue90
    : overviewTotals.totalRevenue100;
  const budgetUsedPct =
    overviewTotals.totalAllocatedBudget > 0
      ? Math.min(
          100,
          Math.round(
            (overviewTotals.totalInvestment /
              overviewTotals.totalAllocatedBudget) *
              100
          )
        )
      : 0;
  const netAfterRent = totalProfit - stallFee;

  const chartData = resolvedGroups.map(({ group, activeCombo }) => ({
    name: group.name,
    cost: activeCombo?.cost || 0,
    profit: safe90View ? activeCombo?.prof90 || 0 : activeCombo?.prof100 || 0,
    accent: group.accentColor,
  }));

  const handleTransferClick = () => {
    setTransferredFlash(true);
    setTimeout(() => {
      setTransferredFlash(false);
      onTransferToCfo();
    }, 220);
  };

  return (
    <div className="space-y-5">
      {/* Top Action & Mode Bar */}
      <section
        aria-label="Stock Portfolio Summary Header"
        className="bg-[#111827] border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-4"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <h1 className="font-display text-lg font-bold text-white">
              All Stock Overview
            </h1>
            <span className="text-xs text-slate-400 font-mono tabular-nums">
              {resolvedGroups.length} Categories · {overviewTotals.totalPieces} Pcs
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* 100% vs 90% Safe View Toggle */}
            <div className="flex items-center bg-[#090D16] p-1 rounded-xl border border-slate-800">
              <button
                type="button"
                onClick={() => setSafe90View(false)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors ${
                  !safe90View
                    ? 'bg-slate-800 text-white'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                100% Sold
              </button>
              <button
                type="button"
                onClick={() => setSafe90View(true)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors ${
                  safe90View
                    ? 'bg-amber-400 text-slate-950'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                90% Safe
              </button>
            </div>

            <button
              type="button"
              onClick={onAddCategoryGroup}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#090D16] hover:bg-slate-800 text-xs font-semibold text-slate-200 border border-slate-800 transition-colors"
            >
              <Plus className="w-3.5 h-3.5 text-amber-400" />
              <span>Add Category</span>
            </button>

            <button
              type="button"
              onClick={handleTransferClick}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold transition-colors"
            >
              {transferredFlash ? (
                <CheckCircle2 className="w-4 h-4" />
              ) : (
                <ArrowRight className="w-4 h-4" />
              )}
              <span>Transfer All to Total Stall CFO</span>
            </button>
          </div>
        </div>

        {/* 4 Visual Master KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="bg-[#090D16] border border-slate-800/90 rounded-xl p-3.5 space-y-1.5">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>Total Investment</span>
              <span className="font-mono text-amber-300 tabular-nums">
                {budgetUsedPct}%
              </span>
            </div>
            <div className="text-2xl sm:text-3xl font-mono font-bold text-white tabular-nums">
              ₹{overviewTotals.totalInvestment.toLocaleString('en-IN')}
            </div>
            <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-amber-400 rounded-full"
                style={{ width: `${budgetUsedPct}%` }}
              />
            </div>
            <div className="text-[11px] font-mono text-slate-400 tabular-nums">
              Budget: ₹{overviewTotals.totalAllocatedBudget.toLocaleString('en-IN')}
            </div>
          </div>

          <div className="bg-[#090D16] border border-emerald-500/35 rounded-xl p-3.5 space-y-1.5">
            <div className="text-xs text-emerald-400">
              Total Stock Profit {safe90View ? '(90%)' : '(100%)'}
            </div>
            <div className="text-2xl sm:text-3xl font-mono font-bold text-emerald-400 tabular-nums">
              +₹{totalProfit.toLocaleString('en-IN')}
            </div>
            <div className="text-[11px] font-mono text-slate-400 tabular-nums">
              After ₹{stallFee.toLocaleString('en-IN')} Stall Fee:{' '}
              <span
                className={
                  netAfterRent >= 0 ? 'text-emerald-300' : 'text-rose-400'
                }
              >
                {netAfterRent >= 0 ? '+' : ''}₹
                {netAfterRent.toLocaleString('en-IN')}
              </span>
            </div>
          </div>

          <div className="bg-[#090D16] border border-slate-800/90 rounded-xl p-3.5 space-y-1.5">
            <div className="text-xs text-slate-400">
              Total Revenue {safe90View ? '(90%)' : '(100%)'}
            </div>
            <div className="text-2xl sm:text-3xl font-mono font-bold text-cyan-300 tabular-nums">
              ₹{totalRevenue.toLocaleString('en-IN')}
            </div>
            <div className="text-[11px] font-mono text-slate-400 tabular-nums">
              {overviewTotals.totalPieces} Total Pieces ·{' '}
              {overviewTotals.blendedMarginPct}% Margin
            </div>
          </div>

          <div className="bg-[#090D16] border border-amber-500/30 rounded-xl p-3.5 space-y-1.5">
            <div className="text-xs text-amber-300">Overall Aesthetic</div>
            <div className="text-2xl sm:text-3xl font-mono font-bold text-amber-300 tabular-nums flex items-center gap-1.5">
              <span>{overviewTotals.weightedBeauty}</span>
              <Star className="w-5 h-5 fill-amber-400 text-amber-400" />
            </div>
            <div className="text-[11px] font-mono text-slate-400 tabular-nums">
              Weighted across {resolvedGroups.length} categories
            </div>
          </div>
        </div>

        {/* Multi-Category Visual Capital Split Bar */}
        <div className="space-y-2 pt-1">
          <div className="w-full h-3 bg-[#090D16] rounded-full overflow-hidden flex gap-1 p-0.5 border border-slate-800">
            {resolvedGroups.map(({ group, activeCombo }) => {
              const cost = activeCombo?.cost || 0;
              const pct =
                overviewTotals.totalInvestment > 0
                  ? (cost / overviewTotals.totalInvestment) * 100
                  : 0;
              if (pct <= 0) return null;
              return (
                <div
                  key={group.id}
                  style={{
                    width: `${pct}%`,
                    backgroundColor: group.accentColor,
                  }}
                  className="h-full first:rounded-l-full last:rounded-r-full transition-all duration-200"
                  title={`${group.name}: ₹${cost.toLocaleString('en-IN')}`}
                />
              );
            })}
          </div>

          <div className="flex flex-wrap items-center gap-4 text-xs">
            {resolvedGroups.map(({ group, activeCombo }) => {
              const cost = activeCombo?.cost || 0;
              const pct =
                overviewTotals.totalInvestment > 0
                  ? Math.round((cost / overviewTotals.totalInvestment) * 100)
                  : 0;
              return (
                <div
                  key={group.id}
                  className="flex items-center gap-1.5 font-mono tabular-nums"
                >
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: group.accentColor }}
                  />
                  <span className="text-slate-200 font-sans font-semibold">
                    {group.name}
                  </span>
                  <span className="text-slate-400">
                    ₹{cost.toLocaleString('en-IN')} ({pct}%)
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Preferred Choice Cards for Each Category (1 of 15 Selected Per Category) */}
      <section
        aria-label="Preferred Combination Per Category"
        className="grid grid-cols-1 lg:grid-cols-3 gap-4"
      >
        {resolvedGroups.map(({ group, combos, activeCombo }) => {
          const profit = activeCombo
            ? safe90View
              ? activeCombo.prof90
              : activeCombo.prof100
            : 0;

          return (
            <div
              key={group.id}
              className="bg-[#111827] border border-slate-800 rounded-2xl p-4 flex flex-col justify-between space-y-4"
            >
              {/* Card Header: Category Name + Edit Button */}
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className="w-3 h-3 rounded-full shrink-0"
                      style={{ backgroundColor: group.accentColor }}
                    />
                    <h2 className="font-display text-base font-bold text-white truncate">
                      {group.name}
                    </h2>
                    <span className="text-xs font-mono text-slate-400 tabular-nums shrink-0">
                      Cap ₹{group.budgetCap.toLocaleString('en-IN')}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => onEditCategoryGroup(group.id)}
                    aria-label={`Customize ${group.name} Mix`}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#090D16] hover:bg-slate-800 text-xs font-semibold text-amber-300 border border-slate-800 shrink-0 transition-colors"
                  >
                    <SlidersHorizontal className="w-3 h-3" />
                    <span>Tune</span>
                  </button>
                </div>

                {/* Preferred Choice Selector from the 15 Combinations */}
                {combos.length > 0 && activeCombo ? (
                  <div className="flex items-center justify-between gap-2 bg-[#090D16] border border-slate-800/90 rounded-xl px-3 py-2">
                    <span className="text-[11px] text-slate-400 shrink-0">
                      Preferred Pick
                    </span>
                    <select
                      aria-label={`Preferred combination for ${group.name}`}
                      value={activeCombo.id}
                      onChange={(e) =>
                        onSelectGroupCombo(group.id, e.target.value)
                      }
                      className="bg-transparent text-xs font-semibold text-amber-300 focus:outline-none text-right cursor-pointer truncate"
                    >
                      {combos.map((c) => (
                        <option
                          key={c.id}
                          value={c.id}
                          className="bg-[#090D16] text-slate-100"
                        >
                          {c.label} · {c.badge} (+₹
                          {(safe90View ? c.prof90 : c.prof100).toLocaleString(
                            'en-IN'
                          )}{' '}
                          · {c.avgBeauty}★)
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div className="text-xs text-rose-400 bg-rose-950/30 border border-rose-500/30 rounded-xl p-2.5">
                    Tight constraints — click Tune to adjust budget.
                  </div>
                )}

                {/* 3 Big Visual Metrics */}
                {activeCombo && (
                  <div className="grid grid-cols-3 gap-2">
                    <div className="bg-[#090D16] border border-slate-800/80 rounded-xl p-2.5">
                      <div className="text-[10px] text-slate-400">Invested</div>
                      <div className="text-base font-mono font-bold text-white tabular-nums mt-0.5">
                        ₹{activeCombo.cost.toLocaleString('en-IN')}
                      </div>
                    </div>

                    <div className="bg-[#090D16] border border-emerald-500/30 rounded-xl p-2.5">
                      <div className="text-[10px] text-emerald-400">Profit</div>
                      <div className="text-base font-mono font-bold text-emerald-400 tabular-nums mt-0.5">
                        +₹{profit.toLocaleString('en-IN')}
                      </div>
                    </div>

                    <div className="bg-[#090D16] border border-slate-800/80 rounded-xl p-2.5">
                      <div className="text-[10px] text-amber-300">
                        {activeCombo.pieces} Pcs
                      </div>
                      <div className="text-base font-mono font-bold text-amber-300 tabular-nums mt-0.5 flex items-center gap-1">
                        <span>{activeCombo.avgBeauty}</span>
                        <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                      </div>
                    </div>
                  </div>
                )}

                {/* Visual Multi-Color Mix Bar */}
                {activeCombo && (
                  <div className="w-full h-2.5 rounded-full overflow-hidden flex bg-[#090D16] gap-0.5 p-0.5 border border-slate-800">
                    {group.categories.map((cat, idx) => {
                      const q = activeCombo.counts[idx] || 0;
                      if (!q) return null;
                      return (
                        <div
                          key={cat.id}
                          style={{
                            width: `${(q / activeCombo.pieces) * 100}%`,
                            backgroundColor: cat.barColor,
                          }}
                          className="h-full first:rounded-l-full last:rounded-r-full"
                          title={`${q}x ${cat.name}`}
                        />
                      );
                    })}
                  </div>
                )}

                {/* Visual Item Quantity Grid */}
                {activeCombo && (
                  <div className="grid grid-cols-2 gap-1.5 pt-0.5">
                    {group.categories.map((cat, idx) => {
                      const q = activeCombo.counts[idx] || 0;
                      if (q <= 0) return null;
                      return (
                        <div
                          key={cat.id}
                          className="flex items-center justify-between bg-[#090D16] border border-slate-800/80 rounded-lg px-2.5 py-1.5 text-xs"
                        >
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span
                              className="w-2 h-2 rounded-full shrink-0"
                              style={{ backgroundColor: cat.barColor }}
                            />
                            <span className="text-slate-200 truncate">
                              {cat.shortName || cat.name}
                            </span>
                          </div>
                          <span className="font-mono font-bold text-white tabular-nums ml-1">
                            {q}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Quick Top-3 Pick Switcher Strip */}
              {combos.length > 1 && (
                <div className="pt-2 border-t border-slate-800/70 grid grid-cols-3 gap-1.5">
                  {combos.slice(0, 3).map((c) => {
                    const isPicked = activeCombo?.id === c.id;
                    const cProf = safe90View ? c.prof90 : c.prof100;
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => onSelectGroupCombo(group.id, c.id)}
                        className={`px-2 py-1.5 rounded-lg text-[11px] font-mono font-semibold truncate text-center tabular-nums transition-colors ${
                          isPicked
                            ? 'bg-amber-400 text-slate-950'
                            : 'bg-[#090D16] text-slate-300 hover:text-white border border-slate-800'
                        }`}
                      >
                        {c.label} · +₹{cProf.toLocaleString('en-IN')}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </section>

      {/* Visual Cost vs Profit Chart Across Categories */}
      <section className="bg-[#111827] border border-slate-800 rounded-2xl p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-semibold text-slate-300">
            Category Investment vs. Net Profit
          </h2>
          <div className="flex items-center gap-4 text-xs">
            <span className="flex items-center gap-1.5 text-slate-300">
              <span className="w-2.5 h-2.5 rounded-sm bg-amber-400" />
              Investment
            </span>
            <span className="flex items-center gap-1.5 text-slate-300">
              <span className="w-2.5 h-2.5 rounded-sm bg-emerald-400" />
              Profit
            </span>
          </div>
        </div>
        <div className="h-48 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <XAxis
                dataKey="name"
                stroke="#94a3b8"
                fontSize={12}
                tickLine={false}
              />
              <YAxis
                stroke="#64748b"
                fontSize={11}
                tickLine={false}
                tickFormatter={(v) => `₹${v}`}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#090D16',
                  borderColor: '#334155',
                  borderRadius: '12px',
                  fontSize: '12px',
                }}
              />
              <Bar
                dataKey="cost"
                name="Investment (₹)"
                fill="#fbbf24"
                radius={[6, 6, 0, 0]}
              />
              <Bar
                dataKey="profit"
                name="Net Profit (₹)"
                fill="#10b981"
                radius={[6, 6, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>
    </div>
  );
}
