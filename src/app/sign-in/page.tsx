import Link from "next/link";

import { AlertBanner } from "@/components/alert-banner";
import { SubmitButton } from "@/components/submit-button";
import { signInAction } from "@/lib/actions/auth";
import { getMarketingCopy } from "@/lib/i18n";
import { getCurrentLocale } from "@/lib/i18n-server";
import { getFlashMessage } from "@/lib/utils";

type SignInPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function SignInPage({ searchParams }: SignInPageProps) {
  const flash = getFlashMessage(await searchParams);
  const locale = await getCurrentLocale();
  const copy = getMarketingCopy(locale);

  return (
    <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[0.92fr_1.08fr] lg:px-8">
      <section className="panel p-8">
        <div className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
          {copy.auth.signInEyebrow}
        </div>
        <h1 className="mt-4 text-4xl font-black text-slate-950">
          {copy.auth.signInTitle}
        </h1>
        <p className="mt-4 max-w-xl text-sm leading-7 text-slate-600">
          {copy.auth.signInDescription}
        </p>
      </section>

      <section className="panel p-8">
        {flash ? <AlertBanner {...flash} className="mb-5" /> : null}
        <div className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
          {copy.auth.signInEyebrow}
        </div>
        <h2 className="mt-3 text-3xl font-black text-slate-950">
          {copy.auth.signInTitle}
        </h2>
        <p className="mt-3 text-sm text-slate-500">{copy.auth.signInDescription}</p>

        <form action={signInAction} className="mt-8 space-y-5">
          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700">
              {copy.auth.signInEmail}
            </label>
            <input
              type="email"
              name="email"
              required
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-950"
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700">
              {copy.auth.signInPassword}
            </label>
            <input
              type="password"
              name="password"
              required
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-950"
            />
          </div>
          <SubmitButton pendingText={copy.common.processing} className="w-full justify-center">
            {copy.auth.signInSubmit}
          </SubmitButton>
        </form>

        <div className="mt-6 text-sm text-slate-500">
          {copy.auth.signInQuestion}
          <Link href="/sign-up" className="ml-2 font-semibold text-slate-950">
            {copy.auth.signInLink}
          </Link>
        </div>
      </section>
    </div>
  );
}
