'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { customerReviewsApi } from '../../../../../lib/api';

const StarRating = ({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) => (
  <div>
    <label className="block text-sm font-medium text-slate-700">{label}</label>
    <div className="mt-2 flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button key={star} type="button" onClick={() => onChange(star)}
          className={`text-2xl transition ${star <= value ? 'text-[#B88A2E]' : 'text-slate-300 hover:text-[#B88A2E]/50'}`}>
          ★
        </button>
      ))}
    </div>
  </div>
);

export default function NewReviewPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const router = useRouter();

  const [restaurantRating, setRestaurantRating] = useState(0);
  const [foodRating, setFoodRating] = useState(0);
  const [deliveryRating, setDeliveryRating] = useState(0);
  const [reviewText, setReviewText] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (restaurantRating === 0) { setError('Please rate the restaurant.'); return; }
    setSubmitting(true);
    setError('');
    try {
      await customerReviewsApi.create({
        orderId,
        restaurantRating,
        foodRating: foodRating || undefined,
        deliveryRating: deliveryRating || undefined,
        reviewText: reviewText.trim() || undefined,
        isAnonymous,
      });
      setSubmitted(true);
      router.push(`/customer/orders/${orderId}`);
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Failed to submit review.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-lg">
      <div className="mb-6 flex items-center gap-3">
        <button onClick={() => router.back()} className="text-slate-500 hover:text-slate-900">← Back</button>
        <h1 className="text-xl font-bold text-slate-950">Leave a review</h1>
      </div>

      <form onSubmit={handleSubmit}
        className="space-y-5 rounded-[1.5rem] border border-slate-200/60 bg-white p-6">

        <StarRating label="Overall restaurant rating *" value={restaurantRating} onChange={setRestaurantRating} />
        <StarRating label="Food quality" value={foodRating} onChange={setFoodRating} />
        <StarRating label="Delivery experience" value={deliveryRating} onChange={setDeliveryRating} />

        <div>
          <label className="block text-sm font-medium text-slate-700">Your review</label>
          <textarea value={reviewText} onChange={(e) => setReviewText(e.target.value)}
            rows={4} maxLength={1000}
            placeholder="Tell us about your experience…"
            className="mt-2 w-full resize-none rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-200" />
          <p className="mt-1 text-right text-xs text-slate-400">{reviewText.length}/1000</p>
        </div>

        <label className="flex cursor-pointer items-center gap-3 text-sm text-slate-700">
          <input type="checkbox" checked={isAnonymous} onChange={(e) => setIsAnonymous(e.target.checked)}
            className="rounded" />
          Post anonymously
        </label>

        {error && <p className="text-sm text-red-500">{error}</p>}

        <button type="submit" disabled={submitting || submitted}
          className="w-full rounded-2xl bg-[#B88A2E] py-3 text-sm font-semibold text-slate-950 transition hover:brightness-110 disabled:opacity-60">
          {submitting ? 'Submitting…' : submitted ? 'Submitted' : 'Submit review'}
        </button>
      </form>
    </div>
  );
}
