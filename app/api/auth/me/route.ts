import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // In a real app, you would check the session/token here
    // For demo purposes, return null (no authenticated user)
    return NextResponse.json(null, { status: 200 });
  } catch (error) {
    console.error('Auth check error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}
