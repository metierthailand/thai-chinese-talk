"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

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
  };
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function PaymentForm({ bookingId, booking, onSuccess, onCancel }: PaymentFormProps) {
  const [isLoading, setIsLoading] = useState(false);

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
          name="paymentType"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Payment Type</FormLabel>
              <Select
                onValueChange={field.onChange}
                value={field.value}
                disabled
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select payment type" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="secondPayment" disabled={!!booking?.secondPaymentId}>
                    Second Payment
                    {booking?.secondPaymentId && " (Already exists)"}
                  </SelectItem>
                  <SelectItem value="thirdPayment" disabled={!!booking?.thirdPaymentId}>
                    Third Payment
                    {booking?.thirdPaymentId && " (Already exists)"}
                  </SelectItem>
                </SelectContent>
              </Select>
              <FormDescription>
                {booking?.secondPaymentId && booking?.thirdPaymentId
                  ? "All payments have been added (maximum 3 payments)"
                  : booking?.secondPaymentId
                    ? "Add third payment (second payment already exists)"
                    : "Add second payment"}
              </FormDescription>
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
                <Textarea placeholder="Add proof of payment URL or reference..." className="resize-none" {...field} />
              </FormControl>
              <FormDescription>URL or reference to payment proof (e.g., bank transfer receipt)</FormDescription>
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
