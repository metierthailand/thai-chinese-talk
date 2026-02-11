import { useQuery } from "@tanstack/react-query";

export interface UserInfo {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  commissionPerHead: number | null;
  isActive: boolean;
  createdAt: string;
}

export interface CommissionBooking {
  id: string;
  customerName: string;
  tripName: string;
  tripCode: string;
  destination: string;
  totalAmount: number;
  paidAmount: number;
  commission: number;
  createdAt: string;
}

export interface CommissionData {
  commissionRate: number; // This is commissionPerHead (fixed amount per booking)
  totalSales: number;
  totalCommission: number;
  mtdCommission: number;
  totalBookings: number;
  bookings: CommissionBooking[];
  page: number;
  pageSize: number;
  totalPages: number;
}

// Query key factory
export const accountKeys = {
  all: ["account"] as const,
  userInfo: () => [...accountKeys.all, "userInfo"] as const,
  commission: (page?: number, pageSize?: number) => [...accountKeys.all, "commission", page, pageSize] as const,
};

// Fetch user info
async function fetchUserInfo(): Promise<UserInfo> {
  const res = await fetch("/api/auth/me");
  if (!res.ok) {
    throw new Error("Failed to fetch user info");
  }
  return res.json();
}

// Fetch commission data
async function fetchMyCommission(page: number = 1, pageSize: number = 5): Promise<CommissionData> {
  const params = new URLSearchParams();
  params.set("page", page.toString());
  params.set("pageSize", pageSize.toString());

  const res = await fetch(`/api/auth/my-commission?${params.toString()}`);
  if (!res.ok) {
    throw new Error("Failed to fetch commission data");
  }
  return res.json();
}

// Hook to fetch user info
export function useUserInfo() {
  return useQuery({
    queryKey: accountKeys.userInfo(),
    queryFn: fetchUserInfo,
    staleTime: 30 * 1000, // 30 seconds
  });
}

// Hook to fetch commission data
export function useMyCommission(enabled: boolean = true, page: number = 1, pageSize: number = 5) {
  return useQuery({
    queryKey: accountKeys.commission(page, pageSize),
    queryFn: () => fetchMyCommission(page, pageSize),
    enabled,
    staleTime: 30 * 1000, // 30 seconds
  });
}
