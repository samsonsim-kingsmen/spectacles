import * as THREE from 'three';
import { getSpectaclesProfile, addRoundedLoopToPath } from './geometry';

/**
 * Constructs the spectacles geometry client-side, scales to millimeters (10x),
 * merges into a unified coordinate list, and downloads a clean, 3D-printable Binary STL.
 */
export function exportSpectaclesToSTL(config) {
  const {
    sides,
    width,
    height,
    thickness,
    bridgeWidth,
    extrusionDepth,
    bevelSize,
    roundness,
    templeLength,
    templeWidth,
    templeThickness,
    showTemples,
    lensRotation
  } = config;

  const geometries = [];

  // --- 1. Frame Geometry ---
  const profile = getSpectaclesProfile(config);
  const shape = new THREE.Shape();
  addRoundedLoopToPath(shape, profile.outerVertices, roundness, true);

  const leftHole = new THREE.Path();
  addRoundedLoopToPath(leftHole, profile.leftHoleVertices, roundness);
  shape.holes.push(leftHole);

  const rightHole = new THREE.Path();
  addRoundedLoopToPath(rightHole, profile.rightHoleVertices, roundness);
  shape.holes.push(rightHole);

  const extrudeSettings = {
    depth: extrusionDepth,
    bevelEnabled: true,
    bevelSegments: 4,
    steps: 2,
    bevelSize: Math.min(bevelSize, thickness * 0.38),
    bevelThickness: Math.min(bevelSize, extrusionDepth * 0.38)
  };

  const frameGeometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
  
  geometries.push({
    geometry: frameGeometry,
    matrix: new THREE.Matrix4()
  });

  // --- 2. Hinge Pin Coordinates calculation ---
  const C_left = -(width / 2 + bridgeWidth / 2);
  const outerR_X = width / 2 + thickness;
  const hingeY = 0;
  const L_conn = 0.32;
  
  const calculatedBevelSize = Math.min(bevelSize, thickness * 0.38);

  const leftHingeX = C_left - (outerR_X + L_conn) - calculatedBevelSize;
  const rightHingeX = -C_left + (outerR_X + L_conn) + calculatedBevelSize;

  // --- 3. Temples (Arms) ---
  if (showTemples) {
    const templeShape = new THREE.Shape();
    const calculatedBevelThickness = Math.min(bevelSize, extrusionDepth * 0.38);
    const calculatedBevelSize = Math.min(bevelSize, thickness * 0.38);

    const w = templeWidth + 2 * calculatedBevelSize;
    const h = extrusionDepth + 2 * calculatedBevelThickness;

    const rx = calculatedBevelSize;
    const ry = calculatedBevelThickness;

    if (rx > 0.001 || ry > 0.001) {
      const x = -w / 2;
      const y = -h / 2;
      templeShape.moveTo(x + rx, y + h);
      templeShape.lineTo(x + w - rx, y + h);
      templeShape.quadraticCurveTo(x + w, y + h, x + w, y + h - ry);
      templeShape.lineTo(x + w, y + ry);
      templeShape.quadraticCurveTo(x + w, y, x + w - rx, y);
      templeShape.lineTo(x + rx, y);
      templeShape.quadraticCurveTo(x, y, x, y + ry);
      templeShape.lineTo(x, y + h - ry);
      templeShape.quadraticCurveTo(x, y + h, x + rx, y + h);
    } else {
      const x = -w / 2;
      const y = -h / 2;
      templeShape.moveTo(x, y);
      templeShape.lineTo(x + w, y);
      templeShape.lineTo(x + w, y + h);
      templeShape.lineTo(x, y + h);
      templeShape.closePath();
    }

    const bendRadius = Math.max(0.18, templeLength * 0.0375);

    const leftPoints = [
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(-bendRadius * 0.35, 0, 0),
      new THREE.Vector3(-bendRadius * 0.75, 0, -bendRadius * 0.45),
      new THREE.Vector3(-bendRadius, 0, -bendRadius),
      new THREE.Vector3(-bendRadius, 0, -templeLength * 0.72),
      new THREE.Vector3(-bendRadius, -templeLength * 0.025, -templeLength * 0.86),
      new THREE.Vector3(-bendRadius + templeLength * 0.00833, -templeLength * 0.09375, -templeLength)
    ];
    const leftCurve = new THREE.CatmullRomCurve3(leftPoints);

    const rightPoints = [
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(bendRadius * 0.35, 0, 0),
      new THREE.Vector3(bendRadius * 0.75, 0, -bendRadius * 0.45),
      new THREE.Vector3(bendRadius, 0, -bendRadius),
      new THREE.Vector3(bendRadius, 0, -templeLength * 0.72),
      new THREE.Vector3(bendRadius, -templeLength * 0.025, -templeLength * 0.86),
      new THREE.Vector3(bendRadius - templeLength * 0.00833, -templeLength * 0.09375, -templeLength)
    ];
    const rightCurve = new THREE.CatmullRomCurve3(rightPoints);

    const leftTempleGeo = new THREE.ExtrudeGeometry(templeShape, {
      steps: 60,
      extrudePath: leftCurve,
      bevelEnabled: false
    });

    const rightTempleGeo = new THREE.ExtrudeGeometry(templeShape, {
      steps: 60,
      extrudePath: rightCurve,
      bevelEnabled: false
    });

    const leftTempleMat = new THREE.Matrix4().makeTranslation(leftHingeX, hingeY, extrusionDepth * 0.5);
    geometries.push({ geometry: leftTempleGeo, matrix: leftTempleMat });

    const rightTempleMat = new THREE.Matrix4().makeTranslation(rightHingeX, hingeY, extrusionDepth * 0.5);
    geometries.push({ geometry: rightTempleGeo, matrix: rightTempleMat });
  }

  // --- 5. Triangles extraction, 10x millimeter scaling, and Binary STL Generation ---
  const triangles = [];
  const MM_SCALE = 10.0;

  for (const { geometry, matrix } of geometries) {
    const posAttr = geometry.getAttribute('position');
    if (!posAttr) continue;

    const indexAttr = geometry.index;
    const tempV1 = new THREE.Vector3();
    const tempV2 = new THREE.Vector3();
    const tempV3 = new THREE.Vector3();

    const addTriangle = (idx1, idx2, idx3) => {
      tempV1.set(posAttr.getX(idx1), posAttr.getY(idx1), posAttr.getZ(idx1));
      tempV2.set(posAttr.getX(idx2), posAttr.getY(idx2), posAttr.getZ(idx2));
      tempV3.set(posAttr.getX(idx3), posAttr.getY(idx3), posAttr.getZ(idx3));

      tempV1.applyMatrix4(matrix);
      tempV2.applyMatrix4(matrix);
      tempV3.applyMatrix4(matrix);

      tempV1.multiplyScalar(MM_SCALE);
      tempV2.multiplyScalar(MM_SCALE);
      tempV3.multiplyScalar(MM_SCALE);

      const edgeY = new THREE.Vector3().subVectors(tempV3, tempV2);
      const edgeX = new THREE.Vector3().subVectors(tempV1, tempV2);
      const normalVector = new THREE.Vector3().crossVectors(edgeY, edgeX).normalize();

      triangles.push({
        normal: normalVector,
        v1: tempV1.clone(),
        v2: tempV2.clone(),
        v3: tempV3.clone()
      });
    };

    if (indexAttr) {
      for (let i = 0; i < indexAttr.count; i += 3) {
        addTriangle(indexAttr.getX(i), indexAttr.getX(i + 1), indexAttr.getX(i + 2));
      }
    } else {
      for (let i = 0; i < posAttr.count; i += 3) {
        addTriangle(i, i + 1, i + 2);
      }
    }

    geometry.dispose();
  }

  const totalTriangles = triangles.length;
  const bufferSize = 80 + 4 + totalTriangles * 50;
  const arrayBuffer = new ArrayBuffer(bufferSize);
  const dataView = new DataView(arrayBuffer);

  const headerString = 'Spectrum Parametric Spectacles STL - 3D Printing Export (Scale: MM)';
  for (let i = 0; i < 80; i++) {
    if (i < headerString.length) {
      dataView.setUint8(i, headerString.charCodeAt(i));
    } else {
      dataView.setUint8(i, 0);
    }
  }

  dataView.setUint32(80, totalTriangles, true);

  let byteOffset = 84;
  for (const tri of triangles) {
    dataView.setFloat32(byteOffset, tri.normal.x, true);
    dataView.setFloat32(byteOffset + 4, tri.normal.y, true);
    dataView.setFloat32(byteOffset + 8, tri.normal.z, true);
    byteOffset += 12;

    dataView.setFloat32(byteOffset, tri.v1.x, true);
    dataView.setFloat32(byteOffset + 4, tri.v1.y, true);
    dataView.setFloat32(byteOffset + 8, tri.v1.z, true);
    byteOffset += 12;

    dataView.setFloat32(byteOffset, tri.v2.x, true);
    dataView.setFloat32(byteOffset + 4, tri.v2.y, true);
    dataView.setFloat32(byteOffset + 8, tri.v2.z, true);
    byteOffset += 12;

    dataView.setFloat32(byteOffset, tri.v3.x, true);
    dataView.setFloat32(byteOffset + 4, tri.v3.y, true);
    dataView.setFloat32(byteOffset + 8, tri.v3.z, true);
    byteOffset += 12;

    dataView.setUint16(byteOffset, 0, true);
    byteOffset += 2;
  }

  const blob = new Blob([arrayBuffer], { type: 'application/octet-stream' });
  const downloadUrl = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = downloadUrl;
  
  const shapeLabel = sides === 3 ? 'triangle' :
                     sides === 4 ? 'square' :
                     sides === 6 ? 'hexagon' :
                     sides === 100 ? 'cats_eye' :
                     sides >= 24 ? 'round' : 'polygon';
  
  anchor.download = `spectrum_spectacles_${shapeLabel}_frame.stl`;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  
  URL.revokeObjectURL(downloadUrl);
}
