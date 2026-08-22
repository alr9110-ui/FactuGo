import { Toaster } from "@/components/ui/toaster";
import { lazy, Suspense } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClientInstance } from '@/lib/query-client';
import { BrowserRouter, HashRouter, Route, Routes, Navigate, useLocation } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import ProtectedRoute from '@/components/ProtectedRoute';
import ScrollToTop from './components/ScrollToTop';

const Login = lazy(() => import('@/pages/Login'));
const Register = lazy(() => import('@/pages/Register'));
const ForgotPassword = lazy(() => import('@/pages/ForgotPassword'));
const ResetPassword = lazy(() => import('@/pages/ResetPassword'));
const AppLayout = lazy(() => import('@/components/layout/AppLayout'));
const Dashboard = lazy(() => import('@/pages/Dashboard'));
const Invoices = lazy(() => import('@/pages/Invoices'));
const Digitize = lazy(() => import('@/pages/Digitize'));
const NewInvoice = lazy(() => import('@/pages/NewInvoice'));
const Quarters = lazy(() => import('@/pages/Quarters'));
const Reports = lazy(() => import('@/pages/Reports'));
const InvoiceBooks = lazy(() => import('@/pages/InvoiceBooks'));
const Notifications = lazy(() => import('@/pages/Notifications'));
const Clients = lazy(() => import('@/pages/Clients'));
const Settings = lazy(() => import('@/pages/Settings'));
const Cobros = lazy(() => import('@/pages/Cobros'));
const Gastos = lazy(() => import('@/pages/Gastos'));
const Plantillas = lazy(() => import('@/pages/Plantillas'));

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
  return <AuthProvider><QueryClientProvider client={queryClientInstance}><Router><ScrollToTop /><Suspense fallback={<div className="fixed inset-0 flex items-center justify-center bg-background"><div className="h-8 w-8 animate-spin rounded-full border-4 border-border border-t-primary" /></div>}><AuthenticatedApp /></Suspense></Router><Toaster /></QueryClientProvider></AuthProvider>;
}

export default App;
