// /auth.ts

import NextAuth from 'next-auth';
import { type AuthConfig } from '@auth/core/types'; // Importación corregida
import CredentialsProvider from 'next-auth/providers/credentials';
import { db } from './db'; // Asegúrate que la ruta a tu DB sea correcta
import { users } from './db/schema'; // Asegúrate que la ruta a tu schema sea correcta
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';

export const authConfig: AuthConfig = {
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const user = await db.query.users.findFirst({
          where: eq(users.email, String(credentials.email)),
        });

        if (!user || !user.password) {
          return null;
        }

        const isValidPassword = await bcrypt.compare(String(credentials.password), user.password);

        if (!isValidPassword) {
          return null;
        }

        // Devuelve el objeto de usuario sin la contraseña
        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        };
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) { // Al iniciar sesión, se añade el rol y el ID al token
        token.id = user.id;
        token.role = user.role;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
      }
      return session;
    },
  },
  session: {
    strategy: 'jwt',
  },
  pages: {
    signIn: '/auth/login', // Tu página de inicio de sesión personalizada
  },
};

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig);