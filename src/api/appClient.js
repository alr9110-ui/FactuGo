const STORAGE_PREFIX = 'factugo:';

const read = key => {
  try { return JSON.parse(localStorage.getItem(`${STORAGE_PREFIX}${key}`) || '[]'); }
  catch { return []; }
};

const write = (key, value) => localStorage.setItem(`${STORAGE_PREFIX}${key}`, JSON.stringify(value));
const now = () => new Date().toISOString();
const id = () => crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;

const compare = (field, descending) => (a, b) => {
  const left = a[field] ?? '';
  const right = b[field] ?? '';
  return (left > right ? 1 : left < right ? -1 : 0) * (descending ? -1 : 1);
};

const createEntity = name => ({
  async list(order = '-created_date', limit = 100) {
    const descending = order.startsWith('-');
    return read(name).sort(compare(order.replace(/^-/, ''), descending)).slice(0, limit);
  },
  async filter(filters = {}, order = '-created_date', limit = 100) {
    const records = await this.list(order, Number.MAX_SAFE_INTEGER);
    return records.filter(record => Object.entries(filters).every(([key, value]) => record[key] === value)).slice(0, limit);
  },
  async create(data) {
    const record = { ...data, id: id(), created_date: now(), updated_date: now() };
    write(name, [...read(name), record]);
    return record;
  },
  async update(recordId, data) {
    let updated;
    write(name, read(name).map(record => {
      if (record.id !== recordId) return record;
      updated = { ...record, ...data, updated_date: now() };
      return updated;
    }));
    if (!updated) throw new Error('Registro no encontrado');
    return updated;
  },
  async delete(recordId) { write(name, read(name).filter(record => record.id !== recordId)); },
  async bulkUpdate(changes) { return Promise.all(changes.map(({ id: recordId, ...data }) => this.update(recordId, data))); },
});

const usersKey = 'users';
const sessionKey = `${STORAGE_PREFIX}session`;
const getUser = () => JSON.parse(localStorage.getItem(sessionKey) || 'null');
const setUser = user => localStorage.setItem(sessionKey, JSON.stringify(user));

const quarterFromDate = date => { const month = Number(String(date).slice(5, 7)); return `Q${Math.ceil(month / 3)}`; };
const currentYear = new Date().getFullYear();
const demoDate = (month, day) => `${currentYear}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
const createDemoInvoice = ({ id: recordId, type, number, date, counterpart, nif, concept, base, iva = 21, category = 'otros', payment = 'pendiente' }) => {
  const ivaAmount = Number((base * iva / 100).toFixed(2));
  return { id: recordId, type, status: 'contabilizada', payment_status: payment, invoice_number: number, date, due_date: type === 'emitida' ? demoDate(9, 15) : '', client_name: counterpart, client_nif: nif, concept, base_imponible: base, iva_rate: iva, iva_amount: ivaAmount, irpf_rate: 0, irpf_amount: 0, total: base + ivaAmount, category, quarter: quarterFromDate(date), fiscal_year: currentYear, created_date: now(), updated_date: now() };
};

const seedDemoData = () => {
  if (!read('Invoice').length) write('Invoice', [
    createDemoInvoice({ id: 'demo-invoice-1', type: 'emitida', number: `F-${currentYear}-0001`, date: demoDate(1, 12), counterpart: 'Norte Diseño, S.L.', nif: 'B12345678', concept: 'Diseño de identidad corporativa', base: 850, payment: 'pagada' }),
    createDemoInvoice({ id: 'demo-invoice-2', type: 'recibida', number: 'PR-2026-084', date: demoDate(3, 4), counterpart: 'Servicios Digitales Demo, S.L.', nif: 'B87654321', concept: 'Suscripción de software', base: 49, category: 'oficina', payment: 'pagada' }),
    createDemoInvoice({ id: 'demo-invoice-3', type: 'emitida', number: `F-${currentYear}-0002`, date: demoDate(5, 18), counterpart: 'Café Alameda, S.L.', nif: 'B11223344', concept: 'Consultoría de procesos', base: 1250, payment: 'pagada' }),
    createDemoInvoice({ id: 'demo-invoice-4', type: 'recibida', number: 'TEL-7241', date: demoDate(7, 2), counterpart: 'Telecom Demo, S.A.', nif: 'A55667788', concept: 'Telefonía e internet', base: 72, category: 'suministros', payment: 'pagada' }),
    createDemoInvoice({ id: 'demo-invoice-5', type: 'emitida', number: `F-${currentYear}-0003`, date: demoDate(8, 8), counterpart: 'Lumen Studio, S.L.', nif: 'B44332211', concept: 'Desarrollo de aplicación web', base: 1800 }),
  ]);
  if (!read('Client').length) write('Client', [
    { id: 'demo-client-1', name: 'Norte Diseño, S.L.', nif: 'B12345678', type: 'cliente', email: 'hola@nortediseno.example', created_date: now(), updated_date: now() },
    { id: 'demo-client-2', name: 'Servicios Digitales Demo, S.L.', nif: 'B87654321', type: 'proveedor', email: 'facturas@serviciosdemo.example', created_date: now(), updated_date: now() },
  ]);
  if (!read('BusinessProfile').length) write('BusinessProfile', [{ id: 'demo-profile', business_name: 'Estudio FactuGo Demo', nif: 'B00000000', city: 'Sevilla', province: 'Sevilla', email: 'demo@factugo.example', invoice_prefix: 'F', next_invoice_number: 4, default_iva_rate: 21, default_irpf_rate: 15, irpf_regime: 'estimacion_directa', created_date: now(), updated_date: now() }]);
};

const auth = {
  async me() { const user = getUser(); if (!user) throw Object.assign(new Error('Autenticación requerida'), { status: 401 }); return user; },
  async register({ email, password }) {
    const users = read(usersKey);
    if (users.some(user => user.email.toLowerCase() === email.toLowerCase())) throw new Error('Ya existe una cuenta con ese correo');
    const user = { id: id(), email, password, role: 'user', created_date: now() };
    write(usersKey, [...users, user]);
    return { email };
  },
  async verifyOtp({ email, otpCode }) {
    if (String(otpCode).length !== 6) throw new Error('Introduce un código de seis dígitos');
    const user = read(usersKey).find(candidate => candidate.email.toLowerCase() === email.toLowerCase());
    if (!user) throw new Error('Cuenta no encontrada');
    const safeUser = { id: user.id, email: user.email, role: user.role };
    setUser(safeUser);
    return { access_token: 'local-session' };
  },
  setToken() {},
  async resendOtp() { return true; },
  async loginViaEmailPassword(email, password) {
    const user = read(usersKey).find(candidate => candidate.email.toLowerCase() === email.toLowerCase() && candidate.password === password);
    if (!user) throw new Error('Correo o contraseña incorrectos');
    setUser({ id: user.id, email: user.email, role: user.role });
  },
  async startDemo() {
    seedDemoData();
    setUser({ id: 'factugo-demo', email: 'demo@factugo.example', role: 'demo', is_demo: true });
  },
  loginWithProvider() { throw new Error('El acceso con Google se configurará al elegir el proveedor de autenticación.'); },
  logout() { localStorage.removeItem(sessionKey); },
  async resetPasswordRequest() { return true; },
  async resetPassword({ resetToken, newPassword }) {
    if (!resetToken) throw new Error('Enlace no válido');
    return true;
  },
};

const integrations = {
  Core: {
    async UploadFile({ file }) {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve({ file_url: reader.result });
        reader.onerror = () => reject(new Error('No se pudo leer el archivo'));
        reader.readAsDataURL(file);
      });
    },
    async SendEmail({ to, subject, body }) {
      window.location.href = `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      return true;
    },
    async InvokeLLM() { throw new Error('La digitalización con IA necesita un proveedor que configuraremos posteriormente.'); },
  },
};

export const appClient = {
  entities: Object.fromEntries(['Invoice', 'Client', 'Payment', 'BusinessProfile', 'InvoiceTemplate', 'AdministrativeNotification'].map(name => [name, createEntity(name)])),
  auth,
  integrations,
};
