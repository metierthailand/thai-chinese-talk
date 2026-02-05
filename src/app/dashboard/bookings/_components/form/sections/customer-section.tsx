import { useState, useMemo } from "react";
import { UseFormReturn } from "react-hook-form";
import { Check, ChevronsUpDown, Plus, Eye, Pencil, Cake } from "lucide-react";
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
import { BookingFormValues, SelectedCustomer } from "../booking-schema";
import { CustomerViewDialog } from "@/app/dashboard/customers/_components/customer-view-dialog";
import { CustomerEditDialog } from "@/app/dashboard/customers/_components/customer-edit-dialog";
import { Customer, useCustomer } from "@/app/dashboard/customers/hooks/use-customers";
import { Passport } from "@/app/dashboard/customers/hooks/types";
import { Trip } from "@/app/dashboard/trips/hooks/use-trips";
import { useWatch } from "react-hook-form";
import { differenceInMonths, format } from "date-fns";

interface CustomerSectionProps {
  form: UseFormReturn<BookingFormValues>;
  readOnly: boolean;
  customerSearchOpen: boolean;
  setCustomerSearchOpen: (open: boolean) => void;
  customerSearchQuery: string;
  setCustomerSearchQuery: (query: string) => void;
  isSearching: boolean;
  searchResults: Customer[];
  selectedCustomer: SelectedCustomer | null;
  setCreateCustomerDialogOpen: (open: boolean) => void;
  customerPassports: Passport[];
  customerId: string;
  /** Customer IDs that already have a booking in the selected trip; excluded from dropdown (except current) */
  customerIdsAlreadyInTrip?: string[];
  trips: Trip[];
  tripId: string;
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
  customerIdsAlreadyInTrip = [],
  trips,
  tripId,
}: CustomerSectionProps) {
  const [viewCustomerDialogOpen, setViewCustomerDialogOpen] = useState(false);
  const [editCustomerDialogOpen, setEditCustomerDialogOpen] = useState(false);

  const [isReChecked, setIsReChecked] = useState(false);

  const isCustomerSectionDisabled = !readOnly && !tripId;
  const availableCustomers = useMemo(() => {
    if (!customerIdsAlreadyInTrip.length) return searchResults;
    return searchResults.filter(
      (c) => !customerIdsAlreadyInTrip.includes(c.id) || c.id === customerId
    );
  }, [searchResults, customerIdsAlreadyInTrip, customerId]);

  const passportId = useWatch({ control: form.control, name: "passportId" });
  const customerIdValue = useWatch({ control: form.control, name: "customerId" });

  // Fetch full customer data to get dateOfBirth
  const { data: fullCustomerData } = useCustomer(customerIdValue || undefined);

  // Check if customer's birthday falls in the travel month
  const birthdayWarning = (() => {
    if (!customerIdValue || !tripId || trips.length === 0) {
      return null;
    }

    // Get customer dateOfBirth from fullCustomerData or selectedCustomer
    const customerDateOfBirth = fullCustomerData?.dateOfBirth ||
      (selectedCustomer && "dateOfBirth" in selectedCustomer ? selectedCustomer.dateOfBirth : null);

    if (!customerDateOfBirth || typeof customerDateOfBirth !== "string") {
      return null;
    }

    const selectedTrip = trips.find((t) => t.id === tripId);
    if (!selectedTrip || !selectedTrip.startDate || !selectedTrip.endDate) {
      return null;
    }

    const tripStartDate = new Date(selectedTrip.startDate);
    const tripEndDate = new Date(selectedTrip.endDate as string);
    const birthDate = new Date(customerDateOfBirth);

    // Validate dates
    if (isNaN(tripStartDate.getTime()) || isNaN(tripEndDate.getTime()) || isNaN(birthDate.getTime())) {
      return null;
    }

    // Get months of trip (start and end)
    const tripStartMonth = tripStartDate.getMonth();
    const tripEndMonth = tripEndDate.getMonth();
    const birthMonth = birthDate.getMonth();

    // Check if birthday month falls within trip months
    if (birthMonth === tripStartMonth || birthMonth === tripEndMonth) {
      return "The customer's birthday falls in the travel month. Please consider preparing a birthday greeting or special arrangement.";
    }

    return null;
  })();

  // Check if selected passport expires within 6 months from trip start date
  const passportExpiryWarning = (() => {
    if (!passportId || !tripId || customerPassports.length === 0) {
      return null;
    }

    const selectedPassport = customerPassports.find((p) => p.id === passportId);
    if (!selectedPassport || !selectedPassport.expiryDate) {
      return null;
    }

    const selectedTrip = trips.find((t) => t.id === tripId);
    if (!selectedTrip || !selectedTrip.startDate) {
      return null;
    }

    const tripStartDate = new Date(selectedTrip.startDate);
    const passportExpiryDate = new Date(selectedPassport.expiryDate);

    // Calculate months between trip start date and passport expiry date
    const monthsUntilExpiry = differenceInMonths(passportExpiryDate, tripStartDate);

    // If passport expires within 6 months from trip start date, show warning
    if (monthsUntilExpiry < 6) {
      return "Warning: The passport is valid for less than 6 months from the trip start date. Please inform the customer to renew their passport.";
    }

    return null;
  })();

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
                  <Popover open={!isCustomerSectionDisabled && customerSearchOpen} onOpenChange={setCustomerSearchOpen}>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          role="combobox"
                          disabled={isCustomerSectionDisabled}
                          className={cn("flex-1 min-w-0 justify-between", !field.value && "text-muted-foreground")}
                        >
                          {isCustomerSectionDisabled
                            ? "Select a trip first"
                            : selectedCustomer
                              ? `${selectedCustomer.firstNameEn} ${selectedCustomer.lastNameEn}`
                              : ""}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-[400px] p-0">
                      <Command shouldFilter={false}>
                        <CommandInput
                          value={customerSearchQuery}
                          onValueChange={setCustomerSearchQuery}
                        />
                        <CommandList>
                          {isSearching ? (
                            <div className="text-muted-foreground py-6 text-center text-sm">Searching...</div>
                          ) : availableCustomers.length === 0 ? (
                            <CommandEmpty>
                              {customerSearchQuery
                                ? "No customers found."
                                : customerIdsAlreadyInTrip.length > 0
                                  ? "All customers in this trip are already selected or no other customers found."
                                  : "Start typing to search..."}
                            </CommandEmpty>
                          ) : (
                            <CommandGroup>
                              {availableCustomers.map((customer) => (
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
                            disabled={isCustomerSectionDisabled}
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
                {field.value && (
                  <>
                    <FormDescription className={isReChecked ? "text-green-500" : "text-red-500"}>
                      {isReChecked ? "The customer's information has been rechecked." : "The customer's information has not been rechecked."}
                    </FormDescription>
                    {birthdayWarning && (
                      <div className="bg-blue-50 p-4 rounded-md border flex gap-2 border-blue-400">
                        <Cake className="h-6 w-6 text-blue-400" />
                        <p className="text-muted-foreground text-xs">{birthdayWarning}</p>
                      </div>
                    )}
                  </>
                )}
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
                {(() => {
                  const selectedPassport = customerPassports.find((p) => p.id === field.value);
                  if (!selectedPassport) return <Input value="" disabled />;
                  return (
                    <div className="flex flex-col rounded-md border px-3 py-2 bg-muted/50">
                      <p className="text-sm">
                        {selectedPassport.passportNumber} ({selectedPassport.issuingCountry}){selectedPassport.isPrimary ? " - Primary" : ""}
                      </p>
                      <p className="text-muted-foreground text-xs">Expired: {format(new Date(selectedPassport.expiryDate), "dd MMM yyyy")}</p>
                    </div>
                  );
                })()}
              </FormControl>
            ) : (
              <Select
                onValueChange={field.onChange}
                value={field.value || ""}
                disabled={isCustomerSectionDisabled || !customerId || customerPassports.length === 0}
              >
                <FormControl>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={customerId ? (customerPassports.length === 0 ? "No passports available" : "Select passport") : "Select a customer first"}>
                      {(() => {
                        const selectedPassport = customerPassports.find((p) => p.id === field.value);
                        if (!selectedPassport) return null;
                        return `${selectedPassport.passportNumber} (${selectedPassport.issuingCountry})${selectedPassport.isPrimary ? " - Primary" : ""}`;
                      })()}
                    </SelectValue>
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {customerPassports.map((passport) => (
                    <SelectItem key={passport.id} value={passport.id}>
                      <div className="flex flex-col items-start">
                        <p>
                          {passport.passportNumber} ({passport.issuingCountry}){passport.isPrimary ? " - Primary" : ""}
                        </p>
                        <p className="text-muted-foreground text-xs">Expired: {format(new Date(passport.expiryDate), "dd MMM yyyy")}</p>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {passportExpiryWarning && (
              <FormDescription className="text-yellow-600 dark:text-yellow-500">
                {passportExpiryWarning}
              </FormDescription>
            )}
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
}
