export const waterVolumeVertexShader = /* glsl */ `
attribute float aDepth;

varying float vDepth;
varying vec3 vNormal;
varying vec3 vView;

void main() {
  vDepth = aDepth;
  vNormal = normalMatrix * normal;
  vec4 viewPosition = modelViewMatrix * vec4(position, 1.0);
  vView = -viewPosition.xyz;
  gl_Position = projectionMatrix * viewPosition;
}
`;

export const waterVolumeFragmentShader = /* glsl */ `
precision highp float;

uniform vec3 colorShallow;
uniform vec3 colorDeep;
uniform float density;
uniform float opacity;

varying float vDepth;
varying vec3 vNormal;
varying vec3 vView;

void main() {
  float absorbed = 1.0 - exp(-density * vDepth);
  vec3 color = mix(colorShallow, colorDeep, absorbed);

  // Grazing walls are seen through more water, so they read denser.
  float grazing = 1.0 - abs(dot(normalize(vNormal), normalize(vView)));
  float alpha = opacity * mix(0.5, 1.0, absorbed) * mix(0.75, 1.35, grazing);

  gl_FragColor = vec4(color, clamp(alpha, 0.0, 1.0));

  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`;
