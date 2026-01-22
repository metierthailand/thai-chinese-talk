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
    label: "User Management",
    items: [
      {
        title: "Staffs",
        url: "/dashboard/admin",
        icon: UserStar,
        roles: ["SUPER_ADMIN", "ADMIN"],
      },
      {
        title: "Customers",
        url: "/dashboard/customers",
        icon: User,
      },
      {
        title: "Families / Groups",
        url: "/dashboard/families",
        icon: House,
      },
    ],
  },
  {
    id: 2,
    label: "Trip Management",
    items: [
      {
        title: "Trips",
        url: "/dashboard/trips",
        icon: Plane,
      },
    ],
  },
  {
    id: 3,
    label: "Sales Pipeline",
    items: [
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
        title: "Commissions",
        url: "/dashboard/commissions",
        icon: CreditCard,
        roles: ["SUPER_ADMIN", "ADMIN"],
      },
    ],
  },
  {
    id: 4,
    label: "Task Management",
    items: [
      {
        title: "Tasks",
        url: "/dashboard/tasks",
        icon: ListTodo,
      },
    ],
  },
  {
    id: 5,
    label: "Master Data",
    items: [
      {
        title: "Tags",
        url: "/dashboard/tags",
        icon: Tag,
      },
      {
        title: "IATA Codes",
        url: "/dashboard/airline-and-airports",
        icon: MapPin,
      },
    ],
  },
];
