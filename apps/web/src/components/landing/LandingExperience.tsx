"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import BetaTermExplainer from "@/components/BetaTermExplainer";
import { BRAND_NAME, RallyGlyph } from "@/lib/brand";
import { intentions, meetingDetail, plans, sports, transition, type Intention, type Sport, type Stage } from "./demo";
import s from "./landing.module.css";

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
  const [sport, setSport] = useState<Sport>("Padel");
  const [intention, setIntention] = useState<Intention>("Friendship");
  const [stage, setStage] = useState<Stage>("discover");
  const primaryAction = useRef<HTMLButtonElement>(null);
  const plan = plans[sport];
  const meeting = meetingDetail(stage);
  const reset = () => setStage("discover");
  const stageNumber = ["discover", "details", "requested", "review", "accepted"].indexOf(stage);
  const nextActions = {
    discover: { label: "Explore this example", action: "details" },
    details: { label: "Try sending a demo request", action: "request" },
    requested: { label: "Demo: see the host review", action: "review" },
    review: { label: "Demo: simulate acceptance", action: "accept" },
    accepted: { label: "Try another plan", action: "reset" },
  } as const;

  return <div className={s.page}>
    <a className={s.skip} href="#concept-main">Skip to content</a>
    {preview && <div className={s.preview}>DESIGN PREVIEW <span>Fictional activities. Try it freely — nothing is sent or saved.</span></div>}
    <header className={s.header}>
      <Link href={signedIn ? "/discover" : "/landing"} prefetch={false} className={s.logo} aria-label={`${BRAND_NAME} home`}><RallyGlyph size={35} /><span>{BRAND_NAME}</span></Link>
      <nav aria-label="Primary navigation">
        <a className={s.howLink} href="#how-it-works">How it works</a>
        {preview ? <a className={s.navAction} href="#try-it">Find your kind of plan <Arrow /></a> : signedIn ? <>
          <Link className={s.memberLink} href="/profile" prefetch={false}>Signed in as {memberName}</Link>
          <Link className={s.navAction} href="/discover" prefetch={false}>Enter {BRAND_NAME} <Arrow /></Link>
        </> : <>
          <Link className={s.signIn} href="/login" prefetch={false}>Sign in</Link>
          <Link className={s.navAction} href="/signup" prefetch={false} data-track="landing_cta_join">Get started <Arrow /></Link>
        </>}
      </nav>
    </header>
    <main id="concept-main">
      <section className={s.hero} aria-labelledby="hero-heading">
        <div className={s.heroCopy}>
          <p className={s.eyebrow}><span className={s.greenDot} /> A LITTLE SPORT. A REAL CONNECTION.</p>
          <h1 id="hero-heading">Less small talk.<br />More <span>good<br className={s.desktopBreak} /> company.</span></h1>
          <p className={s.definition}>Meet people for dating, friendship, or a new crew through small local sports activities.</p>
          <div className={s.heroActions}>
            {signedIn ? <Link className={s.primary} href="/discover" prefetch={false}>Enter {BRAND_NAME} <Arrow /></Link> : <a className={s.primary} href="#try-it">Try an example plan <Arrow /></a>}
            <span>For adults 18+<br />All starting points welcome</span>
          </div>
          {!preview && <div className={s.betaNote}>
            {signedIn ? <p>Your next activity is a click away. Or try the example below.</p> : <>
              <p>Free beta · open to adults 18+ · usable worldwide</p>
              <BetaTermExplainer />
            </>}
          </div>}
          <div className={s.heroAside}><span className={s.miniIcon}>↗</span><p>You bring yourself.<br /><strong>The activity breaks the ice.</strong></p></div>
        </div>
        <div className={s.heroArt}>
          <Court sport={sport} />
          <a className={s.floatingCard} href="#try-it"><span className={s.cardKicker}>YOUR WEEKEND COULD LOOK LIKE THIS</span><div><strong>{sport === "Padel" ? "Rally. Laugh. Repeat." : sport === "Running" ? "An easy run. A new crew." : "A walk worth sharing."}</strong><span className={s.roundArrow}>↗</span></div><span>{sport} · {plan.size} · Example activity</span></a>
        </div>
      </section>
      <div className={s.ribbon} aria-hidden="true"><span>COME FOR THE GAME</span><span>↗</span><span>STAY FOR THE COMPANY</span><span>↗</span><span>YOUR PACE. YOUR PEOPLE.</span><span>↗</span></div>
      <section id="how-it-works" className={s.how} aria-labelledby="how-heading">
        <div className={s.sectionHeading}><p className={s.eyebrow}>FROM “MAYBE” TO “SEE YOU THERE”</p><h2 id="how-heading">A plan makes<br />hello easier.</h2><p>No perfect opening line required.</p></div>
        <div className={s.steps}>{[
          ["01", "Pick your kind of fun.", "Choose an activity, a comfortable pace, and what kind of connection you’re open to."],
          ["02", "Ask to join a small group.", "Read the plan, then send a request. The host reviews it; a request isn’t a booking."],
          ["03", "Get the details. Show up.", "Once accepted, see the meeting point. Bring yourself, say hello, and get moving."],
        ].map(([number, title, text]) => <article key={number}><span className={s.stepNumber}>{number}</span><h3>{title}</h3><p>{text}</p></article>)}</div>
      </section>
      <section id="try-it" className={s.playground} aria-labelledby="try-heading">
        <div className={s.builderIntro}><p className={s.eyebrow}>MAKE ROOM FOR SOMETHING GOOD</p><h2 id="try-heading">What’s your<br /><span>kind of hello?</span></h2><p>Mix an activity with an intention.<br />See how your first plan could feel.</p><span className={s.demoBadge}>INTERACTIVE DEMO · NO ACCOUNT NEEDED</span><p className={s.demoDisclosure}>Fictional activities. Nothing you choose here is sent or saved.</p></div>
        <div className={s.builder}>
          <fieldset className={s.choices}><legend>01 <span>How do you want to move?</span></legend><div>{sports.map((item, i) => <button key={item} type="button" aria-pressed={sport === item} onClick={() => { setSport(item); reset(); }}><span aria-hidden="true">{["◉", "↗", "〰"][i]}</span>{item}</button>)}</div></fieldset>
          <fieldset className={s.choices}><legend>02 <span>What are you open to?</span></legend><div>{intentions.map(item => <button key={item} type="button" aria-pressed={intention === item} onClick={() => { setIntention(item); reset(); }}>{item}</button>)}</div></fieldset>
          <p className={s.choiceNote}>Your intention helps set expectations. Connection is mutual, never guaranteed.</p>
          <article className={s.plan} aria-label="Your example activity">
            <div className={s.planTop}><span>EXAMPLE ACTIVITY</span><span>{sport} <span aria-hidden="true">↗</span></span></div>
            <div className={s.planBody}>
              <div className={s.pills}><span>{intention === "Dating" ? "Open to dating" : intention === "Friendship" ? "Make a new friend" : "Meet a new crew"}</span><span>{plan.level}</span></div>
              <h3>{plan.title}</h3><p className={s.planTime}>{plan.time}</p>
              <div className={s.planFacts}><span><b>Where</b>{plan.area}</span><span><b>The group</b>{plan.size} · adults 18+</span></div>
              <div className={s.host}><span className={s.avatar} aria-hidden="true">S</span><p><strong>Hosted by Sam</strong><span>Fictional host · this is a sample plan</span></p><span aria-hidden="true">☺</span></div>
              <div className={s.status} aria-live="polite" aria-atomic="true">
                {stage === "discover" && <p>Start with the plan. The exact meeting point stays private until your request is accepted.</p>}
                {stage === "details" && <><h4>A little more about the plan</h4><p>{plan.note}</p><p>{plan.bring}</p><p>Exact meeting point hidden. You can cancel your request before acceptance.</p></>}
                {stage === "requested" && <><h4>Demo request sent. You’re not booked yet.</h4><p>In the real product, the host would review your request. Nothing was sent here, and the meeting point is still hidden.</p></>}
                {stage === "review" && <><h4>The host has a decision to make.</h4><p>This preview lets you simulate acceptance. A real host can accept or decline; there’s no automatic place in the group.</p></>}
                {stage === "accepted" && <><h4><span aria-hidden="true">✓ </span>You’re in — in this demo.</h4><p>{meeting}</p><p>In the real product, accepted participants can see the meeting details. You’re always free to change your mind.</p></>}
              </div>
              <div className={s.planActions}>
                <button ref={primaryAction} className={s.primary} onClick={() => setStage(transition(stage, nextActions[stage].action))}>{nextActions[stage].label} <Arrow /></button>
                {stage !== "discover" && <button className={s.textButton} onClick={() => { reset(); primaryAction.current?.focus(); }}>{stage === "requested" || stage === "review" ? "Cancel demo request" : stage === "accepted" ? "Leave demo activity" : "Back to the plan"}</button>}
              </div>
              <div className={s.progress} aria-label={`Demo step ${stageNumber + 1} of 5`}><span>EXPLORE</span><div>{[0, 1, 2, 3, 4].map(i => <i key={i} className={i <= stageNumber ? s.complete : undefined} />)}</div><span>MEET</span></div>
            </div>
          </article>
        </div>
      </section>
      <aside className={s.trust} aria-label="The experience principles"><p>Good company.<br /><strong>Clear boundaries.</strong></p><div><span>01</span><p><strong>Adults only</strong>A space for people 18 and over.</p></div><div><span>02</span><p><strong>Private until accepted</strong>The exact meeting point comes later.</p></div><div><span>03</span><p><strong>You stay in control</strong>Block, report, or leave when you need to.</p></div></aside>
      <section className={s.closing}>
        <p className={s.eyebrow}>{preview ? "THAT WAS THE PREVIEW. THIS IS THE NEXT STEP." : "READY FOR A REAL PLAN?"}</p>
        <h2>Your next good story<br />could start with <span>“fancy a game?”</span></h2>
        <p>{preview ? "Explore the current product when you’re ready." : signedIn ? "Pick up where you left off and find an activity." : "Create a free profile, choose your sports, and ask to join an activity."}</p>
        <div>
          <Link className={s.primary} href={signedIn || preview ? "/discover" : "/signup"} prefetch={false} data-track={!preview && !signedIn ? "landing_cta_join" : undefined}>{signedIn ? `Enter ${BRAND_NAME}` : preview ? "Explore the app (sign-in)" : "Create a free profile"} <Arrow /></Link>
          <Link className={s.secondary} href={signedIn ? "/profile" : preview ? "/signup" : "/login"} prefetch={false}>{signedIn ? "Your profile" : preview ? "Create an account" : "Sign in"}</Link>
        </div>
        <small>{preview ? "These links leave the demo. Real activity availability may vary." : "Open worldwide; local availability depends on hosts near you."}</small>
        {!preview && <div className={s.communityLinks}>
          <Link href="/research" prefetch={false} data-track="landing_cta_survey">Take the 2-min survey</Link>
          <Link href="/feedback" prefetch={false}>Share feedback</Link>
        </div>}
      </section>
    </main>
    <footer className={s.footer}><span><RallyGlyph size={25} /> {BRAND_NAME}</span><span>Meet through movement.</span><nav aria-label="Legal and trust links">
      <Link href="/trust" prefetch={false}>Trust</Link><Link href="/terms" prefetch={false}>Terms</Link><Link href="/privacy" prefetch={false}>Privacy</Link><Link href="/safety" prefetch={false}>Safety <Arrow /></Link>
    </nav></footer>
  </div>;
}
