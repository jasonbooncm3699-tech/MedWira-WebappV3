import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(request: NextRequest) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const error = requestUrl.searchParams.get('error');

  console.log('🔐 OAuth Callback received:', {
    hasCode: !!code,
    hasError: !!error,
    timestamp: new Date().toISOString()
  });

  // Handle OAuth errors
  if (error) {
    console.error('❌ OAuth provider error:', error);
    return NextResponse.redirect(new URL('/?error=auth_failed', request.url));
  }

  // Verify authorization code exists
  if (!code) {
    console.error('❌ No authorization code received');
    return NextResponse.redirect(new URL('/?error=no_code', request.url));
  }

  try {
    // Exchange authorization code for session
    const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

    if (exchangeError) {
      console.error('❌ Code exchange failed:', exchangeError);
      return NextResponse.redirect(new URL('/?error=exchange_failed', request.url));
    }

    if (!data.session) {
      console.error('❌ No session returned after code exchange');
      return NextResponse.redirect(new URL('/?error=no_session', request.url));
    }

    const { user } = data.session;
    console.log('✅ Session created successfully:', {
      userId: user.id,
      email: user.email,
      provider: user.app_metadata?.provider
    });

    // Create or update user record in database
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

    // Retry logic for database operations
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
            tokens: 30, // Award 30 free tokens to new users
            subscription_tier: 'free',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            last_login: new Date().toISOString(),
          }, {
            onConflict: 'id',
            ignoreDuplicates: false
          })
          .select()
          .single();

        if (upsertError) {
          console.error(`⚠️ Upsert attempt ${attempt} failed:`, {
            error: upsertError.message,
            code: upsertError.code,
            details: upsertError.details
          });

          if (attempt < maxRetries) {
            const delay = attempt * 500; // 500ms, 1000ms, 1500ms
            console.log(`⏳ Retrying in ${delay}ms...`);
            await new Promise(resolve => setTimeout(resolve, delay));
            continue;
          } else {
            console.error('❌ All database upsert attempts failed');
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
        break;

      } catch (dbException) {
        console.error(`💥 Database exception on attempt ${attempt}:`, {
          error: dbException instanceof Error ? dbException.message : 'Unknown',
          stack: dbException instanceof Error ? dbException.stack : undefined
        });

        if (attempt < maxRetries) {
          const delay = attempt * 500;
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

    // Set session cookie with proper domain and secure flag
    const response = NextResponse.redirect(new URL('/?session_refresh=true', request.url));
    
    // Set secure cookie for production
    const isProduction = process.env.NODE_ENV === 'production';
    const domain = isProduction ? 'medwira.com' : 'localhost';
    
    response.cookies.set('sb-access-token', data.session.access_token, {
      domain: domain,
      secure: isProduction,
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7 // 7 days
    });

    response.cookies.set('sb-refresh-token', data.session.refresh_token, {
      domain: domain,
      secure: isProduction,
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30 // 30 days
    });

    console.log('🍪 Session cookies set with domain:', domain);
    console.log('🏠 Redirecting to home page with session refresh...');

    return response;

  } catch (error) {
    console.error('💥 OAuth callback exception:', error);
    return NextResponse.redirect(
      new URL('/?error=callback_exception', request.url)
    );
  }
}
