import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import MobileNav from './MobileNav';
import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/AuthContext';

export default function AppLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const { user } = useAuth();
  return <div className="min-h-screen bg-background"><div className="hidden md:block"><Sidebar collapsed={collapsed} onToggle={() => setCollapsed(!collapsed)} /></div><div className="md:hidden"><MobileNav /></div><main className={cn('transition-all duration-300 min-h-screen', 'md:pt-0 pt-16', collapsed ? 'md:ml-[68px]' : 'md:ml-[240px]')}><div className="p-4 md:p-8 max-w-[1400px]">{user?.is_demo && <div className="mb-5 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"><strong>Modo demostración.</strong> Los datos son ficticios y se guardan solo en este navegador. No introduzcas información fiscal real.</div>}<Outlet /></div></main></div>;
}
