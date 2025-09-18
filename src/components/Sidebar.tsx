// components/Sidebar.tsx
"use client";

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { signOut } from 'next-auth/react';
import {
  LayoutDashboard,
  Gift,
  Users,
  LogOut,
  Menu,
  Settings,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Session } from 'next-auth';

interface SidebarProps {
  session: Session;
}

export function Sidebar({ session }: SidebarProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Rifas', href: '/rifas', icon: Gift },
    { name: 'Usuarios', href: '/usuarios', icon: Users },
    { name: 'Configuración', href: '/settings', icon: Settings }, // Añadido
  ];

  return (
    <>
      {/* Sidebar fijo para pantallas grandes, adaptable para móviles */}
      <div className={cn(
        "fixed inset-y-0 left-0 z-40 w-64 bg-white shadow-lg transform transition-transform duration-200 ease-in-out",
        sidebarOpen ? "translate-x-0" : "-translate-x-full",
        "lg:translate-x-0 lg:static"
      )}>
        <div className="flex flex-col h-full">
          {/* Header de la sidebar */}
          <div className="flex items-center gap-2 p-6 border-b">
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-2 rounded-lg">
              <Gift className="h-6 w-6 text-white" />
            </div>
            <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              Admin Panel
            </span>
          </div>

          {/* Navegación */}
          <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
            {navigation.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className="flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-blue-50 hover:text-blue-600 rounded-lg transition-colors"
                  onClick={() => setSidebarOpen(false)} // Cierra el menú en móvil al hacer clic
                >
                  <Icon className="h-5 w-5" />
                  {item.name}
                </Link>
              );
            })}
          </nav>

          {/* Sección de perfil y logout */}
          <div className="p-4 border-t">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full flex items-center justify-center">
                <span className="text-white font-medium text-sm">
                  {session.user.name?.charAt(0) || session.user.email?.charAt(0)}
                </span>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">{session.user.name}</p>
                <p className="text-xs text-gray-500">{session.user.email}</p>
              </div>
            </div>
            
            <Button
              variant="ghost"
              className="w-full justify-start text-gray-700 hover:bg-red-50 hover:text-red-600"
              onClick={() => signOut({ callbackUrl: '/auth/login' })}
            >
              <LogOut className="h-4 w-4 mr-2" />
              Cerrar Sesión
            </Button>
          </div>
        </div>
      </div>

      {/* Overlay para móvil */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Botón de menú para móvil, fuera del sidebar */}
      <div className="lg:hidden fixed top-4 left-4 z-50">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setSidebarOpen(!sidebarOpen)}
        >
          <Menu className="h-4 w-4" />
        </Button>
      </div>
    </>
  );
}