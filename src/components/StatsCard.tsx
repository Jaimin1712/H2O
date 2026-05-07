import React from 'react';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatsCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  color?: "primary" | "secondary" | "success" | "warning" | "error";
}

const colorMap = {
  primary: "bg-primary/10 text-primary",
  secondary: "bg-secondary/10 text-secondary",
  success: "bg-success/10 text-success",
  warning: "bg-warning/10 text-warning",
  error: "bg-error/10 text-error",
};

export function StatsCard({ title, value, icon: Icon, trend, color = "primary" }: StatsCardProps) {
  return (
    <div className="bg-card-bg p-4 sm:p-6 rounded-xl border border-slate-100 shadow-soft transition-all hover:shadow-md">
      <div className="flex items-center justify-between mb-3 sm:mb-4">
        <div className={cn("p-2 sm:p-2.5 rounded-lg", colorMap[color])}>
          <Icon size={16} className="sm:size-12" />
        </div>
        {trend && (
          <div className={cn(
            "text-xs font-medium px-2 py-1 rounded-full",
            trend.isPositive ? "bg-success/10 text-success" : "bg-error/10 text-error"
          )}>
            {trend.isPositive ? '+' : '-'}{trend.value}%
          </div>
        )}
      </div>
      <div>
        <p className="text-xs sm:text-sm font-medium text-text-muted">{title}</p>
        <p className="text-lg sm:text-2xl font-bold text-text-main mt-1">{value}</p>
      </div>
    </div>
  );
}
