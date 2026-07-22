// Surface rendering adapted from WaterAbove.vert/frag in jeantimex/threejs-water
// (MIT). The pool-wall raytracing is replaced by an equirect environment lookup
// for reflections and a depth-absorption gradient for refractions, so the
// surface works over any geometry (here: the bottle's water plane).

export const waterSurfaceVertexShader = /* glsl */ `
uniform sampler2D water;
uniform vec2 simCenter;
uniform vec2 simHalf;
uniform float heightScale;
uniform float edgeFade;

attribute float aEdge;

varying vec3 vPosition;
varying vec2 vSimUv;
varying float vFade;

void main() {
  vec2 uv = clamp((position.xz - simCenter) / (2.0 * simHalf) + 0.5, 0.0, 1.0);
  vec4 info = texture2D(water, uv);

  vFade = smoothstep(0.0, edgeFade, aEdge);
  vSimUv = uv;

  vec3 pos = position;
  pos.y += info.r * heightScale * vFade;
  vPosition = pos;

  gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
}
`;

export const waterSurfaceFragmentShader = /* glsl */ `
precision highp float;

const float IOR_AIR = 1.0;
const float IOR_WATER = 1.333;

uniform sampler2D water;
uniform sampler2D envMap;
uniform vec3 localEye;
uniform vec3 light;

uniform vec3 colorShallow;
uniform vec3 colorDeep;
uniform float depthFalloff;
uniform float opacity;

uniform float fresnelF0;
uniform float fresnelPower;
uniform float reflectivity;
uniform vec3 sunColor;
uniform float sunGlint;
uniform float shininess;

varying vec3 vPosition;
varying vec2 vSimUv;
varying float vFade;

vec2 equirectUv(vec3 dir) {
  return vec2(
    atan(dir.z, dir.x) * 0.15915494 + 0.5,
    asin(clamp(dir.y, -1.0, 1.0)) * 0.31830988 + 0.5
  );
}

void main() {
  // Parallax refinement: walk the lookup along the surface gradient so wave
  // features line up with their displaced positions.
  vec2 coord = vSimUv;
  vec4 info = texture2D(water, coord);
  for (int i = 0; i < 5; i++) {
    coord = clamp(coord + info.ba * 0.005, 0.0, 1.0);
    info = texture2D(water, coord);
  }

  // Reconstruct the normal from the stored slope, clamped to avoid NaNs.
  vec2 slope = clamp(info.ba, vec2(-0.999), vec2(0.999)) * vFade;
  float slopeLengthSq = min(dot(slope, slope), 0.999);
  vec3 normal = normalize(vec3(slope.x, sqrt(max(0.001, 1.0 - slopeLengthSq)), slope.y));

  vec3 incomingRay = normalize(vPosition - localEye);

  // Seen from inside the water the geometric normal points away from the eye:
  // flip it and swap the IOR ratio so the underside shades like an underside.
  bool underwater = dot(normal, incomingRay) > 0.0;
  if (underwater) normal = -normal;

  vec3 reflectedRay = reflect(incomingRay, normal);
  vec3 refractedRay = refract(
    incomingRay,
    normal,
    underwater ? IOR_WATER / IOR_AIR : IOR_AIR / IOR_WATER
  );
  bool totalInternal = dot(refractedRay, refractedRay) < 1e-4;

  float fresnel = mix(
    fresnelF0,
    1.0,
    pow(1.0 - max(dot(normal, -incomingRay), 0.0), fresnelPower)
  );
  if (totalInternal) fresnel = 1.0;

  vec3 skySample = min(texture2D(envMap, equirectUv(reflectedRay)).rgb, vec3(12.0));
  vec3 reflectedColor = skySample * reflectivity;
  reflectedColor = mix(
    reflectedColor,
    colorDeep,
    clamp(-reflectedRay.y * 1.5, 0.0, 0.85)
  );
  reflectedColor +=
    sunColor * pow(max(dot(light, reflectedRay), 0.0), shininess) * sunGlint;

  vec3 refractedColor;
  if (underwater) {
    // Looking up: refraction leaves the water, so it shows sky through Snell's
    // window rather than the depth gradient.
    refractedColor =
      min(texture2D(envMap, equirectUv(refractedRay)).rgb, vec3(12.0)) * reflectivity;
  } else {
    // Beer-Lambert style absorption: grazing refraction travels farther through
    // the volume and shifts toward the deep color.
    float travel = 1.0 / max(-refractedRay.y, 0.05);
    float depthT = 1.0 - exp(-depthFalloff * travel);
    refractedColor = mix(colorShallow, colorDeep, depthT);
    refractedColor +=
      sunColor * pow(max(dot(light, refractedRay), 0.0), shininess * 0.25) * sunGlint * 0.1;
  }

  vec3 color = mix(refractedColor, reflectedColor, fresnel);
  // From below the surface is mostly a window; the submerged volume already
  // carries the body colour, so only the fresnel rim goes opaque.
  float alpha = underwater
    ? mix(opacity * 0.3, 1.0, fresnel)
    : opacity + fresnel * (1.0 - opacity);
  alpha = clamp(alpha, 0.0, 1.0);
  gl_FragColor = vec4(color, alpha);

  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`;
