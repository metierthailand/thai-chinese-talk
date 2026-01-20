"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Check, ChevronsUpDown } from "lucide-react";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { familyFormSchema, FamilyFormValues } from "../hooks/use-families";
import { useSearchCustomers } from "@/app/dashboard/customers/hooks/use-customers";

interface FamilyFormProps {
  mode: "create" | "edit";
  initialData?: Partial<FamilyFormValues>;
  onSubmit: (values: FamilyFormValues) => Promise<void>;
  onCancel?: () => void;
  isLoading?: boolean;
}

export function FamilyForm({
  mode,
  initialData,
  onSubmit,
  onCancel,
  isLoading = false,
}: FamilyFormProps) {
  const [customersSearch, setCustomersSearch] = useState("");
  const [isCustomersOpen, setIsCustomersOpen] = useState(false);
  const { data: searchResults = [] } = useSearchCustomers(customersSearch || "", 50);

  const form = useForm<FamilyFormValues>({
    resolver: zodResolver(familyFormSchema),
    defaultValues: {
      name: initialData?.name ?? "",
      phoneNumber: initialData?.phoneNumber ?? "",
      lineId: initialData?.lineId ?? "",
      email: initialData?.email ?? "",
      note: initialData?.note ?? "",
      customerIds: initialData?.customerIds ?? [],
    },
  });

  // Reset form when initialData changes (for edit mode)
  useEffect(() => {
    if (initialData) {
      form.reset({
        name: initialData.name ?? "",
        phoneNumber: initialData.phoneNumber ?? "",
        lineId: initialData.lineId ?? "",
        email: initialData.email ?? "",
        note: initialData.note ?? "",
        customerIds: initialData.customerIds ?? [],
      });
    }
  }, [initialData, form]);

  async function handleSubmit(values: FamilyFormValues) {
    await onSubmit(values);
  }

  const selectedCustomerIds = form.watch("customerIds") || [];

  // Get selected customers from search results or fetch them if needed
  const selectedCustomers = searchResults.filter((c) => selectedCustomerIds.includes(c.id));

  // If we have selected IDs but they're not in search results, we need to fetch them
  // For now, we'll just show the IDs - in production you might want to fetch them separately

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel required>Name</FormLabel>
              <FormControl>
                <Input placeholder="Name" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="phoneNumber"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Phone number</FormLabel>
                <FormControl>
                  <Input placeholder="Phone number" {...field} />
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
                  <Input placeholder="LINE ID" {...field} />
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
                <Input type="email" placeholder="Email" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="customerIds"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel required>Customer name</FormLabel>
              <Popover open={isCustomersOpen} onOpenChange={setIsCustomersOpen}>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button
                      variant="outline"
                      role="combobox"
                      className={cn(
                        "w-full justify-between",
                        (!field.value || field.value.length === 0) && "text-muted-foreground",
                      )}
                    >
                      <span className="flex flex-1 flex-wrap items-center gap-1">
                        {field.value && field.value.length > 0 ? (
                          selectedCustomers.length > 0 ? (
                            selectedCustomers.map((customer) => (
                              <Badge key={customer.id} variant="outline">
                                {customer.firstNameEn} {customer.lastNameEn}
                              </Badge>
                            ))
                          ) : (
                            <span className="text-muted-foreground">{field.value.length} selected</span>
                          )
                        ) : (
                          <span className="text-muted-foreground">Select customers</span>
                        )}
                      </span>
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                <PopoverContent className="w-[400px] p-0">
                  <Command>
                    <CommandInput
                      placeholder="Search customers..."
                      value={customersSearch}
                      onValueChange={setCustomersSearch}
                    />
                    <CommandList>
                      <CommandEmpty>No customers found.</CommandEmpty>
                      <CommandGroup>
                        {searchResults.map((customer) => {
                          const isSelected = field.value?.includes(customer.id);
                          return (
                            <CommandItem
                              value={`${customer.firstNameEn} ${customer.lastNameEn}`}
                              key={customer.id}
                              onSelect={() => {
                                const currentValue = field.value || [];
                                const newValue = isSelected
                                  ? currentValue.filter((id) => id !== customer.id)
                                  : [...currentValue, customer.id];
                                field.onChange(newValue);
                              }}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  isSelected ? "opacity-100" : "opacity-0",
                                )}
                              />
                              <div className="flex flex-col">
                                <span>
                                  {customer.firstNameEn} {customer.lastNameEn}
                                </span>
                                {(customer.firstNameTh || customer.lastNameTh) && (
                                  <span className="text-muted-foreground text-xs">
                                    {customer.firstNameTh} {customer.lastNameTh}
                                  </span>
                                )}
                              </div>
                            </CommandItem>
                          );
                        })}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="note"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Note for family / group</FormLabel>
              <FormControl>
                <Textarea placeholder="Note for family / group" className="resize-none" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

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
      </form>
    </Form>
  );
}
