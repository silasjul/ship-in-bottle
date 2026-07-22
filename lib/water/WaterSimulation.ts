import * as THREE from 'three';
import {
  fullscreenVertexShader,
  dropFragmentShader,
  updateFragmentShader,
  normalFragmentShader,
  sphereDisplacementFragmentShader,
  capsuleDisplacementFragmentShader,
  boxDisplacementFragmentShader,
} from './simulationShaders';

// Ported from jeantimex/threejs-water (MIT). Double-buffered heightfield wave
// simulation on the GPU. The public API works in the caller's coordinate space:
// call setBounds() with the rectangle the water covers (in local/world units),
// then addDrop / moveSphere / heightAt take positions in those units.

export type WaterBounds = {
  centerX: number;
  centerZ: number;
  halfWidth: number;
  halfLength: number;
};

export class WaterSimulation {
  textureA: THREE.WebGLRenderTarget;
  textureB: THREE.WebGLRenderTarget;

  private resolutionX: number;
  private resolutionZ: number;
  private readonly baseResolution: number;

  private renderer: THREE.WebGLRenderer;
  private plane: THREE.Mesh;
  private camera: THREE.OrthographicCamera;
  private scene: THREE.Scene;

  private dropMaterial: THREE.ShaderMaterial;
  private updateMaterial: THREE.ShaderMaterial;
  private normalMaterial: THREE.ShaderMaterial;
  private sphereMaterial: THREE.ShaderMaterial;
  private capsuleMaterial: THREE.ShaderMaterial;
  private boxMaterial: THREE.ShaderMaterial;

  private bounds: WaterBounds | null = null;
  private readPixelBuffer: Float32Array | Uint16Array | null = null;

  constructor(renderer: THREE.WebGLRenderer, resolution = 256) {
    this.renderer = renderer;
    this.baseResolution = resolution;
    this.resolutionX = resolution;
    this.resolutionZ = resolution;

    this.textureA = this.createTarget(resolution, resolution);
    this.textureB = this.createTarget(resolution, resolution);

    this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    this.scene = new THREE.Scene();

    const geometry = new THREE.PlaneGeometry(2, 2);
    const delta = new THREE.Vector2(1 / resolution, 1 / resolution);

    this.dropMaterial = new THREE.ShaderMaterial({
      vertexShader: fullscreenVertexShader,
      fragmentShader: dropFragmentShader,
      uniforms: {
        tInput: { value: null },
        center: { value: new THREE.Vector2() },
        radius: { value: 0 },
        strength: { value: 0 },
        poolWidth: { value: 1.0 },
        poolLength: { value: 1.0 },
      },
    });

    this.updateMaterial = new THREE.ShaderMaterial({
      vertexShader: fullscreenVertexShader,
      fragmentShader: updateFragmentShader,
      uniforms: {
        tInput: { value: null },
        delta: { value: delta.clone() },
        poolWidth: { value: 1.0 },
        poolLength: { value: 1.0 },
        damping: { value: 0.995 },
      },
    });

    this.normalMaterial = new THREE.ShaderMaterial({
      vertexShader: fullscreenVertexShader,
      fragmentShader: normalFragmentShader,
      uniforms: {
        tInput: { value: null },
        delta: { value: delta.clone() },
        poolWidth: { value: 1.0 },
        poolLength: { value: 1.0 },
      },
    });

    this.sphereMaterial = new THREE.ShaderMaterial({
      vertexShader: fullscreenVertexShader,
      fragmentShader: sphereDisplacementFragmentShader,
      uniforms: {
        tInput: { value: null },
        oldCenter: { value: new THREE.Vector3() },
        newCenter: { value: new THREE.Vector3() },
        radius: { value: 0 },
        displacementScale: { value: 1.0 },
        poolWidth: { value: 1.0 },
        poolLength: { value: 1.0 },
      },
    });

    this.capsuleMaterial = new THREE.ShaderMaterial({
      vertexShader: fullscreenVertexShader,
      fragmentShader: capsuleDisplacementFragmentShader,
      uniforms: {
        tInput: { value: null },
        oldA: { value: new THREE.Vector3() },
        oldB: { value: new THREE.Vector3() },
        newA: { value: new THREE.Vector3() },
        newB: { value: new THREE.Vector3() },
        radius: { value: 0 },
        displacementScale: { value: 1.0 },
        poolWidth: { value: 1.0 },
        poolLength: { value: 1.0 },
      },
    });

    this.boxMaterial = new THREE.ShaderMaterial({
      vertexShader: fullscreenVertexShader,
      fragmentShader: boxDisplacementFragmentShader,
      uniforms: {
        tInput: { value: null },
        oldCenter: { value: new THREE.Vector3() },
        newCenter: { value: new THREE.Vector3() },
        halfSize: { value: new THREE.Vector3() },
        displacementScale: { value: 1.0 },
        poolWidth: { value: 1.0 },
        poolLength: { value: 1.0 },
      },
    });

    this.plane = new THREE.Mesh(geometry, this.dropMaterial);
    this.plane.frustumCulled = false;
    this.scene.add(this.plane);
    this.clearTextures();
  }

  get ready() {
    return this.bounds !== null;
  }

  getBounds() {
    return this.bounds;
  }

  // Sim heights are stored in normalized units where halfWidth maps to 1;
  // multiply by this to get heights back in caller units.
  get heightScale() {
    return this.bounds ? this.bounds.halfWidth : 1;
  }

  // Normalized half-extents fed to the shaders ("poolWidth/poolLength" in the
  // original): x is 1, z is the aspect ratio.
  private get poolWidth() {
    return 1.0;
  }

  private get poolLength() {
    return this.bounds ? this.bounds.halfLength / this.bounds.halfWidth : 1.0;
  }

  // The wave-equation pass needs the aspect expressed in texel spacing, so an
  // elongated domain with a matching elongated texture keeps full wave speed.
  private get wavePoolLength() {
    return this.poolLength * (this.resolutionX / this.resolutionZ);
  }

  setBounds(bounds: WaterBounds) {
    this.bounds = { ...bounds };
    this.fitResolution();
  }

  /** Sizes the sim texture to the domain aspect so texels stay near-square. */
  private fitResolution() {
    const aspect = this.poolLength;
    const pow2 = (n: number) =>
      Math.pow(2, Math.round(Math.log2(THREE.MathUtils.clamp(n, 32, 1024))));
    let resX: number;
    let resZ: number;
    if (aspect <= 1) {
      resX = this.baseResolution * 2;
      resZ = pow2(resX * aspect);
    } else {
      resZ = this.baseResolution * 2;
      resX = pow2(resZ / aspect);
    }
    if (resX === this.resolutionX && resZ === this.resolutionZ) return;

    this.resolutionX = resX;
    this.resolutionZ = resZ;
    this.textureA.dispose();
    this.textureB.dispose();
    this.textureA = this.createTarget(resX, resZ);
    this.textureB = this.createTarget(resX, resZ);
    for (const material of [this.updateMaterial, this.normalMaterial]) {
      (material.uniforms.delta.value as THREE.Vector2).set(1 / resX, 1 / resZ);
    }
    this.readPixelBuffer = null;
    this.clearTextures();
  }

  private createTarget(width: number, height: number) {
    return new THREE.WebGLRenderTarget(width, height, {
      type: this.getSimulationTextureType(),
      minFilter: THREE.NearestFilter,
      magFilter: THREE.NearestFilter,
      format: THREE.RGBAFormat,
      stencilBuffer: false,
      depthBuffer: false,
    });
  }

  reset() {
    this.clearTextures();
  }

  /** Creates a ripple at (x, z), radius in caller units, strength as height in caller units. */
  addDrop(x: number, z: number, radius: number, strength: number) {
    if (!this.bounds) return;
    const { centerX, centerZ, halfWidth, halfLength } = this.bounds;

    this.plane.material = this.dropMaterial;
    const u = this.dropMaterial.uniforms;
    u.tInput.value = this.textureA.texture;
    u.center.value.set((x - centerX) / halfWidth, (z - centerZ) / halfLength);
    u.radius.value = radius / halfWidth;
    u.strength.value = strength / this.heightScale;
    u.poolWidth.value = this.poolWidth;
    u.poolLength.value = this.poolLength;

    this.runPass();
  }

  /** Displaces water as a sphere moves; centers have y relative to the rest surface. */
  moveSphere(
    oldCenter: THREE.Vector3,
    newCenter: THREE.Vector3,
    radius: number,
    displacementScale = 1.0
  ) {
    if (!this.bounds) return;

    this.plane.material = this.sphereMaterial;
    const u = this.sphereMaterial.uniforms;
    u.tInput.value = this.textureA.texture;
    this.toSimSpace(oldCenter, u.oldCenter.value as THREE.Vector3);
    this.toSimSpace(newCenter, u.newCenter.value as THREE.Vector3);
    u.radius.value = radius / this.bounds.halfWidth;
    u.displacementScale.value = displacementScale;
    u.poolWidth.value = this.poolWidth;
    u.poolLength.value = this.poolLength;

    this.runPass();
  }

  /** Displaces water as a capsule (pill) between two endpoints moves; y is relative to the rest surface. */
  moveCapsule(
    oldA: THREE.Vector3,
    oldB: THREE.Vector3,
    newA: THREE.Vector3,
    newB: THREE.Vector3,
    radius: number,
    displacementScale = 1.0
  ) {
    if (!this.bounds) return;

    this.plane.material = this.capsuleMaterial;
    const u = this.capsuleMaterial.uniforms;
    u.tInput.value = this.textureA.texture;
    this.toSimSpace(oldA, u.oldA.value as THREE.Vector3);
    this.toSimSpace(oldB, u.oldB.value as THREE.Vector3);
    this.toSimSpace(newA, u.newA.value as THREE.Vector3);
    this.toSimSpace(newB, u.newB.value as THREE.Vector3);
    u.radius.value = radius / this.bounds.halfWidth;
    u.displacementScale.value = displacementScale;
    u.poolWidth.value = this.poolWidth;
    u.poolLength.value = this.poolLength;

    this.runPass();
  }

  /** Displaces water as an axis-aligned box moves; centers have y relative to the rest surface. */
  moveBox(
    oldCenter: THREE.Vector3,
    newCenter: THREE.Vector3,
    halfSize: THREE.Vector3,
    displacementScale = 1.0
  ) {
    if (!this.bounds) return;

    this.plane.material = this.boxMaterial;
    const u = this.boxMaterial.uniforms;
    u.tInput.value = this.textureA.texture;
    this.toSimSpace(oldCenter, u.oldCenter.value as THREE.Vector3);
    this.toSimSpace(newCenter, u.newCenter.value as THREE.Vector3);
    (u.halfSize.value as THREE.Vector3)
      .copy(halfSize)
      .divideScalar(this.bounds.halfWidth);
    u.displacementScale.value = displacementScale;
    u.poolWidth.value = this.poolWidth;
    u.poolLength.value = this.poolLength;

    this.runPass();
  }

  step(damping = 0.995) {
    this.plane.material = this.updateMaterial;
    const u = this.updateMaterial.uniforms;
    u.tInput.value = this.textureA.texture;
    u.poolWidth.value = this.poolWidth;
    u.poolLength.value = this.wavePoolLength;
    u.damping.value = damping;

    this.runPass();
  }

  updateNormals() {
    this.plane.material = this.normalMaterial;
    const u = this.normalMaterial.uniforms;
    u.tInput.value = this.textureA.texture;
    u.poolWidth.value = this.poolWidth;
    u.poolLength.value = this.poolLength;

    this.runPass();
  }

  /**
   * Reads wave heights (caller units) at the given (x, z) points with one GPU
   * readback of their bounding pixel rect. Synchronous, so keep the points close
   * together (e.g. the corners of a floating hull).
   */
  readHeights(points: ReadonlyArray<readonly [number, number]>): number[] {
    if (!this.bounds || points.length === 0) return points.map(() => 0);
    const resX = this.resolutionX;
    const resZ = this.resolutionZ;
    const { centerX, centerZ, halfWidth, halfLength } = this.bounds;

    const px = points.map(([x, z]) => {
      const u = ((x - centerX) / halfWidth) * 0.5 + 0.5;
      const v = ((z - centerZ) / halfLength) * 0.5 + 0.5;
      return [
        THREE.MathUtils.clamp(u * resX - 0.5, 0, resX - 1),
        THREE.MathUtils.clamp(v * resZ - 0.5, 0, resZ - 1),
      ] as const;
    });

    const minX = Math.floor(Math.min(...px.map((p) => p[0])));
    const minY = Math.floor(Math.min(...px.map((p) => p[1])));
    const maxX = Math.min(Math.ceil(Math.max(...px.map((p) => p[0]))) + 1, resX - 1);
    const maxY = Math.min(Math.ceil(Math.max(...px.map((p) => p[1]))) + 1, resZ - 1);
    const w = maxX - minX + 1;
    const h = maxY - minY + 1;

    const needed = w * h * 4;
    const isFloat = this.textureA.texture.type === THREE.FloatType;
    if (!this.readPixelBuffer || this.readPixelBuffer.length < needed) {
      this.readPixelBuffer = isFloat
        ? new Float32Array(needed)
        : new Uint16Array(needed);
    }
    this.renderer.readRenderTargetPixels(
      this.textureA,
      minX,
      minY,
      w,
      h,
      this.readPixelBuffer
    );

    const buffer = this.readPixelBuffer;
    const heightAtPixel = (ix: number, iy: number) => {
      const raw = buffer[((iy - minY) * w + (ix - minX)) * 4];
      return isFloat ? (raw as number) : THREE.DataUtils.fromHalfFloat(raw as number);
    };

    return px.map(([fx, fy]) => {
      const x0 = Math.min(Math.floor(fx), resX - 2);
      const y0 = Math.min(Math.floor(fy), resZ - 2);
      const tx = fx - x0;
      const ty = fy - y0;
      const hx0 = THREE.MathUtils.lerp(heightAtPixel(x0, y0), heightAtPixel(x0 + 1, y0), tx);
      const hx1 = THREE.MathUtils.lerp(
        heightAtPixel(x0, y0 + 1),
        heightAtPixel(x0 + 1, y0 + 1),
        tx
      );
      return THREE.MathUtils.lerp(hx0, hx1, ty) * this.heightScale;
    });
  }

  dispose() {
    this.textureA.dispose();
    this.textureB.dispose();
    this.plane.geometry.dispose();
    for (const material of [
      this.dropMaterial,
      this.updateMaterial,
      this.normalMaterial,
      this.sphereMaterial,
      this.capsuleMaterial,
      this.boxMaterial,
    ]) {
      material.dispose();
    }
  }

  private toSimSpace(from: THREE.Vector3, out: THREE.Vector3) {
    const { centerX, centerZ, halfWidth } = this.bounds!;
    out.set(
      (from.x - centerX) / halfWidth,
      from.y / halfWidth,
      (from.z - centerZ) / halfWidth
    );
  }

  private runPass() {
    const previousTarget = this.renderer.getRenderTarget();
    this.renderer.setRenderTarget(this.textureB);
    this.renderer.render(this.scene, this.camera);
    this.renderer.setRenderTarget(previousTarget);
    this.swapTextures();
  }

  private getSimulationTextureType() {
    const supportsFloatRenderTarget =
      this.renderer.capabilities.isWebGL2 &&
      this.renderer.extensions.has('EXT_color_buffer_float') &&
      this.renderer.extensions.has('OES_texture_float_linear');

    return supportsFloatRenderTarget ? THREE.FloatType : THREE.HalfFloatType;
  }

  private clearTextures() {
    const previousTarget = this.renderer.getRenderTarget();
    const previousClearColor = new THREE.Color();
    this.renderer.getClearColor(previousClearColor);
    const previousClearAlpha = this.renderer.getClearAlpha();

    this.renderer.setClearColor(0x000000, 0);
    this.renderer.setRenderTarget(this.textureA);
    this.renderer.clear();
    this.renderer.setRenderTarget(this.textureB);
    this.renderer.clear();
    this.renderer.setRenderTarget(previousTarget);
    this.renderer.setClearColor(previousClearColor, previousClearAlpha);
  }

  private swapTextures() {
    const temp = this.textureA;
    this.textureA = this.textureB;
    this.textureB = temp;
  }
}

let sharedSimulation: WaterSimulation | null = null;
let sharedRenderer: THREE.WebGLRenderer | null = null;

/** One simulation per renderer, shared between components (water surface, floating objects). */
export function getSharedWaterSimulation(renderer: THREE.WebGLRenderer) {
  if (!sharedSimulation || sharedRenderer !== renderer) {
    sharedSimulation?.dispose();
    sharedSimulation = new WaterSimulation(renderer);
    sharedRenderer = renderer;
  }
  return sharedSimulation;
}
