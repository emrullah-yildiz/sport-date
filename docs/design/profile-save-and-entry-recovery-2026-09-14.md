# Profile editing: clear entry and accurate save state

The product department found that an otherwise complete profile buried its editor beneath photos and activity. Profile now offers an Edit profile shortcut using the existing open-and-focus helper, aimed at the bio field. No new navigation or identity data is introduced.

The editor also allowed changes during an outstanding save. Those later edits could remain visible beside a success message for an earlier payload. A native disabled fieldset now locks every editable control while the request is pending; a ref rejects duplicate submissions. Failure restores editing. Subsequent changes clear the prior success message. Confirmation remains outside the disabled controls so its focus and announcement survive.

The discovery Plus link still pointed to Profile after billing moved to Settings. It now targets a stable `/settings#plus` anchor and only appears when billing is configured. Existing entitlement and payment gates are unchanged; this does not activate billing or choose pricing.

Verification: eight editor tests include delayed save, duplicate-submit rejection, failure recovery and stale-success clearing; discovery regression covers dormant/live billing link visibility. Actual component browser checks at 390px normal/reduced motion and 1280px simulate a delayed PATCH, verify inputs are disabled, complete the mock save, and verify another edit clears success with no overflow. No production account is changed.
