import * as THREE from 'three';
import {
  sliceCavityIntervals,
  type CavityInterval,
  type PlaneSlicer,
  type WaterCrossSection,
} from './waterGeometry';

type Track = (number | null)[];

// A slice low in the bottle can latch onto a rib fold instead of the inner
// wall, which spikes a single column inward. A median over neighbouring
// columns rejects those outliers without rounding off the real silhouette.
function median(track: Track, radius: number): Track {
  return track.map((value, j) => {
    if (value === null) return null;
    const window: number[] = [];
    for (let k = j - radius; k <= j + radius; k++) {
      const neighbour = track[k];
      if (neighbour !== null && neighbour !== undefined) window.push(neighbour);
    }
    window.sort((a, b) => a - b);
    const mid = (window.length - 1) / 2;
    return (window[Math.floor(mid)] + window[Math.ceil(mid)]) / 2;
  });
}

function smooth(track: Track, passes = 2): Track {
  let current = track;
  for (let pass = 0; pass < passes; pass++) {
    current = current.map((value, j) => {
      const before = current[j - 1];
      const after = current[j + 1];
      if (value === null || before == null || after == null) return value;
      return before * 0.25 + value * 0.5 + after * 0.25;
    });
  }
  return current;
}

function clean(track: Track, radius = 2): Track {
  return smooth(median(track, radius));
}

/**
 * The submerged body: the glass is re-sliced at a stack of heights below the
 * waterline, then every column is resampled between the waterline and its own
 * pinch-off depth. That normalisation makes the loft a regular grid — columns
 * closing at different slice heights would otherwise leave a ragged seam of
 * slivers along the floor.
 */
export function buildWaterVolume(
  slicer: PlaneSlicer,
  cs: WaterCrossSection,
  floorY: number,
  levelCount = 56,
  columnCount = 200,
  rowCount = 28,
  inset = 0.04
): THREE.BufferGeometry | null {
  const xs: number[] = [];
  for (let i = 0; i <= columnCount; i++) {
    xs.push(THREE.MathUtils.lerp(cs.xMin, cs.xMax, i / columnCount));
  }

  const levelY: number[] = [];
  const grid: CavityInterval[][] = [];
  for (let l = 0; l <= levelCount; l++) {
    const depth = Math.pow(l / levelCount, 0.75);
    const y = THREE.MathUtils.lerp(cs.waterY, floorY, depth);
    levelY.push(y);
    grid.push(sliceCavityIntervals(slicer, y, xs, inset, 1e-3));
  }

  // A column ends at its first gap: anything below is a detached pocket the
  // scanline found in the glass, not part of the water body.
  const lastLevel: number[] = [];
  for (let j = 0; j <= columnCount; j++) {
    let last = -1;
    while (last + 1 <= levelCount && grid[last + 1][j]) last++;
    lastLevel.push(last);
  }

  // Where the walls meet, extrapolated from how fast the interval is closing,
  // so the seam is a continuous curve rather than a staircase of slice heights.
  const closeY: Track = [];
  const closeZ: Track = [];
  for (let j = 0; j <= columnCount; j++) {
    const last = lastLevel[j];
    if (last < 0) {
      closeY.push(null);
      closeZ.push(null);
      continue;
    }
    const interval = grid[last][j]!;
    const width = interval[1] - interval[0];
    let y = levelY[Math.min(last + 1, levelCount)];
    if (last > 0) {
      const previous = grid[last - 1][j]!;
      const shrink = previous[1] - previous[0] - width;
      if (shrink > 1e-6) {
        y = levelY[last] - (levelY[last - 1] - levelY[last]) * (width / shrink);
      }
    }
    closeY.push(THREE.MathUtils.clamp(y, floorY, levelY[last]));
    closeZ.push((interval[0] + interval[1]) / 2);
  }

  const seamY = clean(closeY, 3);
  const seamZ = clean(closeZ, 3);

  const rowY: Track[] = [];
  const rowLo: Track[] = [];
  const rowHi: Track[] = [];
  for (let m = 0; m <= rowCount; m++) {
    rowY.push(new Array(columnCount + 1).fill(null));
    rowLo.push(new Array(columnCount + 1).fill(null));
    rowHi.push(new Array(columnCount + 1).fill(null));
  }

  for (let j = 0; j <= columnCount; j++) {
    const last = lastLevel[j];
    if (last < 0) continue;
    const endY = seamY[j]!;
    const endZ = seamZ[j]!;

    let level = 0;
    for (let m = 0; m <= rowCount; m++) {
      const t = Math.pow(m / rowCount, 0.75);
      const y = THREE.MathUtils.lerp(cs.waterY, endY, t);
      while (level < last && levelY[level + 1] > y) level++;

      const upper = grid[level][j]!;
      const upperY = levelY[level];
      const lowerY = level < last ? levelY[level + 1] : endY;
      const lower =
        level < last ? grid[level + 1][j]! : ([endZ, endZ] as const);
      const span = upperY - lowerY;
      const f = span > 1e-6 ? THREE.MathUtils.clamp((upperY - y) / span, 0, 1) : 0;

      rowY[m][j] = y;
      rowLo[m][j] = THREE.MathUtils.lerp(upper[0], lower[0], f);
      rowHi[m][j] = THREE.MathUtils.lerp(upper[1], lower[1], f);
    }
  }

  for (let m = 0; m <= rowCount; m++) {
    rowY[m] = clean(rowY[m]);
    rowLo[m] = clean(rowLo[m]);
    rowHi[m] = clean(rowHi[m]);
  }

  // Collapse the columns just past each end of the run so the shell closes.
  for (let j = 0; j <= columnCount; j++) {
    if (lastLevel[j] >= 0) continue;
    const source = lastLevel[j - 1] >= 0 ? j - 1 : lastLevel[j + 1] >= 0 ? j + 1 : -1;
    if (source < 0) continue;
    for (let m = 0; m <= rowCount; m++) {
      const mid = (rowLo[m][source]! + rowHi[m][source]!) / 2;
      rowY[m][j] = rowY[m][source];
      rowLo[m][j] = mid;
      rowHi[m][j] = mid;
    }
  }

  const positions: number[] = [];
  const depths: number[] = [];
  const indices: number[] = [];
  const vertexId: number[][][] = [];

  for (let side = 0; side < 2; side++) {
    const ids: number[][] = [];
    for (let m = 0; m <= rowCount; m++) {
      const row: number[] = [];
      for (let j = 0; j <= columnCount; j++) {
        const y = rowY[m][j];
        if (y === null) {
          row.push(-1);
          continue;
        }
        row.push(positions.length / 3);
        positions.push(xs[j], y - cs.waterY, (side === 0 ? rowLo : rowHi)[m][j]!);
        depths.push(Math.max(cs.waterY - y, 0));
      }
      ids.push(row);
    }
    vertexId.push(ids);
  }

  for (let side = 0; side < 2; side++) {
    for (let m = 0; m < rowCount; m++) {
      for (let j = 0; j < columnCount; j++) {
        const a = vertexId[side][m][j];
        const b = vertexId[side][m][j + 1];
        const c = vertexId[side][m + 1][j + 1];
        const d = vertexId[side][m + 1][j];
        if (a < 0 || b < 0 || c < 0 || d < 0) continue;
        if (side === 0) indices.push(a, b, c, a, c, d);
        else indices.push(a, c, b, a, d, c);
      }
    }
  }

  if (indices.length === 0) return null;

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('aDepth', new THREE.Float32BufferAttribute(depths, 1));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}
