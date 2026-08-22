import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, LogIn, Mail, Lock, Loader2, Sparkles } from 'lucide-react';
import { appClient } from '@/api/appClient';
import { useAuth } from '@/lib/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import AuthLayout from '@/components/AuthLayout';

export default function Login() {
  const navigate = useNavigate();
  const { checkUserAuth } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async event => {
    event.preventDefault();
    setError('');
    setLoading(true);
    try {
      await appClient.auth.loginViaEmailPassword(email, password);
      await checkUserAuth();
      navigate('/', { replace: true });
    } catch (err) {
      setError(err.message || 'Correo o contraseña incorrectos.');
    } finally {
      setLoading(false);
    }
  };

  const startDemo = async () => {
    setError('');
    setLoading(true);
    try {
      await appClient.auth.startDemo();
      await checkUserAuth();
      navigate('/', { replace: true });
    } catch (err) {
      setError(err.message || 'No se pudo iniciar la demostración.');
    } finally {
      setLoading(false);
    }
  };

  return <AuthLayout
    icon={LogIn}
    title="Bienvenido de nuevo"
    subtitle="Accede a tu cuenta"
    footer={<>¿No tienes cuenta? <Link to="/register" className="text-primary font-medium hover:underline">Regístrate</Link></>}
  >
    {error && <div className="mb-4 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{error}</div>}
    <Button type="button" variant="outline" className="h-12 w-full font-medium" disabled={loading} onClick={startDemo}><Sparkles className="mr-2 h-4 w-4" />Probar demo con datos ficticios</Button>
    <p className="my-4 text-center text-xs text-muted-foreground">La demo se guarda solo en este navegador. No introduzcas datos reales.</p>
    <form onSubmit={handleSubmit} className="space-y-4 border-t pt-4">
      <div className="space-y-2">
        <Label htmlFor="email">Correo electrónico</Label>
        <div className="relative"><Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input id="email" type="email" autoComplete="email" autoFocus placeholder="tu@correo.com" value={email} onChange={event => setEmail(event.target.value)} className="h-12 pl-10" required /></div>
      </div>
      <div className="space-y-2">
        <div className="flex items-center justify-between"><Label htmlFor="password">Contraseña</Label><Link to="/forgot-password" className="text-xs text-primary hover:underline">¿Olvidaste tu contraseña?</Link></div>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input id="password" type={showPassword ? 'text' : 'password'} autoComplete="current-password" placeholder="••••••••" value={password} onChange={event => setPassword(event.target.value)} className="h-12 pl-10 pr-11" required />
          <button type="button" onClick={() => setShowPassword(visible => !visible)} aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'} aria-pressed={showPassword} className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-2 text-muted-foreground hover:bg-muted hover:text-foreground focus:outline-none focus:ring-2 focus:ring-ring">
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      </div>
      <Button type="submit" className="h-12 w-full font-medium" disabled={loading}>{loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Iniciando sesión...</> : 'Iniciar sesión'}</Button>
    </form>
  </AuthLayout>;
}
