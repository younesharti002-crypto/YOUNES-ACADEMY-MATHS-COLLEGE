export function ElectronOrbit({
  className = "",
  animated = false,
}: {
  className?: string;
  animated?: boolean;
}) {
  return (
    <svg
      viewBox="0 0 240 240"
      role="presentation"
      aria-hidden="true"
      focusable="false"
      className={className}
    >
      <defs>
        <radialGradient id="orbit-core" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#ffb27a" />
          <stop offset="100%" stopColor="#f2792b" />
        </radialGradient>
      </defs>

      <g className={animated ? "orbit-slow" : undefined} style={{ transformOrigin: "120px 120px" }}>
        <g
          fill="none"
          stroke="rgba(244,241,232,0.26)"
          strokeWidth="1"
          transform="translate(120 120)"
        >
          <ellipse rx="112" ry="44" />
          <ellipse rx="112" ry="44" transform="rotate(60)" />
          <ellipse rx="112" ry="44" transform="rotate(120)" />
        </g>

        <circle cx="232" cy="120" r="4.5" fill="#a78bfa" />
        <circle cx="64" cy="26" r="4" fill="#f4f1e8" opacity="0.8" />
        <circle cx="64" cy="214" r="4" fill="#f2792b" opacity="0.9" />
      </g>

      <circle cx="120" cy="120" r="11" fill="url(#orbit-core)" opacity="0.9" />
    </svg>
  );
}
