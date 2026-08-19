import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { appClient } from '@/api/appClient';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatCurrency } from '@/lib/fiscalUtils';
import { toast } from '@/components/ui/use-toast';
import { PlusCircle, Trash2, CheckCircle2, Euro } from 'lucide-react';

const methodLabels = {
  transferencia: 'Transferencia',
  efectivo: 'Efectivo',
  tarjeta: 'Tarjeta',
  domiciliacion: 'Domiciliación',
  otro: 'Otro',
};

export default function PartialPaymentDialog({ open, onClose, invoice, onInvoiceUpdated }) {
  const queryClient = useQueryClient();
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [method, setMethod] = useState('transferencia');
  const [notes, setNotes] = useState('');
  const { data: payments = [] } = useQuery({
    queryKey: ['payments', invoice?.id],
    queryFn: () => appClient.entities.Payment.filter({ invoice_id: invoice.id }, '-date', 50),
    enabled: !!invoice?.id,
  });
  const totalCobrado = payments.reduce((s, p) => s + (p.amount || 0), 0);
  const totalFactura = invoice?.total || 0;
  const pendiente = Math.max(0, totalFactura - totalCobrado);
  const cobradoPct = totalFactura > 0 ? Math.min(100, Math.round((totalCobrado / totalFactura) * 100)) : 0;
  const addPaymentMutation = useMutation({
    mutationFn: async (data) => {
      const payment = await appClient.entities.Payment.create(data);
      const newTotal = totalCobrado + data.amount;
      if (newTotal >= totalFactura) {
        await appClient.entities.Invoice.update(invoice.id, { payment_status: 'pagada', payment_date: data.date });
      } else if (invoice.payment_status !== 'parcial') {
        await appClient.entities.Invoice.update(invoice.id, { payment_status: 'pendiente' });
      }
      return payment;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments', invoice.id] });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      onInvoiceUpdated?.();
      toast({ title: 'Cobro registrado correctamente' });
      setAmount(''); setNotes('');
    },
  });
  const deletePaymentMutation = useMutation({
    mutationFn: async (paymentId) => {
      await appClient.entities.Payment.delete(paymentId);
      await appClient.entities.Invoice.update(invoice.id, { payment_status: 'pendiente' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments', invoice.id] });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      onInvoiceUpdated?.(); toast({ title: 'Cobro eliminado' });
    },
  });
  const handleAdd = () => {
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) return toast({ title: 'Introduce un importe válido', variant: 'destructive' });
    if (amt > pendiente + 0.01) return toast({ title: `El importe supera el pendiente (${formatCurrency(pendiente)})`, variant: 'destructive' });
    addPaymentMutation.mutate({ invoice_id: invoice.id, invoice_number: invoice.invoice_number || '', client_name: invoice.client_name || '', amount: amt, date, method, notes });
  };
  if (!invoice) return null;
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg"><DialogHeader><DialogTitle>Cobros parciales — {invoice.invoice_number || 'Sin nº'}</DialogTitle></DialogHeader>
        <div className="bg-muted/40 rounded-lg p-4 space-y-2"><div className="flex justify-between text-sm"><span className="text-muted-foreground">{invoice.client_name}</span><span className="font-semibold">{formatCurrency(totalFactura)}</span></div><div className="w-full bg-border rounded-full h-2"><div className="h-2 rounded-full transition-all bg-emerald-500" style={{ width: `${cobradoPct}%` }} /></div><div className="flex justify-between text-xs text-muted-foreground"><span>Cobrado: <strong className="text-emerald-600">{formatCurrency(totalCobrado)}</strong> ({cobradoPct}%)</span><span>Pendiente: <strong className={pendiente > 0 ? 'text-amber-600' : 'text-emerald-600'}>{formatCurrency(pendiente)}</strong></span></div></div>
        {payments.length > 0 && <div className="divide-y divide-border rounded-lg border overflow-hidden">{payments.map(p => <div key={p.id} className="flex items-center justify-between px-3 py-2 text-sm bg-card"><div><span className="font-medium">{formatCurrency(p.amount)}</span><span className="text-muted-foreground ml-2 text-xs">{p.date} · {methodLabels[p.method] || p.method}</span>{p.notes && <p className="text-xs text-muted-foreground mt-0.5">{p.notes}</p>}</div><button onClick={() => deletePaymentMutation.mutate(p.id)} className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive"><Trash2 className="w-3.5 h-3.5" /></button></div>)}</div>}
        {pendiente > 0.01 ? <div className="space-y-3 pt-1"><p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Registrar nuevo cobro</p><div className="grid grid-cols-2 gap-3"><div className="space-y-1.5"><Label className="text-xs">Importe *</Label><div className="relative"><Euro className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" /><Input type="number" min="0.01" step="0.01" placeholder={formatCurrency(pendiente).replace('€', '').trim()} value={amount} onChange={e => setAmount(e.target.value)} className="pl-7" /></div></div><div className="space-y-1.5"><Label className="text-xs">Fecha *</Label><Input type="date" value={date} onChange={e => setDate(e.target.value)} /></div></div><div className="space-y-1.5"><Label className="text-xs">Método de pago</Label><Select value={method} onValueChange={setMethod}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{Object.entries(methodLabels).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}</SelectContent></Select></div><div className="space-y-1.5"><Label className="text-xs">Notas (opcional)</Label><Input placeholder="Referencia bancaria, observaciones..." value={notes} onChange={e => setNotes(e.target.value)} /></div><div className="flex gap-2 pt-1"><Button className="flex-1 gap-1.5" onClick={handleAdd} disabled={addPaymentMutation.isPending || !amount}><PlusCircle className="w-4 h-4" /> Registrar cobro</Button>{pendiente < totalFactura && <Button variant="outline" className="gap-1.5 text-xs" onClick={() => setAmount(String(pendiente.toFixed(2)))}>Cobrar resto ({formatCurrency(pendiente)})</Button>}</div></div> : <div className="flex items-center gap-2 rounded-lg bg-emerald-50 border border-emerald-200 px-4 py-3 text-sm text-emerald-700"><CheckCircle2 className="w-4 h-4 shrink-0" /><span>Factura cobrada al 100%</span></div>}
      </DialogContent>
    </Dialog>
  );
}
