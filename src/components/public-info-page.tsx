type InfoSection = readonly [string, string];

type PublicInfoPageProps = {
  title: string;
  subtitle: string;
  sections: readonly InfoSection[];
};

export function PublicInfoPage({ title, subtitle, sections }: PublicInfoPageProps) {
  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
      <section className="rounded-[18px] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="max-w-3xl">
          <h1 className="text-3xl font-black text-slate-950 sm:text-4xl">{title}</h1>
          <p className="mt-4 text-sm leading-7 text-slate-600 sm:text-base">
            {subtitle}
          </p>
        </div>

        <div className="mt-8 divide-y divide-slate-200 rounded-[14px] border border-slate-200">
          {sections.map(([sectionTitle, body]) => (
            <div key={sectionTitle} className="p-5 sm:grid sm:grid-cols-[220px_1fr] sm:gap-8">
              <h2 className="text-base font-bold text-slate-950">{sectionTitle}</h2>
              <p className="mt-2 text-sm leading-7 text-slate-600 sm:mt-0">{body}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
