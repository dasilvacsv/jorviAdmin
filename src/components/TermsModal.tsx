// src/components/TermsModal.tsx

'use client';

import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter,
    DialogClose,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';

export function TermsModal({ children }: { children: React.ReactNode }) {
    return (
        <Dialog>
            <DialogTrigger asChild>{children}</DialogTrigger>
            <DialogContent className="bg-zinc-900 border-zinc-800 text-zinc-300 sm:max-w-3xl">
                <DialogHeader>
                    <DialogTitle className="text-2xl font-bold text-amber-400">
                        Términos y Condiciones - Llévalo con Jorvi
                    </DialogTitle>
                </DialogHeader>
                <ScrollArea className="h-[60vh] w-full pr-6">
                    <div className="prose prose-invert prose-sm text-zinc-400 space-y-4">
                        <p className="text-sm">
                            Última actualización: 3 de Septiembre de 2025
                        </p>
                        <p>
                            Bienvenido a <strong>Jorvilaniña</strong> (en adelante, "la plataforma" o "nosotros"). Al participar en nuestros sorteos, usted (en adelante, "el participante") acepta y se compromete a cumplir los siguientes Términos y Condiciones. Le rogamos que los lea atentamente.
                        </p>

                        <h3 className="text-lg font-semibold text-zinc-200 pt-4">1. Sobre los Sorteos y Tickets</h3>
                        <ol className="list-decimal list-inside space-y-2">
                            <li><strong>Disponibilidad:</strong> Los números o tickets disponibles para cada sorteo se especifican claramente en la página de cada rifa activa en la plataforma.</li>
                            <li><strong>Asignación de Tickets:</strong> Debido al alto volumen de pagos, los tickets se procesan y envían de manera aleatoria al correo electrónico proporcionado por el participante en un lapso máximo de 18 horas tras la confirmación del pago.</li>
                            <li><strong>Confirmación:</strong> Si su compra fue realizada exitosamente, recibirá un correo electrónico de confirmación con sus números asignados. De igual forma, se le notificará si su compra no pudo ser validada.</li>
                            <li><strong>Pagos con Zelle:</strong> Para garantizar el procesamiento, las compras realizadas a través del método de pago Zelle deben ser por un mínimo de dos (2) tickets.</li>
                        </ol>

                        <h3 className="text-lg font-semibold text-zinc-200 pt-4">2. Participación y Elegibilidad</h3>
                        <ol className="list-decimal list-inside space-y-2">
                            <li><strong>Edad Mínima:</strong> Solo podrán participar en nuestros sorteos personas naturales, residentes en Venezuela o en el extranjero, que sean mayores de 18 años.</li>
                            <li><strong>Veracidad de la Información:</strong> El participante es responsable de proporcionar información veraz y actualizada. Jorvilaniña se reserva el derecho de anular la participación si se detecta información falsa.</li>
                        </ol>

                        <h3 className="text-lg font-semibold text-zinc-200 pt-4">3. Ganadores y Entrega de Premios</h3>
                        <ol className="list-decimal list-inside space-y-2">
                            <li><strong>Derecho de Imagen:</strong> Los ganadores aceptan incondicionalmente participar en contenido audiovisual (fotos y videos) relacionado con el sorteo y la entrega de premios. Este material será utilizado en nuestras redes sociales y plataforma web.</li>
                            <li><strong>Obligatoriedad y Transparencia:</strong> La participación del ganador en el material audiovisual es de carácter **OBLIGATORIO** y funge como prueba de la transparencia y legitimidad de nuestros sorteos ante la comunidad. La negativa a cumplir con esta cláusula podría resultar en la anulación del premio.</li>
                            <li><strong>Reclamo del Premio:</strong> Se establecerán los plazos y condiciones para el reclamo y entrega de cada premio, los cuales serán comunicados junto con el anuncio del ganador.</li>
                        </ol>
                        
                        <h3 className="text-lg font-semibold text-zinc-200 pt-4">4. Marco Legal y Cumplimiento Normativo (Venezuela)</h3>
                        <ol className="list-decimal list-inside space-y-2">
                            <li><strong>Regulación:</strong> Jorvilaniña opera en conformidad con las regulaciones aplicables en la República Bolivariana de Venezuela, incluyendo las directrices de la Comisión Nacional de Lotería (CONALOT) y la Ley Nacional de Lotería.</li>
                            <li><strong>Impuestos:</strong> El ganador será el único responsable de declarar y pagar cualquier impuesto que, según la ley venezolana, pueda derivarse de la obtención del premio.</li>
                            <li><strong>Licitud de Fondos:</strong> El participante declara que los fondos utilizados para la compra de tickets provienen de actividades lícitas y no están relacionados con el lavado de dinero, financiamiento al terrorismo u otras actividades ilegales.</li>
                            <li><strong>Transparencia del Sorteo:</strong> Nos comprometemos a realizar los sorteos de forma pública y transparente, utilizando los resultados de sorteos de loterías reconocidas y autorizadas en Venezuela, tal como se especifica en cada rifa.</li>
                        </ol>

                        <h3 className="text-lg font-semibold text-zinc-200 pt-4">5. Disposiciones Generales</h3>
                        <ol className="list-decimal list-inside space-y-2">
                            <li><strong>Modificaciones:</strong> Jorvilaniña se reserva el derecho de modificar estos Términos y Condiciones en cualquier momento. Las modificaciones entrarán en vigor desde su publicación en la plataforma.</li>
                            <li><strong>Aceptación:</strong> La compra de uno o más tickets implica la lectura, comprensión y aceptación total de estos Términos y Condiciones.</li>
                        </ol>
                        <p className="pt-4 text-xs italic">
                            <strong>Aviso Legal:</strong> La participación en juegos de azar debe ser una actividad de entretenimiento. Juegue con responsabilidad.
                        </p>
                    </div>
                </ScrollArea>
                <DialogFooter className="mt-4">
                    <DialogClose asChild>
                        <Button type="button" variant="secondary" className="bg-zinc-700 hover:bg-zinc-600">
                            Cerrar
                        </Button>
                    </DialogClose>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}