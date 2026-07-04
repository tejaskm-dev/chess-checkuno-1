# CHECKUNO — Chess Foundation Build Prompt
## AntiGravity AI Agent | Complete Specification
### Version 2.0 | AI Mode + Dual View System

---

## PROJECT OVERVIEW

Build the **playable chess foundation** for CheckUno, a hybrid Chess + Card game inspired by Inscryption's dark aesthetic. This is **chess-only, no cards/abilities/items yet**. Focus: solid move validation, AI opponent with difficulty slider, and the dual-view system (full-screen chess focused board when playing, expanded UI when opponent's turn or planning cards).

**Target Output:** A fully playable chess game vs AI with FIDE-compliant rules and atmospheric Inscryption aesthetic.

---

## VISUAL REFERENCES

### Layout System: Two States

**STATE 1 — YOUR TURN (Planning/Move Execution)**
- Use **Reference Image 2** layout
- Board fills ~70% of viewport (chess-focused)
- Item slots minimized on left sidebar (collapsed view)
- Ability meters minimized on right sidebar (collapsed view)
- Card hand at bottom but visually recessed
- Goal: Player focuses on the board

**STATE 2 — OPPONENT'S TURN (Watch + Plan)**
- Use **Reference Image 1** layout
- All systems visible and equal weight
- Board centered (~60% of viewport)
- Item slots fully visible left panel
- Ability meters fully visible right panel
- Card hand prominent at bottom
- Goal: Player can plan ahead while watching opponent

**View Switch Triggers:**
- Click piece or move piece → switch to STATE 1 (Image 2)
- Auto-revert to STATE 2 (Image 1) when opponent's turn begins
- Card interaction while in STATE 1 → stays in STATE 1 (cards recessed)

### Color Palette (MANDATORY)

- **Background:** Near-black (#0F0D0A)
- **Board Light Squares:** Tan (#C8A97E)
- **Board Dark Squares:** Brown (#8B7355)
- **Board Border:** Dark wood (#5C4033)
- **Primary Text:** Aged parchment (#D4C9B0)
- **UI Accents:** Candlelight gold (#C8A97E)
- **Active/Selected:** Orange (#FF6B35)
- **Highlighted Move:** Gold (#FFD700)
- **Danger/Check:** Dried blood red (#8B1A1A)

### Aesthetic Direction
- **Inscryption mood:** Dark cabin, candlelit, intimate, worn wood, aged paper
- All UI elements should feel like physical objects on a game table
- No modern flat design — everything should feel textured, aged, tactile

---

## CORE GAMEPLAY: CHESS FOUNDATION

### 1. BOARD & PIECE SETUP

**Board:**
- 8×8 grid, isometric fixed camera view (`position: [6, 8, 6]`, `fov: 50`)
- Alternating light/dark squares with worn wood texture
- Algebraic notation (a1 → h8) for all squares
- Board is clickable — raycasting for move input

**Pieces:**
- Standard starting position (FIDE 2.3)
- Procedurally generated from Three.js primitives (no Blender)
- White: light tan (#E8D4B8), Black: dark brown (#3D3128)
- All 6 piece types: King, Queen, Rook, Bishop, Knight, Pawn

**Coordinate System:**
- Files: a, b, c, d, e, f, g, h (left to right for white)
- Ranks: 1, 2, 3, 4, 5, 6, 7, 8 (bottom to top for white)
- Internal: Use grid (0-7, 0-7) then convert to algebraic as needed
- Board always shown from white's perspective (rank 1 at bottom)

---

### 2. FIDE MOVE VALIDATION (Articles 3.1–3.9)

**All moves must be FIDE-compliant. Non-compliance = illegal move, no execution.**

#### 2.1 PAWN MOVES (Article 3.7)
- [ ] Forward one square to empty square
- [ ] Forward two squares on first move (if both squares empty)
- [ ] Diagonal capture only (one square diagonally forward onto opponent piece)
- [ ] En passant capture: opponent pawn moved two squares last turn, player can capture as if it moved one. **Only legal on the immediately following move.**
- [ ] Promotion: pawn reaches rank 8 (white) or rank 1 (black) → must promote to Queen, Rook, Bishop, or Knight (UI prompt player to choose)

#### 2.2 KNIGHT MOVES (Article 3.6)
- [ ] L-shape: 2 squares in one direction, 1 square perpendicular
- [ ] Cannot move to a square occupied by own piece
- [ ] CAN jump over pieces (unlike sliding pieces)
- [ ] All 8 possible L-moves are valid destinations (if not blocked by own piece)

#### 2.3 BISHOP MOVES (Article 3.2)
- [ ] Any diagonal direction (NW, NE, SW, SE)
- [ ] Cannot move over intervening pieces
- [ ] Cannot move to square with own piece
- [ ] Can capture opponent piece at end of diagonal

#### 2.4 ROOK MOVES (Article 3.3)
- [ ] Any rank (horizontal) direction
- [ ] Any file (vertical) direction
- [ ] Cannot move over intervening pieces
- [ ] Cannot move to square with own piece
- [ ] Can capture opponent piece at end of direction

#### 2.5 QUEEN MOVES (Article 3.4)
- [ ] Combination of rook + bishop: any rank, file, or diagonal
- [ ] Cannot move over intervening pieces
- [ ] Cannot move to square with own piece
- [ ] Can capture opponent piece at end of direction

#### 2.6 KING MOVES (Article 3.8.a)
- [ ] One square in any direction (rank, file, diagonal)
- [ ] Cannot move to square occupied by own piece
- [ ] **CRITICAL:** Cannot move to a square attacked by opponent piece
- [ ] Cannot move into check (illegal move, rejected)

#### 2.7 CASTLING (Article 3.8.b)
**Kingside castling (O-O):**
- King on e1 (white) or e8 (black) moves to g1/g8
- Rook on h1/h8 moves to f1/f8
- Preconditions (all must be true):
  - King has never moved
  - Rook (h-file) has never moved
  - All squares between King and Rook are empty (f1, g1 for white)
  - King is NOT in check
  - King does NOT move through check (f-square must not be attacked)
  - King does NOT land in check (g-square must not be attacked)

**Queenside castling (O-O-O):**
- King on e1/e8 moves to c1/c8
- Rook on a1/a8 moves to d1/d8
- Preconditions (same as kingside, but check different squares):
  - King has never moved
  - Rook (a-file) has never moved
  - All squares between King and Rook are empty (b1, c1, d1 for white)
  - King is NOT in check
  - King does NOT move through check (d-square must not be attacked)
  - King does NOT land in check (c-square must not be attacked)

**Track castling rights per player:**
- Each player: `canCastleKingside: bool`, `canCastleQueenside: bool`
- Castling rights are LOST FOREVER once the King or Rook moves
- Reset to `true` only at game start

#### 2.8 ATTACK CALCULATION (Article 3.1)
A piece "attacks" a square if it could legally capture on that square (ignoring whether it would expose own King to check).

**Critical for:**
- Check detection (is opponent King attacked?)
- Move legality (can King move there?)
- Pinned piece detection (piece cannot move if it exposes own King to check)

#### 2.9 CHECK & CHECKMATE DETECTION (Articles 3.9, 5.1)

**Check:**
- Opponent King is attacked by one or more of your pieces
- King cannot remain in check (must move, block, or capture attacking piece)

**Checkmate:**
- King is in check AND has no legal move to escape check
- Legal move = move that doesn't leave/place King in check
- **Checkmate = game won immediately** (Article 5.1.a)

**Stalemate (Draw):**
- King is NOT in check AND has no legal move
- **Stalemate = game immediately drawn** (Article 5.2.a)

---

### 3. MOVE VALIDATION PIPELINE

**Order of validation (for every move):**

1. **Source square has a piece of current player's color** ✓
2. **Piece type can move that direction?** ✓ (pawn forward, rook straight, etc.)
3. **Path is clear (no intervening pieces)?** ✓ (except knight)
4. **Destination is legal?** ✓ (empty or has opponent piece for capture)
5. **Move exposes own King to check?** ✗ If yes, illegal
6. **Castling preconditions met?** ✓ (if castling move)
7. **Move leaves King in check?** ✗ If yes, illegal

**If ANY check fails → reject move, no piece movement, visual feedback "Illegal Move"**

---

### 4. TURN STRUCTURE

Each turn:

1. Player with move clicks a piece (highlights selection, shows legal moves in gold)
2. Player clicks a destination square
3. **Validate move** (pipeline above)
4. If valid:
   - Execute move (move piece, capture if applicable, update castling rights)
   - Check for pawn promotion (if pawn on rank 8) → show promotion UI
   - Check for checkmate/stalemate
   - Switch turns
   - **Trigger view change:** revert to Image 1 (opponent's turn)
5. If invalid:
   - Reject with "Illegal Move" feedback
   - Keep turn with current player

---

## AI SYSTEM

### AI Difficulty Levels

**Pre-game UI:** Show three difficulty buttons
- **Easy:** Random legal moves (no strategy)
- **Medium:** Basic tactical awareness (captures, simple threat blocking)
- **Hard:** Minimax-based (look 3–4 moves ahead, evaluate board state)

**Implementation:**

#### EASY MODE
```
function aiMoveEasy() {
  const legalMoves = getAllLegalMoves(board, 'black');
  return legalMoves[Math.floor(Math.random() * legalMoves.length)];
}
```
- Instant response
- Makes blunders frequently

#### MEDIUM MODE
```
function aiMoveMedium() {
  const legalMoves = getAllLegalMoves(board, 'black');
  
  // Priority 1: Checkmate in one move?
  for (let move of legalMoves) {
    if (isCheckmate(executeMove(board, move))) return move;
  }
  
  // Priority 2: Capture high-value piece (Queen > Rook > Bishop > Knight > Pawn)?
  for (let move of legalMoves) {
    if (isCapture(move)) {
      const capturedPiece = getSquare(board, move.to);
      return move; // Greedy capture (improve: score by piece value)
    }
  }
  
  // Priority 3: Block check if in check?
  if (isInCheck(board, 'black')) {
    for (let move of legalMoves) {
      if (wouldBlockCheck(board, move)) return move;
    }
  }
  
  // Priority 4: Random safe move
  return legalMoves[Math.floor(Math.random() * legalMoves.length)];
}
```
- ~500ms delay (feels human-like)
- Tactical awareness but no deep planning
- Rarely wins against careful play

#### HARD MODE
```
function aiMoveHard() {
  return minimax(board, depth=3, 'black', maximizingPlayer=true).bestMove;
}

function minimax(board, depth, player, isMaximizing) {
  if (depth === 0 || gameEnded(board)) {
    return evaluateBoard(board); // Return score
  }
  
  const moves = getAllLegalMoves(board, player);
  
  if (isMaximizing) { // AI (black) turn
    let maxEval = -Infinity;
    let bestMove = null;
    
    for (let move of moves) {
      const newBoard = executeMove(clone(board), move);
      const eval = minimax(newBoard, depth - 1, 'white', false);
      
      if (eval > maxEval) {
        maxEval = eval;
        bestMove = move;
      }
    }
    
    return { score: maxEval, bestMove };
  } else { // Player (white) turn
    let minEval = Infinity;
    let bestMove = null;
    
    for (let move of moves) {
      const newBoard = executeMove(clone(board), move);
      const eval = minimax(newBoard, depth - 1, 'black', true);
      
      if (eval < minEval) {
        minEval = eval;
        bestMove = move;
      }
    }
    
    return { score: minEval, bestMove };
  }
}

function evaluateBoard(board) {
  let score = 0;
  
  // Material count (piece values)
  const pieceValues = { pawn: 1, knight: 3, bishop: 3, rook: 5, queen: 9, king: 0 };
  
  for (let square in board) {
    const piece = board[square];
    if (!piece) continue;
    
    const value = pieceValues[piece.type];
    score += piece.color === 'black' ? value : -value;
  }
  
  // Bonus: centralization (pieces near center board score higher)
  for (let square in board) {
    const piece = board[square];
    if (!piece) continue;
    
    const [file, rank] = algebraicToCoords(square);
    const distFromCenter = Math.abs(file - 3.5) + Math.abs(rank - 3.5);
    const centerBonus = 4 - (distFromCenter / 2);
    
    score += piece.color === 'black' ? centerBonus : -centerBonus;
  }
  
  // Penalty: King safety (if in check or surrounded by opponent pieces)
  if (isInCheck(board, 'black')) score -= 50;
  if (isInCheck(board, 'white')) score += 50;
  
  return score;
}
```
- ~2–3 second delay (pre-calculation time)
- Strong play, thinks several moves ahead
- Difficult to beat without experience

### AI Move Delay

To avoid instant moves (feels unnatural):
- **Easy:** 300ms
- **Medium:** 700ms
- **Hard:** 2500ms

---

## STATE MANAGEMENT (Zustand)

```javascript
export const gameStore = create((set) => ({
  // Board state
  board: initializeBoard(), // 8x8 grid with pieces
  
  // Turn management
  currentPlayer: 'white',
  lastMove: null, // { from: 'e2', to: 'e4' }
  
  // Selection
  selectedPiece: null, // 'e2' or null
  highlightedSquares: [], // legal moves: ['e3', 'e4']
  
  // Check/checkmate detection
  isInCheck: false,
  isCheckmate: false,
  isStalemate: false,
  gameOver: false,
  gameResult: null, // 'checkmate-white', 'stalemate', etc.
  
  // Castling rights (per player)
  castlingRights: {
    white: { kingside: true, queenside: true },
    black: { kingside: true, queenside: true },
  },
  
  // En passant
  enPassantSquare: null, // 'e3' or null (valid only on next move)
  
  // AI & difficulty
  isAIGame: true,
  aiDifficulty: 'medium', // 'easy', 'medium', 'hard'
  aiThinking: false, // Show spinner during AI turn
  
  // View state
  viewMode: 'full', // 'full' (Image 1) or 'chess-focused' (Image 2)
  
  // Move history (for undo, 50-move rule, 3-fold repetition)
  moveHistory: [], // [{ from, to, capturedPiece, boardState }, ...]
  
  // Actions
  selectPiece: (square) => {
    set((state) => {
      if (state.selectedPiece === square) {
        // Deselect
        return { selectedPiece: null, highlightedSquares: [] };
      }
      
      // Select new piece and show legal moves
      const piece = state.board[square];
      if (!piece || piece.color !== state.currentPlayer) {
        return state; // Cannot select opponent piece
      }
      
      const legalMoves = calculateLegalMoves(state.board, square, state.castlingRights, state.enPassantSquare);
      return { selectedPiece: square, highlightedSquares: legalMoves };
    });
  },
  
  movepiece: (from, to) => {
    set((state) => {
      // Validate move
      if (!state.highlightedSquares.includes(to)) {
        return state; // Illegal move
      }
      
      // Execute move
      const newBoard = executeMove(state.board, from, to, state);
      const capturedPiece = state.board[to];
      
      // Check for check/checkmate/stalemate
      const opponentColor = state.currentPlayer === 'white' ? 'black' : 'white';
      const isCheck = isOpponentInCheck(newBoard, opponentColor);
      const legalMovesAvailable = hasLegalMoves(newBoard, opponentColor);
      
      let newGameState = {};
      if (isCheck && !legalMovesAvailable) {
        newGameState = { isCheckmate: true, gameOver: true, gameResult: `checkmate-${state.currentPlayer}` };
      } else if (!isCheck && !legalMovesAvailable) {
        newGameState = { isStalemate: true, gameOver: true, gameResult: 'stalemate' };
      }
      
      // Update castling rights if king/rook moved
      const piece = state.board[from];
      const newCastlingRights = { ...state.castlingRights };
      if (piece.type === 'king') {
        newCastlingRights[state.currentPlayer] = { kingside: false, queenside: false };
      } else if (piece.type === 'rook') {
        const isKingsideRook = from[0] === 'h';
        if (state.currentPlayer === 'white') {
          newCastlingRights.white[isKingsideRook ? 'kingside' : 'queenside'] = false;
        } else {
          newCastlingRights.black[isKingsideRook ? 'kingside' : 'queenside'] = false;
        }
      }
      
      // Update en passant (valid only for pawn two-square advance)
      let newEnPassantSquare = null;
      if (piece.type === 'pawn') {
        const [fromFile, fromRank] = algebraicToCoords(from);
        const [toFile, toRank] = algebraicToCoords(to);
        if (Math.abs(toRank - fromRank) === 2) {
          newEnPassantSquare = coordsToAlgebraic(toFile, (fromRank + toRank) / 2);
        }
      }
      
      // Return new state
      return {
        board: newBoard,
        currentPlayer: opponentColor,
        lastMove: { from, to },
        selectedPiece: null,
        highlightedSquares: [],
        castlingRights: newCastlingRights,
        enPassantSquare: newEnPassantSquare,
        moveHistory: [...state.moveHistory, { from, to, capturedPiece, boardState: state.board }],
        viewMode: 'full', // Auto-revert to Image 1 on turn end
        ...newGameState,
      };
    });
  },
  
  makeAIMove: async () => {
    set({ aiThinking: true });
    
    const state = gameStore.getState();
    const move = await getAIMove(state.board, state.aiDifficulty, state.castlingRights, state.enPassantSquare);
    
    // Small delay for realism
    await new Promise((resolve) => setTimeout(resolve, 300 + Math.random() * 500));
    
    gameStore.setState({ aiThinking: false });
    gameStore.getState().movepiece(move.from, move.to);
  },
  
  resetGame: (difficulty) => {
    set({
      board: initializeBoard(),
      currentPlayer: 'white',
      selectedPiece: null,
      highlightedSquares: [],
      isInCheck: false,
      isCheckmate: false,
      isStalemate: false,
      gameOver: false,
      gameResult: null,
      castlingRights: {
        white: { kingside: true, queenside: true },
        black: { kingside: true, queenside: true },
      },
      enPassantSquare: null,
      aiDifficulty: difficulty,
      aiThinking: false,
      viewMode: 'full',
      moveHistory: [],
    });
  },
}));
```

---

## UI/LAYOUT IMPLEMENTATION

### Layout Switching

Use `viewMode` state:
- `'full'` → Render Image 1 layout
- `'chess-focused'` → Render Image 2 layout

**Trigger switching:**
```javascript
// When player clicks a piece:
selectPiece(square) {
  // ... existing logic
  set({ viewMode: 'chess-focused' }); // Switch to Image 2
}

// When turn ends:
endTurn() {
  // ... move execution
  set({ currentPlayer: opponent, viewMode: 'full' }); // Switch back to Image 1
}
```

### IMAGE 1 LAYOUT (Full System)

```
┌─────────────────────────────────────┐
│ CHECKUNO | WHITE TURN | 3 ACTIVE    │ (top bar)
├──────────┬────────────────┬─────────┤
│ ITEMS    │                │ METERS  │
│ (8 slots)│    BOARD       │ (4 bars)│
│          │   (isometric)  │         │
│          │                │         │
├──────────────────────────────────────┤
│   CARD HAND (7 cards)    |  UNO btn │ (bottom)
└──────────────────────────────────────┘
```

### IMAGE 2 LAYOUT (Chess-Focused)

```
┌────────────────────────────────────────────┐
│ WHITE TURN | MAKE YOUR MOVE | 3 ACTIVE    │
├─────┬──────────────────────────────┬───────┤
│ITEMS│       BOARD (Large)          │METERS │
│(min)│      (fills 70%)             │(min)  │
│     │                              │       │
│     │   (all UI recessed/minimal)   │       │
├─────┴──────────────────────────────┴───────┤
│ CARD HAND (recessed, small visual footprint)│
└────────────────────────────────────────────┘
```

### Responsive Design

- **Desktop (1920×1080+):** Both layouts render as specified
- **Tablet (1024×768+):** Proportional scaling, maintain layout hierarchy
- **Mobile (< 1024px):** Fall back to single-column layout (board full width, UI below)

---

## VISUAL & ATMOSPHERIC

### Lighting
- Ambient light: warm gold (#D4C9B0), intensity 0.5
- Directional light: from top-right (5, 8, 5), intensity 1.2, color #E8D4B0
- Point light: bottom-left (-5, 4, -5), intensity 0.4, color #A0522D (warm shadow)
- No shadows required (baked only, for performance)

### Camera
- Fixed isometric perspective: position `[6, 8, 6]`, fov `50`
- No free-cam, no zoom, no pan
- Board always fills same proportion of screen

### Audio Cues (Placeholder — Can Expand Later)
- Piece move: wood on wood sound
- Piece capture: impact + piece removed
- Check: alarm/warning tone
- Checkmate: dramatic finish tone
- Move rejection: error beep

---

## TECHNICAL STACK

| Layer | Tech | Notes |
|-------|------|-------|
| Framework | Next.js App Router | |
| 3D Rendering | React Three Fiber (R3F) | Canvas + Drei helpers |
| 3D Library | Three.js | Procedural geometry |
| State | Zustand | Shared game state |
| UI Overlay | React + Tailwind CSS | 2D DOM on top of 3D canvas |
| Board Pieces | Procedurally generated | No Blender, no asset imports |
| Multiplayer | (NOT IMPLEMENTED YET) | Socket.io hooks prepared for future |

### File Structure
```
src/
  components/
    Game.jsx              # Main game wrapper
    Canvas3D.jsx          # R3F canvas + board
    ChessBoard.jsx        # Board grid + piece rendering
    ChessPiece.jsx        # Individual piece 3D model
    UIOverlay.jsx         # Tailwind 2D UI layer
    ImageOne.jsx          # Full-system layout
    ImageTwo.jsx          # Chess-focused layout
    DifficultySelect.jsx  # AI difficulty picker
    GameOver.jsx          # Win/loss/draw screen
  hooks/
    useMoveValidation.js  # Legal move calculation
    useAI.js              # AI move logic
    useChessLogic.js      # Check/mate/pin detection
  utils/
    board.js              # Board initialization, piece placement
    moves.js              # Move validation pipeline
    ai.js                 # AI difficulty implementations
    notation.js           # Algebraic notation conversion
    evaluation.js         # Board evaluation (for Hard mode)
  store/
    gameStore.js          # Zustand game state
  styles/
    globals.css           # Tailwind + custom CSS variables
  pages/
    index.js              # Game page
```

---

## DEVELOPMENT CHECKPOINT: What NOT to Include Yet

❌ Card system mechanics
❌ Ability charge meters (UI placeholder only)
❌ Item slots (UI placeholder only)
❌ Colour gating
❌ Combo windows
❌ Multiplayer / Colyseus
❌ Gacha / progression
❌ Sound design (UI ready, no audio implementation)

---

## ACCEPTANCE CRITERIA

### Functional Chess
- [ ] All move types work: pawn, knight, bishop, rook, queen, king
- [ ] Castling works (kingside and queenside, with all preconditions)
- [ ] En passant works (capture only on move after pawn advance)
- [ ] Pawn promotion works (player chooses piece in UI)
- [ ] Check detection accurate
- [ ] Checkmate detection ends game with win message
- [ ] Stalemate detection ends game with draw message
- [ ] Illegal moves rejected with visual feedback
- [ ] Pin detection: pieces cannot move if they expose King to check

### AI
- [ ] Easy mode: random legal moves, instant response
- [ ] Medium mode: captures and threat blocking, ~700ms delay
- [ ] Hard mode: minimax depth 3, ~2500ms delay, strong play
- [ ] AI plays as black, player is white
- [ ] Difficulty selector in pre-game UI

### Views & Layout
- [ ] Image 1 layout renders correctly (full system visible)
- [ ] Image 2 layout renders correctly (chess-focused)
- [ ] Auto-switch to Image 2 when player selects piece
- [ ] Auto-revert to Image 1 when opponent's turn begins
- [ ] Responsive on desktop (1920×1080+)
- [ ] Smooth transitions between views

### Visual & UX
- [ ] Isometric board matches reference images
- [ ] Piece selection highlights in orange
- [ ] Legal moves highlight in gold
- [ ] Board coordinates visible (a-h, 1-8)
- [ ] Current turn indicator visible
- [ ] Check state indicated visually
- [ ] Inscryption aesthetic: dark, candlelit, worn wood
- [ ] UI text in aged parchment color (#D4C9B0)

### Performance
- [ ] 60 FPS target on mid-range hardware
- [ ] Move validation < 100ms
- [ ] AI move generation < difficulty timeout
- [ ] No memory leaks on long play sessions

---

## REFERENCE MATERIALS PROVIDED

- **Laws of Chess PDF:** FIDE official rules (Articles 1–3, 5)
- **Reference Image 1:** Full-system layout (all UI visible, integrated)
- **Reference Image 2:** Chess-focused layout (board dominant, UI minimized)
- **Brief Document:** CheckUno full game design (for context only, don't implement card systems)

Use these as absolute reference for visual direction and rule compliance.

---

## DELIVERY EXPECTATIONS

**Output:** A working Next.js application that:
1. Loads with a difficulty selector
2. Plays a complete chess game (you vs AI)
3. Matches visual reference layouts
4. Follows all FIDE rules
5. Has proper state management (Zustand)
6. Is structured for future card/ability/item layering

**Ready for:** Next phase = card system integration (no refactoring needed)

---

## CRITICAL NOTES FOR DEVELOPER

1. **Move validation is the hardest part.** Build it first, test extensively. Use algebraic notation for debug logging.
2. **Board coordinate system must be consistent.** Decide on internal representation early (grid array vs object with algebraic keys).
3. **UI and 3D canvas need to share state cleanly.** Zustand handles this — keep store updates synchronous.
4. **AI minimax can be slow.** For Hard mode, consider move ordering optimization (captures first, then checks, then quiet moves).
5. **En passant is easy to miss.** Track the en passant square separately, validate only on the immediately following move.
6. **Castling rights tracking is critical.** Once King or Rook moves, those rights are lost forever. Test castling extensively.
7. **Pin detection is subtle.** A piece is pinned if moving it leaves own King in check. Validate this during legal move generation.

---

**Ready to build? This specification is your single source of truth. Flag ambiguities as they arise — do not assume.**