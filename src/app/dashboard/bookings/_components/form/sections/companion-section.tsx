import { UseFormReturn } from "react-hook-form";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
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
import { BookingFormValues } from "../booking-schema";
import { Customer } from "@/app/dashboard/customers/hooks/use-customers";

interface CompanionSectionProps {
  form: UseFormReturn<BookingFormValues>;
  readOnly: boolean;
  selectedCompanions: Customer[];
  companionSearchOpen: boolean;
  setCompanionSearchOpen: (open: boolean) => void;
  tripId: string;
  availableCompanionCustomers: Customer[];
  companionSearchQuery: string;
  setCompanionSearchQuery: (query: string) => void;
  filteredCompanionCustomers: Customer[];
  companionCustomerIds: string[];
  handleAddCompanion: (id: string) => void;
  handleDeleteCompanion: (id: string) => void;
}

export function CompanionSection({
  form,
  readOnly,
  selectedCompanions,
  companionSearchOpen,
  setCompanionSearchOpen,
  tripId,
  availableCompanionCustomers,
  companionSearchQuery,
  setCompanionSearchQuery,
  filteredCompanionCustomers,
  companionCustomerIds,
  handleAddCompanion,
  handleDeleteCompanion,
}: CompanionSectionProps) {
  return (
    <FormField
      control={form.control}
      name="companionCustomerIds"
      render={() => (
        <FormItem>
          <FormLabel>Companion</FormLabel>
          {readOnly ? (
            <div className="space-y-2 p-2 border rounded-md bg-muted">
              {selectedCompanions.length === 0 ? (
                <p className="text-muted-foreground text-sm">No companion</p>
              ) : (
                selectedCompanions.map((c) => (
                  <div key={c.id} className="flex items-center justify-between">
                    <p className="text-sm">
                      {c.firstNameEn} {c.lastNameEn} {c.firstNameTh && c.lastNameTh && `(${c.firstNameTh} ${c.lastNameTh})`}
                    </p>
                    {c.email && <p className="text-sm text-muted-foreground">
                      {c.email}
                    </p>}
                  </div>
                ))
              )}
            </div>
          ) : (
            <div className="space-y-2">
              <Popover open={companionSearchOpen} onOpenChange={setCompanionSearchOpen}>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full justify-start"
                    disabled={!tripId || availableCompanionCustomers.length === 0}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    {tripId
                      ? availableCompanionCustomers.length === 0
                        ? "No available companion customers"
                        : "Add companion customer"
                      : "Select trip first"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[400px] p-0">
                  <Command shouldFilter={false}>
                    <CommandInput
                      value={companionSearchQuery}
                      onValueChange={setCompanionSearchQuery}
                    />
                    <CommandList>
                      {filteredCompanionCustomers.length === 0 ? (
                        <CommandEmpty>No companion customers found.</CommandEmpty>
                      ) : (
                        <CommandGroup>
                          {filteredCompanionCustomers
                            .filter((c) => !companionCustomerIds.includes(c.id))
                            .map((customer) => (
                              <CommandItem
                                key={customer.id}
                                value={customer.id}
                                onSelect={() => handleAddCompanion(customer.id)}
                              >
                                <div className="flex flex-col">
                                  <span className="font-medium">
                                    {customer.firstNameEn} {customer.lastNameEn}
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
              {selectedCompanions.length > 0 && (
                <div className="space-y-2">
                  {selectedCompanions.map((c) => (
                    <div key={c.id} className="flex items-center justify-between rounded-md border p-2">
                      <span className="text-sm">
                        {c.firstNameEn} {c.lastNameEn}
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteCompanion(c.id)}
                      >
                        <Trash2 className="h-4 w-4 text-red-500 hover:text-red-700" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
