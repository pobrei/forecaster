"use client";

import React, { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { Sparkles } from '@react-three/drei';
import * as THREE from 'three';

const LEAF_COUNT = 65;
const BOUNDS_X = 9.0;
const BOUNDS_Y_MIN = -5.0;
const BOUNDS_Y_MAX = 5.0;
const BOUNDS_Z = 7.0;

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
  scale: number;
  phase: number;
  flutterSpeed: number;
}

const LEAF_COLORS = [
  '#f59e0b', // Golden Amber
  '#d97706', // Ochre
  '#b45309', // Alpine Rust
  '#10b981', // Spruce Emerald
  '#84cc16', // Mountain Moss
  '#06b6d4', // Glacier Cyan Frost
];

function lcg(seed: number) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function createInitialLeaves(): LeafPhysics[] {
  const rand = lcg(1337);
  const list: LeafPhysics[] = [];
  for (let i = 0; i < LEAF_COUNT; i++) {
    list.push({
      x: (rand() - 0.5) * BOUNDS_X * 2,
      y: rand() * (BOUNDS_Y_MAX - BOUNDS_Y_MIN) + BOUNDS_Y_MIN,
      z: (rand() - 0.5) * BOUNDS_Z * 2,
      vx: 0.6 + rand() * 0.9,
      vy: -0.2 - rand() * 0.4,
      vz: (rand() - 0.5) * 0.35,
      rotX: rand() * Math.PI * 2,
      rotY: rand() * Math.PI * 2,
      rotZ: rand() * Math.PI * 2,
      vRotX: (rand() - 0.5) * 2.2,
      vRotY: (rand() - 0.5) * 2.5,
      vRotZ: (rand() - 0.5) * 1.8,
      scale: 0.65 + rand() * 0.6,
      phase: rand() * Math.PI * 2,
      flutterSpeed: 1.5 + rand() * 2.5,
    });
  }
  return list;
}

export function AtmosphericParticles() {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const leavesRef = useRef<LeafPhysics[] | null>(null);
  if (leavesRef.current === null) {
    leavesRef.current = createInitialLeaves();
  }

  // Create curved leaf geometry with central fold
  const leafGeometry = useMemo(() => {
    const geom = new THREE.PlaneGeometry(0.18, 0.1, 3, 2);
    const pos = geom.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const y = pos.getY(i);
      // Curve vertices along central vein
      pos.setZ(i, Math.sin(Math.abs(y) * 15) * 0.02);
    }
    geom.computeVertexNormals();
    return geom;
  }, []);

  // Set randomized instance colors on mount
  useEffect(() => {
    if (!meshRef.current) return;
    const color = new THREE.Color();
    for (let i = 0; i < LEAF_COUNT; i++) {
      const c = LEAF_COLORS[i % LEAF_COLORS.length];
      color.set(c);
      meshRef.current.setColorAt(i, color);
    }
    if (meshRef.current.instanceColor) {
      meshRef.current.instanceColor.needsUpdate = true;
    }
  }, []);

  useFrame((state, rawDelta) => {
    if (!meshRef.current || !leavesRef.current) return;
    const delta = Math.min(rawDelta, 0.05);
    const time = state.clock.getElapsedTime();
    const leaves = leavesRef.current;

    for (let i = 0; i < LEAF_COUNT; i++) {
      const leaf = leaves[i];

      // Wind dynamics with turbulence & undulating air flutter
      const windTurbulence = Math.sin(time * 1.8 + leaf.phase) * 0.12;
      const verticalLift = Math.cos(time * leaf.flutterSpeed + leaf.phase) * 0.15;

      leaf.x += (leaf.vx + windTurbulence) * delta;
      leaf.y += (leaf.vy + verticalLift) * delta;
      leaf.z += leaf.vz * delta;

      // 3-axis rotational tumbling
      leaf.rotX += leaf.vRotX * delta;
      leaf.rotY += leaf.vRotY * delta;
      leaf.rotZ += leaf.vRotZ * delta;

      // Wrap boundaries seamlessly: when drifting past right or below floor, respawn upwind
      if (leaf.x > BOUNDS_X) {
        leaf.x = -BOUNDS_X - ((i * 0.17) % 1.5);
        leaf.y = ((i * 0.31) % 3) + 1.0;
        leaf.z = (((i * 0.23) % 1) - 0.5) * BOUNDS_Z * 1.8;
      }
      if (leaf.y < BOUNDS_Y_MIN) {
        leaf.y = BOUNDS_Y_MAX + ((i * 0.19) % 1.0);
        leaf.x = (((i * 0.29) % 1) - 0.5) * BOUNDS_X * 1.5;
      }
      if (Math.abs(leaf.z) > BOUNDS_Z) {
        leaf.z = -Math.sign(leaf.z) * (BOUNDS_Z - 0.5);
      }

      // Update instanced transform matrix
      dummy.position.set(leaf.x, leaf.y, leaf.z);
      dummy.rotation.set(leaf.rotX, leaf.rotY, leaf.rotZ);
      dummy.scale.setScalar(leaf.scale);
      dummy.updateMatrix();

      meshRef.current.setMatrixAt(i, dummy.matrix);
    }

    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <group name="atmospheric-fx">
      {/* Micro-Dust Motes: 120 sparkles floating in ambient space */}
      <Sparkles
        count={120}
        scale={[16, 10, 14]}
        size={2.4}
        speed={0.35}
        opacity={0.65}
        color="#38bdf8"
      />

      {/* Secondary Warm Golden Sun Dust Motes */}
      <Sparkles
        count={50}
        scale={[14, 8, 12]}
        size={3.0}
        speed={0.25}
        opacity={0.4}
        color="#f59e0b"
      />

      {/* Wind-Blown Alpine Debris Instanced Mesh */}
      <instancedMesh
        ref={meshRef}
        args={[leafGeometry, undefined, LEAF_COUNT]}
        castShadow
      >
        <meshStandardMaterial
          roughness={0.65}
          metalness={0.15}
          side={THREE.DoubleSide}
          transparent
          opacity={0.85}
        />
      </instancedMesh>
    </group>
  );
}
