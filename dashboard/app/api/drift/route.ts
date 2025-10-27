import { NextResponse } from 'next/server'
import { DriftClient, createSampleIdentity } from '@/lib/drift-client'

// In-memory client instance (will be replaced with proper state management later)
let driftClient: DriftClient | null = null

function getOrCreateClient(): DriftClient {
  if (!driftClient) {
    const identity = createSampleIdentity()
    driftClient = new DriftClient(identity, 0.2, 50)
  }
  return driftClient
}

/**
 * GET /api/drift
 * Returns current drift score and history
 */
export async function GET() {
  try {
    const client = getOrCreateClient()

    // Get latest score and history
    const latestScore = client.getLatestScore()
    const history = client.getHistory()

    // If no data yet, analyze a sample interaction
    if (!latestScore) {
      // Demo: Simulate a sample interaction
      await client.detectDrift({
        userMessage: 'What are my account options?',
        aiResponse: 'I can help you with that! Let me explain your account options clearly.',
      })

      const newLatestScore = client.getLatestScore()
      const newHistory = client.getHistory()

      return NextResponse.json({
        currentScore: newLatestScore ? {
          overall: newLatestScore.score,
          dimensions: newLatestScore.dimensions,
          flags: [],
          recommendation: 'Continue monitoring interactions',
          confidence: 0.85,
        } : null,
        history: newHistory.points,
      })
    }

    return NextResponse.json({
      currentScore: latestScore ? {
        overall: latestScore.score,
        dimensions: latestScore.dimensions,
        flags: [],
        recommendation: 'Continue monitoring interactions',
        confidence: 0.85,
      } : null,
      history: history.points,
    })
  } catch (error) {
    console.error('Error in drift API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/drift
 * Analyze a new interaction
 */
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { userMessage, aiResponse } = body

    if (!userMessage || !aiResponse) {
      return NextResponse.json(
        { error: 'userMessage and aiResponse are required' },
        { status: 400 }
      )
    }

    const client = getOrCreateClient()
    const score = await client.detectDrift({ userMessage, aiResponse })

    return NextResponse.json({
      score,
      history: client.getHistory(),
    })
  } catch (error) {
    console.error('Error analyzing drift:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
