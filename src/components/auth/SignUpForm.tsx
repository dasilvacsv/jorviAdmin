"use client";

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Mail, Lock, User, Eye, EyeOff, AlertCircle, CheckCircle, ArrowLeft } from 'lucide-react';
import { signup } from './actions';

// Componente para la barra de progreso
const ProgressIndicator = ({ currentStep }: { currentStep: number }) => {
  const steps = [1, 2, 3];
  return (
    <div className="flex w-full gap-2 px-6 pt-6">
      {steps.map((step) => (
        <div
          key={step}
          className={`h-1.5 flex-1 rounded-full transition-colors ${
            currentStep >= step ? 'bg-orange-500' : 'bg-slate-200 dark:bg-slate-700'
          }`}
        />
      ))}
    </div>
  );
};

export function SignUpForm() {
  const [step, setStep] = useState(1);
  const [direction, setDirection] = useState(1);
  
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  const [error, setError] = useState<string | undefined>('');
  const [success, setSuccess] = useState<string | undefined>('');
  
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const slideVariants = {
    enter: (direction: number) => ({ x: direction > 0 ? '100%' : '-100%', opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (direction: number) => ({ x: direction < 0 ? '100%' : '-100%', opacity: 0 }),
  };

  const handleNextStep = () => {
    setError('');
    if (step === 1 && name.trim().length < 2) {
      setError('Por favor, ingresa un nombre válido.');
      return;
    }
    if (step === 2 && (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))) {
      setError('Por favor, ingresa un correo electrónico válido.');
      return;
    }
    setDirection(1);
    setStep((prev) => prev + 1);
  };

  const handlePrevStep = () => {
    setError('');
    setDirection(-1);
    setStep((prev) => prev - 1);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden.');
      return;
    }

    startTransition(() => {
      signup({ name, email, password })
        .then((data) => {
          if (data.error) setError(data.error);
          if (data.success) {
            setSuccess(data.success);
            setTimeout(() => router.push('/auth/login'), 2000);
          }
        });
    });
  };

  const primaryButtonClasses = "w-full font-semibold h-11 text-white bg-gradient-to-r from-amber-500 to-orange-600 hover:shadow-lg hover:shadow-orange-500/40 focus-visible:ring-orange-400 transition-all duration-300 ease-in-out transform hover:scale-105";

  if (success) {
    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <Card className="w-full max-w-md rounded-2xl shadow-2xl p-8 text-center animate-fade-in">
          <CheckCircle className="mx-auto h-16 w-16 text-green-500 mb-4" />
          <h2 className="text-2xl font-bold mb-2">¡Registro Exitoso!</h2>
          <p className="text-muted-foreground">{success}</p>
          <p className="text-sm text-muted-foreground mt-4">Serás redirigido en unos segundos...</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen p-4">
      <Card className="w-full max-w-md rounded-2xl shadow-2xl border-none bg-white dark:bg-slate-900 overflow-hidden">
        <ProgressIndicator currentStep={step} />
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={step}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.3, ease: 'easeInOut' }}
          >
            {step === 1 && (
              <div>
                <CardHeader className="text-center">
                  <CardTitle className="text-2xl font-bold">Crea tu Cuenta</CardTitle>
                  <CardDescription>Primero, ¿cómo te llamas?</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6 px-6">
                  {error && <Alert variant="destructive"><AlertCircle className="h-4 w-4" /><AlertDescription>{error}</AlertDescription></Alert>}
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <Input id="name" placeholder="Tu nombre completo" value={name} onChange={(e) => setName(e.target.value)} required className="pl-10 h-10" />
                  </div>
                  <Button onClick={handleNextStep} className={primaryButtonClasses}>Continuar</Button>
                </CardContent>
              </div>
            )}

            {step === 2 && (
              <div>
                <CardHeader>
                  <button onClick={handlePrevStep} className="flex items-center text-sm text-muted-foreground hover:text-foreground mb-2"><ArrowLeft className="h-4 w-4 mr-2" />Volver</button>
                  <CardTitle className="text-2xl font-bold text-center">Correo Electrónico</CardTitle>
                  <CardDescription className="text-center">Lo usarás para iniciar sesión.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6 px-6">
                  {error && <Alert variant="destructive"><AlertCircle className="h-4 w-4" /><AlertDescription>{error}</AlertDescription></Alert>}
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <Input id="email" type="email" placeholder="tu@email.com" value={email} onChange={(e) => setEmail(e.target.value)} required className="pl-10 h-10" />
                  </div>
                  <Button onClick={handleNextStep} className={primaryButtonClasses}>Continuar</Button>
                </CardContent>
              </div>
            )}
            
            {step === 3 && (
              <div>
                <CardHeader>
                  <button onClick={handlePrevStep} className="flex items-center text-sm text-muted-foreground hover:text-foreground mb-2"><ArrowLeft className="h-4 w-4 mr-2" />Volver</button>
                  <CardTitle className="text-2xl font-bold text-center">Crea una Contraseña</CardTitle>
                  <CardDescription className="text-center">Asegúrate de que sea segura.</CardDescription>
                </CardHeader>
                <CardContent className="px-6">
                  <form onSubmit={handleSubmit} className="space-y-4">
                    {error && <Alert variant="destructive"><AlertCircle className="h-4 w-4" /><AlertDescription>{error}</AlertDescription></Alert>}
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                      <Input id="password" type={showPassword ? 'text' : 'password'} placeholder="Contraseña" value={password} onChange={(e) => setPassword(e.target.value)} required className="pl-10 pr-10 h-10" />
                      <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"><span className="sr-only">Toggle password visibility</span>{showPassword ? <EyeOff className="h-5 w-5"/> : <Eye className="h-5 w-5"/>}</button>
                    </div>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                      <Input id="confirmPassword" type={showPassword ? 'text' : 'password'} placeholder="Confirmar contraseña" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required className="pl-10 pr-10 h-10" />
                      <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"><span className="sr-only">Toggle password visibility</span>{showPassword ? <EyeOff className="h-5 w-5"/> : <Eye className="h-5 w-5"/>}</button>
                    </div>
                    <Button type="submit" className={primaryButtonClasses} disabled={isPending}>
                      {isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Creando cuenta...</> : 'Finalizar Registro'}
                    </Button>
                  </form>
                </CardContent>
              </div>
            )}
          </motion.div> { /* <-- AQUÍ ESTABA EL ERROR: FALTABA ESTA ETIQUETA DE CIERRE */ }
        </AnimatePresence>
        
        <CardFooter className="flex justify-center text-sm py-6 bg-slate-50 dark:bg-slate-950/50 border-t dark:border-slate-800">
          <p className="text-muted-foreground">
            ¿Ya tienes una cuenta?&nbsp;
            <Link href="/auth/login" className="font-semibold text-orange-600 hover:underline">
              Inicia sesión
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}