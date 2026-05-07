"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Eye, EyeOff, Loader2 } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) throw authError;

      if (data.user) {
        // 1. Check if user is a Supplier (Admin)
        const { data: supplier } = await supabase
          .from('suppliers')
          .select('onboarding_completed')
          .eq('id', data.user.id)
          .maybeSingle();

        if (supplier) {
          if (supplier.onboarding_completed) {
            router.push('/');
          } else {
            router.push('/onboarding');
          }
          return;
        }

        // 2. Check if user is a Driver
        const { data: driver } = await supabase
          .from('drivers')
          .select('id')
          .eq('auth_user_id', data.user.id)
          .maybeSingle();

        if (driver) {
          router.push('/driver-app');
        } else {
          // Neither supplier nor driver
          await supabase.auth.signOut();
          setError('Unauthorized access. Please contact support.');
          setIsLoading(false);
        }
      }
    } catch (err: any) {
      setError(err.message || 'Failed to login');
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-card-bg rounded-2xl shadow-soft border border-slate-100 p-8">
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold text-text-main">Welcome Back</h1>
        <p className="text-text-muted mt-2">Log in to manage your water supply business</p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-error/10 border border-error/20 rounded-xl text-error text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleLogin} className="space-y-6">
        <div>
          <label className="block text-sm font-semibold text-text-main mb-2">Email Address</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
            placeholder="name@business.com"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-text-main mb-2">Password</label>
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
              placeholder="••••••••"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-main"
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          <div className="text-right mt-2">
            <Link href="/forgot-password" title="Forgot password?" className="text-xs font-semibold text-primary hover:underline">
              Forgot password?
            </Link>
          </div>
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full bg-primary text-white py-3 rounded-xl font-bold hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 disabled:opacity-70 flex items-center justify-center gap-2"
        >
          {isLoading ? <Loader2 className="animate-spin" size={20} /> : "Log In"}
        </button>
      </form>

      <div className="mt-8 pt-8 border-t border-slate-100 text-center">
        <p className="text-sm text-text-muted">
          Don't have an account?{' '}
          <Link href="/signup" className="font-bold text-primary hover:underline">
            Create account
          </Link>
        </p>
      </div>
    </div>
  );
}
