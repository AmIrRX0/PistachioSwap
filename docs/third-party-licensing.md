# Third-party licensing policy

This document describes the release policy for third-party software used by PistachioSwap. It is an engineering compliance control, not legal advice.

## Project license boundary

PistachioSwap is source-available under the PolyForm Noncommercial License 1.0.0 for code whose copyright is controlled by the project owner. Commercial use of that owner-controlled code requires a separate written license.

Dependencies, copied code, generated assets, fonts, SDKs, and other third-party material remain under their own licenses. The PistachioSwap license must never be presented as replacing those terms.

## Required release checks

Before a public deployment or distributed build:

1. Install from the committed lockfile.
2. Run `pnpm licenses:audit`.
3. Review `.license-audit/production.txt` and `.license-audit/review-required.md`.
4. Resolve every blocking or unknown entry, using `pnpm licenses:evidence` when package metadata is incomplete.
5. Preserve required notices and exact license texts in the distributed product.
6. Recheck Reown, WalletConnect, and MetaMask terms, usage thresholds, attribution, and infrastructure requirements.
7. Record whether any LGPL or MPL dependency was modified, bundled, or distributed.

A successful build is not a license audit. Software remains entirely capable of compiling while carrying awkward legal baggage, one of its more human qualities.

## License classes

### Permissive licenses

MIT, Apache-2.0, BSD, ISC, 0BSD, Zlib, CC0, BlueOak, Unlicense, and similar permissive licenses are normally allowed when their copyright and notice obligations are preserved.

### LGPL

LGPL dependencies are allowed only with a release-specific review. Do not modify their source or produce a distribution that prevents recipients from exercising applicable replacement or relinking rights without documenting and satisfying the resulting obligations.

The review must cover frontend bundles, Docker images, packaged applications, and any vendored dependency source.

### MPL-2.0

MPL is file-level copyleft. Separate PistachioSwap files can remain under PolyForm, but modifications to MPL-covered files must remain available under MPL when distributed. Preserve MPL notices and do not copy MPL source into owner-controlled files without recording the boundary.

### Fonts

Fonts retain their own font licenses. Preserve the Ubuntu Font License and required notices for `@fontsource/ubuntu` in distributed frontend assets.

### Reown and WalletConnect community licenses

Reown AppKit and WalletConnect packages are custom-licensed components. Their licenses require attribution and license copies, contain infrastructure conditions, and can require a commercial agreement after usage thresholds are exceeded.

The application must expose the following attribution in an About, Legal, or Notices surface before public launch:

> Portions © 2025 Reown, Inc. All Rights Reserved.

Do not modify Reown or WalletConnect package source without separate review. The exact license shipped with the installed package version controls.

### MetaMask Connect license

The installed MetaMask Connect packages use a ConsenSys custom license, not MIT. It requires prominent notice, applies a matching use restriction to the resulting program, and currently defines permitted use to include applications at or below 10,000 monthly active users.

The production legal-notices page must include:

> PistachioSwap uses MetaMask Connect components. Copyright ConsenSys Software Inc. 2022. All rights reserved.

Do not exceed 10,000 monthly active users or rely on another use case without obtaining separate permission from MetaMask/ConsenSys. PistachioSwap's owner-controlled commercial license cannot override this dependency restriction.

### Incomplete package metadata

`Unknown`, `UNLICENSED`, missing, or custom package metadata is a release blocker unless the exact installed package is reviewed and recorded in `config/third-party-license-policy.json`.

The current review resolved several misleading `Unknown` entries using exact installed files:

- `eyes@0.1.8` includes the MIT License.
- `text-encoding-utf-8@1.0.2` includes a public-domain dedication and Unlicense notice.
- selected MetaMask packages include the ConsenSys custom license.
- Chainflip toolkit subpackages omit package-level license metadata, while the exact upstream toolkit root declares ISC.

These resolutions are version-specific. The audit must re-evaluate them after dependency updates instead of assuming package names remain legally frozen in amber.

## Updating the review policy

Package-specific exceptions must include:

- the exact package or package-family pattern;
- the reviewed license classification;
- a short reason;
- the required operational or distribution conditions; and
- the review date.

Do not add a package to the reviewed list merely to make the audit green. The audit is supposed to be inconvenient when the dependency tree is uncertain. That is the entire point.
