export const starfieldVertexShader = `
varying vec3 vWorldPosition;

void main() {
  vec4 worldPosition = modelMatrix * vec4(position, 1.0);
  vWorldPosition = worldPosition.xyz;
  gl_Position = projectionMatrix * viewMatrix * worldPosition;
}
`

export const starfieldFragmentShader = `
precision highp float;

uniform vec3 uBlackHolePosition;
uniform vec3 uVelocity;
uniform float uGravitationalBlueshift;
uniform float uLensStrength;
uniform float uPhotonSphere;
uniform float uModelMode;
uniform float uApproxMode;
uniform float uTime;

varying vec3 vWorldPosition;

const float PI = 3.14159265359;
const float TAU = 6.28318530718;

float hash(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

float hash3(vec3 p) {
  p = fract(p * 0.3183099 + vec3(0.1, 0.2, 0.3));
  p *= 17.0;
  return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
}

vec2 directionToUv(vec3 dir) {
  vec2 uv = vec2(atan(dir.z, dir.x) / TAU + 0.5, asin(clamp(dir.y, -1.0, 1.0)) / PI + 0.5);
  return uv;
}

vec3 rotateAroundAxis(vec3 vector, vec3 axis, float angle) {
  float sine = sin(angle);
  float cosine = cos(angle);
  return vector * cosine + cross(axis, vector) * sine + axis * dot(axis, vector) * (1.0 - cosine);
}

vec3 spectralShift(vec3 baseColor, float shift) {
  float warm = smoothstep(1.05, 0.35, shift);
  float cool = smoothstep(1.0, 2.4, shift);
  vec3 warmColor = vec3(baseColor.r * 1.2 + baseColor.g * 0.16, baseColor.g * 0.88, baseColor.b * 0.52);
  vec3 coolColor = vec3(baseColor.r * 0.72, baseColor.g * 1.08 + baseColor.b * 0.08, baseColor.b * 1.35 + baseColor.g * 0.12);
  vec3 shifted = mix(baseColor, warmColor, warm);
  shifted = mix(shifted, coolColor, cool);
  shifted *= mix(0.76, 1.24, clamp((shift - 0.35) / 2.2, 0.0, 1.0));
  return shifted;
}

vec3 backgroundColor(vec3 dir) {
  vec2 uv = directionToUv(dir);
  vec2 gridA = uv * vec2(150.0, 78.0);
  vec2 cellA = floor(gridA);
  vec2 localA = fract(gridA) - 0.5;
  float seedA = hash(cellA);
  float starA = smoothstep(0.992, 0.9995, seedA) * smoothstep(0.18, 0.0, length(localA));

  vec2 gridB = uv * vec2(380.0, 220.0);
  vec2 cellB = floor(gridB);
  vec2 localB = fract(gridB) - 0.5;
  float seedB = hash(cellB + 17.2);
  float starB = smoothstep(0.9982, 0.99995, seedB) * smoothstep(0.1, 0.0, length(localB));

  float nebulaA = 0.5 + 0.5 * sin(uv.x * 13.0 + uv.y * 6.0 + uTime * 0.01);
  float nebulaB = 0.5 + 0.5 * sin(uv.x * 22.0 - uv.y * 11.0);
  float dust = hash3(normalize(dir) * 12.0);
  vec3 deep = mix(vec3(0.01, 0.015, 0.04), vec3(0.03, 0.08, 0.14), nebulaA * 0.4 + nebulaB * 0.3);
  vec3 haze = mix(vec3(0.08, 0.03, 0.12), vec3(0.08, 0.12, 0.2), uv.y);
  vec3 stars = vec3(starA * 0.9 + starB * 1.6) * mix(vec3(1.0, 0.92, 0.82), vec3(0.8, 0.95, 1.2), seedB);

  return deep + haze * 0.18 * dust + stars;
}

void main() {
  vec3 origin = cameraPosition - uBlackHolePosition;
  vec3 viewDir = normalize(vWorldPosition - cameraPosition);
  vec3 inward = normalize(-origin);

  float impactParameter = length(cross(origin, viewDir));
  float forward = max(0.0, dot(inward, viewDir));
  float baseDeflection = uLensStrength * forward / max(0.18, impactParameter - 0.35);
  float modelBias = mix(1.0, 1.2 + 0.16 * sin(atan(viewDir.z, viewDir.x) * 2.0), uModelMode);
  float approximationBias = mix(1.0, 0.74, uApproxMode);
  float deflection = min(1.45, baseDeflection * modelBias * approximationBias);

  vec3 axis = normalize(cross(viewDir, inward));
  if (length(axis) < 0.0001) {
    axis = vec3(0.0, 1.0, 0.0);
  }

  vec3 bentDir = normalize(rotateAroundAxis(viewDir, axis, deflection));
  float capture = (1.0 - smoothstep(uPhotonSphere * 0.95, uPhotonSphere * 1.65, impactParameter)) * forward;
  float ringGlow = smoothstep(uPhotonSphere * 1.9, uPhotonSphere * 1.25, impactParameter) * forward;

  float speed = length(uVelocity);
  float cosForward = speed > 0.0001 ? dot(normalize(uVelocity), bentDir) : 0.0;
  float shift = clamp(uGravitationalBlueshift * (1.0 + speed * cosForward * 1.1), 0.35, 3.0);

  vec3 color = spectralShift(backgroundColor(bentDir), shift);
  color = mix(color, vec3(0.0), capture);
  color += vec3(0.95, 0.68, 0.28) * pow(ringGlow, 5.0) * 0.85;

  gl_FragColor = vec4(color, 1.0);
}
`

export const diskVertexShader = `
varying vec3 vWorldPosition;
varying vec3 vLocalPosition;

void main() {
  vec4 worldPosition = modelMatrix * vec4(position, 1.0);
  vWorldPosition = worldPosition.xyz;
  vLocalPosition = position;
  gl_Position = projectionMatrix * viewMatrix * worldPosition;
}
`

export const diskFragmentShader = `
precision highp float;

uniform float uTime;
uniform vec3 uVelocity;
uniform float uGravitationalBlueshift;
uniform float uModelMode;

varying vec3 vWorldPosition;
varying vec3 vLocalPosition;

const float PI = 3.14159265359;

vec3 spectralShift(vec3 baseColor, float shift) {
  float warm = smoothstep(1.05, 0.35, shift);
  float cool = smoothstep(1.0, 2.4, shift);
  vec3 warmColor = vec3(baseColor.r * 1.24 + baseColor.g * 0.2, baseColor.g * 0.84, baseColor.b * 0.4);
  vec3 coolColor = vec3(baseColor.r * 0.7, baseColor.g * 1.02 + baseColor.b * 0.05, baseColor.b * 1.42);
  vec3 shifted = mix(baseColor, warmColor, warm);
  shifted = mix(shifted, coolColor, cool);
  return shifted;
}

void main() {
  float radius = length(vLocalPosition.xz);
  float angle = atan(vLocalPosition.z, vLocalPosition.x);
  float innerMask = smoothstep(1.18, 1.36, radius);
  float outerMask = 1.0 - smoothstep(4.5, 5.4, radius);
  float ringMask = innerMask * outerMask;

  float spiral = sin(angle * 18.0 - uTime * 0.7 + radius * 8.0);
  float turbulence = sin(angle * 33.0 + radius * 17.0 + uTime * 0.2);
  float lanes = 0.55 + 0.45 * spiral * (0.6 + 0.4 * turbulence);
  float heat = 1.0 - smoothstep(1.2, 4.4, radius);

  vec3 tangent = normalize(vec3(-vWorldPosition.z, 0.0, vWorldPosition.x));
  vec3 toObserver = normalize(cameraPosition - vWorldPosition);
  float approach = dot(tangent, toObserver);
  float speed = clamp(0.35 + heat * 0.45 + uModelMode * 0.08, 0.0, 0.95);
  float kinematic = 1.0 + approach * speed;
  float shift = clamp(uGravitationalBlueshift * kinematic, 0.45, 2.7);

  vec3 hot = mix(vec3(0.92, 0.24, 0.08), vec3(1.0, 0.76, 0.36), heat);
  vec3 baseColor = mix(hot, vec3(1.0, 0.93, 0.8), lanes * 0.3);
  vec3 color = spectralShift(baseColor, shift);
  float glow = heat * 0.9 + lanes * 0.25;

  gl_FragColor = vec4(color * glow, ringMask * (0.38 + glow * 0.45));
}
`
