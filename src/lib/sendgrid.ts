import { env } from "../config/env.js";

export function isSendGridConfigured() {
  return Boolean(
    env.SENDGRID_API_KEY &&
      env.SENDGRID_FROM_EMAIL &&
      env.SENDGRID_BOOKING_TEMPLATE_ID,
  );
}

export type BookingMailData = {
  LocationName: string;
  LocationAdress: string;
  time: string;
  employeeImage: string;
  EmployeeName: string;
  emailExtraTxt: string;
};

export async function sendBookingConfirmationEmail(input: {
  toEmail: string;
  toName?: string;
  data: BookingMailData;
}) {
  if (!isSendGridConfigured()) {
    throw new Error(
      "SendGrid is niet geconfigureerd (SENDGRID_API_KEY, SENDGRID_FROM_EMAIL, SENDGRID_BOOKING_TEMPLATE_ID)",
    );
  }

  const response = await fetch("https://api.sendgrid.com/v3/mail/send", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.SENDGRID_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      personalizations: [
        {
          to: [
            {
              email: input.toEmail,
              ...(input.toName ? { name: input.toName } : {}),
            },
          ],
          dynamic_template_data: input.data,
        },
      ],
      from: {
        email: env.SENDGRID_FROM_EMAIL,
        name: env.SENDGRID_FROM_NAME || env.SENDGRID_FROM_EMAIL,
      },
      template_id: env.SENDGRID_BOOKING_TEMPLATE_ID,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`SendGrid mail mislukt (${response.status}): ${text}`);
  }
}

export function absoluteMediaUrl(
  pathOrUrl: string | null | undefined,
  publicBaseUrl: string,
) {
  if (!pathOrUrl?.trim()) return "";
  const value = pathOrUrl.trim();
  if (/^https?:\/\//i.test(value)) return value;
  const base = publicBaseUrl.replace(/\/$/, "");
  return value.startsWith("/") ? `${base}${value}` : `${base}/${value}`;
}

export function formatAppointmentTime(
  date: string,
  start: string,
  end: string,
) {
  const [year, month, day] = date.split("-").map(Number);
  const dateLabel = new Intl.DateTimeFormat("nl-BE", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(year!, (month || 1) - 1, day || 1));
  return `${dateLabel}, ${start} – ${end}`;
}
