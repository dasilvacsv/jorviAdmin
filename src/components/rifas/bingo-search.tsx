"use client"

import * as React from "react"
import { Check, ChevronsUpDown, User, Hash, Search as SearchIcon, X } from "lucide-react"
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
  const [isMobile, setIsMobile] = React.useState(false)

  React.useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  const handleSelect = (currentValue: string) => {
    const newValue = currentValue === selectedOptionValue ? null : currentValue;
    onSelect(newValue);
    setOpen(false);
  };
  
  const selectedOption = selectedOptionValue 
    ? options.find(o => o.value === selectedOptionValue)
    : null;
    
  const getPlaceholderText = () => {
    if (isMobile) return "Buscar...";
    return "Buscar ticket o comprador...";
  };

  const getSelectedText = () => {
    if (!selectedOption) return getPlaceholderText();
    
    if (selectedOption.type === 'buyer') {
      // En mobile, mostrar nombre corto
      if (isMobile) {
        const name = selectedOption.label.split(' (')[0];
        return name.length > 20 ? `${name.substring(0, 20)}...` : name;
      }
      return selectedOption.label;
    }
    
    return selectedOption.label;
  };

  return (
    <div className="w-full">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className={cn(
              "w-full justify-between text-left shadow-sm hover:shadow-md transition-all",
              "bg-white/90 backdrop-blur-sm border-slate-300 group",
              "h-10 sm:h-12 text-sm sm:text-base"
            )}
          >
            <span className={cn(
              "flex items-center gap-2 flex-1 min-w-0", 
              !selectedOptionValue && "text-muted-foreground"
            )}>
              <SearchIcon className="h-4 w-4 opacity-70 group-hover:opacity-100 transition-opacity flex-shrink-0" />
              <span className="truncate">{getSelectedText()}</span>
            </span>
            
            <div className="flex items-center gap-1 flex-shrink-0">
              {selectedOptionValue && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 hover:bg-red-100"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelect(null);
                  }}
                >
                  <X className="h-3 w-3 text-red-500" />
                </Button>
              )}
              <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
            </div>
          </Button>
        </PopoverTrigger>
        
        <PopoverContent 
          className={cn(
            "p-0 z-50",
            // Responsive width
            "w-[calc(100vw-1rem)] max-w-sm sm:max-w-md lg:max-w-lg",
            // Mobile positioning
            isMobile ? "mx-2" : ""
          )}
          align="start"
          sideOffset={4}
        >
          <Command className="w-full">
            <CommandInput 
              placeholder={isMobile ? "Buscar..." : "Buscar por #, nombre o email..."} 
              className="text-sm sm:text-base"
            />
            <CommandList className="max-h-[40vh] sm:max-h-[50vh]">
              <CommandEmpty>
                <div className="text-center py-4">
                  <p className="text-sm text-muted-foreground">No se encontraron resultados</p>
                </div>
              </CommandEmpty>
              
              {/* Compradores */}
              {options.filter(o => o.type === 'buyer').length > 0 && (
                <CommandGroup heading="Compradores">
                  {options.filter(o => o.type === 'buyer').map((option) => (
                    <CommandItem
                      key={option.value}
                      value={`${option.label} ${option.email}`}
                      onSelect={() => handleSelect(option.value)}
                      className="aria-selected:bg-blue-50 aria-selected:text-blue-900 cursor-pointer"
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4 flex-shrink-0", 
                          selectedOptionValue === option.value ? "opacity-100 text-blue-600" : "opacity-0"
                        )}
                      />
                      <div className="flex items-center gap-2 overflow-hidden flex-1">
                        <User className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">
                            {option.label.split(' (')[0]}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            {option.email}
                          </p>
                          <p className="text-xs text-blue-600">
                            {option.label.match(/\((\d+) tickets?\)/)?.[1] || '0'} tickets
                          </p>
                        </div>
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
              
              {/* Tickets */}
              {options.filter(o => o.type === 'ticket').length > 0 && (
                <CommandGroup heading="Tickets Vendidos">
                  {options.filter(o => o.type === 'ticket').slice(0, isMobile ? 10 : 20).map((option) => (
                    <CommandItem
                      key={option.value}
                      value={option.value}
                      onSelect={() => handleSelect(option.value)}
                      className="aria-selected:bg-blue-50 aria-selected:text-blue-900 cursor-pointer"
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4 flex-shrink-0", 
                          selectedOptionValue === option.value ? "opacity-100 text-blue-600" : "opacity-0"
                        )}
                      />
                      <div className="flex items-center gap-2">
                        <Hash className="h-4 w-4 text-muted-foreground flex-shrink-0"/>
                        <span className="text-sm font-mono">{option.label}</span>
                      </div>
                    </CommandItem>
                  ))}
                  {options.filter(o => o.type === 'ticket').length > (isMobile ? 10 : 20) && (
                    <div className="px-2 py-1 text-xs text-muted-foreground text-center border-t">
                      Y {options.filter(o => o.type === 'ticket').length - (isMobile ? 10 : 20)} tickets más...
                    </div>
                  )}
                </CommandGroup>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  )
}