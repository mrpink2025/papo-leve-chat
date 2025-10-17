import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Filter, MessageSquare, Users, Image, Pin, BellOff } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export type ConversationFilter = {
  unreadOnly: boolean;
  groupsOnly: boolean;
  directOnly: boolean;
  pinnedOnly: boolean;
  mutedOnly: boolean;
  withMediaOnly: boolean;
};

interface ConversationFiltersProps {
  filters: ConversationFilter;
  onFiltersChange: (filters: ConversationFilter) => void;
}

export const ConversationFilters = ({ filters, onFiltersChange }: ConversationFiltersProps) => {
  const activeFilterCount = Object.values(filters).filter(Boolean).length;

  const toggleFilter = (key: keyof ConversationFilter) => {
    onFiltersChange({
      ...filters,
      [key]: !filters[key],
    });
  };

  const clearFilters = () => {
    onFiltersChange({
      unreadOnly: false,
      groupsOnly: false,
      directOnly: false,
      pinnedOnly: false,
      mutedOnly: false,
      withMediaOnly: false,
    });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-8 sm:h-9 px-2 sm:px-3 rounded-lg sm:rounded-xl bg-background/50 hover:bg-primary/10 border-border/50 hover:border-primary/50 text-foreground hover:text-primary transition-all hover:scale-105 hover:shadow-md relative"
        >
          <Filter className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5" />
          <span className="text-xs sm:text-sm font-medium hidden sm:inline">Filtros</span>
          {activeFilterCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-4 w-4 p-0 flex items-center justify-center text-[10px] rounded-full"
            >
              {activeFilterCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="flex items-center justify-between">
          <span>Filtrar conversas</span>
          {activeFilterCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              className="h-6 text-xs text-primary hover:text-primary"
            >
              Limpar
            </Button>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        <DropdownMenuCheckboxItem
          checked={filters.unreadOnly}
          onCheckedChange={() => toggleFilter("unreadOnly")}
        >
          <MessageSquare className="mr-2 h-4 w-4 text-primary" />
          Não lidas
        </DropdownMenuCheckboxItem>

        <DropdownMenuCheckboxItem
          checked={filters.pinnedOnly}
          onCheckedChange={() => toggleFilter("pinnedOnly")}
        >
          <Pin className="mr-2 h-4 w-4 text-primary" />
          Fixadas
        </DropdownMenuCheckboxItem>

        <DropdownMenuCheckboxItem
          checked={filters.mutedOnly}
          onCheckedChange={() => toggleFilter("mutedOnly")}
        >
          <BellOff className="mr-2 h-4 w-4 text-primary" />
          Silenciadas
        </DropdownMenuCheckboxItem>

        <DropdownMenuSeparator />

        <DropdownMenuCheckboxItem
          checked={filters.groupsOnly}
          onCheckedChange={() => toggleFilter("groupsOnly")}
        >
          <Users className="mr-2 h-4 w-4 text-primary" />
          Grupos
        </DropdownMenuCheckboxItem>

        <DropdownMenuCheckboxItem
          checked={filters.directOnly}
          onCheckedChange={() => toggleFilter("directOnly")}
        >
          <MessageSquare className="mr-2 h-4 w-4 text-primary" />
          Conversas diretas
        </DropdownMenuCheckboxItem>

        <DropdownMenuSeparator />

        <DropdownMenuCheckboxItem
          checked={filters.withMediaOnly}
          onCheckedChange={() => toggleFilter("withMediaOnly")}
        >
          <Image className="mr-2 h-4 w-4 text-primary" />
          Com mídia
        </DropdownMenuCheckboxItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
