import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { appClient } from '@/api/appClient';
import { useAuth } from '@/lib/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { UserPlus, Mail, Lock, Loader2 } from 'lucide-react';
import AuthLayout from '@/components/AuthLayout';

export default function Register() {
  const navigate = useNavigate();
  const { checkUserAuth } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async event => {
    event.preventDefault();
    setError('');
    if (password !== confirmPassword) return setError('Las contraseñas no coinciden.');
    setLoading(true);
    try {
      await appClient.auth.register({ email, password });
      await appClient.auth.loginViaEmailPassword(email, password);
      await checkUserAuth();
      navigate('/', { replace: true });
    } catch (err) {
      setError(err.message || 'No se pudo crear la cuenta.');
    } finally {
      setLoading(false);
    }
  };

  return <AuthLayout icon={UserPlus} title="Crea tu cuenta" subtitle="Empieza a gestionar tu facturación" footer={<>¿Ya tienes cuenta? <Link to="/login" className="text-primary font-medium hover:underline">Inicia sesión</Link></>}>
    {error && <div className="mb-4 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">{error}</div>}
    <form onSubmit={handleSubmit} className="space-y-4">
      <Credential label="Correo electrónico" id="email" icon={Mail} type="email" value={email} setValue={setEmail} autoComplete="email" autoFocus />
      <Credential label="Contraseña" id="password" icon={Lock} type="password" value={password} setValue={setPassword} autoComplete="new-password" />
      <Credential label="Repite la contraseña" id="confirm" icon={Lock} type="password" value={confirmPassword} setValue={setConfirmPassword} autoComplete="new-password" />
      <Button type="submit" className="w-full h-12 font-medium" disabled={loading}>{loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Creando cuenta...</> : 'Crear cuenta'}</Button>
    </form>
  </AuthLayout>;
}

function Credential({ label, id, icon: Icon, type, value, setValue, autoComplete, autoFocus }) {
  return <div className="space-y-2"><Label htmlFor={id}>{label}</Label><div className="relative"><Icon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" /><Input id={id} type={type} autoComplete={autoComplete} autoFocus={autoFocus} placeholder={type === 'password' ? '••••••••' : 'tu@correo.com'} value={value} onChange={event => setValue(event.target.value)} className="pl-10 h-12" required /></div></div>;
}
