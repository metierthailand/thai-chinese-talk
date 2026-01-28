"use client";

import Link from "next/link";

import { Settings, CircleHelp, Search, Database, ClipboardList, File, Command } from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { sidebarItems } from "@/navigation/sidebar/sidebar-items";

import { NavMain } from "./nav-main";

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { open, isMobile, setOpenMobile } = useSidebar();

  const handleLinkClick = () => {
    if (isMobile) {
      setOpenMobile(false);
    }
  };

  return (
    <Sidebar {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild className="data-[slot=sidebar-menu-button]:!p-1.5">
              <Link href="/dashboard" onClick={handleLinkClick}>
                {open ? (
                  <picture>
                    <img className="translate-y-2 object-contain" src="/banner.webp" alt="Thai Chinese Tour" />
                  </picture>
                ) : (
                  <picture>
                    <img className="object-contain" src="/icon.webp" alt="Thai Chinese Tour" />
                  </picture>
                )}
                {/* <Command /> */}
                {/* <span className="text-base font-semibold">{APP_CONFIG.name}</span> */}
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={sidebarItems} />
        {/* <NavDocuments items={data.documents} /> */}
        {/* <NavSecondary items={data.navSecondary} className="mt-auto" /> */}
      </SidebarContent>
      <SidebarFooter>{/* <NavUser user={rootUser} /> */}</SidebarFooter>
    </Sidebar>
  );
}
