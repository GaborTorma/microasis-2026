/**
 * Seed the Manas 2026 schedule + map data into Neon.
 *
 * Data transcribed from the printed PORTAL, FIELD and BOWL timetable posters.
 * Times are festival-local (Europe/Budapest = CEST = UTC+02:00 in July).
 *
 * Run: pnpm db:seed   (idempotent — wipes and re-inserts)
 *
 * NOTE: Field workshop language availability (both/en/hu) is best-effort from
 * the poster colour legend and should be verified. Everything is editable in
 * the DB without redeploying any client.
 */
import { db, schema } from "../lib/db";
import type {
  I18nText,
  EventKind,
  LangAvailability,
} from "../lib/db/schema";

try {
  process.loadEnvFile(".env.local");
} catch {
  /* rely on ambient env */
}

const { stages, events, locationCategories, locations } = schema;

/** Festival-local datetime (CEST). */
const bp = (date: string, time: string) =>
  new Date(`${date}T${time}:00+02:00`);
/** Language-neutral title (artist / act proper noun). */
const t = (s: string): I18nText => ({ en: s, hu: s });

const BREAK: I18nText = { en: "Break", hu: "Szünet" };

type Entry = {
  d: string; // date YYYY-MM-DD (festival-local)
  s: string; // start HH:mm
  e?: string; // explicit end HH:mm (else = next entry's start)
  ed?: string; // explicit end date (for cross-midnight ends)
  title: I18nText;
  kind?: EventKind;
  lang?: LangAvailability;
};

/** Turn an ordered entry list into insert rows. Uses explicit end if given,
 *  otherwise endsAt = next entry's start. */
function withEnds(stageId: number, list: Entry[], lastMinutes = 90) {
  const sorted = [...list].sort(
    (a, b) => bp(a.d, a.s).getTime() - bp(b.d, b.s).getTime(),
  );
  return sorted.map((ev, i) => {
    const startsAt = bp(ev.d, ev.s);
    const next = sorted[i + 1];
    const endsAt = ev.e
      ? bp(ev.ed ?? ev.d, ev.e)
      : next
        ? bp(next.d, next.s)
        : new Date(startsAt.getTime() + lastMinutes * 60_000);
    return {
      stageId,
      title: ev.title,
      startsAt,
      endsAt,
      kind: ev.kind ?? ("music" as EventKind),
      langAvailability: ev.lang ?? null,
    };
  });
}

// ─────────────────────────────────────────────────────────── PORTAL ──
const PORTAL: Entry[] = [
  { d: "2026-07-08", s: "19:00", title: { en: "Portal Opening Ceremony", hu: "Portal Nyitóceremónia" }, kind: "ceremony" },
  { d: "2026-07-08", s: "19:15", title: t("Óperentzia") },
  { d: "2026-07-08", s: "20:45", title: t("Emok") },
  { d: "2026-07-08", s: "22:30", title: t("Danger vs Beyond") },
  { d: "2026-07-09", s: "00:00", title: t("Volcano On Mars") },
  { d: "2026-07-09", s: "02:00", title: t("Mercuroid") },
  { d: "2026-07-09", s: "03:30", title: t("Agmon") },
  { d: "2026-07-09", s: "05:00", title: t("Yury vs Eltawave") },
  { d: "2026-07-09", s: "07:30", title: BREAK, kind: "break" },
  { d: "2026-07-09", s: "14:00", title: t("Bellegance & Fraser") },
  { d: "2026-07-09", s: "15:30", title: t("Sphera") },
  { d: "2026-07-09", s: "17:00", title: t("Liquid Soul") },
  { d: "2026-07-09", s: "19:00", title: t("Pettra") },
  { d: "2026-07-09", s: "20:30", title: t("Antinomy") },
  { d: "2026-07-09", s: "22:00", title: t("X-Noize") },
  { d: "2026-07-09", s: "23:30", title: t("Burn In Noise") },
  { d: "2026-07-10", s: "01:00", title: t("Siloka") },
  { d: "2026-07-10", s: "02:30", title: t("Ingrained Instincts") },
  { d: "2026-07-10", s: "04:00", title: t("Ikoza") },
  { d: "2026-07-10", s: "05:30", title: t("Alphakey") },
  { d: "2026-07-10", s: "07:30", title: BREAK, kind: "break" },
  { d: "2026-07-10", s: "14:00", title: t("Botond") },
  { d: "2026-07-10", s: "15:30", title: t("Protonica") },
  { d: "2026-07-10", s: "17:00", title: t("Ticon") },
  { d: "2026-07-10", s: "18:30", title: t("Ritmo") },
  { d: "2026-07-10", s: "20:00", title: t("Spacenoize") },
  { d: "2026-07-10", s: "22:00", title: t("Outsiders") },
  { d: "2026-07-10", s: "23:30", title: t("Wegha") },
  { d: "2026-07-11", s: "01:00", title: t("Kala") },
  { d: "2026-07-11", s: "02:30", title: t("Yabba Dabba") },
  { d: "2026-07-11", s: "04:00", title: t("Dr Space") },
  { d: "2026-07-11", s: "05:30", title: t("DJ Latam") },
  { d: "2026-07-11", s: "07:30", title: BREAK, kind: "break" },
  { d: "2026-07-11", s: "14:00", title: t("Ori") },
  { d: "2026-07-11", s: "15:30", title: t("Enki") },
  { d: "2026-07-11", s: "17:00", title: t("Rising Dust") },
  { d: "2026-07-11", s: "20:00", title: t("Uncharted Territory") },
  { d: "2026-07-11", s: "21:30", title: t("Faders") },
  { d: "2026-07-11", s: "23:00", title: t("Electric Universe") },
  { d: "2026-07-12", s: "00:30", title: t("Artifex") },
  { d: "2026-07-12", s: "02:00", title: t("Evertwo") },
  { d: "2026-07-12", s: "03:30", title: t("Digicult") },
  { d: "2026-07-12", s: "05:00", title: t("Solitary Shell") },
  { d: "2026-07-12", s: "07:00", title: t("Toge") },
  { d: "2026-07-12", s: "08:30", title: t("Ilija") },
  { d: "2026-07-12", s: "10:00", title: t("Fullip vs Progtamin") },
  { d: "2026-07-12", s: "12:00", title: t("Inner Sphere") },
  { d: "2026-07-12", s: "14:00", title: t("Oleg") },
  { d: "2026-07-12", s: "16:00", e: "18:00", title: t("Dekel") },
];

// ──────────────────────────────────────────────────────────── FIELD ──
// "Leader Name: HU title / EN title" workshops -> both languages present.
const w = (en: string, hu: string): I18nText => ({ en, hu });
const FIELD: Entry[] = [
  // Wed
  { d: "2026-07-08", s: "20:30", title: t("Konkol") },
  { d: "2026-07-08", s: "22:00", title: t("Akasha") },
  { d: "2026-07-08", s: "23:00", title: t("Savaborsa") },
  // Thu
  { d: "2026-07-09", s: "00:30", title: t("Zsager Balázs") },
  { d: "2026-07-09", s: "02:00", title: t("Modul") },
  { d: "2026-07-09", s: "03:00", title: t("Buddhasmile") },
  { d: "2026-07-09", s: "04:30", title: t("Nautis") },
  { d: "2026-07-09", s: "06:00", title: t("Swanasa") },
  { d: "2026-07-09", s: "08:00", title: w("Litauszky Lilla: Dynamic Pilates", "Litauszky Lilla: Dinamikus Pilates"), kind: "workshop", lang: "both" },
  { d: "2026-07-09", s: "10:00", title: w("Mestre Tocha: Capoeira Escola", "Mestre Tocha: Capoeira Escola"), kind: "workshop", lang: "en" },
  { d: "2026-07-09", s: "12:00", title: w("Gebri Bernadett: Singing Circle", "Gebri Bernadett: Énekkör"), kind: "workshop", lang: "both" },
  { d: "2026-07-09", s: "13:00", title: w("Ethnosound: Drum Circle", "Ethnosound: Dobkör"), kind: "workshop", lang: "both" },
  { d: "2026-07-09", s: "14:00", title: t("Takkra") },
  { d: "2026-07-09", s: "15:00", title: t("Cord") },
  { d: "2026-07-09", s: "16:00", title: t("Fodor Réka x Novan") },
  { d: "2026-07-09", s: "17:30", title: t("Dudukia") },
  { d: "2026-07-09", s: "18:30", title: t("Bodoo") },
  { d: "2026-07-09", s: "20:00", title: t("Earth Jam") },
  { d: "2026-07-09", s: "21:30", title: t("Marcel") },
  { d: "2026-07-09", s: "22:30", title: t("Anima In Dub") },
  // Fri
  { d: "2026-07-10", s: "00:00", title: t("Sena") },
  { d: "2026-07-10", s: "01:30", title: t("Once Upon A Time") },
  { d: "2026-07-10", s: "03:00", title: t("The Amygdala") },
  { d: "2026-07-10", s: "04:30", title: t("Fraser x Bellegance") },
  { d: "2026-07-10", s: "06:00", title: t("SABW") },
  { d: "2026-07-10", s: "08:00", title: w("Sipos László: Hatha Yoga accompanied by philosophy", "Sipos László: Hatha Jóga filozófiai kísérővel"), kind: "workshop", lang: "hu" },
  { d: "2026-07-10", s: "10:00", title: w("Grecsó Zoltán: The Art of Touch", "Grecsó Zoltán: Az érintés művészete"), kind: "workshop", lang: "en" },
  { d: "2026-07-10", s: "12:00", title: w("Fodor Réka: Singing Circle", "Fodor Réka: Énekkör"), kind: "workshop", lang: "both" },
  { d: "2026-07-10", s: "13:00", title: w("Ethnosound: Drum Circle", "Ethnosound: Dobkör"), kind: "workshop", lang: "both" },
  { d: "2026-07-10", s: "14:00", title: t("Arulei") },
  { d: "2026-07-10", s: "15:30", title: t("Dizna") },
  { d: "2026-07-10", s: "16:30", title: t("Angorang") },
  { d: "2026-07-10", s: "18:00", title: w("Musica Veneris: Dance House", "Musica Veneris Táncház"), kind: "workshop", lang: "both" },
  { d: "2026-07-10", s: "20:00", title: t("BeshoDrom") },
  { d: "2026-07-10", s: "22:00", title: t("Obadu") },
  { d: "2026-07-10", s: "23:00", title: t("Csángálló") },
  // Sat
  { d: "2026-07-11", s: "00:30", title: t("Suefo x Hunbaba") },
  { d: "2026-07-11", s: "02:00", title: t("Meo Culpa") },
  { d: "2026-07-11", s: "03:30", title: t("Kalumet") },
  { d: "2026-07-11", s: "05:00", title: t("Infest") },
  { d: "2026-07-11", s: "06:00", title: t("Peter Van Minden (Siblicity)") },
  { d: "2026-07-11", s: "08:00", title: w("Lukács Gabi: Meditation", "Lukács Gabi: Meditáció"), kind: "workshop", lang: "hu" },
  { d: "2026-07-11", s: "10:00", title: w("Fáy Viki, Generál Péter: Breath'n Body", "Fáy Viki, Generál Péter: Breath'n Body"), kind: "workshop", lang: "both" },
  { d: "2026-07-11", s: "12:00", title: w("Oláh Annamári: Singing Circle / Ethnosound: Drum Circle", "Oláh Annamári: Énekkör / Ethnosound: Dobkör"), kind: "workshop", lang: "both" },
  { d: "2026-07-11", s: "14:00", title: t("Further") },
  { d: "2026-07-11", s: "15:30", title: t("Gelka") },
  { d: "2026-07-11", s: "16:30", title: t("Zsuja") },
  { d: "2026-07-11", s: "17:30", title: t("Napfonat") },
  { d: "2026-07-11", s: "18:30", title: t("Eff-Ek aka Zakhorov x Fluidum") },
  { d: "2026-07-11", s: "20:00", title: t("Ölvedi Gábor") },
  { d: "2026-07-11", s: "21:30", title: t("Oláh Annamari") },
  { d: "2026-07-11", s: "23:00", title: t("Korai Electric") },
  // Sun
  { d: "2026-07-12", s: "00:30", title: t("Hybrid Drummer") },
  { d: "2026-07-12", s: "01:30", title: t("Dekel In Downtempo") },
  { d: "2026-07-12", s: "03:30", title: t("Mesterhazy") },
  { d: "2026-07-12", s: "04:30", title: t("Ikoza") },
  { d: "2026-07-12", s: "06:00", title: t("Papa x Alagi") },
  { d: "2026-07-12", s: "07:00", title: t("Kezo") },
  { d: "2026-07-12", s: "08:00", title: w("Nagy Györgyi: Dance Meditation", "Nagy Györgyi: Táncmeditáció"), kind: "workshop", lang: "both" },
  { d: "2026-07-12", s: "10:00", title: w("Litauszky Lilla: Dynamic Pilates", "Litauszky Lilla: Dinamikus Pilates"), kind: "workshop", lang: "both" },
  { d: "2026-07-12", s: "12:00", title: w("Gauranga Das, Meszberger Antal: Trance Breathing", "Gauranga Das, Meszberger Antal: Transzlégzés"), kind: "workshop", lang: "both" },
  { d: "2026-07-12", s: "14:00", title: w("Bajnay Beáta: Compás in space (Flamenco)", "Bajnay Beáta: Compás a térben (Flamenco)"), kind: "workshop", lang: "hu" },
  { d: "2026-07-12", s: "16:00", title: w("Grecsó Zoltán: Contemporary Dance Show", "Grecsó Zoltán: Kortárs tánc-showcase"), kind: "workshop", lang: "en" },
];

// ───────────────────────────────────────────────────────────── BOWL ──
// Open-air techno / progressive. Continuous overnight programming; only Wed
// and Thu have a daytime BREAK. Conntex runs 23:30 Thu → 01:30 Fri across
// the printed column boundary (a single set, listed once).
const BOWL: Entry[] = [
  // Wed (Jul 8)
  { d: "2026-07-08", s: "14:00", title: t("Garpo & Li & Laslo") },
  { d: "2026-07-08", s: "18:00", title: BREAK, kind: "break" },
  { d: "2026-07-08", s: "20:30", title: t("Lilos") },
  { d: "2026-07-08", s: "22:30", title: t("Moma") },
  // Thu (Jul 9)
  { d: "2026-07-09", s: "00:00", title: t("Chiodan") },
  { d: "2026-07-09", s: "02:00", title: t("Baco") },
  { d: "2026-07-09", s: "03:30", title: t("ADX B2B D365") },
  { d: "2026-07-09", s: "05:30", title: t("Spy C") },
  { d: "2026-07-09", s: "07:00", title: BREAK, kind: "break" },
  { d: "2026-07-09", s: "14:00", title: t("Marcel") },
  { d: "2026-07-09", s: "16:00", title: t("Révész Bálint") },
  { d: "2026-07-09", s: "17:30", title: t("Peter Bernath") },
  { d: "2026-07-09", s: "19:30", title: t("Bernathy") },
  { d: "2026-07-09", s: "21:30", title: t("Titusz") },
  { d: "2026-07-09", s: "23:30", title: t("Conntex") },
  // Fri (Jul 10)
  { d: "2026-07-10", s: "01:30", title: t("Katamii") },
  { d: "2026-07-10", s: "03:00", title: t("Subotage") },
  { d: "2026-07-10", s: "04:30", title: t("Ruenge") },
  { d: "2026-07-10", s: "06:00", title: t("Kele") },
  { d: "2026-07-10", s: "07:30", title: t("Alllusion") },
  { d: "2026-07-10", s: "09:30", title: t("Bodry") },
  { d: "2026-07-10", s: "11:00", title: t("Further") },
  { d: "2026-07-10", s: "12:00", title: t("Berko") },
  { d: "2026-07-10", s: "14:00", title: t("Szamy") },
  { d: "2026-07-10", s: "16:00", title: t("Acideal (live)") },
  { d: "2026-07-10", s: "18:00", title: t("THNTS") },
  { d: "2026-07-10", s: "20:00", title: t("Zsom") },
  { d: "2026-07-10", s: "22:00", title: t("Sumiruna") },
  // Sat (Jul 11)
  { d: "2026-07-11", s: "00:00", title: t("Kliment") },
  { d: "2026-07-11", s: "02:00", title: t("Szlym B2B Szoliver") },
  { d: "2026-07-11", s: "04:00", title: t("Urklang") },
  { d: "2026-07-11", s: "06:00", title: t("Axeev") },
  { d: "2026-07-11", s: "07:30", title: t("THNTS B2B Mankind") },
  { d: "2026-07-11", s: "12:00", title: t("P.E.P") },
  { d: "2026-07-11", s: "13:30", title: t("Garpo") },
  { d: "2026-07-11", s: "15:00", title: t("Mankind") },
  { d: "2026-07-11", s: "16:30", title: t("Zagi") },
  { d: "2026-07-11", s: "18:00", title: t("Zvezda Beta") },
  { d: "2026-07-11", s: "20:00", title: t("Psyk") },
  { d: "2026-07-11", s: "22:00", title: t("Mary Yuzovskaya") },
  // Sun (Jul 12)
  { d: "2026-07-12", s: "00:00", title: t("Kohra") },
  { d: "2026-07-12", s: "02:00", title: t("Erro") },
  { d: "2026-07-12", s: "04:00", title: t("Tsu B2B Switch Nollie") },
  { d: "2026-07-12", s: "06:00", e: "09:00", title: t("Roland Handrick") },
];

// ────────────────────────────────────────────────────────── TERRACE ──
// Yoga / meditation / movement. All slots have explicit start–end ranges.
// Language: both = EN+HU (yellow), en = purple, hu = turquoise, Ø = grey.
const FEEL_TRILOGY = w(
  "Feel. Let go. Live. – Somatic emotion-releasing trilogy",
  "Érezd. Engedd. Éld. – Szomatikus érzelemfelszabadító trilógia",
);
const PRESENT = w("Present in Yourself", "Jelen önmagadban");
const BODY_SPEAKS = w(
  "The Body Speaks – theatre & movement therapy",
  "A test beszél – színház- és mozgásterápia",
);
const PSY_FLOW = t("Psy Flow Yoga");
const TRANCE_RELAX = t("Trance & Relax");

const TERRACE: Entry[] = [
  // Wed
  { d: "2026-07-08", s: "20:00", e: "22:00", title: TRANCE_RELAX, kind: "workshop", lang: "both" },
  // Thu
  { d: "2026-07-09", s: "10:00", e: "11:30", title: w("Five Animals Chi Kung – energy, vibration, inner balance", "Öt állat chi kung – energia, rezgés, belső egyensúly"), kind: "workshop", lang: "both" },
  { d: "2026-07-09", s: "14:00", e: "15:30", title: FEEL_TRILOGY, kind: "workshop" },
  { d: "2026-07-09", s: "18:00", e: "19:30", title: PRESENT, kind: "workshop", lang: "en" },
  { d: "2026-07-09", s: "20:00", e: "21:30", title: w("Shadow Yoga", "Shadow jóga"), kind: "workshop", lang: "both" },
  // Fri
  { d: "2026-07-10", s: "08:00", e: "09:30", title: w("Tantra Yoga", "Tantra jóga"), kind: "workshop", lang: "both" },
  { d: "2026-07-10", s: "10:00", e: "11:30", title: w("Tai Chi, or the Power of Intention", "Tai chi, avagy a szándék ereje"), kind: "workshop", lang: "both" },
  { d: "2026-07-10", s: "14:00", e: "15:30", title: FEEL_TRILOGY, kind: "workshop" },
  { d: "2026-07-10", s: "16:00", e: "17:30", title: BODY_SPEAKS, kind: "workshop", lang: "en" },
  { d: "2026-07-10", s: "18:00", e: "19:30", title: w("Instinct Play", "Ösztön játék"), kind: "workshop" },
  { d: "2026-07-10", s: "20:00", e: "21:30", title: w("Unity – yoga with two instructors", "Egység – jóga két oktatóval"), kind: "workshop", lang: "hu" },
  { d: "2026-07-10", s: "22:00", e: "00:00", ed: "2026-07-11", title: TRANCE_RELAX, kind: "workshop", lang: "both" },
  // Sat
  { d: "2026-07-11", s: "10:00", e: "11:30", title: w("5 Elements Chi Kung", "5 elem chi kung"), kind: "workshop", lang: "hu" },
  { d: "2026-07-11", s: "12:00", e: "13:30", title: w("Laugh and Love", "Nevess és szeress"), kind: "workshop", lang: "both" },
  { d: "2026-07-11", s: "14:00", e: "15:30", title: FEEL_TRILOGY, kind: "workshop" },
  { d: "2026-07-11", s: "16:00", e: "17:30", title: BODY_SPEAKS, kind: "workshop" },
  { d: "2026-07-11", s: "18:00", e: "19:30", title: w("Hatha Flow Yoga & guided meditation", "Hatha flow jóga és vezetett meditáció"), kind: "workshop", lang: "hu" },
  { d: "2026-07-11", s: "20:00", e: "21:30", title: PSY_FLOW, kind: "workshop" },
  { d: "2026-07-11", s: "22:00", e: "01:00", ed: "2026-07-12", title: w("Lotusshakti Dance Meditation", "Lotusshakti táncmeditáció"), kind: "workshop", lang: "both" },
  // Sun
  { d: "2026-07-12", s: "08:00", e: "09:30", title: w("Hatha Yoga & Pranayama", "Hatha jóga és pránájáma"), kind: "workshop", lang: "hu" },
  { d: "2026-07-12", s: "10:00", e: "11:30", title: PRESENT, kind: "workshop", lang: "en" },
  { d: "2026-07-12", s: "12:00", e: "13:30", title: w("Functional Movement Basics – fascia focus", "Funkcionális mozgásalapok – fascia fókusz"), kind: "workshop", lang: "hu" },
  { d: "2026-07-12", s: "14:00", e: "15:30", title: PSY_FLOW, kind: "workshop" },
  { d: "2026-07-12", s: "16:00", e: "18:30", title: w("Conscious Presence", "Tudatos jelenlét"), kind: "workshop", lang: "both" },
];

// ────────────────────────────────────────────────────────── MANDALA ──
// Sound baths & ceremonies. Most are language-neutral (Ø). Explicit ranges.
const SOUNDS_SPIRIT = w("Sounds & Spirit Sound Baths", "Sounds & Spirit Hangfürdők");
const SOUND_BATH = w("Sound Bath", "Hangfürdő");
const NIGHT_GONG = w("Nighttime Gong Sound Bath in the Mandala", "Éjszakai gongos hangfürdő a Mandalában");
const VIBRATING_FIELD = w("Vibrating Force Field – cleansing sound journey", "Rezgő erőtér – tisztító hangutazás");
const SOUND_SCULPTURE = w("Organic Sound Sculpture Building: Kardoslaci & friends", "Organikus hangszobor építés: Kardoslaci és barátai");
const SOUND_WIZARDS = w("Sound Wizards – Tales of the Dragon and the Phoenix", "Hangvarázslók – Sárkány és Főnix meséi hangvarázslat");

const MANDALA: Entry[] = [
  // Wed
  { d: "2026-07-08", s: "17:30", e: "18:30", title: w("Sacral Eclectic Hybrid Sound Bath", "Sacral Eklektik Hibrid Hangfürdő"), kind: "workshop" },
  { d: "2026-07-08", s: "18:30", e: "19:00", title: w("Mandala sand-painting opening ceremony", "Mandala homokszórás nyitó szertartás"), kind: "workshop", lang: "both" },
  { d: "2026-07-08", s: "20:00", e: "21:30", title: SOUNDS_SPIRIT, kind: "workshop" },
  // Thu
  { d: "2026-07-09", s: "12:00", e: "13:30", title: SOUND_BATH, kind: "workshop" },
  { d: "2026-07-09", s: "16:00", e: "17:30", title: SOUND_SCULPTURE, kind: "workshop" },
  { d: "2026-07-09", s: "18:00", e: "19:30", title: SOUND_WIZARDS, kind: "workshop", lang: "hu" },
  { d: "2026-07-09", s: "20:00", e: "21:30", title: SOUNDS_SPIRIT, kind: "workshop" },
  // Fri
  { d: "2026-07-10", s: "00:00", e: "01:30", title: NIGHT_GONG, kind: "workshop" },
  { d: "2026-07-10", s: "04:00", e: "05:30", title: VIBRATING_FIELD, kind: "workshop" },
  { d: "2026-07-10", s: "12:00", e: "13:30", title: SOUND_BATH, kind: "workshop" },
  { d: "2026-07-10", s: "16:00", e: "17:30", title: SOUND_SCULPTURE, kind: "workshop" },
  { d: "2026-07-10", s: "18:00", e: "19:30", title: SOUND_WIZARDS, kind: "workshop", lang: "hu" },
  { d: "2026-07-10", s: "20:00", e: "21:30", title: SOUNDS_SPIRIT, kind: "workshop" },
  // Sat
  { d: "2026-07-11", s: "00:00", e: "01:30", title: NIGHT_GONG, kind: "workshop" },
  { d: "2026-07-11", s: "04:00", e: "05:30", title: VIBRATING_FIELD, kind: "workshop" },
  { d: "2026-07-11", s: "12:00", e: "13:30", title: SOUND_BATH, kind: "workshop" },
  { d: "2026-07-11", s: "16:00", e: "17:30", title: SOUND_SCULPTURE, kind: "workshop" },
  { d: "2026-07-11", s: "18:00", e: "19:30", title: w("Journey on the branches of the World Tree – shamanic drum soul journey", "Utazás a Világfa ágain – sámándobos lélekutazás felvezetéssel"), kind: "workshop", lang: "hu" },
  { d: "2026-07-11", s: "20:00", e: "21:30", title: SOUNDS_SPIRIT, kind: "workshop" },
  // Sun
  { d: "2026-07-12", s: "00:00", e: "01:30", title: NIGHT_GONG, kind: "workshop" },
  { d: "2026-07-12", s: "04:00", e: "05:30", title: VIBRATING_FIELD, kind: "workshop" },
  { d: "2026-07-12", s: "12:00", e: "13:30", title: SOUND_BATH, kind: "workshop" },
  { d: "2026-07-12", s: "16:00", e: "17:30", title: SOUND_SCULPTURE, kind: "workshop" },
  { d: "2026-07-12", s: "18:00", e: "19:00", title: w("Mandala sand-mandala dissolution ceremony", "Mandala homokmandala elmúlás szertartása"), kind: "workshop", lang: "both" },
];

// ───────────────────────────────────────────── MAP LOCATION CATEGORIES ──
type Cat = {
  slug: string;
  name: I18nText;
  group: "facility" | "integration" | "stage" | "area";
  icon: string;
  color: string;
};
const CATEGORIES: Cat[] = [
  // Facilities
  { slug: "stage", name: { en: "Stage", hu: "Színpad" }, group: "stage", icon: "music", color: "#e8a04c" },
  { slug: "art-gallery", name: { en: "Art Gallery", hu: "Galéria" }, group: "facility", icon: "image", color: "#c98a5e" },
  { slug: "bar", name: { en: "Bar", hu: "Bár" }, group: "facility", icon: "wine", color: "#b5532f" },
  { slug: "camping-car", name: { en: "Camping – Car and Caravan", hu: "Autós és Lakóautó Kemping" }, group: "area", icon: "caravan", color: "#9aa857" },
  { slug: "camping-pedestrian", name: { en: "Camping – Pedestrian", hu: "Gyalogos Kemping" }, group: "area", icon: "tent", color: "#7f9c64" },
  { slug: "charging", name: { en: "Charging Station", hu: "Töltőállomás" }, group: "facility", icon: "battery-charging", color: "#d8c4a0" },
  { slug: "kitchen", name: { en: "Community Kitchen", hu: "Közösségi Konyha" }, group: "facility", icon: "cooking-pot", color: "#c98a5e" },
  { slug: "water", name: { en: "Drinking Water", hu: "Ivóvíz" }, group: "facility", icon: "droplet", color: "#5b8aa6" },
  { slug: "jugglers-beach", name: { en: "Jugglers Beach", hu: "Zsonglőr Part" }, group: "facility", icon: "palmtree", color: "#5b8aa6" },
  { slug: "first-aid", name: { en: "First Aid Tent", hu: "Elsősegély" }, group: "facility", icon: "cross", color: "#cc4444" },
  { slug: "food", name: { en: "Food Court", hu: "Étkezés" }, group: "facility", icon: "utensils", color: "#c98a5e" },
  { slug: "tipi-forest", name: { en: "Forest Tipi Camp", hu: "Erdei Tipi Camp" }, group: "area", icon: "tent-tree", color: "#5f7e44" },
  { slug: "tipi-main", name: { en: "Main Tipi Camp", hu: "Fő Tipi Camp" }, group: "area", icon: "tent-tree", color: "#5f7e44" },
  { slug: "info", name: { en: "Info Booth", hu: "Info Pult" }, group: "facility", icon: "info", color: "#5b8aa6" },
  { slug: "market", name: { en: "Market and Creative Hub", hu: "Árusok és Alkotótér" }, group: "facility", icon: "shopping-bag", color: "#c98a5e" },
  { slug: "parking", name: { en: "Parking", hu: "Parkolás" }, group: "area", icon: "square-parking", color: "#8c8160" },
  { slug: "security", name: { en: "Security Center", hu: "Biztonsági Szolgálat Központ" }, group: "facility", icon: "shield", color: "#9a8d77" },
  { slug: "showers", name: { en: "Showers", hu: "Zuhanyzó" }, group: "facility", icon: "shower-head", color: "#5b8aa6" },
  { slug: "storage", name: { en: "Storage", hu: "Értékmegőrző" }, group: "facility", icon: "package", color: "#9a8d77" },
  { slug: "toilet", name: { en: "Toilet / WC", hu: "WC" }, group: "facility", icon: "toilet", color: "#9a8d77" },
  { slug: "entrance", name: { en: "Entrance", hu: "Bejárat" }, group: "facility", icon: "log-in", color: "#cc4444" },
  // Integration spaces
  { slug: "workshop-kiosk", name: { en: "Workshop Registration Kiosk", hu: "Workshop regisztrációs Kiosk" }, group: "integration", icon: "clipboard-list", color: "#a06fb0" },
  { slug: "meeting-point", name: { en: "Meeting Point", hu: "Gyülekező pont" }, group: "integration", icon: "users", color: "#a06fb0" },
  { slug: "sound-bath", name: { en: "Sound Bath", hu: "Hangfürdő" }, group: "integration", icon: "audio-lines", color: "#a06fb0" },
  { slug: "mind-space", name: { en: "Mind Space", hu: "Tudattér" }, group: "integration", icon: "brain", color: "#a06fb0" },
  { slug: "kids-corner", name: { en: "Kids' Corner", hu: "Gyerek Sarok" }, group: "integration", icon: "baby", color: "#a06fb0" },
  { slug: "library", name: { en: "Library", hu: "Könyvtár" }, group: "integration", icon: "book-open", color: "#a06fb0" },
  { slug: "relax", name: { en: "Relax Space", hu: "Relax Tér" }, group: "integration", icon: "armchair", color: "#a06fb0" },
  { slug: "integration", name: { en: "Integration Space", hu: "Integrációs Helyszín" }, group: "integration", icon: "sparkles", color: "#a06fb0" },
  // Areas
  { slug: "swale", name: { en: "Swale", hu: "Övárok" }, group: "area", icon: "waves", color: "#3a3a2a" },
  { slug: "soil-regen", name: { en: "Soil Regeneration Area", hu: "Talajregenerációs Terület" }, group: "area", icon: "sprout", color: "#7a6a4a" },
  { slug: "forest", name: { en: "Forest", hu: "Erdő" }, group: "area", icon: "trees", color: "#3f5e3a" },
  { slug: "lake", name: { en: "Lake", hu: "Tó" }, group: "area", icon: "waves", color: "#3a6a8a" },
];

// ─────────────────────────────────────────── MAP LOCATIONS (schematic) ──
// Coordinates are in the map SVG's viewBox space (see lib/mapConfig.ts:
// MAP_W x MAP_H = 1000 x 1300). Placement is schematic, matching the
// uploaded site map's rough layout; fully editable in the DB.
type Loc = {
  cat: string;
  x: number;
  y: number;
  name?: I18nText;
  refCode?: string;
  reg?: boolean;
};
const L = (
  cat: string,
  x: number,
  y: number,
  name?: I18nText,
  refCode?: string,
  reg?: boolean,
): Loc => ({ cat, x, y, name, refCode, reg });

// Coordinates are in the GPS-calibrated projected space (lib/mapConfig.ts).
// Parking / camping / tipi camps are drawn as coloured AREAS in MapBaseArt, so
// they are NOT point markers here.
const LOCATIONS: Loc[] = [
  // Stages (Mandala = exact GPS; others read from the reference map)
  L("stage", 580, 755, { en: "Portal", hu: "Portal" }),
  L("stage", 355, 235, { en: "Field", hu: "Field" }),
  L("stage", 525, 175, { en: "Bowl", hu: "Bowl" }),
  L("stage", 700, 575, { en: "Terrace", hu: "Terasz" }),
  L("stage", 286, 504, { en: "Mandala", hu: "Mandala" }),
  // Entrances
  L("entrance", 146, 904, { en: "Pedestrian Entrance", hu: "Gyalogos bejárat" }),
  L("entrance", 800, 1255, { en: "Car Entrance", hu: "Autós bejárat" }),
  // Core facilities (arc north & NW of the lake, on land S of Main Tipi Camp)
  L("charging", 415, 500),
  L("storage", 452, 506),
  L("info", 430, 545),
  L("market", 385, 552),
  L("food", 472, 548),
  L("first-aid", 515, 545),
  L("kitchen", 360, 580),
  L("art-gallery", 398, 585),
  L("security", 448, 585),
  L("bar", 400, 625),
  L("bar", 628, 628),
  L("jugglers-beach", 648, 730),
  // Water / toilets / showers (spread around the grounds)
  L("water", 430, 468),
  L("water", 660, 660),
  L("water", 470, 880),
  L("toilet", 350, 545),
  L("toilet", 640, 555),
  L("toilet", 560, 870),
  L("toilet", 718, 690),
  L("showers", 345, 505),
  L("showers", 690, 720),
  // Integration spaces (icon-based, north of the lake)
  L("workshop-kiosk", 548, 545),
  L("meeting-point", 505, 578),
  L("sound-bath", 530, 562),
  L("mind-space", 560, 580),
  L("kids-corner", 522, 605),
  L("library", 490, 615),
  L("relax", 552, 608),
  // Integration spaces (numbered; 1–6 require registration) — W shore strip
  L("integration", 408, 648, { en: "12 Sided", hu: "12 Szög" }, "1", true),
  L("integration", 448, 648, { en: "Straw Bale", hu: "Szalmabála" }, "2", true),
  L("integration", 408, 672, { en: "The Yurt", hu: "A Jurta" }, "3", true),
  L("integration", 448, 672, { en: "Turquoise Pagoda", hu: "Türkíz Pagoda" }, "4", true),
  L("integration", 408, 696, { en: "Beige Pagoda", hu: "Bézs Pagoda" }, "5", true),
  L("integration", 448, 696, { en: "The Little One", hu: "A Kicsi" }, "6", true),
  L("integration", 408, 720, { en: "Massage Row", hu: "Masszázs Sor" }, "7"),
  L("integration", 448, 720, { en: "Body Rocking", hu: "Ringatás" }, "8"),
  L("integration", 408, 744, { en: "Body Sculpting", hu: "Testszobrászat" }, "9"),
  L("integration", 448, 744, { en: "Sauna", hu: "Szauna" }, "10"),
  L("integration", 420, 766, { en: "Labyrinth", hu: "Labirintus" }, "11"),
  L("integration", 458, 766, { en: "Grove", hu: "Fűzkupola" }, "12"),
];

async function main() {
  console.log("Wiping existing rows…");
  await db.delete(events);
  await db.delete(locations);
  await db.delete(stages);
  await db.delete(locationCategories);

  console.log("Inserting stages…");
  const [portal, field, bowl, terrace, mandala] = await db
    .insert(stages)
    .values([
      {
        slug: "portal",
        name: "Portal",
        subtitle: { en: "Main psytrance stage", hu: "Fő psytrance színpad" },
        color: "#7a2e2e",
        accent: "#e8a04c",
        sortOrder: 0,
        isDefault: true,
        lat: 46.673682383648455,
        lng: 17.66211333408678,
        radiusM: 150,
      },
      {
        slug: "field",
        name: "Field",
        subtitle: { en: "Live, acoustic & workshops", hu: "Live, akusztikus & workshopok" },
        color: "#1f4a47",
        accent: "#4fb3a6",
        sortOrder: 1,
        lat: 46.676117401484305,
        lng: 17.658342620761708,
        radiusM: 150,
      },
      {
        slug: "bowl",
        name: "Bowl",
        subtitle: { en: "Open-air techno", hu: "Szabadtéri techno" },
        color: "#5a3a1f",
        accent: "#d98c3a",
        sortOrder: 2,
        lat: 46.676109554244164,
        lng: 17.661461486061544,
        radiusM: 150,
      },
      {
        slug: "terrace",
        name: "Terrace",
        subtitle: { en: "Yoga & meditation", hu: "Jóga & meditáció" },
        color: "#46603a",
        accent: "#93c06a",
        sortOrder: 3,
        lat: 46.674407488023085,
        lng: 17.661415611588946,
        radiusM: 150,
      },
      {
        slug: "mandala",
        name: "Mandala",
        subtitle: { en: "Sound baths & ceremonies", hu: "Hangfürdők & ceremóniák" },
        color: "#4a3a6b",
        accent: "#b79be0",
        sortOrder: 4,
        lat: 46.67379233364376,
        lng: 17.65907946930414,
        radiusM: 150,
      },
    ])
    .returning();

  console.log("Inserting events…");
  await db.insert(events).values([
    ...withEnds(portal.id, PORTAL),
    ...withEnds(field.id, FIELD),
    ...withEnds(bowl.id, BOWL),
    ...withEnds(terrace.id, TERRACE),
    ...withEnds(mandala.id, MANDALA),
  ]);

  console.log("Inserting location categories…");
  const catRows = await db
    .insert(locationCategories)
    .values(
      CATEGORIES.map((c, i) => ({
        slug: c.slug,
        name: c.name,
        group: c.group,
        icon: c.icon,
        color: c.color,
        sortOrder: i,
      })),
    )
    .returning();
  const catId = new Map(catRows.map((c) => [c.slug, c.id]));

  console.log("Inserting locations…");
  await db.insert(locations).values(
    LOCATIONS.map((l, i) => {
      const categoryId = catId.get(l.cat);
      if (!categoryId) throw new Error(`Unknown category slug: ${l.cat}`);
      return {
        categoryId,
        name: l.name ?? null,
        svgX: l.x,
        svgY: l.y,
        refCode: l.refCode ?? null,
        requiresRegistration: l.reg ?? false,
        sortOrder: i,
      };
    }),
  );

  const counts = {
    stages: 5,
    portalEvents: PORTAL.length,
    fieldEvents: FIELD.length,
    bowlEvents: BOWL.length,
    terraceEvents: TERRACE.length,
    mandalaEvents: MANDALA.length,
    categories: CATEGORIES.length,
    locations: LOCATIONS.length,
  };
  console.log("Seed complete:", counts);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
