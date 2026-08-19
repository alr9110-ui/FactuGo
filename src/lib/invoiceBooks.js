import { EXPENSE_CATEGORIES } from '@/lib/expenseCategories';

const number = value => Number(value || 0);
const categoryLabel = category => EXPENSE_CATEGORIES.find(item => item.value === category)?.label || category || '';
const sortByDateAndNumber = invoices => [...invoices].sort((left, right) => String(left.date || '').localeCompare(String(right.date || '')) || String(left.invoice_number || '').localeCompare(String(right.invoice_number || '')));

export const issuedInvoiceBookRows = invoices => sortByDateAndNumber(invoices.filter(invoice => invoice.type === 'emitida')).map(invoice => ({
  'Nº factura': invoice.invoice_number || '', 'Fecha de expedición': invoice.date || '', Cliente: invoice.client_name || '', 'NIF cliente': invoice.client_nif || '', Concepto: invoice.concept || '', 'Base imponible': number(invoice.base_imponible), 'Tipo IVA (%)': number(invoice.iva_rate), 'Cuota IVA repercutida': number(invoice.iva_amount), 'Tipo IRPF (%)': number(invoice.irpf_rate), 'Retención IRPF': number(invoice.irpf_amount), 'Total factura': number(invoice.total), Estado: invoice.status || '',
}));

export const receivedInvoiceBookRows = invoices => sortByDateAndNumber(invoices.filter(invoice => invoice.type === 'recibida')).map(invoice => ({
  'Nº factura proveedor': invoice.invoice_number || '', 'Fecha de factura': invoice.date || '', 'Fecha de contabilización': invoice.accounting_date || invoice.date || '', 'Periodo de deducción': invoice.quarter && invoice.fiscal_year ? `${invoice.quarter} ${invoice.fiscal_year}` : '', Proveedor: invoice.client_name || '', 'NIF proveedor': invoice.client_nif || '', Concepto: invoice.concept || '', 'Categoría': categoryLabel(invoice.category), 'Base imponible': number(invoice.base_imponible), 'Tipo IVA (%)': number(invoice.iva_rate), 'Cuota IVA soportada': number(invoice.iva_amount), 'Total factura': number(invoice.total), Estado: invoice.status || '',
}));
