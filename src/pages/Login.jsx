import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { appClient } from '@/api/appClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LogIn, Mail, Lock, Loader2, Sparkles } from 'lucide-react';
import AuthLayout from '@/components/AuthLayout';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async event => {
    event.preventDefault();
    setError('');
    setLoading(true);
    try {
      await appClient.auth.loginViaEmailPassword(email, password);
      window.location.assign('/');
    } catch (err) {
      setError(err.message || 'Correo o contraseña incorrectos.');
    } finally {
      setLoading(false);
    }
  };
  const startDemo = async () => {
    setError(''); setLoading(true);
    try { await appClient.auth.startDemo(); window.location.assign('/'); }
    catch (err) { setError(err.message || 'No se pudo iniciar la demostración.'); }
    finally { setLoading(false); }
  };

  return <AuthLayout
    icon={LogIn}
    title="Bienvenido de nuevo"
    subtitle="Accede a tu cuenta"
    footer={<>¿No tienes cuenta? <Link to="/register" className="text-primary font-medium hover:underline">Regístrate</Link></>}
  >
    {error && <div className="mb-4 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">{error}</div>}
    <Button type="button" variant="outline" className="w-full h-12 font-medium" disabled={loading} onClick={startDemo}><Sparkles className="w-4 h-4 mr-2" />Probar demo con datos ficticios</Button>
    <p className="my-4 text-center text-xs text-muted-foreground">La demo se guarda solo en este navegador. No introduzcas datos reales.</p>
    <form onSubmit={handleSubmit} className="space-y-4 border-t pt-4">
      <div className="space-y-2">
        <Label htmlFor="email">Correo electrónico</Label>
        <div className="relative"><Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" /><Input id="email" type="email" autoComplete="email" autoFocus placeholder="tu@correo.com" value={email} onChange={event => setEmail(event.target.value)} className="pl-10 h-12" required /></div>
      </div>
      <div className="space-y-2">
        <div className="flex items-center justify-between"><Label htmlFor="password">Contraseña</Label><Link to="/forgot-password" className="text-xs text-primary hover:underline">¿Olvidaste tu contraseña?</Link></div>
        <div className="relative"><Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" /><Input id="password" type="password" autoComplete="current-password" placeholder="••••••••" value={password} onChange={event => setPassword(event.target.value)} className="pl-10 h-12" required /></div>
      </div>
      <Button type="submit" className="w-full h-12 font-medium" disabled={loading}>{loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Iniciando sesión...</> : 'Iniciar sesión'}</Button>
    </form>
  </AuthLayout>;
}
