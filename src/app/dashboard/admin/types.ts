import { Role } from "@/lib/constants/role";

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  isActive: boolean;
  commissionRate: number | null;
  totalCommission?: number;
  createdAt?: string;
}

