"use client";

import React, { useState, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { 
  Compass, 
  Layers, 
  Activity, 
  Eye, 
  Sparkles, 
  Volume2, 
  VolumeX, 
  Maximize, 
  Minimize,
  Sliders,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Route, WeatherForecast, SelectedWeatherPoint, AppSettings } from '@/types';
import { WeatherSourcePreferences } from '@/types/weather-sources';
import { AtmosphericParticles } from './AtmosphericParticles';
import { FloatingWindowArray } from './FloatingWindowArray';
import { isAudioMuted, setAudioMuted, playTactileClick } from '@/lib/audio-fx';

type CameraTargetMode = 'overview' | 'left' | 'center' | 'right';

const CAMERA_TARGETS: Record<CameraTargetMode, { pos: [number, number, number]; lookAt: [number, number, number] }> = {
  overview: { pos: [0, 0, 8.6], lookAt: [0, 0, 0] },
  left: { pos: [-3.5, 0, 4.2], lookAt: [-3.5, 0, 0.35] },
  center: { pos: [0, 0, 4.2], lookAt: [0, 0, 0] },
  right: { pos: [3.55, 0, 4.2], lookAt: [3.55, 0, 0.35] },
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
  const targetPos = useRef(new THREE.Vector3(0, 0, 8.6));

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

    // Smooth lerp camera position and lookAt
    const lerpFactor = Math.min(delta * 4.0, 0.2);
    state.camera.position.lerp(targetPos.current, lerpFactor);
    currentLookAt.current.lerp(targetLookAt.current, lerpFactor);
    state.camera.lookAt(currentLookAt.current);
  });

  return null;
}

// Inverted Atmospheric Boundary Sphere with subtle wireframe & horizon ring
function AtmosphericSphere() {
  return (
    <group name="atmospheric-sphere">
      {/* Outer inverted boundary sphere */}
      <mesh>
        <sphereGeometry args={[35, 32, 32]} />
        <meshBasicMaterial
          color="#061220"
          side={THREE.BackSide}
          depthWrite={false}
        />
      </mesh>

      {/* Subtle glowing wireframe longitude/latitude cage */}
      <mesh>
        <sphereGeometry args={[34.8, 24, 24]} />
        <meshBasicMaterial
          color="#0ea5e9"
          wireframe
          transparent
          opacity={0.045}
          side={THREE.BackSide}
          depthWrite={false}
        />
      </mesh>

      {/* Horizon Tactical Meridian Ring */}
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, -2.8, 0]}>
        <ringGeometry args={[14, 14.05, 64]} />
        <meshBasicMaterial
          color="#06b6d4"
          side={THREE.DoubleSide}
          transparent
          opacity={0.2}
        />
      </mesh>

      {/* Sub-Horizon Radar Grid Lines */}
      <gridHelper
        args={[28, 28, '#0ea5e9', '#0f172a']}
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
    <div className="w-screen h-screen relative overflow-hidden bg-[#070a10] select-none">
      {/* ========================================================================= */}
      {/* 1. TOP TACTICAL NAVIGATION OVERLAY (DOM)                                  */}
      {/* ========================================================================= */}
      <header className="absolute top-0 inset-x-0 z-30 h-12 px-4 bg-slate-950/75 backdrop-blur-xl border-b border-cyan-500/20 flex items-center justify-between font-mono text-xs text-slate-200 pointer-events-auto">
        {/* Brand & Mission Status */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-cyan-500 shadow-[0_0_10px_rgba(6,182,212,0.9)]" />
            </span>
            <span className="font-bold tracking-wider text-slate-100 text-sm">
              FORECASTER <span className="text-cyan-400 font-normal text-xs">SPATIAL // 3D</span>
            </span>
          </div>

          <span className="hidden sm:inline text-slate-700">|</span>
          <span className="hidden sm:inline text-[10px] text-slate-400">
            ATMOSPHERIC EXPEDITION RADAR
          </span>
        </div>

        {/* Center: Camera Navigation Focus Controls & Zoom */}
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-slate-900/90 border border-slate-800 rounded-xl p-0.5 text-[11px] gap-0.5">
            <button
              type="button"
              onClick={() => handleSelectCamera('left')}
              className={cn(
                "px-2.5 py-1 rounded-lg transition-all cursor-pointer",
                cameraMode === 'left'
                  ? "bg-cyan-500/20 border border-cyan-500/50 text-cyan-300 font-bold shadow-xs"
                  : "text-slate-400 hover:text-slate-200"
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
                  ? "bg-cyan-500/20 border border-cyan-500/50 text-cyan-300 font-bold shadow-xs"
                  : "text-slate-400 hover:text-slate-200"
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
                  ? "bg-cyan-500/20 border border-cyan-500/50 text-cyan-300 font-bold shadow-xs"
                  : "text-slate-400 hover:text-slate-200"
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
                  ? "bg-cyan-500/20 border border-cyan-500/50 text-cyan-300 font-bold shadow-xs"
                  : "text-slate-400 hover:text-slate-200"
              )}
            >
              Panorama
            </button>
          </div>

          {/* Quick Zoom Controller */}
          <div className="hidden sm:flex items-center bg-slate-900/90 border border-slate-800 rounded-xl px-1.5 py-0.5 text-[11px] gap-1">
            <button
              type="button"
              onClick={() => {
                playTactileClick();
                setZoomOffset((z) => Math.min(z + 1.2, 4.0));
              }}
              title="Zoom Out (Expand Field)"
              className="px-1.5 py-0.5 rounded text-slate-400 hover:text-cyan-300 hover:bg-slate-800 transition-colors cursor-pointer font-bold"
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
              className="px-1 font-mono text-[10px] text-slate-400 hover:text-slate-200 cursor-pointer"
            >
              {zoomOffset === 0 ? '100%' : `${Math.round((8.6 / (8.6 + zoomOffset)) * 100)}%`}
            </button>
            <button
              type="button"
              onClick={() => {
                playTactileClick();
                setZoomOffset((z) => Math.max(z - 1.2, -2.4));
              }}
              title="Zoom In"
              className="px-1.5 py-0.5 rounded text-slate-400 hover:text-cyan-300 hover:bg-slate-800 transition-colors cursor-pointer font-bold"
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
              className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-cyan-300 transition-all text-[11px] cursor-pointer"
            >
              2D Dock View
            </button>
          )}

          <button
            type="button"
            onClick={toggleSound}
            title={muted ? 'Unmute audio' : 'Mute audio'}
            className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-cyan-400 transition-colors cursor-pointer"
          >
            {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4 text-emerald-400" />}
          </button>
        </div>
      </header>

      {/* ========================================================================= */}
      {/* 2. FULL-SCREEN R3F WEBGL CANVAS (FOV: 46, POSITION: [0, 0, 8.6])          */}
      {/* ========================================================================= */}
      <Canvas
        camera={{ fov: 46, position: [0, 0, 8.6], near: 0.1, far: 100 }}
        dpr={[1, 1.5]}
        gl={{
          antialias: true,
          powerPreference: 'high-performance',
          alpha: false,
        }}
        className="w-full h-full"
      >
        {/* Ambient & Angled Lighting */}
        <ambientLight intensity={0.65} />
        
        {/* Cyan rim spot light catching left glass edges */}
        <spotLight
          position={[-6, 7, 5]}
          angle={0.6}
          penumbra={1}
          intensity={1.8}
          color="#38bdf8"
        />

        {/* Amber rim spot light catching right glass edges */}
        <spotLight
          position={[6, 7, 5]}
          angle={0.6}
          penumbra={1}
          intensity={1.5}
          color="#f59e0b"
        />

        {/* Front center fill light */}
        <directionalLight position={[0, 4, 6]} intensity={0.8} color="#f8fafc" />

        {/* Under-glow point light illuminating sub-radar floor */}
        <pointLight position={[0, -3.5, 3]} intensity={0.6} color="#06b6d4" />

        {/* Atmospheric Boundary Sphere */}
        <AtmosphericSphere />

        {/* Sparkles + Wind-Blown Leaf Physics */}
        <AtmosphericParticles />

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
    </div>
  );
}
