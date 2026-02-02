import { UseFormReturn } from "react-hook-form";
import { format } from "date-fns";
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
import { BookingFormValues } from "../booking-schema";
import { Booking } from "@/app/dashboard/bookings/hooks/use-bookings";
import { Trip } from "@/app/dashboard/trips/hooks/use-trips";

interface TripSectionProps {
  form: UseFormReturn<BookingFormValues>;
  readOnly: boolean;
  trips: Trip[];
  tripSearchOpen: boolean;
  setTripSearchOpen: (open: boolean) => void;
  tripSearchQuery: string;
  setTripSearchQuery: (query: string) => void;
  filteredTrips: Trip[];
  handleTripChange: (id: string) => void;
  booking?: Booking;
}

export function TripSection({
  form,
  readOnly,
  trips,
  tripSearchOpen,
  setTripSearchOpen,
  tripSearchQuery,
  setTripSearchQuery,
  filteredTrips,
  handleTripChange,
  booking,
}: TripSectionProps) {
  
  return (
    <FormField
      control={form.control}
      name="tripId"
      render={({ field }) => {
        const selectedTrip = trips.find((t) => t.id === field.value);
        return (
          <FormItem>
            <FormLabel required={!readOnly}>Trip code</FormLabel>
            {readOnly ? (
              <FormControl>
                <Input
                  value={
                    booking?.trip
                      ? `${booking.trip.name} (${format(new Date(booking.trip.startDate), "dd MMM")} - ${format(new Date(booking.trip.endDate), "dd MMM")})`
                      : selectedTrip?.name || ""
                  }
                  disabled
                />
              </FormControl>
            ) : (
              <Popover open={tripSearchOpen} onOpenChange={setTripSearchOpen}>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button
                      variant="outline"
                      role="combobox"
                      className={cn("w-full justify-between", !field.value && "text-muted-foreground")}
                    >
                      {selectedTrip
                        ? `${selectedTrip.code}${selectedTrip._count?.bookings >= selectedTrip.pax ? " [FULL]" : ""}`
                        : "Search for a trip..."}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                <PopoverContent className="w-[400px] p-0">
                  <Command shouldFilter={false}>
                    <CommandInput
                      placeholder="Search by trip code"
                      value={tripSearchQuery}
                      onValueChange={setTripSearchQuery}
                    />
                    <CommandList>
                      {filteredTrips.length === 0 ? (
                        <CommandEmpty>
                          {tripSearchQuery ? "No trips found." : "Start typing to search..."}
                        </CommandEmpty>
                      ) : (
                        <CommandGroup>
                          {filteredTrips.map((trip) => (
                            <CommandItem
                              value={trip.id}
                              key={trip.id}
                              disabled={trip._count?.bookings >= trip.pax}
                              onSelect={() => {
                                handleTripChange(trip.id);
                                setTripSearchOpen(false);
                                setTripSearchQuery("");
                              }}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  trip.id === field.value ? "opacity-100" : "opacity-0",
                                )}
                              />
                              <div className="flex flex-col">
                                <span className="font-medium">
                                  {trip.code}
                                  {trip._count?.bookings >= trip.pax ? " [FULL]" : ""}
                                </span>
                                <span className="text-muted-foreground text-sm">
                                  {trip.name} ({(() => {
                                    const start = new Date(trip.startDate);
                                    const end = new Date(trip.endDate);
                                    const sameYear = start.getFullYear() === end.getFullYear();
                                    return sameYear
                                      ? `${format(start, "dd MMM")} - ${format(end, "dd MMM yyyy")}`
                                      : `${format(start, "dd MMM yyyy")} - ${format(end, "dd MMM yyyy")}`;
                                  })()})
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
        );
      }}
    />
  );
}
