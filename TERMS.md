# PistachioSwap Terms of Use

**Effective date:** July 28, 2026  
**Last updated:** July 28, 2026

> [!IMPORTANT]
> **Pre-launch legal notice:** PistachioSwap is currently a project name and the final operating company has not yet been identified in this repository. Before commercial launch, these Terms must be reviewed by qualified counsel and updated with the exact legal entity name, monitored contact information, final fees, supported jurisdictions, dispute provisions, and production functionality.

These Terms of Use (the "Terms") govern access to and use of the PistachioSwap website, wallet interface, public API, separately deployed Gas Assist service, software, and related services (collectively, the "Service"). "PistachioSwap," "we," "us," and "our" refer to the person or entity operating the Service under the PistachioSwap name.

By accessing or using the Service, you agree to these Terms. If you do not agree, do not use the Service.

## 1. Eligibility

You may use the Service only if:

- You are at least 18 years old and have legal capacity to enter into these Terms.
- Your use is lawful where you live and where you access the Service.
- You are not subject to sanctions or restrictions that prohibit your use of the Service.
- You are not using the Service for another person or entity in violation of law or without authority.

The Service is not offered where its use would require PistachioSwap to violate applicable law. Availability in an interface does not mean the Service is lawful or appropriate in every jurisdiction.

## 2. Pre-release software

PistachioSwap is under active development. Features may be incomplete, disabled, experimental, unavailable, changed, or removed without notice. The Service has not been independently audited and may contain defects, vulnerabilities, inaccurate data, or interruptions.

Do not use the Service with assets you cannot afford to lose. Test new features with small amounts and separate wallets.

## 3. What the Service does

Depending on configuration, the Service may:

- Connect to an external wallet.
- Create or import an optional browser-based Pistachio Wallet.
- Display public balances, assets, activity, prices, and token information.
- Request and compare swap or bridge quotes from third-party providers.
- Build transaction or typed-data requests for your review and signature.
- Submit or monitor transactions you explicitly authorize.
- Offer Gas Assist for certain eligible transactions when the connected wallet lacks native BNB.

The public API exposes only bounded Gas Assist and sponsorship proxy routes. Gas Assist execution, quote state, settlement, recovery, replay protection, abuse controls, and administrative operations run through a separately deployed private service.

PistachioSwap may change supported chains, assets, providers, transaction types, limits, fees, and eligibility rules at any time.

## 4. Self-custody and wallet responsibility

PistachioSwap is designed as a self-custodial interface. PistachioSwap does not take custody of your assets merely because you connect a wallet, view a balance, or request a quote.

You are solely responsible for:

- Your wallet, device, browser profile, passkeys, passwords, private keys, recovery phrases, backups, and account security.
- Reviewing every address, token, amount, network, approval, fee, and transaction before signing.
- Maintaining enough native currency when Gas Assist is unavailable or ineligible.
- Safely backing up any wallet you create or import.
- Verifying that your wallet and browser are authentic and uncompromised.

PistachioSwap cannot recover a lost private key, forgotten recovery phrase, deleted local vault, inaccessible passkey, or asset sent to the wrong address or network.

Never provide a private key, seed phrase, passkey secret, recovery phrase, API credential, or internal service token to anyone claiming to represent PistachioSwap.

## 5. Local Pistachio Wallet

If enabled, Pistachio Wallet may store encrypted vault data and preferences in your browser's IndexedDB storage. Clearing site data, resetting a browser profile, uninstalling a browser, losing a device, or losing access to a passkey may permanently remove access unless you have a valid recovery backup.

Browser encryption and passkey protection reduce risk but do not make a compromised device safe. Malware, browser extensions, operating-system compromise, phishing, synchronization providers, or physical access may expose or destroy wallet information.

You are responsible for confirming and securely storing recovery information before relying on the local wallet.

## 6. Quotes, routes, and third-party execution

Quotes are estimates based on information available when requested. They may expire or change because of market movement, liquidity, slippage, price impact, gas prices, provider behavior, token taxes, rebasing, transfer restrictions, block timing, front-running, maximum extractable value, bridge conditions, or blockchain reorganization.

A displayed route does not guarantee that:

- The transaction will be accepted, mined, finalized, or profitable.
- The expected or minimum output will be available after expiration.
- A token is safe, legitimate, liquid, transferable, or redeemable.
- A provider, smart contract, bridge, RPC endpoint, or blockchain will operate correctly.
- A transaction can be reversed, refunded, or recovered.

You authorize only the transaction or signature request you approve in your wallet. You must reject any request that does not match your intent.

## 7. Fees and costs

The Service may charge platform, integrator, Gas Assist, fixed, percentage-based, progressive, or other disclosed fees. Third parties may separately charge liquidity-provider fees, bridge fees, protocol fees, token taxes, spreads, gas costs, relayer costs, or other charges.

Before signing, review the quote and transaction details shown by the Service and your wallet. Fees may vary by route, provider, asset, network, trade size, and current conditions. Unless expressly stated otherwise in the interface or required by law, fees are not refundable after a transaction is submitted or completed.

A configuration value, repository example, test fixture, or documentation sample is not a binding production price. The fee displayed in the final production quote controls for that transaction, subject to obvious error and applicable law.

## 8. Gas Assist

Gas Assist is intended to help eligible users execute certain supported transactions when the connected wallet lacks native gas currency. Gas Assist may include network cost, sponsorship cost, conversion cost, and PistachioSwap fees in the quote or prepayment flow.

Gas Assist:

- Is not free unless the interface expressly says so.
- Is not available for every wallet, token, amount, route, or network.
- May require wallet authentication, typed-data signatures, token approval, payment, rate-limit checks, transaction simulation, or other eligibility checks.
- May be rejected because of token risk, liquidity, price impact, allowance, provider support, transaction simulation, abuse controls, limits, or changing network conditions.
- May expire before signatures or transaction submission are completed.
- Depends on a private backend and third-party infrastructure that may be paused, unavailable, or changed.

PistachioSwap may pause, limit, refuse, or terminate Gas Assist to protect users, the treasury, providers, or the Service.

## 9. Public blockchain records

Blockchain transactions are generally public and irreversible. Once broadcast, a transaction and its associated wallet addresses, token amounts, approvals, calldata, and transaction hash may be permanently visible and copied by third parties.

PistachioSwap cannot delete, edit, hide, recall, or guarantee finality of public blockchain records.

## 10. Token and smart-contract risks

Digital assets and decentralized protocols involve substantial risk, including:

- Total or partial loss of value.
- Smart-contract bugs, exploits, malicious upgrades, governance attacks, and admin-key risk.
- Fake, impersonating, honeypot, fee-on-transfer, rebasing, blacklistable, pausable, or non-transferable tokens.
- Liquidity loss, depegging, insolvency, bridge failure, oracle manipulation, and market manipulation.
- Approval abuse, unlimited allowances, signature phishing, and malicious transaction calldata.
- Network congestion, failed transactions, chain reorganizations, forks, validator failures, and RPC errors.
- Legal, tax, regulatory, or sanctions changes.

Risk labels, token lists, simulations, provider checks, and route validation may be incomplete, delayed, wrong, unavailable, or bypassed by a changing token contract. You must independently evaluate every asset and transaction.

## 11. No investment, legal, or tax advice

The Service provides software and transaction information. Nothing in the Service is investment, financial, trading, legal, tax, accounting, or fiduciary advice. PistachioSwap does not recommend that you buy, sell, hold, bridge, stake, or use any asset.

You are responsible for your own decisions and for obtaining professional advice appropriate to your circumstances.

## 12. Taxes and reporting

You are solely responsible for determining and satisfying taxes, reporting obligations, recordkeeping duties, and other legal obligations arising from your transactions. PistachioSwap does not calculate or file taxes for you unless a separate written service expressly says otherwise.

## 13. Third-party services

The Service relies on or links to independent wallets, blockchains, RPC providers, indexers, token lists, market-data providers, swap aggregators, decentralized exchanges, bridges, relayers, sponsorship providers, security services, and other software.

Third-party services are not controlled by PistachioSwap. Their terms, privacy policies, fees, availability, security, and conduct apply separately. PistachioSwap is not responsible for third-party acts, omissions, downtime, data, contracts, tokens, or losses.

Names and logos of third parties belong to their respective owners. Integration does not imply endorsement, partnership, guarantee, or sponsorship.

## 14. Acceptable use

You may not use the Service to:

- Violate law, sanctions, court orders, or another person's rights.
- Launder money, finance unlawful activity, evade lawful restrictions, commit fraud, or conceal criminal proceeds.
- Exploit, attack, overload, disrupt, probe, or bypass security, service boundaries, or rate limits.
- Submit malicious transactions, signatures, payloads, tokens, links, code, or data.
- Impersonate another person or misrepresent authorization, affiliation, location, or identity.
- Manipulate quotes, sponsorship eligibility, fees, abuse controls, referrals, or provider systems.
- Scrape, copy, reverse engineer, or resell the Service in violation of the applicable software license or a third party's terms.
- Use the Service in a way that exposes PistachioSwap or another person to legal, security, financial, or operational harm.

We may investigate suspected abuse and cooperate with lawful requests.

## 15. Intellectual property and software license

PistachioSwap's owner-controlled source code is source-available under the PolyForm Noncommercial License 1.0.0 unless a file states otherwise. Commercial use requires a separate written license from the project owner.

Third-party packages, components, fonts, data, token lists, SDKs, and copied or generated materials remain subject to their own licenses and notices. You must comply with all applicable third-party terms.

These Terms govern use of the hosted Service. They do not expand the source-code license, grant commercial hosting rights, or transfer ownership of PistachioSwap names, logos, domains, designs, or other intellectual property.

## 16. Feedback and contributions

If you submit feedback, suggestions, issues, or other non-confidential ideas, you grant PistachioSwap a worldwide, perpetual, irrevocable, royalty-free right to use, modify, reproduce, publish, and incorporate that feedback without compensation or attribution.

Code contributions remain governed by the repository license and any contribution terms presented when you submit them. Do not contribute code or content you do not have the right to provide.

## 17. Privacy

The [Privacy Policy](PRIVACY.md) explains how information is processed through the Service. By using the Service, you acknowledge those practices.

Do not submit sensitive wallet secrets through support channels, analytics, issue trackers, or pull requests.

## 18. Availability, changes, and termination

We may modify, suspend, restrict, or discontinue any part of the Service at any time. We may block or limit access when reasonably necessary for security, maintenance, legal compliance, provider requirements, suspected abuse, or treasury protection.

You may stop using the Service at any time. Stopping use does not reverse blockchain transactions, cancel third-party obligations, or remove public records.

Provisions that by their nature should survive termination will survive, including ownership, risk allocation, disclaimers, limitations of liability, indemnity, and dispute terms.

## 19. Disclaimers

TO THE MAXIMUM EXTENT PERMITTED BY LAW, THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE," WITHOUT WARRANTIES OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, TITLE, NON-INFRINGEMENT, SECURITY, ACCURACY, AVAILABILITY, OR QUIET ENJOYMENT.

PISTACHIOSWAP DOES NOT WARRANT THAT THE SERVICE WILL BE UNINTERRUPTED, ERROR-FREE, SECURE, AUDITED, LAWFUL IN YOUR JURISDICTION, OR COMPATIBLE WITH ANY WALLET, TOKEN, PROVIDER, BROWSER, DEVICE, NETWORK, SMART CONTRACT, OR PRIVATE BACKEND SERVICE.

Nothing in these Terms excludes a warranty or right that cannot lawfully be excluded.

## 20. Limitation of liability

TO THE MAXIMUM EXTENT PERMITTED BY LAW, PISTACHIOSWAP AND ITS OWNER, FUTURE OPERATING ENTITY, CONTRIBUTORS, CONTRACTORS, AND SERVICE PROVIDERS WILL NOT BE LIABLE FOR INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, CONSEQUENTIAL, OR PUNITIVE DAMAGES; LOST PROFITS, REVENUE, DATA, GOODWILL, KEYS, TOKENS, OR OPPORTUNITIES; OR LOSSES ARISING FROM MARKET MOVEMENT, SMART CONTRACTS, TOKENS, BRIDGES, WALLETS, PROVIDERS, BLOCKCHAINS, SECURITY INCIDENTS, USER ERROR, OR UNAUTHORIZED ACCESS.

TO THE MAXIMUM EXTENT PERMITTED BY LAW, TOTAL LIABILITY ARISING OUT OF OR RELATING TO THE SERVICE WILL NOT EXCEED THE GREATER OF: (A) THE FEES YOU PAID DIRECTLY TO PISTACHIOSWAP FOR THE SPECIFIC TRANSACTION GIVING RISE TO THE CLAIM; OR (B) US $100.

Some jurisdictions do not allow certain exclusions or limits, so portions of this section may not apply to you.

## 21. Indemnification

To the maximum extent permitted by law, you agree to defend, indemnify, and hold harmless PistachioSwap, its owner, future operating entity, contributors, contractors, and service providers from claims, damages, obligations, losses, liabilities, costs, and expenses arising from your unlawful use of the Service, violation of these Terms, violation of another person's rights, or transactions you authorize.

This section does not require indemnification for conduct that cannot lawfully be indemnified.

## 22. Governing law and venue

These Terms are governed by the laws of the State of California, without regard to conflict-of-laws principles, except where another jurisdiction's mandatory consumer law applies.

Unless applicable law requires otherwise, disputes arising from these Terms or the Service will be brought in the state or federal courts located in Los Angeles County, California, and each party consents to their jurisdiction and venue.

Before launch, qualified counsel should confirm whether arbitration, class-action, consumer-notice, or alternative venue provisions are appropriate. None are imposed by this pre-launch draft.

## 23. Changes to these Terms

We may update these Terms as the Service, fees, operating entity, providers, law, or risk profile changes. We will post the revised Terms and update the "Last updated" date. Additional notice will be provided when required by law.

Continued use after revised Terms become effective constitutes acceptance to the extent permitted by law. If you do not agree to revised Terms, stop using the Service.

## 24. General terms

If any provision is found unenforceable, it will be enforced to the maximum lawful extent and the remaining provisions will remain effective. A failure to enforce a provision is not a waiver. You may not assign these Terms without written consent; PistachioSwap may assign them as part of company formation, financing, reorganization, or transfer of the Service.

These Terms, the Privacy Policy, the applicable software license, and any transaction-specific disclosures form the agreement concerning the Service, subject to any separate written agreement.

## 25. Contact

Legal questions: **legal@pistachioswap.com**  
Privacy questions: **privacy@pistachioswap.com**

Before commercial launch, the operator must ensure these addresses exist and are monitored, and must add the final legal entity's exact name and any required mailing address.

---

This pre-launch draft identifies the main contractual risks reflected in the repository and current split-service architecture. It is not a substitute for a lawyer's review of the final product, company, licenses, money-transmission analysis, sanctions controls, consumer disclosures, and launch jurisdictions.
