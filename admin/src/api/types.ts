export type Role = "SUPER_ADMIN" | "ENTITY_ADMIN";

export type EntitySummary = {
  id: string;
  name: string;
  slug: string;
  active?: boolean;
};

export type Entity = EntitySummary & {
  active: boolean;
  createdAt?: string;
  updatedAt?: string;
  _count?: { users: number };
  users?: User[];
};

export type User = {
  id: string;
  email: string;
  role: Role;
  entityId: string | null;
  createdAt?: string;
  entity?: EntitySummary | null;
};

export type AuthUser = {
  id: string;
  email: string;
  role: Role;
  entityId: string | null;
  entity?: EntitySummary | null;
};

export type ProductSetItem = {
  id?: string;
  name: string;
  photoUrl: string;
  sortOrder?: number;
};

export type ProductSet = {
  id: string;
  name: string;
  products: ProductSetItem[];
  createdAt?: string;
  updatedAt?: string;
};

export type Weekday =
  | "MONDAY"
  | "TUESDAY"
  | "WEDNESDAY"
  | "THURSDAY"
  | "FRIDAY"
  | "SATURDAY"
  | "SUNDAY";

export type Location = {
  id: string;
  name: string;
  imageUrl: string | null;
  address: string;
  googleMapsUrl: string;
  phone: string;
  email: string;
  permalink: string;
  entityId: string;
  entity?: EntitySummary | null;
};

export type SellerSchedule = {
  id?: string;
  weekday: Weekday;
  startTime: string;
  endTime: string;
  locationId: string;
  location?: { id: string; name: string; permalink?: string } | null;
};

export type Seller = {
  id: string;
  name: string;
  email: string;
  imageUrl: string;
  active: boolean;
  entityId: string;
  entity?: EntitySummary | null;
  schedules: SellerSchedule[];
};

export type FlowStepType =
  | "FREE_CHOICE"
  | "PRODUCT_SET"
  | "LOCATIONS"
  | "SELLERS_AGENDA";

export type FreeChoiceOption = {
  name: string;
  slug: string;
  imageUrl?: string | null;
};

export type FlowStep =
  | {
      id?: string;
      type: "FREE_CHOICE";
      config: { options: FreeChoiceOption[] };
    }
  | {
      id?: string;
      type: "PRODUCT_SET";
      config: { productSetId: string };
    }
  | {
      id?: string;
      type: "LOCATIONS";
      config: { locationIds: string[]; showImage: boolean };
    }
  | {
      id?: string;
      type: "SELLERS_AGENDA";
      config: Record<string, never>;
    };

export type Flow = {
  id: string;
  name: string;
  slug: string;
  featuredImage: string | null;
  active: boolean;
  entityId: string;
  entity?: EntitySummary | null;
  steps?: FlowStep[];
  _count?: { steps: number };
  updatedAt?: string;
  createdAt?: string;
};
