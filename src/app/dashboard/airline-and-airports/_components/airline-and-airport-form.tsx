"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { airlineAndAirportFormSchema, AirlineAndAirportFormValues } from "../hooks/use-airline-and-airports";

interface AirlineAndAirportFormProps {
  mode: "create" | "edit" | "view";
  initialData?: Partial<AirlineAndAirportFormValues>;
  onSubmit?: (values: AirlineAndAirportFormValues) => Promise<void>;
  onCancel?: () => void;
  isLoading?: boolean;
  onError?: (error: Error) => void;
}

export function AirlineAndAirportForm({
  mode,
  initialData,
  onSubmit,
  onCancel,
  isLoading = false,
  onError,
}: AirlineAndAirportFormProps) {
  const readOnly = mode === "view";
  
  const form = useForm<AirlineAndAirportFormValues>({
    resolver: zodResolver(airlineAndAirportFormSchema),
    defaultValues: {
      code: initialData?.code ?? "",
      name: initialData?.name ?? "",
    },
  });

  // Reset form when initialData changes (for edit mode)
  useEffect(() => {
    if (initialData) {
      form.reset({
        code: initialData.code ?? "",
        name: initialData.name ?? "",
      });
    }
  }, [initialData, form]);

  async function handleSubmit(values: AirlineAndAirportFormValues) {
    if (!onSubmit || readOnly) return;
    try {
      await onSubmit(values);
    } catch (error) {
      if (error instanceof Error) {
        const fieldError = error as Error & { field?: string };
        if (fieldError.field) {
          form.setError(fieldError.field as keyof AirlineAndAirportFormValues, {
            type: "server",
            message: error.message,
          });
        } else if (onError) {
          onError(error);
        }
      }
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        <h2 className="text-xl font-semibold">IATA code information</h2>
        <FormField
          control={form.control}
          name="code"
          render={({ field }) => (
            <FormItem>
              <FormLabel required>IATA code</FormLabel>
              <FormControl>
                {readOnly ? (
                  <Input value={field.value || ""} disabled />
                ) : (
                  <Input {...field} disabled={isLoading} />
                )}
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel required>Airport name</FormLabel>
              <FormControl>
                {readOnly ? (
                  <Input value={field.value || ""} disabled />
                ) : (
                  <Input {...field} disabled={isLoading} />
                )}
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {mode !== "view" && (
          <div className="flex justify-end gap-4">
            {onCancel && (
              <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
                Cancel
              </Button>
            )}
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Saving..." : mode === "create" ? "Create" : "Update"}
            </Button>
          </div>
        )}
      </form>
    </Form>
  );
}
