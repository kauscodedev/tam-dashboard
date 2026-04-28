import { NextResponse } from 'next/server'
import { head } from '@vercel/blob'

export async function GET() {
  try {
    const blob = await head('sync-status.json', {
      token: process.env.BLOB_READ_WRITE_TOKEN!,
    })

    if (!blob) {
      return NextResponse.json(
        { status: 'unknown', error: 'Status not found' },
        { status: 404 }
      )
    }

    const response = await fetch(blob.url)
    if (!response.ok) {
      return NextResponse.json(
        { status: 'unknown', error: 'Failed to fetch status' },
        { status: 500 }
      )
    }

    const data = await response.json()

    return NextResponse.json(data, {
      headers: {
        'Cache-Control': 'max-age=60, must-revalidate',
      },
    })
  } catch (error) {
    console.error('Error fetching sync status:', error)
    return NextResponse.json(
      { status: 'unknown', error: 'Internal server error' },
      { status: 500 }
    )
  }
}
