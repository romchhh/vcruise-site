"use client";

import type { InputHTMLAttributes } from "react";

export type BookingPassenger = {
  role: string;
  firstName: string;
  lastName: string;
  birthDate: string;
};

type Props = {
  passengers: BookingPassenger[];
  onChange: (index: number, patch: Partial<BookingPassenger>) => void;
};

const inputClass =
  "field-control h-11 w-full bg-white px-3 text-body text-[color:var(--color-black)] outline-none transition-shadow focus:ring-2 focus:ring-[color:var(--color-brand)]/20";

export function passengerSlots(counts: {
  adults: number;
  children: number;
  childrenTeen: number;
  infants: number;
}): BookingPassenger[] {
  const slots: BookingPassenger[] = [];
  const push = (count: number, role: string) => {
    for (let index = 0; index < count; index += 1) {
      slots.push({ role, firstName: "", lastName: "", birthDate: "" });
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
    };
  });
}

export function passengersComplete(passengers: BookingPassenger[]) {
  return (
    passengers.length > 0 &&
    passengers.every(
      (passenger) =>
        passenger.firstName.trim().length >= 2 &&
        passenger.lastName.trim().length >= 2 &&
        /^\d{4}-\d{2}-\d{2}$/.test(passenger.birthDate),
    )
  );
}

function PassengerInput({
  label,
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return (
    <label className={`block min-w-0 ${className ?? ""}`}>
      <span className="text-caption mb-1.5 block text-subtitle">{label}</span>
      <input {...props} className={`${inputClass} [color-scheme:light]`} />
    </label>
  );
}

export default function BookingPassengerFields({ passengers, onChange }: Props) {
  return (
    <div className="space-y-3">
      <p className="text-caption font-semibold text-[color:var(--color-black)]">
        Пасажири
      </p>
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
              label="Прізвище *"
              required
              value={passenger.lastName}
              onChange={(event) =>
                onChange(index, { lastName: event.target.value })
              }
              maxLength={80}
              autoComplete="family-name"
            />
            <PassengerInput
              label="Ім'я *"
              required
              value={passenger.firstName}
              onChange={(event) =>
                onChange(index, { firstName: event.target.value })
              }
              maxLength={80}
              autoComplete="given-name"
            />
            <PassengerInput
              label="Дата народження *"
              required
              type="date"
              value={passenger.birthDate}
              onChange={(event) =>
                onChange(index, { birthDate: event.target.value })
              }
              className="sm:col-span-2"
            />
          </div>
        </div>
      ))}
    </div>
  );
}
