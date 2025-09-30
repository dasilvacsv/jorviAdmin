"use client";

// --- Hooks y Librerías ---
import { useState, useMemo, Fragment, useEffect, useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { PDFDownloadLink } from '@react-pdf/renderer';
import { format, isSameDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { useDebounce } from 'use-debounce';
import Link from 'next/link';

// --- Componentes Ficticios (para que el código sea funcional) ---
// Asegúrate de que estos imports sean correctos en tu proyecto
import { SalesPDF } from './SalesPDF';
import { PurchaseDetailsModal } from '../purchase-details-modal';
// import { getPaginatedSales } from '@/lib/actions'; // Asumimos que esta server action existe y está configurada

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
import { ColumnDef, flexRender, getCoreRowModel, useReactTable, SortingState, ColumnFiltersState, Row, PaginationState } from "@tanstack/react-table";

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

// --- Sub-Components ---
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
    [...(sale.tickets || [])].sort((a, b) => a.ticketNumber.localeCompare(b.ticketNumber, undefined, { numeric: true })),
    [sale.tickets]
  );
  
  const rejectionReasonMap = {
    invalid_payment: "Pago Inválido o no Encontrado",
    malicious: "Actividad Sospechosa"
  };

  return (
    <div className="p-4 bg-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-4">
      <div>
        <h4 className="font-semibold text-xs mb-2 text-gray-700 uppercase tracking-wider">Tickets ({(sale.tickets || []).length})</h4>
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
export function RaffleSalesView({
  raffleData,
  initialData,
  initialPageCount,
  initialTotalRowCount,
}: {
  raffleData: RaffleSalesData;
  initialData: PurchaseWithTicketsAndRaffle[];
  initialPageCount: number;
  initialTotalRowCount: number;
}) {
  const { raffle, sales: allSales } = raffleData;

  const [data, setData] = useState(initialData);
  const [pageCount, setPageCount] = useState(initialPageCount);
  const [totalRowCount, setTotalRowCount] = useState(initialTotalRowCount);
  
  const [sorting, setSorting] = useState<SortingState>([{ id: 'createdAt', desc: true }]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = useState('');
  const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 50 });
  const [isLoading, setIsLoading] = useState(false);
  
  const [isClient, setIsClient] = useState(false);
  const [date, setDate] = useState<Date | undefined>();
  const [tempSelectedReferrals, setTempSelectedReferrals] = useState<string[]>([]);

  const [debouncedGlobalFilter] = useDebounce(globalFilter, 300);

  useEffect(() => {
    // Simula la Server Action para que el código sea ejecutable de forma aislada.
    // En tu proyecto, reemplaza esto con la importación y llamada a tu server action real.
    const getPaginatedSales = async (raffleId: string, options: any) => {
        console.log("Fetching data with options:", options);
        // Aquí iría la llamada a tu backend: `await getPaginatedSales(raffleId, options)`
        // Simulamos una respuesta para demostración:
        return {
            rows: initialData,
            pageCount: initialPageCount,
            totalRowCount: initialTotalRowCount
        };
    };

    const fetchSales = async () => {
      setIsLoading(true);
      try {
          const result = await getPaginatedSales(raffle.id, {
            pageIndex: pagination.pageIndex,
            pageSize: pagination.pageSize,
            sorting,
            globalFilter: debouncedGlobalFilter,
            columnFilters,
            dateFilter: date // Envía la fecha al backend si quieres filtrar en el servidor
          });
    
          setData(result.rows || []);
          setPageCount(result.pageCount ?? 0);
          setTotalRowCount(result.totalRowCount ?? 0);
      } catch (error) {
          console.error("Failed to fetch sales:", error);
          // Opcional: manejar el estado de error en la UI
      } finally {
          setIsLoading(false);
      }
    };

    if (isClient) {
      fetchSales();
    }
  }, [
    raffle.id,
    pagination,
    sorting,
    debouncedGlobalFilter,
    columnFilters,
    date, // Añadido para que el filtro de fecha dispare la búsqueda
    isClient
  ]);

  useEffect(() => { setIsClient(true); }, []);

  const referralOptions = useMemo(() => {
    const referrals = new Set<string>();
    allSales.forEach(sale => {
      if (sale.referralLink?.name) {
        referrals.add(sale.referralLink.name);
      }
    });
    const options = Array.from(referrals).sort();
    if (allSales.some(sale => !sale.referralLink)) {
      options.unshift('Directa');
    }
    return options;
  }, [allSales]);

  const statistics = useMemo(() => {
    // Las estadísticas globales se calculan sobre el total de ventas (`allSales`)
    const confirmedSales = allSales.filter(s => s.status === 'confirmed');
    const pendingSales = allSales.filter(s => s.status === 'pending');
    const totalRevenue = confirmedSales.reduce((acc, sale) => acc + parseFloat(sale.amount), 0);
    const totalTicketsSold = confirmedSales.reduce((acc, sale) => acc + sale.ticketCount, 0);
    const pendingRevenue = pendingSales.reduce((acc, sale) => acc + parseFloat(sale.amount), 0);
    const totalTickets = raffle.totalTickets || 10000;
    const progress = totalTickets > 0 ? (totalTicketsSold / totalTickets) * 100 : 0;
    return { totalSales: allSales.length, totalRevenue, totalTicketsSold, pendingRevenue, progress, totalTickets };
  }, [allSales, raffle.totalTickets]);

  const columns: ColumnDef<PurchaseWithTicketsAndRaffle>[] = useMemo(() => [
    { accessorKey: 'buyerInfo', header: 'Comprador', cell: ({ row }) => {
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
    { accessorKey: 'createdAt', header: 'Fecha', cell: ({ row }) => format(new Date(row.getValue("createdAt")), "dd MMM yy, hh:mm a", { locale: es }), sortingFn: 'datetime' },
    { id: 'referral', accessorFn: row => row.referralLink?.name || 'Directa', header: 'Origen', cell: ({ row }) => {
        const referralName = row.original.referralLink?.name;
        return (
          <div className="flex items-center gap-2">
            <Share2 className={`h-3 w-3 ${referralName ? 'text-blue-500' : 'text-gray-400'}`}/>
            {referralName ? <span className="text-xs font-medium">{referralName}</span> : <span className="text-xs text-muted-foreground italic">Directa</span>}
          </div>
        );
      }
    },
    { accessorKey: 'ticketCount', header: 'Tickets', cell: ({ row }) => <div className="text-center font-bold">{row.getValue("ticketCount")}</div> },
    { accessorKey: 'amount', header: 'Monto', cell: ({ row }) => <div className="font-semibold">{formatCurrency(row.getValue("amount"), raffle.currency)}</div> },
    { id: 'actions', cell: ({ row }) => <div className="text-right"><PurchaseDetailsModal purchase={row.original as any} /></div> },
    { id: 'expander', cell: ({ row }) => (
        <CollapsibleTrigger asChild>
            <Button variant="ghost" size="icon">
                {row.getIsExpanded() ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </Button>
        </CollapsibleTrigger>
      )
    }
  ], [raffle.currency]);
  
  const table = useReactTable({
    data,
    columns,
    state: { sorting, columnFilters, globalFilter, pagination },
    manualPagination: true,
    manualFiltering: true,
    manualSorting: true,
    pageCount,
    onPaginationChange: setPagination,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getRowCanExpand: () => true,
  });

  const tableContainerRef = useRef<HTMLDivElement>(null);
  const { rows } = table.getRowModel();

  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => tableContainerRef.current,
    estimateSize: () => 125, // Altura estimada (fila + contenido colapsable)
    overscan: 5,
  });
  
  const resetFilters = () => {
    setDate(undefined);
    setGlobalFilter('');
    setColumnFilters([]);
    setPagination(p => ({ ...p, pageIndex: 0 }));
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
          <p className="text-md text-gray-600">Análisis de la rifa: <span className="font-semibold text-orange-600">{raffle.name}</span></p>
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
            
            {/* --- SECCIÓN DE FILTROS --- */}
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
                  <DropdownMenuLabel>Filtrar por Estado</DropdownMenuLabel>
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
                  <DropdownMenu onOpenChange={(open) => {
                    const column = table.getColumn('referral');
                    if (!column) return;
                    if (open) {
                      setTempSelectedReferrals(column.getFilterValue() as string[] ?? []);
                    } else {
                      column.setFilterValue(tempSelectedReferrals.length > 0 ? tempSelectedReferrals : undefined);
                    }
                  }}>
                      <DropdownMenuTrigger asChild>
                          <Button variant="outline" className="w-full sm:w-auto">
                              <Share2 className="mr-2 h-4 w-4" />
                              Origen
                              {selectedReferrals.length > 0 && (
                                  <>
                                      <DropdownMenuSeparator orientation="vertical" className="mx-2 h-4" />
                                      <Badge variant="secondary" className="rounded-sm px-1 font-normal lg:hidden">{selectedReferrals.length}</Badge>
                                      <Badge variant="secondary" className="rounded-sm px-1 font-normal hidden lg:block">{selectedReferrals.length} seleccionado(s)</Badge>
                                  </>
                              )}
                          </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-[200px]">
                          <DropdownMenuLabel>Filtrar por Origen</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          {referralOptions.map(referral => (
                              <DropdownMenuCheckboxItem
                                  key={referral}
                                  checked={tempSelectedReferrals.includes(referral)}
                                  onCheckedChange={(checked) => {
                                      const newFilter = checked
                                          ? [...tempSelectedReferrals, referral]
                                          : tempSelectedReferrals.filter(r => r !== referral);
                                      setTempSelectedReferrals(newFilter);
                                  }}
                                  onSelect={(e) => e.preventDefault()}
                              >
                                  {referral}
                              </DropdownMenuCheckboxItem>
                          ))}
                      </DropdownMenuContent>
                  </DropdownMenu>
              )}

              {isFiltered && (
                <Button variant="ghost" onClick={resetFilters} size="sm" className="h-9">
                  <X className="h-4 w-4 mr-1" />Limpiar
                </Button>
              )}
              <div className="flex-grow sm:flex-grow-0" />
              {isClient && (
                <PDFDownloadLink
                  document={<SalesPDF sales={data} stats={statistics} raffle={raffle} filterDate={date} />}
                  fileName={`reporte-ventas-${raffle.name.replace(/\s+/g, '_')}-${format(new Date(), 'yyyy-MM-dd')}.pdf`}
                >
                  {({ loading }) => (
                    <Button variant="secondary" className="w-full sm:w-auto" disabled={loading}>
                      {loading ? <Loader2 className="mr-0 sm:mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-0 sm:mr-2 h-4 w-4" />}
                      <span className="hidden sm:inline">Exportar PDF</span>
                    </Button>
                  )}
                </PDFDownloadLink>
              )}
            </div>

            {/* --- TABLA VIRTUALIZADA PARA ESCRITORIO --- */}
            <div ref={tableContainerRef} className="hidden md:block relative h-[600px] overflow-auto border rounded-md">
              <Table>
                <TableHeader className="sticky top-0 bg-white z-10 shadow-sm">
                  {table.getHeaderGroups().map(headerGroup => (
                    <TableRow key={headerGroup.id}>
                      {headerGroup.headers.map(header => (
                        <TableHead key={header.id} style={{ width: header.getSize() }}>
                          {flexRender(header.column.columnDef.header, header.getContext())}
                        </TableHead>
                      ))}
                    </TableRow>
                  ))}
                </TableHeader>
                <TableBody style={{ height: `${rowVirtualizer.getTotalSize()}px` }}>
                  {isLoading ? (
                    <TableRow style={{ height: '100%' }}>
                      <TableCell colSpan={columns.length} className="h-full">
                        <div className="flex justify-center items-center h-full gap-2 text-muted-foreground">
                          <Loader2 className="h-5 w-5 animate-spin" />
                          <span>Cargando datos...</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : rowVirtualizer.getVirtualItems().length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={columns.length} className="h-24 text-center">No se encontraron ventas con los filtros actuales.</TableCell>
                    </TableRow>
                  ) : (
                    rowVirtualizer.getVirtualItems().map(virtualRow => {
                      const row = rows[virtualRow.index];
                      return (
                        <Collapsible asChild key={row.id} open={row.getIsExpanded()} onOpenChange={row.toggleExpanded}>
                          <Fragment>
                            <TableRow
                              data-state={row.getIsSelected() && "selected"}
                              style={{
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                width: '100%',
                                height: '65px',
                                transform: `translateY(${virtualRow.start}px)`,
                              }}
                            >
                              {row.getVisibleCells().map(cell => (
                                <TableCell key={cell.id} style={{ width: cell.column.getSize() }}>
                                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                </TableCell>
                              ))}
                            </TableRow>
                            <CollapsibleContent asChild>
                               <tr style={{
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                width: '100%',
                                transform: `translateY(${virtualRow.start + 65}px)`,
                              }}>
                                <TableCell colSpan={columns.length} className="p-0">
                                  {row.getIsExpanded() && <SaleDetailContent row={row} />}
                                </TableCell>
                              </tr>
                            </CollapsibleContent>
                          </Fragment>
                        </Collapsible>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>

            {/* --- VISTA DE LISTA PARA MÓVIL --- */}
            <div className="md:hidden space-y-3">
              {isLoading ? (
                <div className="flex justify-center items-center gap-2 text-muted-foreground py-10">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span>Cargando...</span>
                </div>
              ) : table.getRowModel().rows?.length ? table.getRowModel().rows.map(row => {
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

            {/* --- PAGINACIÓN --- */}
            <div className="flex flex-col items-center justify-between gap-4 py-4 md:flex-row">
              <div className="flex-1 text-sm text-muted-foreground">
                Mostrando {table.getRowModel().rows.length} de {totalRowCount} venta(s).
              </div>
              <div className="flex items-center space-x-2">
                  <span>Página{' '}<strong>{table.getState().pagination.pageIndex + 1} de {table.getPageCount()}</strong></span>
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