// GPU heightfield passes ported from jeantimex/threejs-water (MIT),
// itself a port of Evan Wallace's WebGL Water.
// Simulation texture channels — R: height, G: velocity, B: normal.x, A: normal.z.
// All positions are in normalized "physical" units: x ∈ [-poolWidth, poolWidth],
// z ∈ [-poolLength, poolLength], heights in the same units.

export const fullscreenVertexShader = /* glsl */ `
varying vec2 coord;

void main() {
  coord = position.xy * 0.5 + 0.5;
  gl_Position = vec4(position.xyz, 1.0);
}
`;

export const dropFragmentShader = /* glsl */ `
precision highp float;

const float PI = 3.141592653589793;

uniform sampler2D tInput;
uniform vec2 center;
uniform float radius;
uniform float strength;
uniform float poolWidth;
uniform float poolLength;

varying vec2 coord;

void main() {
  vec4 info = texture2D(tInput, coord);

  vec2 physicalDiff = (coord - (center * 0.5 + 0.5)) * 2.0 * vec2(poolWidth, poolLength);
  float drop = max(0.0, 1.0 - length(physicalDiff) / radius);
  drop = 0.5 - cos(drop * PI) * 0.5;

  info.r += drop * strength;

  gl_FragColor = info;
}
`;

export const updateFragmentShader = /* glsl */ `
precision highp float;

uniform sampler2D tInput;
uniform vec2 delta;
uniform float poolWidth;
uniform float poolLength;
uniform float damping;

varying vec2 coord;

void main() {
  vec4 info = texture2D(tInput, coord);

  vec2 dx = vec2(delta.x, 0.0);
  vec2 dy = vec2(0.0, delta.y);

  float d2h_dx2 = texture2D(tInput, coord + dx).r + texture2D(tInput, coord - dx).r - 2.0 * info.r;
  float d2h_dz2 = texture2D(tInput, coord + dy).r + texture2D(tInput, coord - dy).r - 2.0 * info.r;

  float stabilityScale = min(1.0, min(poolWidth * poolWidth, poolLength * poolLength));
  info.g += 0.5 * stabilityScale * (d2h_dx2 / (poolWidth * poolWidth) + d2h_dz2 / (poolLength * poolLength));
  info.g *= damping;
  info.r += info.g;

  // Drops and displacement inject net volume that the wave equation conserves
  // forever, so the rest level would creep upward; bleed height back to zero.
  info.r *= 0.998;

  gl_FragColor = info;
}
`;

export const normalFragmentShader = /* glsl */ `
precision highp float;

uniform sampler2D tInput;
uniform float poolWidth;
uniform float poolLength;
uniform vec2 delta;

varying vec2 coord;

void main() {
  vec4 info = texture2D(tInput, coord);

  vec3 dx = vec3(
    delta.x * 2.0 * poolWidth,
    texture2D(tInput, vec2(coord.x + delta.x, coord.y)).r - info.r,
    0.0
  );
  vec3 dy = vec3(
    0.0,
    texture2D(tInput, vec2(coord.x, coord.y + delta.y)).r - info.r,
    delta.y * 2.0 * poolLength
  );

  info.ba = normalize(cross(dy, dx)).xz;

  gl_FragColor = info;
}
`;

export const sphereDisplacementFragmentShader = /* glsl */ `
precision highp float;

uniform sampler2D tInput;
uniform vec3 oldCenter;
uniform vec3 newCenter;
uniform float radius;
uniform float displacementScale;
uniform float poolWidth;
uniform float poolLength;

varying vec2 coord;

// Approximate submerged column height of the sphere at this cell, using a
// super-Gaussian profile instead of exact sphere intersection to stay smooth.
float volumeInSphere(vec3 center) {
  vec3 pointPhys = vec3(
    (coord.x * 2.0 - 1.0) * poolWidth,
    0.0,
    (coord.y * 2.0 - 1.0) * poolLength
  );

  vec3 toCenter = pointPhys - center;
  float t = length(toCenter) / radius;
  float dy = exp(-pow(t * 1.5, 6.0));
  float ymin = min(0.0, center.y - dy);
  float ymax = min(max(0.0, center.y + dy), ymin + 2.0 * dy);
  return (ymax - ymin) * 0.1 * displacementScale;
}

void main() {
  vec4 info = texture2D(tInput, coord);

  info.r += volumeInSphere(oldCenter);
  info.r -= volumeInSphere(newCenter);

  gl_FragColor = info;
}
`;

export const capsuleDisplacementFragmentShader = /* glsl */ `
precision highp float;

uniform sampler2D tInput;
uniform vec3 oldA;
uniform vec3 oldB;
uniform vec3 newA;
uniform vec3 newB;
uniform float radius;
uniform float displacementScale;
uniform float poolWidth;
uniform float poolLength;

varying vec2 coord;

// Same super-Gaussian column profile as the sphere pass, but distance is
// taken to the a-b segment so the whole hull displaces as one smooth pill.
float volumeInCapsule(vec3 a, vec3 b) {
  vec3 pointPhys = vec3(
    (coord.x * 2.0 - 1.0) * poolWidth,
    0.0,
    (coord.y * 2.0 - 1.0) * poolLength
  );

  vec3 pa = pointPhys - a;
  vec3 ba = b - a;
  float h = clamp(dot(pa, ba) / max(dot(ba, ba), 1e-6), 0.0, 1.0);
  vec3 closest = a + ba * h;

  float t = length(pointPhys - closest) / radius;
  float dy = exp(-pow(t * 1.5, 6.0));
  float ymin = min(0.0, closest.y - dy);
  float ymax = min(max(0.0, closest.y + dy), ymin + 2.0 * dy);
  return (ymax - ymin) * 0.1 * displacementScale;
}

void main() {
  vec4 info = texture2D(tInput, coord);

  info.r += volumeInCapsule(oldA, oldB);
  info.r -= volumeInCapsule(newA, newB);

  gl_FragColor = info;
}
`;

export const boxDisplacementFragmentShader = /* glsl */ `
precision highp float;

uniform sampler2D tInput;
uniform vec3 oldCenter;
uniform vec3 newCenter;
uniform vec3 halfSize;
uniform float displacementScale;
uniform float poolWidth;
uniform float poolLength;

varying vec2 coord;

float volumeInBox(vec3 center) {
  vec3 pointPhys = vec3(
    (coord.x * 2.0 - 1.0) * poolWidth,
    0.0,
    (coord.y * 2.0 - 1.0) * poolLength
  );

  vec3 distanceToBox = abs(pointPhys - center) - halfSize;
  float signedDistance =
    length(max(distanceToBox, 0.0)) +
    min(max(distanceToBox.x, max(distanceToBox.y, distanceToBox.z)), 0.0);

  float scale = max(max(halfSize.x, halfSize.y), halfSize.z);
  float t = max(signedDistance, 0.0) / scale;
  float dy = exp(-pow(t * 1.5, 6.0));
  float ymin = min(0.0, center.y - dy);
  float ymax = min(max(0.0, center.y + dy), ymin + 2.0 * dy);
  return (ymax - ymin) * 0.1 * displacementScale;
}

void main() {
  vec4 info = texture2D(tInput, coord);

  info.r += volumeInBox(oldCenter);
  info.r -= volumeInBox(newCenter);

  gl_FragColor = info;
}
`;
