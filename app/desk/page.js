"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getBrowserClient } from "../../lib/supabase";

export default function Desk() {
  const sb = getBrowserClient();
  const [mode, setMode] = useState("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [handle, setHandle] = useState("");
  const [name, setName] = useState("");
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [notes, setNotes] = useState([]);
  const [body, setBody] = useState("");
  const [isPublic, setIsPublic] = useState(true);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  async function load(u) {
    const { data: p } = await sb.from("wicket_profiles").select("*").eq("id", u.id).maybeSingle();
    setProfile(p);
    const { data: mine } = await sb
      .from("wicket_notes")
      .select("*")
      .eq("author_id", u.id)
      .order("created_at", { ascending: false });
    setNotes(mine || []);
  }

  useEffect(() => {
    sb.auth.getUser().then(async ({ data }) => {
      if (data.user) {
        setUser(data.user);
        await load(data.user);
      }
    });
  }, []);

  async function signIn(e) {
    e.preventDefault();
    setBusy(true); setErr("");
    const { error } = await sb.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) return setErr(error.message);
    const { data } = await sb.auth.getUser();
    setUser(data.user);
    await load(data.user);
  }

  async function signUp(e) {
    e.preventDefault();
    setBusy(true); setErr("");
    const h = handle.trim().toLowerCase().replace(/[^a-z0-9_]/g, "");
    if (h.length < 2) { setBusy(false); return setErr("Handle needs two letters at least."); }
    const { data, error } = await sb.auth.signUp({ email, password });
    if (error) { setBusy(false); return setErr(error.message); }
    if (data.user) {
      const { error: pErr } = await sb.from("wicket_profiles").insert({
        id: data.user.id,
        handle: h,
        display_name: name.trim() || h,
      });
      if (pErr) { setBusy(false); return setErr(pErr.message); }
      setUser(data.user);
      await load(data.user);
    }
    setBusy(false);
  }

  async function finishProfile(e) {
    e.preventDefault();
    const h = handle.trim().toLowerCase().replace(/[^a-z0-9_]/g, "");
    const { error } = await sb.from("wicket_profiles").insert({
      id: user.id,
      handle: h,
      display_name: name.trim() || h,
    });
    if (error) return setErr(error.message);
    await load(user);
  }

  async function postNote(e) {
    e.preventDefault();
    setErr("");
    const { error } = await sb.from("wicket_notes").insert({
      author_id: user.id,
      body: body.trim(),
      is_public: isPublic,
    });
    if (error) return setErr(error.message);
    setBody("");
    await load(user);
  }

  async function togglePublic(note) {
    await sb.from("wicket_notes").update({ is_public: !note.is_public }).eq("id", note.id);
    await load(user);
  }

  async function remove(note) {
    await sb.from("wicket_notes").delete().eq("id", note.id);
    await load(user);
  }

  async function out() {
    await sb.auth.signOut();
    setUser(null);
    setProfile(null);
    setNotes([]);
  }

  return (
    <div className="wrap">
      <header className="top">
        <Link href="/" className="mark">Wic<span>ket</span></Link>
        <nav>
          <Link href="/">Wall</Link>
          {user && <button className="btn ghost" onClick={out}>Leave</button>}
        </nav>
      </header>

      {!user && (
        <section className="card" style={{ maxWidth: 420, margin: "48px auto" }}>
          <h1 style={{ fontFamily: "Fraunces, serif", fontWeight: 500 }}>Come in</h1>
          <p style={{ color: "var(--muted)" }}>Email and a password. That’s the whole gate.</p>
          <div style={{ display: "flex", gap: 10, margin: "16px 0" }}>
            <button className={mode === "signin" ? "btn" : "btn ghost"} onClick={() => setMode("signin")}>Sign in</button>
            <button className={mode === "signup" ? "btn" : "btn ghost"} onClick={() => setMode("signup")}>Create account</button>
          </div>
          <form className="stack" onSubmit={mode === "signin" ? signIn : signUp}>
            {mode === "signup" && (
              <>
                <input placeholder="display name" value={name} onChange={(e) => setName(e.target.value)} />
                <input placeholder="handle" value={handle} onChange={(e) => setHandle(e.target.value)} />
              </>
            )}
            <input type="email" placeholder="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            <input type="password" placeholder="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            {err && <div className="err">{err}</div>}
            <button className="btn" disabled={busy}>{busy ? "Working…" : mode === "signin" ? "Enter" : "Make a desk"}</button>
          </form>
        </section>
      )}

      {user && !profile && (
        <section className="card" style={{ maxWidth: 420, margin: "48px auto" }}>
          <h1 style={{ fontFamily: "Fraunces, serif" }}>Name yourself</h1>
          <form className="stack" onSubmit={finishProfile}>
            <input placeholder="display name" value={name} onChange={(e) => setName(e.target.value)} />
            <input placeholder="handle" value={handle} onChange={(e) => setHandle(e.target.value)} required />
            {err && <div className="err">{err}</div>}
            <button className="btn">Save</button>
          </form>
        </section>
      )}

      {user && profile && (
        <div className="grid" style={{ marginTop: 36 }}>
          <section className="card">
            <h2 style={{ fontFamily: "Fraunces, serif", fontWeight: 500, marginTop: 0 }}>New note</h2>
            <form className="stack" onSubmit={postNote}>
              <textarea value={body} onChange={(e) => setBody(e.target.value)} maxLength={2000} placeholder="Write something you wouldn’t put on a billboard, or would." required />
              <label className="check">
                <input type="checkbox" checked={isPublic} onChange={(e) => setIsPublic(e.target.checked)} />
                Show this on the public wall
              </label>
              {err && <div className="err">{err}</div>}
              <button className="btn">Pin it</button>
            </form>
          </section>
          <section className="card">
            <h2 style={{ fontFamily: "Fraunces, serif", fontWeight: 500, marginTop: 0 }}>Your drawer</h2>
            <p style={{ color: "var(--muted)" }}>@{profile.handle}</p>
            {notes.map((n) => (
              <article className="note" key={n.id}>
                <div className="meta">{n.is_public ? "public" : "private"} · {new Date(n.created_at).toLocaleString()}</div>
                <p>{n.body}</p>
                <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
                  <button className="btn ghost" onClick={() => togglePublic(n)}>{n.is_public ? "Make private" : "Make public"}</button>
                  <button className="btn ghost" onClick={() => remove(n)}>Burn</button>
                </div>
              </article>
            ))}
          </section>
        </div>
      )}
    </div>
  );
}
