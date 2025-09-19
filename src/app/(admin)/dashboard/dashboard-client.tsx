"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { PurchaseDetailsModal } from '@/components/rifas/purchase-details-modal';
import { DollarSign, ShoppingCart, Clock, CheckCircle, Trophy, BarChart2, Ticket } from 'lucide-react';
import { motion } from 'framer-motion';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import CountUp from 'react-countup';

// --- TIPOS DE DATOS (Sin cambios) ---
type PurchaseWithRelations = {
    id: string;
    buyerName: string | null;
    buyerEmail: string;
    ticketCount: number;
    amount: string;
    raffle: { name: string; currency: "USD" | "VES"; };
};
type TopPurchase = {
    id: string;
    buyerName: string | null;
    ticketCount: number;
    raffle: { name: string };
}
type DashboardClientProps = {
    stats: {
        totalPurchases: number;
        pendingPurchases: number;
        confirmedPurchases: number;
    };
    revenueUsd: number;
    revenueVes: number;
    pendingPurchasesList: PurchaseWithRelations[];
    topPurchasesList: TopPurchase[];
};

// --- COMPONENTES AUXILIARES ---

// Tarjeta de estadística reutilizable y compacta
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

// Gráfico de estado de compras
const PurchaseStatusChart = ({ confirmed, pending }: { confirmed: number, pending: number }) => {
    const data = [
        { name: 'Confirmadas', value: confirmed },
        { name: 'Pendientes', value: pending },
    ];
    const COLORS = ['#10B981', '#F59E0B']; // Verde y Ámbar

    if (confirmed === 0 && pending === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-40 text-center text-muted-foreground">
                <BarChart2 className="mx-auto h-8 w-8 mb-2" />
                <p>Sin datos de compras.</p>
            </div>
        )
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

// --- COMPONENTE PRINCIPAL DEL CLIENTE (REDiseñado) ---
export function DashboardClient({ stats, revenueUsd, revenueVes, pendingPurchasesList, topPurchasesList }: DashboardClientProps) {

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: { opacity: 1, transition: { staggerChildren: 0.07 } }
    };

    const itemVariants = {
        hidden: { y: 20, opacity: 0 },
        visible: { y: 0, opacity: 1, transition: { type: 'spring', stiffness: 100 } }
    };

    return (
        <motion.div
            className="space-y-4 md:space-y-8"
            initial="hidden"
            animate="visible"
            variants={containerVariants}
        >
            {/* --- Grid principal para las tarjetas de estadísticas --- */}
            <motion.div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4" variants={containerVariants}>
                <motion.div variants={itemVariants}><StatCard title="Total Compras" value={stats.totalPurchases} icon={ShoppingCart} /></motion.div>
                <motion.div variants={itemVariants}><StatCard title="Pendientes" value={stats.pendingPurchases} icon={Clock} /></motion.div>
                <motion.div variants={itemVariants}><StatCard title="Confirmadas" value={stats.confirmedPurchases} icon={CheckCircle} /></motion.div>
                <motion.div variants={itemVariants}><StatCard title="Ingresos (USD)" value={revenueUsd} icon={DollarSign} isCurrency currencySymbol="$" /></motion.div>
            </motion.div>

            {/* --- Grid para el contenido principal --- */}
            <motion.div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-8" variants={containerVariants}>
                
                {/* Columna Izquierda: Compras Pendientes */}
                <motion.div className="lg:col-span-2" variants={itemVariants}>
                    <Card className="h-full">
                        <CardHeader>
                            <CardTitle>Revisión de Compras Pendientes</CardTitle>
                            <CardDescription>Las 5 compras más recientes que requieren tu atención.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Comprador</TableHead>
                                        <TableHead className="hidden sm:table-cell">Rifa</TableHead>
                                        <TableHead className="text-right">Monto</TableHead>
                                        <TableHead className="text-right">Acción</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {pendingPurchasesList.length > 0 ? (
                                        pendingPurchasesList.map((purchase) => (
                                            <TableRow key={purchase.id}>
                                                <TableCell>
                                                    <div className="font-medium">{purchase.buyerName}</div>
                                                    <div className="text-xs text-muted-foreground hidden md:block">{purchase.buyerEmail}</div>
                                                </TableCell>
                                                <TableCell className="hidden sm:table-cell">{purchase.raffle.name}</TableCell>
                                                <TableCell className="text-right font-semibold">
                                                    {purchase.raffle.currency === 'VES' ? 'Bs.' : '$'}{parseFloat(purchase.amount).toFixed(2)}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <PurchaseDetailsModal purchase={purchase} raffleCurrency={purchase.raffle.currency} />
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    ) : (
                                        <TableRow>
                                            <TableCell colSpan={4} className="h-24 text-center">¡Todo al día! No hay compras pendientes.</TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </motion.div>

                {/* Columna Derecha: Resumen y Top Compras */}
                <motion.div className="space-y-4 md:space-y-8" variants={containerVariants}>
                    <motion.div variants={itemVariants}>
                        <Card>
                            <CardHeader>
                                <CardTitle>Resumen de Compras</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <PurchaseStatusChart confirmed={stats.confirmedPurchases} pending={stats.pendingPurchases} />
                                <div className="flex justify-center gap-4 text-xs mt-2 text-muted-foreground">
                                    <div className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-emerald-500"></span>Confirmadas</div>
                                    <div className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-amber-500"></span>Pendientes</div>
                                </div>
                            </CardContent>
                        </Card>
                    </motion.div>
                    <motion.div variants={itemVariants}>
                        <Card>
                            <CardHeader>
                                <CardTitle>Top Compras por Tickets</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {topPurchasesList.length > 0 ? (
                                    topPurchasesList.map((purchase) => (
                                        <div key={purchase.id} className="flex items-center justify-between gap-4 text-sm">
                                            <div>
                                                <p className="font-semibold truncate">{purchase.buyerName}</p>
                                                <p className="text-xs text-muted-foreground truncate">en {purchase.raffle.name}</p>
                                            </div>
                                            <Badge variant="secondary" className="flex items-center gap-1 shrink-0">
                                                <Ticket className="h-3 w-3" />
                                                {purchase.ticketCount}
                                            </Badge>
                                        </div>
                                    ))
                                ) : (
                                    <p className="text-sm text-center text-muted-foreground py-8">No hay compras destacadas.</p>
                                )}
                            </CardContent>
                        </Card>
                    </motion.div>
                </motion.div>
            </motion.div>
        </motion.div>
    );
}