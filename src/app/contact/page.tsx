import { Mail, MessageCircle, Clock } from "lucide-react";

import { getCurrentLocale } from "@/lib/i18n-server";
import { getPublicPageCopy, supportConfig } from "@/lib/support";

export default async function ContactPage() {
  const locale = await getCurrentLocale();
  const copy = getPublicPageCopy(locale).contact;
  const cards = [
    {
      label: copy.cards.email,
      value: supportConfig.email,
      href: `mailto:${supportConfig.email}`,
      icon: Mail,
    },
    {
      label: copy.cards.telegram,
      value: supportConfig.telegram,
      href: supportConfig.telegram.startsWith("@")
        ? `https://t.me/${supportConfig.telegram.slice(1)}`
        : undefined,
      icon: MessageCircle,
    },
    {
      label: copy.cards.hours,
      value: supportConfig.hours,
      href: undefined,
      icon: Clock,
    },
  ];

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      <section className="rounded-[18px] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="max-w-3xl">
          <h1 className="text-3xl font-black text-slate-950 sm:text-4xl">
            {copy.title}
          </h1>
          <p className="mt-4 text-sm leading-7 text-slate-600 sm:text-base">
            {copy.subtitle}
          </p>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {cards.map((card) => {
            const Icon = card.icon;
            const content = (
              <div className="rounded-[14px] border border-slate-200 bg-slate-50 p-5">
                <Icon className="h-5 w-5 text-sky-600" aria-hidden="true" />
                <div className="mt-4 text-sm font-semibold text-slate-500">
                  {card.label}
                </div>
                <div className="mt-2 break-all text-base font-black text-slate-950">
                  {card.value}
                </div>
              </div>
            );

            return card.href ? (
              <a key={card.label} href={card.href} target={card.href.startsWith("http") ? "_blank" : undefined}>
                {content}
              </a>
            ) : (
              <div key={card.label}>{content}</div>
            );
          })}
        </div>

        <p className="mt-6 rounded-[14px] bg-sky-50 px-5 py-4 text-sm leading-7 text-sky-900">
          {copy.response}
        </p>

        <div className="mt-8 divide-y divide-slate-200 rounded-[14px] border border-slate-200">
          {copy.sections.map((section) => (
            <div
              key={section.title}
              className="p-5 sm:grid sm:grid-cols-[220px_1fr] sm:gap-8"
            >
              <h2 className="text-base font-bold text-slate-950">{section.title}</h2>
              <p className="mt-2 text-sm leading-7 text-slate-600 sm:mt-0">
                {section.body}
              </p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
