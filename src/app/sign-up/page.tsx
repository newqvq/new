import Link from "next/link";

import { AlertBanner } from "@/components/alert-banner";
import { SubmitButton } from "@/components/submit-button";
import { registerAction } from "@/lib/actions/auth";
import { getMarketingCopy } from "@/lib/i18n";
import { getCurrentLocale } from "@/lib/i18n-server";
import { getFlashMessage } from "@/lib/utils";

type SignUpPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function SignUpPage({ searchParams }: SignUpPageProps) {
  const flash = getFlashMessage(await searchParams);
  const locale = await getCurrentLocale();
  const copy = getMarketingCopy(locale);

  return (
    <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:px-8">
      <section className="panel p-8">
        {flash ? <AlertBanner {...flash} className="mb-5" /> : null}
        <div className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
          {copy.auth.signUpEyebrow}
        </div>
        <h1 className="mt-3 text-3xl font-black text-slate-950">
          {copy.auth.signUpTitle}
        </h1>
        <p className="mt-3 text-sm text-slate-500">{copy.auth.signUpDescription}</p>

        <form action={registerAction} className="mt-8 grid gap-5 md:grid-cols-2">
          <div className="md:col-span-2">
            <label className="mb-2 block text-sm font-semibold text-slate-700">
              {copy.auth.displayName}
            </label>
            <input
              type="text"
              name="displayName"
              required
              className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-slate-950"
            />
          </div>
          <div className="md:col-span-2">
            <label className="mb-2 block text-sm font-semibold text-slate-700">
              {copy.auth.email}
            </label>
            <input
              type="email"
              name="email"
              required
              className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-slate-950"
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700">
              {copy.auth.password}
            </label>
            <input
              type="password"
              name="password"
              required
              className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-slate-950"
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700">
              {copy.auth.confirmPassword}
            </label>
            <input
              type="password"
              name="confirmPassword"
              required
              className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-slate-950"
            />
          </div>
          <div className="md:col-span-2">
            <label className="mb-2 block text-sm font-semibold text-slate-700">
              {copy.auth.inviteCode}
            </label>
            <input
              type="text"
              name="inviteCode"
              placeholder={copy.auth.invitePlaceholder}
              className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-slate-950"
            />
          </div>
          <div className="md:col-span-2">
            <SubmitButton pendingText={copy.common.processing} className="w-full justify-center">
              {copy.auth.signUpSubmit}
            </SubmitButton>
          </div>
        </form>
      </section>

      <section className="panel p-8">
        <div className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
          Referral
        </div>
        <h2 className="mt-5 text-4xl font-black text-slate-950">
          {copy.auth.referralTitle}
        </h2>
        <p className="mt-4 text-sm leading-7 text-slate-600">
          {copy.auth.referralBody}
        </p>
        <div className="mt-8 space-y-4 text-sm text-slate-700">
          {copy.auth.referralPoints.map((point) => (
            <div key={point}>{point}</div>
          ))}
        </div>
        <div className="mt-8 text-sm text-slate-500">
          {copy.auth.signUpQuestion}
          <Link href="/sign-in" className="ml-2 font-semibold text-slate-950">
            {copy.auth.signUpLink}
          </Link>
        </div>
      </section>
    </div>
  );
}
