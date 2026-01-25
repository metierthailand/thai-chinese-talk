import { Role } from "@/lib/constants/role";

export interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber?: string | null;
  role: Role;
  isActive: boolean;
  commissionPerHead: number | null;
  totalCommission?: number;
  createdAt?: string;
  updatedAt?: string;
}

