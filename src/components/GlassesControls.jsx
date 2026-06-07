import React, { useState } from 'react';
import { 
  RotateCcw, 
  Camera, 
  CameraOff, 
  RefreshCw,
  Info,
  Heart,
  Diamond,
  Ban
} from 'lucide-react';
import { exportSpectaclesToSTL } from '../utils/stlExporter.js';

const ButterflyIcon = ({ size = 16, ...props }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor" style={{ display: 'block', ...props.style }} {...props}>
    <path d="M 12 12 C 16.2 9.2, 21.8 3.6, 21.8 7.8 C 21.8 12, 17.6 13.4, 12 11.3 C 17.6 14.1, 19.7 19.7, 16.2 19.7 C 13.4 19.7, 12.7 14.8, 12 12 C 11.3 14.8, 10.6 19.7, 7.8 19.7 C 4.3 19.7, 6.4 14.1, 12 11.3 C 6.4 13.4, 2.2 12, 2.2 7.8 C 2.2 3.6, 7.8 9.2, 12 12 Z" />
  </svg>
);

const MuiDownloadIcon = ({ size = 16, ...props }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor" style={{ display: 'block', ...props.style }} {...props}>
    <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z" />
  </svg>
);

const SWATCHES = [
  { value: '#222828', label: 'Black' },
  { value: '#F0F0F0', label: 'Silver White' },
  { value: '#55DE78', label: 'Green' },
  { value: '#1695E2', label: 'Blue' },
  { value: '#D8E200', label: 'Lime Yellow' },
  { value: '#EC8DA8', label: 'Pink' }
];

export default function GlassesControls({ 
  config, 
  onChange, 
  depthOffset,
  onDepthOffsetChange,
  cameraActive,
  onToggleCamera,
  autoRotate,
  onToggleAutoRotate
}) {
  const [activeTab, setActiveTab] = useState('lenses');

  const updateParam = (key, val) => {
    onChange({
      ...config,
      [key]: val
    });
  };

  const resetToDefault = () => {
    onChange({
      sides: 32,
      width: 4.8,
      height: 4.8,
      thickness: 0.15,
      bridgeWidth: 2.2,
      bridgeHeight: 0.4,
      bridgeYOffset: 0.1,
      extrusionDepth: 0.22,
      bevelSize: 0.03,
      roundness: 0.5,
      frameColor: '#1c1917',
      frameMaterial: 'glossy',
      lensColor: '#b45309',
      lensOpacity: 0.3,
      templeLength: 14.2,
      templeWidth: 0.38,
      templeThickness: 0.11,
      templeFold: 0,
      showLenses: true,
      showTemples: true,
      templeDecoration: 'none',
      lensRotation: 0,
      specsColor: '#222828',
      decorationColor: '#222828'
    });
    onDepthOffsetChange(0.0);
  };

  const d = (val) => parseFloat(val.toFixed(2));

  const getSidesLabel = (sides) => {
    if (sides === 3) return 'Triangle';
    if (sides === 4) return 'Square / Wayfarer';
    if (sides === 5) return 'Geometric Pentagon';
    if (sides === 6) return 'Modern Hexagon';
    if (sides === 32) return 'Classic Round';
    if (sides === 100) return "Cat's Eye";
    return 'Classic Round';
  };

  const getSliderValueForSides = (sides) => {
    if (sides === 3) return 1;
    if (sides === 4) return 2;
    if (sides === 5) return 3;
    if (sides === 6) return 4;
    if (sides === 32) return 5;
    if (sides === 100) return 6;
    return 5;
  };

  const getSidesFromSliderValue = (val) => {
    if (val === 1) return 3;
    if (val === 2) return 4;
    if (val === 3) return 5;
    if (val === 4) return 6;
    if (val === 5) return 32;
    return 100;
  };

  return (
    <div style={{
      width: '100%',
      backgroundColor: 'rgba(15, 23, 42, 0.3)',
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      border: 'none',
      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)',
      borderRadius: '16px',
      padding: '14px 16px',
      display: 'flex',
      flexDirection: 'column',
      gap: '12px',
      boxSizing: 'border-box',
      fontFamily: '"Inter", sans-serif',
      color: '#ffffff',
      userSelect: 'none'
    }}>
      {/* Tab Selectors */}
      <div style={{
        display: 'flex',
        borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
        paddingBottom: '8px',
        gap: '6px',
        overflowX: 'auto',
        scrollbarWidth: 'none',
        flexShrink: 0
      }}>
        <button
          onClick={() => setActiveTab('lenses')}
          style={{
            padding: '6px 12px',
            borderRadius: '8px',
            fontSize: '12px',
            fontWeight: '700',
            cursor: 'pointer',
            border: activeTab === 'lenses' ? '1px solid rgba(255, 255, 255, 0.3)' : '1px solid transparent',
            backgroundColor: activeTab === 'lenses' ? 'rgba(255, 255, 255, 0.15)' : 'transparent',
            color: activeTab === 'lenses' ? '#ffffff' : 'rgba(255, 255, 255, 0.55)',
            whiteSpace: 'nowrap',
            outline: 'none',
            fontFamily: '"Inter", sans-serif'
          }}
        >
          Lenses
        </button>
        <button
          onClick={() => setActiveTab('frame')}
          style={{
            padding: '6px 12px',
            borderRadius: '8px',
            fontSize: '12px',
            fontWeight: '700',
            cursor: 'pointer',
            border: activeTab === 'frame' ? '1px solid rgba(255, 255, 255, 0.3)' : '1px solid transparent',
            backgroundColor: activeTab === 'frame' ? 'rgba(255, 255, 255, 0.15)' : 'transparent',
            color: activeTab === 'frame' ? '#ffffff' : 'rgba(255, 255, 255, 0.55)',
            whiteSpace: 'nowrap',
            outline: 'none',
            fontFamily: '"Inter", sans-serif'
          }}
        >
          Temples &amp; Bridge
        </button>
        <button
          onClick={() => setActiveTab('material')}
          style={{
            padding: '6px 12px',
            borderRadius: '8px',
            fontSize: '12px',
            fontWeight: '700',
            cursor: 'pointer',
            border: activeTab === 'material' ? '1px solid rgba(255, 255, 255, 0.3)' : '1px solid transparent',
            backgroundColor: activeTab === 'material' ? 'rgba(255, 255, 255, 0.15)' : 'transparent',
            color: activeTab === 'material' ? '#ffffff' : 'rgba(255, 255, 255, 0.55)',
            whiteSpace: 'nowrap',
            outline: 'none',
            fontFamily: '"Inter", sans-serif'
          }}
        >
          Material
        </button>
        <button
          onClick={() => setActiveTab('export')}
          title="Export STL for 3D Printing"
          style={{
            marginLeft: 'auto',
            padding: '6px 10px',
            borderRadius: '8px',
            cursor: 'pointer',
            border: activeTab === 'export' ? '1px solid rgba(255, 255, 255, 0.3)' : '1px solid transparent',
            backgroundColor: activeTab === 'export' ? 'rgba(255, 255, 255, 0.15)' : 'transparent',
            color: activeTab === 'export' ? '#ffffff' : 'rgba(255, 255, 255, 0.55)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            outline: 'none',
          }}
        >
          <MuiDownloadIcon style={{ width: '16px', height: '16px' }} />
        </button>
      </div>

      {/* Sliders viewport container - Tall naturally fitting container without manual scrolling */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '14px',
        boxSizing: 'border-box'
      }}>
        {activeTab === 'lenses' && (
          <>
            {/* Sides */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'rgba(255, 255, 255, 0.7)', fontWeight: '600', padding: '0 2px' }}>
                <span>Lens Shape</span>
                <span style={{ color: '#ffffff', fontFamily: '"JetBrains Mono", monospace', fontWeight: '700' }}>
                  {getSidesLabel(config.sides)}
                </span>
              </div>
              <input
                type="range"
                min="1"
                max="6"
                step="1"
                className="custom-slider"
                value={getSliderValueForSides(config.sides)}
                onChange={(e) => updateParam('sides', getSidesFromSliderValue(parseInt(e.target.value)))}
                style={{ width: '100%', height: '4px', backgroundColor: 'rgba(255, 255, 255, 0.15)', borderRadius: '4px', outline: 'none', appearance: 'none', WebkitAppearance: 'none', cursor: 'pointer', margin: '4px 0 0 0' }}
              />
            </div>

            {/* Width & Height */}
            <div style={{ display: 'flex', gap: '12px' }}>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'rgba(255, 255, 255, 0.7)', fontWeight: '600', padding: '0 2px' }}>
                  <span>Lens Width</span>
                  <span style={{ color: '#ffffff', fontFamily: '"JetBrains Mono", monospace', fontWeight: '700' }}>{d(config.width)}cm</span>
                </div>
                <input
                  type="range"
                  min="4.0"
                  max="6.5"
                  step="0.05"
                  className="custom-slider"
                  value={config.width}
                  onChange={(e) => updateParam('width', parseFloat(e.target.value))}
                  style={{ width: '100%', height: '4px', backgroundColor: 'rgba(255, 255, 255, 0.15)', borderRadius: '4px', outline: 'none', appearance: 'none', WebkitAppearance: 'none', cursor: 'pointer', margin: '4px 0 0 0' }}
                />
              </div>

              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'rgba(255, 255, 255, 0.7)', fontWeight: '600', padding: '0 2px' }}>
                  <span>Lens Height</span>
                  <span style={{ color: '#ffffff', fontFamily: '"JetBrains Mono", monospace', fontWeight: '700' }}>{d(config.height)}cm</span>
                </div>
                <input
                  type="range"
                  min="2.5"
                  max="5.5"
                  step="0.05"
                  className="custom-slider"
                  value={config.height}
                  onChange={(e) => updateParam('height', parseFloat(e.target.value))}
                  style={{ width: '100%', height: '4px', backgroundColor: 'rgba(255, 255, 255, 0.15)', borderRadius: '4px', outline: 'none', appearance: 'none', WebkitAppearance: 'none', cursor: 'pointer', margin: '4px 0 0 0' }}
                />
              </div>
            </div>

            {/* Rim Thickness */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'rgba(255, 255, 255, 0.7)', fontWeight: '600', padding: '0 2px' }}>
                <span>Rim Thickness</span>
                <span style={{ color: '#ffffff', fontFamily: '"JetBrains Mono", monospace', fontWeight: '700' }}>{d(config.thickness)}cm</span>
              </div>
              <input
                type="range"
                min="0.15"
                max="0.80"
                step="0.01"
                className="custom-slider"
                value={config.thickness}
                onChange={(e) => updateParam('thickness', parseFloat(e.target.value))}
                style={{ width: '100%', height: '4px', backgroundColor: 'rgba(255, 255, 255, 0.15)', borderRadius: '4px', outline: 'none', appearance: 'none', WebkitAppearance: 'none', cursor: 'pointer', margin: '4px 0 0 0' }}
              />
            </div>

            {/* Corner Roundness */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'rgba(255, 255, 255, 0.7)', fontWeight: '600', padding: '0 2px' }}>
                <span>Corner Roundness (Fillet)</span>
                <span style={{ color: '#ffffff', fontFamily: '"JetBrains Mono", monospace', fontWeight: '700' }}>
                  {config.roundness <= 0.05 && 'Sharp'}
                  {config.roundness > 0.05 && config.roundness < 0.25 && 'Soft'}
                  {config.roundness >= 0.25 && 'Filleted'}
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="0.5"
                step="0.01"
                className="custom-slider"
                value={config.roundness}
                onChange={(e) => updateParam('roundness', parseFloat(e.target.value))}
                style={{ width: '100%', height: '4px', backgroundColor: 'rgba(255, 255, 255, 0.15)', borderRadius: '4px', outline: 'none', appearance: 'none', WebkitAppearance: 'none', cursor: 'pointer', margin: '4px 0 0 0' }}
              />
            </div>

            {/* Rotation */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'rgba(255, 255, 255, 0.7)', fontWeight: '600', padding: '0 2px' }}>
                <span>Rotation Orientation</span>
                <span style={{ color: '#ffffff', fontFamily: '"JetBrains Mono", monospace', fontWeight: '700' }}>{config.lensRotation}°</span>
              </div>
              <input
                type="range"
                min="0"
                max="360"
                step="1"
                className="custom-slider"
                value={config.lensRotation}
                onChange={(e) => updateParam('lensRotation', parseInt(e.target.value))}
                style={{ width: '100%', height: '4px', backgroundColor: 'rgba(255, 255, 255, 0.15)', borderRadius: '4px', outline: 'none', appearance: 'none', WebkitAppearance: 'none', cursor: 'pointer', margin: '4px 0 0 0' }}
              />
            </div>
          </>
        )}

        {activeTab === 'frame' && (
          <>
            {/* Temple Decoration Customization */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '4px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'rgba(255, 255, 255, 0.7)', fontWeight: '600', padding: '0 2px' }}>
                <span>Temple Decoration</span>
              </div>
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', padding: '6px 2px' }}>
                {[
                  { id: 'none', icon: <Ban style={{ width: '16px', height: '16px' }} />, tooltip: 'None' },
                  { id: 'heart', icon: <Heart fill="currentColor" style={{ width: '16px', height: '16px' }} />, tooltip: 'Heart' },
                  { id: 'butterfly', icon: <ButterflyIcon size={16} />, tooltip: 'Butterfly Wings' },
                  { id: 'diamond', icon: <Diamond fill="currentColor" style={{ width: '16px', height: '16px' }} />, tooltip: 'Diamond' }
                ].map((item) => {
                  const isActive = (config.templeDecoration || 'none') === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => updateParam('templeDecoration', item.id)}
                      title={item.tooltip}
                      style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '50%',
                        backgroundColor: isActive ? 'rgba(255, 255, 255, 0.25)' : 'rgba(255, 255, 255, 0.05)',
                        border: '2px solid ' + (isActive ? '#ffffff' : 'rgba(255, 255, 255, 0.15)'),
                        boxShadow: isActive ? '0 0 12px rgba(255, 255, 255, 0.35)' : 'none',
                        color: isActive ? '#ffffff' : 'rgba(255, 255, 255, 0.6)',
                        cursor: 'pointer',
                        transform: isActive ? 'scale(1.12)' : 'scale(1)',
                        transition: 'all 0.15s cubic-bezier(0.4, 0, 0.2, 1)',
                        outline: 'none',
                        boxSizing: 'border-box',
                        padding: 0,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      {item.icon}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Bridge Width & Height */}
            <div style={{ display: 'flex', gap: '12px', marginTop: '4px' }}>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'rgba(255, 255, 255, 0.7)', fontWeight: '600', padding: '0 2px' }}>
                  <span>Bridge Width</span>
                  <span style={{ color: '#ffffff', fontFamily: '"JetBrains Mono", monospace', fontWeight: '700' }}>{d(config.bridgeWidth)}cm</span>
                </div>
                <input
                  type="range"
                  min="1.2"
                  max="3.0"
                  step="0.05"
                  className="custom-slider"
                  value={config.bridgeWidth}
                  onChange={(e) => updateParam('bridgeWidth', parseFloat(e.target.value))}
                  style={{ width: '100%', height: '4px', backgroundColor: 'rgba(255, 255, 255, 0.15)', borderRadius: '4px', outline: 'none', appearance: 'none', WebkitAppearance: 'none', cursor: 'pointer', margin: '4px 0 0 0' }}
                />
              </div>

              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'rgba(255, 255, 255, 0.7)', fontWeight: '600', padding: '0 2px' }}>
                  <span>Bridge Height</span>
                  <span style={{ color: '#ffffff', fontFamily: '"JetBrains Mono", monospace', fontWeight: '700' }}>{d(config.bridgeHeight)}cm</span>
                </div>
                <input
                  type="range"
                  min="0.2"
                  max="1.2"
                  step="0.02"
                  className="custom-slider"
                  value={config.bridgeHeight}
                  onChange={(e) => updateParam('bridgeHeight', parseFloat(e.target.value))}
                  style={{ width: '100%', height: '4px', backgroundColor: 'rgba(255, 255, 255, 0.15)', borderRadius: '4px', outline: 'none', appearance: 'none', WebkitAppearance: 'none', cursor: 'pointer', margin: '4px 0 0 0' }}
                />
              </div>
            </div>

            {/* Bridge Y Elevation */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'rgba(255, 255, 255, 0.7)', fontWeight: '600', padding: '0 2px' }}>
                <span>Bridge elevation</span>
                <span style={{ color: '#ffffff', fontFamily: '"JetBrains Mono", monospace', fontWeight: '700' }}>{d(config.bridgeYOffset)}cm</span>
              </div>
              <input
                type="range"
                min="-1.2"
                max="1.2"
                step="0.02"
                className="custom-slider"
                value={config.bridgeYOffset}
                onChange={(e) => updateParam('bridgeYOffset', parseFloat(e.target.value))}
                style={{ width: '100%', height: '4px', backgroundColor: 'rgba(255, 255, 255, 0.15)', borderRadius: '4px', outline: 'none', appearance: 'none', WebkitAppearance: 'none', cursor: 'pointer', margin: '4px 0 0 0' }}
              />
            </div>

            {/* Nose distance adjustment */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', backgroundColor: 'rgba(255, 255, 255, 0.08)', padding: '10px', borderRadius: '10px', marginTop: '2px', boxSizing: 'border-box' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'rgba(255, 255, 255, 0.7)', fontWeight: '600', padding: '0 2px' }}>
                <span style={{ fontWeight: 'bold' }}>Try-on Face Depth alignment</span>
                <span style={{ color: '#ffffff', fontFamily: '"JetBrains Mono", monospace', fontWeight: '700' }}>{(depthOffset * 10).toFixed(1)} mm</span>
              </div>
              <input
                type="range"
                min="-0.8"
                max="0.8"
                step="0.02"
                className="custom-slider"
                value={depthOffset}
                onChange={(e) => onDepthOffsetChange(parseFloat(e.target.value))}
                style={{ width: '100%', height: '4px', backgroundColor: 'rgba(255, 255, 255, 0.15)', borderRadius: '4px', outline: 'none', appearance: 'none', WebkitAppearance: 'none', cursor: 'pointer', margin: '4px 0 0 0' }}
              />
            </div>
          </>
        )}
        {activeTab === 'material' && (
          <>
            {/* Specs Color Selection */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'rgba(255, 255, 255, 0.7)', fontWeight: '600', padding: '0 2px' }}>
                <span>Specs Color</span>
              </div>
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', padding: '6px 2px' }}>
                {SWATCHES.map((swatch) => {
                  const isActive = (config.specsColor || '#222828').toLowerCase() === swatch.value.toLowerCase();
                  return (
                    <button
                      key={swatch.value}
                      onClick={() => updateParam('specsColor', swatch.value)}
                      title={swatch.label}
                      style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '50%',
                        backgroundColor: swatch.value,
                        border: '2px solid ' + (isActive ? '#ffffff' : 'rgba(255, 255, 255, 0.2)'),
                        boxShadow: isActive ? '0 0 12px rgba(255, 255, 255, 0.45)' : 'none',
                        cursor: 'pointer',
                        transform: isActive ? 'scale(1.12)' : 'scale(1)',
                        transition: 'all 0.15s cubic-bezier(0.4, 0, 0.2, 1)',
                        outline: 'none',
                        boxSizing: 'border-box',
                        padding: 0,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    />
                  );
                })}
              </div>
            </div>

            {/* Decorations Color Selection */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'rgba(255, 255, 255, 0.7)', fontWeight: '600', padding: '0 2px' }}>
                <span>Decorations Color</span>
              </div>
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', padding: '6px 2px' }}>
                {SWATCHES.map((swatch) => {
                  const isActive = (config.decorationColor || '#222828').toLowerCase() === swatch.value.toLowerCase();
                  return (
                    <button
                      key={swatch.value}
                      onClick={() => updateParam('decorationColor', swatch.value)}
                      title={swatch.label}
                      style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '50%',
                        backgroundColor: swatch.value,
                        border: '2px solid ' + (isActive ? '#ffffff' : 'rgba(255, 255, 255, 0.2)'),
                        boxShadow: isActive ? '0 0 12px rgba(255, 255, 255, 0.45)' : 'none',
                        cursor: 'pointer',
                        transform: isActive ? 'scale(1.12)' : 'scale(1)',
                        transition: 'all 0.15s cubic-bezier(0.4, 0, 0.2, 1)',
                        outline: 'none',
                        boxSizing: 'border-box',
                        padding: 0,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    />
                  );
                })}
              </div>
            </div>
          </>
        )}

        {activeTab === 'export' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', padding: '14px', backgroundColor: 'rgba(255, 255, 255, 0.08)', borderRadius: '12px', boxSizing: 'border-box' }}>
              <Info style={{ width: '16px', height: '16px', color: '#ffffff', flexShrink: 0, marginTop: '2px' }} />
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#ffffff', fontFamily: '"JetBrains Mono", monospace' }}>
                  3D Printable STL Output
                </span>
                <span style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.7)', marginTop: '2px', lineHeight: '1.4' }}>
                  Export your model in 1:1 scale (in millimeters) optimized for 3D slicing.
                </span>
              </div>
            </div>
            
            <button
              id="export-stl-btn"
              onClick={() => exportSpectaclesToSTL(config)}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', width: '100%', padding: '10px 0', backgroundColor: 'rgba(255, 255, 255, 0.15)', color: '#ffffff', border: '1px solid rgba(255, 255, 255, 0.25)', fontSize: '12px', fontWeight: '700', borderRadius: '8px', cursor: 'pointer', boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)', transition: 'background-color 0.2s', outline: 'none', fontFamily: '"Inter", sans-serif' }}
            >
              <MuiDownloadIcon style={{ width: '15px', height: '15px' }} />
              Download STL file (.stl)
            </button>
          </div>
        )}
      </div>

      {/* Try-on and Reset footer row - Only keep "Start Try-on" button, remove any extra layout toggle icons */}
      <div style={{ display: 'flex', gap: '10px', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid rgba(255, 255, 255, 0.12)', paddingTop: '12px', flexShrink: 0 }}>
        <button
          onClick={onToggleCamera}
          style={{
            padding: '8px 12px',
            borderRadius: '12px',
            border: cameraActive ? '1px solid rgba(255, 255, 255, 0.25)' : 'none',
            backgroundColor: cameraActive ? 'rgba(255, 255, 255, 0.1)' : '#ffffff',
            color: cameraActive ? '#ffffff' : '#0f172a',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '11px',
            fontWeight: cameraActive ? '600' : '700',
            outline: 'none',
            boxSizing: 'border-box',
            fontFamily: '"Inter", sans-serif'
          }}
        >
          {cameraActive ? (
            <>
              <CameraOff style={{ width: '14px', height: '14px' }} />
              <span>Stop Try-on</span>
            </>
          ) : (
            <>
              <Camera style={{ width: '14px', height: '14px' }} />
              <span>Start Try-On</span>
            </>
          )}
        </button>

        <button
          onClick={resetToDefault}
          style={{
            padding: '8px 12px',
            borderRadius: '12px',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            backgroundColor: 'rgba(255, 255, 255, 0.05)',
            color: '#ffffff',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '11px',
            fontWeight: '600',
            outline: 'none',
            boxSizing: 'border-box',
            fontFamily: '"Inter", sans-serif'
          }}
        >
          <RotateCcw style={{ width: '14px', height: '14px' }} />
          <span>Reset</span>
        </button>
      </div>

      {/* Styled thumbs \& active white highlight for modern browser sliders */}
      <style>{`
        .custom-slider {
          accent-color: #ffffff !important;
        }
        .custom-slider::-webkit-slider-thumb {
          -webkit-appearance: none !important;
          appearance: none !important;
          width: 12px !important;
          height: 12px !important;
          border-radius: 50% !important;
          background: #ffffff !important;
          border: none !important;
          cursor: pointer !important;
        }
        .custom-slider::-moz-range-thumb {
          width: 12px !important;
          height: 12px !important;
          border-radius: 50% !important;
          background: #ffffff !important;
          border: none !important;
          cursor: pointer !important;
        }
      `}</style>
    </div>
  );
}
