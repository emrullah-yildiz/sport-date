# Dependency audit

## 2026-06-28 baseline

The generated Next.js and Expo workspaces initially reported moderate transitive advisories in PostCSS and UUID. The package manager's automatic remediation proposed downgrading Next from 16 to 9 and Expo from 56 to 46, which is not an acceptable security fix.

The findings are in framework-owned build tooling rather than application runtime paths currently exercised by the product. They remain tracked until upstream Next.js and Expo releases adopt patched transitive versions. We will not use the package manager's unsafe major-version downgrade recommendation.

No high or critical advisories were present in the initial audit.

## 2026-06-29 Expo SDK 56 review

After adding the shared domain package to mobile, the production dependency audit reports ten moderate and no high or critical advisories. The chain is owned by Expo configuration/build tooling: Expo 56.0.12 includes `@expo/config-plugins` 56.0.9, which includes `xcode` 3.0.1 and `uuid` 7.0.3. The UUID advisory concerns caller-supplied buffers in UUID generation and is not an application runtime path used by the current prototype.

The package manager proposes Expo 46.0.21 as the remediation, an unsupported ten-SDK downgrade that conflicts with the repository's React Native 0.85 and React 19.2 versions. Do not apply it. Track a compatible Expo upstream update, repeat the audit before production builds, and keep all high or critical findings as release blockers.
