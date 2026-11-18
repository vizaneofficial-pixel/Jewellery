import React from 'react';
import { Loader2, Send, Sparkles, Wand2 } from 'lucide-react';

interface AiCommandBarProps {
  aiInput: string;
  onAiInputChange: (val: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  aiLoading: boolean;
  aiFeedback: string;
  aiError: string | null;
}

const EXAMPLE_COMMANDS = [
  'Budget 15000, Expo Fee 22000, Crowd 25000',
  'White cost 250 sell 499, add Nose Pins cost 30 sell 99 qty 30',
  'Even beauty spread, all categories included, 90% safe',
];

export function AiCommandBar({
  aiInput,
  onAiInputChange,
  onSubmit,
  aiLoading,
  aiFeedback,
  aiError,
}: AiCommandBarProps) {
  return (
    <section
      aria-label="Smart AI Command Bar"
      className="bg-[#111827] border border-slate-800 rounded-2xl p-3.5 space-y-2.5"
    >
      <form onSubmit={onSubmit} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
        <div className="flex items-center gap-2 text-amber-300 text-xs font-semibold shrink-0 px-1">
          <Wand2 className="w-4 h-4" />
          <span>Smart Command</span>
        </div>

        <input
          type="text"
          aria-label="Enter natural language rules or stock updates"
          value={aiInput}
          onChange={(e) => onAiInputChange(e.target.value)}
          placeholder='Type any rough note, item list, sale scale, or rule (e.g. "Budget 15000, Expo crowd 25000, add Nose Pins cost 30 sell 99 qty 30")...'
          className="flex-1 bg-[#090D16] border border-slate-800 focus:border-amber-400 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none"
        />

        <button
          type="submit"
          disabled={aiLoading}
          className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 disabled:opacity-60 text-slate-950 font-semibold text-xs whitespace-nowrap shrink-0 transition-colors"
        >
          {aiLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
          <span>{aiLoading ? 'Analyzing...' : 'Apply Command'}</span>
        </button>
      </form>

      <div className="flex flex-wrap items-center justify-between gap-2 px-1 text-xs">
        <div className="flex items-center gap-1.5 text-slate-300">
          <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          <span>{aiError ? aiError : aiFeedback}</span>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 min-w-0 max-w-full">
          {EXAMPLE_COMMANDS.map((cmd) => (
            <button
              key={cmd}
              type="button"
              onClick={() => onAiInputChange(cmd)}
              className="max-w-full truncate px-2.5 py-1 rounded-lg bg-[#090D16] hover:bg-slate-800 text-[11px] text-slate-300 border border-slate-800 whitespace-nowrap transition-colors"
            >
              {cmd}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
