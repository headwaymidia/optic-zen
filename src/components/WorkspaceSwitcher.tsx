import { useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Check, ChevronsUpDown, Plus, Store as StoreIcon } from "lucide-react";
import { useStores } from "@/hooks/useStores";
import { CreateStoreDialog } from "@/components/CreateStoreDialog";
import { cn } from "@/lib/utils";

interface Props {
  collapsed?: boolean;
}

export function WorkspaceSwitcher({ collapsed = false }: Props) {
  const { stores, currentStore, setCurrentStoreId } = useStores();
  const [createOpen, setCreateOpen] = useState(false);

  if (!currentStore) return null;

  if (collapsed) {
    return (
      <>
        <DropdownMenu>
          <Tooltip>
            <TooltipTrigger asChild>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="mx-auto flex h-9 w-9 items-center justify-center rounded-lg border border-sidebar-border bg-sidebar-accent/40 text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
                  aria-label="Trocar de loja"
                >
                  <StoreIcon className="h-4 w-4" />
                </button>
              </DropdownMenuTrigger>
            </TooltipTrigger>
            <TooltipContent side="right">{currentStore.name}</TooltipContent>
          </Tooltip>
          <SwitcherMenuContent
            onCreate={() => setCreateOpen(true)}
            stores={stores}
            currentId={currentStore.id}
            onSelect={setCurrentStoreId}
          />
        </DropdownMenu>
        <CreateStoreDialog open={createOpen} onOpenChange={setCreateOpen} />
      </>
    );
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className={cn(
              "group flex w-full items-center gap-2 rounded-lg border border-sidebar-border bg-sidebar-accent/40 px-2.5 py-2 text-left transition-colors",
              "hover:bg-sidebar-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            )}
            aria-label="Seletor de loja"
          >
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-zinc-900 text-[11px] font-semibold text-white dark:bg-white dark:text-zinc-900">
              {currentStore.initial ?? currentStore.name.charAt(0).toUpperCase()}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[10px] font-medium uppercase tracking-wider text-muted-foreground leading-none">
                Filial
              </span>
              <span className="block truncate text-[13px] font-semibold text-sidebar-foreground leading-tight mt-0.5">
                {currentStore.name}
              </span>
            </span>
            <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
          </button>
        </DropdownMenuTrigger>
        <SwitcherMenuContent
          onCreate={() => setCreateOpen(true)}
          stores={stores}
          currentId={currentStore.id}
          onSelect={setCurrentStoreId}
        />
      </DropdownMenu>
      <CreateStoreDialog open={createOpen} onOpenChange={setCreateOpen} />
    </>
  );
}

function SwitcherMenuContent({
  stores,
  currentId,
  onSelect,
  onCreate,
}: {
  stores: { id: string; name: string; role: string; initial?: string }[];
  currentId: string;
  onSelect: (id: string) => void;
  onCreate: () => void;
}) {
  return (
    <DropdownMenuContent
      align="start"
      side="bottom"
      sideOffset={6}
      className="w-64 p-1"
    >
      <DropdownMenuLabel className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground px-2 py-1.5">
        Suas lojas
      </DropdownMenuLabel>
      {stores.map((s) => {
        const active = s.id === currentId;
        return (
          <DropdownMenuItem
            key={s.id}
            onSelect={() => onSelect(s.id)}
            className="cursor-pointer gap-2 rounded-md px-2 py-2 focus:bg-accent"
          >
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-zinc-900 text-[10px] font-semibold text-white dark:bg-white dark:text-zinc-900">
              {s.initial ?? s.name.charAt(0).toUpperCase()}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium text-foreground leading-tight">
                {s.name}
              </span>
              <span className="block text-[10px] uppercase tracking-wider text-muted-foreground leading-none mt-0.5">
                {s.role}
              </span>
            </span>
            {active && <Check className="h-4 w-4 shrink-0 text-foreground" />}
          </DropdownMenuItem>
        );
      })}
      <DropdownMenuSeparator />
      <DropdownMenuItem
        onSelect={onCreate}
        className="cursor-pointer gap-2 rounded-md px-2 py-2 text-sm font-medium focus:bg-accent"
      >
        <span className="flex h-6 w-6 items-center justify-center rounded-md border border-dashed border-zinc-300 dark:border-zinc-700">
          <Plus className="h-3.5 w-3.5" />
        </span>
        Adicionar nova loja
      </DropdownMenuItem>
    </DropdownMenuContent>
  );
}
