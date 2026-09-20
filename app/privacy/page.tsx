import type { Metadata } from "next";
import LegalPageLayout, { LegalSection } from "@/components/LegalPageLayout";
import { createMetadata } from "@/lib/seo";
import { siteConfig } from "@/lib/site";

export const metadata: Metadata = createMetadata({
  title: "Політика конфіденційності",
  description:
    "Політика конфіденційності VCRUISE: які персональні дані ми збираємо, як їх використовуємо та як захищаємо.",
  path: "/privacy",
});

const updatedAt = "21 вересня 2026";

export default function PrivacyPage() {
  return (
    <LegalPageLayout title="Політика конфіденційності" updatedAt={updatedAt}>
      <LegalSection title="1. Загальні положення">
        <p>
          Ця Політика конфіденційності описує, як {siteConfig.legalName} (
          {siteConfig.name}) збирає, використовує та захищає персональні дані
          користувачів сайту {siteConfig.url.replace(/^https?:\/\//, "")}.
        </p>
        <p>
          Користуючись нашим сайтом або залишаючи заявку на підбір круїзу чи
          туру, ви погоджуєтесь із умовами цієї Політики.
        </p>
      </LegalSection>

      <LegalSection title="2. Які дані ми збираємо">
        <p>Ми можемо обробляти такі категорії даних:</p>
        <ul className="list-disc space-y-2 pl-5">
          <li>ім&apos;я та контактні дані (телефон, email);</li>
          <li>інформацію про запит (напрямок, дати, кількість мандрівників);</li>
          <li>технічні дані (IP-адреса, тип браузера, cookies);</li>
          <li>
            іншу інформацію, яку ви добровільно надаєте під час спілкування з
            нашими менеджерами.
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="3. Навіщо ми використовуємо дані">
        <p>Персональні дані використовуються для:</p>
        <ul className="list-disc space-y-2 pl-5">
          <li>обробки запитів і підбору круїзів чи турів;</li>
          <li>зв&apos;язку з вами щодо бронювання та супроводу подорожі;</li>
          <li>покращення роботи сайту та якості сервісу;</li>
          <li>надсилання інформаційних матеріалів за вашою згодою;</li>
          <li>виконання вимог законодавства України.</li>
        </ul>
      </LegalSection>

      <LegalSection title="4. Передача даних третім особам">
        <p>
          Ми не продаємо персональні дані. Передача можлива лише партнерам, які
          беруть участь у наданні послуг (круїзні компанії, страхові,
          платіжні сервіси, поштові та месенджер-платформи) — і лише в обсязі,
          необхідному для виконання вашого запиту.
        </p>
      </LegalSection>

      <LegalSection title="5. Зберігання та захист">
        <p>
          Дані зберігаються протягом строку, необхідного для надання послуг та
          виконання юридичних зобов&apos;язань. Ми застосовуємо організаційні та
          технічні заходи для захисту інформації від несанкціонованого доступу.
        </p>
      </LegalSection>

      <LegalSection title="6. Ваші права">
        <p>Ви маєте право:</p>
        <ul className="list-disc space-y-2 pl-5">
          <li>дізнатися, які дані ми обробляємо;</li>
          <li>вимагати виправлення або видалення даних;</li>
          <li>відкликати згоду на обробку;</li>
          <li>звернутися зі скаргою до уповноваженого органу.</li>
        </ul>
        <p>
          Для реалізації прав напишіть нам на{" "}
          <a
            href={`mailto:${siteConfig.email}`}
            className="font-semibold text-[color:var(--color-brand)] hover:underline"
          >
            {siteConfig.email}
          </a>
          .
        </p>
      </LegalSection>

      <LegalSection title="7. Файли cookie">
        <p>
          Сайт може використовувати cookies для коректної роботи, аналітики та
          збереження налаштувань. Ви можете обмежити використання cookies у
          налаштуваннях браузера, проте це може вплинути на функціональність
          сайту.
        </p>
      </LegalSection>

      <LegalSection title="8. Зміни політики">
        <p>
          Ми можемо оновлювати цю Політику. Актуальна версія завжди доступна на
          цій сторінці з датою останнього оновлення.
        </p>
      </LegalSection>

      <LegalSection title="9. Контакти">
        <p>
          З питань конфіденційності звертайтесь:{" "}
          <a
            href={`mailto:${siteConfig.email}`}
            className="font-semibold text-[color:var(--color-brand)] hover:underline"
          >
            {siteConfig.email}
          </a>
          , тел.{" "}
          <a
            href={`tel:${siteConfig.phone}`}
            className="font-semibold text-[color:var(--color-brand)] hover:underline"
          >
            {siteConfig.phone}
          </a>
          .
        </p>
      </LegalSection>
    </LegalPageLayout>
  );
}
