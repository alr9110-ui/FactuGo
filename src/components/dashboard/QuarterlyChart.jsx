import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency } from '@/lib/fiscalUtils';
const QUARTERS = ['Q1', 'Q2', 'Q3', 'Q4'];
const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return <div className="bg-card border border-border rounded-lg shadow-lg p-3 text-sm"><p className="font-semibold mb-2">{label}</p>{payload.map(p => <div key={p.name} className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ backgroundColor: p.fill }} /><span className="text-muted-foreground">{p.name}:</span><span className="font-medium">{formatCurrency(p.value)}</span></div>)}{payload.length === 2 && <div className="border-t border-border mt-2 pt-2 flex justify-between"><span className="text-muted-foreground">Resultado:</span><span className={`font-semibold ${payload[0].value-payload[1].value >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>{formatCurrency(payload[0].value-payload[1].value)}</span></div>}</div>;
};
export default function QuarterlyChart({ invoices, year }) {
  const data = QUARTERS.map(q => { const all = invoices.filter(i => i.quarter === q && i.fiscal_year === year && i.status !== 'anulada'); return { name:q, Ingresos:all.filter(i=>i.type==='emitida').reduce((s,i)=>s+(i.base_imponible||0),0), Gastos:all.filter(i=>i.type==='recibida').reduce((s,i)=>s+(i.base_imponible||0),0) }; });
  const hasData = data.some(d => d.Ingresos > 0 || d.Gastos > 0);
  return <Card><CardHeader className="pb-4"><CardTitle className="text-base">Ingresos vs Gastos — {year}</CardTitle></CardHeader><CardContent>{!hasData ? <div className="h-56 flex items-center justify-center text-muted-foreground text-sm">No hay datos para mostrar en {year}</div> : <ResponsiveContainer width="100%" height={220}><BarChart data={data} barCategoryGap="30%" barGap={4}><CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false}/><XAxis dataKey="name" tick={{fontSize:12,fill:'hsl(var(--muted-foreground))'}} axisLine={false} tickLine={false}/><YAxis tickFormatter={v=>v===0?'0':`${(v/1000).toFixed(0)}k`} tick={{fontSize:11,fill:'hsl(var(--muted-foreground))'}} axisLine={false} tickLine={false} width={36}/><Tooltip content={<CustomTooltip/>} cursor={{fill:'hsl(var(--muted))',radius:4}}/><Legend iconType="square" iconSize={10} wrapperStyle={{fontSize:12,paddingTop:12}}/><Bar dataKey="Ingresos" fill="hsl(var(--chart-2))" radius={[4,4,0,0]}/><Bar dataKey="Gastos" fill="hsl(var(--chart-3))" radius={[4,4,0,0]}/></BarChart></ResponsiveContainer>}</CardContent></Card>;
}
