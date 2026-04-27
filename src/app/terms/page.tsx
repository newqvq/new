import { PublicInfoPage } from "@/components/public-info-page";
import { getCurrentLocale } from "@/lib/i18n-server";
import { getPublicPageCopy } from "@/lib/support";

export default async function TermsPage() {
  const locale = await getCurrentLocale();
  const copy = getPublicPageCopy(locale).terms;

  return (
    <PublicInfoPage
      title={copy.title}
      subtitle={copy.subtitle}
      sections={copy.sections}
    />
  );
}
