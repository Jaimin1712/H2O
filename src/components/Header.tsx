"use client";

import React from 'react';
import { 
  Bell, 
  Search, 
  Menu,
  ChevronDown,
  User,
  LogOut
} from 'lucide-react';

interface HeaderProps {
  onMenuClick: () => void;
  supplier: any;
  onLogout: () => void;
}

export function Header({ onMenuClick, supplier, onLogout }: HeaderProps) {
  const [isDropdownOpen, setIsDropdownOpen] = React.useState(false);

  return (
    <header className="h-16 border-b border-slate-200 bg-white sticky top-0 z-30 px-4 lg:px-8 flex items-center justify-between">
      <div className="flex items-center gap-4">
        <button 
          onClick={onMenuClick}
          className="lg:hidden p-2 hover:bg-slate-50 rounded-lg text-text-muted"
        >
          <Menu size={20} />
        </button>

        <div className="hidden md:flex items-center relative">
          <Search className="absolute left-3 text-text-muted" size={16} />
          <input 
            type="text" 
            placeholder="Search tasks, customers, drivers..." 
            className="pl-10 pr-4 py-2 bg-slate-50 border border-slate-100 rounded-lg text-sm w-64 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
          />
        </div>
      </div>

      <div className="flex items-center gap-2 lg:gap-4">
        <button className="p-2 text-text-muted hover:bg-slate-50 hover:text-text-main rounded-lg relative transition-colors">
          <Bell size={20} />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-error rounded-full border-2 border-white"></span>
        </button>
        
        <div className="h-8 w-px bg-slate-200 mx-1 hidden sm:block" />

        <div className="relative">
          <button 
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="flex items-center gap-2 p-1.5 hover:bg-slate-50 rounded-lg transition-colors cursor-pointer"
          >
            <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center overflow-hidden">
              <User size={18} className="text-slate-500" />
            </div>
            <div className="hidden sm:block text-left">
              <p className="text-sm font-semibold leading-none text-text-main">{supplier?.owner_name || 'User'}</p>
            </div>
            <ChevronDown size={14} className="text-text-muted" />
          </button>

          {isDropdownOpen && (
            <div className="absolute right-0 mt-2 w-48 bg-white border border-slate-200 rounded-xl shadow-lg z-50 py-2">
              <div className="px-4 py-2 border-b border-slate-100 mb-1 lg:hidden">
                <p className="text-sm font-semibold text-text-main truncate">{supplier?.business_name}</p>
                <p className="text-xs text-text-muted truncate">{supplier?.email}</p>
              </div>
              <button 
                onClick={onLogout}
                className="w-full flex items-center gap-2 px-4 py-2 text-sm text-error hover:bg-error/5 transition-colors"
              >
                <LogOut size={16} />
                Sign Out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
