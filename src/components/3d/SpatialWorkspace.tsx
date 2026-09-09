"use client";

import React, { useState, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { 
  Volume2, 
  VolumeX 
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Route, WeatherForecast, SelectedWeatherPoint, AppSettings } from '@/types';
import { WeatherSourcePreferences } from '@/types/weather-sources';
import { DustAtmosphere } from './DustAtmosphere';
import { FloatingWindowArray } from './FloatingWindowArray';
import { setAudioMuted, playTactileClick } from '@/lib/audio-fx';

type CameraTargetMode = 'overview' | 'left' | 'center' | 'right';

const CAMERA_TARGETS: Record<CameraTargetMode, { pos: [number, number, number]; lookAt: [number, number, number] }> = {
  overview: { pos: [0, 0, 7.2], lookAt: [0, 0, 0] },
  left: { pos: [-3.5, 0, 3.8], lookAt: [-3.5, 0, 0.45] },
  center: { pos: [0, 0, 3.8], lookAt: [0, 0, 0] },
  right: { pos: [3.5, 0, 3.8], lookAt: [3.5, 0, 0.45] },
};

function CameraRig({ 
  targetMode, 
  zoomOffset = 0,
  isHoveringHUD = false,
}: { 
  targetMode: CameraTargetMode; 
  zoomOffset?: number;
  isHoveringHUD?: boolean;
}) {
  const currentLookAt = useRef(new THREE.Vector3(0, 0, 0));
  const targetLookAt = useRef(new THREE.Vector3(0, 0, 0));
  const targetPos = useRef(new THREE.Vector3(0, 0, 7.2));

  useFrame((state, delta) => {
    const config = CAMERA_TARGETS[targetMode];

    // Mouse parallax offset (frozen when interacting with HUD to guarantee rock-solid map & chart responsiveness)
    const parallaxX = isHoveringHUD ? 0 : state.pointer.x * 0.35;
    const parallaxY = isHoveringHUD ? 0 : state.pointer.y * 0.18;

    targetPos.current.set(
      config.pos[0] + (targetMode === 'overview' ? parallaxX : parallaxX * 0.2),
      config.pos[1] + (targetMode === 'overview' ? parallaxY : parallaxY * 0.2),
      config.pos[2] + zoomOffset
    );

    targetLookAt.current.set(
      config.lookAt[0] + (targetMode === 'overview' ? parallaxX * 0.12 : 0),
      config.lookAt[1] + (targetMode === 'overview' ? parallaxY * 0.08 : 0),
      config.lookAt[2]
    );

    // Smooth lerp camera position and lookAt with inertia dampening
    const lerpFactor = Math.min(delta * 3.8, 0.18);
    state.camera.position.lerp(targetPos.current, lerpFactor);
    currentLookAt.current.lerp(targetLookAt.current, lerpFactor);
    state.camera.lookAt(currentLookAt.current);
  });

  return null;
}

// Inverted Atmospheric Boundary Sphere with warm dust fog & horizon ring
function AtmosphericSphere() {
  return (
    <group name="atmospheric-sphere">
      {/* Warm dust fog gradient */}
      <fog attach="fog" args={['#12100E', 12, 38]} />

      {/* Outer inverted boundary sphere */}
      <mesh>
        <sphereGeometry args={[35, 32, 32]} />
        <meshBasicMaterial
          color="#181310"
          side={THREE.BackSide}
          depthWrite={false}
        />
      </mesh>

      {/* Subtle glowing weathered bronze wireframe cage */}
      <mesh>
        <sphereGeometry args={[34.8, 24, 24]} />
        <meshBasicMaterial
          color="#453A2E"
          wireframe
          transparent
          opacity={0.075}
          side={THREE.BackSide}
          depthWrite={false}
        />
      </mesh>

      {/* Horizon Tactical Meridian Ring */}
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, -2.8, 0]}>
        <ringGeometry args={[14, 14.05, 64]} />
        <meshBasicMaterial
          color="#E5A93C"
          side={THREE.DoubleSide}
          transparent
          opacity={0.25}
        />
      </mesh>

      {/* Sub-Horizon Radar Grid Lines */}
      <gridHelper
        args={[28, 28, '#E5A93C', '#2C251F']}
        position={[0, -2.8, 0]}
      />
    </group>
  );
}

interface SpatialWorkspaceProps {
  route: Route | null;
  forecasts: WeatherForecast[];
  settings: AppSettings;
  preferences: WeatherSourcePreferences;
  selectedPoint: SelectedWeatherPoint | null;
  isLoading: boolean;
  onRouteLoaded: (route: Route) => void;
  onResetRoute: () => void;
  onSettingsChange: (settings: AppSettings) => void;
  onPreferencesChange: (prefs: WeatherSourcePreferences) => void;
  onGenerateForecast: () => void;
  onPointSelect: (forecastIndex: number, source: 'timeline' | 'chart' | 'map') => void;
  onToggleViewMode?: () => void;
  onSaveExpedition?: () => void;
  isSavingExpedition?: boolean;
}

export function SpatialWorkspace({
  route,
  forecasts,
  settings,
  preferences,
  selectedPoint,
  isLoading,
  onRouteLoaded,
  onResetRoute,
  onSettingsChange,
  onPreferencesChange,
  onGenerateForecast,
  onPointSelect,
  onToggleViewMode,
  onSaveExpedition,
  isSavingExpedition,
}: SpatialWorkspaceProps) {
  const [cameraMode, setCameraMode] = useState<CameraTargetMode>('overview');
  const [zoomOffset, setZoomOffset] = useState<number>(0);
  const [isHoveringHUD, setIsHoveringHUD] = useState(false);
  const [muted, setMuted] = useState(false);

  const toggleSound = () => {
    const next = !muted;
    setMuted(next);
    setAudioMuted(next);
    playTactileClick();
  };

  const handleSelectCamera = (mode: CameraTargetMode) => {
    playTactileClick();
    setCameraMode(mode);
  };

  return (
    <div className="w-screen h-screen relative overflow-hidden bg-[#12100E] select-none">
      {/* ========================================================================= */}
      {/* 1. FULL-SCREEN R3F WEBGL CANVAS (FOV: 50, POSITION: [0, 0, 7.2])          */}
      {/* ========================================================================= */}
      <Canvas
        camera={{ fov: 50, position: [0, 0, 7.2], near: 0.1, far: 100 }}
        dpr={[1, 1.5]}
        gl={{
          antialias: true,
          powerPreference: 'high-performance',
          alpha: false,
        }}
        className="w-full h-full bg-[#12100E]"
      >
        {/* Cinematic Warm Lighting:
            - Warm ambient light (#2C251F)
            - Angled directional key light catching glass top rims (#F5F2EB)
            - Warm point light behind panels (#E5A93C)
        */}
        <ambientLight color="#2C251F" intensity={0.95} />

        {/* Angled directional key light catching glass top rims */}
        <directionalLight position={[0, 6, 7]} intensity={1.2} color="#F5F2EB" />

        {/* Warm point light behind panels */}
        <pointLight position={[0, 0, -2.5]} intensity={1.6} color="#E5A93C" distance={18} />

        {/* Rim spots catching left and right glass edges */}
        <spotLight
          position={[-6, 7, 5]}
          angle={0.6}
          penumbra={1}
          intensity={1.3}
          color="#F5F2EB"
        />
        <spotLight
          position={[6, 7, 5]}
          angle={0.6}
          penumbra={1}
          intensity={1.3}
          color="#E5A93C"
        />

        {/* Atmospheric Boundary Sphere */}
        <AtmosphericSphere />

        {/* Animated Wind-Blown Dust & Silt Physics */}
        <DustAtmosphere />

        {/* 3 Curved Floating Glass HUD Panels */}
        <FloatingWindowArray
          route={route}
          forecasts={forecasts}
          settings={settings}
          preferences={preferences}
          selectedPoint={selectedPoint}
          isLoading={isLoading}
          onRouteLoaded={onRouteLoaded}
          onResetRoute={onResetRoute}
          onSettingsChange={onSettingsChange}
          onPreferencesChange={onPreferencesChange}
          onGenerateForecast={onGenerateForecast}
          onPointSelect={onPointSelect}
          onSaveExpedition={onSaveExpedition}
          isSavingExpedition={isSavingExpedition}
          onFocusCamera={handleSelectCamera}
          activeCameraMode={cameraMode}
          onHoverHUDChange={setIsHoveringHUD}
        />

        {/* Dynamic Camera Parallax & Smooth Lerp Rig with Zoom */}
        <CameraRig 
          targetMode={cameraMode} 
          zoomOffset={zoomOffset} 
          isHoveringHUD={isHoveringHUD} 
        />
      </Canvas>

      {/* ========================================================================= */}
      <header 
        style={{ zIndex: 2147483647 }}
        className="fixed top-0 inset-x-0 h-12 px-4 bg-[#12100E]/95 backdrop-blur-xl border-b border-[#453A2E] flex items-center justify-between font-mono text-xs text-[#F5F2EB] pointer-events-auto shadow-[0_4px_25px_rgba(0,0,0,0.7)]"
      >
        {/* Brand & Mission Status */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#E5A93C] opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#E5A93C] shadow-[0_0_10px_rgba(229,169,60,0.9)]" />
            </span>
            <span className="font-bold tracking-wider text-[#F5F2EB] text-sm">
              FORECASTER <span className="text-[#E5A93C] font-normal text-xs">ARID FIELD DOSSIER // 3D</span>
            </span>
          </div>

          <span className="hidden sm:inline text-[#453A2E]">|</span>
          <span className="hidden sm:inline text-[10px] text-[#A89F91]">
            ATMOSPHERIC EXPEDITION RADAR
          </span>
        </div>

        {/* Center: Camera Navigation Focus Controls & Zoom */}
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-[#1c1814]/90 border border-[#453A2E] rounded-xl p-0.5 text-[11px] gap-0.5">
            <button
              type="button"
              onClick={() => handleSelectCamera('left')}
              className={cn(
                "px-2.5 py-1 rounded-lg transition-all cursor-pointer",
                cameraMode === 'left'
                  ? "bg-[#E5A93C]/20 border border-[#E5A93C]/60 text-[#E5A93C] font-bold shadow-xs"
                  : "text-[#A89F91] hover:text-[#F5F2EB]"
              )}
            >
              01 // Ingestion
            </button>

            <button
              type="button"
              onClick={() => handleSelectCamera('center')}
              className={cn(
                "px-2.5 py-1 rounded-lg transition-all cursor-pointer",
                cameraMode === 'center'
                  ? "bg-[#E5A93C]/20 border border-[#E5A93C]/60 text-[#E5A93C] font-bold shadow-xs"
                  : "text-[#A89F91] hover:text-[#F5F2EB]"
              )}
            >
              02 // Radar Map
            </button>

            <button
              type="button"
              onClick={() => handleSelectCamera('right')}
              className={cn(
                "px-2.5 py-1 rounded-lg transition-all cursor-pointer",
                cameraMode === 'right'
                  ? "bg-[#E5A93C]/20 border border-[#E5A93C]/60 text-[#E5A93C] font-bold shadow-xs"
                  : "text-[#A89F91] hover:text-[#F5F2EB]"
              )}
            >
              03 // Telemetry
            </button>

            <button
              type="button"
              onClick={() => handleSelectCamera('overview')}
              className={cn(
                "px-2.5 py-1 rounded-lg transition-all cursor-pointer",
                cameraMode === 'overview'
                  ? "bg-[#E5A93C]/20 border border-[#E5A93C]/60 text-[#E5A93C] font-bold shadow-xs"
                  : "text-[#A89F91] hover:text-[#F5F2EB]"
              )}
            >
              Panorama
            </button>
          </div>

          {/* Quick Zoom Controller */}
          <div className="hidden sm:flex items-center bg-[#1c1814]/90 border border-[#453A2E] rounded-xl px-1.5 py-0.5 text-[11px] gap-1">
            <button
              type="button"
              onClick={() => {
                playTactileClick();
                setZoomOffset((z) => Math.min(z + 1.2, 4.0));
              }}
              title="Zoom Out (Expand Field)"
              className="px-1.5 py-0.5 rounded text-[#A89F91] hover:text-[#E5A93C] hover:bg-[#28221b] transition-colors cursor-pointer font-bold"
            >
              −
            </button>
            <button
              type="button"
              onClick={() => {
                playTactileClick();
                setZoomOffset(0);
              }}
              title="Reset Zoom"
              className="px-1 font-mono text-[10px] text-[#A89F91] hover:text-[#F5F2EB] cursor-pointer"
            >
              {zoomOffset === 0 ? '100%' : `${Math.round((7.2 / (7.2 + zoomOffset)) * 100)}%`}
            </button>
            <button
              type="button"
              onClick={() => {
                playTactileClick();
                setZoomOffset((z) => Math.max(z - 1.2, -2.4));
              }}
              title="Zoom In"
              className="px-1.5 py-0.5 rounded text-[#A89F91] hover:text-[#E5A93C] hover:bg-[#28221b] transition-colors cursor-pointer font-bold"
            >
              +
            </button>
          </div>
        </div>

        {/* Right: Sound & Mode Toggle */}
        <div className="flex items-center gap-2">
          {onToggleViewMode && (
            <button
              type="button"
              onClick={() => {
                playTactileClick();
                onToggleViewMode();
              }}
              title="Switch to 2D Dock View"
              className="px-2.5 py-1 rounded-lg bg-[#1c1814] hover:bg-[#28221b] border border-[#453A2E] text-[#A89F91] hover:text-[#E5A93C] transition-all text-[11px] cursor-pointer"
            >
              2D Dock View
            </button>
          )}

          <button
            type="button"
            onClick={toggleSound}
            title={muted ? 'Unmute audio' : 'Mute audio'}
            className="p-1.5 rounded-lg hover:bg-[#28221b] text-[#A89F91] hover:text-[#E5A93C] transition-colors cursor-pointer"
          >
            {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4 text-[#82937D]" />}
          </button>
        </div>
      </header>
    </div>
  );
}
