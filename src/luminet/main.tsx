import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { LuminetApp } from './LuminetApp'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <LuminetApp />
  </StrictMode>,
)
