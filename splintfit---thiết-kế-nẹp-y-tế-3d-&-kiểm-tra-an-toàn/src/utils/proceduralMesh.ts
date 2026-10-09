/**
 * SplintFit - 3D Procedural Anatomy, Splint Modeling & Safety Cross-Section Engine
 */
import * as THREE from 'three';
import { CrossSectionSlice, Landmark, SplintDesignParams, ImmobilizationSegment, FractureZone } from '../types';

/**
 * Returns forearm/hand cross section radius [rx, ry, cx, cy] at height Z (mm)
 * Z = -160: Olecranon (elbow)
 * Z = -120: Upper forearm
 * Z = -60: Mid forearm
 * Z = 0: Wrist crease / Radial styloid
 * Z = 40: MCP joints / Palm
 * Z = 110: Fingertips
 */
export function getArmCrossSectionAtZ(z: number): { rx: number; ry: number; cx: number; cy: number } {
  // Forearm & hand anatomical profile
  if (z <= -140) {
    // Elbow zone
    const t = (z - -160) / 20;
    return { rx: 38 + t * 4, ry: 36 + t * 2, cx: 0, cy: (1 - t) * -4 };
  } else if (z <= -40) {
    // Forearm belly tapers down to wrist
    const t = (z - -140) / 100;
    const rx = 42 - t * 14; // 42 -> 28 mm
    const ry = 38 - t * 15; // 38 -> 23 mm
    const cy = Math.sin(t * Math.PI) * 2;
    return { rx, ry, cx: 0, cy };
  } else if (z <= 10) {
    // Wrist crease
    const t = (z - -40) / 50;
    const rx = 28 - t * 2; // ~26 mm
    const ry = 23 - t * 4; // ~19 mm
    return { rx, ry, cx: 0, cy: 0 };
  } else if (z <= 50) {
    // Palm / Metacarpal region widens in X, flattens in Y
    const t = (z - 10) / 40;
    const rx = 26 + t * 12; // 26 -> 38 mm
    const ry = 19 - t * 4;  // 19 -> 15 mm
    return { rx, ry, cx: 2 * t, cy: 0 };
  } else {
    // Fingers taper
    const t = Math.min(1, (z - 50) / 60);
    const rx = 38 - t * 18; // 38 -> 20 mm
    const ry = 15 - t * 7;  // 15 -> 8 mm
    return { rx, ry, cx: 0, cy: 0 };
  }
}

/**
 * Procedural Anatomical Arm Mesh Generator
 */
export function generateArmGeometry(): {
  geometry: THREE.BufferGeometry;
  holeGeometry: THREE.BufferGeometry;
} {
  const zSegments = 54;
  const radialSegments = 36;
  const zMin = -160;
  const zMax = 115;

  const positions: number[] = [];
  const normals: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  const holeIndices: number[] = [];

  for (let i = 0; i <= zSegments; i++) {
    const v = i / zSegments;
    const z = zMin + v * (zMax - zMin);
    const { rx, ry, cx, cy } = getArmCrossSectionAtZ(z);

    for (let j = 0; j <= radialSegments; j++) {
      const u = j / radialSegments;
      const angle = u * Math.PI * 2;

      // Realistic anatomical subtle bumps (radial styloid bump, muscle definition)
      let rXMod = rx;
      let rYMod = ry;

      // Radial styloid prominence around z = -5..5, angle around 0 (lateral)
      if (Math.abs(z) < 15 && Math.abs(angle) < 0.6) {
        rXMod += 2.8 * Math.cos((z / 15) * (Math.PI / 2)) * Math.cos((angle / 0.6) * (Math.PI / 2));
      }
      // Olecranon prominence around z = -155, angle around PI (posterior)
      if (z < -140 && Math.abs(angle - Math.PI) < 0.7) {
        rYMod += 3.2 * Math.cos(((z + 155) / 15) * (Math.PI / 2));
      }

      // Simulated realistic surface noise
      const noise = Math.sin(z * 0.15 + angle * 3) * 0.35;

      const x = cx + (rXMod + noise) * Math.cos(angle);
      const y = cy + (rYMod + noise) * Math.sin(angle);

      positions.push(x, y, z);
      uvs.push(u, v);
    }
  }

  // Create faces with a small simulated mesh scan hole defect at z ≈ -75, angle ≈ 1.2
  for (let i = 0; i < zSegments; i++) {
    for (let j = 0; j < radialSegments; j++) {
      const a = i * (radialSegments + 1) + j;
      const b = (i + 1) * (radialSegments + 1) + j;
      const c = (i + 1) * (radialSegments + 1) + (j + 1);
      const d = i * (radialSegments + 1) + (j + 1);

      // Defect hole area: skip triangles to simulate scan defect
      const zPos = zMin + (i / zSegments) * (zMax - zMin);
      const uPos = j / radialSegments;
      const isHole = zPos > -88 && zPos < -72 && uPos > 0.32 && uPos < 0.44;

      if (!isHole) {
        indices.push(a, b, d);
        indices.push(b, c, d);
      } else {
        // Collect hole boundary lines
        holeIndices.push(a, b, b, c, c, d, d, a);
      }
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();

  const holeGeometry = new THREE.BufferGeometry();
  holeGeometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  holeGeometry.setIndex(holeIndices);

  return { geometry, holeGeometry };
}

/**
 * Procedural Parametric Splint Geometry Generator
 */
export function generateSplintGeometry(
  params: SplintDesignParams,
  segments: ImmobilizationSegment[],
  landmarks: Landmark[],
  fractureZone: FractureZone
): {
  geometry: THREE.BufferGeometry;
  clearanceDistances: number[];
} {
  // Determine Z bounds based on immobilized segments
  const elbowFixed = segments.find(s => s.id === 'elbow')?.isFixed ?? true;
  const fingersFixed = segments.find(s => s.id === 'fingers')?.isFixed ?? false;
  const handFixed = segments.find(s => s.id === 'hand')?.isFixed ?? true;

  let zStart = elbowFixed ? -155 : -110; // If elbow free, start at mid forearm
  let zEnd = 25; // Default wrist-hand neutral

  if (fingersFixed) {
    zEnd = 95; // Extends over fingers
  } else if (handFixed) {
    zEnd = 45; // Extends through palm/MCP
  }

  // Joint extension parameter
  zStart -= params.jointExtensionMm * 0.4;
  zEnd += params.jointExtensionMm * 0.4;

  const zSteps = 42;
  const radialSteps = 40;

  const positions: number[] = [];
  const normals: number[] = [];
  const clearanceList: number[] = [];
  const indices: number[] = [];

  const baseOffset = params.swellingAllowanceMm + params.paddingThicknessMm;
  const wallThick = params.wallThicknessMm;

  // Split gap (seam angle) based on seam position
  // 'dorsal' -> angle ~ PI/2
  // 'volar' -> angle ~ -PI/2
  // 'radial' -> angle ~ 0
  // 'ulnar' -> angle ~ PI
  let seamCenterAngle = Math.PI / 2;
  if (params.seamPosition === 'volar') seamCenterAngle = -Math.PI / 2;
  if (params.seamPosition === 'radial') seamCenterAngle = 0;
  if (params.seamPosition === 'ulnar') seamCenterAngle = Math.PI;

  const seamGapAngle = params.splintType === 'bivalve' ? 0.35 : 0.28; // gap in radians

  // Pre-calculate extra relief offsets from landmarks
  const bonyReliefs = landmarks.filter(l => l.position && l.extraReliefMm > 0);

  // Generate Inner Surface & Outer Surface
  const vertexLayers: { inner: number[]; outer: number[] } = { inner: [], outer: [] };

  for (let layer = 0; layer < 2; layer++) {
    const isOuter = layer === 1;
    const currentOffset = isOuter ? baseOffset + wallThick : baseOffset;

    for (let i = 0; i <= zSteps; i++) {
      const tZ = i / zSteps;
      const z = zStart + tZ * (zEnd - zStart);
      const { rx, ry, cx, cy } = getArmCrossSectionAtZ(z);

      for (let j = 0; j <= radialSteps; j++) {
        const u = j / radialSteps;
        let angle = u * Math.PI * 2;

        // Check distance to bony prominences for extra relief
        let extraProminence = 0;
        for (const lmk of bonyReliefs) {
          if (lmk.position) {
            const distZ = Math.abs(z - lmk.position[2]);
            if (distZ < 25) {
              const weight = Math.cos((distZ / 25) * (Math.PI / 2));
              extraProminence = Math.max(extraProminence, lmk.extraReliefMm * weight);
            }
          }
        }

        // Check distance to fracture zone
        let extraFracture = 0;
        if (fractureZone.hasZone) {
          const fZ = fractureZone.center[2];
          const distFz = Math.abs(z - fZ);
          if (distFz < fractureZone.radiusMm) {
            const weight = Math.cos((distFz / fractureZone.radiusMm) * (Math.PI / 2));
            extraFracture = fractureZone.extraReliefMm * weight;
          }
        }

        const totalOffset = currentOffset + extraProminence + extraFracture;

        // Aeration / perforations relief simulation
        // Wound inspection window
        let hasWindow = false;
        if (params.woundWindowCount > 0 && Math.abs(z - -40) < params.woundWindowRadiusMm && Math.abs(angle - Math.PI / 2) < 0.35) {
          hasWindow = true;
        }

        const x = cx + (rx + totalOffset) * Math.cos(angle);
        const y = cy + (ry + totalOffset) * Math.sin(angle);

        positions.push(x, y, z);
        clearanceList.push(totalOffset);
      }
    }
  }

  const layerStride = (zSteps + 1) * (radialSteps + 1);

  // Build faces with seam opening cut
  for (let i = 0; i < zSteps; i++) {
    for (let j = 0; j < radialSteps; j++) {
      const u = j / radialSteps;
      const angle = u * Math.PI * 2;

      // Normalized seam angle diff
      const diff = Math.atan2(Math.sin(angle - seamCenterAngle), Math.cos(angle - seamCenterAngle));
      const inSeamGap = Math.abs(diff) < seamGapAngle;

      // In bivalve mode, open 2 opposite gaps
      const diffOpposite = Math.atan2(Math.sin(angle - (seamCenterAngle + Math.PI)), Math.cos(angle - (seamCenterAngle + Math.PI)));
      const inBivalveGap = params.splintType === 'bivalve' && Math.abs(diffOpposite) < seamGapAngle;

      if (!inSeamGap && !inBivalveGap) {
        // Aeration hole simulation (hex grid cutout filter)
        const zNorm = i / zSteps;
        const hexX = (angle * 6) % 1;
        const hexY = (zNorm * 18) % 1;
        const isHoleCenter = Math.hypot(hexX - 0.5, hexY - 0.5) < (params.aerationRatioPercent / 100) * 0.45;

        // Keep splint solid at borders and edges
        const nearBorder = i < 2 || i > zSteps - 3 || Math.abs(diff) < seamGapAngle + 0.1;

        if (!isHoleCenter || nearBorder) {
          // Outer shell triangle
          const a = layerStride + i * (radialSteps + 1) + j;
          const b = layerStride + (i + 1) * (radialSteps + 1) + j;
          const c = layerStride + (i + 1) * (radialSteps + 1) + (j + 1);
          const d = layerStride + i * (radialSteps + 1) + (j + 1);

          indices.push(a, b, d);
          indices.push(b, c, d);

          // Inner shell (opposite winding)
          const ia = i * (radialSteps + 1) + j;
          const ib = (i + 1) * (radialSteps + 1) + j;
          const ic = (i + 1) * (radialSteps + 1) + (j + 1);
          const id = i * (radialSteps + 1) + (j + 1);

          indices.push(ia, id, ib);
          indices.push(ib, id, ic);
        }
      }
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();

  return { geometry, clearanceDistances: clearanceList };
}

/**
 * Generate Clearance Heatmap Colors for 3D Mesh
 * Color thresholds:
 * Red: < 1.5mm (quá chật / xung đột)
 * Green: 2.0mm - 8.0mm (Đạt / An toàn)
 * Yellow / Orange: 8.0mm - 11.0mm (Hơi rộng)
 * Blue: > 11.0mm (Quá rộng)
 */
export function generateHeatmapColors(
  positions: THREE.BufferAttribute,
  params: SplintDesignParams
): THREE.Float32BufferAttribute {
  const count = positions.count;
  const colors = new Float32Array(count * 3);

  const baseOffset = params.swellingAllowanceMm + params.paddingThicknessMm;

  for (let i = 0; i < count; i++) {
    const z = positions.getZ(i);
    const x = positions.getX(i);
    const y = positions.getY(i);

    const { rx, ry, cx, cy } = getArmCrossSectionAtZ(z);
    const skinDist = Math.hypot((x - cx) / rx, (y - cy) / ry);
    const approximateClearance = (skinDist - 1.0) * Math.min(rx, ry) + baseOffset;

    let r = 0.18;
    let g = 0.49;
    let b = 0.74; // Default medical blue

    if (approximateClearance < 1.5) {
      // Red: dangerous pressure
      r = 0.78;
      g = 0.15;
      b = 0.15;
    } else if (approximateClearance < 2.5) {
      // Light green / transitional
      r = 0.45;
      g = 0.72;
      b = 0.22;
    } else if (approximateClearance <= 8.0) {
      // Dark green: optimal
      r = 0.18;
      g = 0.49;
      b = 0.2;
    } else if (approximateClearance <= 11.0) {
      // Yellow/Orange: wide
      r = 0.93;
      g = 0.55;
      b = 0.0;
    } else {
      // Blue: excess gap
      r = 0.06;
      g = 0.42;
      b = 0.74;
    }

    colors[i * 3] = r;
    colors[i * 3 + 1] = g;
    colors[i * 3 + 2] = b;
  }

  return new THREE.Float32BufferAttribute(colors, 3);
}

/**
 * Generate 2D Cross-Section Slices along Forearm Axis
 */
export function computeCrossSections(params: SplintDesignParams): CrossSectionSlice[] {
  const slicePositionsZ = [-140, -115, -90, -65, -40, -15, 0, 15, 30, 45];
  const slices: CrossSectionSlice[] = [];

  const baseOffset = params.swellingAllowanceMm + params.paddingThicknessMm;
  const wallThick = params.wallThicknessMm;

  slicePositionsZ.forEach((z, idx) => {
    const { rx, ry } = getArmCrossSectionAtZ(z);
    const skinContour: [number, number][] = [];
    const splintContour: [number, number][] = [];

    const numPoints = 32;
    for (let j = 0; j < numPoints; j++) {
      const angle = (j / numPoints) * Math.PI * 2;
      // Skin
      const sx = rx * Math.cos(angle);
      const sy = ry * Math.sin(angle);
      skinContour.push([Math.round(sx * 10) / 10, Math.round(sy * 10) / 10]);

      // Splint contour (open C shape or bivalve)
      const splintR = rx + baseOffset + wallThick / 2;
      const splintRy = ry + baseOffset + wallThick / 2;
      const px = splintR * Math.cos(angle);
      const py = splintRy * Math.sin(angle);
      splintContour.push([Math.round(px * 10) / 10, Math.round(py * 10) / 10]);
    }

    const perimeter = Math.round(Math.PI * (3 * (rx + ry) - Math.sqrt((3 * rx + ry) * (rx + 3 * ry))));
    const width = Math.round(rx * 2 * 10) / 10;
    const depth = Math.round(ry * 2 * 10) / 10;
    const coverage = z === -75 ? 88.4 : 98.2; // simulate lower coverage at scan defect
    const confidence = z === -75 ? 86.0 : 98.8;

    slices.push({
      index: idx + 1,
      positionZMm: z,
      widthMm: width,
      depthMm: depth,
      perimeterMm: perimeter,
      coveragePercent: coverage,
      confidencePercent: confidence,
      skinContour,
      splintContour,
      minClearanceMm: Math.max(1.8, Math.round(baseOffset * 0.9 * 10) / 10),
      maxClearanceMm: Math.round((baseOffset + 1.2) * 10) / 10,
    });
  });

  return slices;
}

/**
 * Export Splint Geometry to STL (ASCII Format)
 */
export function exportSplintToStl(geometry: THREE.BufferGeometry, filename = 'splint_model.stl'): string {
  const posAttr = geometry.getAttribute('position');
  const indexAttr = geometry.getIndex();

  let stl = `solid ${filename}\n`;

  const vA = new THREE.Vector3();
  const vB = new THREE.Vector3();
  const vC = new THREE.Vector3();
  const normal = new THREE.Vector3();
  const edge1 = new THREE.Vector3();
  const edge2 = new THREE.Vector3();

  const numTriangles = indexAttr ? indexAttr.count / 3 : posAttr.count / 3;

  for (let i = 0; i < numTriangles; i++) {
    const a = indexAttr ? indexAttr.getX(i * 3) : i * 3;
    const b = indexAttr ? indexAttr.getX(i * 3 + 1) : i * 3 + 1;
    const c = indexAttr ? indexAttr.getX(i * 3 + 2) : i * 3 + 2;

    vA.fromBufferAttribute(posAttr, a);
    vB.fromBufferAttribute(posAttr, b);
    vC.fromBufferAttribute(posAttr, c);

    edge1.subVectors(vB, vA);
    edge2.subVectors(vC, vA);
    normal.crossVectors(edge1, edge2).normalize();

    stl += `  facet normal ${normal.x.toFixed(4)} ${normal.y.toFixed(4)} ${normal.z.toFixed(4)}\n`;
    stl += `    outer loop\n`;
    stl += `      vertex ${vA.x.toFixed(3)} ${vA.y.toFixed(3)} ${vA.z.toFixed(3)}\n`;
    stl += `      vertex ${vB.x.toFixed(3)} ${vB.y.toFixed(3)} ${vB.z.toFixed(3)}\n`;
    stl += `      vertex ${vC.x.toFixed(3)} ${vC.y.toFixed(3)} ${vC.z.toFixed(3)}\n`;
    stl += `    endloop\n`;
    stl += `  endfacet\n`;
  }

  stl += `endsolid ${filename}\n`;
  return stl;
}
