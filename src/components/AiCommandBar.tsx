import React from 'react';
import { Loader2, Send, Wand2 } from 'lucide-react';

interface AiCommandBarProps {
  aiInput: string;
  onAiInputChange: (val: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  aiLoading: boolean;
  aiFeedback: string;
  aiError: string | null;
}

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
      className="bg-[#111827] border border-slate-800 rounded-2xl px-3.5 py-2.5"
    >
      <form
        onSubmit={onSubmit}
        className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2"
      >
        <div className="flex items-center gap-1.5 text-amber-300 text-xs font-semibold shrink-0">
          <Wand2 className="w-3.5 h-3.5" />
          <span>Quick AI</span>
        </div>

        <input
          type="text"
          aria-label="Enter natural language rules or stock updates"
          value={aiInput}
          onChange={(e) => onAiInputChange(e.target.value)}
          placeholder='e.g. "Budget 5000, add Anklets cost 80 sell 229, high beauty"'
          className="flex-1 bg-[#090D16] border border-slate-800 focus:border-amber-400 rounded-xl px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none"
        />

        <button
          type="submit"
          disabled={aiLoading}
          className="flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 disabled:opacity-60 text-slate-950 font-semibold text-xs whitespace-nowrap shrink-0 transition-colors"
        >
          {aiLoading ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Send className="w-3.5 h-3.5" />
          )}
          <span>{aiLoading ? 'Applying...' : 'Apply'}</span>
        </button>

        {aiError && (
          <span className="text-[11px] text-rose-400 truncate max-w-xs">
            {aiError}
          </span>
        )}
        {!aiError && aiFeedback && aiFeedback.startsWith('Updated') && (
          <span className="text-[11px] text-emerald-400 truncate max-w-xs">
            {aiFeedback}
          </span>
        )}
      </form>
    </section>
  );
}
