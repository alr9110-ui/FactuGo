import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ArrowDownLeft, ArrowUpRight, CalendarClock, CircleAlert, WalletCards } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatCurrency, formatDate } from '@/lib/fiscalUtils';
import { getCashFlowForecast } from '@/lib/cashFlowForecast';

const dueLabel = days => {
  if (days === 0) return 'Hoy';
  if (days === 1) return 'Mañana';
  return `En ${days} días`;
};

function ForecastStat({ icon: Icon, label, amount, className }) {
  return <div className={`rounded-xl border p-4 ${className}`}>
    <div className="flex items-center justify-between gap-2">
      <p className="text-xs font-medium">{label}</p>
      <Icon className="h-4 w-4" />
    </div>
    <p className="mt-2 text-xl font-bold">{formatCurrency(amount)}</p>
  </div>;
}

export default function CashFlowForecast({ invoices }) {
  const forecast = useMemo(() => getCashFlowForecast(invoices), [invoices]);
  const hasMovements = forecast.upcoming.length > 0;
  const hasOverdue = forecast.overdueIncoming.length > 0 || forecast.overdueOutgoing.length > 0;

  return <Card className="border-primary/20 bg-gradient-to-br from-primary/[0.035] to-transparent">
    <CardHeader className="pb-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"><WalletCards className="h-4 w-4" /></div>
          <div>
            <CardTitle className="text-base">Previsión de tesorería</CardTitle>
            <p className="mt-0.5 text-xs text-muted-foreground">Movimientos estimados de los próximos 30 días según tus facturas pendientes.</p>
          </div>
        </div>
        <Link to="/facturas"><Button variant="outline" size="sm" className="h-8 text-xs">Ver facturas</Button></Link>
      </div>
    </CardHeader>
    <CardContent className="space-y-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <ForecastStat icon={ArrowUpRight} label="Cobros previstos" amount={forecast.expectedIncoming} className="border-emerald-200 bg-emerald-50/80 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-200" />
        <ForecastStat icon={ArrowDownLeft} label="Pagos previstos" amount={forecast.expectedOutgoing} className="border-amber-200 bg-amber-50/80 text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200" />
        <ForecastStat icon={CalendarClock} label="Variación estimada" amount={forecast.netMovement} className={forecast.netMovement >= 0 ? 'border-primary/20 bg-primary/5 text-primary' : 'border-destructive/20 bg-destructive/5 text-destructive'} />
      </div>

      {hasOverdue && <div className="flex flex-col gap-2 rounded-lg border border-destructive/25 bg-destructive/5 p-3 text-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 text-destructive"><CircleAlert className="h-4 w-4 shrink-0" /><span><strong>{forecast.overdueIncoming.length + forecast.overdueOutgoing.length} movimiento(s) vencido(s)</strong> que conviene revisar.</span></div>
        <span className="text-xs font-medium text-destructive">Cobros: {formatCurrency(forecast.overdueIncomingAmount)} · Pagos: {formatCurrency(forecast.overdueOutgoingAmount)}</span>
      </div>}

      {hasMovements ? <div className="divide-y rounded-lg border bg-card">
        {forecast.upcoming.slice(0, 5).map(invoice => {
          const isIncoming = invoice.type === 'emitida';
          return <div key={invoice.id} className="flex items-center gap-3 px-3 py-2.5">
            <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${isIncoming ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
              {isIncoming ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownLeft className="h-4 w-4" />}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{invoice.client_name || 'Sin cliente/proveedor'}</p>
              <p className="text-xs text-muted-foreground">{invoice.invoice_number || 'Sin número'} · vence {formatDate(invoice.due_date || invoice.date)}</p>
            </div>
            <div className="text-right">
              <p className={`text-sm font-semibold ${isIncoming ? 'text-emerald-600' : 'text-amber-600'}`}>{isIncoming ? '+' : '−'}{formatCurrency(invoice.amount)}</p>
              <Badge variant="outline" className="mt-0.5 text-[10px]">{dueLabel(invoice.daysUntilDue)}</Badge>
            </div>
          </div>;
        })}
        {forecast.upcoming.length > 5 && <p className="px-3 py-2 text-center text-xs text-muted-foreground">Y {forecast.upcoming.length - 5} movimiento(s) más durante los próximos 30 días.</p>}
      </div> : <div className="rounded-lg border border-dashed p-5 text-center text-sm text-muted-foreground">No hay cobros ni pagos pendientes con vencimiento en los próximos 30 días.</div>}

      <p className="text-xs text-muted-foreground">La previsión no sustituye el saldo bancario: calcula únicamente la variación esperada a partir de las facturas registradas.</p>
    </CardContent>
  </Card>;
}
