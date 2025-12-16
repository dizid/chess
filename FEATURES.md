# Chess vs Grok AI - Features

## Current Features

### Core Game
- **Chess Engine**: Full chess rules via chess.js library
- **AI Opponent**: Grok-3 AI (you play White, AI plays Black)
- **Move Validation**: All legal moves enforced
- **Pawn Promotion**: Auto-promotes to Queen
- **Check Detection**: Visual indicator when king is in check
- **Checkmate/Stalemate**: Game over detection with overlay

### User Interface
- **3-Column Layout**: Captured pieces | Board | Move History
- **Board Coordinates**: Files (a-h) and ranks (1-8) displayed
- **Last Move Highlighting**: Yellow highlight on from/to squares
- **Valid Move Indicators**: Dots for empty squares, rings for captures
- **King Check Highlight**: Red glow when king is in check
- **Game Over Overlay**: Shows result with emoji

### 3D Board Mode
- **Toggle Button**: Switch between 2D and 3D views
- **Perspective Transform**: 45-degree rotated view
- **Piece Elevation**: Pieces lifted with drop shadows
- **Smooth Animation**: CSS transitions between modes

### Game Controls
- **New Game**: Reset board to starting position
- **Undo Move**: Reverts both your move and Grok's response
- **Progress Indicator**: Animated bar while AI thinks

### Captured Pieces Display
- **Organized by Color**: White captured vs Black captured
- **Material Count**: Shows point advantage (+3, +5, etc.)
- **Piece Ordering**: Sorted by value (Q, R, B, N, P)

### Move History Panel
- **Algebraic Notation**: Standard chess notation
- **Move Numbers**: Numbered move pairs
- **Scrollable**: Full game history preserved
- **Auto-scroll**: Follows latest moves

### Responsive Design
- **Mobile Friendly**: Adapts to screen size
- **Touch Support**: Click-to-select, click-to-move
- **Flexible Layout**: Columns stack on small screens

## Technical Implementation

### Frontend
- Vue 3 with Composition API
- Vite for fast development/builds
- Tailwind CSS 4 for styling

### Backend
- Netlify Functions (serverless)
- Grok API proxy (hides API key)

### Chess Logic
- chess.js for move validation
- FEN notation for position transfer
- UCI move format for AI communication

## Monetization (Active)

### Google AdSense
- Auto-format responsive ad below game
- Publisher ID configured
- Awaiting Google approval

### Ko-fi Donations
- Support button in footer
- Direct link to ko-fi.com/dizid
- 0% platform fees
