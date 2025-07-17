/**
 * Emergency Fix for Upload Issues
 * Quick fixes and tests for immediate resolution
 */

import { createClient } from 'https://cdn.skypack.dev/@supabase/supabase-js';
import { SUPABASE_CONFIG } from './supabase-config.js';

console.log('🚨 Emergency Fix loaded');

class EmergencyFix {
    constructor() {
        this.serviceClient = createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.serviceRoleKey);
        this.anonClient = createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey);
    }

    /**
     * Quick test of service role key
     */
    async testServiceRoleKey() {
        console.log('🔑 Testing service role key...');
        
        try {
            // Try listing buckets
            const { data, error } = await this.serviceClient.storage.listBuckets();
            
            if (error) {
                console.error('❌ Service role key test failed:', error);
                return false;
            }
            
            console.log('✅ Service role key works. Available buckets:', data?.map(b => b.name));
            return true;
        } catch (error) {
            console.error('💥 Service role key test error:', error);
            return false;
        }
    }

    /**
     * Test specific bucket with service role
     */
    async testBucketWithServiceRole(bucketName) {
        console.log(`🪣 Testing bucket "${bucketName}" with service role...`);
        
        try {
            // Test listing files
            const { data, error } = await this.serviceClient.storage
                .from(bucketName)
                .list('', { limit: 5 });
            
            if (error) {
                console.error(`❌ Bucket "${bucketName}" test failed:`, error);
                return false;
            }
            
            console.log(`✅ Bucket "${bucketName}" accessible. Files found:`, data?.length || 0);
            return true;
        } catch (error) {
            console.error(`💥 Bucket "${bucketName}" test error:`, error);
            return false;
        }
    }

    /**
     * Emergency upload test with minimal complexity
     */
    async emergencyUploadTest(bucketName = 'figures') {
        console.log(`🚨 Emergency upload test to "${bucketName}"...`);
        
        try {
            // Create simple test file
            const testContent = `Emergency test ${Date.now()}`;
            const testFile = new Blob([testContent], { type: 'text/plain' });
            
            // Use very simple filename
            const fileName = `emergency-test-${Date.now()}.txt`;
            const filePath = `uploaded/${fileName}`;
            
            console.log(`📤 Uploading to: ${bucketName}/${filePath}`);
            
            // Upload with service role
            const { data, error } = await this.serviceClient.storage
                .from(bucketName)
                .upload(filePath, testFile);
            
            if (error) {
                console.error('❌ Emergency upload failed:', error);
                return false;
            }
            
            console.log('✅ Emergency upload successful:', data);
            
            // Get public URL
            const { data: urlData } = this.serviceClient.storage
                .from(bucketName)
                .getPublicUrl(filePath);
            
            console.log('🔗 Public URL:', urlData.publicUrl);
            
            // Clean up
            await this.serviceClient.storage
                .from(bucketName)
                .remove([filePath]);
            
            console.log('🧹 Test file removed');
            return true;
            
        } catch (error) {
            console.error('💥 Emergency upload error:', error);
            return false;
        }
    }

    /**
     * Fix filename sanitization
     */
    sanitizeFileName(fileName) {
        return fileName
            .replace(/\s+/g, '-')           // Replace spaces with hyphens
            .replace(/[^a-zA-Z0-9.-]/g, '') // Remove special chars except dots and hyphens
            .replace(/--+/g, '-')           // Replace multiple hyphens with single
            .replace(/^-+|-+$/g, '')        // Remove leading/trailing hyphens
            .toLowerCase();                 // Convert to lowercase
    }

    /**
     * Quick fix upload with proper sanitization
     */
    async quickFixUpload(file, bucketName = 'figures', subfolder = 'uploaded') {
        console.log('🔧 Quick fix upload starting...');
        
        try {
            // Sanitize filename
            const sanitized = this.sanitizeFileName(file.name);
            const timestamp = new Date().toISOString().slice(0, 19).replace(/[T:]/g, '-');
            const fileName = `${timestamp}-${sanitized}`;
            const filePath = `${subfolder}/${fileName}`;
            
            console.log(`Original: "${file.name}"`);
            console.log(`Sanitized: "${sanitized}"`);
            console.log(`Final path: "${filePath}"`);
            
            // Upload
            const { data, error } = await this.serviceClient.storage
                .from(bucketName)
                .upload(filePath, file);
            
            if (error) {
                console.error('❌ Quick fix upload failed:', error);
                return { success: false, error: error.message };
            }
            
            // Get public URL
            const { data: urlData } = this.serviceClient.storage
                .from(bucketName)
                .getPublicUrl(filePath);
            
            console.log('✅ Quick fix upload successful!');
            console.log('🔗 URL:', urlData.publicUrl);
            
            return {
                success: true,
                url: urlData.publicUrl,
                fileName: fileName,
                filePath: filePath
            };
            
        } catch (error) {
            console.error('💥 Quick fix upload error:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Run all emergency tests
     */
    async runEmergencyTests() {
        console.log('🚨 Running emergency tests...');
        
        const results = {
            serviceRoleKey: false,
            figuresBucket: false,
            propertyBucket: false,
            emergencyUpload: false
        };
        
        // Test service role key
        results.serviceRoleKey = await this.testServiceRoleKey();
        
        // Test buckets
        results.figuresBucket = await this.testBucketWithServiceRole('figures');
        results.propertyBucket = await this.testBucketWithServiceRole('wolf-property-images');
        
        // Emergency upload test
        if (results.figuresBucket) {
            results.emergencyUpload = await this.emergencyUploadTest('figures');
        }
        
        console.log('📊 Emergency test results:', results);
        
        if (Object.values(results).every(r => r)) {
            console.log('🎉 All emergency tests passed!');
        } else {
            console.log('⚠️ Some emergency tests failed - check the logs above');
        }
        
        return results;
    }
}

// Create emergency fix instance
const emergencyFix = new EmergencyFix();

// Expose emergency functions globally
window.emergencyFix = {
    test: () => emergencyFix.runEmergencyTests(),
    upload: (file, bucket, subfolder) => emergencyFix.quickFixUpload(file, bucket, subfolder),
    sanitize: (filename) => emergencyFix.sanitizeFileName(filename),
    testBucket: (bucket) => emergencyFix.testBucketWithServiceRole(bucket),
    testKey: () => emergencyFix.testServiceRoleKey()
};

console.log('🛠️ Emergency fix functions:');
console.log('  emergencyFix.test() - Run all tests');
console.log('  emergencyFix.upload(file, bucket, subfolder) - Quick upload');
console.log('  emergencyFix.sanitize(filename) - Test filename sanitization');
console.log('  emergencyFix.testBucket(bucketName) - Test specific bucket');
console.log('  emergencyFix.testKey() - Test service role key');

// Auto-run tests if we're in admin mode
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        const isAdmin = document.body.classList.contains('admin-mode');
        if (isAdmin) {
            console.log('🔄 Auto-running emergency tests in admin mode...');
            emergencyFix.runEmergencyTests();
        }
    }, 5000);
});

export default emergencyFix; 