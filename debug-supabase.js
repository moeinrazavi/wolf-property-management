// Debug Supabase Integration
// This script will test each operation individually

import { createClient } from 'https://cdn.skypack.dev/@supabase/supabase-js';
import { SUPABASE_CONFIG } from './supabase-config.js';

// Initialize Supabase client
const supabase = createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey);

async function debugSupabase() {
    console.log('🔍 Starting Supabase Debug Test...');
    console.log('Config:', { url: SUPABASE_CONFIG.url, anonKey: SUPABASE_CONFIG.anonKey.substring(0, 20) + '...' });
    
    try {
        // Test 1: Basic connection
        console.log('\n1️⃣ Testing basic connection...');
        const { data: testData, error: testError } = await supabase
            .from('admin_users')
            .select('count', { count: 'exact', head: true });
            
        if (testError) {
            console.error('❌ Connection failed:', testError);
            alert('Database connection failed! Please check Supabase setup.');
            return false;
        }
        console.log('✅ Connection successful');
        
        // Test 2: Check admin users
        console.log('\n2️⃣ Testing admin users...');
        const { data: adminUsers, error: adminError } = await supabase
            .from('admin_users')
            .select('*');
            
        if (adminError) {
            console.error('❌ Admin users error:', adminError);
            console.log('💡 Hint: Run the quick-setup.sql script in Supabase SQL Editor');
            return false;
        }
        console.log('✅ Admin users found:', adminUsers.length);
        
        // Test 3: Test content table
        console.log('\n3️⃣ Testing website_content table...');
        const { data: contentData, error: contentError } = await supabase
            .from('website_content')
            .select('*')
            .limit(1);
            
        if (contentError) {
            console.error('❌ Content table error:', contentError);
            return false;
        }
        console.log('✅ Content table accessible, rows:', contentData.length);
        
        // Test 4: Test version history table
        console.log('\n4️⃣ Testing version_history table...');
        const { data: versionData, error: versionError } = await supabase
            .from('version_history')
            .select('*')
            .limit(1);
            
        if (versionError) {
            console.error('❌ Version history error:', versionError);
            return false;
        }
        console.log('✅ Version history accessible, rows:', versionData.length);
        
        // Test 5: Test inserting content
        console.log('\n5️⃣ Testing content insertion...');
        const testContent = {
            page_name: 'test.html',
            element_id: 'test-element',
            content_text: 'Test content - ' + new Date().toISOString(),
            content_type: 'text',
            version: 1,
            is_active: true,
            updated_at: new Date().toISOString()
        };
        
        const { data: insertData, error: insertError } = await supabase
            .from('website_content')
            .insert(testContent)
            .select();
            
        if (insertError) {
            console.error('❌ Insert failed:', insertError);
            return false;
        }
        console.log('✅ Insert successful:', insertData);
        
        // Test 6: Test updating content
        console.log('\n6️⃣ Testing content update...');
        const { data: updateData, error: updateError } = await supabase
            .from('website_content')
            .update({ content_text: 'Updated test content - ' + new Date().toISOString() })
            .eq('page_name', 'test.html')
            .eq('element_id', 'test-element')
            .select();
            
        if (updateError) {
            console.error('❌ Update failed:', updateError);
            return false;
        }
        console.log('✅ Update successful:', updateData);
        
        // Test 7: Clean up test data
        console.log('\n7️⃣ Cleaning up test data...');
        const { error: deleteError } = await supabase
            .from('website_content')
            .delete()
            .eq('page_name', 'test.html');
            
        if (deleteError) {
            console.warn('⚠️ Cleanup warning:', deleteError);
        } else {
            console.log('✅ Cleanup successful');
        }
        
        console.log('\n🎉 All tests passed! Supabase is working correctly.');
        return true;
        
    } catch (error) {
        console.error('💥 Critical error:', error);
        return false;
    }
}

// Auto-run the debug test
debugSupabase();

// Export for manual testing
window.debugSupabase = debugSupabase; 