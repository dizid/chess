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

      <!-- Stockfish indicator -->
      <div
        class="flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-300"
        :class="chess.turn() === 'b' || isThinking ? 'bg-amber-500/20 ring-2 ring-amber-400' : 'bg-slate-800/50'"
      >
        <span class="text-slate-300 font-medium">Stockfish</span>
        <span class="text-2xl">♚</span>
      </div>
    </div>

    <!-- Main Game Area - 3 columns on desktop -->
    <div class="flex flex-col lg:flex-row items-center lg:items-start gap-6">

      <!-- Left Panel: Captured Pieces -->
      <div class="lg:w-44 w-full max-w-xs">
        <div class="bg-slate-800/60 backdrop-blur-md rounded-2xl p-5 border border-slate-700/40 shadow-xl shadow-black/20">
          <h3 class="text-amber-400 text-xs font-bold mb-4 uppercase tracking-[0.2em] flex items-center gap-2">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
            Captured
          </h3>

          <!-- Pieces captured by player (black pieces) -->
          <div class="mb-5">
            <div class="flex items-center gap-2 mb-2">
              <div class="w-2 h-2 rounded-full bg-amber-400"></div>
              <p class="text-slate-400 text-xs font-medium">By You</p>
              <span v-if="playerAdvantage > 0" class="ml-auto text-emerald-400 text-xs font-bold">+{{ playerAdvantage }}</span>
            </div>
            <div class="flex flex-wrap gap-0.5 min-h-[2.5rem] bg-slate-900/40 rounded-lg p-2">
              <span
                v-for="(piece, idx) in capturedByPlayer"
                :key="'player-' + idx"
                class="text-xl transition-transform hover:scale-125"
              >{{ pieceSymbols[piece] }}</span>
              <span v-if="capturedByPlayer.length === 0" class="text-slate-600 text-xs italic">none</span>
            </div>
          </div>

          <!-- Pieces captured by Stockfish (white pieces) -->
          <div>
            <div class="flex items-center gap-2 mb-2">
              <div class="w-2 h-2 rounded-full bg-slate-400"></div>
              <p class="text-slate-400 text-xs font-medium">By Stockfish</p>
              <span v-if="grokAdvantage > 0" class="ml-auto text-red-400 text-xs font-bold">+{{ grokAdvantage }}</span>
            </div>
            <div class="flex flex-wrap gap-0.5 min-h-[2.5rem] bg-slate-900/40 rounded-lg p-2">
              <span
                v-for="(piece, idx) in capturedByGrok"
                :key="'sf-' + idx"
                class="text-xl transition-transform hover:scale-125"
              >{{ pieceSymbols[piece.toUpperCase()] }}</span>
              <span v-if="capturedByGrok.length === 0" class="text-slate-600 text-xs italic">none</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Center: Chess Board -->
      <div class="flex flex-col items-center">

        <!-- 3D Board -->
        <div v-if="is3D" class="w-[360px] h-[360px] sm:w-[480px] sm:h-[480px] md:w-[600px] md:h-[600px]">
          <ChessBoard3D
            :chess="chess"
            :selected-square="selectedSquare"
            :valid-moves="validMoves"
            :last-move="lastMove"
            :is-thinking="isThinking"
            @square-click="handleSquareClickByName"
          />
        </div>

        <!-- 2D Board (fallback) -->
        <div v-else>
          <div class="relative">
            <!-- Rank numbers (1-8) on left -->
            <div class="absolute -left-6 top-0 h-full flex flex-col justify-around text-slate-500 text-sm font-mono">
              <span v-for="rank in 8" :key="'rank-' + rank">{{ 9 - rank }}</span>
            </div>

            <!-- The Board -->
            <div class="rounded-lg overflow-hidden shadow-2xl ring-4 ring-amber-900/50 shadow-black/50">
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
            Stockfish is analyzing{{ thinkingDots }}
          </p>
        </div>

        <!-- Controls -->
        <div class="flex flex-wrap gap-3 mt-4 justify-center">
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
          <!-- 3D Toggle -->
          <button
            @click="is3D = !is3D"
            class="flex items-center gap-2 px-5 py-2.5 text-white font-medium rounded-lg transition-all duration-200"
            :class="is3D ? 'bg-amber-600 hover:bg-amber-500' : 'bg-slate-700 hover:bg-slate-600'"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
            {{ is3D ? '2D' : '3D' }}
          </button>
          <!-- Difficulty Selector -->
          <div class="relative">
            <select
              v-model.number="difficulty"
              class="appearance-none px-5 py-2.5 pr-10 bg-slate-700 hover:bg-slate-600 text-white font-medium rounded-lg transition-all duration-200 cursor-pointer border-0 outline-none"
            >
              <option :value="1">🍺 Drunk Beginner</option>
              <option :value="2">😊 Casual</option>
              <option :value="3">🏆 Club Player</option>
              <option :value="4">💪 Strong</option>
              <option :value="5">💀 Maximum Pain</option>
            </select>
            <div class="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
              <svg class="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
        </div>

        <!-- Engine status -->
        <p v-if="!engineReady" class="text-slate-500 text-xs mt-2">Loading Stockfish engine...</p>
      </div>

      <!-- Right Panel: Move History -->
      <div class="lg:w-52 w-full max-w-xs">
        <div class="bg-slate-800/60 backdrop-blur-md rounded-2xl p-5 border border-slate-700/40 shadow-xl shadow-black/20 max-h-[28rem] overflow-hidden flex flex-col">
          <h3 class="text-amber-400 text-xs font-bold mb-4 uppercase tracking-[0.2em] flex items-center gap-2">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            Moves
            <span v-if="moveHistory.length > 0" class="ml-auto text-slate-500 text-[10px] font-normal tracking-normal">{{ moveHistory.length }} ply</span>
          </h3>

          <!-- Column headers -->
          <div class="flex gap-2 px-2.5 pb-2 border-b border-slate-700/50 text-[10px] text-slate-500 uppercase tracking-wider font-semibold">
            <span class="w-7">#</span>
            <span class="w-16">White</span>
            <span class="w-16">Black</span>
          </div>

          <div class="overflow-y-auto flex-1 mt-1 scrollbar-thin" ref="moveListRef">
            <div
              v-for="(move, idx) in formattedMoves"
              :key="idx"
              class="flex gap-2 py-1.5 px-2.5 rounded-lg transition-colors"
              :class="idx === formattedMoves.length - 1 ? 'bg-amber-500/15 border border-amber-500/20' : 'hover:bg-slate-700/30'"
            >
              <span class="text-slate-600 w-7 text-xs tabular-nums">{{ move.number }}.</span>
              <span class="text-white w-16 text-sm font-medium">{{ move.white }}</span>
              <span class="text-slate-400 w-16 text-sm">{{ move.black || '' }}</span>
            </div>
            <div v-if="formattedMoves.length === 0" class="text-slate-600 text-center py-8 text-xs italic">
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
import { onMounted, onUnmounted } from 'vue'
import { useChessGame } from '../composables/use-chess-game.js'
import { useStockfish } from '../composables/use-stockfish.js'
import ChessBoard3D from './chess-board-3d.vue'

// ============================================================
// GAME STATE (from composable)
// ============================================================

const {
  chess,
  selectedSquare,
  validMoves,
  isThinking,
  lastMove,
  moveHistory,
  moveListRef,
  is3D,
  difficulty,
  thinkingProgress,
  thinkingDots,
  isGameOver,
  gameOverIcon,
  gameOverTitle,
  gameOverMessage,
  statusMessage,
  statusBadgeClass,
  capturedByPlayer,
  capturedByGrok,
  playerAdvantage,
  grokAdvantage,
  formattedMoves,
  pieceSymbols,
  getPiece,
  isValidMoveSquare,
  getSquareClasses,
  getPieceClasses,
  getPieceStyle,
  handleSquareClick,
  handleSquareClickByName,
  undoMove,
  resetGame,
  setAIMoveFunction,
} = useChessGame()

// ============================================================
// STOCKFISH ENGINE
// ============================================================

const { initEngine, getMove, isReady: engineReady, destroy: destroyEngine } = useStockfish()

// Wire Stockfish as the AI move function
setAIMoveFunction(async (fen, diff) => {
  return await getMove(fen, diff)
})

// Initialize Stockfish on mount
onMounted(async () => {
  await initEngine()
})

onUnmounted(() => {
  destroyEngine()
})
</script>
