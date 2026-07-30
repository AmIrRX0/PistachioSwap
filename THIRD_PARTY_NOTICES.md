# Third-party software notices

PistachioSwap includes and depends on software owned by other people and organizations. The PolyForm Noncommercial License in `LICENSE` applies only to portions of this repository for which the PistachioSwap project owner controls the copyright. It does not replace, narrow, or expand any third-party license.

## Reown AppKit and WalletConnect

Portions © 2025 Reown, Inc. All Rights Reserved.

PistachioSwap uses Reown AppKit and WalletConnect packages. Those packages are governed by their applicable Reown community license agreements, not by PistachioSwap's PolyForm license.

Required operational conditions include using the applicable Reown/WalletConnect infrastructure, preserving required attribution and license copies, and reviewing the then-current commercial-use thresholds before a public launch or material traffic increase.

Upstream license sources:

- Reown AppKit Community License: https://github.com/reown-com/appkit/blob/main/LICENSE.md
- WalletConnect Community License: https://github.com/WalletConnect/walletconnect-monorepo/blob/master/LICENSE.md

## MetaMask Connect components

PistachioSwap uses MetaMask Connect components.

Copyright ConsenSys Software Inc. 2022. All rights reserved.

The exact installed MetaMask license permits only the uses it defines as Non-Commercial Use and requires a prominent notice with each resulting copy. Its definition currently includes applications that do not exceed 10,000 monthly active users. Separate permission is required before exceeding that threshold or relying on another use case.

The project owner's commercial rights in PistachioSwap do not override the MetaMask license. The exact MetaMask license files are copied into production builds with the Reown and WalletConnect license files.

## Conditional copyleft dependencies

The production dependency graph currently includes LGPL-licensed PancakeSwap packages and `rpc-websockets`. It also includes MPL-2.0 EthereumJS packages. These dependencies retain their own licenses.

PistachioSwap does not relicense those packages. When distributing frontend bundles, Docker images, packaged applications, modified dependency files, or other copies containing those packages, preserve all required notices and satisfy the corresponding source, replacement, relinking, or file-level disclosure obligations.

Known LGPL entries include:

- `@pancakeswap/infinity-stable-sdk`
- `@pancakeswap/multicall`
- `@pancakeswap/permit2-sdk`
- `@pancakeswap/smart-router`
- `@pancakeswap/stable-swap-sdk`
- `@pancakeswap/swap-sdk-evm`
- `@pancakeswap/swap-sdk-solana`
- `@pancakeswap/token-lists`
- `@pancakeswap/v2-sdk`
- `rpc-websockets`

Known MPL-2.0 entries include:

- `@ethereumjs/rlp`
- `@ethereumjs/tx`
- `@ethereumjs/util`

The Ubuntu font package is governed by the Ubuntu Font License 1.0.

## Resolved incomplete metadata

A package-manager report may show `Unknown` when package metadata is incomplete. That is not permission to guess. The repository audit records the evidence used to resolve those entries:

- `@chainflip/*`: installed toolkit packages omit license metadata; their exact upstream monorepo root declares ISC. Recheck this on every version update.
- `eyes@0.1.8`: the installed package includes the MIT License, copyright (c) 2009 cloudhead.
- `text-encoding-utf-8@1.0.2`: the installed package includes a public-domain dedication and Unlicense notice.
- selected `@metamask/*` packages: the installed packages include the ConsenSys custom license described above.
- selected `@reown/*` and `@walletconnect/*` packages: exact installed family license files are copied into each production build.

Run `pnpm licenses:evidence` to collect package metadata and exact license files for any package newly reported as unresolved.

## Release rule

Do not claim that the dependency tree is fully license-compliant merely because installation, build, or tests pass. A release must also pass `pnpm licenses:audit`, include required third-party notices, retain exact license texts required by distributed components, and remain within all custom-license usage limits.
