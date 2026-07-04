import React, { useMemo, useRef, useEffect, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGameStore } from '../store/gameStore.js';
import { coordsToAlgebraic, algebraicToCoords } from '../utils/notation.js';
import { calculateLegalMoves } from '../utils/moves.js';
import ChessPiece from './ChessPiece.jsx';
import { createPBRTextures, createWoodTileTexture } from '../utils/textures.js';
import * as Sound from '../utils/sound.js';
import * as THREE from 'three';

const easeInOutCubic = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const MOVE_DURATION = 0.34; // seconds — snappy, with a landing pop

/**
 * Wraps a piece so it glides (with a gentle lift arc) from its origin square to
 * its destination whenever it is the piece that just moved. Everything else
 * simply sits at its base position.
 */
function PieceTransform({ basePos, startOffset, moveSerial, lift, children }) {
  const ref = useRef();
  // t runs 0 → 1 (glide) → 1.3 (landing squash). Start "finished" so idle pieces don't animate.
  const anim = useRef({ t: 1.3, ox: 0, oz: 0 });

  useEffect(() => {
    const mag = Math.hypot(startOffset[0], startOffset[2]);
    if (mag > 0.001) {
      anim.current = { t: 0, ox: startOffset[0], oz: startOffset[2] };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [moveSerial]);

  useFrame((_, delta) => {
    const a = anim.current;
    if (!ref.current || a.t >= 1.3) return;
    a.t = Math.min(1.3, a.t + delta / MOVE_DURATION);
    const glide = Math.min(1, a.t);
    const e = easeInOutCubic(glide);
    const ox = a.ox * (1 - e);
    const oz = a.oz * (1 - e);
    const oy = lift * Math.sin(glide * Math.PI);
    ref.current.position.set(basePos[0] + ox, basePos[1] + oy, basePos[2] + oz);
    // Landing squash-and-stretch once the piece touches down.
    if (a.t > 1) {
      const squash = Math.sin(((a.t - 1) / 0.3) * Math.PI) * 0.11;
      ref.current.scale.set(1 + squash, 1 - squash, 1 + squash);
    } else {
      ref.current.scale.set(1, 1, 1);
    }
  });

  return (
    <group ref={ref} position={basePos}>
      {children}
    </group>
  );
}

export default function ChessBoard() {
  const {
    board, selectedSquare, highlightedSquares, selectSquare,
    lastMove, isInCheck, currentPlayer, moveHistory, lastCapture,
    capturedByWhite, capturedByBlack, castlingRights, enPassantSquare,
    gameOver, aiThinking,
  } = useGameStore();

  const handleSquareClick = (square) => selectSquare(square);

  // Hover preview: when it's your turn and nothing is selected, hovering one of
  // your pieces lifts it and previews its legal moves.
  const [hovered, setHovered] = useState(null); // { square, moves }

  const canHover = !selectedSquare && currentPlayer === 'white' && !aiThinking && !gameOver;

  const onSquareOver = (square, piece, isHighlighted) => {
    const mine = piece && piece.color === 'white';
    if ((mine && canHover) || piece || isHighlighted) document.body.style.cursor = 'pointer';
    if (canHover && mine) {
      if (!hovered || hovered.square !== square) {
        const moves = calculateLegalMoves(board, square, castlingRights, enPassantSquare);
        setHovered({ square, moves });
        Sound.hoverTick();
      }
    }
  };

  const onSquareOut = (square) => {
    document.body.style.cursor = 'auto';
    setHovered((h) => (h && h.square === square ? null : h));
  };

  // Generate procedural PBR textures (Color, Bump, Roughness) once
  const borderPBR = useMemo(() => {
    const t = createPBRTextures('wood', {
      c1: '#2A2018', c2: '#0C0704', grainCount: 130, knotCount: 3, plankCount: 6,
    });
    [t.map, t.bumpMap, t.roughnessMap].forEach((x) => x.repeat.set(3, 3));
    return t;
  }, []);

  // Four DISTINCT wood variants per colour (each a fresh grain pattern, half with
  // rotated grain) mixed across the board, so the squares read like an inlaid wooden
  // board — an aged parquet — instead of the same rugged stamp on every tile.
  // Four aged/stained wood variants per colour (light wear, dark spill, water
  // rings, heavy scuffing), half with rotated grain, mixed across the board.
  const makeWoodTiles = (base, grain) =>
    [0, 1, 2, 3].map((variant) => {
      const t = createWoodTileTexture({ base, grain, variant });
      const rot = (variant % 2) * (Math.PI / 2); // alternate grain direction
      [t.map, t.bumpMap, t.roughnessMap].forEach((x) => {
        x.center.set(0.5, 0.5);
        x.rotation = rot;
      });
      return t;
    });
  const lightTiles = useMemo(() => makeWoodTiles('#B29463', '#6f4f27'), []); // aged light oak
  const darkTiles = useMemo(() => makeWoodTiles('#46331E', '#1e0f04'), []); // dark walnut
  const tileVariants = { light: lightTiles, dark: darkTiles };

  const files = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
  const ranks = ['1', '2', '3', '4', '5', '6', '7', '8'];

  // Lift height for the move arc, per piece type (knights hop higher).
  const liftFor = (type) => (type === 'knight' ? 0.55 : 0.22);

  return (
    <group>
      {/* --- Crafted wooden frame --- */}

      {/* Thick chamfered slab edge (seen from the side of the board).
          Kept below the tile surface (tiles' top = y 0.02) so it never occludes them. */}
      <mesh receiveShadow castShadow position={[0, -0.12, 0]}>
        <boxGeometry args={[9.5, 0.16, 9.5]} />
        <meshStandardMaterial
          map={borderPBR.map} bumpMap={borderPBR.bumpMap} bumpScale={0.03}
          roughnessMap={borderPBR.roughnessMap} metalness={0.04} envMapIntensity={0.25} color="#7a6a52"
        />
      </mesh>

      {/* Main border top surface with rich grain — top sits at y 0.00, flush under the tiles */}
      <mesh receiveShadow castShadow position={[0, -0.06, 0]}>
        <boxGeometry args={[9.1, 0.12, 9.1]} />
        <meshStandardMaterial
          map={borderPBR.map} bumpMap={borderPBR.bumpMap} bumpScale={0.03}
          roughnessMap={borderPBR.roughnessMap} metalness={0.04} envMapIntensity={0.3}
        />
      </mesh>

      {/* Raised inner molding lip (4 rails) that frames the playing field */}
      {[
        { p: [0, 0.02, 4.28], s: [8.9, 0.08, 0.28] },
        { p: [0, 0.02, -4.28], s: [8.9, 0.08, 0.28] },
        { p: [4.28, 0.02, 0], s: [0.28, 0.08, 8.9] },
        { p: [-4.28, 0.02, 0], s: [0.28, 0.08, 8.9] },
      ].map((r, i) => (
        <mesh key={`mold-${i}`} castShadow receiveShadow position={r.p}>
          <boxGeometry args={r.s} />
          <meshStandardMaterial
            map={borderPBR.map} bumpMap={borderPBR.bumpMap} bumpScale={0.025}
            roughnessMap={borderPBR.roughnessMap} metalness={0.05} envMapIntensity={0.3} color="#8a7358"
          />
        </mesh>
      ))}

      {/* Carved corner bosses */}
      {[[4.32, 4.32], [-4.32, 4.32], [4.32, -4.32], [-4.32, -4.32]].map(([cx, cz], i) => (
        <mesh key={`boss-${i}`} castShadow receiveShadow position={[cx, 0.03, cz]}>
          <boxGeometry args={[0.5, 0.12, 0.5]} />
          <meshStandardMaterial
            map={borderPBR.map} bumpMap={borderPBR.bumpMap} bumpScale={0.03}
            roughnessMap={borderPBR.roughnessMap} metalness={0.06} envMapIntensity={0.35} color="#93795b"
          />
        </mesh>
      ))}

      {/* Board inner gold trim */}
      <mesh position={[0, 0.005, 0]}>
        <boxGeometry args={[8.16, 0.01, 8.16]} />
        <meshStandardMaterial color="#B5996C" roughness={0.4} metalness={0.85} envMapIntensity={0.7} />
      </mesh>

      {/* Board Inner Recess */}
      <mesh receiveShadow position={[0, -0.01, 0]}>
        <boxGeometry args={[8.06, 0.05, 8.06]} />
        <meshStandardMaterial color="#0A0908" roughness={0.95} />
      </mesh>

      {/* 8x8 Board Tiles */}
      {Array(8).fill(null).map((_, row) => {
        return Array(8).fill(null).map((_, col) => {
          const square = coordsToAlgebraic(col, row);
          const isLight = (row + col) % 2 === 1;
          const isSelected = selectedSquare === square;
          const isHighlighted = highlightedSquares.includes(square);
          const isLastMove = lastMove && (lastMove.from === square || lastMove.to === square);
          const piece = board[row][col];
          const isCheckingKing = piece && piece.type === 'king' && isInCheck && piece.color === currentPlayer;
          const isCaptureTarget = isHighlighted && !!piece;
          const isHovered = canHover && hovered && hovered.square === square;
          const isHoverMove = canHover && hovered && !isHighlighted && hovered.moves.includes(square);
          const isHoverCapture = isHoverMove && !!piece;

          const x = col - 3.5;
          const z = 3.5 - row;

          const variantSet = isLight ? tileVariants.light : tileVariants.dark;
          const variant = variantSet[((row * 7 + col * 13 + row * col * 5) % 4 + 4) % 4];

          // Origin offset if this square is the destination of the last move.
          let startOffset = [0, 0, 0];
          if (piece && lastMove && lastMove.to === square) {
            const [fc, fr] = algebraicToCoords(lastMove.from);
            startOffset = [fc - col, 0, row - fr];
          }

          return (
            <group key={square}>
              {/* Individual Chess Tile with PBR Materials */}
              <mesh
                receiveShadow
                position={[x, 0.01, z]}
                onClick={(e) => {
                  e.stopPropagation();
                  handleSquareClick(square);
                }}
              >
                <boxGeometry args={[0.98, 0.02, 0.98]} />
                <meshStandardMaterial
                  map={variant.map}
                  bumpMap={variant.bumpMap}
                  bumpScale={0.032}
                  roughnessMap={variant.roughnessMap}
                  metalness={0.02}
                  envMapIntensity={0.22}
                />
              </mesh>

              {/* Last-move trail (soft warm wash on origin + destination) */}
              {isLastMove && !isSelected && (
                <mesh position={[x, 0.021, z]} rotation={[-Math.PI / 2, 0, 0]}>
                  <planeGeometry args={[0.96, 0.96]} />
                  <meshBasicMaterial color="#C79A5B" transparent opacity={0.18} depthWrite={false} />
                </mesh>
              )}

              {/* Selected square glow */}
              {isSelected && (
                <mesh position={[x, 0.022, z]} rotation={[-Math.PI / 2, 0, 0]}>
                  <planeGeometry args={[0.96, 0.96]} />
                  <meshBasicMaterial color="#FF7A3D" transparent opacity={0.3} depthWrite={false} />
                </mesh>
              )}

              {/* Move hints: soft dot on empty targets, ring on capture targets */}
              {isHighlighted && !isCaptureTarget && (
                <mesh position={[x, 0.023, z]} rotation={[-Math.PI / 2, 0, 0]}>
                  <circleGeometry args={[0.16, 32]} />
                  <meshBasicMaterial color="#E8C98F" transparent opacity={0.6} depthWrite={false} />
                </mesh>
              )}
              {isCaptureTarget && (
                <mesh position={[x, 0.023, z]} rotation={[-Math.PI / 2, 0, 0]}>
                  <ringGeometry args={[0.40, 0.48, 40]} />
                  <meshBasicMaterial color="#E8C98F" transparent opacity={0.75} depthWrite={false} side={THREE.DoubleSide} />
                </mesh>
              )}

              {/* Dim hover preview of legal moves */}
              {isHoverMove && !isHoverCapture && (
                <mesh position={[x, 0.023, z]} rotation={[-Math.PI / 2, 0, 0]}>
                  <circleGeometry args={[0.14, 28]} />
                  <meshBasicMaterial color="#C7B48A" transparent opacity={0.3} depthWrite={false} />
                </mesh>
              )}
              {isHoverCapture && (
                <mesh position={[x, 0.023, z]} rotation={[-Math.PI / 2, 0, 0]}>
                  <ringGeometry args={[0.40, 0.48, 36]} />
                  <meshBasicMaterial color="#C7B48A" transparent opacity={0.35} depthWrite={false} side={THREE.DoubleSide} />
                </mesh>
              )}

              {/* Raycast Click Target */}
              <mesh
                position={[x, 0.05, z]}
                visible={false}
                onClick={(e) => {
                  e.stopPropagation();
                  handleSquareClick(square);
                }}
                onPointerOver={(e) => {
                  e.stopPropagation();
                  onSquareOver(square, piece, isHighlighted);
                }}
                onPointerOut={(e) => {
                  e.stopPropagation();
                  onSquareOut(square);
                }}
              >
                <boxGeometry args={[1, 0.1, 1]} />
              </mesh>

              {/* Render Chess Piece if present */}
              {piece && (
                <PieceTransform
                  basePos={[x, 0.02, z]}
                  startOffset={startOffset}
                  moveSerial={moveHistory.length}
                  lift={liftFor(piece.type)}
                >
                  <ChessPiece
                    type={piece.type}
                    color={piece.color}
                    isSelected={isSelected}
                    isChecking={isCheckingKing}
                    isHovered={isHovered}
                  />
                </PieceTransform>
              )}
            </group>
          );
        });
      })}

      {/* Captured pieces set aside on the table (black on the right, white on the left) */}
      <CapturedPieces captured={capturedByWhite} color="black" side={1} />
      <CapturedPieces captured={capturedByBlack} color="white" side={-1} />

      {/* Gameplay VFX */}
      {lastMove && <ImpactFX key={`impact-${moveHistory.length}`} square={lastMove.to} />}
      <CaptureFX capture={lastCapture} />

      {/* Coordinate labels aligned along the Z axis */}
      {files.map((file, col) => {
        const x = col - 3.5;
        return (
          <group key={`label-file-${file}`}>
            <Label3D text={file} position={[x, 0.06, 4.25]} rotation={[-Math.PI / 2, 0, 0]} />
            <Label3D text={file} position={[x, 0.06, -4.25]} rotation={[-Math.PI / 2, 0, Math.PI]} />
          </group>
        );
      })}

      {ranks.map((rank, row) => {
        const z = 3.5 - row;
        return (
          <group key={`label-rank-${rank}`}>
            <Label3D text={rank} position={[-4.25, 0.06, z]} rotation={[-Math.PI / 2, 0, Math.PI / 2]} />
            <Label3D text={rank} position={[4.25, 0.06, z]} rotation={[-Math.PI / 2, 0, -Math.PI / 2]} />
          </group>
        );
      })}
    </group>
  );
}

/** Captured pieces set aside on the table, standing in columns beside the board. */
function CapturedPieces({ captured, color, side }) {
  return captured.map((type, i) => {
    const col = Math.floor(i / 8);
    const row = i % 8;
    const x = side * (5.25 + col * 0.75);
    const z = 2.3 - row * 0.8;
    return (
      <group key={i} position={[x, 0.02, z]} scale={0.58} rotation={[0, side * 0.3, 0]}>
        <ChessPiece type={type} color={color} castShadow={false} />
      </group>
    );
  });
}

/** Expanding ring flash on the tile a piece just landed on. */
function ImpactFX({ square }) {
  const [col, row] = algebraicToCoords(square);
  const x = col - 3.5;
  const z = 3.5 - row;
  const ref = useRef();
  const matRef = useRef();
  const t = useRef(0);
  useFrame((_, dt) => {
    if (!ref.current || t.current > 0.45) return;
    t.current += dt;
    const p = Math.min(1, t.current / 0.4);
    const s = 0.35 + p * 0.9;
    ref.current.scale.set(s, s, s);
    if (matRef.current) matRef.current.opacity = 0.5 * (1 - p);
  });
  return (
    <mesh ref={ref} position={[x, 0.03, z]} rotation={[-Math.PI / 2, 0, 0]}>
      <ringGeometry args={[0.34, 0.46, 40]} />
      <meshBasicMaterial ref={matRef} color="#E8C98F" transparent opacity={0.5} depthWrite={false} side={THREE.DoubleSide} />
    </mesh>
  );
}

/** Captured piece: crumbles into the board while a burst of shards flies out. */
function CaptureFX({ capture }) {
  if (!capture) return null;
  return <CaptureBurst key={capture.serial} capture={capture} />;
}

function CaptureBurst({ capture }) {
  const { square, type, color } = capture;
  const [col, row] = algebraicToCoords(square);
  const x = col - 3.5;
  const z = 3.5 - row;
  const dyingRef = useRef();
  const partsRef = useRef();
  const flashRef = useRef();
  const t = useRef(0);
  const done = useRef(false);

  const shards = useMemo(() => Array.from({ length: 20 }, () => ({
    dir: [(Math.random() - 0.5) * 2, Math.random() * 0.9 + 0.5, (Math.random() - 0.5) * 2],
    spd: 1.6 + Math.random() * 2.6,
    rot: [Math.random() * 6, Math.random() * 6, Math.random() * 6],
    sz: 0.05 + Math.random() * 0.08,
  })), []);

  useFrame((_, dt) => {
    if (done.current) return;
    t.current += dt;
    const p = t.current;
    if (dyingRef.current) {
      const k = Math.min(1, p / 0.32);
      dyingRef.current.scale.setScalar(Math.max(0.001, 1 - k));
      dyingRef.current.position.y = 0.02 - k * 0.12;
      dyingRef.current.rotation.y = k * 4;
    }
    if (partsRef.current) {
      partsRef.current.children.forEach((m, i) => {
        const sd = shards[i];
        const py = 0.25 + sd.dir[1] * sd.spd * p - 4.9 * p * p * 0.18;
        m.position.set(x + sd.dir[0] * sd.spd * p, Math.max(0.02, py), z + sd.dir[2] * sd.spd * p);
        m.rotation.set(sd.rot[0] + p * 8, sd.rot[1] + p * 8, sd.rot[2]);
        m.scale.setScalar(Math.max(0, sd.sz * (1 - p / 0.6)));
      });
    }
    if (flashRef.current) {
      const fp = Math.min(1, p / 0.16);
      flashRef.current.scale.setScalar(0.2 + fp * 0.55);
      flashRef.current.material.opacity = 0.85 * (1 - fp);
    }
    if (p > 0.65) done.current = true;
  });

  const shardColor = color === 'white' ? '#D8C39A' : '#3a2c20';
  return (
    <group>
      <group ref={dyingRef} position={[x, 0.02, z]}>
        <ChessPiece type={type} color={color} />
      </group>
      {/* Warm impact flash */}
      <mesh ref={flashRef} position={[x, 0.16, z]} scale={0.2}>
        <sphereGeometry args={[1, 16, 16]} />
        <meshBasicMaterial color="#FFB86B" transparent opacity={0.85} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
      </mesh>
      <group ref={partsRef}>
        {shards.map((s, i) => (
          // Start invisible at the capture square; useFrame positions/sizes them.
          // Emissive so the shards read as hot, glowing embers (esp. for dark pieces).
          <mesh key={i} position={[x, 0.2, z]} scale={0}>
            <tetrahedronGeometry args={[1, 0]} />
            <meshStandardMaterial
              color={shardColor}
              emissive="#FF6A1E"
              emissiveIntensity={0.7}
              roughness={0.6}
              metalness={0.1}
              toneMapped={false}
            />
          </mesh>
        ))}
      </group>
    </group>
  );
}

/**
 * Coordinate label projected onto the board borders using Canvas textures
 */
function Label3D({ text, position, rotation }) {
  const canvas = useMemo(() => {
    const c = document.createElement('canvas');
    c.width = 64;
    c.height = 64;
    const ctx = c.getContext('2d');
    ctx.clearRect(0, 0, 64, 64);
    ctx.font = 'bold 36px Georgia, serif';
    ctx.fillStyle = '#A89575';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.9)';
    ctx.shadowBlur = 5;
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 2;
    ctx.fillText(text, 32, 32);
    return c;
  }, [text]);

  const texture = useMemo(() => new THREE.CanvasTexture(canvas), [canvas]);

  return (
    <mesh position={position} rotation={rotation} renderOrder={2}>
      <planeGeometry args={[0.2, 0.2]} />
      <meshBasicMaterial
        map={texture}
        transparent={true}
        side={THREE.DoubleSide}
        depthWrite={false}
        polygonOffset
        polygonOffsetFactor={-6}
        polygonOffsetUnits={-6}
      />
    </mesh>
  );
}
