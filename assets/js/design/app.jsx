/* App.jsx — Nebula Dashboard (adapté : modules vanilla via window.Nebula) */

const TWEAK_DEFAULTS = {
  "theme": "light",
  "accent": "violet",
  "density": "comfortable",
  "showQuote": true,
  "showSearch": true
};

/* ── Override useTweaks : persiste via storage.js (préfixe dashboard_vie_) ── */
function useTweaks(defaults) {
  const [values, setValues] = React.useState(() => {
    const saved = window.Nebula?.storage?.get('tweaks', null);
    return saved ? { ...defaults, ...saved } : defaults;
  });
  const setTweak = React.useCallback((keyOrEdits, val) => {
    const edits = typeof keyOrEdits === 'object' && keyOrEdits !== null
      ? keyOrEdits : { [keyOrEdits]: val };
    setValues(prev => {
      const next = { ...prev, ...edits };
      window.Nebula?.storage?.set('tweaks', next);
      return next;
    });
  }, []);
  return [values, setTweak];
}

/* ── Hook Withings réel ── */
function useWithings(days = 7) {
  const [state, setState] = React.useState({
    connected: false, loading: true, error: null,
    steps: [], sleep: [], measures: { weight: [], heartrate: [] }, hrHourly: [], todaySteps: 0,
  });
  const reload = React.useCallback(async () => {
    const W = window.Nebula?.withings;
    if (!W) return;
    if (!W.isConnected()) {
      setState(s => ({ ...s, connected: false, loading: false }));
      return;
    }
    setState(s => ({ ...s, connected: true, loading: true, error: null }));
    try {
      const [steps, sleep, measures, hrHourly, todaySteps] = await Promise.all([
        W.getStepsHistory(days).catch(() => []),
        W.getSleepHistory(days).catch(() => []),
        W.getMeasures(30).catch(() => ({ weight: [], heartrate: [] })),
        W.getTodayHRHourly().catch(() => []),
        W.getTodaySteps().catch(() => 0),
      ]);
      setState({ connected: true, loading: false, error: null, steps, sleep, measures, hrHourly, todaySteps });
    } catch (e) {
      setState(s => ({ ...s, loading: false, error: e.message }));
    }
  }, [days]);
  React.useEffect(() => {
    reload();
    const onSync = () => reload();
    window.addEventListener('withings-sync', onSync);
    window.addEventListener('withings-connected', onSync);
    return () => {
      window.removeEventListener('withings-sync', onSync);
      window.removeEventListener('withings-connected', onSync);
    };
  }, [reload]);
  return { ...state, reload };
}

const ACCENTS = {
  violet: { a: "#7c5cff", a2: "#a48bff", soft: "#ece6ff", aDark: "#9d83ff", a2Dark: "#b8a4ff", softDark: "rgba(157, 131, 255, 0.18)" },
  ocean:  { a: "#3aaed8", a2: "#7ad0ec", soft: "#dbf0f9", aDark: "#6dd5f4", a2Dark: "#9be0f7", softDark: "rgba(109, 213, 244, 0.18)" },
  rose:   { a: "#e94e7d", a2: "#ff8cb1", soft: "#ffdde9", aDark: "#ff7290", a2Dark: "#ffa3bb", softDark: "rgba(255, 114, 144, 0.18)" },
  emerald:{ a: "#15a86b", a2: "#5cd29a", soft: "#d4f3e2", aDark: "#4ade80", a2Dark: "#86e8a8", softDark: "rgba(74, 222, 128, 0.18)" },
};

const useNow = () => {
  const [now, setNow] = React.useState(new Date());
  React.useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  return now;
};

const fmtTime = (d) => `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}:${String(d.getSeconds()).padStart(2, "0")}`;
const eur = (v) => `${v.toLocaleString("fr-FR")} €`;

/* === Sidebar === */
const Sidebar = ({ active, setActive, theme, toggleTheme }) => {
  const items = [
    { section: "Tableau de bord" },
    { id: "home", label: "Accueil", icon: "home" },
    { id: "health", label: "Santé", icon: "health", badge: "Sync" },
    { id: "productivity", label: "Productivité", icon: "productivity" },
    { id: "finances", label: "Finances", icon: "finances" },
    { id: "agenda", label: "Agenda", icon: "agenda", badge: "3" },
    { section: "Outils" },
    { id: "insights", label: "Insights", icon: "insights" },
    { id: "settings", label: "Paramètres", icon: "settings" },
  ];
  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-mark"></div>
        <div>
          <div className="brand-name">Nebula</div>
          <div className="brand-sub">Personal OS</div>
        </div>
      </div>
      {items.map((it, i) =>
        it.section ? (
          <div className="nav-section" key={i}>{it.section}</div>
        ) : (
          <div
            key={it.id}
            className={`nav-item ${active === it.id ? "active" : ""}`}
            onClick={() => setActive(it.id)}
          >
            <span className="icon"><Icon name={it.icon} size={17} /></span>
            <span>{it.label}</span>
            {it.badge && <span className="badge">{it.badge}</span>}
          </div>
        )
      )}
      <div className="sidebar-foot">
        <div className="avatar">N</div>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div className="user-name">Noé Lambert</div>
          <div className="user-mail">noe@nebula.app</div>
        </div>
        <button className="theme-toggle" onClick={toggleTheme} title="Mode sombre">
          <Icon name={theme === "dark" ? "sun" : "moon"} size={15} />
        </button>
      </div>
    </aside>
  );
};

/* === Topbar === */
const VIEW_TITLES = {
  home: { t: "Bon après-midi, Noé", s: "Tu es au meilleur de ta forme." },
  health: { t: "Santé · Vue détaillée", s: "Tes métriques santé, sommeil et activité." },
  productivity: { t: "Productivité", s: "Habitudes, objectifs et tâches en un coup d'œil." },
  finances: { t: "Finances", s: "Revenus, dépenses et solde du mois." },
  agenda: { t: "Agenda", s: "Tes événements et rendez-vous." },
  insights: { t: "Insights", s: "Analyses et corrélations." },
  journal: { t: "Journal", s: "Notes et réflexions du jour." },
  settings: { t: "Paramètres", s: "Préférences et comptes connectés." },
};
const SEARCH_ITEMS = [
  { id: "home", label: "Accueil", desc: "Tableau de bord principal", icon: "home" },
  { id: "health", label: "Santé", desc: "Pas, sommeil, FC, poids", icon: "health" },
  { id: "productivity", label: "Productivité", desc: "Habitudes, objectifs, tâches", icon: "productivity" },
  { id: "finances", label: "Finances", desc: "Revenus, dépenses, solde", icon: "finances" },
  { id: "agenda", label: "Agenda", desc: "Événements du jour", icon: "agenda" },
  { id: "insights", label: "Insights", desc: "Analyses et corrélations", icon: "insights" },
  { id: "settings", label: "Paramètres", desc: "Préférences", icon: "settings" },
];
const Topbar = ({ tw, active = "home", setActive }) => {
  const now = useNow();
  const days = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];
  const months = ["jan", "fév", "mar", "avr", "mai", "jui", "jui", "aoû", "sep", "oct", "nov", "déc"];
  const v = VIEW_TITLES[active] || VIEW_TITLES.home;

  const [searchOpen, setSearchOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [notifOpen, setNotifOpen] = React.useState(false);
  const [settingsOpen, setSettingsOpen] = React.useState(false);
  const inputRef = React.useRef(null);

  React.useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setSearchOpen(true);
        setTimeout(() => inputRef.current?.focus(), 50);
      }
      if (e.key === "Escape") { setSearchOpen(false); setNotifOpen(false); setSettingsOpen(false); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const filtered = SEARCH_ITEMS.filter(it =>
    !query || it.label.toLowerCase().includes(query.toLowerCase()) || it.desc.toLowerCase().includes(query.toLowerCase())
  );
  const go = (id) => { setActive(id); setSearchOpen(false); setQuery(""); };

  const notifications = [
    { t: "Course longue", d: "Dans 6 minutes · 16:30", color: "var(--green)" },
    { t: "Objectif épargne", d: "+200 € ce mois", color: "var(--accent)" },
    { t: "Nouveau record", d: "16 304 pas aujourd'hui 🎉", color: "var(--blue)" },
  ];

  return (
    <div className="topbar">
      <div className="greet">
        <h1>{v.t}</h1>
        <p>{days[now.getDay()]} {now.getDate()} {months[now.getMonth()]} {now.getFullYear()} · {v.s}</p>
      </div>
      <div className="top-spacer" />
      {tw.showSearch && (
        <div className="search" onClick={() => { setSearchOpen(true); setTimeout(() => inputRef.current?.focus(), 50); }} style={{ cursor: "pointer" }}>
          <Icon name="search" size={14} />
          <span>Rechercher…</span>
          <kbd>⌘K</kbd>
        </div>
      )}
      <div style={{ position: "relative" }}>
        <button className="icon-btn" title="Notifications" onClick={() => { setNotifOpen(o => !o); setSettingsOpen(false); }}>
          <Icon name="bell" size={16} /><span className="dot" />
        </button>
        {notifOpen && (
          <div style={{ position: "absolute", top: 44, right: 0, width: 280, background: "var(--surface)", border: "1px solid var(--border-strong)", borderRadius: 12, boxShadow: "var(--shadow-lg)", padding: 8, zIndex: 50 }}>
            <div style={{ fontSize: 10.5, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--text-3)", fontWeight: 600, padding: "4px 8px 6px" }}>Notifications</div>
            {notifications.map((n, i) => (
              <div key={i} style={{ display: "flex", gap: 9, padding: 8, borderRadius: 8, cursor: "pointer" }} onMouseEnter={(e) => e.currentTarget.style.background = "var(--surface-2)"} onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}>
                <div style={{ width: 6, borderRadius: 3, background: n.color, flexShrink: 0 }} />
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 12.5, fontWeight: 600 }}>{n.t}</div>
                  <div style={{ fontSize: 11, color: "var(--text-3)", marginTop: 1 }}>{n.d}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      <div style={{ position: "relative" }}>
        <button className="icon-btn" title="Paramètres rapides" onClick={() => { setSettingsOpen(o => !o); setNotifOpen(false); }}>
          <Icon name="settings" size={16} />
        </button>
        {settingsOpen && (
          <div style={{ position: "absolute", top: 44, right: 0, width: 220, background: "var(--surface)", border: "1px solid var(--border-strong)", borderRadius: 12, boxShadow: "var(--shadow-lg)", padding: 8, zIndex: 50 }}>
            <div style={{ fontSize: 10.5, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--text-3)", fontWeight: 600, padding: "4px 8px 6px" }}>Paramètres rapides</div>
            <div onClick={() => { go("settings"); setSettingsOpen(false); }} style={{ display: "flex", alignItems: "center", gap: 9, padding: 8, borderRadius: 8, cursor: "pointer", fontSize: 12.5 }} onMouseEnter={(e) => e.currentTarget.style.background = "var(--surface-2)"} onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}>
              <Icon name="settings" size={14} /> Tous les paramètres
            </div>
            <div onClick={() => setSettingsOpen(false)} style={{ display: "flex", alignItems: "center", gap: 9, padding: 8, borderRadius: 8, cursor: "pointer", fontSize: 12.5 }} onMouseEnter={(e) => e.currentTarget.style.background = "var(--surface-2)"} onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}>
              <Icon name="bell" size={14} /> Notifications
            </div>
            <div onClick={() => setSettingsOpen(false)} style={{ display: "flex", alignItems: "center", gap: 9, padding: 8, borderRadius: 8, cursor: "pointer", fontSize: 12.5 }} onMouseEnter={(e) => e.currentTarget.style.background = "var(--surface-2)"} onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}>
              <Icon name="sparkle" size={14} /> Aide & raccourcis
            </div>
          </div>
        )}
      </div>
      <div className="clock">{fmtTime(now)}</div>

      {searchOpen && (
        <div onClick={() => setSearchOpen(false)} style={{ position: "fixed", inset: 0, background: "rgba(10,8,30,0.45)", backdropFilter: "blur(4px)", zIndex: 100, display: "flex", justifyContent: "center", paddingTop: "12vh" }}>
          <div onClick={(e) => e.stopPropagation()} style={{ width: 520, maxWidth: "90vw", background: "var(--surface)", border: "1px solid var(--border-strong)", borderRadius: 14, boxShadow: "var(--shadow-lg)", overflow: "hidden", height: "fit-content" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "14px 16px", borderBottom: "1px solid var(--border)" }}>
              <Icon name="search" size={16} />
              <input ref={inputRef} value={query} onChange={(e) => setQuery(e.target.value)}
                placeholder="Rechercher une section, une habitude, un fichier…"
                style={{ flex: 1, background: "transparent", border: 0, outline: "none", fontSize: 14, color: "var(--text)", fontFamily: "inherit" }} />
              <kbd style={{ fontSize: 10, padding: "2px 6px", borderRadius: 5, background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--text-3)", fontFamily: "Geist Mono, monospace" }}>Esc</kbd>
            </div>
            <div style={{ padding: 8, maxHeight: 360, overflowY: "auto" }}>
              <div style={{ fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--text-3)", fontWeight: 600, padding: "6px 10px" }}>Sections</div>
              {filtered.length === 0 && (
                <div style={{ padding: 16, textAlign: "center", color: "var(--text-3)", fontSize: 13 }}>Aucun résultat pour "{query}"</div>
              )}
              {filtered.map(it => (
                <div key={it.id} onClick={() => go(it.id)} style={{ display: "flex", alignItems: "center", gap: 11, padding: "9px 10px", borderRadius: 9, cursor: "pointer" }}
                  onMouseEnter={(e) => e.currentTarget.style.background = "var(--accent-soft)"}
                  onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}>
                  <div style={{ width: 28, height: 28, borderRadius: 7, background: "var(--surface-2)", border: "1px solid var(--border)", display: "grid", placeItems: "center", color: "var(--accent)", flexShrink: 0 }}>
                    <Icon name={it.icon} size={14} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{it.label}</div>
                    <div style={{ fontSize: 11, color: "var(--text-3)" }}>{it.desc}</div>
                  </div>
                  <kbd style={{ fontSize: 10, padding: "2px 6px", borderRadius: 5, background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--text-3)", fontFamily: "Geist Mono, monospace" }}>↵</kbd>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

/* === Welcome card === */
const Welcome = () => (
  <div className="card welcome">
    <div className="card-h">
      <span className="title section-label"><Icon name="sparkle" size={11} /> Bienvenue</span>
      <span className="spacer" />
      <span className="pill">Streak 12 j</span>
    </div>
    <div className="welcome-content">
      <div className="welcome-left">
        <div className="welcome-eyebrow">Aujourd'hui</div>
        <h2>4 tâches restantes, 2 habitudes à compléter.</h2>
        <p>Tu as déjà marché 16 304 pas — bien au-dessus de ta moyenne. Continue ainsi.</p>
      </div>
      <div className="score-circle" style={{ "--p": 72 }}>
        <div className="score-val">
          <b>72</b><span>SCORE</span>
        </div>
      </div>
    </div>
  </div>
);

/* === Weather === */
const Weather = () => {
  const [city, setCity] = React.useState("Le Tampon");
  const cities = ["Le Tampon", "Saint-Denis", "Saint-Pierre"];
  return (
    <div className="card weather">
      <div className="card-h">
        <span className="title section-label"><Icon name="weather" size={11} /> Météo</span>
        <span className="spacer" />
        <select
          value={city}
          onChange={(e) => setCity(e.target.value)}
          style={{ background: "var(--surface-2)", border: "1px solid var(--border-strong)", borderRadius: 7, padding: "3px 7px", fontSize: 11, color: "var(--text-2)", fontFamily: "inherit", outline: "none" }}
        >
          {cities.map(c => <option key={c}>{c}</option>)}
        </select>
      </div>
      <div className="weather-row">
        <div style={{ flex: 1 }}>
          <div className="weather-temp">21°</div>
          <div className="weather-desc">Partiellement nuageux</div>
        </div>
        <div className="weather-icon">⛅</div>
      </div>
      <div className="weather-stats">
        <div className="weather-stat"><div className="l">Ressenti</div><div className="v">22°</div></div>
        <div className="weather-stat"><div className="l">Humidité</div><div className="v">85%</div></div>
        <div className="weather-stat"><div className="l">Vent</div><div className="v">16</div></div>
        <div className="weather-stat"><div className="l">UV</div><div className="v">6</div></div>
      </div>
    </div>
  );
};

/* === Health === */
const Health = () => {
  const [chartTab, setChartTab] = React.useState("steps");
  const [range, setRange] = React.useState("7j");
  const rangeDays = { "7j": 7, "14j": 14, "30j": 30 }[range] || 7;
  const wd = useWithings(rangeDays);

  /* ── Mockdata fallback (si non connecté) ── */
  const mockSteps = [7820, 6530, 9210, 11400, 5230, 14700, 16304];
  const mockSleep = [7.2, 6.8, 7.5, 8.1, 7.0, 6.5, 7.6];
  const mockHR = [62, 58, 64, 72, 84, 98, 92, 86, 78, 74, 80, 88, 94, 90, 82, 76, 70, 66, 64, 68, 72, 78, 70, 64];

  /* ── Données réelles dérivées ── */
  const stepsData = wd.connected && wd.steps.length
    ? wd.steps.slice(-7).map(d => d.steps || 0)
    : mockSteps;
  const sleepHours = wd.connected && wd.sleep.length
    ? wd.sleep.slice(-7).map(s => {
        const total = (s.deepsleepduration || 0) + (s.lightsleepduration || 0) + (s.remsleepduration || 0);
        return Math.round((total / 3600) * 10) / 10;
      })
    : mockSleep;
  const hrData = wd.connected && wd.hrHourly.length
    ? wd.hrHourly.map(h => h.val).filter(v => v != null)
    : mockHR;
  const todaySteps = wd.connected ? wd.todaySteps : 16304;
  const avgSleep = sleepHours.length ? (sleepHours.reduce((a,b) => a+b, 0) / sleepHours.length).toFixed(1).replace('.', ',') : "7,4";
  const avgSteps = stepsData.length ? Math.round(stepsData.reduce((a,b) => a+b, 0) / stepsData.length) : 8743;
  const validHR = hrData.filter(v => v > 0);
  const avgHR = validHR.length ? Math.round(validHR.reduce((a,b) => a+b, 0) / validHR.length) : 76;
  const minHR = validHR.length ? Math.min(...validHR) : 58;
  const maxHR = validHR.length ? Math.max(...validHR) : 98;
  const lastWeight = wd.connected && wd.measures.weight.length
    ? wd.measures.weight[wd.measures.weight.length - 1].val : 78.6;

  /* ── Labels jours (derniers N jours) ── */
  const days = (() => {
    const labels = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];
    const out = [];
    const today = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today); d.setDate(d.getDate() - i);
      out.push(labels[d.getDay()]);
    }
    return out;
  })();

  return (
    <div className="card health">
      <div className="card-h">
        <span className="title section-label"><Icon name="health" size={11} /> Santé</span>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 5, marginLeft: 4 }}>
          <span className="connected-dot" style={{ background: wd.connected ? "var(--green)" : "var(--text-3)", boxShadow: wd.connected ? "0 0 0 3px var(--green-soft)" : "none" }} />
          <span style={{ fontSize: 10.5, color: wd.connected ? "var(--green)" : "var(--text-3)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>
            {wd.loading ? "Sync…" : wd.connected ? "Connecté" : "Non connecté"}
          </span>
        </span>
        <span className="spacer" />
        <div className="tabs">
          {["7j", "14j", "30j"].map(r => (
            <button key={r} className={`tab ${range === r ? "active" : ""}`} onClick={() => setRange(r)}>{r}</button>
          ))}
        </div>
      </div>

      <div className="metrics-row">
        <div className="metric steps">
          <div className="l">Pas aujourd'hui</div>
          <div className="v">{todaySteps.toLocaleString("fr-FR")}</div>
          <div className="delta">moy. {avgSteps.toLocaleString("fr-FR")}</div>
        </div>
        <div className="metric sleep">
          <div className="l">Sommeil moyen</div>
          <div className="v">{avgSleep}<small>h</small></div>
          <div className="delta">{sleepHours.length} nuit(s)</div>
        </div>
        <div className="metric hr">
          <div className="l">FC moyenne</div>
          <div className="v">{avgHR}<small>bpm</small></div>
          <div className="delta">min {minHR} / max {maxHR}</div>
        </div>
        <div className="metric weight">
          <div className="l">Poids</div>
          <div className="v">{typeof lastWeight === "number" ? lastWeight.toFixed(1).replace('.', ',') : lastWeight}<small>kg</small></div>
          <div className="delta">{wd.measures.weight.length} mesure(s)</div>
        </div>
        <div className="metric cal">
          <div className="l">Calories</div>
          <div className="v">2 184<small>kcal</small></div>
          <div className="delta">−210 kcal</div>
        </div>
      </div>

      <div className="charts-row">
        <div className="chart-card">
          <div style={{ display: "flex", alignItems: "flex-start" }}>
            <div>
              <div className="ch-title">{chartTab === "steps" ? "Pas par jour" : chartTab === "sleep" ? "Sommeil par nuit" : "Calories brûlées"}</div>
              <div className="ch-val">
                {chartTab === "steps" ? "8 743" : chartTab === "sleep" ? "7,4 h" : "2 184"}
                <small>moy. {range}</small>
              </div>
            </div>
            <div style={{ marginLeft: "auto" }} className="tabs">
              <button className={`tab ${chartTab === "steps" ? "active" : ""}`} onClick={() => setChartTab("steps")}>Pas</button>
              <button className={`tab ${chartTab === "sleep" ? "active" : ""}`} onClick={() => setChartTab("sleep")}>Sommeil</button>
              <button className={`tab ${chartTab === "cal" ? "active" : ""}`} onClick={() => setChartTab("cal")}>Cal.</button>
            </div>
          </div>
          <div className="chart-canvas" key={chartTab}>
            {chartTab === "steps"
              ? <BarChart data={stepsData} labels={days} target={10000} fmt={(v) => v >= 1000 ? `${(v/1000).toFixed(0)}k` : v} />
              : chartTab === "sleep"
              ? <BarChart data={sleepHours} labels={days} accent="var(--blue)" accent2="var(--accent)" target={8} fmt={(v) => `${v}h`} />
              : <BarChart data={[1980, 2240, 2410, 2680, 1850, 2920, 2184]} labels={days} accent="var(--amber)" accent2="var(--pink)" target={2400} fmt={(v) => `${(v/1000).toFixed(1)}k`} />
            }
          </div>
        </div>

        <div className="chart-card">
          <div className="ch-title">Fréquence cardiaque · {wd.connected && wd.hrHourly.length ? "aujourd'hui" : "24h"}</div>
          <div className="ch-val">{avgHR} <small>bpm · min {minHR} / max {maxHR}</small></div>
          <div className="chart-canvas">
            <LineArea data={hrData} color="var(--red)" gridY={3} fmt={(v) => v} suffix=" bpm" />
          </div>
        </div>
      </div>

      <div className="charts-row">
        <div className="chart-card">
          <div className="ch-title">Évolution du poids · 30j</div>
          <div className="ch-val">{typeof lastWeight === "number" ? lastWeight.toFixed(1).replace('.', ',') : lastWeight} <small>kg · {wd.measures.weight.length} mesures</small></div>
          <div className="chart-canvas">
            <LineArea data={wd.connected && wd.measures.weight.length >= 2 ? wd.measures.weight.map(w => w.val) : [80.2, 80.0, 79.9, 79.8, 79.7, 79.5, 79.4, 79.5, 79.3, 79.2, 79.0, 79.1, 78.9, 78.8, 78.9, 78.7, 78.8, 78.6, 78.5, 78.6, 78.4, 78.5, 78.6, 78.7, 78.5, 78.6, 78.4, 78.5, 78.6, 78.6]}
              color="var(--green)" gridY={3} fmt={(v) => v.toFixed(1)} suffix=" kg" />
          </div>
        </div>

        <div className="chart-card">
          <div className="ch-title">Phases de sommeil · cette nuit</div>
          <div className="ch-val">7,4 <small>h · 92% qualité</small></div>
          <div className="chart-canvas">
            <SleepStages />
          </div>
        </div>
      </div>
    </div>
  );
};

/* Sleep stages stacked bar */
const SleepStages = () => {
  const ref = React.useRef(null);
  const [d, setD] = React.useState({ w: 400, h: 140 });
  React.useEffect(() => {
    if (!ref.current) return;
    const ro = new ResizeObserver(([e]) => setD({ w: Math.max(80, e.contentRect.width), h: Math.max(60, e.contentRect.height) }));
    ro.observe(ref.current); return () => ro.disconnect();
  }, []);
  const { w, h } = d;
  const padL = 32, padR = 12, padT = 14, padB = 26;
  const innerW = w - padL - padR;
  const innerH = h - padT - padB;
  // 0=awake, 1=REM, 2=light, 3=deep — 24 segments over the night (~7.5h)
  const stages = [0,2,3,3,2,3,3,2,1,2,3,2,2,1,1,2,3,2,2,1,1,2,2,0];
  const colors = ["var(--amber)", "var(--pink)", "var(--blue)", "var(--accent)"];
  const labels = ["Éveil", "REM", "Léger", "Profond"];
  const segW = innerW / stages.length;
  const yFor = (s) => padT + (s / 3) * innerH;
  return (
    <div ref={ref} style={{ position: "relative", width: "100%", height: "100%" }}>
      <svg width={w} height={h} style={{ overflow: "visible" }}>
        {labels.map((l, i) => (
          <g key={i}>
            <line x1={padL} y1={padT + (i/3) * innerH} x2={w-padR} y2={padT + (i/3) * innerH} className="gridline" strokeDasharray="2 4" />
            <text x={padL - 8} y={padT + (i/3) * innerH + 3} textAnchor="end" className="axis-label">{l}</text>
          </g>
        ))}
        {stages.map((s, i) => {
          const x = padL + segW * i;
          const y = yFor(s);
          const barH = innerH - (y - padT) + 14;
          return (
            <rect key={i} x={x + 0.6} y={y} width={Math.max(segW - 1.2, 1)} height={Math.max(barH, 4)}
              fill={colors[s]} rx={2} opacity="0.85"
              style={{ animation: `barRise 0.4s ease ${i * 0.02}s backwards`, transformOrigin: `${x}px ${padT + innerH}px` }} />
          );
        })}
        {["22h", "0h", "2h", "4h", "6h"].map((t, i) => (
          <text key={i} x={padL + (innerW * i) / 4} y={h - 8} textAnchor="middle" className="axis-label">{t}</text>
        ))}
      </svg>
    </div>
  );
};

/* === Productivity (tabs: Habits / Goals / Tasks) === */
const Productivity = () => {
  const [tab, setTab] = React.useState("habits");
  const [editMode, setEditMode] = React.useState(false);

  const [habits, setHabits] = React.useState([
    { name: "Sport",     icon: "🏃",  color: "var(--accent)",  days: [1,1,0,1,1,0,1], streak: 4 },
    { name: "Lecture",   icon: "📖",  color: "var(--green)",   days: [1,1,1,0,1,1,1], streak: 6 },
    { name: "2 L d'eau", icon: "💧",  color: "var(--blue)",    days: [1,1,1,1,1,0,1], streak: 5 },
    { name: "Méditation",icon: "🧘",  color: "var(--amber)",   days: [0,1,1,1,0,1,1], streak: 2 },
    { name: "Coder 1 h", icon: "💻",  color: "var(--pink)",    days: [1,0,1,1,1,1,1], streak: 5 },
  ]);
  const dayLetters = ["L","M","M","J","V","S","D"];
  const todayIdx = 4; // ven

  const [goals, setGoals] = React.useState([
    { name: "Économies annuelles", pct: 42, color: "var(--accent)",  cur: "4 200", tot: "10 000 €" },
    { name: "Projet freelance",    pct: 68, color: "var(--blue)",    cur: "17/25", tot: "livrables" },
    { name: "Forme physique",      pct: 75, color: "var(--green)",   cur: "9/12",  tot: "séances/mois" },
    { name: "Formation en ligne",  pct: 31, color: "var(--pink)",    cur: "12/40", tot: "modules" },
  ]);

  const [tasks, setTasks] = React.useState([
    { name: "Planifier la semaine", done: false, prio: "h" },
    { name: "Lire 30 minutes",       done: false, prio: "m" },
    { name: "Vérifier les finances", done: false, prio: "l" },
    { name: "Appeler maman",         done: true,  prio: "m" },
    { name: "Commander courses",     done: true,  prio: "l" },
  ]);
  const [taskInput, setTaskInput] = React.useState("");

  const toggleHabit = (i, d) => {
    setHabits(h => {
      const next = [...h];
      const days = [...next[i].days];
      days[d] = days[d] ? 0 : 1;
      next[i] = { ...next[i], days };
      return next;
    });
  };
  const toggleTask = (i) => setTasks(t => t.map((x, j) => j === i ? { ...x, done: !x.done } : x));
  const addTask = () => {
    if (!taskInput.trim()) return;
    setTasks(t => [{ name: taskInput.trim(), done: false, prio: "m" }, ...t]);
    setTaskInput("");
  };

  const habitsDoneToday = habits.filter(h => h.days[todayIdx]).length;
  const tasksRemaining = tasks.filter(t => !t.done).length;

  return (
    <div className="card productivity">
      <div className="card-h">
        <span className="title section-label"><Icon name="productivity" size={11} /> Productivité</span>
        <span className="spacer" />
        <button className="ghost-btn" onClick={() => setEditMode(e => !e)}
          style={editMode ? { background: "var(--accent-soft)", color: "var(--accent)", borderColor: "var(--accent)" } : {}}>
          <Icon name={editMode ? "check" : "edit"} size={11} /> {editMode ? "Terminé" : "Modifier"}
        </button>
      </div>
      <div className="prod-tabs">
        <button className={`prod-tab ${tab === "habits" ? "active" : ""}`} onClick={() => setTab("habits")}>
          Habitudes <span className="count">{habitsDoneToday}/{habits.length}</span>
        </button>
        <button className={`prod-tab ${tab === "goals" ? "active" : ""}`} onClick={() => setTab("goals")}>
          Objectifs <span className="count">{goals.length}</span>
        </button>
        <button className={`prod-tab ${tab === "tasks" ? "active" : ""}`} onClick={() => setTab("tasks")}>
          Tâches <span className="count">{tasksRemaining}</span>
        </button>
      </div>

      <div className="prod-body">
        {tab === "habits" && habits.map((h, i) => (
          <div key={i} className="habit-row">
            <div className="habit-icon" style={{ background: h.color, color: "white" }}>{h.icon}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              {editMode ? (
                <input value={h.name}
                  onChange={e => setHabits(hs => hs.map((x, k) => k === i ? { ...x, name: e.target.value } : x))}
                  style={{ width: "100%", background: "var(--surface-2)", border: "1px solid var(--border-strong)", borderRadius: 6, padding: "3px 7px", fontSize: 12.5, fontWeight: 600, color: "var(--text)", fontFamily: "inherit" }} />
              ) : (
                <div className="habit-name">{h.name}</div>
              )}
              <div className="habit-streak">🔥 {h.streak} jours</div>
            </div>
            {editMode ? (
              <button onClick={() => setHabits(hs => hs.filter((_, k) => k !== i))}
                style={{ background: "transparent", border: "1px solid var(--border-strong)", borderRadius: 6, padding: "4px 7px", color: "var(--red)", cursor: "pointer", fontSize: 11 }}>✕</button>
            ) : (
              <div className="habit-days">
                {dayLetters.map((d, j) => (
                  <div key={j}
                    className={`habit-day ${h.days[j] ? "done" : ""} ${j === todayIdx ? "today" : ""}`}
                    onClick={() => toggleHabit(i, j)}>{d}</div>
                ))}
              </div>
            )}
          </div>
        ))}
        {tab === "habits" && editMode && (
          <button onClick={() => setHabits(hs => [...hs, { name: "Nouvelle habitude", icon: "✨", color: "var(--accent)", days: [0,0,0,0,0,0,0], streak: 0 }])}
            style={{ width: "100%", marginTop: 8, padding: "9px", background: "transparent", border: "1px dashed var(--border-strong)", borderRadius: 9, color: "var(--text-3)", fontSize: 12, fontFamily: "inherit", cursor: "pointer", fontWeight: 500 }}>
            + Ajouter une habitude
          </button>
        )}

        {tab === "goals" && (
          <>
            {goals.map((g, i) => (
              <div key={i} className="obj-row">
                <div className="obj-h">
                  {editMode ? (
                    <input value={g.name}
                      onChange={e => setGoals(gs => gs.map((x, k) => k === i ? { ...x, name: e.target.value } : x))}
                      style={{ flex: 1, background: "var(--surface-2)", border: "1px solid var(--border-strong)", borderRadius: 6, padding: "3px 7px", fontSize: 12.5, fontWeight: 600, color: "var(--text)", fontFamily: "inherit" }} />
                  ) : (
                    <div className="obj-name">{g.name}</div>
                  )}
                  {editMode ? (
                    <input type="number" min="0" max="100" value={g.pct}
                      onChange={e => setGoals(gs => gs.map((x, k) => k === i ? { ...x, pct: Math.max(0, Math.min(100, parseInt(e.target.value) || 0)) } : x))}
                      style={{ width: 56, background: "var(--surface-2)", border: "1px solid var(--border-strong)", borderRadius: 6, padding: "3px 7px", fontSize: 12.5, fontWeight: 600, color: g.color, fontFamily: "inherit", textAlign: "right" }} />
                  ) : (
                    <div className="obj-pct" style={{ color: g.color }}>{g.pct}%</div>
                  )}
                </div>
                <div className="obj-bar">
                  <div className="obj-fill" style={{ width: `${g.pct}%`, background: `linear-gradient(90deg, ${g.color}, ${g.color}aa)` }} />
                </div>
                <div className="obj-meta" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span>{g.cur} / {g.tot}</span>
                  {editMode && (
                    <button onClick={() => setGoals(gs => gs.filter((_, k) => k !== i))}
                      style={{ background: "transparent", border: "1px solid var(--border-strong)", borderRadius: 6, padding: "2px 7px", color: "var(--red)", cursor: "pointer", fontSize: 10 }}>Supprimer</button>
                  )}
                </div>
              </div>
            ))}
            <button onClick={() => setGoals(gs => [...gs, { name: "Nouvel objectif", pct: 0, color: "var(--accent)", cur: "0", tot: "100" }])}
              style={{
              width: "100%", marginTop: 8, padding: "9px",
              background: "transparent", border: "1px dashed var(--border-strong)",
              borderRadius: 9, color: "var(--text-3)", fontSize: 12, fontFamily: "inherit",
              cursor: "pointer", fontWeight: 500
            }}>+ Ajouter un objectif</button>
          </>
        )}

        {tab === "tasks" && (
          <>
            <div className="task-input">
              <input
                placeholder="Nouvelle tâche…"
                value={taskInput}
                onChange={(e) => setTaskInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addTask()}
              />
              <button className="task-add" onClick={addTask}>+</button>
            </div>
            {tasks.map((t, i) => (
              <div key={i} className={`task-row ${t.done ? "done" : ""}`} onClick={() => !editMode && toggleTask(i)}>
                <div className="task-check">{t.done && <Icon name="check" size={11} />}</div>
                <span className={`task-prio ${t.prio}`} />
                {editMode ? (
                  <input value={t.name}
                    onClick={e => e.stopPropagation()}
                    onChange={e => setTasks(ts => ts.map((x, k) => k === i ? { ...x, name: e.target.value } : x))}
                    style={{ flex: 1, background: "var(--surface-2)", border: "1px solid var(--border-strong)", borderRadius: 6, padding: "2px 6px", fontSize: 12.5, color: "var(--text)", fontFamily: "inherit" }} />
                ) : (
                  <div className="task-name">{t.name}</div>
                )}
                {editMode && (
                  <button onClick={e => { e.stopPropagation(); setTasks(ts => ts.filter((_, k) => k !== i)); }}
                    style={{ background: "transparent", border: "1px solid var(--border-strong)", borderRadius: 6, padding: "2px 7px", color: "var(--red)", cursor: "pointer", fontSize: 10 }}>✕</button>
                )}
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
};

/* === Finances === */
const EditableNum = ({ value, onChange, prefix = "", suffix = "", style = {}, fmt }) => {
  const [editing, setEditing] = React.useState(false);
  const [v, setV] = React.useState(String(value));
  React.useEffect(() => { setV(String(value)); }, [value]);
  const commit = () => {
    const n = parseFloat(v.replace(/[^\d.-]/g, ""));
    if (!isNaN(n)) onChange(n);
    else setV(String(value));
    setEditing(false);
  };
  if (editing) {
    return (
      <input autoFocus value={v} onChange={e => setV(e.target.value)} onBlur={commit}
        onKeyDown={e => { if (e.key === "Enter") commit(); if (e.key === "Escape") { setV(String(value)); setEditing(false); } }}
        style={{ ...style, background: "var(--accent-soft)", border: "1px solid var(--accent)", borderRadius: 6, padding: "1px 6px", width: "fit-content", maxWidth: 140, fontFamily: "inherit", color: "inherit", outline: "none" }} />
    );
  }
  return (
    <span onClick={() => setEditing(true)} title="Cliquer pour modifier"
      style={{ ...style, cursor: "text", borderRadius: 4, padding: "0 2px", transition: "background 0.15s" }}
      onMouseEnter={e => e.currentTarget.style.background = "var(--accent-soft)"}
      onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
      {fmt ? fmt(value) : `${prefix}${value}${suffix}`}
    </span>
  );
};

const Finances = () => {
  const months = ["Nov", "Déc", "Jan", "Fév", "Mar", "Avr"];
  const [income,  setIncome]  = React.useState([2900, 3200, 2800, 3100, 3400, 3300]);
  const [expense, setExpense] = React.useState([2200, 2700, 2100, 2400, 2600, 2400]);
  const setI = (idx, v) => setIncome(prev => prev.map((x, i) => i === idx ? v : x));
  const setE = (idx, v) => setExpense(prev => prev.map((x, i) => i === idx ? v : x));
  const balance = income.reduce((a,b)=>a+b,0) - expense.reduce((a,b)=>a+b,0);

  return (
    <div className="card finances">
      <div className="card-h">
        <span className="title section-label"><Icon name="finances" size={11} /> Finances</span>
        <span className="spacer" />
        <span className="pill" style={{ background: "var(--green-soft)", color: "var(--green)" }}>+12% ce mois</span>
        <button className="ghost-btn" style={{ marginLeft: 6 }}>Avril 2026</button>
      </div>

      <div className="fin-head">
        <div className="fin-balance">
          <div className="l">Solde net <span style={{ fontSize: 9, color: "var(--text-3)", marginLeft: 4 }}>· cliquer pour modifier</span></div>
          <div className="v">{eur(balance)}</div>
        </div>
        <div className="fin-mini">
          <div className="fin-mini-item inc">
            <div className="l">Revenus (Avr)</div>
            <div className="v">
              +<EditableNum value={income[5]} onChange={v => setI(5, v)} fmt={v => eur(v).replace("€", "").trim() + " €"} />
            </div>
          </div>
          <div className="fin-mini-item dep">
            <div className="l">Dépenses (Avr)</div>
            <div className="v">
              −<EditableNum value={expense[5]} onChange={v => setE(5, v)} fmt={v => eur(v).replace("€", "").trim() + " €"} />
            </div>
          </div>
        </div>
      </div>

      <div className="fin-chart">
        <GroupedBar months={months} income={income} expense={expense} fmt={(v) => `${(v/1000).toFixed(1)}k`} />
      </div>

      <div className="fin-foot">
        <span className="legend-dot" style={{ background: "var(--green)" }} />
        <span>Revenus</span>
        <span className="legend-dot" style={{ background: "var(--red)", marginLeft: 6 }} />
        <span>Dépenses</span>
        <span style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 6 }}>
          Dernière transaction · <strong style={{ color: "var(--text-2)" }}>Apple Watch</strong>
          <span style={{ color: "var(--red)", fontFamily: "Geist Mono", fontWeight: 600 }}>−400,00 €</span>
        </span>
      </div>
    </div>
  );
};

/* === Agenda === */
const Agenda = () => {
  const events = [
    { time: "09:00", name: "Stand-up équipe", meta: "30 min · Visio", color: "var(--accent)" },
    { time: "11:30", name: "Déjeuner Camille", meta: "Restaurant Aloha", color: "var(--pink)" },
    { time: "14:00", name: "Revue de design", meta: "Salle Pluton", color: "var(--blue)" },
    { time: "16:30", name: "Course longue", meta: "10 km · Plage", color: "var(--green)", current: true },
    { time: "19:00", name: "Yoga", meta: "Studio Sereno", color: "var(--amber)" },
  ];
  return (
    <div className="card agenda">
      <div className="card-h">
        <span className="title section-label"><Icon name="agenda" size={11} /> Agenda · Aujourd'hui</span>
        <span className="spacer" />
        <button className="ghost-btn"><Icon name="plus" size={11} /> Ajouter</button>
      </div>

      <div className="agenda-now">
        <span className="agenda-now-dot" />
        <span>Maintenant · 16:24</span>
      </div>

      {events.map((e, i) => (
        <div key={i} className="agenda-day" style={e.current ? { borderColor: e.color, background: "var(--surface)" } : {}}>
          <div className="stripe" style={{ background: e.color }} />
          <div className="time">{e.time}</div>
          <div className="body">
            <div className="ev-name">{e.name}</div>
            <div className="ev-meta">{e.meta}</div>
          </div>
        </div>
      ))}
    </div>
  );
};

/* === Quote === */
const QUOTES = [
  { t: "Le succès n'est pas final, l'échec n'est pas fatal : c'est le courage de continuer qui compte.", a: "Winston Churchill" },
  { t: "Ce n'est pas parce que les choses sont difficiles que nous n'osons pas, c'est parce que nous n'osons pas qu'elles sont difficiles.", a: "Sénèque" },
  { t: "La meilleure façon de prédire l'avenir, c'est de le créer.", a: "Peter Drucker" },
  { t: "On ne voit bien qu'avec le cœur. L'essentiel est invisible pour les yeux.", a: "Antoine de Saint-Exupéry" },
];
const Quote = () => {
  const [i, setI] = React.useState(0);
  const q = QUOTES[i];
  return (
    <div className="card quote">
      <div className="card-h">
        <span className="title section-label"><Icon name="sparkle" size={11} /> Citation du jour</span>
      </div>
      <div className="quote-mark">"</div>
      <div className="quote-text">{q.t}</div>
      <div className="quote-author">— {q.a}</div>
      <div className="quote-foot">
        <button className="quote-shuffle" onClick={() => setI((i + 1) % QUOTES.length)}>
          <Icon name="shuffle" size={11} /> Nouvelle
        </button>
      </div>
    </div>
  );
};

/* === Hero panels for non-home views === */
const HealthHero = () => (
  <div className="welcome-content">
    <div className="welcome-left">
      <div className="welcome-eyebrow">Vue santé</div>
      <h2>Score de forme : 72/100</h2>
      <p>Activité supérieure à la moyenne. FC au repos stable. Continue le sommeil régulier.</p>
    </div>
    <div className="score-circle" style={{ "--p": 72 }}>
      <div className="score-val"><b>72</b><span>SCORE</span></div>
    </div>
  </div>
);
const ProdHero = () => (
  <div className="welcome-content">
    <div className="welcome-left">
      <div className="welcome-eyebrow">Productivité du jour</div>
      <h2>4 tâches restantes · 4/5 habitudes faites</h2>
      <p>Tu es à 56% de tes objectifs hebdomadaires. Plus que 3 jours pour terminer.</p>
    </div>
    <div className="score-circle" style={{ "--p": 56 }}>
      <div className="score-val"><b>56</b><span>%</span></div>
    </div>
  </div>
);
const FinHero = () => (
  <div className="welcome-content">
    <div className="welcome-left">
      <div className="welcome-eyebrow">Finances · Avril 2026</div>
      <h2>+900 € ce mois</h2>
      <p>Revenus en hausse de 12%. Budget courses dépassé de 8%.</p>
    </div>
    <div className="score-circle" style={{ "--p": 65, "--accent": "var(--green)" }}>
      <div className="score-val"><b>65%</b><span>ÉPARGNE</span></div>
    </div>
  </div>
);
const AgendaHero = () => (
  <div className="welcome-content">
    <div className="welcome-left">
      <div className="welcome-eyebrow">Agenda · Aujourd'hui</div>
      <h2>5 événements, prochain dans 6 min</h2>
      <p>Course longue à 16:30. Pense à prendre de l'eau.</p>
    </div>
    <div className="score-circle" style={{ "--p": 40 }}>
      <div className="score-val"><b>5</b><span>ÉVÉN.</span></div>
    </div>
  </div>
);
const PlaceholderView = ({ icon, title, desc }) => (
  <div className="card placeholder-view">
    <div style={{ width: 56, height: 56, borderRadius: 14, background: "var(--accent-soft)", color: "var(--accent)", display: "grid", placeItems: "center", marginBottom: 14 }}>
      <Icon name={icon} size={26} />
    </div>
    <h2 style={{ fontFamily: "Inter Tight, sans-serif", fontSize: 22, fontWeight: 600, letterSpacing: "-0.02em", marginBottom: 6 }}>{title}</h2>
    <p style={{ color: "var(--text-2)", fontSize: 13.5, maxWidth: 420, textAlign: "center", textWrap: "pretty" }}>{desc}</p>
    <span style={{ marginTop: 14, fontSize: 11, padding: "4px 10px", borderRadius: 999, background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--text-3)", fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase" }}>Bientôt</span>
  </div>
);

/* === Compte Withings (réel) === */
const WithingsAccount = () => {
  const [tick, setTick] = React.useState(0);
  React.useEffect(() => {
    const onChange = () => setTick(t => t + 1);
    window.addEventListener('withings-sync', onChange);
    window.addEventListener('withings-connected', onChange);
    return () => {
      window.removeEventListener('withings-sync', onChange);
      window.removeEventListener('withings-connected', onChange);
    };
  }, []);
  const W = window.Nebula?.withings;
  const connected = W?.isConnected() || false;
  const lastSync = window.Nebula?.storage?.get('withings_last_sync', null);
  const lastSyncStr = lastSync
    ? `il y a ${Math.max(1, Math.round((Date.now() - lastSync) / 60000))} min`
    : "jamais";

  const onConnect = () => W?.startOAuth();
  const onDisconnect = () => {
    if (!confirm("Déconnecter Withings ?")) return;
    W?.disconnect();
    setTick(t => t + 1);
  };
  const onSync = () => {
    window.Nebula?.storage?.set('withings_last_sync', Date.now());
    window.dispatchEvent(new CustomEvent('withings-sync'));
  };

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0" }}>
      <div style={{ width: 32, height: 32, borderRadius: 8, background: "var(--accent-soft)", border: "1px solid var(--border)", display: "grid", placeItems: "center", fontSize: 16 }}>⌚</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 500 }}>Withings</div>
        <div style={{ fontSize: 11, color: connected ? "var(--green)" : "var(--text-3)", marginTop: 2 }}>
          {connected ? `● Connecté · sync ${lastSyncStr}` : "Non connecté"}
        </div>
      </div>
      {connected && (
        <button onClick={onSync} style={{ padding: "5px 11px", borderRadius: 7, fontSize: 11.5, fontWeight: 600, fontFamily: "inherit", cursor: "pointer", background: "var(--surface-2)", color: "var(--text-2)", border: "1px solid var(--border-strong)" }}>
          Synchroniser
        </button>
      )}
      <button onClick={connected ? onDisconnect : onConnect} style={{ padding: "5px 11px", borderRadius: 7, fontSize: 11.5, fontWeight: 600, fontFamily: "inherit", cursor: "pointer",
        background: connected ? "transparent" : "var(--accent)",
        color: connected ? "var(--text-3)" : "white",
        border: connected ? "1px solid var(--border-strong)" : 0 }}>
        {connected ? "Déconnecter" : "Connecter"}
      </button>
    </div>
  );
};

/* === Compte Google Calendar (réel) === */
const GoogleAccount = () => {
  const [tick, setTick] = React.useState(0);
  React.useEffect(() => {
    const onChange = () => setTick(t => t + 1);
    window.addEventListener('google-connected', onChange);
    window.addEventListener('google-sync', onChange);
    return () => {
      window.removeEventListener('google-connected', onChange);
      window.removeEventListener('google-sync', onChange);
    };
  }, []);
  const G = window.Nebula?.google;
  const connected = G?.isConnected() || false;
  const lastSync = window.Nebula?.storage?.get('google_last_sync', null);
  const lastSyncStr = lastSync
    ? `il y a ${Math.max(1, Math.round((Date.now() - lastSync) / 60000))} min`
    : "jamais";

  const onConnect = () => G?.startOAuth();
  const onDisconnect = () => {
    if (!confirm("Déconnecter Google Calendar ?")) return;
    G?.disconnect();
    setTick(t => t + 1);
  };
  const onSync = () => {
    window.Nebula?.storage?.set('google_last_sync', Date.now());
    window.dispatchEvent(new CustomEvent('google-sync'));
  };

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0" }}>
      <div style={{ width: 32, height: 32, borderRadius: 8, background: "var(--surface-2)", border: "1px solid var(--border)", display: "grid", placeItems: "center", fontSize: 16 }}>📅</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 500 }}>Google Calendar</div>
        <div style={{ fontSize: 11, color: connected ? "var(--green)" : "var(--text-3)", marginTop: 2 }}>
          {connected ? `● Connecté · sync ${lastSyncStr}` : "Non connecté"}
        </div>
      </div>
      {connected && (
        <button onClick={onSync} style={{ padding: "5px 11px", borderRadius: 7, fontSize: 11.5, fontWeight: 600, fontFamily: "inherit", cursor: "pointer", background: "var(--surface-2)", color: "var(--text-2)", border: "1px solid var(--border-strong)" }}>
          Synchroniser
        </button>
      )}
      <button onClick={connected ? onDisconnect : onConnect} style={{ padding: "5px 11px", borderRadius: 7, fontSize: 11.5, fontWeight: 600, fontFamily: "inherit", cursor: "pointer",
        background: connected ? "transparent" : "var(--accent)",
        color: connected ? "var(--text-3)" : "white",
        border: connected ? "1px solid var(--border-strong)" : 0 }}>
        {connected ? "Déconnecter" : "Connecter"}
      </button>
    </div>
  );
};

/* === Settings === */

/* Helper : useState persisté via storage.js */
function usePersistedState(key, defaults) {
  const [value, setValue] = React.useState(() => {
    const saved = window.Nebula?.storage?.get(key, null);
    return saved ? { ...defaults, ...saved } : defaults;
  });
  const update = React.useCallback((updater) => {
    setValue(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      window.Nebula?.storage?.set(key, next);
      return next;
    });
  }, [key]);
  return [value, update];
}

const SettingsView = ({ tw, setTweak }) => {
  const [profile, setProfile] = usePersistedState('profile', { name: "Noé Lambert", email: "noe@nebula.app", tz: "Europe/Paris" });
  const [notifs,  setNotifs]  = usePersistedState('notifs',  { daily: true, weekly: true, alerts: true, marketing: false });
  const [privacy, setPrivacy] = usePersistedState('privacy', { share: true, icloud: true, autoUpdate: true });

  const SCard = ({ title, desc, children }) => (
    <div className="card" style={{ padding: 18 }}>
      <div style={{ marginBottom: 12 }}>
        <div style={{ fontFamily: "Inter Tight, sans-serif", fontSize: 15, fontWeight: 600, letterSpacing: "-0.01em" }}>{title}</div>
        {desc && <div style={{ fontSize: 12, color: "var(--text-3)", marginTop: 3 }}>{desc}</div>}
      </div>
      {children}
    </div>
  );
  const SRow = ({ label, hint, children, last }) => (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 0", borderBottom: last ? 0 : "1px solid var(--border)" }}>
      <div style={{ minWidth: 0, paddingRight: 12 }}>
        <div style={{ fontSize: 13, fontWeight: 500 }}>{label}</div>
        {hint && <div style={{ fontSize: 11, color: "var(--text-3)", marginTop: 2 }}>{hint}</div>}
      </div>
      <div style={{ flexShrink: 0 }}>{children}</div>
    </div>
  );
  const Toggle = ({ on, onClick }) => (
    <button onClick={onClick}
      style={{ width: 36, height: 20, borderRadius: 999, border: 0, padding: 0, position: "relative",
        background: on ? "var(--accent)" : "var(--surface-2)", cursor: "pointer", transition: "all 0.2s" }}>
      <span style={{ position: "absolute", top: 2, left: on ? 18 : 2, width: 16, height: 16, borderRadius: "50%",
        background: "white", boxShadow: "0 1px 3px rgba(0,0,0,0.2)", transition: "left 0.2s" }} />
    </button>
  );
  const Field = ({ value, onChange, type = "text" }) => (
    <input type={type} value={value} onChange={e => onChange(e.target.value)}
      style={{ background: "var(--surface-2)", border: "1px solid var(--border-strong)", borderRadius: 8, padding: "6px 10px", fontSize: 12.5, color: "var(--text)", fontFamily: "inherit", outline: "none", width: 200, textAlign: "right" }} />
  );

  return (
    <div className="settings-view" style={{ gridColumn: "1 / -1", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
      <SCard title="Profil" desc="Tes informations personnelles">
        <SRow label="Nom"><Field value={profile.name} onChange={v => setProfile(p => ({...p, name: v}))} /></SRow>
        <SRow label="Email"><Field value={profile.email} onChange={v => setProfile(p => ({...p, email: v}))} type="email" /></SRow>
        <SRow label="Fuseau horaire" last>
          <select value={profile.tz} onChange={e => setProfile(p => ({...p, tz: e.target.value}))}
            style={{ background: "var(--surface-2)", border: "1px solid var(--border-strong)", borderRadius: 8, padding: "6px 10px", fontSize: 12.5, color: "var(--text)", fontFamily: "inherit", outline: "none" }}>
            <option>Europe/Paris</option><option>Europe/London</option><option>America/New_York</option><option>Asia/Tokyo</option>
          </select>
        </SRow>
      </SCard>

      <SCard title="Apparence" desc="Personnalise l'interface">
        <SRow label="Thème" hint="Clair ou sombre">
          <div style={{ display: "flex", gap: 4, background: "var(--surface-2)", borderRadius: 8, padding: 3, border: "1px solid var(--border)" }}>
            {["light", "dark"].map(t => (
              <button key={t} onClick={() => setTweak("theme", t)}
                style={{ padding: "4px 12px", border: 0, borderRadius: 6, fontSize: 11.5, cursor: "pointer", fontFamily: "inherit", fontWeight: 600,
                  background: tw.theme === t ? "var(--surface)" : "transparent", color: tw.theme === t ? "var(--text)" : "var(--text-3)" }}>
                {t === "light" ? "Clair" : "Sombre"}
              </button>
            ))}
          </div>
        </SRow>
        <SRow label="Couleur d'accent">
          <div style={{ display: "flex", gap: 6 }}>
            {[
              { v: "violet",  c: "#7c5cff" },
              { v: "ocean",   c: "#3aaed8" },
              { v: "rose",    c: "#e94e7d" },
              { v: "emerald", c: "#15a86b" },
            ].map(o => (
              <button key={o.v} onClick={() => setTweak("accent", o.v)} title={o.v}
                style={{ width: 22, height: 22, borderRadius: "50%", border: tw.accent === o.v ? "2px solid var(--text)" : "2px solid transparent",
                  background: o.c, cursor: "pointer", padding: 0, outline: "1px solid var(--border)" }} />
            ))}
          </div>
        </SRow>
        <SRow label="Citation du jour" hint="Affiche une citation sur l'accueil">
          <Toggle on={tw.showQuote} onClick={() => setTweak("showQuote", !tw.showQuote)} />
        </SRow>
        <SRow label="Barre de recherche" hint="Cmd+K dans le topbar" last>
          <Toggle on={tw.showSearch} onClick={() => setTweak("showSearch", !tw.showSearch)} />
        </SRow>
      </SCard>

      <SCard title="Notifications" desc="Quand veux-tu être prévenu·e ?">
        <SRow label="Récap quotidien" hint="Chaque matin à 8h">
          <Toggle on={notifs.daily} onClick={() => setNotifs(n => ({...n, daily: !n.daily}))} />
        </SRow>
        <SRow label="Bilan hebdomadaire" hint="Tous les dimanches">
          <Toggle on={notifs.weekly} onClick={() => setNotifs(n => ({...n, weekly: !n.weekly}))} />
        </SRow>
        <SRow label="Alertes santé" hint="FC anormale, sommeil court">
          <Toggle on={notifs.alerts} onClick={() => setNotifs(n => ({...n, alerts: !n.alerts}))} />
        </SRow>
        <SRow label="Marketing" hint="Nouveautés et offres" last>
          <Toggle on={notifs.marketing} onClick={() => setNotifs(n => ({...n, marketing: !n.marketing}))} />
        </SRow>
      </SCard>

      <SCard title="Comptes connectés" desc="Sources de données externes">
        <WithingsAccount />
        <div style={{ borderTop: "1px solid var(--border)" }}>
          <GoogleAccount />
        </div>
      </SCard>

      <SCard title="Confidentialité" desc="Tes données t'appartiennent">
        <SRow label="Partage anonyme" hint="Améliorer le produit">
          <Toggle on={privacy.share} onClick={() => setPrivacy(p => ({ ...p, share: !p.share }))} />
        </SRow>
        <SRow label="Synchronisation iCloud" hint="Sauvegarde chiffrée" last>
          <Toggle on={privacy.icloud} onClick={() => setPrivacy(p => ({ ...p, icloud: !p.icloud }))} />
        </SRow>
        <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
          <button style={{ flex: 1, padding: "9px", borderRadius: 8, border: "1px solid var(--border-strong)", background: "var(--surface-2)", color: "var(--text-2)", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
            Exporter mes données
          </button>
          <button style={{ flex: 1, padding: "9px", borderRadius: 8, border: "1px solid var(--red)", background: "transparent", color: "var(--red)", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
            Supprimer le compte
          </button>
        </div>
      </SCard>

      <SCard title="À propos" desc="Nebula Personal OS">
        <SRow label="Version">v2.4.1 (build 2812)</SRow>
        <SRow label="Mises à jour automatiques">
          <Toggle on={privacy.autoUpdate} onClick={() => setPrivacy(p => ({ ...p, autoUpdate: !p.autoUpdate }))} />
        </SRow>
        <SRow label="Aide & support"><button style={{ background: "transparent", border: 0, color: "var(--accent)", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>Centre d'aide →</button></SRow>
        <SRow label="Conditions d'utilisation" last><button style={{ background: "transparent", border: 0, color: "var(--accent)", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>Lire →</button></SRow>
      </SCard>
    </div>
  );
};

/* === Insights === */
const InsightsView = () => {
  const correlations = [
    { a: "Sommeil", b: "Productivité", strength: 0.82, color: "var(--accent)", desc: "Tu codes 35% plus efficacement après 7h+ de sommeil." },
    { a: "Sport", b: "Humeur", strength: 0.74, color: "var(--green)", desc: "Tes journées avec sport ont +1,2 pts d'humeur en moyenne." },
    { a: "Café", b: "FC repos", strength: 0.61, color: "var(--red)", desc: "+5 bpm au repos après 3+ cafés." },
    { a: "Lecture", b: "Sommeil", strength: 0.58, color: "var(--blue)", desc: "+22 min de sommeil profond les soirs de lecture." },
  ];
  const trends = [
    { label: "Pas/jour", current: 9420, prev: 8100, unit: "", color: "var(--accent)", trend: "+16%" },
    { label: "Sommeil moyen", current: 7.4, prev: 6.9, unit: "h", color: "var(--blue)", trend: "+7%" },
    { label: "Économies", current: 4200, prev: 3650, unit: " €", color: "var(--green)", trend: "+15%" },
    { label: "Tâches faites", current: 84, prev: 67, unit: "%", color: "var(--pink)", trend: "+25%" },
  ];
  const heatmap = React.useMemo(() => Array.from({ length: 7 * 14 }, () => Math.random()), []);
  const dayLabels = ["L", "M", "M", "J", "V", "S", "D"];

  return (
    <div className="insights-view" style={{ gridColumn: "1 / -1", display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: 14 }}>
      <div className="card" style={{ padding: 18 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
          <Icon name="sparkle" size={14} />
          <div style={{ fontFamily: "Inter Tight, sans-serif", fontSize: 15, fontWeight: 600 }}>Corrélations détectées</div>
          <span className="pill" style={{ marginLeft: "auto", background: "var(--accent-soft)", color: "var(--accent)" }}>30 derniers jours</span>
        </div>
        {correlations.map((c, i) => (
          <div key={i} style={{ padding: "12px 0", borderBottom: i < correlations.length - 1 ? "1px solid var(--border)" : 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 600 }}>
                {c.a} <span style={{ color: "var(--text-3)", fontWeight: 400 }}>↔</span> {c.b}
              </div>
              <div style={{ marginLeft: "auto", fontSize: 12, fontWeight: 700, color: c.color, fontFamily: "Geist Mono, monospace" }}>
                {(c.strength * 100).toFixed(0)}%
              </div>
            </div>
            <div style={{ height: 4, background: "var(--surface-2)", borderRadius: 2, overflow: "hidden", marginBottom: 7 }}>
              <div style={{ height: "100%", width: `${c.strength * 100}%`, background: `linear-gradient(90deg, ${c.color}, ${c.color}aa)`, borderRadius: 2 }} />
            </div>
            <div style={{ fontSize: 12, color: "var(--text-2)", textWrap: "pretty" }}>{c.desc}</div>
          </div>
        ))}
      </div>

      <div className="card" style={{ padding: 18 }}>
        <div style={{ fontFamily: "Inter Tight, sans-serif", fontSize: 15, fontWeight: 600, marginBottom: 14 }}>Tendances vs mois passé</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          {trends.map((t, i) => (
            <div key={i} style={{ background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 10, padding: 12 }}>
              <div style={{ fontSize: 10.5, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600 }}>{t.label}</div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginTop: 6 }}>
                <div style={{ fontFamily: "Inter Tight, sans-serif", fontSize: 22, fontWeight: 600, color: t.color }}>
                  {typeof t.current === "number" && t.current >= 1000 ? t.current.toLocaleString("fr-FR") : t.current}<small style={{ fontSize: 11, color: "var(--text-3)", fontWeight: 500 }}>{t.unit}</small>
                </div>
                <div style={{ fontSize: 11, fontWeight: 700, color: "var(--green)", fontFamily: "Geist Mono, monospace" }}>↑ {t.trend}</div>
              </div>
              <div style={{ fontSize: 11, color: "var(--text-3)", marginTop: 4 }}>vs {typeof t.prev === "number" && t.prev >= 1000 ? t.prev.toLocaleString("fr-FR") : t.prev}{t.unit}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="card" style={{ padding: 18, gridColumn: "1 / -1" }}>
        <div style={{ display: "flex", alignItems: "center", marginBottom: 14 }}>
          <div style={{ fontFamily: "Inter Tight, sans-serif", fontSize: 15, fontWeight: 600 }}>Heatmap activité · 14 dernières semaines</div>
          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "var(--text-3)" }}>
            Moins
            {[0.15, 0.35, 0.55, 0.75, 0.95].map((o, i) => (
              <div key={i} style={{ width: 11, height: 11, borderRadius: 2, background: `color-mix(in oklch, var(--accent) ${o*100}%, var(--surface-2))` }} />
            ))}
            Plus
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 3, paddingTop: 2 }}>
            {dayLabels.map((d, i) => (
              <div key={i} style={{ height: 14, fontSize: 9.5, color: "var(--text-3)", display: "flex", alignItems: "center" }}>{d}</div>
            ))}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(14, 1fr)", gridTemplateRows: "repeat(7, 14px)", gap: 3, flex: 1 }}>
            {heatmap.map((v, i) => (
              <div key={i} title={`${(v * 100).toFixed(0)}%`}
                style={{ borderRadius: 2, background: `color-mix(in oklch, var(--accent) ${v*95+5}%, var(--surface-2))`,
                  animation: `fadeUp 0.3s ease ${i * 0.005}s backwards` }} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

/* === App === */
const App = () => {
  const [tw, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const [active, setActive] = React.useState("home");

  React.useEffect(() => {
    document.documentElement.dataset.theme = tw.theme;
  }, [tw.theme]);

  React.useEffect(() => {
    const a = ACCENTS[tw.accent] || ACCENTS.violet;
    const r = document.documentElement;
    if (tw.theme === "dark") {
      r.style.setProperty("--accent", a.aDark);
      r.style.setProperty("--accent-2", a.a2Dark);
      r.style.setProperty("--accent-soft", a.softDark);
    } else {
      r.style.setProperty("--accent", a.a);
      r.style.setProperty("--accent-2", a.a2);
      r.style.setProperty("--accent-soft", a.soft);
    }
  }, [tw.accent, tw.theme]);

  const toggleTheme = () => setTweak("theme", tw.theme === "dark" ? "light" : "dark");

  return (
    <div className="app" data-view={active}>
      <Sidebar active={active} setActive={setActive} theme={tw.theme} toggleTheme={toggleTheme} />
      <main className="main">
        <Topbar tw={tw} active={active} setActive={setActive} />
        <div className="grid">
          {active === "home" && <>
            <Welcome />
            <Weather />
            <Health />
            <Productivity />
            <Finances />
            <Agenda />
            {tw.showQuote && <Quote />}
          </>}
          {active === "health" && <>
            <div className="card welcome view-hero"><HealthHero /></div>
            <Health />
            <Weather />
          </>}
          {active === "productivity" && <>
            <div className="card welcome view-hero"><ProdHero /></div>
            <Productivity />
            <Welcome />
          </>}
          {active === "finances" && <>
            <div className="card welcome view-hero"><FinHero /></div>
            <Finances />
            {tw.showQuote && <Quote />}
          </>}
          {active === "agenda" && <>
            <div className="card welcome view-hero"><AgendaHero /></div>
            <Agenda />
            <Weather />
          </>}
          {active === "insights" && <InsightsView />}
          {active === "settings" && <SettingsView tw={tw} setTweak={setTweak} />}
        </div>
      </main>
    </div>
  );
};

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
