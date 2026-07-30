# bigint-buffer safe compatibility package

This private workspace package replaces the transitive `bigint-buffer@1.1.5`
package inside PistachioSwap.

The upstream package loads a native conversion binding affected by
`CVE-2025-3194` / `GHSA-3gc7-fjrx-p6mg`. This replacement implements the same
four public conversion functions in bounded, pure JavaScript and has no native
binding, install script, network access, or filesystem access.

The implementation rejects negative values, oversized inputs, invalid widths,
and values that do not fit in the requested output width rather than silently
truncating them.

This package is not published and is resolved only through the root pnpm
override.
