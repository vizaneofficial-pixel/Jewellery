import React, { useEffect, useState } from 'react';
import {
  BrainCircuit,
  Check,
  Cloud,
  LogOut,
  Pencil,
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
    editMemory,
    removeMemory,
    clearAllMemories,
    logout,
  } = useAuth();

  const [preferredName, setPreferredName] = useState(profile?.preferredName || '');
  const [businessName, setBusinessName] = useState(profile?.businessName || '');
  const [preferredScale, setPreferredScale] = useState(
    profile?.preferredScale || 'Exhibition Stall'
  );
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);

  const [newFact, setNewFact] = useState('');
  const [newCategory, setNewCategory] = useState<AiMemoryCategory>('preference');
  const [addingMemory, setAddingMemory] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editFact, setEditFact] = useState('');
  const [editCategory, setEditCategory] = useState<AiMemoryCategory>('preference');
  const [savingEdit, setSavingEdit] = useState(false);

  const [confirmClearAll, setConfirmClearAll] = useState(false);
  const [clearingAll, setClearingAll] = useState(false);

  useEffect(() => {
    if (profile) {
      setPreferredName(profile.preferredName || '');
      setBusinessName(profile.businessName || '');
      setPreferredScale(profile.preferredScale || 'Exhibition Stall');
    }
  }, [profile]);

  useEffect(() => {
    if (!isOpen) {
      setEditingId(null);
      setConfirmClearAll(false);
    }
  }, [isOpen]);

  if (!isOpen || !user || !profile) return null;

  const fallbackFirstName = profile.displayName.split(' ')[0] || 'Merchant';

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    setProfileSaved(false);
    await updateMerchantProfile({ preferredName, businessName, preferredScale });
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

  const startEditing = (id: string, fact: string, category: AiMemoryCategory) => {
    setEditingId(id);
    setEditFact(fact);
    setEditCategory(category);
  };

  const handleSaveEdit = async (memoryId: string) => {
    if (!editFact.trim() || savingEdit) return;
    setSavingEdit(true);
    await editMemory(memoryId, { fact: editFact.trim(), category: editCategory });
    setSavingEdit(false);
    setEditingId(null);
  };

  const handleClearAll = async () => {
    if (clearingAll) return;
    setClearingAll(true);
    await clearAllMemories();
    setClearingAll(false);
    setConfirmClearAll(false);
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
              <div className="text-sm font-bold text-white truncate">
                {profile.preferredName || profile.displayName}
              </div>
              <div className="text-[11px] text-slate-400 truncate flex items-center gap-1.5">
                <span>{profile.email}</span>
                <span>·</span>
                <span
                  className={`inline-flex items-center gap-1 ${
                    syncStatus === 'error' ? 'text-rose-400' : 'text-emerald-400'
                  }`}
                >
                  <Cloud className="w-3 h-3" />
                  {syncStatus === 'saving'
                    ? 'Syncing...'
                    : syncStatus === 'saved'
                    ? 'Private Cloud Sync'
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

        <div className="p-5 space-y-5 max-h-[82vh] overflow-y-auto">
          {/* Merchant Personalization & Brand Profile */}
          <form onSubmit={handleSaveProfile} className="space-y-3 bg-[#090D16] border border-slate-800 rounded-xl p-3.5">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-300">
              <Store className="w-3.5 h-3.5" />
              <span>Personalization & Brand Context</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <label className="block text-[11px] text-slate-400">
                <span className="block mb-1">Preferred Name (for AI Coach)</span>
                <input
                  type="text"
                  maxLength={80}
                  value={preferredName}
                  onChange={(e) => setPreferredName(e.target.value)}
                  placeholder={fallbackFirstName}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-amber-400"
                />
              </label>
              <label className="block text-[11px] text-slate-400">
                <span className="block mb-1">Brand / Stall Name</span>
                <input
                  type="text"
                  maxLength={120}
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  placeholder="e.g., Arohi Jewels Studio"
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-amber-400"
                />
              </label>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 items-end">
              <label className="block text-[11px] text-slate-400">
                <span className="block mb-1">Default Sale Scale</span>
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

              <div className="flex items-center justify-end">
                <button
                  type="submit"
                  disabled={savingProfile}
                  className="inline-flex items-center gap-1 px-3.5 py-1.5 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-bold transition-colors disabled:opacity-50"
                >
                  {profileSaved ? <Check className="w-3.5 h-3.5" /> : null}
                  <span>{profileSaved ? 'Saved' : savingProfile ? 'Saving...' : 'Save Profile'}</span>
                </button>
              </div>
            </div>
          </form>

          {/* Private Per-Account AI Memory */}
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-white">
                <BrainCircuit className="w-4 h-4 text-amber-400" />
                <span>Private AI Memory ({memories.length})</span>
              </div>

              {memories.length > 0 && (
                <div className="flex items-center gap-1.5">
                  {confirmClearAll ? (
                    <>
                      <button
                        type="button"
                        onClick={handleClearAll}
                        disabled={clearingAll}
                        className="px-2 py-1 rounded-md bg-rose-600 hover:bg-rose-500 text-white text-[11px] font-semibold disabled:opacity-50"
                      >
                        {clearingAll ? 'Clearing...' : 'Confirm Clear All'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmClearAll(false)}
                        className="px-2 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px]"
                      >
                        Cancel
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirmClearAll(true)}
                      className="text-[11px] text-slate-400 hover:text-rose-300 transition-colors"
                    >
                      Clear All
                    </button>
                  )}
                </div>
              )}
            </div>

            <p className="text-[11px] text-slate-400">
              Stores only your key preferences, product focus, margin sensitivity, and goals—never raw chat logs.
            </p>

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
                placeholder="Save a durable preference (e.g., Target 2.8x markup on bridal kundan)"
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

            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {memories.length === 0 ? (
                <div className="bg-[#090D16] border border-dashed border-slate-800 rounded-xl p-4 text-center text-xs text-slate-400">
                  No saved AI memory yet. Tell Voice Coach what to remember or add a durable preference above.
                </div>
              ) : (
                memories.map((m) => (
                  <div
                    key={m.id}
                    className="bg-[#090D16] border border-slate-800/90 rounded-xl px-3 py-2.5 text-xs"
                  >
                    {editingId === m.id ? (
                      <div className="space-y-2">
                        <div className="flex flex-col sm:flex-row gap-2">
                          <select
                            aria-label="Edit memory category"
                            value={editCategory}
                            onChange={(e) => setEditCategory(e.target.value as AiMemoryCategory)}
                            className="bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-xs text-amber-300 focus:outline-none focus:border-amber-400"
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
                            value={editFact}
                            onChange={(e) => setEditFact(e.target.value)}
                            aria-label="Edit memory text"
                            className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white focus:outline-none focus:border-amber-400"
                          />
                        </div>
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => setEditingId(null)}
                            className="px-2.5 py-1 rounded-lg text-slate-400 hover:text-white text-[11px]"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            disabled={!editFact.trim() || savingEdit}
                            onClick={() => handleSaveEdit(m.id)}
                            className="px-2.5 py-1 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-[11px] disabled:opacity-50"
                          >
                            {savingEdit ? 'Saving...' : 'Save'}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-start justify-between gap-2.5">
                        <div className="space-y-0.5 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] uppercase tracking-wider font-mono text-amber-300">
                              {m.category}
                            </span>
                            <span className="text-[10px] text-slate-500">· {m.source}</span>
                          </div>
                          <p className="text-slate-200 leading-snug break-words">{m.fact}</p>
                        </div>
                        <div className="flex items-center gap-0.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => startEditing(m.id, m.fact, m.category)}
                            aria-label={`Edit memory ${m.fact}`}
                            className="text-slate-500 hover:text-amber-300 p-1 transition-colors"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => removeMemory(m.id)}
                            aria-label={`Delete memory ${m.fact}`}
                            className="text-slate-500 hover:text-rose-400 p-1 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
            <button
              type="button"
              onClick={async () => {
                onClose();
                await logout();
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
