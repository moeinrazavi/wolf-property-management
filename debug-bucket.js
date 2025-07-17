/**
 * Debug Bucket Upload Utility
 * Comprehensive testing and debugging for Supabase Storage uploads
 */

import { createClient } from 'https://cdn.skypack.dev/@supabase/supabase-js';
import { SUPABASE_CONFIG } from './supabase-config.js';
import dbService from './supabase-client.js';

console.log('🔧 Debug Bucket Utility loaded');

// Test configurations
const BUCKET_CONFIGS = {
    'figures': {
        name: 'figures',
        testSubfolder: 'uploaded',
        testFile: 'test-upload.txt'
    },
    'wolf-property-images': {
        name: 'wolf-property-images', 
        testSubfolder: 'images',
        testFile: 'test-image.txt'
    }
};

class BucketDebugger {
    constructor() {
        this.anonClient = createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey);
        this.serviceClient = createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.serviceRoleKey);
    }

    /**
     * Test bucket accessibility
     */
    async testBucketAccess(bucketName) {
        console.log(`🔍 Testing access to bucket: ${bucketName}`);
        
        try {
            // Test with anon key
            console.log('📋 Testing with anon key...');
            const { data: anonData, error: anonError } = await this.anonClient.storage
                .from(bucketName)
                .list('', { limit: 1 });
            
            if (anonError) {
                console.warn('⚠️ Anon key access failed:', anonError.message);
            } else {
                console.log('✅ Anon key can list files:', anonData?.length || 0, 'files found');
            }

            // Test with service role key
            console.log('🔑 Testing with service role key...');
            const { data: serviceData, error: serviceError } = await this.serviceClient.storage
                .from(bucketName)
                .list('', { limit: 1 });
            
            if (serviceError) {
                console.error('❌ Service role access failed:', serviceError.message);
                return false;
            } else {
                console.log('✅ Service role can list files:', serviceData?.length || 0, 'files found');
                return true;
            }
        } catch (error) {
            console.error('💥 Bucket access test failed:', error);
            return false;
        }
    }

    /**
     * Test file upload with different approaches
     */
    async testUpload(bucketName, subfolder = '') {
        console.log(`🧪 Testing upload to ${bucketName}/${subfolder || 'root'}`);
        
        // Create a test file
        const testContent = `Test upload to ${bucketName} at ${new Date().toISOString()}`;
        const testFile = new Blob([testContent], { type: 'text/plain' });
        
        // Sanitize filename like the main upload function
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const fileName = `test-${timestamp}.txt`;
        const filePath = subfolder ? `${subfolder}/${fileName}` : fileName;
        
        console.log(`📁 Upload path: ${filePath}`);

        try {
            // Test upload with service role
            const { data, error } = await this.serviceClient.storage
                .from(bucketName)
                .upload(filePath, testFile, {
                    cacheControl: '3600',
                    upsert: false
                });

            if (error) {
                console.error('❌ Upload failed:', error);
                return false;
            }

            console.log('✅ Upload successful:', data);

            // Test getting public URL
            const { data: urlData } = this.serviceClient.storage
                .from(bucketName)
                .getPublicUrl(filePath);

            console.log('🔗 Public URL:', urlData.publicUrl);

            // Test cleanup - remove the test file
            await this.serviceClient.storage
                .from(bucketName)
                .remove([filePath]);
            
            console.log('🧹 Test file cleaned up');
            return true;

        } catch (error) {
            console.error('💥 Upload test failed:', error);
            return false;
        }
    }

    /**
     * Test the main dbService upload method
     */
    async testDbServiceUpload(file, bucketName, subfolder) {
        console.log(`🔬 Testing dbService upload to ${bucketName}/${subfolder}`);
        
        try {
            const result = await dbService.uploadToBucket(file, bucketName, subfolder);
            
            if (result.error) {
                console.error('❌ dbService upload failed:', result.error);
                return false;
            }
            
            console.log('✅ dbService upload successful:', result);
            return true;
        } catch (error) {
            console.error('💥 dbService upload test failed:', error);
            return false;
        }
    }

    /**
     * Run comprehensive tests
     */
    async runFullTest(bucketName = 'figures') {
        console.log(`🚀 Running full test suite for bucket: ${bucketName}`);
        
        const results = {
            bucketAccess: false,
            directUpload: false,
            dbServiceUpload: false
        };

        // Test 1: Bucket access
        results.bucketAccess = await this.testBucketAccess(bucketName);
        
        if (!results.bucketAccess) {
            console.error('❌ Bucket access failed, skipping other tests');
            return results;
        }

        // Test 2: Direct upload
        results.directUpload = await this.testUpload(bucketName, 'uploaded');

        // Test 3: dbService upload with a test file
        const testFile = new Blob(['Test content'], { type: 'text/plain' });
        testFile.name = 'test-file.txt';
        results.dbServiceUpload = await this.testDbServiceUpload(testFile, bucketName, 'uploaded');

        console.log('📊 Test Results:', results);
        
        const allPassed = Object.values(results).every(result => result);
        console.log(allPassed ? '🎉 All tests passed!' : '⚠️ Some tests failed');
        
        return results;
    }

    /**
     * Debug specific upload error
     */
    async debugUploadError(file, bucketName, subfolder) {
        console.log('🔍 Debugging upload error...');
        console.log('📄 File details:', {
            name: file.name,
            size: file.size,
            type: file.type
        });

        // Check authentication
        const isAuthenticated = dbService.isAuthenticated();
        console.log('🔐 Authentication status:', isAuthenticated);

        // Test bucket access
        await this.testBucketAccess(bucketName);

        // Try sanitizing filename manually
        const sanitizedFileName = file.name
            .replace(/\s+/g, '-')
            .replace(/[^a-zA-Z0-9.-]/g, '')
            .toLowerCase();
        
        console.log(`🧹 Filename sanitization: "${file.name}" → "${sanitizedFileName}"`);

        // Test with a simple filename
        const testFile = new Blob([file], { type: file.type });
        testFile.name = 'simple-test.png';
        
        console.log('🧪 Testing with simplified filename...');
        return await this.testDbServiceUpload(testFile, bucketName, subfolder);
    }
}

// Create global instance
const bucketDebugger = new BucketDebugger();

// Expose global functions for browser console
window.debugBucket = {
    testFigures: () => bucketDebugger.runFullTest('figures'),
    testProperty: () => bucketDebugger.runFullTest('wolf-property-images'),
    testAccess: (bucket) => bucketDebugger.testBucketAccess(bucket),
    testUpload: (bucket, subfolder) => bucketDebugger.testUpload(bucket, subfolder),
    debugError: (file, bucket, subfolder) => bucketDebugger.debugUploadError(file, bucket, subfolder),
    fullTest: (bucket) => bucketDebugger.runFullTest(bucket)
};

console.log('🎮 Debug functions available:');
console.log('  debugBucket.testFigures() - Test figures bucket');
console.log('  debugBucket.testProperty() - Test property images bucket'); 
console.log('  debugBucket.testAccess(bucketName) - Test bucket access');
console.log('  debugBucket.debugError(file, bucket, subfolder) - Debug upload error');

// Auto-run basic test on load if admin
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        if (dbService.isAuthenticated()) {
            console.log('🔄 Auto-running figures bucket test...');
            bucketDebugger.runFullTest('figures');
        }
    }, 3000);
});

export default bucketDebugger; 