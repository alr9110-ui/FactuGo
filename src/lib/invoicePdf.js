import { jsPDF } from 'jspdf';
import { formatCurrency, formatDate } from '@/lib/fiscalUtils';

const dark = [15, 31, 51];
const primary = [37, 99, 235];
const muted = [100, 116, 139];

const safe = value => String(value || '—');

export function createInvoicePdf(invoice, profile = {}) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const margin = 18;
  const pageWidth = 210;
  const base = Number(invoice.base_imponible || 0);
  const iva = Number(invoice.iva_amount || 0);
  const irpf = Number(invoice.irpf_amount || 0);
  const total = Number(invoice.total ?? base + iva - irpf);

  doc.setFillColor(...dark);
  doc.rect(0, 0, pageWidth, 42, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.text('FACTURA', margin, 20);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(safe(profile.business_name || 'FactuGo'), margin, 29);
  doc.setFontSize(11);
  doc.text(safe(invoice.invoice_number), pageWidth - margin, 20, { align: 'right' });
  doc.setFontSize(9);
  doc.text(`Fecha: ${formatDate(invoice.date)}`, pageWidth - margin, 28, { align: 'right' });

  doc.setTextColor(...dark);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('EMISOR', margin, 58);
  doc.text('CLIENTE', 112, 58);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.text(safe(profile.business_name), margin, 66);
  if (profile.nif) doc.text(`NIF: ${profile.nif}`, margin, 72);
  if (profile.address) doc.text(safe(profile.address), margin, 78, { maxWidth: 72 });
  if (profile.email) doc.text(safe(profile.email), margin, 84);
  doc.text(safe(invoice.client_name), 112, 66);
  if (invoice.client_nif) doc.text(`NIF: ${invoice.client_nif}`, 112, 72);
  if (invoice.client_address) doc.text(safe(invoice.client_address), 112, 78, { maxWidth: 72 });
  if (invoice.client_email) doc.text(safe(invoice.client_email), 112, 84);

  const tableY = 104;
  doc.setFillColor(...primary);
  doc.rect(margin, tableY, 174, 9, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('CONCEPTO', margin + 4, tableY + 6);
  doc.text('BASE IMPONIBLE', pageWidth - margin, tableY + 6, { align: 'right' });
  doc.setTextColor(...dark);
  doc.setFont('helvetica', 'normal');
  const concept = safe(invoice.concept || invoice.items?.[0]?.description);
  const lines = doc.splitTextToSize(concept, 122);
  const rowHeight = Math.max(15, lines.length * 5 + 7);
  doc.setDrawColor(226, 232, 240);
  doc.rect(margin, tableY + 9, 174, rowHeight);
  doc.text(lines, margin + 4, tableY + 16);
  doc.text(formatCurrency(base), pageWidth - margin, tableY + 16, { align: 'right' });

  const totalsY = tableY + 9 + rowHeight + 14;
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(112, totalsY, 80, irpf ? 38 : 31, 2, 2, 'F');
  doc.setTextColor(...muted);
  doc.setFontSize(9);
  doc.text('Base imponible', 116, totalsY + 8);
  doc.text(formatCurrency(base), 188, totalsY + 8, { align: 'right' });
  doc.text(`IVA (${Number(invoice.iva_rate || 0)}%)`, 116, totalsY + 16);
  doc.text(formatCurrency(iva), 188, totalsY + 16, { align: 'right' });
  if (irpf) {
    doc.text(`IRPF (${Number(invoice.irpf_rate || 0)}%)`, 116, totalsY + 24);
    doc.text(`−${formatCurrency(irpf)}`, 188, totalsY + 24, { align: 'right' });
  }
  const totalY = totalsY + (irpf ? 32 : 24);
  doc.setDrawColor(...primary);
  doc.line(116, totalY, 188, totalY);
  doc.setTextColor(...dark);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('TOTAL', 116, totalY + 8);
  doc.text(formatCurrency(total), 188, totalY + 8, { align: 'right' });

  if (invoice.due_date) {
    doc.setTextColor(...muted);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(`Fecha de vencimiento: ${formatDate(invoice.due_date)}`, margin, totalsY + 10);
  }
  if (profile.iban) {
    doc.text(`Pago por transferencia: ${profile.iban}`, margin, totalsY + 18);
  }

  doc.setDrawColor(226, 232, 240);
  doc.line(margin, 275, pageWidth - margin, 275);
  doc.setTextColor(...muted);
  doc.setFontSize(7.5);
  doc.text('Documento generado por FactuGo.', margin, 282);
  doc.text(`Generado el ${new Date().toLocaleDateString('es-ES')}`, pageWidth - margin, 282, { align: 'right' });

  return doc.output('blob');
}

export function getInvoicePdfFilename(invoice) {
  const number = safe(invoice.invoice_number).replace(/[^a-z0-9_-]+/gi, '-');
  return `factura-${number}.pdf`;
}
