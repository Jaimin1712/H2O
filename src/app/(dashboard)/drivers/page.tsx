"use client";

import React, { useEffect, useState } from 'react';
import {
  Plus,
  Search,
  Filter,
  Phone,
  Loader2,
  Trash2,
  Edit,
  X,
  Eye,
  EyeOff,
  Lock,
  Car,
  Copy,
  CheckCircle2,
  ShieldCheck,
  Mail,
} from 'lucide-react';
import { DataTable } from '@/components/DataTable';
import { supabase } from '@/lib/supabase';

interface Driver {
  id: string;
  name: string;
  email?: string | null;
  phone: string | null;
  vehicle_number?: string | null;
  status: string;
  auth_user_id?: string | null;
  created_at?: string;
}

interface CreatedCredentials {
  name: string;
  email: string;
  phone: string;
  password: string;
}

export default function DriversPage() {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingDriver, setEditingDriver] = useState<Driver | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [createdCredentials, setCreatedCredentials] = useState<CreatedCredentials | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    vehicle_number: '',
    status: 'active',
  });

  // ─── Fetch drivers ────────────────────────────────────────────────────────
  const fetchDrivers = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('drivers')
        .select('id, name, email, phone, vehicle_number, status, auth_user_id, created_at')
        .eq('supplier_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDrivers(data || []);
    } catch (error) {
      console.error('Error fetching drivers:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDrivers();
  }, []);

  // ─── Open / close modal ───────────────────────────────────────────────────
  const handleOpenModal = (driver: Driver | null = null) => {
    setErrorMsg(null);
    setCreatedCredentials(null);
    setShowPassword(false);

    if (driver) {
      setEditingDriver(driver);
      setFormData({
        name: driver.name,
        email: driver.email || '',
        phone: driver.phone || '',
        password: '',
        vehicle_number: driver.vehicle_number || '',
        status: driver.status,
      });
    } else {
      setEditingDriver(null);
      setFormData({ name: '', email: '', phone: '', password: '', vehicle_number: '', status: 'active' });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingDriver(null);
    setCreatedCredentials(null);
    setErrorMsg(null);
  };

  // ─── Submit ───────────────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      if (editingDriver) {
        // ── Edit: direct DB update, no auth change ──────────────────────────
        const updatePayload: any = {
          name: formData.name,
          phone: formData.phone,
          vehicle_number: formData.vehicle_number || null,
          status: formData.status,
        };

        const { error } = await supabase
          .from('drivers')
          .update(updatePayload)
          .eq('id', editingDriver.id);

        if (error) throw error;

        await fetchDrivers();
        handleCloseModal();
      } else {
        // ── Create: call server-side API (uses service role key) ────────────
        const res = await fetch('/api/create-driver', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: formData.name,
            email: formData.email,
            phone: formData.phone,
            password: formData.password,
            vehicle_number: formData.vehicle_number || null,
            supplier_id: user.id,
          }),
        });

        const json = await res.json();

        if (!res.ok) {
          setErrorMsg(json.error || 'Failed to create driver');
          return;
        }

        // Show credentials card before closing
        setCreatedCredentials({
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          password: formData.password,
        });

        await fetchDrivers();
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Something went wrong');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ─── Delete ───────────────────────────────────────────────────────────────
  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this driver?')) return;
    try {
      const { error } = await supabase.from('drivers').delete().eq('id', id);
      if (error) throw error;
      setDrivers(drivers.filter(d => d.id !== id));
    } catch (error) {
      console.error('Error deleting driver:', error);
    }
  };

  // ─── Copy to clipboard ────────────────────────────────────────────────────
  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const filteredDrivers = drivers.filter(d =>
    d.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-main">Drivers</h1>
          <p className="text-text-muted">Manage your delivery team and their login credentials.</p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors shadow-sm self-start md:self-auto"
        >
          <Plus size={18} />
          Add Driver
        </button>
      </div>

      {/* Search / filter bar */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-white p-4 rounded-xl border border-slate-100 shadow-soft">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={18} />
          <input
            type="text"
            placeholder="Search drivers by name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
          />
        </div>
        <div className="flex items-center gap-2 w-full md:w-auto">
          <button className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 border border-slate-200 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors">
            <Filter size={16} />
            Filter
          </button>
          <button className="flex-1 md:flex-none px-4 py-2 border border-slate-200 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors">
            Export CSV
          </button>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="animate-spin text-primary" size={40} />
        </div>
      ) : (
        <DataTable
          data={filteredDrivers}
          columns={[
            {
              header: 'Driver',
              accessor: (d: Driver) => (
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
                    {d.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-semibold text-text-main">{d.name}</p>
                    {d.auth_user_id && (
                      <span className="inline-flex items-center gap-1 text-xs text-success font-medium">
                        <ShieldCheck size={11} /> Auth linked
                      </span>
                    )}
                  </div>
                </div>
              ),
            },
            {
              header: 'Contact',
              accessor: (d: Driver) => (
                <div className="text-text-muted flex items-center gap-1 text-sm font-medium">
                  <Phone size={14} /> {d.phone || 'No phone'}
                </div>
              ),
            },
            {
              header: 'Vehicle',
              accessor: (d: Driver) => (
                <div className="flex items-center gap-1 text-sm text-text-muted">
                  <Car size={14} />
                  <span>{d.vehicle_number || '—'}</span>
                </div>
              ),
            },
            {
              header: 'Status',
              accessor: (d: Driver) => (
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${
                  d.status === 'active' ? 'bg-success/10 text-success' :
                  d.status === 'on_delivery' ? 'bg-secondary/10 text-secondary' :
                  'bg-slate-100 text-slate-500'
                }`}>
                  {d.status.replace('_', ' ')}
                </span>
              ),
            },
            {
              header: 'Joined Date',
              accessor: (d: Driver) => (
                <span className="text-sm text-text-muted">
                  {d.created_at
                    ? new Date(d.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
                    : 'N/A'}
                </span>
              ),
            },
            {
              header: 'Actions',
              accessor: (d: Driver) => (
                <div className="flex items-center justify-end gap-2 text-text-muted">
                  <button onClick={() => handleOpenModal(d)} className="p-1 hover:bg-slate-100 rounded transition-colors">
                    <Edit size={16} />
                  </button>
                  <button onClick={() => handleDelete(d.id)} className="p-1 hover:bg-error/10 hover:text-error rounded transition-colors">
                    <Trash2 size={16} />
                  </button>
                </div>
              ),
              className: 'text-right',
            },
          ]}
        />
      )}

      {/* ── Add / Edit Modal ─────────────────────────────────────────────── */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-xl border border-slate-100 overflow-hidden">

            {/* Modal header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <h2 className="font-bold text-text-main">
                {editingDriver ? 'Edit Driver' : 'Add New Driver'}
              </h2>
              <button onClick={handleCloseModal} className="text-text-muted hover:text-text-main transition-colors">
                <X size={20} />
              </button>
            </div>

            {/* ─── Credentials card (shown after successful create) ──────── */}
            {createdCredentials ? (
              <div className="p-6 space-y-5">
                <div className="flex items-center gap-3 p-4 bg-success/10 border border-success/20 rounded-xl">
                  <CheckCircle2 className="text-success shrink-0" size={22} />
                  <div>
                    <p className="font-semibold text-success text-sm">Driver created successfully!</p>
                    <p className="text-xs text-text-muted mt-0.5">Share these login credentials with the driver.</p>
                  </div>
                </div>

                <div className="space-y-3">
                  {[
                    { label: 'Driver Name', value: createdCredentials.name, field: 'name' },
                    { label: 'Email (Login ID)', value: createdCredentials.email, field: 'email' },
                    { label: 'Password', value: createdCredentials.password, field: 'password' },
                  ].map(({ label, value, field }) => (
                    <div key={field} className="flex items-center justify-between gap-3 p-3 bg-slate-50 rounded-lg border border-slate-100">
                      <div className="min-w-0">
                        <p className="text-xs text-text-muted font-medium">{label}</p>
                        <p className="text-sm font-semibold text-text-main truncate">{value}</p>
                      </div>
                      <button
                        onClick={() => copyToClipboard(value, field)}
                        className="shrink-0 p-1.5 rounded hover:bg-slate-200 transition-colors text-text-muted"
                        title="Copy"
                      >
                        {copiedField === field ? <CheckCircle2 size={16} className="text-success" /> : <Copy size={16} />}
                      </button>
                    </div>
                  ))}
                </div>

                <button
                  onClick={handleCloseModal}
                  className="w-full py-2.5 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
                >
                  Done
                </button>
              </div>
            ) : (
              /* ─── Form ──────────────────────────────────────────────────── */
              <form onSubmit={handleSubmit} className="p-6 space-y-4">

                {errorMsg && (
                  <div className="p-3 text-sm text-error bg-error/10 border border-error/20 rounded-lg">
                    {errorMsg}
                  </div>
                )}

                {/* Name */}
                <div>
                  <label className="block text-sm font-semibold text-text-main mb-1.5">Full Name</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g. Ravi Kumar"
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                  />
                </div>

                {/* Email */}
                <div>
                  <label className="block text-sm font-semibold text-text-main mb-1.5">
                    Email Address <span className="font-normal text-text-muted">(used to login)</span>
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={16} />
                    <input
                      type="email"
                      required
                      disabled={!!editingDriver} // cannot change email after creation (auth account)
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="e.g. driver@example.com"
                      className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                    />
                  </div>
                  {editingDriver && (
                    <p className="text-xs text-text-muted mt-1">Email cannot be changed after creation.</p>
                  )}
                </div>

                {/* Phone */}
                <div>
                  <label className="block text-sm font-semibold text-text-main mb-1.5">
                    Phone Number <span className="font-normal text-text-muted">(optional)</span>
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={16} />
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="e.g. 9876543210"
                      className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                    />
                  </div>
                </div>

                {/* Password — only on create */}
                {!editingDriver && (
                  <div>
                    <label className="block text-sm font-semibold text-text-main mb-1.5">Password</label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={16} />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        minLength={6}
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        placeholder="Min. 6 characters"
                        className="w-full pl-10 pr-10 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-main transition-colors"
                      >
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                    <p className="text-xs text-text-muted mt-1">Driver will use this password to login to the driver app.</p>
                  </div>
                )}

                {/* Vehicle Number */}
                <div>
                  <label className="block text-sm font-semibold text-text-main mb-1.5">
                    Vehicle Number <span className="font-normal text-text-muted">(optional)</span>
                  </label>
                  <div className="relative">
                    <Car className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={16} />
                    <input
                      type="text"
                      value={formData.vehicle_number}
                      onChange={(e) => setFormData({ ...formData, vehicle_number: e.target.value })}
                      placeholder="e.g. MH12AB1234"
                      className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                    />
                  </div>
                </div>

                {/* Status */}
                <div>
                  <label className="block text-sm font-semibold text-text-main mb-1.5">Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all appearance-none"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="on_delivery">On Delivery</option>
                  </select>
                </div>

                {/* Actions */}
                <div className="pt-2 flex gap-3">
                  <button
                    type="button"
                    onClick={handleCloseModal}
                    className="flex-1 px-4 py-2 border border-slate-200 rounded-lg text-sm font-medium text-text-main hover:bg-slate-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 transition-all shadow-sm flex items-center justify-center gap-2 disabled:opacity-70"
                  >
                    {isSubmitting && <Loader2 className="animate-spin" size={16} />}
                    {editingDriver ? 'Save Changes' : 'Create Driver'}
                  </button>
                </div>
              </form>
            )}

          </div>
        </div>
      )}
    </div>
  );
}
