"use client";

import { useEffect, useState, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Check, ChevronsUpDown, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSearchCustomers, useCustomer } from "@/app/dashboard/customers/hooks/use-customers";
import { LEAD_STATUS_VALUES, LEAD_STATUS_LABELS, LEAD_SOURCE_VALUES, LEAD_SOURCE_LABELS } from "@/lib/constants/lead";
import { Checkbox } from "@/components/ui/checkbox";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import type { Lead } from "../hooks/use-leads";

// Sales user interface
interface SalesUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string | null;
}

// Fetch sales users
async function fetchSalesUsers(): Promise<SalesUser[]> {
  const res = await fetch("/api/users/sales");
  if (!res.ok) {
    throw new Error("Failed to fetch sales users");
  }
  return res.json();
}

// Form schema with conditional validation
const formSchema = z
  .object({
    newCustomer: z.boolean(),
    customerId: z.string().optional(),
    firstName: z.string().optional(),
    lastName: z.string().optional(),
    phoneNumber: z.string().optional(),
    email: z.string().optional(),
    lineId: z.string().optional(),
    salesUserId: z.string().min(1, { message: "Please select the information." }),
    source: z.string().optional(),
    status: z.string().min(1, { message: "Please select the information." }),
    tripInterest: z.string('Please fill in the information.').min(1, { message: "Please fill in the information." }),
    pax: z.string().min(1, { message: "Please fill in the information." }),
    leadNote: z.string().optional(),
    sourceNote: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.newCustomer) {
      // Validate firstName when newCustomer is true
      if (!data.firstName || data.firstName.trim() === "") {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Please fill in the information.",
          path: ["firstName"],
        });
      }
      // Validate lastName when newCustomer is true
      if (!data.lastName || data.lastName.trim() === "") {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Please fill in the information.",
          path: ["lastName"],
        });
      }
    } else {
      // Validate customerId when newCustomer is false
      if (!data.customerId || data.customerId.trim() === "") {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Please fill in the information.",
          path: ["customerId"],
        });
      }
    }
  });

export type LeadFormValues = z.infer<typeof formSchema>;

interface LeadFormProps {
  mode: "create" | "edit" | "view";
  initialData?: Lead | null;
  onSubmit?: (values: LeadFormValues) => Promise<void> | void;
  onCancel?: () => void;
  isLoading?: boolean;
}

export function LeadForm({ mode, initialData, onSubmit, onCancel, isLoading }: LeadFormProps) {
  const [customerSearchOpen, setCustomerSearchOpen] = useState(false);
  const [customerSearchQuery, setCustomerSearchQuery] = useState("");
  const [salesUserSearchOpen, setSalesUserSearchOpen] = useState(false);
  const [salesUserSearchQuery, setSalesUserSearchQuery] = useState("");

  // Fetch sales users
  const { data: salesUsers = [], isLoading: isLoadingSalesUsers } = useQuery({
    queryKey: ["salesUsers"],
    queryFn: fetchSalesUsers,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const form = useForm<LeadFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      newCustomer: initialData?.newCustomer ?? false,
      customerId: initialData?.customerId ?? undefined,
      firstName: initialData?.firstName ?? undefined,
      lastName: initialData?.lastName ?? undefined,
      phoneNumber: initialData?.phoneNumber ?? undefined,
      email: initialData?.email ?? undefined,
      lineId: initialData?.lineId ?? undefined,
      salesUserId: initialData?.salesUserId ?? "",
      source: initialData?.source ?? "",
      status: initialData?.status ?? "INTERESTED",
      tripInterest: initialData?.tripInterest ?? "",
      pax: initialData?.pax?.toString() ?? "1",
      leadNote: initialData?.leadNote ?? undefined,
      sourceNote: initialData?.sourceNote ?? undefined,
    },
  });

  useEffect(() => {
    if (initialData) {
      form.reset({
        newCustomer: initialData.newCustomer,
        customerId: initialData.customerId ?? undefined,
        firstName: initialData.firstName ?? undefined,
        lastName: initialData.lastName ?? undefined,
        phoneNumber: initialData.phoneNumber ?? undefined,
        email: initialData.email ?? undefined,
        lineId: initialData.lineId ?? undefined,
        salesUserId: initialData.salesUserId,
        source: initialData.source ?? "",
        status: initialData.status,
        tripInterest: initialData.tripInterest,
        pax: initialData.pax?.toString() ?? "1",
        leadNote: initialData.leadNote ?? undefined,
        sourceNote: initialData.sourceNote ?? undefined,
      });
    }
  }, [initialData, form]);

  const disabled = mode === "view" || isLoading;
  const newCustomer = form.watch("newCustomer");
  const customerId = form.watch("customerId");
  const salesUserId = form.watch("salesUserId");

  // Search customers
  const { data: searchResults = [], isLoading: isSearching } = useSearchCustomers(customerSearchQuery, 10);

  // Fetch selected customer if not in search results
  const { data: selectedCustomerData } = useCustomer(
    customerId && !searchResults.find((c) => c.id === customerId) ? customerId : undefined
  );

  // Find selected customer to display name
  const selectedCustomer = useMemo(() => {
    if (!customerId) return null;
    const found = searchResults.find((c) => c.id === customerId);
    if (found) return found;
    return selectedCustomerData || null;
  }, [customerId, searchResults, selectedCustomerData]);

  // Find selected sales user
  const selectedSalesUser = useMemo(() => {
    if (!salesUserId) return null;
    return salesUsers.find((u) => u.id === salesUserId) || null;
  }, [salesUserId, salesUsers]);

  // Filter sales users by search query
  const filteredSalesUsers = useMemo(() => {
    if (!salesUserSearchQuery.trim()) return salesUsers;
    const query = salesUserSearchQuery.toLowerCase();
    return salesUsers.filter(
      (user) =>
        user.firstName.toLowerCase().includes(query) ||
        user.lastName.toLowerCase().includes(query) ||
        user.email.toLowerCase().includes(query) ||
        user.phoneNumber?.toLowerCase().includes(query)
    );
  }, [salesUsers, salesUserSearchQuery]);

  const handleSubmit = async (values: LeadFormValues) => {
    if (!onSubmit || mode === "view") return;
    try {
      await onSubmit(values);
    } catch (error) {
      if (error instanceof Error) {
        const fieldError = error as Error & { field?: string; fields?: { field: string; message: string }[] };
        // Handle multiple field errors
        if (fieldError.fields && Array.isArray(fieldError.fields)) {
          fieldError.fields.forEach((err) => {
            if (err.field === "email") {
              toast.error(err.message);
              form.setError("email", {
                type: "server",
                message: err.message,
              });
            } else if (err.field === "phoneNumber") {
              toast.error(err.message);
              form.setError("phoneNumber", {
                type: "server",
                message: err.message,
              });
            }
          });
          return; // Return early after handling field errors
        }

        // Handle single field error
        if (fieldError.field === "email") {
          toast.error(error.message);
          form.setError("email", {
            type: "server",
            message: error.message,
          });
          return; // Return early after handling field error
        } else if (fieldError.field === "phoneNumber") {
          toast.error(error.message);
          form.setError("phoneNumber", {
            type: "server",
            message: error.message,
          });
          return; // Return early after handling field error
        }
      }
      // Re-throw if it's not a handled field error
      throw error;
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6" noValidate>
        <h2 className="text-xl font-semibold">Lead information</h2>
        <FormField
          control={form.control}
          name="status"
          render={({ field }) => (
            <FormItem>
              <FormLabel required>Status</FormLabel>
              <Select onValueChange={field.onChange} value={field.value} disabled={disabled}>
                <FormControl>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {LEAD_STATUS_VALUES.map((status) => (
                    <SelectItem key={status} value={status}>
                      {LEAD_STATUS_LABELS[status]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Trip Interest */}
        <FormField
          control={form.control}
          name="tripInterest"
          render={({ field }) => (
            <FormItem>
              <FormLabel required>Trip interest</FormLabel>
              <FormControl>
                <Input placeholder="Trip interest" {...field} disabled={disabled} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Pax */}
        <FormField
          control={form.control}
          name="pax"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Passengers (PAX)</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  min="1"
                  placeholder="Passengers (PAX)"
                  {...field}
                  value={field.value ?? ""}
                  disabled={disabled}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* New Customer Toggle */}
        <FormField
          control={form.control}
          name="newCustomer"
          render={({ field }) => (
            <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
              <FormControl>
                <Checkbox checked={field.value} onCheckedChange={field.onChange} disabled={disabled} />
              </FormControl>
              <div className="space-y-1 leading-none">
                <FormLabel>New customer</FormLabel>
                <p className="text-muted-foreground text-sm">
                  Please check the box if the customer doesn’t exist in the system.
                </p>
              </div>
            </FormItem>
          )}
        />

        {/* Customer Selection or New Customer Fields */}
        {newCustomer ? (
          <div className="space-y-4 rounded-md border p-4">
            <h3 className="text-lg font-semibold">Customer information</h3>
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="firstName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel required>First name</FormLabel>
                    <FormControl>
                      <Input placeholder="First name" {...field} disabled={disabled} />
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
                      <Input placeholder="Last name" {...field} disabled={disabled} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="phoneNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone number</FormLabel>
                    <FormControl>
                      <Input placeholder="Phone number" {...field} disabled={disabled} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="lineId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>LINE ID</FormLabel>
                    <FormControl>
                      <Input placeholder="LINE ID" {...field} disabled={disabled} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="Email" {...field} disabled={disabled} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        ) : (
          <FormField
            control={form.control}
            name="customerId"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel required>Customer</FormLabel>
                {disabled ? (
                  <FormControl>
                    <Input
                      value={
                        selectedCustomer
                          ? `${selectedCustomer.firstNameEn} ${selectedCustomer.lastNameEn}`
                          : ""
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
                          {isSearching ? (
                            <div className="text-muted-foreground py-6 text-center text-sm">Searching...</div>
                          ) : searchResults.length === 0 ? (
                            <CommandEmpty>
                              {customerSearchQuery ? "No customers found." : "Start typing to search..."}
                            </CommandEmpty>
                          ) : (
                            <CommandGroup>
                              {searchResults.map((customer) => (
                                <CommandItem
                                  value={customer.id}
                                  key={customer.id}
                                  onSelect={() => {
                                    field.onChange(customer.id);
                                    setCustomerSearchOpen(false);
                                    setCustomerSearchQuery("");
                                  }}
                                >
                                  <Check
                                    className={cn("mr-2 h-4 w-4", customer.id === field.value ? "opacity-100" : "opacity-0")}
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
                          )}
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                )}
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        <div className="grid grid-cols-1 gap-4 w-full">
          <h3 className="text-lg font-semibold">Source & Sales</h3>
          <FormField
            control={form.control}
            name="source"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Source</FormLabel>
                <div className="relative">
                  <Select onValueChange={field.onChange} value={field.value} disabled={disabled}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select source" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {LEAD_SOURCE_VALUES.map((source) => (
                        <SelectItem key={source} value={source}>
                          {LEAD_SOURCE_LABELS[source]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {field.value && !disabled && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-8 top-1/2 -translate-y-1/2 z-10 h-6 w-6"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        field.onChange("");
                      }}
                      disabled={disabled}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="sourceNote"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Note for source</FormLabel>
              <FormControl>
                <Textarea placeholder="Source notes..." className="resize-none" {...field} disabled={disabled} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Sales User Selection */}
        <FormField
          control={form.control}
          name="salesUserId"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel required>Sales name</FormLabel>
              {disabled ? (
                <FormControl>
                  <Input
                    value={selectedSalesUser ? `${selectedSalesUser.firstName} ${selectedSalesUser.lastName}` : ""}
                    disabled
                  />
                </FormControl>
              ) : (
                <Popover open={salesUserSearchOpen} onOpenChange={setSalesUserSearchOpen}>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant="outline"
                        role="combobox"
                        className={cn("w-full justify-between", !field.value && "text-muted-foreground")}
                        disabled={isLoadingSalesUsers}
                      >
                        {selectedSalesUser
                          ? `${selectedSalesUser.firstName} ${selectedSalesUser.lastName}`
                          : isLoadingSalesUsers
                            ? "Loading..."
                            : "Select sales name..."}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-[400px] p-0">
                    <Command shouldFilter={false}>
                      <CommandInput
                        placeholder="Search by sales name"
                        value={salesUserSearchQuery}
                        onValueChange={setSalesUserSearchQuery}
                      />
                      <CommandList>
                        {filteredSalesUsers.length === 0 ? (
                          <CommandEmpty>
                            {salesUserSearchQuery ? "No sales names found." : "No sales names available."}
                          </CommandEmpty>
                        ) : (
                          <CommandGroup>
                            {filteredSalesUsers.map((user) => (
                              <CommandItem
                                value={user.id}
                                key={user.id}
                                onSelect={() => {
                                  field.onChange(user.id);
                                  setSalesUserSearchOpen(false);
                                  setSalesUserSearchQuery("");
                                }}
                              >
                                <Check
                                  className={cn("mr-2 h-4 w-4", user.id === field.value ? "opacity-100" : "opacity-0")}
                                />
                                <div className="flex flex-col">
                                  <span className="font-medium">
                                    {user.firstName} {user.lastName}
                                  </span>
                                  <span className="text-muted-foreground text-xs">
                                    {user.email}
                                    {user.phoneNumber && ` • ${user.phoneNumber}`}
                                  </span>
                                </div>
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        )}
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
          name="leadNote"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Note for lead</FormLabel>
              <FormControl>
                <Textarea placeholder="Note for lead" className="resize-none" {...field} disabled={disabled} />
              </FormControl>
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
              {isLoading ? (mode === "create" ? "Creating..." : "Saving...") : mode === "create" ? "Create" : "Update"}
            </Button>
          </div>
        )}
      </form>
    </Form>
  );
}
