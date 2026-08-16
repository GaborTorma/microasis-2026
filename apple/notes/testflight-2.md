<!--
TestFlight "What to Test" for build 2, as sent. Feed it to the API with:

    uv run scripts/asc_testflight.py notes/testflight-2.md

Each `## <locale>` heading starts a section; the locales must match the build's
own betaBuildLocalizations (`hu`, `en-US`). Keep the text about what a tester
should look at, not about the implementation.
-->

## hu

Yoga Terrace + Wadi-frissítés.

ÚJ
• Yoga Terrace: megjött a programja — 17 foglalkozás pénteken, szombaton és vasárnap. A színpad mostantól alapból látszik.
• Wadi: a csütörtök 21:30 és a szombat 22:30 fellépője helyet cserélt (Maron / Route 8), a friss plakát szerint.

JAVÍTÁS
• Az időrend fejléce néha nem azt a színpadot nevezte meg, amelyik alatta látszott — jellemzően akkor, ha a hozzád legközelebbi színpad a lista végén volt.
• A fejlécben már csak „MicrOasis" áll, hogy a név ne vágódjon le a zoom-gombok mellett.

AMIT ÉRDEMES NÉZNI
• Időrend, szombat délután: a Yoga Terrace oszlopban jóga- és workshop-ikonok, tanárnevekkel.
• Ha korábban elrejtetted a Yoga Terrace-t, ez a build egyszer visszakapcsolja — amit te magad rejtettél el, az rejtve marad.
• Beállítások → Teszt hely: a fejléc mindig azt a színpadot nevezze meg, amelyik alatta látszik.

## en-US

Yoga Terrace + Wadi update.

NEW
• Yoga Terrace: its programme is out — 17 sessions across Friday, Saturday and Sunday. The stage is now visible by default.
• Wadi: Thursday 21:30 and Saturday 22:30 swapped acts (Maron / Route 8), matching the updated poster.

FIXED
• The timetable header sometimes named a different stage than the column below it — typically when the stage nearest you sat at the end of the list.
• The header wordmark is now just "MicrOasis", so the name no longer gets clipped next to the zoom controls.

WORTH A LOOK
• Timetable, Saturday afternoon: the Yoga Terrace column with yoga and workshop icons, and the teachers' names.
• If you had hidden the Yoga Terrace before, this build un-hides it once — stages you hid yourself stay hidden.
• Settings → Test location: the header should always name the stage shown below it.
