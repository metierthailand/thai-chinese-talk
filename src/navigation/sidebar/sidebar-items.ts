import {
  LayoutDashboard,
  Users,
  Target,
  Calendar,
  Plane,
  Tag,
  Bell,
  type LucideIcon,
  UserStar,
} from "lucide-react";

export interface NavSubItem {
  title: string;
  url: string;
  icon?: LucideIcon;
  comingSoon?: boolean;
  newTab?: boolean;
  isNew?: boolean;
}

export interface NavMainItem {
  title: string;
  url: string;
  icon?: LucideIcon;
  subItems?: NavSubItem[];
  comingSoon?: boolean;
  newTab?: boolean;
  isNew?: boolean;
  roles?: string[]; // Roles that can see this item
}

export interface NavGroup {
  id: number;
  label?: string;
  items: NavMainItem[];
}

export const sidebarItems: NavGroup[] = [
  {
    id: 1,
    label: "Main",
    items: [
      {
        title: "Dashboard",
        url: "/dashboard",
        icon: LayoutDashboard,
      },
      {
        title: "Customers",
        url: "/dashboard/customers",
        icon: Users,
      },
      {
        title: "Tags",
        url: "/dashboard/tags",
        icon: Tag,
      },
      {
        title: "Leads",
        url: "/dashboard/leads",
        icon: Target,
      },
      {
        title: "Bookings",
        url: "/dashboard/bookings",
        icon: Calendar,
      },
      {
        title: "Trips",
        url: "/dashboard/trips",
        icon: Plane,
      },
      {
        title: "Notifications",
        url: "/dashboard/notifications",
        icon: Bell,
      },
    ],
  },
  {
    id: 2,
    label: "Admin",
    items: [
      {
        title: "Admin Management",
        url: "/dashboard/admin",
        icon: UserStar,
        roles: ["SUPER_ADMIN"],
      },
    ],
  },
];
