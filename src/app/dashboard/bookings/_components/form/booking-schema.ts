import * as z from "zod";
import { Customer } from "@/app/dashboard/customers/hooks/use-customers";

// Sales User interface
export interface SalesUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber?: string;
}

// Type for selectedCustomer which may have partial fields
export type SelectedCustomer = Pick<Customer, "id" | "firstNameEn" | "lastNameEn"> & {
  firstNameTh?: string;
  lastNameTh?: string;
  email?: string | null;
  phone?: string;
};

// Type for payment form values
export type PaymentFormValue = {
  id?: string; // Existing payment ID (for edit mode)
  amount?: string;
  proofOfPayment?: string;
};

// Base schema without conditional validation
export const baseFormSchema = z.object({
  customerId: z.string().min(1, { message: "Please select the information." }),
  tripId: z.string().min(1, { message: "Please select the information." }),
  salesUserId: z.string().min(1, { message: "Please select the information." }),
  passportId: z.string().min(1, { message: "Please select the information." }),
  companionCustomerIds: z.array(z.string()).optional(),
  note: z.string().optional(),
  extraPriceForSingleTraveller: z.string().optional(),
  roomType: z.enum(["DOUBLE_BED", "TWIN_BED"], { message: "Please select the information." }),
  extraPricePerBed: z.string().optional(),
  roomNote: z.string().optional(),
  seatType: z.enum(["WINDOW", "MIDDLE", "AISLE", "NOT_SPECIFIED"], { message: "Please select the information." }),
  seatClass: z.enum(["FIRST_CLASS", "BUSINESS_CLASS", "LONG_LEG", "OTHER"]).optional(),
  extraPricePerSeat: z.string().optional(),
  seatNote: z.string().optional(),
  extraPricePerBag: z.string().optional(),
  bagNote: z.string().optional(),
  discountPrice: z.string().optional(),
  discountNote: z.string().optional(),
  paymentStatus: z.enum(["DEPOSIT_PENDING", "DEPOSIT_PAID", "FULLY_PAID", "CANCELLED"]),
  firstPaymentRatio: z.enum(["FIRST_PAYMENT_100", "FIRST_PAYMENT_50", "FIRST_PAYMENT_30"]),
  isRechecked: z.boolean().optional(),
  payments: z.array(
    z.object({
      id: z.string().optional(), // Existing payment ID (for edit mode)
      amount: z.string().optional(),
      proofOfPayment: z.string().optional(),
    })
  ).optional(),
});

export type BookingFormValues = z.infer<typeof baseFormSchema>;
