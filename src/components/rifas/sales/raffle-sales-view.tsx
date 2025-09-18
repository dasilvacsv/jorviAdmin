"use client";

// --- INICIO DE CAMBIOS PARA PDF: Añadir imports ---
import { useState, useMemo, Fragment, useEffect } from 'react';
import { PDFDownloadLink } from '@react-pdf/renderer';
import { SalesPDF } from './SalesPDF'; // El nuevo componente para el PDF
// --- FIN DE CAMBIOS PARA PDF ---

import {
  Card, CardContent, CardHeader, CardTitle, CardDescription
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Progress } from "@/components/ui/progress";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuCheckboxItem, DropdownMenuTrigger, DropdownMenuLabel, DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
import {
  Collapsible, CollapsibleContent, CollapsibleTrigger,
} from "@/components/ui/collapsible";
import Link from 'next/link';
import Image from 'next/image';
import {
  ArrowLeft, BarChart2, Calendar as CalendarIcon, ChevronDown, ChevronRight, DollarSign, Filter, Receipt, Search, Ticket, Users, X, Download, Loader2 // Añadir Download y Loader2
} from 'lucide-react';
import { format, isSameDay } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  SortingState,
  ColumnFiltersState,
  Row,
} from "@tanstack/react-table";
import { PurchaseDetailsModal } from '../purchase-details-modal'; // Reutilizamos el modal existente
import { RaffleSalesData, PurchaseWithTicketsAndRaffle } from '@/lib/types'; // Importamos los tipos

// --- Helper Functions ---
const formatCurrency = (amount: number | string, currency: 'USD' | 'VES') => {
  const value = typeof amount === 'string' ? parseFloat(amount) : amount;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
  }).format(value);
};

const getStatusBadge = (status: string | null) => {
  switch (status) {
    case 'confirmed': return <Badge className="bg-green-100 text-green-800 border-green-300">Confirmado</Badge>;
    case 'pending': return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-300">Pendiente</Badge>;
    case 'rejected': return <Badge className="bg-red-100 text-red-800 border-red-300">Rechazado</Badge>;
    default: return null;
  }
};

// --- Sub-Componente para el contenido colapsable ---
function SaleDetailContent({ row }: { row: Row<PurchaseWithTicketsAndRaffle> }) {
    const sale = row.original;
    const sortedTickets = useMemo(() =>
      [...sale.tickets].sort((a, b) => a.ticketNumber.localeCompare(b.ticketNumber, undefined, { numeric: true })),
      [sale.tickets]
    );

    return (
        <div className="p-4 bg-slate-50 grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-1">
                <h4 className="font-semibold text-sm mb-2">Tickets Asignados ({sale.tickets.length})</h4>
                {sortedTickets.length > 0 ? (
                    <div className="max-h-32 overflow-y-auto pr-2 grid grid-cols-4 sm:grid-cols-5 md:grid-cols-4 gap-1">
                        {sortedTickets.map(({ ticketNumber }) => (
                            <Badge key={ticketNumber} variant="secondary" className="font-mono flex-shrink-0 justify-center">{ticketNumber}</Badge>
                        ))}
                    </div>
                ) : <p className="text-sm text-muted-foreground italic">Aún no hay tickets asignados.</p>}
            </div>
            <div className="md:col-span-1">
                 <h4 className="font-semibold text-sm mb-2">Detalles del Pago</h4>
                 <div className="text-sm space-y-1">
                     <p><span className="text-muted-foreground">Método:</span> {sale.paymentMethod || 'N/A'}</p>
                     <p><span className="text-muted-foreground">Ref:</span> {sale.paymentReference || 'N/A'}</p>
                 </div>
            </div>
            <div className="md:col-span-1">
                 <h4 className="font-semibold text-sm mb-2">Comprobante</h4>
                 {sale.paymentScreenshotUrl ? (
                     <a href={sale.paymentScreenshotUrl} target="_blank" rel="noopener noreferrer">
                         <Image src={sale.paymentScreenshotUrl} alt="Comprobante" width={150} height={150} className="rounded-md border object-cover hover:opacity-80 transition-opacity" />
                     </a>
                 ) : <p className="text-sm text-muted-foreground italic">Sin comprobante.</p>}
            </div>
        </div>
    );
}

// --- Componente principal de la vista de ventas ---
export function RaffleSalesView({ initialSalesData }: { initialSalesData: RaffleSalesData }) {
  const { raffle, sales } = initialSalesData;

  // Estados para los filtros
  const [date, setDate] = useState<Date | undefined>();
  const [globalFilter, setGlobalFilter] = useState('');
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [sorting, setSorting] = useState<SortingState>([{ id: 'createdAt', desc: true }]);

  // --- INICIO DE CAMBIOS PARA PDF: Estado para renderizado en cliente ---
  const [isClient, setIsClient] = useState(false);
  useEffect(() => {
    setIsClient(true);
  }, []);
  // --- FIN DE CAMBIOS PARA PDF ---

  // Memoización para optimizar el rendimiento de los filtros y estadísticas
  const filteredSales = useMemo(() => {
    let filtered = sales;

    // Filtro de fecha
    if (date) {
      filtered = filtered.filter(sale => isSameDay(new Date(sale.createdAt), date));
    }

    // Filtro de texto global
    if (globalFilter) {
      const lowercasedFilter = globalFilter.toLowerCase();
      filtered = filtered.filter(sale =>
        sale.buyerName?.toLowerCase().includes(lowercasedFilter) ||
        sale.buyerEmail.toLowerCase().includes(lowercasedFilter)
      );
    }

    // Filtros de columna (estado, método de pago)
    columnFilters.forEach(filter => {
      const { id, value } = filter;
      if(value && Array.isArray(value) && value.length > 0) {
        filtered = filtered.filter(sale => value.includes((sale as any)[id]));
      }
    });

    return filtered;
  }, [sales, date, globalFilter, columnFilters]);

  const statistics = useMemo(() => {
    const totalSales = filteredSales.length;
    const confirmedSales = filteredSales.filter(s => s.status === 'confirmed');
    const pendingSales = filteredSales.filter(s => s.status === 'pending');

    const totalRevenue = confirmedSales.reduce((acc, sale) => acc + parseFloat(sale.amount), 0);
    const totalTicketsSold = confirmedSales.reduce((acc, sale) => acc + sale.ticketCount, 0);
    const pendingRevenue = pendingSales.reduce((acc, sale) => acc + parseFloat(sale.amount), 0);
    const progress = (totalTicketsSold / 10000) * 100;

    return { totalSales, totalRevenue, totalTicketsSold, pendingRevenue, progress };
  }, [filteredSales]);

  const uniquePaymentMethods = useMemo(() => {
    const methods = new Set(sales.map(s => s.paymentMethod).filter(Boolean));
    return Array.from(methods) as string[];
  }, [sales]);


  // Definición de columnas para TanStack Table
  const columns: ColumnDef<PurchaseWithTicketsAndRaffle>[] = useMemo(() => [
    {
      id: 'expander',
      header: () => null,
      cell: ({ row }) => (
        <CollapsibleTrigger asChild>
          <Button variant="ghost" size="sm">
            {row.getIsExpanded() ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </Button>
        </CollapsibleTrigger>
      ),
    },
    {
      accessorKey: 'buyerName',
      header: 'Comprador',
      cell: ({ row }) => {
        const sale = row.original;
        return (
          <div>
            <div className="font-medium">{sale.buyerName || 'N/A'}</div>
            <div className="text-xs text-muted-foreground">{sale.buyerEmail}</div>
          </div>
        );
      }
    },
    {
      accessorKey: 'status',
      header: 'Estado',
      cell: ({ row }) => getStatusBadge(row.getValue("status")),
    },
    {
      accessorKey: 'createdAt',
      header: 'Fecha',
      cell: ({ row }) => format(new Date(row.getValue("createdAt")), "dd MMM yyyy, hh:mm a", { locale: es }),
      sortingFn: 'datetime'
    },
    {
      accessorKey: 'ticketCount',
      header: 'Tickets',
      cell: ({ row }) => <div className="text-center font-bold">{row.getValue("ticketCount")}</div>
    },
    {
      accessorKey: 'amount',
      header: 'Monto',
      cell: ({ row }) => <div className="font-semibold">{formatCurrency(row.getValue("amount"), raffle.currency)}</div>
    },
    {
      id: 'actions',
      cell: ({ row }) => <PurchaseDetailsModal purchase={row.original as any} />,
    },
  ], [raffle.currency]);

  const table = useReactTable({
    data: filteredSales,
    columns,
    state: { sorting, globalFilter, columnFilters },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getRowCanExpand: () => true,
  });

  const resetFilters = () => {
    setDate(undefined);
    setGlobalFilter('');
    setColumnFilters([]);
  }

  const statusFilterValues = table.getColumn('status')?.getFilterValue() as string[] ?? [];
  const paymentMethodFilterValues = table.getColumn('paymentMethod')?.getFilterValue() as string[] ?? [];

  return (
    <div className="bg-slate-50 min-h-screen">
      <div className="max-w-7xl mx-auto px-4 py-8 md:py-12">
        <Link href={`/rifas/${raffle.id}`} className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 transition-colors mb-6">
          <ArrowLeft className="h-4 w-4" /> Volver a la Rifa
        </Link>

        <div className="space-y-2 mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Módulo de Ventas</h1>
            <p className="text-gray-600">Análisis detallado de todas las ventas para la rifa: <span className="font-semibold text-orange-600">{raffle.name}</span></p>
        </div>

        {/* --- Sección de Estadísticas --- */}
        <Card className="mb-8">
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><BarChart2 className="h-5 w-5"/> Estadísticas de Ventas {date ? `(para ${format(date, "PPP", {locale: es})})` : '(Globales)'}</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                    <div className="p-4 bg-gray-100 rounded-lg"><p className="text-sm text-muted-foreground">Ventas Totales</p><p className="text-2xl font-bold">{statistics.totalSales}</p></div>
                    <div className="p-4 bg-gray-100 rounded-lg"><p className="text-sm text-muted-foreground">Tickets Vendidos</p><p className="text-2xl font-bold text-green-600">{statistics.totalTicketsSold}</p></div>
                    <div className="p-4 bg-gray-100 rounded-lg"><p className="text-sm text-muted-foreground">Ingresos Confirmados</p><p className="text-2xl font-bold text-blue-600">{formatCurrency(statistics.totalRevenue, raffle.currency)}</p></div>
                    <div className="p-4 bg-gray-100 rounded-lg"><p className="text-sm text-muted-foreground">Ingresos Pendientes</p><p className="text-2xl font-bold text-yellow-600">{formatCurrency(statistics.pendingRevenue, raffle.currency)}</p></div>
                </div>
                <div className="mt-4">
                  <div className="flex justify-between mb-1">
                      <span className="text-base font-medium text-blue-700">Progreso de Venta de Tickets</span>
                      <span className="text-sm font-medium text-blue-700">{statistics.totalTicketsSold} / 10,000 ({statistics.progress.toFixed(2)}%)</span>
                  </div>
                  <Progress value={statistics.progress} />
                </div>
            </CardContent>
        </Card>

        {/* --- Sección de Filtros y Tabla --- */}
        <Card>
            <CardHeader>
                <CardTitle>Listado de Ventas</CardTitle>
                <CardDescription>Explora, filtra y gestiona todas las transacciones.</CardDescription>
            </CardHeader>
            <CardContent>
                {/* Barra de Filtros */}
                <div className="flex flex-col md:flex-row items-center gap-2 mb-4">
                    <div className="relative w-full md:flex-grow">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input placeholder="Buscar por nombre o email..." value={globalFilter} onChange={(e) => setGlobalFilter(e.target.value)} className="pl-10" />
                    </div>
                    <div className="flex gap-2 w-full md:w-auto flex-wrap">
                        <Popover>
                            <PopoverTrigger asChild><Button variant="outline" className="flex-grow justify-start text-left font-normal"><CalendarIcon className="mr-2 h-4 w-4" />{date ? format(date, "PPP", { locale: es }) : <span>Filtrar fecha</span>}</Button></PopoverTrigger>
                            <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={date} onSelect={setDate} initialFocus /></PopoverContent>
                        </Popover>

                        <DropdownMenu>
                          <DropdownMenuTrigger asChild><Button variant="outline" className="flex-grow"><Filter className="mr-2 h-4 w-4" />Filtros</Button></DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Estado</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            {['confirmed', 'pending', 'rejected'].map(status => (
                              <DropdownMenuCheckboxItem key={status} checked={statusFilterValues.includes(status)} onCheckedChange={(checked) => {
                                const newFilter = checked ? [...statusFilterValues, status] : statusFilterValues.filter(s => s !== status);
                                table.getColumn('status')?.setFilterValue(newFilter);
                              }}>
                                {status === 'confirmed' ? 'Confirmado' : status === 'pending' ? 'Pendiente' : 'Rechazado'}
                              </DropdownMenuCheckboxItem>
                            ))}
                            {uniquePaymentMethods.length > 0 && (
                              <>
                                <DropdownMenuLabel>Método de Pago</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                {uniquePaymentMethods.map(method => (
                                  <DropdownMenuCheckboxItem key={method} checked={paymentMethodFilterValues.includes(method)} onCheckedChange={(checked) => {
                                      const newFilter = checked ? [...paymentMethodFilterValues, method] : paymentMethodFilterValues.filter(m => m !== method);
                                      table.getColumn('paymentMethod')?.setFilterValue(newFilter);
                                  }}>
                                    {method}
                                  </DropdownMenuCheckboxItem>
                                ))}
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>

                        {(date || globalFilter || columnFilters.length > 0) && (
                            <Button variant="ghost" size="icon" onClick={resetFilters}><X className="h-4 w-4" /></Button>
                        )}

                        {/* --- INICIO DE CAMBIOS PARA PDF: Botón de descarga --- */}
                        {isClient && (
                          <PDFDownloadLink
                            document={<SalesPDF sales={filteredSales} stats={statistics} raffle={raffle} filterDate={date} />}
                            fileName={`reporte-ventas-${raffle.name.replace(/\s+/g, '_')}-${format(new Date(), 'yyyy-MM-dd')}.pdf`}
                          >
                            {({ loading }) => (
                              <Button variant="secondary" className="flex-grow" disabled={loading}>
                                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                                Exportar PDF
                              </Button>
                            )}
                          </PDFDownloadLink>
                        )}
                        {/* --- FIN DE CAMBIOS PARA PDF --- */}
                    </div>
                </div>

                {/* Tabla de Datos */}
                <div className="rounded-md border">
                    <Table>
                        <TableHeader>
                            {table.getHeaderGroups().map(headerGroup => (
                                <TableRow key={headerGroup.id}>
                                    {headerGroup.headers.map(header => <TableHead key={header.id}>{flexRender(header.column.columnDef.header, header.getContext())}</TableHead>)}
                                </TableRow>
                            ))}
                        </TableHeader>
                        <TableBody>
                            {table.getRowModel().rows?.length ? (
                                table.getRowModel().rows.map(row => (
                                    <Collapsible key={row.id} asChild>
                                        <Fragment>
                                            <TableRow data-state={row.getIsSelected() && "selected"}>
                                                {row.getVisibleCells().map(cell => (
                                                    <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>
                                                ))}
                                            </TableRow>
                                            <CollapsibleContent asChild>
                                                <TableRow>
                                                    <TableCell colSpan={columns.length} className="p-0">
                                                        <SaleDetailContent row={row} />
                                                    </TableCell>
                                                </TableRow>
                                            </CollapsibleContent>
                                        </Fragment>
                                    </Collapsible>
                                ))
                            ) : (
                                <TableRow><TableCell colSpan={columns.length} className="h-24 text-center">No se encontraron ventas con los filtros aplicados.</TableCell></TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>

                {/* Paginación */}
                <div className="flex items-center justify-end space-x-2 py-4">
                  <div className="flex-1 text-sm text-muted-foreground">{table.getFilteredRowModel().rows.length} de {sales.length} venta(s).</div>
                  <Button variant="outline" size="sm" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}>Anterior</Button>
                  <Button variant="outline" size="sm" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>Siguiente</Button>
                </div>
            </CardContent>
        </Card>
      </div>
    </div>
  );
}