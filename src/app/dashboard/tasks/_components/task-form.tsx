"use client";

import { useEffect, useState, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Check, ChevronsUpDown, X } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { taskFormSchema, TaskFormValues } from "../hooks/use-tasks";
import { useCustomers, useCustomer } from "@/app/dashboard/customers/hooks/use-customers";

interface TaskFormProps {
  mode: "create" | "edit" | "view";
  initialData?: Partial<TaskFormValues>;
  onSubmit?: (values: TaskFormValues) => Promise<void>;
  onCancel?: () => void;
  isLoading?: boolean;
}

export function TaskForm({ mode, initialData, onSubmit, onCancel, isLoading = false }: TaskFormProps) {
  const readOnly = mode === "view";
  const [customerSearchOpen, setCustomerSearchOpen] = useState(false);
  const [customerSearchQuery, setCustomerSearchQuery] = useState("");

  const form = useForm<TaskFormValues>({
    resolver: zodResolver(taskFormSchema),
    defaultValues: {
      topic: "",
      description: "",
      deadline: undefined,
      status: "TODO",
      contact: undefined,
      relatedCustomerId: undefined,
      userId: null,
    },
  });

  const customerId = form.watch("relatedCustomerId");

  // Fetch customers for search
  const { data: customersData } = useCustomers({
    page: 1,
    pageSize: 20,
    search: customerSearchQuery || undefined,
  });

  const customers = useMemo(() => customersData?.data ?? [], [customersData?.data]);

  // Fetch selected customer if not in search results
  const { data: selectedCustomerData } = useCustomer(
    customerId && !customers.find((c) => c.id === customerId) ? customerId : undefined
  );

  const selectedCustomer = useMemo(() => {
    if (!customerId) return null;
    const found = customers.find((c) => c.id === customerId);
    if (found) return found;
    return selectedCustomerData || null;
  }, [customerId, customers, selectedCustomerData]);

  // Sync initial data (for edit/view)
  useEffect(() => {
    if (initialData) {
      form.reset({
        topic: initialData.topic ?? "",
        description: initialData.description ?? "",
        deadline: initialData.deadline ? new Date(initialData.deadline) : undefined,
        status: initialData.status ?? "TODO",
        contact: initialData.contact ?? undefined,
        relatedCustomerId: initialData.relatedCustomerId ?? undefined,
        userId: initialData.userId ?? null,
      });
    }
  }, [initialData, form]);

  async function handleSubmit(values: TaskFormValues) {
    if (!onSubmit || readOnly) return;
    await onSubmit(values);
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        <h2 className="text-xl font-semibold">Task information</h2>
        <FormField
          control={form.control}
          name="status"
          render={({ field }) => (
            <FormItem>
              <FormLabel required>Status</FormLabel>
              <Select
                onValueChange={field.onChange}
                value={field.value || ""}
                disabled={readOnly || isLoading}
                key={`status-${field.value || "TODO"}`}
              >
                <FormControl>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="TODO">To-do</SelectItem>
                  <SelectItem value="IN_PROGRESS">In progress</SelectItem>
                  <SelectItem value="COMPLETED">Completed</SelectItem>
                  <SelectItem value="CANCELLED">Cancelled</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="topic"
          render={({ field }) => (
            <FormItem>
              <FormLabel required>Topic</FormLabel>
              <FormControl>
                <Input placeholder="Task topic..." {...field} disabled={readOnly || isLoading} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Task description..."
                  {...field}
                  value={field.value || ""}
                  disabled={readOnly || isLoading}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="relatedCustomerId"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel required>Customer</FormLabel>
              {readOnly ? (
                <FormControl>
                  <Input
                    value={
                      selectedCustomer
                        ? `${selectedCustomer.firstNameEn ?? selectedCustomer.firstNameTh ?? ""} ${selectedCustomer.lastNameEn ?? selectedCustomer.lastNameTh ?? ""}`.trim() || "-"
                        : "-"
                    }
                    disabled
                  />
                </FormControl>
              ) : (
                <Popover open={customerSearchOpen} onOpenChange={setCustomerSearchOpen}>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant="outline"
                        role="combobox"
                        className={cn("w-full justify-between", !field.value && "text-muted-foreground")}
                        disabled={isLoading}
                      >
                        {selectedCustomer
                          ? `${selectedCustomer.firstNameEn} ${selectedCustomer.lastNameEn}`
                          : "Search for a customer..."}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-[400px] p-0">
                    <Command shouldFilter={false}>
                      <CommandInput
                        placeholder="Search by customer name"
                        value={customerSearchQuery}
                        onValueChange={setCustomerSearchQuery}
                      />
                      <CommandList>
                        <CommandEmpty>No customers found.</CommandEmpty>
                        <CommandGroup>
                          {customers.map((customer) => (
                            <CommandItem
                              key={customer.id}
                              value={customer.id}
                              onSelect={() => {
                                field.onChange(customer.id);
                                setCustomerSearchOpen(false);
                                setCustomerSearchQuery("");
                              }}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  field.value === customer.id ? "opacity-100" : "opacity-0",
                                )}
                              />
                              <div className="flex flex-col">
                                <span className="font-medium">
                                  {customer.firstNameEn} {customer.lastNameEn}
                                </span>
                                <span className="text-muted-foreground text-xs">
                                  {customer.firstNameTh} {customer.lastNameTh}
                                </span>
                              </div>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              )}
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="contact"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Contact channel</FormLabel>
              <div className="relative">
                <Select
                  onValueChange={(value) => {
                    field.onChange(value === "" ? null : value);
                  }}
                  value={field.value ?? undefined}
                  key={`contact-${field.value ?? "empty"}`}
                  disabled={readOnly || isLoading}
                >
                  <FormControl>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select contact" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="CALL">Call</SelectItem>
                    <SelectItem value="LINE">Line</SelectItem>
                    <SelectItem value="MESSENGER">Messenger</SelectItem>
                  </SelectContent>
                </Select>
                {field.value && !readOnly && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-8 top-1/2 -translate-y-1/2 z-10 h-6 w-6"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      field.onChange(null);
                    }}
                    disabled={isLoading}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="deadline"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Deadline</FormLabel>
              {readOnly ? (
                <FormControl>
                  <Input value={field.value ? format(field.value, "dd MMM yyyy") : "-"} disabled />
                </FormControl>
              ) : (
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !field.value && "text-muted-foreground",
                        )}
                        disabled={isLoading}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {field.value ? format(field.value, "dd MMM yyyy") : "Pick a date"}
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus />
                  </PopoverContent>
                </Popover>
              )}
              <FormMessage />
            </FormItem>
          )}
        />

        {mode !== "view" && (
          <div className="flex justify-end space-x-4">
            {onCancel && (
              <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
                Cancel
              </Button>
            )}
            <Button type="submit" disabled={isLoading}>
              {isLoading
                ? mode === "create"
                  ? "Creating..."
                  : "Updating..."
                : mode === "create"
                  ? "Create"
                  : "Update"}
            </Button>
          </div>
        )}
      </form>
    </Form>
  );
}
