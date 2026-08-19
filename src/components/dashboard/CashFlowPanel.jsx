import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency } from '@/lib/fiscalUtils';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

const MONTH_LABELS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  const ingresos = payload.find(p => p.dataKey === 'ingresos')?.value || 0;
  const gastos = payload.find(p => p.dataKey === 'gastos')?.value || 0;
  const flujo = ingresos - gastos;
  return <div className="bg-card border border-border rounded-lg shadow-lg p-3 text-sm min-w-[160px]"><p className="font-semibold text-foreground mb-2">{label}</p><div className="space-y-1"><div className="flex justify-between gap-4"><span className="text-muted-foreground">Ingresos</span><span className="font-medium text-emerald-600">{formatCurrency(ingresos)}</span></div><div className="flex justify-between gap-4"><span className="text-muted-foreground">Gastos</span><span className="font-medium text-destructive">{formatCurrency(gastos)}</span></div><div className="border-t border-border pt-1 mt-1 flex justify-between gap-4"><span className="text-muted-foreground font-medium">Flujo neto</span><span className={`font-bold ${flujo >= 0 ? 'text-emerald-600' : 'text-destructive'}`}>{flujo >= 0 ? '+' : ''}{formatCurrency(flujo)}</span></div></div></div>;
};
export default function CashFlowPanel({ invoices, year }) {
  const [view, setView] = useState('base');
  const data = useMemo(() => {
    const currentMonth = new Date().getMonth();
    return MONTH_LABELS.map((label, idx) => {
      const month = idx + 1;
      const emitidas = invoices.filter(i => i.type === 'emitida' && i.status !== 'anulada' && i.fiscal_year === year && new Date(i.date).getMonth() + 1 === month);
      const recibidas = invoices.filter(i => i.type === 'recibida' && i.status !== 'anulada' && i.fiscal_year === year && new Date(i.date).getMonth() + 1 === month);
      const ingresos = emitidas.reduce((s, i) => s + (view === 'base' ? (i.base_imponible || 0) : (i.total || 0)), 0);
      const gastos = recibidas.reduce((s, i) => s + (view === 'base' ? (i.base_imponible || 0) : (i.total || 0)), 0);
      return { label, ingresos, gastos, flujo: ingresos - gastos, isFuture: idx > currentMonth };
    });
  }, [invoices, year, view]);
  const totalIngresos = data.reduce((s, d) => s + d.ingresos, 0);
  const totalGastos = data.reduce((s, d) => s + d.gastos, 0);
  const flujoNeto = totalIngresos - totalGastos;
  const mejorMes = [...data].sort((a, b) => b.flujo - a.flujo)[0];
  return <Card><CardHeader className="pb-2"><div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3"><div><CardTitle className="text-base font-semibold">Flujo de caja mensual — {year}</CardTitle><p className="text-xs text-muted-foreground mt-0.5">Ingresos vs. gastos por mes (base imponible)</p></div><div className="flex items-center gap-1 bg-muted rounded-lg p-1 text-xs"><button onClick={() => setView('base')} className={`px-2.5 py-1 rounded-md transition-colors ${view === 'base' ? 'bg-card shadow text-foreground font-medium' : 'text-muted-foreground hover:text-foreground'}`}>Base imp.</button><button onClick={() => setView('total')} className={`px-2.5 py-1 rounded-md transition-colors ${view === 'total' ? 'bg-card shadow text-foreground font-medium' : 'text-muted-foreground hover:text-foreground'}`}>Total c/IVA</button></div></div></CardHeader><CardContent className="space-y-4"><div className="grid grid-cols-3 gap-3"><div className="rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900 p-3"><p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">Total ingresos</p><p className="text-base font-bold text-emerald-700 dark:text-emerald-300 mt-0.5">{formatCurrency(totalIngresos)}</p></div><div className="rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-100 dark:border-red-900 p-3"><p className="text-xs text-destructive font-medium">Total gastos</p><p className="text-base font-bold text-destructive mt-0.5">{formatCurrency(totalGastos)}</p></div><div className={`rounded-lg border p-3 ${flujoNeto >= 0 ? 'bg-primary/5 border-primary/20' : 'bg-destructive/5 border-destructive/20'}`}><div className="flex items-center gap-1">{flujoNeto > 0 ? <TrendingUp className="w-3 h-3 text-primary" /> : flujoNeto < 0 ? <TrendingDown className="w-3 h-3 text-destructive" /> : <Minus className="w-3 h-3 text-muted-foreground" />}<p className="text-xs font-medium text-muted-foreground">Flujo neto</p></div><p className={`text-base font-bold mt-0.5 ${flujoNeto >= 0 ? 'text-primary' : 'text-destructive'}`}>{flujoNeto >= 0 ? '+' : ''}{formatCurrency(flujoNeto)}</p></div></div><ResponsiveContainer width="100%" height={240}><BarChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }} barCategoryGap="25%"><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" /><XAxis dataKey="label" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} /><YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} tickFormatter={v => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v} /><Tooltip content={<CustomTooltip />} /><Legend iconType="square" iconSize={10} formatter={value => value === 'ingresos' ? 'Ingresos' : 'Gastos'} wrapperStyle={{ fontSize: 12 }} /><ReferenceLine y={0} stroke="hsl(var(--border))" /><Bar dataKey="ingresos" fill="hsl(152 60% 40%)" radius={[3, 3, 0, 0]} maxBarSize={32} /><Bar dataKey="gastos" fill="hsl(var(--destructive))" radius={[3, 3, 0, 0]} maxBarSize={32} /></BarChart></ResponsiveContainer>{mejorMes && mejorMes.flujo > 0 && <p className="text-xs text-muted-foreground text-center">Mejor mes: <strong className="text-foreground">{mejorMes.label}</strong> con flujo neto de <strong className="text-emerald-600">{formatCurrency(mejorMes.flujo)}</strong></p>}</CardContent></Card>;
}
