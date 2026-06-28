"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { motion, useInView, useScroll, useTransform } from "framer-motion";
import { Suspense, useRef } from "react";

const RotatingSportsBall = dynamic(() => import("@/components/3d/RotatingSportsBall"), {
  ssr: false,
  loading: () => <div className="placeholder-3d">Loading interactive preview…</div>,
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
  const { scrollY } = useScroll();
  const titleY = useTransform(scrollY, [0, 300], [0, -42]);
  const titleOpacity = useTransform(scrollY, [0, 300], [1, 0.35]);

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
        <motion.div className="hero-content" style={{ y: titleY, opacity: titleOpacity }}>
          <p className="eyebrow">Meet through movement</p>
          <h1 className="hero-title">Find people who share your <span className="gradient-text">passion for sports</span></h1>
          <p className="hero-subtitle">Discover local activities, request a place, and meet compatible people around something you already enjoy.</p>
          <div className="hero-cta"><Link href="/signup" className="btn-hero">Start your profile</Link></div>
          <p className="microcopy">Private beta · Adults only · Europe first</p>
        </motion.div>
        <motion.div className="hero-3d" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.8 }}>
          <Suspense fallback={<div className="placeholder-3d">Loading interactive preview…</div>}><RotatingSportsBall /></Suspense>
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
          </div>
        </Reveal>
      </section>

      <section className="cta-section">
        <div className="cta-card"><h2>Ready to find your next game?</h2><p>Build a private beta profile and help shape the experience.</p><Link href="/signup" className="btn-cta">Create a profile</Link></div>
      </section>
    </main>
  );
}
