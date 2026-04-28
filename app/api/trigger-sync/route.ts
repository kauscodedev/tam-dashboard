import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  const secret = request.headers.get('X-Dashboard-Secret')
  if (secret !== process.env.DASHBOARD_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!process.env.GITHUB_TOKEN || !process.env.GITHUB_REPO) {
    return NextResponse.json(
      { error: 'GitHub configuration missing' },
      { status: 500 }
    )
  }

  try {
    const response = await fetch(
      `https://api.github.com/repos/${process.env.GITHUB_REPO}/actions/workflows/sync-hubspot.yml/dispatches`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
          Accept: 'application/vnd.github.v3+json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ref: 'main' }),
      }
    )

    if (!response.ok && response.status !== 204) {
      const error = await response.text()
      console.error('GitHub API error:', error)
      return NextResponse.json(
        { error: 'Failed to trigger workflow' },
        { status: response.status }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error triggering sync:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
