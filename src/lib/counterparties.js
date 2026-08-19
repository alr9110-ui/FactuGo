const normalize = value => String(value || '').trim().toLocaleLowerCase('es-ES');

const mergeTypes = (currentType, incomingType) => {
  if (currentType === 'ambos' || currentType === incomingType) return currentType;
  return currentType ? 'ambos' : incomingType;
};

const preferExisting = (existing, incoming) => existing || incoming || '';

export async function upsertCounterpartyFromInvoice(invoice, clientEntity) {
  const name = String(invoice.client_name || '').trim();
  if (!name) return null;

  const incomingType = invoice.type === 'emitida' ? 'cliente' : 'proveedor';
  const nif = String(invoice.client_nif || '').trim();
  const clients = await clientEntity.list('name', 500);
  const existing = clients.find(client => {
    if (nif && normalize(client.nif) === normalize(nif)) return true;
    return !nif && normalize(client.name) === normalize(name);
  });

  const details = { name, nif, address: String(invoice.client_address || '').trim(), type: incomingType };
  if (!existing) return clientEntity.create(details);

  return clientEntity.update(existing.id, {
    ...existing,
    name: preferExisting(existing.name, details.name),
    nif: preferExisting(existing.nif, details.nif),
    address: preferExisting(existing.address, details.address),
    type: mergeTypes(existing.type, incomingType),
  });
}
