#!/usr/bin/env node

/**
 * Database Setup Script for Wolf Property Management
 * 
 * This script sets up the Supabase database with all necessary tables,
 * policies, and initial data.
 * 
 * Usage: node setup-database.js
 */

import { createClient } from '@supabase/supabase-js';
import { SUPABASE_CONFIG, DATABASE_SCHEMAS, RLS_POLICIES, DEFAULT_ADMIN, CONTENT_MAPPING } from './supabase-config.js';

// Initialize Supabase client with service role key for admin operations
const supabase = createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.serviceRoleKey);

async function setupDatabase() {
    console.log('🚀 Setting up Wolf Property Management Database...\n');

    try {
        // Step 1: Create tables
        console.log('📋 Creating database tables...');
        await createTables();
        
        // Step 2: Set up Row Level Security
        console.log('🔒 Setting up Row Level Security policies...');
        await setupRLS();
        
        // Step 3: Create default admin user
        console.log('👤 Creating default admin user...');
        await createDefaultAdmin();
        
        // Step 4: Initialize website content
        console.log('📝 Initializing website content...');
        await initializeContent();
        
        // Step 5: Create storage bucket
        console.log('📦 Creating storage bucket...');
        await createStorageBucket();
        
        console.log('\n✅ Database setup completed successfully!');
        console.log('\n📋 Next steps:');
        console.log('1. Get your Supabase anon key from the dashboard');
        console.log('2. Update supabase-config.js with the anon key');
        console.log('3. Test the admin login with: admin@wolfpm.com / admin123');
        
    } catch (error) {
        console.error('❌ Database setup failed:', error);
        process.exit(1);
    }
}

async function createTables() {
    const tables = [
        { name: 'admin_users', schema: DATABASE_SCHEMAS.adminUsers },
        { name: 'website_content', schema: DATABASE_SCHEMAS.websiteContent },
        { name: 'version_history', schema: DATABASE_SCHEMAS.versionHistory },
        { name: 'media_content', schema: DATABASE_SCHEMAS.mediaContent }
    ];

    for (const table of tables) {
        try {
            const { error } = await supabase.rpc('exec_sql', { sql: table.schema });
            if (error) {
                console.log(`   ⚠️  Table ${table.name} might already exist:`, error.message);
            } else {
                console.log(`   ✅ Created table: ${table.name}`);
            }
        } catch (error) {
            console.log(`   ⚠️  Table ${table.name} might already exist:`, error.message);
        }
    }
}

async function setupRLS() {
    const policies = [
        { name: 'admin_users', policy: RLS_POLICIES.adminUsers },
        { name: 'website_content', policy: RLS_POLICIES.websiteContent },
        { name: 'version_history', policy: RLS_POLICIES.versionHistory },
        { name: 'media_content', policy: RLS_POLICIES.mediaContent }
    ];

    for (const policy of policies) {
        try {
            const { error } = await supabase.rpc('exec_sql', { sql: policy.policy });
            if (error) {
                console.log(`   ⚠️  RLS for ${policy.name} might already be set up:`, error.message);
            } else {
                console.log(`   ✅ Set up RLS for: ${policy.name}`);
            }
        } catch (error) {
            console.log(`   ⚠️  RLS for ${policy.name} might already be set up:`, error.message);
        }
    }
}

async function createDefaultAdmin() {
    try {
        // Check if admin already exists
        const { data: existingAdmin } = await supabase
            .from('admin_users')
            .select('id')
            .eq('email', DEFAULT_ADMIN.email)
            .single();

        if (existingAdmin) {
            console.log('   ⚠️  Default admin user already exists');
            return;
        }

        // Create default admin user
        const { error } = await supabase
            .from('admin_users')
            .insert({
                email: DEFAULT_ADMIN.email,
                password_hash: DEFAULT_ADMIN.password, // In production, hash this
                is_active: DEFAULT_ADMIN.isActive
            });

        if (error) throw error;

        console.log('   ✅ Created default admin user');
        console.log(`   📧 Email: ${DEFAULT_ADMIN.email}`);
        console.log(`   🔑 Password: ${DEFAULT_ADMIN.password}`);
        
    } catch (error) {
        console.log('   ⚠️  Could not create default admin:', error.message);
    }
}

async function initializeContent() {
    const pages = Object.keys(CONTENT_MAPPING);
    
    for (const pageName of pages) {
        const contentMapping = CONTENT_MAPPING[pageName];
        const contentKeys = Object.keys(contentMapping);
        
        console.log(`   📄 Initializing content for ${pageName}...`);
        
        for (const contentKey of contentKeys) {
            try {
                // Get current content from the page
                const element = document.querySelector(contentMapping[contentKey].selector);
                const contentText = element ? element.textContent : `Default ${contentKey}`;
                
                // Insert content into database
                const { error } = await supabase
                    .from('website_content')
                    .upsert({
                        page_name: pageName,
                        element_id: contentKey,
                        content_text: contentText,
                        content_type: contentMapping[contentKey].type,
                        version: 1,
                        is_active: true
                    });

                if (error) {
                    console.log(`      ⚠️  Could not save ${contentKey}:`, error.message);
                } else {
                    console.log(`      ✅ Saved: ${contentKey}`);
                }
                
            } catch (error) {
                console.log(`      ⚠️  Could not save ${contentKey}:`, error.message);
            }
        }
    }
}

async function createStorageBucket() {
    try {
        // Create storage bucket for media files
        const { error } = await supabase.storage.createBucket('website-media', {
            public: true,
            allowedMimeTypes: ['image/*', 'video/*', 'application/pdf'],
            fileSizeLimit: 52428800 // 50MB
        });

        if (error) {
            console.log('   ⚠️  Storage bucket might already exist:', error.message);
        } else {
            console.log('   ✅ Created storage bucket: website-media');
        }
        
    } catch (error) {
        console.log('   ⚠️  Could not create storage bucket:', error.message);
    }
}

// Run setup if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    setupDatabase();
}

export { setupDatabase }; 