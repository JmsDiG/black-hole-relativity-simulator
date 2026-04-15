import { BlockMath, InlineMath } from 'react-katex'

function ParameterList({
  items,
}: {
  items: Array<{ symbol: string; meaning: string; units: string }>
}) {
  return (
    <div className="formula-params">
      {items.map((item) => (
        <div className="formula-param" key={item.symbol}>
          <div className="formula-param__symbol">
            <InlineMath math={item.symbol} />
          </div>
          <div className="formula-param__body">
            <span>{item.meaning}</span>
            <small>
              units: <InlineMath math={item.units} />
            </small>
          </div>
        </div>
      ))}
    </div>
  )
}

export function FormulaPanel() {
  return (
    <section className="panel">
      <div className="panel__header">
        <h2>Formula deck</h2>
        <span>
          Core relations used by the simulator, with parameter definitions and
          units.
        </span>
      </div>

      <div className="formula-card">
        <strong>Schwarzschild radius</strong>
        <BlockMath math="R_s = \frac{2GM}{c^2}" />
        <p>
          The mass selector rescales the physical size of the system through{' '}
          <InlineMath math="R_s" />.
        </p>
        <ParameterList
          items={[
            {
              symbol: 'R_s',
              meaning: 'Schwarzschild radius',
              units: '\\mathrm{m}\\;\\text{or}\\;\\mathrm{km}',
            },
            {
              symbol: 'G',
              meaning: 'gravitational constant',
              units: '\\mathrm{m^3\\,kg^{-1}\\,s^{-2}}',
            },
            {
              symbol: 'M',
              meaning: 'black-hole mass',
              units: '\\mathrm{kg}\\;\\text{or}\\;M_\\odot',
            },
            {
              symbol: 'c',
              meaning: 'speed of light',
              units: '\\mathrm{m\\,s^{-1}}',
            },
          ]}
        />
      </div>

      <div className="formula-card">
        <strong>Lorentz factor</strong>
        <BlockMath math="\gamma = \frac{1}{\sqrt{1-\beta^2}}" />
        <p>
          The radial and tangential velocities are combined into a local speed{' '}
          <InlineMath math="\beta" /> in a static orthonormal frame.
        </p>
        <ParameterList
          items={[
            {
              symbol: '\\gamma',
              meaning: 'Lorentz factor',
              units: '1',
            },
            {
              symbol: '\\beta',
              meaning: 'speed divided by the speed of light',
              units: '1',
            },
          ]}
        />
      </div>

      <div className="formula-card">
        <strong>Clock-rate approximation</strong>
        <BlockMath math="\frac{d\tau}{dt_\infty} \approx \frac{\sqrt{1 - R_s/r}}{\gamma}" />
        <p>
          This is the main time-dilation relation displayed in the scientific
          dashboard.
        </p>
        <ParameterList
          items={[
            {
              symbol: '\\tau',
              meaning: 'proper time of the local observer',
              units: '\\mathrm{s}',
            },
            {
              symbol: 't_\\infty',
              meaning: 'distant observer time',
              units: '\\mathrm{s}',
            },
            {
              symbol: 'r',
              meaning: 'Schwarzschild radial coordinate',
              units: '\\mathrm{m}\\;\\text{or}\\;R_s',
            },
            {
              symbol: 'R_s',
              meaning: 'Schwarzschild radius',
              units: '\\mathrm{m}\\;\\text{or}\\;R_s',
            },
            {
              symbol: '\\gamma',
              meaning: 'Lorentz factor from local observer speed',
              units: '1',
            },
          ]}
        />
      </div>

      <div className="formula-card">
        <strong>Observed frequency trend</strong>
        <BlockMath math="g_{\mathrm{obs}} \approx g_{\mathrm{grav}} \, g_{\mathrm{Doppler}}" />
        <p>
          The spectral colouring is driven by a combined gravitational and
          kinematic shift, while ray bending remains a visual approximation.
        </p>
        <ParameterList
          items={[
            {
              symbol: 'g_{\\mathrm{obs}}',
              meaning: 'net observed frequency-shift factor',
              units: '1',
            },
            {
              symbol: 'g_{\\mathrm{grav}}',
              meaning: 'gravitational frequency-shift contribution',
              units: '1',
            },
            {
              symbol: 'g_{\\mathrm{Doppler}}',
              meaning: 'kinematic Doppler contribution',
              units: '1',
            },
          ]}
        />
      </div>
    </section>
  )
}
