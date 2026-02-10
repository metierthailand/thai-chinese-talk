import { UseFormReturn } from "react-hook-form";
import { Plus, Trash2 } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

const ROOM_TYPE_LABELS: Record<string, string> = {
  DOUBLE_BED: "Double bed 大",
  TWIN_BED: "Twin bed 双",
};

const SEAT_TYPE_LABELS: Record<string, string> = {
  WINDOW: "Window",
  MIDDLE: "Middle",
  AISLE: "Aisle",
  NOT_SPECIFIED: "Not specified",
};

const SEAT_CLASS_LABELS: Record<string, string> = {
  FIRST_CLASS: "First class",
  BUSINESS_CLASS: "Business class",
  LONG_LEG: "Long leg",
  OTHER: "Other",
};

interface TravelDetailsSectionProps {
  form: UseFormReturn<BookingFormValues>;
  readOnly: boolean;
  lockFullyPaid?: boolean;
  enableBedPrice: boolean;
  setEnableBedPrice: (enable: boolean) => void;
  enableSeatPrice: boolean;
  setEnableSeatPrice: (enable: boolean) => void;
  enableBagPrice: boolean;
  setEnableBagPrice: (enable: boolean) => void;
  enableDiscount: boolean;
  setEnableDiscount: (enable: boolean) => void;
  // Roommates (only from same companion group)
  roommateSearchOpen: boolean;
  setRoommateSearchOpen: (open: boolean) => void;
  roommateSearchQuery: string;
  setRoommateSearchQuery: (query: string) => void;
  availableRoommateBookings: Array<{
    id: string;
    customerId: string;
    customer: { firstNameEn: string; lastNameEn: string };
  }>;
  filteredRoommateBookings: Array<{
    id: string;
    customerId: string;
    customer: { firstNameEn: string; lastNameEn: string };
  }>;
  selectedRoommateBookings: Array<{ id: string; customerName: string }>;
  roommateBookingIds: string[];
  handleAddRoommate: (bookingId: string) => void;
  handleRemoveRoommate: (bookingId: string) => void;
  tripId: string;
}

export function TravelDetailsSection({
  form,
  readOnly,
  lockFullyPaid = false,
  enableBedPrice,
  setEnableBedPrice,
  enableSeatPrice,
  setEnableSeatPrice,
  enableBagPrice,
  setEnableBagPrice,
  enableDiscount,
  setEnableDiscount,
  roommateSearchOpen,
  setRoommateSearchOpen,
  roommateSearchQuery,
  setRoommateSearchQuery,
  availableRoommateBookings,
  filteredRoommateBookings,
  selectedRoommateBookings,
  roommateBookingIds,
  handleAddRoommate,
  handleRemoveRoommate,
  tripId,
}: TravelDetailsSectionProps) {
  const detailsDisabled = readOnly || lockFullyPaid;
  return (
    <>
      {/* Room Information Section */}
      <div className="space-y-4 mt-6">
        <div className="grid grid-cols-1 gap-4">
          <FormField
            control={form.control}
            name="roomType"
            render={({ field }) => (
              <FormItem>
<FormLabel required>Room type</FormLabel>
              {detailsDisabled ? (
                <FormControl>
                  <Input value={field.value ? ROOM_TYPE_LABELS[field.value] ?? field.value : ""} disabled />
                </FormControl>
              ) : (
                  <Select onValueChange={field.onChange} value={field.value} key={`roomType-${field.value}`}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="DOUBLE_BED">Double bed 大</SelectItem>
                      <SelectItem value="TWIN_BED">Twin bed 双</SelectItem>
                    </SelectContent>
                  </Select>
                )}
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Roommate: same companion group only */}
        <FormField
          control={form.control}
          name="roommateBookingIds"
          render={() => (
            <FormItem>
              <FormLabel>Roommate</FormLabel>
              {detailsDisabled ? (
                <div className="space-y-2 p-2 border rounded-md bg-muted">
                  {selectedRoommateBookings.length === 0 ? (
                    <p className="text-muted-foreground text-sm">No roommate</p>
                  ) : (
                    selectedRoommateBookings.map((r) => (
                      <div key={r.id} className="flex items-center justify-between">
                        <p className="text-sm">{r.customerName}</p>
                      </div>
                    ))
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  <Popover open={roommateSearchOpen} onOpenChange={setRoommateSearchOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full justify-start"
                        disabled={!tripId || availableRoommateBookings.length === 0}
                      >
                        <Plus className="mr-2 h-4 w-4" />
                        {!tripId
                          ? "Select trip first"
                          : availableRoommateBookings.length === 0
                            ? "Add companions first"
                            : "Add roommate"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[400px] p-0">
                      <Command shouldFilter={false}>
                        <CommandInput
                          value={roommateSearchQuery}
                          onValueChange={setRoommateSearchQuery}
                          placeholder="Search by name..."
                        />
                        <CommandList>
                          {filteredRoommateBookings.length === 0 ? (
                            <CommandEmpty>No companion bookings found.</CommandEmpty>
                          ) : (
                            <CommandGroup>
                              {filteredRoommateBookings
                                .filter((b) => !roommateBookingIds.includes(b.id))
                                .map((b) => (
                                  <CommandItem
                                    key={b.id}
                                    value={b.id}
                                    onSelect={() => handleAddRoommate(b.id)}
                                  >
                                    <span className="font-medium">
                                      {b.customer.firstNameEn} {b.customer.lastNameEn}
                                    </span>
                                  </CommandItem>
                                ))}
                            </CommandGroup>
                          )}
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                  {selectedRoommateBookings.length > 0 && (
                    <div className="space-y-2">
                      {selectedRoommateBookings.map((r) => (
                        <div key={r.id} className="flex items-center justify-between rounded-md border p-2">
                          <span className="text-sm">{r.customerName}</span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveRoommate(r.id)}
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

        <div className="grid grid-cols-1 gap-4">
          <FormField
            control={form.control}
            name="extraPricePerBed"
            render={({ field }) => (
              <FormItem>
                <div className="flex items-center justify-between">
                  <FormLabel required={enableBedPrice}>Extra price for extra bed</FormLabel>
                  <div className="flex items-center space-x-2">
                    <FormLabel htmlFor="bed-price-toggle" className="cursor-pointer text-sm font-normal">
                      Add-on
                    </FormLabel>
                    <Switch
                      id="bed-price-toggle"
                      checked={enableBedPrice}
                      onCheckedChange={(checked) => {
                        setEnableBedPrice(checked);
                        if (!checked) {
                          // field.onChange("");
                          form.setValue("extraPricePerBed", "", { shouldValidate: false })
                          form.clearErrors("extraPricePerBed");
                        } else {
                          // Trigger validation when enabled
                          // setTimeout(() => form.trigger("extraPricePerBed"), 0);
                        }
                      }}
                      disabled={detailsDisabled}
                    />
                  </div>
                </div>
                <FormControl>
                  <Input
                    type="number"
                    {...field}
                    disabled={detailsDisabled || !enableBedPrice}
                    onChange={(e) => field.onChange(e.target.value)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="roomNote"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Note for room</FormLabel>
                <FormControl>
                  <Textarea
                    className="resize-none"
                    {...field}
                    disabled={detailsDisabled}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      </div>

      <Separator className="mt-6" />

      {/* Seat Information Section */}
      <div className="space-y-4 mt-6">
        <FormField
          control={form.control}
          name="seatType"
          render={({ field }) => (
            <FormItem>
              <FormLabel required>Seat type</FormLabel>
              {detailsDisabled ? (
                <FormControl>
                  <Input value={field.value ? SEAT_TYPE_LABELS[field.value] ?? field.value : ""} disabled />
                </FormControl>
              ) : (
                <Select onValueChange={field.onChange} value={field.value} key={`seatType-${field.value}`}>
                  <FormControl>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="WINDOW">Window</SelectItem>
                    <SelectItem value="MIDDLE">Middle</SelectItem>
                    <SelectItem value="AISLE">Aisle</SelectItem>
                    <SelectItem value="NOT_SPECIFIED">Not specified</SelectItem>
                  </SelectContent>
                </Select>
              )}
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-1 gap-4">
          <FormField
            control={form.control}
            name="seatClass"
            render={({ field }) => (
              <FormItem>
                <div className="flex items-center justify-between">
                  <FormLabel required={enableSeatPrice}>Seat upgrade type</FormLabel>
                  <div className="flex items-center space-x-2">
                    <FormLabel htmlFor="seat-price-toggle" className="cursor-pointer text-sm font-normal">
                      Add-on
                    </FormLabel>
                    <Switch
                      id="seat-price-toggle"
                      checked={enableSeatPrice}
                      onCheckedChange={(checked) => {
                        setEnableSeatPrice(checked);
                        if (!checked) {
                          // Clear extraPricePerSeat when disable
                          form.setValue("extraPricePerSeat", "");
                          form.clearErrors("extraPricePerSeat");
                          form.clearErrors("seatClass");
                          // Clear seatClass when disable
                          form.setValue("seatClass", undefined);
                        } else {
                          // Trigger validation when enabled
                          // setTimeout(() => {
                          //   form.trigger("extraPricePerSeat");
                          //   form.trigger("seatClass");
                          // }, 0);
                        }
                      }}
                      disabled={detailsDisabled}
                    />
                  </div>
                </div>
                {detailsDisabled ? (
                  <FormControl>
                    <Input
                      value={field.value ? SEAT_CLASS_LABELS[field.value] ?? field.value : ""}
                      disabled
                    />
                  </FormControl>
                ) : (
                  <Select
                    onValueChange={field.onChange}
                    value={field.value ?? ""}
                    key={`seatClass-${field.value ?? "empty"}`}
                    disabled={!enableSeatPrice}
                  >
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="FIRST_CLASS">First class</SelectItem>
                      <SelectItem value="BUSINESS_CLASS">Business class</SelectItem>
                      <SelectItem value="LONG_LEG">Long leg</SelectItem>
                      <SelectItem value="OTHER">Other</SelectItem>
                    </SelectContent>
                  </Select>
                )}
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="extraPricePerSeat"
            render={({ field }) => (
              <FormItem>
                <FormLabel required={enableSeatPrice}>Extra price for seat upgrade</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    {...field}
                    disabled={detailsDisabled || !enableSeatPrice}
                    onChange={(e) => field.onChange(e.target.value)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="seatNote"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Note for seat</FormLabel>
                <FormControl>
                  <Textarea
                    className="resize-none"
                    {...field}
                    disabled={detailsDisabled}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      </div>

      <Separator className="mt-6" />

      {/* Bag Information Section */}
      <div className="grid grid-cols-1 gap-4 mt-6">
        <FormField
          control={form.control}
          name="extraPricePerBag"
          render={({ field }) => (
            <FormItem>
              <div className="flex items-center justify-between">
                <FormLabel required={enableBagPrice}>Extra price for bag upgrade</FormLabel>
                <div className="flex items-center space-x-2">
                  <FormLabel htmlFor="bag-price-toggle" className="cursor-pointer text-sm font-normal">
                    Add-on
                  </FormLabel>
                  <Switch
                    id="bag-price-toggle"
                    checked={enableBagPrice}
                    onCheckedChange={(checked) => {
                      setEnableBagPrice(checked);
                      if (!checked) {
                        // field.onChange("");
                        form.setValue("extraPricePerBag", "", { shouldValidate: false })
                        form.clearErrors("extraPricePerBag");
                      } else {
                        // Trigger validation when enabled
                        // setTimeout(() => form.trigger("extraPricePerBag"), 0);
                      }
                    }}
                    disabled={detailsDisabled}
                  />
                </div>
              </div>
              <FormControl>
                <Input
                  type="number"
                  {...field}
                  disabled={detailsDisabled || !enableBagPrice}
                  onChange={(e) => field.onChange(e.target.value)}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="bagNote"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Note for bag</FormLabel>
              <FormControl>
                <Textarea
                  className="resize-none"
                  {...field}
                  disabled={detailsDisabled}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <Separator className="mt-6" />

      {/* Discount Section */}
      <div className="grid grid-cols-1 gap-4 mt-6">
        <FormField
          control={form.control}
          name="discountPrice"
          render={({ field }) => (
            <FormItem>
              <div className="flex items-center justify-between">
                <FormLabel required={enableDiscount}>Discount price</FormLabel>
                <div className="flex items-center space-x-2">
                  <FormLabel htmlFor="discount-toggle" className="cursor-pointer text-sm font-normal">
                    Add-on
                  </FormLabel>
                  <Switch
                    id="discount-toggle"
                    checked={enableDiscount}
                    onCheckedChange={(checked) => {
                      setEnableDiscount(checked);
                      if (!checked) {
                        // field.onChange("");
                        form.setValue("discountPrice", "", { shouldValidate: false })
                        form.clearErrors("discountPrice");
                      } else {
                        // Trigger validation when enabled
                        // setTimeout(() => form.trigger("discountPrice"), 0);
                      }
                    }}
                    disabled={detailsDisabled}
                  />
                </div>
              </div>
              <FormControl>
                <Input
                  type="number"
                  {...field}
                  disabled={detailsDisabled || !enableDiscount}
                  onChange={(e) => field.onChange(e.target.value)}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="discountNote"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Note for discount</FormLabel>
              <FormControl>
                <Textarea
                  className="resize-none"
                  {...field}
                  disabled={detailsDisabled}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </>
  );
}
