// components/rifas/sales/SalesPDF.tsx

import { Page, Text, View, Document, StyleSheet } from '@react-pdf/renderer';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { PurchaseWithTicketsAndRaffle } from '@/lib/types'; // Asegúrate que la ruta a tus tipos sea correcta

// --- TIPOS PARA EL PDF ---
type Statistics = {
    totalSales: number;
    totalRevenue: number;
    totalTicketsSold: number;
    pendingRevenue: number;
};
type RaffleInfo = {
    name: string;
    currency: 'USD' | 'VES';
};
type SalesPDFProps = {
    sales: PurchaseWithTicketsAndRaffle[];
    stats: Statistics;
    raffle: RaffleInfo;
    filterDate?: Date;
};

// --- ESTILOS ADAPTADOS PARA EL REPORTE DE VENTAS ---
const styles = StyleSheet.create({
    page: {
        padding: 25,
        fontFamily: 'Helvetica',
        fontSize: 8,
        color: '#333',
    },
    header: {
        textAlign: 'center',
        marginBottom: 20,
        borderBottom: '1px solid #eee',
        paddingBottom: 10,
    },
    title: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 5,
    },
    subtitle: {
        fontSize: 10,
        color: '#666',
    },
    summaryContainer: {
        marginBottom: 20,
        padding: 12,
        backgroundColor: '#f8fafc',
        borderRadius: 5,
        border: '1px solid #e5e7eb',
    },
    summaryTitle: {
        fontSize: 12,
        fontWeight: 'bold',
        marginBottom: 10,
    },
    summaryGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
    },
    statBox: {
        width: '25%',
        alignItems: 'center',
        padding: 5,
    },
    statNumber: {
        fontSize: 14,
        fontWeight: 'bold',
    },
    statLabel: {
        fontSize: 7,
        color: '#64748b',
        textTransform: 'uppercase',
        textAlign: 'center',
    },
    table: {
        width: '100%',
    },
    tableHeader: {
        flexDirection: 'row',
        backgroundColor: '#f1f5f9',
        borderBottom: '1px solid #cbd5e1',
        fontWeight: 'bold',
        height: 20,
        alignItems: 'center'
    },
    tableRow: {
        flexDirection: 'row',
        borderBottom: '1px solid #e5e7eb',
        minHeight: 18,
        alignItems: 'center'
    },
    tableCell: {
        padding: 4,
    },
    // --- Colores para los estados ---
    statusConfirmed: { color: '#16a34a' },
    statusPending: { color: '#f59e0b' },
    statusRejected: { color: '#dc2626' },
    // --- Anchos de las Columnas ---
    colComprador: { width: '25%' },
    colFecha: { width: '20%' },
    colStatus: { width: '15%', textAlign: 'center' },
    colTickets: { width: '10%', textAlign: 'center' },
    colMonto: { width: '15%', textAlign: 'right' },
    colMetodo: { width: '15%', textAlign: 'center'},
    // --- Footer ---
    footer: {
        position: 'absolute',
        bottom: 15,
        left: 25,
        right: 25,
        textAlign: 'center',
        fontSize: 7,
        color: '#999',
    },
});

// --- HELPERS ---
const formatCurrency = (amount: number, currency: 'USD' | 'VES') => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount);
};

const getStatusStyle = (status: string) => {
    if (status === 'confirmed') return styles.statusConfirmed;
    if (status === 'pending') return styles.statusPending;
    if (status === 'rejected') return styles.statusRejected;
    return {};
};

const formatStatus = (status: string) => {
    if (status === 'confirmed') return 'Confirmado';
    if (status === 'pending') return 'Pendiente';
    if (status === 'rejected') return 'Rechazado';
    return status;
}

// --- COMPONENTE PDF ---
export function SalesPDF({ sales, stats, raffle, filterDate }: SalesPDFProps) {
    return (
        <Document>
            <Page size="A4" style={styles.page}>
                <View style={styles.header}>
                    <Text style={styles.title}>Reporte de Ventas: {raffle.name}</Text>
                    <Text style={styles.subtitle}>
                        {filterDate ? `Datos filtrados para el día: ${format(filterDate, "dd 'de' MMMM, yyyy", { locale: es })}` : 'Reporte de todas las ventas'}
                    </Text>
                     <Text style={styles.subtitle}>Generado el {format(new Date(), "dd/MM/yyyy HH:mm 'hrs'")}</Text>
                </View>

                <View style={styles.summaryContainer}>
                    <Text style={styles.summaryTitle}>Resumen de Ventas</Text>
                    <View style={styles.summaryGrid}>
                        <View style={styles.statBox}><Text style={styles.statNumber}>{stats.totalSales}</Text><Text style={styles.statLabel}>Total Ventas</Text></View>
                        <View style={styles.statBox}><Text style={[styles.statNumber, {color: '#16a34a'}]}>{stats.totalTicketsSold}</Text><Text style={styles.statLabel}>Tickets Vendidos</Text></View>
                        <View style={styles.statBox}><Text style={[styles.statNumber, {color: '#3b82f6'}]}>{formatCurrency(stats.totalRevenue, raffle.currency)}</Text><Text style={styles.statLabel}>Ingresos Confirmados</Text></View>
                        <View style={styles.statBox}><Text style={[styles.statNumber, {color: '#f59e0b'}]}>{formatCurrency(stats.pendingRevenue, raffle.currency)}</Text><Text style={styles.statLabel}>Ingresos Pendientes</Text></View>
                    </View>
                </View>

                <View style={styles.table}>
                    <View style={styles.tableHeader} fixed>
                        <Text style={[styles.tableCell, styles.colComprador]}>Comprador</Text>
                        <Text style={[styles.tableCell, styles.colFecha]}>Fecha</Text>
                        <Text style={[styles.tableCell, styles.colStatus]}>Estado</Text>
                        <Text style={[styles.tableCell, styles.colTickets]}>Tickets</Text>
                        <Text style={[styles.tableCell, styles.colMonto]}>Monto</Text>
                        <Text style={[styles.tableCell, styles.colMetodo]}>Método</Text>
                    </View>
                    {sales.map(sale => (
                        <View key={sale.id} style={styles.tableRow} wrap={false}>
                            <Text style={[styles.tableCell, styles.colComprador]}>{sale.buyerName || sale.buyerEmail}</Text>
                            <Text style={[styles.tableCell, styles.colFecha]}>{format(new Date(sale.createdAt), "dd/MM/yy hh:mm a")}</Text>
                            <Text style={[styles.tableCell, styles.colStatus, getStatusStyle(sale.status)]}>{formatStatus(sale.status)}</Text>
                            <Text style={[styles.tableCell, styles.colTickets]}>{sale.ticketCount}</Text>
                            <Text style={[styles.tableCell, styles.colMonto]}>{formatCurrency(parseFloat(sale.amount), raffle.currency)}</Text>
                            <Text style={[styles.tableCell, styles.colMetodo]}>{sale.paymentMethod || 'N/A'}</Text>
                        </View>
                    ))}
                </View>
                
                <Text style={styles.footer} render={({ pageNumber, totalPages }) => (
                    `Página ${pageNumber} de ${totalPages}`
                )} fixed />
            </Page>
        </Document>
    );
}