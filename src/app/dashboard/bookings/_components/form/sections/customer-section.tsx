import { useState } from "react";
import { UseFormReturn } from "react-hook-form";
import { Check, ChevronsUpDown, Plus, Eye, Pencil } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { BookingFormValues } from "../booking-schema";
import { CustomerViewDialog } from "@/app/dashboard/customers/_components/customer-view-dialog";
import { CustomerEditDialog } from "@/app/dashboard/customers/_components/customer-edit-dialog";

interface CustomerSectionProps {
  form: UseFormReturn<BookingFormValues>;
  readOnly: boolean;
  customerSearchOpen: boolean;
  setCustomerSearchOpen: (open: boolean) => void;
  customerSearchQuery: string;
  setCustomerSearchQuery: (query: string) => void;
  isSearching: boolean;
  searchResults: any[]; // Replace with Customer type
  selectedCustomer: any; // Replace with Customer type
  setCreateCustomerDialogOpen: (open: boolean) => void;
  customerPassports: any[]; // Replace with Passport type
  customerId: string;
}

export function CustomerSection({
  form,
  readOnly,
  customerSearchOpen,
  setCustomerSearchOpen,
  customerSearchQuery,
  setCustomerSearchQuery,
  isSearching,
  searchResults,
  selectedCustomer,
  setCreateCustomerDialogOpen,
  customerPassports,
  customerId,
}: CustomerSectionProps) {
  const [viewCustomerDialogOpen, setViewCustomerDialogOpen] = useState(false);
  const [editCustomerDialogOpen, setEditCustomerDialogOpen] = useState(false);

  const [isReChecked, setIsReChecked] = useState(false);

  return (
    <div className="space-y-4">
      {/* Customer Field */}
      <FormField
        control={form.control}
        name="customerId"
        render={({ field }) => (
          <FormItem className="flex flex-col">
            <FormLabel required={!readOnly}>Customer</FormLabel>
            {readOnly ? (
              <div className="flex gap-2">
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
                {field.value && (
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => setViewCustomerDialogOpen(true)}
                    title="View Customer Details"
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                <div className="flex gap-2">
                  <Popover open={customerSearchOpen} onOpenChange={setCustomerSearchOpen}>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          role="combobox"
                          className={cn("flex-1 min-w-0 justify-between", !field.value && "text-muted-foreground")}
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
                                    className={cn(
                                      "mr-2 h-4 w-4",
                                      customer.id === field.value ? "opacity-100" : "opacity-0",
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
                          )}
                        </CommandList>
                        <div className="border-t p-2">
                          <Button
                            type="button"
                            variant="outline"
                            className="w-full"
                            onClick={() => {
                              setCustomerSearchOpen(false);
                              setCreateCustomerDialogOpen(true);
                            }}
                          >
                            <Plus className="mr-2 h-4 w-4" />
                            Create New Customer
                          </Button>
                        </div>
                      </Command>
                    </PopoverContent>
                  </Popover>
                  {field.value && (
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => setEditCustomerDialogOpen(true)}
                      title="Edit Customer"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                {field.value && <FormDescription className={isReChecked ? "text-green-500" : "text-red-500"}>
                  {isReChecked ? "The customer's information has been rechecked." : "The customer's information has not been rechecked."}
                </FormDescription>}
              </div>
            )}
            <FormMessage />

            {field.value && (
              <>
                <CustomerViewDialog
                  open={viewCustomerDialogOpen}
                  onOpenChange={setViewCustomerDialogOpen}
                  customerId={field.value}
                />
                <CustomerEditDialog
                  open={editCustomerDialogOpen}
                  onOpenChange={setEditCustomerDialogOpen}
                  customerId={field.value}
                  onReCheckedChange={setIsReChecked}
                />
              </>
            )}

          </FormItem>
        )}
      />

      {/* Passport */}
      <FormField
        control={form.control}
        name="passportId"
        render={({ field }) => (
          <FormItem className="flex flex-col w-full">
            <FormLabel required={!readOnly}>Passport</FormLabel>
            {readOnly ? (
              <FormControl>
                <Input
                  value={
                    customerPassports.find((p) => p.id === field.value)
                      ? `${customerPassports.find((p) => p.id === field.value)?.passportNumber} (${customerPassports.find((p) => p.id === field.value)?.issuingCountry})`
                      : ""
                  }
                  disabled
                />
              </FormControl>
            ) : (
              <Select
                onValueChange={field.onChange}
                value={field.value || ""}
                disabled={!customerId || customerPassports.length === 0}
              >
                <FormControl>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={customerId ? (customerPassports.length === 0 ? "No passports available" : "Select passport") : "Select customer first"} />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {customerPassports.map((passport) => (
                    <SelectItem key={passport.id} value={passport.id}>
                      {passport.passportNumber} ({passport.issuingCountry}){passport.isPrimary ? " - Primary" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
}
