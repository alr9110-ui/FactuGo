import React, { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { appClient } from '@/api/appClient';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { formatCurrency, getQuarterFromDate, getFiscalYearFromDate } from '@/lib/fiscalUtils';
import { getNextInvoiceNumber, getNextInvoiceSequence } from '@/lib/invoiceNumber';
import { PlusCircle, Trash2, Send, Save, Loader2, FileText } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';

const emptyItem = { description: '', quantity: 1, unit_price: 0, iva_rate: 21, subtotal: 0, iva_amount: 0, total: 0 };

export default function QuickInvoiceDraft({ open, onClose, client }) {
  const queryClient = useQueryClient();
  const { data: profile } = useQuery({
    queryKey: ['profile'],
    queryFn: async () => {
      const list = await appClient.entities.BusinessProfile.list('-created_date', 1);
      return list[0] || null;
    }
  });
  const { data: invoices = [], isLoading: invoicesLoading } = useQuery({ queryKey: ['invoices'], queryFn: () => appClient.entities.Invoice.list('-created_date', 500) });
  const [items, setItems] = useState([{ ...emptyItem }]);
  const [concept, setConcept] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [irpf_rate, setIrpfRate] = useState(0);
  const [notes, setNotes] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    if (open && profile && !invoicesLoading) {
      setInvoiceNumber(getNextInvoiceNumber(invoices, profile, date));
      setIrpfRate(profile.default_irpf_rate || 0);
      setItems([{ ...emptyItem, iva_rate: profile.default_iva_rate || 21 }]);
    }
  }, [profile, invoices, invoicesLoading, open]);

  const updateItem = (index, field, value) => {
    setItems(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      const qty = Number(updated[index].quantity) || 0;
      const price = Number(updated[index].unit_price) || 0;
      const ivaRate = Number(updated[index].iva_rate) || 0;
      updated[index].subtotal = qty * price;
      updated[index].iva_amount = updated[index].subtotal * (ivaRate / 100);
      updated[index].total = updated[index].subtotal + updated[index].iva_amount;
      return updated;
    });
  };

  const totals = useMemo(() => {
    const base = items.reduce((s, it) => s + (it.subtotal || 0), 0);
    const iva = items.reduce((s, it) => s + (it.iva_amount || 0), 0);
    const irpf = base * (Number(irpf_rate) || 0) / 100;
    return { base, iva, irpf, total: base + iva - irpf };
  }, [items, irpf_rate]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const quarter = getQuarterFromDate(date);
      const fiscal_year = getFiscalYearFromDate(date);
      return appClient.entities.Invoice.create({
        type: 'emitida', status: 'borrador', payment_status: 'pendiente', invoice_number: invoiceNumber, date,
        client_name: client.name, client_nif: client.nif,
        client_address: [client.address, client.city, client.postal_code, client.province].filter(Boolean).join(', '),
        concept, items, base_imponible: totals.base, iva_amount: totals.iva, irpf_rate: Number(irpf_rate),
        irpf_amount: totals.irpf, total: totals.total, quarter, fiscal_year, notes,
      });
    },
    onSuccess: async createdInvoice => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['invoices-client', client.nif] });
      if (profile) await appClient.entities.BusinessProfile.update(profile.id, { next_invoice_number: getNextInvoiceSequence([...invoices, createdInvoice], profile, createdInvoice.date) });
      toast({ title: 'Borrador guardado correctamente' });
      onClose();
    }
  });

  const handleSendEmail = async () => {
    if (!client.email) {
      toast({ title: 'El cliente no tiene email registrado', variant: 'destructive' });
      return;
    }
    setIsSending(true);
    const quarter = getQuarterFromDate(date);
    const fiscal_year = getFiscalYearFromDate(date);
    let createdInvoice;
    try {
      createdInvoice = await appClient.entities.Invoice.create({
        type: 'emitida', status: 'borrador', payment_status: 'pendiente', invoice_number: invoiceNumber, date,
        client_name: client.name, client_nif: client.nif,
        client_address: [client.address, client.city, client.postal_code, client.province].filter(Boolean).join(', '),
        concept, items, base_imponible: totals.base, iva_amount: totals.iva, irpf_rate: Number(irpf_rate),
        irpf_amount: totals.irpf, total: totals.total, quarter, fiscal_year, notes,
      });
    } catch (e) {
      setIsSending(false);
      return;
    }

    const itemsHtml = items.map(it => `<tr>
        <td style="padding:6px 8px;border-bottom:1px solid #eee">${it.description}</td>
        <td style="padding:6px 8px;border-bottom:1px solid #eee;text-align:center">${it.quantity}</td>
        <td style="padding:6px 8px;border-bottom:1px solid #eee;text-align:right">${formatCurrency(it.unit_price)}</td>
        <td style="padding:6px 8px;border-bottom:1px solid #eee;text-align:center">${it.iva_rate}%</td>
        <td style="padding:6px 8px;border-bottom:1px solid #eee;text-align:right">${formatCurrency(it.total)}</td>
      </tr>`).join('');
    const emailBody = `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:24px;border:1px solid #e5e7eb;border-radius:8px">
        <h2 style="margin:0 0 4px 0;color:#1e3a5f">Factura ${invoiceNumber}</h2>
        <p style="color:#6b7280;margin:0 0 20px 0">Fecha: ${new Date(date).toLocaleDateString('es-ES')}</p>
        <p style="margin:0 0 4px 0"><strong>Para:</strong> ${client.name}</p>
        <p style="margin:0 0 20px 0;color:#6b7280">NIF: ${client.nif}</p>
        ${concept ? `<p style="margin:0 0 20px 0"><strong>Concepto:</strong> ${concept}</p>` : ''}
        <table style="width:100%;border-collapse:collapse;font-size:14px"><thead><tr style="background:#f3f4f6">
          <th style="padding:8px;text-align:left">Descripción</th><th style="padding:8px;text-align:center">Cantidad</th><th style="padding:8px;text-align:right">Precio ud.</th><th style="padding:8px;text-align:center">IVA</th><th style="padding:8px;text-align:right">Total</th>
        </tr></thead><tbody>${itemsHtml}</tbody></table>
        <div style="margin-top:16px;text-align:right;font-size:14px"><p style="margin:4px 0">Base imponible: <strong>${formatCurrency(totals.base)}</strong></p><p style="margin:4px 0">IVA: <strong>${formatCurrency(totals.iva)}</strong></p>${Number(irpf_rate) > 0 ? `<p style="margin:4px 0">IRPF (${irpf_rate}%): <strong>-${formatCurrency(totals.irpf)}</strong></p>` : ''}<p style="margin:8px 0;font-size:16px;border-top:2px solid #1e3a5f;padding-top:8px"><strong>TOTAL: ${formatCurrency(totals.total)}</strong></p></div>
        ${notes ? `<p style="margin-top:20px;font-size:13px;color:#6b7280"><em>${notes}</em></p>` : ''}
        <p style="margin-top:24px;font-size:12px;color:#9ca3af">${profile?.business_name || ''} · NIF: ${profile?.nif || ''}</p>
      </div>`;
    await appClient.integrations.Core.SendEmail({ to: client.email, subject: `Factura ${invoiceNumber} de ${profile?.business_name || 'su proveedor'}`, body: emailBody });
    queryClient.invalidateQueries({ queryKey: ['invoices'] });
    queryClient.invalidateQueries({ queryKey: ['invoices-client', client.nif] });
    if (profile) await appClient.entities.BusinessProfile.update(profile.id, { next_invoice_number: getNextInvoiceSequence([...invoices, createdInvoice], profile, createdInvoice.date) });
    toast({ title: `Factura enviada a ${client.email}` });
    setIsSending(false);
    onClose();
  };

  if (!client) return null;
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto"><DialogHeader><DialogTitle className="flex items-center gap-2"><FileText className="w-5 h-5 text-primary" />Nueva factura para {client.name}</DialogTitle></DialogHeader>
        <div className="space-y-4 mt-2">
          <div className="grid grid-cols-2 gap-3"><div className="space-y-1.5"><Label className="text-xs">Nº Factura</Label><Input value={invoiceNumber} onChange={e => setInvoiceNumber(e.target.value)} /></div><div className="space-y-1.5"><Label className="text-xs">Fecha</Label><Input type="date" value={date} onChange={e => setDate(e.target.value)} /></div></div>
          <div className="space-y-1.5"><Label className="text-xs">Concepto</Label><Input value={concept} onChange={e => setConcept(e.target.value)} placeholder="Descripción general de la factura" /></div><Separator />
          <div><div className="flex items-center justify-between mb-2"><Label className="text-xs">Líneas de detalle</Label><Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={() => setItems(prev => [...prev, { ...emptyItem }])}><PlusCircle className="w-3 h-3" /> Añadir línea</Button></div><div className="space-y-2">{items.map((item, i) => <div key={i} className="grid grid-cols-12 gap-1.5 items-end p-2.5 bg-muted/40 rounded-lg"><div className="col-span-5 space-y-1"><Label className="text-[10px] text-muted-foreground">Descripción</Label><Input className="h-7 text-xs" value={item.description} onChange={e => updateItem(i, 'description', e.target.value)} /></div><div className="col-span-2 space-y-1"><Label className="text-[10px] text-muted-foreground">Cantidad</Label><Input className="h-7 text-xs" type="number" min="0" value={item.quantity} onChange={e => updateItem(i, 'quantity', e.target.value)} /></div><div className="col-span-2 space-y-1"><Label className="text-[10px] text-muted-foreground">Precio</Label><Input className="h-7 text-xs" type="number" min="0" step="0.01" value={item.unit_price} onChange={e => updateItem(i, 'unit_price', e.target.value)} /></div><div className="col-span-1 space-y-1"><Label className="text-[10px] text-muted-foreground">IVA%</Label><Input className="h-7 text-xs" type="number" min="0" value={item.iva_rate} onChange={e => updateItem(i, 'iva_rate', e.target.value)} /></div><div className="col-span-1 text-right"><p className="text-xs font-semibold pt-4">{formatCurrency(item.total)}</p></div><div className="col-span-1 flex justify-end">{items.length > 1 && <button onClick={() => setItems(prev => prev.filter((_, idx) => idx !== i))} className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive"><Trash2 className="w-3.5 h-3.5" /></button>}</div></div>)}</div></div>
          <div className="border-t pt-3 space-y-1.5 max-w-xs ml-auto text-sm"><div className="flex justify-between"><span className="text-muted-foreground">Base imponible</span><span className="font-medium">{formatCurrency(totals.base)}</span></div><div className="flex justify-between"><span className="text-muted-foreground">IVA</span><span className="font-medium">{formatCurrency(totals.iva)}</span></div><div className="flex justify-between items-center gap-2"><span className="text-muted-foreground">IRPF (%)</span><Input type="number" min="0" step="0.5" value={irpf_rate} onChange={e => setIrpfRate(e.target.value)} className="h-6 w-16 text-xs text-right" /></div>{Number(irpf_rate) > 0 && <div className="flex justify-between text-red-600"><span>Retención IRPF</span><span>-{formatCurrency(totals.irpf)}</span></div>}<div className="flex justify-between font-bold text-base border-t pt-2"><span>Total</span><span>{formatCurrency(totals.total)}</span></div></div>
          <div className="space-y-1.5"><Label className="text-xs">Observaciones</Label><Textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} placeholder="Condiciones de pago, observaciones..." /></div>
          <div className="flex flex-col sm:flex-row justify-end gap-2 pt-2 border-t"><Button variant="outline" onClick={onClose}>Cancelar</Button><Button variant="secondary" onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending} className="gap-2">{saveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}Guardar borrador</Button><Button onClick={handleSendEmail} disabled={isSending || !client.email} className="gap-2" title={!client.email ? 'El cliente no tiene email registrado' : ''}>{isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}{client.email ? `Enviar a ${client.email}` : 'Sin email registrado'}</Button></div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
