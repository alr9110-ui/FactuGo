import React, { useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import { BookOpen, RotateCcw, Sparkles } from 'lucide-react';
import Sidebar from './Sidebar';
import MobileNav from './MobileNav';
import { appClient } from '@/api/appClient';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/AuthContext';

const DEMO_GUIDE_KEY = 'factugo:demo:guide-dismissed';

export default function AppLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    if (user?.is_demo && !localStorage.getItem(DEMO_GUIDE_KEY)) setGuideOpen(true);
  }, [user?.is_demo]);

  const closeGuide = () => {
    localStorage.setItem(DEMO_GUIDE_KEY, 'true');
    setGuideOpen(false);
  };

  const resetDemo = async () => {
    if (!window.confirm('Se restablecerán todos los datos ficticios de esta demo en este navegador. ¿Continuar?')) return;
    await appClient.auth.resetDemo();
    localStorage.removeItem(DEMO_GUIDE_KEY);
    window.location.reload();
  };

  return <div className="min-h-screen bg-background">
    <div className="hidden md:block"><Sidebar collapsed={collapsed} onToggle={() => setCollapsed(!collapsed)} /></div>
    <div className="md:hidden"><MobileNav /></div>
    <main className={cn('min-h-screen transition-all duration-300', 'pt-16 md:pt-0', collapsed ? 'md:ml-[68px]' : 'md:ml-[240px]')}>
      <div className="max-w-[1400px] p-4 md:p-8">
        {user?.is_demo && <div className="mb-5 flex flex-col gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 sm:flex-row sm:items-center sm:justify-between">
          <p><strong>Modo demostración.</strong> Los datos son ficticios y se guardan solo en este navegador.</p>
          <div className="flex flex-wrap gap-2">
            <Button type="button" size="sm" variant="outline" onClick={() => setGuideOpen(true)} className="gap-1.5"><BookOpen className="h-3.5 w-3.5" />Ver guía</Button>
            <Button type="button" size="sm" variant="outline" onClick={resetDemo} className="gap-1.5"><RotateCcw className="h-3.5 w-3.5" />Restablecer demo</Button>
          </div>
        </div>}
        <Outlet />
      </div>
    </main>

    <Dialog open={guideOpen} onOpenChange={open => open ? setGuideOpen(true) : closeGuide()}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Sparkles className="h-5 w-5 text-primary" />Explora FactuGo en un minuto</DialogTitle>
          <DialogDescription>Una ruta rápida para conocer las funciones principales de la demo.</DialogDescription>
        </DialogHeader>
        <ol className="space-y-3 text-sm">
          <li className="flex gap-3 rounded-lg border bg-muted/30 p-3"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">1</span><span><strong>Crea una factura.</strong> Añade varias líneas y revisa el PDF profesional antes de preparar el correo.</span></li>
          <li className="flex gap-3 rounded-lg border bg-muted/30 p-3"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">2</span><span><strong>Consulta Trimestres.</strong> Visualiza el IVA y los borradores orientativos de tus obligaciones.</span></li>
          <li className="flex gap-3 rounded-lg border bg-muted/30 p-3"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">3</span><span><strong>Prueba Informes y Libros registro.</strong> Exporta información y explora el control fiscal anual.</span></li>
        </ol>
        <div className="flex justify-end"><Button onClick={closeGuide}>Empezar la demo</Button></div>
      </DialogContent>
    </Dialog>
  </div>;
}
