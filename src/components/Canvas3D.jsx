import React, { useRef, useMemo, useEffect, useState, Suspense } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Environment, Lightformer } from '@react-three/drei';
import { useGameStore } from '../store/gameStore.js';
import ChessBoard from './ChessBoard.jsx';
import { createPBRTextures } from '../utils/textures.js';
import * as Sound from '../utils/sound.js';
import * as THREE from 'three';

/**
 * Wraps a prop so a click springs it to life — hop, spin, or flip about its own
 * centre — with a sound. Purely tactile; no effect on the game.
 */
function ClickAnim({ position = [0, 0, 0], rotation = [0, 0, 0], type = 'hop', sound, pivot = 0, children }) {
  const ref = useRef();
  const s = useRef({ spinVel: 0, targetX: 0, vy: 0, y: 0 });

  const onClick = (e) => {
    e.stopPropagation();
    if (type === 'spin') s.current.spinVel += 24;
    else if (type === 'flip') s.current.targetX += Math.PI;
    else s.current.vy = 1.7;
    if (sound && Sound[sound]) Sound[sound]();
  };

  useFrame((_, dt) => {
    if (!ref.current) return;
    const st = s.current;
    const d = Math.min(dt, 0.05);
    if (type === 'spin') {
      ref.current.rotation.y += st.spinVel * d;
      st.spinVel *= Math.pow(0.9, d * 60);
      if (Math.abs(st.spinVel) < 0.02) st.spinVel = 0;
    } else if (type === 'flip') {
      ref.current.rotation.x = THREE.MathUtils.lerp(ref.current.rotation.x, st.targetX, 0.14);
    } else {
      st.vy -= 6 * d;
      st.y += st.vy * d;
      if (st.y <= 0) {
        st.y = 0;
        st.vy = st.vy < -0.4 ? -st.vy * 0.35 : 0;
      }
      ref.current.position.y = st.y;
    }
  });

  return (
    <group position={[position[0], position[1] + pivot, position[2]]} rotation={rotation}>
      <group
        ref={ref}
        onClick={onClick}
        onPointerOver={(e) => { e.stopPropagation(); document.body.style.cursor = 'pointer'; }}
        onPointerOut={() => { document.body.style.cursor = 'auto'; }}
      >
        <group position={[0, -pivot, 0]}>{children}</group>
      </group>
    </group>
  );
}

/** A short puff of smoke rising from a just-snuffed candle. */
function SmokePuff({ y }) {
  const ref = useRef();
  const t = useRef(0);
  const puffs = useMemo(
    () => Array.from({ length: 6 }, () => ({
      x: (Math.random() - 0.5) * 0.05,
      z: (Math.random() - 0.5) * 0.05,
      spd: 0.25 + Math.random() * 0.2,
      drift: (Math.random() - 0.5) * 0.15,
      sz: 0.02 + Math.random() * 0.03,
    })),
    []
  );
  useFrame((_, dt) => {
    if (!ref.current || t.current > 1.4) return;
    t.current += dt;
    const p = t.current;
    ref.current.children.forEach((m, i) => {
      const pf = puffs[i];
      m.position.set(pf.x + pf.drift * p, y + pf.spd * p, pf.z);
      const grow = pf.sz * (1 + p * 2.5);
      m.scale.setScalar(grow);
      m.material.opacity = Math.max(0, 0.28 * (1 - p / 1.4));
    });
  });
  return (
    <group ref={ref}>
      {puffs.map((pf, i) => (
        <mesh key={i} position={[pf.x, y, pf.z]} scale={0.001}>
          <sphereGeometry args={[1, 8, 8]} />
          <meshBasicMaterial color="#8a8175" transparent opacity={0.28} depthWrite={false} />
        </mesh>
      ))}
    </group>
  );
}

/**
 * Controller to smoothly interpolate the camera between Wide and Focused views.
 * Aligns the board horizontally, matching the reference images perfectly (no 45-degree angle).
 */
function CameraController({ viewMode }) {
  const { camera } = useThree();
  const shakeSeq = useGameStore((state) => state.shakeSeq);
  const gameOver = useGameStore((state) => state.gameOver);
  const shake = useRef(0);
  const firstShake = useRef(true);
  const orbitAngle = useRef(0);

  // Camera targets based on viewMode (aligned straight along the Z axis)
  const targetPos = useMemo(() => {
    return viewMode === 'focused'
      ? new THREE.Vector3(0, 8.2, 5.2) // Zoomed in focused straight view
      : new THREE.Vector3(0, 9.4, 6.8); // Zoomed out atmospheric straight view
  }, [viewMode]);

  // Punch the camera on capture / check.
  useEffect(() => {
    if (firstShake.current) { firstShake.current = false; return; }
    shake.current = 0.16;
  }, [shakeSeq]);

  // Reset orbit position when game is restarted
  useEffect(() => {
    if (!gameOver) {
      orbitAngle.current = 0;
    }
  }, [gameOver]);

  useFrame((state, dt) => {
    const d = Math.min(dt, 0.05);
    if (gameOver) {
      // Orbit around the center (0, -0.4, 0) slowly and majestically
      orbitAngle.current += 0.12 * d; 
      const radius = 6.8;
      camera.position.x = Math.sin(orbitAngle.current) * radius;
      camera.position.z = Math.cos(orbitAngle.current) * radius;
      camera.position.y = 4.2 + Math.sin(orbitAngle.current * 0.5) * 1.4;
    } else {
      camera.position.lerp(targetPos, 0.08);
    }
    
    // Apply camera shake on chess collision (capture/check)
    if (shake.current > 0.002) {
      camera.position.x += (Math.random() - 0.5) * shake.current;
      camera.position.y += (Math.random() - 0.5) * shake.current;
      shake.current *= 0.82;
    }
    camera.lookAt(0, -0.4, 0);
  });

  return null;
}

/**
 * Procedural 3D Candle component with flickering flames, wax texture, and holders
 */
function Candle3D({ position, height = 0.4, seed = 0, castLight = true }) {
  const flameLightRef = useRef();
  const flameRef = useRef();
  const [lit, setLit] = useState(true);
  const [puffKey, setPuffKey] = useState(0);

  const topY = 0.08 + height; // wax top where the flame sits

  const toggle = (e) => {
    e.stopPropagation();
    const next = !lit;
    setLit(next);
    if (next) {
      Sound.relight();
    } else {
      Sound.snuff();
      setPuffKey((k) => k + 1);
    }
  };

  // A few wax drips down the candle side (deterministic per candle via seed).
  const drips = useMemo(() => {
    const rnd = (n) => {
      const x = Math.sin(seed * 12.9898 + n * 78.233) * 43758.5453;
      return x - Math.floor(x);
    };
    return Array.from({ length: 4 }, (_, i) => {
      const a = (i / 4) * Math.PI * 2 + rnd(i) * 1.5;
      const len = 0.08 + rnd(i + 9) * 0.16;
      return { a, len, startY: topY - 0.04 - rnd(i + 3) * 0.05 };
    });
  }, [seed, topY]);

  useFrame((state) => {
    if (!lit) return;
    const time = state.clock.getElapsedTime() + seed;
    const flicker = Math.sin(time * 12) * 0.1 + Math.sin(time * 23) * 0.05 + Math.sin(time * 5) * 0.03;
    if (flameLightRef.current) flameLightRef.current.intensity = 1.5 + flicker * 0.4;
    if (flameRef.current) {
      const s = 1.0 + flicker * 0.2;
      flameRef.current.scale.set(s, s * 1.28, s);
      flameRef.current.position.x = Math.sin(time * 7) * 0.006;
    }
  });

  return (
    <group position={position}>
      {/* Brass holder: dished base + short stem + cup */}
      <mesh castShadow receiveShadow position={[0, 0.015, 0]}>
        <cylinderGeometry args={[0.34, 0.4, 0.03, 24]} />
        <meshStandardMaterial color="#5A4527" roughness={0.35} metalness={0.95} envMapIntensity={0.8} />
      </mesh>
      <mesh castShadow position={[0, 0.05, 0]}>
        <cylinderGeometry args={[0.09, 0.16, 0.06, 20]} />
        <meshStandardMaterial color="#6B5230" roughness={0.3} metalness={0.95} envMapIntensity={0.9} />
      </mesh>
      <mesh castShadow position={[0, 0.085, 0]}>
        <cylinderGeometry args={[0.135, 0.11, 0.05, 20]} />
        <meshStandardMaterial color="#4E3C22" roughness={0.4} metalness={0.9} envMapIntensity={0.8} />
      </mesh>

      {/* Wax pillar */}
      <mesh castShadow receiveShadow position={[0, 0.08 + height / 2, 0]}>
        <cylinderGeometry args={[0.095, 0.105, height, 20]} />
        <meshStandardMaterial color="#E4DCC4" roughness={0.85} envMapIntensity={0.2} />
      </mesh>
      {/* Rounded molten top rim */}
      <mesh castShadow position={[0, topY, 0]}>
        <cylinderGeometry args={[0.1, 0.095, 0.04, 20]} />
        <meshStandardMaterial color="#EFE8D2" roughness={0.7} />
      </mesh>

      {/* Wax drips */}
      {drips.map((d, i) => (
        <mesh
          key={i}
          castShadow
          position={[Math.cos(d.a) * 0.1, d.startY - d.len / 2, Math.sin(d.a) * 0.1]}
        >
          <capsuleGeometry args={[0.016, d.len, 4, 8]} />
          <meshStandardMaterial color="#E4DCC4" roughness={0.85} />
        </mesh>
      ))}

      {/* Charred wick */}
      <mesh position={[0, topY + 0.03, 0]}>
        <cylinderGeometry args={[0.006, 0.008, 0.06, 6]} />
        <meshStandardMaterial color="#141414" roughness={1} />
      </mesh>

      {/* Clickable hotspot to snuff / relight */}
      <mesh
        position={[0, topY + 0.1, 0]}
        visible={false}
        onClick={toggle}
        onPointerOver={(e) => { e.stopPropagation(); document.body.style.cursor = 'pointer'; }}
        onPointerOut={() => { document.body.style.cursor = 'auto'; }}
      >
        <sphereGeometry args={[0.22, 8, 8]} />
      </mesh>

      {/* Layered flame + warm point light (only while lit) */}
      {lit && (
        <group position={[0, topY + 0.09, 0]}>
          <group ref={flameRef} name="flame-mesh">
            {/* teardrop body */}
            <mesh position={[0, 0.02, 0]}>
              <coneGeometry args={[0.045, 0.16, 16]} />
              <meshBasicMaterial color="#FF8A1E" transparent opacity={0.9} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
            </mesh>
            {/* bright core */}
            <mesh position={[0, 0.0, 0]}>
              <sphereGeometry args={[0.028, 12, 12]} />
              <meshBasicMaterial color="#FFEFC0" toneMapped={false} />
            </mesh>
          </group>
          {/* soft outer glow */}
          <mesh scale={[1, 1.7, 1]}>
            <sphereGeometry args={[0.11, 16, 16]} />
            <meshBasicMaterial color="#FF8A2A" transparent opacity={0.22} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
          </mesh>

          {castLight && <pointLight ref={flameLightRef} color="#FF8C2A" intensity={1.5} distance={10} decay={1.9} castShadow={false} />}
        </group>
      )}

      {/* Smoke rising after being snuffed */}
      {!lit && <SmokePuff key={puffKey} y={topY + 0.12} />}
    </group>
  );
}

/* ---------------------------------------------------------------------------
 * Table set-dressing props (procedural, no assets)
 * ------------------------------------------------------------------------- */

function Books({ position, rotation = [0, 0, 0] }) {
  const covers = ['#5A2E22', '#33402F', '#2C3550', '#4A3520'];
  const heights = [0.15, 0.12, 0.16];
  let y = 0;
  const stack = heights.map((h, i) => {
    const w = 0.74 - i * 0.06;
    const d = 0.52 - i * 0.04;
    const node = (
      <group key={i} position={[i % 2 ? 0.03 : -0.02, y + h / 2, i % 2 ? -0.02 : 0.03]} rotation={[0, (i - 1) * 0.16, 0]}>
        <mesh castShadow receiveShadow>
          <boxGeometry args={[w, h, d]} />
          <meshStandardMaterial color={covers[i]} roughness={0.85} envMapIntensity={0.2} />
        </mesh>
        {/* page block, inset and shifted to leave a spine */}
        <mesh position={[0.03, 0, 0]}>
          <boxGeometry args={[w * 0.92, h * 0.78, d * 0.97]} />
          <meshStandardMaterial color="#C9BE9A" roughness={0.95} />
        </mesh>
      </group>
    );
    y += h;
    return node;
  });
  return <group position={position} rotation={rotation}>{stack}</group>;
}

function Hourglass({ position }) {
  const wood = '#4A3826';
  return (
    <group position={position}>
      <mesh castShadow position={[0, 0.02, 0]}><cylinderGeometry args={[0.16, 0.18, 0.04, 20]} /><meshStandardMaterial color={wood} roughness={0.7} metalness={0.1} /></mesh>
      <mesh castShadow position={[0, 0.34, 0]}><cylinderGeometry args={[0.18, 0.16, 0.04, 20]} /><meshStandardMaterial color={wood} roughness={0.7} metalness={0.1} /></mesh>
      {[0, (Math.PI * 2) / 3, (Math.PI * 4) / 3].map((a, i) => (
        <mesh key={i} castShadow position={[Math.cos(a) * 0.15, 0.18, Math.sin(a) * 0.15]}>
          <cylinderGeometry args={[0.012, 0.012, 0.3, 8]} /><meshStandardMaterial color={wood} roughness={0.7} />
        </mesh>
      ))}
      <mesh position={[0, 0.135, 0]}><coneGeometry args={[0.125, 0.13, 18]} /><meshStandardMaterial color="#CFE0E6" roughness={0.12} transparent opacity={0.25} envMapIntensity={0.9} /></mesh>
      <mesh position={[0, 0.225, 0]} rotation={[Math.PI, 0, 0]}><coneGeometry args={[0.125, 0.13, 18]} /><meshStandardMaterial color="#CFE0E6" roughness={0.12} transparent opacity={0.25} envMapIntensity={0.9} /></mesh>
      <mesh position={[0, 0.1, 0]}><coneGeometry args={[0.095, 0.07, 16]} /><meshStandardMaterial color="#C2A566" roughness={1} /></mesh>
    </group>
  );
}

function Goblet({ position }) {
  const pts = useMemo(() => {
    const p = [];
    p.push(new THREE.Vector2(0, 0));
    p.push(new THREE.Vector2(0.12, 0));
    p.push(new THREE.Vector2(0.11, 0.025));
    p.push(new THREE.Vector2(0.03, 0.055));
    p.push(new THREE.Vector2(0.026, 0.17));
    p.push(new THREE.Vector2(0.07, 0.2));
    p.push(new THREE.Vector2(0.12, 0.26));
    p.push(new THREE.Vector2(0.125, 0.36));
    p.push(new THREE.Vector2(0.11, 0.36));
    p.push(new THREE.Vector2(0.108, 0.25));
    p.push(new THREE.Vector2(0, 0.24));
    return p;
  }, []);
  return (
    <mesh castShadow receiveShadow position={position}>
      <latheGeometry args={[pts, 28]} />
      <meshStandardMaterial color="#6B5230" roughness={0.3} metalness={0.92} envMapIntensity={0.9} side={THREE.DoubleSide} />
    </mesh>
  );
}

function Coins({ position }) {
  return (
    <group position={position}>
      {[0, 0.021, 0.042, 0.063].map((y, i) => (
        <mesh key={i} castShadow position={[i * 0.006, y + 0.012, i * 0.005]} rotation={[0, i * 0.9, 0]}>
          <cylinderGeometry args={[0.07, 0.07, 0.02, 22]} />
          <meshStandardMaterial color="#8A6E2E" roughness={0.45} metalness={0.85} envMapIntensity={0.8} />
        </mesh>
      ))}
      <mesh castShadow position={[0.17, 0.008, 0.06]} rotation={[0, 0.6, 0]}>
        <cylinderGeometry args={[0.07, 0.07, 0.015, 22]} />
        <meshStandardMaterial color="#8A6E2E" roughness={0.45} metalness={0.85} envMapIntensity={0.8} />
      </mesh>
    </group>
  );
}

function Scroll({ position, rotation = [0, 0, 0] }) {
  return (
    <group position={position} rotation={rotation}>
      <mesh castShadow rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.055, 0.055, 0.62, 18]} /><meshStandardMaterial color="#D8C9A0" roughness={0.92} /></mesh>
      <mesh position={[0.32, 0, 0]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.02, 0.02, 0.05, 12]} /><meshStandardMaterial color="#6B5A3A" roughness={0.9} /></mesh>
      <mesh position={[-0.32, 0, 0]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.02, 0.02, 0.05, 12]} /><meshStandardMaterial color="#6B5A3A" roughness={0.9} /></mesh>
    </group>
  );
}

function TableProps() {
  return (
    <group>
      {/* Kept clear of the side strips (x ≈ ±5.2), which hold captured pieces.
          Each is clickable — nudge, spin, or flip. */}
      <ClickAnim position={[6.1, 0, 4.4]} rotation={[0, -0.5, 0]} type="hop" sound="propTick"><Books /></ClickAnim>
      <ClickAnim position={[4.1, 0, 4.9]} type="spin" sound="coinSpin"><Coins /></ClickAnim>
      <ClickAnim position={[-6.2, 0, 4.2]} type="flip" pivot={0.18} sound="propTick"><Hourglass /></ClickAnim>
      <ClickAnim position={[6.5, 0, -1.2]} type="hop" sound="propTick"><Goblet /></ClickAnim>
      <ClickAnim position={[-6.5, 0, 1.0]} rotation={[0, 0.5, 0]} type="hop" sound="propTick"><Scroll /></ClickAnim>
      <ClickAnim position={[-4.4, 0, -5.7]} rotation={[0, 0.7, 0]} type="hop" sound="propTick"><Books /></ClickAnim>
    </group>
  );
}

function fmtClock(s) {
  const sec = Math.max(0, Math.ceil(s));
  return `${Math.floor(sec / 60)}:${(sec % 60).toString().padStart(2, '0')}`;
}

/**
 * Physical brass chess clock on the table with a live, glowing two-player display.
 */
function TableClock() {
  const whiteTime = useGameStore((s) => s.whiteTime);
  const blackTime = useGameStore((s) => s.blackTime);
  const currentPlayer = useGameStore((s) => s.currentPlayer);
  const gameOver = useGameStore((s) => s.gameOver);

  const wStr = fmtClock(whiteTime);
  const bStr = fmtClock(blackTime);
  const activeW = currentPlayer === 'white' && !gameOver;
  const activeB = currentPlayer === 'black' && !gameOver;

  // One canvas/texture, redrawn in place whenever the displayed values change.
  const { canvas, texture } = useMemo(() => {
    const c = document.createElement('canvas');
    c.width = 256;
    c.height = 128;
    return { canvas: c, texture: new THREE.CanvasTexture(c) };
  }, []);

  useEffect(() => {
    const x = canvas.getContext('2d');
    x.fillStyle = '#0b0a08';
    x.fillRect(0, 0, 256, 128);
    const row = (label, time, active, y) => {
      if (active) {
        x.fillStyle = 'rgba(255,150,60,0.14)';
        x.fillRect(6, y, 244, 52);
      }
      x.textAlign = 'left';
      x.font = 'bold 15px Georgia, serif';
      x.fillStyle = active ? '#FFB25E' : '#6b6257';
      x.fillText(label, 16, y + 33);
      x.textAlign = 'right';
      x.font = 'bold 40px Georgia, serif';
      x.fillStyle = active ? '#FFE0A8' : '#8a8175';
      x.fillText(time, 244, y + 38);
    };
    row('WHITE', wStr, activeW, 8);
    row('BLACK', bStr, activeB, 66);
    texture.needsUpdate = true;
  }, [canvas, texture, wStr, bStr, activeW, activeB]);

  // Rocker tilt toward the active side + plunger buttons that pop up/down.
  const rockerRef = useRef();
  const btnLRef = useRef();
  const btnRRef = useRef();
  const pressImpulse = useRef(0);

  const press = (e) => {
    e.stopPropagation();
    pressImpulse.current = 0.05;
    Sound.clockPress();
  };

  useFrame(() => {
    pressImpulse.current *= 0.84;
    if (pressImpulse.current < 0.001) pressImpulse.current = 0;
    if (rockerRef.current) {
      // Clear, springy rock toward whoever's clock is running.
      const targetZ = activeW ? 0.22 : activeB ? -0.22 : 0;
      rockerRef.current.rotation.z = THREE.MathUtils.lerp(rockerRef.current.rotation.z, targetZ, 0.14);
    }
    if (btnLRef.current) {
      const target = 0.35 + (activeW ? 0.06 - pressImpulse.current : -0.05);
      btnLRef.current.position.y = THREE.MathUtils.lerp(btnLRef.current.position.y, target, 0.25);
    }
    if (btnRRef.current) {
      const target = 0.35 + (activeB ? 0.06 - pressImpulse.current : -0.05);
      btnRRef.current.position.y = THREE.MathUtils.lerp(btnRRef.current.position.y, target, 0.25);
    }
  });

  return (
    <group position={[5.15, 0, 3.4]} rotation={[0, -0.55, 0]}>
      {/* Rocking body (tilts toward whoever's turn it is) */}
      <group ref={rockerRef}>
        {/* Brass body */}
        <mesh castShadow receiveShadow position={[0, 0.17, 0]}>
          <boxGeometry args={[1.2, 0.34, 0.52]} />
          <meshStandardMaterial color="#5A4527" roughness={0.4} metalness={0.9} envMapIntensity={0.7} />
        </mesh>
        {/* Dark recessed screen bezel */}
        <mesh position={[0, 0.36, 0.04]} rotation={[-1.3, 0, 0]}>
          <planeGeometry args={[1.12, 0.56]} />
          <meshStandardMaterial color="#100e0b" roughness={0.5} metalness={0.6} />
        </mesh>
        {/* Glowing display */}
        <mesh position={[0, 0.365, 0.045]} rotation={[-1.3, 0, 0]}>
          <planeGeometry args={[1.0, 0.48]} />
          <meshBasicMaterial map={texture} toneMapped={false} />
        </mesh>
        {/* Plunger buttons (white = left, black = right) */}
        <mesh ref={btnLRef} position={[-0.4, 0.35, -0.18]}>
          <cylinderGeometry args={[0.075, 0.085, 0.08, 16]} />
          <meshStandardMaterial color="#C9B182" roughness={0.35} metalness={0.9} envMapIntensity={0.9} />
        </mesh>
        <mesh ref={btnRRef} position={[0.4, 0.35, -0.18]}>
          <cylinderGeometry args={[0.075, 0.085, 0.08, 16]} />
          <meshStandardMaterial color="#5a5550" roughness={0.4} metalness={0.9} envMapIntensity={0.7} />
        </mesh>
      </group>

      {/* Little feet (stay planted) */}
      {[[-0.5, -0.22], [0.5, -0.22], [-0.5, 0.22], [0.5, 0.22]].map(([fx, fz], i) => (
        <mesh key={i} position={[fx, 0.02, fz]}>
          <cylinderGeometry args={[0.05, 0.05, 0.04, 12]} />
          <meshStandardMaterial color="#3B2F23" roughness={0.5} metalness={0.85} />
        </mesh>
      ))}

      {/* Clickable hotspot — "press" the clock */}
      <mesh
        position={[0, 0.34, 0]}
        visible={false}
        onClick={press}
        onPointerOver={(e) => { e.stopPropagation(); document.body.style.cursor = 'pointer'; }}
        onPointerOut={() => { document.body.style.cursor = 'auto'; }}
      >
        <boxGeometry args={[1.3, 0.5, 0.62]} />
      </mesh>
    </group>
  );
}

/**
 * Tapered wooden table top with a procedural dark wood grain texture (lighter and warmer)
 */
function TableTop() {
  const woodPBR = useMemo(() => createPBRTextures('wood', {
    c1: '#3D2F24', // Warm medium brown table
    c2: '#20160F', // dark wood grain lines
    grainCount: 120,
    knotCount: 3
  }), []);

  return (
    <mesh receiveShadow position={[0, -0.105, 0]}>
      <boxGeometry args={[25, 0.1, 25]} />
      <meshStandardMaterial
        map={woodPBR.map}
        bumpMap={woodPBR.bumpMap}
        bumpScale={0.02}
        roughnessMap={woodPBR.roughnessMap}
        metalness={0.05}
      />
    </mesh>
  );
}

/**
 * Dark wooden cabin walls enclosing the table, so the background reads as a dim
 * candlelit room instead of an empty void. Fog fades their tops into shadow.
 */
function Room() {
  const wallMat = useMemo(() => {
    const t = createPBRTextures('wood', {
      c1: '#1b130c', c2: '#090603', grainCount: 70, knotCount: 2, plankCount: 8,
    });
    [t.map, t.bumpMap, t.roughnessMap].forEach((x) => {
      x.center.set(0.5, 0.5);
      x.rotation = Math.PI / 2; // vertical planks
      x.repeat.set(5, 2.4);
    });
    return new THREE.MeshStandardMaterial({
      map: t.map, bumpMap: t.bumpMap, bumpScale: 0.03, roughnessMap: t.roughnessMap,
      roughness: 0.92, metalness: 0, color: '#3a2a1a', envMapIntensity: 0.2, side: THREE.DoubleSide,
    });
  }, []);

  const H = 16;
  const Y = H / 2 - 0.1;
  const R = 11; // close enough that the candles faintly warm the lower walls
  return (
    <group>
      {/* back wall (behind the black pieces) */}
      <mesh material={wallMat} position={[0, Y, -R]}><planeGeometry args={[2 * R + 4, H]} /></mesh>
      {/* side walls */}
      <mesh material={wallMat} position={[-R, Y, 0]} rotation={[0, Math.PI / 2, 0]}><planeGeometry args={[2 * R + 4, H]} /></mesh>
      <mesh material={wallMat} position={[R, Y, 0]} rotation={[0, -Math.PI / 2, 0]}><planeGeometry args={[2 * R + 4, H]} /></mesh>
    </group>
  );
}

export default function Canvas3D() {
  const viewMode = useGameStore((state) => state.viewMode);

  return (
    <div className="relative w-full h-full bg-[#0F0D0A]">
      <Canvas
        shadows="variance"
        dpr={[1, 1.5]} // cap pixel ratio — big win on hi-DPI/4K displays
        camera={{ position: [0, 9.4, 6.8], fov: 50 }}
        gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 0.92 }}
      >
        {/* Fog fades the room walls' tops into shadow while keeping the board clear */}
        <fog attach="fog" args={['#0C0906', 15, 30]} />

        {/* Local procedural environment — warm candlelit reflections on wood & brass.
            A low hearth glow gives the pieces a warm back-rim. (No external HDRI.) */}
        <Environment resolution={64} frames={1}>
          <color attach="background" args={['#0A0705']} />
          {/* Broad dim warm overhead bounce */}
          <Lightformer intensity={0.5} color="#6E5638" position={[0, 6, 0]} rotation={[Math.PI / 2, 0, 0]} scale={[16, 16, 1]} />
          {/* Warm candle highlights coming from the table corners */}
          <Lightformer intensity={1.4} color="#E9A65C" position={[-5, 1.4, -5]} scale={[3, 3, 1]} />
          <Lightformer intensity={1.4} color="#E9A65C" position={[5, 1.4, -5]} scale={[3, 3, 1]} />
          <Lightformer intensity={1.2} color="#E59F4E" position={[0, 1.4, 6]} scale={[3, 3, 1]} />
          {/* Low warm hearth glow from behind for a cosy back-rim on the pieces */}
          <Lightformer intensity={0.9} color="#C2531E" position={[0, 0.6, -9]} scale={[8, 2.5, 1]} />
          {/* Faint cool spill from the far corners so blacks don't crush */}
          <Lightformer intensity={0.25} color="#3a4457" position={[7, 3, -7]} scale={[4, 4, 1]} />
        </Environment>

        {/* Dark wooden cabin walls behind the table */}
        <Room />

        {/* Balanced ambient — warm and moody, but the board still reads clearly */}
        <ambientLight color="#C9BB9C" intensity={0.3} />

        {/* Gentle top-down wash so the tiles never crush to black. The warm front
            candle below does most of the shadow-filling across the middle. */}
        <directionalLight position={[0, 10, 2]} color="#E8D2A6" intensity={0.55} />

        {/* Key light: warm, high and slightly to the front-left, raking across the set */}
        <directionalLight
          castShadow
          position={[-4, 12, 5]}
          color="#F0DBB0"
          intensity={0.72}
          shadow-mapSize-width={1024}
          shadow-mapSize-height={1024}
          shadow-camera-far={26}
          shadow-camera-left={-5}
          shadow-camera-right={5}
          shadow-camera-top={5}
          shadow-camera-bottom={-5}
          shadow-bias={-0.0004}
          shadow-normalBias={0.02}
          shadow-radius={6}
          shadow-blurSamples={8}
        />

        {/* Soft cool counter-fill from the far side so back ranks don't crush to black */}
        <directionalLight position={[3, 8, -6]} color="#7C8398" intensity={0.18} />

        {/* Flickering candles of varying height. Only the three nearest the board
            cast light (perf); the outer two are flame-only decoration. */}
        <Candle3D position={[0, 0, 5.2]} height={0.4} seed={0.4} />
        <Candle3D position={[-4.5, 0, -4.5]} height={0.46} seed={1.3} />
        <Candle3D position={[4.5, 0, -4.5]} height={0.34} seed={4.1} />
        <Candle3D position={[5.9, 0, 2.6]} height={0.5} seed={2.7} castLight={false} />
        <Candle3D position={[-6.0, 0, -1.2]} height={0.3} seed={5.5} castLight={false} />

        {/* Table & Board Components */}
        <TableProps />
        <TableClock />
        <TableTop />
        <Suspense fallback={null}>
          <ChessBoard />
        </Suspense>

        {/* Smooth Camera View Controller */}
        <CameraController viewMode={viewMode} />
      </Canvas>
    </div>
  );
}
