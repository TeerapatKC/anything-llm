export default function Sponsor({ settings }) {
  if (!!settings.noSponsor) return null;

  return (
    <div className="allm-flex allm-w-full allm-items-center allm-justify-center">
      <a
        href={settings.sponsorLink ?? "#"}
        target="_blank"
        rel="noreferrer"
        className="allm-font-sans allm-text-xs allm-text-slate-400 allm-no-underline hover:allm-text-slate-700 hover:allm-underline"
      >
        {settings.sponsorText}
      </a>
    </div>
  );
}
