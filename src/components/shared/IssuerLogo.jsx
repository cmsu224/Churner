import { useState } from 'react'
import { getIssuerMeta, monogram } from '../../utils/issuers'

// Renders a brand logo for an issuer/bank name. Pulls the real logo from
// Google's public favicon service (no auth, no user data sent — just the
// public brand domain). Falls back to a brand-colored monogram badge if the
// image fails or the issuer is unknown.
export default function IssuerLogo({ name, size = 28, rounded = 'rounded-md' }) {
  const meta = getIssuerMeta(name)
  const [failed, setFailed] = useState(false)

  const showImg = meta.domain && !failed
  const px = `${size}px`

  if (showImg) {
    return (
      <span
        className={`inline-flex items-center justify-center bg-white ${rounded} overflow-hidden flex-shrink-0`}
        style={{ width: px, height: px }}
      >
        <img
          src={`https://www.google.com/s2/favicons?domain=${meta.domain}&sz=64`}
          alt={meta.name}
          width={size - 8}
          height={size - 8}
          loading="lazy"
          onError={() => setFailed(true)}
          style={{ width: size - 8, height: size - 8 }}
        />
      </span>
    )
  }

  return (
    <span
      className={`inline-flex items-center justify-center ${rounded} flex-shrink-0 font-bold text-white`}
      style={{ width: px, height: px, backgroundColor: meta.color, fontSize: size * 0.36 }}
    >
      {monogram(name)}
    </span>
  )
}
