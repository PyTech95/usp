import { Link } from "react-router-dom";
import { Photo } from "./Photo";
import { fmtDate } from "../../lib/api";

export const KIND = { article: "Article", photo_essay: "Photo essay", interview: "Interview", workshop_reflection: "Workshop reflection", resource: "Resource" };

export function NoteList({ items }) {
  if (!items.length) return <p data-testid="notes-empty">No Field Notes have been published here yet.</p>;
  return (
    <ul style={{ listStyle: "none", padding: 0, margin: "1.5rem 0 0" }} data-testid="notes-list">
      {items.map((n) => (
        <li key={n.slug} className="note-item reveal" data-testid={`note-item-${n.slug}`}>
          <article>
            <p className="eyebrow" style={{ marginBottom: ".5rem" }}>{KIND[n.kind] || "Field Note"}{n.category ? ` · ${n.category}` : ""}</p>
            <h3 className="h3" style={{ fontSize: "1.5rem" }}><Link to={`/field-notes/${n.slug}`}>{n.title}</Link></h3>
            {n.standfirst && <p style={{ margin: ".4rem 0" }}>{n.standfirst}</p>}
            <p className="meta" style={{ margin: 0 }}>{n.author}{n.author ? " · " : ""}<time dateTime={n.published_at}>{fmtDate(n.published_at)}</time></p>
          </article>
          <div>{n.cover && <Photo ref_={{ media: n.cover }} sizes="(min-width: 860px) 30vw, 90vw" crop="4/3" framed />}</div>
        </li>
      ))}
    </ul>
  );
}
