// CANONICAL CODE FOR app/auth/callback/route.ts
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { createClient as createSupabaseAdminClient, SupabaseClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

// Helper function to generate random referral code for fallback
function generateRandomCode(): string {
  return Math.random().toString(36).substring(2, 10).toUpperCase();
}

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

    // Use service role client when we need to bypass RLS for referral lookups
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    let supabaseAdmin: SupabaseClient | null = null;

    if (supabaseUrl && supabaseServiceRoleKey) {
      supabaseAdmin = createSupabaseAdminClient(supabaseUrl, supabaseServiceRoleKey, {
        auth: {
          persistSession: false
        }
      });
    } else {
      console.warn('⚠️ Service role key missing - referral lookup will rely on RLS policies');
    }
    
    console.log('🔄 Exchanging OAuth code for session...');
    
    // Exchange the temporary code for a permanent session and set the cookie.
    // Allow multiple device sessions - don't invalidate existing sessions
    const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
    
    if (exchangeError) {
      console.error("❌ Supabase code exchange failed:", exchangeError.message);
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
    // Note: The supabase client created with createRouteHandlerClient({ cookies })
    // automatically uses the session from cookies set by exchangeCodeForSession
    // This session context is used for RLS checks (auth.uid() = id)
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

    // Create user record using direct database operations (no functions)
    try {
      // Check for referral code in URL parameters
      const referralCode = requestUrl.searchParams.get('ref');
      
      // Extract avatar URL from Google OAuth metadata
      const avatarUrl = user.user_metadata?.avatar_url || 
                       user.user_metadata?.picture || 
                       '';
      
      console.log('💾 Creating user profile directly:', {
        userId: user.id,
        email: user.email,
        name: userName,
        referralCode: referralCode || 'none',
        avatarUrl
      });

      // Generate a simple referral code
      const simpleReferralCode = generateRandomCode();
      
      // Look up the referrer's user ID if referral code is provided
      // FIX: referred_by column expects UUID, not referral code string
      let referrerId = null;
      if (referralCode) {
        console.log('🔍 Looking up referrer ID for code:', referralCode);

        if (!supabaseAdmin) {
          console.warn('⚠️ Supabase service role client unavailable. Skipping referral reward.');
        } else {
          const { data: referrer, error: referrerError } = await supabaseAdmin
            .from('profiles')
            .select('id, tokens, referral_count')
            .eq('referral_code', referralCode)
            .maybeSingle();

          if (referrerError) {
            console.warn('⚠️ Referrer lookup failed:', referralCode, {
              error: referrerError?.message,
              code: referrerError?.code
            });
          } else if (!referrer) {
            console.warn('⚠️ Referrer not found for code:', referralCode);
          } else if (referrer.id === user.id) {
            console.warn('⚠️ Self-referral detected. Ignoring.');
          } else {
            referrerId = referrer.id;

            const updatedTokenBalance = (referrer.tokens ?? 0) + 30;
            const updatedReferralCount = (referrer.referral_count ?? 0) + 1;

            const { error: rewardError } = await supabaseAdmin
              .from('profiles')
              .update({
                tokens: updatedTokenBalance,
                referral_count: updatedReferralCount,
                updated_at: new Date().toISOString()
              })
              .eq('id', referrer.id);

            if (rewardError) {
              console.error('❌ Failed to award referral tokens:', rewardError);
              referrerId = null;
            } else {
              console.log('🎉 Referral reward applied:', {
                referrerId: referrer.id,
                tokensBefore: referrer.tokens ?? 0,
                tokensAfter: updatedTokenBalance,
                referralCountAfter: updatedReferralCount
              });

              const { error: referredByUpdateError } = await supabaseAdmin
                .from('profiles')
                .update({
                  referred_by: referrer.id,
                  updated_at: new Date().toISOString()
                })
                .eq('id', user.id);

              if (referredByUpdateError) {
                console.error('❌ Failed to set referred_by on new user:', referredByUpdateError);
              }
            }
          }
        }
      }
      
      // Direct insert/update into profiles table
      // Note: Let database handle created_at/updated_at via defaults/triggers
      const upsertData: any = {
        id: user.id,
        tokens: 30,
        referral_code: simpleReferralCode,
        referred_by: referrerId, // Store user ID (UUID), not referral code string
        email: user.email,
        display_name: userName,
        avatar_url: avatarUrl || null,
        subscription_tier: 'free',
      };

      console.log('💾 Upserting user profile with data:', {
        id: upsertData.id,
        email: upsertData.email,
        tokens: upsertData.tokens,
        referral_code: upsertData.referral_code,
        referred_by: upsertData.referred_by,
        hasReferrer: !!referrerId
      });

      const { data: provisionResult, error: provisionError } = await supabase
        .from('profiles')
        .upsert(upsertData, {
          onConflict: 'id',
          ignoreDuplicates: false
        })
        .select();

      if (provisionError) {
        console.error('❌ User provisioning failed:', {
          error: provisionError,
          code: provisionError.code,
          message: provisionError.message,
          details: provisionError.details,
          hint: provisionError.hint,
          userId: user.id,
          email: user.email,
          referrerId: referrerId,
          upsertData: upsertData
        });
        
        // Return detailed error for debugging
        return NextResponse.redirect(
          new URL(`/?error=profile_creation_failed&details=${encodeURIComponent(provisionError.message)}`, request.url)
        );
      } else {
        console.log('✅ User provisioned successfully:', {
          userId: user.id,
          email: user.email,
          tokens: provisionResult?.[0]?.tokens,
          referral_code: provisionResult?.[0]?.referral_code
        });
      }
    } catch (dbError: any) {
      console.error('❌ CRITICAL: Unexpected database error:', {
        error: dbError,
        message: dbError?.message,
        stack: dbError?.stack,
        userId: user?.id,
        email: user?.email
      });
      // Continue anyway - user is authenticated, profile might be created by trigger
      // Log but don't fail the authentication flow
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