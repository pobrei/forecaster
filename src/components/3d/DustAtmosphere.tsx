"use client";

import React, { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { Sparkles } from '@react-three/drei';
import * as THREE from 'three';

const GRAIN_COUNT = 75;
const BOUNDS_X = 9.5;
const BOUNDS_Y_MIN = -4.5;
const BOUNDS_Y_MAX = 5.0;
const BOUNDS_Z = 7.0;

interface SandGrainPhysics {
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
  scaleX: number;
  scaleY: number;
  scaleZ: number;
  phase: number;
  oscFreq: number;
  oscAmp: number;
}

const SAND_COLORS = [
  '#D4C3A3', // Fine Bleached Silt
  '#C4A482', // Windblown Dune Sand
  '#A89F91', // Sun-Dried Sandstone
  '#8C7355', // Weathered Basalt Silt
  '#E5A93C', // Amber Quartz Glimmer
  '#B89F7A', // Desert Loess
];

export function DustAtmosphere() {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  // Initialize individual coarse sand particle physics state
  const grains = useMemo<SandGrainPhysics[]>(() => {
    const list: SandGrainPhysics[] = [];
    for (let i = 0; i < GRAIN_COUNT; i++) {
      list.push({
        x: (Math.random() - 0.5) * BOUNDS_X * 2,
        y: Math.random() * (BOUNDS_Y_MAX - BOUNDS_Y_MIN) + BOUNDS_Y_MIN,
        z: (Math.random() - 0.5) * BOUNDS_Z * 2,
        vx: 0.8 + Math.random() * 1.2, // Consistent lateral desert wind
        vy: -0.15 - Math.random() * 0.25, // Gentle gravity pull
        vz: (Math.random() - 0.5) * 0.3,
        rotX: Math.random() * Math.PI * 2,
        rotY: Math.random() * Math.PI * 2,
        rotZ: Math.random() * Math.PI * 2,
        vRotX: (Math.random() - 0.5) * 3.0,
        vRotY: (Math.random() - 0.5) * 3.5,
        vRotZ: (Math.random() - 0.5) * 2.5,
        scaleX: 0.04 + Math.random() * 0.05,
        scaleY: 0.025 + Math.random() * 0.035,
        scaleZ: 0.035 + Math.random() * 0.04,
        phase: Math.random() * Math.PI * 2,
        oscFreq: 1.8 + Math.random() * 2.2,
        oscAmp: 0.18 + Math.random() * 0.22,
      });
    }
    return list;
  }, []);

  // Irregular multifaceted sand grain geometry (dodecahedron for natural crystalline faceting)
  const grainGeometry = useMemo(() => {
    const geom = new THREE.DodecahedronGeometry(1.0, 0);
    geom.computeVertexNormals();
    return geom;
  }, []);

  // Apply warm desert mineral colors to instances on mount
  useEffect(() => {
    if (!meshRef.current) return;
    const color = new THREE.Color();
    for (let i = 0; i < GRAIN_COUNT; i++) {
      const hex = SAND_COLORS[i % SAND_COLORS.length];
      color.set(hex);
      meshRef.current.setColorAt(i, color);
    }
    if (meshRef.current.instanceColor) {
      meshRef.current.instanceColor.needsUpdate = true;
    }
  }, []);

  // Physics animation loop: lateral wind drift, sine-wave oscillation, tumbling, and clean respawn
  useFrame((state, rawDelta) => {
    if (!meshRef.current) return;
    const delta = Math.min(rawDelta, 0.05);
    const time = state.clock.getElapsedTime();

    for (let i = 0; i < GRAIN_COUNT; i++) {
      const g = grains[i];

      // Lateral wind drift + sine-wave vertical lift oscillation
      const sineY = Math.sin(time * g.oscFreq + g.phase) * g.oscAmp;
      g.x += g.vx * delta;
      g.y += (g.vy + sineY) * delta;
      g.z += g.vz * delta;

      // 3-axis rotational tumbling
      g.rotX += g.vRotX * delta;
      g.rotY += g.vRotY * delta;
      g.rotZ += g.vRotZ * delta;

      // Boundary wrapping: respawn upwind when leaving the lateral frustum
      if (g.x > BOUNDS_X) {
        g.x = -BOUNDS_X - Math.random() * 1.5;
        g.y = Math.random() * (BOUNDS_Y_MAX - BOUNDS_Y_MIN) + BOUNDS_Y_MIN;
        g.z = (Math.random() - 0.5) * BOUNDS_Z * 1.8;
      }
      if (g.y < BOUNDS_Y_MIN) {
        g.y = BOUNDS_Y_MAX + Math.random() * 0.8;
        g.x = (Math.random() - 0.5) * BOUNDS_X * 1.6;
      }
      if (Math.abs(g.z) > BOUNDS_Z) {
        g.z = -Math.sign(g.z) * (BOUNDS_Z - 0.5);
      }

      dummy.position.set(g.x, g.y, g.z);
      dummy.rotation.set(g.rotX, g.rotY, g.rotZ);
      dummy.scale.set(g.scaleX, g.scaleY, g.scaleZ);
      dummy.updateMatrix();

      meshRef.current.setMatrixAt(i, dummy.matrix);
    }

    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <group name="dust-atmosphere">
      {/* Layer 1: Suspended Fine Silt */}
      <Sparkles
        count={160}
        scale={14}
        size={2}
        speed={0.3}
        opacity={0.45}
        color="#D4C3A3"
      />

      {/* Layer 1b: Secondary Warm Phosphor Motes */}
      <Sparkles
        count={50}
        scale={[16, 9, 12]}
        size={2.8}
        speed={0.2}
        opacity={0.35}
        color="#E5A93C"
      />

      {/* Layer 2: Coarse Wind Sand Particles (Instanced Tumbling Mineral Grains) */}
      <instancedMesh
        ref={meshRef}
        args={[grainGeometry, undefined, GRAIN_COUNT]}
      >
        <meshStandardMaterial
          roughness={0.75}
          metalness={0.1}
          transparent
          opacity={0.82}
        />
      </instancedMesh>
    </group>
  );
}
