// components/rifas/sales/raffle-sales-view.tsx
"use client";

import { useState, useMemo, Fragment, useEffect, useCallback, useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { PDFDownloadLink } from '@react-pdf/renderer';
import { SalesPDF } from './SalesPDF';
import Link from 'next/link';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

// --- UI Components ---
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Progress } from "@/components/ui/progress";
import { DropdownMenu, DropdownMenuContent, DropdownMenuCheckboxItem, DropdownMenuTrigger, DropdownMenuLabel, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

// --- Icons ---
import { ArrowLeft, Calendar as CalendarIcon, ChevronRight, DollarSign, Filter, Receipt, Search, Ticket, X, Download, Loader2, Clock, Share2 } from 'lucide-react';

// --- Types ---
import { Raffle, PurchaseWithTicketsAndRaffle } from '@/lib/types';
import { ColumnDef, flexRender, getCoreRowModel, useReactTable, SortingState, ColumnFiltersState, Row, ExpandedState } from "@tanstack/react-table";
import { getPaginatedSales } from '@/lib/actions';
import { PurchaseDetailsModal } from '../purchase-details-modal'; // ✅ BOTÓN IMPORTADO

// --- Hook y Helpers ---
function useDebounce<T>(value: T, delay: number): T {
    const [debouncedValue, setDebouncedValue] = useState<T>(value);
    useEffect(() => {
        const timer = setTimeout(() => setDebouncedValue(value), delay);
        return () => clearTimeout(timer);
    }, [value, delay]);
    return debouncedValue;
}

const formatCurrency = (amount: number | string, currency: 'USD' | 'VES') => {
    const value = typeof amount === 'string' ? parseFloat(amount) : amount;
    return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(value);
};

const getStatusBadge = (status: string | null) => {
    const statusMap = {
        confirmed: "bg-green-100 text-green-800 border-green-300",
        pending: "bg-yellow-100 text-yellow-800 border-yellow-300",
        rejected: "bg-red-100 text-red-800 border-red-300",
    };
    const textMap = { confirmed: 'Confirmado', pending: 'Pendiente', rejected: 'Rechazado' };
    if (!status || !statusMap[status as keyof typeof statusMap]) return null;
    return <Badge className={`${statusMap[status as keyof typeof statusMap]} hover:bg-opacity-80`}>{textMap[status as keyof typeof textMap]}</Badge>;
};

function StatCard({ icon: Icon, title, value, colorClass = 'text-gray-600' }: { icon: React.ElementType, title: string, value: string | number, colorClass?: string }) {
    const bgColorClass = colorClass.replace('text', 'bg').replace(/-\d+$/, '-100');
    return (
        <div className="bg-white p-3 rounded-lg shadow-sm flex items-center gap-4 transition-transform hover:scale-105">
            <div className={`p-2 rounded-full ${bgColorClass}`}><Icon className={`h-5 w-5 ${colorClass}`} /></div>
            <div><p className="text-xs text-muted-foreground">{title}</p><p className="text-lg font-bold">{value}</p></div>
        </div>
    );
}

function SaleDetailContent({ row }: { row: Row<PurchaseWithTicketsAndRaffle> }) {
    const sale = row.original;
    const sortedTickets = useMemo(() =>
        [...sale.tickets].sort((a, b) => a.ticketNumber.localeCompare(b.ticketNumber, undefined, { numeric: true })),
        [sale.tickets]
    );
    const rejectionReasonMap = { invalid_payment: "Pago Inválido o no Encontrado", malicious: "Actividad Sospechosa" };
    return (
        <div className="p-4 bg-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
                <h4 className="font-semibold text-xs mb-2 text-gray-700 uppercase tracking-wider">Tickets ({sale.tickets.length})</h4>
                {sale.status === 'pending' ? (<p className="text-sm text-muted-foreground italic">Los tickets se asignarán al confirmar la venta.</p>)
                    : sortedTickets.length > 0 ? (
                        <div className="max-h-28 overflow-y-auto pr-2 flex flex-wrap gap-1">
                            {sortedTickets.map(({ ticketNumber }) => (<Badge key={ticketNumber} variant="secondary" className="font-mono text-xs">{ticketNumber}</Badge>))}
                        </div>
                    ) : <p className="text-sm text-muted-foreground italic">Sin tickets asignados.</p>}
            </div>
            <div>
                <h4 className="font-semibold text-xs mb-2 text-gray-700 uppercase tracking-wider">Detalles del Pago</h4>
                <div className="text-sm space-y-1">
                    <p><span className="text-muted-foreground">Método:</span> {sale.paymentMethod || 'N/A'}</p>
                    <p><span className="text-muted-foreground">Ref:</span> {sale.paymentReference || 'N/A'}</p>
                    {sale.paymentScreenshotUrl ? (<a href={sale.paymentScreenshotUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline mt-2 inline-block">Ver Comprobante</a>)
                        : <p className="text-sm text-muted-foreground italic mt-2">Sin comprobante.</p>}
                </div>
            </div>
            {sale.status === 'rejected' && (
                <div className="sm:col-span-2 p-3 bg-red-50 border border-red-200 rounded-md">
                    <h4 className="font-semibold text-xs mb-2 text-red-800 uppercase tracking-wider">Motivo del Rechazo</h4>
                    <div className="text-sm space-y-1 text-red-900">
                        <p><span className="font-medium">Razón:</span> {sale.rejectionReason ? rejectionReasonMap[sale.rejectionReason as keyof typeof rejectionReasonMap] : 'No especificada.'}</p>
                        {sale.rejectionComment && (<p><span className="font-medium">Comentario:</span> {sale.rejectionComment}</p>)}
                    </div>
                </div>
            )}
        </div>
    );
}

type VirtualRow = Row<PurchaseWithTicketsAndRaffle> | { isDetailRow: true; originalRow: Row<PurchaseWithTicketsAndRaffle> };

type SalesStatistics = { totalSales: number; totalRevenue: number; totalTicketsSold: number; pendingRevenue: number; };
interface RaffleSalesViewProps {
    raffle: Raffle & { totalTickets?: number };
    initialData: PurchaseWithTicketsAndRaffle[];
    initialTotalRowCount: number;
    initialStats: SalesStatistics;
    referralOptions: string[];
}

export function RaffleSalesView({ raffle, initialData, initialTotalRowCount, initialStats, referralOptions }: RaffleSalesViewProps) {
    const [isClient, setIsClient] = useState(false);
    useEffect(() => { setIsClient(true); }, []);

    const [data, setData] = useState<PurchaseWithTicketsAndRaffle[]>(initialData);
    const [totalRowCount, setTotalRowCount] = useState(initialTotalRowCount);
    const [statistics, setStatistics] = useState(initialStats);
    const [sorting, setSorting] = useState<SortingState>([{ id: 'createdAt', desc: true }]);
    const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
    const [globalFilter, setGlobalFilter] = useState('');
    const [date, setDate] = useState<Date | undefined>();
    const debouncedGlobalFilter = useDebounce(globalFilter, 300);
    const [isFetching, setIsFetching] = useState(false);
    const [expanded, setExpanded] = useState<ExpandedState>({});
    const [tempSelectedStatuses, setTempSelectedStatuses] = useState<string[]>([]);
    const [tempSelectedReferrals, setTempSelectedReferrals] = useState<string[]>([]);

    const fetchSales = useCallback(async (options: { pageIndex: number; pageSize: number; reset?: boolean }) => {
        setIsFetching(true);
        const { pageIndex, pageSize, reset = false } = options;
        const result = await getPaginatedSales(raffle.id, {
            pageIndex,
            pageSize,
            sorting,
            globalFilter: debouncedGlobalFilter,
            columnFilters,
            dateFilter: date ? format(date, 'yyyy-MM-dd') : undefined,
        });
        if (result && !result.error) {
            setData(prev => (reset ? result.rows : [...prev, ...result.rows]));
            setTotalRowCount(result.totalRowCount);
            if (reset) { setStatistics(result.statistics); }
        }
        setIsFetching(false);
    }, [raffle.id, sorting, debouncedGlobalFilter, columnFilters, date]);
    
    useEffect(() => { fetchSales({ pageIndex: 0, pageSize: 50, reset: true }); }, [sorting, debouncedGlobalFilter, columnFilters, date, fetchSales]);

    const columns: ColumnDef<PurchaseWithTicketsAndRaffle>[] = useMemo(() => [
        { accessorKey: 'buyerInfo', header: 'Comprador', size: 250, cell: ({ row }) => {
            const sale = row.original;
            return (<div><div className="font-medium text-slate-900 truncate">{sale.buyerName || 'N/A'}</div><div className="text-xs text-muted-foreground truncate">{sale.buyerEmail}</div></div>);
        }},
        { accessorKey: 'status', header: 'Estado', size: 120, cell: ({ row }) => getStatusBadge(row.getValue("status")) },
        { accessorKey: 'createdAt', header: 'Fecha', size: 160, cell: ({ row }) => format(new Date(row.getValue("createdAt")), "dd MMM yy, hh:mm a", { locale: es }), sortingFn: 'datetime' },
        { id: 'referral', accessorFn: row => row.referralLink?.name || 'Directa', header: 'Origen', size: 130, cell: ({ row }) => {
            const referralName = row.original.referralLink?.name;
            return (<div className="flex items-center gap-2"><Share2 className={`h-3 w-3 ${referralName ? 'text-blue-500' : 'text-gray-400'}`} />{referralName ? <span className="text-xs font-medium">{referralName}</span> : <span className="text-xs text-muted-foreground italic">Directa</span>}</div>);
        }},
        { accessorKey: 'ticketCount', header: 'Tickets', size: 80, cell: ({ row }) => <div className="text-center font-bold">{row.getValue("ticketCount")}</div> },
        { accessorKey: 'amount', header: 'Monto', size: 120, cell: ({ row }) => <div className="font-semibold">{formatCurrency(row.getValue("amount"), raffle.currency)}</div> },
    ], [raffle.currency]);

    const table = useReactTable({
        data, columns, state: { sorting, columnFilters, expanded },
        onSortingChange: setSorting, onColumnFiltersChange: setColumnFilters, onExpandedChange: setExpanded,
        getCoreRowModel: getCoreRowModel(),
        manualPagination: true, manualSorting: true, manualFiltering: true,
        rowCount: totalRowCount, getRowCanExpand: () => true,
    });

    const tableContainerRef = useRef<HTMLDivElement>(null);
    const { rows } = table.getRowModel();

    const flatRows = useMemo(() => {
        const newFlatRows: VirtualRow[] = [];
        rows.forEach(row => {
            newFlatRows.push(row);
            if (row.getIsExpanded()) {
                newFlatRows.push({ isDetailRow: true, originalRow: row });
            }
        });
        return newFlatRows;
    }, [rows, expanded]);

    const rowVirtualizer = useVirtualizer({
        count: flatRows.length,
        getScrollElement: () => tableContainerRef.current,
        estimateSize: (index) => 'isDetailRow' in flatRows[index] ? 200 : 60,
        overscan: 10,
    });
    
    useEffect(() => {
        const [lastItem] = [...rowVirtualizer.getVirtualItems()].reverse();
        if (!lastItem) return;
        if (lastItem.index >= rows.length - 5 && rows.length < totalRowCount && !isFetching) {
            const nextPage = Math.ceil(rows.length / 50);
            fetchSales({ pageIndex: nextPage, pageSize: 50 });
        }
    }, [rows.length, totalRowCount, isFetching, rowVirtualizer.getVirtualItems(), fetchSales]);

    const totalRaffleTickets = raffle.totalTickets || 10000;
    const progress = totalRaffleTickets > 0 ? (statistics.totalTicketsSold / totalRaffleTickets) * 100 : 0;
    const resetFilters = () => { setDate(undefined); setGlobalFilter(''); setColumnFilters([]); setSorting([{ id: 'createdAt', desc: true }]); };
    const selectedReferrals = (table.getColumn('referral')?.getFilterValue() as string[] ?? []);
    const isFiltered = date || globalFilter || columnFilters.length > 0;

    return (
        <div className="bg-gray-50 min-h-screen">
            <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 md:py-10">
                <Link href={`/rifas/${raffle.id}`} className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 mb-4"><ArrowLeft className="h-4 w-4" /> Volver a la Rifa</Link>
                <header className="space-y-1 mb-6">
                    <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-gray-900">Módulo de Ventas</h1>
                    <p className="text-md text-gray-600">Análisis de la rifa: <span className="font-semibold text-orange-600">{raffle.name}</span></p>
                </header>
                <section className="mb-6 space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                        <StatCard icon={Receipt} title="Ventas Totales" value={statistics.totalSales} colorClass="text-blue-600" />
                        <StatCard icon={Ticket} title="Tickets Vendidos" value={statistics.totalTicketsSold} colorClass="text-green-600" />
                        <StatCard icon={DollarSign} title="Ingresos" value={formatCurrency(statistics.totalRevenue, raffle.currency)} colorClass="text-indigo-600" />
                        <StatCard icon={Clock} title="Pendiente" value={formatCurrency(statistics.pendingRevenue, raffle.currency)} colorClass="text-yellow-600" />
                    </div>
                    <div className="bg-white p-3 rounded-lg shadow-sm">
                        <div className="flex justify-between items-center mb-1">
                            <span className="text-sm font-medium text-slate-700">Progreso de la Rifa</span>
                            <span className="text-xs font-medium text-slate-500">{statistics.totalTicketsSold} / {totalRaffleTickets} ({progress.toFixed(1)}%)</span>
                        </div>
                        <Progress value={progress} className="h-2 [&>div]:bg-orange-500" />
                    </div>
                </section>
                
                <Card>
                    <CardHeader>
                        <CardTitle>Listado de Transacciones</CardTitle>
                        <CardDescription>Explora, filtra y gestiona todas las ventas.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="flex flex-wrap items-center gap-2 mb-4">
                             <div className="relative flex-grow min-w-[200px]"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="Buscar por nombre o email..." value={globalFilter} onChange={(e) => setGlobalFilter(e.target.value)} className="pl-10" /></div>
                             <Popover><PopoverTrigger asChild><Button variant="outline" className="w-full sm:w-auto justify-start text-left font-normal"><CalendarIcon className="mr-2 h-4 w-4" />{date ? format(date, "PPP", { locale: es }) : <span>Fecha</span>}</Button></PopoverTrigger><PopoverContent className="w-auto p-0"><Calendar mode="single" selected={date} onSelect={setDate} initialFocus /></PopoverContent></Popover>
                             <DropdownMenu onOpenChange={(open) => { const column = table.getColumn('status'); if (!column) return; if (open) { setTempSelectedStatuses(column.getFilterValue() as string[] ?? []); } else { column.setFilterValue(tempSelectedStatuses.length > 0 ? tempSelectedStatuses : undefined); }}}>
                                 <DropdownMenuTrigger asChild><Button variant="outline" className="w-full sm:w-auto"><Filter className="mr-2 h-4 w-4" />Estado</Button></DropdownMenuTrigger>
                                 <DropdownMenuContent align="end">
                                     <DropdownMenuLabel>Estado</DropdownMenuLabel><DropdownMenuSeparator />
                                     {['confirmed', 'pending', 'rejected'].map(status => (<DropdownMenuCheckboxItem key={status} checked={tempSelectedStatuses.includes(status)} onCheckedChange={(checked) => { const newFilter = checked ? [...tempSelectedStatuses, status] : tempSelectedStatuses.filter(s => s !== status); setTempSelectedStatuses(newFilter);}} onSelect={(e) => e.preventDefault()}> {status.charAt(0).toUpperCase() + status.slice(1)}</DropdownMenuCheckboxItem>))}
                                 </DropdownMenuContent>
                             </DropdownMenu>
                            {referralOptions.length > 0 && (<DropdownMenu onOpenChange={(open) => { const column = table.getColumn('referral'); if (!column) return; if (open) { setTempSelectedReferrals(column.getFilterValue() as string[] ?? []); } else { column.setFilterValue(tempSelectedReferrals.length > 0 ? tempSelectedReferrals : undefined); } }}><DropdownMenuTrigger asChild><Button variant="outline" className="w-full sm:w-auto"><Share2 className="mr-2 h-4 w-4" />Referido{selectedReferrals.length > 0 && (<><DropdownMenuSeparator orientation="vertical" className="mx-2 h-4" /><Badge variant="secondary" className="rounded-sm px-1 font-normal lg:hidden">{selectedReferrals.length}</Badge><Badge variant="secondary" className="rounded-sm px-1 font-normal hidden lg:block">{selectedReferrals.length} seleccionado(s)</Badge></>)}</Button></DropdownMenuTrigger><DropdownMenuContent align="end" className="w-[200px]"><DropdownMenuLabel>Origen de Venta</DropdownMenuLabel><DropdownMenuSeparator />{referralOptions.map(referral => (<DropdownMenuCheckboxItem key={referral} checked={tempSelectedReferrals.includes(referral)} onCheckedChange={(checked) => { const newFilter = checked ? [...tempSelectedReferrals, referral] : tempSelectedReferrals.filter(r => r !== referral); setTempSelectedReferrals(newFilter); }} onSelect={(e) => e.preventDefault()}>{referral}</DropdownMenuCheckboxItem>))}</DropdownMenuContent></DropdownMenu>)}
                            {isFiltered && (<Button variant="ghost" onClick={resetFilters} size="icon" className="h-9 w-9"><X className="h-4 w-4" /><span className="sr-only">Limpiar filtros</span></Button>)}
                            {isClient && (<PDFDownloadLink document={<SalesPDF sales={data} stats={statistics} raffle={raffle} filterDate={date} />} fileName={`reporte-ventas-${raffle.name.replace(/\s+/g, '_')}-${format(new Date(), 'yyyy-MM-dd')}.pdf`}>{({ loading }) => (<Button variant="secondary" className="w-full sm:w-auto" disabled={loading}>{loading ? <Loader2 className="mr-0 sm:mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-0 sm:mr-2 h-4 w-4" />}<span className="hidden sm:inline">Exportar</span></Button>)}</PDFDownloadLink>)}
                        </div>

                        <div ref={tableContainerRef} className="h-[650px] overflow-auto relative hidden md:block border rounded-md bg-white">
                            <div className="sticky top-0 bg-slate-50 z-10 border-b">
                                <div className="flex items-center font-semibold text-sm text-muted-foreground">
                                    {table.getHeaderGroups().map(headerGroup => (
                                        <Fragment key={headerGroup.id}>
                                            {headerGroup.headers.map(header => (
                                                <div key={header.id} style={{ width: `${header.getSize()}px` }} className="p-3">
                                                    {flexRender(header.column.columnDef.header, header.getContext())}
                                                </div>
                                            ))}
                                            {/* ✅ ESPACIO PARA LOS BOTONES DE ACCIÓN */}
                                            <div style={{ width: '100px' }} className="p-3"></div>
                                        </Fragment>
                                    ))}
                                </div>
                            </div>
                            <div style={{ height: `${rowVirtualizer.getTotalSize()}px`, position: 'relative' }}>
                                {rowVirtualizer.getVirtualItems().map(virtualRow => {
                                    const rowItem = flatRows[virtualRow.index];
                                    const isDetail = 'isDetailRow' in rowItem;

                                    return (
                                        <div
                                            key={virtualRow.key}
                                            data-index={virtualRow.index}
                                            style={{ position: 'absolute', top: 0, left: 0, width: '100%', transform: `translateY(${virtualRow.start}px)`}}
                                            className="border-b"
                                        >
                                            {isDetail ? (
                                                <SaleDetailContent row={rowItem.originalRow} />
                                            ) : (
                                                <div className="flex items-center" style={{ height: `${virtualRow.size}px`}}>
                                                    {rowItem.getVisibleCells().map(cell => (
                                                        <div key={cell.id} style={{ width: `${cell.column.getSize()}px` }} className="p-3 text-sm">
                                                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                                        </div>
                                                    ))}
                                                    {/* ✅ BOTONES DE ACCIÓN (MODAL Y EXPANDIR) */}
                                                    <div style={{ width: '100px' }} className="p-3 text-right flex items-center justify-end">
                                                        <PurchaseDetailsModal purchase={rowItem.original as any} />
                                                        <Button variant="ghost" size="icon" onClick={() => rowItem.toggleExpanded()}>
                                                            <ChevronRight className={`h-4 w-4 transition-transform duration-200 ${rowItem.getIsExpanded() ? 'rotate-90' : ''}`} />
                                                        </Button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        <div className="md:hidden space-y-3">
                             {rows.length > 0 ? rows.map(row => {
                                 const sale = row.original;
                                 return (
                                     <Collapsible key={row.id} open={row.getIsExpanded()} onOpenChange={() => row.toggleExpanded()}>
                                         <div className="rounded-lg border bg-card text-card-foreground shadow-sm">
                                             <CollapsibleTrigger className="w-full p-4 text-left">
                                                 <div className="flex justify-between items-start">
                                                     <div>
                                                         <p className="font-semibold">{sale.buyerName || 'N/A'}</p>
                                                         <p className="text-xs text-muted-foreground">{sale.buyerEmail}</p>
                                                         <p className="text-xs text-muted-foreground mt-1">{format(new Date(sale.createdAt), "dd MMM, hh:mm a", { locale: es })}</p>
                                                     </div>
                                                     <div className="flex flex-col items-end gap-2">
                                                         {getStatusBadge(sale.status)}
                                                         <span className="font-bold text-lg">{formatCurrency(sale.amount, raffle.currency)}</span>
                                                     </div>
                                                 </div>
                                                 <div className="flex justify-between items-center mt-3 pt-3 border-t">
                                                     <div className="text-sm">
                                                         <span className="text-muted-foreground">Tickets:</span> <span className="font-bold">{sale.ticketCount}</span>
                                                     </div>
                                                     {/* ✅ BOTÓN DEL MODAL Y EXPANDIR PARA MÓVIL */}
                                                     <div className="flex items-center gap-1">
                                                        <PurchaseDetailsModal purchase={sale as any} />
                                                        <div className="text-muted-foreground">
                                                            <ChevronRight className={`h-4 w-4 transition-transform duration-200 ${row.getIsExpanded() ? 'rotate-90' : ''}`} />
                                                        </div>
                                                     </div>
                                                 </div>
                                             </CollapsibleTrigger>
                                             <CollapsibleContent>
                                                 <SaleDetailContent row={row} />
                                             </CollapsibleContent>
                                         </div>
                                     </Collapsible>
                                 )
                             }) : null}
                        </div>

                        <div className="flex flex-col items-center justify-center gap-4 py-4">
                            {isFetching && (<div className="flex items-center gap-2 text-muted-foreground animate-pulse"><Loader2 className="h-4 w-4 animate-spin" /><span>Cargando más ventas...</span></div>)}
                            {!isFetching && rows.length === 0 && (<div className="text-center text-muted-foreground py-10">No se encontraron ventas para los filtros aplicados.</div>)}
                            {!isFetching && rows.length < totalRowCount && (<Button variant="outline" className="md:hidden w-full" onClick={() => { const nextPage = Math.ceil(rows.length / 50); fetchSales({ pageIndex: nextPage, pageSize: 50 }); }}>Cargar Más</Button>)}
                            <div className="flex-1 text-sm text-muted-foreground">Mostrando {rows.length} de {totalRowCount} venta(s)</div>
                        </div>
                    </CardContent>
                </Card>
            </main>
        </div>
    );
}