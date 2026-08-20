import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  ArrowDownLeft, BarChart3, Bell, BookOpen, CalendarDays, Euro, FileText,
  LayoutDashboard, LayoutTemplate, LogOut, Menu, PlusCircle, Receipt, Settings,
  Upload, Users, X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/AuthContext';

const navItems = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/facturas', label: 'Facturas', icon: FileText },
  { path: '/cobros', label: 'Cobros', icon: Euro },
  { path: '/gastos', label: 'Gastos', icon: ArrowDownLeft },
  { path: '/plantillas', label: 'Plantillas', icon: LayoutTemplate },
  { path: '/digitalizar', label: 'Digitalizar', icon: Upload },
  { path: '/nueva-factura', label: 'Nueva Factura', icon: PlusCircle },
  { path: '/trimestres', label: 'Trimestres', icon: Receipt },
  { path: '/informes', label: 'Informes', icon: BarChart3 },
  { path: '/libros-registro', label: 'Libros registro', icon: BookOpen },
  { path: '/notificaciones', label: 'Notificaciones', icon: Bell },
  { path: '/clientes', label: 'Clientes', icon: Users },
  { path: '/configuracion', label: 'Configuración', icon: Settings },
];

export default function MobileNav() {
  const location = useLocation();
  const { logout } = useAuth();
  const [open, setOpen] = useState(false);

  const closeMenu = () => setOpen(false);

  return <>
    <header className="fixed inset-x-0 top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-card px-4">
      <div className="flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary"><Receipt className="h-4 w-4 text-primary-foreground" /></div>
        <span className="font-heading text-sm font-bold">FactuGo</span>
      </div>
      <button type="button" onClick={() => setOpen(true)} aria-label="Abrir menú" aria-expanded={open} className="rounded-lg p-2 touch-manipulation hover:bg-muted active:bg-muted">
        <Menu className="h-5 w-5" />
      </button>
    </header>

    {open && <>
      <button type="button" aria-label="Cerrar menú" onClick={closeMenu} className="fixed inset-0 z-40 bg-black/40 touch-manipulation" />
      <aside role="dialog" aria-modal="true" aria-label="Menú de navegación" className="fixed inset-y-0 right-0 z-50 flex w-[280px] max-w-[85vw] flex-col bg-background shadow-2xl">
        <div className="flex h-16 items-center justify-between border-b px-4">
          <span className="font-heading font-bold">Menú</span>
          <button type="button" onClick={closeMenu} aria-label="Cerrar menú" className="rounded-lg p-2 touch-manipulation hover:bg-muted active:bg-muted"><X className="h-5 w-5" /></button>
        </div>
        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
          {navItems.map(item => {
            const active = location.pathname === item.path;
            return <Link key={item.path} to={item.path} onClick={closeMenu} className={cn('flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium transition-colors', active ? 'bg-primary text-primary-foreground' : 'text-foreground/70 hover:bg-muted')}>
              <item.icon className="h-[18px] w-[18px]" /><span>{item.label}</span>
            </Link>;
          })}
        </nav>
        <div className="space-y-2 border-t p-3">
          <a href="https://sede.agenciatributaria.gob.es/Sede/presentacion-declaraciones-calendario-contribuyente.html" target="_blank" rel="noreferrer" className="flex items-center gap-3 rounded-lg bg-muted px-3 py-3 text-sm font-medium text-foreground/80 hover:bg-muted/70"><CalendarDays className="h-[18px] w-[18px]" /><span>Calendario AEAT</span></a>
          <button type="button" onClick={logout} className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-sm text-muted-foreground hover:bg-muted"><LogOut className="h-[18px] w-[18px]" /><span>Cerrar sesión</span></button>
        </div>
      </aside>
    </>}
  </>;
}
