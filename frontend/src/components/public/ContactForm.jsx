import { useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { api, errMsg } from "../../lib/api";

const TOPICS = ["General", "Collaboration", "Volunteer", "Craft", "Theatre", "Workshops & Learning"];
const EMPTY = { name: "", email: "", topic: "", message: "", phone: "", organisation: "", website: "" };

function validate(f) {
  const e = {};
  if (!f.name.trim()) e.name = "Please enter your name.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email)) e.email = "Please enter a valid email address.";
  if (!TOPICS.includes(f.topic)) e.topic = "Please choose a topic.";
  if (f.message.trim().length < 10) e.message = "Please write a message of at least 10 characters.";
  if (f.phone && !/^[0-9+()\-\s]{6,40}$/.test(f.phone)) e.phone = "Phone may contain digits, spaces and + ( ) - only.";
  return e;
}

export function ContactForm() {
  const [params] = useSearchParams();
  const initialTopic = TOPICS.includes(params.get("topic")) ? params.get("topic") : "";
  const [f, setF] = useState({ ...EMPTY, topic: initialTopic });
  const [errors, setErrors] = useState({});
  const [state, setState] = useState({ status: "idle", msg: "" });
  const started = useRef(Date.now());
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    const v = validate(f);
    setErrors(v);
    if (Object.keys(v).length) {
      document.getElementById(`f-${Object.keys(v)[0]}`)?.focus();
      return;
    }
    setState({ status: "sending", msg: "" });
    try {
      const r = await api.post("/public/enquiries", { ...f, elapsed_ms: Date.now() - started.current });
      setState({ status: "ok", msg: r.data.email_status });
      setF({ ...EMPTY });
    } catch (err) {
      setState({ status: "error", msg: errMsg(err) });
    }
  };

  const field = (k, label, opts = {}) => (
    <div className="form-field">
      <label htmlFor={`f-${k}`}>{label}{opts.optional ? <span style={{ fontWeight: 400 }}> (optional)</span> : ""}</label>
      {opts.textarea ? (
        <textarea id={`f-${k}`} rows={6} value={f[k]} onChange={set(k)} aria-invalid={!!errors[k]} aria-describedby={errors[k] ? `e-${k}` : undefined} data-testid={`contact-${k}`} />
      ) : (
        <input id={`f-${k}`} type={opts.type || "text"} value={f[k]} onChange={set(k)} autoComplete={opts.auto} aria-invalid={!!errors[k]} aria-describedby={errors[k] ? `e-${k}` : undefined} data-testid={`contact-${k}`} />
      )}
      {errors[k] && <span id={`e-${k}`} className="field-error" data-testid={`contact-${k}-error`}>{errors[k]}</span>}
    </div>
  );

  return (
    <form onSubmit={submit} noValidate style={{ maxWidth: 640 }} data-testid="contact-form">
      <div aria-live="polite">
        {state.status === "ok" && (
          <div className="notice" role="status" data-testid="contact-success">
            <strong>Thank you — your message has been received.</strong>
            <p style={{ margin: ".3rem 0 0" }}>{state.msg === "not_configured" ? "It is stored securely for the USP India team. Email notifications are not yet switched on, so replies may take a little longer." : "The team has been notified."}</p>
          </div>
        )}
        {state.status === "error" && <div className="notice error" role="alert" data-testid="contact-error">{state.msg}</div>}
      </div>
      {field("name", "Name", { auto: "name" })}
      {field("email", "Email", { type: "email", auto: "email" })}
      <div className="form-field">
        <label htmlFor="f-topic">Enquiry topic</label>
        <select id="f-topic" value={f.topic} onChange={set("topic")} aria-invalid={!!errors.topic} data-testid="contact-topic">
          <option value="">Choose a topic</option>
          {TOPICS.map((t) => <option key={t}>{t}</option>)}
        </select>
        {errors.topic && <span className="field-error" data-testid="contact-topic-error">{errors.topic}</span>}
      </div>
      {field("message", "Message", { textarea: true })}
      {field("phone", "Phone", { optional: true, type: "tel", auto: "tel" })}
      {field("organisation", "Organisation", { optional: true, auto: "organization" })}
      <div aria-hidden="true" style={{ position: "absolute", left: "-10000px" }}>
        <label htmlFor="f-website">Leave this empty</label>
        <input id="f-website" tabIndex={-1} autoComplete="off" value={f.website} onChange={set("website")} />
      </div>
      <button type="submit" className="btn" disabled={state.status === "sending"} data-testid="contact-submit">
        {state.status === "sending" ? "Sending…" : "Send message"}
      </button>
    </form>
  );
}
