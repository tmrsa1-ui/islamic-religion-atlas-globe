// Static earth plate: pure SVG, shown before the globe loads and on devices without 3D support.
export default function EarthPlate() {
  const lat = [-60, -30, 0, 30, 60];
  const lon = [0, 30, 60, 90, 120, 150];
  return (
    <svg viewBox="0 0 200 200" className="h-[min(64vmin,440px)] w-[min(64vmin,440px)]" aria-hidden="true" focusable="false">
      <defs>
        <radialGradient id="plate" cx="38%" cy="34%" r="72%">
          <stop offset="0" style={{ stopColor: "var(--land-wash)" }} />
          <stop offset="1" style={{ stopColor: "var(--ocean)" }} />
        </radialGradient>
      </defs>
      <circle cx="100" cy="100" r="92" fill="url(#plate)" style={{ stroke: "var(--copper-glow)" }} strokeOpacity=".5" strokeWidth=".8" />
      <g fill="none" style={{ stroke: "var(--limestone)" }} strokeOpacity=".12" strokeWidth=".6">
        {lat.map((d) => {
          const y = 100 - 92 * Math.sin((d * Math.PI) / 180);
          const rx = 92 * Math.cos((d * Math.PI) / 180);
          return <ellipse key={`a${d}`} cx="100" cy={y} rx={rx} ry={rx * 0.12} />;
        })}
        {lon.map((d) => (
          <ellipse key={`o${d}`} cx="100" cy="100" rx={Math.abs(92 * Math.cos((d * Math.PI) / 180))} ry="92" />
        ))}
      </g>
      <g style={{ fill: "var(--copper-glow)" }}>
        <circle cx="86" cy="62" r="2" /><circle cx="104" cy="96" r="2" /><circle cx="140" cy="86" r="2" />
        <circle cx="152" cy="108" r="2" /><circle cx="96" cy="112" r="2" /><circle cx="58" cy="128" r="2" />
      </g>
    </svg>
  );
}
