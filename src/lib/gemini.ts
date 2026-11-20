import type { QuizAnswers, DestinationRecommendation, FlightDetails, TripPlan, DayPlan } from "@/types";
import { budgetPromptLabel, STYLE_LABELS, VIBE_LABELS, PLACE_LABELS } from "@/lib/constants";
import { groupLabel, groupSize } from "@/lib/group";
import { calcTripSchedule, formatScheduleForPrompt } from "@/lib/tripSchedule";
import { dayLabel, resolveTripTerm, termDays, tripTermPrompt } from "@/lib/tripTerm";
import { isGroundMode, originCityName, planTransport, planTravel, travelBudgetText, travelCopy, travelDuration } from "@/lib/transport";
import type { GroundTransport } from "@/types";

// Dojazd lądowy w prompcie planu: środek, szacunek drogi i zasady dla pierwszego i ostatniego dnia.
function groundGuide(mode: GroundTransport): string {
  switch (mode) {
    case "auto":
      return "Własny samochód: wskaż, gdzie zaparkować (parking przy noclegu albo konkretny parking, strefa płatna), dolicz parking do kosztów na miejscu i zaznacz, które atrakcje są osiągalne bez auta. Noclegi z parkingiem lub blisko niego.";
    case "pociag_bus":
      return "Pociąg lub bus, bez auta: podaj, jak dojść z dworca lub przystanku do noclegu i pierwszych atrakcji. Plan oparty na spacerach i komunikacji miejskiej, noclegi blisko dworca lub centrum.";
    case "rower":
      return "Rower: układaj dni jako trasy rowerowe (nazwy szlaków i odcinków, orientacyjne kilometry, nie więcej niż ok. 6 h jazdy dziennie). Noclegi przyjazne rowerzystom (przechowalnia lub zamknięte miejsce na rower). Nie zakładaj, że rower można zostawić bez zabezpieczenia.";
  }
}

export function buildPlanPrompt(
  destination: DestinationRecommendation,
  quiz: QuizAnswers,
  flightDetails?: FlightDetails | null
): string {
  const stylesList = quiz.styles.map((s) => STYLE_LABELS[s] ?? s).join(", ") || "brak preferencji";
  const mode = planTransport(quiz);
  const groundMode = isGroundMode(mode) ? mode : null;
  const budgetLabel = budgetPromptLabel(quiz.budget, groundMode ? "dojazdem" : "lotem");
  const vibeLabel = quiz.vibe ? VIBE_LABELS[quiz.vibe] : null;
  const placeLabel = quiz.placeType ? PLACE_LABELS[quiz.placeType] : null;
  // Liczba dni i daty z jednego miejsca: zakres dat bije `quiz.duration` (patrz tripTerm.ts).
  const term = resolveTripTerm(quiz, flightDetails);
  if (!term.ok) throw new Error(term.error);
  const duration = term.duration;
  const termPrompt = tripTermPrompt(term, groundMode ? "przyjazdu" : "przylotu");
  const day1Label = dayLabel(1, termDays(term)[0]?.date ?? null);

  const vibeInstruction = vibeLabel ? `- Energia wyjazdu: ${vibeLabel}` : "";
  const placeInstruction = placeLabel ? `- Preferowany typ miejsca: ${placeLabel}` : "";

  const companionLabel = quiz.companion === "solo"    ? "solo (samotny podróżnik)"
    : quiz.companion === "couple"  ? "para"
    : quiz.companion === "family"  ? "rodzina z dziećmi"
    : quiz.companion === "friends" ? "grupa znajomych"
    : "solo (samotny podróżnik)";

  const companionGuide = quiz.companion === "couple"
    ? "Para — wieczory w romantycznych restauracjach przy świecach, wspólne aktywności, prywatne noclegi."
    : quiz.companion === "family"
    ? "Rodzina z dziećmi — wolniejsze tempo, family-friendly atrakcje (parki, interaktywne muzea), bezpieczne dzielnice, wczesne kolacje."
    : quiz.companion === "friends"
    ? "Grupa znajomych — aktywności grupowe, wieczorne wyjścia, bary i imprezy, podział kosztów noclegów."
    : "Solo — wskazówki bezpieczeństwa, miejsca do poznania innych podróżnych (hostelowe bary, free tours, food markety).";

  // Skład grupy liczy się tylko dla znajomych i rodziny z jawnie podaną grupą.
  const hasGroup = (quiz.companion === "friends" || quiz.companion === "family") && !!quiz.group;
  const groupProfile = hasGroup && quiz.group ? `\n- Skład grupy: ${groupLabel(quiz.group)}` : "";
  const seatsNote = hasGroup && quiz.group
    ? `\nKoszty licz na jedno z ${groupSize(quiz.group)} miejsc (niemowlęta poniżej 2 lat się nie liczą).`
    : "";
  const groupGuide = !hasGroup ? ""
    : quiz.companion === "family"
    ? "\nGRUPA: wszystkie koszty podawaj za osobę. Nocleg to udział jednej osoby w realnej opcji dla tej rodziny (np. apartament rodzinny podzielony na wszystkie osoby). Wskaż, gdzie liczba osób zmienia rachunek: taksówka z lotniska zamiast kilku biletów komunikacji, apartament zamiast pokoi w hostelu, bilety rodzinne i grupowe, darmowe wejścia dla dzieci, rezerwacja stolika dla większej grupy."
    : "\nGRUPA: wszystkie koszty podawaj za osobę. Nocleg to udział jednej osoby w realnej opcji dla tej grupy (np. apartament dla czterech podzielony na czterech). Wskaż, gdzie liczba osób zmienia rachunek: taksówka z lotniska zamiast kilku biletów komunikacji, apartament zamiast łóżek w hostelu, bilety grupowe, rezerwacja stolika dla dużej grupy.";

  const vibeGuide = quiz.vibe === "chill"
    ? "Spokojne tempo — ranki na kawie, popołudnia na spacerach, wieczory w lokalnych barach. Bez pośpiechu."
    : quiz.vibe === "intense"
    ? "Zapakuj każdy pełny dzień po brzegi — dużo atrakcji, mało przerw, maksymalne wykorzystanie czasu."
    : quiz.vibe === "social"
    ? "Uwzględnij miejsca gdzie łatwo poznać ludzi — hostelowe bary, wspólne wycieczki, food markety, wieczorne bary."
    : quiz.vibe === "active"
    ? "Uwzględnij aktywności fizyczne — piesze trasy, rowery miejskie, pływanie, sport. Mniej muzeów, więcej ruchu."
    : "Zbalansowane tempo — mix atrakcji i odpoczynku.";

  const details = term.flightDetails;
  // Samolot (także brak wyboru) zostaje dokładnie tak jak przed pytaniem o transport.
  const travel = groundMode ? planTravel(quiz, destination.city) : null;
  const schedule = calcTripSchedule(duration, details, groundMode ? { mode: groundMode, hours: travel?.hours ?? null } : null);
  const schedulePrompt = formatScheduleForPrompt(schedule);
  const origin = groundMode ? originCityName(quiz.airports) : null;

  const groundNote = groundMode
    ? `ŚRODEK TRANSPORTU: ${groundMode === "auto" ? "własny samochód" : groundMode === "rower" ? "rower" : "pociąg lub bus"}${origin ? `, start: ${origin}` : ""}. ${
        travel
          ? `Droga w jedną stronę: ok. ${travel.distanceKm} km, ${travelDuration(travel)} (szacunek z odległości${travelCopy(travel).cost ? `, ${travelCopy(travel).cost}` : ""}).`
          : "Czas i koszt drogi nieznane: nie zgaduj ich, plan musi być elastyczny."
      } ${details
        ? `DANE DOJAZDU: przyjazd ${details.arrivalDate}${details.arrivalTime ? ` o ${details.arrivalTime} (czas lokalny)` : ""}, wyjazd powrotny ${details.returnDate}${details.returnTime ? ` o ${details.returnTime}` : ""}. ${
            details.arrivalTime && details.returnTime ? "Plan MUSI uwzględniać te godziny." : "Brakujących godzin nie zgaduj: plan musi być elastyczny."
          }`
        : "Godziny przyjazdu i wyjazdu nieznane: użytkownik jedzie na własną rękę, plan musi być elastyczny."
      }${travel?.days && travel.days > 1 ? ` Dojazd rowerem to ${travel.days} dni jazdy w jedną stronę: pierwszy i ostatni dzień planu poświęć głównie drodze.` : ""}`
    : "";

  const flightNote = groundMode ? groundNote : details
    ? `DANE LOTU: przylot ${details.arrivalDate}${details.arrivalTime ? ` o ${details.arrivalTime} (czas lokalny)` : ""}, powrót ${details.returnDate}${details.returnTime ? ` wylot o ${details.returnTime}` : ""}. ${
        details.arrivalTime && details.returnTime
          ? "Plan MUSI uwzględniać te godziny."
          : "Brakujących godzin lotu nie zgaduj: plan musi być elastyczny."
      }`
    : `UWAGA: Dokładne godziny lotu nieznane — użytkownik rezerwuje samodzielnie. Plan musi być elastyczny.`;

  return `Jesteś ekspertem od podróży. Stwórz szczegółowy plan podróży do ${destination.city}, ${destination.country}.

${flightNote}

${termPrompt}

PROFIL PODRÓŻNIKA:
- Kto podróżuje: ${companionLabel}${groupProfile}
- Budżet: ${budgetLabel}
- Zainteresowania: ${stylesList}
${vibeInstruction}
${placeInstruction}
${groundMode
    ? `- Dojazd na miejsce jest liczony osobno jako szacunek. Nie wliczaj go do totalBudgetEstimate: tylko nocleg, jedzenie, atrakcje i transport na miejscu. ${groundGuide(groundMode)}`
    : "- Cena lotu jest NIEZNANA (użytkownik sprawdzi ją sam w wyszukiwarce). Nie zgaduj jej i policz totalBudgetEstimate BEZ lotów: tylko nocleg, jedzenie, atrakcje i transport na miejscu."}

INSTRUKCJE DLA KAŻDEGO DNIA (${duration} dni łącznie):

${schedulePrompt}

STYL PLANOWANIA:
${vibeGuide}
${companionGuide}${groupGuide}${seatsNote}

ZASADY DLA WSZYSTKICH DNI — BEZWZGLĘDNIE OBOWIĄZUJĄCE:
1. KONKRETNE NAZWY: ZAWSZE podawaj pełną, prawdziwą nazwę miejsca. NIE "lokalne muzeum" — tylko "Muzeum Archeologiczne im. X" albo "Narodowe Muzeum Sztuki Nowoczesnej". NIE "dobra restauracja" — tylko "Restauracja Azahar" albo "Bar El Nacional przy Passeig de Gràcia". NIE "spacer po centrum" — tylko "Spacer po Dzielnicy Gotyckiej: ulica Carrer del Bisbe i Plac Sant Jaume".
2. Tanie miejsca do jedzenia — konkretne miejsca z adresem lub dzielnicą
3. Darmowe lub tanie atrakcje (priorytet!) — z konkretnymi nazwami
4. Praktyczne wskazówki budżetowe
5. Szacunkowe koszty każdej aktywności w PLN${hasGroup ? " (za osobę)" : ""}
6. Pole "location" — pełna nazwa miejsca z ulicą lub dzielnicą (nie dla transportu i wskazówek)

KRYTYCZNE WYMAGANIA DOTYCZĄCE LICZBY DNI:
- Wygeneruj DOKŁADNIE ${duration} linii z dniami (od day:1 do day:${duration})
- Każdy dzień musi istnieć nawet jeśli ma mało aktywności (np. dzień ${groundMode ? "przyjazdu" : "przylotu"} wieczorem)

Odpowiedz w formacie NDJSON — każdy obiekt na OSOBNEJ LINII, bez żadnego dodatkowego tekstu.

Linia 1 — nagłówek (jeden obiekt):
{"type":"header","city":"${destination.city}","country":"${destination.country}","duration":${duration},"totalBudgetEstimate":"np. 1200-1500 PLN","budgetBreakdown":{"flights":"${groundMode ? travelBudgetText(travel, groundMode) : "Sprawdź w wyszukiwarce"}","accommodation":"np. 300-400 PLN","food":"np. 200-250 PLN","attractions":"np. 100-150 PLN"},"generalTips":["tip1","tip2","tip3","tip4","tip5"]}

Linie 2–${duration + 1} — każdy dzień osobno (jeden obiekt na linię):
{"type":"day","day":1,"date":"${day1Label}","theme":"krótki motyw dnia","activities":[{"time":"10:00","title":"Nazwa aktywności","description":"2-3 zdania z konkretnymi wskazówkami","type":"attraction|food|transport|tip|accommodation","cost":"Free lub ~15 PLN","location":"Nazwa miejsca lub adres","emoji":"emoji"}]}

Każda linia musi być poprawnym, kompletnym JSON-em. Żadnych przerw w środku obiektu.`;
}

// Parsuje NDJSON stream z Gemini — każda linia to osobny obiekt JSON.
// Wywołuje onDay() dla każdego ukończonego dnia, zwraca nagłówek + wszystkie dni.
export async function parseNdjsonStream(
  stream: AsyncIterable<{ text(): string }>,
  onDay: (day: DayPlan, current: number) => void,
): Promise<{ header: Omit<TripPlan, "days">; days: DayPlan[] }> {
  let buf = "";
  let header: Omit<TripPlan, "days"> | null = null;
  const days: DayPlan[] = [];

  const parseLine = (line: string) => {
    const trimmed = line.trim();
    if (!trimmed) return;
    // Strip occasional markdown fences the model might emit
    const cleaned = trimmed.replace(/^```[a-z]*\s*/i, "").replace(/\s*```$/i, "").trim();
    if (!cleaned || cleaned === "{" || cleaned === "}") return;
    try {
      const obj = JSON.parse(cleaned) as Record<string, unknown>;
      if (obj.type === "header") {
        header = obj as unknown as Omit<TripPlan, "days">;
      } else if (obj.type === "day" && typeof obj.day === "number") {
        const day = obj as unknown as DayPlan;
        days.push(day);
        onDay(day, days.length);
      }
    } catch { /* incomplete line — skip */ }
  };

  for await (const chunk of stream) {
    buf += chunk.text();
    const lines = buf.split("\n");
    buf = lines.pop() ?? "";
    for (const line of lines) parseLine(line);
  }
  if (buf) parseLine(buf);

  if (!header) {
    throw new SyntaxError("NDJSON header missing — model returned unexpected format");
  }
  return { header, days };
}

export function parsePlanResponse(raw: string): TripPlan {
  const cleaned = raw
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  return JSON.parse(cleaned) as TripPlan;
}

// Validates and fixes day count after generation
export function validateAndFixPlan(plan: TripPlan, expectedDuration: number): TripPlan {
  if (plan.days.length === expectedDuration) {
    return plan.duration === expectedDuration ? plan : { ...plan, duration: expectedDuration };
  }

  // Too many days — trim
  if (plan.days.length > expectedDuration) {
    return { ...plan, days: plan.days.slice(0, expectedDuration), duration: expectedDuration };
  }

  // Too few days — pad with stub days
  const fixed = { ...plan, days: [...plan.days], duration: expectedDuration };
  while (fixed.days.length < expectedDuration) {
    const dayNum = fixed.days.length + 1;
    fixed.days.push({
      day: dayNum,
      date: `Dzień ${dayNum}`,
      theme: "Czas wolny",
      activities: [
        {
          time: "09:00",
          title: "Dzień wolny",
          description: "Odkryj miasto na własną rękę — spacer, kawiarnia, lokalny rynek.",
          type: "tip",
          cost: "Free",
          emoji: "🗺️",
        },
      ],
    });
  }

  return fixed;
}
