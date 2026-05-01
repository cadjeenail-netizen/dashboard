/* Icons.jsx — small SVG icon set, 1.5px stroke, currentColor */
const Icon = ({ name, size = 18 }) => {
  const stroke = { stroke: "currentColor", strokeWidth: 1.6, strokeLinecap: "round", strokeLinejoin: "round", fill: "none" };
  const paths = {
    home: <><path d="M3 11l9-8 9 8" {...stroke} /><path d="M5 10v10h14V10" {...stroke} /></>,
    health: <><path d="M12 21s-7-4.5-7-10a4 4 0 017-2.6A4 4 0 0119 11c0 5.5-7 10-7 10z" {...stroke} /></>,
    productivity: <><rect x="3" y="4" width="18" height="16" rx="2" {...stroke} /><path d="M8 9h8M8 13h8M8 17h5" {...stroke} /></>,
    finances: <><path d="M3 7h18M3 7l2-3h14l2 3M3 7v12a1 1 0 001 1h16a1 1 0 001-1V7" {...stroke} /><circle cx="12" cy="14" r="2.5" {...stroke} /></>,
    agenda: <><rect x="3" y="5" width="18" height="16" rx="2" {...stroke} /><path d="M3 10h18M8 3v4M16 3v4" {...stroke} /></>,
    weather: <><path d="M7 17a4 4 0 010-8 5 5 0 019.6-1A4 4 0 0117 17H7z" {...stroke} /></>,
    insights: <><path d="M3 19h18M6 16V9M11 16V5M16 16v-4M21 16v-7" {...stroke} /></>,
    journal: <><path d="M5 4h11l3 3v13a1 1 0 01-1 1H5z" {...stroke} /><path d="M9 9h6M9 13h6M9 17h4" {...stroke} /></>,
    settings: <><circle cx="12" cy="12" r="3" {...stroke} /><path d="M19.4 14.3a1.5 1.5 0 00.3 1.7l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.5 1.5 0 00-1.7-.3 1.5 1.5 0 00-.9 1.4V20a2 2 0 11-4 0v-.1a1.5 1.5 0 00-1-1.4 1.5 1.5 0 00-1.7.3l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.5 1.5 0 00.3-1.7 1.5 1.5 0 00-1.4-.9H4a2 2 0 110-4h.1a1.5 1.5 0 001.4-1 1.5 1.5 0 00-.3-1.7l-.1-.1a2 2 0 112.8-2.8l.1.1a1.5 1.5 0 001.7.3H10a1.5 1.5 0 00.9-1.4V4a2 2 0 114 0v.1a1.5 1.5 0 00.9 1.4 1.5 1.5 0 001.7-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.5 1.5 0 00-.3 1.7V10a1.5 1.5 0 001.4.9H20a2 2 0 110 4h-.1a1.5 1.5 0 00-1.4.9z" {...stroke} /></>,
    search: <><circle cx="11" cy="11" r="7" {...stroke} /><path d="M20 20l-3.5-3.5" {...stroke} /></>,
    bell: <><path d="M6 8a6 6 0 0112 0c0 7 3 9 3 9H3s3-2 3-9" {...stroke} /><path d="M10 21a2 2 0 004 0" {...stroke} /></>,
    sun: <><circle cx="12" cy="12" r="4" {...stroke} /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" {...stroke} /></>,
    moon: <><path d="M21 12.8A9 9 0 1111.2 3a7 7 0 009.8 9.8z" {...stroke} /></>,
    plus: <><path d="M12 5v14M5 12h14" {...stroke} /></>,
    check: <><path d="M5 12l5 5L20 7" {...stroke} /></>,
    shuffle: <><path d="M16 3h5v5M4 20l17-17M4 4l5 5M21 16v5h-5M15 15l6 6" {...stroke} /></>,
    chevronDown: <><path d="M6 9l6 6 6-6" {...stroke} /></>,
    flag: <><path d="M5 21V4M5 16h11l-2-3 2-3H5" {...stroke} /></>,
    target: <><circle cx="12" cy="12" r="9" {...stroke} /><circle cx="12" cy="12" r="5" {...stroke} /><circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none" /></>,
    clipboard: <><rect x="6" y="4" width="12" height="18" rx="2" {...stroke} /><rect x="9" y="2" width="6" height="4" rx="1" {...stroke} /></>,
    edit: <><path d="M4 20h4l11-11-4-4L4 16zM14 6l4 4" {...stroke} /></>,
    trash: <><path d="M4 7h16M9 7V4h6v3M6 7l1 13a2 2 0 002 2h6a2 2 0 002-2l1-13" {...stroke} /></>,
    sparkle: <><path d="M12 3l1.5 5L19 9.5 13.5 11 12 16l-1.5-5L5 9.5 10.5 8z" {...stroke} /></>,
  };
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" style={{ display: "block" }}>
      {paths[name] || null}
    </svg>
  );
};

window.Icon = Icon;
