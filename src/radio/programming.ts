export const RADIO_TIME_ZONE = "Africa/Lagos";

export type RadioProgramme = {
  id: string;
  title: string;
  host?: string;
  tagline: string;
  start: string;
  end: string;
};

export type RadioHost = {
  name: string;
  role: string;
};

export const RADIO_HOSTS: RadioHost[] = [
  {
    name: "DJ NEBULAE",
    role: "THE EXPLORER · MAIN HOST",
  },
  {
    name: "STIRFRY",
    role: "THE DISRUPTOR",
  },
  {
    name: "BIGMOOCH",
    role: "THE NIGHT CREATURE",
  },
];

const WEEKDAY_SCHEDULE: RadioProgramme[] = [
  {
    id: "night-transmission",
    title: "NIGHT TRANSMISSION",
    tagline: "Late-night culture and sound",
    start: "00:00",
    end: "03:00",
  },
  {
    id: "overnight-frequency",
    title: "OVERNIGHT FREQUENCY",
    tagline: "The overnight rotation",
    start: "03:00",
    end: "06:00",
  },
  {
    id: "culture-wake-up",
    title: "THE CULTURE WAKE-UP",
    tagline: "Start the day with culture",
    start: "06:00",
    end: "09:00",
  },
  {
    id: "nebulae-morning",
    title: "NEBULAE",
    host: "DJ NEBULAE",
    tagline: "The Explorer",
    start: "09:00",
    end: "12:00",
  },
  {
    id: "culture-lunch",
    title: "THE CULTURE LUNCH",
    host: "DJ NEBULAE",
    tagline: "Midday culture and music",
    start: "12:00",
    end: "15:00",
  },
  {
    id: "stirfry",
    title: "STIRFRY",
    host: "STIRFRY",
    tagline: "The Disruptor",
    start: "15:00",
    end: "18:00",
  },
  {
    id: "culture-drive",
    title: "THE CULTURE DRIVE",
    host: "DJ NEBULAE",
    tagline: "The evening culture drive",
    start: "18:00",
    end: "21:00",
  },
  {
    id: "bigmooch-after-dark",
    title: "BIGMOOCH AFTER DARK",
    host: "BIGMOOCH",
    tagline: "The Night Creature",
    start: "21:00",
    end: "00:00",
  },
];

const SATURDAY_SCHEDULE: RadioProgramme[] = [
  {
    id: "weekend-starter",
    title: "WEEKEND STARTER",
    host: "DJ NEBULAE",
    tagline: "The Explorer",
    start: "08:00",
    end: "11:00",
  },
  {
    id: "culture-club",
    title: "CULTURE CLUB",
    host: "STIRFRY",
    tagline: "The Disruptor",
    start: "11:00",
    end: "14:00",
  },
  {
    id: "open-rotation-saturday",
    title: "OPEN ROTATION",
    tagline: "The weekend music rotation",
    start: "14:00",
    end: "18:00",
  },
  {
    id: "the-mix",
    title: "THE MIX",
    host: "BIGMOOCH",
    tagline: "The Night Creature",
    start: "18:00",
    end: "21:00",
  },
  {
    id: "bigmooch-after-dark-saturday",
    title: "BIGMOOCH AFTER DARK",
    host: "BIGMOOCH",
    tagline: "The Night Creature",
    start: "21:00",
    end: "00:00",
  },
];

const SUNDAY_SCHEDULE: RadioProgramme[] = [
  {
    id: "sunday-service",
    title: "SUNDAY SERVICE",
    host: "DJ NEBULAE",
    tagline: "The Explorer",
    start: "09:00",
    end: "12:00",
  },
  {
    id: "the-archive",
    title: "THE ARCHIVE",
    tagline: "Deep cuts and culture",
    start: "12:00",
    end: "15:00",
  },
  {
    id: "diaspora-frequencies",
    title: "DIASPORA FREQUENCIES",
    host: "DJ NEBULAE",
    tagline: "The Explorer",
    start: "15:00",
    end: "18:00",
  },
  {
    id: "sunday-reset",
    title: "THE SUNDAY RESET",
    host: "STIRFRY",
    tagline: "The Disruptor",
    start: "18:00",
    end: "21:00",
  },
  {
    id: "sunday-night-transmission",
    title: "SUNDAY NIGHT TRANSMISSION",
    host: "BIGMOOCH",
    tagline: "The Night Creature",
    start: "21:00",
    end: "00:00",
  },
];

function getDayOfWeek(date: Date): number {
  return Number(
    new Intl.DateTimeFormat("en-US", {
      timeZone: RADIO_TIME_ZONE,
      weekday: "short",
    })
      .formatToParts(date)
      .find((part) => part.type === "weekday")
      ?.value
      ? new Intl.DateTimeFormat("en-US", {
          timeZone: RADIO_TIME_ZONE,
          weekday: "short",
        }).format(date)
      : date.getDay(),
  );
}

function getLagosParts(date: Date) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: RADIO_TIME_ZONE,
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);

  const weekday = parts.find((part) => part.type === "weekday")?.value ?? "Mon";
  const hour = Number(parts.find((part) => part.type === "hour")?.value ?? "0");
  const minute = Number(parts.find((part) => part.type === "minute")?.value ?? "0");

  return { weekday, hour, minute };
}

function scheduleForDate(date: Date): RadioProgramme[] {
  const { weekday } = getLagosParts(date);

  if (weekday === "Sat") {
    return SATURDAY_SCHEDULE;
  }

  if (weekday === "Sun") {
    return SUNDAY_SCHEDULE;
  }

  return WEEKDAY_SCHEDULE;
}

function timeToMinutes(value: string): number {
  const [hour, minute] = value.split(":").map(Number);
  return hour * 60 + minute;
}

function programmeContainsTime(programme: RadioProgramme, currentMinutes: number): boolean {
  const start = timeToMinutes(programme.start);
  const end = timeToMinutes(programme.end);

  if (end === 0) {
    return currentMinutes >= start;
  }

  return currentMinutes >= start && currentMinutes < end;
}

export function getCurrentProgramme(date: Date = new Date()): RadioProgramme {
  const { hour, minute } = getLagosParts(date);
  const currentMinutes = hour * 60 + minute;
  const schedule = scheduleForDate(date);

  return (
    schedule.find((programme) =>
      programmeContainsTime(programme, currentMinutes),
    ) ?? schedule[0]
  );
}

export function getNextProgramme(date: Date = new Date()): RadioProgramme {
  const current = getCurrentProgramme(date);
  const schedule = scheduleForDate(date);
  const currentIndex = schedule.findIndex((programme) => programme.id === current.id);

  if (currentIndex >= 0 && currentIndex < schedule.length - 1) {
    return schedule[currentIndex + 1];
  }

  return schedule[0];
}

export function getTodaySchedule(date: Date = new Date()): RadioProgramme[] {
  return scheduleForDate(date);
}

export function getHost(name: string): RadioHost | undefined {
  return RADIO_HOSTS.find(
    (host) => host.name.toLowerCase() === name.toLowerCase(),
  );
}

export function formatRadioTime(value: string): string {
  const [hourString, minuteString] = value.split(":");
  const hour = Number(hourString);
  const minute = Number(minuteString);

  const period = hour >= 12 ? "PM" : "AM";
  const displayHour = hour % 12 || 12;

  return `${displayHour}:${String(minute).padStart(2, "0")} ${period}`;
}
