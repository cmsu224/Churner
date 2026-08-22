import IssuerLogo from '../shared/IssuerLogo'
import { getIssuerMeta } from '../../utils/issuers'
import { Landmark, Wallet, Home } from 'lucide-react'

// A money-map node's face: the real brand logo where the bank is one the issuer
// table knows, otherwise the icon for what kind of place it is. Every other page
// in the app leads with the logo, and on a card the size of a map node it is
// what makes a bank recognisable before its name has finished being read.
//
// The icon fallback is deliberate rather than falling through to IssuerLogo's
// monogram: "MA" tells you nothing about a source you named "Main account",
// while a house does.
//
// Both branches share one wrapper so `className` means the same thing either
// way — callers use it to size, tint, or hide the glyph responsively, and a
// class that only landed on the icon would be a silent no-op on the logo.

export default function NodeGlyph({ node, size = 18, className = '', rounded = 'rounded' }) {
  const meta = getIssuerMeta(node?.name)
  const Icon = node?.kind === 'source' ? (node.isHub ? Home : Wallet) : Landmark

  return (
    <span
      className={`inline-flex items-center justify-center flex-shrink-0 ${className}`}
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      {meta.domain ? (
        <IssuerLogo name={node.name} size={size} rounded={rounded} />
      ) : (
        <span className={`inline-flex items-center justify-center w-full h-full bg-raised border border-edge ${rounded}`}>
          <Icon size={Math.round(size * 0.62)} />
        </span>
      )}
    </span>
  )
}
