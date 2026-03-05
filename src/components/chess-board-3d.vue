<template>
  <!-- 3D chess board container — fills parent, canvas takes full size -->
  <div class="relative w-full h-full" ref="containerRef">
    <canvas
      ref="canvasRef"
      class="w-full h-full block"
      :class="{ 'cursor-pointer': !isThinking }"
    />

    <!-- Thinking overlay -->
    <div
      v-if="isThinking"
      class="absolute inset-0 flex items-center justify-center pointer-events-none"
    >
      <div class="bg-black/60 text-white text-sm px-4 py-2 rounded-full backdrop-blur-sm">
        Thinking...
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch } from 'vue'
import { useThreeBoard } from '../composables/use-three-board.js'

// ============================================================
// PROPS & EMITS
// ============================================================

const props = defineProps({
  // The Chess.js instance (shallowRef unwrapped value)
  chess: {
    type: Object,
    required: true
  },
  // { row, col } or null
  selectedSquare: {
    type: Object,
    default: null
  },
  // Array of square names like ["e4", "d5"]
  validMoves: {
    type: Array,
    default: () => []
  },
  // { from, to } or null
  lastMove: {
    type: Object,
    default: null
  },
  // Boolean — AI is thinking
  isThinking: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['square-click'])

// ============================================================
// TEMPLATE REFS
// ============================================================

const canvasRef = ref(null)
const containerRef = ref(null)

// ============================================================
// THREE.JS COMPOSABLE
// ============================================================

const { init, updateBoard, dispose, onSquareClick } = useThreeBoard()

// ============================================================
// LIFECYCLE
// ============================================================

onMounted(() => {
  if (!canvasRef.value) return

  // Initialize Three.js scene
  init(canvasRef.value)

  // Register click handler — emit square-click with algebraic square name
  onSquareClick((square) => {
    emit('square-click', square)
  })

  // Initial board render
  updateBoard(props.chess, props.selectedSquare, props.validMoves, props.lastMove)
})

onUnmounted(() => {
  dispose()
})

// ============================================================
// WATCHERS — re-sync board whenever game state changes
// ============================================================

// Watch all relevant props and update the 3D scene
watch(
  () => [props.chess, props.selectedSquare, props.validMoves, props.lastMove],
  () => {
    if (!canvasRef.value) return
    updateBoard(props.chess, props.selectedSquare, props.validMoves, props.lastMove)
  },
  // deep: true to catch selectedSquare/validMoves array changes
  { deep: true }
)
</script>
