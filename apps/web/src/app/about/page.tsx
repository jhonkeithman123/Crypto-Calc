"use client";

import Link from "next/link";
import GalaxyBackgroundWeb from "../components/GalaxyBackgroundWeb";

const CREATOR_NAME = "Keith Justine Virgenes";
const REPO_OWNER = "jhonkeithman123";
const REPO_NAME = "Crypto-Calc";
const GITHUB_PROFILE_URL = `https://github.com/${REPO_OWNER}`;
const FACEBOOK_URL = `https://facebook.com/${REPO_OWNER}`;
const CURRENT_VERSION = "0.2.0";

export default function AboutPage() {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "var(--bg-base)",
        position: "relative",
      }}
    >
      <GalaxyBackgroundWeb preset="cinematic" />

      <header
        style={{
          padding: "12px 16px",
          borderBottom: "1px solid var(--border-subtle)",
          background: "rgba(19,17,42,0.78)",
          position: "sticky",
          top: 0,
          zIndex: 50,
          display: "flex",
          alignItems: "center",
          gap: 10,
        }}
      >
        <div
          style={{
            width: 30,
            height: 30,
            borderRadius: 8,
            background:
              "linear-gradient(135deg,var(--accent-purple),var(--accent-cyan))",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontWeight: 700,
            color: "#fff",
          }}
        >
          i
        </div>
        <div>
          <h1 style={{ margin: 0, fontSize: 14, fontWeight: 700 }}>About</h1>
          <p style={{ margin: 0, fontSize: 10, color: "var(--text-muted)" }}>
            Creator info and useful project links
          </p>
        </div>
        <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
          <Link href="/" className="btn-ghost">
            Cipher
          </Link>
          <Link href="/modcalc" className="btn-ghost">
            Mod Calc
          </Link>
          <Link href="/convert" className="btn-ghost">
            Convert
          </Link>
        </div>
      </header>

      <main
        style={{
          maxWidth: 860,
          margin: "0 auto",
          padding: "14px 12px 46px",
          position: "relative",
          zIndex: 1,
        }}
      >
        <section
          className="panel"
          style={{
            padding: 14,
            marginBottom: 10,
            background: "rgba(19,17,42,0.72)",
          }}
        >
          <div className="section-label">App Information</div>
          <div
            style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 4 }}
          >
            App
          </div>
          <div
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              color: "var(--accent-cyan)",
              fontSize: 14,
            }}
          >
            Crypto Calc Web
          </div>
          <div
            style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 4 }}
          >
            Current Version
          </div>
          <div
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              color: "var(--accent-cyan)",
              fontSize: 14,
            }}
          >
            {CURRENT_VERSION}
          </div>
          <div
            style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 4 }}
          >
            Creator
          </div>
          <div
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              color: "var(--accent-cyan)",
              fontSize: 14,
            }}
          >
            {CREATOR_NAME}
          </div>
        </section>

        <section
          className="panel"
          style={{
            padding: 14,
            marginBottom: 10,
            background: "rgba(19,17,42,0.72)",
          }}
        >
          <div className="section-label">Links</div>
          <div style={{ display: "grid", gap: 8 }}>
            <a
              className="btn-ghost"
              href={GITHUB_PROFILE_URL}
              target="_blank"
              rel="noreferrer"
            >
              Creator GitHub
            </a>
            <a
              className="btn-ghost"
              href={FACEBOOK_URL}
              target="_blank"
              rel="noreferrer"
            >
              Creator Facebook
            </a>
            <a
              className="btn-ghost"
              href={`https://github.com/${REPO_OWNER}/${REPO_NAME}`}
              target="_blank"
              rel="noreferrer"
            >
              Project Repository
            </a>
          </div>
        </section>

        <section
          className="panel"
          style={{ padding: 14, background: "rgba(19,17,42,0.72)" }}
        >
          <div className="section-label">Update Checks</div>
          <div
            style={{
              fontSize: 12,
              color: "var(--text-secondary)",
              lineHeight: 1.6,
            }}
          >
            Live update checking is available in the mobile app only. Open
            Crypto Calc on mobile and use About to check GitHub releases.
          </div>
          <div
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              color: "var(--accent-cyan)",
              fontSize: 14,
              marginTop: 8,
            }}
          >
            Web version: {CURRENT_VERSION}
          </div>
        </section>
      </main>
    </div>
  );
}
