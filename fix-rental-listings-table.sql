-- Fix Rental Listings Table - Simplified Schema
-- Run this script in your Supabase SQL Editor to fix performance issues

-- Drop existing rental_listings table if it exists
DROP TABLE IF EXISTS rental_listings;

-- Create simplified rental_listings table (matching team_members pattern for performance)
CREATE TABLE rental_listings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    address VARCHAR(255) NOT NULL,
    city VARCHAR(100),
    state VARCHAR(10) DEFAULT 'TX',
    zip_code VARCHAR(20),
    rent_price DECIMAL(8, 2) NOT NULL,
    square_feet INTEGER,
    bedrooms INTEGER,
    bathrooms DECIMAL(3, 1),
    description TEXT,
    appliances TEXT,
    pet_policy TEXT,
    available_date VARCHAR(50),
    primary_image_url TEXT,
    primary_image_filename VARCHAR(255),
    neighborhood VARCHAR(100),
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    is_featured BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create minimal indexes (matching team_members pattern)
CREATE INDEX idx_rental_listings_active ON rental_listings(is_active);
CREATE INDEX idx_rental_listings_sort ON rental_listings(sort_order);

-- Note: RLS is disabled by default in Supabase for new tables

-- Insert default rental listing
INSERT INTO rental_listings (
    title, address, city, state, zip_code, rent_price, square_feet, bedrooms, bathrooms,
    description, appliances, pet_policy, available_date, primary_image_url, 
    primary_image_filename, neighborhood, sort_order, is_active, is_featured
) VALUES (
    '148 Ammonite Ln - Jarrell',
    '148 Ammonite Ln',
    'Jarrell',
    'TX',
    '76537',
    2100.00,
    2806,
    4,
    2.5,
    'Spacious and versatile 4-bedroom, 2.5-bath home in Sonterra, Jarrell! This two-story residence boasts over 2,800 sq ft, offering a flexible floor plan to fit your lifestyle. Downstairs includes a large living room, a dedicated formal dining/office space, and a huge kitchen with granite countertops, tall cabinets, and pantry. The oversized laundry room includes extra shelving and storage.',
    'Dishwasher, Electric Range, Microwave',
    'Cats allowed, Small dogs allowed',
    '8/5/25',
    'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
    null,
    'Sonterra',
    1,
    true,
    true
);

-- Verify the table was created correctly
SELECT COUNT(*) as total_listings FROM rental_listings; 