# Give each screen a job

Owner correction: safety instructions must not appear on Profile. General guidance belongs in the dedicated Safety Center. Report/block controls remain available in event and conversation contexts; authentication, location authorization, consent and moderation rules are unchanged.

- Profile contains personal details, photos and editing. Activity history is a collapsed section. Repeated safety/support links, preview explanations and account administration are removed.
- Settings is an authenticated destination in the account menu and Profile. Email verification, notifications, devices/sessions, data export/deletion and conditional billing retain their existing controls. Sections open individually. Verification recovery links now target Settings; the old profile anchor retains an account-settings link.
- Hosting lists the member's events. The former standards content is preserved on `/hosting-guidelines`, replacing its redirect. The old `/hosting#standards` anchor links to that page. Creating an event now leads directly to the form with a concise guide link.
- The shared footer contains compact dedicated help/legal/support links instead of repeated explanations and unsupported privacy-grade wording. Legal documents are not rewritten.

Verification covers Settings authentication before account reads, existing controls, navigation and verification links, production build/typecheck, web tests and lint. The actual-page synthetic browser harness checks keyboard disclosure controls and width at 390px normal/reduced motion and 1280px; its API responses are mocked, with no account mutations. Dedicated settings screenshots live in ignored runtime/discovery-qa. No production deployment.
