export const dustVertexShader = /* glsl */ `
  uniform float pixelRatio;
  uniform float time;
  uniform float size;

  void main() {
    vec4 modelPosition = modelMatrix * vec4(position, 1.0);
    float phase = modelPosition.x * 100.0;
    modelPosition.y += sin(time * 0.25 + phase) * 0.2;
    modelPosition.z += cos(time * 0.25 + phase) * 0.2;
    modelPosition.x += cos(time * 0.25 + phase) * 0.2;
    vec4 viewPosition = viewMatrix * modelPosition;
    gl_Position = projectionMatrix * viewPosition;
    gl_PointSize = size * 25.0 * pixelRatio / -viewPosition.z;
  }
`;

export const dustFragmentShader = /* glsl */ `
  uniform vec3 color;
  uniform float opacity;

  void main() {
    float d = distance(gl_PointCoord, vec2(0.5));
    float strength = 0.05 / d - 0.1;
    gl_FragColor = vec4(color, strength * opacity);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;
