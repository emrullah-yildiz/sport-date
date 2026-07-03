# AI-video tool — owner setup checklist

The autopilot can produce **image** content end-to-end, but it **cannot render video**.
To automate Reels / TikToks / Shorts, the owner provisions an AI-video API; the agent
then feeds each script in and gets back an MP4 to schedule. (Owner decision 2026-07-04:
use an AI-video tool rather than filming.)

The agent can **never** create the account, accept terms, or hold the key — that's you.

## Pick one (API-first, agent-drivable)

| Tool | Best for | Why it fits automation | Notes |
|------|----------|------------------------|-------|
| **Revid.ai** | Faceless TikTok/Shorts/Reels | Purpose-built "script → faceless short" API: auto voiceover + captions + stock/AI b-roll; can even auto-post | Cheapest path to the exact format we drafted. Generic look. |
| **Vadoo AI** | Faceless shorts at volume | Similar script→video API, template styles, webhook when render done | Good for batch. |
| **HeyGen** | AI **avatar talking-head** | Gives the "person talking to camera" look (P2/P8) without filming, via API | Most realistic presenter; higher cost/video. Disclose AI. |
| **Shotstack** or **Creatomate** | Full template control | JSON/REST → MP4; you design a branded template once, agent feeds text/media | Most on-brand + deterministic; needs a template built first. No voiceover unless you add TTS. |

**Recommendation:** start with **Revid.ai** (or Vadoo) for the faceless curiosity/meme/
seasonal shorts — it maps directly onto our batch — and add **HeyGen** later if you want
avatar talking-heads. Use **Creatomate/Shotstack** if you'd rather have a tightly
branded, repeatable template look.

## What to do (≈15 min)
1. Sign up for one tool above with the brand email `support@keepitup.social`.
2. Choose the smallest paid tier that includes **API access** (free tiers usually watermark
   or block the API).
3. Generate an **API key**.
4. Hand the key to the agent **safely — never pasted into chat or committed to the repo**
   (same rule as DB creds). Pick one:
   - **`.env.local`** (gitignored) at repo root, e.g. `AIVIDEO_API_KEY=…` and
     `AIVIDEO_PROVIDER=revid`, or
   - if the tool offers an **MCP server**, add it to `.mcp.json` like Buffer and authorize
     it via `/mcp` (preferred — mirrors the Buffer setup).
5. Tell the agent it's connected; it will render a test clip from one approved script for
   your review before scheduling anything.

## Guardrails baked into the pipeline
- **AI-content disclosure:** every AI-generated video carries the platform's AI-content
  label (EU AI Act + Meta & TikTok AI-disclosure rules). Non-negotiable.
- **Mix, don't flood:** faceless AI video can get suppressed reach; keep it a *portion* of
  the calendar alongside photo-mode + any real footage. The measure/prune loop will show
  if AI video underperforms and cut it automatically.
- **Cost is metered:** each render costs credits. The agent won't spawn unlimited renders —
  it only renders **approved** posts, and you set the plan/budget.
- **Brand-safe:** no stock footage implying real KeepItUp members/events (no fake traction);
  b-roll stays generic/illustrative.

## Until this is connected
Video posts stay `approved` + `awaiting-asset` with their shot briefs ready; the autopilot
keeps shipping **image** content (memes, carousels, photo-mode) and generating drafts, so
growth doesn't stall while you decide on a tool.
