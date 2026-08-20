import { Toaster } from "@/components/ui/toaster";
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClientInstance } from '@/lib/query-client';
import { BrowserRouter, HashRouter, Route, Routes, Navigate, useLocation } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import ProtectedRoute from '@/components/ProtectedRoute';
import ScrollToTop from './components/ScrollToTop';

import Login from '@/pages/Login';
import Register from '@/pages/Register';
import ForgotPassword from '@/pages/ForgotPassword';
import ResetPassword from '@/pages/ResetPassword';
import AppLayout from '@/components/layout/AppLayout';
import Dashboard from '@/pages/Dashboard';
import Invoices from '@/pages/Invoices';
import Digitize from '@/pages/Digitize';
import NewInvoice from '@/pages/NewInvoice';
import Quarters from '@/pages/Quarters';
import Reports from '@/pages/Reports';
import InvoiceBooks from '@/pages/InvoiceBooks';
import Notifications from '@/pages/Notifications';
import Clients from '@/pages/Clients';
import Settings from '@/pages/Settings';
import Cobros from '@/pages/Cobros';
import Gastos from '@/pages/Gastos';
import Plantillas from '@/pages/Plantillas';

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError } = useAuth();
  const location = useLocation();
  const isPublicRoute = ['/login', '/register', '/forgot-password', '/reset-password'].includes(location.pathname);

  if (!isPublicRoute && (isLoadingPublicSettings || isLoadingAuth)) {
    return <div className="fixed inset-0 flex items-center justify-center bg-background"><div className="w-8 h-8 border-4 border-border border-t-primary rounded-full animate-spin" /></div>;
  }
  if (!isPublicRoute && authError) {
    if (authError.type === 'user_not_registered') return <UserNotRegisteredError />;
    if (authError.type === 'auth_required') return <Navigate to="/login" replace />;
  }
  return <Routes>
    <Route path="/login" element={<Login />} />
    <Route path="/register" element={<Register />} />
    <Route path="/forgot-password" element={<ForgotPassword />} />
    <Route path="/reset-password" element={<ResetPassword />} />
    <Route element={<ProtectedRoute unauthenticatedElement={<Navigate to="/login" replace />} />}>
      <Route element={<AppLayout />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/facturas" element={<Invoices />} />
        <Route path="/digitalizar" element={<Digitize />} />
        <Route path="/nueva-factura" element={<NewInvoice />} />
        <Route path="/trimestres" element={<Quarters />} />
        <Route path="/informes" element={<Reports />} />
        <Route path="/libros-registro" element={<InvoiceBooks />} />
        <Route path="/notificaciones" element={<Notifications />} />
        <Route path="/clientes" element={<Clients />} />
        <Route path="/cobros" element={<Cobros />} />
        <Route path="/gastos" element={<Gastos />} />
        <Route path="/plantillas" element={<Plantillas />} />
        <Route path="/configuracion" element={<Settings />} />
      </Route>
    </Route>
    <Route path="*" element={<PageNotFound />} />
  </Routes>;
};

function App() {
  const Router = import.meta.env.BASE_URL === '/' ? BrowserRouter : HashRouter;
  return <AuthProvider><QueryClientProvider client={queryClientInstance}><Router><ScrollToTop /><AuthenticatedApp /></Router><Toaster /></QueryClientProvider></AuthProvider>;
}

export default App;
