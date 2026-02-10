import { UseFormReturn } from "react-hook-form";
import { Switch } from "@/components/ui/switch";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { BookingFormValues } from "../booking-schema";
import { Trip } from "@/app/dashboard/trips/hooks/use-trips";

interface CostSummarySectionProps {
  form: UseFormReturn<BookingFormValues>;
  readOnly: boolean;
  lockFullyPaid?: boolean;
  calculatedAmounts: {
    totalAmount: number;
    firstPaymentAmount: number;
  };
  trips: Trip[];
  tripId: string;
  enableSingleTravellerPrice: boolean;
  setEnableSingleTravellerPrice: (enable: boolean) => void;
}

export function CostSummarySection({
  form,
  readOnly,
  lockFullyPaid = false,
  calculatedAmounts,
  trips,
  tripId,
  enableSingleTravellerPrice,
  setEnableSingleTravellerPrice,
}: CostSummarySectionProps) {
  const extraPriceDisabled = readOnly || lockFullyPaid;
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Cost summary</h3>

      <div className="border-primary/20 bg-primary/5 rounded-lg border-2 p-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <FormLabel className="text-base font-semibold">Total amount</FormLabel>
            <FormDescription className="text-xs">Standard price + extra prices - discount price</FormDescription>
          </div>
          <div className="text-right">
            <div className="text-primary text-2xl font-bold">
              {calculatedAmounts.totalAmount.toLocaleString("en-US", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </div>
            <div className="text-muted-foreground text-xs">THB</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        <FormField
          control={form.control}
          name="extraPriceForSingleTraveller"
          render={({ field }) => {
            const selectedTrip = trips.find((t) => t.id === tripId);
            const tripExtraPrice = selectedTrip?.extraPricePerPerson || "0";

            return (
              <FormItem>
                <div className="flex items-center justify-between">
                  <FormLabel>Extra price for single traveller</FormLabel>
                  <div className="flex items-center space-x-2">
                    <FormLabel htmlFor="single-traveller-toggle" className="cursor-pointer text-sm font-normal">
                      Add-on
                    </FormLabel>
                    <Switch
                      id="single-traveller-toggle"
                      checked={enableSingleTravellerPrice}
                      onCheckedChange={(checked) => {
                        setEnableSingleTravellerPrice(checked);
                        if (checked) {
                          // When enabled, set value from trip's extraPricePerPerson
                          field.onChange(tripExtraPrice);
                        } else {
                          // When disabled, clear the value
                          field.onChange("");
                        }
                      }}
                      disabled={extraPriceDisabled}
                    />
                  </div>
                </div>
                <FormControl>
                  <Input
                    type="number"
                    {...field}
                    disabled
                    onChange={(e) => field.onChange(e.target.value)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            );
          }}
        />
      </div>
    </div>
  );
}
