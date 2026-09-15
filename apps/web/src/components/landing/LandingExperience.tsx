"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import BetaTermExplainer from "@/components/BetaTermExplainer";
import ScrollChapter from "./ScrollChapter";
import { BRAND_NAME, RallyGlyph } from "@/lib/brand";
import EventTutorials from "@/components/EventTutorials";
import ScrollStory from "./ScrollStory";
import { observeHeroMotion } from "./hero-motion";

import s from "./landing.module.css";

type Sport = "Padel" | "Running" | "Walk";

function Arrow() { return <span aria-hidden="true">↗</span>; }

function Court({ sport }: { sport: Sport }) {
  return <div className={`${s.court} ${sport === "Running" ? s.running : sport === "Walk" ? s.walking : ""}`} aria-hidden="true">
    <svg className={s.courtLines} viewBox="0 0 600 640" fill="none">
      <rect x="66" y="72" width="468" height="496" rx={sport === "Padel" ? 3 : 230} />
      <rect x="113" y="120" width="374" height="400" rx={sport === "Padel" ? 2 : 180} />
      {sport === "Padel" ? <><path d="M66 320H534M300 120V520M113 220H487M113 420H487" /><path className={s.net} d="M46 310H554M46 321H554M46 332H554" /></> : <path d="M184 426C402 500 431 159 266 191C153 214 228 390 411 332" strokeDasharray="10 13" />}
    </svg>
    <div className={s.courtLabel}>THE BEST CONNECTIONS<br />HAPPEN IN MOTION.</div>
    <div className={s.playerOne}><span>01</span></div><div className={s.playerTwo}><span>02</span></div>
    <div className={s.ball} />
    <div className={s.artTag}><span className={s.greenDot} /> Show up as you are.</div>
    <div className={s.artFoot}>LESS SCROLL. MORE {sport === "Padel" ? "RALLY" : sport === "Running" ? "STRIDE" : "STROLL"}.</div>
  </div>;
}

export default function LandingExperience({ preview = false, memberName = null }: { preview?: boolean; memberName?: string | null }) {
  const signedIn = memberName !== null;
  const sport: Sport = "Padel";
  const [tutorialOpen, setTutorialOpen] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const hero = useRef<HTMLElement>(null);
  useEffect(() => hero.current ? observeHeroMotion(hero.current) : undefined, []);
  const opener = useRef<HTMLElement | null>(null);
  function openTutorial(event: React.MouseEvent<HTMLElement>) {
    opener.current = event.currentTarget;
    setTutorialOpen(true);
  }
  function closeTutorial() {
    setTutorialOpen(false);
    requestAnimationFrame(() => opener.current?.focus());
  }
  useEffect(() => {
    if (tutorialOpen) dialog.current?.showModal();
  }, [tutorialOpen]);

  return <><div className={s.page}>
    <a className={s.skip} href="#concept-main">Skip to content</a>
    {preview && <div className={s.preview}>DESIGN PREVIEW <span>Explore the experience — at your own pace.</span></div>}
    <main id="concept-main">
    <ScrollChapter name="hero" label="THE BEGINNING" opening>
    <header className={s.header}>
      <Link href={signedIn ? "/discover" : "/landing"} prefetch={false} className={s.logo} aria-label={`${BRAND_NAME} home`}><RallyGlyph size={35} /><span>{BRAND_NAME}</span></Link>
      <nav aria-label="Primary navigation">
        <a className={s.howLink} href="#how-it-works">How it works</a>
        {preview ? <a className={s.navAction} href="#how-it-works">Find your kind of plan <Arrow /></a> : signedIn ? <>
          <Link className={s.memberLink} href="/profile" prefetch={false}>Signed in as {memberName}</Link>
          <Link className={s.navAction} href="/discover" prefetch={false}>Enter {BRAND_NAME} <Arrow /></Link>
        </> : <>
          <Link className={s.signIn} href="/login" prefetch={false}>Sign in</Link>
          <Link className={s.navAction} href="/signup" prefetch={false} data-track="landing_cta_join">Get started <Arrow /></Link>
        </>}
      </nav>
    </header>
      <section ref={hero} className={s.hero} aria-labelledby="hero-heading" data-hero-motion>
        <div className={s.heroCopy}>
          <p className={s.eyebrow}><span className={s.greenDot} /> A LITTLE SPORT. A REAL CONNECTION.</p>
          <h1 id="hero-heading">Less small talk.<br />More <span>good<br className={s.desktopBreak} /> company.</span></h1>
          <p className={s.definition}>Turn your free time into a plan with new people through local sports activities—for dating, friendship, or a new crew.</p>
          <div className={s.heroActions}>
            {signedIn ? <Link className={s.primary} href="/discover" prefetch={false}>Enter {BRAND_NAME} <Arrow /></Link> : <Link className={s.primary} href="/discover" prefetch={false}>Find an activity <Arrow /></Link>}
            <span>For adults 18+<br />All starting points welcome</span>
          </div>
          {!preview && <div className={s.betaNote}>
            {signedIn ? <p>Find something to do with your free time.</p> : <>
              <p>Free beta · open to adults 18+ · usable worldwide</p>
              <BetaTermExplainer />
            </>}
          </div>}
          <div className={s.heroAside}><span className={s.miniIcon}>↗</span><p>Come on your own.<br /><strong>Start with an activity.</strong></p></div>
        </div>
        <div className={s.heroArt}>
          <Court sport={sport} />
          <a className={s.floatingCard} href="#how-it-works"><span className={s.cardKicker}>YOUR WEEKEND COULD LOOK LIKE THIS</span><div><strong>Rally. Laugh. Repeat.</strong><span className={s.roundArrow}>↗</span></div><span>{sport} · a small group · Your pace. Your people.</span></a>
        </div>
      </section>
    </ScrollChapter>
      <ScrollStory />
      <ScrollChapter name="how" label="05 / MAKE THE PLAN YOURS">
      <section id="how-it-works" className={s.how} aria-labelledby="how-heading">
        <div className={s.sectionHeading} data-assemble="one"><p className={s.eyebrow}>FROM “MAYBE” TO “SEE YOU THERE”</p><h2 id="how-heading">Now make it<br /> your afternoon.</h2><p>See how a plan comes together, one step at a time.</p></div>
        <div className={s.tutorialEntry} data-assemble="two">
          <div className={s.sketchMark} aria-hidden="true"><span>you</span><svg viewBox="0 0 150 55" fill="none"><path d="M5 32C40 4 55 52 91 25S123 13 143 22M130 8l13 14-18 5" /></svg><span>your next plan</span></div>
          <h3>A free afternoon?<br />Make something of it.</h3>
          <p>Find an activity for the day you have free, or bring a group together yourself.</p>
          <button type="button" className={s.primary} onClick={openTutorial} aria-haspopup="dialog" aria-expanded={tutorialOpen}>See how it works <Arrow /></button>
          <small>Two short walkthroughs. Join a plan or host your own.</small>
        </div>
      </section>
      </ScrollChapter>
      <ScrollChapter name="trust" label="06 / ROOM TO FEEL COMFORTABLE">
      <aside className={s.trust} aria-label="The experience principles"><p data-assemble="one">Good company.<br /><strong>Clear boundaries.</strong></p><div data-assemble="one"><span>01</span><p><strong>Adults only</strong>A space for people 18 and over.</p></div><div data-assemble="two"><span>02</span><p><strong>Private until accepted</strong>The exact meeting point comes later.</p></div><div data-assemble="three"><span>03</span><p><strong>You stay in control</strong>Block, report, or leave when you need to.</p></div></aside>
      </ScrollChapter>
      <ScrollChapter name="closing" label="07 / YOUR NEXT CHAPTER">
      <section className={s.closing}>
        <p className={s.eyebrow} data-assemble="one">{preview ? "THAT WAS THE PREVIEW. THIS IS THE NEXT STEP." : "READY FOR A REAL PLAN?"}</p>
        <h2 data-assemble="one">Your next good story<br />could start with <span>“fancy a game?”</span></h2>
        <p data-assemble="two">{preview ? "Explore the current product when you’re ready." : signedIn ? "Pick up where you left off and find an activity." : "Create a free profile, choose your sports, and ask to join an activity."}</p>
        <div data-assemble="three">
          <Link className={s.primary} href={signedIn || preview ? "/discover" : "/signup"} prefetch={false} data-track={!preview && !signedIn ? "landing_cta_join" : undefined}>{signedIn ? `Enter ${BRAND_NAME}` : preview ? "Explore the app (sign-in)" : "Create a free profile"} <Arrow /></Link>
          <Link className={s.secondary} href={signedIn ? "/profile" : preview ? "/signup" : "/login"} prefetch={false}>{signedIn ? "Your profile" : preview ? "Create an account" : "Sign in"}</Link>
        </div>
        <small data-assemble="three">{preview ? "Local activity availability depends on hosts near you." : "Open worldwide; local availability depends on hosts near you."}</small>
        {!preview && <div className={s.communityLinks} data-assemble="three">
          <Link href="/research" prefetch={false} data-track="landing_cta_survey">Take the 2-min survey</Link>
          <Link href="/feedback" prefetch={false}>Share feedback</Link>
        </div>}
      </section>
      </ScrollChapter>
    <ScrollChapter name="footer" label="KEEP THE CONNECTION GOING">
    <div className={s.epilogue} data-assemble="one" aria-hidden="true"><RallyGlyph size={80} /><p>A little movement.<br /><span>A new beginning.</span></p></div>
    <footer className={s.footer} data-assemble="two"><span><RallyGlyph size={25} /> {BRAND_NAME}</span><span>Meet through movement.</span><nav aria-label="Legal and trust links">
      <Link href="/trust" prefetch={false}>Trust</Link><Link href="/terms" prefetch={false}>Terms</Link><Link href="/privacy" prefetch={false}>Privacy</Link><Link href="/safety" prefetch={false}>Safety <Arrow /></Link>
    </nav></footer>
    </ScrollChapter>
    </main>
  </div>
    {tutorialOpen ? <dialog className={s.tutorialDialog} ref={dialog} aria-label="How it works" onCancel={closeTutorial} onClose={closeTutorial}>
      <EventTutorials onClose={closeTutorial} />
    </dialog> : null}
  </>;
}
