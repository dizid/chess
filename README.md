# Chess vs Grok AI

A browser-based chess game where you play against Grok AI. Built with Vue 3, Tailwind CSS, and powered by the Grok API.

## Live Demo

Deploy to Netlify and play at your own domain.

## Features

- Play chess against Grok AI (you play White)
- Premium 3-column layout with captured pieces and move history
- 3D board mode toggle
- Last move highlighting
- Check/checkmate visual indicators
- Undo moves
- Progress bar while AI thinks
- Mobile responsive

## Tech Stack

- **Frontend**: Vue 3, Vite, Tailwind CSS 4
- **Chess Logic**: chess.js
- **AI**: Grok API (grok-3)
- **Backend**: Netlify Functions
- **Deployment**: GitHub → Netlify

## Quick Start

```bash
# Install dependencies
npm install

# Run development server
netlify dev

# Build for production
npm run build
```

## Environment Variables

Create a `.env` file:

```
GROK_API_KEY=your_grok_api_key_here
```

## Deployment

1. Push to GitHub
2. Connect to Netlify
3. Set `GROK_API_KEY` in Netlify environment variables
4. Deploy

## License

MIT
