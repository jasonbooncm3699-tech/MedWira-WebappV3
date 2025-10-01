import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';

/**
 * OAuth Callback Handler - Enhanced with retry logic and session persistence
 * Handles Google/Facebook OAuth redirects
 * Exchanges authorization code for session and creates user record
 * Includes database retry logic to prevent token award failures
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
    path: requestUrl.pathname,
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

    // Create or update user record in database WITH RETRY LOGIC
    const userName = 
      user.user_metadata?.full_name || 
      user.user_metadata?.name || 
      user.user_metadata?.user_name ||
      user.email?.split('@')[0] ||
      'User';

    console.log('💾 Attempting to create/update user record:', {
      id: user.id,
      email: user.email,
      name: userName,
      tokensToAward: 30
    });

    // Retry logic for database operations (handles connection timeouts)
    let upsertSuccess = false;
    let finalUserData = null;
    const maxRetries = 3;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`💾 Database upsert attempt ${attempt}/${maxRetries}...`);

        const { data: upsertData, error: upsertError } = await supabase
          .from('users')
          .upsert({
            id: user.id,
            email: user.email,
            name: userName,
            tokens: 30, // ⭐ Award 30 free tokens to new users
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
          console.error(`⚠️ Upsert attempt ${attempt} failed:`, {
            error: upsertError.message,
            code: upsertError.code,
            details: upsertError.details,
            hint: upsertError.hint
          });

          if (attempt < maxRetries) {
            const delay = attempt * 300; // 300ms, 600ms, 900ms
            console.log(`⏳ Retrying in ${delay}ms...`);
            await new Promise(resolve => setTimeout(resolve, delay));
            continue; // Try again
          } else {
            console.error('❌ All database upsert attempts failed');
            // Continue with redirect - auth succeeded even if DB failed
            break;
          }
        }

        // Success!
        console.log('✅ User record created/updated successfully:', {
          userId: upsertData?.id,
          email: upsertData?.email,
          name: upsertData?.name,
          tokens: upsertData?.tokens,
          tier: upsertData?.subscription_tier,
          attempt: attempt
        });

        finalUserData = upsertData;
        upsertSuccess = true;
        break; // Exit retry loop

      } catch (dbException) {
        console.error(`💥 Database exception on attempt ${attempt}:`, {
          error: dbException instanceof Error ? dbException.message : 'Unknown',
          stack: dbException instanceof Error ? dbException.stack : undefined
        });

        if (attempt < maxRetries) {
          const delay = attempt * 300;
          console.log(`⏳ Retrying after exception in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        } else {
          console.error('❌ All database attempts failed with exceptions');
        }
      }
    }

    // Log final database operation status
    if (upsertSuccess) {
      console.log('🎯 Database operation completed successfully');
    } else {
      console.warn('⚠️ Database operation failed - user authenticated but DB record may not exist');
      console.warn('⚠️ Auth-context will attempt to create user record on client side');
    }

    // Successful authentication - redirect to home with session indicator
    console.log('🏠 Redirecting to home page with session...');
    console.log('🍪 Session should be set in cookies');
    
    // Add session_refresh parameter to trigger client-side session check
    const response = NextResponse.redirect(`${redirectUrl}?session_refresh=true`);
    
    // Ensure cache is not used for this redirect
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
    response.headers.set('Pragma', 'no-cache');
    
    return response;

  } catch (error) {
    console.error('💥 OAuth callback exception:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      name: error instanceof Error ? error.name : 'Unknown',
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString()
    });

    return NextResponse.redirect(
      `${redirectUrl}?auth_error=callback_exception&auth_error_description=${encodeURIComponent(error instanceof Error ? error.message : 'Unknown error')}`
    );
  }
}
