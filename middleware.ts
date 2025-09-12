// middleware.ts
import { NextResponse } from 'next/server';
import NextAuth from 'next-auth';
import { authConfig } from '@/lib/auth'; // Asegúrate que la ruta sea correcta

// `auth` es un handler de NextAuth que se encarga de procesar la autenticación.
const { auth } = NextAuth(authConfig);

// Envuelve el middleware para usar el handler de NextAuth.
export default auth((req) => {
  const { nextUrl } = req;
  const isLoggedIn = !!req.auth;

  // Define las rutas que son públicas (accesibles sin autenticación)
  const isPublicRoute = nextUrl.pathname.startsWith('/auth/login') || nextUrl.pathname.startsWith('/auth/register');

  // Si el usuario no está autenticado y la ruta no es pública, redirigir al login
  if (!isLoggedIn && !isPublicRoute) {
    return NextResponse.redirect(new URL('/auth/login', nextUrl));
  }
  
  // Si el usuario está autenticado y la ruta es pública, redirigir al dashboard
  if (isLoggedIn && isPublicRoute) {
    return NextResponse.redirect(new URL('/dashboard', nextUrl));
  }

  // Lógica de autorización basada en roles
  const isAdminRoute = nextUrl.pathname.startsWith('/admin');
  const userRole = req.auth?.user?.role;

  // Si la ruta es de admin y el usuario no es admin, redirigir a la raíz
  if (isAdminRoute && userRole !== 'admin') {
    return NextResponse.redirect(new URL('/', nextUrl));
  }
  
  return NextResponse.next();
});

// `config` define las rutas donde el middleware se ejecutará.
export const config = {
  // Coincide con todas las rutas excepto las que contienen una extensión, API, estáticos, etc.
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};