"use client";

import { useEffect } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Loader2 } from "lucide-react";
import { ROLE_VALUES, ROLE_LABELS } from "@/lib/constants/role";
import { userFormSchema, UserFormValues } from "../hooks/use-users";

interface UserFormProps {
  mode: "create" | "edit";
  initialData?: Partial<UserFormValues>;
  onSubmit: (values: UserFormValues) => Promise<void>;
  onCancel?: () => void;
  isLoading?: boolean;
}

export function UserForm({ mode, initialData, onSubmit, onCancel, isLoading = false }: UserFormProps) {
  const form = useForm<UserFormValues>({
    resolver: zodResolver(userFormSchema),
    defaultValues: {
      firstName: initialData?.firstName ?? "",
      lastName: initialData?.lastName ?? "",
      email: initialData?.email ?? "",
      phoneNumber: initialData?.phoneNumber ?? "",
      role: initialData?.role ?? "STAFF",
      commissionPerHead: initialData?.commissionPerHead ?? "",
      isActive: initialData?.isActive ?? true,
    },
  });

  const role = useWatch({ control: form.control, name: "role" });

  // Reset form when initialData changes (for edit mode)
  useEffect(() => {
    if (initialData) {
      form.reset({
        firstName: initialData.firstName ?? "",
        lastName: initialData.lastName ?? "",
        email: initialData.email ?? "",
        phoneNumber: initialData.phoneNumber ?? "",
        role: initialData.role ?? "STAFF",
        commissionPerHead: initialData.commissionPerHead ?? "",
        isActive: initialData.isActive ?? true,
      });
    }
  }, [initialData, form]);

  async function handleSubmit(values: UserFormValues) {
    try {
      await onSubmit(values);
    } catch (error) {
      if (error instanceof Error) {
        const fieldError = error as Error & { field?: string; fields?: { field: string; message: string }[] };

        // Handle multiple field errors
        if (fieldError.fields && Array.isArray(fieldError.fields)) {
          fieldError.fields.forEach((err) => {
            if (err.field === "email" || err.field === "phoneNumber") {
              form.setError(err.field as "email" | "phoneNumber", {
                type: "server",
                message: err.message,
              });
            }
          });
        }
        // Handle single field error (backward compatibility)
        else if (fieldError.field === "email") {
          form.setError("email", {
            type: "server",
            message: error.message,
          });
        } else if (fieldError.field === "phoneNumber") {
          form.setError("phoneNumber", {
            type: "server",
            message: error.message,
          });
        }
      }
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        {mode === "edit" && (
          <FormField
            control={form.control}
            name="isActive"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <FormLabel className="text-base">Active</FormLabel>
                </div>
                <FormControl>
                  <Switch checked={field.value} onCheckedChange={field.onChange} />
                </FormControl>
              </FormItem>
            )}
          />
        )}

        <FormField
          control={form.control}
          name="firstName"
          render={({ field }) => (
            <FormItem>
              <FormLabel required>First name</FormLabel>
              <FormControl>
                <Input placeholder="First name" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="lastName"
          render={({ field }) => (
            <FormItem>
              <FormLabel required>Last name</FormLabel>
              <FormControl>
                <Input placeholder="Last name" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel required>Email</FormLabel>
              <FormControl>
                <Input type="email" placeholder="Email" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="phoneNumber"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Phone number</FormLabel>
              <FormControl>
                <Input type="tel" placeholder="Phone number" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="role"
          render={({ field }) => (
            <FormItem>
              <FormLabel required>Role</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Role" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {ROLE_VALUES.map((role) => {
                    return (
                      <SelectItem key={role} value={role}>
                        {ROLE_LABELS[role]}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {role === "SALES" && (
          <FormField
            control={form.control}
            name="commissionPerHead"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Commission per head (Baht)</FormLabel>
                <FormControl>
                  <Input type="number" step="0.01" placeholder="0.00" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        <div className="flex justify-end gap-4">
          {onCancel && (
            <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
              Cancel
            </Button>
          )}
          <Button type="submit" disabled={isLoading || form.formState.isSubmitting}>
            {isLoading || form.formState.isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : mode === "create" ? (
              "Create"
            ) : (
              "Update"
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
}
