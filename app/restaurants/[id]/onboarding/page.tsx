'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { api } from '../../../../lib/api';

type OnboardingStatus = {
  id: string;
  status: string;
  onboardingStep: number;
  name: string;
};

const steps = [
  { label: 'Sales registration', description: 'Restaurant profile and geo details captured.' },
  { label: 'Document upload', description: 'GST, FSSAI, bank documents uploaded.' },
  { label: 'Branch setup', description: 'The first branch and menu configured.' },
  { label: 'Review & validation', description: 'Fraud checks and details confirmed.' },
  { label: 'Activation', description: 'Restaurant ready for ordering on the platform.' },
];

export default function OnboardingPage() {
  const router = useRouter();
  const params = useParams();
  const [status, setStatus] = useState<OnboardingStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const fetchStatus = async () => {
    try {
      const response = await api.get(`/restaurants/${params.id}/onboarding`);
      setStatus(response.data);
      setError('');
    } catch (err) {
      setError('Unable to load onboarding status.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, [params.id]);

  const handleAdvance = async () => {
    if (!status) return;
    try {
      const nextStep = status.onboardingStep + 1;
      await api.patch(`/restaurants/${params.id}/onboarding-step`, { step: nextStep });
      setMessage('Onboarding advanced.');
      fetchStatus();
    } catch (err) {
      setError('Unable to advance onboarding step.');
    }
  };

  if (loading) {
    return <div>Loading onboarding status...</div>;
  }

  return (
    <div className="space-y-6">
        <div className="rounded-3xl bg-white p-8 shadow-lg">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-3xl font-semibold">Onboarding wizard</h1>
              <p className="mt-2 text-slate-600">Track the restaurant activation flow for {status?.name}.</p>
            </div>
            <button onClick={() => router.push(`/restaurants/${params.id}`)} className="rounded-2xl border border-slate-300 px-4 py-2 text-slate-700 hover:bg-slate-50">
              Back to restaurant
            </button>
          </div>
        </div>
        {error && <div className="rounded-3xl bg-rose-50 p-4 text-rose-700">{error}</div>}
        {message && <div className="rounded-3xl bg-emerald-50 p-4 text-emerald-700">{message}</div>}
        <div className="rounded-3xl bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold">Progress</h2>
          <div className="mt-6 space-y-4">
            {steps.map((step, index) => {
              const stepNumber = index + 1;
              const completed = status ? status.onboardingStep > index : false;
              return (
                <div key={step.label} className={`rounded-3xl border p-4 ${completed ? 'border-emerald-200 bg-emerald-50' : 'border-slate-200 bg-slate-50'}`}>
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm font-semibold">Step {stepNumber}</p>
                      <h3 className="text-lg font-semibold">{step.label}</h3>
                      <p className="mt-1 text-slate-500">{step.description}</p>
                    </div>
                    <span className={`rounded-full px-3 py-1 text-sm ${completed ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-700'}`}>
                      {completed ? 'Completed' : 'Pending'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        <div className="rounded-3xl bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold">Current status</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm text-slate-500">Restaurant status</p>
              <p className="mt-2 text-lg font-semibold capitalize">{status?.status}</p>
            </div>
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm text-slate-500">Current step</p>
              <p className="mt-2 text-lg font-semibold">{status?.onboardingStep}</p>
            </div>
          </div>
          <button
            onClick={handleAdvance}
            className="mt-6 rounded-2xl bg-slate-900 px-5 py-3 text-white hover:bg-slate-700"
            disabled={!status || status.status === 'active'}
          >
            Advance onboarding
          </button>
        </div>
    </div>
  );
}
