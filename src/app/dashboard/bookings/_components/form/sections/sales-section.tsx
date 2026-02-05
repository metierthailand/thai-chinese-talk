import { UseFormReturn } from "react-hook-form";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  FormControl,
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
import { BookingFormValues, SalesUser } from "../booking-schema";

interface SalesSectionProps {
  form: UseFormReturn<BookingFormValues>;
  readOnly: boolean;
  selectedSalesUser: SalesUser | null;
  salesUserSearchOpen: boolean;
  setSalesUserSearchOpen: (open: boolean) => void;
  salesUserSearchQuery: string;
  setSalesUserSearchQuery: (query: string) => void;
  filteredSalesUsers: SalesUser[];
}

export function SalesSection({
  form,
  readOnly,
  selectedSalesUser,
  salesUserSearchOpen,
  setSalesUserSearchOpen,
  salesUserSearchQuery,
  setSalesUserSearchQuery,
  filteredSalesUsers,
}: SalesSectionProps) {
  return (
    <FormField
      control={form.control}
      name="salesUserId"
      render={({ field }) => (
        <FormItem className="flex flex-col">
          <FormLabel required={!readOnly}>Sales</FormLabel>
          {readOnly ? (
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
                  >
                    {selectedSalesUser
                      ? `${selectedSalesUser.firstName} ${selectedSalesUser.lastName}`
                      : ""}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </FormControl>
              </PopoverTrigger>
              <PopoverContent className="w-[400px] p-0">
                <Command shouldFilter={false}>
                  <CommandInput
                    value={salesUserSearchQuery}
                    onValueChange={setSalesUserSearchQuery}
                  />
                  <CommandList>
                    {filteredSalesUsers.length === 0 ? (
                      <CommandEmpty>No sales users found.</CommandEmpty>
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
                              className={cn(
                                "mr-2 h-4 w-4",
                                user.id === field.value ? "opacity-100" : "opacity-0",
                              )}
                            />
                            <div className="flex flex-col">
                              <span className="font-medium">
                                {user.firstName} {user.lastName}
                              </span>
                              <span className="text-muted-foreground text-xs">{user.email}</span>
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
  );
}
