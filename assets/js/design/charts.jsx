/* Charts.jsx — animated SVG charts */

const useDims = (ref) => {
  const [d, setD] = React.useState({ w: 400, h: 160 });
  React.useEffect(() => {
    if (!ref.current) return;
    let raf;
    const ro = new ResizeObserver(([e]) => {
      /* Debounce via rAF : une seule mise à jour par frame */
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const r = e.contentRect;
        const w = Math.max(80, Math.floor(r.width));
        const h = Math.max(60, Math.floor(r.height));
        /* Ne setState QUE si les dimensions ont vraiment changé
           (évite les re-renders → re-animation des barres) */
        setD(prev => (prev.w === w && prev.h === h) ? prev : { w, h });
      });
    });
    ro.observe(ref.current);
    return () => { ro.disconnect(); cancelAnimationFrame(raf); };
  }, []);
  return d;
};

/* === BarChart === */
const BarChart = ({ data, accent = "var(--accent)", accent2 = "var(--blue)", labels, fmt = (v) => v, max, target }) => {
  const ref = React.useRef(null);
  const { w, h } = useDims(ref);
  const [hover, setHover] = React.useState(null);
  const id = React.useId();

  const padL = 32, padR = 12, padT = 14, padB = 24;
  const innerW = w - padL - padR;
  const innerH = h - padT - padB;
  const mx = max || Math.max(...data, 1);
  const niceMax = Math.ceil(mx * 1.15 / 4) * 4 || mx * 1.15;
  const barW = Math.min(innerW / data.length * 0.62, 36);
  const step = innerW / data.length;
  const yLines = 4;
  const maxIdx = data.indexOf(Math.max(...data));

  return (
    <div ref={ref} style={{ position: "relative", width: "100%", height: "100%" }}>
      <svg width={w} height={h} style={{ overflow: "visible" }}>
        <defs>
          <linearGradient id={`bg-${id}`} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor={accent} stopOpacity="1" />
            <stop offset="100%" stopColor={accent} stopOpacity="0.55" />
          </linearGradient>
          <linearGradient id={`bg2-${id}`} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor={accent2} stopOpacity="1" />
            <stop offset="100%" stopColor={accent2} stopOpacity="0.55" />
          </linearGradient>
          <linearGradient id={`bgmax-${id}`} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor={accent} stopOpacity="1" />
            <stop offset="100%" stopColor={accent2} stopOpacity="0.7" />
          </linearGradient>
          <filter id={`glow-${id}`} x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>
        {Array.from({ length: yLines + 1 }).map((_, i) => {
          const y = padT + (innerH / yLines) * i;
          const v = niceMax - (niceMax / yLines) * i;
          return (
            <g key={i}>
              <line x1={padL} y1={y} x2={w - padR} y2={y} className="gridline" strokeDasharray={i === yLines ? "0" : "2 4"} />
              <text x={padL - 8} y={y + 3} textAnchor="end" className="axis-label">{fmt(Math.round(v))}</text>
            </g>
          );
        })}
        {target && (() => {
          const ty = padT + innerH - (target / niceMax) * innerH;
          return (
            <g>
              <line x1={padL} y1={ty} x2={w - padR} y2={ty} stroke="var(--text-3)" strokeWidth="1" strokeDasharray="4 3" opacity="0.7" />
              <text x={w - padR} y={ty - 4} textAnchor="end" className="axis-label" style={{ fill: "var(--text-3)", fontWeight: 600 }}>obj. {fmt(target)}</text>
            </g>
          );
        })()}
        {data.map((v, i) => {
          const bh = (v / niceMax) * innerH;
          const x = padL + step * i + (step - barW) / 2;
          const y = padT + innerH - bh;
          const isMax = i === maxIdx;
          const fill = isMax ? `url(#bgmax-${id})` : (i % 2 ? `url(#bg2-${id})` : `url(#bg-${id})`);
          const isHover = hover?.i === i;
          return (
            <g key={i} style={{ cursor: "pointer" }}>
              <rect x={x - 1} y={y + 2} width={barW + 2} height={Math.max(bh, 2)} rx={7}
                fill={isMax ? accent : (i % 2 ? accent2 : accent)} opacity="0.18" filter={`url(#glow-${id})`} />
              <rect
                className="bar"
                x={x} y={y}
                width={barW} height={Math.max(bh, 2)}
                rx={7}
                fill={fill}
                style={{ animationDelay: `${i * 60}ms`, transition: "transform 0.15s, filter 0.15s", transformOrigin: `${x + barW/2}px ${y + bh}px`, transform: isHover ? "scaleY(1.04)" : "scaleY(1)" }}
                onMouseEnter={() => setHover({ i, v, x: x + barW / 2, y })}
                onMouseLeave={() => setHover(null)}
              />
              <rect x={x} y={y} width={barW} height={Math.min(8, bh)} rx={7}
                fill="white" opacity="0.22" pointerEvents="none" />
              {isMax && (
                <text x={x + barW / 2} y={y - 6} textAnchor="middle"
                  style={{ fontSize: 10, fontWeight: 700, fill: accent, fontFamily: "Geist Mono, monospace" }}>
                  {fmt(v)}
                </text>
              )}
            </g>
          );
        })}
        {labels && labels.map((l, i) => (
          <text key={i} x={padL + step * i + step / 2} y={h - 7} textAnchor="middle"
            className="axis-label" style={{ fontWeight: i === maxIdx ? 700 : 500, fill: i === maxIdx ? "var(--text)" : undefined }}>{l}</text>
        ))}
      </svg>
      {hover && (
        <div className="chart-tip show" style={{ left: hover.x, top: hover.y }}>
          {fmt(hover.v)}
        </div>
      )}
    </div>
  );
};

/* === LineArea (small multi-line / area chart) === */
const LineArea = ({ data, color = "var(--accent)", fmt = (v) => v, gridY = 4, smooth = true, dots = false, suffix = "", showMinMax = true }) => {
  const ref = React.useRef(null);
  const { w, h } = useDims(ref);
  const padL = 32, padR = 14, padT = 14, padB = 22;
  const innerW = w - padL - padR;
  const innerH = h - padT - padB;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const niceMin = Math.floor(min - range * 0.1);
  const niceMax = Math.ceil(max + range * 0.1);
  const niceRange = niceMax - niceMin;
  const xs = data.map((_, i) => padL + (innerW * i) / (data.length - 1 || 1));
  const ys = data.map(v => padT + innerH - ((v - niceMin) / niceRange) * innerH);

  const linePath = smooth
    ? xs.reduce((acc, x, i) => {
        if (i === 0) return `M ${x} ${ys[i]}`;
        const cx = (xs[i - 1] + x) / 2;
        return `${acc} C ${cx} ${ys[i - 1]} ${cx} ${ys[i]} ${x} ${ys[i]}`;
      }, "")
    : xs.map((x, i) => `${i === 0 ? "M" : "L"} ${x} ${ys[i]}`).join(" ");
  const areaPath = `${linePath} L ${xs[xs.length - 1]} ${padT + innerH} L ${xs[0]} ${padT + innerH} Z`;

  const id = React.useId();
  const [hover, setHover] = React.useState(null);

  return (
    <div ref={ref} style={{ position: "relative", width: "100%", height: "100%" }}>
      <svg width={w} height={h} style={{ overflow: "visible" }}>
        <defs>
          <linearGradient id={`grad-${id}`} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.45" />
            <stop offset="60%" stopColor={color} stopOpacity="0.12" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
          <filter id={`lineGlow-${id}`} x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="2.5" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>
        {Array.from({ length: gridY + 1 }).map((_, i) => {
          const y = padT + (innerH / gridY) * i;
          const v = niceMax - (niceRange / gridY) * i;
          return (
            <g key={i}>
              <line x1={padL} y1={y} x2={w - padR} y2={y} className="gridline" strokeDasharray={i === gridY ? "0" : "2 4"} />
              <text x={padL - 8} y={y + 3} textAnchor="end" className="axis-label">{fmt(Math.round(v))}</text>
            </g>
          );
        })}
        <path className="area-path" d={areaPath} fill={`url(#grad-${id})`} />
        <path
          className="line-path" d={linePath} fill="none" stroke={color}
          strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"
          filter={`url(#lineGlow-${id})`}
          style={{ "--len": 2000 }}
        />
        {dots && xs.map((x, i) => (
          <circle key={i} cx={x} cy={ys[i]} r={3.2} fill="var(--surface)" stroke={color} strokeWidth={1.6}
            style={{ opacity: 0, animation: `fadeUp 0.3s ease ${0.7 + i * 0.05}s forwards` }} />
        ))}
        {showMinMax && (() => {
          const minI = data.indexOf(Math.min(...data));
          const maxI = data.indexOf(Math.max(...data));
          return (
            <g>
              <circle cx={xs[maxI]} cy={ys[maxI]} r={4} fill={color} stroke="var(--surface)" strokeWidth="2" />
              <text x={xs[maxI]} y={ys[maxI] - 8} textAnchor="middle"
                style={{ fontSize: 9.5, fontWeight: 700, fill: color, fontFamily: "Geist Mono, monospace" }}>
                ↑ {fmt(data[maxI])}
              </text>
              <circle cx={xs[minI]} cy={ys[minI]} r={3} fill="var(--surface)" stroke={color} strokeWidth="1.5" />
            </g>
          );
        })()}
        {xs.map((x, i) => (
          <rect key={i} x={x - 8} y={padT} width={16} height={innerH} fill="transparent"
            onMouseEnter={() => setHover({ i, v: data[i], x, y: ys[i] })}
            onMouseLeave={() => setHover(null)} style={{ cursor: "crosshair" }} />
        ))}
        {hover && (
          <g>
            <line x1={hover.x} y1={padT} x2={hover.x} y2={padT + innerH} stroke={color} strokeWidth="1" strokeDasharray="3 3" opacity="0.5" />
            <circle cx={hover.x} cy={hover.y} r={5} fill={color} stroke="var(--surface)" strokeWidth={2} />
          </g>
        )}
      </svg>
      {hover && (
        <div className="chart-tip show" style={{ left: hover.x, top: hover.y }}>
          {fmt(hover.v)}{suffix}
        </div>
      )}
    </div>
  );
};

/* === GroupedBar (revenus vs dépenses) === */
const GroupedBar = ({ months, income, expense, fmt = (v) => v }) => {
  const ref = React.useRef(null);
  const { w, h } = useDims(ref);
  const id = React.useId();
  const padL = 36, padR = 12, padT = 14, padB = 24;
  const innerW = w - padL - padR;
  const innerH = h - padT - padB;
  const max = Math.max(...income, ...expense);
  const niceMax = Math.ceil(max * 1.15 / 500) * 500;
  const step = innerW / months.length;
  const groupW = step * 0.7;
  const barW = groupW / 2 - 3;
  const yLines = 4;
  const [hover, setHover] = React.useState(null);

  return (
    <div ref={ref} style={{ position: "relative", width: "100%", height: "100%" }}>
      <svg width={w} height={h} style={{ overflow: "visible" }}>
        <defs>
          <linearGradient id={`gIn-${id}`} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="var(--green)" stopOpacity="1" />
            <stop offset="100%" stopColor="var(--green)" stopOpacity="0.5" />
          </linearGradient>
          <linearGradient id={`gOut-${id}`} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="var(--red)" stopOpacity="1" />
            <stop offset="100%" stopColor="var(--red)" stopOpacity="0.5" />
          </linearGradient>
        </defs>
        {Array.from({ length: yLines + 1 }).map((_, i) => {
          const y = padT + (innerH / yLines) * i;
          const v = niceMax - (niceMax / yLines) * i;
          return (
            <g key={i}>
              <line x1={padL} y1={y} x2={w - padR} y2={y} className="gridline" strokeDasharray={i === yLines ? "0" : "2 4"} />
              <text x={padL - 8} y={y + 3} textAnchor="end" className="axis-label">{fmt(v)}</text>
            </g>
          );
        })}
        {months.map((m, i) => {
          const cx = padL + step * i + step / 2;
          const xa = cx - groupW / 2;
          const xb = cx + 3;
          const ha = (income[i] / niceMax) * innerH;
          const hb = (expense[i] / niceMax) * innerH;
          const ya = padT + innerH - ha;
          const yb = padT + innerH - hb;
          const isHover = hover?.i === i;
          return (
            <g key={i}>
              <rect className="bar" x={xa} y={ya} width={barW} height={Math.max(ha, 2)} rx={5} fill={`url(#gIn-${id})`}
                style={{ animationDelay: `${i * 50}ms`, transition: "filter 0.15s", filter: isHover ? "brightness(1.15)" : "none" }}
                onMouseEnter={() => setHover({ i, x: cx, y: Math.min(ya, yb), m, inc: income[i], exp: expense[i] })}
                onMouseLeave={() => setHover(null)} />
              <rect x={xa} y={ya} width={barW} height={Math.min(6, ha)} rx={5} fill="white" opacity="0.25" pointerEvents="none" />
              <rect className="bar" x={xb} y={yb} width={barW} height={Math.max(hb, 2)} rx={5} fill={`url(#gOut-${id})`}
                style={{ animationDelay: `${i * 50 + 30}ms`, transition: "filter 0.15s", filter: isHover ? "brightness(1.15)" : "none" }}
                onMouseEnter={() => setHover({ i, x: cx, y: Math.min(ya, yb), m, inc: income[i], exp: expense[i] })}
                onMouseLeave={() => setHover(null)} />
              <rect x={xb} y={yb} width={barW} height={Math.min(6, hb)} rx={5} fill="white" opacity="0.25" pointerEvents="none" />
              <text x={cx} y={h - 7} textAnchor="middle" className="axis-label" style={{ fontWeight: i === months.length - 1 ? 700 : 500, fill: i === months.length - 1 ? "var(--text)" : undefined }}>{m}</text>
            </g>
          );
        })}
      </svg>
      {hover && (
        <div className="chart-tip show" style={{ left: hover.x, top: hover.y, whiteSpace: "nowrap" }}>
          {hover.m} · <span style={{ color: "var(--green)" }}>+{fmt(hover.inc)}</span> / <span style={{ color: "var(--red)" }}>−{fmt(hover.exp)}</span>
        </div>
      )}
    </div>
  );
};

window.BarChart = BarChart;
window.LineArea = LineArea;
window.GroupedBar = GroupedBar;
