export type CruiseBookingDetails = {
  linerName: string;
  company: string;
  region: string;
  route: string;
  nights: number;
  cruiseDate: string;
  /** Selected cabin category, e.g. «З балконом». */
  cabinType?: string;
  priceLabel?: string;
  adults?: number;
  children?: number;
  infants?: number;
};

function formatIsoDateLabel(iso: string) {
  const [year, month, day] = iso.split("-");
  return `${day}.${month}.${year}`;
}

export type ContactFormPayload = {
  name: string;
  phone: string;
  details?: string;
  booking?: CruiseBookingDetails;
};

export function formatContactTelegramMessage(payload: ContactFormPayload) {
  if (payload.booking) {
    const booking = payload.booking;
    const lines = [
      "🛳 Заявка на бронювання VCRUISE",
      "",
      `🚢 Лайнер: ${booking.linerName}`,
      `🏢 Компанія: ${booking.company}`,
      `🌍 Регіон: ${booking.region}`,
      `📅 Дата відправлення: ${formatIsoDateLabel(booking.cruiseDate)}`,
      `🛏 Тривалість: ${booking.nights} ночей`,
      `🗺 Маршрут: ${booking.route}`,
    ];

    if (booking.cabinType) {
      lines.push(`🚪 Каюта: ${booking.cabinType}`);
    }

    if (booking.priceLabel) {
      lines.push(`💰 Ціна: ${booking.priceLabel}`);
    }

    const adults = booking.adults ?? 0;
    const children = booking.children ?? 0;
    const infants = booking.infants ?? 0;
    if (adults || children || infants) {
      lines.push(
        `👥 Туристи: ${adults} дор.` +
          (children ? `, ${children} дит.` : "") +
          (infants ? `, ${infants} нем.` : ""),
      );
    }

    lines.push(
      "",
      `👤 Ім'я: ${payload.name}`,
      `📞 Телефон: ${payload.phone}`
    );

    if (payload.details?.trim()) {
      lines.push("", "📝 Коментар:", payload.details.trim());
    }

    return lines.join("\n");
  }

  const lines = [
    "🛳 Нова заявка VCRUISE",
    "",
    `👤 Ім'я: ${payload.name}`,
    `📞 Телефон: ${payload.phone}`,
  ];

  if (payload.details?.trim()) {
    lines.push("", "📝 Додаткові деталі:", payload.details.trim());
  }

  return lines.join("\n");
}
