import React from 'react';
import {
  BrainCircuit,
  Calculator,
  LayoutGrid,
  Layers,
  Lightbulb,
  LogIn,
  Mic,
  RotateCcw,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { SALE_SCALE_PRESETS } from '../data/defaults';
import type { AppTab, SaleScalePreset } from '../types/stall';

interface HeaderProps {
  activeTab: AppTab;
  onTabChange: (tab: AppTab) => void;
  eventName: string;
  onEventNameChange: (val: string) => void;
  expectedFootfall: number;
  onExpectedFootfallChange: (val: number) => void;
  onApplyScalePreset: (preset: SaleScalePreset) => void;
  budgetCap: number;
  stallFee: number;
  onStallFeeChange: (val: number) => void;
  totalAllocatedBudget: number;
  totalCategoriesCount: number;
  onResetAll: () => void;
  onOpenVoiceCoach: () => void;
  onOpenAccountDrawer: () => void;
}

const NAV_TABS: Array<{
  id: AppTab;
  label: string;
  mobileLabel: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  { id: 'optimizer', label: 'Category Mix', mobileLabel: 'Categories', icon: Layers },
  { id: 'calculator', label: 'Total Stall CFO', mobileLabel: 'Stall CFO', icon: Calculator },
  { id: 'strategies', label: 'Playbook', mobileLabel: 'Playbook', icon: Lightbulb },
  { id: 'overview', label: 'Stock Overview', mobileLabel: 'Overview', icon: LayoutGrid },
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
  stallFee,
  onStallFeeChange,
  totalAllocatedBudget,
  totalCategoriesCount,
  onResetAll,
  onOpenVoiceCoach,
  onOpenAccountDrawer,
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

          {/* Zone 3: Account + Voice Coach Action Group */}
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
                <span className="hidden sm:inline">
                  {signingIn ? 'Signing in...' : 'Google Sign-In'}
                </span>
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

          {/* Zone 2: 4 Concise Single-Line Navigation Tabs */}
          <nav
            aria-label="Primary Workspace"
            className="order-3 sm:order-2 w-full sm:w-auto flex items-center justify-between sm:justify-center gap-1 sm:gap-1.5 pt-1 sm:pt-0 border-t sm:border-t-0 border-slate-800/60"
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

      {/* Clean Minimal Context Bar */}
      <div className="border-b border-slate-800/60 bg-[#0D1320] px-4 lg:px-8 py-2">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <select
              aria-label="Select Sale Scale Preset"
              value={matchedPreset ? matchedPreset.id : 'custom'}
              onChange={(e) => {
                const found = SALE_SCALE_PRESETS.find(
                  (p) => p.id === e.target.value
                );
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
              placeholder="Event Name"
              className="w-36 sm:w-44 bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-100 focus:outline-none focus:border-amber-400"
            />

            <label className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5">
              <span className="text-slate-400">Crowd</span>
              <input
                type="number"
                aria-label="Expected Footfall"
                value={expectedFootfall}
                onChange={(e) =>
                  onExpectedFootfallChange(
                    Math.max(50, Number(e.target.value) || 0)
                  )
                }
                className="w-16 bg-transparent font-mono font-semibold text-cyan-300 tabular-nums focus:outline-none"
              />
            </label>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 bg-slate-900/90 border border-slate-800 rounded-lg px-2.5 py-1.5 font-mono tabular-nums">
              <span className="text-slate-400 font-sans">
                {totalCategoriesCount} Categories
              </span>
              <span className="text-slate-600">·</span>
              <span className="text-amber-300 font-semibold">
                ₹{totalAllocatedBudget.toLocaleString('en-IN')} Total Budget
              </span>
            </div>

            <label className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5">
              <span className="text-slate-400">Stall Fee</span>
              <span className="text-rose-300 font-mono">₹</span>
              <input
                type="number"
                aria-label="Exhibition Stall Fee"
                value={stallFee}
                onChange={(e) =>
                  onStallFeeChange(Math.max(0, Number(e.target.value) || 0))
                }
                className="w-20 bg-transparent font-mono font-semibold text-rose-300 tabular-nums focus:outline-none"
              />
            </label>

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
      </div>
    </>
  );
}
