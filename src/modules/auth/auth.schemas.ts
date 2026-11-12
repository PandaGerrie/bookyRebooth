import { z } from "zod";
import { strongPasswordSchema } from "../../lib/password.js";

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Huidig wachtwoord is verplicht"),
    newPassword: strongPasswordSchema,
    confirmPassword: z.string().min(1, "Bevestig het nieuwe wachtwoord"),
  })
  .superRefine((data, ctx) => {
    if (data.newPassword !== data.confirmPassword) {
      ctx.addIssue({
        code: "custom",
        path: ["confirmPassword"],
        message: "Wachtwoorden komen niet overeen",
      });
    }
    if (data.currentPassword === data.newPassword) {
      ctx.addIssue({
        code: "custom",
        path: ["newPassword"],
        message: "Nieuw wachtwoord moet verschillen van het huidige",
      });
    }
  });
