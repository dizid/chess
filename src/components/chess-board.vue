<template>
  <div class="flex flex-col items-center gap-6 w-full max-w-5xl">

    <!-- Turn Indicator & Status -->
    <div class="flex items-center gap-4">
      <!-- Player indicator -->
      <div
        class="flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-300"
        :class="chess.turn() === 'w' && !isThinking ? 'bg-amber-500/20 ring-2 ring-amber-400' : 'bg-slate-800/50'"
      >
        <span class="text-2xl">♔</span>
        <span class="text-slate-300 font-medium">You</span>
      </div>

      <!-- Status badge -->
      <div
        class="px-4 py-2 rounded-lg font-medium text-center min-w-[140px]"
        :class="statusBadgeClass"
      >
        {{ statusMessage }}
      </div>

      <!-- Grok indicator -->
      <div
        class="flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-300"
        :class="chess.turn() === 'b' || isThinking ? 'bg-amber-500/20 ring-2 ring-amber-400' : 'bg-slate-800/50'"
      >
        <span class="text-slate-300 font-medium">Grok</span>
        <span class="text-2xl">♚</span>
      </div>
    </div>

    <!-- Main Game Area - 3 columns on desktop -->
    <div class="flex flex-col lg:flex-row items-center lg:items-start gap-6">

      <!-- Left Panel: Captured Pieces -->
      <div class="lg:w-36 w-full max-w-xs">
        <div class="bg-slate-800/50 backdrop-blur rounded-xl p-4 border border-slate-700/50">
          <h3 class="text-amber-400 text-sm font-semibold mb-3 uppercase tracking-wider">Captured</h3>

          <!-- Pieces captured by player (black pieces) -->
          <div class="mb-4">
            <p class="text-slate-500 text-xs mb-1">By You:</p>
            <div class="flex flex-wrap gap-1 min-h-[2rem]">
              <span
                v-for="(piece, idx) in capturedByPlayer"
                :key="'player-' + idx"
                class="text-2xl drop-shadow-lg"
              >{{ pieceSymbols[piece] }}</span>
            </div>
            <p class="text-amber-400 text-xs mt-1" v-if="playerAdvantage > 0">+{{ playerAdvantage }}</p>
          </div>

          <!-- Pieces captured by Grok (white pieces) -->
          <div>
            <p class="text-slate-500 text-xs mb-1">By Grok:</p>
            <div class="flex flex-wrap gap-1 min-h-[2rem]">
              <span
                v-for="(piece, idx) in capturedByGrok"
                :key="'grok-' + idx"
                class="text-2xl drop-shadow-lg"
              >{{ pieceSymbols[piece.toUpperCase()] }}</span>
            </div>
            <p class="text-amber-400 text-xs mt-1" v-if="grokAdvantage > 0">+{{ grokAdvantage }}</p>
          </div>
        </div>
      </div>

      <!-- Center: Chess Board -->
      <div class="flex flex-col items-center">
        <!-- Board with coordinates -->
        <div class="relative">
          <!-- Rank numbers (1-8) on left -->
          <div class="absolute -left-6 top-0 h-full flex flex-col justify-around text-slate-500 text-sm font-mono">
            <span v-for="rank in 8" :key="'rank-' + rank">{{ 9 - rank }}</span>
          </div>

          <!-- The Board -->
          <div class="rounded-lg overflow-hidden shadow-2xl shadow-black/50 ring-4 ring-amber-900/50">
            <div class="grid grid-cols-8">
              <template v-for="row in 8" :key="row">
                <div
                  v-for="col in 8"
                  :key="`${row}-${col}`"
                  class="w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 flex items-center justify-center cursor-pointer select-none transition-all duration-150 relative"
                  :class="getSquareClasses(row, col)"
                  @click="handleSquareClick(row, col)"
                >
                  <!-- Piece -->
                  <span
                    v-if="getPiece(row, col)"
                    class="text-4xl sm:text-4xl md:text-5xl transition-transform duration-150 hover:scale-110"
                    :class="getPieceClasses(row, col)"
                    :style="getPieceStyle(row, col)"
                  >
                    {{ getPiece(row, col) }}
                  </span>

                  <!-- Valid move indicator (dot for empty, ring for capture) -->
                  <div
                    v-if="isValidMoveSquare(row, col) && !getPiece(row, col)"
                    class="absolute w-3 h-3 rounded-full bg-emerald-400/60 animate-pulse"
                  ></div>
                  <div
                    v-if="isValidMoveSquare(row, col) && getPiece(row, col)"
                    class="absolute inset-1 rounded-full ring-4 ring-emerald-400/60 animate-pulse"
                  ></div>
                </div>
              </template>
            </div>
          </div>

          <!-- File letters (a-h) on bottom -->
          <div class="flex justify-around mt-1 text-slate-500 text-sm font-mono px-1">
            <span v-for="file in ['a','b','c','d','e','f','g','h']" :key="file">{{ file }}</span>
          </div>
        </div>

        <!-- Progress Bar (below board) -->
        <div class="w-full mt-4" v-if="isThinking">
          <div class="h-2 bg-slate-700 rounded-full overflow-hidden">
            <div
              class="h-full bg-gradient-to-r from-amber-600 via-amber-400 to-amber-600 rounded-full transition-all duration-200"
              :style="{ width: thinkingProgress + '%' }"
            ></div>
          </div>
          <p class="text-amber-400 text-sm text-center mt-2 flex items-center justify-center gap-2">
            <svg class="animate-spin h-4 w-4" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" fill="none"/>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
            </svg>
            Grok is analyzing{{ thinkingDots }}
          </p>
        </div>

        <!-- Controls -->
        <div class="flex gap-3 mt-4">
          <button
            @click="resetGame"
            class="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white font-medium rounded-lg transition-all duration-200 shadow-lg shadow-amber-900/30 hover:shadow-amber-900/50"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            New Game
          </button>
          <button
            @click="undoMove"
            :disabled="moveHistory.length < 2"
            class="flex items-center gap-2 px-5 py-2.5 bg-slate-700 hover:bg-slate-600 disabled:bg-slate-800 disabled:text-slate-600 text-white font-medium rounded-lg transition-all duration-200 disabled:cursor-not-allowed"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
            </svg>
            Undo
          </button>
        </div>
      </div>

      <!-- Right Panel: Move History -->
      <div class="lg:w-48 w-full max-w-xs">
        <div class="bg-slate-800/50 backdrop-blur rounded-xl p-4 border border-slate-700/50 max-h-96 overflow-hidden flex flex-col">
          <h3 class="text-amber-400 text-sm font-semibold mb-3 uppercase tracking-wider">Moves</h3>
          <div class="overflow-y-auto flex-1 space-y-1 font-mono text-sm" ref="moveListRef">
            <div
              v-for="(move, idx) in formattedMoves"
              :key="idx"
              class="flex gap-2 py-1 px-2 rounded"
              :class="idx === formattedMoves.length - 1 ? 'bg-amber-500/20' : 'hover:bg-slate-700/50'"
            >
              <span class="text-slate-500 w-6">{{ move.number }}.</span>
              <span class="text-white w-14">{{ move.white }}</span>
              <span class="text-slate-400 w-14">{{ move.black || '' }}</span>
            </div>
            <div v-if="formattedMoves.length === 0" class="text-slate-500 text-center py-4">
              No moves yet
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Game Over Overlay -->
    <div
      v-if="isGameOver"
      class="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50"
      @click="resetGame"
    >
      <div class="bg-slate-800 rounded-2xl p-8 text-center shadow-2xl border border-slate-700 max-w-sm mx-4" @click.stop>
        <div class="text-6xl mb-4">{{ gameOverIcon }}</div>
        <h2 class="text-2xl font-bold text-white mb-2">{{ gameOverTitle }}</h2>
        <p class="text-slate-400 mb-6">{{ gameOverMessage }}</p>
        <button
          @click="resetGame"
          class="px-8 py-3 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white font-bold rounded-lg transition-all duration-200"
        >
          Play Again
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, shallowRef, computed, onUnmounted, nextTick, triggerRef } from 'vue'
import { Chess } from 'chess.js'

// ============================================================
// GAME STATE
// ============================================================

const chess = shallowRef(new Chess())
const selectedSquare = ref(null)
const validMoves = ref([])
const isThinking = ref(false)
const lastMove = ref(null)           // { from, to } of last move
const moveHistory = ref([])          // Array of SAN moves
const moveListRef = ref(null)        // Ref for auto-scroll

// Progress meter state
const thinkingProgress = ref(0)
const dotCount = ref(0)
let progressInterval = null

// ============================================================
// PIECE SYMBOLS & VALUES
// ============================================================

const pieceSymbols = {
  'K': '♔', 'Q': '♕', 'R': '♖', 'B': '♗', 'N': '♘', 'P': '♙',
  'k': '♚', 'q': '♛', 'r': '♜', 'b': '♝', 'n': '♞', 'p': '♟'
}

const pieceValues = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 }

// ============================================================
// COMPUTED PROPERTIES
// ============================================================

// Animated dots
const thinkingDots = computed(() => '.'.repeat((dotCount.value % 3) + 1))

// Game over state
const isGameOver = computed(() => chess.value.isGameOver())

const gameOverIcon = computed(() => {
  if (chess.value.isCheckmate()) {
    return chess.value.turn() === 'w' ? '😔' : '🎉'
  }
  return '🤝'
})

const gameOverTitle = computed(() => {
  if (chess.value.isCheckmate()) {
    return chess.value.turn() === 'w' ? 'Checkmate!' : 'Victory!'
  }
  if (chess.value.isStalemate()) return 'Stalemate!'
  if (chess.value.isDraw()) return 'Draw!'
  return 'Game Over'
})

const gameOverMessage = computed(() => {
  if (chess.value.isCheckmate()) {
    return chess.value.turn() === 'w' ? 'Grok AI wins this time.' : 'You defeated Grok AI!'
  }
  if (chess.value.isStalemate()) return 'No legal moves available.'
  if (chess.value.isThreefoldRepetition()) return 'Threefold repetition.'
  if (chess.value.isInsufficientMaterial()) return 'Insufficient material.'
  return 'The game has ended.'
})

// Status message
const statusMessage = computed(() => {
  if (isThinking.value) return 'Thinking...'
  if (chess.value.isCheckmate()) return 'Checkmate!'
  if (chess.value.isDraw()) return 'Draw!'
  if (chess.value.isCheck()) return 'Check!'
  return chess.value.turn() === 'w' ? 'Your turn' : "Grok's turn"
})

// Status badge styling
const statusBadgeClass = computed(() => {
  if (chess.value.isCheckmate()) return 'bg-red-500/20 text-red-400 ring-1 ring-red-500/50'
  if (chess.value.isDraw()) return 'bg-yellow-500/20 text-yellow-400 ring-1 ring-yellow-500/50'
  if (chess.value.isCheck()) return 'bg-orange-500/20 text-orange-400 ring-1 ring-orange-500/50 animate-pulse'
  if (isThinking.value) return 'bg-amber-500/20 text-amber-400 ring-1 ring-amber-500/50'
  return 'bg-slate-700/50 text-slate-300'
})

// Captured pieces calculation
const capturedByPlayer = computed(() => {
  const initial = { p: 8, n: 2, b: 2, r: 2, q: 1 }
  const board = chess.value.board().flat().filter(Boolean)
  const current = { p: 0, n: 0, b: 0, r: 0, q: 0 }

  board.forEach(piece => {
    if (piece.color === 'b' && current[piece.type] !== undefined) {
      current[piece.type]++
    }
  })

  const captured = []
  for (const type in initial) {
    const count = initial[type] - current[type]
    for (let i = 0; i < count; i++) {
      captured.push(type)
    }
  }
  return captured
})

const capturedByGrok = computed(() => {
  const initial = { p: 8, n: 2, b: 2, r: 2, q: 1 }
  const board = chess.value.board().flat().filter(Boolean)
  const current = { p: 0, n: 0, b: 0, r: 0, q: 0 }

  board.forEach(piece => {
    if (piece.color === 'w' && current[piece.type] !== undefined) {
      current[piece.type]++
    }
  })

  const captured = []
  for (const type in initial) {
    const count = initial[type] - current[type]
    for (let i = 0; i < count; i++) {
      captured.push(type)
    }
  }
  return captured
})

// Material advantage
const playerAdvantage = computed(() => {
  const playerMaterial = capturedByPlayer.value.reduce((sum, p) => sum + pieceValues[p], 0)
  const grokMaterial = capturedByGrok.value.reduce((sum, p) => sum + pieceValues[p], 0)
  return Math.max(0, playerMaterial - grokMaterial)
})

const grokAdvantage = computed(() => {
  const playerMaterial = capturedByPlayer.value.reduce((sum, p) => sum + pieceValues[p], 0)
  const grokMaterial = capturedByGrok.value.reduce((sum, p) => sum + pieceValues[p], 0)
  return Math.max(0, grokMaterial - playerMaterial)
})

// Formatted move list for display
const formattedMoves = computed(() => {
  const moves = []
  for (let i = 0; i < moveHistory.value.length; i += 2) {
    moves.push({
      number: Math.floor(i / 2) + 1,
      white: moveHistory.value[i],
      black: moveHistory.value[i + 1] || null
    })
  }
  return moves
})

// ============================================================
// HELPER FUNCTIONS
// ============================================================

function toSquare(row, col) {
  const file = String.fromCharCode(96 + col)
  const rank = 9 - row
  return file + rank
}

function getPiece(row, col) {
  const square = toSquare(row, col)
  const piece = chess.value.get(square)
  if (!piece) return ''
  const key = piece.color === 'w' ? piece.type.toUpperCase() : piece.type.toLowerCase()
  return pieceSymbols[key] || ''
}

function isValidMoveSquare(row, col) {
  return validMoves.value.includes(toSquare(row, col))
}

function getSquareClasses(row, col) {
  const isLight = (row + col) % 2 === 0
  const square = toSquare(row, col)
  const isSelected = selectedSquare.value?.row === row && selectedSquare.value?.col === col
  const isLastMoveSquare = lastMove.value && (lastMove.value.from === square || lastMove.value.to === square)
  const piece = chess.value.get(square)
  const isKingInCheck = chess.value.isCheck() && piece?.type === 'k' && piece?.color === chess.value.turn()

  return {
    // Base colors - wood tones
    'bg-amber-100': isLight && !isSelected && !isLastMoveSquare && !isKingInCheck,
    'bg-amber-700': !isLight && !isSelected && !isLastMoveSquare && !isKingInCheck,
    // Selected square
    'bg-emerald-300': isSelected && isLight,
    'bg-emerald-500': isSelected && !isLight,
    // Last move highlight
    'bg-amber-300': isLastMoveSquare && isLight && !isSelected && !isKingInCheck,
    'bg-amber-600': isLastMoveSquare && !isLight && !isSelected && !isKingInCheck,
    // King in check - red highlight
    'bg-red-400': isKingInCheck && isLight,
    'bg-red-600': isKingInCheck && !isLight,
    // Hover
    'hover:brightness-110': true
  }
}

function getPieceClasses(row, col) {
  const square = toSquare(row, col)
  const piece = chess.value.get(square)
  if (!piece) return ''

  return {
    'text-white drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)]': piece.color === 'w',
    'text-slate-800 drop-shadow-[0_1px_1px_rgba(255,255,255,0.3)]': piece.color === 'b'
  }
}

function getPieceStyle(row, col) {
  const square = toSquare(row, col)
  const piece = chess.value.get(square)
  if (!piece) return {}

  return {
    textShadow: piece.color === 'w'
      ? '0 0 3px rgba(0,0,0,0.5), 1px 1px 2px rgba(0,0,0,0.7)'
      : '0 0 2px rgba(255,255,255,0.2)'
  }
}

// ============================================================
// PROGRESS ANIMATION
// ============================================================

function startProgress() {
  thinkingProgress.value = 0
  dotCount.value = 0
  progressInterval = setInterval(() => {
    if (thinkingProgress.value < 90) {
      thinkingProgress.value += Math.max(0.5, (90 - thinkingProgress.value) / 15)
    }
    dotCount.value++
  }, 150)
}

function stopProgress() {
  if (progressInterval) {
    clearInterval(progressInterval)
    progressInterval = null
  }
  thinkingProgress.value = 100
  setTimeout(() => { thinkingProgress.value = 0 }, 200)
}

onUnmounted(() => {
  if (progressInterval) clearInterval(progressInterval)
})

// ============================================================
// GAME LOGIC
// ============================================================

function handleSquareClick(row, col) {
  if (chess.value.isGameOver() || isThinking.value) return
  if (chess.value.turn() !== 'w') return

  const square = toSquare(row, col)
  const piece = chess.value.get(square)

  if (selectedSquare.value) {
    if (validMoves.value.includes(square)) {
      makePlayerMove(toSquare(selectedSquare.value.row, selectedSquare.value.col), square)
    }
    selectedSquare.value = null
    validMoves.value = []
    return
  }

  if (piece && piece.color === 'w') {
    selectedSquare.value = { row, col }
    const moves = chess.value.moves({ square, verbose: true })
    validMoves.value = moves.map(m => m.to)
  }
}

async function makePlayerMove(from, to) {
  try {
    const piece = chess.value.get(from)
    const isPromotion = piece?.type === 'p' && (to[1] === '8' || to[1] === '1')

    const move = chess.value.move({
      from,
      to,
      promotion: isPromotion ? 'q' : undefined
    })

    if (move) {
      lastMove.value = { from, to }
      moveHistory.value.push(move.san)
      triggerRef(chess)
      scrollMoveList()

      if (!chess.value.isGameOver()) {
        await makeGrokMove()
      }
    }
  } catch (e) {
    console.error('Invalid move:', e)
  }
}

async function makeGrokMove() {
  isThinking.value = true
  startProgress()

  try {
    const fen = chess.value.fen()
    const legalMoves = chess.value.moves()

    const response = await fetch('/.netlify/functions/grok-move', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fen, legalMoves })
    })

    if (!response.ok) throw new Error('Failed to get Grok move')

    const data = await response.json()

    if (data.move) {
      try {
        const result = chess.value.move(data.move)
        if (result) {
          lastMove.value = { from: result.from, to: result.to }
          moveHistory.value.push(result.san)
          triggerRef(chess)
          scrollMoveList()
        }
      } catch {
        const moves = chess.value.moves({ verbose: true })
        const match = moves.find(m =>
          m.san === data.move ||
          m.lan === data.move ||
          (m.from + m.to) === data.move.replace(/[^a-h1-8]/g, '')
        )
        if (match) {
          chess.value.move(match.san)
          lastMove.value = { from: match.from, to: match.to }
          moveHistory.value.push(match.san)
          triggerRef(chess)
          scrollMoveList()
        } else {
          console.warn('Could not parse Grok move, making random move')
          const randomMove = moves[Math.floor(Math.random() * moves.length)]
          chess.value.move(randomMove.san)
          lastMove.value = { from: randomMove.from, to: randomMove.to }
          moveHistory.value.push(randomMove.san)
          triggerRef(chess)
          scrollMoveList()
        }
      }
    }
  } catch (error) {
    console.error('Grok AI error:', error)
    const moves = chess.value.moves({ verbose: true })
    if (moves.length > 0) {
      const randomMove = moves[Math.floor(Math.random() * moves.length)]
      chess.value.move(randomMove.san)
      lastMove.value = { from: randomMove.from, to: randomMove.to }
      moveHistory.value.push(randomMove.san)
      triggerRef(chess)
      scrollMoveList()
    }
  } finally {
    stopProgress()
    isThinking.value = false
  }
}

function undoMove() {
  if (moveHistory.value.length < 2) return

  // Undo both Grok's and player's move
  chess.value.undo()
  chess.value.undo()
  moveHistory.value.pop()
  moveHistory.value.pop()
  triggerRef(chess)

  // Update last move display
  if (moveHistory.value.length >= 1) {
    const history = chess.value.history({ verbose: true })
    const last = history[history.length - 1]
    lastMove.value = last ? { from: last.from, to: last.to } : null
  } else {
    lastMove.value = null
  }
}

function resetGame() {
  chess.value = new Chess()
  selectedSquare.value = null
  validMoves.value = []
  isThinking.value = false
  lastMove.value = null
  moveHistory.value = []
  stopProgress()
}

function scrollMoveList() {
  nextTick(() => {
    if (moveListRef.value) {
      moveListRef.value.scrollTop = moveListRef.value.scrollHeight
    }
  })
}
</script>
