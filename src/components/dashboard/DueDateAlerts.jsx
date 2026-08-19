import React, { useState } from 'react';
import { appClient } from '@/api/appClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Bell, Mail, AlertTriangle, CheckCircle2, Loader2, ArrowRight } from 'lucide-react';
import { differenceInDays, parseISO } from 'date-fns';
import { formatCurrency } from '@/lib/fiscalUtils';
import { Link } from 'react-router-dom';

export default function DueDateAlerts({ invoices, profile }) {
  const [sending, setSending] = useState({});
  const [sent, setSent] = useState({});
  const alertDays = profile?.alert_days_before ?? 7;
  const notifEmail = profile?.notification_email || profile?.email;
  const today = new Date();
  const overdue = invoices.filter(inv => {
    if (!inv.due_date || inv.status === 'anulada' || inv.type !== 'emitida') return false;
    if (inv.payment_status === 'pagada') return false;
    return differenceInDays(parseISO(inv.due_date), today) < 0;
  });
  const dueSoon = invoices.filter(inv => {
    if (!inv.due_date || inv.status === 'anulada' || inv.type !== 'emitida') return false;
    if (inv.payment_status === 'pagada') return false;
    const days = differenceInDays(parseISO(inv.due_date), today);
    return days >= 0 && days <= alertDays;
  }).sort((a, b) => differenceInDays(parseISO(a.due_date), today) - differenceInDays(parseISO(b.due_date), today));
  const allAlerts = [...overdue, ...dueSoon.filter(inv => !overdue.find(o => o.id === inv.id))];
  if (allAlerts.length === 0) return null;
  const handleSendEmail = async (inv) => {
    if (!notifEmail) return;
    setSending(prev => ({ ...prev, [inv.id]: true }));
    const daysLeft = differenceInDays(parseISO(inv.due_date), today);
    const isOverdue = daysLeft < 0;
    await appClient.integrations.Core.SendEmail({
      to: notifEmail,
      subject: isOverdue ? `🚨 Factura ${inv.invoice_number} VENCIDA hace ${Math.abs(daysLeft)} días` : `⚠️ Factura ${inv.invoice_number} vence en ${daysLeft} día${daysLeft !== 1 ? 's' : ''}`,
      body: `Hola,

${isOverdue ? `La siguiente factura está VENCIDA y pendiente de cobro hace ${Math.abs(daysLeft)} días:` : 'La siguiente factura está próxima a su fecha de vencimiento:'}

• Número: ${inv.invoice_number}
• Cliente: ${inv.client_name}
• Importe total: ${formatCurrency(inv.total)}
• Fecha de vencimiento: ${inv.due_date}

Accede a FactuGo para gestionarla.

— FactuGo`.trim()
    });
    setSending(prev => ({ ...prev, [inv.id]: false }));
    setSent(prev => ({ ...prev, [inv.id]: true }));
  };
  return <Card className={overdue.length > 0 ? 'border-destructive/40 bg-destructive/5' : 'border-warning/40 bg-warning/5'}><CardHeader className="pb-3"><div className="flex items-center gap-2"><AlertTriangle className={`w-4 h-4 ${overdue.length > 0 ? 'text-destructive' : 'text-warning'}`} /><CardTitle className={`text-base ${overdue.length > 0 ? 'text-destructive' : 'text-warning'}`}>{overdue.length > 0 ? 'Facturas vencidas y próximas a vencer' : 'Facturas próximas a vencer'}</CardTitle><Badge variant={overdue.length > 0 ? 'destructive' : 'outline'} className="ml-auto text-xs">{allAlerts.length}</Badge></div></CardHeader><CardContent className="space-y-3">{allAlerts.slice(0, 5).map(inv => { const daysLeft = differenceInDays(parseISO(inv.due_date), today); const isOverdueInv = daysLeft < 0; return <div key={inv.id} className="flex items-center justify-between gap-3 p-3 rounded-lg bg-card border border-border"><div className="min-w-0 flex-1"><p className="text-sm font-medium truncate">{inv.invoice_number} — {inv.client_name}</p><p className="text-xs text-muted-foreground">{formatCurrency(inv.total)} · vence {inv.due_date}</p></div><div className="flex items-center gap-2 shrink-0"><Badge variant={isOverdueInv ? 'destructive' : daysLeft <= 2 ? 'destructive' : 'secondary'} className="text-xs">{isOverdueInv ? `${Math.abs(daysLeft)}d vencida` : daysLeft === 0 ? 'Hoy' : `${daysLeft}d`}</Badge>{sent[inv.id] ? <CheckCircle2 className="w-4 h-4 text-green-500" /> : <Button size="sm" variant="outline" className="h-7 gap-1 text-xs" disabled={sending[inv.id] || !notifEmail} onClick={() => handleSendEmail(inv)} title={notifEmail ? `Enviar aviso a ${notifEmail}` : 'Configura un email en Ajustes'}>{sending[inv.id] ? <Loader2 className="w-3 h-3 animate-spin" /> : <Mail className="w-3 h-3" />}Avisar</Button>}</div></div>; })}<div className="flex items-center justify-between pt-1">{!notifEmail && <p className="text-xs text-muted-foreground flex items-center gap-1"><Bell className="w-3 h-3" />Configura un email en Ajustes para enviar avisos.</p>}<Link to="/cobros" className="ml-auto"><Button variant="ghost" size="sm" className="h-7 gap-1 text-xs text-primary">Ver todos los cobros <ArrowRight className="w-3 h-3" /></Button></Link></div></CardContent></Card>;
}
