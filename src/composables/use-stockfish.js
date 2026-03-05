// ============================================================
// COMPOSABLE: Stockfish WASM Chess Engine
//
// Wraps the Stockfish 18 WASM engine running in a Web Worker.
// Communication uses the UCI (Universal Chess Interface) protocol.
//
// Files required in /public:
//   - stockfish.js  (copied from node_modules/stockfish/bin/)
//   - stockfish.wasm
//
// Using the lite single-threaded build (7MB vs 108MB full).
// When loaded as a Worker without hash, stockfish.js auto-detects
// the worker context and sets up onmessage/postMessage communication.
// ============================================================

import { ref, onUnmounted } from 'vue'

// ============================================================
// DIFFICULTY CONFIGURATION
// Maps difficulty 1-5 to UCI Skill Level and search depth
// ============================================================
const DIFFICULTY_CONFIG = {
  1: { skillLevel: 0,  depth: 1,  label: 'Drunk Beginner' },
  2: { skillLevel: 5,  depth: 3,  label: 'Casual'         },
  3: { skillLevel: 10, depth: 8,  label: 'Club Player'    },
  4: { skillLevel: 15, depth: 15, label: 'Strong'         },
  5: { skillLevel: 20, depth: 20, label: 'Maximum Pain'   },
}

export function useStockfish() {
  // ============================================================
  // STATE
  // ============================================================
  const isReady = ref(false)

  /** @type {Worker|null} */
  let worker = null

  /** @type {Function|null} - resolver for the current getMove() promise */
  let moveResolver = null

  /** @type {Function|null} - rejecter for the current getMove() promise */
  let moveRejecter = null

  // ============================================================
  // WORKER MESSAGE HANDLER
  // Stockfish sends lines of text. We parse UCI responses here.
  // ============================================================
  function handleMessage(event) {
    const line = typeof event === 'string' ? event : event.data

    if (typeof line !== 'string') return

    // Engine is ready after responding to "isready"
    if (line === 'readyok') {
      isReady.value = true
      return
    }

    // Engine responds to "uciok" during init — send isready next
    if (line === 'uciok') {
      worker.postMessage('isready')
      return
    }

    // Best move response — format: "bestmove e2e4" or "bestmove e7e8q" (promotion)
    if (line.startsWith('bestmove') && moveResolver) {
      const parts = line.split(' ')
      const move = parts[1]

      // "bestmove (none)" means no legal moves (checkmate/stalemate)
      const resolver = moveResolver
      moveResolver = null
      moveRejecter = null

      if (move && move !== '(none)') {
        resolver(move)
      } else {
        resolver(null)
      }
    }
  }

  // ============================================================
  // initEngine()
  // Loads the Stockfish WASM Web Worker, sends "uci", waits for
  // "uciok" then "isready"/"readyok" before marking isReady.
  // ============================================================
  async function initEngine() {
    if (worker) return // Already initialized

    try {
      // Load stockfish.js as a Web Worker — the lite single-threaded
      // build auto-detects worker context via onmessage/postMessage
      worker = new Worker('/stockfish.js')

      worker.onmessage = handleMessage

      worker.onerror = (err) => {
        console.error('[Stockfish] Worker error:', err)
        isReady.value = false
        // Reject any pending move request
        if (moveRejecter) {
          moveRejecter(new Error('Stockfish worker error'))
          moveResolver = null
          moveRejecter = null
        }
      }

      // Start UCI handshake — uciok triggers isready, readyok sets isReady = true
      worker.postMessage('uci')

      // Wait up to 10 seconds for readyok
      await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Stockfish init timeout'))
        }, 10000)

        // Poll isReady until set by the message handler
        const interval = setInterval(() => {
          if (isReady.value) {
            clearTimeout(timeout)
            clearInterval(interval)
            resolve()
          }
        }, 50)
      })

    } catch (err) {
      console.error('[Stockfish] Failed to initialize engine:', err)
      isReady.value = false
      worker = null
    }
  }

  // ============================================================
  // getMove(fen, difficulty)
  // Returns a Promise<string|null> with the best move in UCI
  // format (e.g. "e2e4", "e7e8q"), or null on error/no move.
  //
  // difficulty: 1-5 (see DIFFICULTY_CONFIG above)
  // ============================================================
  async function getMove(fen, difficulty = 3) {
    if (!worker || !isReady.value) {
      console.warn('[Stockfish] Engine not ready, cannot get move')
      return null
    }

    // Cancel any in-flight move request
    if (moveResolver) {
      const oldReject = moveRejecter
      moveResolver = null
      moveRejecter = null
      if (oldReject) oldReject(new Error('Cancelled by new getMove call'))
    }

    const config = DIFFICULTY_CONFIG[difficulty] ?? DIFFICULTY_CONFIG[3]

    return new Promise((resolve, reject) => {
      moveResolver = resolve
      moveRejecter = reject

      // Configure engine skill level for this move
      worker.postMessage(`setoption name Skill Level value ${config.skillLevel}`)

      // Set the board position from FEN
      worker.postMessage(`position fen ${fen}`)

      // Start search — engine will respond with "bestmove ..."
      worker.postMessage(`go depth ${config.depth}`)

      // Safety timeout — resolve null if engine takes too long
      const timeout = setTimeout(() => {
        if (moveResolver === resolve) {
          console.warn('[Stockfish] getMove timeout')
          moveResolver = null
          moveRejecter = null
          resolve(null)
        }
      }, 30000)

      // Wrap resolve to also clear the timeout
      const originalResolver = moveResolver
      moveResolver = (move) => {
        clearTimeout(timeout)
        originalResolver(move)
      }
    })
  }

  // ============================================================
  // destroy()
  // Terminates the Web Worker and resets state.
  // ============================================================
  function destroy() {
    if (moveRejecter) {
      moveRejecter(new Error('Engine destroyed'))
    }
    moveResolver = null
    moveRejecter = null

    if (worker) {
      worker.terminate()
      worker = null
    }

    isReady.value = false
  }

  // Auto-cleanup when the component using this composable unmounts
  onUnmounted(destroy)

  return {
    isReady,
    initEngine,
    getMove,
    destroy,
  }
}
