import React, { useState } from 'react';
import {
  AlertCircle,
  Award,
  ChevronDown,
  ChevronUp,
  Download,
  FileSpreadsheet,
  Loader2,
  Plus,
  RotateCcw,
  Sparkles,
  Trash2,
} from 'lucide-react';
import type { StallStockItem, StallTotals } from '../types/stall';

interface CalculatorTabProps {
  eventName: string;
  expectedFootfall: number;
  stallTotals: StallTotals;
  stallFee: number;
  globalSellThrough: number;
  onStallFeeChange: (val: number) => void;
  onAddEventCost: (name?: string, amount?: number) => void;
  onUpdateEventCost: (id: string, field: 'name' | 'cost', val: string) => void;
  onRemoveEventCost: (id: string) => void;
  onApplyGlobalSellThrough: (pct: number) => void;
  onUpdateStockItem: (id: string, field: keyof StallStockItem, val: string) => void;
  onAddStockItem: () => void;
  onAddParsedStockItems: (items: StallStockItem[]) => void;
  onRemoveStockItem: (id: string) => void;
  onResetSyncedBundles: () => void;
  aiAuditLoading: boolean;
  aiAuditReport: string | null;
  aiAuditError: string | null;
  onRunAiCfoAudit: () => void;
}

export function CalculatorTab({
  eventName,
  expectedFootfall,
  stallTotals,
  stallFee,
  globalSellThrough,
  onStallFeeChange,
  onAddEventCost,
  onUpdateEventCost,
  onRemoveEventCost,
  onApplyGlobalSellThrough,
  onUpdateStockItem,
  onAddStockItem,
  onAddParsedStockItems,
  onRemoveStockItem,
  onResetSyncedBundles,
  aiAuditLoading,
  aiAuditReport,
  aiAuditError,
  onRunAiCfoAudit,
}: CalculatorTabProps) {
  const [conservativeView, setConservativeView] = useState(true);
  const [showDetailedLedger, setShowDetailedLedger] = useState(false);
  const [showNotesImporter, setShowNotesImporter] = useState(false);
  const [rawNotes, setRawNotes] = useState('');
  const [rawParsing, setRawParsing] = useState(false);
  const [rawError, setRawError] = useState<string | null>(null);
  const [rawSuccess, setRawSuccess] = useState<string | null>(null);

  const hasEventCosts = stallTotals.totalEventCosts > 0;
  const displayRev = conservativeView ? stallTotals.revRealistic : stallTotals.rev100;
  const displayGrossProfit = conservativeView
    ? stallTotals.grossProfitReal
    : stallTotals.grossProfit100;
  const displayNetProfit = conservativeView
    ? stallTotals.netAfterStallReal
    : stallTotals.netAfterStall100;
  const displaySellPct = conservativeView ? stallTotals.weightedSellThroughPct : 100;
  const displayMarginPct =
    displayRev > 0
      ? Number(((displayGrossProfit / displayRev) * 100).toFixed(1))
      : 0;
  const displayCapitalMultiple =
    stallTotals.totalOutlay > 0
      ? Number((displayRev / stallTotals.totalOutlay).toFixed(2))
      : 0;
  const displayEventCostSharePct =
    displayGrossProfit > 0
      ? Math.min(100, Number(((stallTotals.totalEventCosts / displayGrossProfit) * 100).toFixed(1)))
      : stallTotals.totalEventCosts > 0
        ? 100
        : 0;

  const syncedRows = stallTotals.itemRows.filter((r) => r.isSyncedBundle);
  const manualRows = stallTotals.itemRows.filter((r) => !r.isSyncedBundle);
  const hasLotOrSellOverrides = syncedRows.some(
    (r) => r.qty !== 1 || r.sellThroughManual
  );

  const handleImportRawNotes = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rawNotes.trim()) return;
    setRawParsing(true);
    setRawError(null);
    setRawSuccess(null);

    try {
      const res = await fetch('/api/ai/parse-raw-stock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rawNotes: rawNotes.trim(),
          defaultSellThrough: globalSellThrough,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not parse stock notes');

      const items: StallStockItem[] = (data.items || []).map(
        (
          item: {
            name: string;
            category: string;
            cost: number;
            price: number;
            qty: number;
            sellThrough: number;
          },
          idx: number
        ) => ({
          id: `raw_${Date.now()}_${idx}`,
          name: item.name || 'Imported Item',
          category: item.category || 'Custom',
          cost: Math.max(0, Number(item.cost) || 0),
          price: Math.max(0, Number(item.price) || 0),
          qty: Math.max(1, Number(item.qty) || 1),
          sellThrough: Math.min(
            100,
            Math.max(10, Number(item.sellThrough) || globalSellThrough)
          ),
          isSyncedBundle: false,
          itemType: 'stock',
        })
      );

      if (items.length === 0) {
        setRawError(
          'No inventory items detected. Try including item name, cost, sell price, and quantity.'
        );
      } else {
        onAddParsedStockItems(items);
        setRawSuccess(
          `Added ${items.length} stock item(s) to your stall ledger.`
        );
        setRawNotes('');
        setShowDetailedLedger(true);
      }
    } catch (err) {
      setRawError(
        err instanceof Error ? err.message : 'Failed to parse rough stock notes.'
      );
    } finally {
      setRawParsing(false);
    }
  };

  const handleExportCsv = () => {
    const header = [
      'Item',
      'Category',
      'Type',
      'Unit Cost (INR)',
      'Sell Price (INR)',
      'Qty',
      'Sell-Through %',
      'Total Cost',
      'Est. Revenue',
      'Est. Profit',
      'ROI %',
    ];
    const stockLines = stallTotals.itemRows.map((r) => [
      `"${r.name.replace(/"/g, '""')}"`,
      `"${r.category}"`,
      r.isSyncedBundle ? 'Synced Category Mix' : 'Manual Item',
      r.cost,
      r.price,
      r.qty,
      r.sellThrough,
      r.lineCost,
      r.lineRevReal,
      r.lineProfitReal,
      r.roiPct,
    ]);
    const expenseLines = [
      [
        '"Stall / Booth Rent"',
        '"Event Cost"',
        'Fixed Cost',
        stallFee,
        0,
        1,
        0,
        stallFee,
        0,
        -stallFee,
        0,
      ],
      ...stallTotals.eventCostRows.map((e) => [
        `"${e.name.replace(/"/g, '""')}"`,
        '"Event Cost"',
        'Event Expense',
        e.cost,
        0,
        1,
        0,
        e.lineCost,
        0,
        -e.lineCost,
        0,
      ]),
    ];
    const csv = [header.join(','), ...stockLines.map((r) => r.join(',')), ...expenseLines.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const slug = (eventName || 'stalliq-stock')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-');
    a.download = `${slug}-cfo.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      {/* 1. Summary-First Total Stall CFO Panel */}
      <section
        aria-label="Master CFO Summary"
        className="bg-[#111827] border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-4"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="font-display text-lg font-bold text-white">
              Total Stall CFO
            </h1>
            <p className="text-xs text-slate-400">
              Synced with {syncedRows.length} category mix{syncedRows.length === 1 ? '' : 'es'}
              {manualRows.length > 0
                ? ` + ${manualRows.length} extra item${manualRows.length === 1 ? '' : 's'}`
                : ' · 1:1 with Stock Overview'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* 100% vs Conservative View Toggle */}
            <div
              role="group"
              aria-label="CFO sell-through scenario"
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
                Conservative (~{stallTotals.weightedSellThroughPct}% est.)
              </button>
            </div>

            {hasLotOrSellOverrides && (
              <button
                type="button"
                onClick={onResetSyncedBundles}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[#090D16] hover:bg-slate-800 text-xs font-semibold text-amber-300 border border-slate-800 whitespace-nowrap"
                title="Reset synced category lot quantities and sell-through rates to match Stock Overview 1:1"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset Sync 1:1</span>
              </button>
            )}

            <button
              type="button"
              onClick={onRunAiCfoAudit}
              disabled={aiAuditLoading}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 disabled:opacity-60 text-slate-950 font-bold text-xs whitespace-nowrap transition-colors"
            >
              {aiAuditLoading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Sparkles className="w-3.5 h-3.5" />
              )}
              <span>{aiAuditLoading ? 'Auditing...' : 'Deep CFO Audit'}</span>
            </button>
          </div>
        </div>

        {/* 4 Core CFO KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="bg-[#090D16] border border-slate-800/90 rounded-xl p-3.5 space-y-1">
            <div className="text-xs text-slate-400">1. Total Capital Outlay</div>
            <div className="text-2xl sm:text-3xl font-mono font-bold text-white tabular-nums">
              ₹{stallTotals.totalOutlay.toLocaleString('en-IN')}
            </div>
            <div className="text-[11px] font-mono text-slate-400 tabular-nums">
              ₹{stallTotals.totalCost.toLocaleString('en-IN')} Stock + ₹
              {stallTotals.totalEventCosts.toLocaleString('en-IN')} Event Costs
            </div>
          </div>

          <div className="bg-[#090D16] border border-slate-800/90 rounded-xl p-3.5 space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400">2. Projected Revenue</span>
              <span className="font-mono font-semibold text-cyan-300 tabular-nums">
                {displaySellPct}% est.
              </span>
            </div>
            <div className="text-2xl sm:text-3xl font-mono font-bold text-cyan-300 tabular-nums">
              ₹{displayRev.toLocaleString('en-IN')}
            </div>
            <div className="flex items-center gap-2 pt-0.5">
              <input
                type="range"
                aria-label="Global sell-through percentage"
                min={50}
                max={100}
                step={5}
                value={globalSellThrough}
                onChange={(e) =>
                  onApplyGlobalSellThrough(Number(e.target.value))
                }
                className="w-20 h-1 bg-slate-800 rounded-lg accent-cyan-400 cursor-pointer"
              />
              <span className="text-[11px] font-mono text-slate-400 tabular-nums">
                {conservativeView
                  ? `100%: ₹${stallTotals.rev100.toLocaleString('en-IN')}`
                  : `${stallTotals.weightedSellThroughPct}%: ₹${stallTotals.revRealistic.toLocaleString('en-IN')}`}
              </span>
            </div>
          </div>

          <div
            className={`bg-[#090D16] rounded-xl p-3.5 space-y-1 border ${
              hasEventCosts
                ? displayNetProfit >= 0
                  ? 'border-emerald-500/45'
                  : 'border-rose-500/45'
                : 'border-slate-800/90'
            }`}
          >
            <div className="text-xs text-emerald-400 font-medium">
              {hasEventCosts
                ? '3. Est. Net Profit'
                : '3. Est. Profit (before event costs)'}
            </div>
            <div
              className={`text-2xl sm:text-3xl font-mono font-bold tabular-nums ${
                displayNetProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {displayNetProfit >= 0 ? '+' : ''}₹
              {displayNetProfit.toLocaleString('en-IN')}
            </div>
            <div className="text-[11px] text-slate-400">
              {hasEventCosts
                ? `Gross +₹${displayGrossProfit.toLocaleString('en-IN')} − ₹${stallTotals.totalEventCosts.toLocaleString('en-IN')} event costs`
                : 'Add stall rent or event costs below to compute net profit'}
            </div>
          </div>

          <div className="bg-[#090D16] border border-amber-500/35 rounded-xl p-3.5 space-y-1">
            <div className="text-xs text-amber-300">4. Break-Even & Inventory</div>
            <div className="text-2xl sm:text-3xl font-mono font-bold text-white tabular-nums">
              {stallTotals.breakEvenSellThroughPct}%{' '}
              <span className="text-xs font-normal text-slate-400">
                ({stallTotals.unitsToBreakEven}/{stallTotals.totalUnits} pcs)
              </span>
            </div>
            <div className="text-[11px] text-slate-400 font-mono tabular-nums">
              {stallTotals.footfallConversionNeeded}% of{' '}
              {expectedFootfall.toLocaleString('en-IN')} crowd
              {conservativeView && stallTotals.unsoldInventoryCost > 0
                ? ` · ₹${stallTotals.unsoldInventoryCost.toLocaleString('en-IN')} stock kept`
                : ''}
            </div>
          </div>
        </div>

        {/* Compact Ratios Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-slate-800/70 text-xs">
          <div>
            <span className="block text-[11px] text-slate-400">
              Blended Gross Margin
            </span>
            <span className="font-mono font-bold text-white tabular-nums">
              {displayMarginPct}%
            </span>
          </div>
          <div>
            <span className="block text-[11px] text-slate-400">
              Capital Return Multiple
            </span>
            <span className="font-mono font-bold text-amber-300 tabular-nums">
              {displayCapitalMultiple}x
            </span>
          </div>
          <div>
            <span className="block text-[11px] text-slate-400">
              Event Cost Share
            </span>
            <span className="font-mono font-bold text-slate-100 tabular-nums">
              {displayEventCostSharePct}% of Gross Profit
            </span>
          </div>
          <div>
            <span className="block text-[11px] text-slate-400">Top ROI Driver</span>
            <span className="font-semibold text-emerald-400 truncate block tabular-nums">
              {stallTotals.topRoiItemName} · {stallTotals.topRoiPct}% ROI
            </span>
          </div>
        </div>
      </section>

      {/* AI Audit Output (if triggered) */}
      {aiAuditError && (
        <div className="bg-rose-950/40 border border-rose-500/40 rounded-xl p-3 text-xs text-rose-200 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{aiAuditError}</span>
        </div>
      )}

      {aiAuditReport && (
        <div className="bg-[#0D1628] border border-amber-500/35 rounded-2xl p-4 text-xs text-slate-100 whitespace-pre-line leading-relaxed space-y-1.5">
          <div className="font-semibold text-amber-300 flex items-center gap-1.5">
            <Award className="w-4 h-4" />
            <span>AI Stall CFO Audit</span>
          </div>
          <div>{aiAuditReport}</div>
        </div>
      )}

      {/* 2. Capital Breakdown & Stall/Event Costs */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Clean Capital & Revenue Proportion Breakdown */}
        <section
          aria-label="Category Cost vs Revenue Summary"
          className="bg-[#111827] border border-slate-800 rounded-2xl p-4 space-y-3"
        >
          <div className="flex items-center justify-between gap-2">
            <h2 className="font-display text-sm font-bold text-white">
              Capital & Profit Breakdown
            </h2>
            <span className="text-[11px] text-slate-400 font-mono tabular-nums">
              Unsold goods remain inventory
            </span>
          </div>

          <div className="space-y-2.5">
            {stallTotals.itemRows.map((row) => {
              const costShare =
                stallTotals.totalOutlay > 0
                  ? Math.round((row.lineCost / stallTotals.totalOutlay) * 100)
                  : 0;
              const revVal = conservativeView ? row.lineRevReal : row.lineRev100;
              const profVal = conservativeView
                ? row.lineProfitReal
                : row.lineProfit100;
              return (
                <div key={row.id} className="space-y-1 text-xs">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium text-slate-200 truncate">
                      {row.name}
                    </span>
                    <span className="font-mono text-slate-400 tabular-nums shrink-0">
                      ₹{row.lineCost.toLocaleString('en-IN')} ({costShare}%) → Rev ₹
                      {revVal.toLocaleString('en-IN')} (
                      <span
                        className={
                          profVal >= 0 ? 'text-emerald-400' : 'text-rose-400'
                        }
                      >
                        {profVal >= 0 ? '+' : ''}₹
                        {profVal.toLocaleString('en-IN')}
                      </span>
                      )
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-[#090D16] rounded-full overflow-hidden">
                    <div
                      style={{ width: `${Math.min(100, Math.max(2, costShare))}%` }}
                      className={`h-full rounded-full ${
                        row.isSyncedBundle ? 'bg-amber-400' : 'bg-cyan-400'
                      }`}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Stall Rent & Other Exhibition Costs */}
        <section
          aria-label="Stall and Event Costs"
          className="bg-[#111827] border border-slate-800 rounded-2xl p-4 space-y-3"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="font-display text-sm font-bold text-white">
                Stall & Exhibition Costs
              </h2>
              <p className="text-xs text-slate-400">
                Included in total outlay & net profit (shared with Stock Overview)
              </p>
            </div>
            <button
              type="button"
              onClick={() => onAddEventCost('Display / Travel / Packaging', 500)}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#090D16] hover:bg-slate-800 border border-slate-700 text-xs font-semibold text-amber-300"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Event Cost</span>
            </button>
          </div>

          <div className="space-y-2">
            <label className="flex items-center justify-between gap-2 bg-[#090D16] border border-slate-800 rounded-xl px-3 py-2 text-xs">
              <span className="text-slate-200 font-semibold">
                Stall / Booth Rent
              </span>
              <span className="flex items-center gap-1 font-mono text-amber-300">
                ₹
                <input
                  type="number"
                  min={0}
                  aria-label="CFO stall rent"
                  value={stallFee}
                  onChange={(e) =>
                    onStallFeeChange(Math.max(0, Number(e.target.value) || 0))
                  }
                  className="w-24 bg-transparent text-right font-bold focus:outline-none tabular-nums"
                />
              </span>
            </label>

            {stallTotals.eventCostRows.map((row) => (
              <div
                key={row.id}
                className="flex items-center justify-between gap-2 bg-[#090D16] border border-slate-800 rounded-xl px-3 py-2 text-xs"
              >
                <input
                  type="text"
                  aria-label={`Event expense name for ${row.name}`}
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
                    aria-label={`Event expense cost for ${row.name}`}
                    value={row.cost}
                    onChange={(e) =>
                      onUpdateEventCost(row.id, 'cost', e.target.value)
                    }
                    className="w-20 bg-transparent text-right font-bold focus:outline-none tabular-nums"
                  />
                </span>
                <button
                  type="button"
                  aria-label={`Remove ${row.name} cost`}
                  onClick={() => onRemoveEventCost(row.id)}
                  className="text-slate-500 hover:text-rose-400 p-1 shrink-0"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* 3. Expandable Detailed Inventory Ledger & Actions */}
      <section
        aria-label="Detailed Inventory Ledger"
        className="bg-[#111827] border border-slate-800 rounded-2xl overflow-hidden"
      >
        <div className="px-4 py-3 flex flex-wrap items-center justify-between gap-2.5">
          <button
            type="button"
            aria-expanded={showDetailedLedger}
            onClick={() => setShowDetailedLedger((prev) => !prev)}
            className="flex items-center gap-2 text-left text-xs font-bold text-white hover:text-amber-300 transition-colors"
          >
            {showDetailedLedger ? (
              <ChevronUp className="w-4 h-4 text-amber-300" />
            ) : (
              <ChevronDown className="w-4 h-4 text-amber-300" />
            )}
            <span>
              Detailed Inventory Ledger ({stallTotals.itemRows.length} rows ·{' '}
              {stallTotals.totalUnits} pcs)
            </span>
          </button>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              aria-expanded={showNotesImporter}
              onClick={() => setShowNotesImporter((prev) => !prev)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#090D16] hover:bg-slate-800 text-xs font-semibold text-amber-300 border border-slate-800"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Import Notes (AI)</span>
            </button>

            <button
              type="button"
              onClick={() => {
                onAddStockItem();
                setShowDetailedLedger(true);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-white border border-slate-700"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Stock Row</span>
            </button>

            <button
              type="button"
              onClick={handleExportCsv}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#090D16] hover:bg-slate-800 text-xs font-semibold text-slate-200 border border-slate-800"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>
          </div>
        </div>

        {/* Optional AI Rough Notes Importer */}
        {showNotesImporter && (
          <div className="px-4 pb-3 border-t border-slate-800/70 pt-3 space-y-2">
            <form
              onSubmit={handleImportRawNotes}
              className="flex flex-col sm:flex-row gap-2"
            >
              <input
                type="text"
                aria-label="Paste rough stock notes to import"
                value={rawNotes}
                onChange={(e) => setRawNotes(e.target.value)}
                placeholder='e.g. "40 pearl hair clips cost 25 sell 89, 15 boho anklets cost 70 sell 249"'
                className="flex-1 bg-[#090D16] border border-slate-800 focus:border-amber-400 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none"
              />
              <button
                type="submit"
                disabled={rawParsing}
                className="px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-bold whitespace-nowrap flex items-center justify-center gap-1.5"
              >
                {rawParsing ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Plus className="w-3.5 h-3.5" />
                )}
                <span>{rawParsing ? 'Extracting...' : 'Import Notes'}</span>
              </button>
            </form>
            {rawSuccess && <div className="text-xs text-emerald-400">{rawSuccess}</div>}
            {rawError && <div className="text-xs text-rose-400">{rawError}</div>}
          </div>
        )}

        {showDetailedLedger && (
          <div className="border-t border-slate-800 p-4 space-y-3">
            {/* Mobile Cards (< md) */}
            <div className="grid grid-cols-1 gap-2.5 md:hidden">
              {stallTotals.itemRows.map((row) => (
                <div
                  key={row.id}
                  className={`rounded-xl border p-3 space-y-2.5 text-xs ${
                    row.isSyncedBundle
                      ? 'bg-amber-500/5 border-amber-500/30'
                      : 'bg-[#090D16] border-slate-800'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <input
                      type="text"
                      aria-label={`Mobile item name for ${row.name}`}
                      value={row.name}
                      disabled={row.isSyncedBundle}
                      onChange={(e) =>
                        onUpdateStockItem(row.id, 'name', e.target.value)
                      }
                      className="bg-transparent font-bold text-white flex-1 min-w-0 focus:outline-none disabled:text-amber-200"
                    />
                    {!row.isSyncedBundle && (
                      <button
                        type="button"
                        aria-label={`Remove ${row.name} on mobile`}
                        onClick={() => onRemoveStockItem(row.id)}
                        className="text-slate-500 hover:text-rose-400 p-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-3 gap-2 font-mono tabular-nums">
                    <label className="bg-slate-900 rounded-lg px-2 py-1">
                      <span className="block font-sans text-[10px] text-slate-400">
                        Cost ₹
                      </span>
                      <input
                        type="number"
                        value={row.cost}
                        disabled={row.isSyncedBundle}
                        onChange={(e) =>
                          onUpdateStockItem(row.id, 'cost', e.target.value)
                        }
                        className="w-full bg-transparent text-slate-200 font-semibold focus:outline-none"
                      />
                    </label>
                    <label className="bg-slate-900 rounded-lg px-2 py-1">
                      <span className="block font-sans text-[10px] text-slate-400">
                        Sell ₹
                      </span>
                      <input
                        type="number"
                        value={row.price}
                        disabled={row.isSyncedBundle}
                        onChange={(e) =>
                          onUpdateStockItem(row.id, 'price', e.target.value)
                        }
                        className="w-full bg-transparent text-amber-300 font-semibold focus:outline-none"
                      />
                    </label>
                    <label className="bg-slate-900 rounded-lg px-2 py-1">
                      <span className="block font-sans text-[10px] text-slate-400">
                        {row.isSyncedBundle ? 'Lots' : 'Qty'}
                      </span>
                      <input
                        type="number"
                        value={row.qty}
                        onChange={(e) =>
                          onUpdateStockItem(row.id, 'qty', e.target.value)
                        }
                        className="w-full bg-transparent text-white font-semibold focus:outline-none"
                      />
                    </label>
                  </div>

                  <div className="flex items-center justify-between gap-2 text-[11px] font-mono tabular-nums">
                    <span className="text-slate-400">
                      {conservativeView
                        ? `Est. ${row.sellThrough}% sold · Rev ₹${row.lineRevReal.toLocaleString('en-IN')}`
                        : `100% sold · Rev ₹${row.lineRev100.toLocaleString('en-IN')}`}
                    </span>
                    <span
                      className={`font-bold ${
                        (conservativeView ? row.lineProfitReal : row.lineProfit100) >= 0
                          ? 'text-emerald-400'
                          : 'text-rose-400'
                      }`}
                    >
                      {(conservativeView ? row.lineProfitReal : row.lineProfit100) >= 0 ? '+' : ''}₹
                      {(conservativeView ? row.lineProfitReal : row.lineProfit100).toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop Table (md+) */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 text-[11px] font-semibold text-slate-400">
                    <th className="py-2 px-2">Item / Category Mix</th>
                    <th className="py-2 px-2">Category</th>
                    <th className="py-2 px-2">Cost (₹)</th>
                    <th className="py-2 px-2">Sell (₹)</th>
                    <th className="py-2 px-2">Qty / Lots</th>
                    <th className="py-2 px-2">Sell-Through</th>
                    <th className="py-2 px-2 text-right">Total Cost</th>
                    <th className="py-2 px-2 text-right">{conservativeView ? 'Est. Rev' : 'Rev (100%)'}</th>
                    <th className="py-2 px-2 text-right">{conservativeView ? 'Est. Gross' : 'Gross (100%)'}</th>
                    <th className="py-2 px-2 text-right">ROI</th>
                    <th className="py-2 px-2"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-xs">
                  {stallTotals.itemRows.map((row) => (
                    <tr
                      key={row.id}
                      className={
                        row.isSyncedBundle
                          ? 'bg-amber-500/8'
                          : 'hover:bg-slate-900/60'
                      }
                    >
                      <td className="py-2 px-2">
                        <input
                          type="text"
                          aria-label={`Item name for ${row.name}`}
                          value={row.name}
                          disabled={row.isSyncedBundle}
                          onChange={(e) =>
                            onUpdateStockItem(row.id, 'name', e.target.value)
                          }
                          className="bg-transparent font-semibold text-white focus:outline-none w-full min-w-[165px] disabled:text-amber-200"
                        />
                      </td>
                      <td className="py-2 px-2">
                        <input
                          type="text"
                          aria-label={`Category for ${row.name}`}
                          value={row.category}
                          disabled={row.isSyncedBundle}
                          onChange={(e) =>
                            onUpdateStockItem(row.id, 'category', e.target.value)
                          }
                          className="bg-transparent text-slate-400 focus:outline-none w-24"
                        />
                      </td>
                      <td className="py-2 px-2">
                        <input
                          type="number"
                          aria-label={`Unit cost for ${row.name}`}
                          value={row.cost}
                          disabled={row.isSyncedBundle}
                          onChange={(e) =>
                            onUpdateStockItem(row.id, 'cost', e.target.value)
                          }
                          className="w-20 bg-[#090D16] border border-slate-800 rounded-lg px-2 py-1 font-mono font-semibold text-slate-200 tabular-nums"
                        />
                      </td>
                      <td className="py-2 px-2">
                        <input
                          type="number"
                          aria-label={`Selling price for ${row.name}`}
                          value={row.price}
                          disabled={row.isSyncedBundle}
                          onChange={(e) =>
                            onUpdateStockItem(row.id, 'price', e.target.value)
                          }
                          className="w-20 bg-[#090D16] border border-slate-800 rounded-lg px-2 py-1 font-mono font-semibold text-amber-300 tabular-nums"
                        />
                      </td>
                      <td className="py-2 px-2">
                        <input
                          type="number"
                          aria-label={`Quantity for ${row.name}`}
                          value={row.qty}
                          onChange={(e) =>
                            onUpdateStockItem(row.id, 'qty', e.target.value)
                          }
                          className="w-16 bg-[#090D16] border border-slate-800 rounded-lg px-2 py-1 font-mono font-semibold text-white tabular-nums"
                        />
                      </td>
                      <td className="py-2 px-2">
                        <div className="flex items-center gap-1.5">
                          <input
                            type="range"
                            aria-label={`Sell-through percentage for ${row.name}`}
                            min={40}
                            max={100}
                            step={5}
                            value={row.sellThrough}
                            onChange={(e) =>
                              onUpdateStockItem(
                                row.id,
                                'sellThrough',
                                e.target.value
                              )
                            }
                            className="w-16 h-1 bg-slate-800 rounded-lg accent-emerald-400 cursor-pointer"
                          />
                          <span className="font-mono text-slate-300 w-9 tabular-nums">
                            {row.sellThrough}%
                          </span>
                        </div>
                      </td>
                      <td className="py-2 px-2 text-right font-mono text-slate-300 tabular-nums">
                        ₹{row.lineCost.toLocaleString('en-IN')}
                      </td>
                      <td className="py-2 px-2 text-right font-mono text-cyan-300 tabular-nums">
                        ₹{(conservativeView ? row.lineRevReal : row.lineRev100).toLocaleString('en-IN')}
                      </td>
                      <td
                        className={`py-2 px-2 text-right font-mono font-bold tabular-nums ${
                          (conservativeView ? row.lineProfitReal : row.lineProfit100) >= 0
                            ? 'text-emerald-400'
                            : 'text-rose-400'
                        }`}
                      >
                        {(conservativeView ? row.lineProfitReal : row.lineProfit100) >= 0 ? '+' : ''}₹
                        {(conservativeView ? row.lineProfitReal : row.lineProfit100).toLocaleString('en-IN')}
                      </td>
                      <td className="py-2 px-2 text-right font-mono text-emerald-300 tabular-nums">
                        {row.lineCost > 0
                          ? Number(
                              (
                                ((conservativeView ? row.lineProfitReal : row.lineProfit100) /
                                  row.lineCost) *
                                100
                              ).toFixed(1)
                            )
                          : 0}
                        %
                      </td>
                      <td className="py-2 px-2 text-right">
                        {!row.isSyncedBundle && (
                          <button
                            type="button"
                            aria-label={`Delete ${row.name}`}
                            onClick={() => onRemoveStockItem(row.id)}
                            className="text-slate-500 hover:text-rose-400 p-1 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
