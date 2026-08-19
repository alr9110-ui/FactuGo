import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { appClient } from '@/api/appClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Building2, FileText, Pencil, PlusCircle, Search, Trash2, Users } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import ClientInvoiceHistory from '@/components/clients/ClientInvoiceHistory';
import QuickInvoiceDraft from '@/components/clients/QuickInvoiceDraft';

const empty = { name: '', nif: '', address: '', city: '', postal_code: '', province: '', email: '', phone: '', type: 'cliente', notes: '' };
const labels = { cliente: 'Cliente', proveedor: 'Proveedor', ambos: 'Cliente y proveedor' };
const colors = { cliente: 'bg-emerald-50 text-emerald-700', proveedor: 'bg-amber-50 text-amber-700', ambos: 'bg-blue-50 text-blue-700' };

export default function Clients() {
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState('clientes');
  const [form, setForm] = useState(empty);
  const [editing, setEditing] = useState(null);
  const [contactDialogOpen, setContactDialogOpen] = useState(false);
  const [draft, setDraft] = useState(null);
  const [expanded, setExpanded] = useState(null);
  const queryClient = useQueryClient();
  const { data: all = [] } = useQuery({ queryKey: ['clients'], queryFn: () => appClient.entities.Client.list('name', 200) });

  const closeForm = () => { setContactDialogOpen(false); setEditing(null); setForm(empty); };
  const save = useMutation({
    mutationFn: data => editing ? appClient.entities.Client.update(editing.id, data) : appClient.entities.Client.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      toast({ title: editing ? 'Contacto actualizado' : 'Contacto creado correctamente' });
      closeForm();
    },
  });
  const del = useMutation({
    mutationFn: id => appClient.entities.Client.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['clients'] }),
  });

  const list = all.filter(contact => {
    const matchesTab = tab === 'clientes' ? contact.type !== 'proveedor' : contact.type !== 'cliente';
    const term = search.toLocaleLowerCase('es-ES');
    const matchesSearch = !term || contact.name?.toLocaleLowerCase('es-ES').includes(term) || contact.nif?.toLocaleLowerCase('es-ES').includes(term);
    return matchesTab && matchesSearch;
  });
  const openNew = () => { setEditing(null); setForm({ ...empty, type: tab === 'clientes' ? 'cliente' : 'proveedor' }); setContactDialogOpen(true); };
  const openEdit = contact => { setEditing(contact); setForm({ ...empty, ...contact }); setContactDialogOpen(true); };
  const update = (field, value) => setForm(previous => ({ ...previous, [field]: value }));

  return <div className="space-y-6">
    <div className="flex items-start justify-between gap-4">
      <div><h1 className="text-2xl font-heading font-bold">Clientes y proveedores</h1><p className="text-sm text-muted-foreground mt-1">{all.filter(contact => contact.type !== 'proveedor').length} clientes · {all.filter(contact => contact.type !== 'cliente').length} proveedores</p></div>
      <Button size="sm" onClick={openNew}><PlusCircle className="w-4 h-4" />Nuevo {tab === 'clientes' ? 'cliente' : 'proveedor'}</Button>
    </div>

    <div className="flex flex-col sm:flex-row gap-3">
      <div className="flex gap-2"><Button variant={tab === 'clientes' ? 'default' : 'outline'} onClick={() => setTab('clientes')}><Users className="w-4 h-4" />Clientes</Button><Button variant={tab === 'proveedores' ? 'default' : 'outline'} onClick={() => setTab('proveedores')}><Building2 className="w-4 h-4" />Proveedores</Button></div>
      <div className="relative flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" /><Input className="pl-9" placeholder="Buscar por nombre o NIF..." value={search} onChange={event => setSearch(event.target.value)} /></div>
    </div>

    <div className="bg-card rounded-xl border border-border divide-y">
      {!list.length && <div className="p-10 text-center"><p className="text-sm text-muted-foreground">No hay {tab === 'clientes' ? 'clientes' : 'proveedores'} todavía.</p><Button variant="link" onClick={openNew} className="mt-1">Crear el primero</Button></div>}
      {list.map(contact => <React.Fragment key={contact.id}><div className="p-4 flex items-center justify-between gap-3 cursor-pointer hover:bg-muted/30" onClick={() => setExpanded(expanded === contact.id ? null : contact.id)}><div className="min-w-0"><p className="font-medium truncate">{contact.name}</p><p className="text-xs text-muted-foreground truncate">{contact.nif || 'Sin NIF'} · {contact.email || 'Sin email'}</p></div><div className="flex items-center gap-1 shrink-0"><Badge className={colors[contact.type]}>{labels[contact.type]}</Badge><button aria-label={`Editar ${contact.name}`} className="p-2 rounded hover:bg-muted" onClick={event => { event.stopPropagation(); openEdit(contact); }}><Pencil className="w-4 h-4" /></button><button aria-label={`Eliminar ${contact.name}`} className="p-2 rounded hover:bg-destructive/10 text-destructive" onClick={event => { event.stopPropagation(); del.mutate(contact.id); }}><Trash2 className="w-4 h-4" /></button>{contact.type !== 'proveedor' && <button aria-label={`Crear factura para ${contact.name}`} className="p-2 rounded hover:bg-muted" onClick={event => { event.stopPropagation(); setDraft(contact); }}><FileText className="w-4 h-4" /></button>}</div></div>{expanded === contact.id && <ClientInvoiceHistory client={contact} />}</React.Fragment>)}
    </div>

    <ContactDialog open={contactDialogOpen} onClose={closeForm} form={form} update={update} onSave={() => save.mutate(form)} saving={save.isPending} editing={!!editing} />
    <QuickInvoiceDraft open={!!draft} onClose={() => setDraft(null)} client={draft || {}} />
  </div>;
}

function ContactDialog({ open, onClose, form, update, onSave, saving, editing }) {
  return <Dialog open={open} onOpenChange={isOpen => { if (!isOpen) onClose(); }}><DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto"><DialogHeader><DialogTitle>{editing ? 'Editar contacto' : 'Nuevo contacto'}</DialogTitle></DialogHeader><div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2"><FormField label="Nombre o razón social *" value={form.name} onChange={value => update('name', value)} /><FormField label="NIF/CIF" value={form.nif} onChange={value => update('nif', value)} /><div className="space-y-2"><Label>Tipo</Label><Select value={form.type} onValueChange={value => update('type', value)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="cliente">Cliente</SelectItem><SelectItem value="proveedor">Proveedor</SelectItem><SelectItem value="ambos">Cliente y proveedor</SelectItem></SelectContent></Select></div><FormField label="Email" type="email" value={form.email} onChange={value => update('email', value)} /><div className="sm:col-span-2"><FormField label="Dirección" value={form.address} onChange={value => update('address', value)} /></div><FormField label="Ciudad" value={form.city} onChange={value => update('city', value)} /><FormField label="Provincia" value={form.province} onChange={value => update('province', value)} /><FormField label="Código postal" value={form.postal_code} onChange={value => update('postal_code', value)} /><FormField label="Teléfono" value={form.phone} onChange={value => update('phone', value)} /><div className="sm:col-span-2 space-y-2"><Label>Notas</Label><Textarea rows={3} value={form.notes} onChange={event => update('notes', event.target.value)} /></div></div><div className="flex justify-end gap-2 pt-5"><Button variant="outline" onClick={onClose}>Cancelar</Button><Button onClick={onSave} disabled={!form.name.trim() || saving}>{saving ? 'Guardando...' : editing ? 'Guardar cambios' : 'Crear contacto'}</Button></div></DialogContent></Dialog>;
}

function FormField({ label, value, onChange, type = 'text' }) { return <div className="space-y-2"><Label>{label}</Label><Input type={type} value={value || ''} onChange={event => onChange(event.target.value)} /></div>; }
