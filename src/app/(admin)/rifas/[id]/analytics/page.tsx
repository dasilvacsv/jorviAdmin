// app/admin/rifas/[id]/analytics/page.tsx

import { getReferralAnalyticsForRaffle } from "@/lib/actions";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";

// ✅ NUEVO: Componente para renderizar la etiqueta (Badge) según el tipo de referido.
// Esto hace el código principal más limpio y fácil de leer.
const ReferralBadge = ({ type }: { type: 'personal' | 'link' | 'direct' }) => {
    switch (type) {
        case 'personal':
            // Usamos el color por defecto (principal) para los vendedores personales.
            return <Badge variant="default">Vendedor</Badge>; 
        case 'link':
            // Un estilo "outline" para las campañas de marketing.
            return <Badge variant="outline">Campaña</Badge>; 
        case 'direct':
            // Un color secundario para las ventas que no tienen referido.
            return <Badge variant="secondary">Directo</Badge>; 
        default:
            return null;
    }
};


export default async function RaffleAnalyticsPage({ params }: { params: { id: string } }) {
    const result = await getReferralAnalyticsForRaffle(params.id);

    if (!result.success || !result.data) {
        return (
            <div className="container mx-auto py-10">
                <h1 className="text-2xl font-bold text-red-500">Error</h1>
                <p>{result.message || "No se pudieron cargar las analíticas."}</p>
            </div>
        );
    }

    const { raffle, analytics } = result.data;
    const totalConfirmedRevenue = analytics.reduce((sum, item) => sum + item.confirmedRevenue, 0);

    return (
        <div className="container mx-auto py-10">
            <div className="mb-8">
                <h1 className="text-3xl font-bold">Analíticas de Referidos</h1>
                <p className="text-muted-foreground">Rifa: <span className="font-semibold">{raffle.name}</span></p>
            </div>

            <Card className="mb-8">
                <CardHeader>
                    <CardTitle>Ingresos Totales Confirmados</CardTitle>
                    <CardDescription>Suma de todas las ventas confirmadas a través de todos los canales.</CardDescription>
                </CardHeader>
                <CardContent>
                    <p className="text-4xl font-bold">{formatCurrency(totalConfirmedRevenue, raffle.currency)}</p>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    {/* ✅ CAMBIO: Título y descripción más precisos */}
                    <CardTitle>Rendimiento por Canal</CardTitle>
                    <CardDescription>Desglose de ventas por vendedores personales, links de campaña y ventas directas.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Vendedor / Campaña</TableHead>
                                {/* ✅ CAMBIO: Encabezados más claros */}
                                <TableHead className="text-right">Ventas (Conf./Total)</TableHead>
                                <TableHead className="text-right">Tickets (Conf./Total)</TableHead>
                                <TableHead className="text-right">Ingresos Confirmados</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {analytics.map((item) => (
                                // ✅ CAMBIO: Usamos una "key" más robusta para evitar errores en React.
                                <TableRow key={`${item.type}-${item.sellerName}`}>
                                    <TableCell>
                                        <div className="font-medium">{item.sellerName}</div>
                                        {/* ✅ CAMBIO: Se reemplaza la lógica anterior por el nuevo componente. */}
                                        <ReferralBadge type={item.type} />
                                    </TableCell>
                                    {/* ✅ MEJORA: La clase "tabular-nums" alinea los números correctamente. */}
                                    <TableCell className="text-right tabular-nums">{item.confirmedSales} / {item.totalSales}</TableCell>
                                    <TableCell className="text-right tabular-nums">{item.confirmedTickets} / {item.totalTickets}</TableCell>
                                    <TableCell className="text-right font-semibold tabular-nums">
                                        {formatCurrency(item.confirmedRevenue, raffle.currency)}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}