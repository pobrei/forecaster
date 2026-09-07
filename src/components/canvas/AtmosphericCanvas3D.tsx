"use client";

import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { useTheme } from 'next-themes';

interface AtmosphericCanvas3DProps {
  className?: string;
  isSimulatingWind?: boolean;
}

interface LeafPhysics {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  rotX: number;
  rotY: number;
  rotZ: number;
  vRotX: number;
  vRotY: number;
  vRotZ: number;
  flutterSpeed: number;
  flutterAmp: number;
  scale: number;
  phase: number;
}

export const AtmosphericCanvas3D: React.FC<AtmosphericCanvas3DProps> = ({
  className = '',
  isSimulatingWind = true,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const { resolvedTheme } = useTheme();
  const [fps, setFps] = useState<number>(60);
  const [isInteractive, setIsInteractive] = useState<boolean>(true);

  // References for wind velocity and mouse interaction
  const mouseRef = useRef<{
    x: number;
    y: number;
    targetX: number;
    targetY: number;
    lastX: number;
    lastY: number;
    speedX: number;
    speedY: number;
  }>({
    x: 0,
    y: 0,
    targetX: 0,
    targetY: 0,
    lastX: 0,
    lastY: 0,
    speedX: 0,
    speedY: 0,
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
    const nx = (clientX - halfW) / halfW;
    const ny = (clientY - halfH) / halfH;

    const m = mouseRef.current;
    m.speedX = nx - m.targetX;
    m.speedY = ny - m.targetY;
    m.targetX = nx;
    m.targetY = ny;
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const isDark = resolvedTheme === 'dark';

    // 1. Scene & Atmospheric Fog Setup
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x12100E, 0.012);

    // 2. Camera Setup
    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;
    const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 800);
    camera.position.set(0, 4, 38);
    camera.lookAt(0, 0, 0);

    // 3. WebGL Renderer
    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      powerPreference: 'high-performance',
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.setClearColor(0x12100E, 0.4);
    container.appendChild(renderer.domElement);

    // 4. Natural Lighting (Phosphor key light + Warm bronze fill)
    const ambientLight = new THREE.AmbientLight(0x2C251F, 1.1);
    scene.add(ambientLight);

    const sunLight = new THREE.DirectionalLight(0xE5A93C, 1.4);
    sunLight.position.set(25, 35, 20);
    scene.add(sunLight);

    const rimLight = new THREE.DirectionalLight(0x453A2E, 0.9);
    rimLight.position.set(-20, -10, -15);
    scene.add(rimLight);

    // 5. Procedural 3D Autumn & Alpine Leaves
    // Shape for curved organic leaves with natural tapered tips
    const leafShape = new THREE.Shape();
    leafShape.moveTo(0, -0.6);
    leafShape.bezierCurveTo(0.35, -0.2, 0.45, 0.3, 0, 0.85);
    leafShape.bezierCurveTo(-0.45, 0.3, -0.35, -0.2, 0, -0.6);

    const leafGeom = new THREE.ShapeGeometry(leafShape, 8);
    // Subtle curl along the center vein
    const pos = leafGeom.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const px = pos.getX(i);
      pos.setZ(i, Math.abs(px) * 0.18 - Math.sin(pos.getY(i) * 2) * 0.08);
    }
    leafGeom.computeVertexNormals();

    // Natural Earth & Autumn Color Palette
    const leafColors = [
      new THREE.Color(0xd97706), // Golden Amber
      new THREE.Color(0xc2410c), // Terracotta Rust
      new THREE.Color(0xb91c1c), // Autumn Crimson
      new THREE.Color(0xeab308), // Birch Yellow
      new THREE.Color(0x78350f), // Russet Brown
      new THREE.Color(0x4d7c0f), // Olive Alpine Pine
      new THREE.Color(0x9a3412), // Burnt Orange
    ];

    // Pre-allocate shared materials for the 7 colors (avoids 85 separate material instances)
    const leafMaterials = leafColors.map(
      (color) =>
        new THREE.MeshStandardMaterial({
          color,
          roughness: 0.6,
          metalness: 0.1,
          side: THREE.DoubleSide,
          transparent: true,
          opacity: isDark ? 0.88 : 0.82,
        })
    );

    const leafCount = 48;
    const leafGroup = new THREE.Group();
    const leafData: LeafPhysics[] = [];

    for (let i = 0; i < leafCount; i++) {
      const mat = leafMaterials[i % leafMaterials.length];
      const mesh = new THREE.Mesh(leafGeom, mat);
      const scale = 0.55 + Math.random() * 0.65;
      mesh.scale.set(scale, scale, scale);

      const x = (Math.random() - 0.5) * 60;
      const y = (Math.random() - 0.5) * 35;
      const z = (Math.random() - 0.5) * 45 - 5;

      mesh.position.set(x, y, z);
      leafGroup.add(mesh);

      leafData.push({
        x,
        y,
        z,
        vx: 0.04 + Math.random() * 0.08,
        vy: -0.015 - Math.random() * 0.025,
        vz: (Math.random() - 0.5) * 0.03,
        rotX: Math.random() * Math.PI * 2,
        rotY: Math.random() * Math.PI * 2,
        rotZ: Math.random() * Math.PI * 2,
        vRotX: (Math.random() - 0.5) * 0.03,
        vRotY: (Math.random() - 0.5) * 0.04,
        vRotZ: (Math.random() - 0.5) * 0.02,
        flutterSpeed: 1.5 + Math.random() * 2.5,
        flutterAmp: 0.03 + Math.random() * 0.04,
        scale,
        phase: Math.random() * Math.PI * 2,
      });
    }
    scene.add(leafGroup);

    // 6. Drifting Atmospheric Dust, Spores & Light Motes
    const dustCount = 550;
    const dustGeom = new THREE.BufferGeometry();
    const dustPos = new Float32Array(dustCount * 3);
    const dustVel: { vx: number; vy: number; vz: number; baseAmp: number }[] = [];

    for (let d = 0; d < dustCount; d++) {
      dustPos[d * 3] = (Math.random() - 0.5) * 75;
      dustPos[d * 3 + 1] = (Math.random() - 0.5) * 45;
      dustPos[d * 3 + 2] = (Math.random() - 0.5) * 50 - 2;

      dustVel.push({
        vx: 0.02 + Math.random() * 0.05,
        vy: (Math.random() - 0.5) * 0.015,
        vz: (Math.random() - 0.5) * 0.02,
        baseAmp: 0.008 + Math.random() * 0.012,
      });
    }
    dustGeom.setAttribute('position', new THREE.BufferAttribute(dustPos, 3));

    // Circular glowing texture for dust motes
    const dustCanvas = document.createElement('canvas');
    dustCanvas.width = 32;
    dustCanvas.height = 32;
    const dustCtx = dustCanvas.getContext('2d');
    if (dustCtx) {
      const grad = dustCtx.createRadialGradient(16, 16, 0, 16, 16, 16);
      grad.addColorStop(0, '#F5F2EB');
      grad.addColorStop(0.3, 'rgba(229, 169, 60, 0.7)');
      grad.addColorStop(0.7, 'rgba(229, 169, 60, 0.2)');
      grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      dustCtx.fillStyle = grad;
      dustCtx.fillRect(0, 0, 32, 32);
    }
    const dustTexture = new THREE.CanvasTexture(dustCanvas);

    const dustMat = new THREE.PointsMaterial({
      size: 0.75,
      map: dustTexture,
      transparent: true,
      opacity: 0.65,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const dustSystem = new THREE.Points(dustGeom, dustMat);
    scene.add(dustSystem);

    // 7. Subtle Flowing Wind Ribbons / Atmospheric Air Currents
    const windCurvesCount = 8;
    const windGroup = new THREE.Group();

    for (let w = 0; w < windCurvesCount; w++) {
      const pts: THREE.Vector3[] = [];
      const yBase = (w - windCurvesCount / 2) * 5;
      for (let p = 0; p < 25; p++) {
        const px = (p - 12) * 4;
        const py = yBase + Math.sin(p * 0.3 + w) * 2.2;
        const pz = (Math.sin(p * 0.2 + w * 2) - 0.5) * 15 - 8;
        pts.push(new THREE.Vector3(px, py, pz));
      }
      const curve = new THREE.CatmullRomCurve3(pts);
      const tube = new THREE.TubeGeometry(curve, 35, 0.05, 5, false);
      const tubeMat = new THREE.MeshBasicMaterial({
        color: 0xE5A93C,
        transparent: true,
        opacity: 0.15,
      });
      windGroup.add(new THREE.Mesh(tube, tubeMat));
    }
    scene.add(windGroup);

    // 8. Animation & Physics Simulation
    let animationFrameId: number;
    const startTime = performance.now();
    let isVisible = true;
    let frameCount = 0;
    let lastFpsUpdate = performance.now();

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          isVisible = entry.isIntersecting;
        });
      },
      { threshold: 0.1 }
    );
    observer.observe(container);

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      if (!isVisible) return;

      const elapsed = (performance.now() - startTime) / 1000;

      // FPS tracking
      frameCount++;
      const now = performance.now();
      if (now - lastFpsUpdate >= 1000) {
        setFps(Math.round((frameCount * 1000) / (now - lastFpsUpdate)));
        frameCount = 0;
        lastFpsUpdate = now;
      }

      // Smooth mouse damping
      const mouse = mouseRef.current;
      mouse.x += (mouse.targetX - mouse.x) * 0.06;
      mouse.y += (mouse.targetY - mouse.y) * 0.06;

      // Camera parallax
      camera.position.x = mouse.x * 6;
      camera.position.y = 4 - mouse.y * 3;
      camera.lookAt(mouse.x * 1.5, 0, 0);

      // Wind gust factor from cursor speed
      const cursorGust = Math.sqrt(mouse.speedX * mouse.speedX + mouse.speedY * mouse.speedY) * 2.5;
      mouse.speedX *= 0.9;
      mouse.speedY *= 0.9;

      if (isSimulatingWind) {
        // A. Animate Leaves with Aerodynamic Flutter
        for (let i = 0; i < leafCount; i++) {
          const l = leafData[i];
          const mesh = leafGroup.children[i] as THREE.Mesh;

          // Sinusoidal wind gust oscillation
          const windGust = Math.sin(elapsed * 0.7 + l.phase) * 0.03 + cursorGust * 0.04;
          l.x += l.vx + windGust;
          l.y += l.vy + Math.sin(elapsed * l.flutterSpeed + l.phase) * l.flutterAmp;
          l.z += l.vz;

          // Realistic tumbling rotation
          l.rotX += l.vRotX + Math.sin(elapsed * 2 + l.phase) * 0.02;
          l.rotY += l.vRotY + windGust * 0.5;
          l.rotZ += l.vRotZ + Math.cos(elapsed * 1.5 + l.phase) * 0.02;

          mesh.position.set(l.x, l.y, l.z);
          mesh.rotation.set(l.rotX, l.rotY, l.rotZ);

          // Wrap around atmospheric boundary
          if (l.x > 38) {
            l.x = -38;
            l.y = (Math.random() - 0.5) * 35;
            l.z = (Math.random() - 0.5) * 40 - 5;
          }
          if (l.y < -22) {
            l.y = 22;
            l.x = (Math.random() - 0.5) * 55;
          }
        }

        // B. Animate Dust & Pollen Motes
        const positions = dustGeom.attributes.position.array as Float32Array;
        for (let d = 0; d < dustCount; d++) {
          const v = dustVel[d];
          const pxIdx = d * 3;

          positions[pxIdx] += v.vx + Math.sin(elapsed * 0.5 + d) * v.baseAmp + cursorGust * 0.02;
          positions[pxIdx + 1] += v.vy + Math.cos(elapsed * 0.8 + d) * v.baseAmp;
          positions[pxIdx + 2] += v.vz;

          // Boundary wrap
          if (positions[pxIdx] > 42) positions[pxIdx] = -42;
          if (positions[pxIdx + 1] < -25) positions[pxIdx + 1] = 25;
          if (positions[pxIdx + 1] > 25) positions[pxIdx + 1] = -25;
        }
        dustGeom.attributes.position.needsUpdate = true;

        // C. Animate Wind Streamlines
        windGroup.children.forEach((wMesh, idx) => {
          wMesh.position.x = Math.sin(elapsed * 0.4 + idx) * 1.2;
          wMesh.rotation.z = Math.sin(elapsed * 0.2 + idx) * 0.03;
        });
      }

      renderer.render(scene, camera);
    };

    animate();

    // 9. Resize Handler
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

    // 10. Cleanup
    return () => {
      cancelAnimationFrame(animationFrameId);
      observer.disconnect();
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handlePointerMove);
      window.removeEventListener('touchmove', handlePointerMove);

      leafGeom.dispose();
      leafMaterials.forEach((m) => m.dispose());
      dustGeom.dispose();
      dustMat.dispose();
      dustTexture.dispose();
      windGroup.children.forEach((child) => {
        if (child instanceof THREE.Mesh) {
          child.geometry.dispose();
          if (Array.isArray(child.material)) child.material.forEach((m) => m.dispose());
          else child.material.dispose();
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
      className={`pointer-events-none fixed inset-0 z-0 overflow-hidden select-none opacity-95 transition-opacity duration-1000 ${className}`}
      aria-hidden="true"
    >
      {/* Subtle telemetry badge in bottom left (Gionatan Nese / tactical outdoor style) */}
      <div className="absolute bottom-4 left-6 z-10 flex items-center gap-3 font-mono text-[10px] tracking-wider text-muted-foreground/60 select-none uppercase pointer-events-auto">
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-amber-500 shadow-[0_0_6px_rgba(245,158,11,0.8)]"></span>
          NATURE ATMOSPHERE // WIND & LEAVES
        </span>
        <span className="hidden sm:inline-block text-border">|</span>
        <span className="hidden sm:inline-block">DRIFT: ACTIVE</span>
        <span className="hidden sm:inline-block text-border">|</span>
        <span className="hidden sm:inline-block font-semibold">{fps} FPS</span>
        <button
          type="button"
          onClick={() => setIsInteractive(!isInteractive)}
          className="hover:text-foreground transition-colors cursor-pointer"
        >
          [{isInteractive ? 'INTERACTIVE' : 'STATIC'}]
        </button>
      </div>
    </div>
  );
};
