"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { motion, useInView, useReducedMotion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";

const MovementFieldHero = dynamic(() => import("@/components/3d/MovementFieldHero"), {
  ssr: false,
});

function Reveal({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const visible = useInView(ref, { once: true, margin: "-100px" });
  return <motion.div ref={ref} initial={{ opacity: 0, y: 32 }} animate={visible ? { opacity: 1, y: 0 } : undefined}>{children}</motion.div>;
}

const steps = [
  { number: "01", title: "Build your profile", description: "Choose your sports, level, language, and the connections you want." },
  { number: "02", title: "Discover events", description: "Find small activities nearby without exposing anyone's exact location." },
  { number: "03", title: "Request a place", description: "Hosts review requests before private event details become visible." },
  { number: "04", title: "Meet through movement", description: "Use the shared activity to make the first meeting feel natural." },
];

const safetyFeatures = [
  { icon: "18+", title: "Adults only", description: "The initial product is designed exclusively for adults." },
  { icon: "LOC", title: "Private by default", description: "Exact meeting details stay hidden until a request is accepted." },
  { icon: "CTL", title: "Member controls", description: "Blocking, reporting, and moderation are part of the product baseline." },
  { icon: "EU", title: "Europe first", description: "Privacy and safety requirements shape the product from day one." },
];

export default function LandingPage() {
  const prefersReducedMotion = useReducedMotion();
  const { scrollY } = useScroll();
  const titleY = useTransform(scrollY, [0, 300], [0, prefersReducedMotion ? 0 : -42]);
  const titleOpacity = useTransform(scrollY, [0, 300], [1, prefersReducedMotion ? 1 : 0.35]);

  // Tasteful staggered entrance for the hero copy. Reduced-motion collapses it
  // to a plain fade with no movement.
  const enter = prefersReducedMotion
    ? { hidden: { opacity: 0 }, show: { opacity: 1 } }
    : {
        hidden: { opacity: 0, y: 24 },
        show: { opacity: 1, y: 0 },
      };
  const heroStagger = {
    hidden: {},
    show: { transition: { staggerChildren: prefersReducedMotion ? 0 : 0.12, delayChildren: 0.1 } },
  };

  return (
    <main className="landing-page">
      <nav className="navbar" aria-label="Primary navigation">
        <div className="nav-container">
          <Link className="logo" href="/landing">Sport Date</Link>
          <div className="landing-nav-actions">
            <Link href="/login" className="nav-signin">Sign in</Link>
            <Link href="/signup" className="nav-cta">Create a profile</Link>
          </div>
        </div>
      </nav>

      <section className="hero-section">
        <motion.div
          className="hero-content"
          style={{ y: titleY, opacity: titleOpacity }}
          variants={heroStagger}
          initial="hidden"
          animate="show"
        >
          <motion.p className="eyebrow" variants={enter}>Meet through movement</motion.p>
          <motion.h1 className="hero-title" variants={enter}>Find people who share your <span className="gradient-text">passion for sports</span></motion.h1>
          <motion.p className="hero-subtitle" variants={enter}>Discover local activities, request a place, and meet compatible people around something you already enjoy.</motion.p>
          <motion.div className="hero-cta" variants={enter}><Link href="/signup" className="btn-hero">Start your profile</Link></motion.div>
          <motion.p className="microcopy" variants={enter}>Private beta · Adults only · Europe first</motion.p>
        </motion.div>
        <motion.div
          className="hero-3d"
          initial={{ opacity: 0, scale: prefersReducedMotion ? 1 : 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: prefersReducedMotion ? 0.4 : 0.9, ease: "easeOut" }}
          aria-hidden="true"
        >
          <MovementFieldHero />
        </motion.div>
      </section>

      <section className="how-it-works">
        <Reveal>
          <div className="section-container">
            <p className="eyebrow">How it works</p>
            <h2 className="section-title">Less swiping. More living.</h2>
            <div className="steps-grid">{steps.map((step) => <article className="step-card" key={step.number}><div className="step-number">{step.number}</div><h3>{step.title}</h3><p>{step.description}</p></article>)}</div>
          </div>
        </Reveal>
      </section>

      <section className="why-section">
        <Reveal>
          <div className="section-container">
            <p className="eyebrow">Safety is product work</p>
            <h2 className="section-title">Built for real-world meetings.</h2>
            <div className="why-grid">{safetyFeatures.map((feature) => <article className="why-card" key={feature.title}><span className="why-icon">{feature.icon}</span><h3>{feature.title}</h3><p>{feature.description}</p></article>)}</div>
            <div className="trust-preview-callout">
              <p>Want the honest version of our trust posture?</p>
              <Link href="/trust">Read the Trust preview</Link>
            </div>
          </div>
        </Reveal>
      </section>

      <section className="cta-section">
        <div className="cta-card"><h2>Ready to find your next game?</h2><p>Build a private beta profile and help shape the experience.</p><Link href="/signup" className="btn-cta">Create a profile</Link></div>
      </section>

      <footer className="landing-footer">
        <div className="landing-footer-shell">
          <p>Preview-era product boundaries, not final legal approval.</p>
          <nav aria-label="Legal links">
            <Link href="/trust">Trust preview</Link>
            <Link href="/terms">Terms preview</Link>
            <Link href="/privacy">Privacy Notice preview</Link>
            <Link href="/safety-guidelines">Safety Guidelines</Link>
          </nav>
        </div>
      </footer>
    </main>
  );
}
