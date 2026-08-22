import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Download, Eye, EyeOff, FileText, Loader2, Mail, Send } from 'lucide-react';
import { appClient } from '@/api/appClient';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/components/ui/use-toast';
import { formatCurrency, formatDate } from '@/lib/fiscalUtils';
import { createInvoicePdf, getInvoicePdfFilename } from '@/lib/invoicePdf';

const templates = [
  {
    id: 'formal', label: 'Formal',
    subject: invoice => `Factura ${invoice.invoice_number || ''} — ${invoice.client_name}`,
    body: (invoice, profile) => `Estimado/a cliente,\n\nAdjunto encontrará la factura ${invoice.invoice_number || ''} con fecha ${formatDate(invoice.date)} por importe de ${formatCurrency(invoice.total)}.\n\nConcepto: ${invoice.concept || invoice.items?.[0]?.description || '—'}\n${invoice.due_date ? `Fecha de vencimiento: ${formatDate(invoice.due_date)}` : ''}\n${profile?.iban ? `Datos bancarios para el pago: ${profile.iban}` : ''}\n\nQuedo a su disposición para cualquier consulta.\n\nUn cordial saludo,\n${profile?.business_name || ''}`,
  },
  {
    id: 'amigable', label: 'Cercano',
    subject: invoice => `Tu factura ${invoice.invoice_number || ''} lista`,
    body: (invoice, profile) => `Hola,\n\nTe envío la factura ${invoice.invoice_number || ''} por ${formatCurrency(invoice.total)}.${invoice.due_date ? ` El plazo de pago es hasta el ${formatDate(invoice.due_date)}.` : ''}\n\n${invoice.concept ? `Corresponde a: ${invoice.concept}` : ''}\n${profile?.iban ? `Para hacer la transferencia, el IBAN es: ${profile.iban}` : ''}\n\nCualquier duda, me dices.\n\nUn saludo,\n${profile?.business_name || ''}`,
  },
  {
    id: 'recordatorio', label: 'Recordatorio de pago',
    subject: invoice => `Recordatorio: Factura ${invoice.invoice_number || ''} pendiente de pago`,
    body: (invoice, profile) => `Estimado/a cliente,\n\nLe escribimos para recordarle que la factura ${invoice.invoice_number || ''} de fecha ${formatDate(invoice.date)} por importe de ${formatCurrency(invoice.total)} sigue pendiente de pago.${invoice.due_date ? `\nFecha de vencimiento: ${formatDate(invoice.due_date)}` : ''}${profile?.iban ? `\nCuenta para el ingreso: ${profile.iban}` : ''}\n\nSi ya ha realizado el pago, por favor ignore este mensaje.\n\nAtentamente,\n${profile?.business_name || ''}`,
  },
];

export default function SendInvoiceDialog({ open, onClose, invoice }) {
  const [templateId, setTemplateId] = useState('formal');
  const [recipientEmail, setRecipientEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [messagePreview, setMessagePreview] = useState(false);
  const [showPdf, setShowPdf] = useState(true);
  const [sending, setSending] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const { data: profile } = useQuery({
    queryKey: ['profile'],
    queryFn: async () => (await appClient.entities.BusinessProfile.list('-created_date', 1))[0] || null,
  });

  const pdfUrl = useMemo(() => {
    if (!open || !showPdf || !invoice) return null;
    return URL.createObjectURL(createInvoicePdf(invoice, profile));
  }, [open, showPdf, invoice, profile]);

  React.useEffect(() => () => {
    if (pdfUrl) URL.revokeObjectURL(pdfUrl);
  }, [pdfUrl]);

  React.useEffect(() => {
    if (open && invoice && profile !== undefined && !initialized) {
      const template = templates[0];
      setSubject(template.subject(invoice));
      setBody(template.body(invoice, profile));
      setRecipientEmail(invoice.client_email || '');
      setShowPdf(true);
      setInitialized(true);
    }
    if (!open) setInitialized(false);
  }, [open, invoice, profile, initialized]);

  if (!invoice) return null;

  const applyTemplate = id => {
    setTemplateId(id);
    const template = templates.find(item => item.id === id);
    if (template) {
      setSubject(template.subject(invoice));
      setBody(template.body(invoice, profile));
    }
  };

  const downloadPdf = () => {
    const url = URL.createObjectURL(createInvoicePdf(invoice, profile));
    const link = document.createElement('a');
    link.href = url;
    link.download = getInvoicePdfFilename(invoice);
    link.click();
    URL.revokeObjectURL(url);
  };

  const send = async () => {
    if (!recipientEmail) return toast({ title: 'Introduce el email del destinatario', variant: 'destructive' });
    if (!subject.trim()) return toast({ title: 'El asunto no puede estar vacío', variant: 'destructive' });
    setSending(true);
    try {
      await appClient.integrations.Core.SendEmail({ to: recipientEmail, subject, body, from_name: profile?.business_name });
      toast({ title: 'Correo preparado', description: 'Adjunta el PDF descargado antes de enviarlo.' });
      onClose();
    } catch {
      toast({ title: 'No se pudo preparar el correo', variant: 'destructive' });
    } finally {
      setSending(false);
    }
  };

  return <Dialog open={open} onOpenChange={onClose}>
    <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2"><Mail className="h-4 w-4 text-primary" />Enviar factura — {invoice.invoice_number || 'Sin nº'}</DialogTitle>
        <DialogDescription>{invoice.client_name} · {formatCurrency(invoice.total)}</DialogDescription>
      </DialogHeader>

      <div className="space-y-4 pt-1">
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-primary/20 bg-primary/5 p-3">
          <div className="flex items-center gap-2 text-sm"><FileText className="h-4 w-4 text-primary" /><span className="font-medium">PDF de la factura</span></div>
          <div className="flex gap-2">
            <Button type="button" size="sm" variant="outline" onClick={() => setShowPdf(visible => !visible)} className="gap-1.5">{showPdf ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}{showPdf ? 'Ocultar' : 'Vista previa'}</Button>
            <Button type="button" size="sm" onClick={downloadPdf} className="gap-1.5"><Download className="h-3.5 w-3.5" />Descargar PDF</Button>
          </div>
        </div>
        {showPdf && pdfUrl && <iframe title={`Vista previa de ${invoice.invoice_number || 'factura'}`} src={pdfUrl} className="h-[480px] w-full rounded-lg border bg-white" />}
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">La demo prepara el correo en tu aplicación de email. Descarga y adjunta el PDF antes de enviarlo al cliente.</p>

        <div className="space-y-1.5">
          <Label className="text-xs">Plantilla</Label>
          <div className="flex flex-wrap gap-2">{templates.map(template => <button type="button" key={template.id} onClick={() => applyTemplate(template.id)} className={`rounded-lg border px-3 py-1.5 text-xs transition-colors ${templateId === template.id ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground'}`}>{template.label}</button>)}</div>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Email del destinatario *</Label>
          <div className="relative"><Mail className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" /><Input type="email" placeholder="cliente@empresa.com" value={recipientEmail} onChange={event => setRecipientEmail(event.target.value)} className="pl-8" /></div>
        </div>
        <div className="space-y-1.5"><Label className="text-xs">Asunto</Label><Input value={subject} onChange={event => setSubject(event.target.value)} /></div>
        <div className="space-y-1.5">
          <div className="flex items-center justify-between"><Label className="text-xs">Mensaje</Label><button type="button" onClick={() => setMessagePreview(value => !value)} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">{messagePreview ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}{messagePreview ? 'Editar' : 'Vista previa'}</button></div>
          {messagePreview ? <div className="min-h-[200px] whitespace-pre-wrap rounded-lg border border-border bg-muted/30 p-4 font-mono text-sm leading-relaxed">{body}</div> : <textarea value={body} onChange={event => setBody(event.target.value)} rows={10} className="w-full resize-y rounded-lg border border-input bg-transparent px-3 py-2 font-mono text-sm leading-relaxed shadow-sm focus:outline-none focus:ring-1 focus:ring-ring" />}
        </div>
        <div className="flex justify-end gap-2 pt-1"><Button variant="outline" onClick={onClose}>Cancelar</Button><Button onClick={send} disabled={sending || !recipientEmail} className="gap-1.5">{sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}{sending ? 'Preparando...' : 'Preparar correo'}</Button></div>
      </div>
    </DialogContent>
  </Dialog>;
}
