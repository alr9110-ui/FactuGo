import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ArrowDownLeft, ArrowUpRight, Calendar, FileText } from 'lucide-react';
import { appClient } from '@/api/appClient';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import DraftMod303 from '@/components/quarters/DraftMod303';
import TaxObligations from '@/components/quarters/TaxObligations';
import ExportButton from '@/components/ExportButton';
import { calculateQuarterVAT, formatCurrency, formatDate, getQuarterDeadline, getQuarterFromDate, getQuarterLabel } from '@/lib/fiscalUtils';
import { invoicesToRows } from '@/lib/exportUtils';
import { cn } from '@/lib/utils';

export default function Quarters() {
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(String(currentYear));
  const [quarter, setQuarter] = useState(getQuarterFromDate(new Date().toISOString()));
  const [showDraft, setShowDraft] = useState(false);
  const { data: invoices = [], isLoading } = useQuery({ queryKey: ['invoices'], queryFn: () => appClient.entities.Invoice.list('-date', 500) });
  const { data: profile } = useQuery({ queryKey: ['profile'], queryFn: async () => (await appClient.entities.BusinessProfile.list('-created_date', 1))[0] || null });
  const filtered = useMemo(() => invoices.filter(invoice => invoice.fiscal_year === Number(year) && invoice.quarter === quarter), [invoices, year, quarter]);
  const vatData = useMemo(() => calculateQuarterVAT(filtered), [filtered]);
  const emitidas = filtered.filter(invoice => invoice.type === 'emitida' && invoice.status !== 'anulada');
  const recibidas = filtered.filter(invoice => invoice.type === 'recibida' && invoice.status !== 'anulada');
  const years = [...new Set(invoices.map(invoice => invoice.fiscal_year).filter(Boolean))].sort((a, b) => b - a); if (!years.includes(currentYear)) years.unshift(currentYear);
  return <div className="space-y-6"><div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div><h1 className="text-2xl font-heading font-bold">Trimestres fiscales</h1><p className="mt-1 text-sm text-muted-foreground">Organización por periodo fiscal y obligaciones detectadas.</p></div><div className="flex flex-wrap gap-2"><Select value={year} onValueChange={setYear}><SelectTrigger className="w-[120px]"><SelectValue /></SelectTrigger><SelectContent>{years.map(item => <SelectItem key={item} value={String(item)}>{item}</SelectItem>)}</SelectContent></Select><Button size="sm" variant="outline" onClick={() => setShowDraft(true)}><FileText className="h-4 w-4" />Borrador Mod. 303</Button><ExportButton rows={invoicesToRows(filtered)} filename={`facturas-${year}-${quarter}`} sheetName={`${quarter} ${year}`} disabled={isLoading || !filtered.length} /></div></div>
    <DraftMod303 open={showDraft} onClose={() => setShowDraft(false)} vatData={vatData} quarter={quarter} year={Number(year)} />
    <Tabs value={quarter} onValueChange={setQuarter}><TabsList className="grid w-full max-w-lg grid-cols-4">{['Q1', 'Q2', 'Q3', 'Q4'].map(item => <TabsTrigger key={item} value={item}>{item.replace('Q', 'T')}</TabsTrigger>)}</TabsList>{['Q1', 'Q2', 'Q3', 'Q4'].map(item => <TabsContent key={item} value={item} className="mt-6 space-y-6">{isLoading ? <div className="grid grid-cols-1 gap-4 md:grid-cols-3">{[1, 2, 3].map(index => <Skeleton key={index} className="h-32 rounded-xl" />)}</div> : <><div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"><Metric label="IVA Repercutido" value={`+${formatCurrency(vatData.ivaRepercutido)}`} detail={`${vatData.numEmitidas} facturas`} color="text-emerald-600" /><Metric label="IVA Soportado" value={`-${formatCurrency(vatData.ivaSoportado)}`} detail={`${vatData.numRecibidas} facturas`} color="text-amber-600" /><Metric label="Resultado Mod. 303" value={formatCurrency(vatData.resultado)} detail={vatData.resultado > 0 ? 'A ingresar' : 'A compensar'} color={vatData.resultado > 0 ? 'text-red-600' : 'text-emerald-600'} /><Card><CardContent className="p-5"><p className="text-xs uppercase text-muted-foreground">Plazo presentación</p><div className="mt-1 flex items-center gap-1.5"><Calendar className="h-4 w-4 text-primary" /><p className="text-sm font-semibold">{getQuarterDeadline(item, Number(year))}</p></div><p className="mt-1 text-xs text-muted-foreground">{getQuarterLabel(item)}</p></CardContent></Card></div><div className="grid grid-cols-1 gap-6 lg:grid-cols-2"><InvoiceList title="Facturas emitidas" icon={ArrowUpRight} invoices={emitidas} total={vatData.baseEmitidas} color="text-emerald-600" /><InvoiceList title="Facturas recibidas" icon={ArrowDownLeft} invoices={recibidas} total={vatData.baseRecibidas} color="text-amber-600" /></div><TaxObligations invoices={invoices} year={year} quarter={quarter} vatData={vatData} onOpen303={() => setShowDraft(true)} profile={profile} /></>}</TabsContent>)}</Tabs>
  </div>;
}

function Metric({ label, value, detail, color }) { return <Card><CardContent className="p-5"><p className="text-xs uppercase text-muted-foreground">{label}</p><p className={cn('mt-1 text-xl font-bold', color)}>{value}</p><p className="mt-1 text-xs text-muted-foreground">{detail}</p></CardContent></Card>; }

function InvoiceList({ title, icon: Icon, invoices, total, color }) { return <Card><CardHeader className="pb-3"><CardTitle className="flex items-center gap-2 text-sm"><Icon className={cn('h-4 w-4', color)} />{title} ({invoices.length})</CardTitle></CardHeader><CardContent>{!invoices.length ? <p className="py-6 text-center text-sm text-muted-foreground">Sin facturas</p> : <div className="space-y-2">{invoices.map(invoice => <div key={invoice.id} className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2"><div><p className="text-sm font-medium">{invoice.client_name}</p><p className="text-xs text-muted-foreground">{invoice.invoice_number} · {formatDate(invoice.date)}</p></div><p className="text-sm font-semibold">{formatCurrency(invoice.total)}</p></div>)}<div className="flex justify-between border-t pt-2"><span className="text-xs font-medium">Total base</span><span className="text-sm font-bold">{formatCurrency(total)}</span></div></div>}</CardContent></Card>; }
