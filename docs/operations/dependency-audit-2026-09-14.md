# Dependency audit priority — 2026-09-14

**First autonomous engineering priority: patch Next.js before further feature work.** Read-only `npm audit --json` in the isolated product-studio runtime worktree reported **29 affected package entries: 1 critical, 13 high, 15 moderate**. These include propagated dependency findings and build/dev tooling; they are not 29 demonstrated production exploits. No dependencies were changed, exploitation attempted or production requests made during this review.

## Verified highest-priority evidence

The lockfile installs the web application's direct production dependency **Next.js 16.2.9**, optional Sharp **0.34.5**, and Next's nested PostCSS **8.4.31**. npm's current audit recommends **Next.js 16.3.5**, a non-major update.

- **Windows-hosted remote code execution:** the maintainer advisory covers App/Pages Router applications without Cache Components on Windows filesystems, including Next 16.2.9; patched in 16.3.3. This project uses App Router, does not enable Cache Components in its checked config, and the local environment is Windows. External reachability and exploitability were not established. Production hosting OS/version was not verified. [Next.js maintainer advisory GHSA-p293-qw3h-jr36](https://github.com/vercel/next.js/security/advisories/GHSA-p293-qw3h-jr36)
- **AVIF image-optimization remote code execution:** the maintainer attributes this to libheif via Sharp when AVIF files are optimized; patched Next versions start at 16.3.3. Source inspection found no `next/image` usage and no explicit optimizer disablement. Absence of an Image component is not proof the optimizer endpoint is unreachable; attacker-controlled AVIF reachability was not tested. [Next.js maintainer advisory GHSA-2xp9-vwfh-vxw4](https://github.com/vercel/next.js/security/advisories/GHSA-2xp9-vwfh-vxw4)

Both advisories were published August 25, 2026. Registry metadata checked in this review confirms Next **16.3.5** uses PostCSS **8.5.23**, optional Sharp **^0.35.4**, Node **>=20.9.0**, and React/React DOM peers compatible with the project's React 19. Matching **eslint-config-next 16.3.5** exists. This establishes a candidate fix, not build compatibility or successful remediation.

Other reported Next issues include Server Actions, rewrites and middleware/proxy conditions. The checked source/config did not reveal application Server Actions, rewrites or middleware/proxy implementations. Do not claim every advisory is reachable, or defer the framework patch merely because particular paths appear absent.

## Exact first fix scope

1. In an isolated review branch, change `apps/web/package.json` Next from 16.2.9 to **16.3.5** and align `eslint-config-next` to **16.3.5**. Regenerate the root `package-lock.json` through the normal workspace package manager. Preserve React, Expo and unrelated direct dependencies.
2. Inspect the dependency diff and resolved versions. Confirm the selected Next, Sharp and nested PostCSS versions clear their reported ranges. Keep changes required by the framework update; investigate unrelated churn rather than accepting a blanket refresh.
3. Run a fresh audit and record remaining findings with scope. Do not use `npm audit fix --force`, disable security checks, or downgrade Expo to silence the report.
4. If framework/Sentry/TypeScript compatibility requires source changes, keep them minimal, explain them and test affected behavior. Do not disable headers, authentication or error scrubbing to pass a build.

**Required checks:** clean reproducible install; web and domain tests; web typecheck; lint; production build with existing Sentry and security-header configuration; local smoke checks for main landing, authenticated-route rejection, HQ owner boundary and static/image assets. Verify dependency versions and audit outcome after installation. Do not exercise exploit payloads against production. Run database integrations only with their existing explicit isolated-test prerequisites.

Produce a reviewable commit and update agent state with results, remaining risk and release instructions. **Production deployment remains owner-gated**; a local dependency patch does not establish that the live service is patched.

## Remaining findings: separate follow-up

| Finding group | Observed scope and next step |
| --- | --- |
| Vitest / mocker 4.1.9 | Dev-only moderate arbitrary-read advisory; a separate compatible update to at least 4.1.11 should be checked. No exposed test server was established. |
| Expo / Metro / XML parsers / image-size | Predominantly mobile build/config tooling; many are marked production dependencies because Expo is a runtime dependency. This does not prove web request exposure. Trace actual processing inputs and choose SDK-compatible patches. |
| Fast-uri | Dependency path observed through AJV/Webpack schema validation. An application SSRF path was not established; update compatibly rather than label the product exploitable from the package name alone. |
| PostCSS / browserslist / brace expansion / other transitive packages | Several build-time and shared dependency paths. Re-audit after the Next update, then prioritize remaining runtime or untrusted-input exposure with documented reachability. |

The audit's suggested **Expo 46.0.21** replacement for installed **56.0.12** is a major downgrade, not an acceptable automatic remediation. Do not broaden the first Next patch into an unreviewed mobile SDK migration.
