export type I18nText = { en: string; hu: string };

export type StageDTO = {
  id: number;
  slug: string;
  name: string;
  subtitle: I18nText | null;
  color: string;
  accent: string;
  sortOrder: number;
  isDefault: boolean;
  lat: number | null;
  lng: number | null;
  radiusM: number | null;
};

export type EventKind = "music" | "ceremony" | "break" | "workshop";
export type LangAvailability = "both" | "en" | "hu" | null;

export type EventDTO = {
  id: number;
  stageId: number;
  stageSlug: string;
  title: I18nText;
  startsAt: string;
  endsAt: string | null;
  kind: EventKind;
  langAvailability: LangAvailability;
  day: string;
};

export type FestivalDTO = {
  name: string;
  fullName: string;
  unofficialNote: I18nText;
  location: I18nText;
  timezone: string;
  startsAt: string;
  endsAt: string;
  website: string;
};

export type ScheduleData = {
  festival: FestivalDTO;
  stages: StageDTO[];
  days: string[];
  events: EventDTO[];
};

export type CategoryGroup = "facility" | "integration" | "stage" | "area";

export type CategoryDTO = {
  id: number;
  slug: string;
  name: I18nText;
  group: CategoryGroup;
  icon: string | null;
  color: string;
  sortOrder: number;
};

export type LocationDTO = {
  id: number;
  categoryId: number;
  categorySlug: string;
  name: I18nText | null;
  x: number;
  y: number;
  lat: number | null;
  lng: number | null;
  refCode: string | null;
  requiresRegistration: boolean;
  description: I18nText | null;
};

export type LocationsData = {
  categories: CategoryDTO[];
  locations: LocationDTO[];
};
