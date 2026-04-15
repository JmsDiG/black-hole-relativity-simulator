import type { ReactNode } from 'react'

interface RangeFieldProps {
  label: ReactNode
  value: number
  min: number
  max: number
  step: number
  onChange: (value: number) => void
  formatValue?: (value: number) => string
}

export function RangeField({
  label,
  value,
  min,
  max,
  step,
  onChange,
  formatValue,
}: RangeFieldProps) {
  return (
    <label className="range-field">
      <span className="range-field__label">
        <span className="range-field__text">{label}</span>
        <strong>{formatValue ? formatValue(value) : value.toFixed(2)}</strong>
      </span>
      <input
        max={max}
        min={min}
        onChange={(event) => onChange(Number(event.target.value))}
        step={step}
        type="range"
        value={value}
      />
    </label>
  )
}
