import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';

// In-memory storage for demo (replace with database later)
const users: any[] = [];

export async function POST(request: NextRequest) {
  try {
    const { email, password, name } = await request.json();

    // Validation
    if (!email || !password || !name) {
      return NextResponse.json(
        { message: 'All fields are required' },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { message: 'Password must be at least 6 characters' },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existingUser = users.find(user => user.email === email);
    if (existingUser) {
      return NextResponse.json(
        { message: 'User already exists with this email' },
        { status: 400 }
      );
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create user
    const newUser = {
      id: Date.now().toString(),
      email,
      name,
      password: hashedPassword,
      tokens: 100, // Free tokens for new users
      createdAt: new Date().toISOString(),
    };

    users.push(newUser);

    // Return user without password
    const { password: _, ...userWithoutPassword } = newUser;

    return NextResponse.json(
      { 
        user: userWithoutPassword,
        message: 'Registration successful!' 
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}
