"use client";

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  Users, 
  UserSquare2, 
  Package, 
  Truck, 
  BarChart3, 
  Settings,
  X
} from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Drivers', href: '/drivers', icon: UserSquare2 },
  { name: 'Customers', href: '/customers', icon: Users },
  { name: 'Inventory', href: '/inventory', icon: Package },
  { name: 'Deliveries', href: '/deliveries', icon: Truck },
  { name: 'Reports', href: '/reports', icon: BarChart3 },
  { name: 'Settings', href: '/settings', icon: Settings },
];

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  supplier: any;
}

export function Sidebar({ isOpen, onClose, supplier }: SidebarProps) {
  const pathname = usePathname();

  return (
    <>
      {/* Mobile Backdrop */}
      <div 
        className={cn(
          "fixed inset-0 bg-slate-900/50 z-40 lg:hidden transition-opacity duration-300",
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
        onClick={onClose}
      />

      {/* Sidebar Container */}
      <aside className={cn(
        "fixed top-0 left-0 bottom-0 w-64 bg-card-bg border-r border-slate-200 z-50 transition-transform duration-300 transform lg:translate-x-0 lg:static lg:inset-auto",
        isOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex flex-col h-full">
          {/* Logo Section */}
          <div className="h-16 flex items-center justify-between px-6 border-b border-slate-100">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-white">
                <Truck size={20} />
              </div>
              <span className="font-bold text-xl tracking-tight text-text-main">H2O Flow</span>
            </Link>
            <button onClick={onClose} className="lg:hidden text-text-muted hover:text-text-main">
              <X size={20} />
            </button>
          </div>

          {/* Navigation Section */}
          <nav className="flex-1 overflow-y-auto py-6 px-4 space-y-1">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => {
                    // Close drawer on mobile when navigation item is clicked
                    if (window.innerWidth < 1024) {
                      onClose();
                    }
                  }}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                    isActive 
                      ? "bg-primary/10 text-primary" 
                      : "text-text-muted hover:bg-slate-50 hover:text-text-main"
                  )}
                >
                  <item.icon size={18} className={cn(isActive ? "text-primary" : "text-text-muted")} />
                  {item.name}
                </Link>
              );
            })}
          </nav>

          {/* Footer Section */}
          <div className="p-4 border-t border-slate-100">
            <div className="bg-slate-50 rounded-xl p-4">
              <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">My Supplier Profile</p>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-secondary/20 flex items-center justify-center text-secondary font-bold text-sm">
                  {supplier?.business_name?.substring(0, 2).toUpperCase() || 'S'}
                </div>
                <div className="overflow-hidden">
                  <p className="text-sm font-semibold truncate text-text-main">{supplier?.business_name || 'Business Name'}</p>
                  <p className="text-xs text-text-muted truncate">{supplier?.owner_name || 'Owner'}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
