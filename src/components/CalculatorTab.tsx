import React, { useState } from 'react';
import {
  AlertCircle,
  Award,
  Download,
  FileSpreadsheet,
  Loader2,
  Plus,
  Sparkles,
  Trash2,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { BangleCombo, StallStockItem, StallTotals } from '../types/stall';

interface CalculatorTabProps {
  eventName: string;
  expectedFootfall: number;
  activeCombo: BangleCombo | null;
  stallTotals: StallTotals;
  stallFee: number;
  globalSellThrough: number;
  onApplyGlobalSellThrough: (pct: number) => void;
  onUpdateStockItem: (id: string, field: keyof StallStockItem, val: string) => void;
  onAddStockItem: () => void;
  onAddParsedStockItems: (items: StallStockItem[]) => void;
  onRemoveStockItem: (id: string) => void;
  aiAuditLoading: boolean;
  aiAuditReport: string | null;
  aiAuditError: string | null;
  onRunAiCfoAudit: () => void;
}

export function CalculatorTab({
  eventName,
  expectedFootfall,
  activeCombo,
  stallTotals,
  stallFee,
  globalSellThrough,
  onApplyGlobalSellThrough,
  onUpdateStockItem,
  onAddStockItem,
  onAddParsedStockItems,
  onRemoveStockItem,
  aiAuditLoading,
  aiAuditReport,
  aiAuditError,
  onRunAiCfoAudit,
}: CalculatorTabProps) {
  const [rawNotes, setRawNotes] = useState('');
  const [rawParsing, setRawParsing] = useState(false);
  const [rawError, setRawError] = useState<string | null>(null);
  const [rawSuccess, setRawSuccess] = useState<string | null>(null);

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
          item: { name: string; category: string; cost: number; price: number; qty: number; sellThrough: number },
          idx: number
        ) => ({
          id: `raw_${Date.now()}_${idx}`,
          name: item.name || 'Imported Item',
          category: item.category || 'Accessories',
          cost: Math.max(0, Number(item.cost) || 0),
          price: Math.max(0, Number(item.price) || 0),
          qty: Math.max(1, Number(item.qty) || 1),
          sellThrough: Math.min(100, Math.max(10, Number(item.sellThrough) || globalSellThrough)),
          isSyncedBundle: false,
        })
      );

      if (items.length === 0) {
        setRawError('No inventory items detected. Try including item name, cost, sell price, and quantity.');
      } else {
        onAddParsedStockItems(items);
        setRawSuccess(`Imported ${items.length} item(s) into your stall stock ledger.`);
        setRawNotes('');
      }
    } catch (err) {
      setRawError(err instanceof Error ? err.message : 'Failed to parse rough stock notes.');
    } finally {
      setRawParsing(false);
    }
  };

  const handleExportCsv = () => {
    const header = [
      'Item',
      'Category',
      'Unit Cost (INR)',
      'Sell Price (INR)',
      'Qty',
      'Sell-Through %',
      'Total Cost',
      'Realistic Revenue',
      'Realistic Profit',
      'ROI %',
    ];
    const rows = stallTotals.itemRows.map((r) => [
      `"${r.name.replace(/"/g, '""')}"`,
      `"${r.category}"`,
      r.cost,
      r.price,
      r.qty,
      r.sellThrough,
      r.lineCost,
      r.lineRevReal,
      r.lineProfitReal,
      r.roiPct,
    ]);
    const csv = [header.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const slug = (eventName || 'stalliq-stock').toLowerCase().replace(/[^a-z0-9]+/g, '-');
    a.download = `${slug}-stock.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-5">
      {/* 4 Core CFO KPI Cards */}
      <section aria-label="Master CFO Summary" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="bg-[#111827] border border-slate-800 rounded-2xl p-4">
          <div className="text-xs text-slate-400">1. Total Capital Outlay</div>
          <div className="text-3xl font-mono font-bold text-white tabular-nums mt-1">
            ₹{stallTotals.totalOutlay.toLocaleString('en-IN')}
          </div>
          <div className="text-xs text-slate-400 font-mono tabular-nums mt-1.5">
            ₹{stallTotals.totalCost.toLocaleString('en-IN')} Stock + ₹{stallFee.toLocaleString('en-IN')} Stall Rent
          </div>
        </div>

        <div className="bg-[#111827] border border-slate-800 rounded-2xl p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400">2. Projected Gross Revenue</span>
            <span className="text-xs font-mono font-semibold text-cyan-300 tabular-nums">
              {globalSellThrough}% Sold
            </span>
          </div>
          <div className="text-3xl font-mono font-bold text-cyan-300 tabular-nums mt-1">
            ₹{stallTotals.revRealistic.toLocaleString('en-IN')}
          </div>
          <div className="flex items-center gap-2 mt-2">
            <input
              type="range"
              aria-label="Global sell-through percentage"
              min={50}
              max={100}
              step={5}
              value={globalSellThrough}
              onChange={(e) => onApplyGlobalSellThrough(Number(e.target.value))}
              className="w-24 h-1.5 bg-slate-800 rounded-lg accent-cyan-400 cursor-pointer"
            />
            <span className="text-[11px] font-mono text-slate-400 tabular-nums">
              100%: ₹{stallTotals.rev100.toLocaleString('en-IN')}
            </span>
          </div>
        </div>

        <div className="bg-[#111827] border border-emerald-500/45 rounded-2xl p-4">
          <div className="text-xs text-emerald-400">3. Net Take-Home Profit</div>
          <div
            className={`text-3xl font-mono font-bold tabular-nums mt-1 ${
              stallTotals.netAfterStallReal >= 0 ? 'text-emerald-400' : 'text-rose-400'
            }`}
          >
            {stallTotals.netAfterStallReal >= 0 ? '+' : ''}₹{stallTotals.netAfterStallReal.toLocaleString('en-IN')}
          </div>
          <div className="text-xs text-slate-300 mt-1.5">
            Pure cash left after Stock & Stall Fee paid
          </div>
        </div>

        <div className="bg-[#111827] border border-amber-500/40 rounded-2xl p-4">
          <div className="text-xs text-amber-300">4. Break-Even & Crowd Target</div>
          <div className="text-3xl font-mono font-bold text-white tabular-nums mt-1">
            {stallTotals.unitsToBreakEven}{' '}
            <span className="text-sm font-normal text-slate-400">/ {stallTotals.totalUnits} pcs</span>
          </div>
          <div className="text-xs text-emerald-400 font-semibold tabular-nums mt-1.5">
            Needs {stallTotals.footfallConversionNeeded}% of {expectedFootfall.toLocaleString('en-IN')} Footfall
          </div>
        </div>
      </section>

      {/* Secondary Helpful CFO Indicators Strip */}
      <section
        aria-label="Additional Financial Ratios"
        className="grid grid-cols-2 lg:grid-cols-4 gap-3 bg-[#0D1320] border border-slate-800/80 rounded-2xl p-3.5"
      >
        <div>
          <div className="text-[11px] text-slate-400">Blended Gross Margin</div>
          <div className="text-base font-mono font-bold text-white tabular-nums">{stallTotals.blendedMarginPct}%</div>
        </div>
        <div>
          <div className="text-[11px] text-slate-400">Capital Return Multiple</div>
          <div className="text-base font-mono font-bold text-amber-300 tabular-nums">{stallTotals.capitalMultiple}x</div>
        </div>
        <div>
          <div className="text-[11px] text-slate-400">Stall Rent Burden</div>
          <div className="text-base font-mono font-bold text-slate-100 tabular-nums">
            {stallTotals.rentBurdenPct}% of Gross Profit
          </div>
        </div>
        <div>
          <div className="text-[11px] text-slate-400">Top ROI Driver</div>
          <div className="text-sm font-semibold text-emerald-400 truncate tabular-nums">
            {stallTotals.topRoiItemName} · {stallTotals.topRoiPct}% ROI
          </div>
        </div>
      </section>

      {/* AI Raw Supplier Bill / Rough Stock Importer */}
      <section className="bg-[#111827] border border-slate-800 rounded-2xl p-4 space-y-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-xs font-semibold text-amber-300 flex items-center gap-1.5">
            <FileSpreadsheet className="w-4 h-4" />
            <span>Convert Rough Supplier Notes into Stock Rows</span>
          </h2>
          <span className="text-[11px] text-slate-400">
            Paste WhatsApp quotes or messy lists — AI extracts Cost, Sell Price & Qty
          </span>
        </div>

        <form onSubmit={handleImportRawNotes} className="flex flex-col sm:flex-row gap-2.5">
          <input
            type="text"
            aria-label="Paste rough stock notes to import"
            value={rawNotes}
            onChange={(e) => setRawNotes(e.target.value)}
            placeholder='e.g. "40 pearl hair clips cost 25 sell 89, 15 boho anklets cost 70 sell 249, 20 nose rings cost 20 sell 79"'
            className="flex-1 bg-[#090D16] border border-slate-800 focus:border-amber-400 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none"
          />
          <button
            type="submit"
            disabled={rawParsing}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 text-xs font-semibold whitespace-nowrap shrink-0 flex items-center justify-center gap-1.5"
          >
            {rawParsing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
            <span>{rawParsing ? 'Extracting...' : 'Import Notes'}</span>
          </button>
        </form>

        {rawSuccess && <div className="text-xs text-emerald-400">{rawSuccess}</div>}
        {rawError && <div className="text-xs text-rose-400">{rawError}</div>}
      </section>

      {/* Full Inventory Ledger Table + Deep Thinking CFO Audit */}
      <section className="bg-[#111827] border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-sm font-bold text-white">
              Total Stall Stock Ledger {activeCombo ? `· Synced with Bangle Mix ${activeCombo.label}` : ''}
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Adjust unit cost, selling price, quantity, and realistic sell-through % per line item.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleExportCsv}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#090D16] hover:bg-slate-800 text-xs font-semibold text-slate-200 border border-slate-800"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>

            <button
              type="button"
              onClick={onAddStockItem}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-white border border-slate-700"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Stock Row</span>
            </button>

            <button
              type="button"
              onClick={onRunAiCfoAudit}
              disabled={aiAuditLoading}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 disabled:opacity-60 text-slate-950 font-bold text-xs transition-colors"
            >
              {aiAuditLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
              <span>{aiAuditLoading ? 'Thinking Deeply...' : 'Deep CFO Audit'}</span>
            </button>
          </div>
        </div>

        {aiAuditError && (
          <div className="bg-rose-950/40 border border-rose-500/40 rounded-xl p-3 text-xs text-rose-200 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{aiAuditError}</span>
          </div>
        )}

        {aiAuditReport && (
          <div className="bg-[#0D1628] border border-amber-500/35 rounded-xl p-4 text-xs text-slate-100 whitespace-pre-line leading-relaxed space-y-1.5">
            <div className="font-semibold text-amber-300 flex items-center gap-1.5">
              <Award className="w-4 h-4" />
              <span>AI Stall CFO Audit</span>
            </div>
            <div>{aiAuditReport}</div>
          </div>
        )}

        {/* Data Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-[11px] font-semibold text-slate-400">
                <th className="py-2.5 px-2">Item</th>
                <th className="py-2.5 px-2">Category</th>
                <th className="py-2.5 px-2">Cost (₹)</th>
                <th className="py-2.5 px-2">Sell (₹)</th>
                <th className="py-2.5 px-2">Qty</th>
                <th className="py-2.5 px-2">Sell-Through</th>
                <th className="py-2.5 px-2 text-right">Total Cost</th>
                <th className="py-2.5 px-2 text-right">Real. Rev</th>
                <th className="py-2.5 px-2 text-right">Real. Profit</th>
                <th className="py-2.5 px-2 text-right">ROI</th>
                <th className="py-2.5 px-2"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-xs">
              {stallTotals.itemRows.map((row) => (
                <tr
                  key={row.id}
                  className={row.isSyncedBundle ? 'bg-amber-500/8' : 'hover:bg-slate-900/60'}
                >
                  <td className="py-2 px-2">
                    <input
                      type="text"
                      aria-label={`Item name for ${row.name}`}
                      value={row.name}
                      disabled={row.isSyncedBundle}
                      onChange={(e) => onUpdateStockItem(row.id, 'name', e.target.value)}
                      className="bg-transparent font-semibold text-white focus:outline-none w-full min-w-[165px] disabled:text-amber-200"
                    />
                  </td>
                  <td className="py-2 px-2">
                    <input
                      type="text"
                      aria-label={`Category for ${row.name}`}
                      value={row.category}
                      disabled={row.isSyncedBundle}
                      onChange={(e) => onUpdateStockItem(row.id, 'category', e.target.value)}
                      className="bg-transparent text-slate-400 focus:outline-none w-24"
                    />
                  </td>
                  <td className="py-2 px-2">
                    <input
                      type="number"
                      aria-label={`Unit cost for ${row.name}`}
                      value={row.cost}
                      disabled={row.isSyncedBundle}
                      onChange={(e) => onUpdateStockItem(row.id, 'cost', e.target.value)}
                      className="w-20 bg-[#090D16] border border-slate-800 rounded-lg px-2 py-1 font-mono font-semibold text-slate-200 tabular-nums"
                    />
                  </td>
                  <td className="py-2 px-2">
                    <input
                      type="number"
                      aria-label={`Selling price for ${row.name}`}
                      value={row.price}
                      disabled={row.isSyncedBundle}
                      onChange={(e) => onUpdateStockItem(row.id, 'price', e.target.value)}
                      className="w-20 bg-[#090D16] border border-slate-800 rounded-lg px-2 py-1 font-mono font-semibold text-amber-300 tabular-nums"
                    />
                  </td>
                  <td className="py-2 px-2">
                    <input
                      type="number"
                      aria-label={`Quantity for ${row.name}`}
                      value={row.qty}
                      onChange={(e) => onUpdateStockItem(row.id, 'qty', e.target.value)}
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
                        onChange={(e) => onUpdateStockItem(row.id, 'sellThrough', e.target.value)}
                        className="w-16 h-1 bg-slate-800 rounded-lg accent-emerald-400 cursor-pointer"
                      />
                      <span className="font-mono text-slate-300 w-9 tabular-nums">{row.sellThrough}%</span>
                    </div>
                  </td>
                  <td className="py-2 px-2 text-right font-mono text-slate-300 tabular-nums">
                    ₹{row.lineCost.toLocaleString('en-IN')}
                  </td>
                  <td className="py-2 px-2 text-right font-mono text-cyan-300 tabular-nums">
                    ₹{row.lineRevReal.toLocaleString('en-IN')}
                  </td>
                  <td
                    className={`py-2 px-2 text-right font-mono font-bold tabular-nums ${
                      row.lineProfitReal >= 0 ? 'text-emerald-400' : 'text-rose-400'
                    }`}
                  >
                    {row.lineProfitReal >= 0 ? '+' : ''}₹{row.lineProfitReal.toLocaleString('en-IN')}
                  </td>
                  <td className="py-2 px-2 text-right font-mono text-emerald-300 tabular-nums">
                    {row.roiPct}%
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
      </section>

      {/* Category Cost vs Realistic Revenue Chart */}
      <section className="bg-[#111827] border border-slate-800 rounded-2xl p-4">
        <h2 className="text-xs font-semibold text-slate-300 mb-3">
          Category Cost vs. Realistic Revenue Breakdown
        </h2>
        <div className="h-56 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={stallTotals.itemRows}>
              <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} tickLine={false} />
              <YAxis stroke="#64748b" fontSize={11} tickLine={false} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#090D16',
                  borderColor: '#334155',
                  borderRadius: '12px',
                  fontSize: '12px',
                }}
              />
              <Bar dataKey="lineCost" name="Wholesale Cost (₹)" fill="#f43f5e" radius={[5, 5, 0, 0]} />
              <Bar dataKey="lineRevReal" name="Realistic Revenue (₹)" fill="#10b981" radius={[5, 5, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>
    </div>
  );
}
