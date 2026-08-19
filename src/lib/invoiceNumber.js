const escapeRegExp = value => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const getYear = date => String(date || new Date().toISOString().slice(0, 10)).slice(0, 4);

const getConfiguredNextNumber = profile => {
  const value = Number.parseInt(profile?.next_invoice_number, 10);
  return Number.isInteger(value) && value > 0 ? value : 1;
};

const getNumberFromInvoice = (invoiceNumber, prefix, year) => {
  const value = String(invoiceNumber || '').trim();
  if (!value) return null;

  const seriesPattern = new RegExp(`^${escapeRegExp(prefix)}[-/ ]?${year}[-/ ]?(\\d+)$`, 'i');
  const seriesMatch = value.match(seriesPattern);
  if (seriesMatch) return Number.parseInt(seriesMatch[1], 10);

  // Permite migrar facturas antiguas creadas como "1", "2", "3".
  if (/^\d+$/.test(value)) return Number.parseInt(value, 10);
  return null;
};

export const getNextInvoiceNumber = (invoices, profile, date) => {
  const prefix = String(profile?.invoice_prefix || 'F').trim() || 'F';
  const year = getYear(date);
  const issuedNumbers = (invoices || [])
    .filter(invoice => invoice.type === 'emitida')
    .map(invoice => getNumberFromInvoice(invoice.invoice_number, prefix, year))
    .filter(Number.isInteger);
  const lastIssuedNumber = issuedNumbers.length ? Math.max(...issuedNumbers) : 0;
  const nextNumber = Math.max(lastIssuedNumber + 1, getConfiguredNextNumber(profile));

  return `${prefix}-${year}-${String(nextNumber).padStart(4, '0')}`;
};

export const getNextInvoiceSequence = (invoices, profile, date) => {
  const suggestedNumber = getNextInvoiceNumber(invoices, profile, date);
  return Number.parseInt(suggestedNumber.match(/(\d+)$/)?.[1] || '1', 10);
};
