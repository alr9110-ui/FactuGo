import React, { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { BellRing, CheckCircle2, Clock3, ExternalLink, FilePlus2, MailWarning, ShieldCheck } from 'lucide-react';
import { appClient } from '@/api/appClient';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';

const asIsoDate = date => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
const today = () => asIsoDate(new Date());
const addDays = (date, days) => { const next = new Date(`${date}T12:00:00`); next.setDate(next.getDate() + days); return asIsoDate(next); };
const daysUntil = date => Math.ceil((new Date(`${date}T12:00:00`) - new Date(`${today()}T12:00:00`)) / 86400000);
const formatDate = date => date ? new Date(`${date}T12:00:00`).toLocaleDateString('es-ES') : '—';
const blank = () => ({ source: 'AEAT', title: '', reference: '', available_date: today(), deadline: addDays(today(), 10), notes: '', status: 'pendiente' });

function urgency(notification) {
  if (notification.status === 'resuelta') return { label: 'Resuelta', className: 'border-emerald-200 bg-emerald-50 text-emerald-700' };
  const days = daysUntil(notification.deadline);
  if (days < 0) return { label: `Vencida hace ${Math.abs(days)} día(s)`, className: 'border-red-200 bg-red-50 text-red-700' };
  if (days <= 2) return { label: days === 0 ? 'Vence hoy' : `Vence en ${days} día(s)`, className: 'border-amber-200 bg-amber-50 text-amber-800' };
  return { label: `Vence en ${days} día(s)`, className: 'border-blue-200 bg-blue-50 text-blue-700' };
}

export default function Notifications() {
  const queryClient = useQueryClient(); const [dialogOpen, setDialogOpen] = useState(false); const [form, setForm] = useState(blank());
  const { data: notifications = [], isLoading } = useQuery({ queryKey: ['administrative-notifications'], queryFn: () => appClient.entities.AdministrativeNotification.list('deadline', 200) });
  const createMutation = useMutation({ mutationFn: () => appClient.entities.AdministrativeNotification.create(form), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['administrative-notifications'] }); toast({ title: 'Notificación añadida', description: `Te avisaremos en FactuGo el ${formatDate(addDays(form.deadline, -2))}.` }); setDialogOpen(false); setForm(blank()); } });
  const updateMutation = useMutation({ mutationFn: ({ id, data }) => appClient.entities.AdministrativeNotification.update(id, data), onSuccess: () => queryClient.invalidateQueries({ queryKey: ['administrative-notifications'] }) });
  const pending = useMemo(() => notifications.filter(item => item.status !== 'resuelta'), [notifications]);
  const urgent = useMemo(() => pending.filter(item => daysUntil(item.deadline) <= 2), [pending]);
  const enableBrowserAlerts = () => {
    if (!('Notification' in window)) return toast({ title: 'Este navegador no admite avisos de escritorio', variant: 'destructive' });
    Notification.requestPermission().then(permission => { if (permission === 'granted') { urgent.forEach(item => new Notification('FactuGo: notificación próxima a vencer', { body: `${item.title || item.source} vence el ${formatDate(item.deadline)}.` })); toast({ title: 'Avisos del navegador activados' }); } });
  };
  const updateForm = (field, value) => setForm(previous => { const next = { ...previous, [field]: value }; if (field === 'available_date') next.deadline = addDays(value, 10); return next; });
  return <div className="space-y-6"><div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"><div><h1 className="text-2xl font-heading font-bold">Notificaciones</h1><p className="mt-1 text-sm text-muted-foreground">Controla plazos de AEAT, Seguridad Social y otras Administraciones.</p></div><div className="flex flex-wrap gap-2"><Button variant="outline" onClick={enableBrowserAlerts}><BellRing className="h-4 w-4" />Activar avisos en este navegador</Button><Button onClick={() => setDialogOpen(true)}><FilePlus2 className="h-4 w-4" />Añadir notificación</Button></div></div>
    <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900"><div className="flex items-center gap-2 font-medium"><ShieldCheck className="h-4 w-4" />Sin certificado digital</div><p className="mt-1">FactuGo no solicita, importa, almacena ni utiliza tu certificado. Las notificaciones se registran manualmente en este navegador.</p></div>
    <div className="grid grid-cols-1 gap-4 md:grid-cols-3"><Summary icon={MailWarning} label="Requieren atención" value={urgent.length} color="text-amber-700" /><Summary icon={Clock3} label="Pendientes" value={pending.length} color="text-primary" /><Summary icon={CheckCircle2} label="Resueltas" value={notifications.filter(item => item.status === 'resuelta').length} color="text-emerald-700" /></div>
    {urgent.length > 0 && <Card className="border-amber-200 bg-amber-50/40"><CardHeader className="pb-3"><CardTitle className="flex items-center gap-2 text-base text-amber-900"><BellRing className="h-4 w-4" />Recordatorios activos</CardTitle><CardDescription>Estas notificaciones vencen en dos días o menos.</CardDescription></CardHeader><CardContent className="space-y-2">{urgent.map(item => <NotificationRow key={item.id} item={item} onResolve={() => updateMutation.mutate({ id: item.id, data: { status: 'resuelta', resolved_date: today() } })} />)}</CardContent></Card>}
    <Card><CardHeader><CardTitle className="text-base">Todas las notificaciones</CardTitle><CardDescription>El plazo se propone a 10 días naturales desde la puesta a disposición; puedes corregirlo según el documento.</CardDescription></CardHeader><CardContent>{isLoading ? <p className="text-sm text-muted-foreground">Cargando…</p> : notifications.length ? <div className="space-y-2">{notifications.map(item => <NotificationRow key={item.id} item={item} onResolve={() => updateMutation.mutate({ id: item.id, data: { status: 'resuelta', resolved_date: today() } })} />)}</div> : <div className="rounded-md border border-dashed px-4 py-10 text-center text-sm text-muted-foreground">No has registrado notificaciones. Añade una al abrirla en DEHú o en la sede correspondiente.</div>}</CardContent></Card>
    <Card className="border-primary/20"><CardHeader><CardTitle className="text-base">Consultar DEHú</CardTitle><CardDescription>Accede con tu método oficial de identificación; FactuGo no interviene en ese acceso.</CardDescription></CardHeader><CardContent><Button asChild variant="outline"><a href="https://dehu.redsara.es/" target="_blank" rel="noreferrer">Abrir DEHú <ExternalLink className="h-4 w-4" /></a></Button></CardContent></Card>
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}><DialogContent><DialogHeader><DialogTitle>Añadir notificación administrativa</DialogTitle><DialogDescription>La fecha de vencimiento se calcula inicialmente a 10 días naturales y puede modificarse.</DialogDescription></DialogHeader><div className="grid grid-cols-1 gap-4 py-2 sm:grid-cols-2"><Field label="Organismo"><Select value={form.source} onValueChange={value => updateForm('source', value)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="AEAT">AEAT</SelectItem><SelectItem value="Seguridad Social">Seguridad Social</SelectItem><SelectItem value="Otra Administración">Otra Administración</SelectItem></SelectContent></Select></Field><Field label="Referencia / expediente"><Input value={form.reference} onChange={event => updateForm('reference', event.target.value)} placeholder="Opcional" /></Field><div className="sm:col-span-2"><Field label="Asunto"><Input value={form.title} onChange={event => updateForm('title', event.target.value)} placeholder="Ej.: Requerimiento de documentación" /></Field></div><Field label="Puesta a disposición"><Input type="date" value={form.available_date} onChange={event => updateForm('available_date', event.target.value)} /></Field><Field label="Fecha de vencimiento"><Input type="date" value={form.deadline} onChange={event => updateForm('deadline', event.target.value)} /></Field><div className="sm:col-span-2"><Field label="Notas"><Textarea value={form.notes} onChange={event => updateForm('notes', event.target.value)} placeholder="Qué debes hacer o dónde está el documento" rows={3} /></Field></div></div><DialogFooter><Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button><Button onClick={() => createMutation.mutate()} disabled={createMutation.isPending || !form.title.trim()}>{createMutation.isPending ? 'Guardando…' : 'Guardar y programar aviso'}</Button></DialogFooter></DialogContent></Dialog>
  </div>;
}

function Field({ label, children }) { return <div className="space-y-2"><Label>{label}</Label>{children}</div>; }
function Summary({ icon: Icon, label, value, color }) { return <Card><CardContent className="flex items-center gap-3 p-5"><Icon className={cn('h-5 w-5', color)} /><div><p className="text-2xl font-bold">{value}</p><p className="text-xs text-muted-foreground">{label}</p></div></CardContent></Card>; }
function NotificationRow({ item, onResolve }) { const state = urgency(item); return <div className="flex flex-col gap-3 rounded-lg border bg-card p-3 sm:flex-row sm:items-center sm:justify-between"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><p className="truncate text-sm font-semibold">{item.title || 'Sin asunto'}</p><Badge variant="outline">{item.source}</Badge><Badge variant="outline" className={state.className}>{state.label}</Badge></div><p className="mt-1 text-xs text-muted-foreground">Vence: {formatDate(item.deadline)}{item.reference ? ` · ${item.reference}` : ''}{item.notes ? ` · ${item.notes}` : ''}</p></div>{item.status !== 'resuelta' && <Button size="sm" variant="outline" onClick={onResolve}>Marcar resuelta</Button>}</div>; }
