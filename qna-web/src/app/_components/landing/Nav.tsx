import { MobileMenu } from "./MobileMenu";

const NAV_LINKS = [
  { href: "#discover", label: "Discover" },
  { href: "#for-creators", label: "For creators" },
];

export function Nav() {
  return (
    <header className="relative border-b border-line bg-paper">
      <div className="mx-auto flex max-w-[1200px] items-center justify-between px-6 py-5 md:px-12">
        <a href="/" className="text-[19px] font-extrabold tracking-tight text-primary">
          Quorum
        </a>

        <nav className="hidden md:flex md:gap-7 text-sm font-medium text-muted">
          {NAV_LINKS.map((l) => (
            <a key={l.href} href={l.href} className="hover:text-ink">
              {l.label}
            </a>
          ))}
        </nav>

        <div className="hidden md:flex md:items-center md:gap-2.5 text-sm">
          <a href="#sign-in" className="rounded-full px-4 py-2.5 font-semibold text-ink">
            Sign in
          </a>
          <a
            href="#join"
            className="rounded-full bg-primary px-4 py-2.5 font-semibold text-paper"
          >
            Join free
          </a>
        </div>

        <MobileMenu links={NAV_LINKS} />
      </div>
    </header>
  );
}
