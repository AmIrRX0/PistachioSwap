export const REQUIRED_NOTICES = Object.freeze({
    reown: 'Portions © 2025 Reown, Inc. All Rights Reserved.',
    metamask: 'Copyright ConsenSys Software Inc. 2022. All rights reserved.',
})

function normalizeDeclaredLicense(value) {
    if (typeof value === 'string') return value.trim()
    if (value && typeof value === 'object' && typeof value.type === 'string') {
        return value.type.trim()
    }
    return ''
}

function isUsableDeclaredLicense(value) {
    return Boolean(value)
        && !/^(?:unknown|unlicensed|see license(?:\s+in\b.*)?)$/i.test(value)
}

function inferStandardLicense(text) {
    if (/Permission is hereby granted, free of charge, to any person obtaining a copy/i.test(text)) {
        return 'MIT'
    }
    if (/Permission to use, copy, modify, and\/or distribute this software for any purpose with or without fee/i.test(text)) {
        return 'ISC'
    }
    if (/Apache License[\s\S]{0,120}Version 2\.0/i.test(text)) return 'Apache-2.0'
    if (/Redistribution and use in source and binary forms[\s\S]{0,500}three conditions/i.test(text)) {
        return 'BSD-3-Clause'
    }
    if (/Redistribution and use in source and binary forms[\s\S]{0,500}two conditions/i.test(text)) {
        return 'BSD-2-Clause'
    }
    if (/THE UNLICENSE|This is free and unencumbered software released into the public domain/i.test(text)) {
        return 'Unlicense / public domain dedication'
    }
    return ''
}

export function classifyPackagedLicense({ declaredLicense, licenseText }) {
    const declared = normalizeDeclaredLicense(declaredLicense)
    const text = String(licenseText || '')

    if (/REOWN COMMUNITY LICENSE AGREEMENT/i.test(text)) {
        return {
            kind: 'custom',
            group: 'reown-appkit',
            label: 'Reown Community License',
            requiredNotice: REQUIRED_NOTICES.reown,
        }
    }

    if (/WALLETCONNECT COMMUNITY LICENSE AGREEMENT/i.test(text)) {
        return {
            kind: 'custom',
            group: 'walletconnect-community',
            label: 'WalletConnect Community License',
            requiredNotice: REQUIRED_NOTICES.reown,
        }
    }

    if (
        /Copyright ConsenSys Software Inc\. 2022\. All rights reserved\./i.test(text)
        && /Non-Commercial Use/i.test(text)
    ) {
        return {
            kind: 'custom',
            group: 'metamask-custom',
            label: 'MetaMask / ConsenSys custom license',
            requiredNotice: REQUIRED_NOTICES.metamask,
        }
    }

    const inferred = inferStandardLicense(text)
    if (inferred) {
        return {
            kind: 'standard',
            group: 'standard',
            label: inferred,
            requiredNotice: null,
        }
    }

    if (isUsableDeclaredLicense(declared)) {
        return {
            kind: 'standard',
            group: 'standard',
            label: declared,
            requiredNotice: null,
        }
    }

    if (text.trim()) {
        return {
            kind: 'documented',
            group: 'other',
            label: 'See included license file',
            requiredNotice: null,
        }
    }

    return {
        kind: 'unresolved',
        group: 'unresolved',
        label: 'Unresolved license',
        requiredNotice: null,
    }
}

export function displayDeclaredLicense(value) {
    return normalizeDeclaredLicense(value) || 'Not declared in package metadata'
}
