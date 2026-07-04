import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useGameStore } from '../store/gameStore.js';
import { 
  Flame, 
  ShieldAlert, 
  Award, 
  RotateCcw, 
  Swords, 
  Volume2, 
  VolumeX, 
  Clock, 
  Skull, 
  Anchor, 
  Compass,
  FileText,
  Settings,
  ChevronUp,
  ChevronDown
} from 'lucide-react';

const PIECE_GLYPH = { pawn: '♟', knight: '♞', bishop: '♝', rook: '♜', queen: '♛', king: '♚' };
const PROMO_GLYPH = { queen: '♛', rook: '♜', bishop: '♝', knight: '♞' };
const PIECE_VALUE = { pawn: 1, knight: 3, bishop: 3, rook: 5, queen: 9, king: 0 };

function formatTime(s) {
  const sec = Math.max(0, Math.ceil(s));
  const m = Math.floor(sec / 60);
  const r = sec % 60;
  return `${m}:${r.toString().padStart(2, '0')}`;
}

function sumValue(list) {
  return list.reduce((a, t) => a + (PIECE_VALUE[t] || 0), 0);
}

/**
 * HTML5 Canvas real-time particle emitter for rising embers & cinematic ash.
 */
function EmberOverlay() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    let animationId;
    let particles = [];
    let width = canvas.width = window.innerWidth;
    let height = canvas.height = window.innerHeight;

    class Particle {
      constructor() {
        this.reset();
        this.y = Math.random() * height;
      }
      reset() {
        this.x = Math.random() * width;
        this.y = height + 12;
        this.size = 1.2 + Math.random() * 2.2;
        this.speedY = 0.6 + Math.random() * 1.4;
        this.speedX = (Math.random() - 0.5) * 0.7;
        this.life = 0.5 + Math.random() * 0.5;
        this.decay = 0.0012 + Math.random() * 0.0025;
        this.hue = 16 + Math.random() * 22;
      }
      update() {
        this.y -= this.speedY;
        this.x += this.speedX + Math.sin(this.y * 0.008) * 0.15;
        this.life -= this.decay;
        if (this.life <= 0 || this.y < -12) {
          this.reset();
        }
      }
      draw() {
        ctx.save();
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        const alpha = Math.max(0, this.life);
        ctx.fillStyle = `hsla(${this.hue}, 100%, 54%, ${alpha})`;
        ctx.shadowBlur = this.size * 2.5;
        ctx.shadowColor = `hsl(${this.hue}, 100%, 50%)`;
        ctx.fill();
        ctx.restore();
      }
    }

    for (let i = 0; i < 75; i++) {
      particles.push(new Particle());
    }

    const animate = () => {
      ctx.clearRect(0, 0, width, height);
      particles.forEach(p => {
        p.update();
        p.draw();
      });
      animationId = requestAnimationFrame(animate);
    };

    animate();

    const handleResize = () => {
      if (canvas) {
        width = canvas.width = window.innerWidth;
        height = canvas.height = window.innerHeight;
      }
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none z-10 w-full h-full" />;
}

/**
 * Procedural HTML5 Canvas Pirate Map with winding path and glowing red X marks the spot.
 */
function PirateMapCanvas({ progress }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    let width = canvas.width = window.innerWidth;
    let height = canvas.height = window.innerHeight;

    const drawMap = () => {
      // Vignette radial parchment gradient
      const grad = ctx.createRadialGradient(width / 2, height / 2, 40, width / 2, height / 2, Math.max(width, height) * 0.85);
      grad.addColorStop(0, '#f8ebd0'); // light warm parchment
      grad.addColorStop(0.55, '#dfc49c'); // sepia tan
      grad.addColorStop(1, '#ab8659'); // dark burnt edges
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);

      // Draw subtle nautical grids
      ctx.strokeStyle = 'rgba(61, 37, 22, 0.05)';
      ctx.lineWidth = 1;
      const gridSize = 100;
      for (let x = 0; x < width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = 0; y < height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      // Draw hand-drawn sea monster / compass rose (faded center top)
      const cx = width / 2;
      const cy = height * 0.22;
      ctx.save();
      ctx.strokeStyle = 'rgba(61, 37, 22, 0.16)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(cx, cy, 45, 0, Math.PI * 2);
      ctx.stroke();
      // Compass rays
      for (let i = 0; i < 8; i++) {
        const angle = (i * Math.PI) / 4;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx + Math.cos(angle) * 45, cy + Math.sin(angle) * 45);
        ctx.stroke();
      }
      ctx.restore();

      // Draw sepia islands
      ctx.fillStyle = 'rgba(156, 120, 80, 0.15)';
      ctx.strokeStyle = 'rgba(61, 37, 22, 0.25)';
      ctx.lineWidth = 2;

      // Island 1 (top-left)
      ctx.beginPath();
      ctx.moveTo(80, 80);
      ctx.bezierCurveTo(240, 40, 320, 180, 240, 280);
      ctx.bezierCurveTo(180, 380, 40, 280, 80, 80);
      ctx.fill();
      ctx.stroke();

      // Island 2 (bottom-right)
      ctx.beginPath();
      ctx.moveTo(width - 120, height - 120);
      ctx.bezierCurveTo(width - 40, height - 260, width - 260, height - 360, width - 360, height - 220);
      ctx.bezierCurveTo(width - 400, height - 120, width - 220, height - 80, width - 120, height - 120);
      ctx.fill();
      ctx.stroke();

      // Winding trail path towards center marks the spot
      const points = [
        { x: 120, y: 150 },
        { x: width * 0.24, y: height * 0.42 },
        { x: width * 0.28, y: height * 0.72 },
        { x: width * 0.5, y: height * 0.78 },
        { x: width * 0.72, y: height * 0.65 },
        { x: width * 0.68, y: height * 0.38 },
        { x: width * 0.5, y: height * 0.42 } // center loading area
      ];

      ctx.strokeStyle = '#9c2727';
      ctx.lineWidth = 3;
      ctx.setLineDash([8, 6]);
      ctx.beginPath();

      if (points.length > 0) {
        ctx.moveTo(points[0].x, points[0].y);
        const targetPercent = progress / 100;
        const totalSegments = points.length - 1;
        const currentSegment = Math.floor(targetPercent * totalSegments);
        const segmentPercent = (targetPercent * totalSegments) - currentSegment;

        for (let i = 1; i <= currentSegment; i++) {
          ctx.lineTo(points[i].x, points[i].y);
        }

        if (currentSegment < totalSegments) {
          const startPt = points[currentSegment];
          const endPt = points[currentSegment + 1];
          const currX = startPt.x + (endPt.x - startPt.x) * segmentPercent;
          const currY = startPt.y + (endPt.y - startPt.y) * segmentPercent;
          ctx.lineTo(currX, currY);
        }
        ctx.stroke();
      }

      ctx.setLineDash([]);

      // Glow Red X
      if (progress > 0) {
        const lastPt = points[points.length - 1];
        const opacity = progress >= 100 ? (0.6 + Math.abs(Math.sin(Date.now() * 0.005)) * 0.4) : (progress / 100);
        ctx.save();
        ctx.strokeStyle = `rgba(156, 39, 39, ${opacity})`;
        ctx.lineWidth = 5;
        const size = 16;
        ctx.beginPath();
        ctx.moveTo(lastPt.x - size, lastPt.y - size);
        ctx.lineTo(lastPt.x + size, lastPt.y + size);
        ctx.moveTo(lastPt.x + size, lastPt.y - size);
        ctx.lineTo(lastPt.x - size, lastPt.y + size);
        ctx.stroke();
        ctx.restore();
      }
    };

    drawMap();

    let animId;
    const tick = () => {
      drawMap();
      animId = requestAnimationFrame(tick);
    };
    
    if (progress < 100) {
      tick();
    } else {
      drawMap();
    }

    const handleResize = () => {
      if (canvas) {
        width = canvas.width = window.innerWidth;
        height = canvas.height = window.innerHeight;
        drawMap();
      }
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
    };
  }, [progress]);

  return <canvas ref={canvasRef} className="absolute inset-0 z-10 w-full h-full pointer-events-none" />;
}


/**
 * Staggered letter-pop text animator for high-end cinematic title card reveals
 */
function AnimatedTitle({ text, className, style }) {
  return (
    <span className={`inline-flex justify-center gap-[4px] ${className}`} style={style}>
      {text.split('').map((char, i) => (
        <span
          key={i}
          className="letter-pop-item"
          style={{ '--delay': `${i * 0.08}s` }}
        >
          {char === ' ' ? '\u00A0' : char}
        </span>
      ))}
    </span>
  );
}

/** A row of captured piece glyphs + material advantage. */
function CapturedTray({ pieces, glyphColor, advantage }) {
  const sorted = [...pieces].sort((a, b) => PIECE_VALUE[b] - PIECE_VALUE[a]);
  return (
    <div className="flex items-center gap-[2px] h-5 bg-black/30 px-2 py-0.5 rounded border border-[#4a3427]/40">
      {sorted.map((p, i) => (
        <span key={i} className="text-base leading-none transition-transform hover:scale-125" style={{ color: glyphColor, filter: 'drop-shadow(0 1.5px 1px rgba(0,0,0,0.9))' }}>
          {PIECE_GLYPH[p]}
        </span>
      ))}
      {sorted.length === 0 && <span className="text-[10px] text-zinc-600 font-sans italic uppercase">No losses</span>}
      {advantage > 0 && <span className="text-[10px] font-sans font-extrabold text-[#cda972] ml-1 bg-[#cda972]/10 px-1 rounded">+{advantage}</span>}
    </div>
  );
}

/** Clock chip; highlights when it's that side's turn. */
function ClockChip({ time, active, low }) {
  return (
    <div
      className={`flex items-center gap-1.5 px-3 py-1 rounded border font-mono tabular-nums transition pirate-timer
        ${active ? 'border-[#cda972] shadow-[0_0_10px_rgba(205,169,114,0.22)]' : 'border-[#4a3427] opacity-60'}`}
    >
      <Clock className={`w-3.5 h-3.5 ${active ? 'text-[#cda972] animate-pulse' : 'text-zinc-600'}`} />
      <span 
        className={`text-base font-bold tracking-wider ${low ? 'text-[#e55039] animate-pulse' : active ? 'text-[#fff8e8]' : 'text-zinc-400'}`}
        style={{ textShadow: active && !low ? '0 0 6px rgba(255,248,232,0.2)' : undefined }}
      >
        {formatTime(time)}
      </span>
    </div>
  );
}

export default function UIOverlay() {
  const {
    board,
    selectedSquare,
    currentPlayer,
    aiDifficulty,
    aiThinking,
    gameOver,
    gameResult,
    isInCheck,
    promotionPending,
    completePromotion,
    resetGame,
    moveHistory,
    soundEnabled,
    toggleSound,
    whiteTime,
    blackTime,
    capturedByWhite,
    capturedByBlack
  } = useGameStore();

  const [loadingState, setLoadingState] = useState('loading'); // 'loading', 'setup', 'playing'
  const [loadProgress, setLoadProgress] = useState(0);
  const [loadingText, setLoadingText] = useState('Spawning the cabin table...');
  const [columnsExit, setColumnsExit] = useState(false);
  const [logExpanded, setLogExpanded] = useState(false);
  const [settingsExpanded, setSettingsExpanded] = useState(false);

  // Cinematic initial loading screen effect with staggered column slide-up
  useEffect(() => {
    let progress = 0;
    const texts = [
      "Unrolling the captain's charts...",
      "Polishing the golden dubloons...",
      "Charting the path through the fog...",
      "Pouring the black spiced rum...",
      "Assembling the skeleton crew...",
      "Ready for boarding!"
    ];

    const timer = setInterval(() => {
      const step = 6 + Math.floor(Math.random() * 12);
      progress = Math.min(100, progress + step);
      setLoadProgress(progress);

      // Rotate loading text
      const textIdx = Math.min(texts.length - 1, Math.floor((progress / 100) * texts.length));
      setLoadingText(texts[textIdx]);

      if (progress >= 100) {
        clearInterval(timer);
        // Start staggered column exit slide-up
        setTimeout(() => {
          setColumnsExit(true);
          // Wait for all 5 columns (1000ms transition + 400ms delay max) to slide out completely
          setTimeout(() => {
            setLoadingState('setup');
          }, 1400);
        }, 300);
      }
    }, 180);

    return () => clearInterval(timer);
  }, []);

  // Drive the chess clock with real elapsed time while the game is live.
  useEffect(() => {
    if (loadingState !== 'playing' || gameOver || promotionPending) return;
    let last = performance.now();
    const id = setInterval(() => {
      const now = performance.now();
      const dt = (now - last) / 1000;
      last = now;
      useGameStore.getState().decrementClock(dt);
    }, 200);
    return () => clearInterval(id);
  }, [loadingState, gameOver, promotionPending]);

  const whiteScore = sumValue(capturedByWhite);
  const blackScore = sumValue(capturedByBlack);
  const materialDiff = whiteScore - blackScore;

  const handleStartGame = (difficulty) => {
    resetGame(difficulty);
    setLoadingState('playing');
  };

  const handleRestart = () => {
    resetGame(aiDifficulty);
  };

  // Format move logs for the Captain's Log scrollable sheet
  const formattedMoves = useMemo(() => {
    const pairs = [];
    for (let i = 0; i < moveHistory.length; i += 2) {
      const whiteMove = moveHistory[i];
      const blackMove = moveHistory[i + 1];
      
      const formatMoveStr = (move) => {
        if (!move) return '';
        const symbol = move.captured ? 'x' : '➔';
        return `${move.from}${symbol}${move.to}`;
      };

      pairs.push({
        num: Math.floor(i / 2) + 1,
        white: formatMoveStr(whiteMove),
        black: formatMoveStr(blackMove)
      });
    }
    return pairs;
  }, [moveHistory]);

  const selectedPiece = selectedSquare ? board[selectedSquare] : null;

  // 1. INITIAL PAGE LOADING SCREEN (AWWWARDS-WORTHY STAGGERED STAIRCASE REVEAL)
  if (loadingState === 'loading') {
    return (
      <div className="absolute inset-0 z-50 overflow-hidden font-serif">
        {/* Pirate Map Canvas Background */}
        <div 
          className="absolute inset-0 z-20 transition-opacity duration-600 pointer-events-none"
          style={{ opacity: columnsExit ? 0 : 1 }}
        >
          <PirateMapCanvas progress={loadProgress} />
        </div>

        {/* Staggered Vertical columns cover */}
        <div className="absolute inset-0 flex z-40 pointer-events-none">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="h-full flex-1 bg-gradient-to-b from-[#1c140f] to-[#080504] border-r border-[#3d2516]/10 transition-transform duration-[1000ms]"
              style={{
                transform: columnsExit ? 'translateY(-100%)' : 'translateY(0)',
                transitionTimingFunction: 'cubic-bezier(0.85, 0, 0.15, 1)',
                transitionDelay: `${i * 100}ms`
              }}
            />
          ))}
        </div>

        {/* Text & Counter Content */}
        <div 
          className="absolute inset-0 flex flex-col items-center justify-center text-[#26160d] z-50 transition-opacity duration-500 pointer-events-none"
          style={{ opacity: columnsExit ? 0 : 1 }}
        >
          {/* Cinematic Vignette */}
          <div className="cinematic-vignette opacity-45"></div>

          <div className="flex flex-col items-center gap-6 text-center max-w-sm relative z-10">
            <div className="relative">
              <Compass className="w-20 h-20 text-[#3d2516] animate-[spin_6s_linear_infinite] drop-shadow-[0_2px_5px_rgba(0,0,0,0.3)]" />
              <div className="absolute inset-0 flex items-center justify-center">
                <Skull className="w-6 h-6 text-[#3d2516]/60" />
              </div>
            </div>

            {/* Split Letter Mask Reveal */}
            <div className="overflow-hidden h-14 flex items-center justify-center px-4">
              <span className="text-4xl md:text-5xl font-extrabold tracking-[0.2em] uppercase flex gap-1 font-serif text-[#3d2516] drop-shadow-[0_1.5px_2px_rgba(255,255,255,0.45)]">
                {"CHECKUNO".split('').map((char, i) => (
                  <span
                    key={i}
                    className="inline-block animate-[slideUp_0.9s_cubic-bezier(0.23,1,0.32,1)_forwards]"
                    style={{ animationDelay: `${i * 70}ms`, transform: 'translateY(100%)' }}
                  >
                    {char}
                  </span>
                ))}
              </span>
            </div>

            <p className="text-[10px] font-sans tracking-[0.25em] text-[#3d2516] uppercase font-bold mt-1 opacity-80">
              Chess Foundation
            </p>
            
            <div className="flex flex-col items-center gap-2 mt-8 w-full px-8">
              <span className="text-xs italic text-[#26160d]/85 h-6 transition-all font-semibold">{loadingText}</span>
              <div className="rust-bar-container border-[#3d2516]/40 bg-[#3d2516]/10">
                <div className="rust-bar-fill" style={{ width: `${loadProgress}%` }}></div>
              </div>
              <span className="text-[10px] font-sans font-bold text-[#3d2516] mt-1">{loadProgress}%</span>
            </div>

            {/* Giant Ticking Serif background counter */}
            <div className="absolute -bottom-24 font-mono text-8xl font-black tracking-tighter opacity-[0.03] select-none pointer-events-none text-black">
              {loadProgress.toString().padStart(3, '0')}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 2. PRE-GAME SETUP BOARD (PIRATE CHEST BANNER)
  if (loadingState === 'setup') {
    return (
      <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/85 text-[#e4dcc4] font-serif p-4 animate-[fadeIn_0.5s_ease-out]">
        {/* Cinematic Vignette */}
        <div className="cinematic-vignette"></div>

        <div className="w-full max-w-md pirate-parchment p-8 rounded-md shadow-2xl text-center border-4 border-[#3d2516] relative z-10 menu-entrance">
          {/* Ornate Copper Rivets */}
          <div className="rivet rivet-tl"></div>
          <div className="rivet rivet-tr"></div>
          <div className="rivet rivet-bl"></div>
          <div className="rivet rivet-br"></div>

          {/* Filigree Borders */}
          <div className="filigree-corner filigree-tl"></div>
          <div className="filigree-corner filigree-tr"></div>
          <div className="filigree-corner filigree-bl"></div>
          <div className="filigree-corner filigree-br"></div>

          {/* Compass Logo */}
          <div className="flex justify-center mb-2">
            <Compass className="w-12 h-12 text-[#3d2516] animate-[spin_10s_linear_infinite]" />
          </div>

          <h1 className="text-4xl font-extrabold tracking-widest text-[#3d2516] mb-1 uppercase drop-shadow-sm font-serif">
            CheckUno
          </h1>
          <p className="text-[10px] font-sans tracking-widest text-[#3d2516]/60 mb-6 uppercase font-bold border-b border-[#3d2516]/30 pb-4">
            Captain's Chess Cabin
          </p>

          <div className="mb-6">
            <p className="text-lg italic text-[#26160d]/80 mb-6 leading-relaxed font-serif">
              "The cabin is dark, the sails are set. Pick your opponent's wits."
            </p>
            <div className="flex flex-col gap-3 max-w-xs mx-auto">
              <button
                onClick={() => handleStartGame('easy')}
                className="w-full py-3 px-6 pirate-button text-sm cursor-pointer button-entrance"
                style={{ '--delay': '0.35s' }}
              >
                Easy AI (Deckhand)
              </button>
              <button
                onClick={() => handleStartGame('medium')}
                className="w-full py-3 px-6 pirate-button text-sm font-bold text-[#fff8e8] cursor-pointer button-entrance"
                style={{ '--delay': '0.5s' }}
              >
                Medium AI (First Mate)
              </button>
              <button
                onClick={() => handleStartGame('hard')}
                className="w-full py-3 px-6 pirate-button text-sm cursor-pointer button-entrance"
                style={{ '--delay': '0.65s' }}
              >
                Hard AI (Dread Captain)
              </button>
            </div>
          </div>

          <div className="text-[11px] font-serif text-[#3d2516]/75 max-w-xs mx-auto leading-relaxed border-t border-[#3d2516]/25 pt-4 animate-[fadeIn_0.8s_ease-out] [animation-delay:0.8s] opacity-0 [animation-fill-mode:forwards]">
            FIDE rules apply. White starts the duel. Tap options to control logs and sounds.
          </div>
        </div>
      </div>
    );
  }

  // 3. LIVE GAME PLAY HUD OVERLAY
  return (
    <div className="absolute inset-0 pointer-events-none z-40">
      {/* Tense blood-red vignette warning when King is in check */}
      {isInCheck && !gameOver && (
        <div
          className="absolute inset-0 pointer-events-none animate-pulse"
          style={{ boxShadow: 'inset 0 0 150px 30px rgba(139, 26, 26, 0.45)' }}
        />
      )}

      {/* HUD Elements with Screen Padding */}
      <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-6">
        {/* TOP STATUS ROW */}
        <div className="w-full flex justify-between items-start pointer-events-none">
          
          {/* Left Side: White Player Panel (Parchment Styled) */}
          <div className="flex flex-col gap-1.5 pirate-parchment px-4 py-3 rounded border-3 border-[#3d2516] min-w-[220px] pointer-events-auto">
            {/* Rivet details */}
            <div className="rivet rivet-tl" style={{ width: '5px', height: '5px' }}></div>
            <div className="rivet rivet-tr" style={{ width: '5px', height: '5px' }}></div>
            <div className="rivet rivet-bl" style={{ width: '5px', height: '5px' }}></div>
            <div className="rivet rivet-br" style={{ width: '5px', height: '5px' }}></div>
            
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Anchor className="w-4 h-4 text-[#3d2516]" />
                <div className="text-left">
                  <div className="text-[9px] uppercase tracking-widest font-sans text-[#3d2516]/60 font-bold">White · You</div>
                  <div className="text-base font-bold font-serif leading-none mt-0.5">
                    {currentPlayer === 'white' ? <span className="burned-text">Your Duel</span> : <span className="text-[#3d2516]/50">Waiting</span>}
                  </div>
                </div>
              </div>
              <ClockChip time={whiteTime} active={currentPlayer === 'white' && !gameOver} low={whiteTime < 30} />
            </div>
            <CapturedTray pieces={capturedByWhite} glyphColor="#2e1a0c" advantage={materialDiff} />
          </div>

          {/* Floating Check Alert Scroll */}
          {isInCheck && !gameOver && (
            <div className="flex items-center gap-2 pirate-parchment border-3 border-[#8b1a1a] px-5 py-3 rounded animate-bounce shadow-xl pointer-events-auto">
              <ShieldAlert className="w-5 h-5 text-[#8b1a1a]" />
              <div className="text-sm font-bold uppercase tracking-widest font-serif text-[#8b1a1a]">
                King Under Attack!
              </div>
            </div>
          )}

          {/* Right Side: Black Foe Panel (Wood Planks Styled) */}
          <div className="flex flex-col gap-1.5 pirate-wood-panel px-4 py-3 rounded border-3 border-[#4a3427] min-w-[220px] pointer-events-auto">
            {/* Rivet details */}
            <div className="rivet rivet-tl" style={{ width: '5px', height: '5px' }}></div>
            <div className="rivet rivet-tr" style={{ width: '5px', height: '5px' }}></div>
            <div className="rivet rivet-bl" style={{ width: '5px', height: '5px' }}></div>
            <div className="rivet rivet-br" style={{ width: '5px', height: '5px' }}></div>
            
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Skull className="w-4 h-4 text-[#cda972]" />
                <div className="text-left">
                  <div className="text-[9px] uppercase tracking-widest font-sans text-zinc-500 font-bold">Black · Foe</div>
                  <div className="text-xs font-bold uppercase text-[#cda972] mt-0.5 tracking-wider">{aiDifficulty} AI</div>
                </div>
              </div>
              <ClockChip time={blackTime} active={currentPlayer === 'black' && !gameOver} low={blackTime < 30} />
            </div>
            <div className="flex items-center justify-between gap-2">
              <CapturedTray pieces={capturedByBlack} glyphColor="#e2d8c3" advantage={-materialDiff} />
              <div className="flex items-center gap-1.5">
                <button
                  onClick={toggleSound}
                  className="p-1 hover:text-[#cda972] hover:bg-black/30 rounded border border-transparent hover:border-[#6b4d3a] transition cursor-pointer"
                  title={soundEnabled ? 'Mute Sounds' : 'Unmute Sounds'}
                >
                  {soundEnabled ? <Volume2 className="w-3.5 h-3.5 text-[#cda972]" /> : <VolumeX className="w-3.5 h-3.5 text-zinc-500" />}
                </button>
                <button
                  onClick={handleRestart}
                  className="p-1 hover:text-[#cda972] hover:bg-black/30 rounded border border-transparent hover:border-[#6b4d3a] transition cursor-pointer"
                  title="Concede & Restart"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-zinc-400" />
                </button>
              </div>
            </div>
          </div>

        </div>

        {/* BOTTOM FEED / INSPECTOR STATUS ROW */}
        <div className="w-full flex justify-between items-end pointer-events-none">
          {/* Moves Counter Badge */}
          <div className="pirate-wood-panel px-4 py-2 rounded text-[#e4dcc4] font-serif text-sm tracking-wider border-2 border-[#4a3427] min-w-[130px] text-center pointer-events-auto">
            <div className="rivet rivet-tl" style={{ width: '4px', height: '4px', top: '3px', left: '3px' }}></div>
            <div className="rivet rivet-tr" style={{ width: '4px', height: '4px', top: '3px', right: '3px' }}></div>
            <div className="rivet rivet-bl" style={{ width: '4px', height: '4px', bottom: '3px', left: '3px' }}></div>
            <div className="rivet rivet-br" style={{ width: '4px', height: '4px', bottom: '3px', right: '3px' }}></div>
            Logs: <span className="text-[#cda972] font-sans font-bold">{moveHistory.length} Moves</span>
          </div>

          {/* Selected Piece Inspector Badge */}
          {selectedPiece ? (
            <div className="pirate-parchment px-6 py-2 rounded border-2 border-[#3d2516] shadow-lg animate-[fadeIn_0.15s_ease-out] text-center max-w-xs pointer-events-auto">
              <div className="rivet rivet-tl" style={{ width: '4px', height: '4px', top: '3px', left: '3px' }}></div>
              <div className="rivet rivet-tr" style={{ width: '4px', height: '4px', top: '3px', right: '3px' }}></div>
              <div className="rivet rivet-bl" style={{ width: '4px', height: '4px', bottom: '3px', left: '3px' }}></div>
              <div className="rivet rivet-br" style={{ width: '4px', height: '4px', bottom: '3px', right: '3px' }}></div>
              <span className="text-sm font-bold uppercase tracking-widest font-serif flex items-center justify-center gap-1.5">
                <span className="text-[#8b1a1a] text-lg leading-none">{PIECE_GLYPH[selectedPiece.type]}</span>
                <span className="text-[#3d2516]">{selectedPiece.type}</span>
                <span className="text-[10px] text-[#3d2516]/60 font-sans font-bold">({PIECE_VALUE[selectedPiece.type] || 'King'} pts)</span>
              </span>
            </div>
          ) : (
            <div className="max-w-xs text-right border-r-2 border-[#cda972] pr-3 py-0.5 font-serif italic text-xs text-[#e4dcc4]/65">
              "The shadow falls upon the table. Play your move wisely."
            </div>
          )}
        </div>
      </div>

      {/* 4. PAWN PROMOTION SCROLL */}
      {promotionPending && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm pointer-events-auto animate-[fadeIn_0.3s_ease-out]">
          <div className="pirate-parchment p-8 rounded-md text-center max-w-sm w-full border-4 border-[#3d2516] relative">
            <div className="rivet rivet-tl"></div>
            <div className="rivet rivet-tr"></div>
            <div className="rivet rivet-bl"></div>
            <div className="rivet rivet-br"></div>

            <div className="text-3xl mb-1 text-[#3d2516]" style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.5))' }}>♙</div>
            <h3 className="text-2xl font-serif text-[#3d2516] mb-1 uppercase tracking-widest">Promotion</h3>
            <p className="text-xs font-serif text-[#3d2516]/65 mb-6 italic leading-relaxed">
              Your pawn has crossed the board. Choose its new form.
            </p>
            <div className="grid grid-cols-4 gap-2">
              {['queen', 'rook', 'bishop', 'knight'].map((type) => (
                <button
                  key={type}
                  onClick={() => completePromotion(type)}
                  className="flex flex-col items-center gap-1.5 py-3 px-1 rounded border border-[#3d2516]/30 bg-black/5 hover:border-[#3d2516] hover:bg-[#3d2516]/10 transition-all cursor-pointer group"
                >
                  <span
                    className="text-4xl text-[#3d2516] transition-transform group-hover:scale-110"
                    style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.4))' }}
                  >
                    {PROMO_GLYPH[type]}
                  </span>
                  <span className="text-[9px] uppercase tracking-widest text-[#3d2516]/80 font-sans font-bold">
                    {type}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 5. CINEMATIC AWARDS-STYLE GAME OVER SCREEN */}
      {gameOver && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/85 pointer-events-auto overflow-hidden animate-[fadeIn_0.6s_ease-out]">
          {/* Cinematic Vignette */}
          <div className="cinematic-vignette"></div>

          {/* Particle overlay */}
          <EmberOverlay />

          {/* Hanging Flag Banner Scroll */}
          <div className="w-full max-w-md pirate-parchment p-10 rounded-md text-center border-4 border-[#3d2516] banner-drop-anim relative z-20">
            <div className="rivet rivet-tl" style={{ width: '8px', height: '8px' }}></div>
            <div className="rivet rivet-tr" style={{ width: '8px', height: '8px' }}></div>
            <div className="rivet rivet-bl" style={{ width: '8px', height: '8px' }}></div>
            <div className="rivet rivet-br" style={{ width: '8px', height: '8px' }}></div>

            {/* Filigree Corner Details */}
            <div className="filigree-corner filigree-tl"></div>
            <div className="filigree-corner filigree-tr"></div>
            <div className="filigree-corner filigree-bl"></div>
            <div className="filigree-corner filigree-br"></div>

            {(() => {
              const win = gameResult === 'checkmate-white' || gameResult === 'timeout-black';
              return (
                <div className="flex justify-center mb-2">
                  {win ? (
                    <Award className="w-16 h-16 text-[#c59d5f] animate-[bounce_2s_infinite]" style={{ filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.4))' }} />
                  ) : (
                    <Swords className="w-16 h-16 text-[#3d2516]" style={{ filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.4))' }} />
                  )}
                </div>
              );
            })()}

            <h2 className="text-4xl font-bold font-serif mb-2 uppercase tracking-widest text-[#3d2516] flex justify-center">
              {(gameResult === 'checkmate-white' || gameResult === 'timeout-black') && (
                <AnimatedTitle text="VICTORY" className="burned-text" />
              )}
              {(gameResult === 'checkmate-black' || gameResult === 'timeout-white') && (
                <AnimatedTitle text="DEFEAT" className="burned-text" style={{ color: '#8b1a1a' }} />
              )}
              {gameResult === 'stalemate' && (
                <AnimatedTitle text="STALEMATE" className="text-[#3d2516]/70" />
              )}
              {gameResult === 'draw' && (
                <AnimatedTitle text="DRAW" className="text-[#3d2516]/70" />
              )}
            </h2>

            <p className="text-sm font-serif text-[#26160d]/80 italic max-w-xs mx-auto mb-6 leading-relaxed">
              {gameResult === 'checkmate-white' && 'The enemy captain has been checkmated. The spoils are yours!'}
              {gameResult === 'checkmate-black' && 'Your King has been completely cornered. Concede this match.'}
              {gameResult === 'timeout-black' && "The opponent's clock ran dry. You win on time."}
              {gameResult === 'timeout-white' && 'Your clock ran dry. You lost on time.'}
              {gameResult === 'stalemate' && 'No legal moves remain. The duel ends in a draw.'}
              {gameResult === 'draw' && 'Insufficient material to force a capture. Draw.'}
            </p>

            {/* Duel Stats Recap */}
            <div className="border-t border-b border-[#3d2516]/30 py-4 my-6 font-serif text-[#26160d]/90 text-sm leading-loose">
              <div className="flex justify-between max-w-[240px] mx-auto">
                <span>Total Moves:</span>
                <span className="font-sans font-bold">{moveHistory.length}</span>
              </div>
              <div className="flex justify-between max-w-[240px] mx-auto">
                <span>Your Score:</span>
                <span className="font-sans font-bold text-[#c59d5f]">{whiteScore} pts</span>
              </div>
              <div className="flex justify-between max-w-[240px] mx-auto">
                <span>Opponent:</span>
                <span className="font-sans font-bold uppercase">{aiDifficulty} AI</span>
              </div>
            </div>

            <button
              onClick={() => {
                handleRestart();
                setLoadingState('playing');
              }}
              className="py-3.5 px-10 pirate-button text-base font-bold shadow-xl border-3 border-[#6b4d3a] cursor-pointer"
            >
              Play Again
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
