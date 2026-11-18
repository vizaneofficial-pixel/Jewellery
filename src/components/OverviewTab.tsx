import React, { useState } from 'react';
import {
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Info,
  Plus,
  SlidersHorizontal,
  Trash2,
} from 'lucide-react';
import type {
  CategoryGroupResolved,
  DiversifiedOverviewTotals,
  StallStockRow,
} from '../types/stall';

interface OverviewTabProps {
  resolvedGroups: CategoryGroupResolved[];
  overviewTotals: DiversifiedOverviewTotals;
  stallFee: number;
  expectedFootfall: number;
  eventCostRows: StallStockRow[];
  onStallFeeChange: (val: number) => void;
  onAddEventCost: (name?: string, amount?: number) => void;
  onUpdateEventCost: (id: string, field: 'name' | 'cost', val: string) => void;
  onRemoveEventCost: (id: string) => void;
  onSelectGroupCombo: (groupId: string, comboId: string) => void;
  onEditCategoryGroup: (groupId: string) => void;
  onAddCategoryGroup: () => void;
  onTransferToCfo: () => void;
}

export function OverviewTab({
  resolvedGroups,
  overviewTotals,
  stallFee,
  expectedFootfall,
  eventCostRows,
  onStallFeeChange,
  onAddEventCost,
  onUpdateEventCost,
  onRemoveEventCost,
  onSelectGroupCombo,
  onEditCategoryGroup,
  onAddCategoryGroup,
  onTransferToCfo,
}: OverviewTabProps) {
  const [conservativeView, setConservativeView] = useState(false);
  const [showEventCostEditor, setShowEventCostEditor] = useState(false);
  const [transferredFlash, setTransferredFlash] = useState(false);

  const hasEventCosts = overviewTotals.totalEventCosts > 0;
  const displayRevenue = conservativeView
    ? overviewTotals.totalRevenue90
    : overviewTotals.totalRevenue100;
  const displayGrossProfit = conservativeView
    ? overviewTotals.totalProfit90
    : overviewTotals.totalProfit100;
  const displayNetProfit = conservativeView
    ? overviewTotals.netProfitConservativeAfterCosts
    : overviewTotals.netProfit100AfterCosts;

  const assumedSellPct = conservativeView
    ? overviewTotals.weightedConservativeSellThroughPct
    : 100;

  const budgetDelta =
    overviewTotals.totalAllocatedBudget - overviewTotals.totalInvestment;

  const handleTransferClick = () => {
    setTransferredFlash(true);
    setTimeout(() => {
      setTransferredFlash(false);
      onTransferToCfo();
    }, 180);
  };

  // Visual break-even scale (capped cleanly at 100% bar width)
  const breakEvenMarkerPct = Math.min(
    100,
    Math.max(0, overviewTotals.breakEvenSellThroughPct)
  );
  const conservativeMarkerPct = Math.min(
    100,
    Math.max(0, overviewTotals.weightedConservativeSellThroughPct)
  );
  const marginOfSafetyPct = Number(
    (
      overviewTotals.weightedConservativeSellThroughPct -
      overviewTotals.breakEvenSellThroughPct
    ).toFixed(1)
  );

  return (
    <div className="space-y-4">
      {/* 1. Executive Whole-Stall Financial Answer */}
      <section
        aria-label="Whole-Stall Financial Summary"
        className="bg-[#111827] border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-4"
      >
        {/* Header & Scenario Switch */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="font-display text-lg font-bold text-white">
              Stock Overview
            </h1>
            <p className="text-xs text-slate-400">
              Rollup of your {resolvedGroups.length} selected category mixes ({overviewTotals.totalPieces} pcs) · Estimates use your assumed prices
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* 100% vs Conservative Sell-Through Toggle */}
            <div
              role="group"
              aria-label="Sell-through scenario"
              className="flex items-center bg-[#090D16] p-1 rounded-xl border border-slate-800"
            >
              <button
                type="button"
                aria-pressed={!conservativeView}
                onClick={() => setConservativeView(false)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                  !conservativeView
                    ? 'bg-slate-800 text-white'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                100% Sold
              </button>
              <button
                type="button"
                aria-pressed={conservativeView}
                onClick={() => setConservativeView(true)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                  conservativeView
                    ? 'bg-amber-400 text-slate-950'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Conservative (~{overviewTotals.weightedConservativeSellThroughPct}% est.)
              </button>
            </div>

            <button
              type="button"
              onClick={handleTransferClick}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold whitespace-nowrap transition-colors"
            >
              {transferredFlash ? (
                <CheckCircle2 className="w-4 h-4" />
              ) : (
                <ArrowRight className="w-4 h-4" />
              )}
              <span>Sync to Total Stall CFO</span>
            </button>
          </div>
        </div>

        {/* 5 Large, Scannable Financial Figures */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* 1. Stock Investment vs Budget */}
          <div className="bg-[#090D16] border border-slate-800/90 rounded-xl p-3.5 space-y-1">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>Selected Stock Cost</span>
              <span
                title="Sum of wholesale inventory cost across each category's active mix"
                className="text-slate-500"
              >
                <Info className="w-3.5 h-3.5" />
              </span>
            </div>
            <div className="text-2xl font-mono font-bold text-white tabular-nums">
              ₹{overviewTotals.totalInvestment.toLocaleString('en-IN')}
            </div>
            <div className="text-[11px] font-mono text-slate-400 tabular-nums">
              of ₹{overviewTotals.totalAllocatedBudget.toLocaleString('en-IN')} allocated
              {budgetDelta >= 0
                ? ` · ₹${budgetDelta.toLocaleString('en-IN')} spare`
                : ` · ₹${Math.abs(budgetDelta).toLocaleString('en-IN')} over`}
            </div>
          </div>

          {/* 2. Projected Revenue */}
          <div className="bg-[#090D16] border border-slate-800/90 rounded-xl p-3.5 space-y-1">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>Projected Revenue</span>
              <span className="font-mono text-[11px] text-cyan-300 tabular-nums">
                {assumedSellPct}% est.
              </span>
            </div>
            <div className="text-2xl font-mono font-bold text-cyan-300 tabular-nums">
              ₹{displayRevenue.toLocaleString('en-IN')}
            </div>
            <div className="text-[11px] font-mono text-slate-400 tabular-nums">
              {conservativeView
                ? `100% full: ₹${overviewTotals.totalRevenue100.toLocaleString('en-IN')}`
                : `~${overviewTotals.weightedConservativeSellThroughPct}% est.: ₹${overviewTotals.totalRevenue90.toLocaleString('en-IN')}`}
            </div>
          </div>

          {/* 3. Est. Gross Profit (before event costs) */}
          <div className="bg-[#090D16] border border-slate-800/90 rounded-xl p-3.5 space-y-1">
            <div className="flex items-center justify-between text-xs text-slate-300">
              <span>Est. Gross Profit</span>
              <span className="font-mono text-[11px] text-slate-400 tabular-nums">
                {overviewTotals.blendedMarginPct}% margin
              </span>
            </div>
            <div
              className={`text-2xl font-mono font-bold tabular-nums ${
                displayGrossProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {displayGrossProfit >= 0 ? '+' : ''}₹
              {displayGrossProfit.toLocaleString('en-IN')}
            </div>
            <div className="text-[11px] text-slate-400">
              Before stall & event costs
            </div>
          </div>

          {/* 4. Stall & Exhibition Costs */}
          <div className="bg-[#090D16] border border-slate-800/90 rounded-xl p-3.5 space-y-1">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>Stall & Event Costs</span>
              <button
                type="button"
                aria-expanded={showEventCostEditor}
                onClick={() => setShowEventCostEditor((prev) => !prev)}
                className="text-[11px] text-amber-300 hover:text-amber-200 underline flex items-center gap-0.5"
              >
                <span>{showEventCostEditor ? 'Hide' : 'Edit'}</span>
                {showEventCostEditor ? (
                  <ChevronUp className="w-3 h-3" />
                ) : (
                  <ChevronDown className="w-3 h-3" />
                )}
              </button>
            </div>
            <div className="text-2xl font-mono font-bold text-amber-300 tabular-nums">
              ₹{overviewTotals.totalEventCosts.toLocaleString('en-IN')}
            </div>
            <div className="text-[11px] font-mono text-slate-400 tabular-nums">
              Rent ₹{stallFee.toLocaleString('en-IN')}
              {eventCostRows.length > 0
                ? ` + ${eventCostRows.length} extra cost${eventCostRows.length > 1 ? 's' : ''}`
                : ' · No extra costs'}
            </div>
          </div>

          {/* 5. Est. Net Profit (strictly guarded by hasEventCosts) */}
          <div
            className={`bg-[#090D16] rounded-xl p-3.5 space-y-1 border ${
              hasEventCosts
                ? displayNetProfit >= 0
                  ? 'border-emerald-500/45'
                  : 'border-rose-500/45'
                : 'border-slate-800/90'
            }`}
          >
            <div className="text-xs text-slate-300 font-medium">
              {hasEventCosts
                ? 'Est. Net Profit'
                : 'Est. Profit (before event costs)'}
            </div>
            <div
              className={`text-2xl font-mono font-bold tabular-nums ${
                displayNetProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {displayNetProfit >= 0 ? '+' : ''}₹
              {displayNetProfit.toLocaleString('en-IN')}
            </div>
            <div className="text-[11px] text-slate-400">
              {hasEventCosts
                ? `After ₹${overviewTotals.totalEventCosts.toLocaleString('en-IN')} stall & event costs`
                : 'Add stall/event costs to see net profit'}
            </div>
          </div>
        </div>

        {/* Inline Stall Fee & Other Event Costs Editor */}
        {showEventCostEditor && (
          <div className="bg-[#090D16] border border-slate-800 rounded-xl p-3.5 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="text-xs text-slate-300 font-semibold">
                Stall Rent & Other Event Costs
              </div>
              <button
                type="button"
                onClick={() => onAddEventCost('Display / Travel / Packaging', 500)}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-semibold text-amber-300"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Event Cost</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              <label className="flex items-center justify-between gap-2 bg-slate-900/80 border border-slate-800 rounded-lg px-3 py-2 text-xs">
                <span className="text-slate-300 font-medium">Stall / Booth Rent</span>
                <span className="flex items-center gap-1 font-mono text-amber-300">
                  ₹
                  <input
                    type="number"
                    min={0}
                    aria-label="Stall booth rent"
                    value={stallFee}
                    onChange={(e) =>
                      onStallFeeChange(Math.max(0, Number(e.target.value) || 0))
                    }
                    className="w-20 bg-transparent text-right font-bold focus:outline-none tabular-nums"
                  />
                </span>
              </label>

              {eventCostRows.map((row) => (
                <div
                  key={row.id}
                  className="flex items-center justify-between gap-2 bg-slate-900/80 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs"
                >
                  <input
                    type="text"
                    aria-label={`Event cost name for ${row.name}`}
                    value={row.name}
                    onChange={(e) =>
                      onUpdateEventCost(row.id, 'name', e.target.value)
                    }
                    className="min-w-0 flex-1 bg-transparent text-slate-200 font-medium focus:outline-none"
                  />
                  <span className="flex items-center gap-1 font-mono text-amber-300 shrink-0">
                    ₹
                    <input
                      type="number"
                      min={0}
                      aria-label={`Event cost amount for ${row.name}`}
                      value={row.cost}
                      onChange={(e) =>
                        onUpdateEventCost(row.id, 'cost', e.target.value)
                      }
                      className="w-16 bg-transparent text-right font-bold focus:outline-none tabular-nums"
                    />
                  </span>
                  <button
                    type="button"
                    aria-label={`Remove ${row.name}`}
                    onClick={() => onRemoveEventCost(row.id)}
                    className="text-slate-500 hover:text-rose-400 p-1 shrink-0"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Conservative Inventory Risk Clarification + Break-Even Meter */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 pt-1">
          {/* Break-Even Point Card */}
          <div className="bg-[#090D16] border border-slate-800/90 rounded-xl p-3.5 space-y-2.5">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <div>
                <span className="text-xs font-semibold text-white">
                  Break-Even Point
                </span>
                <span className="text-[11px] text-slate-400 ml-2">
                  To cover ₹{overviewTotals.totalOutlay.toLocaleString('en-IN')} total outlay
                </span>
              </div>
              <span className="text-xs font-mono font-bold text-amber-300 tabular-nums">
                {overviewTotals.breakEvenSellThroughPct}% of stock revenue ({overviewTotals.unitsToBreakEven}/{overviewTotals.totalPieces} pcs)
              </span>
            </div>

            {/* Clean Visual Threshold Bar */}
            <div className="relative h-2.5 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
              <div
                style={{ width: `${conservativeMarkerPct}%` }}
                className="h-full bg-emerald-500/35"
              />
              <div
                style={{ width: `${breakEvenMarkerPct}%` }}
                className="absolute inset-y-0 left-0 bg-amber-400/80"
              />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono text-slate-400 tabular-nums">
              <span>
                Footfall needed: {overviewTotals.footfallConversionNeeded}% of{' '}
                {expectedFootfall.toLocaleString('en-IN')}
              </span>
              <span
                className={
                  marginOfSafetyPct >= 0 ? 'text-emerald-400' : 'text-rose-400'
                }
              >
                {marginOfSafetyPct >= 0
                  ? `+${marginOfSafetyPct}% safety cushion vs conservative est.`
                  : `${Math.abs(marginOfSafetyPct)}% shortfall vs conservative est.`}
              </span>
            </div>
          </div>

          {/* Risk & Unsold Inventory Clarity Card */}
          <div className="bg-[#090D16] border border-slate-800/90 rounded-xl p-3.5 space-y-2">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <span className="text-xs font-semibold text-white">
                Where Is My Risk? (Sell-Through Estimate)
              </span>
              <span className="text-xs font-mono font-semibold text-indigo-300 tabular-nums">
                ~{100 - overviewTotals.weightedConservativeSellThroughPct}% unsold stock: ₹
                {overviewTotals.unsoldInventoryCostConservative.toLocaleString('en-IN')} cost
              </span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Sell-through (~{overviewTotals.weightedConservativeSellThroughPct}% est.) is an assumption, not guaranteed cash loss: unsold items (~₹
              {overviewTotals.unsoldInventoryCostConservative.toLocaleString('en-IN')} wholesale value) remain physical inventory you keep for the next sale.
            </p>
          </div>
        </div>
      </section>

      {/* 2. Capital Allocation & Profit Contribution Comparison */}
      <section
        aria-label="Capital Allocation and Contribution"
        className="bg-[#111827] border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-3"
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="font-display text-sm font-bold text-white">
              Capital Allocation & Profit Contribution
            </h2>
            <p className="text-xs text-slate-400">
              How your ₹{overviewTotals.totalOutlay.toLocaleString('en-IN')} total outlay is split across stock categories and stall costs
            </p>
          </div>
          <button
            type="button"
            onClick={onAddCategoryGroup}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#090D16] hover:bg-slate-800 text-xs font-semibold text-slate-200 border border-slate-800 transition-colors"
          >
            <Plus className="w-3.5 h-3.5 text-amber-400" />
            <span>Add Category</span>
          </button>
        </div>

        {/* Clean Segmented Outlay Bar (No Hard-to-Read Bar Chart) */}
        <div className="w-full h-3 bg-[#090D16] rounded-full overflow-hidden flex gap-0.5 p-0.5 border border-slate-800">
          {resolvedGroups.map(({ group, activeCombo }) => {
            const cost = activeCombo?.cost || 0;
            const pct =
              overviewTotals.totalOutlay > 0
                ? (cost / overviewTotals.totalOutlay) * 100
                : 0;
            if (pct <= 0) return null;
            return (
              <div
                key={group.id}
                style={{ width: `${pct}%`, backgroundColor: group.accentColor }}
                className="h-full first:rounded-l-full last:rounded-r-full"
                title={`${group.name} stock: ₹${cost.toLocaleString('en-IN')} (${Math.round(pct)}% of outlay)`}
              />
            );
          })}
          {overviewTotals.totalEventCosts > 0 && overviewTotals.totalOutlay > 0 && (
            <div
              style={{
                width: `${(overviewTotals.totalEventCosts / overviewTotals.totalOutlay) * 100}%`,
              }}
              className="h-full bg-slate-500/70 last:rounded-r-full"
              title={`Stall & event costs: ₹${overviewTotals.totalEventCosts.toLocaleString('en-IN')}`}
            />
          )}
        </div>

        {/* Aligned Allocation & Profit Contribution Rows */}
        <div className="divide-y divide-slate-800/70 text-xs">
          {resolvedGroups.map(({ group, activeCombo }) => {
            const cost = activeCombo?.cost || 0;
            const rev = activeCombo
              ? conservativeView
                ? activeCombo.rev90
                : activeCombo.rev100
              : 0;
            const prof = activeCombo
              ? conservativeView
                ? activeCombo.prof90
                : activeCombo.prof100
              : 0;
            const capitalSharePct =
              overviewTotals.totalOutlay > 0
                ? Math.round((cost / overviewTotals.totalOutlay) * 100)
                : 0;
            const profitSharePct =
              displayGrossProfit > 0
                ? Math.max(0, Math.round((prof / displayGrossProfit) * 100))
                : 0;

            return (
              <div
                key={group.id}
                className="py-2 flex flex-wrap items-center justify-between gap-3"
              >
                <div className="flex items-center gap-2 min-w-[140px]">
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: group.accentColor }}
                  />
                  <span className="font-semibold text-white">{group.name}</span>
                  <span className="font-mono text-slate-400 tabular-nums">
                    ({capitalSharePct}% of outlay)
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-4 sm:gap-6 font-mono tabular-nums">
                  <span className="text-slate-300">
                    Spend ₹{cost.toLocaleString('en-IN')}
                  </span>
                  <span className="text-cyan-300">
                    Rev ₹{rev.toLocaleString('en-IN')}
                  </span>
                  <span className="text-emerald-400 font-semibold">
                    {prof >= 0 ? '+' : ''}₹{prof.toLocaleString('en-IN')}{' '}
                    <span className="text-slate-400 font-normal">
                      ({profitSharePct}% of gross profit)
                    </span>
                  </span>
                </div>
              </div>
            );
          })}

          {overviewTotals.totalEventCosts > 0 && (
            <div className="py-2 flex flex-wrap items-center justify-between gap-3 text-slate-300">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-slate-500 shrink-0" />
                <span className="font-semibold">Stall & Event Costs</span>
                <span className="font-mono text-slate-400 tabular-nums">
                  (
                  {overviewTotals.totalOutlay > 0
                    ? Math.round(
                        (overviewTotals.totalEventCosts / overviewTotals.totalOutlay) *
                          100
                      )
                    : 0}
                  % of outlay)
                </span>
              </div>
              <span className="font-mono text-amber-300 tabular-nums">
                −₹{overviewTotals.totalEventCosts.toLocaleString('en-IN')} fixed cost
              </span>
            </div>
          )}
        </div>
      </section>

      {/* 3. Compact Visual Category Cards (Interactive Mix Switcher) */}
      <section
        aria-label="Category Mix Breakdown"
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
      >
        {resolvedGroups.map(({ group, combos, activeCombo }) => {
          const catSafePct =
            activeCombo?.sellThroughPct ?? group.conservativeSellThroughPct ?? 90;
          const revenue = activeCombo
            ? conservativeView
              ? activeCombo.rev90
              : activeCombo.rev100
            : 0;
          const profit = activeCombo
            ? conservativeView
              ? activeCombo.prof90
              : activeCombo.prof100
            : 0;
          const profitSharePct =
            displayGrossProfit > 0 && activeCombo
              ? Math.max(0, Math.round((profit / displayGrossProfit) * 100))
              : 0;
          const overBudget = activeCombo
            ? activeCombo.cost > group.budgetCap
            : false;

          return (
            <div
              key={group.id}
              className="bg-[#111827] border border-slate-800 rounded-2xl p-4 flex flex-col justify-between space-y-3.5"
            >
              <div className="space-y-3">
                {/* Card Header */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: group.accentColor }}
                    />
                    <h3 className="font-display text-sm font-bold text-white truncate">
                      {group.name}
                    </h3>
                    <span className="text-xs font-mono text-slate-400 tabular-nums shrink-0">
                      {profitSharePct}% profit share
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => onEditCategoryGroup(group.id)}
                    aria-label={`Tune ${group.name} Mix`}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#090D16] hover:bg-slate-800 text-xs font-semibold text-amber-300 border border-slate-800 shrink-0 transition-colors"
                  >
                    <SlidersHorizontal className="w-3 h-3" />
                    <span>Tune</span>
                  </button>
                </div>

                {/* Inline Preferred Option Switcher (immediately updates Overview & synced CFO) */}
                {combos.length > 0 && activeCombo ? (
                  <label className="flex items-center justify-between gap-1.5 bg-[#090D16] border border-slate-800/90 rounded-xl px-2.5 py-2 text-[11px]">
                    <span className="text-slate-400 shrink-0">Selected Mix</span>
                    <select
                      aria-label={`Preferred combination for ${group.name}`}
                      value={activeCombo.id}
                      onChange={(e) =>
                        onSelectGroupCombo(group.id, e.target.value)
                      }
                      className="bg-transparent font-semibold text-amber-300 focus:outline-none text-right cursor-pointer min-w-0 truncate"
                    >
                      {combos.map((c) => {
                        const optProfit = conservativeView ? c.prof90 : c.prof100;
                        return (
                          <option
                            key={c.id}
                            value={c.id}
                            className="bg-[#090D16] text-slate-100"
                          >
                            {c.label} · {c.badge} (+₹
                            {optProfit.toLocaleString('en-IN')} · {c.avgBeauty.toFixed(1)}★)
                          </option>
                        );
                      })}
                    </select>
                  </label>
                ) : (
                  <div className="text-xs text-rose-300 bg-rose-950/30 border border-rose-500/30 rounded-xl p-2.5">
                    No valid option — click Tune to adjust targets.
                  </div>
                )}

                {/* 4 Clean Key Numbers: Spend vs Budget, Revenue, Profit Contribution, Downside */}
                {activeCombo && (
                  <div className="grid grid-cols-2 gap-2 text-xs font-mono tabular-nums">
                    <div className="bg-[#090D16] border border-slate-800/80 rounded-xl p-2.5">
                      <span className="block font-sans text-[11px] text-slate-400">
                        Spend vs Budget
                      </span>
                      <span
                        className={`text-sm font-bold ${
                          overBudget ? 'text-rose-400' : 'text-white'
                        }`}
                      >
                        ₹{activeCombo.cost.toLocaleString('en-IN')}
                      </span>
                      <span className="block text-[10px] text-slate-400">
                        of ₹{group.budgetCap.toLocaleString('en-IN')} cap
                      </span>
                    </div>

                    <div className="bg-[#090D16] border border-slate-800/80 rounded-xl p-2.5">
                      <span className="block font-sans text-[11px] text-slate-400">
                        Projected Revenue
                      </span>
                      <span className="text-sm font-bold text-cyan-300">
                        ₹{revenue.toLocaleString('en-IN')}
                      </span>
                      <span className="block text-[10px] text-slate-400">
                        {conservativeView ? `${catSafePct}% est.` : '100% sold'} ·{' '}
                        {activeCombo.pieces} pcs
                      </span>
                    </div>

                    <div className="bg-[#090D16] border border-emerald-500/25 rounded-xl p-2.5">
                      <span className="block font-sans text-[11px] text-emerald-400">
                        Gross Profit Contrib.
                      </span>
                      <span
                        className={`text-sm font-bold ${
                          profit >= 0 ? 'text-emerald-400' : 'text-rose-400'
                        }`}
                      >
                        {profit >= 0 ? '+' : ''}₹{profit.toLocaleString('en-IN')}
                      </span>
                      <span className="block text-[10px] text-slate-400">
                        Before event costs
                      </span>
                    </div>

                    <div className="bg-[#090D16] border border-indigo-500/25 rounded-xl p-2.5">
                      <span className="block font-sans text-[11px] text-indigo-300">
                        Conservative ({catSafePct}%)
                      </span>
                      <span
                        className={`text-sm font-bold ${
                          activeCombo.prof90 >= 0
                            ? 'text-indigo-300'
                            : 'text-rose-400'
                        }`}
                      >
                        {activeCombo.prof90 >= 0 ? '+' : ''}₹
                        {activeCombo.prof90.toLocaleString('en-IN')}
                      </span>
                      <span className="block text-[10px] text-slate-400">
                        ₹{activeCombo.unsoldRiskCost.toLocaleString('en-IN')} kept stock
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Selected Mix Breakdown Strip */}
              {activeCombo && (
                <div className="space-y-2 pt-1 border-t border-slate-800/70">
                  <div className="w-full h-2 rounded-full overflow-hidden flex bg-[#090D16] gap-0.5 p-0.5 border border-slate-800">
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

                  <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[11px] font-mono text-slate-300 tabular-nums">
                    {group.categories
                      .map((cat, idx) => ({ cat, q: activeCombo.counts[idx] || 0 }))
                      .filter((x) => x.q > 0)
                      .map(({ cat, q }, i, arr) => (
                        <span key={cat.id}>
                          <strong className="text-white">{q}</strong>{' '}
                          <span className="font-sans text-slate-400">
                            {cat.shortName || cat.name}
                          </span>
                          {i < arr.length - 1 ? ' ·' : ''}
                        </span>
                      ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </section>
    </div>
  );
}
