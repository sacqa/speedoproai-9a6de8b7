import { z } from "zod";

export const pkPhone = z
  .string()
  .trim()
  .regex(/^03\d{9}$/, "Enter a valid Pakistani number (03xxxxxxxxx)");

export const otpSchema = z.string().regex(/^\d{6}$/, "Enter the 6-digit code");

export const addressSchema = z.object({
  label: z.string().trim().min(1).max(40),
  recipient_name: z.string().trim().min(2).max(60),
  phone: pkPhone,
  area: z.string().trim().min(2).max(60),
  street: z.string().trim().min(2).max(120),
  details: z.string().trim().max(200).optional().or(z.literal("")),
  is_default: z.boolean().optional(),
});

export type AddressInput = z.infer<typeof addressSchema>;