import React from 'react';
import {
  AlertCircle,
  ArrowRight,
  BrainCircuit,
  Calculator,
  Layers,
  Loader2,
  LogOut,
  RefreshCw,
} from 'lucide-react';
import type { User } from 'firebase/auth';

interface LoginScreenProps {
  user: User | null;
  isFirebaseConfigured: boolean;
  configError: string | null;
  authError: string | null;
  signingIn: boolean;
  syncingWorkspace: boolean;
  onSignInWithGoogle: () => Promise<void>;
  onContinueAsGuest: () => void;
  onRetrySync: () => Promise<void>;
  onSignOut: () => Promise<void>;
  onClearError: () => void;
}

const VALUE_POINTS = [
  {
    icon: Layers,
    title: 'Category-Wise Stock Optimizer',
    desc: 'Set separate budgets across Bangles, Jewellery, and Lifestyle stock and pick from 15 ranked mixes.',
    accent: 'text-amber-300',
  },
  {
    icon: Calculator,
    title: 'Stock Overview & Total Stall CFO',
    desc: 'Track blended investment, 90% realistic return, stall rent coverage, and break-even footfall in one view.',
    accent: 'text-emerald-400',
  },
  {
    icon: BrainCircuit,
    title: 'Private AI Coach & Memory',
    desc: 'Keeps your preferred name, pricing rules, and exhibition goals isolated to your own Google account.',
    accent: 'text-cyan-300',
  },
];

function GoogleMark() {
  return (
    <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17Z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.11-6.72-4.96H1.29v3.14C3.26 21.3 7.31 24 12 24Z"
      />
      <path
        fill="#FBBC05"
        d="M5.28 14.24c-.24-.72-.38-1.49-.38-2.24s.14-1.52.38-2.24V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.99-3.14Z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.99 3.14c.95-2.85 3.6-4.96 6.72-4.96Z"
      />
    </svg>
  );
}

export function LoginScreen({
  user,
  isFirebaseConfigured,
  configError,
  authError,
  signingIn,
  syncingWorkspace,
  onSignInWithGoogle,
  onContinueAsGuest,
  onRetrySync,
  onSignOut,
  onClearError,
}: LoginScreenProps) {
  const activeError = authError || (!isFirebaseConfigured ? configError : null);

  return (
    <div className="min-h-screen bg-[#090D16] text-slate-100 flex flex-col justify-between px-4 py-8 sm:px-8 sm:py-12 relative overflow-hidden">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-80 bg-gradient-to-b from-amber-500/5 via-slate-900/0 to-transparent"
      />

      <main className="relative z-10 w-full max-w-5xl mx-auto my-auto grid grid-cols-1 lg:grid-cols-12 lg:gap-x-12 gap-6 items-start">
        {/* Intro Header */}
        <section className="lg:col-span-7 space-y-3">
          <div className="flex items-center gap-2.5">
            <span className="font-display text-lg font-extrabold tracking-tight text-white">
              StallIQ Pro
            </span>
            <span className="h-3.5 w-px bg-slate-700" aria-hidden="true" />
            <span className="text-xs font-medium text-amber-300">
              Jewellery Stall Command Center
            </span>
          </div>

          <h1 className="font-display text-2xl sm:text-4xl font-bold tracking-tight text-white leading-[1.15]">
            Plan every category mix before you set up your stall.
          </h1>

          <p className="text-sm sm:text-[15px] text-slate-400 leading-relaxed max-w-xl">
            Built for exhibition, pop-up, and retail jewellery merchants. Organize budgets across stock categories, inspect total stall ROI, and keep your AI Coach tuned to your business.
          </p>
        </section>

        {/* Focused Sign-In / Sync Card (second on mobile so CTA is above the fold; right column on desktop) */}
        <section className="lg:col-span-5 lg:row-span-2 lg:self-center">
          <div className="bg-[#111827] border border-slate-800 rounded-2xl p-6 sm:p-7 shadow-2xl space-y-5">
            {user ? (
              <>
                <div className="space-y-1.5">
                  <h2 className="font-display text-lg font-bold text-white">
                    Restore Your Workspace
                  </h2>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Signed in as <span className="text-slate-200 font-medium">{user.email || user.displayName}</span>. Cloud sync needs attention before opening your saved workspace.
                  </p>
                </div>

                {activeError && (
                  <div
                    role="alert"
                    className="bg-rose-950/40 border border-rose-500/35 rounded-xl p-3.5 text-xs text-rose-200 flex items-start gap-2.5 leading-relaxed"
                  >
                    <AlertCircle className="w-4 h-4 text-rose-300 shrink-0 mt-0.5" />
                    <div className="flex-1 space-y-1">
                      <p>{activeError}</p>
                    </div>
                  </div>
                )}

                <div className="space-y-2.5">
                  <button
                    type="button"
                    onClick={onRetrySync}
                    disabled={syncingWorkspace}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-amber-400 hover:bg-amber-300 disabled:opacity-60 text-slate-950 text-xs sm:text-sm font-bold transition-colors"
                  >
                    {syncingWorkspace ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <RefreshCw className="w-4 h-4" />
                    )}
                    <span>{syncingWorkspace ? 'Syncing workspace...' : 'Retry Cloud Sync'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={onContinueAsGuest}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 text-xs font-semibold transition-colors"
                  >
                    <span>Open Local Workspace</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>

                  <button
                    type="button"
                    onClick={onSignOut}
                    className="w-full flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-slate-400 hover:text-rose-300 text-xs font-medium transition-colors"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Sign Out</span>
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="space-y-1.5">
                  <h2 className="font-display text-lg font-bold text-white">
                    Sign in to StallIQ Pro
                  </h2>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Your categories, product costs, selected mixes, and AI Coach memory stay private under your account.
                  </p>
                </div>

                {activeError && (
                  <div
                    role="alert"
                    className="bg-rose-950/40 border border-rose-500/35 rounded-xl p-3.5 text-xs text-rose-200 flex items-start gap-2.5 leading-relaxed"
                  >
                    <AlertCircle className="w-4 h-4 text-rose-300 shrink-0 mt-0.5" />
                    <div className="flex-1 space-y-1.5">
                      <p>{activeError}</p>
                      {authError && (
                        <button
                          type="button"
                          onClick={onClearError}
                          className="text-[11px] font-semibold text-rose-300 hover:text-white underline"
                        >
                          Dismiss
                        </button>
                      )}
                    </div>
                  </div>
                )}

                <div className="space-y-3">
                  <button
                    type="button"
                    onClick={onSignInWithGoogle}
                    disabled={signingIn || !isFirebaseConfigured}
                    className="w-full flex items-center justify-center gap-2.5 px-4 py-3 rounded-xl bg-white hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed text-slate-900 text-sm font-semibold shadow-sm transition-colors focus-visible:outline-2 focus-visible:outline-amber-400"
                  >
                    {signingIn ? (
                      <Loader2 className="w-4 h-4 animate-spin text-slate-700" />
                    ) : (
                      <GoogleMark />
                    )}
                    <span>{signingIn ? 'Signing in with Google...' : 'Continue with Google'}</span>
                  </button>

                  <div className="flex items-center gap-3 text-[11px] text-slate-500">
                    <span className="h-px flex-1 bg-slate-800" />
                    <span>or</span>
                    <span className="h-px flex-1 bg-slate-800" />
                  </div>

                  <button
                    type="button"
                    onClick={onContinueAsGuest}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#090D16] hover:bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-200 text-xs font-semibold transition-colors"
                  >
                    <span>Continue without signing in</span>
                    <ArrowRight className="w-3.5 h-3.5 text-amber-300" />
                  </button>
                </div>

                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Local preview lets you test planners without saving. Sign in anytime from the header to sync your workspace and private AI memory.
                </p>
              </>
            )}
          </div>
        </section>

        {/* Value Highlights (under intro on desktop, below Sign-In card on mobile) */}
        <section aria-label="Key Capabilities" className="lg:col-span-7">
          <div className="divide-y divide-slate-800/80 border-y border-slate-800/80">
            {VALUE_POINTS.map((point) => {
              const Icon = point.icon;
              return (
                <div key={point.title} className="py-3.5 flex items-start gap-3.5">
                  <div className="w-8 h-8 rounded-lg bg-[#111827] border border-slate-800 flex items-center justify-center shrink-0 mt-0.5">
                    <Icon className={`w-4 h-4 ${point.accent}`} />
                  </div>
                  <div className="space-y-0.5">
                    <h2 className="text-xs sm:text-sm font-semibold text-slate-100">
                      {point.title}
                    </h2>
                    <p className="text-xs text-slate-400 leading-relaxed">{point.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </main>

      <footer className="relative z-10 max-w-5xl w-full mx-auto pt-6 text-[11px] text-slate-500 flex flex-wrap items-center justify-between gap-2">
        <span>Private per-account workspace & AI memory isolation</span>
        <span>All amounts in INR (₹)</span>
      </footer>
    </div>
  );
}
