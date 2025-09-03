// app/dashboard/dashboard-client.tsx

"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from '@/components/ui/badge';
import { PurchaseDetailsModal } from '@/components/rifas/purchase-details-modal';
import { DollarSign, ShoppingCart, Clock, CheckCircle, AlertTriangle, Trophy, Users, BarChart2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import CountUp from 'react-countup';

// Tipos de datos que el componente recibirá como props
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

// Componente para animar los números
const AnimatedCounter = ({ value, isCurrency = false }: { value: number, isCurrency?: boolean }) => {
    return (
        <CountUp
            end={value}
            separator="."
            duration={1.8}
            decimals={isCurrency ? 2 : 0}
            decimal=","
            formattingFn={(val) => {
                const parts = val.toFixed(isCurrency ? 2 : 0).split('.');
                parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.'); // Miles
                return isCurrency ? `${parts[0]},${parts[1]}` : parts[0];
            }}
        />
    );
};

// Componente para el gráfico de dona
const PurchaseStatusChart = ({ confirmed, pending }: { confirmed: number, pending: number }) => {
    const data = [
        { name: 'Confirmadas', value: confirmed },
        { name: 'Pendientes', value: pending },
    ];
    const COLORS = ['#10B981', '#F59E0B']; // Emerald y Amber para modo claro

    if (confirmed === 0 && pending === 0) {
        return (
            <div className="flex items-center justify-center h-48 text-center text-gray-500">
                <div>
                    <BarChart2 className="mx-auto h-10 w-10 mb-2 text-gray-400" />
                    <p className="text-gray-500">Aún no hay datos de compras para mostrar.</p>
                </div>
            </div>
        )
    }

    return (
        <ResponsiveContainer width="100%" height={200}>
            <PieChart>
                <Tooltip
                    cursor={{ fill: 'rgba(0,0,0,0.05)' }} // Fondo más claro para el cursor en modo claro
                    contentStyle={{
                        background: 'rgba(255, 255, 255, 0.8)', // Fondo blanco semitransparente
                        backdropFilter: 'blur(8px)', // Blur más fuerte
                        border: '1px solid rgba(0, 0, 0, 0.1)', // Borde sutil
                        borderRadius: '0.75rem',
                        color: '#333', // Texto oscuro
                        boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                    }}
                    labelStyle={{ fontWeight: 'bold' }}
                />
                <Pie
                    data={data}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    fill="#8884d8"
                    paddingAngle={5}
                    dataKey="value"
                    stroke="none"
                    cornerRadius={5} // Bordes redondeados para un look más suave
                >
                    {data.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                </Pie>
            </PieChart>
        </ResponsiveContainer>
    );
};

// --- COMPONENTE PRINCIPAL DEL CLIENTE ---
export function DashboardClient({
    stats,
    revenueUsd,
    revenueVes,
    pendingPurchasesList,
    topPurchasesList
}: DashboardClientProps) {

    // Variantes para animaciones de Framer Motion
    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                staggerChildren: 0.08 // Animación más rápida para los hijos
            }
        }
    };
    const itemVariants = {
        hidden: { y: 30, opacity: 0, scale: 0.95 },
        visible: {
            y: 0,
            opacity: 1,
            scale: 1,
            transition: {
                type: 'spring',
                stiffness: 120,
                damping: 12,
                duration: 0.5 // Duración ajustada
            }
        }
    };

    const statsCards = [
        { title: "Total Compras", value: stats.totalPurchases, icon: ShoppingCart, color: "text-blue-600" },
        { title: "Pendientes", value: stats.pendingPurchases, icon: Clock, color: "text-amber-600" },
        { title: "Confirmadas", value: stats.confirmedPurchases, icon: CheckCircle, color: "text-emerald-600" },
        { title: "Ingresos (USD)", value: revenueUsd, icon: DollarSign, isCurrency: true, currencySymbol: '$', color: "text-indigo-600" },
    ];

    const neumorphicCardStyle = "bg-white p-6 rounded-2xl shadow-neumorphic-light transition-all duration-300 ease-out hover:shadow-neumorphic-light-hover";
    const neumorphicInnerShadow = "shadow-neumorphic-inset-light";

    return (
        <motion.div
            className="space-y-10 p-6 sm:p-8 lg:p-10" // Más padding general
            initial="hidden"
            animate="visible"
            variants={containerVariants}
        >
            {/* --- Encabezado Brillante --- */}
            <motion.div variants={itemVariants} className="text-center md:text-left">
                <h1 className="text-5xl font-extrabold text-gray-900 tracking-tight leading-tight">
                    ¡Bienvenido, <span className="text-indigo-600">Admin</span>!
                </h1>
                
            </motion.div>

            {/* --- Tarjetas de Estadísticas Animadas con Neumorfismo --- */}
            <motion.div
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8" // Más gap
                variants={containerVariants}
            >
                {statsCards.map((stat) => (
                    <motion.div key={stat.title} variants={itemVariants}>
                        <Card className={`${neumorphicCardStyle} flex flex-col justify-between h-full`}>
                            <CardHeader className="flex-row items-center justify-between space-y-0 pb-3">
                                <CardTitle className="text-sm font-semibold text-gray-700">{stat.title}</CardTitle>
                                <div className={`p-2 rounded-full ${neumorphicInnerShadow} ${stat.color} bg-white transition-all duration-200`}>
                                    <stat.icon className={`h-5 w-5 `} />
                                </div>
                            </CardHeader>
                            <CardContent className="pt-2">
                                <div className={`text-4xl font-extrabold ${stat.color}`}>
                                    {stat.currencySymbol}
                                    <AnimatedCounter value={stat.value} isCurrency={stat.isCurrency} />
                                </div>
                                {stat.title === "Ingresos (USD)" && (
                                    <p className="text-sm text-gray-500 mt-1 font-medium">
                                        + Bs. <AnimatedCounter value={revenueVes} isCurrency={true} />
                                    </p>
                                )}
                            </CardContent>
                        </Card>
                    </motion.div>
                ))}
            </motion.div>

            {/* --- Contenido Principal en 2 Columnas --- */}
            <motion.div className="grid grid-cols-1 lg:grid-cols-5 gap-10" variants={containerVariants}>

                {/* --- Columna Izquierda: Compras Pendientes --- */}
                <motion.div className="lg:col-span-3" variants={itemVariants}>
                    <Card className={`${neumorphicCardStyle} h-full flex flex-col`}>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-3 text-2xl font-bold text-gray-800">
                                <AlertTriangle className="h-6 w-6 text-amber-500" />
                                Compras Pendientes de Revisión
                            </CardTitle>
                            <CardDescription className="text-gray-500 text-base">
                                Estas compras requieren tu atención inmediata para aprobación o rechazo.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="flex-grow flex flex-col">
                            {pendingPurchasesList.length === 0 ? (
                                <div className="text-center py-20 text-gray-500 flex-grow flex flex-col justify-center items-center">
                                    <motion.div
                                        initial={{ scale: 0.8, opacity: 0 }}
                                        animate={{ scale: 1, opacity: 1 }}
                                        transition={{ duration: 0.5, delay: 0.2 }}
                                    >
                                        <CheckCircle className="h-16 w-16 mx-auto text-emerald-500 mb-4 drop-shadow-lg" />
                                    </motion.div>
                                    <h3 className="font-bold text-xl text-gray-700">¡Todo al día!</h3>
                                    <p className="text-gray-500 mt-1">No hay compras pendientes de revisión.</p>
                                </div>
                            ) : (
                                <div className="overflow-x-auto flex-grow">
                                    <Table className="min-w-full">
                                        <TableHeader className="bg-gray-50 rounded-t-xl">
                                            <TableRow className="border-b border-gray-100">
                                                <TableHead className="text-gray-600 font-semibold text-sm rounded-tl-xl">Comprador</TableHead>
                                                <TableHead className="text-gray-600 font-semibold text-sm hidden sm:table-cell">Rifa</TableHead>
                                                <TableHead className="text-gray-600 font-semibold text-sm text-right">Monto</TableHead>
                                                <TableHead className="text-gray-600 font-semibold text-sm text-right rounded-tr-xl">Acciones</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <motion.tbody variants={containerVariants}>
                                            {pendingPurchasesList.map((purchase) => (
                                                <motion.tr
                                                    key={purchase.id}
                                                    variants={itemVariants}
                                                    className="border-b border-gray-50 last:border-b-0 hover:bg-gray-50 transition-colors"
                                                >
                                                    <TableCell>
                                                        <div className="font-medium text-gray-800">{purchase.buyerName}</div>
                                                        <div className="text-sm text-gray-500">{purchase.buyerEmail}</div>
                                                    </TableCell>
                                                    <TableCell className="hidden sm:table-cell text-gray-700">{purchase.raffle.name}</TableCell>
                                                    <TableCell className="text-right font-bold text-gray-800">
                                                        {purchase.raffle.currency === 'VES' ? 'Bs. ' : '$'}
                                                        {parseFloat(purchase.amount).toFixed(2)}
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        <PurchaseDetailsModal purchase={purchase} raffleCurrency={purchase.raffle.currency} />
                                                    </TableCell>
                                                </motion.tr>
                                            ))}
                                        </motion.tbody>
                                    </Table>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </motion.div>

                {/* --- Columna Derecha: Análisis y Top Compras --- */}
                <motion.div className="lg:col-span-2 space-y-8" variants={containerVariants}>
                    <motion.div variants={itemVariants}>
                        <Card className={neumorphicCardStyle}>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-3 text-2xl font-bold text-gray-800">
                                    <BarChart2 className="h-6 w-6 text-emerald-500" />
                                    Resumen de Compras
                                </CardTitle>
                                <CardDescription className="text-gray-500 text-base">
                                    Distribución de compras confirmadas vs. pendientes.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="flex flex-col items-center">
                               <PurchaseStatusChart confirmed={stats.confirmedPurchases} pending={stats.pendingPurchases} />
                               <div className="flex justify-center gap-6 text-sm mt-4 text-gray-600 font-medium">
                                   <div className="flex items-center gap-2"><span className="h-3 w-3 rounded-full bg-emerald-500 shadow-md"></span>Confirmadas</div>
                                   <div className="flex items-center gap-2"><span className="h-3 w-3 rounded-full bg-amber-500 shadow-md"></span>Pendientes</div>
                               </div>
                            </CardContent>
                        </Card>
                    </motion.div>
                    <motion.div variants={itemVariants}>
                         <Card className={neumorphicCardStyle}>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-3 text-2xl font-bold text-gray-800">
                                    <Trophy className="h-6 w-6 text-yellow-500" />
                                    Top Compras por Tickets
                                </CardTitle>
                                <CardDescription className="text-gray-500 text-base">
                                    Las 5 compras individuales con más tickets adquiridos.
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                {topPurchasesList.length === 0 ? (
                                    <div className="text-center py-10 text-gray-500">
                                        <Users className="h-12 w-12 mx-auto text-gray-400 mb-3" />
                                        <p>Aún no hay compras destacadas para mostrar.</p>
                                    </div>
                                ) : (
                                    <ul className="space-y-4">
                                        {topPurchasesList.map((purchase, index) => (
                                            <motion.li
                                                key={purchase.id}
                                                initial={{ x: -20, opacity: 0 }}
                                                animate={{ x: 0, opacity: 1 }}
                                                transition={{ delay: index * 0.05 + 0.1, type: 'spring', stiffness: 150 }}
                                                className="flex items-center justify-between gap-4 p-3 rounded-xl hover:bg-gray-50 transition-all duration-200"
                                            >
                                                <div className="flex items-center gap-4 overflow-hidden">
                                                    <span className={`flex items-center justify-center h-10 w-10 rounded-full font-extrabold text-lg flex-shrink-0
                                                        ${index === 0 ? 'bg-yellow-400 text-white shadow-lg' :
                                                          index === 1 ? 'bg-gray-300 text-gray-800 shadow-md' :
                                                          index === 2 ? 'bg-yellow-700 text-white shadow-md' : 'bg-gray-100 text-gray-600'}
                                                    `}>
                                                        {index + 1}
                                                    </span>
                                                    <div className="truncate">
                                                        <p className="font-semibold text-gray-800 truncate text-lg">{purchase.buyerName}</p>
                                                        <p className="text-sm text-gray-500 truncate">en <span className="font-medium">{purchase.raffle.name}</span></p>
                                                    </div>
                                                </div>
                                                <Badge className="bg-blue-100 text-blue-800 text-base font-bold py-1.5 px-4 rounded-full shadow-inner-neumorphic-light shrink-0">
                                                    {purchase.ticketCount} tickets
                                                </Badge>
                                            </motion.li>
                                        ))}
                                    </ul>
                                )}
                            </CardContent>
                        </Card>
                    </motion.div>
                </motion.div>
            </motion.div>
        </motion.div>
    );
}