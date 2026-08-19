import React from 'react';
import { cn } from '@/lib/utils';

export default function StatCard({ title, value, subtitle, icon: Icon, trend, trendUp }) {
  return <div className="bg-card rounded-xl border border-border p-5 hover:shadow-md transition-shadow duration-300"><div className="flex items-start justify-between"><div className="space-y-1"><p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{title}</p><p className="text-2xl font-bold font-heading text-foreground">{value}</p>{subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}</div>{Icon && <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center"><Icon className="w-5 h-5 text-primary"/></div>}</div>{trend && <div className="mt-3 flex items-center gap-1"><span className={cn('text-xs font-semibold',trendUp?'text-emerald-600':'text-red-500')}>{trendUp?'↑':'↓'} {trend}</span><span className="text-xs text-muted-foreground">vs trimestre anterior</span></div>}</div>;
}
