import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import z from "zod";
import Decimal from "decimal.js";
import type { Passport } from "./types";

export const customerFormSchema = z.object({
  firstNameTh: z.string().min(1, {
    message: "First name (Thai) is required.",
  }),
  lastNameTh: z.string().min(1, {
    message: "Last name (Thai) is required.",
  }),
  firstNameEn: z.string().min(1, {
    message: "First name (English) is required.",
  }),
  lastNameEn: z.string().min(1, {
    message: "Last name (English) is required.",
  }),
  title: z.enum(["MR", "MRS", "MS", "OTHER"]).optional(),
  nickname: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional(),
  lineId: z.string().optional(),
  nationality: z.string().optional(),
  dateOfBirth: z.string().optional(),
  preferences: z.string().optional(),
  type: z.enum(["INDIVIDUAL", "CORPORATE"]),
  tagIds: z.array(z.string()).optional(),
});

export type CustomerFormValues = z.infer<typeof customerFormSchema>;

interface Customer {
  id: string;
  firstNameTh: string;
  lastNameTh: string;
  firstNameEn: string;
  lastNameEn: string;
  nickname: string | null;
  email: string | null;
  phone: string | null;
  type: "INDIVIDUAL" | "CORPORATE";
  title?: "MR" | "MRS" | "MS" | "OTHER" | null;
  lineId?: string | null;
  nationality?: string | null;
  dateOfBirth?: string | null;
  preferences?: string | null;
  tags: CustomerTag[];
  createdAt: string;
  updatedAt: string;
}

interface CustomerTask {
  id: string;
  title: string;
  dueDate: string;
  isCompleted: boolean;
  priority: string;
}

interface CustomerLeadSummary {
  id: string;
  destinationInterest: string | null;
  status: string;
}

interface CustomerBookingSummary {
  id: string;
  trip: {
    name: string;
    startDate: string | Date;
    endDate: string | Date;
  };
  status: string;
  totalAmount: Decimal | string | number | null;
}

interface CustomerTag {
  tag: {
    id: string;
    name: string;
    color: string | null;
  };
}

interface CustomerDetail extends Customer {
  passports: Passport[];
  interactions: unknown[]; // ถ้ายังไม่ใช้ ปล่อย unknown[] ไปก่อนก็ได้
  leads: CustomerLeadSummary[];
  bookings: CustomerBookingSummary[];
  tasks: CustomerTask[];
}

interface CustomersResponse {
  data: Customer[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// Query key factory
export const customerKeys = {
  all: ["customers"] as const,
  lists: () => [...customerKeys.all, "list"] as const,
  list: (
    page: number,
    pageSize: number,
    search?: string,
    type?: string,
    passportExpiryFrom?: string,
    passportExpiryTo?: string
  ) => [...customerKeys.lists(), page, pageSize, search, type, passportExpiryFrom, passportExpiryTo] as const,
  details: () => [...customerKeys.all, "detail"] as const,
  detail: (id: string) => [...customerKeys.details(), id] as const,
};

// Fetch customers function
async function fetchCustomers(
  page: number = 1,
  pageSize: number = 10,
  search?: string,
  type?: string,
  passportExpiryFrom?: string,
  passportExpiryTo?: string
): Promise<CustomersResponse> {
  const params = new URLSearchParams({
    page: page.toString(),
    pageSize: pageSize.toString(),
  });
  if (search && search.trim()) {
    params.set("search", search.trim());
  }
  if (type && type !== "ALL") {
    params.set("type", type);
  }
  if (passportExpiryFrom) {
    params.set("passportExpiryFrom", passportExpiryFrom);
  }
  if (passportExpiryTo) {
    params.set("passportExpiryTo", passportExpiryTo);
  }

  const res = await fetch(`/api/customers?${params.toString()}`);
  if (!res.ok) {
    throw new Error("Failed to fetch customers");
  }
  return res.json();
}

// Search customers function (for combobox)
async function searchCustomers(search: string, limit: number = 10): Promise<Customer[]> {
  const query = search.trim();
  const params = new URLSearchParams({
    page: "1",
    pageSize: String(limit),
  });

  if (query.length > 0) {
    params.set("search", query);
  }

  const res = await fetch(`/api/customers?${params.toString()}`);
  if (!res.ok) {
    throw new Error("Failed to search customers");
  }
  const data = await res.json();
  return data.data || [];
}

// Fetch single customer function
async function fetchCustomer(id: string): Promise<CustomerDetail> {
  const res = await fetch(`/api/customers/${id}`);
  if (!res.ok) {
    throw new Error("Failed to fetch customer");
  }
  return res.json();
}

// Create customer function
async function createCustomer(data: CustomerFormValues): Promise<Customer> {
  const res = await fetch("/api/customers", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.message || "Failed to create customer");
  }

  return res.json();
}

// Update customer function
async function updateCustomer({ id, data }: { id: string; data: CustomerFormValues }): Promise<CustomerDetail> {
  const res = await fetch(`/api/customers/${id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.message || "Failed to update customer");
  }

  return res.json();
}

// Hook to fetch customers with pagination
export function useCustomers({
  page,
  pageSize,
  search,
  type,
  passportExpiryFrom,
  passportExpiryTo,
}: {
  page: number;
  pageSize: number; 
  search?: string;
  type?: string;
  passportExpiryFrom?: string;
  passportExpiryTo?: string;
}) {
  return useQuery({
    queryKey: customerKeys.list(page, pageSize, search, type, passportExpiryFrom, passportExpiryTo),
    queryFn: () => fetchCustomers(page, pageSize, search, type, passportExpiryFrom, passportExpiryTo),
    staleTime: 30 * 1000, // 30 seconds
  });
}

// Hook to search customers (for combobox)
export function useSearchCustomers(search: string, limit: number = 10) {
  return useQuery({
    queryKey: [...customerKeys.all, "search", search.trim() || "default", limit],
    queryFn: () => searchCustomers(search, limit),
    staleTime: 10 * 1000, // 10 seconds
  });
}

// Hook to fetch a single customer
export function useCustomer(id: string | undefined) {
  return useQuery({
    queryKey: customerKeys.detail(id!),
    queryFn: () => fetchCustomer(id!),
    enabled: !!id, // Only fetch if id is provided
    staleTime: 30 * 1000, // 30 seconds
  });
}

// Hook to create a customer
export function useCreateCustomer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createCustomer,
    onSuccess: () => {
      // Invalidate all customer queries to refetch
      queryClient.invalidateQueries({ queryKey: customerKeys.all });
      toast.success("Customer created successfully");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to create customer");
    },
  });
}

// Hook to update a customer
export function useUpdateCustomer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateCustomer,
    onSuccess: (data, variables) => {
      // Invalidate all customer queries to refetch
      queryClient.invalidateQueries({ queryKey: customerKeys.all });
      // Update the specific customer in cache
      queryClient.setQueryData(customerKeys.detail(variables.id), data);
      toast.success("Customer updated successfully");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to update customer");
    },
  });
}

// Export types
export type { Customer, CustomersResponse, CustomerDetail, CustomerTask, CustomerLeadSummary, CustomerBookingSummary };