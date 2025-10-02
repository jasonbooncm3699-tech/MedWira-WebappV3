// CANONICAL CODE FOR app/auth/callback/route.ts
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const error = requestUrl.searchParams.get('error');

  console.log('🔐 OAuth Callback received:', {
    hasCode: !!code,
    hasError: !!error,
    timestamp: new Date().toISOString(),
    origin: requestUrl.origin,
    pathname: requestUrl.pathname
  });

  // Handle OAuth errors
  if (error) {
    console.error('❌ OAuth provider error:', error);
    return NextResponse.redirect(new URL('/?error=auth_failed', request.url));
  }

  if (code) {
    // CRITICAL: This initialization is what enables the server to SET THE SECURE COOKIE.
    const supabase = createRouteHandlerClient({ cookies });
    
    console.log('🔄 Exchanging OAuth code for session...');
    
    // Exchange the temporary code for a permanent session and set the cookie.
    const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
    
    if (exchangeError) {
      console.error("❌ Supabase code exchange failed:", exchangeError.message);
      console.error("❌ Exchange error details:", exchangeError);
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

    console.log('💾 Creating/updating user record:', {
      id: user.id,
      email: user.email,
      name: userName
    });

    // Create user record using the new provisioning function
    try {
      // Check for referral code in URL parameters
      const referralCode = requestUrl.searchParams.get('ref');
      
      console.log('💾 Provisioning user with database function:', {
        userId: user.id,
        email: user.email,
        name: userName,
        referralCode: referralCode || 'none'
      });

      const { data: provisionResult, error: provisionError } = await supabase
        .rpc('provision_user_manually', {
          user_id: user.id,
          user_email: user.email,
          user_name: userName,
          referral_code_param: referralCode
        });

      if (provisionError) {
        console.error('❌ User provisioning failed:', provisionError);
        // Fallback to direct insert
        await supabase
          .from('users')
          .upsert({
            id: user.id,
            email: user.email,
            name: userName,
            tokens: 30,
            subscription_tier: 'free',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            last_login: new Date().toISOString(),
          }, {
            onConflict: 'id',
            ignoreDuplicates: false
          });
        console.log('✅ User record created/updated via fallback method');
      } else {
        console.log('✅ User provisioned successfully:', provisionResult);
      }
    } catch (dbError) {
      console.warn('⚠️ Database operation failed:', dbError);
      // Continue anyway - user is authenticated
    }

    console.log('✅ OAuth callback completed successfully');
    console.log('🏠 Redirecting to home page...');
  } else {
    console.error('❌ No authorization code received');
    return NextResponse.redirect(new URL('/?error=no_code', request.url));
  }

  // Always redirect the user back to the main authenticated route.
  return NextResponse.redirect(new URL('/', request.url));
}