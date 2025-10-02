"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { PurchaseDetailsModal } from '@/components/rifas/purchase-details-modal';
import { DollarSign, ShoppingCart, Clock, CheckCircle, Trophy, BarChart2, Ticket, ChevronDown, XCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import CountUp from 'react-countup';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Fragment, useMemo } from 'react';
import { Button } from '@/components/ui/button';

// --- TIPOS DE DATOS ---
type PurchaseWithTickets = {
    id: string;
    buyerName: string | null;
    buyerEmail: string;
    ticketCount: number;
    amount: string;
    raffle: { name: string; currency: "USD" | "VES"; };
    tickets?: { ticketNumber: string }[];
};

type TopBuyer = {
    buyerName: string | null;
    buyerEmail: string;
    totalTickets: number;
    totalAmountUsd: number;
    totalAmountVes: number;
}

type DashboardClientProps = {
    stats: {
        totalPurchases: number;
        pendingPurchases: number;
        confirmedPurchases: number;
        rejectedPurchases: number;
    };
    revenueUsd: number;
    revenueVes: number;
    pendingPurchasesList: PurchaseWithTickets[];
    topBuyersList: TopBuyer[];
};


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

const PurchaseStatusChart = ({ confirmed, pending, rejected }: { confirmed: number, pending: number, rejected: number }) => {
    const originalData = [
        { name: 'Confirmadas', value: confirmed },
        { name: 'Pendientes', value: pending },
        { name: 'Rechazadas', value: rejected }
    ];
    const COLORS = ['#10B981', '#F59E0B', '#EF4444']; // Verde, Ámbar, Rojo

    const chartData = originalData.filter(entry => entry.value > 0);

    if (chartData.length === 0) {
        return <div className="flex flex-col items-center justify-center h-40 text-center text-muted-foreground"><BarChart2 className="mx-auto h-8 w-8 mb-2" /><p>Sin datos de compras.</p></div>
    }
    
    return (
        <ResponsiveContainer width="100%" height={160}>
            <PieChart>
                <Tooltip contentStyle={{ background: 'hsl(var(--background) / 0.8)', backdropFilter: 'blur(4px)', borderRadius: '0.5rem', border: '1px solid hsl(var(--border))' }} />
                <Pie data={chartData} innerRadius={50} outerRadius={70} fill="#8884d8" paddingAngle={5} dataKey="value" stroke="none" cornerRadius={5}>
                    {chartData.map((entry) => {
                        const originalIndex = originalData.findIndex(item => item.name === entry.name);
                        return <Cell key={`cell-${entry.name}`} fill={COLORS[originalIndex]} />;
                    })}
                </Pie>
            </PieChart>
        </ResponsiveContainer>
    );
};


// --- COMPONENTES ESPECÍFICOS PARA EL DASHBOARD ---

// Este componente ya no se usa en la tabla de pendientes, pero se puede mantener por si se usa en otro lugar.
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


// --- COMPONENTE PRINCIPAL DEL CLIENTE ---
export function DashboardClient({ stats, revenueUsd, revenueVes, pendingPurchasesList, topBuyersList }: DashboardClientProps) {

    const containerVariants = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.07 } } };
    const itemVariants = { hidden: { y: 20, opacity: 0 }, visible: { y: 0, opacity: 1, transition: { type: 'spring', stiffness: 100 } } };

    return (
        <motion.div className="space-y-4 md:space-y-8" initial="hidden" animate="visible" variants={containerVariants}>
            <motion.div className="grid gap-4 grid-cols-1 sm:grid-cols-3 lg:grid-cols-5" variants={containerVariants}>
                <motion.div variants={itemVariants}><StatCard title="Total Compras" value={stats.totalPurchases} icon={ShoppingCart} /></motion.div>
                <motion.div variants={itemVariants}><StatCard title="Pendientes" value={stats.pendingPurchases} icon={Clock} /></motion.div>
                <motion.div variants={itemVariants}><StatCard title="Confirmadas" value={stats.confirmedPurchases} icon={CheckCircle} /></motion.div>
                <motion.div variants={itemVariants}><StatCard title="Rechazadas" value={stats.rejectedPurchases} icon={XCircle} /></motion.div>
                <motion.div variants={itemVariants} className="sm:col-span-3 lg:col-span-1"><StatCard title="Ingresos (USD)" value={revenueUsd} icon={DollarSign} isCurrency currencySymbol="$" /></motion.div>
            </motion.div>
            <motion.div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-8" variants={containerVariants}>
                <motion.div className="lg:col-span-2" variants={itemVariants}>
                    <Card className="h-full">
                        <CardHeader><CardTitle>Revisión de Compras Pendientes</CardTitle><CardDescription>Las 5 compras más recientes que requieren tu atención.</CardDescription></CardHeader>
                        <CardContent>
                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader><TableRow><TableHead>Comprador</TableHead><TableHead className="hidden sm:table-cell">Rifa</TableHead><TableHead className="text-right">Monto</TableHead><TableHead className="text-right">Acción</TableHead></TableRow></TableHeader>
                                    <TableBody>
                                        {pendingPurchasesList?.length > 0 ? (pendingPurchasesList.map((purchase) => (
                                            // --- CÓDIGO CORREGIDO ---
                                            <TableRow key={purchase.id}>
                                                <TableCell>
                                                    <div className="font-medium">{purchase.buyerName}</div>
                                                    <div className="text-xs text-muted-foreground hidden md:block">{purchase.buyerEmail}</div>
                                                </TableCell>
                                                <TableCell className="hidden sm:table-cell">
                                                    {purchase.raffle?.name ?? <span className="text-muted-foreground italic">Rifa eliminada</span>}
                                                </TableCell>
                                                <TableCell className="text-right font-semibold">
                                                    {purchase.raffle?.currency === 'VES' ? 'Bs.' : '$'}{parseFloat(purchase.amount).toFixed(2)}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <PurchaseDetailsModal purchase={purchase} raffleCurrency={purchase.raffle?.currency} />
                                                </TableCell>
                                            </TableRow>
                                            // --- FIN DEL CÓDIGO CORREGIDO ---
                                        )))
                                        : (<TableRow><TableCell colSpan={4} className="h-24 text-center">¡Todo al día! No hay compras pendientes.</TableCell></TableRow>
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
                                <PurchaseStatusChart confirmed={stats.confirmedPurchases} pending={stats.pendingPurchases} rejected={stats.rejectedPurchases} />
                                <div className="flex justify-center flex-wrap gap-4 text-xs mt-2 text-muted-foreground">
                                    <div className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-emerald-500"></span>Confirmadas</div>
                                    <div className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-amber-500"></span>Pendientes</div>
                                    <div className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-red-500"></span>Rechazadas</div>
                                </div>
                            </CardContent>
                        </Card>
                    </motion.div>
                    
                    <motion.div variants={itemVariants}>
                        <Card>
                            <CardHeader><CardTitle className="flex items-center gap-2"><Trophy className="h-5 w-5 text-amber-500" />Top Compradores</CardTitle></CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    {topBuyersList?.length > 0 ? (
                                        topBuyersList.map((buyer) => (
                                            <div key={buyer.buyerEmail} className="flex items-center justify-between gap-2 text-sm">
                                                <div className="flex-grow min-w-0">
                                                    <p className="font-semibold truncate">{buyer.buyerName || 'Anónimo'}</p>
                                                    <p className="text-xs text-muted-foreground truncate">{buyer.buyerEmail}</p>
                                                </div>
                                                <div className="flex flex-col items-end shrink-0">
                                                    <Badge variant="secondary" className="font-semibold flex items-center gap-1.5">
                                                        <Ticket className="h-3 w-3" />
                                                        {buyer.totalTickets}
                                                    </Badge>
                                                    <p className="text-xs text-muted-foreground mt-1">
                                                        {buyer.totalAmountUsd > 0 && `$${buyer.totalAmountUsd.toFixed(2)}`}
                                                        {buyer.totalAmountUsd > 0 && buyer.totalAmountVes > 0 && ' + '}
                                                        {buyer.totalAmountVes > 0 && `Bs.${buyer.totalAmountVes.toFixed(2)}`}
                                                    </p>
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <p className="text-sm text-center text-muted-foreground py-8">No hay compras confirmadas para mostrar un ranking.</p>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    </motion.div>
                </motion.div>
            </motion.div>
        </motion.div>
    );
}