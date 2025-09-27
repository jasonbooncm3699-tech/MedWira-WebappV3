import { NextResponse } from 'next/server';

export async function POST() {
  try {
    // In a real app, you would invalidate the session/token here
    return NextResponse.json(
      { message: 'Logout successful' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}
