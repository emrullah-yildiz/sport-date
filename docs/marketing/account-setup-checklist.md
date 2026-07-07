# Social account setup checklist (owner action, ~15–20 min)

Owner authorized agent-run marketing on 2026-07-03 (see the marketing mandate).
Agents can't create accounts — every platform requires a phone + SMS code and blocks
automated signup (creating accounts by bot violates their ToS and gets them banned).
So **you** create the accounts once, below; **agents** then run everything else
(content drafted → you approve → scheduled/published via an official API or a
connected scheduler). Extends [social-launch-packet.md](./social-launch-packet.md).

## 1. Dedicated brand email (do this first — it's the signup email for all the rest)

- [ ] Create one Gmail, e.g. **`sportdate.team@gmail.com`** (or `getsportdate@`,
      `sportdate.eu@` — pick the first available). Google will ask for a phone number.
- [ ] Set **recovery email → `ey.myacc@gmail.com`** (your backup, as requested).
- [ ] Turn on 2-factor auth. Store the password + 2FA backup codes in a password manager.
- [ ] This inbox becomes the single owner-of-record for every social account below.

## 2. Pick ONE handle and use it everywhere (consistency = discoverability)

Brand name is **KeepItUp** (owner decision 2026-07-04). Recommended handle, in
preference order (grab the same one on all platforms):

1. `@keepitup`  2. `@keepitup.eu`  3. `@getkeepitup`  4. `@keepitupapp`

- [ ] As you sign up on each platform, take the first of these that's free, then use the
      **same** handle on the others (reserve it even on platforms you won't post to yet).
- [ ] Note the final chosen handle back here so agents write copy to match:
      **CHOSEN HANDLE: `__________`**
- Display name on every platform: **KeepItUp**.

### Domain (owner action — costs money)
Checked 2026-07-04: `keepitup.com`/`.app` are taken. Available: **`keepitup.eu`**
(recommended — EU-first), `keepitup.co`, `getkeepitup.com`, `trykeepitup.com`,
`joinkeepitup.com`. Register with Vercel Domains (auto-connects) / Cloudflare / Namecheap,
then a branded email `hello@keepitup.eu` becomes possible for later opt-in email.

## 3. Create the accounts (same email, same handle, 2FA on each)

For each: sign up with the brand email, set the handle + display name, paste the bio
(from §4), set the link, choose the category, upload the profile image, enable 2FA.

- [ ] **Instagram** — category: *Health/Beauty* or *Community* → *Sports & Recreation*. Primary visual channel.
- [ ] **TikTok** — only if you can produce native short video regularly; else reserve the handle and park it.
- [ ] **X (Twitter)** — founder/build-in-public + belief posts.
- [ ] **Facebook Page** (not a personal profile) — needed for local groups + events later.
- [ ] (Optional, recommended) **LinkedIn Page** — founder narrative, trust/safety, partnerships.

## 4. Bio (paste-ready; refined from the launch packet)

> KeepItUp — meet through movement. Small local sports meetups for adults who want dating,
> friendship, or community, without the endless swiping. Open worldwide — early access. 🏃🎾🧗

- Link: use the site once a real domain is live; until then, a simple beta/waitlist link.
  (Domain is still an owner decision — the app currently runs on the Vercel URL.)
- Keep it identical across platforms except length trims TikTok/X may force.

## 5. Profile image + assets

- [ ] Profile picture: the KeepItUp mark on the anthracite/neon-lime brand background
      (see brand-refresh-proposal.md). If none is exported yet, tell me and I'll spec/generate one.
- [ ] Have a simple, consistent avatar + one banner ready before you post anything.

## 6. Connect for agent publishing (ToS-compliant — do NOT share passwords in chat)

Once accounts exist, pick ONE compliant path so agents can queue posts for your approval:
- **A scheduler** (Buffer / Later / Metricool free tier): you connect the accounts with a
  click, agents draft into it, you approve, it publishes. Simplest, fully ToS-compliant.
- **Official platform APIs** (Meta Graph API, X API): more setup, more control.
- Either way, credentials/tokens live in the tool or a config connector — **never pasted
  into chat or committed** (same rule as DB creds).

## 7. Then agents take over

Content gets drafted into `content-queue/`, you approve, it ships on a schedule. First
batch is already drafted for you to review — see `content-queue/2026-07-batch-01.md`.
