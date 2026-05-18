import Link from 'next/link';

type Props = {
  eyebrow: string;
  titlePlain: string;
  titleAccent: string;
  children: React.ReactNode;
};

export function AuthShell({
  eyebrow,
  titlePlain,
  titleAccent,
  children,
}: Props) {
  return (
    <div className="w-full max-w-[440px]">
      <Link
        href="/"
        className="mb-8 block text-center text-[19px] font-extrabold tracking-tight text-primary"
      >
        Quorum
      </Link>
      <div className="rounded-[14px] border border-line bg-card px-7 py-8 md:px-9 md:py-10">
        <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.16em] text-primary">
          {eyebrow}
        </p>
        <h1 className="mb-7 text-[28px] font-bold leading-tight tracking-[-0.02em]">
          {titlePlain}{' '}
          <span className="serif-italic">{titleAccent}</span>
        </h1>
        {children}
      </div>
    </div>
  );
}
