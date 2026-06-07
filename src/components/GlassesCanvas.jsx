import React, { useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Center } from '@react-three/drei';
import * as THREE from 'three';
import { getSpectaclesProfile, addRoundedLoopToPath } from '../utils/geometry.js';

function HeadOccluder() {
  const showDebugOccluder = false; // Toggle to true to visualize the occlusion boundaries

  return (
    <group renderOrder={-1}>
      {/* 1. Primary Cranium / Head Sphere (Pushed back to cover only rear skull/mid-head region) */}
      <mesh position={[0, -0.6, -10.5]}>
        <sphereGeometry args={[5.8, 32, 32]} />
        <meshBasicMaterial 
          color="#3b82f6" 
          wireframe={showDebugOccluder}
          colorWrite={showDebugOccluder} 
          depthWrite={true} 
        />
      </mesh>

      {/* 2. Temple Connection / Ear Shield boxes (Sits safely on the sides, starting behind the front frame) */}
      <mesh position={[-6.4, -1.2, -6.5]}>
        <boxGeometry args={[1.2, 4.5, 7.0]} />
        <meshBasicMaterial 
          color="#f59e0b" 
          wireframe={showDebugOccluder}
          colorWrite={showDebugOccluder} 
          depthWrite={true} 
        />
      </mesh>
      <mesh position={[6.4, -1.2, -6.5]}>
        <boxGeometry args={[1.2, 4.5, 7.0]} />
        <meshBasicMaterial 
          color="#f59e0b" 
          wireframe={showDebugOccluder}
          colorWrite={showDebugOccluder} 
          depthWrite={true} 
        />
      </mesh>
    </group>
  );
}

function ARGlassesGroup({ 
  config, 
  faceDataRef, 
  fallbackMode,
  autoRotate
}) {
  const arGroupRef = useRef(null);

  useFrame((state) => {
    if (arGroupRef.current) {
      if (fallbackMode) {
        arGroupRef.current.visible = true;
        // Shift spectacles geometry upward even more in the inactive preview
        arGroupRef.current.position.set(0, 5.8, 0);
        
        if (autoRotate) {
          arGroupRef.current.rotation.set(0, state.clock.getElapsedTime() * 0.8, 0);
        } else {
          arGroupRef.current.rotation.set(0, 0, 0);
        }
        
        // Zoom out more so that the glasses fit the screen nicely
        arGroupRef.current.scale.set(0.14, 0.14, 0.14);
      } else {
        // In AR/webcam tracking mode, lock the camera position to match calculations and reset rotation
        state.camera.position.set(0, 0, 10);
        state.camera.quaternion.set(0, 0, 0, 1);
        
        const data = faceDataRef.current;
        if (data && data.detected) {
          arGroupRef.current.visible = true;
          arGroupRef.current.position.lerp(data.position, 0.45);
          if (data.quaternion) {
            arGroupRef.current.quaternion.slerp(data.quaternion, 0.45);
          } else {
            arGroupRef.current.quaternion.slerp(new THREE.Quaternion().setFromEuler(data.rotation), 0.45);
          }
          arGroupRef.current.scale.lerp(data.scale, 0.45);
        } else {
          arGroupRef.current.visible = false;
        }
      }
    }
  });

  return (
    <group ref={arGroupRef}>
      {/* Head Occluder: rendered in sync with the tracked transform matrices only when tracking is active */}
      {!fallbackMode && <HeadOccluder />}
      
      {fallbackMode ? (
        <Center>
          <GlassesModel config={config} />
        </Center>
      ) : (
        <GlassesModel config={config} />
      )}
    </group>
  );
}

export default function GlassesCanvas({ config, faceDataRef, fallbackMode, autoRotate }) {
  return (
    <div style={{ width: '100%', height: '100%', position: 'relative', overflow: 'hidden', backgroundColor: 'transparent' }}>
      <Canvas
        key={fallbackMode ? 'fallback-view-canvas' : 'active-view-canvas'}
        shadows
        camera={{ position: fallbackMode ? [9, 2.0, 9] : [0, 0, 34], fov: fallbackMode ? 28 : 40 }}
        gl={{ antialias: true, alpha: true, preserveDrawingBuffer: true }}
        style={{ width: '100%', height: '100%' }}
      >
        {/* Lights */}
        <ambientLight intensity={1.8} />
        
        {/* Strong front light for AR visibility */}
        <directionalLight
          position={[0, 10, 15]}
          intensity={2.5}
        />
        
        {/* Soft side highlights for 3D depth */}
        <pointLight position={[-10, 5, 5]} intensity={25} decay={1} />
        <pointLight position={[10, -5, 5]} intensity={15} decay={1} color="#818cf8" />
 
        <ARGlassesGroup 
          config={config} 
          faceDataRef={faceDataRef} 
          fallbackMode={fallbackMode} 
          autoRotate={autoRotate}
        />
 
        {fallbackMode && (
          <OrbitControls
            makeDefault
            enablePan={false}
            enableZoom={true}
            minDistance={4.0}
            maxDistance={55.0}
            target={[0, 4.8, 0]}
          />
        )}
      </Canvas>
    </div>
  );
}

function ReactMaterial({ materialType, color }) {
  switch (materialType) {
    case 'matte':
      return <meshStandardMaterial color={color} roughness={0.8} metalness={0.05} />;
    case 'clear-plastic':
      return (
        <meshPhysicalMaterial
          color={color}
          roughness={0.15}
          metalness={0.05}
          transmission={0.85}
          thickness={0.4}
          transparent
          opacity={0.65}
        />
      );
    case 'metallic':
      return <meshStandardMaterial color={color} roughness={0.25} metalness={0.95} />;
    case 'glossy':
    default:
      return (
        <meshPhysicalMaterial
          color={color}
          roughness={0.1}
          metalness={0.15}
          clearcoat={1.0}
          clearcoatRoughness={0.08}
        />
      );
  }
}

// --- Temple Decoration system (Supports procedurals & future FBX placeholders) ---

function HeartDecoration({ color, materialType }) {
  const geom = useMemo(() => {
    const shape = new THREE.Shape();
    // Beautiful centered classic heart path
    shape.moveTo(0, 0.06);
    shape.bezierCurveTo(0, 0.14, 0.11, 0.23, 0.22, 0.23);
    shape.bezierCurveTo(0.35, 0.23, 0.35, 0.06, 0.35, 0.06);
    shape.bezierCurveTo(0.35, -0.09, 0.18, -0.21, 0, -0.32);
    shape.bezierCurveTo(-0.18, -0.21, -0.35, -0.09, -0.35, 0.06);
    shape.bezierCurveTo(-0.35, 0.06, -0.35, 0.23, -0.22, 0.23);
    shape.bezierCurveTo(-0.11, 0.23, 0, 0.14, 0, 0.06);

    const extrudeSettings = {
      depth: 0.04,
      bevelEnabled: true,
      bevelSegments: 2,
      steps: 1,
      bevelSize: 0.012,
      bevelThickness: 0.012
    };

    return new THREE.ExtrudeGeometry(shape, extrudeSettings);
  }, []);

  return (
    <mesh geometry={geom} castShadow receiveShadow>
      <ReactMaterial materialType={materialType} color={color} />
    </mesh>
  );
}

function ButterflyWingsDecoration({ color, materialType }) {
  const geom = useMemo(() => {
    const shape = new THREE.Shape();
    // Start at center
    shape.moveTo(0, 0);
    // Top right wing
    shape.bezierCurveTo(0.12, 0.08, 0.28, 0.24, 0.28, 0.12);
    shape.bezierCurveTo(0.28, 0, 0.16, -0.04, 0, 0.02);
    // Bottom right wing
    shape.bezierCurveTo(0.16, -0.06, 0.22, -0.22, 0.12, -0.22);
    shape.bezierCurveTo(0.04, -0.22, 0.02, -0.08, 0, 0);
    // Bottom left wing
    shape.bezierCurveTo(-0.02, -0.08, -0.04, -0.22, -0.12, -0.22);
    shape.bezierCurveTo(-0.22, -0.22, -0.16, -0.06, 0, 0.02);
    // Top left wing
    shape.bezierCurveTo(-0.16, -0.04, -0.28, 0, -0.28, 0.12);
    shape.bezierCurveTo(-0.28, 0.24, -0.12, 0.08, 0, 0);

    const extrudeSettings = {
      depth: 0.04,
      bevelEnabled: true,
      bevelSegments: 2,
      steps: 1,
      bevelSize: 0.012,
      bevelThickness: 0.012
    };

    return new THREE.ExtrudeGeometry(shape, extrudeSettings);
  }, []);

  return (
    <mesh geometry={geom} castShadow receiveShadow>
      <ReactMaterial materialType={materialType} color={color} />
    </mesh>
  );
}

function FlowerDecoration({ color, materialType }) {
  const geom = useMemo(() => {
    const shape = new THREE.Shape();
    const numPoints = 120;
    // 5-petal responsive polar curve flower
    for (let i = 0; i <= numPoints; i++) {
      const theta = (i / numPoints) * Math.PI * 2;
      const r = 0.095 + 0.13 * Math.abs(Math.sin(2.5 * theta));
      const x = Math.cos(theta) * r;
      const y = Math.sin(theta) * r;
      if (i === 0) {
        shape.moveTo(x, y);
      } else {
        shape.lineTo(x, y);
      }
    }
    shape.closePath();

    const extrudeSettings = {
      depth: 0.04,
      bevelEnabled: true,
      bevelSegments: 2,
      steps: 1,
      bevelSize: 0.012,
      bevelThickness: 0.012
    };

    return new THREE.ExtrudeGeometry(shape, extrudeSettings);
  }, []);

  return (
    <mesh geometry={geom} castShadow receiveShadow>
      <ReactMaterial materialType={materialType} color={color} />
    </mesh>
  );
}

function DiamondDecoration({ color, materialType, side }) {
  const geom = useMemo(() => {
    const shape = new THREE.Shape();
    // Futuristic wider diamond
    shape.moveTo(0, 0.20);
    shape.lineTo(0.24, 0);
    shape.lineTo(0, -0.20);
    shape.lineTo(-0.24, 0);
    shape.closePath();

    const extrudeSettings = {
      depth: 0.05,
      bevelEnabled: true,
      bevelSegments: 2,
      steps: 1,
      bevelSize: 0.012,
      bevelThickness: 0.015
    };

    return new THREE.ExtrudeGeometry(shape, extrudeSettings);
  }, []);

  const smallX = side === 'left' ? 0.18 : -0.18;
  const largeX = side === 'left' ? -0.22 : 0.22;

  return (
    <group>
      {/* Small diamond, shifted back in Z-depth and positioned correctly per side for front-to-back symmetry */}
      <mesh geometry={geom} position={[smallX, 0, -0.06]} scale={[0.85, 0.85, 0.85]} castShadow receiveShadow>
        <ReactMaterial materialType={materialType} color={color} />
      </mesh>
      {/* Large diamond, positioned correctly per side for front-to-back symmetry */}
      <mesh geometry={geom} position={[largeX, 0, 0.01]} scale={[1.1, 1.1, 1.0]} castShadow receiveShadow>
        <ReactMaterial materialType={materialType} color={color} />
      </mesh>
    </group>
  );
}

function TempleDecorationSlot({
  decoration,
  side,
  templeLength,
  templeWidth,
  templeThickness,
  frameColor,
  frameMaterial
}) {
  if (!decoration || decoration === 'none') return null;

  const bendRadius = Math.max(0.18, templeLength * 0.0375);
  // Position decoration cleanly along the temple arm, right behind the corner bend
  const zPos = -bendRadius - (templeLength * 0.12);
  
  // Position decoration flush with the outer-most lateral surface of the temple arm
  const xOffset = bendRadius + (templeThickness / 2) + 0.3;
  const xPos = side === 'left' ? -xOffset : xOffset;

  const yPos = 0;

  // Face outward: left-side is facing negative X (+90°), right-side is facing positive X (-90°)
  const rotationY = side === 'left' ? Math.PI / 2 : -Math.PI / 2;

  return (
    <group position={[xPos, yPos, zPos]} rotation={[0, rotationY, 0]} scale={[2.5, 2.5, 2.2]}>
      {decoration === 'heart' && (
        <HeartDecoration color={frameColor} materialType={frameMaterial} />
      )}
      {decoration === 'butterfly' && (
        <group scale={1.68} position={[0, 0.07, 0]}>
          <ButterflyWingsDecoration color={frameColor} materialType={frameMaterial} />
        </group>
      )}
      {decoration === 'diamond' && (
        <group scale={1.6}>
          <DiamondDecoration color={frameColor} materialType={frameMaterial} side={side} />
        </group>
      )}
    </group>
  );
}

// Side temple hook arm sub-component
function Temple({
  side,
  length,
  templeWidth,
  templeThickness,
  fold,
  x,
  y,
  z,
  frameMaterial,
  frameColor,
  extrusionDepth,
  bevelSize,
  thickness,
  templeDecoration,
  decorationColor
}) {
  // Define 3D Catmull-Rom curve for flat ear curve temple with a rounded corner bevel at the start
  const curve = useMemo(() => {
    const bendRadius = Math.max(0.18, length * 0.0375); // Scaled corner bevel radius
    const pointsLeft = [
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(-bendRadius * 0.35, 0, 0),
      new THREE.Vector3(-bendRadius * 0.75, 0, -bendRadius * 0.45),
      new THREE.Vector3(-bendRadius, 0, -bendRadius),
      new THREE.Vector3(-bendRadius, 0, -length * 0.72),
      new THREE.Vector3(-bendRadius, -length * 0.025, -length * 0.86),
      new THREE.Vector3(-bendRadius + length * 0.00833, -length * 0.09375, -length)
    ];
    const pointsRight = [
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(bendRadius * 0.35, 0, 0),
      new THREE.Vector3(bendRadius * 0.75, 0, -bendRadius * 0.45),
      new THREE.Vector3(bendRadius, 0, -bendRadius),
      new THREE.Vector3(bendRadius, 0, -length * 0.72),
      new THREE.Vector3(bendRadius, -length * 0.025, -length * 0.86),
      new THREE.Vector3(bendRadius - length * 0.00833, -length * 0.09375, -length)
    ];
    return new THREE.CatmullRomCurve3(side === 'left' ? pointsLeft : pointsRight);
  }, [length, side]);

  // Generate flat ribbon/strip shape
  const templeShape = useMemo(() => {
    const shape = new THREE.Shape();
    
    const calculatedBevelThickness = bevelSize !== undefined && extrusionDepth !== undefined 
      ? Math.min(bevelSize, extrusionDepth * 0.38) 
      : 0;
    const calculatedBevelSize = bevelSize !== undefined && thickness !== undefined
      ? Math.min(bevelSize, thickness * 0.38)
      : 0;
      
    // Matching beveled total height (mapped to shape X) and thickness (mapped to shape Y)
    const w = extrusionDepth !== undefined 
      ? (templeWidth + 2 * calculatedBevelSize) 
      : templeWidth;
    const h = extrusionDepth !== undefined
      ? (extrusionDepth + 2 * calculatedBevelThickness) 
      : templeThickness;
    
    // rx is rounding for shape X (height), ry is rounding for shape Y (thickness)
    const rx = extrusionDepth !== undefined ? calculatedBevelSize : Math.min(0.015, w * 0.45);
    const ry = extrusionDepth !== undefined ? calculatedBevelThickness : Math.min(0.015, h * 0.45);
    
    if (rx > 0.001 || ry > 0.001) {
      const x = -w / 2;
      const y = -h / 2;
      // Start at top edge, before the top-right corner
      shape.moveTo(x + rx, y + h);
      shape.lineTo(x + w - rx, y + h);
      // Top-right corner
      shape.quadraticCurveTo(x + w, y + h, x + w, y + h - ry);
      // Right edge down
      shape.lineTo(x + w, y + ry);
      // Bottom-right corner
      shape.quadraticCurveTo(x + w, y, x + w - rx, y);
      // Bottom edge left
      shape.lineTo(x + rx, y);
      // Bottom-left corner
      shape.quadraticCurveTo(x, y, x, y + ry);
      // Left edge up
      shape.lineTo(x, y + h - ry);
      // Top-left corner
      shape.quadraticCurveTo(x, y + h, x + rx, y + h);
    } else {
      const x = -w / 2;
      const y = -h / 2;
      shape.moveTo(x, y);
      shape.lineTo(x + w, y);
      shape.lineTo(x + w, y + h);
      shape.lineTo(x, y + h);
      shape.closePath();
    }
    
    return shape;
  }, [templeWidth, templeThickness, extrusionDepth, bevelSize, thickness]);

  // Settings for extruding the flat shape along the curve path
  const extrudeSettings = useMemo(() => {
    return {
      steps: 60,
      extrudePath: curve,
      bevelEnabled: false
    };
  }, [curve]);

  // Create ExtrudeGeometry
  const geom = useMemo(() => {
    return new THREE.ExtrudeGeometry(templeShape, extrudeSettings);
  }, [templeShape, extrudeSettings]);

  // Calculate hinge inward folding (nearly 90 degrees fold state)
  const foldRad = fold * (Math.PI * 0.47);
  const rotationY = side === 'left' ? foldRad : -foldRad;

  return (
    <group position={[x, y, z]} rotation={[0, rotationY, 0]}>
      <mesh castShadow receiveShadow geometry={geom}>
        <ReactMaterial materialType={frameMaterial} color={frameColor} />
      </mesh>
      
      <TempleDecorationSlot
        decoration={templeDecoration}
        side={side}
        templeLength={length}
        templeWidth={templeWidth}
        templeThickness={templeThickness}
        frameColor={decorationColor || frameColor}
        frameMaterial={frameMaterial}
      />
    </group>
  );
}

// Primary specs model builder
function GlassesModel({ config }) {
  const {
    sides,
    width,
    height,
    thickness,
    bridgeWidth,
    extrusionDepth,
    bevelSize,
    roundness,
    frameMaterial,
    templeLength,
    templeWidth,
    templeThickness,
    templeFold,
    showTemples,
    lensRotation,
    templeDecoration
  } = config;

  const resolvedFrameColor = config.specsColor || config.frameColor || '#222828';
  const resolvedDecorationColor = config.decorationColor || '#222828';

  // 1. Generate frame shape with holes
  const frameGeometry = useMemo(() => {
    const profile = getSpectaclesProfile(config);
    const shape = new THREE.Shape();
    
    // Smooth/rounded outer profile (pass isOuter=true to keep connector faces flat)
    addRoundedLoopToPath(shape, profile.outerVertices, roundness, true);

    // Left outer opening cut-out
    const leftHole = new THREE.Path();
    addRoundedLoopToPath(leftHole, profile.leftHoleVertices, roundness);
    shape.holes.push(leftHole);

    // Right outer opening cut-out
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

    return new THREE.ExtrudeGeometry(shape, extrudeSettings);
  }, [config]);

  // 3. Define hinges start positions precisely on the outer edge midpoint at Y = 0
  const { leftHingeX, rightHingeX, hingeY } = useMemo(() => {
    const C_left = -(width / 2 + bridgeWidth / 2);
    const outerR_X = width / 2 + thickness;
    const L_conn = 0.32; // Sync with geometry.js protrusion length
    
    // Calculate the exact bevel expansion in XY plane
    const calculatedBevelSize = Math.min(bevelSize, thickness * 0.38);
    
    return {
      leftHingeX: C_left - (outerR_X + L_conn) - calculatedBevelSize,
      rightHingeX: -C_left + (outerR_X + L_conn) + calculatedBevelSize,
      hingeY: 0
    };
  }, [width, thickness, bridgeWidth, bevelSize]);

  return (
    <group>
      <mesh castShadow receiveShadow geometry={frameGeometry}>
        <ReactMaterial materialType={frameMaterial} color={resolvedFrameColor} />
      </mesh>

      {showTemples && (
        <Temple
          side="left"
          length={templeLength}
          templeWidth={templeWidth}
          templeThickness={templeThickness}
          fold={templeFold}
          x={leftHingeX}
          y={hingeY}
          z={extrusionDepth * 0.5}
          frameMaterial={frameMaterial}
          frameColor={resolvedFrameColor}
          extrusionDepth={extrusionDepth}
          bevelSize={bevelSize}
          thickness={thickness}
          templeDecoration={templeDecoration}
          decorationColor={resolvedDecorationColor}
        />
      )}

      {showTemples && (
        <Temple
          side="right"
          length={templeLength}
          templeWidth={templeWidth}
          templeThickness={templeThickness}
          fold={templeFold}
          x={rightHingeX}
          y={hingeY}
          z={extrusionDepth * 0.5}
          frameMaterial={frameMaterial}
          frameColor={resolvedFrameColor}
          extrusionDepth={extrusionDepth}
          bevelSize={bevelSize}
          thickness={thickness}
          templeDecoration={templeDecoration}
          decorationColor={resolvedDecorationColor}
        />
      )}
    </group>
  );
}
