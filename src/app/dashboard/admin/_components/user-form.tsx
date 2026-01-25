"use client";

import { useEffect } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Loader2 } from "lucide-react";
import { ROLE_VALUES, ROLE_LABELS } from "@/lib/constants/role";
import { userFormSchema, UserFormValues } from "../hooks/use-users";
import { Badge } from "@/components/ui/badge";

interface UserFormProps {
  mode: "create" | "edit" | "view";
  initialData?: Partial<UserFormValues>;
  onSubmit?: (values: UserFormValues) => Promise<void>;
  onCancel?: () => void;
  isLoading?: boolean;
}

export function UserForm({ mode, initialData, onSubmit, onCancel, isLoading = false }: UserFormProps) {
  const readOnly = mode === "view";

  const form = useForm<UserFormValues>({
    resolver: zodResolver(userFormSchema),
    defaultValues: {
      firstName: initialData?.firstName ?? "",
      lastName: initialData?.lastName ?? "",
      email: initialData?.email ?? "",
      phoneNumber: initialData?.phoneNumber ?? "",
      role: initialData?.role ?? undefined,
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
        role: initialData.role ?? undefined,
        commissionPerHead: initialData.commissionPerHead ?? "",
        isActive: initialData.isActive ?? true,
      });
    }
  }, [initialData, form]);

  async function handleSubmit(values: UserFormValues) {
    if (!onSubmit || readOnly) return;
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
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6" noValidate>
        <h2 className="text-xl font-semibold">Staff information</h2>
        {(mode === "edit" || mode === "view") && (
          <FormField
            control={form.control}
            name="isActive"
            render={({ field }) => (
              <FormItem className="flex flex-col gap-2 rounded-lg border p-4">
                <div className="flex flex-row items-center justify-between">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">Status</FormLabel>
                  </div>
                  <FormControl>
                    {readOnly ? (
                      <Badge variant={field.value ? "default" : "destructive"}>{field.value ? "Active" : "Inactive"}</Badge>
                    ) : (
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    )}
                  </FormControl>
                </div>
                <FormDescription>
                  When the toggle is off, this user can no longer access the system.
                </FormDescription>
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
                {readOnly ? (
                  <Input value={field.value || ""} disabled />
                ) : (
                  <Input placeholder="First name" {...field} disabled={isLoading} />
                )}
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
                {readOnly ? (
                  <Input value={field.value || ""} disabled />
                ) : (
                  <Input placeholder="Last name" {...field} disabled={isLoading} />
                )}
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
                {readOnly ? (
                  <Input value={field.value || ""} disabled />
                ) : (
                  <Input type="email" placeholder="Email" {...field} disabled={isLoading} />
                )}
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
                {readOnly ? (
                  <Input value={field.value || ""} disabled />
                ) : (
                  <Input type="tel" placeholder="Phone number" {...field} disabled={isLoading} />
                )}
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
              {readOnly ? (
                <FormControl>
                  <Input value={ROLE_LABELS[field.value] || field.value} disabled />
                </FormControl>
              ) : (
                <Select onValueChange={field.onChange} value={field.value || ""} disabled={isLoading}>
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
              )}
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
                  {readOnly ? (
                    <Input value={field.value || ""} disabled />
                  ) : (
                    <Input type="number" step="0.01" placeholder="0.00" {...field} disabled={isLoading} />
                  )}
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        {mode !== "view" && (
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
        )}
      </form>
    </Form>
  );
}
