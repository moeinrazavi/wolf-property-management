-- Quick Database Setup for Wolf Property Management
-- Run this in Supabase SQL Editor

-- Drop tables if they exist (for clean setup)
DROP TABLE IF EXISTS version_history CASCADE;
DROP TABLE IF EXISTS website_content CASCADE;
DROP TABLE IF EXISTS media_content CASCADE;
DROP TABLE IF EXISTS admin_users CASCADE;

-- Create tables
CREATE TABLE admin_users (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_login TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT true
);

CREATE TABLE website_content (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    page_name VARCHAR(100) NOT NULL,
    element_id VARCHAR(255) NOT NULL,
    content_text TEXT NOT NULL,
    content_type VARCHAR(50) DEFAULT 'text',
    version INTEGER DEFAULT 1,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE version_history (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    version_number INTEGER NOT NULL,
    description TEXT,
    changes JSONB NOT NULL,
    page_name VARCHAR(100) NOT NULL,
    created_by UUID REFERENCES admin_users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE media_content (
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

-- Disable RLS completely
ALTER TABLE admin_users DISABLE ROW LEVEL SECURITY;
ALTER TABLE website_content DISABLE ROW LEVEL SECURITY;
ALTER TABLE version_history DISABLE ROW LEVEL SECURITY;
ALTER TABLE media_content DISABLE ROW LEVEL SECURITY;

-- Insert admin user
INSERT INTO admin_users (email, password_hash, is_active) 
VALUES ('admin@wolfpm.com', 'admin123', true);

-- Insert sample content
INSERT INTO website_content (page_name, element_id, content_text, content_type, version, is_active) VALUES
('index.html', 'hero-title', 'Stop Looking and Start Living!', 'text', 1, true),
('index.html', 'hero-subtitle', 'GEORGETOWN''S PREMIER PROPERTY MANAGEMENT', 'text', 1, true),
('index.html', 'hero-description', 'Locally owned and operated with multiple generations of real estate expertise', 'text', 1, true),
('index.html', 'find-your-edge-title', 'Find Your Edge', 'text', 1, true),
('index.html', 'find-your-edge-content', 'Wolf Property Management is a full-service, boutique-style property management company providing clients a broad spectrum of residential real estate services, including Property Management, Sales, and Leasing. We are passionate about Georgetown and practicing real estate in this amazing city.', 'text', 1, true);

-- Insert initial version
INSERT INTO version_history (version_number, description, changes, page_name) VALUES
(1, 'Initial setup', '{}', 'index.html');

-- Verify setup
SELECT 'Setup complete!' as status;
SELECT COUNT(*) as admin_users FROM admin_users;
SELECT COUNT(*) as content_items FROM website_content;
SELECT COUNT(*) as versions FROM version_history; 