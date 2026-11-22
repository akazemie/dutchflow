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
      <section className="module-preview" aria-label="Available practice module">
        <div><span className="eyebrow">FIRST UP</span><h2>Dutch verbs</h2><p>Start with one useful verb and the Perfectum tense.</p></div>
        <span className="module-arrow" aria-hidden="true">↗</span>
      </section>
    </div>
  );
}
