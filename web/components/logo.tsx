/** The avtomobilebi wordmark (logo 6a): name, yellow road line, purple dot. */
export function Logo({ size = 24, dark = false }: { size?: number; dark?: boolean }) {
  return (
    <span className="inline-flex items-center" aria-label="avtomobilebi.ge" role="img">
      <span className="inline-flex flex-col" style={{ gap: size * 0.05 }}>
        <span
          className={`font-extrabold leading-none ${dark ? "text-white" : "text-ink"}`}
          style={{ fontSize: size, letterSpacing: size * -0.025 }}
        >
          avtomobilebi
        </span>
        <svg aria-hidden="true" width="100%" height={Math.round(size * 0.4)} viewBox="0 0 230 16" preserveAspectRatio="none">
          <path
            d="M4 10 C60 2 150 2 222 10"
            fill="none"
            stroke="#f5b800"
            strokeWidth={Math.max(3, Math.round(size * 0.15))}
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
      </span>
      <span
        aria-hidden="true"
        className="rounded-full"
        style={{
          width: size * 0.28,
          height: size * 0.28,
          marginLeft: size * 0.1,
          marginTop: size * 0.75,
          background: dark ? "#c4a8f5" : "#6a1bd1",
        }}
      />
    </span>
  );
}
