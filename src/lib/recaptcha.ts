import { env } from "../config/env.js";

export function isRecaptchaConfigured() {
  return Boolean(env.RECAPTCHA_SECRET_KEY);
}

type SiteVerifyResponse = {
  success?: boolean;
  score?: number;
  action?: string;
  hostname?: string;
  "error-codes"?: string[];
};

export async function verifyRecaptchaToken(input: {
  token: string;
  expectedAction?: string;
  remoteIp?: string | null;
}): Promise<{ ok: true; score: number } | { ok: false; error: string }> {
  if (!env.RECAPTCHA_SECRET_KEY) {
    return { ok: false, error: "reCAPTCHA is niet geconfigureerd" };
  }

  const token = input.token.trim();
  if (!token) {
    return { ok: false, error: "reCAPTCHA-token ontbreekt" };
  }

  const body = new URLSearchParams({
    secret: env.RECAPTCHA_SECRET_KEY,
    response: token,
  });
  if (input.remoteIp?.trim()) {
    body.set("remoteip", input.remoteIp.trim());
  }

  const response = await fetch(
    "https://www.google.com/recaptcha/api/siteverify",
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    },
  );

  if (!response.ok) {
    return { ok: false, error: "reCAPTCHA-verificatie mislukt" };
  }

  const data = (await response.json()) as SiteVerifyResponse;
  if (!data.success) {
    const codes = data["error-codes"]?.join(", ") || "onbekend";
    return { ok: false, error: `reCAPTCHA geweigerd (${codes})` };
  }

  if (
    input.expectedAction &&
    data.action &&
    data.action !== input.expectedAction
  ) {
    return { ok: false, error: "reCAPTCHA-actie komt niet overeen" };
  }

  const score = typeof data.score === "number" ? data.score : 0;
  if (score < env.RECAPTCHA_MIN_SCORE) {
    return {
      ok: false,
      error: `reCAPTCHA-score te laag (${score.toFixed(2)})`,
    };
  }

  return { ok: true, score };
}
