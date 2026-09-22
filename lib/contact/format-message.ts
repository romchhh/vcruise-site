export type CruiseBookingDetails = {
  linerName: string;
  company: string;
  region: string;
  route: string;
  nights: number;
  cruiseDate: string;
  priceLabel?: string;
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

    if (booking.priceLabel) {
      lines.push(`💰 Ціна від: ${booking.priceLabel}`);
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
