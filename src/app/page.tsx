"use client";

import Link from "next/link";
import { useI18n } from "@/features/i18n/i18n-provider";

export default function HomePage() {
  const { t } = useI18n();

  return (
    <div className="home-shell">
      <section className="hero-card">
        <div className="hero-copy">
          <span className="eyebrow"><span className="status-dot" /> {t("home.eyebrow")}</span>
          <h1>{t("home.title.first")}<br /><span>{t("home.title.second")}</span></h1>
          <p>{t("home.description")}</p>
          <Link className="primary-button hero-button" href="/learn/verbs/">
            {t("home.start")} <span aria-hidden="true">→</span>
          </Link>
          <div className="hero-meta"><span>01</span><span>{t("home.tagline")}</span></div>
        </div>
        <div className="hero-art" aria-hidden="true">
          <div className="orbit orbit-one" /><div className="orbit orbit-two" />
          <div className="floating-word word-ik">ik</div>
          <div className="floating-word word-loop">loop</div>
          <div className="floating-word word-gelopen">gelopen</div>
          <div className="art-center"><span>goed</span><i>✓</i></div>
          <span className="sparkle sparkle-one">✳</span><span className="sparkle sparkle-two">✦</span>
        </div>
        <div className="hero-index">DUTCHFLOW <span>·</span> 01 / 05</div>
      </section>
      <section className="module-grid" aria-label={t("home.modules")}>
        <Link className="module-preview" href="/learn/verbs/">
          <div>
            <span className="eyebrow">{t("home.verbs.eyebrow")}</span>
            <h2>{t("home.verbs.title")}</h2>
            <p>{t("home.verbs.description")}</p>
          </div>
          <span className="module-arrow" aria-hidden="true">↗</span>
        </Link>
        <Link className="module-preview" href="/learn/vocabulary/">
          <div>
            <span className="eyebrow">{t("home.vocabulary.eyebrow")}</span>
            <h2>{t("home.vocabulary.title")}</h2>
            <p>{t("home.vocabulary.description")}</p>
          </div>
          <span className="module-arrow" aria-hidden="true">↗</span>
        </Link>
      </section>
    </div>
  );
}
