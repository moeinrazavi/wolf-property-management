/**
 * Test Image Manager Functionality
 * This file helps test and debug the image upload functionality
 */

import adminImageManager from './admin-image-manager.js';
import dbService from './supabase-client.js';

console.log('🧪 Test Image Manager loaded');

// Test function to verify bucket access
async function testBucketAccess() {
    console.log('🔍 Testing bucket access...');
    
    try {
        // Test listing files in figures bucket
        const figuresResult = await dbService.listBucketFiles('figures');
        console.log('📊 Figures bucket files:', figuresResult);
        
        // Test listing files in wolf-property-images bucket
        const propertyResult = await dbService.listBucketFiles('wolf-property-images');
        console.log('🏠 Property images bucket files:', propertyResult);
        
        console.log('✅ Bucket access test completed');
    } catch (error) {
        console.error('❌ Bucket access test failed:', error);
    }
}

// Test function to verify admin authentication
function testAdminAuth() {
    console.log('🔐 Testing admin authentication...');
    
    const isAuthenticated = dbService.isAuthenticated();
    console.log('Admin authenticated:', isAuthenticated);
    
    if (isAuthenticated) {
        console.log('Current user:', dbService.getCurrentUser());
    } else {
        console.log('Please log in as admin to test image upload functionality');
    }
}

// Run tests when page loads
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Running image manager tests...');
    
    // Test admin authentication
    testAdminAuth();
    
    // Test bucket access if authenticated
    if (dbService.isAuthenticated()) {
        testBucketAccess();
    }
    
    // Add test button to admin controls if in admin mode
    setTimeout(() => {
        if (document.body.classList.contains('admin-mode')) {
            addTestButton();
        }
    }, 2000);
});

// Add test button to admin interface
function addTestButton() {
    const adminControls = document.querySelector('.admin-controls-content');
    if (!adminControls || document.getElementById('test-image-manager-btn')) {
        return;
    }
    
    const testButton = document.createElement('button');
    testButton.id = 'test-image-manager-btn';
    testButton.className = 'btn btn-image-manager';
    testButton.textContent = '🧪 Test Image Manager';
    testButton.style.marginTop = '10px';
    
    testButton.addEventListener('click', () => {
        console.log('🧪 Running image manager tests...');
        testAdminAuth();
        testBucketAccess();
        
        // Test opening upload modal for figures
        adminImageManager.showUploadModal('figures');
    });
    
    adminControls.appendChild(testButton);
    console.log('✅ Test button added to admin controls');
}

// Utility function to test direct upload
window.testFiguresUpload = async function(file) {
    if (!file) {
        console.log('Usage: testFiguresUpload(fileObject)');
        return;
    }
    
    try {
        console.log('📤 Testing direct upload to figures bucket...');
        const result = await dbService.uploadToBucket(file, 'figures', 'uploaded');
        console.log('✅ Upload successful:', result);
        return result;
    } catch (error) {
        console.error('❌ Upload failed:', error);
        return null;
    }
};

console.log('🔧 Image Manager Test utilities loaded');
console.log('💡 To test direct upload, use: testFiguresUpload(fileObject)'); 