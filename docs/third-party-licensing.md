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
5. Run `pnpm licenses:sync` and preserve the generated exact package license files and package-specific required notices in the distributed product.
6. Recheck Reown, WalletConnect, and MetaMask terms, usage thresholds, attribution, and infrastructure requirements for the exact installed versions that use custom terms.
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

### Reown AppKit and WalletConnect community licenses

Installed Reown AppKit packages and specific WalletConnect runtime packages can be governed by the Reown or WalletConnect Community License rather than a permissive license. Do **not** infer that every `@walletconnect/*` or every package from a vendor shares the same terms. The exact installed package license controls.

When an installed package's license text is the Reown or WalletConnect Community License, the distributed notices surface must include the required attribution:

> Portions © 2025 Reown, Inc. All Rights Reserved.

The notice generator must list the exact installed packages to which that attribution applies and link the exact license files copied from those package versions. Community-license terms can also contain infrastructure, redistribution, modification, and commercial-use conditions. Recheck the exact installed text before release or a material traffic increase rather than hard-coding a threshold from a different release.

### MetaMask / ConsenSys licenses

MetaMask packages do **not** all use one license. Some installed packages use common permissive licenses such as MIT or ISC, while selected MetaMask Connect packages ship ConsenSys custom terms.

When the exact installed package license contains the ConsenSys custom terms, the notices surface must preserve the applicable copyright notice and identify the packages to which it applies:

> Copyright ConsenSys Software Inc. 2022. All rights reserved.

Do not put that custom-license notice above every `@metamask/*` package. Permissively licensed MetaMask packages must remain labeled with their own license instead. The exact custom license may impose use, redistribution, notice, or traffic conditions that PistachioSwap's owner-controlled commercial license cannot override.

### Generated production notice page

`scripts/sync-third-party-license-files.mjs` scans the exact installed targeted packages during the build. It must:

- copy each installed package's own `LICENSE`, `COPYING`, or `NOTICE` files verbatim;
- classify custom Reown, WalletConnect, and MetaMask terms from the installed license text, not merely from the vendor scope;
- show required attributions only for the exact packages whose license text requires them;
- label standard MIT, ISC, Apache, BSD, Unlicense, and similar packages using their own terms or package metadata; and
- fail instead of inventing a family-level license when a targeted installed package has missing or unresolved license material.

The generated `index.json` is the machine-readable record tying each published license file and required notice to an exact package and version.

### Incomplete package metadata

`Unknown`, `UNLICENSED`, missing, or custom package metadata is a release blocker unless the exact installed package is reviewed and recorded in `config/third-party-license-policy.json`.

The current review resolved several misleading `Unknown` entries using exact installed files:

- `eyes@0.1.8` includes the MIT License.
- `text-encoding-utf-8@1.0.2` includes a public-domain dedication and Unlicense notice.
- selected MetaMask packages include the ConsenSys custom license, while other MetaMask packages are permissively licensed.
- selected Reown AppKit and WalletConnect packages include Community License files, while other WalletConnect packages may use standard licenses.
- Chainflip toolkit subpackages omit package-level license metadata, while the exact upstream toolkit root declares ISC.

These resolutions are version-specific. The audit must re-evaluate them after dependency updates instead of assuming package names remain legally frozen in amber.

## Updating the review policy

Package-specific exceptions must include:

- the exact package or narrowly scoped package-family pattern;
- the reviewed license classification;
- a short reason;
- the required operational or distribution conditions; and
- the review date.

Do not add a package to the reviewed list merely to make the audit green. The audit is supposed to be inconvenient when the dependency tree is uncertain. That is the entire point.
