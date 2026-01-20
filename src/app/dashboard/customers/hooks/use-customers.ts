import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import z from "zod";
import Decimal from "decimal.js";
import { Passport as PassportType } from "./types";
import { phoneNumberFormat } from "@/utils/zod-format";

export const customerFormSchema = z.object({
  firstNameTh: z.string().optional(),
  lastNameTh: z.string().optional(),
  firstNameEn: z.string().min(1, {
    message: "Please fill in the information.",
  }),
  lastNameEn: z.string().min(1, {
    message: "Please fill in the information.",
  }),
  title: z
    .string({
      message: "Please select the information.",
    })
    .refine((val) => ["MR", "MRS", "MISS", "MASTER", "OTHER"].includes(val), {
      message: "Title must be one of: MR, MRS, MISS, MASTER, OTHER",
    }),
  email: z.string().email().optional().or(z.literal("")),
  phone: phoneNumberFormat,
  lineId: z.string().optional(),
  dateOfBirth: z.string().min(1, {
    message: "Please fill in the information.",
  }),
  note: z.string().optional(),
  tagIds: z.array(z.string()).optional(),

  // New fields
  addresses: z
    .array(
      z.object({
        address: z.string().min(1, "Please fill in the information."),
        province: z.string().min(1, "Please fill in the information."),
        district: z.string().min(1, "Please fill in the information."),
        subDistrict: z.string().min(1, "Please fill in the information."),
        postalCode: z.string().min(1, "Please fill in the information."),
      }),
    )
    .optional(),

  passports: z
    .array(
      z.object({
        passportNumber: z.string().min(6, "Passport number must be at least 6 characters."),
        issuingCountry: z.string().min(1, "Please fill in the information."),
        issuingDate: z.union([z.string(), z.date()]).refine(
          (val) => {
            if (val === null || val === undefined || val === "") return false;
            if (typeof val === "string" && val.trim() === "") return false;
            return true;
          },
          { message: "Please fill in the information." },
        ),
        expiryDate: z.union([z.string(), z.date()]).refine(
          (val) => {
            if (val === null || val === undefined || val === "") return false;
            if (typeof val === "string" && val.trim() === "") return false;
            return true;
          },
          { message: "Please fill in the information." },
        ),
        imageUrl: z.string().optional().nullable(),
        isPrimary: z.boolean(),
      }),
    )
    .min(1, "At least one passport is required"),

  foodAllergies: z
    .array(
      z.object({
        types: z.array(z.enum(["DIARY", "EGGS", "FISH", "CRUSTACEAN", "GLUTEN", "PEANUT_AND_NUTS", "OTHER"])),
        note: z.string().optional(),
      }),
    )
    .optional(),
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
  title?: "MR" | "MRS" | "MISS" | "MASTER" | "OTHER" | null;
  lineId?: string | null;
  dateOfBirth?: string | null;
  note?: string | null;
  tags: CustomerTag[];
  createdAt: string;
  updatedAt: string;
}

// extend Customer interface
export interface CustomerWithTotalTrips extends Customer {
  totalTrips: number;
}

export interface Address {
  id?: string;
  address: string;
  province: string;
  district: string;
  subDistrict: string;
  postalCode: string;
}

// Re-export Passport type from types.ts for consistency
export type Passport = PassportType;

export interface FoodAllergy {
  id: string;
  types: ("DIARY" | "EGGS" | "FISH" | "CRUSTACEAN" | "GLUTEN" | "PEANUT_AND_NUTS" | "OTHER")[];
  note?: string | null;
}

interface CustomerTask {
  id: string;
  topic: string;
  deadline: string | null;
  status: "TODO" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
  contact: "CALL" | "LINE" | "MESSENGER" | null;
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
  addresses: Address[];
  passports: Passport[];
  foodAllergies: FoodAllergy[];
  leads: CustomerLeadSummary[];
  bookings: CustomerBookingSummary[];
  tasks: CustomerTask[];
}

interface CustomersResponse {
  data: CustomerWithTotalTrips[];
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
    passportExpiryTo?: string,
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
  passportExpiryTo?: string,
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
