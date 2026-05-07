"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Loader2, CheckCircle2, MapPin, Truck, Phone } from 'lucide-react';

export default function OnboardingPage() {
  const [businessName, setBusinessName] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [bottleType, setBottleType] = useState('20L jar');
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const fetchSupplier = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }

      const { data, error } = await supabase
        .from('suppliers')
        .select('*')
        .eq('id', user.id)
        .single();

      if (data) {
        setBusinessName(data.business_name || '');
        setPhone(data.phone || '');
        if (data.onboarding_completed) {
          router.push('/');
        }
      }
      setIsFetching(false);
    };

    fetchSupplier();
  }, [router]);

  const handleCompleteOnboarding = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user found');

      const { error: updateError } = await supabase
        .from('suppliers')
        .update({
          business_name: businessName,
          address: address,
          phone: phone,
          bottle_type_default: bottleType,
          onboarding_completed: true,
        })
        .eq('id', user.id);

      if (updateError) throw updateError;

      router.push('/');
    } catch (err: any) {
      setError(err.message || 'Failed to save information');
      setIsLoading(false);
    }
  };

  if (isFetching) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="animate-spin text-primary" size={40} />
      </div>
    );
  }

  return (
    <div className="bg-card-bg rounded-2xl shadow-soft border border-slate-100 p-8">
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold text-text-main">Complete Your Profile</h1>
        <p className="text-text-muted mt-2">Just a few more details to get started</p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-error/10 border border-error/20 rounded-xl text-error text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleCompleteOnboarding} className="space-y-6">
        <div>
          <label className="block text-sm font-semibold text-text-main mb-2">Business Name</label>
          <div className="relative">
             <input
              type="text"
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
              placeholder="Pure Water Springs"
              required
            />
            <Truck className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={18} />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-text-main mb-2">Business Phone</label>
            <div className="relative">
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                placeholder="+1 234 567 890"
                required
              />
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={18} />
            </div>
          </div>
          <div>
            <label className="block text-sm font-semibold text-text-main mb-2">Default Bottle Type</label>
            <select
              value={bottleType}
              onChange={(e) => setBottleType(e.target.value)}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all appearance-none"
            >
              <option value="20L jar">20L Jar (Standard)</option>
              <option value="10L bottle">10L Bottle</option>
              <option value="5L bottle">5L Bottle</option>
              <option value="Dispenser Cup">Dispenser Bulk</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold text-text-main mb-2">Business Address</label>
          <div className="relative">
            <textarea
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all min-h-[100px]"
              placeholder="123 Water Street, City, State, ZIP"
              required
            />
            <MapPin className="absolute left-3 top-3.5 text-text-muted" size={18} />
          </div>
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full bg-primary text-white py-4 rounded-xl font-bold hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 disabled:opacity-70 flex items-center justify-center gap-2"
        >
          {isLoading ? <Loader2 className="animate-spin" size={20} /> : (
            <>
              Complete Setup <CheckCircle2 size={20} />
            </>
          )}
        </button>
      </form>
    </div>
  );
}
