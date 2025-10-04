/**
 * Fix Jason's Profile - Create missing profile record
 * This script will create the profile record for Jason so he can use the AI agent
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

async function fixJasonProfile() {
  try {
    console.log('🔧 Fixing Jason\'s Profile...');
    
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );
    
    const jasonUserId = '88ff0bde-fa90-4aa7-991e-654eec08951c';
    
    // First, check if profile already exists
    console.log('🔍 Checking if profile exists...');
    const { data: existingProfile, error: checkError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', jasonUserId)
      .single();
      
    if (checkError && checkError.code === 'PGRST116') {
      console.log('⚠️ Profile does not exist - creating new profile...');
    } else if (checkError) {
      console.error('❌ Error checking profile:', checkError);
      return;
    } else {
      console.log('✅ Profile already exists:', existingProfile);
      return;
    }
    
    // Create the profile using upsert to handle conflicts
    console.log('🔧 Creating Jason\'s profile...');
    const { data, error } = await supabase
      .from('profiles')
      .upsert({
        id: jasonUserId,
        token_count: 30,
        referral_code: 'C275226B',
        referral_count: 0,
        referred_by: null,
        display_name: 'Jason',
        avatar_url: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'id',
        ignoreDuplicates: false
      })
      .select()
      .single();
      
    if (error) {
      console.error('❌ Error creating profile:', error);
      
      // Try with minimal fields only
      console.log('🔧 Trying with minimal fields...');
      const { data: minimalData, error: minimalError } = await supabase
        .from('profiles')
        .upsert({
          id: jasonUserId,
          token_count: 30
        }, {
          onConflict: 'id',
          ignoreDuplicates: false
        })
        .select()
        .single();
        
      if (minimalError) {
        console.error('❌ Minimal insert also failed:', minimalError);
      } else {
        console.log('✅ Minimal profile created:', minimalData);
      }
    } else {
      console.log('✅ Profile created successfully:', data);
    }
    
    // Verify the profile was created
    console.log('\\n🔍 Verifying profile...');
    const { data: verifyProfile, error: verifyError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', jasonUserId)
      .single();
      
    if (verifyError) {
      console.error('❌ Verification failed:', verifyError);
    } else {
      console.log('✅ Profile verified:', {
        id: verifyProfile.id,
        token_count: verifyProfile.token_count,
        referral_code: verifyProfile.referral_code,
        display_name: verifyProfile.display_name
      });
      
      // Test token deduction
      console.log('\\n🧪 Testing token deduction...');
      const { decrementToken } = require('./lib/npraDatabase.js');
      const success = await decrementToken(jasonUserId);
      
      if (success) {
        console.log('✅ Token deduction successful');
        
        // Check updated count
        const { data: updatedProfile } = await supabase
          .from('profiles')
          .select('token_count')
          .eq('id', jasonUserId)
          .single();
          
        console.log('Updated token count:', updatedProfile.token_count);
      } else {
        console.log('❌ Token deduction failed');
      }
    }
    
  } catch (error) {
    console.error('❌ Fix failed:', error.message);
  }
}

// Run the fix
fixJasonProfile();
