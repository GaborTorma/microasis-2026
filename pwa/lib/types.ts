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

export type EventKind =
  | "music"
  | "ceremony"
  | "break"
  | "workshop"
  | "sound-bath"
  | "voice"
  | "drum"
  | "yoga"
  | "wind"
  | "dance"
  | "drama"
  | "mind"
  | "build"
  | "handpan";
export type LangAvailability = "both" | "en" | "hu" | null;

export type EventDTO = {
  id: number;
  stageId: number;
  stageSlug: string;
  /** Stable cross-platform event identity (favorites key). */
  slug: string;
  title: I18nText;
  artist: string | null;
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

