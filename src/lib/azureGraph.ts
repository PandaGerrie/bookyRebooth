import { env } from "../config/env.js";

type TokenCache = {
  accessToken: string;
  expiresAt: number;
};

type GraphScheduleItem = {
  status?: string;
  start?: { dateTime?: string; timeZone?: string };
  end?: { dateTime?: string; timeZone?: string };
};

type GraphSchedule = {
  scheduleId?: string;
  availabilityView?: string;
  scheduleItems?: GraphScheduleItem[];
  error?: {
    message?: string;
    responseCode?: string;
  };
};

export type CalendarReachability = {
  email: string;
  visible: boolean;
  status: "Agenda zichtbaar" | "Agenda niet bereikbaar";
  detail?: string;
};

export type AvailabilityResult = {
  email: string;
  available: boolean;
  status: "Beschikbaar" | "Niet beschikbaar" | "Agenda niet bereikbaar";
  detail?: string;
};

let tokenCache: TokenCache | null = null;

export function isAzureConfigured() {
  return Boolean(
    env.AZURE_TENANT_ID && env.AZURE_CLIENT_ID && env.AZURE_CLIENT_SECRET,
  );
}

async function getAccessToken(): Promise<string> {
  if (!isAzureConfigured()) {
    throw new Error("Azure Graph is niet geconfigureerd");
  }

  const now = Date.now();
  if (tokenCache && tokenCache.expiresAt > now + 60_000) {
    return tokenCache.accessToken;
  }

  const body = new URLSearchParams({
    client_id: env.AZURE_CLIENT_ID!,
    client_secret: env.AZURE_CLIENT_SECRET!,
    scope: "https://graph.microsoft.com/.default",
    grant_type: "client_credentials",
  });

  const response = await fetch(
    `https://login.microsoftonline.com/${env.AZURE_TENANT_ID}/oauth2/v2.0/token`,
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    },
  );

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Azure token ophalen mislukt (${response.status}): ${text}`);
  }

  const data = (await response.json()) as {
    access_token: string;
    expires_in: number;
  };

  tokenCache = {
    accessToken: data.access_token,
    expiresAt: now + data.expires_in * 1000,
  };

  return data.access_token;
}

function toGraphDateTime(date: string, time: string) {
  return `${date}T${time}:00`;
}

function addMinutes(date: string, time: string, minutes: number) {
  const start = new Date(`${date}T${time}:00`);
  const end = new Date(start.getTime() + minutes * 60_000);
  const pad = (value: number) => String(value).padStart(2, "0");
  return {
    date: `${end.getFullYear()}-${pad(end.getMonth() + 1)}-${pad(end.getDate())}`,
    time: `${pad(end.getHours())}:${pad(end.getMinutes())}`,
  };
}

function overlapsSlot(
  item: GraphScheduleItem,
  slotStart: Date,
  slotEnd: Date,
): boolean {
  if (!item.start?.dateTime || !item.end?.dateTime) return false;
  const itemStart = new Date(item.start.dateTime);
  const itemEnd = new Date(item.end.dateTime);
  return itemStart < slotEnd && itemEnd > slotStart;
}

async function getSchedules(
  emails: string[],
  startDate: string,
  startTime: string,
  durationMinutes: number,
): Promise<GraphSchedule[]> {
  const uniqueEmails = [
    ...new Set(emails.map((email) => email.trim().toLowerCase()).filter(Boolean)),
  ];
  if (uniqueEmails.length === 0) return [];

  const token = await getAccessToken();
  const end = addMinutes(startDate, startTime, durationMinutes);
  const organizer = uniqueEmails[0];

  const response = await fetch(
    `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(organizer)}/calendar/getSchedule`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        schedules: uniqueEmails,
        startTime: {
          dateTime: toGraphDateTime(startDate, startTime),
          timeZone: env.AZURE_TIMEZONE,
        },
        endTime: {
          dateTime: toGraphDateTime(end.date, end.time),
          timeZone: env.AZURE_TIMEZONE,
        },
        availabilityViewInterval: Math.min(durationMinutes, 60),
      }),
    },
  );

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Graph getSchedule mislukt (${response.status}): ${text}`);
  }

  const data = (await response.json()) as { value?: GraphSchedule[] };
  return data.value ?? [];
}

function findSchedule(schedules: GraphSchedule[], email: string) {
  const needle = email.trim().toLowerCase();
  return schedules.find(
    (item) => (item.scheduleId || "").trim().toLowerCase() === needle,
  );
}

export async function checkCalendarVisibility(
  emails: string[],
): Promise<CalendarReachability[]> {
  const uniqueEmails = [
    ...new Set(emails.map((email) => email.trim().toLowerCase()).filter(Boolean)),
  ];

  if (uniqueEmails.length === 0) return [];

  const now = new Date();
  const pad = (value: number) => String(value).padStart(2, "0");
  const date = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  const time = `${pad(now.getHours())}:${pad(now.getMinutes())}`;

  try {
    const schedules = await getSchedules(uniqueEmails, date, time, 30);

    return uniqueEmails.map((email) => {
      const schedule = findSchedule(schedules, email);
      if (!schedule) {
        return {
          email,
          visible: false,
          status: "Agenda niet bereikbaar" as const,
          detail: "Geen antwoord van Azure",
        };
      }

      if (schedule.error) {
        return {
          email,
          visible: false,
          status: "Agenda niet bereikbaar" as const,
          detail: schedule.error.message || schedule.error.responseCode,
        };
      }

      return {
        email,
        visible: true,
        status: "Agenda zichtbaar" as const,
      };
    });
  } catch (error) {
    const detail = error instanceof Error ? error.message : "Onbekende fout";
    return uniqueEmails.map((email) => ({
      email,
      visible: false,
      status: "Agenda niet bereikbaar" as const,
      detail,
    }));
  }
}

function isScheduleBusy(
  schedule: GraphSchedule,
  slotStart: Date,
  slotEnd: Date,
): boolean {
  return (schedule.scheduleItems ?? []).some((item) => {
    const status = (item.status || "").toLowerCase();
    if (status === "free") return false;
    return overlapsSlot(item, slotStart, slotEnd);
  });
}

export async function checkAvailabilityAt(
  emails: string[],
  date: string,
  time: string,
  durationMinutes = 30,
): Promise<AvailabilityResult[]> {
  const uniqueEmails = [
    ...new Set(emails.map((email) => email.trim().toLowerCase()).filter(Boolean)),
  ];

  if (uniqueEmails.length === 0) return [];

  const slotStart = new Date(`${date}T${time}:00`);
  const slotEnd = new Date(slotStart.getTime() + durationMinutes * 60_000);
  const schedules = await getSchedules(
    uniqueEmails,
    date,
    time,
    durationMinutes,
  );

  return uniqueEmails.map((email) => {
    const schedule = findSchedule(schedules, email);

    if (!schedule || schedule.error) {
      return {
        email,
        available: false,
        status: "Agenda niet bereikbaar" as const,
        detail: schedule?.error?.message || schedule?.error?.responseCode,
      };
    }

    const busy = isScheduleBusy(schedule, slotStart, slotEnd);

    return {
      email,
      available: !busy,
      status: busy ? ("Niet beschikbaar" as const) : ("Beschikbaar" as const),
    };
  });
}

export type HourlySlot = {
  start: string;
  end: string;
};

export type HourlyAvailability = {
  email: string;
  reachable: boolean;
  detail?: string;
  slots: Array<HourlySlot & { available: boolean }>;
};

export type CreateCalendarEventInput = {
  sellerEmail: string;
  subject: string;
  bodyHtml?: string;
  date: string;
  start: string;
  end: string;
  locationName: string;
  locationAddress?: string | null;
};

export type CreateCalendarEventResult = {
  id: string;
  webLink?: string;
};

export async function createCalendarEvent(
  input: CreateCalendarEventInput,
): Promise<CreateCalendarEventResult> {
  const token = await getAccessToken();
  const locationDisplay = [input.locationName, input.locationAddress]
    .map((part) => part?.trim())
    .filter(Boolean)
    .join(" — ");

  const response = await fetch(
    `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(input.sellerEmail)}/events`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        subject: input.subject,
        body: {
          contentType: "HTML",
          content: input.bodyHtml || "",
        },
        start: {
          dateTime: toGraphDateTime(input.date, input.start),
          timeZone: env.AZURE_TIMEZONE,
        },
        end: {
          dateTime: toGraphDateTime(input.date, input.end),
          timeZone: env.AZURE_TIMEZONE,
        },
        location: {
          displayName: locationDisplay || input.locationName,
        },
        isReminderOn: true,
        reminderMinutesBeforeStart: 15,
      }),
    },
  );

  if (!response.ok) {
    const text = await response.text();
    throw new Error(
      `Graph event aanmaken mislukt (${response.status}): ${text}`,
    );
  }

  const data = (await response.json()) as { id?: string; webLink?: string };
  if (!data.id) {
    throw new Error("Graph event aanmaken mislukt: geen event-id");
  }

  return { id: data.id, webLink: data.webLink };
}

/** Check multiple hourly slots in one Graph call (window = earliest start → latest end). */
export async function checkHourlyAvailability(
  emails: string[],
  date: string,
  slots: HourlySlot[],
): Promise<HourlyAvailability[]> {
  const uniqueEmails = [
    ...new Set(emails.map((email) => email.trim().toLowerCase()).filter(Boolean)),
  ];

  if (uniqueEmails.length === 0 || slots.length === 0) {
    return uniqueEmails.map((email) => ({
      email,
      reachable: false,
      detail: "Geen slots",
      slots: [],
    }));
  }

  const sorted = [...slots].sort((a, b) => a.start.localeCompare(b.start));
  const windowStart = sorted[0].start;
  const windowEnd = sorted[sorted.length - 1].end;
  const startDate = new Date(`${date}T${windowStart}:00`);
  const endDate = new Date(`${date}T${windowEnd}:00`);
  const durationMinutes = Math.max(
    60,
    Math.round((endDate.getTime() - startDate.getTime()) / 60_000),
  );

  const schedules = await getSchedules(
    uniqueEmails,
    date,
    windowStart,
    durationMinutes,
  );

  return uniqueEmails.map((email) => {
    const schedule = findSchedule(schedules, email);

    if (!schedule || schedule.error) {
      return {
        email,
        reachable: false,
        detail: schedule?.error?.message || schedule?.error?.responseCode,
        slots: slots.map((slot) => ({ ...slot, available: false })),
      };
    }

    return {
      email,
      reachable: true,
      slots: slots.map((slot) => {
        const slotStart = new Date(`${date}T${slot.start}:00`);
        const slotEnd = new Date(`${date}T${slot.end}:00`);
        return {
          ...slot,
          available: !isScheduleBusy(schedule, slotStart, slotEnd),
        };
      }),
    };
  });
}
