import {
  Target,
  Calendar,
  Plane,
  Tag,
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
  getUrl?: () => string;
  icon?: LucideIcon;
  comingSoon?: boolean;
  newTab?: boolean;
  isNew?: boolean;
}

export interface NavMainItem {
  title: string;
  url: string;
  /** Optional dynamic URL builder (e.g. include default query params). */
  getUrl?: () => string;
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

function startOfMonthISO(year: number, month: number) {
  return new Date(year, month - 1, 1, 0, 0, 0, 0).toISOString();
}

function endOfMonthISO(year: number, month: number) {
  return new Date(year, month, 0, 23, 59, 59, 999).toISOString();
}

function commissionsUrlForCurrentMonth() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const params = new URLSearchParams();
  params.set("createdAtFrom", startOfMonthISO(year, month));
  params.set("createdAtTo", endOfMonthISO(year, month));
  return `/dashboard/commissions?${params.toString()}`;
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
        getUrl: commissionsUrlForCurrentMonth,
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
