import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { appClient } from '@/api/appClient';
import { formatCurrency } from '@/lib/fiscalUtils';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { FileText, CheckCircle2, Clock, AlertCircle } from 'lucide-react';

const statusColors = {
  borrador: 'bg-slate-100 text-slate-600',
  validada: 'bg-blue-50 text-blue-700',
  contabilizada: 'bg-emerald-50 text-emerald-700',
  anulada: 'bg-red-50 text-red-600',
};

const paymentConfig = {
  pendiente: { label: 'Pendiente', icon: Clock, className: 'bg-amber-50 text-amber-700 border-amber-200' },
  pagada: { label: 'Pagada', icon: CheckCircle2, className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  vencida: { label: 'Vencida', icon: AlertCircle, className: 'bg-red-50 text-red-600 border-red-200' },
};

function formatDate(dateStr) {
  if (!dateStr) return '\u2014';
  return new Date(dateStr).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export default function ClientInvoiceHistory({ client }) {
  const { data: invoices = [], isLoading } = useQuery({
    queryKey: ['invoices-client', client.nif],
    queryFn: async () => {
      const all = await appClient.entities.Invoice.filter({ client_nif: client.nif, type: 'emitida' }, '-date', 100);
      return all;
    },
  });

  const active = invoices.filter(i => i.status !== 'anulada');
  const totalFacturado = active.reduce((s, i) => s + (i.total || 0), 0);
  const totalBase = active.reduce((s, i) => s + (i.base_imponible || 0), 0);
  const totalPendiente = active.filter(i => (i.payment_status || 'pendiente') === 'pendiente').reduce((s, i) => s + (i.total || 0), 0);
  const totalCobrado = active.filter(i => i.payment_status === 'pagada').reduce((s, i) => s + (i.total || 0), 0);

  if (isLoading) {
    return (
      <div className="px-6 py-4 space-y-2 bg-muted/30">
        {[1, 2].map(i => <Skeleton key={i} className="h-8 rounded" />)}
      </div>
    );
  }

  if (invoices.length === 0) {
    return (
      <div className="px-6 py-5 bg-muted/20 text-center">
        <FileText className="w-6 h-6 text-muted-foreground/40 mx-auto mb-1" />
        <p className="text-xs text-muted-foreground">No hay facturas emitidas para este cliente</p>
      </div>
    );
  }

  return (
    <div className="bg-muted/20 border-t border-border">
      {/* Resumen */}
      <div className="flex flex-wrap gap-6 px-6 py-3 border-b border-border/50">
        <div>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Facturas</p>
          <p className="text-sm font-semibold">{invoices.length}</p>
        </div>
        <div>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Base imponible</p>
          <p className="text-sm font-semibold">{formatCurrency(totalBase)}</p>
        </div>
        <div>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Total facturado</p>
          <p className="text-sm font-bold text-emerald-700">{formatCurrency(totalFacturado)}</p>
        </div>
        <div>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Cobrado</p>
          <p className="text-sm font-semibold text-emerald-600">{formatCurrency(totalCobrado)}</p>
        </div>
        {totalPendiente > 0 && (
          <div>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Pendiente de cobro</p>
            <p className="text-sm font-semibold text-amber-600">{formatCurrency(totalPendiente)}</p>
          </div>
        )}
      </div>

      {/* Lista de facturas */}
      <div className="divide-y divide-border/40">
        {invoices.map(inv => (
          <div key={inv.id} className="flex items-center justify-between px-6 py-2.5 hover:bg-muted/30 transition-colors">
            <div className="flex items-center gap-3">
              <FileText className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
              <div>
                <p className="text-xs font-medium">{inv.invoice_number || `#${inv.id?.slice(-6)}`}</p>
                <p className="text-[10px] text-muted-foreground">{inv.concept || 'Sin concepto'}</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-xs text-muted-foreground hidden sm:block">{formatDate(inv.date)}</span>
              <span className="text-[10px] text-muted-foreground hidden md:block">{inv.fiscal_year} \u00b7 {inv.quarter}</span>
              <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${statusColors[inv.status]}`}>
                {inv.status}
              </Badge>
              {inv.status !== 'anulada' && (() => {
                const ps = inv.payment_status || 'pendiente';
                const cfg = paymentConfig[ps];
                const Icon = cfg.icon;
                return (
                  <Badge variant="outline" className={`text-[10px] px-1.5 py-0 gap-1 ${cfg.className}`}>
                    <Icon className="w-2.5 h-2.5" />{cfg.label}
                  </Badge>
                );
              })()}
              <span className={`text-xs font-semibold min-w-[70px] text-right ${inv.status === 'anulada' ? 'line-through text-muted-foreground' : ''}`}>
                {formatCurrency(inv.total)}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
