"use client";

import type { InputHTMLAttributes, SelectHTMLAttributes } from "react";

export type PassengerGender = "male" | "female";

export type BookingPassenger = {
  role: string;
  firstName: string;
  lastName: string;
  birthDate: string;
  gender: PassengerGender | "";
  citizenship: string;
};

export const PASSENGER_GENDER_OPTIONS: {
  value: PassengerGender;
  label: string;
}[] = [
  { value: "male", label: "Чоловіча" },
  { value: "female", label: "Жіноча" },
];

/** Common citizenships for cruise pre-booking; Ukraine first. */
export const CITIZENSHIP_OPTIONS = [
  "Україна",
  "Польща",
  "Німеччина",
  "США",
  "Канада",
  "Велика Британія",
  "Ізраїль",
  "Молдова",
  "Румунія",
  "Чехія",
  "Словаччина",
  "Угорщина",
  "Литва",
  "Латвія",
  "Естонія",
  "Італія",
  "Іспанія",
  "Франція",
  "Туреччина",
  "Грузія",
  "Азербайджан",
  "Вірменія",
  "Казахстан",
  "Інше",
] as const;

/** Latin letters as in a passport; spaces, hyphen, apostrophe allowed between parts. */
export const LATIN_NAME_RE = /^[A-Za-z]+(?:[ '\-][A-Za-z]+)*$/;

export function sanitizeLatinName(value: string) {
  return value.replace(/[^A-Za-z '\-]/g, "").replace(/\s{2,}/g, " ");
}

export function isLatinPassportName(value: string) {
  const trimmed = value.trim();
  return trimmed.length >= 2 && LATIN_NAME_RE.test(trimmed);
}

export function genderLabel(gender: PassengerGender | "" | undefined) {
  if (gender === "male") return "Чоловіча";
  if (gender === "female") return "Жіноча";
  return "";
}

type Props = {
  passengers: BookingPassenger[];
  onChange: (index: number, patch: Partial<BookingPassenger>) => void;
};

const inputClass =
  "field-control h-11 w-full bg-white px-3 text-body text-[color:var(--color-black)] outline-none transition-shadow focus:ring-2 focus:ring-[color:var(--color-brand)]/20";

function emptyPassenger(role: string): BookingPassenger {
  return {
    role,
    firstName: "",
    lastName: "",
    birthDate: "",
    gender: "",
    citizenship: "Україна",
  };
}

export function passengerSlots(counts: {
  adults: number;
  children: number;
  childrenTeen: number;
  infants: number;
}): BookingPassenger[] {
  const slots: BookingPassenger[] = [];
  const push = (count: number, role: string) => {
    for (let index = 0; index < count; index += 1) {
      slots.push(emptyPassenger(role));
    }
  };
  push(counts.adults, "Дорослий");
  push(counts.children, "Дитина 2–11");
  push(counts.childrenTeen, "Дитина 12–17");
  push(counts.infants, "Немовля");
  return slots;
}

export function mergePassengerSlots(
  previous: BookingPassenger[],
  next: BookingPassenger[],
) {
  return next.map((slot, index) => {
    const current = previous[index];
    if (!current || current.role !== slot.role) return slot;
    return {
      ...slot,
      firstName: current.firstName,
      lastName: current.lastName,
      birthDate: current.birthDate,
      gender: current.gender,
      citizenship: current.citizenship || "Україна",
    };
  });
}

export function passengersComplete(passengers: BookingPassenger[]) {
  return (
    passengers.length > 0 &&
    passengers.every(
      (passenger) =>
        isLatinPassportName(passenger.firstName) &&
        isLatinPassportName(passenger.lastName) &&
        (passenger.gender === "male" || passenger.gender === "female") &&
        passenger.citizenship.trim().length >= 2 &&
        /^\d{4}-\d{2}-\d{2}$/.test(passenger.birthDate),
    )
  );
}

function PassengerInput({
  label,
  hint,
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  hint?: string;
}) {
  return (
    <label className={`block min-w-0 ${className ?? ""}`}>
      <span className="text-caption mb-1.5 block text-subtitle">{label}</span>
      <input {...props} className={`${inputClass} [color-scheme:light]`} />
      {hint ? (
        <span className="text-small mt-1 block text-subtitle">{hint}</span>
      ) : null}
    </label>
  );
}

function PassengerSelect({
  label,
  className,
  children,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement> & { label: string }) {
  return (
    <label className={`block min-w-0 ${className ?? ""}`}>
      <span className="text-caption mb-1.5 block text-subtitle">{label}</span>
      <select {...props} className={inputClass}>
        {children}
      </select>
    </label>
  );
}

export default function BookingPassengerFields({ passengers, onChange }: Props) {
  return (
    <div className="space-y-3">
      <div>
        <p className="text-caption font-semibold text-[color:var(--color-black)]">
          Пасажири
        </p>
        <p className="text-small mt-1 text-subtitle">
          Прізвище та імʼя — латиницею, як у закордонному паспорті.
        </p>
      </div>
      {passengers.map((passenger, index) => (
        <div
          key={`${passenger.role}-${index}`}
          className="rounded-card bg-[color:var(--color-surface-muted)] p-3 sm:p-4"
        >
          <div className="mb-3 flex items-center gap-2">
            <span className="chip chip-brand">{index + 1}</span>
            <span className="text-caption font-semibold text-[color:var(--color-black)]">
              {passenger.role}
            </span>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <PassengerInput
              label="Прізвище (латиницею) *"
              required
              value={passenger.lastName}
              onChange={(event) =>
                onChange(index, {
                  lastName: sanitizeLatinName(event.target.value),
                })
              }
              onBlur={(event) => {
                if (event.target.value && !isLatinPassportName(event.target.value)) {
                  onChange(index, { lastName: "" });
                }
              }}
              placeholder="SHEVCHENKO"
              maxLength={80}
              autoComplete="family-name"
              spellCheck={false}
              lang="en"
              inputMode="text"
              pattern="[A-Za-z][A-Za-z '\-]*"
              title="Лише латинські літери, як у паспорті"
              hint={
                passenger.lastName && !isLatinPassportName(passenger.lastName)
                  ? "Введіть прізвище латиницею"
                  : undefined
              }
            />
            <PassengerInput
              label="Імʼя (латиницею) *"
              required
              value={passenger.firstName}
              onChange={(event) =>
                onChange(index, {
                  firstName: sanitizeLatinName(event.target.value),
                })
              }
              onBlur={(event) => {
                if (
                  event.target.value &&
                  !isLatinPassportName(event.target.value)
                ) {
                  onChange(index, { firstName: "" });
                }
              }}
              placeholder="TARAS"
              maxLength={80}
              autoComplete="given-name"
              spellCheck={false}
              lang="en"
              inputMode="text"
              pattern="[A-Za-z][A-Za-z '\-]*"
              title="Лише латинські літери, як у паспорті"
              hint={
                passenger.firstName && !isLatinPassportName(passenger.firstName)
                  ? "Введіть імʼя латиницею"
                  : undefined
              }
            />
            <PassengerSelect
              label="Стать *"
              required
              value={passenger.gender}
              onChange={(event) =>
                onChange(index, {
                  gender: event.target.value as PassengerGender | "",
                })
              }
            >
              <option value="">Оберіть</option>
              {PASSENGER_GENDER_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </PassengerSelect>
            <PassengerInput
              label="Дата народження *"
              required
              type="date"
              value={passenger.birthDate}
              onChange={(event) =>
                onChange(index, { birthDate: event.target.value })
              }
            />
            <PassengerSelect
              label="Громадянство *"
              required
              value={passenger.citizenship}
              onChange={(event) =>
                onChange(index, { citizenship: event.target.value })
              }
              className="sm:col-span-2"
            >
              {CITIZENSHIP_OPTIONS.map((country) => (
                <option key={country} value={country}>
                  {country}
                </option>
              ))}
            </PassengerSelect>
          </div>
        </div>
      ))}
    </div>
  );
}
