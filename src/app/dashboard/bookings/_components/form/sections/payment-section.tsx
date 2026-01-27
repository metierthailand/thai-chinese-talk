import { UseFormReturn } from "react-hook-form";
import { ChevronDown, Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { DragDropUpload } from "@/components/upload-image";
import { BookingFormValues } from "../booking-schema";
import { Booking } from "@/app/dashboard/bookings/hooks/use-bookings";

interface PaymentSectionProps {
  form: UseFormReturn<BookingFormValues>;
  readOnly: boolean;
  mode: "create" | "edit" | "view";
  booking?: Booking;
  calculatedAmounts: {
    totalAmount: number;
    firstPaymentAmount: number;
  };
  isPaymentProofsOpen: boolean;
  setIsPaymentProofsOpen: (open: boolean) => void;
  payments: any[];
  trips: any[];
  tripId: string;
  selectedCustomer: any;
}

export function PaymentSection({
  form,
  readOnly,
  mode,
  booking,
  calculatedAmounts,
  isPaymentProofsOpen,
  setIsPaymentProofsOpen,
  payments,
  trips,
  tripId,
  selectedCustomer,
}: PaymentSectionProps) {
  return (
    <>
      <h3 className="text-lg font-semibold">Payment summary</h3>

      {/* Additional Payments Section (Edit Mode Only) - Outside form to avoid nested forms */}
      {booking && (
        <div className="mt-6 space-y-4">

          {/* Calculate total amount and paid amount */}
          {(() => {
            const basePrice = booking.trip?.standardPrice || 0;
            const extraSingle = booking.extraPriceForSingleTraveller || 0;
            const extraBedPrice = booking.extraPricePerBed || 0;
            const extraSeatPrice = booking.extraPricePerSeat || 0;
            const extraBagPrice = booking.extraPricePerBag || 0;
            const discount = booking.discountPrice || 0;
            const totalAmount = basePrice + extraSingle + extraBedPrice + extraSeatPrice + extraBagPrice - discount;

            const firstAmount = booking.firstPayment?.amount || 0;
            const secondAmount = booking.secondPayment?.amount || 0;
            const thirdAmount = booking.thirdPayment?.amount || 0;
            const paidAmount = firstAmount + secondAmount + thirdAmount;
            const remainingAmount = totalAmount - paidAmount;

            return (
              <div className="space-y-4">
                <div className="bg-muted grid grid-cols-3 gap-4 rounded-md p-4">
                  <div>
                    <p className="text-muted-foreground text-sm">Total Amount</p>
                    <p className="text-lg font-semibold">
                      {totalAmount.toLocaleString("en-US", { minimumFractionDigits: 2 })} THB
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-sm">Paid Amount</p>
                    <p className="text-lg font-semibold">
                      {paidAmount.toLocaleString("en-US", { minimumFractionDigits: 2 })} THB
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-sm">Remaining</p>
                    <p
                      className={`text-lg font-semibold ${remainingAmount > 0 ? "text-destructive" : "text-green-600"}`}
                    >
                      {remainingAmount.toLocaleString("en-US", { minimumFractionDigits: 2 })} THB
                    </p>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      <div className="space-y-4 mt-6">
        <div className="grid grid-cols-1 gap-4">
          <FormField
            control={form.control}
            name="paymentStatus"
            render={({ field }) => {
              // Calculate Total Amount
              const basePrice = booking?.trip?.standardPrice || 0;
              const extraSingle = booking?.extraPriceForSingleTraveller || 0;
              const extraBedPrice = booking?.extraPricePerBed || 0;
              const extraSeatPrice = booking?.extraPricePerSeat || 0;
              const extraBagPrice = booking?.extraPricePerBag || 0;
              const discount = booking?.discountPrice || 0;
              const calculatedTotal =
                basePrice + extraSingle + extraBedPrice + extraSeatPrice + extraBagPrice - discount;

              // Use calculated amount from booking if available, otherwise from props
              const totalAmount = booking ? calculatedTotal : calculatedAmounts.totalAmount;

              // Calculate Paid Amount from existing booking payments
              const existingPaid = booking?.payments?.reduce((sum, p) => sum + (p.amount || 0), 0) || 0;

              // Calculate Paid Amount from form values (new payments)
              const formPayments = form.watch("payments") || [];
              const newPaid = formPayments.reduce((sum: number, p: any) => sum + (Number(p.amount) || 0), 0);

              const totalPaid = existingPaid + newPaid;

              // Determine correct status
              let calculatedStatus = "DEPOSIT_PENDING";
              if (totalPaid >= totalAmount && totalAmount > 0) {
                calculatedStatus = "FULLY_PAID";
              } else if (totalPaid > 0) {
                calculatedStatus = "DEPOSIT_PAID";
              }

              // Auto-update status if not manually cancelled
              const currentStatus = field.value;
              if (currentStatus !== "CANCELLED" && currentStatus !== calculatedStatus) {
                // Use setTimeout to avoid render loop issues
                setTimeout(() => {
                  field.onChange(calculatedStatus);
                }, 0);
              }

              return (
                <FormItem>
                  <FormLabel required>Payment status</FormLabel>
                  {readOnly || currentStatus === "CANCELLED" ? (
                    <FormControl>
                      <Input value={currentStatus === "CANCELLED" ? "Cancelled" : (
                        currentStatus === "FULLY_PAID" ? "Fully paid" :
                          currentStatus === "DEPOSIT_PAID" ? "Deposit paid" :
                            "Deposit pending"
                      )} disabled />
                    </FormControl>
                  ) : (
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="DEPOSIT_PENDING" disabled>
                          Deposit pending
                        </SelectItem>
                        <SelectItem value="DEPOSIT_PAID" disabled>
                          Deposit paid
                        </SelectItem>
                        <SelectItem value="FULLY_PAID" disabled>
                          Fully paid
                        </SelectItem>
                        <SelectItem value="CANCELLED">Cancelled</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                  <FormMessage />
                </FormItem>
              );
            }}
          />

          <FormField
            control={form.control}
            name="firstPaymentRatio"
            render={({ field }) => {
              // Disable if there's already a payment made
              const hasPayment = booking?.firstPayment !== undefined && booking?.firstPayment !== null;
              const isDisabled = readOnly || hasPayment;

              // Map value to display label
              const getPaymentRatioLabel = (value: string) => {
                switch (value) {
                  case "FIRST_PAYMENT_100":
                    return "100% (Full Payment)";
                  case "FIRST_PAYMENT_50":
                    return "50% (Half Payment)";
                  case "FIRST_PAYMENT_30":
                    return "30% (Deposit)";
                  default:
                    return value;
                }
              };

              return (
                <FormItem>
                  <FormLabel>1st payment (Ratio)</FormLabel>
                  <div className="grid grid-cols-2 gap-4">
                    {isDisabled ? (
                      <FormControl>
                        <Input value={getPaymentRatioLabel(field.value)} disabled />
                      </FormControl>
                    ) : (
                      <Select onValueChange={field.onChange} value={field.value} key={`firstPaymentRatio-${field.value}`}>
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="FIRST_PAYMENT_100">100% (Full payment)</SelectItem>
                          <SelectItem value="FIRST_PAYMENT_50">50% (Half payment)</SelectItem>
                          <SelectItem value="FIRST_PAYMENT_30">30% (Deposit)</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                    <Input
                      value={`${calculatedAmounts.firstPaymentAmount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} THB`}
                      disabled
                      className="bg-muted text-foreground opacity-100"
                    />
                  </div>
                  {hasPayment && (
                    <FormDescription className="text-muted-foreground text-xs">
                      Cannot edit: Payment has already been made
                    </FormDescription>
                  )}
                  <FormMessage />
                </FormItem>
              );
            }}
          />
        </div>
      </div>

      {/* Payment Proofs Section */}
      <Collapsible open={isPaymentProofsOpen} onOpenChange={setIsPaymentProofsOpen} className="space-y-4 mt-6">
        <div className="flex items-center justify-between">
          <CollapsibleTrigger asChild>
            <Button
              variant="ghost"
              type="button"
              className="flex items-center gap-2 p-0 text-lg font-semibold hover:bg-transparent"
            >
              <ChevronDown className={cn("h-4 w-4 transition-transform", !isPaymentProofsOpen && "-rotate-90")} />
              Payment
            </Button>
          </CollapsibleTrigger>
          {!readOnly && (() => {
            const currentPayments = form.getValues("payments") || [];
            return currentPayments.length < 3;
          })() && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  const currentPayments = form.getValues("payments") || [];
                  if (currentPayments.length < 3) {
                    form.setValue("payments", [...currentPayments, { amount: "", proofOfPayment: "" }]);
                    setIsPaymentProofsOpen(true);
                  }
                }}
              >
                <Plus className="mr-2 h-4 w-4" />
                Add
              </Button>
            )}
        </div>

        <CollapsibleContent className="space-y-4">
          {payments.map((_, index) => {
            // Check if this payment is an existing one from the database
            const isExistingPayment = mode === "edit" && booking?.payments && index < booking.payments.length;

            // Generate folder name from customer and trip
            const getFolderName = () => {
              if (!selectedCustomer || !tripId) {
                return "payment-proofs";
              }

              const customerName = selectedCustomer.firstNameEn || selectedCustomer.firstNameTh || "";
              const lastName = selectedCustomer.lastNameEn || selectedCustomer.lastNameTh || "";
              const customerFullName = `${customerName}_${lastName}`
                .replace(/[^a-zA-Z0-9ก-๙\s_]/g, "")
                .replace(/\s+/g, "_")
                .toLowerCase();

              const selectedTrip = trips.find((t) => t.id === tripId);
              if (!selectedTrip) {
                return `payment-proofs/${customerFullName}`;
              }

              const tripName = selectedTrip.name
                .replace(/[^a-zA-Z0-9ก-๙\s_]/g, "")
                .replace(/\s+/g, "_")
                .toLowerCase();

              return `payment-proofs/${customerFullName}_${tripName}`;
            };

            const paymentType = index === 0 ? "1st" : index === 1 ? "2nd" : "3rd";

            return (
              <div key={index} className="relative rounded-md border p-4 space-y-4">
                {!readOnly && !isExistingPayment && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute top-2 right-2 text-red-500 hover:text-red-700"
                    onClick={() => {
                      const current = form.getValues("payments") || [];
                      form.setValue(
                        "payments",
                        current.filter((_, i) => i !== index),
                      );
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}

                {/* Payment Amount */}
                <FormField
                  control={form.control}
                  name={`payments.${index}.amount`}
                  render={({ field }) => {
                    const isDisabled = readOnly || isExistingPayment;
                    return (
                      <FormItem>
                        <FormLabel required>{paymentType} Payment</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="0.00"
                            {...field}
                            value={field.value || ""}
                            disabled={isDisabled}
                            onChange={(e) => {
                              const value = e.target.value;
                              field.onChange(value);
                              // If user manually changes the value in create mode for first payment, validate it matches calculated
                              if (mode === "create" && index === 0 && value) {
                                const calculated = calculatedAmounts.firstPaymentAmount.toFixed(2);
                                const entered = parseFloat(value);
                                const expected = parseFloat(calculated);
                                if (Math.abs(entered - expected) > 0.01) {
                                  // Show warning but don't block - let backend validate
                                  console.warn(
                                    `First payment amount (${entered}) does not match calculated value (${expected}). The calculated value will be used.`,
                                  );
                                }
                              }
                            }}
                          />
                        </FormControl>
                        {mode === "create" && index === 0 && (
                          <FormDescription className="text-muted-foreground text-xs">
                            Auto-calculated based on ratio: {calculatedAmounts.firstPaymentAmount.toFixed(2)} THB
                          </FormDescription>
                        )}
                        <FormMessage />
                      </FormItem>
                    );
                  }}
                />

                {/* Proof of Payment */}
                <FormField
                  control={form.control}
                  name={`payments.${index}.proofOfPayment`}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{paymentType} Payment Upload</FormLabel>
                      {readOnly || isExistingPayment ? (
                        <FormControl>
                          {field.value ? (
                            <div className="space-y-2">
                              <div className="bg-muted relative h-48 w-full overflow-hidden rounded-md border">
                                <picture>
                                  <img src={field.value} alt={`Proof of Payment ${index + 1}`} className="object-contain" />
                                </picture>
                              </div>
                              <a
                                href={field.value}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-primary text-sm underline"
                              >
                                View proof of payment
                              </a>
                            </div>
                          ) : (
                            <Input value="No proof uploaded" disabled />
                          )}
                        </FormControl>
                      ) : (
                        <FormControl>
                          {field.value ? (
                            <div className="space-y-2">
                              <div className="bg-muted relative h-48 w-full overflow-hidden rounded-md border">
                                <picture>
                                  <img src={field.value} alt={`Proof of Payment ${index + 1}`} className="object-contain" />
                                </picture>
                                <Button
                                  type="button"
                                  variant="destructive"
                                  size="icon"
                                  className="absolute top-2 right-2"
                                  onClick={() => field.onChange("")}
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                              <a
                                href={field.value}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-primary text-sm underline"
                              >
                                View proof of payment
                              </a>
                            </div>
                          ) : (
                            <DragDropUpload
                              acceptedFileTypes={[
                                "image/jpeg",
                                "image/png",
                                "image/jpg",
                                ".jpg",
                                ".jpeg",
                                ".png",
                                "application/pdf",
                                ".pdf",
                              ]}
                              maxFileSize={10 * 1024 * 1024} // 10MB
                              folderName={getFolderName()}
                              multiple={false}
                              onUploadSuccess={(url) => {
                                field.onChange(url);
                              }}
                              onUploadError={(error) => {
                                toast.error(error);
                              }}
                              className="w-full"
                            />
                          )}
                        </FormControl>
                      )}
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            );
          })}
          {payments.length === 0 && (!booking?.payments || booking.payments.length === 0) && (
            <div className="text-muted-foreground rounded-md border p-4 text-center text-sm">
              No payment
            </div>
          )}
        </CollapsibleContent>
      </Collapsible>
    </>
  );
}
