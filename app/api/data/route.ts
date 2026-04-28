import { NextRequest, NextResponse } from 'next/server'
import { head } from '@vercel/blob'

export async function GET(request: NextRequest) {
  const secret = request.headers.get('X-Dashboard-Secret')
  if (secret !== process.env.DASHBOARD_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const blob = await head('tam-data.json', {
      token: process.env.BLOB_READ_WRITE_TOKEN!,
    })

    if (!blob) {
      return NextResponse.json(
        { error: 'Data not found' },
        { status: 404 }
      )
    }

    const response = await fetch(blob.url)
    if (!response.ok) {
      return NextResponse.json(
        { error: 'Failed to fetch data' },
        { status: 500 }
      )
    }

    const data = await response.json()

    return NextResponse.json(data, {
      headers: {
        'Cache-Control': 'no-store',
      },
    })
  } catch (error) {
    console.error('Error fetching data:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
