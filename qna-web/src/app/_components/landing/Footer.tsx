import Link from "next/link";

const COLUMNS: { heading: string; links: string[] }[] = [
  { heading: "Product", links: ["Discover", "How it works", "For creators", "Pricing"] },
  {
    heading: "Communities",
    links: ["Daily AI Builders", "Chess Tactics", "Modern CSS", "Browse all"],
  },
  { heading: "Company", links: ["About", "Blog", "Contact"] },
  { heading: "Legal", links: ["Privacy", "Terms", "Cookies"] },
];

function footerHref(label: string) {
  if (label === "Discover" || label === "Browse all") return "/communities";
  return "#";
}

export function Footer() {
  return (
    <footer className="border-t border-line bg-paper px-6 pb-8 pt-10 md:px-12">
      <div className="mx-auto max-w-[1200px]">
        <div className="mb-8 grid grid-cols-2 gap-8 md:grid-cols-[1.5fr_repeat(4,1fr)]">
          <div className="col-span-2 md:col-span-1">
            <div className="text-[19px] font-extrabold tracking-tight text-primary">
              Quorum
            </div>
            <p className="mt-2 max-w-[28ch] text-[13px] leading-relaxed text-muted">
              A daily ritual for niche communities.
            </p>
          </div>
          {COLUMNS.map((col) => (
            <div key={col.heading}>
              <h5 className="mb-3.5 text-[11px] font-bold uppercase tracking-[0.1em] text-primary">
                {col.heading}
              </h5>
              <ul className="space-y-2">
                {col.links.map((link) => (
                  <li key={link}>
                    <Link
                      href={footerHref(link)}
                      className="text-[13px] text-muted hover:text-ink"
                    >
                      {link}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="flex flex-col gap-2 border-t border-line pt-5 text-xs text-muted md:flex-row md:justify-between">
          <span>© 2026 Quorum. All rights reserved.</span>
          <span>Made for niche communities, one question at a time.</span>
        </div>
      </div>
    </footer>
  );
}
