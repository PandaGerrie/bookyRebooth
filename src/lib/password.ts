import { z } from "zod";

export const PASSWORD_RULES_NL =
  "Minimaal 8 tekens, met hoofdletter, kleine letter, cijfer en speciaal teken";

const hasLower = /[a-z]/;
const hasUpper = /[A-Z]/
const hasDigit = /\d/;
const hasSpecial = /[^A-Za-z0-9]/;

export function isStrongPassword(value: string) {
  return (
    value.length >= 8 &&
    hasLower.test(value) &&
    hasUpper.test(value) &&
    hasDigit.test(value) &&
    hasSpecial.test(value)
  );
}

export const strongPasswordSchema = z
  .string()
  .min(8, PASSWORD_RULES_NL)
  .refine(isStrongPassword, { message: PASSWORD_RULES_NL });
