"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Users,
  Plane,
  CalendarDays,
  FileText,
  Settings,
  LogOut,
} from "lucide-react";
import { signOut } from "next-auth/react";

const routes = [
  {
    label: "Dashboard",
    icon: LayoutDashboard,
    href: "/dashboard",
    color: "text-sky-500",
  },
  {
    label: "Customers",
    icon: Users,
    href: "/dashboard/customers",
    color: "text-violet-500",
  },
  {
    label: "Leads",
    icon: FileText,
    href: "/dashboard/leads",
    color: "text-pink-700",
  },
  {
    label: "Bookings",
    icon: Plane,
    href: "/dashboard/bookings",
    color: "text-orange-700",
  },
  {
    label: "Calendar",
    icon: CalendarDays,
    href: "/dashboard/calendar",
    color: "text-emerald-500",
  },
  {
    label: "Settings",
    icon: Settings,
    href: "/dashboard/settings",
  },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <div className="space-y-4 py-4 flex flex-col h-full bg-[#111827] text-white">
      <div className="px-3 py-2 flex-1">
        <Link href="/dashboard" className="flex items-center pl-3 mb-14">
          <h1 className="text-2xl font-bold">The Trip</h1>
        </Link>
        <div className="space-y-1">
          {routes.map((route) => (
            <Link
              key={route.href}
              href={route.href}
              className={cn(
                "text-sm group flex p-3 w-full justify-start font-medium cursor-pointer hover:text-white hover:bg-white/10 rounded-lg transition",
                pathname === route.href
                  ? "text-white bg-white/10"
                  : "text-zinc-400"
              )}
            >
              <div className="flex items-center flex-1">
                <route.icon className={cn("h-5 w-5 mr-3", route.color)} />
                {route.label}
              </div>
            </Link>
          ))}
        </div>
      </div>
      <div className="px-3 py-2">
        <div
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="text-sm group flex p-3 w-full justify-start font-medium cursor-pointer hover:text-white hover:bg-white/10 rounded-lg transition text-zinc-400"
        >
          <div className="flex items-center flex-1">
            <LogOut className="h-5 w-5 mr-3 text-red-500" />
            Sign Out
          </div>
        </div>
      </div>
    </div>
  );
}
