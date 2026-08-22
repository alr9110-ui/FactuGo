const DAY_IN_MS = 24 * 60 * 60 * 1000;

const toLocalDate = value => {
  if (!value) return null;
  const date = new Date(`${String(value).slice(0, 10)}T12:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
};

const startOfDay = value => {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date;
};

const daysBetween = (from, to) => Math.round((to.getTime() - from.getTime()) / DAY_IN_MS);

/**
 * Calculates expected cash movements from invoices that have not been paid.
 * It deliberately reports a movement estimate, not a bank balance.
 */
export const getCashFlowForecast = (invoices = [], referenceDate = new Date(), days = 30) => {
  const today = startOfDay(referenceDate);
  const pending = invoices
    .filter(invoice => invoice.status !== 'anulada' && invoice.payment_status !== 'pagada')
    .map(invoice => {
      const dueDate = toLocalDate(invoice.due_date || invoice.date);
      if (!dueDate) return null;

      return {
        ...invoice,
        dueDate,
        daysUntilDue: daysBetween(today, dueDate),
        amount: Number(invoice.total) || 0,
      };
    })
    .filter(Boolean);

  const overdue = pending
    .filter(invoice => invoice.daysUntilDue < 0)
    .sort((a, b) => a.daysUntilDue - b.daysUntilDue);
  const upcoming = pending
    .filter(invoice => invoice.daysUntilDue >= 0 && invoice.daysUntilDue <= days)
    .sort((a, b) => a.daysUntilDue - b.daysUntilDue);

  const incoming = upcoming.filter(invoice => invoice.type === 'emitida');
  const outgoing = upcoming.filter(invoice => invoice.type === 'recibida');
  const overdueIncoming = overdue.filter(invoice => invoice.type === 'emitida');
  const overdueOutgoing = overdue.filter(invoice => invoice.type === 'recibida');
  const sum = list => list.reduce((total, invoice) => total + invoice.amount, 0);

  return {
    days,
    incoming,
    outgoing,
    overdueIncoming,
    overdueOutgoing,
    expectedIncoming: sum(incoming),
    expectedOutgoing: sum(outgoing),
    overdueIncomingAmount: sum(overdueIncoming),
    overdueOutgoingAmount: sum(overdueOutgoing),
    netMovement: sum(incoming) - sum(outgoing),
    upcoming: [...upcoming].sort((a, b) => a.daysUntilDue - b.daysUntilDue),
  };
};
