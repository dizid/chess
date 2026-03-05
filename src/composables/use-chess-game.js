// ============================================================
// COMPOSABLE: Chess Game State & Logic
// Extracted from chess-board.vue for reuse with different
// renderers (2D CSS grid, 3D Three.js) and AI engines
// ============================================================

import { ref, shallowRef, computed, onUnmounted, nextTick, triggerRef } from 'vue'
import { Chess } from 'chess.js'

export function useChessGame() {
  // ============================================================
  // GAME STATE
  // ============================================================

  const chess = shallowRef(new Chess())
  const selectedSquare = ref(null)
  const validMoves = ref([])
  const isThinking = ref(false)
  const lastMove = ref(null)
  const moveHistory = ref([])
  const moveListRef = ref(null)
  const is3D = ref(true) // default to 3D now

  // Progress meter state
  const thinkingProgress = ref(0)
  const dotCount = ref(0)
  let progressInterval = null

  // AI engine - pluggable (stockfish or grok)
  let aiMoveFunction = null

  // Difficulty level (1-5)
  const difficulty = ref(3)

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

  const thinkingDots = computed(() => '.'.repeat((dotCount.value % 3) + 1))

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
      return chess.value.turn() === 'w' ? 'Stockfish wins this time.' : 'You defeated Stockfish!'
    }
    if (chess.value.isStalemate()) return 'No legal moves available.'
    if (chess.value.isThreefoldRepetition()) return 'Threefold repetition.'
    if (chess.value.isInsufficientMaterial()) return 'Insufficient material.'
    return 'The game has ended.'
  })

  const statusMessage = computed(() => {
    if (isThinking.value) return 'Thinking...'
    if (chess.value.isCheckmate()) return 'Checkmate!'
    if (chess.value.isDraw()) return 'Draw!'
    if (chess.value.isCheck()) return 'Check!'
    return chess.value.turn() === 'w' ? 'Your turn' : "Stockfish's turn"
  })

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
      for (let i = 0; i < count; i++) captured.push(type)
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
      for (let i = 0; i < count; i++) captured.push(type)
    }
    return captured
  })

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
      'bg-amber-100': isLight && !isSelected && !isLastMoveSquare && !isKingInCheck,
      'bg-amber-700': !isLight && !isSelected && !isLastMoveSquare && !isKingInCheck,
      'bg-emerald-300': isSelected && isLight,
      'bg-emerald-500': isSelected && !isLight,
      'bg-amber-300': isLastMoveSquare && isLight && !isSelected && !isKingInCheck,
      'bg-amber-600': isLastMoveSquare && !isLight && !isSelected && !isKingInCheck,
      'bg-red-400': isKingInCheck && isLight,
      'bg-red-600': isKingInCheck && !isLight,
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
  // AI ENGINE SETUP
  // ============================================================

  function setAIMoveFunction(fn) {
    aiMoveFunction = fn
  }

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

  // Alternative: click by algebraic square name (for 3D board)
  function handleSquareClickByName(square) {
    if (chess.value.isGameOver() || isThinking.value) return
    if (chess.value.turn() !== 'w') return

    const piece = chess.value.get(square)

    if (selectedSquare.value) {
      const fromSquare = toSquare(selectedSquare.value.row, selectedSquare.value.col)
      if (validMoves.value.includes(square)) {
        makePlayerMove(fromSquare, square)
      }
      selectedSquare.value = null
      validMoves.value = []
      return
    }

    if (piece && piece.color === 'w') {
      // Convert square name to row/col for selectedSquare
      const col = square.charCodeAt(0) - 96
      const row = 9 - parseInt(square[1])
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
          await makeAIMove()
        }
      }
    } catch (e) {
      console.error('Invalid move:', e)
    }
  }

  async function makeAIMove() {
    isThinking.value = true
    startProgress()

    try {
      const fen = chess.value.fen()

      if (aiMoveFunction) {
        // Use pluggable AI engine (Stockfish)
        const bestMove = await aiMoveFunction(fen, difficulty.value)

        if (bestMove) {
          // bestMove is in UCI format: "e2e4" or "e7e8q" (with promotion)
          const from = bestMove.substring(0, 2)
          const to = bestMove.substring(2, 4)
          const promotion = bestMove.length > 4 ? bestMove[4] : undefined

          const result = chess.value.move({ from, to, promotion })
          if (result) {
            lastMove.value = { from: result.from, to: result.to }
            moveHistory.value.push(result.san)
            triggerRef(chess)
            scrollMoveList()
          }
        }
      } else {
        // Fallback: random move
        const moves = chess.value.moves({ verbose: true })
        if (moves.length > 0) {
          const randomMove = moves[Math.floor(Math.random() * moves.length)]
          chess.value.move(randomMove.san)
          lastMove.value = { from: randomMove.from, to: randomMove.to }
          moveHistory.value.push(randomMove.san)
          triggerRef(chess)
          scrollMoveList()
        }
      }
    } catch (error) {
      console.error('AI error:', error)
      // Fallback: random move
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
    chess.value.undo()
    chess.value.undo()
    moveHistory.value.pop()
    moveHistory.value.pop()
    triggerRef(chess)

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

  return {
    // State
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

    // Computed
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

    // Piece helpers (for 2D board)
    pieceSymbols,
    getPiece,
    isValidMoveSquare,
    getSquareClasses,
    getPieceClasses,
    getPieceStyle,
    toSquare,

    // Game actions
    handleSquareClick,
    handleSquareClickByName,
    makePlayerMove,
    undoMove,
    resetGame,
    setAIMoveFunction,
  }
}
