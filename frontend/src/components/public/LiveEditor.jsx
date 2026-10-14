import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  Pencil, X, Save, Upload, Images, RotateCcw, AlignLeft, AlignCenter, AlignRight,
  ArrowUp, ArrowDown, Copy, Trash2, Eye, EyeOff, Plus, Undo2, Redo2, Bold, Italic,
  Monitor, Tablet, Smartphone, Type, Paintbrush, Square, LayoutGrid,
} from "lucide-react";
import { api, errMsg } from "../../lib/api";
import { useAuth } from "../../lib/auth";
import { useSite } from "../../lib/site";
import { MediaPicker } from "../admin/Kit";

export const FONTS = ["Public Sans", "Lora", "Source Serif 4", "Libre Baskerville", "Source Sans 3", "Noto Sans",
  "Atkinson Hyperlegible", "Cormorant", "Literata", "Playfair Display", "Merriweather", "DM Serif Display",
  "Montserrat", "Poppins", "Raleway", "Work Sans"];

const LABELS = { eyebrow: "Small label", heading: "Heading", subheading: "Sub-heading", intro: "Intro text",
  body_html: "Body text", aside: "Side statement", text: "Text", image: "Image", _section: "Whole section" };
const TEXT_FIELDS = ["eyebrow", "heading", "subheading", "intro", "body_html", "aside", "text"];
const ADD_TYPES = [
  ["text", "Text", Type], ["image_text", "Image + text", LayoutGrid], ["image", "Big image", Images],
  ["gallery", "Gallery", LayoutGrid], ["quote", "Quote", Square], ["contact_invite", "Call to action", Plus],
  ["hero", "Hero banner", Square],
];
const px = (v) => (v ? parseInt(v, 10) : "");
const newId = () => Math.random().toString(36).slice(2, 12);
const clone = (o) => JSON.parse(JSON.stringify(o));
const findSecEl = (id) => (id ? document.querySelector(`main [data-sec="${CSS.escape(id)}"]`) : null);
const findEl = (sel) => {
  const s = findSecEl(sel?.sec);
  if (!s) return null;
  return sel.field === "_section" ? s : s.querySelector(`[data-edit="${sel.field}"]`);
};

const DEFAULTS = {
  text: { heading: "New heading", body_html: "<p>New paragraph. Click to edit this text.</p>", style: "stacked" },
  image_text: { heading: "Heading", body_html: "<p>Describe this section.</p>", image: { media_id: "" }, image_side: "left" },
  image: { image: { media_id: "" }, layout: "full", body_html: "" },
  gallery: { heading: "Gallery", items: [] },
  quote: { quote: "A short, approved quotation.", attribution: "", approved: true },
  contact_invite: { heading: "Work with us", text: "A short invitation to get in touch.", button_label: "Connect with Us", href: "/connect", buttons: [] },
  hero: { eyebrow: "", heading: "New heading", intro: "Short introduction text.", image: { media_id: "" }, buttons: [] },
};
const makeSection = (type) => ({ id: newId(), type, hidden: false, data: clone(DEFAULTS[type] || {}), styles: {} });
const stripMedia = (o) => {
  if (Array.isArray(o)) return o.map(stripMedia);
  if (o && typeof o === "object") return Object.fromEntries(Object.entries(o).filter(([k]) => !["media", "original", "edit_note"].includes(k)).map(([k, v]) => [k, stripMedia(v)]));
  return o;
};

export function LiveEditor(props) {
  const { can } = useAuth();
  const site = useSite();
  const editParam = typeof window !== "undefined" && new URLSearchParams(window.location.search).has("edit");
  if (!can("content.publish")) return null;
  if (!site?.live_editor_enabled && !editParam) return null;
  return <Editor key={props.pageKey} autoStart={editParam} {...props} />;
}

function Editor({ pageKey, content, setContent, original, remount, autoStart }) {
  const [on, setOn] = useState(!!autoStart);
  const [sel, setSel] = useState(null);
  const [dirty, setDirty] = useState(false);
  const [base, setBase] = useState(original);
  const [busy, setBusy] = useState(false);
  const [picker, setPicker] = useState(false);
  const [addAt, setAddAt] = useState(null);
  const [rect, setRect] = useState(null);
  const [device, setDevice] = useState("desktop");
  const [hist, setHist] = useState({ past: [], future: [] });
  const fileRef = useRef(null);

  const sections = content.sections;
  const sec = sel && sections.find((s) => s.id === sel.sec);
  const field = sel?.field;
  const st = (sec?.styles || {})[field] || {};
  const isText = TEXT_FIELDS.includes(field) && field !== "_section";

  const commit = useCallback((nextSections, mark = true) => {
    setHist((h) => ({ past: [...h.past, content.sections].slice(-50), future: [] }));
    setContent((c) => ({ ...c, sections: nextSections }));
    if (mark) setDirty(true);
  }, [content.sections, setContent]);

  const patchSec = (id, fn) => commit(sections.map((s) => (s.id === id ? fn(s) : s)));
  const setStyles = (patch) => {
    if (!sel) return;
    patchSec(sel.sec, (s) => {
      const f = { ...((s.styles || {})[field] || {}), ...patch };
      Object.keys(f).forEach((k) => (f[k] === "" || f[k] == null) && delete f[k]);
      return { ...s, styles: { ...(s.styles || {}), [field]: f } };
    });
  };

  const undo = () => setHist((h) => {
    if (!h.past.length) return h;
    const prev = h.past[h.past.length - 1];
    setContent((c) => ({ ...c, sections: prev })); setDirty(true); remount();
    return { past: h.past.slice(0, -1), future: [content.sections, ...h.future].slice(0, 50) };
  });
  const redo = () => setHist((h) => {
    if (!h.future.length) return h;
    const next = h.future[0];
    setContent((c) => ({ ...c, sections: next })); setDirty(true); remount();
    return { past: [...h.past, content.sections].slice(-50), future: h.future.slice(1) };
  });

  // section operations
  const idx = (id) => sections.findIndex((s) => s.id === id);
  const move = (id, dir) => { const i = idx(id); const j = i + dir; if (j < 0 || j >= sections.length) return; const a = [...sections]; [a[i], a[j]] = [a[j], a[i]]; commit(a); };
  const dup = (id) => { const i = idx(id); const a = [...sections]; a.splice(i + 1, 0, { ...clone(a[i]), id: newId() }); commit(a); };
  const remove = (id) => { commit(sections.filter((s) => s.id !== id)); if (sel?.sec === id) setSel(null); };
  const toggleHide = (id) => patchSec(id, (s) => ({ ...s, hidden: !s.hidden }));
  const addSection = (type) => {
    const s = makeSection(type);
    const a = [...sections]; a.splice(addAt ?? a.length, 0, s); commit(a);
    setAddAt(null); remount();
    if (["image", "image_text", "hero"].includes(type)) setTimeout(() => { setSel({ sec: s.id, field: "image" }); setPicker(true); }, 50);
    else setSel({ sec: s.id, field: type === "quote" ? "_section" : "heading" });
    toast.success("Section added");
  };

  // toggle editing mode
  useEffect(() => {
    document.body.classList.toggle("live-editing", on);
    remount();
    return () => document.body.classList.remove("live-editing");
  }, [on]); // eslint-disable-line

  useEffect(() => {
    document.body.classList.remove("live-dev-tablet", "live-dev-mobile");
    if (on && device !== "desktop") document.body.classList.add(`live-dev-${device}`);
  }, [on, device]);

  // click to select
  useEffect(() => {
    if (!on) return undefined;
    const h = (e) => {
      if (e.target.closest(".live-ui, [role=dialog]") || !e.target.closest("main")) return;
      const el = e.target.closest("[data-edit]");
      const secEl = e.target.closest("[data-sec]");
      if (e.target.closest("a, button") || el || secEl) { e.preventDefault(); e.stopPropagation(); }
      if (secEl) setSel({ sec: secEl.dataset.sec, field: el ? el.dataset.edit : "_section" });
    };
    document.addEventListener("click", h, true);
    return () => document.removeEventListener("click", h, true);
  }, [on]);

  // inline contentEditable for text fields
  useEffect(() => {
    const el = findEl(sel);
    if (!on || !el || !isText) return undefined;
    el.contentEditable = "true";
    const commitText = () => {
      const s = sections.find((x) => x.id === sel.sec);
      const v = field === "body_html" ? el.innerHTML : el.innerText.replace(/\n{3,}/g, "\n\n").trim();
      if (s && v !== (s.data[field] || "")) { patchSec(sel.sec, (x) => ({ ...x, data: { ...x.data, [field]: v } })); remount(); }
    };
    el.addEventListener("blur", commitText);
    return () => { el.removeEventListener("blur", commitText); el.removeAttribute("contenteditable"); };
  }, [on, sel, content]); // eslint-disable-line

  // track selection rectangle
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
  }, [on, sel, device]);

  useEffect(() => {
    const h = (e) => { if (dirty) { e.preventDefault(); e.returnValue = ""; } };
    window.addEventListener("beforeunload", h);
    return () => window.removeEventListener("beforeunload", h);
  }, [dirty]);

  const save = async () => {
    setBusy(true);
    try {
      const payload = { title: content.title, sections: sections.map((s) => ({ id: s.id, type: s.type, hidden: !!s.hidden, data: stripMedia(s.data), styles: s.styles || {} })) };
      const r = await api.put(`/admin/pages/${pageKey}/live`, payload);
      setContent(r.data.content); setBase(r.data.content); setDirty(false); setHist({ past: [], future: [] }); remount();
      toast.success("Saved — your changes are now live on the public page");
    } catch (e) { toast.error(errMsg(e)); } finally { setBusy(false); }
  };
  const setImage = (m) => { patchSec(sel.sec, (s) => ({ ...s, data: { ...s.data, image: { ...(s.data.image || {}), media_id: m.id, media: undefined } } })); remount(); setBusy(false); };
  const upload = async (file) => {
    if (!file) return;
    const fd = new FormData(); fd.append("file", file); fd.append("category", "live-editor");
    try { setBusy(true); const r = await api.post("/admin/media", fd); setImage(r.data); }
    catch (e) { toast.error(errMsg(e)); setBusy(false); }
  };
  const exit = () => {
    if (dirty && !window.confirm("You have unsaved changes. Leave the live editor and discard them?")) return;
    if (dirty) { setContent(base); setDirty(false); remount(); }
    setSel(null); setDevice("desktop"); setOn(false);
  };
  const drag = (mode) => (e) => {
    e.preventDefault();
    const start = { x: e.clientX, y: e.clientY, w: rect.width, h: rect.height };
    const mv = (ev) => setStyles({
      ...(mode !== "h" ? { width: `${Math.max(40, Math.round(start.w + ev.clientX - start.x))}px` } : {}),
      ...(mode !== "w" ? { height: `${Math.max(30, Math.round(start.h + ev.clientY - start.y))}px` } : {}),
    });
    const up = () => { window.removeEventListener("pointermove", mv); window.removeEventListener("pointerup", up); };
    window.addEventListener("pointermove", mv); window.addEventListener("pointerup", up);
  };

  if (!on) return (
    <button type="button" className="live-ui live-toggle" onClick={() => setOn(true)} data-testid="live-editor-toggle"><Pencil size={15} /> Live editor</button>
  );

  return (
    <>
      {rect && (
        <div className={`live-ui live-box ${field === "_section" ? "live-box-sec" : ""}`} style={{ top: rect.top, left: rect.left, width: rect.width, height: rect.height }} data-testid="live-selection-box">
          {field !== "_section" && (<>
            <span className="live-handle live-h-r" onPointerDown={drag("w")} data-testid="live-resize-width" />
            <span className="live-handle live-h-b" onPointerDown={drag("h")} data-testid="live-resize-height" />
            <span className="live-handle live-h-c" onPointerDown={drag("both")} data-testid="live-resize-corner" />
          </>)}
          {sec && (
            <div className="live-sectools" data-testid="live-section-tools">
              <button type="button" title="Move up" onClick={() => move(sec.id, -1)} data-testid="live-sec-up"><ArrowUp size={14} /></button>
              <button type="button" title="Move down" onClick={() => move(sec.id, 1)} data-testid="live-sec-down"><ArrowDown size={14} /></button>
              <button type="button" title="Duplicate" onClick={() => dup(sec.id)} data-testid="live-sec-duplicate"><Copy size={14} /></button>
              <button type="button" title={sec.hidden ? "Show" : "Hide"} onClick={() => toggleHide(sec.id)} data-testid="live-sec-hide">{sec.hidden ? <EyeOff size={14} /> : <Eye size={14} />}</button>
              <button type="button" title="Delete" onClick={() => remove(sec.id)} data-testid="live-sec-delete"><Trash2 size={14} /></button>
              <button type="button" title="Add section below" onClick={() => setAddAt(idx(sec.id) + 1)} data-testid="live-sec-add-below"><Plus size={14} /></button>
            </div>
          )}
        </div>
      )}

      <aside className="live-ui live-panel" data-testid="live-editor-panel">
        <div className="live-row live-top">
          <strong>Live editor</strong>
          <button type="button" className="live-btn" disabled={!hist.past.length} onClick={undo} title="Undo" data-testid="live-undo"><Undo2 size={14} /></button>
          <button type="button" className="live-btn" disabled={!hist.future.length} onClick={redo} title="Redo" data-testid="live-redo"><Redo2 size={14} /></button>
          <button type="button" className="live-btn live-primary" disabled={busy || !dirty} onClick={save} data-testid="live-save-btn"><Save size={14} /> {busy ? "Saving…" : "Save"}</button>
          <button type="button" className="live-btn" onClick={exit} aria-label="Close live editor" data-testid="live-exit-btn"><X size={14} /></button>
        </div>

        <div className="live-devs" role="group" aria-label="Preview device">
          {[["desktop", Monitor], ["tablet", Tablet], ["mobile", Smartphone]].map(([d, I]) => (
            <button key={d} type="button" className={`live-btn ${device === d ? "live-on" : ""}`} onClick={() => setDevice(d)} aria-label={d} data-testid={`live-device-${d}`}><I size={14} /></button>
          ))}
        </div>

        {!sel || !sec ? (
          <p className="live-hint" data-testid="live-hint">Click any heading, text, image or section on the page to edit it. Drag the red handles to resize. Use the tools on a selection to move, duplicate, hide, delete or add sections. Press Save to publish your changes live.</p>
        ) : (
          <div data-testid="live-controls">
            <p className="live-label" data-testid="live-selected-label">{LABELS[field] || field}</p>

            {field === "image" ? (
              <div className="live-row">
                <button type="button" className="live-btn" onClick={() => setPicker(true)} data-testid="live-choose-image"><Images size={14} /> Library</button>
                <button type="button" className="live-btn" onClick={() => fileRef.current?.click()} disabled={busy} data-testid="live-upload-image"><Upload size={14} /> Upload</button>
                <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => upload(e.target.files?.[0])} data-testid="live-upload-input" />
              </div>
            ) : field === "_section" ? (
              <p className="live-hint">Style the whole section — its background colour and spacing.</p>
            ) : (<>
              <p className="live-hint">Type directly on the page to change the words.</p>
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
                <button type="button" className={`live-btn ${st.fontWeight === "700" ? "live-on" : ""}`} onClick={() => setStyles({ fontWeight: st.fontWeight === "700" ? "" : "700" })} title="Bold" data-testid="live-bold"><Bold size={14} /></button>
                <button type="button" className={`live-btn ${st.fontStyle === "italic" ? "live-on" : ""}`} onClick={() => setStyles({ fontStyle: st.fontStyle === "italic" ? "" : "italic" })} title="Italic" data-testid="live-italic"><Italic size={14} /></button>
                <button type="button" className={`live-btn ${st.textTransform === "uppercase" ? "live-on" : ""}`} onClick={() => setStyles({ textTransform: st.textTransform === "uppercase" ? "" : "uppercase" })} title="UPPERCASE" data-testid="live-uppercase">AA</button>
              </div>
              <div className="live-row">
                <label className="live-field"><Paintbrush size={12} /> Colour<input type="color" value={st.color || "#2b2b2b"} onChange={(e) => setStyles({ color: e.target.value })} data-testid="live-font-color" /></label>
                <div className="live-field">Align
                  <div className="live-row" style={{ margin: 0 }}>{[["left", AlignLeft], ["center", AlignCenter], ["right", AlignRight]].map(([a, I]) => (
                    <button key={a} type="button" className={`live-btn ${st.textAlign === a ? "live-on" : ""}`} onClick={() => setStyles({ textAlign: st.textAlign === a ? "" : a })} aria-label={`Align ${a}`} data-testid={`live-align-${a}`}><I size={14} /></button>
                  ))}</div>
                </div>
              </div>
              <div className="live-row">
                <label className="live-field">Line height<input type="number" step="0.1" min="0.8" max="3" value={st.lineHeight || ""} placeholder="auto" onChange={(e) => setStyles({ lineHeight: e.target.value })} data-testid="live-line-height" /></label>
                <label className="live-field">Letter sp.<input type="text" value={st.letterSpacing || ""} placeholder="e.g. 1px" onChange={(e) => setStyles({ letterSpacing: e.target.value })} data-testid="live-letter-spacing" /></label>
              </div>
            </>)}

            {(field === "image" || isText) && (
              <div className="live-row">
                <label className="live-field">Width (px)<input type="number" value={px(st.width)} placeholder="auto" onChange={(e) => setStyles({ width: e.target.value ? `${e.target.value}px` : "" })} data-testid="live-width" /></label>
                <label className="live-field">Height (px)<input type="number" value={px(st.height)} placeholder="auto" onChange={(e) => setStyles({ height: e.target.value ? `${e.target.value}px` : "" })} data-testid="live-height" /></label>
              </div>
            )}

            <div className="live-sec-style">
              <p className="live-label">Section background &amp; spacing</p>
              <SectionStyle sec={sec} onChange={(patch) => patchSec(sec.id, (s) => {
                const f = { ...((s.styles || {})._section || {}), ...patch };
                Object.keys(f).forEach((k) => (f[k] === "" || f[k] == null) && delete f[k]);
                return { ...s, styles: { ...(s.styles || {}), _section: f } };
              })} />
            </div>

            <div className="live-row" style={{ marginTop: 10 }}>
              <button type="button" className="live-btn" onClick={() => setStyles({ width: "", height: "" })} data-testid="live-reset-size"><RotateCcw size={14} /> Reset size</button>
              <button type="button" className="live-btn" onClick={() => patchSec(sel.sec, (s) => ({ ...s, styles: { ...(s.styles || {}), [field]: {} } }))} data-testid="live-reset-style"><RotateCcw size={14} /> Clear styles</button>
            </div>
          </div>
        )}

        <div className="live-add-block">
          <button type="button" className="live-btn live-add-btn" onClick={() => setAddAt(sections.length)} data-testid="live-add-section"><Plus size={14} /> Add a new section</button>
        </div>
      </aside>

      {addAt !== null && (
        <div className="live-ui live-add-menu" data-testid="live-add-menu" role="dialog" aria-label="Add a section">
          <div className="live-add-head"><strong>Add a section</strong><button type="button" className="live-btn" onClick={() => setAddAt(null)} data-testid="live-add-close"><X size={14} /></button></div>
          <div className="live-add-grid">
            {ADD_TYPES.map(([type, label, I]) => (
              <button key={type} type="button" className="live-add-item" onClick={() => addSection(type)} data-testid={`live-add-${type}`}><I size={20} /><span>{label}</span></button>
            ))}
          </div>
        </div>
      )}

      <MediaPicker open={picker} onClose={() => setPicker(false)} onPick={setImage} />
    </>
  );
}

function SectionStyle({ sec, onChange }) {
  const s = (sec.styles || {})._section || {};
  return (
    <>
      <div className="live-row">
        <label className="live-field">Background<input type="color" value={s.backgroundColor || "#ffffff"} onChange={(e) => onChange({ backgroundColor: e.target.value })} data-testid="live-sec-bg" /></label>
        <button type="button" className="live-btn" onClick={() => onChange({ backgroundColor: "" })} data-testid="live-sec-bg-clear" title="Clear background"><RotateCcw size={14} /></button>
      </div>
      <div className="live-row">
        <label className="live-field">Space top (px)<input type="number" value={px(s.paddingTop)} placeholder="auto" onChange={(e) => onChange({ paddingTop: e.target.value ? `${e.target.value}px` : "" })} data-testid="live-sec-pad-top" /></label>
        <label className="live-field">Space bottom (px)<input type="number" value={px(s.paddingBottom)} placeholder="auto" onChange={(e) => onChange({ paddingBottom: e.target.value ? `${e.target.value}px` : "" })} data-testid="live-sec-pad-bottom" /></label>
      </div>
    </>
  );
}
