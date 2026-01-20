"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { DragDropUpload } from "@/components/upload-image";
import { X } from "lucide-react";

const formSchema = z.object({
  amount: z.string().min(1, { message: "Amount is required" }),
  paymentType: z.enum(["secondPayment", "thirdPayment"]),
  proofOfPayment: z.string().optional(),
});

type PaymentFormValues = z.infer<typeof formSchema>;

interface PaymentFormProps {
  bookingId: string;
  booking?: {
    secondPaymentId?: string | null;
    thirdPaymentId?: string | null;
    customer?: {
      firstNameTh: string;
      lastNameTh: string;
      firstNameEn: string;
      lastNameEn: string;
    };
    trip?: {
      name: string;
    };
  };
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function PaymentForm({ bookingId, booking, onSuccess, onCancel }: PaymentFormProps) {
  const [isLoading, setIsLoading] = useState(false);

  // Generate folder name from customer and trip
  const getFolderName = () => {
    if (!booking?.customer || !booking?.trip) {
      return "payment-proofs";
    }

    const customerName = booking.customer.firstNameEn || booking.customer.firstNameTh || "";
    const lastName = booking.customer.lastNameEn || booking.customer.lastNameTh || "";
    const customerFullName = `${customerName}_${lastName}`
      .replace(/[^a-zA-Z0-9ก-๙\s_]/g, "")
      .replace(/\s+/g, "_")
      .toLowerCase();

    const tripName = booking.trip.name
      .replace(/[^a-zA-Z0-9ก-๙\s_]/g, "")
      .replace(/\s+/g, "_")
      .toLowerCase();

    return `payment-proofs/${customerFullName}_${tripName}`;
  };

  const form = useForm<PaymentFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      amount: "",
      paymentType: booking?.secondPaymentId ? "thirdPayment" : "secondPayment",
      proofOfPayment: "",
    },
  });

  async function onSubmit(values: PaymentFormValues) {
    setIsLoading(true);
    try {
      const response = await fetch("/api/payments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          bookingId,
          amount: parseFloat(values.amount),
          paymentType: values.paymentType,
          proofOfPayment: values.proofOfPayment || null,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create payment");
      }

      toast.success("Payment added", {
        description: "The payment has been recorded successfully.",
      });

      form.reset();
      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      console.error(error);
      toast.error("Failed to add payment. Please try again.", {
        description: error instanceof Error ? error.message : "Failed to add payment. Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="amount"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Amount (THB)</FormLabel>
              <FormControl>
                <Input type="number" placeholder="0.00" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="proofOfPayment"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Proof of Payment (Optional)</FormLabel>
              <FormControl>
                {field.value ? (
                  <div className="space-y-2">
                    <div className="bg-muted relative h-48 w-full overflow-hidden rounded-md border">
                      {field.value.endsWith(".pdf") || field.value.includes("application/pdf") ? (
                        <iframe
                          src={field.value}
                          className="h-full w-full"
                          title="Proof of Payment"
                          style={{ border: "none" }}
                        />
                      ) : (
                        <picture>
                          <img src={field.value} alt="Proof of Payment" className="h-full w-full object-contain" />
                        </picture>
                      )}
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
              <FormDescription>Upload proof of payment (max 10MB)</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end space-x-2 pt-4">
          {onCancel && (
            <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
              Cancel
            </Button>
          )}
          <Button type="submit" disabled={isLoading}>
            {isLoading ? "Adding..." : "Add Payment"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
