"use client";

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
// ✅ 1. Se importa el nuevo ícono
import { ArrowLeft, Users, DollarSign, Ticket, Crown, Loader2, Edit, Calendar as CalendarIcon, AlertCircle, AlertTriangle, Search, Star, ChevronDown, Phone, MessageSquare, BarChart2, Info, ListChecks, Award, LayoutGrid } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { ImageCarousel } from './image-carousel';
import { StatusActions } from './status-actions';
import { EditRaffleForm } from './edit-raffle-form';
import { PurchaseDetailsModal } from './purchase-details-modal';
import { Button } from '@/components/ui/button';
import { drawWinnerAction, postponeRaffleAction } from '@/lib/actions';
import { useFormState } from 'react-dom';
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import {
    ColumnDef,
    flexRender,
    getCoreRowModel,
    getFilteredRowModel,
    getPaginationRowModel,
    useReactTable,
    ColumnFiltersState,
} from "@tanstack/react-table";
import {
    DropdownMenu,
    DropdownMenuCheckboxItem,
    DropdownMenuContent,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion";


// --- TIPOS (Sin cambios) ---
type WinnerTicket={id:string;ticketNumber:string;purchase:{buyerName:string|null;buyerEmail:string;buyerPhone:string|null;}|null;};type Purchase={id:string;status:'pending'|'confirmed'|'rejected';buyerName:string|null;buyerEmail:string;ticketCount:number;amount:string;createdAt:Date;};type RaffleTicket={id:string;ticketNumber:string;status:'available'|'reserved'|'sold';purchaseId:string|null;};type RaffleWithRelations={id:string;name:string;description:string|null;price:string;currency:'USD'|'VES';minimumTickets:number;status:"active"|"finished"|"cancelled"|"draft"|"postponed";createdAt:Date;updatedAt:Date;limitDate:Date;winnerTicketId:string|null;winnerLotteryNumber:string|null;winnerProofUrl:string|null;winnerTicket?:WinnerTicket|null;images:{id:string;url:string;}[];purchases:Purchase[];tickets:RaffleTicket[];};type UnifiedTicketInfo={id:string;ticketNumber:string;ticketStatus:'available'|'reserved'|'sold';buyerName:string|null;buyerEmail:string|null;purchaseStatus:'pending'|'confirmed'|'rejected'|null;purchase:Purchase|null;};type PurchaseWithTickets=Purchase&{ticketNumbers:string[];};type TopBuyer={buyerName:string|null;buyerEmail:string;totalTickets:number;};


// --- FUNCIONES Y COMPONENTES AUXILIARES (Sin cambios) ---
const getStatusBadge=(status:string|null)=>{switch(status){case'confirmed':return<Badge className="bg-green-100 text-green-800">Confirmado</Badge>;case'pending':return<Badge className="bg-yellow-100 text-yellow-800">Pendiente</Badge>;case'rejected':return<Badge className="bg-red-100 text-red-800">Rechazado</Badge>;default:return null;}};
const getRaffleStatusBadge=(status:string)=>{switch(status){case'active':return<Badge className="bg-green-100 text-green-800 border-green-300">Activa</Badge>;case'finished':return<Badge className="bg-blue-100 text-blue-800 border-blue-300">Finalizada</Badge>;case'cancelled':return<Badge className="bg-red-100 text-red-800 border-red-300">Cancelada</Badge>;case'draft':return<Badge className="bg-gray-100 text-gray-800 border-gray-300">Borrador</Badge>;case'postponed':return<Badge className="bg-yellow-100 text-yellow-800 border-yellow-300">Pospuesta</Badge>;default:return<Badge variant="secondary">{status}</Badge>;}};
function DrawWinnerForm({raffleId}:{raffleId:string}){const[state,formAction]=useFormState(drawWinnerAction,{success:false,message:""});const[isPending,setIsPending]=useState(false);const[showPostpone,setShowPostpone]=useState(false);useEffect(()=>{if(state.message&&!state.success&&state.message.includes("no fue vendido o no existe")){setShowPostpone(true);}},[state]);const handleSubmit=async(event:React.FormEvent<HTMLFormElement>)=>{event.preventDefault();setIsPending(true);const formData=new FormData(event.currentTarget);await formAction(formData);setIsPending(false);};return(<><CardTitle className="flex items-center gap-2 text-blue-600 !mt-0 !mb-2"><Crown className="h-5 w-5"/>{showPostpone?'Posponer Rifa':'Registrar Ganador'}</CardTitle><CardDescription className="mb-4">{showPostpone?'El número ganador no fue vendido. Debes elegir una nueva fecha y hora para el sorteo.':'Ingresa el número ganador de la lotería y la imagen de prueba.'}</CardDescription>{showPostpone?(<PostponeRaffleForm raffleId={raffleId}/>):(<>{state.message&&!state.success&&(<Alert variant="destructive" className="mb-4"><AlertCircle className="h-4 w-4"/><AlertDescription>{state.message}</AlertDescription></Alert>)}<form onSubmit={handleSubmit} className="space-y-4"><input type="hidden" name="raffleId" value={raffleId}/><div><Label htmlFor="lotteryNumber">Número Ganador (4 dígitos)</Label><Input id="lotteryNumber" name="lotteryNumber" required maxLength={4} pattern="\d{4}" placeholder="Ej: 2444" className="mt-1"/></div><div><Label htmlFor="winnerProof">Prueba del Sorteo (Imagen)</Label><Input id="winnerProof" name="winnerProof" type="file" required accept="image/*" className="mt-1"/></div><Button type="submit" className="w-full" disabled={isPending}>{isPending&&<Loader2 className="mr-2 h-4 w-4 animate-spin"/>}Confirmar Ganador</Button></form></>)}</>);}
function PostponeRaffleForm({raffleId}:{raffleId:string}){const[state,formAction]=useFormState(postponeRaffleAction,{success:false,message:""});const[date,setDate]=useState<Date|undefined>();const[hour,setHour]=useState('19');const[minute,setMinute]=useState('00');const[combinedDateTime,setCombinedDateTime]=useState<Date|null>(null);useEffect(()=>{if(date){const newDateTime=new Date(date);const validHour=Math.max(0,Math.min(23,parseInt(hour,10)||0));const validMinute=Math.max(0,Math.min(59,parseInt(minute,10)||0));newDateTime.setHours(validHour,validMinute,0,0);setCombinedDateTime(newDateTime);}},[date,hour,minute]);return(<div className="pt-2">{state.message&&(<Alert variant={state.success?"default":"destructive"} className="mb-4"><AlertDescription>{state.message}</AlertDescription></Alert>)}<form action={formAction} className="space-y-4"><input type="hidden" name="raffleId" value={raffleId}/><input type="hidden" name="newLimitDate" value={combinedDateTime?.toISOString()||''}/><div><Label className='mb-2 block'>Nueva Fecha</Label><Popover><PopoverTrigger asChild><Button variant={"outline"} className={cn("w-full justify-start text-left font-normal",!date&&"text-muted-foreground")}><CalendarIcon className="mr-2 h-4 w-4"/>{date?format(date,"PPP",{locale:es}):<span>Selecciona una fecha</span>}</Button></PopoverTrigger><PopoverContent className="w-auto p-0"><Calendar mode="single" selected={date} onSelect={setDate} initialFocus disabled={(day)=>day<new Date(new Date().setDate(new Date().getDate()-1))}/></PopoverContent></Popover></div><div className="grid grid-cols-2 gap-2"><div><Label htmlFor="hour">Hora (24h)</Label><Input id="hour" type="number" value={hour} onChange={(e)=>setHour(e.target.value)} min="0" max="23"/></div><div><Label htmlFor="minute">Minutos</Label><Input id="minute" type="number" value={minute} onChange={(e)=>setMinute(e.target.value)} min="0" max="59"/></div></div><Button type="submit" variant="outline" className="w-full" disabled={!combinedDateTime}>Confirmar Posposición</Button></form></div>);}

// --- TABLA DE TICKETS (Sin cambios) ---
const unifiedColumns: ColumnDef<UnifiedTicketInfo>[] = [
    { accessorKey: "ticketNumber", header: "Número", cell: ({ row }) => <div className="font-mono text-base font-bold text-slate-800">{row.getValue("ticketNumber")}</div> },
    {
        accessorKey: "buyerName", header: "Comprador", cell: ({ row }) => {
            const ticket = row.original;
            if (!ticket.buyerName) { return <span className="text-gray-400 italic">Disponible</span>; }
            return (<div className="text-left"><div className="font-medium text-sm">{ticket.buyerName}</div><div className="text-xs text-muted-foreground">{ticket.buyerEmail}</div></div>);
        }
    },
    {
        accessorKey: "purchaseStatus", header: "Estado", cell: ({ row }) => getStatusBadge(row.getValue("purchaseStatus")),
        filterFn: (row, id, value) => {
            if (!value.length) return true;
            const status = row.getValue(id);
            const ticketStatus = row.original.ticketStatus;
            if (value.includes('available')) { return ticketStatus === 'available' || value.includes(status); }
            return value.includes(status);
        },
    },
    {
        id: "actions", header: "Acciones", cell: ({ row }) => {
            const ticket = row.original;
            if (ticket.purchase) { return <PurchaseDetailsModal purchase={ticket.purchase as any} />; }
            return null;
        },
    },
];
function UnifiedDataTable({ data }: { data: UnifiedTicketInfo[] }) {
    const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
    const [globalFilter, setGlobalFilter] = useState('');
    const table = useReactTable({ data, columns: unifiedColumns, getCoreRowModel: getCoreRowModel(), getPaginationRowModel: getPaginationRowModel(), onColumnFiltersChange: setColumnFilters, onGlobalFilterChange: setGlobalFilter, getFilteredRowModel: getFilteredRowModel(), state: { columnFilters, globalFilter },
        globalFilterFn: (row, _, filterValue) => {
            const searchTerm = filterValue.toLowerCase();
            return row.original.ticketNumber.includes(searchTerm) || row.original.buyerName?.toLowerCase().includes(searchTerm) || row.original.buyerEmail?.toLowerCase().includes(searchTerm);
        },
    });

    return (
        <div>
            <div className="flex flex-col sm:flex-row items-center py-4 gap-4">
                <div className="relative w-full sm:flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input placeholder="Buscar ticket, nombre, email..." value={globalFilter} onChange={(e) => setGlobalFilter(e.target.value)} className="pl-10" />
                </div>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild><Button variant="outline" className="w-full sm:w-auto sm:ml-auto">Estado <ChevronDown className="ml-2 h-4 w-4" /></Button></DropdownMenuTrigger>
                    <DropdownMenuContent align="end">{['available', 'confirmed', 'pending', 'rejected'].map((status) => (<DropdownMenuCheckboxItem key={status} className="capitalize" checked={table.getColumn("purchaseStatus")?.getFilterValue()?.includes(status)??false} onCheckedChange={(value)=>{const currentFilter=table.getColumn("purchaseStatus")?.getFilterValue()as string[]|undefined||[];const newFilter=value?[...currentFilter,status]:currentFilter.filter(s=>s!==status);table.getColumn("purchaseStatus")?.setFilterValue(newFilter.length?newFilter:undefined);}}>{status==='confirmed'?'Confirmado':status==='pending'?'Pendiente':status==='rejected'?'Rechazado':'Disponible'}</DropdownMenuCheckboxItem>))}</DropdownMenuContent>
                </DropdownMenu>
            </div>
            <div>
                <Table>
                    <TableHeader>
                        {table.getHeaderGroups().map(hg => (
                            <TableRow key={hg.id} className="hidden md:table-row">
                                {hg.headers.map(h => (
                                    <TableHead key={h.id} className={cn(
                                        h.id === 'ticketNumber' && 'w-[100px]',
                                        h.id === 'purchaseStatus' && 'w-[130px]',
                                        h.id === 'actions' && 'w-[120px] text-right',
                                    )}>
                                        {flexRender(h.column.columnDef.header, h.getContext())}
                                    </TableHead>
                                ))}
                            </TableRow>
                        ))}
                    </TableHeader>
                    <TableBody>
                        {table.getRowModel().rows?.length ? (
                            table.getRowModel().rows.map((row) => (
                                <TableRow key={row.id} className="block rounded-lg border bg-card text-card-foreground shadow-sm mb-4 md:table-row md:border-b md:shadow-none md:mb-0">
                                    {row.getVisibleCells().map((cell) => (
                                        <TableCell key={cell.id} className="flex items-center justify-between gap-2 p-3 border-b last:border-b-0 md:table-cell md:p-4 md:border-b before:content-[attr(data-label)] before:font-semibold before:text-sm md:before:content-[]" data-label={flexRender(cell.column.columnDef.header, cell.getContext()) as string + ':'}>
                                            <div className="text-right md:text-left w-full">{flexRender(cell.column.columnDef.cell, cell.getContext())}</div>
                                        </TableCell>
                                    ))}
                                </TableRow>
                            ))
                        ) : (<TableRow><TableCell colSpan={unifiedColumns.length} className="h-24 text-center">No se encontraron resultados.</TableCell></TableRow>)}
                    </TableBody>
                </Table>
            </div>
            <div className="flex items-center justify-between space-x-2 py-4">
                <div className="flex-1 text-sm text-muted-foreground">{table.getFilteredRowModel().rows.length} de {data.length} ticket(s).</div>
                <div className="flex gap-2"><Button variant="outline" size="sm" onClick={()=>table.previousPage()} disabled={!table.getCanPreviousPage()}>Anterior</Button><Button variant="outline" size="sm" onClick={()=>table.nextPage()} disabled={!table.getCanNextPage()}>Siguiente</Button></div>
            </div>
        </div>
    );
}

// --- TABLA DE VENTAS (Sin cambios) ---
const salesColumns: ColumnDef<PurchaseWithTickets>[] = [
    {
        accessorKey: "buyerName", header: "Comprador", cell: ({ row }) => {
            const p = row.original;
            return (<div className="text-left"><div className="font-medium text-sm">{p.buyerName || 'N/A'}</div><div className="text-xs text-muted-foreground">{p.buyerEmail}</div></div>);
        },
    },
    { accessorKey: "status", header: "Estado", cell: ({ row }) => getStatusBadge(row.getValue("status"))},
    { accessorKey: "ticketCount", header: "Tickets", cell: ({ row }) => <div className="font-medium">{row.getValue("ticketCount")}</div> },
    { id: "actions", header: "Acciones", cell: ({ row }) => <PurchaseDetailsModal purchase={row.original as any}/> },
];
function SalesDataTable({ data }: { data: PurchaseWithTickets[] }) {
    const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
    const [globalFilter, setGlobalFilter] = useState('');
    const table = useReactTable({ data, columns: salesColumns, getCoreRowModel: getCoreRowModel(), getPaginationRowModel: getPaginationRowModel(), onColumnFiltersChange: setColumnFilters, onGlobalFilterChange: setGlobalFilter, getFilteredRowModel: getFilteredRowModel(), state: { columnFilters, globalFilter },
        globalFilterFn: (row, _, filterValue) => {
             const searchTerm = filterValue.toLowerCase();
             return row.original.buyerName?.toLowerCase().includes(searchTerm) || row.original.buyerEmail?.toLowerCase().includes(searchTerm);
        },
    });

    return (
        <div>
             <div className="flex flex-col sm:flex-row items-center py-4 gap-4">
                <div className="relative w-full sm:flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input placeholder="Buscar por nombre o email..." value={globalFilter} onChange={(e) => setGlobalFilter(e.target.value)} className="pl-10" />
                </div>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild><Button variant="outline" className="w-full sm:w-auto sm:ml-auto">Estado <ChevronDown className="ml-2 h-4 w-4" /></Button></DropdownMenuTrigger>
                    <DropdownMenuContent align="end">{['confirmed', 'pending', 'rejected'].map((status) => (<DropdownMenuCheckboxItem key={status} className="capitalize" checked={table.getColumn("status")?.getFilterValue()?.includes(status)??false} onCheckedChange={(value)=>{const currentFilter=table.getColumn("status")?.getFilterValue()as string[]|undefined||[];const newFilter=value?[...currentFilter,status]:currentFilter.filter(s=>s!==status);table.getColumn("status")?.setFilterValue(newFilter.length?newFilter:undefined);}}>{status==='confirmed'?'Confirmado':status==='pending'?'Pendiente':'Rechazado'}</DropdownMenuCheckboxItem>))}</DropdownMenuContent>
                </DropdownMenu>
            </div>
            <div>
                <Table>
                    <TableHeader>
                         {table.getHeaderGroups().map(hg => (
                            <TableRow key={hg.id} className="hidden md:table-row">
                                {hg.headers.map(h => (
                                    <TableHead key={h.id} className={cn(
                                        h.id === 'status' && 'w-[130px]',
                                        h.id === 'ticketCount' && 'w-[100px] text-center',
                                        h.id === 'ticketNumbers' && 'w-[140px]',
                                        h.id === 'actions' && 'w-[120px] text-right',
                                    )}>
                                        {flexRender(h.column.columnDef.header, h.getContext())}
                                    </TableHead>
                                ))}
                            </TableRow>
                        ))}
                    </TableHeader>
                    <TableBody>
                        {table.getRowModel().rows?.length ? (
                             table.getRowModel().rows.map((row) => (
                                <TableRow key={row.id} className="block rounded-lg border bg-card text-card-foreground shadow-sm mb-4 md:table-row md:border-b md:shadow-none md:mb-0">
                                    {row.getVisibleCells().map((cell) => (
                                        <TableCell key={cell.id} className="flex items-center justify-between gap-2 p-3 border-b last:border-b-0 md:table-cell md:p-4 md:border-b before:content-[attr(data-label)] before:font-semibold before:text-sm md:before:content-[]" data-label={flexRender(cell.column.columnDef.header, cell.getContext()) as string + ':'}>
                                            <div className={cn("w-full", cell.column.id === 'ticketCount' ? 'text-center' : 'text-right md:text-left')}>
                                                {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                            </div>
                                        </TableCell>
                                    ))}
                                </TableRow>
                            ))
                        ) : (<TableRow><TableCell colSpan={salesColumns.length} className="h-24 text-center">No se encontraron ventas.</TableCell></TableRow>)}
                    </TableBody>
                </Table>
            </div>
             <div className="flex items-center justify-between space-x-2 py-4">
                <div className="flex-1 text-sm text-muted-foreground">{table.getFilteredRowModel().rows.length} de {data.length} venta(s).</div>
                <div className="flex gap-2"><Button variant="outline" size="sm" onClick={()=>table.previousPage()} disabled={!table.getCanPreviousPage()}>Anterior</Button><Button variant="outline" size="sm" onClick={()=>table.nextPage()} disabled={!table.getCanNextPage()}>Siguiente</Button></div>
            </div>
        </div>
    );
}

// --- COMPONENTE PRINCIPAL (MODIFICADO) ---
export function RaffleDetailView({ initialRaffle, topBuyers }: { initialRaffle: RaffleWithRelations; topBuyers: TopBuyer[]; }) {
    const [isEditing, setIsEditing] =useState(false); const raffle = initialRaffle;
    const isDrawDay = new Date(raffle.limitDate) <= new Date() && raffle.status === 'active';
    const ticketsSoldCount = useMemo(() => raffle.tickets.filter(t => t.status === 'sold').length, [raffle.tickets]);
    const confirmedRevenue = useMemo(() => raffle.purchases.filter(p => p.status === 'confirmed').reduce((sum, p) => sum + parseFloat(p.amount), 0), [raffle.purchases]);
    const formatCurrency = (amount: number|string, currency: 'USD'|'VES') => new Intl.NumberFormat('es-VE', { style: 'currency', currency, minimumFractionDigits: 2 }).format(typeof amount === 'string' ? parseFloat(amount) : amount);
    const stats=[{title:"Compras Totales",value:raffle.purchases.length,icon:Users},{title:"Tickets Vendidos",value:ticketsSoldCount.toLocaleString(),icon:Ticket},{title:"Ingresos",value:formatCurrency(confirmedRevenue,raffle.currency),icon:DollarSign,color:"text-blue-600"},{title:"Fecha Sorteo",value:new Date(raffle.limitDate).toLocaleDateString('es-VE'),icon:CalendarIcon},];
    const unifiedTicketsData = useMemo(() => { const purchasesMap = new Map(raffle.purchases.map(p => [p.id, p])); return raffle.tickets.map(t => { const p = t.purchaseId ? purchasesMap.get(t.purchaseId) : null; return { id: t.id, ticketNumber: t.ticketNumber, ticketStatus: t.status, buyerName: p?.buyerName ?? null, buyerEmail: p?.buyerEmail ?? null, purchaseStatus: p?.status ?? null, purchase: p, } }); }, [raffle.tickets, raffle.purchases]);
    const purchasesWithTicketsData = useMemo(() => { const ticketsByPurchaseId = raffle.tickets.reduce<Record<string, string[]>>((acc, t) => { if (t.purchaseId) { if (!acc[t.purchaseId]) { acc[t.purchaseId] = []; } acc[t.purchaseId].push(t.ticketNumber); } return acc; }, {}); return raffle.purchases.map(p => ({ ...p, ticketNumbers: ticketsByPurchaseId[p.id]?.sort((a,b) => a.localeCompare(b, undefined, {numeric: true})) || [] })).sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()); }, [raffle.purchases, raffle.tickets]);
    if(isEditing){return<EditRaffleForm raffle={raffle} onCancel={()=>setIsEditing(false)}/>}

    return (
        <div className="bg-slate-50 min-h-screen">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
                <Link href="/rifas" className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 transition-colors mb-6"><ArrowLeft className="h-4 w-4"/> Volver a todas las rifas</Link>
                <header className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div className="space-y-1"><div className="flex flex-wrap items-center gap-2"><h1 className="text-2xl md:text-3xl font-bold text-gray-900">{raffle.name}</h1>{getRaffleStatusBadge(raffle.status)}</div><p className="text-gray-600">Detalles y gestión de la rifa.</p></div>
                    <div className="flex items-center gap-2 flex-shrink-0">{raffle.status==='draft'&&(<Button variant="outline" size="sm" onClick={()=>setIsEditing(true)}><Edit className="h-4 w-4 mr-1"/> Editar</Button>)}<StatusActions raffle={raffle}/></div>
                </header>
                {isDrawDay&&(<Alert variant="default" className="mb-8 bg-yellow-100 border-yellow-300 text-yellow-800"><AlertTriangle className="h-5 w-5"/><AlertTitle className="font-bold">¡Es Día del Sorteo!</AlertTitle><AlertDescription>La fecha límite ha llegado. Finaliza la rifa para detener la venta y poder registrar al ganador.</AlertDescription></Alert>)}
                
                <main className="flex flex-col lg:flex-row gap-8 items-start">
                    <div className="flex-1 w-full space-y-8">
                        <ImageCarousel images={raffle.images}/>
                        <Card className="w-full">
                            <CardHeader>
                                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3">
                                    <div>
                                        <CardTitle className="flex items-center gap-2 text-xl"><ListChecks className="h-6 w-6"/> Gestión de Participantes</CardTitle>
                                        {/* ✅ 2. Descripción actualizada */}
                                        <CardDescription className="mt-1">Visualiza los datos por tickets, ventas o en el tablero interactivo.</CardDescription>
                                    </div>
                                    {/* ✅ 3. Contenedor para alinear los botones */}
                                    <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                                        {/* ✅ 4. Botón agregado para ir al Bingo */}
                                        <Link href={`/rifas/${raffle.id}/bingo`} passHref>
                                            <Button variant="outline" className="w-full sm:w-auto flex-shrink-0">
                                                <LayoutGrid className="mr-2 h-4 w-4"/> Ver Tablero (Bingo)
                                            </Button>
                                        </Link>
                                        {/* ✅ 5. Botón agregado para ir al analytics */}
                                        <Link href={`/rifas/${raffle.id}/analytics`} passHref>
                                            <Button variant="outline" className="w-full sm:w-auto flex-shrink-0">
                                                <LayoutGrid className="mr-2 h-4 w-4"/> Ver Analísis por Referido (Bingo)
                                            </Button>
                                        </Link>
                                        <Link href={`/rifas/${raffle.id}/ventas`} passHref>
                                            <Button variant="outline" className="w-full sm:w-auto flex-shrink-0">
                                                <BarChart2 className="mr-2 h-4 w-4"/> Analizar Ventas
                                            </Button>
                                        </Link>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent><Tabs defaultValue="tickets" className="w-full"><TabsList className="grid w-full grid-cols-2"><TabsTrigger value="tickets">Por Ticket</TabsTrigger><TabsTrigger value="ventas">Por Venta</TabsTrigger></TabsList><TabsContent value="tickets" className="mt-4"><UnifiedDataTable data={unifiedTicketsData}/></TabsContent><TabsContent value="ventas" className="mt-4"><SalesDataTable data={purchasesWithTicketsData}/></TabsContent></Tabs></CardContent>
                        </Card>
                    </div>

                    <aside className="w-full lg:w-80 xl:w-96 lg:sticky top-8 self-start space-y-6">
                        <Accordion type="multiple" defaultValue={['stats','winner']} className="w-full">
                            <AccordionItem value="stats"><AccordionTrigger className="text-lg font-semibold"><div className="flex items-center gap-2"><BarChart2 className="h-5 w-5"/> Estadísticas</div></AccordionTrigger><AccordionContent className="pt-4"><div className="flex flex-wrap gap-4">{stats.map((stat)=>(<div key={stat.title} className="flex-1 min-w-[120px] p-3 bg-gray-50 rounded-lg border"><stat.icon className="h-5 w-5 text-gray-500 mb-1"/><p className="text-xs text-gray-600">{stat.title}</p><p className={`text-lg font-bold ${stat.color||'text-gray-900'}`}>{stat.value}</p></div>))}</div></AccordionContent></AccordionItem>
                            {raffle.status==='finished'&&(<AccordionItem value="winner"><AccordionTrigger className="text-lg font-semibold"><div className="flex items-center gap-2"><Award className="h-5 w-5"/> Ganador</div></AccordionTrigger><AccordionContent className="pt-4 space-y-4">{raffle.winnerTicketId&&raffle.winnerTicket?(<div className="space-y-4 text-sm"><div><Label>Número Sorteado</Label><p className="text-2xl font-bold">{raffle.winnerLotteryNumber}</p></div><div><Label>Ganador</Label><p className="font-semibold text-lg">{raffle.winnerTicket?.purchase?.buyerName??"Sin nombre"}</p><p className="text-sm text-gray-600">{raffle.winnerTicket?.purchase?.buyerEmail}</p>{raffle.winnerTicket?.purchase?.buyerPhone&&(<div className="mt-2 flex flex-col items-start gap-2"><a href={`tel:${raffle.winnerTicket.purchase.buyerPhone}`} className="flex items-center gap-2 text-sm text-blue-600 hover:underline"><Phone className="h-4 w-4"/> {raffle.winnerTicket.purchase.buyerPhone}</a><a href={`https://wa.me/${raffle.winnerTicket.purchase.buyerPhone.replace(/\D/g,'')}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-sm text-green-600 hover:underline"><MessageSquare className="h-4 w-4"/> Enviar WhatsApp</a></div>)}</div>{raffle.winnerProofUrl&&<div><Label>Prueba del Sorteo</Label><a href={raffle.winnerProofUrl} target="_blank" rel="noopener noreferrer"><Image src={raffle.winnerProofUrl} alt="Prueba del sorteo" width={400} height={200} className="rounded-md object-cover mt-1 border"/></a></div>}</div>):(<DrawWinnerForm raffleId={raffle.id}/>)}</AccordionContent></AccordionItem>)}
                            {topBuyers.length>0&&(<AccordionItem value="top-buyers"><AccordionTrigger className="text-lg font-semibold"><div className="flex items-center gap-2"><Star className="h-5 w-5"/> Top Compradores</div></AccordionTrigger><AccordionContent className="pt-4"><ul className="space-y-4">{topBuyers.map((buyer,index)=>(<li key={`${buyer.buyerEmail}-${index}`} className="flex items-center justify-between"><div className="flex items-center gap-3 overflow-hidden"><span className={`flex items-center justify-center h-8 w-8 rounded-full font-bold text-sm flex-shrink-0 ${index===0?'bg-yellow-400 text-white':index===1?'bg-gray-300 text-gray-700':index===2?'bg-yellow-700 text-white':'bg-gray-100'}`}>{index+1}</span><div className="truncate"><p className="font-semibold text-gray-800 truncate">{buyer.buyerName}</p><p className="text-xs text-gray-500 truncate">{buyer.buyerEmail}</p></div></div><Badge variant="secondary" className="text-base flex-shrink-0">{buyer.totalTickets}</Badge></li>))}</ul></AccordionContent></AccordionItem>)}
                            <AccordionItem value="info"><AccordionTrigger className="text-lg font-semibold"><div className="flex items-center gap-2"><Info className="h-5 w-5"/> Información</div></AccordionTrigger><AccordionContent className="pt-4 space-y-4 text-sm"><div><p className="font-semibold text-gray-800">Precio por Ticket</p><p className="text-blue-600 font-bold text-lg">{formatCurrency(raffle.price,raffle.currency)}</p></div><div><p className="font-semibold text-gray-800">Tickets Mínimos</p><p>{raffle.minimumTickets.toLocaleString()}</p></div><div><p className="font-semibold text-gray-800">Descripción</p><p className="text-gray-600">{raffle.description||'Sin descripción.'}</p></div></AccordionContent></AccordionItem>
                        </Accordion>
                    </aside>
                </main>
            </div>
        </div>
    );
}