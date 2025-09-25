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
import { formatCurrency } from "@/lib/utils"; // Suponiendo que tienes una función de formato

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
                    <CardTitle>Rendimiento por Link de Referido</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Campaña / Fuente</TableHead>
                                <TableHead className="text-right">Ventas Confirmadas</TableHead>
                                <TableHead className="text-right">Tickets Confirmados</TableHead>
                                <TableHead className="text-right">Ingresos Confirmados</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {analytics.map((item) => (
                                <TableRow key={item.sellerName}>
                                    <TableCell>
                                        <div className="font-medium">{item.sellerName}</div>
                                        {item.sellerName.startsWith('Ventas Directas') ? (
                                             <Badge variant="secondary">Directo</Badge>
                                        ) : (
                                            <Badge variant="outline">Referido</Badge>
                                        )}
                                    </TableCell>
                                    <TableCell className="text-right">{item.confirmedSales} / {item.totalSales}</TableCell>
                                    <TableCell className="text-right">{item.confirmedTickets} / {item.totalTickets}</TableCell>
                                    <TableCell className="text-right font-semibold">
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