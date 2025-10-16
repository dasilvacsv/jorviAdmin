// components/dashboard/ExportCustomersButton.tsx

"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { exportCustomersAction } from '@/lib/actions';
import { Download } from 'lucide-react';
import { saveAs } from 'file-saver'; // Librería para descargar archivos
import { toast } from 'sonner'; // Asumo que usas sonner para notificaciones, si no, puedes usar alert()

// Función para convertir datos JSON a formato CSV
function convertToCSV(data: any[]): string {
    if (!data || data.length === 0) return '';
    
    // Obtener las claves del primer objeto para los headers
    const headers = Object.keys(data[0]);
    
    // Crear la fila de headers
    const csvHeaders = headers.join(',');
    
    // Crear las filas de datos
    const csvRows = data.map(row => {
        return headers.map(header => {
            const value = row[header];
            // Escapar comillas y envolver en comillas si contiene comas o comillas
            if (typeof value === 'string' && (value.includes(',') || value.includes('"') || value.includes('\n'))) {
                return `"${value.replace(/"/g, '""')}"`;
            }
            return value || '';
        }).join(',');
    });
    
    // Combinar headers y filas
    return [csvHeaders, ...csvRows].join('\n');
}

export function ExportCustomersButton() {
    const [isExporting, setIsExporting] = useState(false);

    const handleExport = async () => {
        setIsExporting(true);
        toast.info("Generando archivo de clientes...", {
            description: "Esto puede tardar unos segundos.",
        });

        try {
            const result = await exportCustomersAction();

            if (result.success && Array.isArray(result.data)) {
                // 1. Convertir los datos JSON a formato CSV
                const csvContent = convertToCSV(result.data);

                // 2. Crear un blob con el contenido CSV
                const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });

                // 3. Generar el archivo y activar la descarga
                saveAs(blob, "clientes_unicos_meta.csv");

                toast.success("¡Exportación completada!", {
                    description: `Se ha descargado el archivo con ${result.data.length} clientes.`,
                });
            } else {
                throw new Error(result.message || "No se recibieron datos para exportar.");
            }
        } catch (error: any) {
            console.error("Error al exportar:", error);
            toast.error("Error en la exportación", {
                description: error.message || "No se pudo generar el archivo.",
            });
        } finally {
            setIsExporting(false);
        }
    };

    return (
        <Button onClick={handleExport} disabled={isExporting} variant="outline">
            {isExporting ? (
                <>
                    <span className="animate-spin mr-2">⏳</span>
                    Exportando...
                </>
            ) : (
                <>
                    <Download className="mr-2 h-4 w-4" />
                    Exportar Clientes (CSV)
                </>
            )}
        </Button>
    );
}