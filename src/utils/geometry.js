import * as THREE from 'three';

/**
 * Applies corner rounding to a loop of 2D vertices on a THREE.Shape or Path.
 */
export function addRoundedLoopToPath(path, vertices, roundness, isOuter = false) {
  if (vertices.length === 0) return;
  
  if (roundness <= 0.01) {
    path.moveTo(vertices[0].x, vertices[0].y);
    for (let i = 1; i < vertices.length; i++) {
      path.lineTo(vertices[i].x, vertices[i].y);
    }
    path.closePath();
    return;
  }

  let minX = Infinity;
  let maxX = -Infinity;
  if (isOuter) {
    for (let i = 0; i < vertices.length; i++) {
      const x = vertices[i].x;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
    }
  }

  const n = vertices.length;
  const curves = [];

  for (let i = 0; i < n; i++) {
    const v = vertices[i];
    const vPrev = vertices[(i - 1 + n) % n];
    const vNext = vertices[(i + 1) % n];

    const dPrev = new THREE.Vector2().subVectors(vPrev, v);
    const dNext = new THREE.Vector2().subVectors(vNext, v);

    const lPrev = dPrev.length();
    const lNext = dNext.length();

    // Use roundness parameter, clamped to maximum of 45% of shortest adjacent edge
    const maxOffset = Math.min(lPrev, lNext) * 0.45;
    let offset = roundness * maxOffset;

    // For outer profile, skip rounding at the exact far-left and far-right protrusion connector faces
    if (isOuter && (Math.abs(v.x - minX) < 1e-4 || Math.abs(v.x - maxX) < 1e-4)) {
      offset = 0;
    }

    const start = new THREE.Vector2().copy(v).addScaledVector(dPrev.normalize(), offset);
    const end = new THREE.Vector2().copy(v).addScaledVector(dNext.normalize(), offset);

    curves.push({ start, control: v, end });
  }

  path.moveTo(curves[0].start.x, curves[0].start.y);
  for (let i = 0; i < n; i++) {
    const currentCurve = curves[i];
    const nextCurve = curves[(i + 1) % n];

    // Curve around vertex i
    path.quadraticCurveTo(currentCurve.control.x, currentCurve.control.y, currentCurve.end.x, currentCurve.end.y);
    // Line to start of next curve
    path.lineTo(nextCurve.start.x, nextCurve.start.y);
  }
  path.closePath();
}

function getCatEyeFactor(angle, isLeft) {
  let a = angle % (2 * Math.PI);
  if (a < 0) a += 2 * Math.PI;

  // For Left lens, the top-outer wing is between pi/2 (1.57) and pi (3.14), centered around 135 deg (3*pi/4 = 2.35)
  // For Right lens, the top-outer wing is between 0 and pi/2 (1.57), centered around 45 deg (pi/4 = 0.78)
  let wingCenter = isLeft ? 2.35 : 0.78;
  
  // We want a smooth bell curve of expansion around the wing center
  let diff = Math.min(Math.abs(a - wingCenter), 2 * Math.PI - Math.abs(a - wingCenter));
  let wingExp = Math.exp(-Math.pow(diff / 0.8, 2)); // standard deviation of 0.8 radians
  
  // Also we want to narrow the bottom slightly for the sleek cat's eye look.
  // The bottom of the lens is at 3*pi/2 (4.71).
  let bottomCenter = Math.PI * 1.5;
  let bottomDiff = Math.min(Math.abs(a - bottomCenter), 2 * Math.PI - Math.abs(a - bottomCenter));
  let bottomContraction = Math.exp(-Math.pow(bottomDiff / 0.9, 2));

  // Factor defaults to 1.0. At the wing center, it expands outer radius up to 1.38x.
  // At the bottom, it narrows the radius down to 0.8x.
  return 1.0 + 0.38 * wingExp - 0.20 * bottomContraction;
}

/**
 * Computes the 2D vertices for the continuous spectacles frame outer boundary (under the bridge)
 * and the left & right lens outer shapes.
 */
export function getSpectaclesProfile(config) {
  const {
    width,
    height,
    thickness: T,
    bridgeWidth: B,
    bridgeHeight: BH,
    bridgeYOffset: BY,
    lensRotation,
    templeWidth
  } = config;

  // Change lens shape logic:
  // If the value goes beyond 6, treat the lens as a circle (32 sides) instead of generating more polygon sides
  // Value of 100 is treated as a high fidelity smooth Cat's Eye shape (48 sides)
  const isCatEye = config.sides === 100;
  let sides = config.sides;
  if (isCatEye) {
    sides = 48;
  } else if (sides > 6) {
    sides = 32;
  } else if (sides < 3) {
    sides = 3; // Ensure minimum of 3 sides for triangles
  }

  // Midpoints of outer shapes
  const C_left = -(width / 2 + B / 2);
  const C_right = width / 2 + B / 2;

  // Radii
  const outerR_X = width / 2 + T;
  const outerR_Y = height / 2 + T;
  const innerR_X = width / 2;
  const innerR_Y = height / 2;

  // Helper to adjust radii dynamically for Cat's Eye shape
  const getRadiusWithFactor = (angle, baseRx, baseRy, isLeft) => {
    if (!isCatEye) return { rx: baseRx, ry: baseRy };
    const factor = getCatEyeFactor(angle, isLeft);
    return { rx: baseRx * factor, ry: baseRy * factor };
  };

  // Bridge boundaries
  const halfBridgeHeight = BH / 2;
  const y_top = BY + halfBridgeHeight;
  const y_bottom = BY - halfBridgeHeight;

  // Calculate top and bottom angles on Left frame nasal side (facing center, where X connects)
  const sin_top = Math.max(-0.95, Math.min(0.95, y_top / outerR_Y));
  const sin_bottom = Math.max(-0.95, Math.min(0.95, y_bottom / outerR_Y));

  const theta_top_left = Math.asin(sin_top);
  const theta_bottom_left = Math.asin(sin_bottom);

  // Polygonal phase rotation
  const rotRad = (lensRotation * Math.PI) / 180;

  // Hinge / Integrated Connector Parameters
  const hBase = Math.min(templeWidth * 1.5, outerR_Y * 0.9);
  const delta = Math.asin(hBase / outerR_Y);
  const hTip = templeWidth;
  const L_conn = 0.32; // Standard fabrication-protrusion length

  // 1. LEFT LENS OUTER CURVE: CCW from theta_top_left to 2pi + theta_bottom_left
  const startAngleLeft = theta_top_left;
  let endAngleLeft = theta_bottom_left;
  if (endAngleLeft < startAngleLeft) {
    endAngleLeft += 2 * Math.PI;
  }

  const leftOuterVertices = [];

  // Anchor start
  const radTL = getRadiusWithFactor(theta_top_left, outerR_X, outerR_Y, true);
  const px_TL = C_left + radTL.rx * Math.cos(theta_top_left);
  const py_TL = isCatEye ? radTL.ry * Math.sin(theta_top_left) : y_top;
  leftOuterVertices.push(new THREE.Vector2(px_TL, py_TL));

  // Outer corners of the polygon in this span
  const cornersLeft = [];
  for (let k = 0; k < sides; k++) {
    let angle = rotRad + (2 * Math.PI * k) / sides;
    // Map to [startAngleLeft, startAngleLeft + 2*PI)
    while (angle < startAngleLeft) angle += 2 * Math.PI;
    while (angle >= startAngleLeft + 2 * Math.PI) angle -= 2 * Math.PI;

    if (angle > startAngleLeft + 0.001 && angle < endAngleLeft - 0.001) {
      cornersLeft.push(angle);
    }
  }
  cornersLeft.sort((a, b) => a - b);

  // Push normal corners BEFORE the temporal protrusion
  cornersLeft.filter(angle => angle < Math.PI - delta).forEach(angle => {
    const rad = getRadiusWithFactor(angle, outerR_X, outerR_Y, true);
    leftOuterVertices.push(new THREE.Vector2(
      C_left + rad.rx * Math.cos(angle),
      rad.ry * Math.sin(angle)
    ));
  });

  // Inject Left Connector transition
  const rad1 = getRadiusWithFactor(Math.PI - delta, outerR_X, outerR_Y, true);
  const rad4 = getRadiusWithFactor(Math.PI + delta, outerR_X, outerR_Y, true);
  const midFactor = getCatEyeFactor(Math.PI, true);

  const p1_X = C_left + rad1.rx * Math.cos(Math.PI - delta);
  const p1_Y = rad1.ry * Math.sin(Math.PI - delta);
  const p2_X = C_left - (outerR_X * midFactor + L_conn);
  const p2_Y = hTip / 2;
  const p3_X = C_left - (outerR_X * midFactor + L_conn);
  const p3_Y = -hTip / 2;
  const p4_X = C_left + rad4.rx * Math.cos(Math.PI + delta);
  const p4_Y = rad4.ry * Math.sin(Math.PI + delta);

  leftOuterVertices.push(new THREE.Vector2(p1_X, p1_Y));
  leftOuterVertices.push(new THREE.Vector2(p2_X, p2_Y));
  leftOuterVertices.push(new THREE.Vector2(p3_X, p3_Y));
  leftOuterVertices.push(new THREE.Vector2(p4_X, p4_Y));

  // Push normal corners AFTER the temporal protrusion
  cornersLeft.filter(angle => angle > Math.PI + delta).forEach(angle => {
    const rad = getRadiusWithFactor(angle, outerR_X, outerR_Y, true);
    leftOuterVertices.push(new THREE.Vector2(
      C_left + rad.rx * Math.cos(angle),
      rad.ry * Math.sin(angle)
    ));
  });

  // Anchor end
  const radBL = getRadiusWithFactor(theta_bottom_left, outerR_X, outerR_Y, true);
  const px_BL = C_left + radBL.rx * Math.cos(theta_bottom_left);
  const py_BL = isCatEye ? radBL.ry * Math.sin(theta_bottom_left) : y_bottom;
  leftOuterVertices.push(new THREE.Vector2(px_BL, py_BL));


  // 2. RIGHT LENS OUTER CURVE: CCW from bottom-right (pi - theta_bottom_left) to top-right (pi - theta_top_left)
  const startAngleRight = Math.PI - theta_bottom_left;
  let endAngleRight = Math.PI - theta_top_left;
  if (endAngleRight < startAngleRight) {
    endAngleRight += 2 * Math.PI;
  }

  const rightOuterVertices = [];

  // Anchor start
  const radBR = getRadiusWithFactor(Math.PI - theta_bottom_left, outerR_X, outerR_Y, false);
  const px_BR = C_right + radBR.rx * Math.cos(Math.PI - theta_bottom_left);
  const py_BR = isCatEye ? radBR.ry * Math.sin(Math.PI - theta_bottom_left) : y_bottom;
  rightOuterVertices.push(new THREE.Vector2(px_BR, py_BR));

  // Outer corners of the mirrored polygon in this span
  const cornersRight = [];
  for (let k = 0; k < sides; k++) {
    const baseAngleLeft = rotRad + (2 * Math.PI * k) / sides;
    let angle = Math.PI - baseAngleLeft;

    // Map to [startAngleRight, startAngleRight + 2*PI)
    while (angle < startAngleRight) angle += 2 * Math.PI;
    while (angle >= startAngleRight + 2 * Math.PI) angle -= 2 * Math.PI;

    if (angle > startAngleRight + 0.001 && angle < endAngleRight - 0.001) {
      cornersRight.push(angle);
    }
  }
  cornersRight.sort((a, b) => a - b);

  // Push normal corners BEFORE the temporal protrusion
  cornersRight.filter(angle => angle < 2 * Math.PI - delta).forEach(angle => {
    const rad = getRadiusWithFactor(angle, outerR_X, outerR_Y, false);
    rightOuterVertices.push(new THREE.Vector2(
      C_right + rad.rx * Math.cos(angle),
      rad.ry * Math.sin(angle)
    ));
  });

  // Inject Right Connector transition (mirrored)
  const radR1 = getRadiusWithFactor(2 * Math.PI - delta, outerR_X, outerR_Y, false);
  const radR4 = getRadiusWithFactor(2 * Math.PI + delta, outerR_X, outerR_Y, false);
  const rMidFactor = getCatEyeFactor(2 * Math.PI, false);

  const rp1_X = C_right + radR1.rx * Math.cos(2 * Math.PI - delta);
  const rp1_Y = radR1.ry * Math.sin(2 * Math.PI - delta);
  const rp2_X = C_right + (outerR_X * rMidFactor + L_conn);
  const rp2_Y = -hTip / 2;
  const rp3_X = C_right + (outerR_X * rMidFactor + L_conn);
  const rp3_Y = hTip / 2;
  const rp4_X = C_right + radR4.rx * Math.cos(2 * Math.PI + delta);
  const rp4_Y = radR4.ry * Math.sin(2 * Math.PI + delta);

  rightOuterVertices.push(new THREE.Vector2(rp1_X, rp1_Y));
  rightOuterVertices.push(new THREE.Vector2(rp2_X, rp2_Y));
  rightOuterVertices.push(new THREE.Vector2(rp3_X, rp3_Y));
  rightOuterVertices.push(new THREE.Vector2(rp4_X, rp4_Y));

  // Push normal corners AFTER the temporal protrusion
  cornersRight.filter(angle => angle > 2 * Math.PI + delta).forEach(angle => {
    const rad = getRadiusWithFactor(angle, outerR_X, outerR_Y, false);
    rightOuterVertices.push(new THREE.Vector2(
      C_right + rad.rx * Math.cos(angle),
      rad.ry * Math.sin(angle)
    ));
  });

  // Anchor end
  const radTR = getRadiusWithFactor(Math.PI - theta_top_left, outerR_X, outerR_Y, false);
  const px_TR = C_right + radTR.rx * Math.cos(Math.PI - theta_top_left);
  const py_TR = isCatEye ? radTR.ry * Math.sin(Math.PI - theta_top_left) : y_top;
  rightOuterVertices.push(new THREE.Vector2(px_TR, py_TR));


  // 3. COMBINE
  const outerVertices = [
    ...leftOuterVertices,
    ...rightOuterVertices
  ];

  // 4. LENS HOLES
  const leftHoleVertices = [];
  for (let i = 0; i < sides; i++) {
    const angle = rotRad - (2 * Math.PI * i) / sides;
    const rad = getRadiusWithFactor(angle, innerR_X, innerR_Y, true);
    leftHoleVertices.push(new THREE.Vector2(
      C_left + rad.rx * Math.cos(angle),
      rad.ry * Math.sin(angle)
    ));
  }

  const rightHoleVertices = [];
  for (let i = 0; i < sides; i++) {
    const revIndex = (sides - i) % sides;
    const leftPt = leftHoleVertices[revIndex];
    rightHoleVertices.push(new THREE.Vector2(
      -leftPt.x,
      leftPt.y
    ));
  }

  return {
    outerVertices,
    leftHoleVertices,
    rightHoleVertices
  };
}
