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
  User,
  CreditCard,
  ListTodo,
  MapPin,
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
    label: "Main Will be remove",
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
    label: "User management",
    items: [
      {
        title: "Users",
        url: "/dashboard/admin",
        icon: UserStar,
        roles: ["SUPER_ADMIN", "ADMIN"],
      },
      {
        title: "Customer",
        url: "/dashboard/customers",
        icon: User,
      },
      {
        title: "Family",
        url: "/dashboard/family",
        icon: Users,
      },
    ],
  },
  {
    id: 3,
    label: "Trip management",
    items: [
      {
        title: "Trip",
        url: "/dashboard/trips",
        icon: Plane,
      },
    ],
  },
  {
    id: 4,
    label: "Sales pipeline",
    items: [
      {
        title: "Lead",
        url: "/dashboard/leads",
        icon: Target,
      },
      {
        title: "Booking",
        url: "/dashboard/bookings",
        icon: Calendar,
      },
      {
        title: "Commission",
        url: "/dashboard/commissions",
        icon: CreditCard,
      },
    ],
  },
  {
    id: 5,
    label: "Task & Interaction",
    items: [
      {
        title: "Task",
        url: "/dashboard/tasks",
        icon: ListTodo,
      },
    ],
  },
  {
    id: 6,
    label: "Master data",
    items: [
      {
        title: "Tag",
        url: "/dashboard/tags",
        icon: Tag,
      },
      {
        title: "IATA code",
        url: "/dashboard/iata-codes",
        icon: MapPin,
      },
    ],
  },
];
