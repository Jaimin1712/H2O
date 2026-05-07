"use client";

import React, { useEffect, useState } from 'react';
import { 
  Package, 
  ArrowUpRight, 
  ArrowDownLeft,
  AlertTriangle,
  History,
  Plus,
  Edit,
  Trash2,
  Loader2,
  Save,
  IndianRupee
} from 'lucide-react';
import { StatsCard } from '@/components/StatsCard';
import { DataTable } from '@/components/DataTable';
import { Modal } from '@/components/Modal';
import { supabase } from '@/lib/supabase';

interface InventoryItem {
  id: string;
  name: string;
  capacity: string | null;
  stock_quantity: number;
  created_at?: string;
}

export default function InventoryPage() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [bookedStock, setBookedStock] = useState(0);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    capacity: '',
    stock_quantity: 0
  });

  const fetchInventory = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const [{ data, error }, { data: deliveries }] = await Promise.all([
        supabase
          .from('inventory_items')
          .select('id, name, capacity, stock_quantity, created_at')
          .eq('supplier_id', user.id)
          .order('name', { ascending: true }),
        supabase
          .from('deliveries')
          .select('bottles_delivered')
          .eq('supplier_id', user.id)
          .in('status', ['pending', 'in_progress'])
      ]);

      if (error) throw error;
      setItems(data || []);
      
      const booked = deliveries?.reduce((acc, d) => acc + (d.bottles_delivered || 0), 0) || 0;
      setBookedStock(booked);
    } catch (error) {
      console.error('Error fetching inventory:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInventory();
  }, []);

  const handleOpenModal = (item: InventoryItem | null = null) => {
    if (item) {
      setEditingItem(item);
      setFormData({
        name: item.name,
        capacity: item.capacity || '',
        stock_quantity: item.stock_quantity
      });
    } else {
      setEditingItem(null);
      setFormData({
        name: '',
        capacity: '',
        stock_quantity: 0
      });
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingItem(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      if (editingItem) {
        const { error } = await supabase
          .from('inventory_items')
          .update(formData)
          .eq('id', editingItem.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('inventory_items')
          .insert([{ ...formData, supplier_id: user.id }]);
        if (error) throw error;
      }

      await fetchInventory();
      closeModal();
    } catch (error) {
      console.error('Error saving inventory item:', error);
      alert('Error saving item. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this item?')) return;

    try {
      const { error } = await supabase.from('inventory_items').delete().eq('id', id);
      if (error) throw error;
      setItems(items.filter(i => i.id !== id));
    } catch (error) {
      console.error('Error deleting item:', error);
    }
  };

  const totalBottles = items.reduce((acc, i) => acc + i.stock_quantity, 0);
  const availableStock = totalBottles - bookedStock;
  const lowStockCount = 0; // Removing low stock alerts for now since threshold is gone

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-main">Inventory Management</h1>
          <p className="text-text-muted">Track stock levels, equipment, and bottle returns.</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 px-4 py-2 border border-slate-200 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors">
            <History size={16} />
            Stock History
          </button>
          <button 
            onClick={() => handleOpenModal()}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors shadow-sm"
          >
            <Package size={18} />
            Add New Item
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <StatsCard title="Total Stock" value={totalBottles.toString()} icon={Package} color="primary" />
        <StatsCard title="Available Stock" value={Math.max(0, availableStock).toString()} icon={ArrowUpRight} color="success" />
        <StatsCard title="Booked" value={bookedStock.toString()} icon={AlertTriangle} color="warning" />
      </div>

      <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-soft">
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-bold text-text-main">Stock Overview</h2>
          {lowStockCount > 0 && (
            <div className="flex items-center gap-2 text-sm text-error font-medium">
              <AlertTriangle size={14} />
              <span>{lowStockCount} items low in stock</span>
            </div>
          )}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="animate-spin text-primary" size={40} />
          </div>
        ) : (
          <DataTable 
            data={items}
            columns={[
              { 
                header: 'Item Details', 
                accessor: (item: InventoryItem) => (
                  <div>
                    <p className="font-semibold text-text-main">{item.name}</p>
                    <p className="text-xs text-text-muted">{item.capacity || 'No capacity'}</p>
                  </div>
                )
              },
              { 
                header: 'Stock Level', 
                accessor: (item: InventoryItem) => (
                  <div className="flex items-center gap-4">
                    <span className="font-medium text-text-main">{item.stock_quantity}</span>
                  </div>
                )
              },
              {
                header: 'Created At',
                accessor: (item: InventoryItem) => (
                  <span className="text-sm text-text-muted">
                    {item.created_at ? new Date(item.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A'}
                  </span>
                )
              },
              { 
                header: 'Actions', 
                accessor: (item: InventoryItem) => (
                  <div className="flex items-center justify-end gap-2">
                    <button 
                      onClick={() => handleOpenModal(item)}
                      className="p-1 hover:bg-slate-100 rounded text-text-muted transition-colors"
                    >
                      <Edit size={16} />
                    </button>
                    <button 
                      onClick={() => handleDelete(item.id)}
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
      </div>

      <Modal 
        isOpen={isModalOpen} 
        onClose={closeModal} 
        title={editingItem ? "Edit Inventory Item" : "Add New Item"}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-semibold text-text-main">Item Name</label>
            <input 
              required
              type="text" 
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              placeholder="e.g. 20L Spring Water Bottle" 
              className="w-full px-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-text-main">Capacity</label>
              <input 
                type="text" 
                value={formData.capacity}
                onChange={(e) => setFormData({...formData, capacity: e.target.value})}
                placeholder="e.g. 20L"
                className="w-full px-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-text-main">Stock Quantity</label>
              <input 
                required
                type="number" 
                value={formData.stock_quantity}
                onChange={(e) => setFormData({...formData, stock_quantity: parseInt(e.target.value)})}
                className="w-full px-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-center"
              />
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
              {editingItem ? "Update Item" : "Add Item"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
