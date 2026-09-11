import { useEffect, useState } from "react";
import { NavLink, Route, Routes, useRouteError } from "react-router-dom";
import "./styles/tokens.css";

const NAV = ["Overview", "Providers", "Destinations", "Messages", "Webhooks", "Logs", "Settings"] as const;

type Theme = "system" | "light" | "dark";

function useTheme(): [Theme, (t: Theme) => void] {
  const [theme, setTheme] = useState<Theme>(
    () => (localStorage.getItem("pl-theme") as Theme | null) ?? "system",
  );
  useEffect(() => {
    localStorage.setItem("pl-theme", theme);
    if (theme === "system") document.documentElement.removeAttribute("data-theme");
    else document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);
  return [theme, setTheme];
}

// Loading/error foundation for future operational pages (M00 shell only).
export function RouteError() {
  const err = useRouteError();
  return (
    <div className="pl-card">
      <h2>Something went wrong</h2>
      <p className="pl-muted">{err instanceof Error ? err.message : "Unknown error."}</p>
    </div>
  );
}

function Placeholder({ name }: { name: string }) {
  return (
    <div className="pl-card">
      <h2>{name}</h2>
      {/* ponytail: honest placeholder, no fake controls — full page lands in M09. */}
      <p className="pl-muted">Available from M09. Shell routing verified in M00.</p>
    </div>
  );
}

export default function App() {
  const [theme, setTheme] = useTheme();
  return (
    <div className="pl-shell">
      <aside className="pl-side">
        <div className="pl-brand">portlane</div>
        <div className="pl-tenant">tenant: — (M01)</div>
        <nav className="pl-nav">
          {NAV.map((item) => (
            <NavLink
              key={item}
              to={item === "Overview" ? "/" : `/${item.toLowerCase()}`}
              className={({ isActive }) => (isActive ? "active" : "")}
            >
              {item}
            </NavLink>
          ))}
        </nav>
      </aside>
      <main className="pl-main">
        <div className="pl-top">
          <strong>Console</strong>
          <div className="pl-row">
            <span className="pl-muted">theme</span>
            <select value={theme} onChange={(e) => setTheme(e.target.value as Theme)} aria-label="theme">
              <option value="system">system</option>
              <option value="light">light</option>
              <option value="dark">dark</option>
            </select>
          </div>
        </div>
        <Routes>
          <Route path="/" element={<Placeholder name="Overview" />} />
          {NAV.slice(1).map((item) => (
            <Route key={item} path={`/${item.toLowerCase()}`} element={<Placeholder name={item} />} />
          ))}
          <Route path="*" element={<Placeholder name="Not found" />} />
        </Routes>
      </main>
    </div>
  );
}
