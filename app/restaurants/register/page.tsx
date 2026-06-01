'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '../../../lib/api';
import { getUserRole } from '../../../lib/auth';
import AuthGuard from '../../components/AuthGuard';

// ─── Types ────────────────────────────────────────────────────────────────────

type FormFields = {
  name: string; ownerName: string; email: string; phone: string;
  legalEntityName: string;
  address: string; city: string; state: string; zipCode: string;
  gstNumber: string; fssaiNumber: string;
  gstExpiryDate: string; fssaiExpiryDate: string;
  bankName: string; bankAccountHolderName: string; bankAccountNumber: string;
  bankAccountNumberConfirm: string; accountType: 'SAVINGS' | 'CURRENT' | '';
  ifscCode: string; panNumber: string;
  leadSource: string; brandDescription: string; cuisineTags: string;
  serviceRadiusKm: string; temporaryClosure: string; holidayMode: string;
  gstPresent: string;
};
type FormErrors = Partial<Record<keyof FormFields, string>>;

type ScanItem = { name: string; description?: string; price: string; currency: string };
type ScanCategory = { name: string; displayName: string; items: ScanItem[] };

const EMPTY_FORM: FormFields = {
  name: '', ownerName: '', email: '', phone: '', address: '', city: '',
  legalEntityName: '',
  state: '', zipCode: '', gstNumber: '',
  fssaiNumber: '', gstExpiryDate: '', fssaiExpiryDate: '',
  bankName: '', bankAccountHolderName: '', bankAccountNumber: '', bankAccountNumberConfirm: '',
  accountType: '', ifscCode: '', panNumber: '',
  leadSource: '', brandDescription: '', cuisineTags: '', serviceRadiusKm: '',
  temporaryClosure: '', holidayMode: '',
  gstPresent: '',
};

const BRAND_DESC_MAX = 500;

// ─── Validation ───────────────────────────────────────────────────────────────

function validate(form: FormFields): FormErrors {
  const errors: FormErrors = {};

  if (!form.name.trim()) errors.name = 'Required.';
  else if (form.name.trim().length < 2) errors.name = 'Minimum 2 characters.';

  if (!form.legalEntityName.trim()) errors.legalEntityName = 'Required.';
  else if (form.legalEntityName.trim().length < 2) errors.legalEntityName = 'Minimum 2 characters.';

  if (!form.ownerName.trim()) errors.ownerName = 'Required.';
  else if (form.ownerName.trim().length < 2) errors.ownerName = 'Minimum 2 characters.';

  if (!form.email.trim()) errors.email = 'Required.';
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) errors.email = 'Invalid email address.';

  if (!form.phone.trim()) errors.phone = 'Required.';
  else if (!/^[6-9]\d{9}$/.test(form.phone)) errors.phone = 'Must be a valid 10-digit mobile number starting with 6–9.';

  if (!form.address.trim()) errors.address = 'Required.';
  if (!form.city.trim()) errors.city = 'Required.';
  if (!form.state.trim()) errors.state = 'Required.';

  if (!form.zipCode.trim()) errors.zipCode = 'Required.';
  else if (!/^\d{6}$/.test(form.zipCode)) errors.zipCode = 'Must be exactly 6 digits.';

  if (form.gstNumber && !/^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/.test(form.gstNumber))
    errors.gstNumber = 'Invalid GSTIN format.';

  if (form.fssaiNumber && !/^\d{14}$/.test(form.fssaiNumber))
    errors.fssaiNumber = 'Must be exactly 14 digits.';

  if (form.bankAccountNumber && !/^\d{9,18}$/.test(form.bankAccountNumber))
    errors.bankAccountNumber = 'Must be 9–18 digits.';

  if (form.bankAccountNumberConfirm && form.bankAccountNumberConfirm !== form.bankAccountNumber)
    errors.bankAccountNumberConfirm = 'Account numbers do not match.';

  if (form.accountType && !['SAVINGS', 'CURRENT'].includes(form.accountType))
    errors.accountType = 'Invalid account type.';

  if (form.panNumber && !/^[A-Z]{5}\d{4}[A-Z]$/.test(form.panNumber.toUpperCase()))
    errors.panNumber = 'Invalid PAN format.';

  if (form.ifscCode && !/^[A-Z]{4}0[A-Z0-9]{6}$/.test(form.ifscCode))
    errors.ifscCode = 'Format: 4 letters + 0 + 6 alphanumeric (e.g. SBIN0001234).';

  if (form.serviceRadiusKm) {
    const r = Number(form.serviceRadiusKm);
    if (isNaN(r) || r <= 0 || r > 500) errors.serviceRadiusKm = 'Must be between 0.1 and 500 km.';
  }

  return errors;
}

// ─── Key / paste helpers ──────────────────────────────────────────────────────

const PASS_THROUGH = ['Backspace', 'Delete', 'Tab', 'ArrowLeft', 'ArrowRight', 'Home', 'End'];

function allowDigitsOnly(e: React.KeyboardEvent<HTMLInputElement>) {
  if (PASS_THROUGH.includes(e.key) || e.ctrlKey || e.metaKey) return;
  if (!/^\d$/.test(e.key)) e.preventDefault();
}

function allowLettersSpaces(e: React.KeyboardEvent<HTMLInputElement>) {
  if (PASS_THROUGH.includes(e.key) || e.ctrlKey || e.metaKey) return;
  if (!/^[a-zA-Z\s]$/.test(e.key)) e.preventDefault();
}

function blockNumberExtras(e: React.KeyboardEvent<HTMLInputElement>) {
  // Prevent e, +, - in numeric inputs
  if (['-', '+', 'e', 'E'].includes(e.key)) e.preventDefault();
}

// ─── Styles ───────────────────────────────────────────────────────────────────

// Base input styles: keep fixed height and consistent appearance for inputs and selects
const BASE = 'mt-2 w-full rounded-2xl border-4 px-4 py-3 outline-none transition focus:border-[var(--accent)] text-sm bg-[var(--surface)] text-[var(--tx)] border-[var(--border)] h-12 appearance-none';
const OK   = `${BASE} `;
const ERR  = `${BASE} border-rose-500`;
const FILE = 'mt-2 w-full cursor-pointer rounded-2xl border-4 border-[var(--border)] bg-[var(--surface)] px-4 py-2.5 text-sm text-[var(--tx-3)] transition hover:border-[var(--accent)] disabled:cursor-not-allowed disabled:opacity-50 file:mr-3 file:cursor-pointer file:rounded-xl file:border-0 file:bg-[var(--accent)] file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-white';

// ─── Field wrapper ────────────────────────────────────────────────────────────

function Field({ label, required, error, hint, children }: {
  label: string; required?: boolean; error?: string; hint?: string; children: React.ReactNode;
}) {
  return (
    <label className="block">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-medium text-[var(--tx-2)]">
          {label}{required && <span className="ml-0.5 text-rose-500">*</span>}
        </span>
        {hint && <span className="text-xs text-[var(--tx-3)]">{hint}</span>}
      </div>
      {children}
      {error && <p className="mt-1 text-xs text-rose-600">{error}</p>}
    </label>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function RestaurantRegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState<FormFields>(EMPTY_FORM);
  const [errors, setErrors] = useState<FormErrors>({});
  const [touched, setTouched] = useState<Partial<Record<keyof FormFields, boolean>>>({});
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [serverError, setServerError] = useState('');
  const [reviewConfirmed, setReviewConfirmed] = useState(false);
  const [panFile, setPanFile] = useState<File | null>(null);
  const [gstFile, setGstFile] = useState<File | null>(null);
  const [fssaiFile, setFssaiFile] = useState<File | null>(null);
  const [bankFile, setBankFile] = useState<File | null>(null);
  const [menuFile, setMenuFile] = useState<File | null>(null);
  const [menuPreview, setMenuPreview] = useState<string | null>(null);
  const [menuScanStatus, setMenuScanStatus] = useState<'idle' | 'scanning'>('idle');
  const [menuScanError, setMenuScanError] = useState('');
  const [menuExtracted, setMenuExtracted] = useState<ScanCategory[] | null>(null);
  const [editingItem, setEditingItem] = useState<{ ci: number; ii: number } | null>(null);
  const [editingPrice, setEditingPrice] = useState('');
  const [panVerifyStatus, setPanVerifyStatus] = useState<'idle' | 'verifying' | 'success' | 'failed'>('idle');
  const [panVerifyMessage, setPanVerifyMessage] = useState('');
  const [panVerifiedName, setPanVerifiedName] = useState('');
  const [panDob, setPanDob] = useState('');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [geoStatus, setGeoStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  const [registeredRestaurantId, setRegisteredRestaurantId] = useState<string | null>(null);
  const [coverPhotoFile, setCoverPhotoFile] = useState<File | null>(null);
  const [menuMode, setMenuMode] = useState<'upload' | 'manual'>('upload');
  const [manualCatDraft, setManualCatDraft] = useState('');
  const [manualItemDraft, setManualItemDraft] = useState<{
    ci: number; name: string; description: string; price: string; currency: string;
  } | null>(null);

  const commitPriceEdit = () => {
    if (!editingItem || !menuExtracted) { setEditingItem(null); return; }
    const { ci, ii } = editingItem;
    setMenuExtracted(menuExtracted.map((cat, cIdx) =>
      cIdx !== ci ? cat : {
        ...cat,
        items: cat.items.map((item, iIdx) =>
          iIdx !== ii ? item : { ...item, price: editingPrice.trim() || item.price }
        ),
      }
    ));
    setEditingItem(null);
  };

  const handleVerifyPan = async () => {
    const pan = form.panNumber.trim().toUpperCase();
    if (!/^[A-Z]{5}\d{4}[A-Z]$/.test(pan)) {
      setPanVerifyMessage('Enter a valid 10-character PAN before verifying.');
      setPanVerifyStatus('failed');
      return;
    }
    setPanVerifyStatus('verifying');
    setPanVerifyMessage('');
    setPanVerifiedName('');
    try {
      // Convert YYYY-MM-DD → DD/MM/YYYY for sandbox API
      const dobFormatted = panDob
        ? panDob.split('-').reverse().join('/')
        : undefined;

      const res = await api.post('/restaurants/verify-pan', {
        pan,
        name: form.ownerName.trim() || undefined,
        dateOfBirth: dobFormatted,
      });
      if (res.data?.valid) {
        setPanVerifiedName(res.data.name || '');
        setPanVerifyMessage(res.data.message || 'PAN verified successfully');
        setPanVerifyStatus('success');
      } else {
        setPanVerifyMessage(res.data?.message || 'PAN could not be verified.');
        setPanVerifyStatus('failed');
      }
    } catch (err: any) {
      setPanVerifyMessage(err?.response?.data?.message || 'Verification service unavailable. Please try again.');
      setPanVerifyStatus('failed');
    }
  };

  useEffect(() => { getUserRole(); }, []);

  const handleAutoCapture = () => {
    if (!navigator.geolocation) {
      setGeoStatus('error');
      return;
    }
    setGeoStatus('loading');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLatitude(pos.coords.latitude.toFixed(6));
        setLongitude(pos.coords.longitude.toFixed(6));
        setGeoStatus('idle');
      },
      () => setGeoStatus('error'),
    );
  };

  const step1Fields: Array<keyof FormFields> = [
    'name', 'ownerName', 'email', 'phone', 'address', 'city', 'state', 'zipCode',
    'legalEntityName',
  ];

  const validateStep1 = (currentForm: FormFields) => {
    const allErrors = validate(currentForm);
    return step1Fields.reduce((acc, field) => {
      if (allErrors[field]) acc[field] = allErrors[field];
      return acc;
    }, {} as FormErrors);
  };


  const validateStep2 = (currentForm: FormFields) => {
    const allErrors = validate(currentForm);
    const fields: Array<keyof FormFields> = [
      'gstNumber', 'gstExpiryDate', 'fssaiNumber', 'fssaiExpiryDate',
      'bankName', 'bankAccountHolderName', 'bankAccountNumber', 'bankAccountNumberConfirm',
      'accountType', 'ifscCode', 'panNumber',
    ];
    return fields.reduce((acc, field) => {
      if (allErrors[field]) acc[field] = allErrors[field];
      return acc;
    }, {} as FormErrors);
  };

  // Step 1 → 2: validate only, no API call yet
  const handleProceed = () => {
    setServerError('');
    const touchedFields = step1Fields.reduce(
      (acc, field) => ({ ...acc, [field]: true }), {} as Record<keyof FormFields, boolean>,
    );
    setTouched((prev) => ({ ...prev, ...touchedFields }));
    const stepErrors = validateStep1(form);
    setErrors((prev) => ({ ...prev, ...stepErrors }));
    if (Object.keys(stepErrors).length > 0) {
      setServerError('Please fix the highlighted fields before proceeding.');
      return;
    }
    setStep(2);
  };

  // Step 2 → 3: validate only, no API call yet
  const handleProceedStep2 = () => {
    setServerError('');
    const stepErrors = validateStep2(form);
    setErrors((prev) => ({ ...prev, ...stepErrors }));
    if (Object.keys(stepErrors).length > 0) {
      setServerError('Please fix the highlighted fields before proceeding to the next step.');
      return;
    }
    setStep(3);
  };

  // Change + live validation for touched fields
  const set = (field: keyof FormFields, value: string) => {
    const next = { ...form, [field]: value };
    setForm(next);
    setReviewConfirmed(false);
    if (touched[field]) {
      const e = validate(next);
      setErrors((prev) => ({ ...prev, [field]: e[field] }));
    }
  };

  const blur = (field: keyof FormFields) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    const e = validate(form);
    setErrors((prev) => ({ ...prev, [field]: e[field] }));
  };

  // Generic base props
  const p = (field: keyof FormFields) => ({
    value: form[field] ?? '',
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => set(field, e.target.value),
    onBlur: () => blur(field),
    className: errors[field] ? ERR : OK,
  });

  const optionalString = (value: string) => (value?.trim() ? value.trim() : undefined);

  // Final submit: send ALL data to the DB in a single call only when step 3 is complete
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError('');

    const allTouched = Object.keys(EMPTY_FORM).reduce(
      (a, k) => ({ ...a, [k]: true }), {} as Record<keyof FormFields, boolean>,
    );
    setTouched(allTouched);
    const errs = validate(form);
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    if (!reviewConfirmed) {
      setServerError('Please confirm that you have reviewed all details before submitting.');
      return;
    }

    setSubmitStatus('loading');
    try {
      // Single call — creates the restaurant record for the first time
      const res = await api.post('/restaurants', {
        name: optionalString(form.name),
        legalEntity: optionalString(form.legalEntityName),
        ownerName: optionalString(form.ownerName),
        email: optionalString(form.email),
        phone: optionalString(form.phone),
        address: optionalString(form.address),
        city: optionalString(form.city),
        state: optionalString(form.state),
        zipCode: optionalString(form.zipCode),
        latitude: latitude ? parseFloat(latitude) : 0,
        longitude: longitude ? parseFloat(longitude) : 0,
        leadSource: optionalString(form.leadSource),
        gstNumber: optionalString(form.gstNumber),
        gstExpiryDate: optionalString(form.gstExpiryDate),
        fssaiNumber: optionalString(form.fssaiNumber),
        fssaiExpiryDate: optionalString(form.fssaiExpiryDate),
        bankName: optionalString(form.bankName),
        bankAccountHolderName: optionalString(form.bankAccountHolderName),
        bankAccountNumber: optionalString(form.bankAccountNumber),
        bankAccountNumberConfirm: optionalString(form.bankAccountNumberConfirm),
        accountType: optionalString(form.accountType),
        ifscCode: optionalString(form.ifscCode),
        panNumber: optionalString(form.panNumber),
        gstPresent: form.gstPresent === 'yes',
        brandDescription: optionalString(form.brandDescription),
        cuisineTags: form.cuisineTags ? form.cuisineTags.split(',').map((t) => t.trim()).filter(Boolean) : [],
        serviceRadiusKm: form.serviceRadiusKm ? Number(form.serviceRadiusKm) : undefined,
        temporaryClosure: form.temporaryClosure === 'true',
        holidayMode: form.holidayMode === 'true',
        menuExtractedJson: menuExtracted ? JSON.stringify(menuExtracted) : undefined,
        status: 'review',
      });

      const restaurantId = res.data.id;
      setRegisteredRestaurantId(restaurantId);

      // Upload documents (PAN, GST, FSSAI, BANK) now that we have the ID
      for (const { type, file } of [
        { type: 'PAN',   file: panFile   },
        { type: 'GST',   file: gstFile   },
        { type: 'FSSAI', file: fssaiFile },
        { type: 'BANK',  file: bankFile  },
      ]) {
        if (!file) continue;
        const fd = new FormData();
        fd.append('file', file);
        fd.append('type', type);
        try {
          await api.post(`/restaurants/${restaurantId}/documents/registration`, fd, {
            headers: { 'Content-Type': 'multipart/form-data' },
          });
        } catch { /* non-fatal */ }
      }

      // Upload cover photo if provided
      if (coverPhotoFile) {
        const fd = new FormData();
        fd.append('file', coverPhotoFile);
        try {
          await api.post(`/restaurants/${restaurantId}/register/step3/cover-photo`, fd, {
            headers: { 'Content-Type': 'multipart/form-data' },
          });
        } catch { /* non-fatal */ }
      }

      setSubmitStatus('success');
      setTimeout(() => router.push(`/restaurants/${restaurantId}`), 1500);
    } catch (err: any) {
      setSubmitStatus('error');
      const code = err?.response?.status;
      const msg  = err?.response?.data?.message;
      if (code === 400 && msg) setServerError(Array.isArray(msg) ? msg.join(' ') : msg);
      else if (code === 409) setServerError('A restaurant with this email, phone, or address already exists.');
      else setServerError('Could not register restaurant. Please check your inputs and try again.');
    }
  };

  const MENU_SCAN_ACCEPT = 'image/*,.pdf,.xlsx,.xls,.csv';
  const MENU_SCAN_MAX = 25 * 1024 * 1024;

  const isMenuImage = (f: File) => f.type.startsWith('image/');

  const handleMenuFile = (file: File | null) => {
    if (!file) {
      setMenuFile(null);
      setMenuPreview(null);
      setMenuScanError('');
      return;
    }
    if (file.size > MENU_SCAN_MAX) {
      setMenuFile(null);
      setMenuPreview(null);
      setMenuScanError('File must be under 25 MB.');
      return;
    }
    setMenuScanError('');
    setMenuFile(file);
    setMenuPreview(isMenuImage(file) ? URL.createObjectURL(file) : null);
  };

  const handleMenuScan = () => {
    if (!menuFile) {
      setMenuScanError('Please select a menu file before scanning.');
      return;
    }
    setMenuScanError('');
    setMenuScanStatus('scanning');
    (async () => {
      try {
        const { b64, mime } = isMenuImage(menuFile)
          ? await compressAndEncode(menuFile)
          : await fileToBase64(menuFile);
        try {
          const res = await api.post('/menu-scan', { imageBase64: b64, mimeType: mime });
          const cats: ScanCategory[] = (res.data.categories ?? []).map((c: any) => ({
            name: c.name ?? '', displayName: c.displayName ?? '',
            items: (c.items ?? []).map((i: any) => ({ name: i.name ?? '', description: i.description ?? '', price: String(i.price ?? 0), currency: i.currency ?? 'INR' })),
          }));
          setMenuExtracted(cats.length ? cats : [{ name: 'scanned', displayName: 'Scanned menu', items: [{ name: 'Scanned item', price: '0', currency: 'INR' }] }]);
        } catch (err: any) {
          if (err?.response?.status === 404) {
            setMenuExtracted([{ name: 'scanned', displayName: 'Scanned menu (preview)', items: [{ name: 'Scanned item', price: '0', currency: 'INR' }] }]);
          } else {
            setMenuScanError('Failed to extract menu. Please try again.');
          }
        }
      } catch {
        setMenuScanError('Failed to read file for scanning.');
      } finally {
        setMenuScanStatus('idle');
      }
    })();
  };

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

  // Paste: strip non-digits, apply maxLength
  const pasteDigits = (field: keyof FormFields, max: number) => (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const cleaned = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, max);
    set(field, cleaned);
  };

  // Compact ScanPanel used in registration step 3. Allows selecting an image, scanning (server if available),
  // previewing extracted categories and attaching them to the registration payload.
  function ScanPanel({
    menuFile, menuPreview, menuScanStatus, menuScanError, onFile, onScan, onAttach,
  }: {
    menuFile: File | null; menuPreview: string | null; menuScanStatus: 'idle' | 'scanning'; menuScanError: string;
    onFile: (f: File | null) => void; onScan: () => void; onAttach: (cats: ScanCategory[] | null) => void;
  }) {
    return (
      <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface-2)] p-5 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-[var(--tx)]">Upload menu file</h2>
            <p className="mt-1 text-sm text-[var(--tx-3)]">Upload an image, PDF (multi-page) or Excel/CSV to extract menu items automatically.</p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <button
              type="button"
              onClick={onScan}
              disabled={!menuFile || menuScanStatus === 'scanning'}
              className="rounded-2xl bg-[var(--accent)] px-4 py-3 text-sm font-medium text-white transition hover:bg-[var(--accent-2)] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {menuScanStatus === 'scanning' ? 'Extracting…' : 'Extract menu'}
            </button>
            <span className="text-xs text-[var(--tx-3)]">Image · PDF · Excel · CSV · max 25 MB</span>
          </div>
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-[minmax(0,1fr)_180px] items-start">
          <label className="block rounded-2xl border border-dashed border-[var(--border)] bg-[var(--surface)] p-4 text-sm text-[var(--tx-2)] transition hover:border-[var(--accent)]">
            <span className="font-medium">{menuFile ? menuFile.name : 'Choose menu file'}</span>
            <input
              type="file"
              accept={MENU_SCAN_ACCEPT}
              onChange={(e) => onFile(e.target.files ? e.target.files[0] : null)}
              className="mt-3 block w-full cursor-pointer text-sm text-[var(--tx-3)]"
            />
          </label>
          {menuPreview && (
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-3">
              {menuPreview ? (
                <>
                  <p className="mb-2 text-sm font-medium text-[var(--tx-2)]">Preview</p>
                  <img src={menuPreview} alt="menu preview" className="h-40 w-full rounded-2xl object-contain" />
                </>
              ) : menuFile ? (
                <div className="flex h-40 flex-col items-center justify-center gap-2 text-[var(--tx-3)]">
                  <svg viewBox="0 0 24 24" className="h-10 w-10 text-[var(--accent)]" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/>
                  </svg>
                  <p className="text-xs font-medium text-[var(--tx-2)]">{menuFile.name}</p>
                  <p className="text-xs text-[var(--tx-3)]">{(menuFile.size / 1024).toFixed(0)} KB</p>
                </div>
              ) : null}
            </div>
          )}
        </div>

        {menuScanError && <p className="mt-3 text-sm text-rose-600">{menuScanError}</p>}

        <div className="mt-4 space-y-4">
          <Field label="Referral name" hint="Optional">
            <input value={form.leadSource} onChange={(e) => set('leadSource', e.target.value)} className={OK} />
          </Field>

          <Field label="Brand description" hint={`Optional · up to ${BRAND_DESC_MAX} chars`}>
            <textarea value={form.brandDescription} onChange={(e) => set('brandDescription', e.target.value)} className={OK} maxLength={BRAND_DESC_MAX} rows={3} />
            <p className="mt-1 text-xs text-[var(--tx-3)]">{(form.brandDescription || '').length}/{BRAND_DESC_MAX}</p>
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Cuisine tags" hint="Comma-separated (e.g. North Indian, Chinese)">
              <input value={form.cuisineTags} onChange={(e) => set('cuisineTags', e.target.value)} className={OK} />
            </Field>
            <Field label="Service radius (km)" hint="Optional">
              <input value={form.serviceRadiusKm} onChange={(e) => set('serviceRadiusKm', e.target.value)} className={OK} type="number" step="0.1" min="0" onKeyDown={blockNumberExtras} />
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-[var(--tx-2)] mb-2">Temporary closure</label>
              <div className="flex items-center gap-3">
                <label className="relative inline-flex cursor-pointer items-center">
                  <input
                    type="checkbox"
                    checked={form.temporaryClosure === 'true'}
                    onChange={(e) => set('temporaryClosure', e.target.checked ? 'true' : 'false')}
                    className="peer sr-only"
                  />
                  <span className="block h-6 w-12 rounded-full border-4 border-[var(--border)] bg-[var(--surface)] transition-colors duration-200 peer-checked:bg-[var(--accent)]" />
                  <span className="pointer-events-none absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow-md transition-all duration-200 peer-checked:translate-x-6 peer-checked:shadow-lg peer-checked:shadow-[var(--accent)]/50" />
                </label>
                <span className={`text-sm font-semibold ${form.temporaryClosure === 'true' ? 'text-[var(--accent)]' : 'text-[var(--tx-2)]'}`}>
                  {form.temporaryClosure === 'true' ? 'ON' : 'OFF'}
                </span>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--tx-2)] mb-2">Holiday mode</label>
              <div className="flex items-center gap-3">
                <label className="relative inline-flex cursor-pointer items-center">
                  <input
                    type="checkbox"
                    checked={form.holidayMode === 'true'}
                    onChange={(e) => set('holidayMode', e.target.checked ? 'true' : 'false')}
                    className="peer sr-only"
                  />
                  <span className="block h-6 w-12 rounded-full border-4 border-[var(--border)] bg-[var(--surface)] transition-colors duration-200 peer-checked:bg-[var(--accent)]" />
                  <span className="pointer-events-none absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow-md transition-all duration-200 peer-checked:translate-x-6 peer-checked:shadow-lg peer-checked:shadow-[var(--accent)]/50" />
                </label>
                <span className={`text-sm font-semibold ${form.holidayMode === 'true' ? 'text-[var(--accent)]' : 'text-[var(--tx-2)]'}`}>
                  {form.holidayMode === 'true' ? 'ON' : 'OFF'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {menuExtracted && (
          <div className="mt-4 space-y-4">
            <p className="text-sm font-semibold">Extracted menu preview</p>
            {menuExtracted.map((category, ci) => (
              <div key={ci} className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-sm">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-base font-semibold text-[var(--tx)]">{category.displayName || category.name}</p>
                    {category.name && <p className="text-xs text-[var(--tx-3)]">Category slug: {category.name}</p>}
                  </div>
                </div>
                <div className="mt-4 space-y-3">
                  {category.items.map((item, ii) => {
                    const isEditing = editingItem?.ci === ci && editingItem?.ii === ii;
                    return (
                      <div key={ii} className="rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-3">
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                          <div>
                            <p className="font-semibold text-[var(--tx)]">{item.name || 'Unnamed item'}</p>
                            {item.description && <p className="text-sm text-[var(--tx-2)]">{item.description}</p>}
                          </div>
                          {isEditing ? (
                            <div className="flex items-center gap-1.5 shrink-0">
                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={editingPrice}
                                autoFocus
                                onChange={(e) => setEditingPrice(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') { e.preventDefault(); commitPriceEdit(); }
                                  if (e.key === 'Escape') setEditingItem(null);
                                }}
                                onBlur={commitPriceEdit}
                                className="w-24 rounded-lg border border-[var(--accent)] bg-[var(--surface)] px-2 py-1 text-sm font-semibold text-[var(--tx)] outline-none focus:ring-1 focus:ring-[var(--accent)]"
                              />
                              <span className="text-xs text-[var(--tx-3)]">{item.currency}</span>
                              <button
                                type="button"
                                onMouseDown={(e) => { e.preventDefault(); commitPriceEdit(); }}
                                className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-600 text-white hover:bg-emerald-700"
                                title="Confirm"
                              >
                                <svg viewBox="0 0 16 16" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                                  <path d="M2.5 8l4 4 7-7" />
                                </svg>
                              </button>
                              <button
                                type="button"
                                onMouseDown={(e) => { e.preventDefault(); setEditingItem(null); }}
                                className="flex h-6 w-6 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--surface)] text-[var(--tx-3)] hover:bg-[var(--surface-2)]"
                                title="Cancel"
                              >
                                <svg viewBox="0 0 16 16" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round">
                                  <path d="M4 4l8 8M12 4l-8 8" />
                                </svg>
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1.5 shrink-0">
                              <p className="text-sm font-semibold text-[var(--tx)]">{item.price} {item.currency}</p>
                              <button
                                type="button"
                                onClick={() => { setEditingItem({ ci, ii }); setEditingPrice(item.price); }}
                                className="flex h-6 w-6 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--surface)] text-[var(--tx-3)] transition hover:border-[var(--accent)] hover:text-[var(--accent)]"
                                title="Edit price"
                              >
                                <svg viewBox="0 0 16 16" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
                                  <path d="M11.5 2.5a1.414 1.414 0 012 2L5 13H3v-2L11.5 2.5z" />
                                </svg>
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-4 rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-5 text-sm text-[var(--tx-2)]">
          <p className="font-semibold">Review details before registering</p>
          <ul className="mt-3 space-y-2">
            <li><strong>Restaurant:</strong> {form.name}</li>
            <li><strong>Owner:</strong> {form.ownerName}</li>
            <li><strong>Email:</strong> {form.email}</li>
            <li><strong>Phone:</strong> {form.phone}</li>
            <li><strong>FSSAI:</strong> {form.fssaiNumber || 'N/A'}</li>
            <li><strong>GST present:</strong> {form.gstPresent === 'yes' ? 'Yes' : 'No'}</li>
            <li><strong>Bank:</strong> {form.bankName || 'N/A'}</li>
            <li><strong>Menu image:</strong> {menuFile?.name || 'None selected'}</li>
          </ul>
        </div>
      </div>
    );
  }

  return (
    <AuthGuard requiredRoles={['super_admin', 'sales_operator']}>
      <div className="flex justify-center">
        <div className="w-full max-w-3xl rounded-3xl bg-[var(--surface)] p-8 shadow-lg">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-3xl border border-[var(--border)] bg-[var(--surface-2)] p-3 shadow-sm">
              <img
                src="/foodeez-sidebar-logo.png"
                alt="FooDeeZ logo"
                className="h-full w-full object-contain"
              />
            </div>
            <div>
              <h1 className="text-3xl font-semibold text-[var(--tx)]">Register Restaurant</h1>
              <p className="mt-1 text-[var(--tx-3)]">Create a new restaurant partner. Login credentials are sent automatically.</p>
            </div>
          </div>
          <p className="mt-4 text-xs text-[var(--tx-3)]">Fields marked <span className="text-rose-500">*</span> are required.</p>

          {submitStatus === 'success' && (
            <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-700">
              Restaurant submitted for review. Redirecting…
            </div>
          )}
          {serverError && (
            <div className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
              {serverError}
            </div>
          )}

          <form className="mt-8 space-y-6" onSubmit={handleSubmit} noValidate>
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-[var(--border)] bg-[var(--surface-2)] px-4 py-3 text-sm text-[var(--tx-3)]">
              <span className="font-semibold text-[var(--tx)]">Step {step} of 3</span>
              <span>
                {step === 1 ? 'Restaurant details and location'
                  : step === 2 ? 'Compliance, banking and business details'
                  : 'Upload menu and submit registration for super-admin review'}
              </span>
            </div>

            {step === 1 && (
              <>
                <div className="grid gap-4 sm:grid-cols-3">
                  <Field label="Restaurant name" required error={errors.name} hint="As per FSSAI">
                    <input {...p('name')} maxLength={100} autoComplete="organization" />
                  </Field>
                  <Field label="Legal entity name" required error={errors.legalEntityName}>
                    <input {...p('legalEntityName')} maxLength={100} autoComplete="organization" />
                  </Field>
                  <Field label="Owner name" required error={errors.ownerName}>
                    <input
                      {...p('ownerName')}
                      maxLength={100}
                      onKeyDown={allowLettersSpaces}
                      onPaste={(e) => {
                        e.preventDefault();
                        const cleaned = e.clipboardData.getData('text').replace(/[^a-zA-Z\s]/g, '').slice(0, 100);
                        set('ownerName', cleaned);
                      }}
                    />
                  </Field>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Email" required error={errors.email}>
                    <input
                      type="email"
                      {...p('email')}
                      maxLength={254}
                      autoComplete="email"
                      inputMode="email"
                    />
                  </Field>
                  <Field label="Phone" required error={errors.phone} hint="10 digits">
                    <input
                      type="tel"
                      {...p('phone')}
                      maxLength={10}
                      inputMode="numeric"
                      placeholder="e.g. 9876543210"
                      onKeyDown={allowDigitsOnly}
                      onPaste={pasteDigits('phone', 10)}
                      onChange={(e) => set('phone', e.target.value.replace(/\D/g, '').slice(0, 10))}
                    />
                  </Field>
                </div>

                <Field label="Address" required error={errors.address} hint="As per FSSAI">
                  <input {...p('address')} maxLength={255} />
                </Field>

                <div className="grid gap-4 sm:grid-cols-3">
                  <Field label="City" required error={errors.city}>
                    <input
                      {...p('city')}
                      maxLength={100}
                      onKeyDown={allowLettersSpaces}
                      onPaste={(e) => {
                        e.preventDefault();
                        set('city', e.clipboardData.getData('text').replace(/[^a-zA-Z\s]/g, '').slice(0, 100));
                      }}
                    />
                  </Field>
                  <Field label="State" required error={errors.state}>
                    <input
                      {...p('state')}
                      maxLength={100}
                      onKeyDown={allowLettersSpaces}
                      onPaste={(e) => {
                        e.preventDefault();
                        set('state', e.clipboardData.getData('text').replace(/[^a-zA-Z\s]/g, '').slice(0, 100));
                      }}
                    />
                  </Field>
                  <Field label="PIN code" required error={errors.zipCode} hint="6 digits">
                    <input
                      {...p('zipCode')}
                      type="tel"
                      maxLength={6}
                      inputMode="numeric"
                      placeholder="110001"
                      onKeyDown={allowDigitsOnly}
                      onPaste={pasteDigits('zipCode', 6)}
                      onChange={(e) => set('zipCode', e.target.value.replace(/\D/g, '').slice(0, 6))}
                    />
                  </Field>
                </div>

                {/* Location coordinates */}
                <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-5 space-y-4">
                  <p className="text-xs font-semibold uppercase tracking-widest text-[var(--tx-3)]">Location coordinates</p>
                  <button
                    type="button"
                    onClick={handleAutoCapture}
                    disabled={geoStatus === 'loading'}
                    className="rounded-2xl bg-[var(--accent)] px-4 py-2.5 text-sm text-white transition hover:bg-[var(--accent-2)] disabled:opacity-60"
                  >
                    {geoStatus === 'loading' ? 'Detecting…' : 'Auto-capture from browser'}
                  </button>
                  {geoStatus === 'error' && (
                    <p className="text-xs text-rose-600">Could not get location. Please enter manually or allow browser access.</p>
                  )}
                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="block">
                      <span className="text-sm font-medium text-[var(--tx-2)]">Latitude</span>
                      <input
                        type="text"
                        value={latitude}
                        onChange={(e) => setLatitude(e.target.value)}
                        placeholder="e.g. 28.6139"
                        className={OK}
                      />
                    </label>
                    <label className="block">
                      <span className="text-sm font-medium text-[var(--tx-2)]">Longitude</span>
                      <input
                        type="text"
                        value={longitude}
                        onChange={(e) => setLongitude(e.target.value)}
                        placeholder="e.g. 77.2090"
                        className={OK}
                      />
                    </label>
                  </div>
                </div>

                <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    onClick={handleProceed}
                    className="w-full rounded-2xl bg-[var(--accent)] px-4 py-3 text-white transition hover:bg-[var(--accent-2)] sm:w-auto"
                  >
                    Proceed to second step
                  </button>
                </div>
              </>
            )}

            {step === 2 && (
              <>
                {/* Step nav */}
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => { setStep(1); setServerError(''); }}
                    className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 py-2.5 text-sm text-[var(--tx-2)] transition hover:border-[var(--accent)] hover:text-[var(--accent)]"
                  >
                    ← Step 1
                  </button>
                  <span className="text-sm text-[var(--tx-3)]">Compliance, banking and document uploads</span>
                </div>

                {/* ── Compliance ── */}
                <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-5 space-y-4">
                  <p className="text-xs font-semibold uppercase tracking-widest text-[var(--tx-3)]">Compliance</p>

                  <Field label="Is GST available?" hint="Select yes to show GST fields">
                    <select
                      value={form.gstPresent}
                      onChange={(e) => {
                        const value = e.target.value;
                        set('gstPresent', value);
                        if (value !== 'yes') setGstFile(null);
                      }}
                      className={OK}
                    >
                      <option value="">Select</option>
                      <option value="yes">Yes</option>
                      <option value="no">No</option>
                    </select>
                  </Field>

                  {form.gstPresent === 'yes' && (
                    <div className="grid gap-4 sm:grid-cols-2">
                      <Field label="GSTIN" error={errors.gstNumber} hint="optional · 15 chars">
                        <input
                          {...p('gstNumber')}
                          maxLength={15}
                          placeholder="22AAAAA0000A1Z5"
                          onChange={(e) => set('gstNumber', e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 15))}
                        />
                      </Field>
                      <Field label="GST Expiry Date" error={errors.gstExpiryDate} hint="optional">
                        <input type="date" {...p('gstExpiryDate')} />
                      </Field>
                    </div>
                  )}

                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="FSSAI number" error={errors.fssaiNumber} hint="optional · 14 digits">
                      <input
                        {...p('fssaiNumber')}
                        type="tel"
                        maxLength={14}
                        inputMode="numeric"
                        placeholder="12345678901234"
                        onKeyDown={allowDigitsOnly}
                        onPaste={pasteDigits('fssaiNumber', 14)}
                        onChange={(e) => set('fssaiNumber', e.target.value.replace(/\D/g, '').slice(0, 14))}
                      />
                    </Field>
                    <Field label="FSSAI Expiry Date" error={errors.fssaiExpiryDate} hint="optional">
                      <input type="date" {...p('fssaiExpiryDate')} />
                    </Field>
                  </div>

                  <Field label="PAN number" error={errors.panNumber} hint="10 chars">
                    <input
                      {...p('panNumber')}
                      maxLength={10}
                      placeholder="AAAAA1234A"
                      onChange={(e) => set('panNumber', e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10))}
                    />
                  </Field>

                  <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-4 space-y-3">
                    <p className="text-xs font-semibold uppercase tracking-widest text-[var(--tx-3)]">PAN Verification</p>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <label className="block">
                        <span className="text-sm font-medium text-[var(--tx-2)]">Name as per PAN</span>
                        <input
                          type="text"
                          value={form.ownerName}
                          readOnly
                          className={`${OK} opacity-70 cursor-not-allowed`}
                          placeholder="Auto-filled from owner name"
                        />
                      </label>
                      <label className="block">
                        <span className="text-sm font-medium text-[var(--tx-2)]">Date of birth <span className="text-[var(--tx-3)] font-normal">(as per PAN)</span></span>
                        <input
                          type="date"
                          value={panDob}
                          onChange={(e) => setPanDob(e.target.value)}
                          max={new Date().toISOString().split('T')[0]}
                          className={OK}
                        />
                      </label>
                    </div>
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={handleVerifyPan}
                        disabled={!form.panNumber || !/^[A-Z]{5}\d{4}[A-Z]$/.test(form.panNumber.toUpperCase()) || !panDob}
                        className="rounded-2xl bg-[var(--accent)] px-5 py-2.5 text-sm font-medium text-white transition hover:bg-[var(--accent-2)] disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Verify PAN
                      </button>
                      {!panDob && form.panNumber && /^[A-Z]{5}\d{4}[A-Z]$/.test(form.panNumber.toUpperCase()) && (
                        <p className="text-xs text-[var(--tx-3)]">Enter date of birth to enable verification</p>
                      )}
                      {panVerifyStatus === 'success' && (
                        <p className="flex items-center gap-1 text-xs text-emerald-600">
                          <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                            <path d="M2.5 8l4 4 7-7" />
                          </svg>
                          {panVerifiedName ? `Verified · ${panVerifiedName}` : 'Format valid'}
                        </p>
                      )}
                    </div>
                  </div>

                </div>

                {/* ── Banking ── */}
                <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-5 space-y-4">
                  <p className="text-xs font-semibold uppercase tracking-widest text-[var(--tx-3)]">Banking</p>

                  {/* Row 1: Bank name · Account type · Account holder name */}
                  <div className="grid gap-4 sm:grid-cols-3">
                    <Field label="Bank name" error={errors.bankName}>
                      <input {...p('bankName')} maxLength={100} />
                    </Field>
                    <Field label="Account type" error={errors.accountType}>
                      <select
                        value={form.accountType ?? ''}
                        onChange={(e) => set('accountType', e.target.value)}
                        onBlur={() => blur('accountType')}
                        className={errors.accountType ? ERR : OK}
                      >
                        <option value="">Select account type</option>
                        <option value="SAVINGS">Savings</option>
                        <option value="CURRENT">Current</option>
                      </select>
                    </Field>
                    <Field label="Account holder name" error={errors.bankAccountHolderName}>
                      <input {...p('bankAccountHolderName')} maxLength={100} />
                    </Field>
                  </div>

                  {/* Row 2: Account number · Confirm · IFSC — each in equal column */}
                  <div className="grid gap-4 sm:grid-cols-3">
                    <Field label="Account number" error={errors.bankAccountNumber} hint="9–18 digits">
                      <input
                        {...p('bankAccountNumber')}
                        type="tel"
                        maxLength={18}
                        inputMode="numeric"
                        onKeyDown={allowDigitsOnly}
                        onPaste={pasteDigits('bankAccountNumber', 18)}
                        onChange={(e) => set('bankAccountNumber', e.target.value.replace(/\D/g, '').slice(0, 18))}
                      />
                    </Field>
                    <Field label="Confirm account no." error={errors.bankAccountNumberConfirm} hint="Re-enter">
                      <input
                        {...p('bankAccountNumberConfirm')}
                        type="tel"
                        maxLength={18}
                        inputMode="numeric"
                        onKeyDown={allowDigitsOnly}
                        onPaste={pasteDigits('bankAccountNumberConfirm', 18)}
                        onChange={(e) => set('bankAccountNumberConfirm', e.target.value.replace(/\D/g, '').slice(0, 18))}
                      />
                    </Field>
                    <Field label="IFSC code" error={errors.ifscCode} hint="11 chars">
                      <input
                        {...p('ifscCode')}
                        maxLength={11}
                        placeholder="SBIN0001234"
                        onChange={(e) => set('ifscCode', e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 11))}
                      />
                    </Field>
                  </div>
                </div>

                {/* ── Document Uploads ── */}
                <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-5 space-y-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-widest text-[var(--tx-3)]">Document Uploads</p>
                    <p className="mt-1 text-xs text-[var(--tx-3)]">All optional · PDF, JPG, PNG accepted</p>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Upload PAN card" hint="optional">
                      <input
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png"
                        onChange={(e) => setPanFile(e.target.files ? e.target.files[0] : null)}
                        className={FILE}
                      />
                      {panFile && <p className="mt-1 text-xs text-[var(--tx-3)]">Selected: {panFile.name}</p>}
                    </Field>

                    <Field label="Upload GST document" hint={form.gstPresent !== 'yes' ? 'Set GST = Yes first' : 'optional'}>
                      <input
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png"
                        onChange={(e) => setGstFile(e.target.files ? e.target.files[0] : null)}
                        className={FILE}
                        disabled={form.gstPresent !== 'yes'}
                      />
                      {form.gstPresent !== 'yes'
                        ? <p className="mt-1 text-xs text-[var(--tx-3)]">Enable GST availability above first.</p>
                        : gstFile && <p className="mt-1 text-xs text-[var(--tx-3)]">Selected: {gstFile.name}</p>
                      }
                    </Field>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Upload FSSAI document" hint="After entering FSSAI number">
                      <input
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png"
                        onChange={(e) => setFssaiFile(e.target.files ? e.target.files[0] : null)}
                        className={FILE}
                        disabled={!(form.fssaiNumber && /^\d{14}$/.test(form.fssaiNumber))}
                      />
                      {!form.fssaiNumber || !/^\d{14}$/.test(form.fssaiNumber)
                        ? <p className="mt-1 text-xs text-[var(--tx-3)]">Enter a valid 14-digit FSSAI to enable.</p>
                        : fssaiFile && <p className="mt-1 text-xs text-[var(--tx-3)]">Selected: {fssaiFile.name}</p>
                      }
                    </Field>

                    <Field label="Upload Bank document" hint="After filling bank details">
                      <input
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png"
                        onChange={(e) => setBankFile(e.target.files ? e.target.files[0] : null)}
                        className={FILE}
                        disabled={!(form.bankName && form.bankAccountNumber && form.ifscCode)}
                      />
                      {!(form.bankName && form.bankAccountNumber && form.ifscCode)
                        ? <p className="mt-1 text-xs text-[var(--tx-3)]">Fill bank name, account and IFSC to enable.</p>
                        : bankFile && <p className="mt-1 text-xs text-[var(--tx-3)]">Selected: {bankFile.name}</p>
                      }
                    </Field>
                  </div>
                </div>

                {/* Navigation */}
                <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    onClick={() => { setStep(1); setServerError(''); }}
                    className="w-full rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-sm text-[var(--tx-2)] transition hover:border-[var(--accent)] hover:text-[var(--accent)] sm:w-auto"
                  >
                    ← Back to step 1
                  </button>
                  <button
                    type="button"
                    onClick={handleProceedStep2}
                    className="w-full rounded-2xl bg-[var(--accent)] px-6 py-3 text-white transition hover:bg-[var(--accent-2)] sm:w-auto"
                  >
                    Proceed to step 3 →
                  </button>
                </div>
              </>
            )}
            {step === 3 && (
              <>
                <div className="flex items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => { setStep(2); setServerError(''); }}
                    className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-sm text-[var(--tx-2)] transition hover:border-[var(--accent)] hover:text-[var(--accent)]"
                  >
                    ← Back to second step
                  </button>
                  <span className="text-sm text-[var(--tx-3)]">Review, upload menu and submit registration for super-admin review</span>
                </div>

                {/* Cover photo upload */}
                <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-5 space-y-3">
                  <p className="text-xs font-semibold uppercase tracking-widest text-[var(--tx-3)]">Cover photo</p>
                  <Field label="Upload cover photo" hint="optional · JPEG, PNG or WebP · max 10 MB">
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={(e) => setCoverPhotoFile(e.target.files ? e.target.files[0] : null)}
                      className={FILE}
                    />
                    {coverPhotoFile && <p className="mt-1 text-xs text-[var(--tx-3)]">Selected: {coverPhotoFile.name}</p>}
                  </Field>
                </div>

                {/* Menu mode toggle */}
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setMenuMode('upload')}
                    className={`rounded-2xl px-4 py-2 text-sm font-medium transition ${menuMode === 'upload' ? 'bg-[var(--accent)] text-white' : 'border border-[var(--border)] bg-[var(--surface)] text-[var(--tx-2)] hover:border-[var(--accent)]'}`}
                  >
                    Upload &amp; Extract
                  </button>
                  <button
                    type="button"
                    onClick={() => setMenuMode('manual')}
                    className={`rounded-2xl px-4 py-2 text-sm font-medium transition ${menuMode === 'manual' ? 'bg-[var(--accent)] text-white' : 'border border-[var(--border)] bg-[var(--surface)] text-[var(--tx-2)] hover:border-[var(--accent)]'}`}
                  >
                    Add manually
                  </button>
                </div>

                {menuMode === 'upload' && (
                  <ScanPanel
                    menuFile={menuFile}
                    menuPreview={menuPreview}
                    menuScanStatus={menuScanStatus}
                    menuScanError={menuScanError}
                    onFile={handleMenuFile}
                    onScan={() => handleMenuScan()}
                    onAttach={(cats) => setMenuExtracted(cats)}
                  />
                )}

                {menuMode === 'manual' && (
                  <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface-2)] p-5 space-y-5">
                    <h2 className="text-lg font-semibold text-[var(--tx)]">Add menu items manually</h2>

                    {/* Existing categories */}
                    {(menuExtracted ?? []).map((cat, ci) => (
                      <div key={ci} className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 space-y-3">
                        <div className="flex items-center justify-between gap-2">
                          <p className="font-semibold text-[var(--tx)]">{cat.displayName || cat.name}</p>
                          <button
                            type="button"
                            onClick={() => setMenuExtracted((prev) => (prev ?? []).filter((_, i) => i !== ci))}
                            className="text-xs text-rose-500 hover:text-rose-700"
                          >
                            Remove category
                          </button>
                        </div>

                        {/* Items */}
                        {cat.items.map((item, ii) => (
                          <div key={ii} className="flex items-start gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-3">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-[var(--tx)]">{item.name}</p>
                              {item.description && <p className="text-xs text-[var(--tx-3)]">{item.description}</p>}
                            </div>
                            <p className="shrink-0 text-sm font-semibold text-[var(--tx)]">{item.price} {item.currency}</p>
                            <button
                              type="button"
                              onClick={() => setMenuExtracted((prev) =>
                                (prev ?? []).map((c, cIdx) => cIdx !== ci ? c : {
                                  ...c, items: c.items.filter((_, iIdx) => iIdx !== ii),
                                })
                              )}
                              className="shrink-0 text-xs text-rose-500 hover:text-rose-700"
                            >
                              ✕
                            </button>
                          </div>
                        ))}

                        {/* Add item inline form */}
                        {manualItemDraft?.ci === ci ? (
                          <div className="rounded-xl border border-[var(--accent)] bg-[var(--surface)] p-3 space-y-2">
                            <div className="grid gap-2 sm:grid-cols-2">
                              <input
                                autoFocus
                                placeholder="Item name *"
                                value={manualItemDraft.name}
                                onChange={(e) => setManualItemDraft((d) => d && { ...d, name: e.target.value })}
                                className={OK}
                              />
                              <input
                                placeholder="Description (optional)"
                                value={manualItemDraft.description}
                                onChange={(e) => setManualItemDraft((d) => d && { ...d, description: e.target.value })}
                                className={OK}
                              />
                            </div>
                            <div className="grid gap-2 sm:grid-cols-2">
                              <input
                                placeholder="Price *"
                                type="number"
                                min="0"
                                step="0.01"
                                value={manualItemDraft.price}
                                onKeyDown={blockNumberExtras}
                                onChange={(e) => setManualItemDraft((d) => d && { ...d, price: e.target.value })}
                                className={OK}
                              />
                              <select
                                value={manualItemDraft.currency}
                                onChange={(e) => setManualItemDraft((d) => d && { ...d, currency: e.target.value })}
                                className={OK}
                              >
                                <option value="INR">INR</option>
                                <option value="USD">USD</option>
                                <option value="EUR">EUR</option>
                              </select>
                            </div>
                            <div className="flex gap-2">
                              <button
                                type="button"
                                disabled={!manualItemDraft.name.trim() || !manualItemDraft.price}
                                onClick={() => {
                                  if (!manualItemDraft.name.trim() || !manualItemDraft.price) return;
                                  const newItem: ScanItem = {
                                    name: manualItemDraft.name.trim(),
                                    description: manualItemDraft.description.trim() || undefined,
                                    price: manualItemDraft.price,
                                    currency: manualItemDraft.currency,
                                  };
                                  setMenuExtracted((prev) =>
                                    (prev ?? []).map((c, cIdx) => cIdx !== ci ? c : { ...c, items: [...c.items, newItem] })
                                  );
                                  setManualItemDraft(null);
                                }}
                                className="rounded-xl bg-emerald-600 px-4 py-2 text-sm text-white hover:bg-emerald-700 disabled:opacity-50"
                              >
                                Add item
                              </button>
                              <button type="button" onClick={() => setManualItemDraft(null)} className="rounded-xl border px-4 py-2 text-sm">Cancel</button>
                            </div>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setManualItemDraft({ ci, name: '', description: '', price: '', currency: 'INR' })}
                            className="text-sm text-[var(--accent)] hover:underline"
                          >
                            + Add item
                          </button>
                        )}
                      </div>
                    ))}

                    {/* Add category */}
                    {manualCatDraft !== null && (
                      <div className="flex gap-2 items-center">
                        <input
                          autoFocus
                          placeholder="Category name (e.g. Starters)"
                          value={manualCatDraft}
                          onChange={(e) => setManualCatDraft(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              if (!manualCatDraft.trim()) return;
                              const slug = manualCatDraft.trim().toLowerCase().replace(/\s+/g, '-');
                              setMenuExtracted((prev) => [
                                ...(prev ?? []),
                                { name: slug, displayName: manualCatDraft.trim(), items: [] },
                              ]);
                              setManualCatDraft('');
                            }
                            if (e.key === 'Escape') setManualCatDraft('');
                          }}
                          className={`${OK} flex-1`}
                        />
                        <button
                          type="button"
                          disabled={!manualCatDraft.trim()}
                          onClick={() => {
                            if (!manualCatDraft.trim()) return;
                            const slug = manualCatDraft.trim().toLowerCase().replace(/\s+/g, '-');
                            setMenuExtracted((prev) => [
                              ...(prev ?? []),
                              { name: slug, displayName: manualCatDraft.trim(), items: [] },
                            ]);
                            setManualCatDraft('');
                          }}
                          className="rounded-2xl bg-[var(--accent)] px-4 py-2.5 text-sm text-white hover:bg-[var(--accent-2)] disabled:opacity-50"
                        >
                          Add category
                        </button>
                      </div>
                    )}

                    {menuExtracted && menuExtracted.length > 0 && (
                      <p className="text-xs text-emerald-600">
                        {menuExtracted.reduce((n, c) => n + c.items.length, 0)} item(s) across {menuExtracted.length} category/categories — will be submitted with registration.
                      </p>
                    )}
                  </div>
                )}

                <div className="mt-6 rounded-3xl border border-[var(--border)] bg-[var(--surface-2)] p-5">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h2 className="text-lg font-semibold text-[var(--tx)]">Review and confirm</h2>
                      <p className="mt-1 text-sm text-[var(--tx-3)]">Verify all required fields are complete before clicking Done and submitting.</p>
                    </div>
                  </div>

                  {(() => {
                    const validationErrors = validate(form);
                    const errorEntries = Object.entries(validationErrors) as Array<[keyof FormFields, string]>;
                    return (
                      <div className="mt-4 space-y-4">
                        {errorEntries.length > 0 ? (
                          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
                            <p className="font-semibold">Required fields missing or invalid</p>
                            <ul className="mt-3 list-disc space-y-1 pl-5">
                              {errorEntries.map(([field, message]) => (
                                <li key={field}>{field.replace(/([A-Z])/g, ' $1').trim()}: {message}</li>
                              ))}
                            </ul>
                          </div>
                        ) : (
                          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
                            All required fields are complete.
                          </div>
                        )}

                        <div className="grid gap-3 sm:grid-cols-2">
                          {[
                            { label: 'Restaurant name', value: form.name },
                            { label: 'Owner name', value: form.ownerName },
                            { label: 'Email', value: form.email },
                            { label: 'Phone', value: form.phone },
                            { label: 'Address', value: form.address },
                            { label: 'City', value: form.city },
                            { label: 'State', value: form.state },
                            { label: 'PIN code', value: form.zipCode },
                            { label: 'GST available', value: form.gstPresent || 'Not selected' },
                            { label: 'GSTIN', value: form.gstNumber || 'Not provided' },
                            { label: 'GST expiry', value: form.gstExpiryDate || 'Not provided' },
                            { label: 'FSSAI number', value: form.fssaiNumber || 'Not provided' },
                            { label: 'FSSAI expiry', value: form.fssaiExpiryDate || 'Not provided' },
                            { label: 'PAN number', value: form.panNumber || 'Not provided' },
                            { label: 'Bank name', value: form.bankName || 'Not provided' },
                            { label: 'Account type', value: form.accountType || 'Not provided' },
                            { label: 'Account holder', value: form.bankAccountHolderName || 'Not provided' },
                            { label: 'IFSC code', value: form.ifscCode || 'Not provided' },
                            { label: 'Brand description', value: form.brandDescription || 'Not provided' },
                            { label: 'Cuisine tags', value: form.cuisineTags || 'Not provided' },
                            { label: 'Service radius', value: form.serviceRadiusKm ? `${form.serviceRadiusKm} km` : 'Not provided' },
                            { label: 'Temporary closure', value: form.temporaryClosure || 'Not selected' },
                            { label: 'Holiday mode', value: form.holidayMode || 'Not selected' },
                            { label: 'PAN upload', value: panFile?.name || 'None' },
                            { label: 'GST upload', value: gstFile?.name || 'None' },
                            { label: 'FSSAI upload', value: fssaiFile?.name || 'None' },
                            { label: 'Bank upload', value: bankFile?.name || 'None' },
                            { label: 'Menu file', value: menuFile?.name || 'None' },
                          ].map((item) => (
                            <div key={item.label} className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-3 text-sm">
                              <p className="font-medium text-[var(--tx)]">{item.label}</p>
                              <p className="mt-1 text-[var(--tx-3)]">{item.value}</p>
                            </div>
                          ))}
                        </div>

                        <label className="mt-3 flex cursor-pointer items-start gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 text-sm transition hover:border-[var(--accent)]">
                          <input
                            type="checkbox"
                            checked={reviewConfirmed}
                            onChange={(e) => setReviewConfirmed(e.target.checked)}
                            className="mt-1 h-4 w-4 rounded border-[var(--border)] text-[var(--accent)] focus:ring-[var(--accent)]"
                          />
                          <span>
                            I have reviewed all fields and confirm this registration is ready for submission. Fix any missing or invalid information before submitting.
                          </span>
                        </label>
                      </div>
                    );
                  })()}
                </div>

                <div className="mt-4 space-y-3">
                  <p className="text-sm text-[var(--tx-3)]">
                    When you submit, the restaurant registration, uploaded documents, and extracted menu will be sent for super-admin review.
                  </p>
                  <button
                    type="submit"
                    disabled={submitStatus === 'loading' || submitStatus === 'success' || !reviewConfirmed}
                    className="w-full rounded-2xl bg-[var(--accent)] px-4 py-3 text-white transition hover:bg-[var(--accent-2)] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {submitStatus === 'loading' ? 'Submitting…' : 'Submit for review'}
                  </button>
                </div>
              </>
            )}
          </form>
        </div>
      </div>
      {/* PAN Verification Popup */}
      {panVerifyStatus !== 'idle' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="flex flex-col items-center gap-5 rounded-3xl bg-[var(--surface)] p-10 shadow-2xl min-w-[280px] max-w-xs w-full">
            {panVerifyStatus === 'verifying' && (
              <>
                <div className="relative h-20 w-20">
                  <svg viewBox="0 0 80 80" className="h-20 w-20 pan-spin" fill="none">
                    <circle cx="40" cy="40" r="34" stroke="var(--border)" strokeWidth="6" />
                    <circle cx="40" cy="40" r="34" stroke="var(--accent)" strokeWidth="6"
                      strokeDasharray="60 154" strokeLinecap="round" />
                  </svg>
                </div>
                <p className="text-base font-semibold text-[var(--tx)]">Verifying PAN details…</p>
                <p className="text-sm text-[var(--tx-3)] text-center">Connecting to verification service</p>
              </>
            )}

            {panVerifyStatus === 'success' && (
              <>
                <div className="pan-pop-in flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100">
                  <svg viewBox="0 0 60 60" className="h-12 w-12" fill="none" stroke="#16a34a" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 30l13 13 23-23" className="pan-check" />
                  </svg>
                </div>
                <div className="text-center">
                  <p className="text-lg font-semibold text-emerald-700">PAN Verified</p>
                  {panVerifiedName && <p className="mt-1 text-sm font-medium text-[var(--tx)]">{panVerifiedName}</p>}
                  <p className="mt-1 text-sm text-[var(--tx-3)]">{panVerifyMessage}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setPanVerifyStatus('idle')}
                  className="rounded-2xl bg-emerald-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-emerald-700 transition"
                >
                  Done
                </button>
              </>
            )}

            {panVerifyStatus === 'failed' && (
              <>
                <div className="pan-pop-in flex h-20 w-20 items-center justify-center rounded-full bg-rose-100">
                  <svg viewBox="0 0 60 60" className="h-12 w-12" fill="none" stroke="#dc2626" strokeWidth="5" strokeLinecap="round">
                    <line x1="18" y1="18" x2="42" y2="42" className="pan-cross" />
                    <line x1="42" y1="18" x2="18" y2="42" className="pan-cross" style={{ animationDelay: '0.1s' }} />
                  </svg>
                </div>
                <div className="text-center">
                  <p className="text-lg font-semibold text-rose-700">Verification Failed</p>
                  <p className="mt-1 text-sm text-[var(--tx-3)]">{panVerifyMessage}</p>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleVerifyPan}
                    className="rounded-2xl bg-[var(--accent)] px-5 py-2.5 text-sm font-medium text-white hover:bg-[var(--accent-2)] transition"
                  >
                    Retry
                  </button>
                  <button
                    type="button"
                    onClick={() => setPanVerifyStatus('idle')}
                    className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-5 py-2.5 text-sm font-medium text-[var(--tx-2)] hover:bg-[var(--surface-2)] transition"
                  >
                    Close
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </AuthGuard>
  );
}