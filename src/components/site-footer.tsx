"use client";

import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="site-footer-branding">
        <Link className="site-footer-wordmark" href="/">Launch<span>Lens</span></Link>
        <span>Market entry, with cultural context.</span>
      </div>
      <div className="site-footer-meta">
        <span>© 2026 LaunchLens</span>
        <nav aria-label="Footer navigation">
          <Link href="/about">About</Link>
          <Link href="/about#methodology">Methodology</Link>
          <Link href="/about#privacy">Privacy</Link>
          <a href="https://docs.qloo.com/reference/qloo-llm-hackathon-developer-guide" target="_blank" rel="noreferrer">Qloo docs</a>
          <a href="https://github.com/cbonoz/qloo26" target="_blank" rel="noreferrer">Source &amp; license</a>
        </nav>
      </div>
    </footer>
  );
}
