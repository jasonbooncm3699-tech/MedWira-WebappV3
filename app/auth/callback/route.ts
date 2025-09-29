import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const error = searchParams.get('error');

    if (error) {
      console.error('❌ OAuth callback error:', error);
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}?error=${encodeURIComponent(error)}`);
    }

    if (!code) {
      console.error('❌ No authorization code received');
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}?error=no_code`);
    }

    console.log('🔐 Processing OAuth callback with code:', code.substring(0, 10) + '...');

    // Exchange code for session
    const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

    if (exchangeError) {
      console.error('❌ Code exchange error:', exchangeError.message);
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}?error=${encodeURIComponent(exchangeError.message)}`);
    }

    if (data.session?.user) {
      console.log('✅ OAuth authentication successful for:', data.session.user.email);
      
      // Ensure user record exists in our database
      try {
        const { error: upsertError } = await supabase.from('users').upsert({
          id: data.session.user.id,
          email: data.session.user.email,
          name: data.session.user.user_metadata?.full_name || 
                data.session.user.user_metadata?.name || 
                data.session.user.user_metadata?.user_name ||
                'User',
          tokens: 30,
          subscription_tier: 'free',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          last_login: new Date().toISOString(),
        }, {
          onConflict: 'id'
        });

        if (upsertError) {
          console.warn('⚠️ Failed to upsert user record:', upsertError);
        } else {
          console.log('✅ User record created/updated in database');
        }
      } catch (dbError) {
        console.warn('⚠️ Database operation failed:', dbError);
      }
    }

    // Redirect to home page
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}`);

  } catch (error) {
    console.error('💥 OAuth callback exception:', error);
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}?error=callback_error`);
  }
}
