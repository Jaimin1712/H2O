"use client";

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
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
  Edit,
  Users,
  Truck,
  Navigation,
  CheckCircle,
  XCircle,
  Phone,
  Package,
  LogOut,
  ChevronRight,
  TrendingUp
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';

interface Delivery {
  id: string;
  customers: {
    name: string;
    address: string;
    phone: string;
  };
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  scheduled_date: string;
  bottles_delivered: number;
  bottles_returned: number;
}

interface DriverProfile {
  id: string;
  name: string;
  supplier_id: string;
}

interface AssignedCustomer {
  id: string;
  name: string;
  address: string;
  phone: string;
}

export default function DriverAppPage() {
  const [driver, setDriver] = useState<DriverProfile | null>(null);
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [assignedCustomers, setAssignedCustomers] = useState<AssignedCustomer[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeDelivery, setActiveDelivery] = useState<Delivery | null>(null);
  const [updating, setUpdating] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    async function initApp() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          router.push('/login');
          return;
        }

        // Fetch driver record
        const { data: driverData, error: driverError } = await supabase
          .from('drivers')
          .select('id, name, supplier_id')
          .eq('auth_user_id', user.id)
          .maybeSingle();

        if (!driverData) {
          // Check if admin accidentally accessed driver app
          const { data: supplier } = await supabase
            .from('suppliers')
            .select('id')
            .eq('id', user.id)
            .maybeSingle();

          if (supplier) {
            router.push('/');
          } else {
            await supabase.auth.signOut();
            router.push('/login');
          }
          return;
        }

        setDriver(driverData);

        // Fetch today's deliveries
        // We use local date to avoid UTC timezone shifts
        const now = new Date();
        const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
        
        // Fetch deliveries that are either for today OR are currently in progress/pending
        const { data: deliveryData, error: deliveryError } = await supabase
          .from('deliveries')
          .select(`
            id,
            status,
            scheduled_date,
            bottles_delivered,
            bottles_returned,
            customers (
              name,
              address,
              phone
            )
          `)
          .eq('driver_id', driverData.id)
          .or(`status.eq.pending,status.eq.in_progress,scheduled_date.eq.${todayStr}`)
          .order('scheduled_date', { ascending: true });

        if (deliveryError) throw deliveryError;
        setDeliveries((deliveryData as any) || []);

        // Fetch assigned customers (leads)
        const { data: customerData } = await supabase
          .from('customers')
          .select('id, name, address, phone')
          .eq('driver_id', driverData.id);
        
        setAssignedCustomers(customerData || []);

      } catch (error: any) {
        console.error('Error initializing driver app:', error);
        alert(error.message || 'Failed to initialize app');
      } finally {
        setLoading(false);
      }
    }

    initApp();
  }, [router]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  const handleCompleteTask = async (deliveryId: string, delivered: number, returned: number) => {
    setUpdating(deliveryId);
    try {
      const { error } = await supabase
        .from('deliveries')
        .update({
          status: 'completed',
          bottles_delivered: delivered,
          bottles_returned: returned,
          completed_at: new Date().toISOString()
        })
        .eq('id', deliveryId);

      if (error) throw error;

      // Update local state
      setDeliveries(prev => prev.map(d => 
        d.id === deliveryId ? { ...d, status: 'completed', bottles_delivered: delivered, bottles_returned: returned } : d
      ));
      setActiveDelivery(null);
    } catch (error) {
      console.error('Error completing delivery:', error);
      alert('Failed to update delivery');
    } finally {
      setUpdating(null);
    }
  };

  if (loading) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-slate-50 p-6">
        <Loader2 className="animate-spin text-primary mb-4" size={40} />
        <p className="text-text-muted font-medium">Loading your route...</p>
      </div>
    );
  }

  // View: Single Delivery Detail
  if (activeDelivery) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col">
        <header className="p-4 flex items-center gap-3">
          <button 
            onClick={() => setActiveDelivery(null)}
            className="w-10 h-10 flex items-center justify-center rounded-full bg-white border border-slate-200 shadow-sm"
          >
            <XCircle size={20} className="text-text-muted" />
          </button>
          <h1 className="font-bold text-lg">Delivery Details</h1>
        </header>

        <main className="flex-1 p-4 space-y-4">
          <div className="bg-primary p-6 rounded-2xl text-white shadow-lg">
            <h2 className="text-2xl font-bold mb-1">{activeDelivery.customers.name}</h2>
            <p className="text-white/80 flex items-center gap-2 mb-6">
              <MapPin size={16} /> {activeDelivery.customers.address}
            </p>
            
            <div className="flex gap-3">
              <a 
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(activeDelivery.customers.address)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 bg-white text-primary py-3 rounded-xl font-bold flex items-center justify-center gap-2 shadow-sm"
              >
                <Navigation size={20} /> Navigate
              </a>
              <a 
                href={`tel:${activeDelivery.customers.phone}`}
                className="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center border border-white/30"
              >
                <Phone size={24} />
              </a>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center text-primary">
                  <Package size={24} />
                </div>
                <div>
                  <p className="text-sm text-text-muted">Expected Order</p>
                  <p className="font-bold text-text-main">Water Supply</p>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-4">
                <CounterInput 
                  label="Bottles Delivered" 
                  value={activeDelivery.bottles_delivered || 0} 
                  onChange={(v) => setActiveDelivery({...activeDelivery, bottles_delivered: v})}
                />
                <CounterInput 
                  label="Empty Bottles Returned" 
                  value={activeDelivery.bottles_returned || 0} 
                  onChange={(v) => setActiveDelivery({...activeDelivery, bottles_returned: v})}
                />
              </div>

            <button 
              onClick={() => handleCompleteTask(activeDelivery.id, activeDelivery.bottles_delivered, activeDelivery.bottles_returned)}
              disabled={updating === activeDelivery.id}
              className="w-full bg-success text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-success/20 disabled:opacity-70"
            >
              {updating === activeDelivery.id ? <Loader2 className="animate-spin" size={20} /> : <><CheckCircle size={20} /> Complete Delivery</>}
            </button>
          </div>
        </main>
      </div>
    );
  }

  // View: Delivery List (Home)
  const pendingDeliveries = deliveries.filter(d => d.status !== 'completed');
  const completedDeliveries = deliveries.filter(d => d.status === 'completed');

  return (
    <div className="min-h-screen bg-slate-50 pb-10">
      <header className="bg-white p-6 border-b border-slate-100 flex items-center justify-between sticky top-0 z-10 shadow-sm">
        <div>
          <p className="text-sm text-text-muted">Welcome back,</p>
          <h1 className="text-xl font-bold flex items-center gap-2">
            {driver?.name} <TrendingUp size={16} className="text-success" />
          </h1>
        </div>
        <button 
          onClick={handleLogout}
          className="w-10 h-10 flex items-center justify-center text-error bg-error/5 rounded-full"
        >
          <LogOut size={20} />
        </button>
      </header>

      <main className="p-4 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
            <p className="text-xs font-bold text-text-muted uppercase mb-1">Today's Jobs</p>
            <p className="text-2xl font-black text-primary">{deliveries.length}</p>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
            <p className="text-xs font-bold text-text-muted uppercase mb-1">Completed</p>
            <p className="text-2xl font-black text-success">{completedDeliveries.length}</p>
          </div>
        </div>

        {/* Section: Pending Jobs */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold flex items-center gap-2 text-text-main">
              Today's Route <span className="bg-primary/10 text-primary text-xs px-2 py-0.5 rounded-full">{pendingDeliveries.length}</span>
            </h2>
          </div>

          {pendingDeliveries.length === 0 ? (
            <div className="bg-white p-8 rounded-2xl border border-dashed border-slate-200 flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center text-slate-300 mb-3">
                <Truck size={32} />
              </div>
              <p className="font-bold text-text-main">All jobs completed!</p>
              <p className="text-sm text-text-muted">Take a break or check again later.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {pendingDeliveries.map(delivery => (
                <button 
                  key={delivery.id}
                  onClick={() => setActiveDelivery(delivery)}
                  className="w-full bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4 active:scale-[0.98] transition-all text-left"
                >
                  <div className="w-12 h-12 bg-primary/5 rounded-xl flex items-center justify-center text-primary shrink-0">
                    <MapPin size={24} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-text-main truncate">{delivery.customers.name}</p>
                    <p className="text-xs text-text-muted truncate flex items-center gap-1">
                      <Clock size={12} /> {delivery.customers.address}
                    </p>
                  </div>
                  <ChevronRight size={20} className="text-slate-300" />
                </button>
              ))}
            </div>
          )}
        </section>

        {/* Section: My Customers (Leads) */}
        {assignedCustomers.length > 0 && (
          <section className="pt-4 border-t border-slate-200">
            <h2 className="font-bold text-text-main mb-4 flex items-center gap-2">
              My Assigned Customers <Users size={16} className="text-primary" />
            </h2>
            <div className="grid grid-cols-1 gap-3">
              {assignedCustomers.map(customer => (
                <div key={customer.id} className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-text-main truncate">{customer.name}</p>
                    <p className="text-xs text-text-muted truncate flex items-center gap-1">
                      <MapPin size={10} /> {customer.address}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <a href={`tel:${customer.phone}`} className="p-2 bg-success/10 text-success rounded-lg">
                      <Phone size={16} />
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Section: Completed */}
        {completedDeliveries.length > 0 && (
          <section>
            <h2 className="font-bold text-text-main mb-4 flex items-center gap-2">
              Recently Completed <CheckCircle size={16} className="text-success" />
            </h2>
            <div className="space-y-2 opacity-60 pointer-events-none">
              {completedDeliveries.map(delivery => (
                <div key={delivery.id} className="bg-slate-100 p-4 rounded-xl flex items-center justify-between">
                  <p className="text-sm font-medium line-through decoration-slate-400">{delivery.customers.name}</p>
                  <div className="flex items-center gap-4 text-xs font-bold">
                    <span>{delivery.bottles_delivered} Del.</span>
                    <span>{delivery.bottles_returned} Ret.</span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

function CounterInput({ label, value, onChange }: { label: string, value: number, onChange: (v: number) => void }) {
  return (
    <div className="flex items-center justify-between p-4 bg-slate-50 border border-slate-100 rounded-xl">
      <span className="text-sm font-semibold">{label}</span>
      <div className="flex items-center gap-4">
        <button 
          onClick={() => onChange(Math.max(0, value - 1))}
          className="w-10 h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center text-text-main shadow-sm active:bg-slate-50"
        >
          -
        </button>
        <span className="font-black text-lg w-6 text-center">{value}</span>
        <button 
          onClick={() => onChange(value + 1)}
          className="w-10 h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center text-text-main shadow-sm active:bg-slate-50"
        >
          +
        </button>
      </div>
    </div>
  );
}
