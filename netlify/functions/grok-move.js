// ============================================================
// NETLIFY FUNCTION: Get chess move from Grok AI
// ============================================================

export async function handler(event) {
  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    }
  }

  try {
    // Parse request body
    const { fen, legalMoves } = JSON.parse(event.body)

    if (!fen || !legalMoves) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Missing fen or legalMoves' })
      }
    }

    // Get API key from environment
    const apiKey = process.env.GROK_API_KEY
    if (!apiKey) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'API key not configured' })
      }
    }

    // Build the prompt for Grok
    const prompt = `You are playing chess as Black.

Current position (FEN): ${fen}

Legal moves available: ${legalMoves.join(', ')}

Choose your move. Respond with ONLY the move in standard algebraic notation (e.g., "e5", "Nf6", "Bxc4", "O-O").
Do not include any explanation, just the move.`

    // Call Grok API
    const response = await fetch('https://api.x.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'grok-3',
        messages: [
          {
            role: 'system',
            content: 'You are a chess engine. Respond only with chess moves in standard algebraic notation. No explanations.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3,  // Lower temperature for more consistent moves
        max_tokens: 10     // We only need a short response
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Grok API error:', errorText)
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'Grok API request failed' })
      }
    }

    const data = await response.json()

    // Extract the move from Grok's response
    const moveText = data.choices?.[0]?.message?.content?.trim()

    if (!moveText) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'No move in response' })
      }
    }

    // Clean up the move (remove any extra characters)
    const cleanMove = moveText.replace(/[^a-hA-H1-8KQRBNOoxX+#=-]/g, '').trim()

    console.log('Grok chose move:', cleanMove, '(raw:', moveText, ')')

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ move: cleanMove || moveText })
    }

  } catch (error) {
    console.error('Function error:', error)
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    }
  }
}
