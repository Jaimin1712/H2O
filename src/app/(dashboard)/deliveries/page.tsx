"use client";

import React, { useEffect, useState } from 'react';
import { 
  Calendar, 
  MapPin, 
  User, 
  Clock,
  CheckCircle2,
  AlertCircle,
  PlayCircle,
  Plus,
  Loader2,
  X,
  Save,
  Trash2,
  Edit
} from 'lucide-react';
import { DataTable } from '@/components/DataTable';
import { Modal } from '@/components/Modal';
import { supabase } from '@/lib/supabase';

interface Delivery {
  id: string;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  scheduled_date: string;
  bottles_delivered: number;
  customers: { name: string; address: string } | null;
  drivers: { name: string } | null;
  customer_id: string;
  driver_id: string | null;
  delivery_type: 'daily' | 'weekly' | 'monthly' | 'one_time';
  created_at?: string;
}

export default function DeliveriesPage() {
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [drivers, setDrivers] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingDelivery, setEditingDelivery] = useState<Delivery | null>(null);

  const [formData, setFormData] = useState({
    customer_id: '',
    driver_id: '',
    scheduled_date: new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16),
    bottles_delivered: 0,
    status: 'pending',
    delivery_type: 'one_time'
  });

  const fetchData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const [deliveriesRes, driversRes, customersRes] = await Promise.all([
        supabase
          .from('deliveries')
          .select('*, customers(name, address), drivers(name)')
          .eq('supplier_id', user.id)
          .order('scheduled_date', { ascending: false }),
        supabase.from('drivers').select('id, name').eq('supplier_id', user.id).eq('status', 'active'),
        supabase.from('customers').select('id, name, driver_id').eq('supplier_id', user.id)
      ]);

      setDeliveries(deliveriesRes.data || []);
      setDrivers(driversRes.data || []);
      setCustomers(customersRes.data || []);
    } catch (error) {
      console.error('Error fetching deliveries data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleOpenModal = (delivery: Delivery | null = null) => {
    if (delivery) {
      setEditingDelivery(delivery);
      setFormData({
        customer_id: delivery.customer_id,
        driver_id: delivery.driver_id || '',
        scheduled_date: delivery.scheduled_date ? new Date(new Date(delivery.scheduled_date).getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16) : '',
        bottles_delivered: delivery.bottles_delivered,
        status: delivery.status,
        delivery_type: delivery.delivery_type || 'one_time'
      });
    } else {
      setEditingDelivery(null);
      setFormData({
        customer_id: customers[0]?.id || '',
        driver_id: drivers[0]?.id || '',
        scheduled_date: new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16),
        bottles_delivered: 0,
        status: 'pending',
        delivery_type: 'one_time'
      });
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingDelivery(null);
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Check stock availability
      const { data: inventoryData, error: inventoryError } = await supabase
        .from('inventory_items')
        .select('stock_quantity')
        .eq('supplier_id', user.id);

      if (inventoryError) throw inventoryError;

      const totalStock = inventoryData?.reduce((acc, item) => acc + (item.stock_quantity || 0), 0) || 0;

      if (formData.bottles_delivered > totalStock) {
        setError(`Not enough stock available. Current stock is ${totalStock} bottles.`);
        setIsSubmitting(false);
        return;
      }

      const payload = {
        ...formData,
        supplier_id: user.id,
        driver_id: formData.driver_id || null,
        scheduled_date: new Date(formData.scheduled_date).toISOString() // Convert back to UTC for database
      };

      if (editingDelivery) {
        const { error } = await supabase
          .from('deliveries')
          .update(payload)
          .eq('id', editingDelivery.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('deliveries')
          .insert([payload]);
        if (error) throw error;
      }

      await fetchData();
      closeModal();
    } catch (err) {
      console.error('Error saving delivery:', err);
      setError('Error saving delivery. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this delivery?')) return;
    try {
      const { error } = await supabase.from('deliveries').delete().eq('id', id);
      if (error) throw error;
      setDeliveries(deliveries.filter(d => d.id !== id));
    } catch (error) {
      console.error('Error deleting delivery:', error);
    }
  };

  const stats = {
    total: deliveries.length,
    completed: deliveries.filter(d => d.status === 'completed').length,
    running: deliveries.filter(d => d.status === 'in_progress').length,
    pending: deliveries.filter(d => d.status === 'pending').length
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-text-main">Deliveries</h1>
          <p className="text-sm sm:text-base text-text-muted">Monitor and schedule water deliveries in real-time.</p>
        </div>
        <button 
          onClick={() => handleOpenModal()}
          className="flex items-center justify-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors shadow-sm self-start"
        >
          <Plus size={18} />
          Schedule Delivery
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {[
          { label: 'Total Tasks', value: stats.total, icon: Clock, color: 'primary' },
          { label: 'Completed', value: stats.completed, icon: CheckCircle2, color: 'success' },
          { label: 'Running', value: stats.running, icon: PlayCircle, color: 'secondary' },
          { label: 'Pending', value: stats.pending, icon: AlertCircle, color: 'warning' },
        ].map((stat, i) => (
          <div key={i} className="bg-white p-3 sm:p-4 rounded-xl border border-slate-100 shadow-soft flex items-center gap-3 sm:gap-4">
            <div className={`p-1.5 sm:p-2 rounded-lg bg-primary/10 text-primary`}>
              <stat.icon size={16} className="sm:size-20" />
            </div>
            <div>
              <p className="text-xs sm:text-sm font-medium text-text-muted">{stat.label}</p>
              <p className="text-lg sm:text-xl font-bold text-text-main">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="animate-spin text-primary" size={40} />
        </div>
      ) : (
        <DataTable 
          data={deliveries}
          columns={[
            { 
              header: 'Customer', 
              accessor: (d: Delivery) => (
                <div className="flex items-center gap-2">
                  <MapPin size={14} className="text-text-muted shrink-0" />
                  <div>
                    <p className="font-semibold text-text-main">{d.customers?.name || 'Unknown'}</p>
                    <p className="text-xs text-text-muted truncate max-w-[150px]">{d.customers?.address || 'No address'}</p>
                  </div>
                </div>
              )
            },
            { 
              header: 'Driver', 
              mobileLabel: 'Assigned',
              accessor: (d: Delivery) => (
                <div className="flex items-center gap-2">
                  <User size={14} className="text-text-muted" />
                  <span className="text-sm">{d.drivers?.name || 'Unassigned'}</span>
                </div>
              )
            },
            { 
              header: 'Bottles', 
              mobileLabel: 'Quantity',
              accessor: (d: Delivery) => <span className="font-medium">{d.bottles_delivered}</span> 
            },
            { 
              header: 'Status', 
              accessor: (d: Delivery) => (
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${
                  d.status === 'completed' ? 'bg-success/10 text-success' :
                  d.status === 'in_progress' ? 'bg-secondary/10 text-secondary' :
                  d.status === 'pending' ? 'bg-warning/10 text-warning' :
                  'bg-error/10 text-error'
                }`}>
                  {d.status.replace('_', ' ')}
                </span>
              )
            },
            { 
              header: 'Scheduled', 
              mobileLabel: 'Date',
              accessor: (d: Delivery) => (
                <div className="flex flex-col">
                  <span className="text-sm text-text-muted">
                    {new Date(d.scheduled_date).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </span>
                  <span className="text-xs font-semibold text-primary/70 uppercase tracking-wide mt-0.5">
                    {d.delivery_type.replace('_', ' ')}
                  </span>
                </div>
              )
            },

            { 
              header: 'Actions', 
              accessor: (d: Delivery) => (
                <div className="flex items-center justify-end gap-2">
                  <button 
                    onClick={() => handleOpenModal(d)}
                    className="p-1 hover:bg-slate-100 rounded text-text-muted transition-colors"
                  >
                    <Edit size={16} />
                  </button>
                  <button 
                    onClick={() => handleDelete(d.id)}
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
        onClose={closeModal} 
        title={editingDelivery ? "Edit Delivery" : "Schedule New Delivery"}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 bg-error/10 border border-error/20 rounded-lg flex items-start gap-3">
              <AlertCircle className="text-error shrink-0 mt-0.5" size={18} />
              <p className="text-sm font-medium text-error">{error}</p>
            </div>
          )}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-text-main">Customer</label>
            <select 
              required
              value={formData.customer_id}
              onChange={(e) => {
                const selectedCustomerId = e.target.value;
                const customer = customers.find(c => c.id === selectedCustomerId);
                setFormData({
                  ...formData, 
                  customer_id: selectedCustomerId,
                  driver_id: customer?.driver_id || formData.driver_id
                });
              }}
              className="w-full px-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white transition-all overflow-hidden"
            >
              <option value="" disabled>Select a customer</option>
              {customers.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-semibold text-text-main">Driver (Optional)</label>
            <select 
              value={formData.driver_id}
              onChange={(e) => setFormData({...formData, driver_id: e.target.value})}
              className="w-full px-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white transition-all"
            >
              <option value="">Unassigned</option>
              {drivers.map(d => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-text-main">Scheduled Date & Time</label>
              <input 
                required
                type="datetime-local"
                value={formData.scheduled_date}
                onChange={(e) => setFormData({...formData, scheduled_date: e.target.value})}
                className="w-full px-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-text-main">Bottles</label>
              <input 
                required
                type="number"
                min="0"
                value={formData.bottles_delivered}
                onChange={(e) => setFormData({...formData, bottles_delivered: parseInt(e.target.value)})}
                className="w-full px-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-text-main">Type</label>
              <select 
                value={formData.delivery_type}
                onChange={(e) => setFormData({...formData, delivery_type: e.target.value as any})}
                className="w-full px-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white transition-all font-semibold"
              >
                <option value="one_time">One Time</option>
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-text-main">Status</label>
              <select 
                value={formData.status}
                onChange={(e) => setFormData({...formData, status: e.target.value as any})}
                className="w-full px-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white transition-all uppercase font-semibold text-xs tracking-wider"
              >
                <option value="pending">Pending</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>
          <div className="pt-4 flex items-center gap-3">
            <button 
              type="button"
              onClick={closeModal}
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
              {editingDelivery ? "Update Delivery" : "Schedule Delivery"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
