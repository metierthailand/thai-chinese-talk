import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import z from "zod";
import { Passport } from "./types";
import { customerKeys } from "./use-customers";

export const passportFormSchema = z.object({
  id: z.string().optional(),
  customerId: z.string(),
  passportNumber: z.string().min(1, "Passport number is required"),
  issuingCountry: z.string().min(1, "Issuing country is required"),
  expiryDate: z.date(),
  isPrimary: z.boolean(),
});

export type PassportFormValues = z.infer<typeof passportFormSchema>;

// Query keys
export const passportKeys = {
  all: ["passports"] as const,
  byCustomer: (customerId: string) => [...passportKeys.all, "customer", customerId] as const,
};

// Create passport
async function createPassport(data: Omit<PassportFormValues, "id">): Promise<Passport> {
  const response = await fetch("/api/passports", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      customerId: data.customerId,
      passportNumber: data.passportNumber,
      issuingCountry: data.issuingCountry,
      expiryDate: data.expiryDate.toISOString(),
      isPrimary: data.isPrimary,
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: "Failed to create passport" }));
    throw new Error(error.error || "Failed to create passport");
  }

  return response.json();
}

// Update passport
async function updatePassport(
  id: string,
  data: Omit<PassportFormValues, "id" | "customerId">
): Promise<Passport> {
  const response = await fetch(`/api/passports/${id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      passportNumber: data.passportNumber,
      issuingCountry: data.issuingCountry,
      expiryDate: data.expiryDate.toISOString(),
      isPrimary: data.isPrimary,
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: "Failed to update passport" }));
    throw new Error(error.error || "Failed to update passport");
  }

  return response.json();
}

// Delete passport
async function deletePassport(id: string): Promise<void> {
  const response = await fetch(`/api/passports/${id}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: "Failed to delete passport" }));
    throw new Error(error.error || "Failed to delete passport");
  }
}

// Hook for creating passport
export function useCreatePassport(customerId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Omit<PassportFormValues, "id" | "customerId">) =>
      createPassport({ ...data, customerId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: passportKeys.byCustomer(customerId) });
      queryClient.invalidateQueries({ queryKey: customerKeys.detail(customerId) });
      toast.success("Passport created successfully");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to create passport");
    },
  });
}

// Hook for updating passport
export function useUpdatePassport(customerId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, ...data }: PassportFormValues) => updatePassport(id!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: passportKeys.byCustomer(customerId) });
      queryClient.invalidateQueries({ queryKey: customerKeys.detail(customerId) });
      toast.success("Passport updated successfully");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to update passport");
    },
  });
}

// Hook for deleting passport
export function useDeletePassport(customerId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deletePassport,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: passportKeys.byCustomer(customerId) });
      queryClient.invalidateQueries({ queryKey: customerKeys.detail(customerId) });
      toast.success("Passport deleted successfully");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to delete passport");
    },
  });
}

