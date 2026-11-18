import React from 'react';
import {
  BrainCircuit,
  Calculator,
  ChevronDown,
  ChevronUp,
  Layers,
  Lightbulb,
  LogIn,
  Mic,
  Plus,
  RotateCcw,
  SlidersHorizontal,
  Star,
  Trash2,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { SALE_SCALE_PRESETS } from '../data/defaults';
import type { AppTab, BangleCategory, SaleScalePreset } from '../types/stall';

interface HeaderProps {
  activeTab: AppTab;
  onTabChange: (tab: AppTab) => void;
  eventName: string;
  onEventNameChange: (val: string) => void;
  expectedFootfall: number;
  onExpectedFootfallChange: (val: number) => void;
  onApplyScalePreset: (preset: SaleScalePreset) => void;
  budgetCap: number;
  onBudgetCapChange: (val: number) => void;
  minProfitFloor: number;
  onMinProfitFloorChange: (val: number) => void;
  stallFee: number;
  onStallFeeChange: (val: number) => void;
  showItemEditor: boolean;
  onToggleItemEditor: () => void;
  onResetAll: () => void;
  onOpenVoiceCoach: () => void;
  onOpenAccountDrawer: () => void;
  categories: BangleCategory[];
  onUpdateCat: (id: string, field: 'name' | 'cost' | 'price' | 'beauty', val: string) => void;
  onAddCat: () => void;
  onRemoveCat: (id: string) => void;
}

const NAV_TABS: Array<{
  id: AppTab;
  label: string;
  mobileLabel: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  { id: 'optimizer', label: 'Bangle Mix', mobileLabel: 'Bangles', icon: Layers },
  { id: 'calculator', label: 'Total Stall CFO', mobileLabel: 'Total Stall', icon: Calculator },
  { id: 'strategies', label: 'Playbook & Visuals', mobileLabel: 'Playbook', icon: Lightbulb },
];

export function Header({
  activeTab,
  onTabChange,
  eventName,
  onEventNameChange,
  expectedFootfall,
  onExpectedFootfallChange,
  onApplyScalePreset,
  budgetCap,
  onBudgetCapChange,
  minProfitFloor,
  onMinProfitFloorChange,
  stallFee,
  onStallFeeChange,
  showItemEditor,
  onToggleItemEditor,
  onResetAll,
  onOpenVoiceCoach,
  onOpenAccountDrawer,
  categories,
  onUpdateCat,
  onAddCat,
  onRemoveCat,
}: HeaderProps) {
  const { user, profile, memories, signingIn, signInWithGoogle } = useAuth();

  const matchedPreset = SALE_SCALE_PRESETS.find(
    (p) =>
      p.budgetCap === budgetCap &&
      p.stallFee === stallFee &&
      p.expectedFootfall === expectedFootfall
  );

  return (
    <>
      {/* 3-Zone Top Bar Contract */}
      <header className="sticky top-0 z-30 backdrop-blur-xl bg-[#090D16]/95 border-b border-slate-800/80 px-4 lg:px-8 py-2.5">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2.5 sm:gap-8">
          {/* Zone 1: Single-line Brand Wordmark */}
          <a
            href="#top"
            onClick={(e) => {
              e.preventDefault();
              onTabChange('optimizer');
            }}
            className="font-display text-lg font-extrabold tracking-tight text-white whitespace-nowrap shrink-0"
          >
            StallIQ Pro
          </a>

          {/* Zone 3 (mobile right): Account + Voice Coach Action Group */}
          <div className="sm:order-3 flex items-center gap-2 shrink-0">
            {user && profile ? (
              <button
                type="button"
                onClick={onOpenAccountDrawer}
                aria-label="Open Account and AI Memory"
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-semibold text-slate-200 whitespace-nowrap shrink-0 transition-colors focus-visible:outline-2 focus-visible:outline-amber-400"
              >
                {profile.photoURL ? (
                  <img
                    src={profile.photoURL}
                    alt={profile.displayName}
                    referrerPolicy="no-referrer"
                    className="w-4 h-4 rounded-full object-cover"
                  />
                ) : (
                  <BrainCircuit className="w-3.5 h-3.5 text-amber-300" />
                )}
                <span className="hidden sm:inline max-w-[96px] truncate">
                  {profile.businessName || profile.displayName.split(' ')[0]}
                </span>
                <span className="font-mono text-[10px] text-amber-300">
                  {memories.length}
                </span>
              </button>
            ) : (
              <button
                type="button"
                onClick={signInWithGoogle}
                disabled={signingIn}
                aria-label="Sign in with Google"
                className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-semibold text-slate-200 whitespace-nowrap shrink-0 transition-colors disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-amber-400"
              >
                <LogIn className="w-3.5 h-3.5 text-amber-300" />
                <span className="hidden sm:inline">{signingIn ? 'Signing in...' : 'Google Sign-In'}</span>
                <span className="sm:hidden">{signingIn ? '...' : 'Sign In'}</span>
              </button>
            )}

            <button
              type="button"
              onClick={onOpenVoiceCoach}
              className="flex items-center gap-1.5 px-3 sm:px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 text-xs font-semibold whitespace-nowrap shrink-0 transition-colors focus-visible:outline-2 focus-visible:outline-amber-400"
            >
              <Mic className="w-3.5 h-3.5" />
              <span>Voice Coach</span>
            </button>
          </div>

          {/* Zone 2: Concise single-line navigation tabs (full-width row on mobile, centered on desktop) */}
          <nav
            aria-label="Primary Workspace"
            className="order-3 sm:order-2 w-full sm:w-auto flex items-center justify-between sm:justify-center gap-1 sm:gap-2 pt-1 sm:pt-0 border-t sm:border-t-0 border-slate-800/60"
          >
            {NAV_TABS.map((t) => {
              const Icon = t.icon;
              const active = activeTab === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => onTabChange(t.id)}
                  className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap shrink-0 transition-colors focus-visible:outline-2 focus-visible:outline-amber-400 ${
                    active
                      ? 'bg-amber-400 text-slate-950'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/70'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5 shrink-0" />
                  <span className="sm:hidden">{t.mobileLabel}</span>
                  <span className="hidden sm:inline">{t.label}</span>
                </button>
              );
            })}
          </nav>
        </div>
      </header>

      {/* Workspace Context & Global Knobs Toolbar */}
      <div className="border-b border-slate-800/60 bg-[#0D1320] px-4 lg:px-8 py-2.5">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <select
              aria-label="Select Sale Scale Preset"
              value={matchedPreset ? matchedPreset.id : 'custom'}
              onChange={(e) => {
                const found = SALE_SCALE_PRESETS.find((p) => p.id === e.target.value);
                if (found) onApplyScalePreset(found);
              }}
              className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-amber-300 focus:outline-none focus:border-amber-400"
            >
              {SALE_SCALE_PRESETS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
              {!matchedPreset && <option value="custom">Custom Scale</option>}
            </select>

            <input
              type="text"
              aria-label="Event or Venue Name"
              value={eventName}
              onChange={(e) => onEventNameChange(e.target.value)}
              placeholder="Event or Market Name"
              className="w-36 sm:w-44 bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-100 focus:outline-none focus:border-amber-400"
            />

            <label className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs">
              <span className="text-slate-400">Crowd</span>
              <input
                type="number"
                aria-label="Expected Footfall"
                value={expectedFootfall}
                onChange={(e) => onExpectedFootfallChange(Math.max(50, Number(e.target.value) || 0))}
                className="w-16 bg-transparent font-mono font-semibold text-cyan-300 tabular-nums focus:outline-none"
              />
            </label>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <label className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs">
              <span className="text-slate-400">Budget</span>
              <span className="text-amber-300 font-mono">₹</span>
              <input
                type="number"
                aria-label="Wholesale Budget Cap"
                value={budgetCap}
                onChange={(e) => onBudgetCapChange(Math.max(200, Number(e.target.value) || 0))}
                className="w-20 bg-transparent font-mono font-semibold text-amber-300 tabular-nums focus:outline-none"
              />
            </label>

            <label className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs">
              <span className="text-slate-400">Min Profit</span>
              <span className="text-emerald-400 font-mono">₹</span>
              <input
                type="number"
                aria-label="Minimum Profit Floor"
                value={minProfitFloor}
                onChange={(e) => onMinProfitFloorChange(Math.max(50, Number(e.target.value) || 0))}
                className="w-20 bg-transparent font-mono font-semibold text-emerald-400 tabular-nums focus:outline-none"
              />
            </label>

            <label className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs">
              <span className="text-slate-400">Stall Fee</span>
              <span className="text-rose-300 font-mono">₹</span>
              <input
                type="number"
                aria-label="Exhibition Stall Fee"
                value={stallFee}
                onChange={(e) => onStallFeeChange(Math.max(0, Number(e.target.value) || 0))}
                className="w-20 bg-transparent font-mono font-semibold text-rose-300 tabular-nums focus:outline-none"
              />
            </label>

            <button
              type="button"
              aria-expanded={showItemEditor}
              onClick={onToggleItemEditor}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border whitespace-nowrap shrink-0 transition-colors ${
                showItemEditor
                  ? 'bg-amber-400 text-slate-950 border-amber-400'
                  : 'bg-slate-900 text-slate-200 border-slate-700 hover:border-slate-600'
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>Prices & Beauty</span>
              {showItemEditor ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>

            <button
              type="button"
              onClick={onResetAll}
              aria-label="Reset all settings to defaults"
              title="Reset to Defaults"
              className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Collapsible Prices & Beauty Score Editor */}
        {showItemEditor && (
          <div className="max-w-7xl mx-auto mt-3 pt-3 border-t border-slate-800/80">
            <div className="flex items-center justify-between mb-3">
              <div className="text-xs font-semibold text-slate-200">
                Item Categories · Wholesale Cost, Selling Price & Beauty Score (1–10)
              </div>
              <button
                type="button"
                onClick={onAddCat}
                className="flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-lg bg-amber-500/15 text-amber-300 border border-amber-500/35 hover:bg-amber-500/25 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Category</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-2.5">
              {categories.map((cat) => {
                const profitPerUnit = cat.price - cat.cost;
                return (
                  <div
                    key={cat.id}
                    className="bg-[#111827] border border-slate-800 rounded-xl p-3 space-y-2.5"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: cat.barColor }}
                          aria-hidden="true"
                        />
                        <input
                          type="text"
                          aria-label={`Category name for ${cat.name}`}
                          value={cat.name}
                          onChange={(e) => onUpdateCat(cat.id, 'name', e.target.value)}
                          className="bg-transparent text-xs font-semibold text-white w-full truncate focus:outline-none focus:text-amber-300"
                        />
                      </div>
                      {categories.length > 2 && (
                        <button
                          type="button"
                          onClick={() => onRemoveCat(cat.id)}
                          aria-label={`Remove ${cat.name}`}
                          className="text-slate-500 hover:text-rose-400 p-0.5 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <label className="bg-slate-950/90 border border-slate-800/80 rounded-lg px-2 py-1.5">
                        <span className="block text-[10px] text-slate-400">Cost ₹</span>
                        <input
                          type="number"
                          aria-label={`${cat.name} wholesale cost`}
                          value={cat.cost}
                          onChange={(e) => onUpdateCat(cat.id, 'cost', e.target.value)}
                          className="w-full bg-transparent font-mono font-semibold text-slate-100 tabular-nums focus:outline-none"
                        />
                      </label>
                      <label className="bg-slate-950/90 border border-slate-800/80 rounded-lg px-2 py-1.5">
                        <span className="block text-[10px] text-slate-400">Sell ₹</span>
                        <input
                          type="number"
                          aria-label={`${cat.name} selling price`}
                          value={cat.price}
                          onChange={(e) => onUpdateCat(cat.id, 'price', e.target.value)}
                          className="w-full bg-transparent font-mono font-semibold text-amber-300 tabular-nums focus:outline-none"
                        />
                      </label>
                    </div>

                    <div className="flex items-center justify-between gap-2 text-xs pt-0.5">
                      <span className="text-amber-300 font-mono font-semibold tabular-nums flex items-center gap-1">
                        <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                        {cat.beauty}
                      </span>
                      <input
                        type="range"
                        aria-label={`${cat.name} beauty score`}
                        min={1}
                        max={10}
                        step={0.5}
                        value={cat.beauty}
                        onChange={(e) => onUpdateCat(cat.id, 'beauty', e.target.value)}
                        className="w-20 h-1.5 bg-slate-800 rounded-lg accent-amber-400 cursor-pointer"
                      />
                      <span className="text-[11px] font-mono text-emerald-400 tabular-nums">
                        +₹{profitPerUnit}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
