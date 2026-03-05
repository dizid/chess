// ============================================================
// COMPOSABLE: Three.js 3D Chess Board Scene Manager
// Renders a funny googly-eye cartoon chess board with
// procedural piece geometries built from basic Three.js shapes
// ============================================================

import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'

export function useThreeBoard() {
  // Internal state
  let renderer = null
  let scene = null
  let camera = null
  let controls = null
  let animationId = null
  let raycaster = null
  let mouse = null
  let clickCallback = null
  let resizeObserver = null
  let canvas = null

  // Track dirty state to avoid unnecessary renders
  let isDirty = true
  let isAnimating = false // true while piece move animations are running

  // Maps for tracking board objects
  // squareName -> THREE.Mesh (tile)
  const tileMeshes = new Map()
  // squareName -> THREE.Group (piece group)
  const pieceMeshes = new Map()
  // squareName -> THREE.Mesh (valid move indicator dot)
  const moveDots = new Map()

  // Previous board state for detecting changes and animating moves
  let prevBoardFen = ''

  // Active animations: { mesh, startPos, endPos, startTime, duration, type }
  const activeAnimations = []

  // ============================================================
  // MATERIALS (reused across pieces)
  // ============================================================

  const MAT_WHITE_PIECE = new THREE.MeshStandardMaterial({
    color: 0xfff8e7,
    roughness: 0.4,
    metalness: 0.1
  })
  const MAT_BLACK_PIECE = new THREE.MeshStandardMaterial({
    color: 0x2d1b4e,
    roughness: 0.4,
    metalness: 0.1
  })
  const MAT_EYE_WHITE = new THREE.MeshBasicMaterial({ color: 0xffffff })
  const MAT_EYE_PUPIL = new THREE.MeshBasicMaterial({ color: 0x111111 })
  const MAT_QUEEN_CROWN = new THREE.MeshStandardMaterial({
    color: 0xffd700,
    metalness: 0.8,
    roughness: 0.2
  })
  const MAT_LIGHT_TILE = new THREE.MeshStandardMaterial({
    color: 0xf0d9b5,
    roughness: 0.8
  })
  const MAT_DARK_TILE = new THREE.MeshStandardMaterial({
    color: 0xb58863,
    roughness: 0.8
  })
  const MAT_BOARD_FRAME = new THREE.MeshStandardMaterial({
    color: 0x4a2810,
    roughness: 0.9
  })

  // ============================================================
  // COORDINATE HELPERS
  // ============================================================

  /**
   * Convert algebraic square name (e.g. "e4") to 3D world position.
   * a1 = (-3.5, 0.2, 3.5), h8 = (3.5, 0.2, -3.5)
   * White pieces are at rank 1-2 (near camera, +z side)
   */
  function squareTo3D(square) {
    const file = square.charCodeAt(0) - 97 // a=0, h=7
    const rank = parseInt(square[1]) - 1    // 1=0, 8=7
    const x = file - 3.5                   // -3.5 to 3.5
    const z = 3.5 - rank                   // rank 1 = 3.5 (near cam), rank 8 = -3.5
    return new THREE.Vector3(x, 0.2, z)
  }

  // ============================================================
  // GOOGLY EYE BUILDER
  // ============================================================

  /**
   * Build a pair of googly eyes and add them to a group.
   * @param {THREE.Group} group - parent group to add eyes to
   * @param {object} opts - { x, y, z, eyeRadius, pupilRadius, spread, offsetX, offsetZ }
   */
  function addGooglyEyes(group, opts) {
    const {
      eyeRadius = 0.08,
      pupilRadius = 0.04,
      // Center position for the eye pair
      cx = 0,
      cy = 0,
      cz = 0,
      spread = 0.1,       // horizontal distance from center to each eye
      // random-looking pupil offsets for derpy look
      pupilOffsetL = { x: -0.01, y: 0.01 },
      pupilOffsetR = { x: 0.01, y: -0.01 }
    } = opts

    const eyeGeo = new THREE.SphereGeometry(eyeRadius, 16, 16)
    const pupilGeo = new THREE.SphereGeometry(pupilRadius, 8, 8)

    // Left eye
    const leftEye = new THREE.Mesh(eyeGeo, MAT_EYE_WHITE)
    leftEye.position.set(cx - spread, cy, cz)
    group.add(leftEye)

    const leftPupil = new THREE.Mesh(pupilGeo, MAT_EYE_PUPIL)
    leftPupil.position.set(
      cx - spread + pupilOffsetL.x,
      cy + pupilOffsetL.y,
      cz + eyeRadius * 0.7  // slightly in front
    )
    group.add(leftPupil)

    // Right eye
    const rightEye = new THREE.Mesh(eyeGeo, MAT_EYE_WHITE)
    rightEye.position.set(cx + spread, cy, cz)
    group.add(rightEye)

    const rightPupil = new THREE.Mesh(pupilGeo, MAT_EYE_PUPIL)
    rightPupil.position.set(
      cx + spread + pupilOffsetR.x,
      cy + pupilOffsetR.y,
      cz + eyeRadius * 0.7
    )
    group.add(rightPupil)
  }

  // ============================================================
  // PIECE BUILDERS — Funny googly-eye cartoon designs
  // ============================================================

  function buildPawn(color) {
    const mat = color === 'w' ? MAT_WHITE_PIECE : MAT_BLACK_PIECE
    const group = new THREE.Group()

    // Short fat body
    const bodyGeo = new THREE.CylinderGeometry(0.15, 0.2, 0.25, 16)
    const body = new THREE.Mesh(bodyGeo, mat)
    body.position.y = 0.125
    body.castShadow = true
    group.add(body)

    // HUGE head — 2x body width, bobblehead style
    const headGeo = new THREE.SphereGeometry(0.22, 16, 16)
    const head = new THREE.Mesh(headGeo, mat)
    head.position.y = 0.46 // sits on top of body
    head.castShadow = true
    group.add(head)

    // Googly eyes near equator of the big sphere, facing -z
    addGooglyEyes(group, {
      eyeRadius: 0.065,
      pupilRadius: 0.033,
      cx: 0,
      cy: 0.46,
      cz: 0.19,
      spread: 0.095,
      pupilOffsetL: { x: -0.015, y: 0.015 },
      pupilOffsetR: { x: 0.015, y: -0.015 }
    })

    return group
  }

  function buildRook(color) {
    const mat = color === 'w' ? MAT_WHITE_PIECE : MAT_BLACK_PIECE
    const group = new THREE.Group()

    // Base
    const baseGeo = new THREE.CylinderGeometry(0.2, 0.22, 0.15, 16)
    const base = new THREE.Mesh(baseGeo, mat)
    base.position.y = 0.075
    base.castShadow = true
    group.add(base)

    // Tower
    const towerGeo = new THREE.CylinderGeometry(0.15, 0.15, 0.55, 16)
    const tower = new THREE.Mesh(towerGeo, mat)
    tower.position.y = 0.15 + 0.275 // base top + half tower
    tower.castShadow = true
    group.add(tower)

    // Crenellations on top
    const crenGeo = new THREE.BoxGeometry(0.07, 0.1, 0.15)
    const angles = [-0.15, 0, 0.15]
    angles.forEach(xOff => {
      const cren = new THREE.Mesh(crenGeo, mat)
      cren.position.set(xOff, 0.15 + 0.55 + 0.05, 0)
      cren.castShadow = true
      group.add(cren)
    })

    // Eyes on the tower body near top
    addGooglyEyes(group, {
      eyeRadius: 0.07,
      pupilRadius: 0.035,
      cx: 0,
      cy: 0.15 + 0.55 - 0.12,
      cz: 0.155,
      spread: 0.085,
      pupilOffsetL: { x: -0.01, y: 0.01 },
      pupilOffsetR: { x: 0.01, y: -0.01 }
    })

    return group
  }

  function buildKnight(color) {
    const mat = color === 'w' ? MAT_WHITE_PIECE : MAT_BLACK_PIECE
    const group = new THREE.Group()

    // Body
    const bodyGeo = new THREE.CylinderGeometry(0.18, 0.2, 0.3, 16)
    const body = new THREE.Mesh(bodyGeo, mat)
    body.position.y = 0.15
    body.castShadow = true
    group.add(body)

    // Head — tilted forward (slight rotation)
    const headGeo = new THREE.SphereGeometry(0.18, 16, 16)
    const head = new THREE.Mesh(headGeo, mat)
    head.position.set(0, 0.48, 0.08)
    head.castShadow = true
    group.add(head)

    // Snout — cylinder pointing forward from head
    const snoutGeo = new THREE.CylinderGeometry(0.06, 0.08, 0.15, 12)
    const snout = new THREE.Mesh(snoutGeo, mat)
    snout.rotation.x = Math.PI / 2 // point toward camera
    snout.position.set(0, 0.42, 0.22)
    snout.castShadow = true
    group.add(snout)

    // Ears — two small cones on top of head
    const earGeo = new THREE.ConeGeometry(0.04, 0.1, 8)
    const leftEar = new THREE.Mesh(earGeo, mat)
    leftEar.position.set(-0.1, 0.65, 0.06)
    leftEar.castShadow = true
    group.add(leftEar)

    const rightEar = new THREE.Mesh(earGeo, mat)
    rightEar.position.set(0.1, 0.65, 0.06)
    rightEar.castShadow = true
    group.add(rightEar)

    // BIG googly eyes — extra large for the derpy horse
    addGooglyEyes(group, {
      eyeRadius: 0.085,
      pupilRadius: 0.042,
      cx: 0,
      cy: 0.5,
      cz: 0.17,
      spread: 0.11,
      pupilOffsetL: { x: -0.02, y: 0.02 },
      pupilOffsetR: { x: 0.02, y: -0.02 }
    })

    return group
  }

  function buildBishop(color) {
    const mat = color === 'w' ? MAT_WHITE_PIECE : MAT_BLACK_PIECE
    const group = new THREE.Group()

    // Base
    const baseGeo = new THREE.CylinderGeometry(0.18, 0.2, 0.15, 16)
    const base = new THREE.Mesh(baseGeo, mat)
    base.position.y = 0.075
    base.castShadow = true
    group.add(base)

    // Body tapering up
    const bodyGeo = new THREE.CylinderGeometry(0.12, 0.18, 0.35, 16)
    const body = new THREE.Mesh(bodyGeo, mat)
    body.position.y = 0.15 + 0.175
    body.castShadow = true
    group.add(body)

    // Head sphere
    const headGeo = new THREE.SphereGeometry(0.13, 16, 16)
    const head = new THREE.Mesh(headGeo, mat)
    head.position.y = 0.15 + 0.35 + 0.1
    head.castShadow = true
    group.add(head)

    // Wizard hat — very tall pointy cone
    const hatGeo = new THREE.ConeGeometry(0.12, 0.35, 16)
    const hat = new THREE.Mesh(hatGeo, mat)
    hat.position.y = 0.15 + 0.35 + 0.1 + 0.13 + 0.175
    hat.castShadow = true
    group.add(hat)

    // Eyes on the head sphere below the hat
    addGooglyEyes(group, {
      eyeRadius: 0.055,
      pupilRadius: 0.028,
      cx: 0,
      cy: 0.15 + 0.35 + 0.09,
      cz: 0.11,
      spread: 0.075,
      pupilOffsetL: { x: -0.01, y: 0 },
      pupilOffsetR: { x: 0.01, y: 0 }
    })

    return group
  }

  function buildQueen(color) {
    const mat = color === 'w' ? MAT_WHITE_PIECE : MAT_BLACK_PIECE
    const group = new THREE.Group()

    // Base — wide
    const baseGeo = new THREE.CylinderGeometry(0.2, 0.22, 0.15, 16)
    const base = new THREE.Mesh(baseGeo, mat)
    base.position.y = 0.075
    base.castShadow = true
    group.add(base)

    // Elegant tapered body
    const bodyGeo = new THREE.CylinderGeometry(0.15, 0.2, 0.35, 16)
    const body = new THREE.Mesh(bodyGeo, mat)
    body.position.y = 0.15 + 0.175
    body.castShadow = true
    group.add(body)

    // Head
    const headGeo = new THREE.SphereGeometry(0.14, 16, 16)
    const head = new THREE.Mesh(headGeo, mat)
    head.position.y = 0.15 + 0.35 + 0.12
    head.castShadow = true
    group.add(head)

    // Crown — huge golden torus ring
    const crownGeo = new THREE.TorusGeometry(0.15, 0.04, 8, 24)
    const crown = new THREE.Mesh(crownGeo, MAT_QUEEN_CROWN)
    crown.position.y = 0.15 + 0.35 + 0.12 + 0.14 + 0.01
    crown.rotation.x = Math.PI / 2
    crown.castShadow = true
    group.add(crown)

    // Crown gem on top
    const gemGeo = new THREE.SphereGeometry(0.06, 12, 12)
    const gem = new THREE.Mesh(gemGeo, MAT_QUEEN_CROWN)
    gem.position.y = 0.15 + 0.35 + 0.12 + 0.14 + 0.08
    gem.castShadow = true
    group.add(gem)

    // Eyes — slightly haughty, pupils looking up
    addGooglyEyes(group, {
      eyeRadius: 0.06,
      pupilRadius: 0.03,
      cx: 0,
      cy: 0.15 + 0.35 + 0.11,
      cz: 0.12,
      spread: 0.08,
      // Pupils looking up for haughty look
      pupilOffsetL: { x: -0.005, y: 0.02 },
      pupilOffsetR: { x: 0.005, y: 0.02 }
    })

    return group
  }

  function buildKing(color) {
    const mat = color === 'w' ? MAT_WHITE_PIECE : MAT_BLACK_PIECE
    const group = new THREE.Group()

    // EXTRA wide base — fat lazy king
    const baseGeo = new THREE.CylinderGeometry(0.25, 0.28, 0.15, 16)
    const base = new THREE.Mesh(baseGeo, mat)
    base.position.y = 0.075
    base.castShadow = true
    group.add(base)

    // Fat round belly — sphere instead of cylinder
    const bellyGeo = new THREE.SphereGeometry(0.25, 16, 16)
    const belly = new THREE.Mesh(bellyGeo, mat)
    belly.position.y = 0.15 + 0.2
    belly.castShadow = true
    group.add(belly)

    // Tiny head on fat body
    const headGeo = new THREE.SphereGeometry(0.12, 16, 16)
    const head = new THREE.Mesh(headGeo, mat)
    head.position.y = 0.15 + 0.4 + 0.09
    head.castShadow = true
    group.add(head)

    // Cross on top — two thin boxes forming a +
    const crossV = new THREE.BoxGeometry(0.04, 0.18, 0.04)
    const crossH = new THREE.BoxGeometry(0.14, 0.04, 0.04)
    const crossVertMesh = new THREE.Mesh(crossV, mat)
    crossVertMesh.position.y = 0.15 + 0.4 + 0.09 + 0.12 + 0.09
    group.add(crossVertMesh)
    const crossHorizMesh = new THREE.Mesh(crossH, mat)
    crossHorizMesh.position.y = 0.15 + 0.4 + 0.09 + 0.12 + 0.13
    group.add(crossHorizMesh)

    // Tired eyes — pupils looking down
    addGooglyEyes(group, {
      eyeRadius: 0.05,
      pupilRadius: 0.025,
      cx: 0,
      cy: 0.15 + 0.4 + 0.08,
      cz: 0.1,
      spread: 0.07,
      // Pupils looking down for tired look
      pupilOffsetL: { x: -0.005, y: -0.02 },
      pupilOffsetR: { x: 0.005, y: -0.02 }
    })

    return group
  }

  // ============================================================
  // PIECE FACTORY
  // ============================================================

  function buildPiece(type, color) {
    let group
    switch (type) {
      case 'p': group = buildPawn(color); break
      case 'r': group = buildRook(color); break
      case 'n': group = buildKnight(color); break
      case 'b': group = buildBishop(color); break
      case 'q': group = buildQueen(color); break
      case 'k': group = buildKing(color); break
      default:  group = buildPawn(color)
    }

    // White pieces face toward -z (toward rank 1 = near camera)
    // Black pieces face toward +z (toward rank 8 = far side)
    // Since we build all pieces facing -z by default (eyes on -z face),
    // rotate black pieces 180 degrees around Y
    if (color === 'b') {
      group.rotation.y = Math.PI
    }

    return group
  }

  // ============================================================
  // SCENE INITIALIZATION
  // ============================================================

  function init(canvasEl) {
    canvas = canvasEl
    const width = canvas.clientWidth || 600
    const height = canvas.clientHeight || 600

    // Renderer
    renderer = new THREE.WebGLRenderer({
      canvas: canvasEl,
      antialias: true,
      alpha: true
    })
    renderer.setSize(width, height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFSoftShadowMap

    // Scene
    scene = new THREE.Scene()
    scene.background = new THREE.Color(0x1a1a2e)

    // Camera — 45 degree angle looking at board center
    camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100)
    camera.position.set(0, 8, 7)
    camera.lookAt(0, 0, 0)

    // OrbitControls
    controls = new OrbitControls(camera, canvas)
    controls.enableDamping = true
    controls.dampingFactor = 0.05
    controls.minPolarAngle = THREE.MathUtils.degToRad(10)
    controls.maxPolarAngle = THREE.MathUtils.degToRad(80)
    controls.target.set(0, 0, 0)
    controls.addEventListener('change', () => { isDirty = true })

    // Lighting
    // Warm ambient
    const ambient = new THREE.AmbientLight(0xfff5e0, 0.6)
    scene.add(ambient)

    // Main directional light with shadows
    const dirLight = new THREE.DirectionalLight(0xffffff, 1.0)
    dirLight.position.set(5, 10, 5)
    dirLight.castShadow = true
    dirLight.shadow.mapSize.width = 2048
    dirLight.shadow.mapSize.height = 2048
    dirLight.shadow.camera.near = 0.1
    dirLight.shadow.camera.far = 50
    dirLight.shadow.camera.left = -10
    dirLight.shadow.camera.right = 10
    dirLight.shadow.camera.top = 10
    dirLight.shadow.camera.bottom = -10
    scene.add(dirLight)

    // Hemisphere fill light
    const hemi = new THREE.HemisphereLight(0x87ceeb, 0x2d1b4e, 0.3)
    scene.add(hemi)

    // Raycaster for click interaction
    raycaster = new THREE.Raycaster()
    mouse = new THREE.Vector2()

    // Build the board geometry
    buildBoard()

    // Resize observer
    resizeObserver = new ResizeObserver(() => {
      const w = canvas.clientWidth
      const h = canvas.clientHeight
      if (w > 0 && h > 0) {
        renderer.setSize(w, h)
        camera.aspect = w / h
        camera.updateProjectionMatrix()
        isDirty = true
      }
    })
    resizeObserver.observe(canvas.parentElement || canvas)

    // Click handler
    canvas.addEventListener('click', handleClick)
    canvas.addEventListener('touchend', handleTouch, { passive: true })

    // Start render loop
    startRenderLoop()
  }

  // ============================================================
  // BOARD GEOMETRY
  // ============================================================

  function buildBoard() {
    // Board frame underneath
    const frameGeo = new THREE.BoxGeometry(10, 0.3, 10)
    const frame = new THREE.Mesh(frameGeo, MAT_BOARD_FRAME)
    frame.position.y = -0.15
    frame.receiveShadow = true
    scene.add(frame)

    // 8x8 tiles
    const tileGeo = new THREE.BoxGeometry(1, 0.2, 1)
    const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']

    for (let rank = 1; rank <= 8; rank++) {
      for (let fileIdx = 0; fileIdx < 8; fileIdx++) {
        const file = files[fileIdx]
        const squareName = file + rank
        // Light square when file + rank is even (a1 is dark: fileIdx=0, rank=1 -> odd = dark)
        const isLight = (fileIdx + rank) % 2 !== 0
        const mat = isLight ? MAT_LIGHT_TILE : MAT_DARK_TILE

        const tile = new THREE.Mesh(tileGeo, mat.clone()) // clone so we can change emissive per tile
        tile.receiveShadow = true
        tile.castShadow = false

        const pos = squareTo3D(squareName)
        tile.position.set(pos.x, 0, pos.z) // tiles sit at y=0, top face at y=0.1
        tile.userData.square = squareName

        scene.add(tile)
        tileMeshes.set(squareName, tile)
      }
    }
  }

  // ============================================================
  // BOARD UPDATE — sync Three.js scene with chess.js state
  // ============================================================

  function updateBoard(boardState, selectedSquare, validMoves, lastMove) {
    // boardState is the Chess instance
    const currentFen = boardState.fen()

    // Reset tile emissives
    tileMeshes.forEach((tile, squareName) => {
      tile.material.emissive.setHex(0x000000)
      tile.material.emissiveIntensity = 0
    })

    // Highlight last move squares
    if (lastMove) {
      ;[lastMove.from, lastMove.to].forEach(sq => {
        const tile = tileMeshes.get(sq)
        if (tile) {
          tile.material.emissive.setHex(0xffff00)
          tile.material.emissiveIntensity = 0.2
        }
      })
    }

    // Highlight selected square
    if (selectedSquare) {
      // selectedSquare is { row, col }, convert to square name
      const file = String.fromCharCode(96 + selectedSquare.col)
      const rank = 9 - selectedSquare.row
      const sq = file + rank
      const tile = tileMeshes.get(sq)
      if (tile) {
        tile.material.emissive.setHex(0x00ff00)
        tile.material.emissiveIntensity = 0.3
      }
    }

    // Valid move indicators — remove old dots
    moveDots.forEach(dot => scene.remove(dot))
    moveDots.clear()

    // Add new valid move dots
    if (validMoves && validMoves.length > 0) {
      const dotGeo = new THREE.SphereGeometry(0.1, 12, 12)
      const dotMat = new THREE.MeshStandardMaterial({
        color: 0x00ff00,
        emissive: 0x00aa00,
        emissiveIntensity: 0.5,
        roughness: 0.3
      })
      validMoves.forEach(sq => {
        const pos = squareTo3D(sq)
        const dot = new THREE.Mesh(dotGeo, dotMat)
        dot.position.set(pos.x, 0.35, pos.z) // float above tile
        scene.add(dot)
        moveDots.set(sq, dot)
      })
    }

    // Sync pieces if board changed
    if (currentFen !== prevBoardFen) {
      syncPieces(boardState)
      prevBoardFen = currentFen
    }

    isDirty = true
  }

  // ============================================================
  // PIECE SYNC
  // ============================================================

  function syncPieces(boardState) {
    // Get current board layout from chess.js
    const board = boardState.board() // 8x8 array, row 0 = rank 8
    const newSquareMap = new Map() // squareName -> { type, color }

    for (let rankIdx = 0; rankIdx < 8; rankIdx++) {
      for (let fileIdx = 0; fileIdx < 8; fileIdx++) {
        const piece = board[rankIdx][fileIdx]
        if (piece) {
          const file = String.fromCharCode(97 + fileIdx)
          const rank = 8 - rankIdx
          const squareName = file + rank
          newSquareMap.set(squareName, { type: piece.type, color: piece.color })
        }
      }
    }

    // Collect old squares that are now empty (piece left or was captured)
    const vacatedSquares = new Set()
    pieceMeshes.forEach((group, squareName) => {
      if (!newSquareMap.has(squareName)) {
        vacatedSquares.add(squareName)
      } else {
        // Square still occupied — check if same piece type/color
        const newPiece = newSquareMap.get(squareName)
        if (group.userData.type !== newPiece.type || group.userData.color !== newPiece.color) {
          // Different piece now here (e.g. promotion or capture-and-replace)
          vacatedSquares.add(squareName)
        }
      }
    })

    // PASS 1: Detect moves — match new squares needing a piece with vacated squares
    // movedPieces: oldSquare -> newSquare
    const movedPieces = new Map()
    const matchedNewSquares = new Set()

    newSquareMap.forEach(({ type, color }, newSquare) => {
      // Skip if there's already the correct piece at this square
      const existing = pieceMeshes.get(newSquare)
      if (existing && existing.userData.type === type && existing.userData.color === color) {
        return
      }

      // Search vacated squares for a matching piece that moved here
      for (const oldSquare of vacatedSquares) {
        if (movedPieces.has(oldSquare)) continue // already matched
        const group = pieceMeshes.get(oldSquare)
        if (group && group.userData.type === type && group.userData.color === color) {
          movedPieces.set(oldSquare, newSquare)
          matchedNewSquares.add(newSquare)
          break
        }
      }
    })

    // PASS 2: Capture truly removed pieces (vacated and NOT moved)
    vacatedSquares.forEach(squareName => {
      if (!movedPieces.has(squareName)) {
        const group = pieceMeshes.get(squareName)
        if (group) {
          animateCapture(group, squareName)
        }
      }
    })

    // Remove wrong-type pieces sitting on occupied squares
    newSquareMap.forEach(({ type, color }, squareName) => {
      const existing = pieceMeshes.get(squareName)
      if (existing && (existing.userData.type !== type || existing.userData.color !== color) &&
          !movedPieces.has(squareName)) {
        scene.remove(existing)
        disposeGroup(existing)
        pieceMeshes.delete(squareName)
      }
    })

    // PASS 3: Animate moves, then create new pieces for unmatched squares
    movedPieces.forEach((newSquare, oldSquare) => {
      const group = pieceMeshes.get(oldSquare)
      if (!group) return
      const targetPos = squareTo3D(newSquare)
      const startPos = group.position.clone()
      pieceMeshes.delete(oldSquare)
      pieceMeshes.set(newSquare, group)
      group.userData.square = newSquare
      animateMove(group, startPos, targetPos)
    })

    // Create brand new pieces for squares that weren't filled by a move
    newSquareMap.forEach(({ type, color }, squareName) => {
      if (pieceMeshes.has(squareName)) {
        // Already has the right piece (existing or just moved here)
        const existing = pieceMeshes.get(squareName)
        if (existing.userData.type === type && existing.userData.color === color) {
          // Ensure position is correct (handles undo snapping)
          const targetPos = squareTo3D(squareName)
          if (!isNearlyEqual(existing.position.x, targetPos.x) ||
              !isNearlyEqual(existing.position.z, targetPos.z)) {
            animateMove(existing, existing.position.clone(), targetPos)
          }
          return
        }
      }

      // No piece here — create a new one (start of game, promotion, undo)
      const group = buildPiece(type, color)
      group.userData.type = type
      group.userData.color = color
      group.userData.square = squareName
      const pos = squareTo3D(squareName)
      group.position.set(pos.x, pos.y, pos.z)
      scene.add(group)
      pieceMeshes.set(squareName, group)
    })
  }

  function isNearlyEqual(a, b, eps = 0.001) {
    return Math.abs(a - b) < eps
  }

  // ============================================================
  // PIECE ANIMATIONS
  // ============================================================

  function animateMove(group, startPos, endPos) {
    // Arc move: rise, slide, drop
    isAnimating = true
    isDirty = true
    const now = performance.now()
    activeAnimations.push({
      group,
      startPos: startPos.clone(),
      endPos: endPos.clone(),
      startTime: now,
      phase: 'rise',      // rise -> slide -> drop
      duration: { rise: 100, slide: 200, drop: 100 }
    })
  }

  function animateCapture(group, squareName) {
    isAnimating = true
    isDirty = true
    const now = performance.now()
    activeAnimations.push({
      group,
      startPos: group.position.clone(),
      endPos: group.position.clone(),
      startTime: now,
      phase: 'capture',
      duration: { capture: 200 },
      onComplete: () => {
        scene.remove(group)
        disposeGroup(group)
        pieceMeshes.delete(squareName)
      }
    })
  }

  function processAnimations() {
    if (activeAnimations.length === 0) {
      isAnimating = false
      return
    }

    const now = performance.now()
    const toRemove = []

    activeAnimations.forEach((anim, idx) => {
      const elapsed = now - anim.startTime

      if (anim.phase === 'capture') {
        const t = Math.min(elapsed / anim.duration.capture, 1)
        const scale = 1 - t
        anim.group.scale.setScalar(scale)
        if (t >= 1) {
          if (anim.onComplete) anim.onComplete()
          toRemove.push(idx)
        }
        return
      }

      // Rise phase
      if (anim.phase === 'rise') {
        const t = Math.min(elapsed / anim.duration.rise, 1)
        const riseHeight = 0.5
        anim.group.position.y = lerp(anim.startPos.y, anim.startPos.y + riseHeight, easeInOut(t))
        if (t >= 1) {
          anim.phase = 'slide'
          anim.startTime = now
          anim.riseY = anim.startPos.y + riseHeight
        }
        return
      }

      // Slide phase
      if (anim.phase === 'slide') {
        const t = Math.min(elapsed / anim.duration.slide, 1)
        anim.group.position.x = lerp(anim.startPos.x, anim.endPos.x, easeInOut(t))
        anim.group.position.z = lerp(anim.startPos.z, anim.endPos.z, easeInOut(t))
        anim.group.position.y = anim.riseY
        if (t >= 1) {
          anim.phase = 'drop'
          anim.startTime = now
        }
        return
      }

      // Drop phase
      if (anim.phase === 'drop') {
        const t = Math.min(elapsed / anim.duration.drop, 1)
        anim.group.position.y = lerp(anim.riseY, anim.endPos.y, easeInOut(t))
        if (t >= 1) {
          anim.group.position.copy(anim.endPos)
          toRemove.push(idx)
        }
        return
      }
    })

    // Remove completed animations (reverse order to preserve indices)
    for (let i = toRemove.length - 1; i >= 0; i--) {
      activeAnimations.splice(toRemove[i], 1)
    }

    if (activeAnimations.length === 0) {
      isAnimating = false
    }
  }

  function lerp(a, b, t) {
    return a + (b - a) * t
  }

  function easeInOut(t) {
    return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t
  }

  // ============================================================
  // CLICK / TOUCH INTERACTION
  // ============================================================

  function handleClick(event) {
    if (!clickCallback) return
    const rect = canvas.getBoundingClientRect()
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1
    castRayForClick()
  }

  function handleTouch(event) {
    if (!clickCallback || !event.changedTouches.length) return
    const touch = event.changedTouches[0]
    const rect = canvas.getBoundingClientRect()
    mouse.x = ((touch.clientX - rect.left) / rect.width) * 2 - 1
    mouse.y = -((touch.clientY - rect.top) / rect.height) * 2 + 1
    castRayForClick()
  }

  function castRayForClick() {
    raycaster.setFromCamera(mouse, camera)
    const tileArray = Array.from(tileMeshes.values())
    const intersects = raycaster.intersectObjects(tileArray)
    if (intersects.length > 0) {
      const hit = intersects[0].object
      if (hit.userData.square) {
        clickCallback(hit.userData.square)
      }
    }
  }

  function onSquareClick(callback) {
    clickCallback = callback
  }

  // ============================================================
  // RENDER LOOP
  // ============================================================

  function startRenderLoop() {
    function loop() {
      animationId = requestAnimationFrame(loop)

      controls.update()

      if (activeAnimations.length > 0) {
        processAnimations()
        isDirty = true
      }

      if (isDirty || isAnimating) {
        renderer.render(scene, camera)
        isDirty = false
      }
    }
    loop()
  }

  // ============================================================
  // DISPOSE
  // ============================================================

  function disposeGroup(group) {
    group.traverse(obj => {
      if (obj.geometry) obj.geometry.dispose()
      // Don't dispose shared materials — they're module-level constants
    })
  }

  function dispose() {
    if (animationId) {
      cancelAnimationFrame(animationId)
      animationId = null
    }

    if (resizeObserver) {
      resizeObserver.disconnect()
      resizeObserver = null
    }

    if (canvas) {
      canvas.removeEventListener('click', handleClick)
      canvas.removeEventListener('touchend', handleTouch)
    }

    if (controls) {
      controls.dispose()
      controls = null
    }

    // Dispose all scene objects
    pieceMeshes.forEach(group => {
      scene.remove(group)
      disposeGroup(group)
    })
    pieceMeshes.clear()

    tileMeshes.forEach(tile => {
      scene.remove(tile)
      tile.geometry.dispose()
      tile.material.dispose()
    })
    tileMeshes.clear()

    moveDots.forEach(dot => {
      scene.remove(dot)
      dot.geometry.dispose()
      dot.material.dispose()
    })
    moveDots.clear()

    // Dispose shared materials
    MAT_WHITE_PIECE.dispose()
    MAT_BLACK_PIECE.dispose()
    MAT_EYE_WHITE.dispose()
    MAT_EYE_PUPIL.dispose()
    MAT_QUEEN_CROWN.dispose()
    MAT_LIGHT_TILE.dispose()
    MAT_DARK_TILE.dispose()
    MAT_BOARD_FRAME.dispose()

    if (renderer) {
      renderer.dispose()
      renderer = null
    }

    scene = null
    camera = null
  }

  // ============================================================
  // PUBLIC API
  // ============================================================

  return {
    init,
    updateBoard,
    dispose,
    onSquareClick
  }
}
