// components/dashboard/ExportCustomersButton.tsx

"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { exportCustomersAction } from '@/lib/actions';
import { Download } from 'lucide-react';
import * as XLSX from 'xlsx'; // Librería para generar el Excel
import { toast } from 'sonner'; // Asumo que usas sonner para notificaciones, si no, puedes usar alert()

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
                // 1. Crear una nueva hoja de cálculo a partir de los datos JSON
                const worksheet = XLSX.utils.json_to_sheet(result.data);

                // 2. Crear un nuevo libro de trabajo
                const workbook = XLSX.utils.book_new();

                // 3. Añadir la hoja de cálculo al libro de trabajo
                XLSX.utils.book_append_sheet(workbook, worksheet, "Clientes");

                // 4. Establecer anchos de columna (opcional, pero mejora la visualización)
                worksheet['!cols'] = [
                    { wch: 30 }, // Ancho para 'nombre'
                    { wch: 35 }, // Ancho para 'correo'
                    { wch: 20 }, // Ancho para 'telefono'
                ];

                // 5. Generar el archivo y activar la descarga
                XLSX.writeFile(workbook, "clientes_unicos_meta.xlsx");

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
                    Exportar Clientes (Meta)
                </>
            )}
        </Button>
    );
}