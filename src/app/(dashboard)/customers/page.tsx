"use client";

import React, { useEffect, useState } from 'react';
import {
  Plus,
  Search,
  MapPin,
  Loader2,
  Trash2,
  Edit,
  Phone,
  Save,
  IndianRupee,
  History,
  CreditCard
} from 'lucide-react';
import { DataTable } from '@/components/DataTable';
import { Modal } from '@/components/Modal';
import { supabase } from '@/lib/supabase';

interface Customer {
  id: string;
  name: string;
  phone: string | null;
  address: string;
  delivery_type?: string;
  delivery_time?: string | null;
  default_bottles?: number;
  price_per_bottle?: number;
  total_amount?: number;
  paid_amount?: number;
  created_at?: string;
  balance?: number;
  driver_id?: string | null;
  drivers?: { name: string; full_name?: string } | null;
  delivery_date?: string | null;
}

interface Transaction {
  id: string;
  amount: number;
  transaction_type: string;
  note: string;
  created_at: string;
}

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [drivers, setDrivers] = useState<any[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    address: '',
    delivery_type: 'daily',
    delivery_time: '',
    default_bottles: 0,
    price_per_bottle: 0,
    paid_amount: 0,
    driver_id: '',
    delivery_date: ''
  });

  // Transaction form state
  const [isTxModalOpen, setIsTxModalOpen] = useState(false);
  const [txCustomer, setTxCustomer] = useState<Customer | null>(null);
  const [txFormData, setTxFormData] = useState({
    amount: '',
    transaction_type: 'payment',
    note: ''
  });

  const fetchCustomers = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const [customersRes, driversRes] = await Promise.all([
        supabase
          .from('customers')
          .select('id, name, phone, address, created_at, delivery_type, delivery_time, default_bottles, price_per_bottle, total_amount, paid_amount, driver_id, delivery_date, drivers(name)')
          .eq('supplier_id', user.id)
          .order('created_at', { ascending: false }),
        supabase
          .from('drivers')
          .select('id, name')
          .eq('supplier_id', user.id)
          .eq('status', 'active')
      ]);

      if (customersRes.error) throw customersRes.error;

      const customersWithBalance = (customersRes.data || []).map((c: any) => {
        const requiredAmount = Number(c.price_per_bottle || 0) * Number(c.default_bottles || 0);
        const paidAmount = Number(c.paid_amount || 0);
        const balance = paidAmount - requiredAmount;
        return { ...c, balance };
      });

      setCustomers(customersWithBalance);
      setDrivers(driversRes.data || []);
    } catch (error) {
      console.error('Error fetching customers:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  const handleOpenModal = (customer: Customer | null = null) => {
    if (customer) {
      setEditingCustomer(customer);
      setFormData({
        name: customer.name,
        phone: customer.phone || '',
        address: customer.address,
        delivery_type: customer.delivery_type || 'daily',
        delivery_time: customer.delivery_time || '',
        default_bottles: customer.default_bottles || 0,
        price_per_bottle: customer.price_per_bottle || 0,
        paid_amount: customer.paid_amount || 0,
        driver_id: customer.driver_id || '',
        delivery_date: customer.delivery_date || ''
      });
    } else {
      setEditingCustomer(null);
      setFormData({
        name: '',
        phone: '',
        address: '',
        delivery_type: 'daily',
        delivery_time: '',
        default_bottles: 0,
        price_per_bottle: 0,
        paid_amount: 0,
        driver_id: '',
        delivery_date: ''
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingCustomer(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      if (editingCustomer) {
        // Update
        const { error } = await supabase
          .from('customers')
          .update({
            name: formData.name,
            phone: formData.phone,
            address: formData.address,
            delivery_type: formData.delivery_type,
            delivery_time: formData.delivery_time || null,
            default_bottles: Number(formData.default_bottles),
            price_per_bottle: Number(formData.price_per_bottle),
            paid_amount: Number(formData.paid_amount),
            driver_id: formData.driver_id || null,
            delivery_date: formData.delivery_date || null
          })
          .eq('id', editingCustomer.id);
        if (error) throw error;
      } else {
        // Create
        const { data: newCustomer, error } = await supabase
          .from('customers')
          .insert([{
            name: formData.name,
            phone: formData.phone,
            address: formData.address,
            delivery_type: formData.delivery_type,
            delivery_time: formData.delivery_time || null,
            default_bottles: Number(formData.default_bottles),
            price_per_bottle: Number(formData.price_per_bottle),
            paid_amount: Number(formData.paid_amount),
            driver_id: formData.driver_id || null,
            delivery_date: formData.delivery_date || null,
            supplier_id: user.id
          }])
          .select('id')
          .single();
          
        if (error) {
          console.error("Error creating customer:", error);
          throw error;
        }

        if (!newCustomer) {
          throw new Error("Customer created but record not returned. Delivery cannot be auto-scheduled.");
        }

        // Auto-create initial delivery
        // We use the provided delivery_date and delivery_time to build a precise scheduled_date
        let scheduledDateString: string;
        if (formData.delivery_date) {
          const baseDate = formData.delivery_date; // Expected: YYYY-MM-DD
          const time = formData.delivery_time || "09:00"; // Default to 9 AM
          // Construct date in local time then convert to ISO for Supabase
          scheduledDateString = new Date(`${baseDate}T${time}`).toISOString();
        } else {
          // Default to current moment if no date provided
          scheduledDateString = new Date().toISOString();
        }
        
        const { error: deliveryError } = await supabase.from('deliveries').insert([{
          supplier_id: user.id,
          customer_id: newCustomer.id,
          driver_id: formData.driver_id || null,
          scheduled_date: scheduledDateString,
          bottles_delivered: Number(formData.default_bottles) || 0,
          delivery_type: formData.delivery_type,
          status: 'pending'
        }]);

        if (deliveryError) {
          console.error("Auto-delivery creation failed:", deliveryError);
          // Alert specifically about the delivery scheduling failure
          throw new Error(`Customer created, but failed to automatically schedule the delivery: ${deliveryError.message}`);
        }
      }

      await fetchCustomers();
      handleCloseModal();
    } catch (error) {
      console.error('Error saving customer:', error);
      alert('Error saving customer. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this customer?')) return;

    try {
      const { error } = await supabase
        .from('customers')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setCustomers(customers.filter(c => c.id !== id));
    } catch (error) {
      console.error('Error deleting customer:', error);
    }
  };

  const openTxModal = (customer: Customer) => {
    setTxCustomer(customer);
    setTxFormData({
      amount: '',
      transaction_type: 'payment',
      note: ''
    });
    setIsTxModalOpen(true);
  };

  const handleTxSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!txCustomer) return;
    setIsSubmitting(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('customer_transactions')
        .insert([{
          supplier_id: user.id,
          customer_id: txCustomer.id,
          amount: parseFloat(txFormData.amount),
          transaction_type: txFormData.transaction_type,
          note: txFormData.note
        }]);

      if (error) throw error;

      await fetchCustomers();
      setIsTxModalOpen(false);
    } catch (error) {
      console.error('Error saving transaction:', error);
      alert('Error saving transaction. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredCustomers = customers.filter(c =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.address.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setFormData(prev => ({ ...prev, phone: value }));

    const digitsOnly = value.replace(/\D/g, '');
    if (digitsOnly.length === 10 && !editingCustomer) {
      const found = customers.find(c =>
        c.phone === value ||
        (c.phone && c.phone.replace(/\D/g, '') === digitsOnly)
      );

      if (found) {
        setFormData({
          name: found.name,
          phone: value,
          address: found.address || '',
          delivery_type: found.delivery_type || 'daily',
          delivery_time: found.delivery_time || '',
          default_bottles: found.default_bottles || 0,
          price_per_bottle: found.price_per_bottle || 0,
          paid_amount: found.paid_amount || 0,
          driver_id: found.driver_id || '',
          delivery_date: found.delivery_date || ''
        });
        setEditingCustomer(found);
      }
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-text-main">Customers</h1>
          <p className="text-sm sm:text-base text-text-muted">Manage your customer base and delivery locations.</p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="flex items-center justify-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors shadow-sm self-start"
        >
          <Plus size={18} />
          Add Customer
        </button>
      </div>

      <div className="flex flex-col gap-4 bg-white p-4 rounded-xl border border-slate-100 shadow-soft">
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={18} />
          <input
            type="text"
            placeholder="Search customers, addresses..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
          />
        </div>
        <div className="flex flex-col sm:flex-row gap-2 w-full">
          <button className="px-4 py-2 border border-slate-200 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors whitespace-nowrap">
            View on Map
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="animate-spin text-primary" size={40} />
        </div>
      ) : (
        <DataTable
          data={filteredCustomers}
          columns={[
            {
              header: 'Customer',
              accessor: (c: Customer) => (
                <div>
                  <p className="font-semibold text-text-main">{c.name}</p>
                  <div className="flex items-center gap-1 text-xs text-text-muted mt-0.5">
                    <MapPin size={12} className="shrink-0" /> <span className="truncate max-w-[200px]">{c.address}</span>
                  </div>
                </div>
              )
            },
            {
              header: 'Contact',
              mobileLabel: 'Phone',
              accessor: (c: Customer) => (
                <div className="space-y-0.5">
                  {c.phone && <p className="text-xs text-text-main font-medium flex items-center gap-1"><Phone size={12} /> {c.phone}</p>}
                </div>
              )
            },
            {
              header: 'Subscription',
              mobileLabel: 'Plan',
              accessor: (c: Customer) => (
                <div>
                  <p className="text-sm font-medium capitalize text-text-main">{c.delivery_type?.replace('_', ' ')} {c.delivery_time && `at ${c.delivery_time}`}</p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <p className="text-xs text-text-muted">{c.default_bottles} bottles @ ₹{c.price_per_bottle?.toFixed(2)}/rs</p>
                    {c.drivers?.name && (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded text-[10px] font-bold uppercase tracking-wider">
                        Driver: {c.drivers.name}
                      </span>
                    )}
                  </div>
                </div>
              )
            },
            {
              header: 'Joined Date',
              mobileLabel: 'Joined',
              accessor: (c: Customer) => (
                <span className="text-sm text-text-muted">
                  {c.created_at ? new Date(c.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A'}
                </span>
              )
            },
            {
              header: 'Balance',
              accessor: (c: Customer) => {
                const b = c.balance || 0;
                const paidAmount = c.paid_amount || 0;
                let statusLabel = 'Paid';
                let valueStr = `: ₹${paidAmount.toFixed(2)}`;
                let styleClass = 'text-success';

                if (b < 0) {
                  statusLabel = 'Due';
                  valueStr = `: ₹${Math.abs(b).toFixed(2)}`;
                  styleClass = 'text-error';
                } else if (b > 0) {
                  statusLabel = 'Extra';
                  valueStr = `: ₹${b.toFixed(2)}`;
                  styleClass = 'text-text-main';
                }

                return (
                  <span className={`font-semibold ${styleClass}`}>
                    {statusLabel}{valueStr}
                  </span>
                );
              }
            },
            {
              header: 'Actions',
              accessor: (c: Customer) => (
                <div className="flex items-center justify-end gap-2">
                  <button
                    onClick={() => openTxModal(c)}
                    title="Record Transaction"
                    className="p-1 hover:bg-primary/10 text-primary rounded transition-colors"
                  >
                    <CreditCard size={16} />
                  </button>
                  <button
                    onClick={() => handleOpenModal(c)}
                    className="p-1 hover:bg-slate-100 rounded text-text-muted transition-colors"
                  >
                    <Edit size={16} />
                  </button>
                  <button
                    onClick={() => handleDelete(c.id)}
                    className="p-1 hover:bg-error/10 text-error/70 hover:text-error rounded transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ),
              className: 'text-right'
            }
          ]}
        />
      )}

      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={editingCustomer ? "Edit Customer" : "Add New Customer"}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-semibold text-text-main">Phone Number</label>
            <input
              required
              type="tel"
              value={formData.phone}
              onChange={handlePhoneChange}
              placeholder="e.g. 1234567890"
              className="w-full px-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-semibold text-text-main">Full Name / Business Name</label>
            <input
              required
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g. Green Valley Apartments"
              className="w-full px-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-semibold text-text-main">Delivery Address</label>
            <textarea
              required
              rows={3}
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              placeholder="123 Street Name, Area, City"
              className="w-full px-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-text-main">Delivery Type</label>
              <select
                value={formData.delivery_type}
                onChange={(e) => setFormData({ ...formData, delivery_type: e.target.value })}
                className="w-full px-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white"
              >
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
                <option value="one_time">One Time</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-text-main">Delivery Time (Optional)</label>
              <input
                type="time"
                value={formData.delivery_time}
                onChange={(e) => setFormData({ ...formData, delivery_time: e.target.value })}
                className="w-full px-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-text-main">Delivery Date (Optional)</label>
              <input
                type="date"
                value={formData.delivery_date}
                onChange={(e) => setFormData({ ...formData, delivery_date: e.target.value })}
                className="w-full px-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-text-main">Assigned Driver</label>
              <select
                value={formData.driver_id || ''}
                onChange={(e) => setFormData({ ...formData, driver_id: e.target.value })}
                className="w-full px-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white"
              >
                <option value="">Select a Driver</option>
                {drivers.map(d => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-text-main">Default Bottles</label>
              <input
                type="number"
                value={formData.default_bottles}
                onChange={(e) => setFormData({ ...formData, default_bottles: Number(e.target.value) })}
                placeholder="e.g. 2"
                className="w-full px-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-text-main">Price per Bottle (₹)</label>
              <input
                type="number"
                step="0.01"
                value={formData.price_per_bottle}
                onChange={(e) => setFormData({ ...formData, price_per_bottle: Number(e.target.value) })}
                placeholder="e.g. 5.00"
                className="w-full px-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-semibold text-text-main">Paid Amount (₹)</label>
                <button
                  type="button"
                  onClick={() => {
                    const requiredAmount = (Number(formData.price_per_bottle) || 0) * (Number(formData.default_bottles) || 0);
                    setFormData({ ...formData, paid_amount: requiredAmount });
                  }}
                  className="text-xs text-primary font-medium hover:bg-primary/20 transition-colors bg-primary/10 px-2 py-0.5 rounded"
                >
                  Mark Paid
                </button>
              </div>
              <input
                type="number"
                step="0.01"
                value={formData.paid_amount}
                onChange={(e) => setFormData({ ...formData, paid_amount: Number(e.target.value) })}
                placeholder="e.g. 0.00"
                className="w-full px-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>
          </div>
          <div className="pt-4 flex items-center gap-3">
            <button
              type="button"
              onClick={handleCloseModal}
              className="flex-1 py-2 px-4 border border-slate-200 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 py-2 px-4 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors flex items-center justify-center gap-2"
            >
              {isSubmitting ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
              {editingCustomer ? "Save Changes" : "Create Customer"}
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={isTxModalOpen}
        onClose={() => setIsTxModalOpen(false)}
        title={`Record Transaction - ${txCustomer?.name}`}
      >
        <form onSubmit={handleTxSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-semibold text-text-main">Transaction Type</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setTxFormData({ ...txFormData, transaction_type: 'payment' })}
                className={`py-2 px-4 rounded-lg border text-sm font-medium transition-colors ${txFormData.transaction_type === 'payment'
                    ? 'bg-success/10 border-success text-success'
                    : 'bg-white border-slate-200 text-text-muted hover:bg-slate-50'
                  }`}
              >
                Payment (Received)
              </button>
              <button
                type="button"
                onClick={() => setTxFormData({ ...txFormData, transaction_type: 'credit' })}
                className={`py-2 px-4 rounded-lg border text-sm font-medium transition-colors ${txFormData.transaction_type === 'credit'
                    ? 'bg-error/10 border-error text-error'
                    : 'bg-white border-slate-200 text-text-muted hover:bg-slate-50'
                  }`}
              >
                Credit (Given)
              </button>
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-semibold text-text-main">Amount (₹)</label>
            <div className="relative">
              <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={14} />
              <input
                required
                type="number"
                step="0.01"
                min="0.01"
                value={txFormData.amount}
                onChange={(e) => setTxFormData({ ...txFormData, amount: e.target.value })}
                placeholder="0.00"
                className="w-full pl-8 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-semibold text-text-main">Note (Optional)</label>
            <input
              type="text"
              value={txFormData.note}
              onChange={(e) => setTxFormData({ ...txFormData, note: e.target.value })}
              placeholder="e.g. Paid for 20 Jars"
              className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
          </div>
          <div className="pt-4 flex items-center gap-3">
            <button
              type="button"
              onClick={() => setIsTxModalOpen(false)}
              className="flex-1 py-2 px-4 border border-slate-200 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !txFormData.amount}
              className="flex-1 py-2 px-4 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isSubmitting ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
              Save Transaction
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
