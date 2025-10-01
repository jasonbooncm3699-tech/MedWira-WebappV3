import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';

/**
 * OAuth Callback Handler
 * Handles Google/Facebook OAuth redirects
 * Exchanges authorization code for session and creates user record
 */
export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const error = requestUrl.searchParams.get('error');
  const errorDescription = requestUrl.searchParams.get('error_description');

  // Get origin for redirects
  const origin = requestUrl.origin;
  const redirectUrl = `${origin}`;

  console.log('🔐 OAuth Callback received:', {
    hasCode: !!code,
    hasError: !!error,
    origin,
    timestamp: new Date().toISOString()
  });

  // Handle OAuth errors from provider
  if (error) {
    console.error('❌ OAuth provider error:', {
      error,
      description: errorDescription,
      timestamp: new Date().toISOString()
    });
    
    return NextResponse.redirect(
      `${redirectUrl}?auth_error=${encodeURIComponent(error)}&auth_error_description=${encodeURIComponent(errorDescription || '')}`
    );
  }

  // Verify authorization code exists
  if (!code) {
    console.error('❌ No authorization code received from OAuth provider');
    return NextResponse.redirect(`${redirectUrl}?auth_error=no_code`);
  }

  try {
    // Create server-side Supabase client (Next.js 15 async cookies)
    const supabase = await createClient();

    console.log('🔄 Exchanging authorization code for session...');
    console.log('📝 Code (first 20 chars):', code.substring(0, 20) + '...');

    // Exchange authorization code for session
    const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

    if (exchangeError) {
      console.error('❌ Code exchange failed:', {
        error: exchangeError.message,
        name: exchangeError.name,
        status: exchangeError.status,
        timestamp: new Date().toISOString()
      });

      return NextResponse.redirect(
        `${redirectUrl}?auth_error=exchange_failed&auth_error_description=${encodeURIComponent(exchangeError.message)}`
      );
    }

    if (!data.session) {
      console.error('❌ No session returned after code exchange');
      return NextResponse.redirect(`${redirectUrl}?auth_error=no_session`);
    }

    const user = data.session.user;
    console.log('✅ Session created successfully:', {
      userId: user.id,
      email: user.email,
      provider: user.app_metadata?.provider,
      timestamp: new Date().toISOString()
    });

    // Create or update user record in database
    try {
      const userName = 
        user.user_metadata?.full_name || 
        user.user_metadata?.name || 
        user.user_metadata?.user_name ||
        user.email?.split('@')[0] ||
        'User';

      console.log('💾 Creating/updating user record:', {
        id: user.id,
        email: user.email,
        name: userName
      });

      const { data: upsertData, error: upsertError } = await supabase
        .from('users')
        .upsert({
          id: user.id,
          email: user.email,
          name: userName,
          tokens: 30, // Award 30 free tokens to new users
          subscription_tier: 'free',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          last_login: new Date().toISOString(),
        }, {
          onConflict: 'id',
          ignoreDuplicates: false // Update existing users
        })
        .select()
        .single();

      if (upsertError) {
        console.error('⚠️ Failed to upsert user record:', {
          error: upsertError.message,
          code: upsertError.code,
          details: upsertError.details
        });
        // Continue anyway - user is authenticated even if DB fails
      } else {
        console.log('✅ User record created/updated successfully:', {
          userId: upsertData?.id,
          tokens: upsertData?.tokens,
          tier: upsertData?.subscription_tier
        });
      }
    } catch (dbError) {
      console.error('💥 Database operation exception:', dbError);
      // Continue anyway - authentication succeeded
    }

    // Successful authentication - redirect to home
    console.log('🏠 Redirecting to home page...');
    return NextResponse.redirect(redirectUrl);

  } catch (error) {
    console.error('💥 OAuth callback exception:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString()
    });

    return NextResponse.redirect(
      `${redirectUrl}?auth_error=callback_exception&auth_error_description=${encodeURIComponent(error instanceof Error ? error.message : 'Unknown error')}`
    );
  }
}
