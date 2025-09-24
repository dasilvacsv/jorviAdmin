// components/rifas/bingo-search.tsx
"use client"

import * as React from "react"
import { Check, ChevronsUpDown, User, Hash, Search as SearchIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

export type SearchableOption = {
  value: string;
  label: string;
  type: 'ticket' | 'buyer';
  email?: string;
};

interface BingoSearchProps {
  options: SearchableOption[];
  onSelect: (value: string | null) => void;
  selectedOptionValue: string | null;
}

export function BingoSearch({ options, onSelect, selectedOptionValue }: BingoSearchProps) {
  const [open, setOpen] = React.useState(false)

  const handleSelect = (currentValue: string) => {
    const newValue = currentValue === selectedOptionValue ? null : currentValue;
    onSelect(newValue);
    setOpen(false);
  };
  
  const selectedLabel = selectedOptionValue 
    ? options.find(o => o.value === selectedOptionValue)?.label 
    : "Buscar ticket o comprador...";

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between h-12 text-base shadow-sm hover:shadow-md transition-shadow bg-white/90 backdrop-blur-sm border-slate-300 group"
        >
          <span className={cn("flex items-center gap-2", !selectedOptionValue && "text-muted-foreground")}>
            <SearchIcon className="h-4 w-4 opacity-70 group-hover:opacity-100 transition-opacity flex-shrink-0" />
            {/* SOLUCIÓN: Usar 'truncate' para cortar el texto con "..." si se desborda */}
            <span className="truncate">{selectedLabel}</span>
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      {/* SOLUCIÓN: Popover con tamaño propio, adaptable y siempre encima (z-50) */}
      <PopoverContent 
        className="p-0 z-50 w-[calc(100vw-2rem)] max-w-md sm:max-w-lg" 
        align="start"
      >
        <Command>
          <CommandInput placeholder="Buscar por #, nombre o email..." />
          {/* SOLUCIÓN: La lista tiene su propio scroll si el contenido es muy largo */}
          <CommandList className="max-h-[50vh]">
            <CommandEmpty>No se encontraron resultados.</CommandEmpty>
            <CommandGroup heading="Compradores">
               {options.filter(o => o.type === 'buyer').map((option) => (
                <CommandItem
                  key={option.value}
                  value={`${option.label} ${option.email}`} // Buscar por nombre y email
                  onSelect={() => handleSelect(option.value)}
                  className="aria-selected:bg-blue-50 aria-selected:text-blue-900"
                >
                  <Check
                    className={cn("mr-2 h-4 w-4", selectedOptionValue === option.value ? "opacity-100 text-blue-600" : "opacity-0")}
                  />
                  <div className="flex items-center gap-2 overflow-hidden">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <div className="truncate">
                        <p className="truncate">{option.label}</p>
                        <p className="text-xs text-muted-foreground truncate">{option.email}</p>
                    </div>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
            <CommandGroup heading="Tickets">
              {options.filter(o => o.type === 'ticket').map((option) => (
                <CommandItem
                  key={option.value}
                  value={option.value} // Buscar por número de ticket
                  onSelect={() => handleSelect(option.value)}
                  className="aria-selected:bg-blue-50 aria-selected:text-blue-900"
                >
                  <Check
                    className={cn("mr-2 h-4 w-4", selectedOptionValue === option.value ? "opacity-100 text-blue-600" : "opacity-0")}
                  />
                  <div className="flex items-center gap-2">
                    <Hash className="h-4 w-4 text-muted-foreground"/>
                     {option.label}
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}