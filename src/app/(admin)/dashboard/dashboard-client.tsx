"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { PurchaseDetailsModal } from '@/components/rifas/purchase-details-modal';
import { DollarSign, ShoppingCart, Clock, CheckCircle, Trophy, BarChart2, Ticket, ChevronDown, ChevronRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import CountUp from 'react-countup';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Fragment, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';

// --- TIPOS DE DATOS ---
type PurchaseWithTickets = {
    id: string;
    buyerName: string | null;
    buyerEmail: string;
    ticketCount: number;
    amount: string;
    raffle: { name: string; currency: "USD" | "VES"; };
    tickets?: { ticketNumber: string }[]; // 'tickets' es opcional
};

type TopPurchase = {
    id: string;
    buyerName: string | null;
    ticketCount: number;
    amount: string;
    raffle: {
        name: string;
        currency: "USD" | "VES";
    };
    tickets?: { ticketNumber: string }[]; // 'tickets' es opcional
}

type DashboardClientProps = {
    stats: {
        totalPurchases: number;
        pendingPurchases: number;
        confirmedPurchases: number;
    };
    revenueUsd: number;
    revenueVes: number;
    pendingPurchasesList: PurchaseWithTickets[];
    topPurchasesList: TopPurchase[];
};

// --- COMPONENTE AUXILIAR para agrupar tickets ---
function groupTickets(tickets?: { ticketNumber: string }[]): string[] {
    if (!tickets || tickets.length === 0) {
        return [];
    }
    const ticketNumbers = tickets.map(t => parseInt(t.ticketNumber, 10)).sort((a, b) => a - b);
    const ranges: string[] = [];
    let start = ticketNumbers[0];
    let end = ticketNumbers[0];
    for (let i = 1; i < ticketNumbers.length; i++) {
        const current = ticketNumbers[i];
        const prev = ticketNumbers[i - 1];
        if (current === prev + 1) {
            end = current;
        } else {
            if (start === end) { ranges.push(String(start).padStart(4, '0')); }
            else { ranges.push(`${String(start).padStart(4, '0')}-${String(end).padStart(4, '0')}`); }
            start = current;
            end = current;
        }
    }
    if (start === end) { ranges.push(String(start).padStart(4, '0')); }
    else { ranges.push(`${String(start).padStart(4, '0')}-${String(end).padStart(4, '0')}`); }
    return ranges;
}

// --- COMPONENTES DE UI REUTILIZABLES ---

const StatCard = ({ title, value, icon: Icon, isCurrency = false, currencySymbol = '' }: { title: string, value: number, icon: React.ElementType, isCurrency?: boolean, currencySymbol?: string }) => (
    <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{title}</CardTitle>
            <Icon className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
            <div className="text-2xl font-bold">
                {currencySymbol}
                <CountUp end={value} separator="." decimal="," decimals={isCurrency ? 2 : 0} duration={1.5} />
            </div>
        </CardContent>
    </Card>
);

const PurchaseStatusChart = ({ confirmed, pending }: { confirmed: number, pending: number }) => {
    const data = [{ name: 'Confirmadas', value: confirmed }, { name: 'Pendientes', value: pending }];
    const COLORS = ['#10B981', '#F59E0B'];
    if (confirmed === 0 && pending === 0) {
        return <div className="flex flex-col items-center justify-center h-40 text-center text-muted-foreground"><BarChart2 className="mx-auto h-8 w-8 mb-2" /><p>Sin datos de compras.</p></div>
    }
    return (
        <ResponsiveContainer width="100%" height={160}>
            <PieChart>
                <Tooltip contentStyle={{ background: 'hsl(var(--background) / 0.8)', backdropFilter: 'blur(4px)', borderRadius: '0.5rem', border: '1px solid hsl(var(--border))' }} />
                <Pie data={data} innerRadius={50} outerRadius={70} fill="#8884d8" paddingAngle={5} dataKey="value" stroke="none" cornerRadius={5}>
                    {data.map((_, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                </Pie>
            </PieChart>
        </ResponsiveContainer>
    );
};

// --- COMPONENTES ESPECÍFICOS PARA EL DASHBOARD ---

function TicketDetailContent({ purchase }: { purchase: PurchaseWithTickets }) {
    const sortedTickets = useMemo(() =>
        [...(purchase.tickets || [])].sort((a, b) => a.ticketNumber.localeCompare(b.ticketNumber, undefined, { numeric: true })),
        [purchase.tickets]
    );
    return (
        <div className="p-4 bg-slate-100 dark:bg-slate-900">
            <h4 className="font-semibold text-xs mb-2 text-gray-700 dark:text-gray-300 uppercase tracking-wider">Tickets Asignados ({purchase.tickets?.length || 0})</h4>
            <div className="flex flex-wrap gap-1">
                {sortedTickets.length > 0 ? (
                    sortedTickets.map(({ ticketNumber }) => (<Badge key={ticketNumber} variant="secondary" className="font-mono text-xs">{ticketNumber}</Badge>))
                ) : (
                    <p className="text-sm text-muted-foreground italic">No hay tickets asignados a esta venta.</p>
                )}
            </div>
        </div>
    );
}

function TopPurchaseItem({ purchase }: { purchase: TopPurchase }) {
    const [isOpen, setIsOpen] = useState(false);
    const groupedTicketRanges = useMemo(() => groupTickets(purchase.tickets), [purchase.tickets]);

    return (
        <Collapsible open={isOpen} onOpenChange={setIsOpen} className="space-y-2">
            <div className="flex items-center justify-between gap-2 text-sm">
                <div className="flex-grow min-w-0">
                    <p className="font-semibold truncate">{purchase.buyerName || 'Comprador Anónimo'}</p>
                    <p className="text-xs text-muted-foreground truncate">en {purchase.raffle.name}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                    <Badge variant="secondary" className="font-semibold">
                        {purchase.raffle.currency === 'VES' ? 'Bs.' : '$'}
                        {parseFloat(purchase.amount).toFixed(2)}
                    </Badge>
                    {(purchase.tickets?.length ?? 0) > 0 && (
                        <CollapsibleTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                                {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                                <span className="sr-only">{isOpen ? 'Ocultar tickets' : 'Mostrar tickets'}</span>
                            </Button>
                        </CollapsibleTrigger>
                    )}
                </div>
            </div>
            <CollapsibleContent>
                <div className="pl-2 pt-2 border-l-2 ml-1 border-dashed">
                    <div className="flex flex-wrap gap-1.5">
                        <Badge variant="outline" className="sm:hidden">
                            <Ticket className="h-3 w-3 mr-1.5" />
                            {purchase.ticketCount} tickets
                        </Badge>
                        {groupedTicketRanges.map((range, index) => (
                            <Badge key={index} variant="secondary" className="font-mono text-xs"><Ticket className="h-3 w-3 mr-1" />{range}</Badge>
                        ))}
                    </div>
                </div>
            </CollapsibleContent>
        </Collapsible>
    );
}

// --- COMPONENTE PRINCIPAL DEL CLIENTE ---
export function DashboardClient({ stats, revenueUsd, revenueVes, pendingPurchasesList, topPurchasesList }: DashboardClientProps) {

    const containerVariants = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.07 } } };
    const itemVariants = { hidden: { y: 20, opacity: 0 }, visible: { y: 0, opacity: 1, transition: { type: 'spring', stiffness: 100 } } };

    return (
        <motion.div className="space-y-4 md:space-y-8" initial="hidden" animate="visible" variants={containerVariants}>
            <motion.div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4" variants={containerVariants}>
                <motion.div variants={itemVariants}><StatCard title="Total Compras" value={stats.totalPurchases} icon={ShoppingCart} /></motion.div>
                <motion.div variants={itemVariants}><StatCard title="Pendientes" value={stats.pendingPurchases} icon={Clock} /></motion.div>
                <motion.div variants={itemVariants}><StatCard title="Confirmadas" value={stats.confirmedPurchases} icon={CheckCircle} /></motion.div>
                <motion.div variants={itemVariants}><StatCard title="Ingresos (USD)" value={revenueUsd} icon={DollarSign} isCurrency currencySymbol="$" /></motion.div>
            </motion.div>
            <motion.div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-8" variants={containerVariants}>
                <motion.div className="lg:col-span-2" variants={itemVariants}>
                    <Card className="h-full">
                        <CardHeader><CardTitle>Revisión de Compras Pendientes</CardTitle><CardDescription>Las 5 compras más recientes que requieren tu atención.</CardDescription></CardHeader>
                        <CardContent>
                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader><TableRow><TableHead>Comprador</TableHead><TableHead className="hidden sm:table-cell">Rifa</TableHead><TableHead className="text-right">Monto</TableHead><TableHead className="text-right">Acción</TableHead><TableHead /></TableRow></TableHeader>
                                    <TableBody>
                                        {pendingPurchasesList?.length > 0 ? (pendingPurchasesList.map((purchase) => (
                                            <Collapsible asChild key={purchase.id}>
                                                <Fragment>
                                                    <TableRow>
                                                        <TableCell><div className="font-medium">{purchase.buyerName}</div><div className="text-xs text-muted-foreground hidden md:block">{purchase.buyerEmail}</div></TableCell>
                                                        <TableCell className="hidden sm:table-cell">{purchase.raffle.name}</TableCell>
                                                        <TableCell className="text-right font-semibold">{purchase.raffle.currency === 'VES' ? 'Bs.' : '$'}{parseFloat(purchase.amount).toFixed(2)}</TableCell>
                                                        <TableCell className="text-right"><PurchaseDetailsModal purchase={purchase} raffleCurrency={purchase.raffle.currency} /></TableCell>
                                                        <TableCell>
                                                            {purchase.tickets?.length > 0 && (
                                                                <CollapsibleTrigger asChild><Button variant="ghost" size="icon" className="data-[state=open]:bg-accent"><ChevronDown className="h-4 w-4 transition-transform data-[state=open]:rotate-180" /></Button></CollapsibleTrigger>
                                                            )}
                                                        </TableCell>
                                                    </TableRow>
                                                    <CollapsibleContent asChild>
                                                        <TableRow><TableCell colSpan={5} className="p-0"><TicketDetailContent purchase={purchase} /></TableCell></TableRow>
                                                    </CollapsibleContent>
                                                </Fragment>
                                            </Collapsible>)))
                                            : (<TableRow><TableCell colSpan={5} className="h-24 text-center">¡Todo al día! No hay compras pendientes.</TableCell></TableRow>
                                            )}
                                    </TableBody>
                                </Table>
                            </div>
                        </CardContent>
                    </Card>
                </motion.div>
                <motion.div className="space-y-4 md:space-y-8" variants={containerVariants}>
                    <motion.div variants={itemVariants}>
                        <Card>
                            <CardHeader><CardTitle>Resumen de Compras</CardTitle></CardHeader>
                            <CardContent>
                                <PurchaseStatusChart confirmed={stats.confirmedPurchases} pending={stats.pendingPurchases} />
                                <div className="flex justify-center gap-4 text-xs mt-2 text-muted-foreground"><div className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-emerald-500"></span>Confirmadas</div><div className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-amber-500"></span>Pendientes</div></div>
                            </CardContent>
                        </Card>
                    </motion.div>
                    <motion.div variants={itemVariants}>
                        <Card>
                            <CardHeader><CardTitle className="flex items-center gap-2"><Trophy className="h-5 w-5 text-amber-500" />Top Compras</CardTitle></CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    {topPurchasesList?.length > 0 ? (topPurchasesList.map((purchase) => (
                                        <TopPurchaseItem key={purchase.id} purchase={purchase} />
                                    ))) : (<p className="text-sm text-center text-muted-foreground py-8">No hay compras destacadas.</p>)}
                                </div>
                            </CardContent>
                        </Card>
                    </motion.div>
                </motion.div>
            </motion.div>
        </motion.div>
    );
}