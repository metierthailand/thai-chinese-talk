import z from "zod";
import { ROLE_VALUES } from "@/lib/constants/role";

export const userFormSchema = z.object({
  firstName: z.string().min(1, {
    message: "First name is required.",
  }),
  lastName: z.string().min(1, {
    message: "Last name is required.",
  }),
  email: z.string().email({
    message: "Email is required.",
  }),
  phoneNumber: z.string().optional(),
  role: z.enum(ROLE_VALUES, {
    message: "Role is required.",
  }),
  commissionPerHead: z.string().optional(),
  isActive: z.boolean().optional(),
});

export type UserFormValues = z.infer<typeof userFormSchema>;
