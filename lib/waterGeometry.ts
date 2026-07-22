import * as THREE from 'three';

// Builds the water surface by slicing the actual glass mesh with the plane
// y = waterY: every triangle crossing the plane contributes a contour segment,
// then a scanline per row finds the innermost cavity interval around z = 0.

export type CrossSectionRow = { x: number; zLo: number; zHi: number };

export type CrossSectionSource = {
  geometry: THREE.BufferGeometry;
  transform: THREE.Matrix4;
};

export type CavityInterval = readonly [number, number] | null;

export type WaterCrossSection = {
  xMin: number;
  xMax: number;
  waterY: number;
  centerX: number;
  centerZ: number;
  rows: CrossSectionRow[];
  geometry: THREE.BufferGeometry;
};

const EPS = 1e-4;
const MIN_WIDTH = 0.05;

/**
 * Pre-transforms the source triangles and bins them by height so a slice only
 * visits the triangles that can actually cross its plane — the submerged volume
 * needs dozens of slices through the full glass mesh.
 */
export type PlaneSlicer = {
  yMin: number;
  yMax: number;
  sliceAt(y: number): number[];
};

export function createPlaneSlicer(
  sources: CrossSectionSource[],
  binCount = 256
): PlaneSlicer {
  let total = 0;
  for (const { geometry } of sources) {
    const count = geometry.index?.count ?? geometry.attributes.position.count;
    total += count / 3;
  }

  const data = new Float32Array(total * 9);
  const triLow = new Float32Array(total);
  const triHigh = new Float32Array(total);
  let yMin = Infinity;
  let yMax = -Infinity;
  let cursor = 0;

  const v = [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()];
  for (const { geometry, transform } of sources) {
    const pos = geometry.attributes.position;
    const index = geometry.index;
    const triCount = index ? index.count / 3 : pos.count / 3;
    for (let tri = 0; tri < triCount; tri++) {
      for (let corner = 0; corner < 3; corner++) {
        const i = index ? index.getX(tri * 3 + corner) : tri * 3 + corner;
        const p = v[corner].fromBufferAttribute(pos, i).applyMatrix4(transform);
        const at = cursor * 9 + corner * 3;
        data[at] = p.x;
        data[at + 1] = p.y;
        data[at + 2] = p.z;
      }
      const low = Math.min(v[0].y, v[1].y, v[2].y);
      const high = Math.max(v[0].y, v[1].y, v[2].y);
      triLow[cursor] = low;
      triHigh[cursor] = high;
      yMin = Math.min(yMin, low);
      yMax = Math.max(yMax, high);
      cursor++;
    }
  }

  const span = Math.max(yMax - yMin, EPS);
  const bins: number[][] = Array.from({ length: binCount }, () => []);
  const binOf = (y: number) =>
    THREE.MathUtils.clamp(
      Math.floor(((y - yMin) / span) * binCount),
      0,
      binCount - 1
    );
  for (let tri = 0; tri < total; tri++) {
    const from = binOf(triLow[tri]);
    const to = binOf(triHigh[tri]);
    for (let b = from; b <= to; b++) bins[b].push(tri);
  }

  const sliceAt = (y: number) => {
    const segments: number[] = [];
    if (y < yMin || y > yMax) return segments;
    for (const tri of bins[binOf(y)]) {
      if (triLow[tri] > y || triHigh[tri] < y) continue;
      const base = tri * 9;
      let points = 0;
      let x1 = 0;
      let z1 = 0;
      let x2 = 0;
      let z2 = 0;
      for (let e = 0; e < 3; e++) {
        const a = base + e * 3;
        const b = base + ((e + 1) % 3) * 3;
        const da = data[a + 1] - y;
        const db = data[b + 1] - y;
        if ((da > 0 && db > 0) || (da < 0 && db < 0)) continue;
        const gap = da - db;
        if (Math.abs(gap) < EPS) continue;
        const t = da / gap;
        const x = data[a] + (data[b] - data[a]) * t;
        const z = data[a + 2] + (data[b + 2] - data[a + 2]) * t;
        if (points === 0) {
          x1 = x;
          z1 = z;
        } else {
          x2 = x;
          z2 = z;
        }
        points++;
      }
      if (points >= 2 && Math.abs(x1 - x2) + Math.abs(z1 - z2) > EPS) {
        segments.push(x1, z1, x2, z2);
      }
    }
    return segments;
  };

  return { yMin, yMax, sliceAt };
}

function cavityIntervalAt(
  segments: number[],
  candidates: number[],
  xi: number
): [number, number] | null {
  const crossings: number[] = [];
  for (const s of candidates) {
    const x1 = segments[s];
    const z1 = segments[s + 1];
    const x2 = segments[s + 2];
    const z2 = segments[s + 3];
    if ((x1 - xi) * (x2 - xi) > 0 || Math.abs(x1 - x2) < EPS) continue;
    const t = (xi - x1) / (x2 - x1);
    crossings.push(THREE.MathUtils.lerp(z1, z2, t));
  }
  crossings.sort((a, b) => a - b);

  const deduped: number[] = [];
  for (const z of crossings) {
    if (deduped.length === 0 || z - deduped[deduped.length - 1] > EPS) deduped.push(z);
  }
  if (deduped.length < 2) return null;

  // The cavity is bounded by the crossings nearest the centerline; with
  // double-walled glass these are the inner wall, with a single shell the wall.
  let zLo: number | null = null;
  let zHi: number | null = null;
  for (const z of deduped) {
    if (z <= 0) {
      zLo = z;
    } else {
      zHi = z;
      break;
    }
  }
  if (zLo === null || zHi === null) return null;
  return [zLo, zHi];
}

/** Cavity interval at every sample x of one slice, or null where the glass has closed. */
function intervalsAlongX(
  segments: number[],
  xs: number[],
  inset: number,
  minWidth: number
): CavityInterval[] {
  if (segments.length === 0 || xs.length === 0) return xs.map(() => null);

  const first = xs[0];
  const last = xs[xs.length - 1];
  const bucketCount = Math.max(xs.length, 1);
  const width = Math.max(last - first, EPS);
  const buckets: number[][] = Array.from({ length: bucketCount }, () => []);
  const bucketOf = (x: number) =>
    THREE.MathUtils.clamp(
      Math.floor(((x - first) / width) * bucketCount),
      0,
      bucketCount - 1
    );

  for (let s = 0; s < segments.length; s += 4) {
    const from = bucketOf(Math.min(segments[s], segments[s + 2]));
    const to = bucketOf(Math.max(segments[s], segments[s + 2]));
    for (let b = from; b <= to; b++) buckets[b].push(s);
  }

  return xs.map((x) => {
    const interval = cavityIntervalAt(segments, buckets[bucketOf(x)], x);
    if (!interval) return null;
    // Near a pinch the interval is thinner than the inset, so the wall margin
    // shrinks with it instead of inverting the interval.
    const pad = Math.min(inset, (interval[1] - interval[0]) * 0.3);
    const zLo = interval[0] + pad;
    const zHi = interval[1] - pad;
    return zHi - zLo > minWidth ? ([zLo, zHi] as const) : null;
  });
}

/** Cavity intervals at an arbitrary slice height, sampled at the given x positions. */
export function sliceCavityIntervals(
  slicer: PlaneSlicer,
  y: number,
  xs: number[],
  inset = 0.04,
  minWidth = MIN_WIDTH
): CavityInterval[] {
  return intervalsAlongX(slicer.sliceAt(y), xs, inset, minWidth);
}

export function sliceWaterCrossSection(
  slicer: PlaneSlicer,
  waterY: number,
  rowCount = 200,
  cols = 48,
  inset = 0.04
): WaterCrossSection | null {
  const segments = slicer.sliceAt(waterY);
  if (segments.length === 0) return null;

  let xMin = Infinity;
  let xMax = -Infinity;
  for (let s = 0; s < segments.length; s += 4) {
    xMin = Math.min(xMin, segments[s], segments[s + 2]);
    xMax = Math.max(xMax, segments[s], segments[s + 2]);
  }

  const xs: number[] = [];
  for (let i = 0; i <= rowCount; i++) {
    xs.push(THREE.MathUtils.lerp(xMin + EPS, xMax - EPS, i / rowCount));
  }

  const rows: CrossSectionRow[] = [];
  const intervals = intervalsAlongX(segments, xs, inset, MIN_WIDTH);
  for (let i = 0; i < xs.length; i++) {
    const interval = intervals[i];
    if (interval) rows.push({ x: xs[i], zLo: interval[0], zHi: interval[1] });
  }
  if (rows.length < 2) return null;

  const geometry = buildGridGeometry(rows, cols, (xMax - xMin) / rowCount);
  const first = rows[0].x;
  const last = rows[rows.length - 1].x;
  const centerX = (first + last) / 2;
  let nearest = rows[0];
  let best = Infinity;
  for (const row of rows) {
    const d = Math.abs(row.x - centerX);
    if (d < best) {
      best = d;
      nearest = row;
    }
  }
  return {
    xMin: first,
    xMax: last,
    waterY,
    centerX,
    centerZ: (nearest.zLo + nearest.zHi) / 2,
    rows,
    geometry,
  };
}

function buildGridGeometry(
  rows: CrossSectionRow[],
  cols: number,
  rowSpacing: number
): THREE.BufferGeometry {
  const positions: number[] = [];
  const edges: number[] = [];
  const indices: number[] = [];
  const rowStart: number[] = new Array(rows.length).fill(-1);

  // Rows only stitch when their intervals overlap enough; otherwise a jump
  // between cavity lobes would produce a slanted wall of quads.
  const contiguous = (a: CrossSectionRow, b: CrossSectionRow) =>
    b.x - a.x < rowSpacing * 1.5 &&
    Math.min(a.zHi, b.zHi) - Math.max(a.zLo, b.zLo) >
      0.5 * Math.min(a.zHi - a.zLo, b.zHi - b.zLo);

  const runEnd: number[] = new Array(rows.length).fill(0);
  let runBeginIndex = 0;
  for (let i = 0; i <= rows.length; i++) {
    if (i === rows.length || (i > 0 && !contiguous(rows[i - 1], rows[i]))) {
      for (let j = runBeginIndex; j < i; j++) {
        runEnd[j] = Math.min(
          rows[j].x - rows[runBeginIndex].x,
          rows[i - 1].x - rows[j].x
        );
      }
      runBeginIndex = i;
    }
  }

  for (let i = 0; i < rows.length; i++) {
    rowStart[i] = positions.length / 3;
    const { x, zLo, zHi } = rows[i];
    for (let j = 0; j <= cols; j++) {
      const z = THREE.MathUtils.lerp(zLo, zHi, j / cols);
      positions.push(x, 0, z);
      edges.push(Math.min(z - zLo, zHi - z, runEnd[i] + 0.05));
    }
  }

  for (let i = 0; i < rows.length - 1; i++) {
    if (!contiguous(rows[i], rows[i + 1])) continue;
    for (let j = 0; j < cols; j++) {
      const a = rowStart[i] + j;
      const b = rowStart[i + 1] + j;
      indices.push(a, b, a + 1, b, b + 1, a + 1);
    }
  }

  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  g.setAttribute('aEdge', new THREE.Float32BufferAttribute(edges, 1));
  g.setIndex(indices);
  return g;
}

/** Clamps a local (x, z) point into the cross-section, keeping the given margins to the glass. */
export function clampToCrossSection(
  cs: WaterCrossSection,
  x: number,
  z: number,
  marginX: number,
  marginZ: number
): [number, number] {
  const cx = THREE.MathUtils.clamp(x, cs.xMin + marginX, cs.xMax - marginX);

  let nearest = cs.rows[0];
  let best = Infinity;
  for (const row of cs.rows) {
    const d = Math.abs(row.x - cx);
    if (d < best) {
      best = d;
      nearest = row;
    }
  }

  const zLo = nearest.zLo + marginZ;
  const zHi = nearest.zHi - marginZ;
  const cz =
    zLo >= zHi ? (nearest.zLo + nearest.zHi) / 2 : THREE.MathUtils.clamp(z, zLo, zHi);
  return [cx, cz];
}

let activeCrossSection: WaterCrossSection | null = null;

export function setActiveCrossSection(cs: WaterCrossSection | null) {
  activeCrossSection = cs;
}

export function getActiveCrossSection() {
  return activeCrossSection;
}
