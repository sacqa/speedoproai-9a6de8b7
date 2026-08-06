import { z } from "zod";
import { pkPhone } from "@/lib/validators";

export const guestDetailsSchema = z.object({
  name: z.string().trim().min(2, "Enter your name").max(60),
  phone: pkPhone,
  area: z.string().trim().min(2, "Enter your area").max(60),
  street: z.string().trim().min(2, "Enter your delivery address").max(200),
});

export type GuestDetails = z.infer<typeof guestDetailsSchema>;
