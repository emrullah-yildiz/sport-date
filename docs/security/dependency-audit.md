# Dependency audit

## 2026-06-28 baseline

The generated Next.js and Expo workspaces initially reported moderate transitive advisories in PostCSS and UUID. The package manager's automatic remediation proposed downgrading Next from 16 to 9 and Expo from 56 to 46, which is not an acceptable security fix.

The findings are in framework-owned build tooling rather than application runtime paths currently exercised by the product. They remain tracked until upstream Next.js and Expo releases adopt patched transitive versions. We will not use the package manager's unsafe major-version downgrade recommendation.

No high or critical advisories were present in the initial audit.
