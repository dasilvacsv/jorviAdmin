"use client";

import { useState, useMemo } from 'react';
import type { InferSelectModel } from 'drizzle-orm';
import { raffles, tickets, purchases, raffleImages } from '@/lib/db/schema';
import Link from 'next/link';
import Image from 'next/image';

// --- ICONS ---
import { Plus, Eye, ImageIcon, Ticket, DollarSign, Calendar, Crown, AlertTriangle, Search, Filter } from 'lucide-react';

// --- SHADCN/UI COMPONENTS ---
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { DropdownMenu, DropdownMenuContent, DropdownMenuLabel, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
// MEJORA: Se importa el componente de Progreso
import { Progress } from '@/components/ui/progress';

// --- TYPES ---
type PurchaseWithBuyer = InferSelectModel<typeof purchases>;
type WinnerTicket = InferSelectModel<typeof tickets> & { purchase: PurchaseWithBuyer | null };
type RaffleWithDetails = InferSelectModel<typeof raffles> & {
  images: InferSelectModel<typeof raffleImages>[];
  tickets: { id: string }[];
  winnerTicket: WinnerTicket | null;
};

// --- HELPER FUNCTIONS ---

// MEJORA: Se refina el estilo de los badges para un look más moderno y consistente.
const getStatusBadge = (status: string) => {
    switch (status) {
        case 'active':
            return <Badge className="bg-green-100 text-green-800 border-green-300 hover:bg-green-100 font-semibold">Activa</Badge>;
        case 'finished':
            return <Badge className="bg-blue-100 text-blue-800 border-blue-300 hover:bg-blue-100 font-semibold">Finalizada</Badge>;
        case 'cancelled':
            return <Badge className="bg-red-100 text-red-800 border-red-300 hover:bg-red-100 font-semibold">Cancelada</Badge>;
        case 'draft':
            return <Badge className="bg-gray-100 text-gray-800 border-gray-300 hover:bg-gray-100 font-semibold">Borrador</Badge>;
        case 'postponed':
            return <Badge className="bg-orange-100 text-orange-800 border-orange-300 hover:bg-orange-100 font-semibold">Pospuesta</Badge>;
        default:
            return <Badge variant="secondary">{status}</Badge>;
    }
};

const formatCurrency = (amount: string, currency: 'USD' | 'VES' | null) => {
    const value = parseFloat(amount);
    if (isNaN(value)) return '$0.00';
    // Usamos Intl.NumberFormat para un formato más robusto
    const options = {
        style: 'currency',
        currency: currency === 'VES' ? 'VED' : 'USD', // VED es el código actual para Bs.D
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    };
    return new Intl.NumberFormat('es-VE', options).format(value);
};

// --- OPTIONS FOR FILTERS ---
const statusOptions = [
    { value: 'all', label: 'Todos los estados' },
    { value: 'active', label: 'Activa' },
    { value: 'finished', label: 'Finalizada' },
    { value: 'draft', label: 'Borrador' },
    { value: 'cancelled', label: 'Cancelada' },
    { value: 'postponed', label: 'Pospuesta' },
];

export function RafflesDataTable({ initialRaffles }: { initialRaffles: RaffleWithDetails[] }) {
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');

    const filteredRaffles = useMemo(() => {
        return initialRaffles.filter(raffle => {
            const matchesSearch = raffle.name.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesStatus = statusFilter === 'all' || raffle.status === statusFilter;
            return matchesSearch && matchesStatus;
        });
    }, [initialRaffles, searchTerm, statusFilter]);

    // MEJORA: Estado de bienvenida rediseñado para ser más atractivo y amigable.
    if (initialRaffles.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center text-center p-10 sm:p-16 border-2 border-dashed rounded-lg bg-gray-50/50">
                <div className="bg-primary/10 p-4 rounded-full mb-4">
                    <Ticket className="h-10 w-10 text-primary" />
                </div>
                <h3 className="text-xl font-semibold text-gray-800 mb-2">Aún no tienes rifas</h3>
                <p className="text-muted-foreground mb-6 max-w-sm">
                    ¡No te preocupes! Crear tu primera rifa es muy fácil. Haz clic en el botón para empezar.
                </p>
                <Button asChild size="lg">
                    <Link href="/rifas/nuevo">
                        <Plus className="h-5 w-5 mr-2" />
                        Crear Mi Primera Rifa
                    </Link>
                </Button>
            </div>
        );
    }
    
    return (
        <Card>
            <div className="flex flex-col md:flex-row items-center gap-2 md:gap-4 p-4 border-b">
                <div className="relative w-full md:flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Buscar por nombre de rifa..."
                        className="pl-9 w-full"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="outline" className="w-full md:w-auto">
                            <Filter className="h-4 w-4 mr-2" />
                            {/* MEJORA: El botón muestra el filtro actual */}
                            <span>Estado: {statusOptions.find(o => o.value === statusFilter)?.label}</span>
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-[200px]">
                        <DropdownMenuLabel>Selecciona un estado</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuRadioGroup value={statusFilter} onValueChange={setStatusFilter}>
                            {statusOptions.map(option => (
                                <DropdownMenuRadioItem key={option.value} value={option.value}>
                                    {option.label}
                                </DropdownMenuRadioItem>
                            ))}
                        </DropdownMenuRadioGroup>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>

            {filteredRaffles.length > 0 ? (
                <>
                    {/* MEJORA: VISTA DE TABLA (DESKTOP) REFINADA */}
                    <div className="hidden md:block">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-[35%]">Rifa</TableHead>
                                    <TableHead>Estado</TableHead>
                                    <TableHead>Precio</TableHead>
                                    <TableHead>Fecha Sorteo</TableHead>
                                    <TableHead>Tickets Vendidos</TableHead>
                                    <TableHead className="text-right">Acciones</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredRaffles.map((raffle) => {
                                    const isDrawDay = new Date(raffle.limitDate) <= new Date() && raffle.status === 'active';
                                    const sold = raffle.tickets.length;
                                    const total = raffle.minimumTickets;
                                    const percentage = total > 0 ? (sold / total) * 100 : 0;

                                    return (
                                        <TableRow key={raffle.id} className={`transition-colors hover:bg-muted/50 ${isDrawDay ? 'bg-yellow-50 hover:bg-yellow-100/60' : ''}`}>
                                            <TableCell>
                                                <div className="flex items-center gap-4">
                                                    <div className="relative w-20 h-12 rounded-md overflow-hidden border bg-gray-50 flex-shrink-0">
                                                        {raffle.images.length > 0 ? (
                                                            <Image src={raffle.images[0].url} alt={raffle.name} fill className="object-cover" />
                                                        ) : (
                                                            <div className="flex h-full w-full items-center justify-center">
                                                                <ImageIcon className="h-6 w-6 text-gray-400" />
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div>
                                                        <div className="font-semibold text-gray-900">{raffle.name}</div>
                                                        {raffle.winnerTicket?.purchase ? (
                                                            <div className="flex items-center gap-1.5 text-xs text-green-700 mt-1 font-semibold">
                                                                <Crown className="h-4 w-4" />
                                                                <span>Ganador: {raffle.winnerTicket.purchase.buyerName}</span>
                                                            </div>
                                                        ) : isDrawDay && (
                                                            <div className="flex items-center gap-1.5 text-xs text-yellow-800 mt-1 font-medium">
                                                                <AlertTriangle className="h-4 w-4" />
                                                                <span>¡Día del sorteo!</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell>{getStatusBadge(raffle.status)}</TableCell>
                                            <TableCell className="font-semibold text-blue-600">{formatCurrency(raffle.price, raffle.currency)}</TableCell>
                                            <TableCell>{new Date(raffle.limitDate).toLocaleDateString('es-VE', { year: 'numeric', month: 'short', day: 'numeric' })}</TableCell>
                                            <TableCell className="w-[180px]">
                                                {/* MEJORA: Barra de progreso en la tabla */}
                                                <div className="flex flex-col gap-1.5">
                                                    <div className="flex justify-between items-center text-xs text-muted-foreground">
                                                        <span className="font-medium">{sold.toLocaleString()} / {total.toLocaleString()}</span>
                                                        <span className="font-bold text-gray-800">{percentage.toFixed(0)}%</span>
                                                    </div>
                                                    <Progress value={percentage} className="h-2" />
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Button asChild variant="outline" size="sm">
                                                    <Link href={`/rifas/${raffle.id}`}>
                                                        <Eye className="h-4 w-4 mr-1.5" /> Gestionar
                                                    </Link>
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    </div>

                    {/* MEJORA: VISTA DE TARJETAS (MÓVIL) COMPLETAMENTE REDISEÑADA */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:hidden gap-4 p-4">
                        {filteredRaffles.map((raffle) => {
                            const isDrawDay = new Date(raffle.limitDate) <= new Date() && raffle.status === 'active';
                            const sold = raffle.tickets.length;
                            const total = raffle.minimumTickets;
                            const percentage = total > 0 ? (sold / total) * 100 : 0;
                            
                            return (
                                <Card key={raffle.id} className={`flex flex-col justify-between overflow-hidden transition-all hover:shadow-lg hover:-translate-y-1 ${isDrawDay ? 'border-yellow-400 border-2' : ''}`}>
                                    <div>
                                        <CardHeader className="p-0">
                                            <div className="relative aspect-video w-full">
                                                {raffle.images.length > 0 ? (
                                                    <Image src={raffle.images[0].url} alt={raffle.name} fill className="object-cover" />
                                                ) : (
                                                    <div className="flex h-full w-full items-center justify-center bg-gray-100">
                                                        <ImageIcon className="h-10 w-10 text-gray-400" />
                                                    </div>
                                                )}
                                                <div className="absolute top-2 right-2">{getStatusBadge(raffle.status)}</div>
                                            </div>
                                            <div className="p-4 pb-2">
                                                <CardTitle className="text-base font-bold truncate">{raffle.name}</CardTitle>
                                                {raffle.winnerTicket?.purchase && (
                                                    <div className="flex items-center gap-1.5 text-xs text-green-700 mt-2 font-semibold">
                                                        <Crown className="h-4 w-4" />
                                                        <span>Ganador: {raffle.winnerTicket.purchase.buyerName}</span>
                                                    </div>
                                                )}
                                            </div>
                                        </CardHeader>
                                        <CardContent className="space-y-4 px-4 pb-4">
                                            {isDrawDay && !raffle.winnerTicket?.purchase && (
                                                <Alert variant="default" className="p-2 border-yellow-300 bg-yellow-100 text-yellow-800">
                                                    <div className="flex items-center gap-2">
                                                        <AlertTriangle className="h-4 w-4" />
                                                        <AlertDescription className="text-xs font-medium">¡Hoy es el sorteo!</AlertDescription>
                                                    </div>
                                                </Alert>
                                            )}
                                            <div className="space-y-3 pt-2 border-t">
                                                <div className="flex justify-between items-center text-sm">
                                                    <span className="flex items-center gap-1.5 text-muted-foreground"><Calendar className="h-4 w-4" /> Fecha</span>
                                                    <span className="font-semibold">{new Date(raffle.limitDate).toLocaleDateString('es-VE')}</span>
                                                </div>
                                                <div className="flex justify-between items-center text-sm">
                                                    <span className="flex items-center gap-1.5 text-muted-foreground"><DollarSign className="h-4 w-4" /> Precio</span>
                                                    <span className="font-bold text-lg text-blue-600">{formatCurrency(raffle.price, raffle.currency)}</span>
                                                </div>
                                            </div>
                                            {/* MEJORA: Barra de progreso en la tarjeta */}
                                            <div className="flex flex-col gap-1.5">
                                                <div className="flex justify-between items-center text-xs text-muted-foreground">
                                                    <span className="font-medium">{sold.toLocaleString()} / {total.toLocaleString()}</span>
                                                    <span className="font-bold text-gray-800">{percentage.toFixed(0)}%</span>
                                                </div>
                                                <Progress value={percentage} className="h-2" />
                                            </div>
                                        </CardContent>
                                    </div>
                                    <CardFooter className="bg-gray-50 p-2 border-t">
                                        <Button asChild variant="outline" className="w-full">
                                            <Link href={`/rifas/${raffle.id}`}>
                                                <Eye className="h-4 w-4 mr-2" /> Gestionar Rifa
                                            </Link>
                                        </Button>
                                    </CardFooter>
                                </Card>
                            );
                        })}
                    </div>
                </>
            ) : (
                // MEJORA: Estado "Sin resultados" rediseñado
                <div className="text-center p-16">
                    <Search className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-xl font-semibold">No se encontraron rifas</h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                        Intenta ajustar tu búsqueda o cambiar el filtro de estado.
                    </p>
                </div>
            )}
        </Card>
    );
}