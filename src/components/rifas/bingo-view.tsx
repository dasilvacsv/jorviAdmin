"use client";

import { useState, useMemo, useRef, useEffect } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { User, Mail, Phone, Hash, HandCoins, CalendarDays, Ticket } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { BingoSearch, SearchableOption } from './bingo-search';
import { Button } from '@/components/ui/button';
import Image from 'next/image';

// --- TIPOS ---
type PurchaseInfo = { id: string; buyerName: string | null; buyerEmail: string; buyerPhone: string | null; status: 'pending' | 'confirmed' | 'rejected'; };
type TicketWithPurchase = { id: string; ticketNumber: string; status: 'available' | 'reserved' | 'sold'; purchase: PurchaseInfo | null; };
type RaffleInfo = { id: string; name: string; minimumTickets: number; price: string; currency: 'USD' | 'VES'; limitDate: Date; };

// --- CONSTANTES DE DISEÑO RESPONSIVE ---
const GRID_COLS = { 
  XS: 6,      // < 480px
  SM: 8,      // 480px - 640px
  MD: 12,     // 640px - 768px
  LG: 16,     // 768px - 1024px
  XL: 20,     // 1024px - 1280px
  XXL: 25     // > 1280px
};
const TICKET_SIZE_PX = 32;
const TICKET_GAP_PX = 4;

// --- FUNCIÓN AUXILIAR ---
const formatCurrency = (amount: number | string, currency: 'USD' | 'VES') => new Intl.NumberFormat('es-VE', {
    style: 'currency', currency, minimumFractionDigits: 2
}).format(typeof amount === 'string' ? parseFloat(amount) : amount);

// --- COMPONENTE PRINCIPAL RESPONSIVE ---
export function BingoView({ raffle, initialTickets }: { raffle: RaffleInfo; initialTickets: TicketWithPurchase[] }) {
    const [selectedSearchValue, setSelectedSearchValue] = useState<string | null>(null);
    const parentRef = useRef<HTMLDivElement>(null);
    const [columns, setColumns] = useState(GRID_COLS.MD);
    const [isMobile, setIsMobile] = useState(false);

    // Responsive handler mejorado
    useEffect(() => {
        const handleResize = () => {
            if (!parentRef.current) return;
            const width = window.innerWidth;
            setIsMobile(width < 768);
            
            // Determinar número de columnas basado en el ancho total de la ventana
            if (width >= 1400) setColumns(GRID_COLS.XXL);
            else if (width >= 1280) setColumns(GRID_COLS.XL);
            else if (width >= 1024) setColumns(GRID_COLS.LG);
            else if (width >= 768) setColumns(GRID_COLS.MD);
            else if (width >= 640) setColumns(GRID_COLS.SM);
            else setColumns(GRID_COLS.XS);
        };

        handleResize();
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Memoizamos la lista de tickets y las opciones de búsqueda
    const { allPossibleTickets, searchOptions } = useMemo(() => {
        const ticketsMap = new Map(initialTickets.map(t => [t.ticketNumber, t]));
        const fullTickets: TicketWithPurchase[] = [];
        const options: SearchableOption[] = [];
        const buyers = new Map<string, { name: string, email: string, tickets: string[] }>();

        for (let i = 0; i < 10000; i++) {
            const ticketNumber = i.toString().padStart(4, '0');
            const existingTicket = ticketsMap.get(ticketNumber);

            if (existingTicket) {
                fullTickets.push(existingTicket);
                if (existingTicket.purchase) {
                    options.push({ value: ticketNumber, label: `Ticket #${ticketNumber}`, type: 'ticket' });
                    const buyerEmail = existingTicket.purchase.buyerEmail;
                    if (!buyers.has(buyerEmail)) {
                        buyers.set(buyerEmail, { name: existingTicket.purchase.buyerName || 'Sin Nombre', email: buyerEmail, tickets: [] });
                    }
                    buyers.get(buyerEmail)?.tickets.push(ticketNumber);
                }
            } else {
                fullTickets.push({ id: `available-${ticketNumber}`, ticketNumber, status: 'available' as const, purchase: null });
            }
        }
        buyers.forEach((data, email) => {
            options.push({ value: email, label: `${data.name} (${data.tickets.length} tickets)`, type: 'buyer', email: data.email });
        });
        return { allPossibleTickets: fullTickets, searchOptions: options };
    }, [initialTickets]);

    // Filtramos la lista basada en la búsqueda
    const filteredTickets = useMemo(() => {
        if (!selectedSearchValue) return allPossibleTickets;

        const selectedOption = searchOptions.find(o => o.value === selectedSearchValue);
        if (selectedOption?.type === 'buyer') {
            return allPossibleTickets.filter(ticket => ticket.purchase?.buyerEmail === selectedSearchValue);
        }
        if (selectedOption?.type === 'ticket') {
            const foundTicket = allPossibleTickets.find(ticket => ticket.ticketNumber === selectedSearchValue);
            if (!foundTicket) return [];
            return [foundTicket, ...allPossibleTickets.filter(t => t.id !== foundTicket.id)];
        }
        return allPossibleTickets;
    }, [selectedSearchValue, allPossibleTickets, searchOptions]);

    // Configuración del virtualizador para filas
    const rowVirtualizer = useVirtualizer({
        count: Math.ceil(filteredTickets.length / columns),
        getScrollElement: () => parentRef.current,
        estimateSize: () => TICKET_SIZE_PX + TICKET_GAP_PX,
        overscan: 5,
    });

    const virtualRows = rowVirtualizer.getVirtualItems();
    const totalHeight = rowVirtualizer.getTotalSize();

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-2 sm:p-4 lg:p-6">
            <div className="max-w-7xl mx-auto">
                <div className="flex flex-col xl:flex-row gap-4 lg:gap-6">
                    {/* Panel Superior/Izquierdo - Información y Búsqueda */}
                    <div className="w-full xl:w-80 2xl:w-96 flex-shrink-0">
                        {/* Card de información de la rifa */}
                        <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6 border border-slate-200 mb-4">
                            <h2 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900 mb-4 line-clamp-2">{raffle.name}</h2>
                            
                            <div className="relative mb-4">
                                <Image
                                    src="/assets/bingo-bg.png"
                                    alt="Rifa Banner"
                                    width={300} 
                                    height={150}
                                    className="w-full h-24 sm:h-32 object-cover rounded-lg opacity-90"
                                />
                            </div>
                            
                            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-1 gap-3 text-sm sm:text-base text-gray-700">
                                <div className="flex items-center gap-2">
                                    <Ticket className="h-4 w-4 text-blue-500 flex-shrink-0" />
                                    <span className="truncate">Total: 10,000 tickets</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <HandCoins className="h-4 w-4 text-green-500 flex-shrink-0" />
                                    <span className="truncate">Precio: {formatCurrency(raffle.price, raffle.currency)}</span>
                                </div>
                                <div className="flex items-center gap-2 sm:col-span-2 xl:col-span-1">
                                    <CalendarDays className="h-4 w-4 text-purple-500 flex-shrink-0" />
                                    <span className="truncate">Sorteo: {new Date(raffle.limitDate).toLocaleDateString('es-VE')}</span>
                                </div>
                            </div>
                        </div>
                        
                        {/* Buscador - Sticky en desktop, normal en mobile */}
                        <div className={cn("bg-white rounded-xl shadow-lg p-4 border border-slate-200", 
                            !isMobile && "xl:sticky xl:top-6")}>
                            <BingoSearch 
                                options={searchOptions} 
                                onSelect={setSelectedSearchValue} 
                                selectedOptionValue={selectedSearchValue} 
                            />
                            {selectedSearchValue && (
                                <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    onClick={() => setSelectedSearchValue(null)} 
                                    className="mt-3 w-full text-blue-600 hover:text-blue-800 hover:bg-blue-50"
                                >
                                    Mostrar todos los tickets
                                </Button>
                            )}
                        </div>
                    </div>

                    {/* Panel Principal - Tablero de Bingo */}
                    <div className="flex-1 min-w-0">
                        <div className="bg-gradient-to-br from-slate-100 to-slate-200 rounded-xl shadow-xl p-3 sm:p-4 lg:p-6 border-2 border-slate-300 relative overflow-hidden">
                            {/* Background pattern */}
                            <div className="absolute inset-0 bg-[url('/assets/bingo-pattern.svg')] opacity-10 pointer-events-none"></div>
                            
                            {/* Header */}
                            <div className="relative z-10 mb-4 sm:mb-6">
                                <h3 className="text-xl sm:text-2xl lg:text-3xl font-bold text-slate-800 text-center">
                                    Tablero de la Rifa
                                </h3>
                                <p className="text-sm sm:text-base text-slate-600 text-center mt-2">
                                    {columns} columnas • {filteredTickets.length.toLocaleString()} tickets
                                </p>
                            </div>

                            {/* Tablero virtual */}
                            <div 
                                ref={parentRef} 
                                className={cn(
                                    "w-full overflow-y-auto rounded-lg border border-slate-300 bg-white/70 backdrop-blur-sm shadow-inner p-2 sm:p-3",
                                    // Altura responsive
                                    "h-[50vh] sm:h-[60vh] lg:h-[65vh] xl:h-[70vh]"
                                )}
                            >
                                <div className="relative" style={{ height: `${totalHeight}px` }}>
                                    <TooltipProvider delayDuration={150}>
                                        {virtualRows.map((virtualRow) => {
                                            const startIndex = virtualRow.index * columns;
                                            const endIndex = Math.min(startIndex + columns, filteredTickets.length);
                                            const rowTickets = filteredTickets.slice(startIndex, endIndex);

                                            return (
                                                <div
                                                    key={virtualRow.key}
                                                    data-index={virtualRow.index}
                                                    ref={rowVirtualizer.measureElement}
                                                    className="absolute top-0 left-0 w-full"
                                                    style={{
                                                        transform: `translateY(${virtualRow.start}px)`,
                                                        display: 'grid',
                                                        gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
                                                        gap: `${TICKET_GAP_PX}px`,
                                                        paddingBottom: `${TICKET_GAP_PX}px`,
                                                    }}
                                                >
                                                    {rowTickets.map((ticket) => {
                                                        const isOccupied = ticket.status !== 'available';
                                                        const isHighlighted = ticket.ticketNumber === selectedSearchValue || ticket.purchase?.buyerEmail === selectedSearchValue;
                                                        
                                                        const ticketCell = (
                                                            <div className={cn(
                                                                'flex items-center justify-center w-full rounded-md font-mono font-semibold relative',
                                                                'transition-all duration-300 ease-in-out transform border shadow-sm cursor-pointer',
                                                                // Tamaños responsive
                                                                'h-6 text-xs sm:h-7 sm:text-xs md:h-8 md:text-sm',
                                                                // Estados
                                                                isOccupied
                                                                    ? 'bg-red-400 border-red-500 text-white hover:bg-red-500 hover:scale-105'
                                                                    : 'bg-green-200 border-green-300 text-green-800 hover:bg-green-300 hover:scale-105',
                                                                // Highlight
                                                                isHighlighted && 'ring-2 sm:ring-4 ring-yellow-400 ring-offset-1 sm:ring-offset-2 scale-105 sm:scale-110 shadow-lg z-20',
                                                            )}>
                                                                {ticket.ticketNumber}
                                                            </div>
                                                        );

                                                        return isOccupied && ticket.purchase ? (
                                                            <Tooltip key={ticket.id}>
                                                                <TooltipTrigger asChild>{ticketCell}</TooltipTrigger>
                                                                <TooltipContent side={isMobile ? 'top' : 'right'}>
                                                                    <div className="flex flex-col gap-1.5 text-sm p-1">
                                                                        <p className="font-bold">Ticket #{ticket.ticketNumber}</p>
                                                                        <div className="flex items-center gap-2">
                                                                            <User className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                                                            <span className="truncate">{ticket.purchase.buyerName || 'N/A'}</span>
                                                                        </div>
                                                                        <div className="flex items-center gap-2">
                                                                            <Mail className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                                                            <span className="truncate text-xs">{ticket.purchase.buyerEmail}</span>
                                                                        </div>
                                                                        {ticket.purchase.buyerPhone && (
                                                                            <div className="flex items-center gap-2">
                                                                                <Phone className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                                                                <span className="truncate">{ticket.purchase.buyerPhone}</span>
                                                                            </div>
                                                                        )}
                                                                        <Badge 
                                                                            variant={ticket.purchase.status === 'confirmed' ? 'default' : 'secondary'} 
                                                                            className="mt-1 w-fit self-start text-xs"
                                                                        >
                                                                            {ticket.purchase.status}
                                                                        </Badge>
                                                                    </div>
                                                                </TooltipContent>
                                                            </Tooltip>
                                                        ) : (
                                                            <div key={ticket.id}>
                                                                {ticketCell}
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            );
                                        })}
                                    </TooltipProvider>
                                </div>
                            </div>
                            
                            {/* Empty state */}
                            {filteredTickets.length === 0 && selectedSearchValue && (
                                <div className="absolute inset-0 flex items-center justify-center bg-white/80 backdrop-blur-sm rounded-lg text-gray-600 z-30">
                                    <div className="text-center p-4">
                                        <p className="text-lg sm:text-xl font-semibold mb-2">No se encontraron tickets</p>
                                        <p className="text-sm text-gray-500">Intenta con otro término de búsqueda</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}