export const atmosphereVertexShader = /* glsl */ `
  varying vec3 vDir;

  void main() {
    vDir = position;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

export const atmosphereFragmentShader = /* glsl */ `
  uniform float time;
  uniform vec3 colorBottom;
  uniform vec3 colorTop;
  uniform vec3 glowColor;
  uniform vec3 glowDir;
  uniform float glowIntensity;
  uniform float glowSharpness;
  uniform float haze;
  uniform float drift;
  uniform float rays;
  uniform float raySpeed;
  uniform float stars;

  varying vec3 vDir;

  float hash13(vec3 p) {
    p = fract(p * 0.1031);
    p += dot(p, p.zyx + 31.32);
    return fract((p.x + p.y) * p.z);
  }

  float vnoise(vec3 p) {
    vec3 i = floor(p);
    vec3 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(mix(hash13(i), hash13(i + vec3(1, 0, 0)), f.x),
          mix(hash13(i + vec3(0, 1, 0)), hash13(i + vec3(1, 1, 0)), f.x), f.y),
      mix(mix(hash13(i + vec3(0, 0, 1)), hash13(i + vec3(1, 0, 1)), f.x),
          mix(hash13(i + vec3(0, 1, 1)), hash13(i + vec3(1, 1, 1)), f.x), f.y),
      f.z
    );
  }

  float fbm(vec3 p) {
    float sum = 0.0;
    float amp = 0.5;
    for (int i = 0; i < 4; i++) {
      sum += amp * vnoise(p);
      p *= 2.03;
      amp *= 0.5;
    }
    return sum;
  }

  void main() {
    vec3 dir = normalize(vDir);
    float t = time;

    vec3 col = mix(colorBottom, colorTop, smoothstep(-0.6, 0.75, dir.y));

    // drifting haze, warmed near the glow
    float n1 = fbm(dir * 2.4 + t * drift * vec3(0.050, 0.012, 0.032));
    float n2 = fbm(dir * 4.6 - t * drift * vec3(0.024, 0.008, 0.040) + 13.7);
    float neb = smoothstep(0.45, 0.95, n1 + n2 * 0.35);
    float glowProx = pow(max(dot(dir, glowDir), 0.0), 2.0);
    vec3 hazeCool = colorTop * 2.4 + vec3(0.010, 0.018, 0.045);
    vec3 hazeCol = mix(hazeCool, glowColor * 0.55, glowProx * 0.75);
    col += hazeCol * neb * haze;

    float facing = max(dot(dir, glowDir), 0.0);
    col += glowColor * pow(facing, glowSharpness) * glowIntensity;
    col += glowColor * pow(facing, glowSharpness * 8.0) * glowIntensity * 0.7;

    // streaks radiating from the glow: noise over the angle around its axis
    vec3 upA = abs(glowDir.y) > 0.92 ? vec3(1.0, 0.0, 0.0) : vec3(0.0, 1.0, 0.0);
    vec3 gx = normalize(cross(upA, glowDir));
    vec3 gy = cross(glowDir, gx);
    vec2 p = vec2(dot(dir, gx), dot(dir, gy));
    float radial = length(p);
    vec2 circ = p / max(radial, 1e-4);
    float streak = fbm(vec3(circ * 2.4, t * raySpeed * 0.25));
    streak = pow(smoothstep(0.45, 0.95, streak), 1.5);
    float shaft = streak * smoothstep(0.9, 0.15, radial) * smoothstep(0.0, 0.12, radial);
    // radial is mirror-symmetric, so mask out the lobe at the glow's antipode
    shaft *= smoothstep(0.0, 0.25, facing);
    col += glowColor * shaft * rays * 0.6;

    if (stars > 0.001) {
      vec3 sp = dir * 34.0;
      vec3 cell = floor(sp);
      float rnd = hash13(cell);
      vec3 jitter = vec3(hash13(cell + 7.1), hash13(cell + 3.7), hash13(cell + 9.3)) - 0.5;
      float d = length(fract(sp) - 0.5 - jitter * 0.6);
      float star = smoothstep(0.16, 0.02, d) * step(0.88, rnd);
      float twinkle = 0.55 + 0.45 * sin(t * (1.0 + rnd * 2.0) + rnd * 40.0);
      float horizon = smoothstep(-0.35, -0.05, dir.y);
      col += vec3(0.85, 0.92, 1.0) * star * stars * twinkle * horizon;
    }

    // dither against banding in the dark gradient
    col += (hash13(dir * 913.7 + fract(t) * 17.0) - 0.5) * (1.5 / 255.0);

    gl_FragColor = vec4(max(col, 0.0), 1.0);
  }
`;
