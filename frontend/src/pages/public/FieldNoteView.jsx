import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Download, Pencil, Save, X } from "lucide-react";
import { api, errMsg, fmtDate, media } from "../../lib/api";
import { useMeta, useSite, SITE_URL } from "../../lib/site";
import { useAuth } from "../../lib/auth";
import { toast } from "sonner";
import { Photo } from "../../components/public/Photo";
import { NoteList, KIND } from "../../components/public/NoteList";
import { Crumbs } from "./PageView";
import NotFound from "./NotFound";

export function NoteArticle({ note, id, slug, published_at, updated_at, related = [] }) {
  const site = useSite();
  useMeta({
    title: note.seo?.title || `${note.title} — ${site?.site_name || "USP India"}`,
    description: note.seo?.description || note.standfirst,
    canonical: note.seo?.canonical || `${SITE_URL}/field-notes/${slug}`,
    noindex: note.seo?.noindex,
  });
  return (
    <article data-testid="field-note">
      <NoteLiveEditor id={id} />
      <Crumbs path={`/field-notes/${slug}`} title={note.title} />
      <header className="wrap article-head" style={{ paddingTop: "3rem", paddingBottom: "2rem" }}>
        <p className="eyebrow">{KIND[note.kind] || "Field Note"}{note.category ? ` · ${note.category}` : ""}</p>
        <h1 className="h1" data-testid="note-title" data-note-edit="title">{note.title}</h1>
        {note.standfirst && <p className="lede" data-testid="note-standfirst" data-note-edit="standfirst">{note.standfirst}</p>}
        <p className="meta">
          {note.author && <>By <span data-testid="note-author" data-note-edit="author">{note.author}</span> · </>}
          {published_at && <>Published <time dateTime={published_at}>{fmtDate(published_at)}</time></>}
          {updated_at && updated_at.slice(0, 10) !== (published_at || "").slice(0, 10) && <> · Updated <time dateTime={updated_at}>{fmtDate(updated_at)}</time></>}
        </p>
      </header>
      {note.cover?.media && <div className="wrap"><Photo ref_={note.cover} eager sizes="(min-width: 1240px) 1100px, 100vw" /></div>}
      <div className="wrap section">
        <div className="prose" style={{ margin: "0 auto" }} data-testid="note-body" data-note-edit="body_html" dangerouslySetInnerHTML={{ __html: note.body_html }} />
        <div className="prose" style={{ margin: "0 auto" }}>
          {note.credits && <p className="meta">Credits: {note.credits}</p>}
          {note.references?.length > 0 && (
            <section><h2>References</h2><ol>{note.references.map((r, i) => <li key={i}>{r.text}{r.url && <> — <a href={r.url} rel="noopener noreferrer">source</a></>}</li>)}</ol></section>
          )}
          {note.downloads?.length > 0 && (
            <section><h2>Downloads</h2><ul style={{ listStyle: "none", padding: 0 }}>{note.downloads.map((d, i) => d.media && <li key={i}><a href={media(`/api/media/${d.media.id}/file`)}><Download size={16} aria-hidden="true" style={{ display: "inline" }} /> {d.label || "Download"}</a></li>)}</ul></section>
          )}
        </div>
      </div>
      <section className="wrap section">
        <h2 className="h2">Related Field Notes</h2>
        <NoteList items={related} />
      </section>
    </article>
  );
}

export default function FieldNoteView() {
  const { slug } = useParams();
  const [data, setData] = useState(undefined);
  useEffect(() => {
    setData(undefined);
    api.get(`/public/notes/${slug}`).then((r) => setData(r.data?.note ? r.data : null)).catch(() => setData(null));
  }, [slug]);
  if (data === undefined) return <div className="wrap section" style={{ minHeight: "60vh" }} aria-busy="true" />;
  if (data === null) return <NotFound />;
  return <NoteArticle {...data} />;
}

export function NoteLiveEditor({ id }) {
  const { can } = useAuth();
  const site = useSite();
  const editParam = typeof window !== "undefined" && new URLSearchParams(window.location.search).has("edit");
  if (!id || !can || !can("content.publish")) return null;
  if (!site?.live_editor_enabled && !editParam) return null;
  return <NoteEditorInner id={id} autoStart={editParam} />;
}

function NoteEditorInner({ id, autoStart }) {
  const [on, setOn] = useState(!!autoStart);
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    document.body.classList.toggle("live-editing", on);
    return () => document.body.classList.remove("live-editing");
  }, [on]);

  useEffect(() => {
    if (!on) return undefined;
    const els = [...document.querySelectorAll("article [data-note-edit]")];
    const mark = () => setDirty(true);
    els.forEach((el) => { el.contentEditable = "true"; el.addEventListener("input", mark); });
    return () => els.forEach((el) => { el.removeEventListener("input", mark); el.removeAttribute("contenteditable"); });
  }, [on]);

  const save = async () => {
    setBusy(true);
    const payload = {};
    document.querySelectorAll("article [data-note-edit]").forEach((el) => {
      const f = el.dataset.noteEdit;
      payload[f] = f === "body_html" ? el.innerHTML : el.innerText.replace(/\n{3,}/g, "\n\n").trim();
    });
    try {
      await api.put(`/admin/notes/${id}/live`, payload);
      setDirty(false);
      toast.success("Saved — your changes are now live on this note");
    } catch (e) { toast.error(errMsg(e)); } finally { setBusy(false); }
  };

  const exit = () => {
    if (dirty && !window.confirm("Leave the editor and discard unsaved changes?")) return;
    setOn(false);
    if (dirty) window.location.reload();
  };

  if (!on) return (
    <button type="button" className="live-ui live-toggle" onClick={() => setOn(true)} data-testid="note-live-toggle"><Pencil size={15} /> Live editor</button>
  );
  return (
    <aside className="live-ui live-panel" data-testid="note-live-panel">
      <div className="live-row live-top">
        <strong className="live-drag"><Pencil size={14} /> Edit this note</strong>
        <button type="button" className="live-btn live-primary" disabled={busy || !dirty} onClick={save} data-testid="note-live-save"><Save size={14} /> {busy ? "Saving…" : "Save"}</button>
        <button type="button" className="live-btn" onClick={exit} aria-label="Close" data-testid="note-live-exit"><X size={14} /></button>
      </div>
      <p className="live-hint">Click the title, standfirst, author or body text on the page and type to edit it. Press Save to publish your changes live.</p>
    </aside>
  );
}
