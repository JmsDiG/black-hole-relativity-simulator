import type { ReactNode } from 'react'

interface InfoTipProps {
  title: string
  children: ReactNode
}

export function InfoTip({ title, children }: InfoTipProps) {
  return (
    <span className="info-tip" tabIndex={0}>
      <span aria-hidden="true" className="info-tip__trigger">
        <svg viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="9" />
          <circle className="info-tip__dot" cx="12" cy="8" r="1.2" />
          <path
            className="info-tip__stem"
            d="M12 10.5v5"
            strokeLinecap="round"
            strokeWidth="2"
          />
        </svg>
      </span>
      <span className="info-tip__content" role="tooltip">
        <strong>{title}</strong>
        <span>{children}</span>
      </span>
    </span>
  )
}
