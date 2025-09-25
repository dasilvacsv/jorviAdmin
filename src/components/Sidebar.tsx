// components/Sidebar.tsx
"use client";

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation'; // Hook para saber la página actual
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { signOut } from 'next-auth/react';
import {
    LayoutDashboard,
    Gift,
    Users,
    LogOut,
    Menu,
    Settings,
    ChevronsLeft, // Icono para colapsar
    ChevronsRight,
    Users2Icon,
    UserPlus2Icon, // Icono para expandir
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Session } from 'next-auth';

interface SidebarProps {
    session: Session;
}

const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Rifas', href: '/rifas', icon: Gift },
    { name: 'Usuarios', href: '/usuarios', icon: Users },
    { name: 'Referidos', href: '/referidos', icon: UserPlus2Icon },
    { name: 'Configuración', href: '/settings', icon: Settings },
];

export function Sidebar({ session }: SidebarProps) {
    const pathname = usePathname();
    const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
    const [isCollapsed, setIsCollapsed] = useState(false); // Estado para el colapso en desktop

    const primaryColor = "from-amber-500 to-orange-600";
    const primaryTextColor = "text-orange-600";

    return (
        <TooltipProvider delayDuration={0}>
            {/* Botón de menú para móvil */}
            <div className="lg:hidden fixed top-4 left-4 z-50">
                <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setMobileSidebarOpen(true)}
                    className="bg-background/80 backdrop-blur-sm"
                >
                    <Menu className="h-5 w-5" />
                </Button>
            </div>

            {/* Overlay para móvil */}
            {mobileSidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/60 z-30 lg:hidden"
                    onClick={() => setMobileSidebarOpen(false)}
                />
            )}

            {/* Contenedor del Sidebar */}
            <aside className={cn(
                "fixed inset-y-0 left-0 z-40 flex flex-col bg-background border-r transition-all duration-300 ease-in-out",
                // Estilos para móvil (Drawer)
                "lg:static lg:inset-y-auto",
                mobileSidebarOpen ? "translate-x-0" : "-translate-x-full",
                "lg:translate-x-0",
                // Estilos para desktop (Colapsable)
                isCollapsed ? "lg:w-20" : "lg:w-64"
            )}>
                {/* --- Header del Sidebar --- */}
                <div className={cn("flex items-center gap-2 p-4 border-b h-[65px]", isCollapsed ? "justify-center" : "px-6")}>
                    <div className={cn("p-2 rounded-lg bg-gradient-to-r", primaryColor)}>
                        <Gift className="h-6 w-6 text-white" />
                    </div>
                    <span className={cn("text-xl font-bold tracking-tighter bg-gradient-to-r bg-clip-text text-transparent", primaryColor, isCollapsed && "lg:hidden")}>
                        Jorvi Admin
                    </span>
                </div>

                {/* --- Navegación Principal --- */}
                <nav className="flex-1 p-2 space-y-2 overflow-y-auto">
                    {navigation.map((item) => {
                        const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
                        const linkContent = (
                            <>
                                <item.icon className={cn("h-5 w-5 shrink-0", isActive && primaryTextColor)} />
                                <span className={cn("transition-opacity", isCollapsed && "lg:hidden")}>{item.name}</span>
                            </>
                        );

                        return (
                            <Tooltip key={item.name}>
                                <TooltipTrigger asChild>
                                    <Link
                                        href={item.href}
                                        className={cn(
                                            "flex items-center gap-3 rounded-md p-3 text-sm font-medium transition-colors text-muted-foreground hover:bg-muted hover:text-foreground",
                                            isCollapsed && "lg:justify-center",
                                            isActive && `bg-orange-100/80 dark:bg-orange-900/20 ${primaryTextColor}`
                                        )}
                                        onClick={() => setMobileSidebarOpen(false)}
                                    >
                                        {linkContent}
                                    </Link>
                                </TooltipTrigger>
                                {isCollapsed && (
                                    <TooltipContent side="right" className="bg-foreground text-background">
                                        <p>{item.name}</p>
                                    </TooltipContent>
                                )}
                            </Tooltip>
                        );
                    })}
                </nav>

                {/* --- Sección de Perfil y Botón de Colapso --- */}
                <div className="p-2 border-t mt-auto">
                    {/* Botón para colapsar (solo en desktop) */}
                    <div className="hidden lg:block">
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    variant="ghost"
                                    className="w-full justify-center"
                                    size="icon"
                                    onClick={() => setIsCollapsed(!isCollapsed)}
                                >
                                    {isCollapsed ? <ChevronsRight className="h-5 w-5" /> : <ChevronsLeft className="h-5 w-5" />}
                                </Button>
                            </TooltipTrigger>
                             <TooltipContent side="right" className="bg-foreground text-background">
                                <p>{isCollapsed ? "Expandir" : "Colapsar"}</p>
                            </TooltipContent>
                        </Tooltip>
                    </div>

                    {/* Perfil del usuario */}
                    <div className={cn("flex items-center gap-3 p-3 mt-2", isCollapsed && "lg:justify-center")}>
                        <div className={cn("w-9 h-9 bg-gradient-to-r rounded-full flex items-center justify-center shrink-0", primaryColor)}>
                            <span className="text-white font-medium text-xs">
                                {session.user.name?.charAt(0).toUpperCase() || session.user.email?.charAt(0).toUpperCase()}
                            </span>
                        </div>
                        <div className={cn("overflow-hidden transition-opacity", isCollapsed && "lg:hidden")}>
                            <p className="text-sm font-semibold truncate">{session.user.name}</p>
                            <p className="text-xs text-muted-foreground truncate">{session.user.email}</p>
                        </div>
                    </div>
                    
                    {/* Botón de Logout */}
                     <Tooltip>
                        <TooltipTrigger asChild>
                             <Button
                                variant="ghost"
                                className={cn(
                                    "w-full justify-start text-muted-foreground hover:bg-red-500/10 hover:text-red-600",
                                    isCollapsed && "lg:justify-center"
                                )}
                                onClick={() => signOut({ callbackUrl: '/auth/login' })}
                            >
                                <LogOut className="h-5 w-5 shrink-0" />
                                <span className={cn("ml-3", isCollapsed && "lg:hidden")}>Cerrar Sesión</span>
                            </Button>
                        </TooltipTrigger>
                        {isCollapsed && (
                            <TooltipContent side="right" className="bg-foreground text-background">
                                <p>Cerrar Sesión</p>
                            </TooltipContent>
                        )}
                    </Tooltip>
                </div>
            </aside>
        </TooltipProvider>
    );
}