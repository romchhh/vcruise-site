export type CruiseBookingDetails = {
  linerName: string;
  company: string;
  region: string;
  route: string;
  nights: number;
  cruiseDate: string;
  /** End of sailing (ISO), if known. */
  cruiseDateEnd?: string;
  /** Selected cabin category, e.g. «З балконом». */
  cabinType?: string;
  priceLabel?: string;
  adults?: number;
  children?: number;
  infants?: number;
  shipBuiltYear?: number;
  shipRenovatedYear?: number;
  shipClass?: string;
  companyClass?: string;
  shipSize?: string;
  starRating?: number;
  reviewScore?: number;
  reviewCount?: number;
  /** Direct link to 4gates cabin/tariff page for this sailing. */
  bookingUrl?: string;
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
    const dateLine =
      booking.cruiseDateEnd && booking.cruiseDateEnd !== booking.cruiseDate
        ? `${formatIsoDateLabel(booking.cruiseDate)} – ${formatIsoDateLabel(booking.cruiseDateEnd)}`
        : formatIsoDateLabel(booking.cruiseDate);

    const lines = [
      "🛳 Заявка на бронювання VCRUISE",
      "",
      `🚢 Лайнер: ${booking.linerName}`,
      `🏢 Компанія: ${booking.company}`,
      `🌍 Регіон: ${booking.region}`,
    ];

    if (booking.shipBuiltYear) {
      lines.push(`📅 Спущено: ${booking.shipBuiltYear} р.`);
    }
    if (booking.shipRenovatedYear) {
      lines.push(`🔧 Реновація: ${booking.shipRenovatedYear} р.`);
    }
    if (booking.shipClass) {
      lines.push(`🏷 Клас лайнера: ${booking.shipClass}`);
    }
    if (booking.companyClass) {
      lines.push(`🏷 Клас компанії: ${booking.companyClass}`);
    }
    if (booking.shipSize) {
      lines.push(`📏 Розмір: ${booking.shipSize}`);
    }
    if (booking.starRating != null || booking.reviewScore != null) {
      const ratingParts: string[] = [];
      if (booking.starRating != null) {
        ratingParts.push(`${booking.starRating}★`);
      }
      if (booking.reviewScore != null) {
        ratingParts.push(
          `оцінка ${booking.reviewScore}` +
            (booking.reviewCount ? ` (${booking.reviewCount})` : ""),
        );
      }
      lines.push(`⭐ Рейтинг: ${ratingParts.join(" · ")}`);
    }

    lines.push(
      `📅 Дати: ${dateLine}`,
      `🛏 Тривалість: ${booking.nights} ночей`,
      `🗺 Маршрут: ${booking.route}`,
    );

    if (booking.cabinType) {
      lines.push(`🚪 Каюта: ${booking.cabinType}`);
    }

    if (booking.priceLabel) {
      lines.push(`💰 Ціна від (за каюту): ${booking.priceLabel}`);
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

    if (booking.bookingUrl) {
      lines.push(`🔗 Тарифи 4gates: ${booking.bookingUrl}`);
    }

    lines.push(
      "",
      `👤 Ім'я: ${payload.name}`,
      `📞 Телефон: ${payload.phone}`,
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
