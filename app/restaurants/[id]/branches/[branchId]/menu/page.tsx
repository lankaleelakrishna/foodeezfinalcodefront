'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api, menuApi, resolveMediaUrl, MenuPricingRuleType, MenuPricingValueType } from '../../../../../../lib/api';
import { getUserRole } from '../../../../../../lib/auth';
import AuthGuard from '../../../../../components/AuthGuard';

// ── Types ─────────────────────────────────────────────────────────────────────

type Category = { id: string; name: string; displayName: string };

type MenuItem = {
  id: string; name: string; description?: string;
  price: number; currency: string; isVisible: boolean; isInStock: boolean;
  category: Category;
  imageUrl?: string;
  pricingRules?: PricingRule[];
};

type ScanItem = { 
  name: string; 
  description?: string; 
  price: string; 
  currency: string; 
  discount?: {
    valueType: MenuPricingValueType;
    value: string;
    title?: string;
    startsAt?: string;
    endsAt?: string;
  };
};
type ScanCategory = { name: string; displayName: string; items: ScanItem[] };

type Addon = {
  id: string; name: string; description?: string;
  price: number; currency: string;
  isRequired: boolean; minSelections: number; maxSelections: number;
  sortOrder: number; isVisible: boolean;
};

type PricingRule = {
  id: string; ruleType: MenuPricingRuleType; valueType: MenuPricingValueType;
  value: number; title?: string; isActive: boolean;
  startsAt?: string; endsAt?: string;
};

// ── Helpers ───────────────────────────────────────────────────────────────────

const INPUT = 'w-full rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] px-4 py-3 text-sm text-[var(--tx)] placeholder:text-[var(--tx-3)] focus:border-[var(--accent)] focus:outline-none';

function compressAndEncode(file: File, maxPx = 1600, quality = 0.82): Promise<{ b64: string; mime: string }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      let { width, height } = img;
      if (width > maxPx || height > maxPx) {
        const ratio = Math.min(maxPx / width, maxPx / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      canvas.getContext('2d')!.drawImage(img, 0, 0, width, height);
      const mime = 'image/jpeg';
      const dataUrl = canvas.toDataURL(mime, quality);
      resolve({ b64: dataUrl.split(',')[1], mime });
    };
    img.onerror = reject;
    img.src = url;
  });
}

function fileToBase64(file: File): Promise<{ b64: string; mime: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      resolve({ b64: dataUrl.split(',')[1], mime: file.type });
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function isImageFile(file: File) {
  return file.type.startsWith('image/');
}

const SCAN_ACCEPT = 'image/*,.pdf,.xlsx,.xls,.csv';
const SCAN_MAX_BYTES = 25 * 1024 * 1024;

// ── Item Detail Panel (Addons + Pricing Rules) ────────────────────────────────

function ItemDetailPanel({ itemId, itemName, canWrite }: { itemId: string; itemName: string; canWrite: boolean }) {
  const [tab, setTab] = useState<'addons' | 'pricing'>('addons');
  const [addons, setAddons] = useState<Addon[]>([]);
  const [rules, setRules] = useState<PricingRule[]>([]);
  const [loading, setLoading] = useState(false);

  const [addonForm, setAddonForm] = useState({
    name: '', description: '', price: '', currency: 'INR',
    isRequired: false, minSelections: '1', maxSelections: '1', isVisible: true,
  });
  const [ruleForm, setRuleForm] = useState({
    ruleType: 'DISCOUNT' as MenuPricingRuleType,
    valueType: 'PERCENTAGE' as MenuPricingValueType,
    value: '', title: '', startsAt: '', endsAt: '',
  });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  const load = () => {
    setLoading(true);
    Promise.all([
      menuApi.listAddons(itemId),
      menuApi.listPricingRules(itemId),
    ]).then(([a, r]) => {
      const normalise = (raw: any) => Array.isArray(raw) ? raw : (raw?.items ?? raw?.data ?? []);
      setAddons(normalise(a.data));
      setRules(normalise(r.data));
    }).catch(() => {}).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [itemId]);

  const createAddon = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true); setMsg('');
    try {
      await menuApi.createAddon(itemId, {
        name: addonForm.name, description: addonForm.description || undefined,
        price: parseFloat(addonForm.price) || 0, currency: addonForm.currency,
        isRequired: addonForm.isRequired,
        minSelections: parseInt(addonForm.minSelections) || 1,
        maxSelections: parseInt(addonForm.maxSelections) || 1,
        isVisible: addonForm.isVisible,
      });
      setAddonForm({ name: '', description: '', price: '', currency: 'INR', isRequired: false, minSelections: '1', maxSelections: '1', isVisible: true });
      setMsg('Addon added.');
      load();
    } catch { setMsg('Failed to add addon.'); }
    setSaving(false);
  };

  const toggleAddon = async (addon: Addon, field: 'isVisible' | 'isRequired') => {
    try {
      await menuApi.updateAddon(addon.id, { [field]: !addon[field] });
      load();
    } catch {}
  };

  const createRule = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true); setMsg('');
    try {
      await menuApi.createPricingRule(itemId, {
        ruleType: ruleForm.ruleType, valueType: ruleForm.valueType,
        value: parseFloat(ruleForm.value) || 0,
        title: ruleForm.title || undefined,
        startsAt: ruleForm.startsAt || undefined,
        endsAt: ruleForm.endsAt || undefined,
      });
      setRuleForm({ ruleType: 'DISCOUNT', valueType: 'PERCENTAGE', value: '', title: '', startsAt: '', endsAt: '' });
      setMsg('Rule added.');
      load();
    } catch { setMsg('Failed to add rule.'); }
    setSaving(false);
  };

  const toggleRule = async (rule: PricingRule) => {
    try {
      await menuApi.updatePricingRule(rule.id, { isActive: !rule.isActive });
      load();
    } catch {}
  };

  return (
    <div className="border-t border-slate-100 bg-slate-50/60 px-5 py-4 space-y-4">
      <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">{itemName} — Details</p>

      <div className="flex gap-2">
        {(['addons', 'pricing'] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`rounded-full px-4 py-1.5 text-xs font-medium transition ${tab === t ? 'bg-slate-800 text-white' : 'border border-slate-200 text-slate-600 hover:bg-white'}`}>
            {t === 'addons' ? `Addons (${addons.length})` : `Pricing Rules (${rules.length})`}
          </button>
        ))}
      </div>

      {msg && <p className="text-xs text-emerald-600">{msg}</p>}

      {/* ── Addons tab ── */}
      {tab === 'addons' && (
        <div className="space-y-3">
          {loading ? <div className="h-10 animate-pulse rounded-xl bg-slate-200" /> : addons.length === 0 ? (
            <p className="text-xs text-slate-400 italic">No addons yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-left text-slate-400 uppercase tracking-wide border-b border-slate-200">
                    <th className="pb-2 pr-3 font-medium">Name</th>
                    <th className="pb-2 pr-3 font-medium">Price</th>
                    <th className="pb-2 pr-3 font-medium">Required</th>
                    <th className="pb-2 pr-3 font-medium">Sel.</th>
                    <th className="pb-2 font-medium">Visible</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {addons.map((a) => (
                    <tr key={a.id} className="hover:bg-white transition">
                      <td className="py-2 pr-3 font-medium text-slate-700">{a.name}{a.description && <span className="ml-1 text-slate-400 font-normal">({a.description})</span>}</td>
                      <td className="py-2 pr-3 text-slate-600">{a.currency} {Number(a.price).toFixed(2)}</td>
                      <td className="py-2 pr-3">
                        {canWrite ? (
                          <button onClick={() => toggleAddon(a, 'isRequired')}
                            className={`rounded-full px-2 py-0.5 text-xs font-medium ${a.isRequired ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-500'}`}>
                            {a.isRequired ? 'Yes' : 'No'}
                          </button>
                        ) : <span>{a.isRequired ? 'Yes' : 'No'}</span>}
                      </td>
                      <td className="py-2 pr-3 text-slate-500">{a.minSelections}–{a.maxSelections}</td>
                      <td className="py-2">
                        {canWrite ? (
                          <button onClick={() => toggleAddon(a, 'isVisible')}
                            className={`rounded-full px-2 py-0.5 text-xs font-medium ${a.isVisible ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-500'}`}>
                            {a.isVisible ? 'Visible' : 'Hidden'}
                          </button>
                        ) : <span>{a.isVisible ? 'Visible' : 'Hidden'}</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {canWrite && (
            <form onSubmit={createAddon} className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4 items-end pt-2 border-t border-slate-200">
              <div>
                <label className="block text-xs text-slate-500 mb-1">Name *</label>
                <input required value={addonForm.name} onChange={(e) => setAddonForm((f) => ({ ...f, name: e.target.value }))} className={INPUT} placeholder="Extra cheese" />
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">Price</label>
                <input type="number" min="0" step="0.01" value={addonForm.price} onChange={(e) => setAddonForm((f) => ({ ...f, price: e.target.value }))} className={INPUT} placeholder="0.00" />
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">Min / Max selections</label>
                <div className="flex gap-1">
                  <input type="number" min="0" value={addonForm.minSelections} onChange={(e) => setAddonForm((f) => ({ ...f, minSelections: e.target.value }))} className={INPUT} />
                  <input type="number" min="0" value={addonForm.maxSelections} onChange={(e) => setAddonForm((f) => ({ ...f, maxSelections: e.target.value }))} className={INPUT} />
                </div>
              </div>
              <div className="flex items-center gap-3 pt-4">
                <label className="flex items-center gap-1 text-xs text-slate-600 cursor-pointer">
                  <input type="checkbox" checked={addonForm.isRequired} onChange={(e) => setAddonForm((f) => ({ ...f, isRequired: e.target.checked }))} /> Required
                </label>
                <button type="submit" disabled={saving}
                  className="rounded-xl bg-slate-800 px-3 py-2 text-xs font-medium text-white hover:bg-slate-700 disabled:opacity-60">
                  {saving ? '…' : '+ Add'}
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* ── Pricing Rules tab ── */}
      {tab === 'pricing' && (
        <div className="space-y-3">
          {loading ? <div className="h-10 animate-pulse rounded-xl bg-slate-200" /> : rules.length === 0 ? (
            <p className="text-xs text-slate-400 italic">No pricing rules yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-left text-slate-400 uppercase tracking-wide border-b border-slate-200">
                    <th className="pb-2 pr-3 font-medium">Title</th>
                    <th className="pb-2 pr-3 font-medium">Type</th>
                    <th className="pb-2 pr-3 font-medium">Value</th>
                    <th className="pb-2 pr-3 font-medium">Active</th>
                    <th className="pb-2 font-medium">Period</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {rules.map((r) => (
                    <tr key={r.id} className="hover:bg-white transition">
                      <td className="py-2 pr-3 font-medium text-slate-700">{r.title || r.ruleType}</td>
                      <td className="py-2 pr-3 text-slate-500">{r.ruleType} / {r.valueType}</td>
                      <td className="py-2 pr-3 text-slate-700">{r.valueType === 'PERCENTAGE' ? `${r.value}%` : `₹${r.value}`}</td>
                      <td className="py-2 pr-3">
                        {canWrite ? (
                          <button onClick={() => toggleRule(r)}
                            className={`rounded-full px-2 py-0.5 text-xs font-medium ${r.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                            {r.isActive ? 'Active' : 'Inactive'}
                          </button>
                        ) : <span>{r.isActive ? 'Active' : 'Inactive'}</span>}
                      </td>
                      <td className="py-2 text-slate-400">
                        {r.startsAt ? `${new Date(r.startsAt).toLocaleDateString('en-IN')} → ${r.endsAt ? new Date(r.endsAt).toLocaleDateString('en-IN') : '∞'}` : 'Always'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {canWrite && (
            <form onSubmit={createRule} className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4 items-end pt-2 border-t border-slate-200">
              <div>
                <label className="block text-xs text-slate-500 mb-1">Rule Type</label>
                <select value={ruleForm.ruleType} onChange={(e) => setRuleForm((f) => ({ ...f, ruleType: e.target.value as MenuPricingRuleType }))} className={INPUT}>
                  <option value="DISCOUNT">Discount</option>
                  <option value="PRICE_OVERRIDE">Price Override</option>
                  <option value="TIME_BASED">Time Based</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">Value Type + Amount</label>
                <div className="flex gap-1">
                  <select value={ruleForm.valueType} onChange={(e) => setRuleForm((f) => ({ ...f, valueType: e.target.value as MenuPricingValueType }))} className={INPUT}>
                    <option value="PERCENTAGE">%</option>
                    <option value="FLAT">₹ Flat</option>
                  </select>
                  <input required type="number" min="0" step="0.01" value={ruleForm.value} onChange={(e) => setRuleForm((f) => ({ ...f, value: e.target.value }))} className={INPUT} placeholder="10" />
                </div>
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">Title</label>
                <input value={ruleForm.title} onChange={(e) => setRuleForm((f) => ({ ...f, title: e.target.value }))} className={INPUT} placeholder="Happy hours (optional)" />
              </div>
              <div className="flex gap-1 items-end">
                <button type="submit" disabled={saving}
                  className="rounded-xl bg-slate-800 px-3 py-2 text-xs font-medium text-white hover:bg-slate-700 disabled:opacity-60 whitespace-nowrap">
                  {saving ? '…' : '+ Add Rule'}
                </button>
              </div>
            </form>
          )}
        </div>
      )}
    </div>
  );
}

// ── Scan Panel ────────────────────────────────────────────────────────────────

function ScanPanel({ branchId, onImported }: { branchId: string; onImported: () => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [scanning, setScanning] = useState(false);
  const [importing, setImporting] = useState(false);
  const [scanError, setScanError] = useState('');
  const [importError, setImportError] = useState('');
  const [importSuccess, setImportSuccess] = useState('');
  const [extracted, setExtracted] = useState<ScanCategory[] | null>(null);

  const handleFile = (f: File) => {
    if (f.size > SCAN_MAX_BYTES) { setScanError('File must be under 25 MB.'); return; }
    setFile(f);
    setScanError('');
    setImportError('');
    setImportSuccess('');
    setExtracted(null);
    if (isImageFile(f)) {
      setPreview(URL.createObjectURL(f));
    } else {
      setPreview(null);
    }
  };

  const handleScan = async () => {
    if (!file) return;
    setScanning(true);
    setScanError('');
    setExtracted(null);
    try {
      const { b64, mime: mimeType } = isImageFile(file)
        ? await compressAndEncode(file)
        : await fileToBase64(file);
      const res = await api.post(`/branches/${branchId}/menu-scan`, { imageBase64: b64, mimeType });
      const cats: ScanCategory[] = (res.data.categories ?? []).map((c: any) => ({
        name: c.name ?? '',
        displayName: c.displayName ?? '',
        items: (c.items ?? []).map((i: any) => ({
          name: i.name ?? '',
          description: i.description ?? '',
          price: String(i.price ?? 0),
          currency: i.currency ?? 'INR',
        })),
      }));
      setExtracted(cats);
    } catch (err: any) {
      const msg = err?.response?.data?.message;
      setScanError(Array.isArray(msg) ? msg.join(' ') : (msg ?? 'Scan failed. Try a clearer photo.'));
    } finally {
      setScanning(false);
    }
  };

  const updateCategory = (ci: number, field: keyof ScanCategory, value: string) =>
    setExtracted((prev) => prev ? prev.map((c, i) => i === ci ? { ...c, [field]: value } : c) : prev);

  const updateItem = (ci: number, ii: number, field: keyof ScanItem, value: string) =>
    setExtracted((prev) => prev
      ? prev.map((c, i) => i === ci
          ? { ...c, items: c.items.map((it, j) => j === ii ? { ...it, [field]: value } : it) }
          : c)
      : prev);

  const updateItemDiscount = (ci: number, ii: number, field: keyof NonNullable<ScanItem['discount']>, value: string) =>
    setExtracted((prev) => prev
      ? prev.map((c, i) => i === ci
          ? {
            ...c,
            items: c.items.map((it, j) => j === ii ? {
              ...it,
              discount: {
                ...(it.discount ?? { valueType: 'PERCENTAGE', value: '', title: '', startsAt: '', endsAt: '' }),
                [field]: value,
              },
            } : it),
          }
          : c)
      : prev);

  const toggleItemDiscount = (ci: number, ii: number) =>
    setExtracted((prev) => prev
      ? prev.map((c, i) => i === ci
          ? {
            ...c,
            items: c.items.map((it, j) => j === ii ? {
              ...it,
              discount: it.discount ? undefined : { valueType: 'PERCENTAGE', value: '', title: '', startsAt: '', endsAt: '' },
            } : it),
          }
          : c)
      : prev);

  const addItem = (ci: number) =>
    setExtracted((prev) => prev
      ? prev.map((c, i) => i === ci
          ? { ...c, items: [...c.items, { name: '', description: '', price: '0', currency: 'INR' }] }
          : c)
      : prev);

  const removeItem = (ci: number, ii: number) =>
    setExtracted((prev) => prev
      ? prev.map((c, i) => i === ci ? { ...c, items: c.items.filter((_, j) => j !== ii) } : c)
      : prev);

  const addCategory = () =>
    setExtracted((prev) => (prev ?? []).concat({ name: '', displayName: '', items: [] }));

  const handleImport = async () => {
    if (!extracted) return;
    setImporting(true);
    setImportError('');
    setImportSuccess('');
    try {
      const payload = extracted.map((cat) => ({
        ...cat,
        items: cat.items.map((item) => ({
          ...item,
          price: parseFloat(parseFloat(item.price).toFixed(2)),
          ...(item.discount ? {
            discount: {
              ...item.discount,
              value: parseFloat(item.discount.value) || 0,
            },
          } : {}),
        })),
      }));
      await api.post(`/branches/${branchId}/menu-bulk-upload`, { categories: payload });
      const totalItems = extracted.reduce((n, c) => n + c.items.length, 0);
      setImportSuccess(`Imported ${totalItems} item${totalItems !== 1 ? 's' : ''} across ${extracted.length} categor${extracted.length !== 1 ? 'ies' : 'y'}.`);
      setExtracted(null);
      setFile(null);
      setPreview(null);
      onImported();
    } catch (err: any) {
      const msg = err?.response?.data?.message;
      setImportError(Array.isArray(msg) ? msg.join(' ') : (msg ?? 'Import failed. Please try again.'));
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-sm space-y-5">
      <div>
        <h2 className="text-xl font-semibold text-[var(--tx)]">Scan Menu</h2>
        <p className="mt-1 text-sm text-[var(--tx-3)]">Upload a menu photo and we'll extract categories and items automatically.</p>
      </div>

      {/* Upload area */}
      <div className="grid gap-4 sm:grid-cols-[1fr_auto]">
        <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-[var(--border)] bg-[var(--surface-2)] p-6 text-center transition hover:border-[var(--accent)]">
          <svg viewBox="0 0 24 24" className="h-8 w-8 text-[var(--tx-3)]" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
          </svg>
          <span className="text-sm font-medium text-[var(--tx-2)]">{file ? file.name : 'Choose menu file'}</span>
          <span className="text-xs text-[var(--tx-3)]">Image · PDF · Excel (.xlsx / .xls) · CSV · max 25 MB</span>
          <input
            ref={fileRef}
            type="file"
            accept={SCAN_ACCEPT}
            className="hidden"
            onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
          />
        </label>
        {preview && (
          <div className="flex items-center justify-center rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-2">
            <img src={preview} alt="menu preview" className="h-32 w-32 rounded-xl object-contain" />
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={handleScan}
          disabled={!file || scanning}
          className="rounded-2xl bg-[var(--accent)] px-5 py-2.5 text-sm font-medium text-white transition hover:bg-[var(--accent-2)] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {scanning ? 'Extracting…' : 'Extract menu'}
        </button>
        <label className="cursor-pointer rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-5 py-2.5 text-sm font-medium text-[var(--tx-2)] transition hover:border-[var(--accent)] hover:text-[var(--accent)]">
          Take photo
          <input
            ref={cameraRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
          />
        </label>
        {file && (
          <button
            type="button"
            onClick={() => { setFile(null); setPreview(null); setExtracted(null); setScanError(''); }}
            className="rounded-2xl border border-[var(--border)] px-4 py-2.5 text-sm text-[var(--tx-3)] hover:border-rose-300 hover:text-rose-500 transition"
          >
            Clear
          </button>
        )}
      </div>
      {file && !isImageFile(file) && (
        <p className="text-xs text-[var(--tx-3)]">
          {file.type.includes('pdf') ? 'PDF detected — all pages will be sent for extraction.' : 'Spreadsheet detected — all rows will be parsed for menu items.'}
        </p>
      )}

      {scanError   && <p className="text-sm text-rose-600">{scanError}</p>}
      {importError && <p className="text-sm text-rose-600">{importError}</p>}
      {importSuccess && <p className="text-sm font-medium text-emerald-600">{importSuccess}</p>}

      {/* Extracted editor */}
      {extracted && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-[var(--tx)]">
              Review extracted menu before importing
            </p>
            <button type="button" onClick={addCategory} className="text-xs text-[var(--accent)] hover:underline">
              + Add category
            </button>
          </div>

          {extracted.map((cat, ci) => (
            <div key={ci} className="rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-4 space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <p className="text-xs font-medium text-[var(--tx-3)]">Category slug</p>
                  <input
                    value={cat.name}
                    onChange={(e) => updateCategory(ci, 'name', e.target.value)}
                    placeholder="e.g. starters"
                    className="mt-1 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--tx)] outline-none focus:border-[var(--accent)]"
                  />
                </div>
                <div>
                  <p className="text-xs font-medium text-[var(--tx-3)]">Display name</p>
                  <input
                    value={cat.displayName}
                    onChange={(e) => updateCategory(ci, 'displayName', e.target.value)}
                    placeholder="e.g. Starters"
                    className="mt-1 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--tx)] outline-none focus:border-[var(--accent)]"
                  />
                </div>
              </div>

              <div className="space-y-2">
                {cat.items.map((item, ii) => (
                  <div key={ii} className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3 space-y-2">
                    <div className="grid gap-2 sm:grid-cols-[1fr_auto_auto_auto_auto]">
                      <input
                        value={item.name}
                        onChange={(e) => updateItem(ci, ii, 'name', e.target.value)}
                        placeholder="Item name"
                        className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-1.5 text-sm text-[var(--tx)] outline-none focus:border-[var(--accent)]"
                      />
                      <input
                        type="number" min="0" step="0.01"
                        value={item.price}
                        onChange={(e) => updateItem(ci, ii, 'price', e.target.value)}
                        placeholder="Price"
                        className="w-24 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-2 py-1.5 text-sm text-[var(--tx)] outline-none focus:border-[var(--accent)]"
                      />
                      <input
                        value={item.currency}
                        onChange={(e) => updateItem(ci, ii, 'currency', e.target.value)}
                        placeholder="INR"
                        className="w-14 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-2 py-1.5 text-sm text-[var(--tx)] outline-none focus:border-[var(--accent)]"
                      />
                      <button
                        type="button"
                        onClick={() => toggleItemDiscount(ci, ii)}
                        className="rounded-lg border border-[var(--border)] px-2 py-1 text-xs text-[var(--tx-3)] hover:border-[var(--accent)] hover:text-[var(--accent)] transition"
                      >
                        {item.discount ? '− disc' : '+ disc'}
                      </button>
                      <button
                        type="button"
                        onClick={() => removeItem(ci, ii)}
                        className="rounded-lg border border-rose-200 px-2 py-1 text-xs text-rose-500 hover:bg-rose-50 transition"
                      >
                        ✕
                      </button>
                    </div>
                    <input
                      value={item.description ?? ''}
                      onChange={(e) => updateItem(ci, ii, 'description', e.target.value)}
                      placeholder="Description (optional)"
                      className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-1.5 text-xs text-[var(--tx-3)] outline-none focus:border-[var(--accent)]"
                    />
                    {item.discount && (
                      <div className="grid gap-2 sm:grid-cols-4 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] p-2">
                        <select
                          value={item.discount.valueType}
                          onChange={(e) => updateItemDiscount(ci, ii, 'valueType', e.target.value)}
                          className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2 py-1 text-xs text-[var(--tx)] outline-none focus:border-[var(--accent)]"
                        >
                          <option value="PERCENTAGE">% off</option>
                          <option value="FLAT">Flat off</option>
                        </select>
                        <input
                          type="number" min="0"
                          value={item.discount.value}
                          onChange={(e) => updateItemDiscount(ci, ii, 'value', e.target.value)}
                          placeholder="Amount"
                          className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2 py-1 text-xs text-[var(--tx)] outline-none"
                        />
                        <input
                          value={item.discount.title ?? ''}
                          onChange={(e) => updateItemDiscount(ci, ii, 'title', e.target.value)}
                          placeholder="Label (optional)"
                          className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2 py-1 text-xs text-[var(--tx)] outline-none"
                        />
                        <input
                          type="date"
                          value={item.discount.endsAt ?? ''}
                          onChange={(e) => updateItemDiscount(ci, ii, 'endsAt', e.target.value)}
                          className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2 py-1 text-xs text-[var(--tx)] outline-none"
                        />
                      </div>
                    )}
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => addItem(ci)}
                  className="text-xs text-[var(--accent)] hover:underline"
                >
                  + Add item
                </button>
              </div>
            </div>
          ))}

          <button
            type="button"
            disabled={importing}
            onClick={handleImport}
            className="w-full rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {importing
              ? 'Importing…'
              : `Import ${extracted.reduce((n, c) => n + c.items.length, 0)} items to menu`}
          </button>
        </div>
      )}
    </div>
  );
}

export default function BranchMenuPage() {
  const router = useRouter();
  const params = useParams();
  const restaurantId = params.id as string;
  const branchId = params.branchId as string;

  const [categories, setCategories] = useState<Category[]>([]);
  const [items, setItems] = useState<MenuItem[]>([]);
  const [categoryName, setCategoryName] = useState('');
  const [categoryDisplay, setCategoryDisplay] = useState('');
  const [itemName, setItemName] = useState('');
  const [itemDescription, setItemDescription] = useState('');
  const [itemPrice, setItemPrice] = useState('');
  const [itemCurrency, setItemCurrency] = useState('INR');
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [isVisible, setIsVisible] = useState(true);
  const [isInStock, setIsInStock] = useState(true);
  const [discountEnabled, setDiscountEnabled] = useState(false);
  const [discountValueType, setDiscountValueType] = useState<MenuPricingValueType>('PERCENTAGE');
  const [discountValue, setDiscountValue] = useState('');
  const [discountTitle, setDiscountTitle] = useState('');
  const [discountStartsAt, setDiscountStartsAt] = useState('');
  const [discountEndsAt, setDiscountEndsAt] = useState('');
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editItemName, setEditItemName] = useState('');
  const [editItemDescription, setEditItemDescription] = useState('');
  const [editItemPrice, setEditItemPrice] = useState('');
  const [editItemCurrency, setEditItemCurrency] = useState('INR');
  const [editDiscountEnabled, setEditDiscountEnabled] = useState(false);
  const [editDiscountValueType, setEditDiscountValueType] = useState<MenuPricingValueType>('PERCENTAGE');
  const [editDiscountValue, setEditDiscountValue] = useState('');
  const [editDiscountTitle, setEditDiscountTitle] = useState('');
  const [editDiscountStartsAt, setEditDiscountStartsAt] = useState('');
  const [editDiscountEndsAt, setEditDiscountEndsAt] = useState('');
  const [editChangeDescription, setEditChangeDescription] = useState('');
  const [submittingRequest, setSubmittingRequest] = useState(false);
  const [creatingItem, setCreatingItem] = useState(false);
  const [showCreateItemConfirm, setShowCreateItemConfirm] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const [expandedItemId, setExpandedItemId] = useState<string | null>(null);
  const [showScanPanel, setShowScanPanel] = useState(false);
  const [uploadingPhotoItemId, setUploadingPhotoItemId] = useState<string | null>(null);
  const [photoUploadTargetItemId, setPhotoUploadTargetItemId] = useState<string | null>(null);
  const [photoUploadSuccessItemId, setPhotoUploadSuccessItemId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [restrictedToggle, setRestrictedToggle] = useState<{ field: string; itemName: string } | null>(null);
  const [menuLoading, setMenuLoading] = useState(true);

  const canWrite = ['restaurant_admin', 'sales_operator', 'super_admin'].includes(userRole ?? '');
  const canCreate = ['restaurant_admin', 'restaurant_owner', 'super_admin'].includes(userRole ?? '');

  const fetchMenu = async (showLoader = false) => {
    if (showLoader) setMenuLoading(true);
    try {
      const [catRes, itemRes] = await Promise.all([
        api.get(`/branches/${branchId}/menu-categories`),
        api.get(`/branches/${branchId}/menu-items`),
      ]);
      setCategories(catRes.data);
      setItems(Array.isArray(itemRes.data)
        ? itemRes.data.map((item: any) => ({
            ...item,
            imageUrl: item.imageUrl ?? item.image_url,
          }))
        : itemRes.data);
    } catch (err) {
      console.error(err);
      setError('Unable to load menu.');
    } finally {
      setMenuLoading(false);
    }
  };

  useEffect(() => {
    setUserRole(getUserRole());
    fetchMenu(true);
  }, [branchId]);

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post(`/branches/${branchId}/menu-categories`, { name: categoryName, displayName: categoryDisplay });
      setCategoryName(''); setCategoryDisplay('');
      setMessage('Category added.'); setError('');
      fetchMenu();
    } catch { setError('Unable to create category.'); }
  };

  const handleCreateItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCategoryId) { setError('Please select a category first.'); return; }
    if (!itemName.trim()) { setError('Please enter an item name.'); return; }
    if (!itemPrice.trim() || Number(itemPrice) <= 0) { setError('Please enter a valid price.'); return; }
    setError('');
    setShowCreateItemConfirm(true);
  };

  const confirmCreateItem = async () => {
    setShowCreateItemConfirm(false);
    setCreatingItem(true);
    setError('');
    setMessage('');
    try {
      const payload: any = {
        categoryId: selectedCategoryId, name: itemName, description: itemDescription,
        price: Number(itemPrice), currency: itemCurrency, isVisible, isInStock,
      };
      if (discountEnabled && Number(discountValue) > 0) {
        payload.discount = {
          valueType: discountValueType,
          value: Number(discountValue),
          title: discountTitle || undefined,
          startsAt: discountStartsAt || undefined,
          endsAt: discountEndsAt || undefined,
        };
      }
      await api.post(`/branches/${branchId}/menu-items`, payload);
      setItemName(''); setItemDescription(''); setItemPrice(''); setItemCurrency('INR');
      setIsVisible(true); setIsInStock(true);
      setDiscountEnabled(false); setDiscountValueType('PERCENTAGE'); setDiscountValue('');
      setDiscountTitle(''); setDiscountStartsAt(''); setDiscountEndsAt('');
      setMessage('Item added.');
      fetchMenu();
    } catch {
      setError('Unable to create item.');
      setMessage('');
    } finally {
      setCreatingItem(false);
    }
  };

  const startEditItem = (item: MenuItem) => {
    if (editingItemId === item.id) {
      setEditingItemId(null);
      return;
    }
    setEditingItemId(item.id);
    setEditItemName(item.name); setEditItemDescription(item.description ?? '');
    setEditItemPrice(String(item.price)); setEditItemCurrency(item.currency);

    const discountRule = item.pricingRules?.find((rule) => rule.ruleType === 'DISCOUNT');
    if (discountRule) {
      setEditDiscountEnabled(true);
      setEditDiscountValueType(discountRule.valueType);
      setEditDiscountValue(String(discountRule.value));
      setEditDiscountTitle(discountRule.title ?? '');
      setEditDiscountStartsAt(discountRule.startsAt ?? '');
      setEditDiscountEndsAt(discountRule.endsAt ?? '');
    } else {
      setEditDiscountEnabled(false);
      setEditDiscountValueType('PERCENTAGE');
      setEditDiscountValue('');
      setEditDiscountTitle('');
      setEditDiscountStartsAt('');
      setEditDiscountEndsAt('');
    }

    setEditChangeDescription('');
    setError(''); setMessage('');
  };

  const resetEditState = () => {
    setEditingItemId(null);
    setEditDiscountEnabled(false);
    setEditDiscountValueType('PERCENTAGE');
    setEditDiscountValue('');
    setEditDiscountTitle('');
    setEditDiscountStartsAt('');
    setEditDiscountEndsAt('');
    setEditChangeDescription('');
  };

  const handleUpdateItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItemId) return;

    const needsApproval = userRole === 'restaurant_admin' || userRole === 'sales_operator';

    if (needsApproval) {
      if (!editChangeDescription.trim()) {
        setError('Please provide a reason for this change.');
        return;
      }
      setSubmittingRequest(true);
        try {
          const changes: Record<string, any> = {
            name: editItemName,
            description: editItemDescription,
            price: Number(editItemPrice),
            currency: editItemCurrency,
          };
          if (editDiscountEnabled && Number(editDiscountValue) > 0) {
            changes.discount = {
              valueType: editDiscountValueType,
              value: Number(editDiscountValue),
              title: editDiscountTitle || undefined,
              startsAt: editDiscountStartsAt || undefined,
              endsAt: editDiscountEndsAt || undefined,
            };
          }

          // Backend expects: { changeDescription, ...fields } (changes are top-level, not nested)
          await api.post(`/menu-items/${editingItemId}/change-requests`, {
            changeDescription: editChangeDescription.trim(),
            ...changes,
          });

          resetEditState();
          setMessage('Change request submitted for super-admin approval.');
          setError('');
        } catch (err: any) {
          const status = err?.response?.status;
          const msg = err?.response?.data?.message;
          if (status === 404) {
            setError('Change request endpoint not found on the server (404). Please verify backend routes.');
          } else {
            setError(Array.isArray(msg) ? msg.join(' ') : (msg ?? 'Unable to submit change request.'));
          }
          setMessage('');
        } finally {
          setSubmittingRequest(false);
        }
      return;
    }

    // super_admin: direct update
    try {
      await api.patch(`/menu-items/${editingItemId}`, {
        name: editItemName, description: editItemDescription,
        price: Number(editItemPrice), currency: editItemCurrency,
      });

      const existingDiscountRule = items.find(item => item.id === editingItemId)?.pricingRules?.find(rule => rule.ruleType === 'DISCOUNT');

      if (editDiscountEnabled && Number(editDiscountValue) > 0) {
        const discountData = {
          ruleType: 'DISCOUNT' as MenuPricingRuleType,
          valueType: editDiscountValueType,
          value: Number(editDiscountValue),
          title: editDiscountTitle || undefined,
          startsAt: editDiscountStartsAt || undefined,
          endsAt: editDiscountEndsAt || undefined,
        };
        if (existingDiscountRule) {
          await menuApi.updatePricingRule(existingDiscountRule.id, discountData);
        } else {
          await menuApi.createPricingRule(editingItemId, discountData);
        }
      } else if (existingDiscountRule) {
        await menuApi.updatePricingRule(existingDiscountRule.id, { isActive: false });
      }

      resetEditState();
      setMessage('Item updated.'); setError('');
      fetchMenu();
    } catch { setError('Unable to update item.'); setMessage(''); }
  };

  const toggleItemState = async (item: MenuItem, field: 'isVisible' | 'isInStock') => {
    if (userRole !== 'super_admin') {
      setRestrictedToggle({ field, itemName: item.name });
      return;
    }

    try {
      await api.patch(`/menu-items/${item.id}`, { [field]: !item[field] });
      setMessage('Item updated.'); setError('');
      fetchMenu();
    } catch { setError('Unable to update item status.'); setMessage(''); }
  };

  const handleStartPhotoUpload = (itemId: string) => {
    setPhotoUploadTargetItemId(itemId);
    fileInputRef.current?.click();
  };

  const handleItemPhotoSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const itemId = photoUploadTargetItemId;
    const file = e.target.files?.[0];
    if (!itemId || !file) return;

    setUploadingPhotoItemId(itemId);
    setPhotoUploadSuccessItemId(null);
    setMessage('');
    setError('');

    try {
      const formData = new FormData();
      formData.append('file', file);
      await api.patch(`/menu-items/${itemId}`, formData, {
        headers: { 'Content-Type': undefined },
      });
      setMessage('Item photo uploaded successfully.');
      setPhotoUploadSuccessItemId(itemId);
      window.setTimeout(() => {
        setPhotoUploadSuccessItemId((prev) => (prev === itemId ? null : prev));
      }, 4000);
      fetchMenu();
    } catch {
      setError('Unable to upload item photo.');
    } finally {
      setUploadingPhotoItemId(null);
      setPhotoUploadTargetItemId(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleViewInCustomerMenu = (item: MenuItem) => {
    router.push(`/customer/restaurants/${branchId}`);
  };

  const closeRestrictedModal = () => setRestrictedToggle(null);

  return (
    <AuthGuard requiredRoles={['super_admin', 'sales_operator', 'restaurant_owner', 'restaurant_admin', 'restaurant_manager', 'restaurant_staff']}>
      <div className="space-y-6">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleItemPhotoSelected}
        />

          {/* Restricted action modal */}
          {restrictedToggle && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
              <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl">
                <h2 className="text-xl font-semibold text-[var(--tx)]">Action restricted</h2>
                <p className="mt-3 text-sm text-[var(--tx-3)]">
                  Only a super admin can change the <strong>{restrictedToggle.field === 'isVisible' ? 'visibility' : 'stock status'}</strong> for <strong>{restrictedToggle.itemName}</strong>.
                </p>
                <div className="mt-6 flex justify-end gap-2">
                  <button type="button" onClick={closeRestrictedModal}
                    className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-sm text-[var(--tx-2)] hover:bg-[var(--surface-2)] transition">
                    Close
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Header */}
          <div className="rounded-3xl bg-[var(--surface)] p-8 shadow-lg">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h1 className="text-3xl font-semibold text-[var(--tx)]">Branch Menu</h1>
                <p className="mt-2 text-[var(--tx-3)]">Manage categories and items for this branch.</p>
              </div>
              <div className="flex flex-wrap gap-3">
                <button onClick={() => router.back()} className="rounded-2xl border border-[var(--border)] px-4 py-2 text-[var(--tx-2)] hover:border-[var(--accent)] hover:text-[var(--accent)] transition">
                  Back
                </button>
                <button onClick={() => router.push(`/restaurants/${restaurantId}/branches`)} className="rounded-2xl border border-[var(--border)] px-4 py-2 text-[var(--tx-2)] hover:border-[var(--accent)] hover:text-[var(--accent)] transition">
                  Branches
                </button>
                {canCreate && (
                  <button
                    onClick={() => setShowScanPanel((v) => !v)}
                    className={`rounded-2xl px-4 py-2 text-sm font-medium transition flex items-center gap-2 ${
                      showScanPanel
                        ? 'bg-[var(--accent)] text-white hover:bg-[var(--accent-2)]'
                        : 'bg-[var(--accent)] text-white hover:bg-[var(--accent-2)]'
                    }`}
                  >
                    <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
                      <rect x="2" y="2" width="16" height="16" rx="2"/>
                      <circle cx="7" cy="7" r="1.5"/>
                      <path d="M2 13l5-5 3 3 3-3 5 5"/>
                    </svg>
                    {showScanPanel ? 'Close scanner' : 'Scan menu'}
                  </button>
                )}
              </div>
            </div>
          </div>

          {(message || error) && (
            <div className={`rounded-3xl p-4 ${error ? 'bg-rose-50 text-rose-700' : 'bg-emerald-50 text-emerald-700'}`}>
              {error || message}
            </div>
          )}

          {/* Scan panel */}
          {canCreate && showScanPanel && (
            <ScanPanel
              branchId={branchId}
              onImported={() => {
                fetchMenu();
                setShowScanPanel(false);
              }}
            />
          )}

          {/* Create forms — only create roles */}
          {canCreate && (
            <div className="grid gap-6 xl:grid-cols-[1fr_1.2fr]">
              <div className="rounded-3xl bg-[var(--surface)] p-6 shadow-sm border border-[var(--border)]">
                <h2 className="text-xl font-semibold text-[var(--tx)]">Create category</h2>
                <form className="mt-4 space-y-4" onSubmit={handleCreateCategory}>
                  <label className="block space-y-2">
                    <span className="text-sm font-medium text-[var(--tx-2)]">Internal name</span>
                    <input value={categoryName} onChange={(e) => setCategoryName(e.target.value)}
                      className={INPUT} placeholder="e.g. appetizers" required />
                  </label>
                  <label className="block space-y-2">
                    <span className="text-sm font-medium text-[var(--tx-2)]">Display name</span>
                    <input value={categoryDisplay} onChange={(e) => setCategoryDisplay(e.target.value)}
                      className={INPUT} placeholder="e.g. Appetizers" required />
                  </label>
                  <button type="submit" className="rounded-2xl bg-[var(--accent)] px-5 py-3 text-sm text-white hover:bg-[var(--accent-2)] transition">
                    Add category
                  </button>
                </form>
              </div>

              <div className="rounded-3xl bg-[var(--surface)] p-6 shadow-sm border border-[var(--border)]">
                <h2 className="text-xl font-semibold text-[var(--tx)]">Create item</h2>
                <form className="mt-4 space-y-4" onSubmit={handleCreateItem}>
                  <label className="block space-y-2">
                    <span className="text-sm font-medium text-[var(--tx-2)]">Category</span>
                    <select value={selectedCategoryId} onChange={(e) => setSelectedCategoryId(e.target.value)}
                      className={INPUT} required>
                      <option value="">Select a category</option>
                      {categories.map((c) => <option key={c.id} value={c.id}>{c.displayName}</option>)}
                    </select>
                  </label>
                  <label className="block space-y-2">
                    <span className="text-sm font-medium text-[var(--tx-2)]">Name</span>
                    <input value={itemName} onChange={(e) => setItemName(e.target.value)}
                      className={INPUT} placeholder="e.g. Chicken Biryani" required />
                  </label>
                  <label className="block space-y-2">
                    <span className="text-sm font-medium text-[var(--tx-2)]">Description</span>
                    <textarea value={itemDescription} onChange={(e) => setItemDescription(e.target.value)}
                      className={INPUT} rows={2} placeholder="Optional" />
                  </label>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="block space-y-2">
                      <span className="text-sm font-medium text-[var(--tx-2)]">Price</span>
                      <input value={itemPrice} onChange={(e) => setItemPrice(e.target.value)}
                        type="number" step="0.01" min="0" className={INPUT} placeholder="100.00" required />
                    </label>
                    <label className="block space-y-2">
                      <span className="text-sm font-medium text-[var(--tx-2)]">Currency</span>
                      <input value={itemCurrency} onChange={(e) => setItemCurrency(e.target.value)}
                        className={INPUT} required />
                    </label>
                  </div>
                  <div className="flex flex-col gap-3">
                    <div className="flex flex-wrap items-center gap-3">
                      <label className="inline-flex items-center gap-2 text-sm text-[var(--tx-2)]">
                        <input type="checkbox" checked={isVisible} onChange={(e) => setIsVisible(e.target.checked)}
                          className="h-4 w-4 rounded border-[var(--border)] accent-[var(--accent)]" /> Visible
                      </label>
                      <label className="inline-flex items-center gap-2 text-sm text-[var(--tx-2)]">
                        <input type="checkbox" checked={isInStock} onChange={(e) => setIsInStock(e.target.checked)}
                          className="h-4 w-4 rounded border-[var(--border)] accent-[var(--accent)]" /> In stock
                      </label>
                      <button type="button" onClick={() => setDiscountEnabled((prev) => !prev)}
                        className="rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm text-[var(--tx-2)] hover:border-[var(--accent)] hover:text-[var(--accent)] transition">
                        {discountEnabled ? 'Remove discount' : 'Add discount'}
                      </button>
                    </div>
                    {discountEnabled && (
                      <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-4 space-y-3">
                        <div className="grid gap-4 sm:grid-cols-2">
                          <label className="block space-y-2">
                            <span className="text-sm font-medium text-[var(--tx-2)]">Discount type</span>
                            <select value={discountValueType} onChange={(e) => setDiscountValueType(e.target.value as MenuPricingValueType)}
                              className={INPUT}>
                              <option value="PERCENTAGE">Percentage</option>
                              <option value="FLAT">Flat amount</option>
                            </select>
                          </label>
                          <label className="block space-y-2">
                            <span className="text-sm font-medium text-[var(--tx-2)]">Discount amount</span>
                            <input value={discountValue} onChange={(e) => setDiscountValue(e.target.value)}
                              type="number" step="0.01" min="0" className={INPUT} placeholder="10" />
                          </label>
                        </div>
                        <div className="grid gap-4 sm:grid-cols-2">
                          <label className="block space-y-2">
                            <span className="text-sm font-medium text-[var(--tx-2)]">Title</span>
                            <input value={discountTitle} onChange={(e) => setDiscountTitle(e.target.value)} className={INPUT} placeholder="Weekend sale" />
                          </label>
                          <label className="block space-y-2">
                            <span className="text-sm font-medium text-[var(--tx-2)]">Valid until</span>
                            <input value={discountEndsAt} onChange={(e) => setDiscountEndsAt(e.target.value)} type="date" className={INPUT} />
                          </label>
                        </div>
                      </div>
                    )}
                  </div>
                  <button type="submit" className="rounded-2xl bg-[var(--accent)] px-5 py-3 text-sm text-white hover:bg-[var(--accent-2)] transition">
                    Add item
                  </button>
                </form>
              </div>
            </div>
          )}

          {showCreateItemConfirm && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
              <div className="w-full max-w-lg rounded-3xl bg-[var(--surface)] p-8 shadow-2xl">
                <h2 className="text-2xl font-semibold text-[var(--tx)]">Confirm item creation</h2>
                <p className="mt-3 text-sm text-[var(--tx-3)]">
                  You are about to add a new menu item. Confirm to create this item under the selected category.
                </p>
                <div className="mt-6 grid gap-3 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={confirmCreateItem}
                    disabled={creatingItem}
                    className="rounded-2xl bg-[var(--accent)] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[var(--accent-2)] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {creatingItem ? 'Creating…' : 'Confirm add item'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowCreateItemConfirm(false)}
                    className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-5 py-3 text-sm font-semibold text-[var(--tx-2)] transition hover:bg-[var(--surface-2)]"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Menu overview */}
          <div className="rounded-3xl bg-[var(--surface)] p-6 shadow-sm border border-[var(--border)]">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-xl font-semibold text-[var(--tx)]">Menu overview</h2>
              {!menuLoading && categories.length > 0 && (
                <span className="text-xs text-[var(--tx-3)]">
                  {categories.length} categories · {items.length} items
                </span>
              )}
            </div>

            {menuLoading ? (
              <div className="mt-4 space-y-4 animate-pulse">
                {[1, 2].map((n) => (
                  <div key={n} className="rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-4">
                    <div className="h-5 w-32 rounded-full bg-[var(--border)]" />
                    <div className="mt-3 h-24 rounded-xl bg-[var(--border)]" />
                  </div>
                ))}
              </div>
            ) : categories.length === 0 ? (
              <p className="mt-4 text-sm text-[var(--tx-3)]">
                No categories yet.{canWrite ? ' Create one above or scan a menu.' : ''}
              </p>
            ) : (
              <div className="mt-4 space-y-6">
                {categories.map((category) => {
                  const catItems = items.filter((it) => it.category.id === category.id);
                  return (
                    <div key={category.id} className="overflow-hidden rounded-2xl border border-[var(--border)]">
                      {/* Category header */}
                      <div className="flex items-center justify-between border-b border-[var(--border)] bg-[var(--surface-2)] px-5 py-3">
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-semibold text-[var(--tx)]">{category.displayName}</span>
                          <span className="rounded-full bg-[var(--accent-muted)] px-2 py-0.5 text-xs font-medium text-[var(--accent)]">{catItems.length} items</span>
                        </div>
                        <span className="text-xs text-[var(--tx-3)]">{category.name}</span>
                      </div>

                      {catItems.length === 0 ? (
                        <p className="px-5 py-4 text-sm text-[var(--tx-3)] italic">No items in this category yet.</p>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="border-b border-[var(--border)] bg-[var(--surface-2)] text-left text-xs font-medium uppercase tracking-wide text-[var(--tx-3)]">
                                <th className="px-5 py-3">Item</th>
                                <th className="px-5 py-3">Description</th>
                                <th className="px-5 py-3 text-right">Price</th>
                                <th className="px-5 py-3 text-center">Stock</th>
                                <th className="px-5 py-3 text-center">Visible</th>
                                <th className="px-5 py-3 text-center">Photo</th>
                                {canWrite && <th className="px-5 py-3 text-right">Actions</th>}
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-[var(--border-sub)]">
                              {catItems.map((item, idx) => {
                                const discount = item.pricingRules?.find((rule) => rule.ruleType === 'DISCOUNT');
                                const discountLabel = discount
                                  ? discount.valueType === 'PERCENTAGE'
                                    ? `${discount.value}% off`
                                    : `₹${discount.value} off`
                                  : null;
                                const itemDescription = item.description ? (
                                  item.description
                                ) : (
                                  <span className="italic text-[var(--tx-3)]">—</span>
                                );

                                return (
                                  <React.Fragment key={item.id}>
                                    <tr className={`transition hover:bg-[var(--surface-2)] ${idx % 2 === 0 ? 'bg-[var(--surface)]' : 'bg-[var(--surface-2)]/40'}`}>
                                      <td className="px-5 py-3.5 font-medium text-[var(--tx)] whitespace-nowrap">
                                        <div className="flex flex-wrap items-center gap-2">
                                          <span>{item.name}</span>
                                          {discountLabel && (
                                            <span className="ml-2 inline-flex rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em]">
                                              {discountLabel}
                                            </span>
                                          )}
                                        </div>
                                      </td>
                                      <td className="px-5 py-3.5 text-[var(--tx-3)] max-w-xs">
                                        <span className="line-clamp-2">{itemDescription}</span>
                                      </td>
                                      <td className="px-5 py-3.5 text-right font-semibold text-[var(--tx)] whitespace-nowrap">
                                        {item.currency} {Number(item.price).toFixed(2)}
                                      </td>
                                      <td className="px-5 py-3.5 text-center">
                                        <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                                          item.isInStock
                                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400'
                                            : 'bg-rose-100 text-rose-600 dark:bg-rose-500/15 dark:text-rose-400'
                                        }`}>
                                          {item.isInStock ? 'In stock' : 'Out of stock'}
                                        </span>
                                      </td>
                                      <td className="px-5 py-3.5 text-center">
                                        <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                                          item.isVisible ? 'bg-[var(--accent-muted)] text-[var(--accent)]' : 'bg-[var(--surface-2)] text-[var(--tx-3)]'
                                        }`}>
                                          {item.isVisible ? 'Visible' : 'Hidden'}
                                        </span>
                                      </td>
                                      <td className="px-5 py-3.5 text-center">
                                        <div className="flex items-center justify-center gap-2">
                                          {item.imageUrl ? (
                                            <>
                                              <button
                                                type="button"
                                                onClick={() => handleViewInCustomerMenu(item)}
                                                title="View this item in customer menu"
                                                className="group rounded-full border border-[var(--border)] bg-[var(--surface-2)] p-1 transition hover:border-[var(--accent)]"
                                              >
                                                <img src={resolveMediaUrl(item.imageUrl)} alt={item.name} className="h-9 w-9 rounded-full object-cover" />
                                              </button>
                                              {canWrite && (
                                                <button
                                                  type="button"
                                                  onClick={() => handleStartPhotoUpload(item.id)}
                                                  title="Replace item photo"
                                                  className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--surface-2)] text-[var(--tx-2)] transition hover:border-[var(--accent)] hover:text-[var(--accent)]"
                                                >
                                                  📸
                                                </button>
                                              )}
                                            </>
                                          ) : (
                                            <button
                                              type="button"
                                              onClick={() => handleStartPhotoUpload(item.id)}
                                              title="Upload item photo"
                                              className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--surface-2)] text-[var(--tx-2)] transition hover:border-[var(--accent)] hover:text-[var(--accent)]"
                                            >
                                              📸
                                            </button>
                                          )}
                                          {uploadingPhotoItemId === item.id && (
                                            <span className="text-[10px] text-[var(--tx-3)]">Uploading…</span>
                                          )}
                                          {photoUploadSuccessItemId === item.id && (
                                            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                                              Uploaded
                                            </span>
                                          )}
                                        </div>
                                      </td>
                                      <td className="px-5 py-3.5 text-right">
                                        <div className="flex items-center justify-end gap-1.5">
                                          {canWrite && (
                                            <>
                                              <button
                                                type="button"
                                                onClick={() => startEditItem(item)}
                                                className={`rounded-lg border px-2.5 py-1 text-xs font-medium transition ${editingItemId === item.id ? 'border-[var(--accent)] bg-[var(--accent)] text-white' : 'border-[var(--border)] bg-[var(--surface-2)] text-[var(--tx-2)] hover:border-[var(--accent)] hover:text-[var(--accent)]'}`}
                                              >
                                                {editingItemId === item.id ? 'Close' : 'Edit'}
                                              </button>
                                              {/* In Stock toggle */}
                                              <button
                                                type="button"
                                                onClick={() => toggleItemState(item, 'isInStock')}
                                                title={item.isInStock ? 'Mark out of stock' : 'Mark in stock'}
                                                className="flex items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-2 py-1 transition hover:border-[var(--accent)]"
                                              >
                                                <span className={`relative inline-flex h-4 w-7 shrink-0 rounded-full transition-colors duration-200 ${item.isInStock ? 'bg-emerald-500' : 'bg-slate-300'}`}>
                                                  <span className={`inline-block h-3 w-3 rounded-full bg-white shadow transition-transform duration-200 absolute top-0.5 ${item.isInStock ? 'translate-x-3.5' : 'translate-x-0.5'}`} />
                                                </span>
                                                <span className={`text-xs font-medium ${item.isInStock ? 'text-emerald-700' : 'text-slate-500'}`}>
                                                  {item.isInStock ? 'In stock' : 'Out of stock'}
                                                </span>
                                              </button>
                                              {/* Visible toggle */}
                                              <button
                                                type="button"
                                                onClick={() => toggleItemState(item, 'isVisible')}
                                                title={item.isVisible ? 'Hide item' : 'Show item'}
                                                className="flex items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-2 py-1 transition hover:border-[var(--accent)]"
                                              >
                                                <span className={`relative inline-flex h-4 w-7 shrink-0 rounded-full transition-colors duration-200 ${item.isVisible ? 'bg-[var(--accent)]' : 'bg-slate-300'}`}>
                                                  <span className={`inline-block h-3 w-3 rounded-full bg-white shadow transition-transform duration-200 absolute top-0.5 ${item.isVisible ? 'translate-x-3.5' : 'translate-x-0.5'}`} />
                                                </span>
                                                <span className={`text-xs font-medium ${item.isVisible ? 'text-[var(--accent)]' : 'text-slate-500'}`}>
                                                  {item.isVisible ? 'Visible' : 'Hidden'}
                                                </span>
                                              </button>
                                            </>
                                          )}
                                          <button
                                            type="button"
                                            onClick={() => setExpandedItemId((prev) => prev === item.id ? null : item.id)}
                                            className={`rounded-lg border px-2.5 py-1 text-xs font-medium transition ${expandedItemId === item.id ? 'border-[var(--accent)] bg-[var(--accent)] text-white' : 'border-[var(--border)] bg-[var(--surface-2)] text-[var(--tx-2)] hover:border-[var(--accent)] hover:text-[var(--accent)]'}`}
                                          >
                                            {expandedItemId === item.id ? 'Close' : 'Addons / Rules'}
                                          </button>
                                        </div>
                                      </td>
                                    </tr>
                                    {editingItemId === item.id && (
                                      <tr>
                                        <td colSpan={6} className="p-0">
                                          <div className="border-t border-[var(--border)] bg-[var(--surface-2)] px-5 py-4 space-y-4">
                                            <p className="text-xs font-semibold uppercase tracking-widest text-[var(--tx-3)]">{item.name} — Edit</p>
                                            <form onSubmit={handleUpdateItem} className="space-y-4">
                                              <div className="grid gap-4 sm:grid-cols-2">
                                                <label className="block space-y-2">
                                                  <span className="text-sm font-medium text-[var(--tx-2)]">Name</span>
                                                  <input value={editItemName} onChange={(e) => setEditItemName(e.target.value)} className={INPUT} required />
                                                </label>
                                                <label className="block space-y-2">
                                                  <span className="text-sm font-medium text-[var(--tx-2)]">Description</span>
                                                  <input value={editItemDescription} onChange={(e) => setEditItemDescription(e.target.value)} className={INPUT} />
                                                </label>
                                              </div>
                                              <div className="grid gap-4 sm:grid-cols-2">
                                                <label className="block space-y-2">
                                                  <span className="text-sm font-medium text-[var(--tx-2)]">Price</span>
                                                  <input value={editItemPrice} onChange={(e) => setEditItemPrice(e.target.value)}
                                                    type="number" step="0.01" min="0" className={INPUT} required />
                                                </label>
                                                <label className="block space-y-2">
                                                  <span className="text-sm font-medium text-[var(--tx-2)]">Currency</span>
                                                  <input value={editItemCurrency} onChange={(e) => setEditItemCurrency(e.target.value)} className={INPUT} required />
                                                </label>
                                              </div>
                                              <div className="space-y-3">
                                                <button type="button" onClick={() => setEditDiscountEnabled((prev) => !prev)}
                                                  className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--tx-2)] hover:border-[var(--accent)] hover:text-[var(--accent)] transition">
                                                  {editDiscountEnabled ? 'Remove discount' : 'Add discount'}
                                                </button>
                                                {editDiscountEnabled && (
                                                  <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 space-y-3">
                                                    <div className="grid gap-4 sm:grid-cols-2">
                                                      <label className="block space-y-2">
                                                        <span className="text-sm font-medium text-[var(--tx-2)]">Discount type</span>
                                                        <select value={editDiscountValueType} onChange={(e) => setEditDiscountValueType(e.target.value as MenuPricingValueType)} className={INPUT}>
                                                          <option value="PERCENTAGE">Percentage</option>
                                                          <option value="FLAT">Flat amount</option>
                                                        </select>
                                                      </label>
                                                      <label className="block space-y-2">
                                                        <span className="text-sm font-medium text-[var(--tx-2)]">Discount amount</span>
                                                        <input value={editDiscountValue} onChange={(e) => setEditDiscountValue(e.target.value)}
                                                          type="number" step="0.01" min="0" className={INPUT} placeholder="10" />
                                                      </label>
                                                    </div>
                                                    <div className="grid gap-4 sm:grid-cols-2">
                                                      <label className="block space-y-2">
                                                        <span className="text-sm font-medium text-[var(--tx-2)]">Title</span>
                                                        <input value={editDiscountTitle} onChange={(e) => setEditDiscountTitle(e.target.value)} className={INPUT} placeholder="Weekend sale" />
                                                      </label>
                                                      <label className="block space-y-2">
                                                        <span className="text-sm font-medium text-[var(--tx-2)]">Valid until</span>
                                                        <input value={editDiscountEndsAt} onChange={(e) => setEditDiscountEndsAt(e.target.value)} type="date" className={INPUT} />
                                                      </label>
                                                    </div>
                                                  </div>
                                                )}
                                              </div>
                                              {(userRole === 'restaurant_admin' || userRole === 'sales_operator') && (
                                                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 space-y-2">
                                                  <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide">Requires super-admin approval</p>
                                                  <label className="block space-y-2">
                                                    <span className="text-sm font-medium text-[var(--tx-2)]">Reason for change <span className="text-rose-500">*</span></span>
                                                    <textarea
                                                      value={editChangeDescription}
                                                      onChange={(e) => setEditChangeDescription(e.target.value)}
                                                      className={INPUT}
                                                      rows={3}
                                                      placeholder="Explain why you are making this change…"
                                                      required
                                                    />
                                                  </label>
                                                </div>
                                              )}
                                              <div className="flex flex-wrap gap-3">
                                                <button
                                                  type="submit"
                                                  disabled={submittingRequest}
                                                  className="rounded-2xl bg-[var(--accent)] px-5 py-3 text-sm text-white transition hover:bg-[var(--accent-2)] disabled:opacity-60 disabled:cursor-not-allowed"
                                                >
                                                  {(userRole === 'restaurant_admin' || userRole === 'sales_operator')
                                                    ? (submittingRequest ? 'Submitting…' : 'Submit for approval')
                                                    : 'Save changes'}
                                                </button>
                                                <button type="button" onClick={resetEditState} className="rounded-2xl border border-[var(--border)] px-5 py-3 text-sm text-[var(--tx-2)] hover:border-[var(--accent)] hover:text-[var(--accent)] transition">Cancel</button>
                                              </div>
                                            </form>
                                          </div>
                                        </td>
                                      </tr>
                                    )}
                                    {expandedItemId === item.id && (
                                      <tr>
                                        <td colSpan={6} className="p-0">
                                          <ItemDetailPanel itemId={item.id} itemName={item.name} canWrite={canWrite} />
                                        </td>
                                      </tr>
                                    )}
                                  </React.Fragment>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

      </div>
    </AuthGuard>
  );
}