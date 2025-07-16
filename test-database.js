// Database Test Script
// Run this in the browser console to test database connectivity

import dbService from './supabase-client.js';

async function testDatabaseSetup() {
    console.log('=== Database Setup Test ===');
    
    try {
        // Test 1: Basic connection
        console.log('1. Testing basic connection...');
        const { data: testData, error: testError } = await dbService.supabase
            .from('admin_users')
            .select('count', { count: 'exact', head: true });
            
        if (testError) {
            console.error('❌ Connection failed:', testError);
            return;
        }
        console.log('✅ Basic connection successful');
        
        // Test 2: Check if tables exist
        console.log('2. Testing table access...');
        
        const tables = ['admin_users', 'website_content', 'version_history', 'media_content'];
        
        for (const table of tables) {
            const { data, error } = await dbService.supabase
                .from(table)
                .select('count', { count: 'exact', head: true });
                
            if (error) {
                console.error(`❌ Cannot access ${table}:`, error);
            } else {
                console.log(`✅ ${table} table accessible`);
            }
        }
        
        // Test 3: Check admin users
        console.log('3. Testing admin users...');
        const { data: adminUsers, error: adminError } = await dbService.supabase
            .from('admin_users')
            .select('*')
            .eq('is_active', true);
            
        if (adminError) {
            console.error('❌ Cannot access admin users:', adminError);
        } else {
            console.log(`✅ Found ${adminUsers.length} active admin users`);
            adminUsers.forEach(user => {
                console.log(`   - ${user.email} (active: ${user.is_active})`);
            });
        }
        
        // Test 4: Check website content
        console.log('4. Testing website content...');
        const { data: content, error: contentError } = await dbService.supabase
            .from('website_content')
            .select('*')
            .eq('page_name', 'index.html')
            .limit(5);
            
        if (contentError) {
            console.error('❌ Cannot access website content:', contentError);
        } else {
            console.log(`✅ Found ${content.length} content items for index.html`);
            content.forEach(item => {
                console.log(`   - ${item.element_id}: "${item.content_text.substring(0, 50)}..."`);
            });
        }
        
        // Test 5: Check version history
        console.log('5. Testing version history...');
        const { data: versions, error: versionError } = await dbService.supabase
            .from('version_history')
            .select('*')
            .eq('page_name', 'index.html')
            .order('version_number', { ascending: false })
            .limit(5);
            
        if (versionError) {
            console.error('❌ Cannot access version history:', versionError);
        } else {
            console.log(`✅ Found ${versions.length} versions for index.html`);
            versions.forEach(version => {
                console.log(`   - Version ${version.version_number}: ${version.description}`);
            });
        }
        
        console.log('=== Test Complete ===');
        
    } catch (error) {
        console.error('❌ Test failed with error:', error);
    }
}

// Export for use in browser console
window.testDatabaseSetup = testDatabaseSetup;

// Auto-run the test
testDatabaseSetup(); 