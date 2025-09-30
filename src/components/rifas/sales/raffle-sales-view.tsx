"use client";

// Se añade 'useRef' para una optimización menor pero útil
import { useState, useMemo, Fragment, useEffect } from 'react';
import { PDFDownloadLink } from '@react-pdf/renderer';
import { SalesPDF } from './SalesPDF';
import Link from 'next/link';
import { format, isSameDay } from 'date-fns';
import { es } from 'date-fns/locale';

// --- UI Components ---
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Progress } from "@/components/ui/progress";
import { DropdownMenu, DropdownMenuContent, DropdownMenuCheckboxItem, DropdownMenuTrigger, DropdownMenuLabel, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

// --- Icons ---
import { ArrowLeft, Calendar as CalendarIcon, ChevronDown, ChevronRight, DollarSign, Filter, Receipt, Search, Ticket, X, Download, Loader2, Clock, Share2 } from 'lucide-react';

// --- Types ---
import { RaffleSalesData, PurchaseWithTicketsAndRaffle } from '@/lib/types';
import { ColumnDef, flexRender, getCoreRowModel, getFilteredRowModel, getPaginationRowModel, getSortedRowModel, useReactTable, SortingState, ColumnFiltersState, Row } from "@tanstack/react-table";
import { PurchaseDetailsModal } from '../purchase-details-modal';

// --- Helper Functions ---
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

// --- Sub-Components Optimizados ---
function StatCard({ icon: Icon, title, value, colorClass = 'text-gray-600' }: { icon: React.ElementType, title: string, value: string | number, colorClass?: string }) {
  const bgColorClass = colorClass.replace('text', 'bg').replace(/-\d+$/, '-100');
  return (
    <div className="bg-white p-3 rounded-lg shadow-sm flex items-center gap-4 transition-transform hover:scale-105">
      <div className={`p-2 rounded-full ${bgColorClass}`}>
        <Icon className={`h-5 w-5 ${colorClass}`} />
      </div>
      <div>
        <p className="text-xs text-muted-foreground">{title}</p>
        <p className="text-lg font-bold">{value}</p>
      </div>
    </div>
  );
}

function SaleDetailContent({ row }: { row: Row<PurchaseWithTicketsAndRaffle> }) {
  const sale = row.original;
  const sortedTickets = useMemo(() =>
    [...sale.tickets].sort((a, b) => a.ticketNumber.localeCompare(b.ticketNumber, undefined, { numeric: true })),
    [sale.tickets]
  );
  
  const rejectionReasonMap = {
    invalid_payment: "Pago Inválido o no Encontrado",
    malicious: "Actividad Sospechosa"
  };

  return (
    <div className="p-4 bg-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-4">
      <div>
        <h4 className="font-semibold text-xs mb-2 text-gray-700 uppercase tracking-wider">Tickets ({sale.tickets.length})</h4>
        {sale.status === 'pending' ? (
          <p className="text-sm text-muted-foreground italic">Los tickets se asignarán al confirmar la venta.</p>
        ) : sortedTickets.length > 0 ? (
          <div className="max-h-28 overflow-y-auto pr-2 flex flex-wrap gap-1">
            {sortedTickets.map(({ ticketNumber }) => (
              <Badge key={ticketNumber} variant="secondary" className="font-mono text-xs">{ticketNumber}</Badge>
            ))}
          </div>
        ) : <p className="text-sm text-muted-foreground italic">Sin tickets asignados.</p>}
      </div>
      <div>
        <h4 className="font-semibold text-xs mb-2 text-gray-700 uppercase tracking-wider">Detalles del Pago</h4>
        <div className="text-sm space-y-1">
          <p><span className="text-muted-foreground">Método:</span> {sale.paymentMethod || 'N/A'}</p>
          <p><span className="text-muted-foreground">Ref:</span> {sale.paymentReference || 'N/A'}</p>
          {sale.paymentScreenshotUrl ? (
            <a href={sale.paymentScreenshotUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline mt-2 inline-block">Ver Comprobante</a>
          ) : <p className="text-sm text-muted-foreground italic mt-2">Sin comprobante.</p>}
        </div>
      </div>

      {sale.status === 'rejected' && (
        <div className="sm:col-span-2 p-3 bg-red-50 border border-red-200 rounded-md">
          <h4 className="font-semibold text-xs mb-2 text-red-800 uppercase tracking-wider">Motivo del Rechazo</h4>
          <div className="text-sm space-y-1 text-red-900">
            <p>
              <span className="font-medium">Razón:</span> {sale.rejectionReason ? rejectionReasonMap[sale.rejectionReason as keyof typeof rejectionReasonMap] : 'No especificada.'}
            </p>
            {sale.rejectionComment && (
              <p><span className="font-medium">Comentario:</span> {sale.rejectionComment}</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}


// --- Componente Principal ---
export function RaffleSalesView({ initialSalesData }: { initialSalesData: RaffleSalesData }) {
  const { raffle, sales } = initialSalesData;
  const [isClient, setIsClient] = useState(false);
  const [date, setDate] = useState<Date | undefined>();
  const [globalFilter, setGlobalFilter] = useState('');
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [sorting, setSorting] = useState<SortingState>([{ id: 'createdAt', desc: true }]);
  
  // ✨ 1. Estado temporal para el filtro de referidos. Se actualiza al instante sin re-renderizar la tabla.
  const [tempSelectedReferrals, setTempSelectedReferrals] = useState<string[]>([]);

  useEffect(() => { setIsClient(true); }, []);
  
  const referralOptions = useMemo(() => {
    const referrals = new Set<string>();
    sales.forEach(sale => {
        if (sale.referralLink?.name) {
            referrals.add(sale.referralLink.name);
        }
    });
    const options = Array.from(referrals).sort();
    if (sales.some(sale => !sale.referralLink)) {
        options.unshift('Directa');
    }
    return options;
  }, [sales]);

  const filteredSales = useMemo(() => {
    let filteredData = sales;

    if (globalFilter) {
      const lowercasedFilter = globalFilter.toLowerCase();
      filteredData = filteredData.filter(sale =>
        sale.buyerName?.toLowerCase().includes(lowercasedFilter) ||
        sale.buyerEmail.toLowerCase().includes(lowercasedFilter)
      );
    }

    if (date) {
      filteredData = filteredData.filter(sale => isSameDay(new Date(sale.createdAt), date));
    }

    if (columnFilters.length > 0) {
      const statusFilter = columnFilters.find(f => f.id === 'status');
      if (statusFilter && Array.isArray(statusFilter.value) && statusFilter.value.length > 0) {
        filteredData = filteredData.filter(sale => (statusFilter.value as string[]).includes(sale.status));
      }

      const referralFilter = columnFilters.find(f => f.id === 'referral');
      if (referralFilter && Array.isArray(referralFilter.value) && referralFilter.value.length > 0) {
        filteredData = filteredData.filter(sale => {
          const saleReferral = sale.referralLink?.name || 'Directa';
          return (referralFilter.value as string[]).includes(saleReferral);
        });
      }
    }

    return filteredData;
  }, [sales, date, globalFilter, columnFilters]);

  const statistics = useMemo(() => {
    const confirmedSales = filteredSales.filter(s => s.status === 'confirmed');
    const pendingSales = filteredSales.filter(s => s.status === 'pending');
    const totalRevenue = confirmedSales.reduce((acc, sale) => acc + parseFloat(sale.amount), 0);
    const totalTicketsSold = confirmedSales.reduce((acc, sale) => acc + sale.ticketCount, 0);
    const pendingRevenue = pendingSales.reduce((acc, sale) => acc + parseFloat(sale.amount), 0);
    const totalTickets = 10000;
    const progress = totalTickets > 0 ? (totalTicketsSold / totalTickets) * 100 : 0;
    return { totalSales: filteredSales.length, totalRevenue, totalTicketsSold, pendingRevenue, progress, totalTickets };
  }, [filteredSales]);

  const columns: ColumnDef<PurchaseWithTicketsAndRaffle>[] = useMemo(() => [
    {
      accessorKey: 'buyerInfo',
      header: 'Comprador',
      cell: ({ row }) => {
        const sale = row.original;
        return (
          <div>
            <div className="font-medium text-slate-900">{sale.buyerName || 'N/A'}</div>
            <div className="text-xs text-muted-foreground">{sale.buyerEmail}</div>
          </div>
        );
      }
    },
    { accessorKey: 'status', header: 'Estado', cell: ({ row }) => getStatusBadge(row.getValue("status")) },
    { 
      accessorKey: 'createdAt', 
      header: 'Fecha', 
      cell: ({ row }) => format(new Date(row.getValue("createdAt")), "dd MMM yy, hh:mm a", { locale: es }),
      sortingFn: 'datetime'
    },
    {
      id: 'referral',
      accessorFn: row => row.referralLink?.name || 'Directa',
      header: 'Origen',
      cell: ({ row }) => {
        const referralName = row.original.referralLink?.name;
        return (
          <div className="flex items-center gap-2">
              <Share2 className={`h-3 w-3 ${referralName ? 'text-blue-500' : 'text-gray-400'}`}/>
            {referralName 
              ? <span className="text-xs font-medium">{referralName}</span> 
              : <span className="text-xs text-muted-foreground italic">Directa</span>
            }
          </div>
        );
      }
    },
    { accessorKey: 'ticketCount', header: 'Tickets', cell: ({ row }) => <div className="text-center font-bold">{row.getValue("ticketCount")}</div> },
    { accessorKey: 'amount', header: 'Monto', cell: ({ row }) => <div className="font-semibold">{formatCurrency(row.getValue("amount"), raffle.currency)}</div> },
    { id: 'actions', cell: ({ row }) => <div className="text-right"><PurchaseDetailsModal purchase={row.original as any} /></div> },
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
  };
  
  const selectedReferrals = (table.getColumn('referral')?.getFilterValue() as string[] ?? []);
  const isFiltered = date || globalFilter || columnFilters.length > 0;

  return (
    <div className="bg-gray-50 min-h-screen">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 md:py-10">
        <Link href={`/rifas/${raffle.id}`} className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 mb-4">
          <ArrowLeft className="h-4 w-4" /> Volver a la Rifa
        </Link>

        <header className="space-y-1 mb-6">
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-gray-900">Módulo de Ventas</h1>
          <p className="text-md text-gray-600">
            Análisis de la rifa: <span className="font-semibold text-orange-600">{raffle.name}</span>
          </p>
        </header>
        
        <section className="mb-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <StatCard icon={Receipt} title="Ventas Totales" value={statistics.totalSales} colorClass="text-blue-600"/>
            <StatCard icon={Ticket} title="Tickets Vendidos" value={statistics.totalTicketsSold} colorClass="text-green-600"/>
            <StatCard icon={DollarSign} title="Ingresos" value={formatCurrency(statistics.totalRevenue, raffle.currency)} colorClass="text-indigo-600"/>
            <StatCard icon={Clock} title="Pendiente" value={formatCurrency(statistics.pendingRevenue, raffle.currency)} colorClass="text-yellow-600"/>
          </div>
          <div className="bg-white p-3 rounded-lg shadow-sm">
            <div className="flex justify-between items-center mb-1">
              <span className="text-sm font-medium text-slate-700">Progreso de la Rifa</span>
              <span className="text-xs font-medium text-slate-500">{statistics.totalTicketsSold} / {statistics.totalTickets} ({statistics.progress.toFixed(1)}%)</span>
            </div>
            <Progress value={statistics.progress} className="h-2 [&>div]:bg-orange-500"/>
          </div>
        </section>

        <Card>
          <CardHeader>
            <CardTitle>Listado de Transacciones</CardTitle>
            <CardDescription>Explora, filtra y gestiona todas las ventas.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap items-center gap-2 mb-4">
              <div className="relative flex-grow min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Buscar por nombre o email..." value={globalFilter} onChange={(e) => setGlobalFilter(e.target.value)} className="pl-10" />
              </div>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full sm:w-auto justify-start text-left font-normal">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {date ? format(date, "PPP", { locale: es }) : <span>Fecha</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={date} onSelect={setDate} initialFocus /></PopoverContent>
              </Popover>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild><Button variant="outline" className="w-full sm:w-auto"><Filter className="mr-2 h-4 w-4" />Estado</Button></DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>Estado</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {['confirmed', 'pending', 'rejected'].map(status => (
                    <DropdownMenuCheckboxItem key={status} checked={(table.getColumn('status')?.getFilterValue() as string[] ?? []).includes(status)} onCheckedChange={(checked) => {
                      const column = table.getColumn('status');
                      if (!column) return;
                      const currentFilter = (column.getFilterValue() as string[] ?? []);
                      const newFilter = checked ? [...currentFilter, status] : currentFilter.filter(s => s !== status);
                      column.setFilterValue(newFilter.length > 0 ? newFilter : undefined);
                    }}>
                      {status.charAt(0).toUpperCase() + status.slice(1)}
                    </DropdownMenuCheckboxItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              {referralOptions.length > 0 && (
                  // ✨ 2. Se añade onOpenChange para controlar cuándo aplicar el filtro.
                  <DropdownMenu onOpenChange={(open) => {
                    const column = table.getColumn('referral');
                    if (!column) return;

                    if (open) {
                      // Al abrir, se carga el estado temporal con el filtro actual de la tabla.
                      setTempSelectedReferrals(column.getFilterValue() as string[] ?? []);
                    } else {
                      // Al cerrar, se aplica el filtro desde el estado temporal a la tabla.
                      column.setFilterValue(tempSelectedReferrals.length > 0 ? tempSelectedReferrals : undefined);
                    }
                  }}>
                      <DropdownMenuTrigger asChild>
                          <Button variant="outline" className="w-full sm:w-auto">
                              <Share2 className="mr-2 h-4 w-4" />
                              Referido
                              {selectedReferrals.length > 0 && (
                                  <>
                                      <DropdownMenuSeparator orientation="vertical" className="mx-2 h-4" />
                                      <Badge variant="secondary" className="rounded-sm px-1 font-normal lg:hidden">
                                          {selectedReferrals.length}
                                      </Badge>
                                      <Badge variant="secondary" className="rounded-sm px-1 font-normal hidden lg:block">
                                          {selectedReferrals.length} seleccionado(s)
                                      </Badge>
                                  </>
                              )}
                          </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-[200px]">
                          <DropdownMenuLabel>Origen de Venta</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          {referralOptions.map(referral => (
                              <DropdownMenuCheckboxItem
                                  key={referral}
                                  // ✨ 3. El 'checked' y el 'onCheckedChange' ahora usan el estado temporal.
                                  checked={tempSelectedReferrals.includes(referral)}
                                  onCheckedChange={(checked) => {
                                      const newFilter = checked
                                          ? [...tempSelectedReferrals, referral]
                                          : tempSelectedReferrals.filter(r => r !== referral);
                                      setTempSelectedReferrals(newFilter);
                                  }}
                                  // Evita que el menú se cierre con cada clic
                                  onSelect={(e) => e.preventDefault()}
                              >
                                  {referral}
                              </DropdownMenuCheckboxItem>
                          ))}
                      </DropdownMenuContent>
                  </DropdownMenu>
              )}

              {isFiltered && (
                <Button variant="ghost" onClick={resetFilters} size="icon" className="h-9 w-9">
                  <X className="h-4 w-4" /><span className="sr-only">Limpiar filtros</span>
                </Button>
              )}
              {isClient && (
                <PDFDownloadLink
                  document={<SalesPDF sales={filteredSales} stats={statistics} raffle={raffle} filterDate={date} />}
                  fileName={`reporte-ventas-${raffle.name.replace(/\s+/g, '_')}-${format(new Date(), 'yyyy-MM-dd')}.pdf`}
                >
                  {({ loading }) => (
                    <Button variant="secondary" className="w-full sm:w-auto" disabled={loading}>
                      {loading ? <Loader2 className="mr-0 sm:mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-0 sm:mr-2 h-4 w-4" />}
                      <span className="hidden sm:inline">Exportar</span>
                    </Button>
                  )}
                </PDFDownloadLink>
              )}
            </div>

            <div className="hidden md:block">
              <Table>
                <TableHeader>
                  {table.getHeaderGroups().map(headerGroup => (
                    <TableRow key={headerGroup.id}>
                      {headerGroup.headers.map(header => <TableHead key={header.id}>{flexRender(header.column.columnDef.header, header.getContext())}</TableHead>)}
                       <TableHead />
                    </TableRow>
                  ))}
                </TableHeader>
                <TableBody>
                  {table.getRowModel().rows?.length ? table.getRowModel().rows.map(row => (
                    <Collapsible asChild key={row.id} open={row.getIsExpanded()} onOpenChange={row.toggleExpanded}>
                      <Fragment>
                        <TableRow data-state={row.getIsSelected() && "selected"}>
                          {row.getVisibleCells().map(cell => (
                            <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>
                          ))}
                          <TableCell>
                            <CollapsibleTrigger asChild>
                               <Button variant="ghost" size="icon">
                                {row.getIsExpanded() ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                               </Button>
                            </CollapsibleTrigger>
                          </TableCell>
                        </TableRow>
                        <CollapsibleContent asChild>
                          <TableRow>
                            <TableCell colSpan={columns.length + 1} className="p-0">
                              <SaleDetailContent row={row} />
                            </TableCell>
                          </TableRow>
                        </CollapsibleContent>
                      </Fragment>
                    </Collapsible>
                  )) : (
                    <TableRow><TableCell colSpan={columns.length + 1} className="h-24 text-center">No se encontraron ventas.</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

            <div className="md:hidden space-y-3">
              {table.getRowModel().rows?.length ? table.getRowModel().rows.map(row => {
                const sale = row.original;
                return (
                  <Collapsible key={row.id} onOpenChange={() => row.toggleExpanded()}>
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
                             <div className="flex items-center gap-2">
                               <PurchaseDetailsModal purchase={sale as any} />
                               <div className="text-muted-foreground">
                                 {row.getIsExpanded() ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
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
              }) : (
                <div className="text-center text-muted-foreground py-10">No se encontraron ventas.</div>
              )}
            </div>

            <div className="flex flex-col items-center justify-between gap-4 py-4 md:flex-row">
              <div className="flex-1 text-sm text-muted-foreground">{table.getFilteredRowModel().rows.length} de {sales.length} venta(s) mostradas.</div>
              <div className="flex items-center space-x-2">
                <Button variant="outline" size="sm" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}>Anterior</Button>
                <Button variant="outline" size="sm" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>Siguiente</Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}