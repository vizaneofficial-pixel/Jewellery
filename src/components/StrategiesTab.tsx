import React, { useState } from 'react';
import {
  AlertCircle,
  ArrowRight,
  ExternalLink,
  Image as ImageIcon,
  Loader2,
  Play,
  Search,
  Sparkles,
  Wand2,
  Youtube,
} from 'lucide-react';
import { CURATED_VIDEOS, PLAYBOOK_CARDS, STALL_ZONES } from '../data/defaults';
import type { AccountAiContext, GroundedSource, ZoneId } from '../types/stall';

interface StrategiesTabProps {
  eventName: string;
  expectedFootfall: number;
  activeMixSummary: string;
  stallFee: number;
  accountContext?: AccountAiContext;
}

const ZONE_BUTTONS: Array<{ id: ZoneId; label: string }> = [
  { id: 'front_left', label: 'Zone 1 · Front-Left Cones' },
  { id: 'center_tray', label: 'Zone 2 · Center Impulse Tray' },
  { id: 'right_mirror', label: 'Zone 3 · Right Mirror Station' },
  { id: 'back_riser', label: 'Zone 4 · Back Vertical Riser' },
];

export function StrategiesTab({
  eventName,
  expectedFootfall,
  activeMixSummary,
  stallFee,
  accountContext,
}: StrategiesTabProps) {
  const [selectedZone, setSelectedZone] = useState<ZoneId>('front_left');

  // AI Sales & Pitch Strategist (gemini-4-hydrogen)
  const [strategyPrompt, setStrategyPrompt] = useState('');
  const [strategyResponse, setStrategyResponse] = useState<string | null>(null);
  const [strategyError, setStrategyError] = useState<string | null>(null);
  const [strategyLoading, setStrategyLoading] = useState(false);

  // Google Search Grounded Strategy & Video Finder (gemini-4-hydrogen + googleSearch)
  const [searchQuery, setSearchQuery] = useState('Indian jewellery pop-up exhibition stall display and bundle pricing ideas 2026');
  const [searchSummary, setSearchSummary] = useState<string | null>(null);
  const [searchSources, setSearchSources] = useState<GroundedSource[]>([]);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);

  // AI Stall Display Visual Generator (gemini-3.1-flash-lite-image)
  const [imagePrompt, setImagePrompt] = useState('');
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);
  const [imageLoading, setImageLoading] = useState(false);

  const activeZone = STALL_ZONES[selectedZone];

  const handleGenerateStrategy = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!strategyPrompt.trim()) return;
    setStrategyLoading(true);
    setStrategyError(null);
    try {
      const res = await fetch('/api/ai/strategy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventName,
          expectedFootfall,
          question: strategyPrompt.trim(),
          activeMixSummary,
          stallFee,
          accountContext,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to generate selling pitch');
      setStrategyResponse(data.strategy);
    } catch (err) {
      setStrategyError(err instanceof Error ? err.message : 'Unable to reach AI strategist.');
    } finally {
      setStrategyLoading(false);
    }
  };

  const handleSearchStrategies = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setSearchLoading(true);
    setSearchError(null);
    try {
      const res = await fetch('/api/ai/search-strategies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: searchQuery.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Search grounding request failed');
      setSearchSummary(data.summary);
      setSearchSources(data.sources || []);
    } catch (err) {
      setSearchError(err instanceof Error ? err.message : 'Unable to fetch grounded search insights.');
    } finally {
      setSearchLoading(false);
    }
  };

  const handleGenerateVisualMockup = async (presetPrompt?: string) => {
    setImageLoading(true);
    setImageError(null);
    try {
      const res = await fetch('/api/ai/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: presetPrompt || imagePrompt }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Image generation failed');
      setGeneratedImageUrl(data.imageUrl);
    } catch (err) {
      setImageError(err instanceof Error ? err.message : 'Unable to generate concept image.');
    } finally {
      setImageLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Interactive 6ft Grand Casa Table Blueprint */}
      <section className="bg-[#111827] border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-sm font-bold text-white">
              6ft {eventName} Table Blueprint
            </h2>
            <p className="text-xs text-slate-400">
              Click any zone on the map or buttons below to inspect stock placement and display photography.
            </p>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {ZONE_BUTTONS.map((zb) => (
              <button
                key={zb.id}
                type="button"
                aria-pressed={selectedZone === zb.id}
                onClick={() => setSelectedZone(zb.id)}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                  selectedZone === zb.id
                    ? 'bg-amber-400 text-slate-950 border-amber-400'
                    : 'bg-[#090D16] text-slate-300 border-slate-800 hover:border-slate-700'
                }`}
              >
                {zb.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
          <div className="lg:col-span-7 bg-[#090D16] border border-slate-800 rounded-xl p-3 flex items-center">
            <svg viewBox="0 0 600 280" className="w-full h-auto select-none" role="img" aria-label="6 foot stall table 4 zone layout">
              <rect x="20" y="20" width="560" height="205" rx="16" fill="#0f172a" stroke="#334155" strokeWidth="2.5" />

              {/* Zone 4: Back Vertical Riser */}
              <g onClick={() => setSelectedZone('back_riser')} className="cursor-pointer">
                <rect
                  x="35"
                  y="32"
                  width="530"
                  height="68"
                  rx="10"
                  fill={selectedZone === 'back_riser' ? '#10b981' : '#1e293b'}
                  fillOpacity={selectedZone === 'back_riser' ? '0.24' : '0.92'}
                  stroke="#34d399"
                  strokeWidth={selectedZone === 'back_riser' ? '2.5' : '1.5'}
                />
                <text x="300" y="60" textAnchor="middle" fill="#a7f3d0" fontSize="13" fontWeight="bold">
                  ZONE 4: BACK VERTICAL RISER (NECKLACES & ₹599 STACK BUNDLES)
                </text>
                <text x="300" y="80" textAnchor="middle" fill="#f8fafc" fontSize="11">
                  Dainty Chains (₹299) · Bangle + Ring Combo Boxes (₹349) · "Any Resin + Wood = ₹599"
                </text>
              </g>

              {/* Zone 1: Front-Left Eye-Catcher */}
              <g onClick={() => setSelectedZone('front_left')} className="cursor-pointer">
                <rect
                  x="35"
                  y="112"
                  width="170"
                  height="98"
                  rx="10"
                  fill={selectedZone === 'front_left' ? '#ec4899' : '#1e293b'}
                  fillOpacity={selectedZone === 'front_left' ? '0.24' : '0.92'}
                  stroke="#f472b6"
                  strokeWidth={selectedZone === 'front_left' ? '2.5' : '1.5'}
                />
                <text x="120" y="142" textAnchor="middle" fill="#fbcfe8" fontSize="12" fontWeight="bold">
                  ZONE 1: FRONT-LEFT
                </text>
                <text x="120" y="160" textAnchor="middle" fill="#fbcfe8" fontSize="11" fontWeight="bold">
                  EYE-CATCHER CONES
                </text>
                <text x="120" y="182" textAnchor="middle" fill="#f8fafc" fontSize="10">
                  White (₹499) & Colours (₹449)
                </text>
              </g>

              {/* Zone 2: Center Impulse Tray */}
              <g onClick={() => setSelectedZone('center_tray')} className="cursor-pointer">
                <rect
                  x="215"
                  y="112"
                  width="170"
                  height="98"
                  rx="10"
                  fill={selectedZone === 'center_tray' ? '#f59e0b' : '#1e293b'}
                  fillOpacity={selectedZone === 'center_tray' ? '0.24' : '0.92'}
                  stroke="#fbbf24"
                  strokeWidth={selectedZone === 'center_tray' ? '2.5' : '1.5'}
                />
                <text x="300" y="142" textAnchor="middle" fill="#fde68a" fontSize="12" fontWeight="bold">
                  ZONE 2: CENTER
                </text>
                <text x="300" y="160" textAnchor="middle" fill="#fde68a" fontSize="11" fontWeight="bold">
                  ₹149–₹249 IMPULSE
                </text>
                <text x="300" y="182" textAnchor="middle" fill="#f8fafc" fontSize="10">
                  Studs, Rings & Wooden (₹249)
                </text>
              </g>

              {/* Zone 3: Right Try-On Mirror Station */}
              <g onClick={() => setSelectedZone('right_mirror')} className="cursor-pointer">
                <rect
                  x="395"
                  y="112"
                  width="170"
                  height="98"
                  rx="10"
                  fill={selectedZone === 'right_mirror' ? '#8b5cf6' : '#1e293b'}
                  fillOpacity={selectedZone === 'right_mirror' ? '0.24' : '0.92'}
                  stroke="#c084fc"
                  strokeWidth={selectedZone === 'right_mirror' ? '2.5' : '1.5'}
                />
                <text x="480" y="142" textAnchor="middle" fill="#e9d5ff" fontSize="12" fontWeight="bold">
                  ZONE 3: RIGHT MIRROR
                </text>
                <text x="480" y="160" textAnchor="middle" fill="#e9d5ff" fontSize="11" fontWeight="bold">
                  TRY-ON STATION
                </text>
                <text x="480" y="182" textAnchor="middle" fill="#f8fafc" fontSize="10">
                  Cuffs (₹349) & Yellow (₹399)
                </text>
              </g>

              <text x="300" y="255" textAnchor="middle" fill="#94a3b8" fontSize="12" fontWeight="bold">
                ← {eventName.toUpperCase()} ({expectedFootfall.toLocaleString('en-IN')} WALK-INS) AISLE →
              </text>
            </svg>
          </div>

          {/* Zone Inspector with Real Merchandising Image */}
          <div className="lg:col-span-5 bg-[#090D16] border border-slate-800 rounded-xl overflow-hidden flex flex-col">
            <div className="relative h-44 bg-gradient-to-br from-slate-800 to-slate-950">
              <img
                src={activeZone.imageUrl}
                alt={activeZone.title}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent" />
              <div className="absolute bottom-3 left-3.5 right-3.5">
                <div className="text-xs font-semibold text-amber-300">{activeZone.title}</div>
              </div>
            </div>
            <div className="p-4 space-y-2.5 flex-1 flex flex-col justify-between">
              <div className="space-y-2">
                <div className="text-xs font-medium text-slate-200">{activeZone.subtitle}</div>
                <div className="text-xs font-mono text-emerald-300 bg-emerald-950/30 border border-emerald-500/25 rounded-lg px-3 py-2">
                  Stock: {activeZone.items}
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">{activeZone.why}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. 4 Exhibition Playbooks with Photography */}
      <section aria-label="Exhibition Selling Playbooks" className="space-y-3">
        <h2 className="font-display text-sm font-bold text-white">
          Exhibition Selling Playbooks & Display Reference
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {PLAYBOOK_CARDS.map((card) => (
            <article
              key={card.id}
              className="bg-[#111827] border border-slate-800 rounded-2xl overflow-hidden flex flex-col"
            >
              <div className="relative h-36 bg-slate-900">
                <img
                  src={card.imageUrl}
                  alt={card.imageAlt}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
              </div>
              <div className="p-4 space-y-2 flex-1 flex flex-col justify-between">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-mono text-amber-300 font-semibold">{card.number}. Tactic</span>
                    <span className="font-mono text-emerald-400 font-semibold">{card.metric}</span>
                  </div>
                  <h3 className="font-display text-sm font-bold text-white">{card.title}</h3>
                  <p className="text-xs text-slate-400 leading-relaxed">{card.desc}</p>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* 3. AI Sales Pitch Coach & AI Stall Display Concept Generator */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* AI Sales & Pitch Coach */}
        <div className="bg-[#111827] border border-slate-800 rounded-2xl p-4 space-y-3">
          <h2 className="text-xs font-semibold text-amber-300 flex items-center gap-1.5">
            <Sparkles className="w-4 h-4" />
            <span>AI Sales & Objection Pitch Coach</span>
          </h2>

          <form onSubmit={handleGenerateStrategy} className="flex gap-2">
            <input
              type="text"
              aria-label="Ask AI sales pitch strategist"
              value={strategyPrompt}
              onChange={(e) => setStrategyPrompt(e.target.value)}
              placeholder='e.g. "How do I pitch the ₹599 bangle stack to college students?"'
              className="flex-1 bg-[#090D16] border border-slate-800 focus:border-amber-400 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
            />
            <button
              type="submit"
              disabled={strategyLoading}
              className="px-3.5 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 disabled:opacity-60 text-slate-950 font-bold text-xs whitespace-nowrap shrink-0"
            >
              {strategyLoading ? 'Drafting...' : 'Get Script'}
            </button>
          </form>

          {strategyError && (
            <div className="text-xs text-rose-400 flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>{strategyError}</span>
            </div>
          )}

          {strategyResponse ? (
            <div className="bg-[#090D16] border border-slate-800 rounded-xl p-3.5 text-xs text-slate-200 whitespace-pre-line leading-relaxed">
              {strategyResponse}
            </div>
          ) : (
            <div className="bg-[#090D16] border border-slate-800/80 rounded-xl p-3.5 text-xs text-slate-400">
              Ask for custom opening lines, discount counter-scripts, or last-day clearance pitches tailored to your active mix.
            </div>
          )}
        </div>

        {/* AI Stall Display Concept Generator */}
        <div className="bg-[#111827] border border-slate-800 rounded-2xl p-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
              <ImageIcon className="w-4 h-4 text-amber-300" />
              <span>AI Custom Stall Concept Visual Studio</span>
            </h2>
            <button
              type="button"
              onClick={() => handleGenerateVisualMockup()}
              disabled={imageLoading}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 text-xs font-semibold flex items-center gap-1.5"
            >
              {imageLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Wand2 className="w-3.5 h-3.5" />}
              <span>{imageLoading ? 'Rendering...' : 'Render Concept'}</span>
            </button>
          </div>

          <input
            type="text"
            aria-label="Custom visual stall display description"
            value={imagePrompt}
            onChange={(e) => setImagePrompt(e.target.value)}
            placeholder='Optional theme e.g. "Festive marigold & dark velvet bangle booth with warm fairy lights"'
            className="w-full bg-[#090D16] border border-slate-800 focus:border-amber-400 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
          />

          {imageError && (
            <div className="text-xs text-rose-400 flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>{imageError}</span>
            </div>
          )}

          {generatedImageUrl ? (
            <img
              src={generatedImageUrl}
              alt="Custom AI generated exhibition stall display"
              referrerPolicy="no-referrer"
              className="w-full h-44 object-cover rounded-xl border border-slate-800"
            />
          ) : (
            <div className="h-32 rounded-xl bg-[#090D16] border border-dashed border-slate-800 flex items-center justify-center text-xs text-slate-400 p-4 text-center">
              Click "Render Concept" to generate a bespoke visual display concept for your table setup.
            </div>
          )}
        </div>
      </section>

      {/* 4. Live Google Search Grounded Trends & Curated YouTube Playbooks */}
      <section className="space-y-4">
        <div className="bg-[#111827] border border-slate-800 rounded-2xl p-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-xs font-semibold text-emerald-400 flex items-center gap-1.5">
              <Search className="w-4 h-4" />
              <span>Live Web & YouTube Strategy Search (Google Grounded)</span>
            </h2>
            <span className="text-[11px] text-slate-400">
              Real-time exhibition jewellery trends, display hacks & video references
            </span>
          </div>

          <form onSubmit={handleSearchStrategies} className="flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              aria-label="Search live jewellery exhibition strategies"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 bg-[#090D16] border border-slate-800 focus:border-emerald-400 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
            />
            <button
              type="submit"
              disabled={searchLoading}
              className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-60 text-slate-950 font-bold text-xs whitespace-nowrap shrink-0 flex items-center justify-center gap-1.5"
            >
              {searchLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
              <span>{searchLoading ? 'Searching Web...' : 'Search Live Trends'}</span>
            </button>
          </form>

          {searchError && (
            <div className="text-xs text-rose-400 flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>{searchError}</span>
            </div>
          )}

          {searchSummary && (
            <div className="bg-[#090D16] border border-slate-800 rounded-xl p-3.5 space-y-2.5">
              <div className="text-xs text-slate-200 whitespace-pre-line leading-relaxed">{searchSummary}</div>
              {searchSources.length > 0 && (
                <div className="pt-2 border-t border-slate-800 flex flex-wrap gap-2">
                  {searchSources.map((src, idx) => (
                    <a
                      key={`${src.uri}-${idx}`}
                      href={src.uri}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-[11px] text-amber-300 hover:text-amber-200 underline"
                    >
                      <span>{src.title}</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Curated YouTube Guides */}
        <div className="space-y-2.5">
          <h3 className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
            <Youtube className="w-4 h-4 text-rose-400" />
            <span>Curated YouTube Stall Setup & Pricing Playbooks</span>
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
            {CURATED_VIDEOS.map((vid) => (
              <a
                key={vid.id}
                href={vid.queryUrl}
                target="_blank"
                rel="noreferrer"
                className="block bg-[#111827] hover:bg-[#141D2F] border border-slate-800 hover:border-slate-700 rounded-2xl p-4 transition-colors space-y-2.5"
              >
                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <span className="font-semibold text-amber-300">{vid.tag}</span>
                  <span className="flex items-center gap-1 font-mono">
                    <Play className="w-3 h-3 fill-current" />
                    {vid.duration}
                  </span>
                </div>
                <div className="font-display text-sm font-bold text-white leading-snug">{vid.title}</div>
                <p className="text-xs text-slate-400 leading-relaxed">{vid.keyTakeaway}</p>
                <div className="text-xs font-semibold text-amber-300 flex items-center gap-1 pt-1">
                  <span>Watch on YouTube</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </div>
              </a>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
