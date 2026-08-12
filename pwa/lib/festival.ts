/** Static festival metadata shared by every client (countdown, headers, etc.). */
export const FESTIVAL = {
  name: "MicrOasis 2026",
  fullName: "MicrOasis 2026",
  unofficialNote: { en: "Unofficial guide", hu: "Nem hivatalos app" },
  location: { en: "Lengyeltóti, Hungary", hu: "Lengyeltóti, Magyarország" },
  timezone: "Europe/Budapest",
  startsAt: "2026-08-20T12:00:00+02:00",
  endsAt: "2026-08-24T12:00:00+02:00",
  website: "https://microasis.eu",
} as const;
