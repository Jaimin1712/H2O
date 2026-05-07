"use client";

import React, { useEffect, useState } from 'react';
import { 
  Users, 
  UserSquare2, 
  Package, 
  Truck,
  Plus,
  ArrowRight,
  MoreVertical,
  Loader2
} from 'lucide-react';
import { StatsCard } from '@/components/StatsCard';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

export default function DashboardPage() {
  const [stats, setStats] = useState({
    totalCustomers: 0,
    activeDrivers: 0,
    inventoryStock: 0,
    todayDeliveries: 0
  });
  const [recentDeliveries, setRecentDeliveries] = useState<any[]>([]);
  const [lowStockItems, setLowStockItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const todayEnd = new Date();
        todayEnd.setHours(23, 59, 59, 999);

        // Fetch Stats
        const [customersCount, driversCount, inventoryData, deliveriesToday] = await Promise.all([
          supabase.from('customers').select('*', { count: 'exact', head: true }).eq('supplier_id', user.id),
          supabase.from('drivers').select('*', { count: 'exact', head: true }).eq('supplier_id', user.id).eq('status', 'active'),
          supabase.from('inventory_items').select('stock_quantity').eq('supplier_id', user.id),
          supabase.from('deliveries').select('*', { count: 'exact', head: true })
            .eq('supplier_id', user.id)
          .gte('scheduled_date', todayStart.toISOString())
          .lt('scheduled_date', todayEnd.toISOString())
        ]);

        const totalStock = inventoryData.data?.reduce((acc, item) => acc + (item.stock_quantity || 0), 0) || 0;

        setStats({
          totalCustomers: customersCount.count || 0,
          activeDrivers: driversCount.count || 0,
          inventoryStock: totalStock,
          todayDeliveries: deliveriesToday.count || 0
        });

        // Fetch Recent Deliveries
        const { data: deliveries } = await supabase
          .from('deliveries')
          .select(`
            id,
            status,
            bottles_delivered,
            scheduled_date,
            customers (name),
            drivers (name)
          `)
          .eq('supplier_id', user.id)
          .order('created_at', { ascending: false })
          .limit(5);

        if (deliveries) {
          setRecentDeliveries(deliveries.map(d => ({
            id: d.id,
            customer: (d.customers as any)?.name || 'Unknown',
            driver: (d.drivers as any)?.name || 'Unassigned',
            status: d.status,
            amount: `${d.bottles_delivered} Bottles`,
            time: new Date(d.scheduled_date).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
          })));
        }

        // Fetch Low Stock
        const { data: lowStock } = await supabase
          .from('inventory_items')
          .select('item_name, available_stock, low_stock_threshold')
          .eq('supplier_id', user.id)
          .lt('available_stock', 20) // Simple threshold for demo
          .limit(3);

        if (lowStock) {
          setLowStockItems(lowStock);
        }

      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="animate-spin text-primary" size={40} />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Welcome Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-main">Dashboard Overview</h1>
          <p className="text-text-muted">Welcome back! Here's what's happening today.</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 px-4 py-2 border border-slate-200 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors">
            Download Report
          </button>
          <Link href="/deliveries" className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors shadow-sm">
            <Plus size={18} />
            New Delivery
          </Link>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatsCard 
          title="Total Customers" 
          value={stats.totalCustomers.toString()} 
          icon={Users} 
          color="primary"
        />
        <StatsCard 
          title="Active Drivers" 
          value={stats.activeDrivers.toString()} 
          icon={UserSquare2} 
          color="secondary"
        />
        <StatsCard 
          title="Inventory Stock" 
          value={stats.inventoryStock.toString()} 
          icon={Package} 
          color="warning"
        />
        <StatsCard 
          title="Today's Deliveries" 
          value={stats.todayDeliveries.toString()} 
          icon={Truck} 
          color="success"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent Deliveries Table */}
        <div className="lg:col-span-2 bg-card-bg rounded-xl border border-slate-100 shadow-soft overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <h2 className="font-bold text-text-main">Recent Deliveries</h2>
            <Link href="/deliveries" className="text-primary text-sm font-medium hover:underline flex items-center gap-1">
              View All <ArrowRight size={14} />
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50">
                  <th className="px-6 py-3 text-xs font-semibold text-text-muted uppercase tracking-wider">Customer</th>
                  <th className="px-6 py-3 text-xs font-semibold text-text-muted uppercase tracking-wider">Driver</th>
                  <th className="px-6 py-3 text-xs font-semibold text-text-muted uppercase tracking-wider">Amount</th>
                  <th className="px-6 py-3 text-xs font-semibold text-text-muted uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-xs font-semibold text-text-muted uppercase tracking-wider">Date</th>
                  <th className="px-6 py-3 text-xs font-semibold text-text-muted uppercase tracking-wider"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentDeliveries.length > 0 ? recentDeliveries.map((activity) => (
                  <tr key={activity.id} className="hover:bg-slate-50/30 transition-colors">
                    <td className="px-6 py-4">
                      <p className="text-sm font-semibold text-text-main">{activity.customer}</p>
                    </td>
                    <td className="px-6 py-4 text-sm text-text-muted">{activity.driver}</td>
                    <td className="px-6 py-4 text-sm text-text-main font-medium">{activity.amount}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        activity.status === 'completed' ? 'bg-success/10 text-success' :
                        activity.status === 'in_progress' ? 'bg-secondary/10 text-secondary' :
                        activity.status === 'pending' ? 'bg-warning/10 text-warning' :
                        'bg-error/10 text-error'
                      }`}>
                        {activity.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-text-muted">{activity.time}</td>
                    <td className="px-6 py-4 text-right">
                      <button className="p-1 hover:bg-slate-100 rounded text-text-muted">
                        <MoreVertical size={16} />
                      </button>
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-text-muted text-sm italic">
                      No recent deliveries found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Quick Actions & Low Stock */}
        <div className="space-y-6">
          <div className="bg-card-bg rounded-xl border border-slate-100 shadow-soft p-6">
            <h2 className="font-bold text-text-main mb-4">Quick Actions</h2>
            <div className="grid grid-cols-2 gap-3">
              <Link href="/customers" className="flex flex-col items-center justify-center p-4 rounded-xl border border-slate-100 hover:border-primary/30 hover:bg-primary/5 transition-all group text-center">
                <Users className="text-text-muted group-hover:text-primary mb-2" size={20} />
                <span className="text-xs font-medium text-text-muted group-hover:text-text-main">Add Customer</span>
              </Link>
              <Link href="/drivers" className="flex flex-col items-center justify-center p-4 rounded-xl border border-slate-100 hover:border-primary/30 hover:bg-primary/5 transition-all group text-center">
                <UserSquare2 className="text-text-muted group-hover:text-primary mb-2" size={20} />
                <span className="text-xs font-medium text-text-muted group-hover:text-text-main">Add Driver</span>
              </Link>
              <Link href="/inventory" className="flex flex-col items-center justify-center p-4 rounded-xl border border-slate-100 hover:border-primary/30 hover:bg-primary/5 transition-all group text-center">
                <Package className="text-text-muted group-hover:text-primary mb-2" size={20} />
                <span className="text-xs font-medium text-text-muted group-hover:text-text-main">Update Stock</span>
              </Link>
              <Link href="/deliveries" className="flex flex-col items-center justify-center p-4 rounded-xl border border-slate-100 hover:border-primary/30 hover:bg-primary/5 transition-all group text-center">
                <Truck className="text-text-muted group-hover:text-primary mb-2" size={20} />
                <span className="text-xs font-medium text-text-muted group-hover:text-text-main">Route Plan</span>
              </Link>
            </div>
          </div>

          <div className="bg-card-bg rounded-xl border border-slate-100 shadow-soft p-6">
            <h2 className="font-bold text-text-main mb-4">Inventory Alerts</h2>
            <div className="space-y-4">
              {lowStockItems.length > 0 ? lowStockItems.map((item, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-text-main">{item.item_name}</p>
                    <p className="text-xs text-error font-medium">Low Stock: {item.available_stock} left</p>
                  </div>
                  <Link href="/inventory" className="text-xs font-semibold text-primary hover:underline">Reorder</Link>
                </div>
              )) : (
                <p className="text-sm text-text-muted italic">All stock levels are healthy.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
