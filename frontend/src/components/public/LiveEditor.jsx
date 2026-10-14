import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Pencil, X, Save, Upload, Images, RotateCcw, AlignLeft, AlignCenter, AlignRight } from "lucide-react";
import { api, errMsg } from "../../lib/api";
import { useAuth } from "../../lib/auth";
import { useSite } from "../../lib/site";
import { MediaPicker } from "../admin/Kit";

export const FONTS = ["Public Sans", "Lora", "Source Serif 4", "Libre Baskerville", "Source Sans 3", "Noto Sans", "Atkinson Hyperlegible", "Cormorant",
  "Literata", "Playfair Display", "Merriweather", "DM Serif Display", "Montserrat", "Poppins", "Raleway", "Work Sans"];
const LABELS = { eyebrow: "Small label", heading: "Heading", subheading: "Sub-heading", intro: "Intro text", body_html: "Body text", aside: "Side statement", text: "Text", image: "Image" };
const px = (v) => (v ? parseInt(v, 10) : "");
const findEl = (sel) => sel && document.querySelector(`main [data-sec="${CSS.escape(sel.sec)}"] [data-edit="${sel.field}"]`);

export function LiveEditor(props) {
  const { can } = useAuth();
  const site = useSite();
  if (!site?.live_editor_enabled || !can("content.publish")) return null;
  return <Editor {...props} />;
}

function Editor({ pageKey, content, setContent, original, remount }) {
  const [on, setOn] = useState(false);
  const [sel, setSel] = useState(null);
  const [dirty, setDirty] = useState(() => new Set());
  const [base, setBase] = useState(original);
  const [busy, setBusy] = useState(false);
  const [picker, setPicker] = useState(false);
  const [rect, setRect] = useState(null);
  const fileRef = useRef(null);
  const sec = sel && content.sections.find((s) => s.id === sel.sec);
  const st = (sec?.styles || {})[sel?.field] || {};

  const patchSec = (id, fn) => {
    setContent((c) => ({ ...c, sections: c.sections.map((s) => (s.id === id ? fn(s) : s)) }));
    setDirty((d) => new Set(d).add(id));
  };
  const setStyles = (patch) => patchSec(sel.sec, (s) => {
    const f = { ...((s.styles || {})[sel.field] || {}), ...patch };
    Object.keys(f).forEach((k) => (f[k] === "" || f[k] == null) && delete f[k]);
    return { ...s, styles: { ...(s.styles || {}), [sel.field]: f } };
  });

  useEffect(() => {
    document.body.classList.toggle("live-editing", on);
    if (!on) return undefined;
    const h = (e) => {
      if (e.target.closest(".live-ui, [role=dialog]") || !e.target.closest("main")) return;
      const el = e.target.closest("[data-edit]");
      if (e.target.closest("a, button") || el) { e.preventDefault(); e.stopPropagation(); }
      if (!el) return;
      const id = el.closest("[data-sec]")?.dataset.sec;
      if (id) setSel({ sec: id, field: el.dataset.edit });
    };
    document.addEventListener("click", h, true);
    return () => { document.removeEventListener("click", h, true); document.body.classList.remove("live-editing"); };
  }, [on]);

  useEffect(() => {
    const el = findEl(sel);
    if (!on || !el || sel.field === "image") return undefined;
    el.contentEditable = "true";
    const commit = () => {
      const s = content.sections.find((x) => x.id === sel.sec);
      const v = sel.field === "body_html" ? el.innerHTML : el.innerText.replace(/\n{3,}/g, "\n\n").trim();
      if (s && v !== (s.data[sel.field] || "")) { patchSec(sel.sec, (x) => ({ ...x, data: { ...x.data, [sel.field]: v } })); remount(); }
    };
    el.addEventListener("blur", commit);
    return () => { el.removeEventListener("blur", commit); el.removeAttribute("contenteditable"); };
  }, [on, sel, content]); // eslint-disable-line

  useEffect(() => {
    if (!on || !sel) { setRect(null); return undefined; }
    let raf;
    const tick = () => {
      const r = findEl(sel)?.getBoundingClientRect();
      setRect((o) => (r && (!o || o.top !== r.top || o.left !== r.left || o.width !== r.width || o.height !== r.height) ? { top: r.top, left: r.left, width: r.width, height: r.height } : r ? o : null));
      raf = requestAnimationFrame(tick);
    };
    tick();
    return () => cancelAnimationFrame(raf);
  }, [on, sel]);

  useEffect(() => {
    const h = (e) => { if (dirty.size) { e.preventDefault(); e.returnValue = ""; } };
    window.addEventListener("beforeunload", h);
    return () => window.removeEventListener("beforeunload", h);
  }, [dirty]);

  const save = async (c = content, ids = dirty) => {
    if (!ids.size) return;
    setBusy(true);
    try {
      const r = await api.put(`/admin/pages/${pageKey}/live`, { sections: c.sections.filter((s) => ids.has(s.id)).map((s) => ({ id: s.id, data: s.data, styles: s.styles || {} })) });
      setContent(r.data.content); setBase(r.data.content); setDirty(new Set()); remount();
      toast.success("Saved — the change is live on the public page");
    } catch (e) { toast.error(errMsg(e)); } finally { setBusy(false); }
  };
  const setImage = (m) => {
    const c = { ...content, sections: content.sections.map((s) => (s.id === sel.sec ? { ...s, data: { ...s.data, image: { ...(s.data.image || {}), media_id: m.id, media: undefined } } } : s)) };
    save(c, new Set(dirty).add(sel.sec));
  };
  const upload = async (file) => {
    if (!file) return;
    const fd = new FormData(); fd.append("file", file); fd.append("category", "live-editor");
    try { setBusy(true); const r = await api.post("/admin/media", fd); setImage(r.data); }
    catch (e) { toast.error(errMsg(e)); setBusy(false); }
  };
  const exit = () => {
    if (dirty.size && !window.confirm("Discard unsaved live edits?")) return;
    if (dirty.size) { setContent(base); setDirty(new Set()); remount(); }
    setSel(null); setOn(false);
  };
  const drag = (mode) => (e) => {
    e.preventDefault();
    const start = { x: e.clientX, y: e.clientY, w: rect.width, h: rect.height };
    const move = (ev) => setStyles({
      ...(mode !== "h" ? { width: `${Math.max(40, Math.round(start.w + ev.clientX - start.x))}px` } : {}),
      ...(mode !== "w" ? { height: `${Math.max(30, Math.round(start.h + ev.clientY - start.y))}px` } : {}),
    });
    const up = () => { window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", up); };
    window.addEventListener("pointermove", move); window.addEventListener("pointerup", up);
  };

  if (!on) return (
    <button type="button" className="live-ui live-toggle" onClick={() => setOn(true)} data-testid="live-editor-toggle"><Pencil size={15} /> Live editor</button>
  );
  return (
    <>
      {rect && (
        <div className="live-ui live-box" style={{ top: rect.top, left: rect.left, width: rect.width, height: rect.height }} data-testid="live-selection-box">
          <span className="live-handle live-h-r" onPointerDown={drag("w")} data-testid="live-resize-width" />
          <span className="live-handle live-h-b" onPointerDown={drag("h")} data-testid="live-resize-height" />
          <span className="live-handle live-h-c" onPointerDown={drag("both")} data-testid="live-resize-corner" />
        </div>
      )}
      <aside className="live-ui live-panel" data-testid="live-editor-panel">
        <div className="live-row live-top">
          <strong>Live editor</strong>
          <button type="button" className="live-btn live-primary" disabled={busy || !dirty.size} onClick={() => save()} data-testid="live-save-btn"><Save size={14} /> Save{dirty.size ? ` (${dirty.size})` : ""}</button>
          <button type="button" className="live-btn" onClick={exit} aria-label="Close live editor" data-testid="live-exit-btn"><X size={14} /></button>
        </div>
        {!sel || !sec ? <p className="live-hint" data-testid="live-hint">Click any heading, text or image on the page to edit it. Drag the red handles to resize. Saving makes changes live immediately.</p> : (
          <div data-testid="live-controls">
            <p className="live-label" data-testid="live-selected-label">{LABELS[sel.field] || sel.field}</p>
            {sel.field === "image" ? (
              <div className="live-row">
                <button type="button" className="live-btn" onClick={() => setPicker(true)} data-testid="live-choose-image"><Images size={14} /> Library</button>
                <button type="button" className="live-btn" onClick={() => fileRef.current?.click()} disabled={busy} data-testid="live-upload-image"><Upload size={14} /> Upload</button>
                <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => upload(e.target.files?.[0])} data-testid="live-upload-input" />
              </div>
            ) : (<>
              <p className="live-hint">Type directly on the page to change the text.</p>
              <label className="live-field">Font
                <select value={st.fontFamily || ""} onChange={(e) => setStyles({ fontFamily: e.target.value })} data-testid="live-font-select">
                  <option value="">Default</option>{FONTS.map((f) => <option key={f} value={f}>{f}</option>)}
                </select>
              </label>
              <div className="live-row">
                <label className="live-field">Size (px)<input type="number" min="8" max="200" value={px(st.fontSize)} placeholder="auto" onChange={(e) => setStyles({ fontSize: e.target.value ? `${e.target.value}px` : "" })} data-testid="live-font-size" /></label>
                <label className="live-field">Weight
                  <select value={st.fontWeight || ""} onChange={(e) => setStyles({ fontWeight: e.target.value })} data-testid="live-font-weight">
                    <option value="">Default</option>{["300", "400", "500", "600", "700"].map((w) => <option key={w}>{w}</option>)}
                  </select>
                </label>
              </div>
              <div className="live-row">
                <label className="live-field">Colour<input type="color" value={st.color || "#2d302b"} onChange={(e) => setStyles({ color: e.target.value })} data-testid="live-font-color" /></label>
                <div className="live-field">Align
                  <div className="live-row">{[["left", AlignLeft], ["center", AlignCenter], ["right", AlignRight]].map(([a, I]) => (
                    <button key={a} type="button" className={`live-btn ${st.textAlign === a ? "live-on" : ""}`} onClick={() => setStyles({ textAlign: st.textAlign === a ? "" : a })} aria-label={`Align ${a}`} data-testid={`live-align-${a}`}><I size={14} /></button>
                  ))}</div>
                </div>
              </div>
            </>)}
            <div className="live-row">
              <label className="live-field">Width (px)<input type="number" value={px(st.width)} placeholder="auto" onChange={(e) => setStyles({ width: e.target.value ? `${e.target.value}px` : "" })} data-testid="live-width" /></label>
              <label className="live-field">Height (px)<input type="number" value={px(st.height)} placeholder="auto" onChange={(e) => setStyles({ height: e.target.value ? `${e.target.value}px` : "" })} data-testid="live-height" /></label>
            </div>
            <div className="live-row">
              <button type="button" className="live-btn" onClick={() => setStyles({ width: "", height: "" })} data-testid="live-reset-size"><RotateCcw size={14} /> Reset size</button>
              <button type="button" className="live-btn" onClick={() => patchSec(sel.sec, (s) => ({ ...s, styles: { ...(s.styles || {}), [sel.field]: {} } }))} data-testid="live-reset-style"><RotateCcw size={14} /> Reset all styles</button>
            </div>
          </div>
        )}
      </aside>
      <MediaPicker open={picker} onClose={() => setPicker(false)} onPick={setImage} />
    </>
  );
}
