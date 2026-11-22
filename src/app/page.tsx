import Link from "next/link";

export default function HomePage() {
  return (
    <div className="home-shell">
      <section className="hero-card">
        <div className="hero-copy">
          <span className="eyebrow"><span className="status-dot" /> YOUR DUTCH PRACTICE</span>
          <h1>Make Dutch<br /><span>part of your day.</span></h1>
          <p>Build real confidence with focused practice, thoughtful explanations, and a pace that feels right for you.</p>
          <Link className="primary-button hero-button" href="/learn/verbs/">
            Start a practice <span aria-hidden="true">→</span>
          </Link>
          <div className="hero-meta"><span>01</span><span>Small steps add up</span></div>
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
      <section className="module-grid" aria-label="Available learning modules">
        <Link className="module-preview" href="/learn/verbs/">
          <div><span className="eyebrow">VERB TRAINING</span><h2>Dutch verbs</h2><p>Practice Perfectum and Imperfectum.</p></div>
          <span className="module-arrow" aria-hidden="true">↗</span>
        </Link>
        <Link className="module-preview" href="/learn/vocabulary/">
          <div><span className="eyebrow">WORD PRACTICE</span><h2>Dutch vocabulary</h2><p>Build useful words with short translations.</p></div>
          <span className="module-arrow" aria-hidden="true">↗</span>
        </Link>
      </section>
    </div>
  );
}
