import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { appClient } from '@/api/appClient';
import { useAuth } from '@/lib/AuthContext';
import { FileText, ArrowDownLeft, Receipt, TrendingUp, PlusCircle, Upload } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import StatCard from '@/components/dashboard/StatCard';
import RecentInvoices from '@/components/dashboard/RecentInvoices';
import QuarterSummary from '@/components/dashboard/QuarterSummary';
import DueDateAlerts from '@/components/dashboard/DueDateAlerts';
import TaxDeadlineAlerts from '@/components/dashboard/TaxDeadlineAlerts';
import VATBalancePanel from '@/components/dashboard/VATBalancePanel';
import QuarterlyChart from '@/components/dashboard/QuarterlyChart';
import MonthlyAnalyticsPanel from '@/components/dashboard/MonthlyAnalyticsPanel';
import CashFlowPanel from '@/components/dashboard/CashFlowPanel';
import { formatCurrency, getQuarterFromDate, calculateQuarterVAT } from '@/lib/fiscalUtils';
import { Skeleton } from '@/components/ui/skeleton';

export default function Dashboard() {
  const { user } = useAuth();

  const { data: invoices = [], isLoading } = useQuery({
    queryKey: ['invoices'],
    queryFn: () => appClient.entities.Invoice.list('-date', 100),
  });

  const { data: profile } = useQuery({
    queryKey: ['profile'],
    queryFn: async () => {
      const list = await appClient.entities.BusinessProfile.list('-created_date', 1);
      return list[0] || null;
    }
  });

  const currentYear = new Date().getFullYear();
  const currentQuarter = getQuarterFromDate(new Date().toISOString());

  const currentQInvoices = invoices.filter(
    i => i.quarter === currentQuarter && i.fiscal_year === currentYear
  );
  const vatData = calculateQuarterVAT(currentQInvoices);

  const totalEmitidas = invoices.filter(i => i.type === 'emitida' && i.fiscal_year === currentYear && i.status !== 'anulada');
  const totalRecibidas = invoices.filter(i => i.type === 'recibida' && i.fiscal_year === currentYear && i.status !== 'anulada');
  const yearRevenue = totalEmitidas.reduce((s, i) => s + (i.base_imponible || 0), 0);
  const yearExpenses = totalRecibidas.reduce((s, i) => s + (i.base_imponible || 0), 0);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-32 rounded-xl" />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Skeleton className="h-96 rounded-xl lg:col-span-2" />
          <Skeleton className="h-96 rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-heading font-bold text-foreground">
            Buenos días{user?.full_name ? `, ${user.full_name.split(' ')[0]}` : ''}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Resumen fiscal — {currentQuarter} {currentYear}
          </p>
        </div>
        <div className="flex gap-2">
          <Link to="/digitalizar">
            <Button variant="outline" size="sm" className="gap-1.5">
              <Upload className="w-4 h-4" /> Digitalizar
            </Button>
          </Link>
          <Link to="/nueva-factura">
            <Button size="sm" className="gap-1.5">
              <PlusCircle className="w-4 h-4" /> Nueva factura
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Facturación anual"
          value={formatCurrency(yearRevenue)}
          subtitle={`${totalEmitidas.length} facturas emitidas`}
          icon={TrendingUp}
        />
        <StatCard
          title="Gastos anuales"
          value={formatCurrency(yearExpenses)}
          subtitle={`${totalRecibidas.length} facturas recibidas`}
          icon={ArrowDownLeft}
        />
        <StatCard
          title="IVA trimestral"
          value={formatCurrency(vatData.resultado)}
          subtitle={vatData.resultado > 0 ? 'A ingresar' : 'A compensar'}
          icon={Receipt}
        />
        <StatCard
          title="Total facturas"
          value={invoices.length}
          subtitle={`${currentYear}`}
          icon={FileText}
        />
      </div>

      <DueDateAlerts invoices={invoices} profile={profile} />
      <TaxDeadlineAlerts profile={profile} vatData={vatData} />
      <VATBalancePanel vatData={vatData} quarter={currentQuarter} year={currentYear} />
      <QuarterlyChart invoices={invoices} year={currentYear} />
      <MonthlyAnalyticsPanel invoices={invoices} year={currentYear} />
      <CashFlowPanel invoices={invoices} year={currentYear} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <RecentInvoices invoices={invoices} />
        </div>
        <div>
          <QuarterSummary
            quarter={currentQuarter}
            year={currentYear}
            vatData={vatData}
          />
        </div>
      </div>
    </div>
  );
}
