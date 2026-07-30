# PistachioSwap Privacy Policy

**Effective date:** July 28, 2026  
**Last updated:** July 28, 2026

> [!IMPORTANT]
> **Pre-launch legal notice:** PistachioSwap is currently a project name and the operating company has not yet been identified in this repository. Before commercial launch, replace this notice with the exact legal entity name, a monitored privacy contact, and any required mailing address. Qualified counsel should review this policy against the final product, vendors, data flows, retention schedules, and launch jurisdictions.

This Privacy Policy explains how the operator of PistachioSwap ("PistachioSwap," "we," "us," or "our") collects, uses, discloses, and protects information when you use the PistachioSwap website, wallet interface, public API, separately deployed Gas Assist service, and related services (collectively, the "Service").

## 1. Scope

This Policy applies to information processed through the Service. It does not control independent wallets, blockchains, token issuers, decentralized exchanges, bridges, RPC providers, indexers, or other third-party services. Those parties process information under their own terms and privacy policies.

PistachioSwap is a self-custodial interface. Public blockchain activity is not private. Wallet addresses, token balances, approvals, transfers, swaps, transaction calldata, and transaction hashes may be permanently visible through blockchain nodes, explorers, analytics services, and public records.

The public PistachioSwap API exposes bounded Gas Assist and sponsorship proxy routes. Gas Assist execution, settlement, recovery, replay protection, abuse controls, and administrative operations are handled by a separately deployed private service that is not contained in the public repository.

## 2. Information we collect

The information processed depends on the features you use and how the Service is deployed.

### A. Wallet and blockchain information

We may process:

- Public wallet addresses and chain identifiers.
- Public token balances, allowances, transaction history, and portfolio values.
- Token contract addresses, token metadata, selected assets, and network selections.
- Public transaction hashes, transaction status, block information, and related on-chain records.
- Wallet connection and session information supplied by your wallet or connection provider.

Wallet addresses and transaction history may be personal information when they can reasonably be linked to a person or household.

### B. Swap, quote, and Gas Assist information

When you request a quote, build a swap, or use Gas Assist, the public API, private Gas Assist service, or configured providers may process and retain:

- Sell and buy token addresses, amounts, decimals, selected chain, recipient, and taker address.
- Quote identifiers, route information, provider responses, expected and minimum output, slippage, price impact, fees, gas estimates, and expiration times.
- Approval targets, approval amounts, typed-data payloads, signature hashes, transaction calldata, signed raw transactions, and submission attempts when required for an authorized sponsored flow.
- Payment, approval, swap, and settlement transaction hashes.
- Order status, provider status, rejection or failure codes, recovery events, timestamps, and idempotency keys.
- Gas sponsorship usage, limits, fraud-prevention records, and abuse indicators.

PistachioSwap does not need your private key to route a swap. Never send a private key, seed phrase, passkey secret, recovery phrase, or internal service token to PistachioSwap support.

### C. Pistachio Wallet information stored on your device

If the optional Pistachio Wallet feature is enabled, the application may store the following in your browser's IndexedDB storage:

- Encrypted wallet vault records and ciphertext.
- Public wallet addresses and vault identifiers.
- Wallet labels, selected-vault preferences, activity timestamps, and session-resume preferences.
- Passkey credential metadata and information needed to request a passkey operation.
- Recovery-backup confirmation state and local wallet settings.

The wallet is designed so that unlocked secret material remains inside a dedicated browser worker and is cleared when the wallet locks, times out, changes accounts, or is disposed. The encrypted local vault remains on the device until you delete it, clear site data, or remove the browser profile.

Your browser, operating system, device manufacturer, password manager, passkey provider, or cloud-synchronization provider may separately process passkey or device information under its own policy.

### D. Network, device, and security information

Our servers and service providers may automatically receive:

- Internet Protocol address. Gas Assist abuse controls may store a keyed hash of an IP address instead of the raw address.
- Request timestamps, route and endpoint information, HTTP headers, user agent, browser type, device type, operating system, and referring page.
- Rate-limit events, security events, error reports, diagnostic information, and suspected abuse indicators.
- Approximate location inferred from an IP address when supplied by infrastructure or security providers.

Development diagnostics are intended to redact authorization headers, internal service tokens, session tokens, signatures, private keys, and signed raw transactions. Production operators must verify logging and redaction configuration before launch.

### E. Communications

If you contact us, we may collect your email address, name or alias, wallet address if you provide it, message contents, attachments, and the history of our response.

Do not include secret wallet material, API credentials, internal service tokens, or sensitive vulnerability details in support messages or public GitHub issues.

## 3. Sources of information

We obtain information from:

- You and the actions you take in the Service.
- Your connected wallet, browser, and device.
- Public blockchains, RPC endpoints, indexers, explorers, and token registries.
- Swap, bridge, liquidity, market-data, token-security, and wallet-connection providers.
- Our public API, private Gas Assist service, databases, logs, rate-limit systems, and fraud-prevention controls.

## 4. How we use information

We may use information to:

- Connect a wallet and display balances, assets, activity, prices, and token information.
- Request, compare, validate, build, submit, recover, and monitor swaps and sponsored transactions.
- Calculate and disclose fees, gas costs, expected output, minimum output, and price impact.
- Authenticate wallet ownership through signed messages or typed data.
- Prevent replay, duplicate submissions, fraud, abuse, rate-limit evasion, and unauthorized sponsorship.
- Detect unsafe, unknown, hidden, or unsupported tokens and present risk information.
- Maintain local wallet security, encrypted storage, session state, signing review, and account recovery features.
- Operate, debug, secure, test, analyze, and improve the Service.
- Provide support and respond to privacy, legal, or security requests.
- Comply with law, enforce agreements, protect users and the Service, and establish or defend legal claims.

## 5. How we disclose information

We may disclose information to the following categories of recipients when necessary to provide the Service.

### Service and infrastructure providers

Depending on configuration, this may include hosting providers, databases, RPC providers, wallet indexers, and services such as Alchemy, Moralis, or self-hosted Pchained infrastructure.

### Wallet connection and software providers

This may include Reown AppKit, WalletConnect, MetaMask connection components, and the wallet application you choose to connect.

### Swap, liquidity, sponsorship, and bridge providers

This may include 0x, Uniswap, PancakeSwap, MegaFuel or NodeReal services, Across, deBridge, Relay, Chainflip, and other configured routing or execution providers.

### Market-data, token, and security providers

This may include DexScreener, GeckoTerminal, DexPaprika, CoinGecko, ShapeShift asset data, Honeypot.is, GoPlus, public token lists, and blockchain data services.

### Professional and legal recipients

We may disclose information to accountants, auditors, insurers, attorneys, regulators, law enforcement, courts, or other parties when reasonably necessary for compliance, safety, investigation, or legal claims.

### Business transfers

Information may be transferred as part of a financing, acquisition, merger, reorganization, asset sale, insolvency, or transition to a newly formed operating company, subject to applicable law.

### Public blockchains

When a transaction is broadcast, its public details are disclosed to blockchain validators, RPC nodes, explorers, analytics services, and the public. Blockchain records generally cannot be deleted or changed by PistachioSwap.

## 6. Sale, sharing, and advertising

As currently designed, PistachioSwap does **not** sell personal information and does **not** share personal information for cross-context behavioral advertising as those terms are defined by applicable California privacy law.

The repository does not currently include advertising analytics or behavioral-advertising trackers. If the production Service later introduces advertising, cross-site tracking, or a practice treated as a sale or sharing of personal information, this Policy and the Service's privacy controls must be updated before that practice begins.

## 7. Cookies, browser storage, and tracking choices

PistachioSwap may use browser storage necessary for the Service, including IndexedDB, local storage, session storage, caches, and connection-provider storage. These technologies may remember encrypted wallet vaults, settings, selected tokens, recent activity, connection state, and security preferences.

Clearing browser or site data may delete local wallet information. Back up recovery information before clearing storage. PistachioSwap cannot restore local wallet secrets that you did not safely back up.

### Do Not Track and Global Privacy Control

Some browsers send a legacy "Do Not Track" signal. There is no universally accepted technical standard for responding to that signal, and the current Service does not change essential processing solely because it receives one.

Because PistachioSwap does not currently sell or share personal information for behavioral advertising, there is no separate sale or sharing to opt out of. If that changes, PistachioSwap will implement legally required opt-out mechanisms and recognize valid preference signals where required.

Third-party wallet, infrastructure, and routing providers may collect information across services under their own policies. PistachioSwap does not control their independent tracking practices.

## 8. Data retention

We retain information only for as long as reasonably necessary for the purposes described in this Policy, including transaction execution and recovery, security, fraud prevention, support, accounting, tax, dispute resolution, and legal compliance.

Retention depends on the type of information:

- **Local wallet data** remains in your browser until you delete the vault, clear site data, or remove the browser profile.
- **Quotes, challenges, and sessions** have configured expiration periods, but associated security or transaction records may be retained after expiration when needed to prevent replay, investigate abuse, recover a transaction, or document a completed service.
- **Transaction and fee records** may be retained for the period required for accounting, tax, compliance, disputes, and legal claims.
- **Security and abuse records** may be retained while a threat, restriction, investigation, or legal need remains active.
- **Support communications** may be retained while needed to resolve the request and maintain an appropriate record.
- **Backups** may retain information for a limited additional period before deletion or overwrite.

Before production launch, the operator must document and implement deletion schedules for public API logs, private Gas Assist records, expired authentication records, backups, and support systems. We may retain de-identified or aggregated information when it can no longer reasonably identify you.

## 9. Security

We use administrative, technical, and organizational safeguards intended to protect information, including encrypted local vault storage, explicit signing review, backend-only credentials, an authenticated server-to-server Gas Assist boundary, restricted private administrative routes, rate limits, signature verification, expiry checks, idempotency, replay protection, provider validation, and restricted CORS configuration.

No wallet, browser, smart contract, network, database, service boundary, or transmission method is completely secure. You are responsible for securing your device, browser profile, passkeys, connected wallets, recovery information, and accounts.

## 10. Your choices and rights

Depending on where you live and which privacy laws apply, you may have rights to request access to, correction of, or deletion of personal information; obtain information about collection and disclosure; object to or restrict certain processing; or receive a portable copy.

You may also:

- Disconnect your external wallet.
- Delete a local Pistachio Wallet vault through the application when that feature is available.
- Clear browser storage, understanding that doing so may permanently remove local wallet data.
- Avoid providing optional support information.
- Decline a signature or transaction before submission.

Blockchain data cannot generally be deleted or corrected by PistachioSwap. We may also deny or limit a request when an exception applies, including security, fraud prevention, legal obligations, or inability to verify the requester.

## 11. California privacy rights

California residents may have statutory privacy rights when the relevant law applies, including rights to know, access, delete, and correct personal information; opt out of certain sale or sharing; limit certain uses of sensitive personal information; and receive equal service when exercising privacy rights.

Before launch, counsel must determine which California privacy statutes and thresholds apply to the final operator and Service. Regardless of mandatory coverage, we intend to consider verified access, correction, and deletion requests where technically and legally feasible.

Submit a request to **privacy@pistachioswap.com**. Before launch, the operator must ensure this address exists, is monitored, and has a documented identity-verification and response process. We will not request a seed phrase or private key to verify a privacy request.

## 12. Children and minors

The Service is not directed to children under 13, and we do not knowingly collect personal information from children under 13. The production Service may impose a higher minimum age or require users to have legal capacity to enter a contract, depending on applicable law and the final Terms of Use.

We do not knowingly sell or share the personal information of consumers under 16 for behavioral advertising.

## 13. International users

PistachioSwap and its providers may process information in the United States and other countries. Those countries may have privacy laws different from the laws where you live. Where required, the operator must implement appropriate transfer safeguards before launch in the relevant jurisdiction.

## 14. Changes to this Policy

We may update this Policy to reflect changes in the Service, vendors, law, security practices, or the operating company. We will post the revised Policy, update the "Last updated" date, and provide additional notice when legally required or when a change is material.

## 15. Contact

Privacy questions and requests: **privacy@pistachioswap.com**

Before commercial launch, this section must be updated with the final operating entity's exact legal name and any additional contact information required by applicable law.

---

This pre-launch draft maps the repository's current architecture and intended data flows into a readable privacy notice. It is not a substitute for advice from qualified counsel reviewing the final business and production deployment.
