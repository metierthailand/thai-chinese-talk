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
  House,
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
        title: "Families",
        url: "/dashboard/families",
        icon: House,
      },
    ],
  },
  {
    id: 2,
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
    id: 3,
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
    id: 4,
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
    id: 5,
    label: "Master data",
    items: [
      {
        title: "Tag",
        url: "/dashboard/tags",
        icon: Tag,
      },
      {
        title: "IATA code",
        url: "/dashboard/airline-and-airports",
        icon: MapPin,
      },
    ],
  },
];
