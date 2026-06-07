import React, { useState, useEffect, useRef } from 'react';
import * as THREE from 'three';
import { PRESETS } from './presets.js';
import GlassesCanvas from './components/GlassesCanvas.jsx';
import GlassesControls from './components/GlassesControls.jsx';
import { Glasses, AlertCircle, RefreshCw } from 'lucide-react';
import { FaceLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';

// Universal video-crop to 9:16 vertical overlay mapper
const getAdjustedScreenCoords = (pt, vAspect, cAspect) => {
  let adjX = pt.x;
  let adjY = pt.y;
  
  if (vAspect > cAspect) {
    const scale = vAspect / cAspect;
    adjX = (pt.x - 0.5) * scale + 0.5;
  } else if (vAspect < cAspect) {
    const scale = cAspect / vAspect;
    adjY = (pt.y - 0.5) * scale + 0.5;
  }
  
  return {
    x: 1.0 - adjX, // Mirror horizontally
    y: adjY,
    z: pt.z
  };
};

export default function App() {
  const [config, setConfig] = useState(PRESETS[0].config);
  const [autoRotate, setAutoRotate] = useState(false);
  const [depthOffset, setDepthOffset] = useState(0.0);
  
  // Webcam & face-tracking states
  const [cameraActive, setCameraActive] = useState(false);
  const [trackerStatus, setTrackerStatus] = useState("Initializing AR Engine...");
  const [landmarker, setLandmarker] = useState(null);
  const [cameraPermission, setCameraPermission] = useState(null);
  const [videoAspect, setVideoAspect] = useState(1.3333); // Default 4/3

  const videoRef = useRef(null);
  const streamRef = useRef(null);
  
  // High performance tracking ref read on Three.js render loops directly (60 FPS)
  const faceDataRef = useRef({
    detected: false,
    position: new THREE.Vector3(0, 0, 0),
    rotation: new THREE.Euler(0, 0, 0),
    scale: new THREE.Vector3(1, 1, 1),
  });

  // Reset body, html and load font stylesheet dynamically to operate 100% without external CSS
  useEffect(() => {
    document.body.style.margin = '0';
    document.body.style.padding = '0';
    document.body.style.backgroundColor = '#000000';
    document.body.style.overflow = 'hidden';
    document.body.style.width = '100vw';
    document.body.style.height = '100vh';
    
    document.documentElement.style.margin = '0';
    document.documentElement.style.padding = '0';
    document.documentElement.style.backgroundColor = '#000000';
    document.documentElement.style.overflow = 'hidden';
    document.documentElement.style.width = '100vw';
    document.documentElement.style.height = '100vh';

    if (!document.getElementById('tryon-fonts')) {
      const link = document.createElement('link');
      link.id = 'tryon-fonts';
      link.rel = 'stylesheet';
      link.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Space+Grotesk:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap';
      document.head.appendChild(link);
    }
  }, []);

  // 1. Initialise MediaPipe Face Landmarker
  useEffect(() => {
    let loaderActive = true;
    const initFaceLandmarker = async () => {
      try {
        setTrackerStatus("Loading Neural Face Model...");
        const filesetResolver = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.8/wasm"
        );
        const landmarkerInstance = await FaceLandmarker.createFromOptions(filesetResolver, {
          baseOptions: {
            modelAssetPath: "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task",
            delegate: "GPU"
          },
          runningMode: "VIDEO",
          numFaces: 1,
        });
        
        if (loaderActive) {
          setLandmarker(landmarkerInstance);
          setTrackerStatus("AR Face Model Loaded");
        }
      } catch (err) {
        console.error("Failed to load FaceLandmarker", err);
        if (loaderActive) {
          setTrackerStatus("AR Module Loader Error");
        }
      }
    };

    initFaceLandmarker();
    return () => {
      loaderActive = false;
    };
  }, []);

  // 2. Camera video play controller
  useEffect(() => {
    if (cameraActive) {
      setTrackerStatus("Awaiting Camera Stream...");
      navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false
      })
      .then((stream) => {
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.onloadedmetadata = () => {
            videoRef.current?.play().catch(e => console.error("Video play aborted", e));
            const w = videoRef.current?.videoWidth || 1280;
            const h = videoRef.current?.videoHeight || 720;
            setVideoAspect(w / h);
            setTrackerStatus("Live Try-on Tracker Active");
          };
        }
        setCameraPermission(true);
      })
      .catch((err) => {
        console.error("Camera access failed", err);
        setCameraPermission(false);
        setCameraActive(false);
        setTrackerStatus("Allow camera access for Try-On");
      });
    } else {
      // Release camera streams immediately on disable
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
      setTrackerStatus("Camera inactive (Showroom active)");
    }

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
    };
  }, [cameraActive]);

  // 3. Real-time Face Tracking calculations block (runs inside active frames)
  useEffect(() => {
    let animationId;
    const runFrameTracking = () => {
      if (cameraActive && landmarker && videoRef.current && videoRef.current.readyState >= 2) {
        const timestamp = performance.now();
        const results = landmarker.detectForVideo(videoRef.current, timestamp);
        
        if (results.faceLandmarks && results.faceLandmarks.length > 0) {
          const landmarks = results.faceLandmarks[0];
          
          // Capture designated landmark keys
          const L33 = landmarks[33];   // Left eye outer
          const L133 = landmarks[133]; // Left eye inner
          const L362 = landmarks[362]; // Right eye inner
          const L263 = landmarks[263]; // Right eye outer
          const L168 = landmarks[168]; // Nose bridge peak center
          const L10 = landmarks[10];   // Top forehead midline
          
          // Left and Right dynamic eyeball centers
          const eyeL = {
            x: (L33.x + L133.x) / 2,
            y: (L33.y + L133.y) / 2,
            z: (L33.z + L133.z) / 2
          };
          const eyeR = {
            x: (L362.x + L263.x) / 2,
            y: (L362.y + L263.y) / 2,
            z: (L362.z + L263.z) / 2
          };
          
          const portraitAspect = 9 / 16;
          
          // Adjust coordinates relative to covered aspect ratio cropping \& mirror view
          const adjL = getAdjustedScreenCoords(eyeL, videoAspect, portraitAspect);
          const adjR = getAdjustedScreenCoords(eyeR, videoAspect, portraitAspect);
          const adjNB = getAdjustedScreenCoords(L168, videoAspect, portraitAspect);
          const adjF = getAdjustedScreenCoords(L10, videoAspect, portraitAspect);
          
          // Inversely derive distance scale depth mapping based on pupil width projection
          const onScreenEyeDist = Math.hypot(adjL.x - adjR.x, adjL.y - adjR.y);
          
          const cameraZ = 10;
          const fov = 40;
          const K = 1.88; // Distance math factor
          const faceZ = cameraZ - (K / Math.max(0.01, onScreenEyeDist));
          
          // World viewport span at active translation depth
          const visibleHeightRange = 2 * Math.tan((fov * Math.PI) / 360) * (cameraZ - faceZ);
          const visibleWidthRange = visibleHeightRange * portraitAspect;
          
          // Introduce a z-multiplier to amplify the subtle depth changes in MediaPipe landmarks.
          // This ensures head pitch tilts up and down are fully mapped and responsive.
          const zMultiplier = 2.8;
          
          // Map to Three.js world coordinates
          const zScale = videoAspect / 1.7777; // Normalize MediaPipe's raw Z (normalized to width) relative to the height scale
          const EL_World = new THREE.Vector3(
            (adjL.x - 0.5) * visibleWidthRange,
            (0.5 - adjL.y) * visibleHeightRange,
            -eyeL.z * zScale * visibleWidthRange * zMultiplier + faceZ
          );
          const ER_World = new THREE.Vector3(
            (adjR.x - 0.5) * visibleWidthRange,
            (0.5 - adjR.y) * visibleHeightRange,
            -eyeR.z * zScale * visibleWidthRange * zMultiplier + faceZ
          );
          const NB_World = new THREE.Vector3(
            (adjNB.x - 0.5) * visibleWidthRange,
            (0.5 - adjNB.y) * visibleHeightRange,
            -L168.z * zScale * visibleWidthRange * zMultiplier + faceZ
          );
          const F_World = new THREE.Vector3(
            (adjF.x - 0.5) * visibleWidthRange,
            (0.5 - adjF.y) * visibleHeightRange,
            -L10.z * zScale * visibleWidthRange * zMultiplier + faceZ
          );
          
          // Formulate rotation basis vectors
          const faceX = new THREE.Vector3().subVectors(EL_World, ER_World).normalize();
          const faceY_temp = new THREE.Vector3().subVectors(F_World, NB_World).normalize();
          const faceZVec = new THREE.Vector3().crossVectors(faceX, faceY_temp).normalize();
          const faceY = new THREE.Vector3().crossVectors(faceZVec, faceX).normalize();
          
          // Construct rotation matrix and set Euler & direct Quaternion
          const rotMat = new THREE.Matrix4().makeBasis(faceX, faceY, faceZVec);
          const rotationEuler = new THREE.Euler().setFromRotationMatrix(rotMat, 'YXZ');
          const rotationQuaternion = new THREE.Quaternion().setFromRotationMatrix(rotMat);
          
          // Match 3D model scale beautifully with actual faces cheek-to-cheek proportion
          const specsPhysicalWidth = (config.width * 2 + config.bridgeWidth + config.thickness * 2);
          const targetWorldWidth = EL_World.distanceTo(ER_World) * 2.12;
          const scaleMultiplier = targetWorldWidth / specsPhysicalWidth;
          const modelScale = new THREE.Vector3(scaleMultiplier, scaleMultiplier, scaleMultiplier);
          
          // Sit group safely on the midpoint between both eyes with customized try-on nose depth
          const eyeMidpoint = new THREE.Vector3().addVectors(EL_World, ER_World).multiplyScalar(0.5);
          // Align the horizontal midpoint / centerline of the frame exactly with the eye line (zero vertical offset)
          const modelPosition = eyeMidpoint.clone()
            .addScaledVector(faceZVec, depthOffset);
          
          // Push transform instantly which the Three.js read thread collects
          faceDataRef.current = {
            detected: true,
            position: modelPosition,
            rotation: rotationEuler,
            quaternion: rotationQuaternion,
            scale: modelScale
          };
        } else {
          faceDataRef.current.detected = false;
        }
      } else {
        faceDataRef.current.detected = false;
      }
      
      if (cameraActive) {
        animationId = requestAnimationFrame(runFrameTracking);
      }
    };
    
    if (cameraActive && landmarker) {
      animationId = requestAnimationFrame(runFrameTracking);
    }
    
    return () => {
      cancelAnimationFrame(animationId);
    };
  }, [cameraActive, landmarker, videoAspect, config, depthOffset]);

  const handleToggleCamera = () => {
    setCameraActive(!cameraActive);
  };

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        width: '100vw',
        backgroundColor: '#000000',
        color: '#cbd5e1',
        fontFamily: '"Inter", sans-serif',
        userSelect: 'none',
        boxSizing: 'border-box',
        overflow: 'hidden',
        margin: 0,
        padding: 0
      }}
    >
      {/* Centered 9:16 vertical view frame */}
      <div
        style={{
          position: 'relative',
          height: '100vh',
          maxHeight: 'calc(100vw * 16 / 9)',
          aspectRatio: '9/16',
          backgroundColor: '#020408',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          boxShadow: '0 0 80px rgba(0, 0, 0, 0.85)',
          overflow: 'hidden',
          padding: 0,
          margin: 0,
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        
        {/* Upper HUD Overlays */}
        <header
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '48px',
            padding: '0 16px',
            background: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            zIndex: 30,
            boxSizing: 'border-box'
          }}
        >
          <div />

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            {cameraActive && (
              <span
                style={{
                  fontSize: '9px',
                  fontFamily: '"JetBrains Mono", monospace',
                  backgroundColor: 'rgba(0, 0, 0, 0.4)',
                  backdropFilter: 'blur(8px)',
                  WebkitBackdropFilter: 'blur(8px)',
                  padding: '2px 8px',
                  borderRadius: '9999px',
                  border: '1px solid rgba(255, 255, 255, 0.05)',
                  color: '#ffffff'
                }}
              >
                Active Try-On
              </span>
            )}
            <div
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '9999px',
                backgroundColor: cameraActive ? '#ffffff' : '#374151'
              }}
            />
          </div>
        </header>

        {/* Flush-fitting Viewport layer */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            background: cameraActive 
              ? 'radial-gradient(circle, #0c101c 0%, #03050a 100%)' 
              : 'linear-gradient(to bottom, #dbeafe 0%, #ffffff 50%)',
            overflow: 'hidden',
            padding: 0,
            margin: 0,
            border: 'none'
          }}
        >
          
          {/* 1. Live Camera Feed */}
          {cameraActive && (
            <video
              ref={videoRef}
              style={{
                position: 'absolute',
                inset: 0,
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                transform: 'scaleX(-1)',
                zIndex: 0,
                padding: 0,
                margin: 0,
                border: 'none',
                boxSizing: 'border-box'
              }}
              playsInline
              muted
              autoPlay
            />
          )}

          {/* 2. Grid dots decorative backdrop if Showroom model is active */}
          {!cameraActive && (
            <div
              style={{
                position: 'absolute',
                inset: 0,
                pointerEvents: 'none',
                opacity: 0.1,
                zIndex: 0,
                backgroundImage: 'radial-gradient(#94a3b8 1px, transparent 1px)', 
                backgroundSize: '32px 32px',
                backgroundPosition: 'center'
              }}
            />
          )}

          {/* 3. 3D WebGL Overlay Layers */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              zIndex: 10,
              padding: 0,
              margin: 0
            }}
          >
            <GlassesCanvas 
              config={config} 
              faceDataRef={faceDataRef} 
              fallbackMode={!cameraActive} 
              autoRotate={autoRotate}
            />
          </div>

          {/* 4. Tracking Initialization State Cover */}
          {cameraActive && !landmarker && (
            <div
              style={{
                position: 'absolute',
                inset: 0,
                backgroundColor: 'rgba(2, 4, 8, 0.9)',
                zIndex: 25,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '12px'
              }}
            >
              <RefreshCw
                style={{
                  width: '24px',
                  height: '24px',
                  color: '#a5b4fc',
                  animation: 'spin 1s linear infinite'
                }}
              />
              <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#ffffff' }}>
                Initializing AR tracking...
              </span>
            </div>
          )}

          {/* 5. Blocked Camera Access Status overlays */}
          {cameraPermission === false && cameraActive && (
            <div
              style={{
                position: 'absolute',
                inset: 0,
                backgroundColor: 'rgba(2, 4, 8, 0.95)',
                zIndex: 25,
                padding: '24px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '12px',
                textAlign: 'center',
                boxSizing: 'border-box'
              }}
            >
              <AlertCircle style={{ width: '32px', height: '32px', color: '#f43f5e' }} />
              <span
                style={{
                  fontSize: '12px',
                  fontWeight: '600',
                  color: '#ffffff'
                }}
              >
                Camera Permission Blocked
              </span>
              <p
                style={{
                  fontSize: '10px',
                  color: '#94a3b8',
                  lineHeight: '1.6',
                  maxWidth: '320px'
                }}
              >
                To try on customizable 3D spectacles in real time, enable camera permissions in your web browser interface and tap "Start Try-on".
              </p>
              <button
                onClick={handleToggleCamera}
                style={{
                  marginTop: '8px',
                  padding: '6px 16px',
                  backgroundColor: '#ffffff',
                  color: '#020408',
                  fontWeight: 'bold',
                  fontSize: '12px',
                  borderRadius: '8px',
                  border: 'none',
                  cursor: 'pointer',
                  outline: 'none'
                }}
              >
                Return to Showroom
              </button>
            </div>
          )}

        </div>

        {/* Floating Customised Controls UI Panel */}
        <div
          style={{
            position: 'absolute',
            bottom: '20px',
            left: '16px',
            right: '16px',
            zIndex: 30,
            padding: 0,
            margin: 0
          }}
        >
          <GlassesControls 
            config={config} 
            onChange={setConfig}
            depthOffset={depthOffset}
            onDepthOffsetChange={setDepthOffset}
            cameraActive={cameraActive}
            onToggleCamera={handleToggleCamera}
            autoRotate={autoRotate}
            onToggleAutoRotate={() => setAutoRotate(!autoRotate)}
          />
        </div>

      </div>

      {/* Embedded CSS rules for standard keyframe animations (like spin loader) */}
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
