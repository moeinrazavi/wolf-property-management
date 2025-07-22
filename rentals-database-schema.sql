-- Rental Listings Database Schema for Wolf Property Management
-- Run this script in your Supabase SQL Editor to create the rental_listings table

-- Create rental_listings table
CREATE TABLE IF NOT EXISTS rental_listings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title VARCHAR(500) NOT NULL,
    address VARCHAR(500) NOT NULL,
    city VARCHAR(200),
    state VARCHAR(50) DEFAULT 'TX',
    zip_code VARCHAR(20),
    rent_price DECIMAL(10, 2) NOT NULL,
    square_feet INTEGER,
    bedrooms INTEGER,
    bathrooms DECIMAL(3, 1), -- Allow half bathrooms like 2.5
    property_type VARCHAR(100) DEFAULT 'House', -- House, Townhome, Apartment, etc.
    description TEXT,
    features TEXT, -- JSON string or comma-separated list of features
    appliances TEXT, -- Available appliances
    pet_policy TEXT,
    available_date DATE,
    lease_term VARCHAR(100),
    deposit_amount DECIMAL(10, 2),
    utilities_included TEXT,
    parking_info TEXT,
    primary_image_url TEXT,
    primary_image_filename VARCHAR(500),
    additional_images JSONB, -- Store array of additional image URLs and filenames
    virtual_tour_url TEXT,
    contact_info JSONB, -- Store contact information as JSON
    neighborhood VARCHAR(200),
    amenities TEXT,
    restrictions TEXT,
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    is_featured BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_rental_listings_active ON rental_listings(is_active);
CREATE INDEX IF NOT EXISTS idx_rental_listings_featured ON rental_listings(is_featured);
CREATE INDEX IF NOT EXISTS idx_rental_listings_price ON rental_listings(rent_price);
CREATE INDEX IF NOT EXISTS idx_rental_listings_bedrooms ON rental_listings(bedrooms);
CREATE INDEX IF NOT EXISTS idx_rental_listings_city ON rental_listings(city);
CREATE INDEX IF NOT EXISTS idx_rental_listings_sort ON rental_listings(sort_order);
CREATE INDEX IF NOT EXISTS idx_rental_listings_available ON rental_listings(available_date);

-- Disable RLS for initial setup (matching other tables)
ALTER TABLE rental_listings DISABLE ROW LEVEL SECURITY;

-- Insert sample rental listings based on the user's image examples
INSERT INTO rental_listings (
    title, address, city, state, zip_code, rent_price, square_feet, bedrooms, bathrooms,
    property_type, description, features, appliances, pet_policy, available_date,
    primary_image_url, neighborhood, amenities, sort_order, is_active, is_featured
) VALUES
(
    '148 Ammonite Ln - Jarrell',
    '148 Ammonite Ln',
    'Jarrell',
    'TX',
    '76537',
    2100.00,
    2806,
    4,
    2.5,
    'House',
    'Spacious and versatile 4-bedroom, 2.5-bath home in Sonterra, Jarrell! This two-story residence boasts over 2,800 sq ft, offering a flexible floor plan to fit your lifestyle. Downstairs includes a large living room, a dedicated formal dining/office space, and a huge kitchen with granite countertops, tall cabinets, and pantry. The oversized laundry room includes extra shelving and storage. The master suite features a large walk-in closet and spacious bathroom.',
    'Granite countertops, Walk-in closets, Large living areas, Formal dining room, Oversized laundry room with storage',
    'Dishwasher, Electric Range, Microwave',
    'Cats allowed, Small dogs allowed',
    '2025-08-05',
    'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2070&q=80',
    'Sonterra',
    'Community amenities, Close to shopping, Excellent schools',
    1,
    true,
    true
),
(
    '347 Madison Oaks, Georgetown, TX',
    '347 Madison Oaks',
    'Georgetown',
    'TX',
    '78626',
    2000.00,
    1460,
    3,
    2.5,
    'Townhome',
    'This beautiful 3 bedroom 2-1/2 bath townhome is a perfect choice for those seeking comfort and convenience. The home features all appliances, including a refrigerator, dishwasher, electric range/oven, and microwave, making meal prep and cleanup a breeze. The eat-in kitchen offers ample space for casual dining. Upstairs, you''ll find three well-appointed bedrooms and two full bathrooms.',
    'All appliances included, Eat-in kitchen, Three bedrooms upstairs, Two full bathrooms upstairs, Half bath downstairs',
    'Refrigerator, Dishwasher, Electric Range/Oven, Microwave',
    'Pet policy varies, contact for details',
    CURRENT_DATE,
    'https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2070&q=80',
    'Madison Oaks',
    'Townhome community, Convenient location, Modern appliances',
    2,
    true,
    false
);

-- Verify setup
SELECT 'Rental listings table created successfully!' as status;
SELECT COUNT(*) as rental_listings_count FROM rental_listings; 