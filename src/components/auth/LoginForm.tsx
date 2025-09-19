"use client";

import { useState, useTransition } from 'react';
import Link from 'next/link';
// Paso 1: Importar motion y AnimatePresence de framer-motion
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Mail, Lock, Eye, EyeOff, AlertCircle, ArrowLeft } from 'lucide-react';
import { login } from './actions';

export function LoginForm() {
  const [step, setStep] = useState(1);
  // Estado para controlar la dirección de la animación (1 para adelante, -1 para atrás)
  const [direction, setDirection] = useState(1);
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | undefined>('');
  const [isPending, startTransition] = useTransition();

  // Definimos las variantes de la animación
  const slideVariants = {
    enter: (direction: number) => ({
      x: direction > 0 ? '100%' : '-100%',
      opacity: 0,
    }),
    center: {
      x: 0,
      opacity: 1,
    },
    exit: (direction: number) => ({
      x: direction < 0 ? '100%' : '-100%',
      opacity: 0,
    }),
  };

  const handleContinue = () => {
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Por favor, ingresa un correo electrónico válido.");
      return;
    }
    setError('');
    setDirection(1); // Marcamos la dirección como "adelante"
    setStep(2);
  };

  const handleGoBack = () => {
    setError('');
    setDirection(-1); // Marcamos la dirección como "atrás"
    setStep(1);
    setPassword('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
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
        {/* AnimatePresence gestiona las animaciones de entrada y salida */}
        <AnimatePresence mode="wait" custom={direction}>
          {step === 1 && (
            <motion.div
              key="step1"
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.3, ease: 'easeInOut' }}
            >
              <CardHeader className="text-center">
                <CardTitle className="text-2xl font-bold">Inicia Sesión</CardTitle>
                <CardDescription>Ingresa tu correo para comenzar</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6 px-6 pb-6">
                {error && <Alert variant="destructive"><AlertCircle className="h-4 w-4" /><AlertDescription>{error}</AlertDescription></Alert>}
                <div className="space-y-2">
                  <Label htmlFor="email">Correo Electrónico</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <Input id="email" type="email" placeholder="tu@email.com" value={email} onChange={(e) => setEmail(e.target.value)} required className="pl-10 h-10" />
                  </div>
                </div>
                <Button onClick={handleContinue} className={primaryButtonClasses}>Continuar</Button>
              </CardContent>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div
              key="step2"
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.3, ease: 'easeInOut' }}
            >
              <CardHeader>
                <button onClick={handleGoBack} className="flex items-center text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Volver
                </button>
                <CardTitle className="text-2xl font-bold">Ingresa tu Contraseña</CardTitle>
                <CardDescription>
                  Iniciando sesión como <span className="font-semibold text-foreground">{email}</span>
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6 px-6 pb-6">
                 <form onSubmit={handleSubmit}>
                    {error && <Alert variant="destructive"><AlertCircle className="h-4 w-4" /><AlertDescription>{error}</AlertDescription></Alert>}
                    <div className="space-y-2">
                      <Label htmlFor="password">Contraseña</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                        <Input id="password" type={showPassword ? 'text' : 'password'} placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required className="pl-10 pr-10 h-10" autoFocus />
                        <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"><span className="sr-only">Toggle password visibility</span>{showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}</button>
                      </div>
                    </div>
                    <Button type="submit" className={primaryButtonClasses + " mt-6"} disabled={isPending}>
                      {isPending ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Verificando...</>) : ('Iniciar Sesión')}
                    </Button>
                 </form>
              </CardContent>
            </motion.div>
          )}
        </AnimatePresence>
        
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