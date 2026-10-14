import { useEffect, useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { api } from "../../lib/api";
import { useMeta } from "../../lib/site";

export default function NotFound() {
  const loc = useLocation();
  const nav = useNavigate();
  const [checked, setChecked] = useState(false);
  useEffect(() => {
    api.get("/public/redirect", { params: { path: loc.pathname } })
      .then((r) => nav(r.data.to, { replace: true }))
      .catch(() => setChecked(true));
  }, [loc.pathname, nav]);
  useMeta({ title: "Page not found — USP India", description: "Page not found.", noindex: true });
  if (!checked) return <div className="wrap section" style={{ minHeight: "50vh" }} />;
  return (
    <div className="wrap hero-type" data-testid="not-found">
      <p className="eyebrow">404</p>
      <h1 className="h1">Page not found</h1>
      <p className="lede">This address does not exist on the USP India website.</p>
      <div className="hero-actions">
        <Link to="/" className="btn">Go to Home</Link>
        <Link to="/field-notes" className="btn btn-ghost">Read Field Notes</Link>
      </div>
    </div>
  );
}
