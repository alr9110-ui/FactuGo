import { calculateQuarterVAT } from '@/lib/fiscalUtils';

const active = invoice => invoice.status !== 'anulada';
const amount = (invoice, field) => Number(invoice[field] || 0);

export const getIntraCommunityOperations = invoices => invoices.filter(invoice => active(invoice) && invoice.tipo_operacion === 'intracomunitaria');

export const getRentalWithholdingInvoices = invoices => invoices.filter(invoice => active(invoice) && invoice.type === 'recibida' && invoice.category === 'alquiler' && amount(invoice, 'irpf_amount') > 0);

export const getModel130Estimate = invoices => {
  const activeInvoices = invoices.filter(active);
  const income = activeInvoices.filter(invoice => invoice.type === 'emitida').reduce((sum, invoice) => sum + amount(invoice, 'base_imponible'), 0);
  const expenses = activeInvoices.filter(invoice => invoice.type === 'recibida').reduce((sum, invoice) => sum + amount(invoice, 'base_imponible'), 0);
  const withholdings = activeInvoices.filter(invoice => invoice.type === 'emitida').reduce((sum, invoice) => sum + amount(invoice, 'irpf_amount'), 0);
  const netPerformance = income - expenses;
  return { income, expenses, withholdings, netPerformance, estimatedPayment: Math.max(0, (netPerformance * 0.2) - withholdings) };
};

export const getModel347Counterparties = invoices => {
  const groups = new Map();
  invoices.filter(active).forEach(invoice => {
    const nif = String(invoice.client_nif || '').trim().toUpperCase();
    const name = String(invoice.client_name || '').trim();
    const key = nif || name.toUpperCase();
    if (!key) return;
    const previous = groups.get(key) || { counterpart: name, nif, issued: 0, received: 0, total: 0, invoices: 0 };
    const total = amount(invoice, 'total');
    if (invoice.type === 'emitida') previous.issued += total;
    if (invoice.type === 'recibida') previous.received += total;
    previous.total += total; previous.invoices += 1;
    groups.set(key, previous);
  });
  return [...groups.values()].filter(item => item.total > 3005.06).sort((left, right) => right.total - left.total);
};

export const getModel390Rows = (invoices, year) => ['Q1', 'Q2', 'Q3', 'Q4'].map(quarter => {
  const vat = calculateQuarterVAT(invoices.filter(invoice => invoice.fiscal_year === Number(year) && invoice.quarter === quarter));
  return { Ejercicio: Number(year), Trimestre: quarter, 'Base IVA devengado': vat.baseEmitidas, 'IVA devengado': vat.ivaRepercutido, 'Base IVA deducible': vat.baseRecibidas, 'IVA deducible': vat.ivaSoportado, Resultado: vat.resultado };
});

export const getModel303Rows = (vat, quarter, year) => [{ Ejercicio: Number(year), Trimestre: quarter, 'Base IVA devengado': vat.baseEmitidas, 'IVA devengado': vat.ivaRepercutido, 'Base IVA deducible': vat.baseRecibidas, 'IVA deducible': vat.ivaSoportado, 'Resultado 303': vat.resultado }];

export const getModel115Rows = invoices => invoices.map(invoice => ({ 'Nº factura': invoice.invoice_number || '', Fecha: invoice.date || '', Arrendador: invoice.client_name || '', 'NIF arrendador': invoice.client_nif || '', 'Base retención': amount(invoice, 'base_imponible'), 'Retención practicada': amount(invoice, 'irpf_amount'), Total: amount(invoice, 'total') }));

export const getModel349Rows = invoices => invoices.map(invoice => ({ Fecha: invoice.date || '', 'NIF operador UE': invoice.client_nif || '', 'Operador intracomunitario': invoice.client_name || '', Tipo: invoice.type === 'emitida' ? 'Entrega/prestación' : 'Adquisición/servicio recibido', 'Base imponible': amount(invoice, 'base_imponible'), Concepto: invoice.concept || '' }));
