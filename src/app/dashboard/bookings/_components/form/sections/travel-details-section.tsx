import { UseFormReturn } from "react-hook-form";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
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
import { BookingFormValues } from "../booking-schema";

const ROOM_TYPE_LABELS: Record<string, string> = {
  DOUBLE_BED: "Double bed 大",
  TWIN_BED: "Twin bed 双",
};

const SEAT_TYPE_LABELS: Record<string, string> = {
  WINDOW: "Window",
  MIDDLE: "Middle",
  AISLE: "Aisle",
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
  enableBedPrice: boolean;
  setEnableBedPrice: (enable: boolean) => void;
  enableSeatPrice: boolean;
  setEnableSeatPrice: (enable: boolean) => void;
  enableBagPrice: boolean;
  setEnableBagPrice: (enable: boolean) => void;
  enableDiscount: boolean;
  setEnableDiscount: (enable: boolean) => void;
}

export function TravelDetailsSection({
  form,
  readOnly,
  enableBedPrice,
  setEnableBedPrice,
  enableSeatPrice,
  setEnableSeatPrice,
  enableBagPrice,
  setEnableBagPrice,
  enableDiscount,
  setEnableDiscount,
}: TravelDetailsSectionProps) {
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
                {readOnly ? (
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
                      disabled={readOnly}
                    />
                  </div>
                </div>
                <FormControl>
                  <Input
                    type="number"
                    {...field}
                    disabled={readOnly || !enableBedPrice}
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
                    disabled={readOnly}
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
              {readOnly ? (
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
                      disabled={readOnly}
                    />
                  </div>
                </div>
                {readOnly ? (
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
                    disabled={readOnly || !enableSeatPrice}
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
                    disabled={readOnly}
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
                    disabled={readOnly}
                  />
                </div>
              </div>
              <FormControl>
                <Input
                  type="number"
                  {...field}
                  disabled={readOnly || !enableBagPrice}
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
                  disabled={readOnly}
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
                    disabled={readOnly}
                  />
                </div>
              </div>
              <FormControl>
                <Input
                  type="number"
                  {...field}
                  disabled={readOnly || !enableDiscount}
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
                  disabled={readOnly}
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
