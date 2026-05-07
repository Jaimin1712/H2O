"use client";

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Loader2, CheckCircle2, Building2, Phone, MapPin, IndianRupee } from 'lucide-react';

export default function SettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    business_name: '',
    phone: '',
    address: '',
    bottle_type_default: '20L jar',
    default_bottles: 1,
    bottle_price: 0,
    jug_price: 0,
  });

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const [supplierRes, settingsRes] = await Promise.all([
        supabase.from('suppliers').select('*').eq('id', user.id).single(),
        supabase.from('supplier_settings').select('*').eq('supplier_id', user.id).single()
      ]);

      if (supplierRes.error && supplierRes.error.code !== 'PGRST116') throw supplierRes.error;
      
      const supplierData = supplierRes.data;
      const settingsData = settingsRes.data;

      if (supplierData) {
        setFormData({
          business_name: supplierData.business_name || '',
          phone: supplierData.phone || '',
          address: supplierData.address || '',
          bottle_type_default: supplierData.bottle_type_default || '20L jar',
          default_bottles: settingsData?.default_bottles || 1,
          bottle_price: settingsData?.default_bottle_price || 0,
          jug_price: settingsData?.default_jug_price || 0,
        });
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user found');

      const { error: updateError } = await supabase
        .from('suppliers')
        .update({
          business_name: formData.business_name,
          phone: formData.phone,
          address: formData.address,
          bottle_type_default: formData.bottle_type_default,
        })
        .eq('id', user.id);

      if (updateError) throw updateError;

      // Need to upsert the settings
      // We send jug_price if it's eventually added to the table, but if not we might get an error.
      // Assuming you will alter the table to add default_jug_price.
      const payload: any = {
        supplier_id: user.id,
        default_bottle_price: Number(formData.bottle_price),
        default_bottles: Number(formData.default_bottles),
        default_jug_price: Number(formData.jug_price),
      };

      const { error: settingsError } = await supabase
        .from('supplier_settings')
        .upsert(payload, { onConflict: 'supplier_id' });

      if (settingsError) throw settingsError;

      setSuccess('Profile updated successfully!');
    } catch (err: any) {
      setError(err.message || 'Failed to save information');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="animate-spin text-primary" size={40} />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-text-main">Settings</h1>
        <p className="text-sm sm:text-base text-text-muted">Manage your business profile and preferences.</p>
      </div>

      <div className="bg-white rounded-2xl shadow-soft border border-slate-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <h2 className="font-bold text-text-main">Business Profile</h2>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="p-4 bg-error/10 border border-error/20 rounded-xl text-error text-sm">
              {error}
            </div>
          )}
          
          {success && (
            <div className="p-4 bg-success/10 border border-success/20 rounded-xl text-success text-sm flex items-center gap-2">
              <CheckCircle2 size={18} />
              {success}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
            <div>
              <label className="block text-sm font-semibold text-text-main mb-2">Business Name</label>
              <div className="relative">
                <input
                  type="text"
                  value={formData.business_name}
                  onChange={(e) => setFormData({...formData, business_name: e.target.value})}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                  placeholder="Business Name"
                  required
                />
                <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={18} />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-text-main mb-2">Business Phone</label>
              <div className="relative">
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({...formData, phone: e.target.value})}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                  placeholder="+1 234 567 890"
                  required
                />
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={18} />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-text-main mb-2">Default Bottle Type</label>
              <select
                value={formData.bottle_type_default}
                onChange={(e) => setFormData({...formData, bottle_type_default: e.target.value})}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all appearance-none"
              >
                <option value="20L jar">20L Jar (Standard)</option>
                <option value="10L bottle">10L Bottle</option>
                <option value="5L bottle">5L Bottle</option>
                <option value="Dispenser Cup">Dispenser Bulk</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-text-main mb-2">Default Bottles count</label>
              <div className="relative">
                <input
                  type="number"
                  min="1"
                  value={formData.default_bottles}
                  onChange={(e) => setFormData({...formData, default_bottles: Number(e.target.value)})}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                  placeholder="1"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-text-main mb-2">Default Bottle Price (₹)</label>
              <div className="relative">
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.bottle_price}
                  onChange={(e) => setFormData({...formData, bottle_price: Number(e.target.value)})}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                  placeholder="0.00"
                  required
                />
                <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={18} />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-text-main mb-2">Default Jug Price (₹)</label>
              <div className="relative">
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.jug_price}
                  onChange={(e) => setFormData({...formData, jug_price: Number(e.target.value)})}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                  placeholder="0.00"
                  required
                />
                <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={18} />
              </div>
            </div>
            
            <div className="sm:col-span-2">
              <label className="block text-sm font-semibold text-text-main mb-2">Business Address</label>
              <div className="relative">
                <textarea
                  value={formData.address}
                  onChange={(e) => setFormData({...formData, address: e.target.value})}
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all min-h-[100px]"
                  placeholder="Business Address"
                  required
                />
                <MapPin className="absolute left-3 top-3.5 text-text-muted" size={18} />
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t border-slate-100">
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 bg-primary text-white rounded-lg font-medium hover:bg-primary/90 transition-all shadow-sm disabled:opacity-70 flex items-center gap-2"
            >
              {saving ? <Loader2 className="animate-spin" size={18} /> : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
