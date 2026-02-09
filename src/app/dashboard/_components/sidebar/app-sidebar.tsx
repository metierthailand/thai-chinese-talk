"use client";

import Link from "next/link";

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
                  <div className="flex items-center justify-center gap-2">
                    <picture className="size-6">
                      <img className="object-contain" src="/icon.webp" alt="ThaiChinese Tour" />
                    </picture>
                    <p className="text-sm font-medium">ThaiChinese Tour</p>
                  </div>
                ) : (
                  <picture className="size-6">
                    <img className="object-contain" src="/icon.webp" alt="ThaiChinese Tour" />
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
