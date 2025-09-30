// app/admin/referidos/ReferralsAndLinksClient.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";

// Actions
import { createReferralAction, toggleReferralStatusAction } from "@/lib/actions-admin";
import { createReferralLinkAction, deleteReferralLinkAction } from "@/lib/actions";

// UI Components
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"; // ✅ Importa Tabs
import { useToast } from "@/hooks/use-toast";
import { PlusCircle, Loader2, Copy, Trash2 } from "lucide-react";

// --- TIPOS DE DATOS ---
type ReferralAccount = {
  id: string; name: string; email: string; code: string; isActive: boolean; commissionRate: string;
};
type CampaignLink = {
  id: string; name: string; code: string;
};
type Raffle = {
  name: string; slug: string | null;
};

// --- Botón para el formulario de Cuentas ---
function CreateAccountButton() {
    const { pending } = useFormStatus();
    return (
        <Button type="submit" disabled={pending} className="w-full sm:w-auto">
            {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlusCircle className="mr-2 h-4 w-4" />}
            Crear Cuenta
        </Button>
    );
}
// --- Botón para el formulario de Links de Campaña ---
function CreateLinkButton() {
    const { pending } = useFormStatus();
    return (
        <Button type="submit" disabled={pending} className="w-full sm:w-auto">
            {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlusCircle className="mr-2 h-4 w-4" />}
            Crear Link
        </Button>
    );
}

// --- Switch para activar/desactivar cuentas ---
function StatusToggleButton({ referral }: { referral: ReferralAccount }) {
    const { pending } = useFormStatus();
    return <Switch id={`status-${referral.id}`} checked={referral.isActive} disabled={pending} type="submit" />;
}

// --- COMPONENTE PRINCIPAL UNIFICADO ---
export function ReferralsAndLinksClient({
    initialReferrals,
    initialCampaignLinks,
    initialRaffles,
}: {
    initialReferrals: ReferralAccount[];
    initialCampaignLinks: CampaignLink[];
    initialRaffles: Raffle[];
}) {
    const { toast } = useToast();
    const [accountFormState, createAccountAction] = useFormState(createReferralAction, { success: false, message: "" });
    const [linkFormState, createLinkAction] = useFormState(createReferralLinkAction, { success: false, message: "" });
    
    const accountFormRef = useRef<HTMLFormElement>(null);
    const linkFormRef = useRef<HTMLFormElement>(null);
    const [selectedSlugs, setSelectedSlugs] = useState<Record<string, string>>({});

    // Efecto para mostrar toasts para la creación de cuentas
    useEffect(() => {
        if (accountFormState.message) {
            toast({
                title: accountFormState.success ? "✅ Éxito" : "❌ Error",
                description: accountFormState.message,
                variant: accountFormState.success ? "default" : "destructive",
            });
            if (accountFormState.success) accountFormRef.current?.reset();
        }
    }, [accountFormState, toast]);
    
    // Efecto para mostrar toasts para la creación de links de campaña
    useEffect(() => {
        if (linkFormState.message) {
            toast({
                title: linkFormState.success ? "✅ Éxito" : "❌ Error",
                description: linkFormState.message,
                variant: linkFormState.success ? "default" : "destructive",
            });
            if (linkFormState.success) linkFormRef.current?.reset();
        }
    }, [linkFormState, toast]);

    const handleCopy = (text: string, field: string) => {
        navigator.clipboard.writeText(text);
        toast({ title: "✅ ¡Copiado!", description: `El ${field} se copió al portapapeles.` });
    };

    return (
        <Tabs defaultValue="accounts" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="accounts">Cuentas de Referidos</TabsTrigger>
                <TabsTrigger value="campaigns">Links de Campaña</TabsTrigger>
            </TabsList>

            {/* PESTAÑA 1: GESTIÓN DE CUENTAS DE REFERIDOS */}
            <TabsContent value="accounts" className="mt-6">
                <div className="grid gap-8 lg:grid-cols-3">
                    {/* Formulario para crear cuentas */}
                    <div className="lg:col-span-1">
                        <Card>
                            <CardHeader>
                                <CardTitle>Crear Nueva Cuenta</CardTitle>
                                <CardDescription>Crea un acceso para un nuevo vendedor o afiliado.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <form ref={accountFormRef} action={createAccountAction} className="space-y-4">
                                    <div><Label htmlFor="name">Nombre Completo</Label><Input id="name" name="name" required /></div>
                                    <div><Label htmlFor="email">Correo Electrónico</Label><Input id="email" name="email" type="email" required /></div>
                                    <div>
                                        <Label htmlFor="code">Código (4 dígitos)</Label>
                                        <Input id="code" name="code" placeholder="(Autogenerado si se deja en blanco)" maxLength={4} />
                                    </div>
                                    <CreateAccountButton />
                                </form>
                            </CardContent>
                        </Card>
                    </div>
                    {/* Tabla de cuentas existentes */}
                    <div className="lg:col-span-2">
                        <Card>
                            <CardHeader><CardTitle>Cuentas Existentes</CardTitle></CardHeader>
                            <CardContent>
                                <Table>
                                    <TableHeader><TableRow><TableHead>Nombre</TableHead><TableHead>Código</TableHead><TableHead>Comisión</TableHead><TableHead className="text-center">Activo</TableHead></TableRow></TableHeader>
                                    <TableBody>
                                        {initialReferrals.map((ref) => (
                                            <TableRow key={ref.id}>
                                                <TableCell><div className="font-medium">{ref.name}</div><div className="text-xs text-muted-foreground flex items-center gap-2">{ref.email}<Copy className="h-3 w-3 cursor-pointer" onClick={() => handleCopy(ref.email, 'email')} /></div></TableCell>
                                                <TableCell><div className="font-mono flex items-center gap-2">{ref.code}<Copy className="h-3 w-3 cursor-pointer" onClick={() => handleCopy(ref.code, 'código')} /></div></TableCell>
                                                <TableCell>${parseFloat(ref.commissionRate).toFixed(2)}</TableCell>
                                                <TableCell className="text-center"><form action={toggleReferralStatusAction}><input type="hidden" name="id" value={ref.id} /><input type="hidden" name="currentState" value={String(ref.isActive)} /><StatusToggleButton referral={ref} /></form></TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </TabsContent>

            {/* PESTAÑA 2: GESTIÓN DE LINKS DE CAMPAÑA */}
            <TabsContent value="campaigns" className="mt-6">
                 <div className="grid gap-8 lg:grid-cols-3">
                    {/* Formulario para crear links de campaña */}
                    <div className="lg:col-span-1">
                        <Card>
                            <CardHeader>
                                <CardTitle>Crear Nuevo Link de Campaña</CardTitle>
                                <CardDescription>Para seguimiento de anuncios en Meta, Google, etc.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <form ref={linkFormRef} action={createLinkAction} className="space-y-4">
                                    <div><Label htmlFor="linkName">Nombre de la Campaña</Label><Input id="linkName" name="name" placeholder="Ej: Anuncio Meta Septiembre" required /></div>
                                    <div>
                                        <Label htmlFor="linkCode">Código Único</Label>
                                        <Input id="linkCode" name="code" placeholder="Ej: META_SEP25" required />
                                        <p className="text-xs text-muted-foreground mt-1">Se usará como `?ref=CODIGO`</p>
                                    </div>
                                    <CreateLinkButton />
                                </form>
                            </CardContent>
                        </Card>
                    </div>
                    {/* Tabla/Generador de links de campaña */}
                    <div className="lg:col-span-2">
                        <Card>
                            <CardHeader><CardTitle>Generador de Links de Campaña</CardTitle></CardHeader>
                            <CardContent>
                                <Table>
                                    <TableHeader><TableRow><TableHead>Campaña</TableHead><TableHead>Seleccionar Rifa</TableHead><TableHead>Link Generado</TableHead><TableHead className="text-right">Acción</TableHead></TableRow></TableHeader>
                                    <TableBody>
                                        {initialCampaignLinks.map((link) => {
                                            const selectedSlug = selectedSlugs[link.id];
                                            const fullUrl = selectedSlug ? `https://www.llevateloconjorvi.com/rifa/${selectedSlug}?ref=${link.code}` : "";
                                            return (
                                                <TableRow key={link.id}>
                                                    <TableCell><div className="font-medium">{link.name}</div><div className="text-xs text-muted-foreground font-mono">{link.code}</div></TableCell>
                                                    <TableCell>
                                                        <Select onValueChange={(slug) => setSelectedSlugs(p => ({...p, [link.id]: slug}))}>
                                                            <SelectTrigger><SelectValue placeholder="Elige una rifa..." /></SelectTrigger>
                                                            <SelectContent>{initialRaffles.map(raffle => <SelectItem key={raffle.slug} value={raffle.slug!}>{raffle.name}</SelectItem>)}</SelectContent>
                                                        </Select>
                                                    </TableCell>
                                                    <TableCell>
                                                        {selectedSlug ? (<div className="flex items-center gap-2"><Input readOnly value={fullUrl} className="text-xs h-9" /><Button variant="outline" size="icon" onClick={() => handleCopy(fullUrl, 'Link')}><Copy className="h-4 w-4" /></Button></div>) 
                                                        : (<p className="text-xs text-muted-foreground">Selecciona una rifa.</p>)}
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        <form action={deleteReferralLinkAction}><input type="hidden" name="id" value={link.id} /><Button variant="ghost" size="icon" type="submit"><Trash2 className="h-4 w-4 text-red-500" /></Button></form>
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </TabsContent>
        </Tabs>
    );
}