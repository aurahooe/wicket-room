"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getBrowserClient } from "../lib/supabase";

export default function Home() {
  const [notes, setNotes] = useState([]);
  const [hours, setHours] = useState([]);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const sb = getBrowserClient();
    sb.auth.getUser().then(({ data }) => setUser(data.user || null));
    sb.from("wicket_notes")
      .select("id, body, created_at, wicket_profiles(handle, display_name)")
      .eq("is_public", true)
      .order("created_at", { ascending: false })
      .limit(40)
      .then(({ data }) => setNotes(data || []));
    sb.from("wicket_hours")
      .select("*")
      .order("shipped_at", { ascending: false })
      .limit(12)
      .then(({ data }) => setHours(data || []));
  }, []);

  return (
    <div className="wrap">
      <header className="top">
        <Link href="/" className="mark">Wic<span>ket</span></Link>
        <nav>
          <Link href="/">Wall</Link>
          <Link href="/desk">{user ? "Desk" : "Sign in"}</Link>
        </nav>
      </header>

      <section className="hero">
        <h1>Leave something<br />on the wall.</h1>
        <p>
          A quiet public room. Write privately if you want. Anything you mark public
          appears here for everyone else.
        </p>
      </section>

      <div className="grid">
        <section className="card">
          <h2 style={{ fontFamily: "Fraunces, serif", fontWeight: 500, marginTop: 0 }}>Public wall</h2>
          {notes.length === 0 && <p style={{ color: "var(--muted)" }}>Still empty. Be the first.</p>}
          {notes.map((n) => (
            <article className="note" key={n.id}>
              <div className="meta">
                {n.wicket_profiles?.display_name || "wanderer"} · @{n.wicket_profiles?.handle || "anon"} ·{" "}
                {new Date(n.created_at).toLocaleString()}
              </div>
              <p>{n.body}</p>
            </article>
          ))}
        </section>

        <aside className="card">
          <h2 style={{ fontFamily: "Fraunces, serif", fontWeight: 500, marginTop: 0 }}>This hour</h2>
          <ul className="hours">
            {hours.map((h) => (
              <li key={h.id}>
                <h3>{h.title}</h3>
                <p>{h.body}</p>
              </li>
            ))}
          </ul>
        </aside>
      </div>
    </div>
  );
}
