import React, { useEffect, useState } from 'react';
import {
  BrainCircuit,
  Check,
  Cloud,
  LogOut,
  Plus,
  Store,
  Trash2,
  X,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import type { AiMemoryCategory } from '../types/stall';

interface AccountMemoryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

const MEMORY_CATEGORIES: Array<{ id: AiMemoryCategory; label: string }> = [
  { id: 'preference', label: 'Preference' },
  { id: 'pricing', label: 'Pricing' },
  { id: 'inventory', label: 'Inventory' },
  { id: 'event', label: 'Event' },
  { id: 'strategy', label: 'Strategy' },
];

export function AccountMemoryDrawer({ isOpen, onClose }: AccountMemoryDrawerProps) {
  const {
    user,
    profile,
    memories,
    syncStatus,
    updateMerchantProfile,
    addMemory,
    removeMemory,
    logout,
  } = useAuth();

  const [businessName, setBusinessName] = useState(profile?.businessName || '');
  const [preferredScale, setPreferredScale] = useState(
    profile?.preferredScale || 'Exhibition Stall'
  );
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);

  const [newFact, setNewFact] = useState('');
  const [newCategory, setNewCategory] = useState<AiMemoryCategory>('preference');
  const [addingMemory, setAddingMemory] = useState(false);

  useEffect(() => {
    if (profile) {
      setBusinessName(profile.businessName || '');
      setPreferredScale(profile.preferredScale || 'Exhibition Stall');
    }
  }, [profile]);

  if (!isOpen || !user || !profile) return null;

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    setProfileSaved(false);
    await updateMerchantProfile({ businessName, preferredScale });
    setSavingProfile(false);
    setProfileSaved(true);
    window.setTimeout(() => setProfileSaved(false), 2000);
  };

  const handleAddMemory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFact.trim() || addingMemory) return;
    setAddingMemory(true);
    await addMemory(newFact.trim(), newCategory, 'manual');
    setNewFact('');
    setAddingMemory(false);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Account Profile and AI Memory"
      className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-4"
    >
      <div className="w-full max-w-lg bg-[#111827] border border-slate-700 rounded-2xl overflow-hidden shadow-2xl">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-800 bg-[#0D1320]">
          <div className="flex items-center gap-3 min-w-0">
            {profile.photoURL ? (
              <img
                src={profile.photoURL}
                alt={profile.displayName}
                referrerPolicy="no-referrer"
                className="w-9 h-9 rounded-full border border-amber-400/50 object-cover shrink-0"
              />
            ) : (
              <div className="w-9 h-9 rounded-full bg-amber-400/15 border border-amber-400/40 flex items-center justify-center text-amber-300 font-bold text-sm shrink-0">
                {profile.displayName.charAt(0).toUpperCase()}
              </div>
            )}
            <div className="min-w-0">
              <div className="text-sm font-bold text-white truncate">{profile.displayName}</div>
              <div className="text-[11px] text-slate-400 truncate flex items-center gap-1.5">
                <span>{profile.email}</span>
                <span>·</span>
                <span className="inline-flex items-center gap-1 text-emerald-400">
                  <Cloud className="w-3 h-3" />
                  {syncStatus === 'saving'
                    ? 'Syncing...'
                    : syncStatus === 'saved'
                    ? 'Cloud Synced'
                    : syncStatus}
                </span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close Account Drawer"
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-5 max-h-[80vh] overflow-y-auto">
          {/* Merchant Brand Profile */}
          <form onSubmit={handleSaveProfile} className="space-y-3 bg-[#090D16] border border-slate-800 rounded-xl p-3.5">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-300">
              <Store className="w-3.5 h-3.5" />
              <span>Brand & Default Sale Context</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <label className="block text-[11px] text-slate-400">
                <span className="block mb-1">Brand / Boutique Name</span>
                <input
                  type="text"
                  maxLength={120}
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  placeholder="e.g., Arohi Jewels Studio"
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-amber-400"
                />
              </label>
              <label className="block text-[11px] text-slate-400">
                <span className="block mb-1">Default Scale</span>
                <select
                  value={preferredScale}
                  onChange={(e) => setPreferredScale(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-amber-400"
                >
                  <option value="Mini Pop-Up">Mini Pop-Up</option>
                  <option value="Exhibition Stall">Exhibition Stall</option>
                  <option value="Mega Expo">Mega Expo</option>
                  <option value="Wholesale / Bulk">Wholesale / Bulk</option>
                  <option value="Custom Scale">Custom Scale</option>
                </select>
              </label>
            </div>

            <div className="flex items-center justify-between pt-0.5">
              <span className="text-[11px] text-slate-500">
                Used automatically by Voice Coach & CFO Audit
              </span>
              <button
                type="submit"
                disabled={savingProfile}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-bold transition-colors disabled:opacity-50"
              >
                {profileSaved ? <Check className="w-3.5 h-3.5" /> : null}
                <span>{profileSaved ? 'Saved' : savingProfile ? 'Saving...' : 'Save Brand'}</span>
              </button>
            </div>
          </form>

          {/* Account-Specific AI Memory */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-white">
                <BrainCircuit className="w-4 h-4 text-amber-400" />
                <span>AI Account Memory ({memories.length})</span>
              </div>
              <span className="text-[11px] text-slate-400">
                Remembered across logins & voice sessions
              </span>
            </div>

            <form onSubmit={handleAddMemory} className="flex flex-col sm:flex-row gap-2">
              <select
                aria-label="Memory category"
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value as AiMemoryCategory)}
                className="bg-[#090D16] border border-slate-800 rounded-xl px-2.5 py-2 text-xs text-amber-300 focus:outline-none focus:border-amber-400"
              >
                {MEMORY_CATEGORIES.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </select>
              <input
                type="text"
                maxLength={500}
                value={newFact}
                onChange={(e) => setNewFact(e.target.value)}
                placeholder="Teach AI (e.g., Always aim 3x markup on bridal kundan)"
                className="flex-1 bg-[#090D16] border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
              />
              <button
                type="submit"
                disabled={!newFact.trim() || addingMemory}
                className="inline-flex items-center justify-center gap-1 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 text-xs font-semibold disabled:opacity-50"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add</span>
              </button>
            </form>

            <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
              {memories.length === 0 ? (
                <div className="bg-[#090D16] border border-dashed border-slate-800 rounded-xl p-4 text-center text-xs text-slate-400">
                  No account memories yet. Tell Voice Coach "Remember I prefer even 6-category spreads" or add one above.
                </div>
              ) : (
                memories.map((m) => (
                  <div
                    key={m.id}
                    className="flex items-start justify-between gap-2.5 bg-[#090D16] border border-slate-800/90 rounded-xl px-3 py-2 text-xs"
                  >
                    <div className="space-y-0.5 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] uppercase tracking-wider font-mono text-amber-300">
                          {m.category}
                        </span>
                        <span className="text-[10px] text-slate-500">· {m.source}</span>
                      </div>
                      <p className="text-slate-200 leading-snug break-words">{m.fact}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeMemory(m.id)}
                      aria-label={`Delete memory ${m.fact}`}
                      className="text-slate-500 hover:text-rose-400 p-1 shrink-0 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
            <button
              type="button"
              onClick={async () => {
                await logout();
                onClose();
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-950/40 hover:bg-rose-950/70 text-rose-300 border border-rose-500/30 text-xs font-semibold transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
