import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Download } from "lucide-react";
import { api, fmtDate, media } from "../../lib/api";
import { useMeta, useSite, SITE_URL } from "../../lib/site";
import { Photo } from "../../components/public/Photo";
import { NoteList, KIND } from "../../components/public/NoteList";
import { Crumbs } from "./PageView";
import NotFound from "./NotFound";

export function NoteArticle({ note, slug, published_at, updated_at, related = [] }) {
  const site = useSite();
  useMeta({
    title: note.seo?.title || `${note.title} — ${site?.site_name || "USP India"}`,
    description: note.seo?.description || note.standfirst,
    canonical: note.seo?.canonical || `${SITE_URL}/field-notes/${slug}`,
    noindex: note.seo?.noindex,
  });
  return (
    <article data-testid="field-note">
      <Crumbs path={`/field-notes/${slug}`} title={note.title} />
      <header className="wrap article-head" style={{ paddingTop: "3rem", paddingBottom: "2rem" }}>
        <p className="eyebrow">{KIND[note.kind] || "Field Note"}{note.category ? ` · ${note.category}` : ""}</p>
        <h1 className="h1" data-testid="note-title">{note.title}</h1>
        {note.standfirst && <p className="lede" data-testid="note-standfirst">{note.standfirst}</p>}
        <p className="meta">
          {note.author && <>By <span data-testid="note-author">{note.author}</span> · </>}
          {published_at && <>Published <time dateTime={published_at}>{fmtDate(published_at)}</time></>}
          {updated_at && updated_at.slice(0, 10) !== (published_at || "").slice(0, 10) && <> · Updated <time dateTime={updated_at}>{fmtDate(updated_at)}</time></>}
        </p>
      </header>
      {note.cover?.media && <div className="wrap"><Photo ref_={note.cover} eager sizes="(min-width: 1240px) 1100px, 100vw" /></div>}
      <div className="wrap section">
        <div className="prose" style={{ margin: "0 auto" }} data-testid="note-body" dangerouslySetInnerHTML={{ __html: note.body_html }} />
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
