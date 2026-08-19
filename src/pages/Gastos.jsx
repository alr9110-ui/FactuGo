import React, { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { appClient } from '@/api/appClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowDownLeft, FileDown, PlusCircle, Receipt, Search, TrendingDown, X } from 'lucide-react';
import CategorySummaryCards from '@/components/gastos/CategorySummaryCards';
import ExportButton from '@/components/ExportButton';
import { toast } from '@/components/ui/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { EXPENSE_CATEGORIES, getCategoryConfig } from '@/lib/expenseCategories';
import { invoicesToRows } from '@/lib/exportUtils';
import { formatCurrency, formatDate } from '@/lib/fiscalUtils';
import { cn } from '@/lib/utils';

export default function Gastos() {
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const queryClient = useQueryClient();

  const { data: invoices = [], isLoading } = useQuery({
    queryKey: ['invoices'],
    queryFn: () => appClient.entities.Invoice.list('-date', 500),
  });
  const recibidas = useMemo(() => invoices.filter(invoice => invoice.type === 'recibida'), [invoices]);
  const updateCategoryMutation = useMutation({
    mutationFn: ({ id, category }) => appClient.entities.Invoice.update(id, { category }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['invoices'] }); toast({ title: 'Categoría actualizada' }); },
  });
  const filtered = useMemo(() => recibidas.filter(invoice => {
    const term = search.toLowerCase();
    const matchesSearch = !search || invoice.client_name?.toLowerCase().includes(term) || invoice.invoice_number?.toLowerCase().includes(term) || invoice.concept?.toLowerCase().includes(term);
    const matchesCategory = categoryFilter === 'all' || (categoryFilter === 'sin' ? !invoice.category : invoice.category === categoryFilter);
    return matchesSearch && matchesCategory && (!dateFrom || invoice.date >= dateFrom) && (!dateTo || invoice.date <= dateTo);
  }), [recibidas, search, categoryFilter, dateFrom, dateTo]);
  const totals = useMemo(() => ({
    base: filtered.reduce((sum, invoice) => sum + (invoice.base_imponible || 0), 0),
    iva: filtered.reduce((sum, invoice) => sum + (invoice.iva_amount || 0), 0),
    total: filtered.reduce((sum, invoice) => sum + (invoice.total || 0), 0),
  }), [filtered]);

  return <div className="space-y-6">
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4"><div><h1 className="text-2xl font-heading font-bold flex items-center gap-2"><ArrowDownLeft className="w-6 h-6 text-amber-600" />Facturas Recibidas</h1><p className="text-sm text-muted-foreground mt-1">Gestiona y clasifica tus gastos por categoría</p></div><div className="flex gap-2"><ExportButton rows={invoicesToRows(filtered)} filename={`gastos-${new Date().toISOString().slice(0, 10)}`} sheetName="Gastos" /><Link to="/nueva-factura"><Button size="sm" className="gap-1.5"><PlusCircle className="w-4 h-4" />Registrar gasto</Button></Link></div></div>
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4"><Summary icon={TrendingDown} label="Base imponible" value={totals.base} /><Summary icon={Receipt} label="IVA soportado" value={totals.iva} emphasis /><Summary icon={FileDown} label="Total gastos" value={totals.total} /></div>
    <CategorySummaryCards invoices={recibidas} selectedCategory={categoryFilter} onSelect={setCategoryFilter} />
    <div className="flex flex-col sm:flex-row gap-3"><div className="relative flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" /><Input placeholder="Buscar por proveedor, nº factura o concepto..." value={search} onChange={event => setSearch(event.target.value)} className="pl-9" />{search && <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"><X className="w-3.5 h-3.5" /></button>}</div><Input type="date" value={dateFrom} onChange={event => setDateFrom(event.target.value)} className="h-9 text-sm w-40" /><Input type="date" value={dateTo} onChange={event => setDateTo(event.target.value)} className="h-9 text-sm w-40" />{(dateFrom || dateTo) && <Button variant="ghost" size="sm" onClick={() => { setDateFrom(''); setDateTo(''); }} className="gap-1 text-muted-foreground"><X className="w-3 h-3" />Limpiar</Button>}</div>
    {(search || categoryFilter !== 'all' || dateFrom || dateTo) && <p className="text-xs text-muted-foreground">{filtered.length} resultado{filtered.length !== 1 ? 's' : ''} · IVA soportado: {formatCurrency(totals.iva)}</p>}
    <div className="bg-card rounded-xl border border-border overflow-hidden">{isLoading ? <div className="p-6 space-y-3">{[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-12 rounded" />)}</div> : !filtered.length ? <div className="p-12 text-center"><p className="text-muted-foreground text-sm">No hay facturas recibidas con los filtros actuales</p></div> : <div className="overflow-x-auto"><Table><TableHeader><TableRow className="bg-muted/50">{['Nº Factura', 'Proveedor', 'Concepto', 'Fecha'].map(head => <TableHead key={head}>{head}</TableHead>)}<TableHead className="text-right">Base</TableHead><TableHead className="text-right">IVA</TableHead><TableHead className="text-right">Total</TableHead><TableHead>Categoría</TableHead></TableRow></TableHeader><TableBody>{filtered.map(invoice => <ExpenseRow key={invoice.id} invoice={invoice} updating={updateCategoryMutation} />)}</TableBody></Table></div>}</div>
  </div>;
}

function Summary({ icon: Icon, label, value, emphasis }) { return <div className="bg-card rounded-xl border border-border p-5"><div className="flex items-center gap-2 mb-2"><Icon className="w-4 h-4 text-primary" /><p className="text-xs text-muted-foreground uppercase tracking-wider">{label}</p></div><p className={cn('text-2xl font-bold', emphasis && 'text-primary')}>{formatCurrency(value)}</p></div>; }
function ExpenseRow({ invoice, updating }) { const category = invoice.category ? getCategoryConfig(invoice.category) : null; return <TableRow className="hover:bg-muted/30 transition-colors"><TableCell className="font-mono text-xs">{invoice.invoice_number || '—'}</TableCell><TableCell><p className="text-sm font-medium">{invoice.client_name}</p>{invoice.client_nif && <p className="text-xs text-muted-foreground">{invoice.client_nif}</p>}</TableCell><TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">{invoice.concept || '—'}</TableCell><TableCell className="text-sm">{formatDate(invoice.date)}</TableCell><TableCell className="text-sm text-right">{formatCurrency(invoice.base_imponible)}</TableCell><TableCell className="text-sm text-right text-primary">{formatCurrency(invoice.iva_amount)}</TableCell><TableCell className="text-sm font-semibold text-right">{formatCurrency(invoice.total)}</TableCell><TableCell><Select value={invoice.category || 'sin'} onValueChange={value => updating.mutate({ id: invoice.id, category: value === 'sin' ? '' : value })}><SelectTrigger className="h-8 w-[160px] text-xs">{category ? <div className="flex items-center gap-1.5"><span className={cn('w-2 h-2 rounded-full', category.color.split(' ')[0].replace('text-', 'bg-'))} /><span>{category.label}</span></div> : <span className="text-amber-600">Sin clasificar</span>}</SelectTrigger><SelectContent><SelectItem value="sin" className="text-amber-600">⚠ Sin clasificar</SelectItem>{EXPENSE_CATEGORIES.map(item => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}</SelectContent></Select></TableCell></TableRow>; }
