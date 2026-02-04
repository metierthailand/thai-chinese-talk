"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

import { LayoutDashboard, Search, User, Settings } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { sidebarItems } from "@/navigation/sidebar/sidebar-items";

export function SearchDialog() {
  const router = useRouter();
  const { data: session } = useSession();
  const userRole = session?.user?.role;
  const [open, setOpen] = React.useState(false);
  
  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "j" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  // Build search items from sidebar structure
  const searchItems = React.useMemo(() => {
    const items: Array<{
      group: string;
      icon: React.ComponentType<{ className?: string }>;
      label: string;
      url: string;
    }> = [];

    // Add Dashboard
    items.push({
      group: "Main",
      icon: LayoutDashboard,
      label: "Dashboard",
      url: "/dashboard",
    });

    // Add Account
    items.push({
      group: "Main",
      icon: Settings,
      label: "Account",
      url: "/dashboard/account",
    });

    // Add items from sidebar structure
    sidebarItems.forEach((group) => {
      group.items.forEach((item) => {
        // Filter by role if specified
        if (item.roles && userRole && !item.roles.includes(userRole)) {
          return;
        }

        // Skip if coming soon
        if (item.comingSoon) {
          return;
        }

        items.push({
          group: group.label || "Other",
          icon: item.icon || User,
          label: item.title,
          url: item.getUrl?.() ?? item.url,
        });
      });
    });

    return items;
  }, [userRole]);

  return (
    <>
      <Button
        variant="link"
        className="text-muted-foreground px-0! font-normal hover:no-underline"
        onClick={() => setOpen(true)}
      >
        <Search className="size-4" />
        Search
        <kbd className="bg-muted inline-flex h-5 items-center gap-1 rounded border px-1.5 text-[10px] font-medium select-none">
          <span className="text-xs">⌘</span>J
        </kbd>
      </Button>
      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="Search pages, customers, leads, bookings, and more…" />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>
          {[...new Set(searchItems.map((item) => item.group))].map((group, i) => (
            <React.Fragment key={group}>
              {i !== 0 && <CommandSeparator />}
              <CommandGroup heading={group} key={group}>
                {searchItems
                  .filter((item) => item.group === group)
                  .map((item) => (
                    <CommandItem
                      className="py-1.5!"
                      key={item.label}
                      onSelect={() => {
                        setOpen(false);
                        if (item.url) {
                          router.push(item.url);
                        }
                      }}
                    >
                      {item.icon && <item.icon className="mr-2 h-4 w-4" />}
                      <span>{item.label}</span>
                    </CommandItem>
                  ))}
              </CommandGroup>
            </React.Fragment>
          ))}
        </CommandList>
      </CommandDialog>
    </>
  );
}
