// components/referrals/ReferralShareLinkGenerator.tsx
"use client";

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Link as LinkIcon, Copy, Check, ChevronsUpDown, Image as ImageIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

type RaffleForLink = {
  id: string;
  name: string;
  slug: string | null;
  imageUrl: string | null;
};

interface ReferralShareLinkGeneratorProps {
  referralCode: string;
  raffles: RaffleForLink[];
}

export function ReferralShareLinkGenerator({ referralCode, raffles }: ReferralShareLinkGeneratorProps) {
  const [open, setOpen] = useState(false);
  const [selectedRaffle, setSelectedRaffle] = useState<RaffleForLink | null>(null);
  const [shareLink, setShareLink] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (selectedRaffle && selectedRaffle.slug) {
      // ✅ MODIFICADO: Cambia el dominio base al tuyo
      const baseUrl = "https://www.llevateloconjorvi.com";
      const url = new URL(`/rifa/${selectedRaffle.slug}`, baseUrl);
      // ✅ MODIFICADO: Usamos el parámetro `r` para referidos
      url.searchParams.set('r', referralCode);
      setShareLink(url.toString());
    } else {
      setShareLink('');
    }
  }, [selectedRaffle, referralCode]);

  const handleCopy = () => {
    if (shareLink) {
      navigator.clipboard.writeText(shareLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  if (raffles.length === 0) {
    return (
        <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-white">
                    <LinkIcon className="h-5 w-5" />
                    Generar Enlace de Referido
                </CardTitle>
            </CardHeader>
            <CardContent>
                <p className="text-sm text-zinc-400">
                    Actualmente no hay rifas activas para generar enlaces.
                </p>
            </CardContent>
        </Card>
    );
  }

  return (
    <Card className="bg-zinc-900 border-zinc-800">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-white">
          <LinkIcon className="h-5 w-5 text-amber-400" />
          Generar Enlace de Referido
        </CardTitle>
        <CardDescription className="text-zinc-400">
          Selecciona una rifa para crear tu enlace personal y compártelo para ganar comisiones.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label className="mb-2 block text-zinc-300">1. Selecciona una Rifa</Label>
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={open}
                className="w-full justify-between bg-zinc-800 border-zinc-700 hover:bg-zinc-700 text-white"
              >
                {selectedRaffle ? (
                  <div className="flex items-center gap-2">
                      {selectedRaffle.imageUrl ? (
                        <Image src={selectedRaffle.imageUrl} alt={selectedRaffle.name} width={24} height={24} className="rounded-sm object-cover" />
                      ) : (
                        <ImageIcon className="h-6 w-6 text-zinc-500" />
                      )}
                      <span className="truncate">{selectedRaffle.name}</span>
                  </div>
                ) : ( "Seleccionar rifa..." )}
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[--radix-popover-trigger-width] p-0 bg-zinc-900 border-zinc-700 text-white">
              <Command>
                <CommandInput placeholder="Buscar rifa..." className="h-9" />
                <CommandList>
                  <CommandEmpty>No se encontró ninguna rifa.</CommandEmpty>
                  <CommandGroup>
                  {raffles.map((raffle) => (
                      <CommandItem
                        key={raffle.id}
                        value={raffle.name}
                        onSelect={() => {
                            setSelectedRaffle(raffle);
                            setOpen(false);
                        }}
                        className="cursor-pointer"
                      >
                      <div className="flex items-center gap-3 w-full">
                          {raffle.imageUrl ? (
                              <Image src={raffle.imageUrl} alt={raffle.name} width={40} height={40} className="rounded-md object-cover" />
                          ) : (
                              <div className="h-10 w-10 bg-zinc-800 rounded-md flex items-center justify-center">
                                  <ImageIcon className="h-5 w-5 text-zinc-500" />
                              </div>
                          )}
                          <span className="flex-1 truncate">{raffle.name}</span>
                          <Check
                          className={cn(
                              "mr-2 h-4 w-4",
                              selectedRaffle?.id === raffle.id ? "opacity-100" : "opacity-0"
                          )}
                          />
                      </div>
                      </CommandItem>
                  ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>

        {shareLink && (
          <div>
            <Label className="text-zinc-300">2. Copia y Comparte tu Enlace</Label>
            <div className="flex items-center gap-2 mt-2">
              <Input
                value={shareLink}
                readOnly
                className="flex-1 bg-zinc-800 border-zinc-700 font-mono text-sm text-amber-400"
              />
              <Button variant="secondary" size="icon" onClick={handleCopy} className="bg-amber-500 hover:bg-amber-400">
                {copied ? <Check className="h-4 w-4 text-white" /> : <Copy className="h-4 w-4 text-white" />}
              </Button>
            </div>
            {copied && <p className="text-sm text-green-500 mt-2 animate-pulse">¡Enlace copiado al portapapeles!</p>}
          </div>
        )}
      </CardContent>
    </Card>
  );
}