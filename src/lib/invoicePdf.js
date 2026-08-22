import { jsPDF } from 'jspdf';
import { formatCurrency, formatDate } from '@/lib/fiscalUtils';

const dark = [15, 31, 51];
const primary = [37, 99, 235];
const muted = [100, 116, 139];
const paper = [248, 250, 252];
const safe = value => String(value || '—');
const numeric = value => Number(value || 0);

function getItems(invoice) {
  if (invoice.items?.length) return invoice.items;
  return [{
    description: invoice.concept || 'Servicio facturado',
    quantity: 1,
    unit_price: invoice.base_imponible || 0,
    iva_rate: invoice.iva_rate || 0,
    subtotal: invoice.base_imponible || 0,
    iva_amount: invoice.iva_amount || 0,
    total: invoice.total || 0,
  }];
}

function addLogo(doc, logoUrl) {
  if (!logoUrl) return;
  const format = logoUrl.match(/^data:image\/(png|jpeg|jpg|webp)/i)?.[1]?.toUpperCase()?.replace('JPG', 'JPEG');
  if (!format) return;
  try { doc.addImage(logoUrl, format, 160, 8, 28, 24, undefined, 'FAST'); } catch { /* A bad logo must never prevent invoice export. */ }
}

function drawFooter(doc, pageWidth, margin) {
  doc.setDrawColor(226, 232, 240);
  doc.line(margin, 275, pageWidth - margin, 275);
  doc.setTextColor(...muted);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.text('Documento generado por FactuGo.', margin, 282);
  doc.text(`Generado el ${new Date().toLocaleDateString('es-ES')}`, pageWidth - margin, 282, { align: 'right' });
}

export function createInvoicePdf(invoice, profile = {}) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const pageWidth = 210;
  const margin = 18;
  const base = numeric(invoice.base_imponible);
  const iva = numeric(invoice.iva_amount);
  const irpf = numeric(invoice.irpf_amount);
  const total = numeric(invoice.total ?? base + iva - irpf);

  const drawHeader = () => {
    doc.setFillColor(...dark);
    doc.rect(0, 0, pageWidth, 42, 'F');
    addLogo(doc, profile.logo_url);
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(22);
    doc.text('FACTURA', margin, 20);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(safe(profile.business_name || 'FactuGo'), margin, 29);
    doc.setFontSize(11);
    doc.text(safe(invoice.invoice_number), pageWidth - margin, 20, { align: 'right' });
    doc.setFontSize(9);
    doc.text(`Fecha: ${formatDate(invoice.date)}`, pageWidth - margin, 28, { align: 'right' });
  };

  const drawTableHeader = y => {
    doc.setFillColor(...primary);
    doc.rect(margin, y, 174, 9, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.text('CONCEPTO', margin + 4, y + 6);
    doc.text('CANT.', 116, y + 6, { align: 'right' });
    doc.text('PRECIO', 139, y + 6, { align: 'right' });
    doc.text('IVA', 157, y + 6, { align: 'right' });
    doc.text('TOTAL', pageWidth - margin, y + 6, { align: 'right' });
    return y + 9;
  };

  drawHeader();
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

  let y = drawTableHeader(104);
  getItems(invoice).forEach(item => {
    const description = doc.splitTextToSize(safe(item.description), 84);
    const rowHeight = Math.max(12, description.length * 4.2 + 5);
    if (y + rowHeight > 232) {
      drawFooter(doc, pageWidth, margin);
      doc.addPage();
      drawHeader();
      y = drawTableHeader(54);
    }
    const itemBase = numeric(item.subtotal ?? numeric(item.quantity) * numeric(item.unit_price));
    const itemIva = numeric(item.iva_amount ?? itemBase * numeric(item.iva_rate) / 100);
    const itemTotal = numeric(item.total ?? itemBase + itemIva);
    doc.setDrawColor(226, 232, 240);
    doc.rect(margin, y, 174, rowHeight);
    doc.setTextColor(...dark);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.text(description, margin + 4, y + 6);
    doc.text(String(numeric(item.quantity) || 1), 116, y + 6, { align: 'right' });
    doc.text(formatCurrency(numeric(item.unit_price)), 139, y + 6, { align: 'right' });
    doc.text(`${numeric(item.iva_rate)}%`, 157, y + 6, { align: 'right' });
    doc.setFont('helvetica', 'bold');
    doc.text(formatCurrency(itemTotal), pageWidth - margin, y + 6, { align: 'right' });
    y += rowHeight;
  });

  let totalsY = y + 14;
  if (totalsY > 222) {
    drawFooter(doc, pageWidth, margin);
    doc.addPage();
    drawHeader();
    totalsY = 58;
  }
  doc.setFillColor(...paper);
  doc.roundedRect(112, totalsY, 80, irpf ? 38 : 31, 2, 2, 'F');
  doc.setTextColor(...muted);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text('Base imponible', 116, totalsY + 8);
  doc.text(formatCurrency(base), 188, totalsY + 8, { align: 'right' });
  doc.text(`IVA`, 116, totalsY + 16);
  doc.text(formatCurrency(iva), 188, totalsY + 16, { align: 'right' });
  if (irpf) {
    doc.text(`IRPF (${numeric(invoice.irpf_rate)}%)`, 116, totalsY + 24);
    doc.text(`-${formatCurrency(irpf)}`, 188, totalsY + 24, { align: 'right' });
  }
  const totalY = totalsY + (irpf ? 32 : 24);
  doc.setDrawColor(...primary);
  doc.line(116, totalY, 188, totalY);
  doc.setTextColor(...dark);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('TOTAL', 116, totalY + 8);
  doc.text(formatCurrency(total), 188, totalY + 8, { align: 'right' });

  doc.setTextColor(...muted);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  if (invoice.due_date) doc.text(`Fecha de vencimiento: ${formatDate(invoice.due_date)}`, margin, totalsY + 10);
  if (profile.iban) doc.text(`Pago por transferencia: ${profile.iban}`, margin, totalsY + 18);
  drawFooter(doc, pageWidth, margin);

  return doc.output('blob');
}

export function getInvoicePdfFilename(invoice) {
  const number = safe(invoice.invoice_number).replace(/[^a-z0-9_-]+/gi, '-');
  return `factura-${number}.pdf`;
}
