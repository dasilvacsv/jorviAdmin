// components/rifas/bingo-view.tsx
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

// --- CONSTANTES DE DISEÑO ---
const GRID_COLS = { DEFAULT: 10, SM: 15, MD: 20, LG: 25, XL: 30 };
const TICKET_SIZE_PX = 32; // Altura del ticket
const TICKET_GAP_PX = 6;  // Gap entre tickets

// --- FUNCIÓN AUXILIAR ---
const formatCurrency = (amount: number | string, currency: 'USD' | 'VES') => new Intl.NumberFormat('es-VE', {
    style: 'currency', currency, minimumFractionDigits: 2
}).format(typeof amount === 'string' ? parseFloat(amount) : amount);


// --- COMPONENTE PRINCIPAL CON DISEÑO DE PANEL ---
export function BingoView({ raffle, initialTickets }: { raffle: RaffleInfo; initialTickets: TicketWithPurchase[] }) {
    const [selectedSearchValue, setSelectedSearchValue] = useState<string | null>(null);
    const parentRef = useRef<HTMLDivElement>(null);
    const [columns, setColumns] = useState(GRID_COLS.DEFAULT);

    // Este useEffect es necesario para que el virtualizador de filas sepa cuántos elementos mostrar por fila.
    useEffect(() => {
        const handleResize = () => {
            if (!parentRef.current) return;
            const width = parentRef.current.offsetWidth;
            if (width >= 1280) setColumns(GRID_COLS.XL);
            else if (width >= 1024) setColumns(GRID_COLS.LG);
            else if (width >= 768) setColumns(GRID_COLS.MD);
            else if (width >= 640) setColumns(GRID_COLS.SM);
            else setColumns(GRID_COLS.DEFAULT);
        };

        handleResize(); // Llama una vez al inicio
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
        <div className="flex flex-col lg:flex-row gap-6">
            {/* Panel Izquierdo - Información y Búsqueda */}
            <div className="lg:w-[320px] xl:w-[360px] space-y-4 flex-shrink-0">
                <div className="bg-white rounded-xl shadow-lg p-6 border border-slate-200">
                    <h2 className="text-xl font-bold text-gray-900 mb-4">{raffle.name}</h2>
                    <Image
                        src="/assets/bingo-bg.png" // Corregido a .png
                        alt="Rifa Banner"
                        width={300} height={150}
                        className="w-full h-32 object-cover rounded-lg mb-4 opacity-90"
                    />
                    <div className="space-y-3 text-sm text-gray-700">
                        <div className="flex items-center gap-2"><Ticket className="h-4 w-4 text-blue-500" /><span>Total Tickets: 10,000</span></div>
                        <div className="flex items-center gap-2"><HandCoins className="h-4 w-4 text-green-500" /><span>Precio: {formatCurrency(raffle.price, raffle.currency)}</span></div>
                        <div className="flex items-center gap-2"><CalendarDays className="h-4 w-4 text-purple-500" /><span>Sorteo: {new Date(raffle.limitDate).toLocaleDateString('es-VE')}</span></div>
                    </div>
                </div>
                <div className="sticky top-6">
                  <BingoSearch options={searchOptions} onSelect={setSelectedSearchValue} selectedOptionValue={selectedSearchValue} />
                  {selectedSearchValue && (
                      <Button variant="ghost" size="sm" onClick={() => setSelectedSearchValue(null)} className="mt-2 w-full text-blue-600 hover:text-blue-800">
                          Mostrar todos los tickets
                      </Button>
                  )}
                </div>
            </div>

            {/* Panel del Tablero de Bingo (Derecho) */}
            <div className="flex-1 lg:min-w-0 bg-gradient-to-br from-slate-100 to-slate-200 rounded-xl shadow-xl p-4 border-2 border-slate-300 relative overflow-hidden">
                <div className="absolute inset-0 bg-[url('/assets/bingo-pattern.svg')] opacity-10 pointer-events-none"></div>
                
                <h3 className="text-2xl font-bold text-slate-800 mb-4 text-center relative z-10">Tablero de la Rifa</h3>

                <div ref={parentRef} className="w-full h-[70vh] overflow-y-auto rounded-lg border border-slate-300 bg-white/70 backdrop-blur-sm shadow-inner p-3">
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
                                                    'flex items-center justify-center h-8 w-full rounded-md font-mono text-xs sm:text-sm font-semibold relative',
                                                    'transition-all duration-300 ease-in-out transform border shadow-sm',
                                                    isOccupied
                                                        ? 'bg-red-400 border-red-500 text-white hover:bg-red-500 cursor-pointer'
                                                        : 'bg-green-200 border-green-300 text-green-800 hover:bg-green-300',
                                                    isHighlighted && 'ring-4 ring-yellow-400 ring-offset-2 scale-110 shadow-lg z-20',
                                                )}>
                                                    {ticket.ticketNumber}
                                                </div>
                                            );

                                            return isOccupied && ticket.purchase ? (
                                                <Tooltip key={ticket.id}>
                                                    <TooltipTrigger asChild>{ticketCell}</TooltipTrigger>
                                                    <TooltipContent>
                                                      <div className="flex flex-col gap-1.5 text-sm p-1">
                                                          <p className="font-bold">Ticket #{ticket.ticketNumber}</p>
                                                          <div className="flex items-center gap-2"><User className="h-4 w-4 text-muted-foreground" />{ticket.purchase.buyerName || 'N/A'}</div>
                                                          <div className="flex items-center gap-2"><Mail className="h-4 w-4 text-muted-foreground" />{ticket.purchase.buyerEmail}</div>
                                                          {ticket.purchase.buyerPhone && <div className="flex items-center gap-2"><Phone className="h-4 w-4 text-muted-foreground" />{ticket.purchase.buyerPhone}</div>}
                                                          <Badge variant={ticket.purchase.status === 'confirmed' ? 'default' : 'secondary'} className="mt-1 w-fit-content self-start">{ticket.purchase.status}</Badge>
                                                      </div>
                                                    </TooltipContent>
                                                </Tooltip>
                                            ) : (ticketCell);
                                        })}
                                    </div>
                                );
                            })}
                        </TooltipProvider>
                    </div>
                </div>
                {filteredTickets.length === 0 && selectedSearchValue && (
                    <div className="absolute inset-0 flex items-center justify-center bg-white/80 backdrop-blur-sm rounded-lg text-gray-600 z-30">
                        <p className="text-xl font-semibold">No se encontraron tickets.</p>
                    </div>
                )}
            </div>
        </div>
    );
}