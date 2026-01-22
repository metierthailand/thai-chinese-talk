import { useQuery } from "@tanstack/react-query";

export interface CommissionSummary {
  agentId: string;
  agentName: string;
  totalTrips: number;
  totalPeople: number;
  totalCommissionAmount: number;
}

export interface CommissionDetail {
  id: string;
  tripCode: string;
  customerName: string;
  totalPeople: number;
  commissionAmount: number;
}

// Fetch commission summary
async function fetchCommissionSummary(
  search?: string,
  createdAtFrom?: string,
  createdAtTo?: string
): Promise<CommissionSummary[]> {
  const params = new URLSearchParams();

  if (search) {
    params.set("search", search);
  }
  if (createdAtFrom) {
    params.set("createdAtFrom", createdAtFrom);
  }
  if (createdAtTo) {
    params.set("createdAtTo", createdAtTo);
  }

  const res = await fetch(`/api/commissions?${params.toString()}`);
  if (!res.ok) {
    throw new Error("Failed to fetch commission summary");
  }
  return res.json();
}

// Fetch commission details for a specific agent
async function fetchCommissionDetails(
  agentId: string,
  createdAtFrom?: string,
  createdAtTo?: string
): Promise<CommissionDetail[]> {
  const params = new URLSearchParams();

  if (createdAtFrom) {
    params.set("createdAtFrom", createdAtFrom);
  }
  if (createdAtTo) {
    params.set("createdAtTo", createdAtTo);
  }

  const res = await fetch(`/api/commissions/${agentId}?${params.toString()}`);
  if (!res.ok) {
    throw new Error("Failed to fetch commission details");
  }
  return res.json();
}

// Query key factory
export const commissionKeys = {
  all: ["commissions"] as const,
  summaries: () => [...commissionKeys.all, "summary"] as const,
  summary: (search?: string, createdAtFrom?: string, createdAtTo?: string) =>
    [...commissionKeys.summaries(), search, createdAtFrom, createdAtTo] as const,
  details: () => [...commissionKeys.all, "detail"] as const,
  detail: (agentId: string, createdAtFrom?: string, createdAtTo?: string) =>
    [...commissionKeys.details(), agentId, createdAtFrom, createdAtTo] as const,
};

// Hook to fetch commission summary
export function useCommissionSummary(
  search?: string,
  createdAtFrom?: string,
  createdAtTo?: string
) {
  return useQuery({
    queryKey: commissionKeys.summary(search, createdAtFrom, createdAtTo),
    queryFn: () => fetchCommissionSummary(search, createdAtFrom, createdAtTo),
    staleTime: 30 * 1000, // 30 seconds
    placeholderData: (previousData) => previousData, // Keep previous data while fetching new data
  });
}

// Hook to fetch commission details for an agent
export function useCommissionDetails(
  agentId: string | undefined,
  createdAtFrom?: string,
  createdAtTo?: string
) {
  return useQuery({
    queryKey: commissionKeys.detail(agentId || "", createdAtFrom, createdAtTo),
    queryFn: () => fetchCommissionDetails(agentId!, createdAtFrom, createdAtTo),
    enabled: !!agentId,
    staleTime: 30 * 1000, // 30 seconds
  });
}
