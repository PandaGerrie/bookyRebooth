import {
  createCalendarEvent,
  isAzureConfigured,
} from "../../lib/azureGraph.js";
import { getAvailabilitySlots } from "../availability/availability.service.js";

export type CreateBookingInput = {
  entityId: string;
  entityName: string;
  location: string;
  category: string;
  date: string;
  start: string;
  end: string;
  sellerId: string | null;
  customer: {
    firstName: string;
    lastName: string;
    phone: string;
    email: string;
    address?: string;
    currentVehicle?: string;
    extraInfo?: string;
  };
  productName?: string | null;
};

export type CreateBookingResult = {
  seller: {
    sellerId: string;
    name: string;
    imageUrl: string | null;
  };
  location: {
    id: string;
    name: string;
    permalink: string;
    address: string;
  };
  category: {
    id: string;
    name: string;
    slug: string;
  };
  date: string;
  start: string;
  end: string;
  customerName: string;
  productName: string | null;
  calendarEventId: string;
};

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function pickAssignedSeller<T extends { sellerId: string }>(
  candidates: T[],
  key: string,
) {
  if (candidates.length === 0) return null;
  if (candidates.length === 1) return candidates[0]!;
  let hash = 0;
  for (let i = 0; i < key.length; i += 1) {
    hash = (hash * 31 + key.charCodeAt(i)) >>> 0;
  }
  return candidates[hash % candidates.length]!;
}

export async function createBooking(
  input: CreateBookingInput,
): Promise<
  | { ok: true; data: CreateBookingResult }
  | { ok: false; status: number; error: string }
> {
  if (!isAzureConfigured()) {
    return {
      ok: false,
      status: 503,
      error:
        "Azure Graph is nog niet geconfigureerd. Zet AZURE_TENANT_ID, AZURE_CLIENT_ID en AZURE_CLIENT_SECRET in de omgeving.",
    };
  }

  const availability = await getAvailabilitySlots({
    entityId: input.entityId,
    location: input.location,
    category: input.category,
    date: input.date,
    dayStartHour: 0,
  });

  if (!availability.ok) {
    return availability;
  }

  type SellerRow = (typeof availability.data.sellers)[number];
  const forSlot = (seller: SellerRow) =>
    seller.slots.some(
      (slot) =>
        slot.available &&
        slot.start === input.start &&
        slot.end === input.end,
    );

  let chosen: SellerRow | null = null;
  if (input.sellerId) {
    chosen =
      availability.data.sellers.find(
        (seller) => seller.sellerId === input.sellerId && forSlot(seller),
      ) ?? null;
  } else {
    const candidates = availability.data.sellers.filter(forSlot);
    chosen = pickAssignedSeller(
      candidates,
      `${input.date}|${input.start}|${input.end}`,
    );
  }

  if (!chosen) {
    return {
      ok: false,
      status: 409,
      error: "Dit tijdslot is niet meer beschikbaar voor de gekozen verkoper.",
    };
  }

  const customerName =
    `${input.customer.firstName.trim()} ${input.customer.lastName.trim()}`.trim();
  const location = availability.data.location;
  const subject = `Afspraak met ${customerName} en ${chosen.name} @ ${location.name}.`;

  const details: string[] = [
    `<p><strong>${escapeHtml(subject)}</strong></p>`,
    `<p>Locatie: ${escapeHtml(location.name)}<br/>${escapeHtml(location.address)}</p>`,
    `<p>Tijd: ${escapeHtml(input.date)} ${escapeHtml(input.start)} – ${escapeHtml(input.end)}</p>`,
    `<p>Klant: ${escapeHtml(customerName)}<br/>Tel: ${escapeHtml(input.customer.phone)}<br/>E-mail: ${escapeHtml(input.customer.email)}</p>`,
  ];
  if (input.customer.address?.trim()) {
    details.push(`<p>Adres klant: ${escapeHtml(input.customer.address.trim())}</p>`);
  }
  if (input.productName?.trim()) {
    details.push(`<p>Product: ${escapeHtml(input.productName.trim())}</p>`);
  }
  if (input.customer.currentVehicle?.trim()) {
    details.push(
      `<p>Huidig voertuig: ${escapeHtml(input.customer.currentVehicle.trim())}</p>`,
    );
  }
  if (input.customer.extraInfo?.trim()) {
    details.push(
      `<p>Extra info: ${escapeHtml(input.customer.extraInfo.trim())}</p>`,
    );
  }

  try {
    const event = await createCalendarEvent({
      sellerEmail: chosen.email,
      subject,
      bodyHtml: details.join("\n"),
      date: input.date,
      start: input.start,
      end: input.end,
      locationName: location.name,
      locationAddress: location.address,
    });

    return {
      ok: true,
      data: {
        seller: {
          sellerId: chosen.sellerId,
          name: chosen.name,
          imageUrl: chosen.imageUrl,
        },
        location: {
          id: location.id,
          name: location.name,
          permalink: location.permalink,
          address: location.address,
        },
        category: availability.data.category,
        date: input.date,
        start: input.start,
        end: input.end,
        customerName,
        productName: input.productName?.trim() || null,
        calendarEventId: event.id,
      },
    };
  } catch (error) {
    return {
      ok: false,
      status: 502,
      error:
        error instanceof Error
          ? error.message
          : "Agenda-item aanmaken mislukt",
    };
  }
}
