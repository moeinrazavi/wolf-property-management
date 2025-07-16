// Diagnostic Script for Supabase Issues
// Run this in the browser console to diagnose database problems

import dbService from './supabase-client.js';

async function diagnoseSupabaseIssues() {
    console.log('🔍 DIAGNOSING SUPABASE ISSUES...');
    console.log('=====================================');
    
    try {
        // Test 1: Basic connection
        console.log('1️⃣ Testing basic connection...');
        const { data: testData, error: testError } = await dbService.supabase
            .from('admin_users')
            .select('count', { count: 'exact', head: true });
            
        if (testError) {
            console.error('❌ Connection failed:', testError);
            console.log('💡 SOLUTION: Run the quick-setup.sql script in Supabase SQL Editor');
            return;
        }
        console.log('✅ Basic connection successful');
        
        // Test 2: Check if tables exist
        console.log('\n2️⃣ Testing table access...');
        const tables = ['admin_users', 'website_content', 'version_history', 'media_content'];
        
        for (const table of tables) {
            const { data, error } = await dbService.supabase
                .from(table)
                .select('count', { count: 'exact', head: true });
                
            if (error) {
                console.error(`❌ Cannot access ${table}:`, error);
                console.log(`💡 SOLUTION: Table ${table} doesn't exist. Run quick-setup.sql`);
            } else {
                console.log(`✅ ${table} table accessible`);
            }
        }
        
        // Test 3: Check admin users
        console.log('\n3️⃣ Testing admin users...');
        const { data: adminUsers, error: adminError } = await dbService.supabase
            .from('admin_users')
            .select('*')
            .eq('is_active', true);
            
        if (adminError) {
            console.error('❌ Cannot access admin users:', adminError);
        } else {
            console.log(`✅ Found ${adminUsers.length} active admin users`);
            if (adminUsers.length === 0) {
                console.log('💡 SOLUTION: No admin users found. Run quick-setup.sql');
            } else {
                adminUsers.forEach(user => {
                    console.log(`   - ${user.email} (active: ${user.is_active})`);
                });
            }
        }
        
        // Test 4: Check website content
        console.log('\n4️⃣ Testing website content...');
        const { data: content, error: contentError } = await dbService.supabase
            .from('website_content')
            .select('*')
            .eq('page_name', 'index.html')
            .limit(5);
            
        if (contentError) {
            console.error('❌ Cannot access website content:', contentError);
        } else {
            console.log(`✅ Found ${content.length} content items for index.html`);
            if (content.length === 0) {
                console.log('💡 SOLUTION: No content found. Run quick-setup.sql');
            } else {
                content.forEach(item => {
                    console.log(`   - ${item.element_id}: "${item.content_text.substring(0, 50)}..."`);
                });
            }
        }
        
        // Test 5: Test save operation
        console.log('\n5️⃣ Testing save operation...');
        const testChanges = {
            'test-element': 'Test content for save operation'
        };
        
        const { version, error: saveError } = await dbService.saveContent(
            'index.html',
            testChanges,
            'Test save operation'
        );
        
        if (saveError) {
            console.error('❌ Save operation failed:', saveError);
            console.log('💡 SOLUTION: Check RLS policies or run quick-setup.sql');
        } else {
            console.log(`✅ Save operation successful, version: ${version}`);
            
            // Clean up test data
            await dbService.supabase
                .from('website_content')
                .delete()
                .eq('element_id', 'test-element');
        }
        
        console.log('\n=====================================');
        console.log('🎯 DIAGNOSIS COMPLETE');
        
        if (testError || adminError || contentError || saveError) {
            console.log('❌ ISSUES FOUND: Please run quick-setup.sql in Supabase SQL Editor');
        } else {
            console.log('✅ ALL TESTS PASSED: Database is working correctly');
        }
        
    } catch (error) {
        console.error('❌ Diagnostic failed with error:', error);
        console.log('💡 SOLUTION: Check your Supabase configuration and run quick-setup.sql');
    }
}

// Export for use in browser console
window.diagnoseSupabaseIssues = diagnoseSupabaseIssues;

// Auto-run the diagnostic
diagnoseSupabaseIssues(); 