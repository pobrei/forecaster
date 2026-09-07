"use client";

import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { useTheme } from 'next-themes';

interface AtmosphericCanvas3DProps {
  className?: string;
  isSimulatingWind?: boolean;
}

export const AtmosphericCanvas3D: React.FC<AtmosphericCanvas3DProps> = ({
  className = '',
  isSimulatingWind = true,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const { resolvedTheme } = useTheme();
  const [fps, setFps] = useState<number>(60);
  const [isInteractive, setIsInteractive] = useState<boolean>(true);

  // References for animation state
  const mouseRef = useRef<{ x: number; y: number; targetX: number; targetY: number }>({
    x: 0,
    y: 0,
    targetX: 0,
    targetY: 0,
  });

  const handlePointerMove = useCallback((e: MouseEvent | TouchEvent) => {
    let clientX = 0;
    let clientY = 0;

    if ('touches' in e && e.touches.length > 0) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else if ('clientX' in e) {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    const halfW = window.innerWidth / 2;
    const halfH = window.innerHeight / 2;
    mouseRef.current.targetX = (clientX - halfW) / halfW;
    mouseRef.current.targetY = (clientY - halfH) / halfH;
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const isDark = resolvedTheme === 'dark';

    // 1. Scene setup
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(isDark ? 0x07090e : 0xf8fafc, 0.015);

    // 2. Camera setup
    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;
    const camera = new THREE.PerspectiveCamera(55, width / height, 0.1, 1000);
    camera.position.set(0, 18, 42);
    camera.lookAt(0, 0, 0);

    // 3. Renderer setup
    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      powerPreference: 'high-performance',
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(isDark ? 0x05070a : 0xf8fafc, isDark ? 0.35 : 0.25);
    container.appendChild(renderer.domElement);

    // 4. Create Atmospheric Particle Flow Field & Topographic Waves
    const cols = 70;
    const rows = 50;
    const particleCount = cols * rows;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    const originalY = new Float32Array(particleCount);

    const spacingX = 1.3;
    const spacingZ = 1.1;
    const startX = -(cols * spacingX) / 2;
    const startZ = -(rows * spacingZ) / 2;

    // Palette definition
    const darkPalette = [
      new THREE.Color(0x00f0ff), // Cyan
      new THREE.Color(0x2563eb), // Cobalt
      new THREE.Color(0x38bdf8), // Sky Blue
      new THREE.Color(0x818cf8), // Indigo
      new THREE.Color(0xf59e0b), // Amber thermal
    ];

    const lightPalette = [
      new THREE.Color(0x0284c7), // Ocean
      new THREE.Color(0x64748b), // Slate
      new THREE.Color(0x0ea5e9), // Sky
      new THREE.Color(0x475569), // Charcoal
      new THREE.Color(0xd97706), // Warm
    ];

    const palette = isDark ? darkPalette : lightPalette;

    let idx = 0;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const x = startX + c * spacingX;
        const z = startZ + r * spacingZ;
        // Undulating mountain/wave profile
        const y = Math.sin(c * 0.18) * Math.cos(r * 0.15) * 3.5 + Math.sin((c + r) * 0.08) * 2.0;

        positions[idx * 3] = x;
        positions[idx * 3 + 1] = y;
        positions[idx * 3 + 2] = z;
        originalY[idx] = y;

        // Assign harmonic gradient color based on altitude
        const colorRatio = (y + 5.5) / 11;
        const colorIdx = Math.floor(Math.max(0, Math.min(palette.length - 1, colorRatio * palette.length)));
        const pointColor = palette[colorIdx];

        colors[idx * 3] = pointColor.r;
        colors[idx * 3 + 1] = pointColor.g;
        colors[idx * 3 + 2] = pointColor.b;

        idx++;
      }
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    // Particle texture (crisp circular glow)
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
      gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
      gradient.addColorStop(0.3, isDark ? 'rgba(56, 189, 248, 0.8)' : 'rgba(2, 132, 199, 0.8)');
      gradient.addColorStop(0.8, isDark ? 'rgba(37, 99, 235, 0.2)' : 'rgba(100, 116, 139, 0.2)');
      gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, 64, 64);
    }
    const particleTexture = new THREE.CanvasTexture(canvas);

    const material = new THREE.PointsMaterial({
      size: isDark ? 1.6 : 1.4,
      vertexColors: true,
      map: particleTexture,
      transparent: true,
      opacity: isDark ? 0.85 : 0.65,
      blending: isDark ? THREE.AdditiveBlending : THREE.NormalBlending,
      depthWrite: false,
    });

    const particleSystem = new THREE.Points(geometry, material);
    scene.add(particleSystem);

    // Add flowing stream lines (wind vector ribbons)
    const lineCount = 14;
    const lineGroup = new THREE.Group();

    for (let l = 0; l < lineCount; l++) {
      const curvePoints: THREE.Vector3[] = [];
      const zOffset = (l - lineCount / 2) * 4.2;
      for (let s = 0; s < 30; s++) {
        const lx = (s - 15) * 3.5;
        const ly = Math.sin(s * 0.35 + l) * 2.8 + Math.cos(s * 0.15) * 1.5;
        const lz = zOffset + Math.sin(s * 0.2) * 2.5;
        curvePoints.push(new THREE.Vector3(lx, ly, lz));
      }
      const curve = new THREE.CatmullRomCurve3(curvePoints);
      const tubeGeom = new THREE.TubeGeometry(curve, 40, 0.06, 6, false);
      const tubeMat = new THREE.MeshBasicMaterial({
        color: isDark ? (l % 2 === 0 ? 0x00f0ff : 0x38bdf8) : (l % 2 === 0 ? 0x0284c7 : 0x94a3b8),
        transparent: true,
        opacity: isDark ? 0.35 : 0.2,
      });
      const tubeMesh = new THREE.Mesh(tubeGeom, tubeMat);
      lineGroup.add(tubeMesh);
    }
    scene.add(lineGroup);

    // Ambient Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
    scene.add(ambientLight);

    // 5. Animation Loop with Inertial Mouse Damping & Visibility Observer
    let animationFrameId: number;
    const startTime = performance.now();
    let isVisible = true;
    let frameCount = 0;
    let lastFpsUpdate = performance.now();

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        isVisible = entry.isIntersecting;
      });
    }, { threshold: 0.1 });
    observer.observe(container);

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      if (!isVisible) return;

      const elapsedTime = (performance.now() - startTime) / 1000;

      // FPS calculation
      frameCount++;
      const now = performance.now();
      if (now - lastFpsUpdate >= 1000) {
        setFps(Math.round((frameCount * 1000) / (now - lastFpsUpdate)));
        frameCount = 0;
        lastFpsUpdate = now;
      }

      // Smooth mouse damping
      const mouse = mouseRef.current;
      mouse.x += (mouse.targetX - mouse.x) * 0.05;
      mouse.y += (mouse.targetY - mouse.y) * 0.05;

      // Parallax camera tilt
      camera.position.x = mouse.x * 12;
      camera.position.y = 18 - mouse.y * 6;
      camera.lookAt(mouse.x * 3, 0, 0);

      // Undulate particle mesh (atmospheric fluid simulation)
      if (isSimulatingWind) {
        const posAttr = geometry.attributes.position;
        const currentPos = posAttr.array as Float32Array;

        for (let i = 0; i < particleCount; i++) {
          const origY = originalY[i];
          const x = currentPos[i * 3];
          const z = currentPos[i * 3 + 2];

          // Dual-frequency traveling wave
          const wave =
            Math.sin(x * 0.12 + elapsedTime * 1.6) * 1.5 +
            Math.cos(z * 0.16 + elapsedTime * 1.2) * 1.2 +
            Math.sin((x + z) * 0.05 + elapsedTime * 0.8) * 0.8;

          currentPos[i * 3 + 1] = origY + wave;
        }
        posAttr.needsUpdate = true;

        // Animate wind streamline lines
        lineGroup.children.forEach((line, index) => {
          line.position.x = Math.sin(elapsedTime * 0.5 + index) * 0.8;
          line.rotation.z = Math.sin(elapsedTime * 0.3 + index) * 0.02;
        });
      }

      renderer.render(scene, camera);
    };

    animate();

    // 6. Window Resize Handler
    const handleResize = () => {
      if (!container) return;
      const newW = container.clientWidth || window.innerWidth;
      const newH = container.clientHeight || window.innerHeight;
      camera.aspect = newW / newH;
      camera.updateProjectionMatrix();
      renderer.setSize(newW, newH);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('mousemove', handlePointerMove, { passive: true });
    window.addEventListener('touchmove', handlePointerMove, { passive: true });

    // 7. Cleanup
    return () => {
      cancelAnimationFrame(animationFrameId);
      observer.disconnect();
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handlePointerMove);
      window.removeEventListener('touchmove', handlePointerMove);

      geometry.dispose();
      material.dispose();
      particleTexture.dispose();
      lineGroup.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
          obj.geometry.dispose();
          if (Array.isArray(obj.material)) {
            obj.material.forEach((m) => m.dispose());
          } else {
            obj.material.dispose();
          }
        }
      });
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [resolvedTheme, isSimulatingWind, handlePointerMove]);

  return (
    <div
      ref={containerRef}
      className={`pointer-events-none fixed inset-0 z-0 overflow-hidden select-none opacity-90 transition-opacity duration-1000 ${className}`}
      aria-hidden="true"
    >
      {/* Subtle telemetry badge in bottom left (Gionatan Nese / technical style) */}
      <div className="absolute bottom-4 left-6 z-10 flex items-center gap-3 font-mono text-[10px] tracking-wider text-muted-foreground/60 select-none uppercase pointer-events-auto">
        <span className="flex items-center gap-1.5">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-sky-500"></span>
          </span>
          3D FLUID // WEBGL
        </span>
        <span className="hidden sm:inline-block text-border">|</span>
        <span className="hidden sm:inline-block">ATMOSPHERE: LIVE</span>
        <span className="hidden sm:inline-block text-border">|</span>
        <span className="hidden sm:inline-block font-semibold">{fps} FPS</span>
        <button
          type="button"
          onClick={() => setIsInteractive(!isInteractive)}
          className="hover:text-foreground transition-colors cursor-pointer"
        >
          [{isInteractive ? 'ACTIVE' : 'IDLE'}]
        </button>
      </div>
    </div>
  );
};
