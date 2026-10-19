// Small shared pieces for the panels, styled like the design mockups.

export const btn =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-brand px-5 font-bold text-white hover:bg-brand-dark disabled:opacity-60";
export const btn2 =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-md border-[1.5px] border-brand bg-white px-[18px] font-semibold text-brand hover:bg-brand-soft disabled:opacity-60";
export const input = "min-h-11 w-full rounded-md border border-field bg-white px-3";
export const card = "rounded-lg border border-line bg-white";
export const th = "px-3 py-2.5 text-[13px] font-normal text-muted";
export const td = "px-3 py-3.5";

const PILL = {
  yellow: "bg-sun-soft text-sun-ink",
  blue: "bg-[#dbe8ff] text-[#1a3f8a]",
  green: "bg-[#d9f3e1] text-[#17653a]",
  red: "bg-[#fde0e0] text-[#9a1c1c]",
  purple: "bg-[#ece6f6] text-brand-dark",
};

export function Pill({ color, children }: { color: keyof typeof PILL; children: React.ReactNode }) {
  return <span className={`inline-block rounded-full px-2.5 py-0.5 text-[13px] font-bold ${PILL[color]}`}>{children}</span>;
}

export const STATUS_COLOR: Record<string, keyof typeof PILL> = {
  new: "yellow",
  arrived: "blue",
  signed: "green",
  rejected: "red",
  draft: "purple",
  active: "green",
  archived: "red",
  sent: "yellow",
  paid: "green",
};

export function ErrorNote({ children }: { children: React.ReactNode }) {
  if (!children) return null;
  return <p role="alert" className="rounded-md bg-[#fde0e0] px-3 py-2 text-sm text-[#9a1c1c]">{children}</p>;
}

export function CameraIcon({ size = 30 }: { size?: number }) {
  return (
    <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#8f86a8" strokeWidth="1.6">
      <rect x="2" y="6" width="20" height="14" rx="3" />
      <circle cx="12" cy="13" r="4" />
      <path d="M8 6l1.5-3h5L16 6" />
    </svg>
  );
}
