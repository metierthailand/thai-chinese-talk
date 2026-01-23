import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { User } from "../types";
import { UserFormValues } from "./use-users";

export interface UsersResponse {
  data: User[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

interface FieldError {
  field: string;
  message: string;
}

interface ErrorResponse {
  message?: string;
  errors?: FieldError[];
}

// Query key factory
export const userKeys = {
  all: ["users"] as const,
  lists: () => [...userKeys.all, "list"] as const,
  list: (page: number, pageSize: number, search?: string, role?: string) =>
    [...userKeys.lists(), page, pageSize, search, role] as const,
};

// Fetch users function
async function fetchUsers(
  page: number = 1,
  pageSize: number = 10,
  search?: string,
  role?: string
): Promise<UsersResponse> {
  const params = new URLSearchParams({
    page: page.toString(),
    pageSize: pageSize.toString(),
  });
  if (search && search.trim()) {
    params.set("search", search.trim());
  }
  if (role && role !== "ALL") {
    params.set("role", role);
  }
  const url = `/api/users?${params.toString()}`;

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error("Failed to fetch users");
  }
  return res.json();
}

// Hook to fetch users
export function useUsers(
  page: number = 1,
  pageSize: number = 10,
  search?: string,
  role?: string
) {
  return useQuery({
    queryKey: userKeys.list(page, pageSize, search, role),
    queryFn: () => fetchUsers(page, pageSize, search, role),
    staleTime: 30 * 1000, // 30 seconds
  });
}

// Hook to invalidate users queries
export function useInvalidateUsers() {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: userKeys.all });
  };
}

// Fetch single user function
async function fetchUser(id: string): Promise<User> {
  const res = await fetch(`/api/users/${id}`);
  if (!res.ok) {
    throw new Error("Failed to fetch user");
  }
  return res.json();
}

// Hook to fetch a single user
export function useUser(id: string | undefined) {
  return useQuery({
    queryKey: [...userKeys.all, "detail", id],
    queryFn: () => fetchUser(id!),
    enabled: !!id,
    staleTime: 30 * 1000, // 30 seconds
  });
}

// Create user function
async function createUser(data: UserFormValues): Promise<User> {
  const body = {
    ...data,
    commissionPerHead: data.commissionPerHead ? parseFloat(data.commissionPerHead) : null,
  };

  const res = await fetch("/api/users", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const contentType = res.headers.get("content-type");
    let errorData: ErrorResponse;
    
    if (contentType?.includes("application/json")) {
      errorData = await res.json();
    } else {
      errorData = { message: await res.text() };
    }

    // Check if response has errors array (multiple field errors)
    if (errorData.errors && Array.isArray(errorData.errors) && errorData.errors.length > 0) {
      const errorWithFields = new Error("Validation failed") as Error & { fields?: FieldError[] };
      errorWithFields.fields = errorData.errors;
      throw errorWithFields;
    }

    // Single error (backward compatibility)
    const errorMessage = errorData.message || "Failed to create user";
    const errorWithField = new Error(errorMessage) as Error & { field?: string };
    
    // Map API errors to form fields
    if (errorMessage.toLowerCase().includes("email") && errorMessage.toLowerCase().includes("already exists")) {
      errorWithField.field = "email";
    } else if (errorMessage.toLowerCase().includes("phone") && errorMessage.toLowerCase().includes("already exists")) {
      errorWithField.field = "phoneNumber";
    }
    
    throw errorWithField;
  }

  return res.json();
}

// Update user function
async function updateUser({ id, data }: { id: string; data: UserFormValues }): Promise<User & { _emailNotificationWarning?: string }> {
  const body = {
    ...data,
    commissionPerHead: data.commissionPerHead ? parseFloat(data.commissionPerHead) : null,
  };

  const res = await fetch(`/api/users/${id}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const contentType = res.headers.get("content-type");
    let errorData: ErrorResponse;
    
    if (contentType?.includes("application/json")) {
      errorData = await res.json();
    } else {
      errorData = { message: await res.text() };
    }

    // Check if response has errors array (multiple field errors)
    if (errorData.errors && Array.isArray(errorData.errors) && errorData.errors.length > 0) {
      const errorWithFields = new Error("Validation failed") as Error & { fields?: FieldError[] };
      errorWithFields.fields = errorData.errors;
      throw errorWithFields;
    }

    // Single error (backward compatibility)
    const errorMessage = errorData.message || "Failed to update user";
    const errorWithField = new Error(errorMessage) as Error & { field?: string };
    
    // Map API errors to form fields
    if (errorMessage.toLowerCase().includes("email") && errorMessage.toLowerCase().includes("already exists")) {
      errorWithField.field = "email";
    } else if (errorMessage.toLowerCase().includes("phone") && errorMessage.toLowerCase().includes("already exists")) {
      errorWithField.field = "phoneNumber";
    }
    
    throw errorWithField;
  }

  const response = await res.json();
  
  // Extract email notification status and remove from response
  const { emailNotificationSent, emailNotificationError, ...userData } = response;
  
  // Check if email notification failed
  if (emailNotificationSent === false && emailNotificationError) {
    // Return user data with warning attached
    return {
      ...userData,
      _emailNotificationWarning: emailNotificationError,
    } as User & { _emailNotificationWarning?: string };
  }
  
  return userData as User;
}

// Hook to create a user
export function useCreateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: userKeys.all });
      toast.success("Created successfully.");
    },
    onError: (error: Error & { field?: string }) => {
      // Only show toast if error doesn't have a field (field errors are shown in form)
      if (!error.field) {
        toast.error(error.message || "Created unsuccessfully.");
      }
    },
  });
}

// Hook to update a user
export function useUpdateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateUser,
    onSuccess: (data: User & { _emailNotificationWarning?: string }) => {
      queryClient.invalidateQueries({ queryKey: userKeys.all });
      toast.success("Updated successfully.");
      
      // Show warning if email notification failed
      if (data._emailNotificationWarning) {
        toast.warning(
          `User updated, but email notification failed: ${data._emailNotificationWarning}`,
          { duration: 5000 }
        );
      }
    },
    onError: (error: Error & { field?: string }) => {
      // Only show toast if error doesn't have a field (field errors are shown in form)
      if (!error.field) {
        toast.error(error.message || "Updated unsuccessfully.");
      }
    },
  });
}
