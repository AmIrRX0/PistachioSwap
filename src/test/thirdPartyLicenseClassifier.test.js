import { describe, expect, it } from 'vitest'

import {
    REQUIRED_NOTICES,
    classifyPackagedLicense,
} from '../../scripts/third-party-license-classifier.mjs'

describe('third-party packaged license classification', () => {
    it('scopes the Reown attribution to the Reown Community License', () => {
        expect(classifyPackagedLicense({
            declaredLicense: 'SEE LICENSE IN LICENSE.md',
            licenseText: 'REOWN COMMUNITY LICENSE AGREEMENT\nRelease Date: 25 August 2025',
        })).toMatchObject({
            kind: 'custom',
            group: 'reown-appkit',
            label: 'Reown Community License',
            requiredNotice: REQUIRED_NOTICES.reown,
        })
    })

    it('scopes the Reown attribution to WalletConnect Community License packages', () => {
        expect(classifyPackagedLicense({
            declaredLicense: 'SEE LICENSE IN LICENSE.md',
            licenseText: 'WALLETCONNECT COMMUNITY LICENSE AGREEMENT\nRelease Date: 20 August 2025',
        })).toMatchObject({
            kind: 'custom',
            group: 'walletconnect-community',
            label: 'WalletConnect Community License',
            requiredNotice: REQUIRED_NOTICES.reown,
        })
    })

    it('detects the ConsenSys custom license without applying it to every MetaMask package', () => {
        expect(classifyPackagedLicense({
            declaredLicense: 'SEE LICENSE IN LICENSE',
            licenseText: [
                'Copyright ConsenSys Software Inc. 2022. All rights reserved.',
                'Non-Commercial Use means each use as described below.',
            ].join('\n'),
        })).toMatchObject({
            kind: 'custom',
            group: 'metamask-custom',
            requiredNotice: REQUIRED_NOTICES.metamask,
        })

        expect(classifyPackagedLicense({
            declaredLicense: 'MIT',
            licenseText: 'Permission is hereby granted, free of charge, to any person obtaining a copy of this software.',
        })).toEqual({
            kind: 'standard',
            group: 'standard',
            label: 'MIT',
            requiredNotice: null,
        })
    })

    it('recognizes ISC and Unlicense text from installed packages', () => {
        expect(classifyPackagedLicense({
            declaredLicense: null,
            licenseText: 'Permission to use, copy, modify, and/or distribute this software for any purpose with or without fee is hereby granted.',
        }).label).toBe('ISC')

        expect(classifyPackagedLicense({
            declaredLicense: null,
            licenseText: 'This is free and unencumbered software released into the public domain. THE UNLICENSE',
        }).label).toBe('Unlicense / public domain dedication')
    })

    it('uses ordinary declared licenses but blocks unresolved SEE LICENSE metadata', () => {
        expect(classifyPackagedLicense({
            declaredLicense: 'BSD-3-Clause',
            licenseText: 'Copyright holder notice',
        })).toMatchObject({
            kind: 'standard',
            label: 'BSD-3-Clause',
        })

        expect(classifyPackagedLicense({
            declaredLicense: 'SEE LICENSE IN LICENSE.md',
            licenseText: 'Some unrecognized custom terms',
        })).toMatchObject({
            kind: 'unresolved',
            label: 'Unresolved license',
        })
    })
})
