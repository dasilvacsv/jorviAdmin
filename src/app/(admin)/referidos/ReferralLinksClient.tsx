// app/admin/referidos/ReferralLinksClient.tsx
"use client";

import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { createReferralLinkAction, deleteReferralLinkAction } from "@/lib/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2, PlusCircle, Loader2, Copy } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// --- TIPOS DE DATOS ---
type ReferralLink = {
    id: string;
    name: string;
    code: string;
};

type Raffle = {
    name: string;
    slug: string;
};

const initialState = { success: false, message: "" };

// --- COMPONENTES AUXILIARES ---
function SubmitButton() {
    const { pending } = useFormStatus();
    return (
        <Button type="submit" disabled={pending} className="w-full sm:w-auto">
            {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlusCircle className="mr-2 h-4 w-4" />}
            Crear Link
        </Button>
    );
}

// --- COMPONENTE PRINCIPAL ---
export function ReferralLinksClient({ initialLinks, initialRaffles }: { initialLinks: ReferralLink[], initialRaffles: Raffle[] }) {
    const { toast } = useToast();
    const [createState, createFormAction] = useFormState(createReferralLinkAction, initialState);
    
    // --- NUEVO: Estado para manejar el slug seleccionado por cada link de referido ---
    const [selectedSlugs, setSelectedSlugs] = useState<Record<string, string>>({});

    // --- NUEVO: Función para manejar la copia del link ---
    const handleCopy = (textToCopy: string) => {
        navigator.clipboard.writeText(textToCopy);
        toast({
            title: "✅ ¡Copiado!",
            description: "El link de referido se copió al portapapeles.",
        });
    };

    // --- NUEVO: Función para actualizar el slug seleccionado para un link específico ---
    const handleRaffleSelect = (linkId: string, slug: string) => {
        setSelectedSlugs(prev => ({
            ...prev,
            [linkId]: slug
        }));
    };

    if (createState.message) {
         toast({
            title: createState.success ? "Éxito" : "Error",
            description: createState.message,
            variant: createState.success ? "default" : "destructive",
        });
        createState.message = ""; // Resetear mensaje para evitar toasts repetidos
    }

    return (
        <div className="grid gap-8 lg:grid-cols-3">
            <div className="lg:col-span-1">
                <Card>
                    <CardHeader>
                        <CardTitle>Crear Nuevo Link</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <form action={createFormAction} className="space-y-4">
                            <div>
                                <Label htmlFor="name">Nombre de la Campaña</Label>
                                <Input id="name" name="name" placeholder="Ej: Anuncio Meta Septiembre" required />
                            </div>
                            <div>
                                <Label htmlFor="code">Código Único</Label>
                                <Input id="code" name="code" placeholder="Ej: META_SEP25" required />
                                <p className="text-xs text-muted-foreground mt-1">Usa solo letras, números y guiones. Ej: `?ref=CODIGO`</p>
                            </div>
                            <SubmitButton />
                        </form>
                    </CardContent>
                </Card>
            </div>

            <div className="lg:col-span-2">
                 <Card>
                    <CardHeader>
                        <CardTitle>Generador de Links</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Campaña</TableHead>
                                    <TableHead>Seleccionar Rifa</TableHead>
                                    <TableHead>Link Generado</TableHead>
                                    <TableHead className="text-right">Acción</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {initialLinks.map((link) => {
                                    const selectedSlug = selectedSlugs[link.id];
                                    const fullUrl = selectedSlug 
                                        ? `https://www.llevateloconjorvi.com/rifa/${selectedSlug}?ref=${link.code}`
                                        : "";

                                    return (
                                        <TableRow key={link.id}>
                                            <TableCell>
                                                <div className="font-medium">{link.name}</div>
                                                <div className="text-xs text-muted-foreground font-mono">{link.code}</div>
                                            </TableCell>
                                            <TableCell>
                                                <Select onValueChange={(slug) => handleRaffleSelect(link.id, slug)}>
                                                    <SelectTrigger className="w-[200px]">
                                                        <SelectValue placeholder="Elige una rifa..." />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {initialRaffles.map(raffle => (
                                                            <SelectItem key={raffle.slug} value={raffle.slug}>
                                                                {raffle.name}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </TableCell>
                                            <TableCell>
                                                {selectedSlug ? (
                                                    <div className="flex items-center gap-2">
                                                        <Input type="text" readOnly value={fullUrl} className="text-xs h-9" />
                                                        <Button variant="outline" size="icon" onClick={() => handleCopy(fullUrl)}>
                                                            <Copy className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                ) : (
                                                    <p className="text-xs text-muted-foreground">Selecciona una rifa para ver el link.</p>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <form action={deleteReferralLinkAction}>
                                                    <input type="hidden" name="id" value={link.id} />
                                                    <Button variant="ghost" size="icon" type="submit">
                                                        <Trash2 className="h-4 w-4 text-red-500" />
                                                    </Button>
                                                </form>
                                            </TableCell>
                                        </TableRow>
                                    )
                                })}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}