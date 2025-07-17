-- Complete Database Setup for Wolf Property Management
-- Run this script in your Supabase SQL Editor to set up everything

-- Step 1: Create Tables

-- Admin users table
CREATE TABLE IF NOT EXISTS admin_users (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_login TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT true
);

-- Website content table (for all text content)
CREATE TABLE IF NOT EXISTS website_content (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    page_name VARCHAR(100) NOT NULL,
    element_id VARCHAR(255) NOT NULL,
    content_text TEXT NOT NULL,
    content_type VARCHAR(50) DEFAULT 'text',
    version INTEGER DEFAULT 1,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(page_name, element_id, version)
);

-- Version history table
CREATE TABLE IF NOT EXISTS version_history (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    version_number INTEGER NOT NULL,
    description TEXT,
    changes JSONB NOT NULL,
    page_name VARCHAR(100) NOT NULL,
    created_by UUID REFERENCES admin_users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Media content table (for images, videos, etc.)
CREATE TABLE IF NOT EXISTS media_content (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    page_name VARCHAR(100) NOT NULL,
    element_id VARCHAR(255) NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_url TEXT NOT NULL,
    file_type VARCHAR(50) NOT NULL,
    alt_text TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 2: Create Indexes for Better Performance

CREATE INDEX IF NOT EXISTS idx_website_content_page_element ON website_content(page_name, element_id);
CREATE INDEX IF NOT EXISTS idx_website_content_active ON website_content(is_active);
CREATE INDEX IF NOT EXISTS idx_version_history_page ON version_history(page_name);
CREATE INDEX IF NOT EXISTS idx_version_history_number ON version_history(version_number);
CREATE INDEX IF NOT EXISTS idx_media_content_page ON media_content(page_name);
CREATE INDEX IF NOT EXISTS idx_media_content_active ON media_content(is_active);

-- Step 3: Temporarily disable RLS for initial setup
ALTER TABLE admin_users DISABLE ROW LEVEL SECURITY;
ALTER TABLE website_content DISABLE ROW LEVEL SECURITY;
ALTER TABLE version_history DISABLE ROW LEVEL SECURITY;
ALTER TABLE media_content DISABLE ROW LEVEL SECURITY;

-- Step 4: Insert Default Admin User
INSERT INTO admin_users (email, password_hash, is_active) 
VALUES ('admin@wolfpm.com', 'admin123', true)
ON CONFLICT (email) DO NOTHING;

-- Step 5: Insert ALL Website Content

-- Index page content
INSERT INTO website_content (page_name, element_id, content_text, content_type, version, is_active) VALUES
-- Hero Section
('index.html', 'hero-title', 'Stop Looking and Start Living!', 'text', 1, true),
('index.html', 'hero-subtitle', 'GEORGETOWN''S PREMIER PROPERTY MANAGEMENT', 'text', 1, true),
('index.html', 'hero-description', 'Locally owned and operated with multiple generations of real estate expertise', 'text', 1, true),

-- Find Your Edge Section
('index.html', 'find-your-edge-title', 'Find Your Edge', 'text', 1, true),
('index.html', 'find-your-edge-content', 'Wolf Property Management is a full-service, boutique-style property management company providing clients a broad spectrum of residential real estate services, including Property Management, Sales, and Leasing. We are passionate about Georgetown and practicing real estate in this amazing city. Our boutique-style office cultivates a collaborative environment for our team. Shunning the traditional model, our team shares their knowledge and expertise of the Georgetown market, ensuring our clients superior representation and a true competitive edge.', 'text', 1, true),

-- Neighborhood Spotlights
('index.html', 'neighborhood-title', 'GEORGETOWN NEIGHBORHOOD SPOTLIGHTS', 'text', 1, true),
('index.html', 'downtown-title', 'Downtown', 'text', 1, true),
('index.html', 'downtown-subtitle', 'THE HEART OF GEORGETOWN', 'text', 1, true),
('index.html', 'south-title', 'South Georgetown', 'text', 1, true),
('index.html', 'south-subtitle', 'NOT YOUR TYPICAL SUBURB', 'text', 1, true),
('index.html', 'west-title', 'West Georgetown', 'text', 1, true),
('index.html', 'west-subtitle', 'A LUXURIOUS LANDSCAPE', 'text', 1, true),

-- Services Section
('index.html', 'services-title', 'What are you looking for?', 'text', 1, true),
('index.html', 'residential-title', 'Residential Management', 'text', 1, true),
('index.html', 'residential-description', 'Expert care for your home with comprehensive property management services.', 'text', 1, true),
('index.html', 'commercial-title', 'Commercial Properties', 'text', 1, true),
('index.html', 'commercial-description', 'Maximizing your investment with professional commercial property management.', 'text', 1, true),
('index.html', 'hoa-title', 'HOA Management', 'text', 1, true),
('index.html', 'hoa-description', 'Community-focused solutions for homeowners associations.', 'text', 1, true),

-- Service Categories
('index.html', 'categories-title', 'Our Management Services', 'text', 1, true),
('index.html', 'residential-category-title', 'Residential', 'text', 1, true),
('index.html', 'residential-feature-1', 'Single and Multi-Family', 'text', 1, true),
('index.html', 'residential-feature-2', 'Prompt Maintenance', 'text', 1, true),
('index.html', 'residential-feature-3', 'Make-Ready and Leasing Services', 'text', 1, true),
('index.html', 'residential-feature-4', 'Tenant Relations', 'text', 1, true),
('index.html', 'residential-feature-5', 'Property Inspections', 'text', 1, true),
('index.html', 'residential-feature-6', 'Bill Pay & Financial Reporting', 'text', 1, true),

('index.html', 'commercial-category-title', 'Commercial', 'text', 1, true),
('index.html', 'commercial-feature-1', 'Bill Pay & Financial Reporting', 'text', 1, true),
('index.html', 'commercial-feature-2', 'Lease-Type Determination', 'text', 1, true),
('index.html', 'commercial-feature-3', 'Net Lease Calculations', 'text', 1, true),
('index.html', 'commercial-feature-4', 'Property Financials', 'text', 1, true),
('index.html', 'commercial-feature-5', 'Maintenance & Construction Services', 'text', 1, true),
('index.html', 'commercial-feature-6', 'Leverage Our Vendor Relationships', 'text', 1, true),

('index.html', 'associations-category-title', 'Associations', 'text', 1, true),
('index.html', 'associations-feature-1', 'Community Relations & Coordination', 'text', 1, true),
('index.html', 'associations-feature-2', 'Bill Pay & Financial Reporting', 'text', 1, true),
('index.html', 'associations-feature-3', 'Maintenance Services', 'text', 1, true),
('index.html', 'associations-feature-4', 'Vendor Relationships', 'text', 1, true),
('index.html', 'associations-feature-5', 'Board Meetings', 'text', 1, true),
('index.html', 'associations-feature-6', 'Budget, Audit, Tax Support', 'text', 1, true),

-- Footer
('index.html', 'footer-company', 'Wolf Property Management', 'text', 1, true),
('index.html', 'footer-phone', '512-868-2093', 'text', 1, true),
('index.html', 'footer-email', 'info@wolfpm.com', 'text', 1, true),
('index.html', 'footer-copyright', '© 2024 Wolf Property Management. All rights reserved.', 'text', 1, true)
ON CONFLICT (page_name, element_id, version) DO NOTHING;

-- About page content
INSERT INTO website_content (page_name, element_id, content_text, content_type, version, is_active) VALUES
-- Hero Section
('about.html', 'about-hero-title', 'About Wolf Property Management', 'text', 1, true),
('about.html', 'about-hero-subtitle', 'Your Trusted Partner in Georgetown Real Estate', 'text', 1, true),

-- Company Story
('about.html', 'about-company-title', 'Our Story', 'text', 1, true),
('about.html', 'about-company-content', 'Wolf Property Management has been serving the Georgetown community for over two decades. We started as a small family business and have grown into Georgetown''s premier property management company, all while maintaining our personal touch and local expertise.', 'text', 1, true),

-- Team Section
('about.html', 'team-title', 'Meet Our Team', 'text', 1, true),
('about.html', 'adam-name', 'Adam Starr', 'text', 1, true),
('about.html', 'adam-position', 'Founder & CEO', 'text', 1, true),
('about.html', 'adam-bio', 'Adam brings over 20 years of real estate experience to Wolf Property Management. His deep understanding of the Georgetown market and commitment to client satisfaction has made him a trusted name in property management.', 'text', 1, true),
('about.html', 'patricia-name', 'Patricia Holmes', 'text', 1, true),
('about.html', 'patricia-position', 'Operations Manager', 'text', 1, true),
('about.html', 'patricia-bio', 'Patricia oversees all day-to-day operations and ensures that every property under our management receives the attention it deserves. Her attention to detail and customer service skills are unmatched.', 'text', 1, true),

-- Statistics
('about.html', 'stats-properties', '500+', 'text', 1, true),
('about.html', 'stats-properties-label', 'Properties Managed', 'text', 1, true),
('about.html', 'stats-satisfaction', '98%', 'text', 1, true),
('about.html', 'stats-satisfaction-label', 'Client Satisfaction', 'text', 1, true),
('about.html', 'stats-experience', '20+ Years', 'text', 1, true),
('about.html', 'stats-experience-label', 'Industry Experience', 'text', 1, true),

-- Call to Action
('about.html', 'cta-title', 'Ready to Get Started?', 'text', 1, true),
('about.html', 'cta-description', 'Contact us today to learn how we can help you maximize your property investment.', 'text', 1, true),

-- Footer (same as index)
('about.html', 'footer-company', 'Wolf Property Management', 'text', 1, true),
('about.html', 'footer-phone', '512-868-2093', 'text', 1, true),
('about.html', 'footer-email', 'info@wolfpm.com', 'text', 1, true),
('about.html', 'footer-copyright', '© 2024 Wolf Property Management. All rights reserved.', 'text', 1, true)
ON CONFLICT (page_name, element_id, version) DO NOTHING;

-- Step 6: Insert Media Content (Images)

-- Logo
INSERT INTO media_content (page_name, element_id, file_name, file_url, file_type, alt_text, is_active) VALUES
('global', 'wolf-logo', 'wolf-logo.png', 'https://srpspzgemnfxkqalgjmz.supabase.co/storage/v1/object/public/wolf-property-images/images/wolf-logo.png', 'image/png', 'Wolf Property Management Logo', true),

-- Team Photos
('about.html', 'adam-photo', 'adam_starr.png', 'https://srpspzgemnfxkqalgjmz.supabase.co/storage/v1/object/public/wolf-property-images/images/people/adam_starr.png', 'image/png', 'Adam Starr - Founder & CEO', true),
('about.html', 'patricia-photo', 'patricia_holmes.jpg', 'https://srpspzgemnfxkqalgjmz.supabase.co/storage/v1/object/public/wolf-property-images/images/people/patricia_holmes.jpg', 'image/jpeg', 'Patricia Holmes - Operations Manager', true),

-- Hero Images
('index.html', 'hero-background', 'hero-background.jpg', 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2070&q=80', 'image/jpeg', 'Luxury property exterior', true),

-- Neighborhood Images
('index.html', 'downtown-image', 'downtown.jpg', 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2053&q=80', 'image/jpeg', 'Downtown Georgetown', true),
('index.html', 'south-image', 'south.jpg', 'https://images.unsplash.com/photo-1512918728675-ed5a9ecdebfd?auto=format&fit=crop&w=2070&q=80', 'image/jpeg', 'South Georgetown', true),
('index.html', 'west-image', 'west.jpg', 'https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2070&q=80', 'image/jpeg', 'West Georgetown', true),

-- Service Images
('index.html', 'residential-image', 'residential.jpg', 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2070&q=80', 'image/jpeg', 'Residential property management', true),
('index.html', 'commercial-image', 'commercial.jpg', 'https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2070&q=80', 'image/jpeg', 'Commercial property management', true),
('index.html', 'hoa-image', 'hoa.jpg', 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2053&q=80', 'image/jpeg', 'HOA management services', true)
ON CONFLICT (page_name, element_id) DO NOTHING;

-- Step 7: Create Initial Version History Entry
INSERT INTO version_history (version_number, description, changes, page_name) VALUES
(1, 'Initial website content setup', '{"hero-title": "Stop Looking and Start Living!", "hero-subtitle": "GEORGETOWN''S PREMIER PROPERTY MANAGEMENT"}', 'index.html')
ON CONFLICT DO NOTHING;

-- Success message
SELECT 'Complete database setup finished! All content is now in Supabase.' as status; 