import { notFound } from 'next/navigation';
import { getSaleDetails } from '@/lib/actions';
import { SaleDetailView } from '@/components/sale-detail-view';

interface SalePageProps {
  params: {
    id: string;
  };
}

export default async function SalePage({ params }: SalePageProps) {
  try {
    const saleData = await getSaleDetails(params.id);

    if (!saleData) {
      notFound();
    }

    return <SaleDetailView saleData={saleData} />;
  } catch (error) {
    console.error('Error loading sale details:', error);
    notFound();
  }
}

// Metadata
export async function generateMetadata({ params }: SalePageProps) {
  try {
    const saleData = await getSaleDetails(params.id);
    
    if (!saleData) {
      return {
        title: 'Venta no encontrada',
      };
    }

    return {
      title: `Venta #${saleData.purchase.id.slice(0, 8)} - ${saleData.purchase.raffle.name}`,
      description: `Detalles de la venta de ${saleData.purchase.buyerName || 'Cliente'} para la rifa ${saleData.purchase.raffle.name}`,
    };
  } catch (error) {
    return {
      title: 'Error al cargar la venta',
    };
  }
}