"use client";

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Mail, Lock, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { login } from './actions';

export function LoginForm() {
  // Ahora solo necesitamos el estado para los campos y los errores.
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | undefined>('');
  const [isPending, startTransition] = useTransition();

  // La lógica de envío se fusiona en una sola función.
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Validamos ambos campos antes de enviar.
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Por favor, ingresa un correo electrónico válido.");
      return;
    }
    if (!password) {
      setError("Por favor, ingresa tu contraseña.");
      return;
    }

    setError('');
    startTransition(async () => {
      const result = await login({ email, password });
      if (result?.error) {
        setError(result.error);
      }
    });
  };

  const primaryButtonClasses = "w-full font-semibold h-11 text-white bg-gradient-to-r from-amber-500 to-orange-600 hover:shadow-lg hover:shadow-orange-500/40 focus-visible:ring-orange-400 transition-all duration-300 ease-in-out transform hover:scale-105";

  return (
    <div className="flex items-center justify-center min-h-screen p-4">
      <Card className="w-full max-w-md rounded-2xl shadow-2xl border-none bg-white dark:bg-slate-900 overflow-hidden">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">Inicia Sesión</CardTitle>
          <CardDescription>Ingresa tus datos para acceder</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 px-6 pb-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && <Alert variant="destructive"><AlertCircle className="h-4 w-4" /><AlertDescription>{error}</AlertDescription></Alert>}
            
            <div className="space-y-2">
              <Label htmlFor="email">Correo Electrónico</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="tu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="pl-10 h-10"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Contraseña</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="pl-10 pr-10 h-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <span className="sr-only">Toggle password visibility</span>
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>
            
            <Button
              type="submit"
              className={primaryButtonClasses}
              disabled={isPending}
            >
              {isPending ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Verificando...</>) : ('Iniciar Sesión')}
            </Button>
          </form>
        </CardContent>
        
        <CardFooter className="flex justify-center text-sm py-6 bg-slate-50 dark:bg-slate-950/50 border-t dark:border-slate-800">
          <p className="text-muted-foreground">
            ¿Aún no tienes cuenta?&nbsp;
            <Link href="/auth/signup" className="font-semibold text-orange-600 hover:underline">
              Crea una ahora
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}