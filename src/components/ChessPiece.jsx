import React, { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useGLTF } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { createWoodPieceTexture } from '../utils/textures.js';

const MODEL_URL = '/models/pieces.glb';
useGLTF.preload(MODEL_URL);

// Wood-grain maps are identical for every piece of a colour, so build the
// (relatively expensive) procedural textures once and share them.
const woodCache = {};
function getWoodTextures(color) {
  if (typeof window === 'undefined') return { map: null, bumpMap: null, roughnessMap: null };
  if (!woodCache[color]) {
    woodCache[color] = color === 'white'
      ? createWoodPieceTexture({ base: '#A5844C', grain: '#634826', repeat: 2 }) // aged boxwood (deep honey/amber)
      : createWoodPieceTexture({ base: '#241913', grain: '#0a0604', repeat: 2 }); // old ebony / dark walnut
  }
  return woodCache[color];
}

// One shared material per colour for all idle pieces (huge draw-call / shader win
// vs. a fresh material per piece). Glowing pieces get a throwaway material.
// Physical material: matte wood (metalness 0) with a light clearcoat so the
// turned forms catch a satin sheen from the candlelight, like lacquered Staunton pieces.
const baseMaterialCache = {};
function getBaseMaterial(color) {
  if (typeof window === 'undefined') return null;
  if (!baseMaterialCache[color]) {
    const wood = getWoodTextures(color);
    baseMaterialCache[color] = new THREE.MeshPhysicalMaterial({
      color: '#ffffff', // wood colour is baked into the map
      map: wood.map,
      roughnessMap: wood.roughnessMap,
      roughness: 1.0,
      metalness: 0.0,
      bumpMap: wood.bumpMap,
      bumpScale: 0.08,
      clearcoat: 0.15, // old wood: mostly matte, only a faint worn sheen
      clearcoatRoughness: 0.6,
      envMapIntensity: 0.4,
    });
  }
  return baseMaterialCache[color];
}

/** Total height (in board units, 1 tile ≈ 1 unit) the tallest piece — the king — should reach. */
const TARGET_KING_HEIGHT = 1.55;

/**
 * Classify a raw mesh name from the GLB kit into a chess piece type.
 * The king's cross finial is a separate mesh, so it folds back into "king".
 */
function classify(name) {
  const n = name.toLowerCase();
  if (n.includes('cross') || n.includes('king')) return 'king';
  if (n.includes('queen')) return 'queen';
  if (n.includes('bishop')) return 'bishop';
  if (n.includes('knight')) return 'knight'; // covers knightStand_01 + knight_02
  if (n.includes('rook')) return 'rook';
  if (n.includes('pawn')) return 'pawn';
  return null;
}

// The imported kit lays every piece out at a different spot in one shared model
// space. We normalize each type once (recenter on XZ, drop its base to Y=0, and
// apply one shared scale) and cache the result against the loaded scene.
const geometryCache = new WeakMap();

function getNormalizedGeometries(scene) {
  if (geometryCache.has(scene)) return geometryCache.get(scene);

  const groups = { king: [], queen: [], bishop: [], knight: [], rook: [], pawn: [] };
  scene.traverse((o) => {
    if (!o.isMesh) return;
    const type = classify(o.name);
    if (type) groups[type].push(o);
  });

  // Combined (per-type) bounding boxes in raw model space.
  const boxes = {};
  for (const type of Object.keys(groups)) {
    const box = new THREE.Box3();
    for (const mesh of groups[type]) {
      mesh.geometry.computeBoundingBox();
      box.union(mesh.geometry.boundingBox);
    }
    boxes[type] = box;
  }

  // One shared scale so relative piece heights stay true to the kit.
  const kingHeight = boxes.king.max.y - boxes.king.min.y;
  const scale = TARGET_KING_HEIGHT / kingHeight;

  const result = {};
  for (const type of Object.keys(groups)) {
    const box = boxes[type];
    const cx = (box.min.x + box.max.x) / 2;
    const cz = (box.min.z + box.max.z) / 2;
    const baseY = box.min.y;

    result[type] = groups[type].map((mesh) => {
      const g = mesh.geometry.clone();
      g.translate(-cx, -baseY, -cz); // center on XZ, base on the tile
      g.scale(scale, scale, scale);
      return g;
    });
  }

  geometryCache.set(scene, result);
  return result;
}

export default function ChessPiece({ type, color, isSelected, isChecking, isHovered, castShadow = true }) {
  const { scene } = useGLTF(MODEL_URL);
  const geometries = getNormalizedGeometries(scene)[type] || [];

  const isGlowing = isSelected || (isChecking && type === 'king');

  const material = useMemo(() => {
    // Idle pieces share one material per colour.
    if (!isGlowing) return getBaseMaterial(color);

    // Selected / in-check pieces get a unique tinted+emissive material.
    const wood = getWoodTextures(color);
    const glow = isSelected
      ? { tint: '#FFC79A', emissive: '#FF6B35', intensity: 0.5, roughness: 0.55 }
      : { tint: '#E38A8A', emissive: '#8B1A1A', intensity: 0.7, roughness: 0.5 };

    return new THREE.MeshStandardMaterial({
      color: glow.tint,
      map: wood.map,
      roughnessMap: wood.roughnessMap,
      roughness: glow.roughness,
      metalness: 0.0,
      bumpMap: wood.bumpMap,
      bumpScale: 0.05,
      emissive: glow.emissive,
      emissiveIntensity: glow.intensity,
      envMapIntensity: 0.4,
    });
  }, [color, isSelected, isChecking, type, isGlowing]);

  // Knights face the opposing side; mirror them per colour.
  const rotationY = type === 'knight' ? (color === 'white' ? Math.PI / 2 : -Math.PI / 2) : 0;

  // A selected piece lifts off the board and hovers with a slow bob.
  const liftRef = useRef();
  useFrame((state) => {
    if (!liftRef.current) return;
    const cur = liftRef.current.position.y;
    // Idle, already grounded → nothing to animate (skips ~31 pieces/frame).
    if (!isSelected && !isHovered && cur < 0.001) return;
    const target = isSelected
      ? 0.14 + Math.sin(state.clock.elapsedTime * 2.6) * 0.02
      : isHovered
        ? 0.05
        : 0;
    liftRef.current.position.y = THREE.MathUtils.lerp(cur, target, 0.2);
  });

  return (
    <group>
      {/* Glow aura ring under a selected piece (stays on the board) */}
      {isSelected && (
        <mesh position={[0, 0.012, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.34, 0.46, 40]} />
          <meshBasicMaterial color="#FF7A3D" side={THREE.DoubleSide} transparent opacity={0.5} depthWrite={false} />
        </mesh>
      )}

      <group ref={liftRef}>
        <group rotation={[0, rotationY, 0]}>
          {geometries.map((geometry, i) => (
            <mesh key={i} geometry={geometry} material={material} castShadow={castShadow} receiveShadow />
          ))}
        </group>
      </group>
    </group>
  );
}
