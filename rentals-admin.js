/**
 * Rentals Admin Manager
 * Handles admin functionality for the rentals page including:
 * - Database-backed rental listing management
 * - Image assignment from bucket to listings
 * - Adding new listings
 * - Text editing in admin mode
 * - Saving changes permanently to Supabase
 */

import dbService from './supabase-client.js';
import adminVersionControlUI from './admin-version-control-ui.js';

class RentalsAdminManager {
    constructor() {
        this.dbService = dbService;
        this.isInitialized = false;
        this.currentImageSelector = null;
        this.currentListingId = null;
        this.rentalListings = [];
        this.originalRentalListings = [];
        this.pendingChanges = {
            modified: new Map(), // listingId -> changes
            added: [],           // new listings
            deleted: new Set()   // deleted listing IDs
        };
        this.hasUnsavedChanges = false;
    }

    /**
     * Initialize the rentals admin manager
     */
    async initialize() {
        if (this.isInitialized) {
            console.log('⚠️ Rentals Admin Manager already initialized, skipping...');
            return;
        }
        
        console.log('🏠 Initializing Rentals Admin Manager...');
        
        try {
            // Initialize database table if needed
            await this.initializeDatabase();
            
            // Load rental listings from database
            await this.loadRentalListingsFromDatabase();
            
            // Store original state for version control
            this.originalRentalListings = JSON.parse(JSON.stringify(this.rentalListings));
            
            // Set up admin interface
            this.addAdminControls();
            this.addEventListeners();
            
            this.isInitialized = true;
            console.log('✅ Rentals Admin Manager initialized successfully');
            
            // Make this instance globally available for version control integration
            window.rentalsAdminManager = this;
        } catch (error) {
            console.error('❌ Failed to initialize Rentals Admin Manager:', error);
            throw error;
        }
    }

    /**
     * Clean up admin interface
     */
    cleanup() {
        console.log('🧹 Cleaning up Rentals Admin Manager...');
        
        // Remove admin controls
        const adminControls = document.getElementById('rentals-admin-controls');
        if (adminControls) {
            adminControls.remove();
        }
        
        // Remove admin styling
        const listingCards = document.querySelectorAll('.listing-card');
        listingCards.forEach(card => {
            const deleteBtn = card.querySelector('.delete-listing-btn');
            if (deleteBtn) {
                deleteBtn.remove();
            }
        });
        
        this.isInitialized = false;
        console.log('✅ Rentals Admin Manager cleaned up');
    }

    /**
     * Initialize database table if needed
     */
    async initializeDatabase() {
        try {
            const result = await this.dbService.initializeRentalListingsTable();
            if (!result.success && result.sql) {
                console.warn('⚠️ Database table needs to be created. Please run the SQL script.');
                console.warn('SQL script:');
                console.warn(result.sql);
                // Don't block the page with alert - just log the warning
            }
        } catch (error) {
            console.error('Database initialization error:', error);
        }
    }

    /**
     * Load rental listings from database and render them
     */
    async loadRentalListingsFromDatabase() {
        console.log('🏠 Loading rental listings from database...');
        
        const { rentalListings, error } = await this.dbService.getRentalListings();
        
        if (error) {
            console.error('❌ Failed to load rental listings:', error);
            return;
        }
        
        // Store both current and original copies
        this.rentalListings = rentalListings;
        this.originalRentalListings = JSON.parse(JSON.stringify(rentalListings)); // Deep copy
        console.log(`✅ Loaded ${rentalListings.length} rental listings from database`);
        
        // Clear any pending changes
        this.clearPendingChanges();
        
        // Render rental listings
        await this.renderRentalListings();
    }

    /**
     * Render rental listings in the rentals page
     */
    async renderRentalListings() {
        const listingsContainer = document.getElementById('listings-container');
        const noListingsElement = document.getElementById('no-listings');
        
        if (!listingsContainer) {
            console.error('❌ Listings container not found');
            return;
        }
        
        // Clear existing listings (except sample)
        const existingListings = listingsContainer.querySelectorAll('.listing-card:not([data-listing-id="sample"])');
        existingListings.forEach(listing => listing.remove());
        
        if (this.rentalListings.length === 0) {
            // Show no listings message
            if (noListingsElement) {
                noListingsElement.style.display = 'block';
            }
            // Hide sample listing
            const sampleListing = listingsContainer.querySelector('[data-listing-id="sample"]');
            if (sampleListing) {
                sampleListing.style.display = 'none';
            }
        } else {
            // Hide no listings message
            if (noListingsElement) {
                noListingsElement.style.display = 'none';
            }
            // Hide sample listing
            const sampleListing = listingsContainer.querySelector('[data-listing-id="sample"]');
            if (sampleListing) {
                sampleListing.style.display = 'none';
            }
            
            // Use document fragment for efficient DOM manipulation
            const fragment = document.createDocumentFragment();
            
            // Render listings in batches to avoid blocking the UI
            const batchSize = 5;
            for (let i = 0; i < this.rentalListings.length; i += batchSize) {
                const batch = this.rentalListings.slice(i, i + batchSize);
                
                // Process batch asynchronously
                const batchElements = await Promise.all(
                    batch.map(listing => this.createRentalListingElement(listing))
                );
                
                // Add batch to fragment
                batchElements.forEach(element => fragment.appendChild(element));
                
                // Allow UI to breathe between batches
                if (i + batchSize < this.rentalListings.length) {
                    await new Promise(resolve => setTimeout(resolve, 0));
                }
            }
            
            // Append all elements at once
            listingsContainer.appendChild(fragment);
            
            // Make listings editable if in admin mode
            if (document.body.classList.contains('admin-mode')) {
                this.makeAllListingsEditable();
            }
        }
        
        console.log(`✅ Rendered ${this.rentalListings.length} rental listings`);
    }

    /**
     * Create a rental listing HTML element
     */
    async createRentalListingElement(listing) {
        const listingDiv = document.createElement('div');
        listingDiv.className = 'listing-card';
        listingDiv.dataset.listingId = listing.id;
        
        // Check if listing is marked for deletion
        const isMarkedForDeletion = this.pendingChanges.deleted.has(listing.id);
        if (isMarkedForDeletion) {
            listingDiv.classList.add('pending-deletion');
        }
        
        // Use default image initially for faster rendering
        let imageUrl = listing.primary_image_url || 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80';
        
        // Format available date
        const availableDate = listing.available_date ? new Date(listing.available_date).toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: '2-digit' }) : 'NOW';
        
        // Add pending indicator for new/modified/deleted listings
        const isPending = listing.isNew || this.pendingChanges.modified.has(listing.id);
        let pendingBadge = '';
        if (listing.isNew) {
            pendingBadge = '<div class="pending-badge pending-new">NEW LISTING (PENDING)</div>';
        } else if (this.pendingChanges.modified.has(listing.id)) {
            pendingBadge = '<div class="pending-badge pending-modified">MODIFIED (PENDING)</div>';
        } else if (isMarkedForDeletion) {
            pendingBadge = '<div class="pending-badge pending-deleted">DELETED (PENDING)</div>';
        }

        listingDiv.innerHTML = `
            ${pendingBadge}
            <div class="listing-image ${listing.isNew ? 'pending-new-border' : ''}">
                <img src="${imageUrl}" alt="${listing.title}" data-listing-id="${listing.id}" loading="lazy" onerror="this.onerror=null;this.src='https://images.unsplash.com/photo-1600585154340-be6161a56a0c?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80';">
                ${listing.is_featured ? '<div class="listing-badges"><span class="featured-badge">Featured</span></div>' : ''}
            </div>
            <div class="listing-content">
                <div class="listing-header">
                    <div class="listing-type">RENT</div>
                    <div class="listing-price" data-listing-id="${listing.id}" data-field="rent_price">$${parseFloat(listing.rent_price || 0).toLocaleString()}</div>
                </div>
                <div class="listing-details">
                    <div class="listing-size">
                        <span class="sqft" data-listing-id="${listing.id}" data-field="square_feet">${(listing.square_feet || 0).toLocaleString()}</span>
                        <span class="label">SQUARE FEET</span>
                    </div>
                    <div class="listing-specs">
                        <span class="beds" data-listing-id="${listing.id}" data-field="bedrooms_bathrooms">${listing.bedrooms || 0} bd / ${listing.bathrooms || 0} ba</span>
                        <span class="label">BED / BATH</span>
                    </div>
                    <div class="listing-availability">
                        <span class="available" data-listing-id="${listing.id}" data-field="available_date">${availableDate}</span>
                        <span class="label">AVAILABLE</span>
                    </div>
                </div>
                <div class="listing-info">
                    <h3 class="listing-title" data-listing-id="${listing.id}" data-field="title">${listing.title || ''}</h3>
                    <p class="listing-address" data-listing-id="${listing.id}" data-field="address">
                        ${listing.address}, ${listing.city}, ${listing.state} ${listing.zip_code} 
                        <a href="#" class="map-link">📍 Map</a>
                    </p>
                    <div class="listing-description">
                        <p data-listing-id="${listing.id}" data-field="description">${listing.description || ''}</p>
                    </div>
                    <div class="listing-features">
                        <p data-listing-id="${listing.id}" data-field="appliances"><strong>Appliances:</strong> ${listing.appliances || 'Not specified'}</p>
                        <p data-listing-id="${listing.id}" data-field="pet_policy"><strong>Pet Policy:</strong> ${listing.pet_policy || 'Contact for details'}</p>
                    </div>
                    <div class="listing-actions">
                        <button class="btn btn-primary view-details-btn">View Details</button>
                        <button class="btn btn-secondary apply-btn">Apply Now</button>
                    </div>
                </div>
            </div>
        `;
        
        // Add admin delete button if in admin mode
        if (document.body.classList.contains('admin-mode')) {
            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'delete-listing-btn';
            deleteBtn.innerHTML = '×';
            deleteBtn.title = 'Delete Listing';
            deleteBtn.addEventListener('click', () => this.deleteListing(listing.id));
            listingDiv.appendChild(deleteBtn);
            
            // Make the listing editable
            this.makeRentalListingEditable(listingDiv);
        }
        
        // Asynchronously load signed URL for better performance (non-blocking)
        if (listing.primary_image_filename) {
            this.loadSignedImageUrl(listing.primary_image_filename, listingDiv.querySelector('img'));
        }
        
        return listingDiv;
    }

    /**
     * Asynchronously load signed image URL without blocking rendering
     */
    async loadSignedImageUrl(filename, imgElement) {
        try {
            const signedUrl = await this.dbService.getFileUrl('wolf-property-images', filename, true);
            if (signedUrl && imgElement) {
                imgElement.src = signedUrl;
            }
        } catch (error) {
            console.warn(`Could not load signed URL for image: ${filename}`, error);
            // Image will fall back to default URL already set
        }
    }

    /**
     * Make rental listing editable in admin mode
     */
    makeRentalListingEditable(listingElement) {
        const editableElements = listingElement.querySelectorAll('[data-field]');
        
        editableElements.forEach(element => {
            element.addEventListener('click', (e) => {
                e.stopPropagation();
                this.startEditing(element);
            });
        });
        
        // Make image clickable for admin
        const imageElement = listingElement.querySelector('.listing-image img');
        if (imageElement) {
            imageElement.style.cursor = 'pointer';
            imageElement.addEventListener('click', (e) => {
                e.stopPropagation();
                this.openImageSelector(imageElement.dataset.listingId);
            });
        }
    }

    /**
     * Add delete button to listing
     */
    addDeleteButton(listingElement, listing) {
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'delete-listing-btn';
        deleteBtn.innerHTML = '×';
        deleteBtn.dataset.listingId = listing.id;
        deleteBtn.title = 'Delete this listing';
        
        deleteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.deleteListing(listing.id);
        });
        
        listingElement.appendChild(deleteBtn);
    }

    /**
     * Start editing a field
     */
    startEditing(element) {
        const listingId = element.dataset.listingId;
        const fieldName = element.dataset.field;
        const currentValue = element.textContent.trim();
        
        console.log(`Starting edit for listing ${listingId}, field ${fieldName}`);
        
        // Create appropriate input element based on field type
        let input;
        if (fieldName === 'description') {
            input = document.createElement('textarea');
            input.style.minHeight = '100px';
            input.style.resize = 'vertical';
        } else if (fieldName === 'available_date') {
            // Create date input for calendar picker
            input = document.createElement('input');
            input.type = 'date';
            // Convert existing value to date format if needed
            const dateValue = this.parseAvailableDateToISO(this.getFieldValue(listingId, fieldName, currentValue));
            input.value = dateValue;
        } else if (fieldName === 'address') {
            // Create address input with autocomplete
            input = this.createAddressInput(listingId);
        } else {
            input = document.createElement('input');
            input.type = 'text';
        }
        
        // Set common input properties
        if (fieldName !== 'address') {
            input.value = this.getFieldValue(listingId, fieldName, currentValue);
        }
        
        input.style.width = '100%';
        input.style.minWidth = '200px';
        input.style.padding = '8px';
        input.style.border = '2px solid var(--accent-color)';
        input.style.borderRadius = '4px';
        input.style.background = 'white';
        input.style.fontSize = window.getComputedStyle(element).fontSize;
        input.style.fontFamily = window.getComputedStyle(element).fontFamily;
        
        // Replace element with input
        element.style.display = 'none';
        element.parentNode.insertBefore(input, element.nextSibling);
        input.focus();
        
        if (input.type !== 'date' && fieldName !== 'address') {
            input.select();
        }
        
        // Handle save/cancel
        const saveEdit = () => {
            let newValue = input.value.trim();
            
            // Format date value for display
            if (fieldName === 'available_date' && newValue) {
                newValue = this.formatDateForDisplay(newValue);
            }
            
            // Handle address updates
            if (fieldName === 'address') {
                this.handleAddressUpdate(listingId, input);
                return;
            }
            
            this.updateListingField(listingId, fieldName, newValue);
            element.style.display = '';
            input.remove();
        };
        
        const cancelEdit = () => {
            element.style.display = '';
            input.remove();
        };
        
        input.addEventListener('blur', saveEdit);
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                saveEdit();
            } else if (e.key === 'Escape') {
                e.preventDefault();
                cancelEdit();
            }
        });
    }

    /**
     * Create address input with autocomplete functionality
     */
    createAddressInput(listingId) {
        const listing = this.rentalListings.find(l => l.id === listingId);
        const currentAddress = listing ? listing.address : '';
        
        // Create the input (same style as regular inputs)
        const input = document.createElement('input');
        input.type = 'text';
        input.value = currentAddress;
        input.placeholder = 'Enter property address...';
        input.autocomplete = 'off';
        
        // Create suggestions dropdown (positioned absolutely)
        const suggestionsContainer = document.createElement('div');
        suggestionsContainer.style.position = 'absolute';
        suggestionsContainer.style.top = '100%';
        suggestionsContainer.style.left = '0';
        suggestionsContainer.style.right = '0';
        suggestionsContainer.style.background = 'white';
        suggestionsContainer.style.border = '1px solid #ddd';
        suggestionsContainer.style.borderTop = 'none';
        suggestionsContainer.style.borderRadius = '0 0 4px 4px';
        suggestionsContainer.style.maxHeight = '200px';
        suggestionsContainer.style.overflowY = 'auto';
        suggestionsContainer.style.zIndex = '1000';
        suggestionsContainer.style.display = 'none';
        suggestionsContainer.className = 'address-suggestions';
        
        // Add debounced address search
        let searchTimeout;
        input.addEventListener('input', (e) => {
            clearTimeout(searchTimeout);
            const query = e.target.value.trim();
            
            if (query.length < 3) {
                suggestionsContainer.style.display = 'none';
                return;
            }
            
            searchTimeout = setTimeout(() => {
                this.searchAddresses(query, suggestionsContainer, input, listingId);
            }, 300);
        });
        
        // Setup suggestions container after input is inserted into DOM
        input.addEventListener('focus', () => {
            // Position suggestions container relative to the input
            if (input.parentElement && !suggestionsContainer.parentElement) {
                // Create a wrapper div for proper positioning
                const wrapper = document.createElement('div');
                wrapper.style.position = 'relative';
                wrapper.style.display = 'inline-block';
                wrapper.style.width = '100%';
                
                // Insert wrapper before input and move input into wrapper
                input.parentElement.insertBefore(wrapper, input);
                wrapper.appendChild(input);
                wrapper.appendChild(suggestionsContainer);
                
                // Update suggestions positioning to be right below input
                suggestionsContainer.style.position = 'absolute';
                suggestionsContainer.style.top = '100%';
                suggestionsContainer.style.left = '0';
                suggestionsContainer.style.right = '0';
                suggestionsContainer.style.zIndex = '1000';
            }
        });
        
        // Hide suggestions when clicking outside
        const hideHandler = (e) => {
            const wrapper = input.parentElement;
            const isInsideWrapper = wrapper && wrapper.contains(e.target);
            const isInsideSuggestions = suggestionsContainer.contains(e.target);
            
            if (!isInsideWrapper && !isInsideSuggestions) {
                suggestionsContainer.style.display = 'none';
            }
        };
        
        document.addEventListener('click', hideHandler);
        
        // Store handler reference for cleanup
        input._hideHandler = hideHandler;
        
        // Store suggestion container reference for cleanup
        input._suggestionsContainer = suggestionsContainer;
        
        return input;
    }

    /**
     * Search for addresses using geocoding service
     */
    async searchAddresses(query, suggestionsContainer, input, listingId) {
        try {
            // Use Nominatim (OpenStreetMap) geocoding service - free and no API key required
            const response = await fetch(
                `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&limit=5&countrycodes=us&q=${encodeURIComponent(query + ', Texas, USA')}`
            );
            
            if (!response.ok) {
                throw new Error('Geocoding service unavailable');
            }
            
            const results = await response.json();
            this.displayAddressSuggestions(results, suggestionsContainer, input, listingId);
        } catch (error) {
            console.warn('Address search failed:', error);
            // Allow custom input to remain
            suggestionsContainer.style.display = 'none';
        }
    }

    /**
     * Display address suggestions
     */
    displayAddressSuggestions(results, suggestionsContainer, input, listingId) {
        suggestionsContainer.innerHTML = '';
        
        if (results.length === 0) {
            const noResults = document.createElement('div');
            noResults.style.padding = '12px';
            noResults.style.color = '#666';
            noResults.style.fontStyle = 'italic';
            noResults.style.cursor = 'pointer';
            noResults.textContent = 'No suggestions found - click to use custom address';
            
            // Allow clicking to accept custom address
            noResults.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                suggestionsContainer.style.display = 'none';
                // Focus back on input so user can continue editing or save manually
                input.focus();
            });
            
            suggestionsContainer.appendChild(noResults);
            suggestionsContainer.style.display = 'block';
            return;
        }
        
        results.forEach(result => {
            const suggestion = document.createElement('div');
            suggestion.style.padding = '12px';
            suggestion.style.cursor = 'pointer';
            suggestion.style.borderBottom = '1px solid #eee';
            suggestion.style.transition = 'background-color 0.2s';
            
            // Format address
            const address = this.formatGeocodedAddress(result);
            suggestion.textContent = address.display;
            
            // Hover effect
            suggestion.addEventListener('mouseenter', () => {
                suggestion.style.backgroundColor = '#f5f5f5';
            });
            
            suggestion.addEventListener('mouseleave', () => {
                suggestion.style.backgroundColor = 'white';
            });
            
            // Use mousedown to prevent the input's blur event from firing before we can handle the selection.
            suggestion.addEventListener('mousedown', (e) => {
                e.preventDefault(); // Prevents input from losing focus.
                e.stopPropagation();
                
                input.value = address.display; // Update the input's value with the full address.
                
                // Store the structured address data. This will be used by the 'blur' handler.
                input._selectedAddressData = {
                    street: address.street,
                    city: address.city,
                    state: address.state,
                    zipCode: address.zipCode,
                    neighborhood: address.neighborhood || address.city
                };

                suggestionsContainer.innerHTML = '';
                suggestionsContainer.style.display = 'none';

                // Manually trigger the save since we've prevented the blur.
                this.handleAddressUpdate(listingId, input);
            });
            
            suggestionsContainer.appendChild(suggestion);
        });
        
        suggestionsContainer.style.display = 'block';
    }

    /**
     * Format geocoded address result
     */
    formatGeocodedAddress(result) {
        const addr = result.address || {};
        
        const houseNumber = addr.house_number || '';
        const street = addr.road || addr.street || '';
        const city = addr.city || addr.town || addr.village || '';
        const state = addr.state || 'TX';
        const zipCode = addr.postcode || '';
        const neighborhood = addr.suburb || addr.neighbourhood || addr.residential || '';
        
        const streetAddress = `${houseNumber} ${street}`.trim();
        const displayAddress = `${streetAddress}, ${city}, ${state} ${zipCode}`.replace(/,\s*,/g, ',').trim();
        
        return {
            street: streetAddress,
            city: city,
            state: state,
            zipCode: zipCode,
            neighborhood: neighborhood,
            display: displayAddress
        };
    }

    /**
     * Handle address update after editing
     */
    handleAddressUpdate(listingId, input) {
        // If a suggestion was selected, its street component should be saved as the 'address'.
        // The input's value will be the full display address, which we don't want in the 'address' field.
        // For custom entry, the input's value is what we save.
        const addressToSave = (input._selectedAddressData && input._selectedAddressData.street)
            ? input._selectedAddressData.street
            : input.value.trim();
        
        this.updateListingField(listingId, 'address', addressToSave);
        
        // If there's stored address data from a suggestion selection, use it for other fields
        if (input._selectedAddressData) {
            const addressData = input._selectedAddressData;
            const listing = this.rentalListings.find(l => l.id === listingId);
            
            if (listing && addressData.city && addressData.state && addressData.zipCode) {
                listing.city = addressData.city;
                listing.state = addressData.state;
                listing.zip_code = addressData.zipCode;
                listing.neighborhood = addressData.neighborhood;
                
                // Track these changes
                this.trackListingChange(listingId, 'city', addressData.city);
                this.trackListingChange(listingId, 'state', addressData.state);
                this.trackListingChange(listingId, 'zip_code', addressData.zipCode);
                this.trackListingChange(listingId, 'neighborhood', addressData.neighborhood);
                
                // Update display immediately. `updateListingField` above already called this,
                // but we need to call it again to reflect city/state/zip changes.
                this.updateDisplayElements(listingId);
            }
        }
        
        // Clean up event listeners
        if (input._hideHandler) {
            document.removeEventListener('click', input._hideHandler);
        }
        
        // Clean up suggestions container and wrapper
        const wrapper = input.parentElement;
        if (wrapper && wrapper.style.position === 'relative') {
            // This is our wrapper, find the original element
            const element = wrapper.previousSibling;
            if (element && element.style.display === 'none') {
                element.style.display = '';
            }
            wrapper.remove();
        } else {
            // Fallback to old cleanup method
            if (input._suggestionsContainer && input._suggestionsContainer.parentElement) {
                input._suggestionsContainer.remove();
            }
            
            const element = input.previousSibling;
            if (element) {
                element.style.display = '';
            }
            input.remove();
        }
    }

    /**
     * Parse available date to ISO format for date input
     */
    parseAvailableDateToISO(dateStr) {
        if (!dateStr || dateStr === 'Available Now' || dateStr === 'Now') {
            return '';
        }
        
        // Try to parse various date formats
        const cleanDate = dateStr.replace(/[^\d\/\-\.]/g, '');
        
        // Handle MM/DD/YY or MM/DD/YYYY
        const mmddyy = cleanDate.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
        if (mmddyy) {
            let year = parseInt(mmddyy[3]);
            if (year < 100) {
                year += 2000; // Convert 25 to 2025
            }
            const month = mmddyy[1].padStart(2, '0');
            const day = mmddyy[2].padStart(2, '0');
            return `${year}-${month}-${day}`;
        }
        
        // Try direct date parsing with local timezone
        const parsed = new Date(dateStr);
        if (!isNaN(parsed)) {
            // Use local timezone to avoid off-by-one day issues
            const year = parsed.getFullYear();
            const month = (parsed.getMonth() + 1).toString().padStart(2, '0');
            const day = parsed.getDate().toString().padStart(2, '0');
            return `${year}-${month}-${day}`;
        }
        
        return '';
    }

    /**
     * Format date for display
     */
    formatDateForDisplay(isoDate) {
        if (!isoDate) return 'Available Now';
        
        try {
            // Create date by parsing the ISO string as local date to avoid timezone issues
            const [year, month, day] = isoDate.split('-').map(Number);
            const date = new Date(year, month - 1, day); // month is 0-indexed
            
            const displayMonth = (date.getMonth() + 1).toString();
            const displayDay = date.getDate().toString();
            const displayYear = date.getFullYear().toString().slice(-2);
            return `${displayMonth}/${displayDay}/${displayYear}`;
        } catch (error) {
            return isoDate;
        }
    }

    /**
     * Get field value for editing
     */
    getFieldValue(listingId, fieldName, displayValue) {
        const listing = this.rentalListings.find(l => l.id === listingId);
        if (!listing) return displayValue;
        
        switch (fieldName) {
            case 'rent_price':
                return listing.rent_price || '';
            case 'square_feet':
                return listing.square_feet || '';
            case 'bedrooms_bathrooms':
                return `${listing.bedrooms || 0} bd / ${listing.bathrooms || 0} ba`;
            case 'available_date':
                return listing.available_date || '';
            default:
                return listing[fieldName] || displayValue;
        }
    }

    /**
     * Update listing field
     */
    updateListingField(listingId, fieldName, newValue) {
        console.log(`Updating listing ${listingId}, field ${fieldName} to:`, newValue);
        
        // Find the listing
        const listing = this.rentalListings.find(l => l.id === listingId);
        if (!listing) return;
        
        // Parse special fields
        let updatedValue = newValue;
        if (fieldName === 'rent_price') {
            updatedValue = parseFloat(newValue.replace(/[$,]/g, '')) || 0;
        } else if (fieldName === 'square_feet') {
            updatedValue = parseInt(newValue.replace(/[,]/g, '')) || 0;
        } else if (fieldName === 'available_date') {
            // Store the formatted value directly for available_date
            updatedValue = newValue;
        } else if (fieldName === 'bedrooms_bathrooms') {
            const match = newValue.match(/(\d+(?:\.\d+)?)\s*bd?\s*\/\s*(\d+(?:\.\d+)?)\s*ba?/i);
            if (match) {
                listing.bedrooms = parseInt(match[1]) || 0;
                listing.bathrooms = parseFloat(match[2]) || 0;
                this.trackListingChange(listingId, 'bedrooms', listing.bedrooms);
                this.trackListingChange(listingId, 'bathrooms', listing.bathrooms);
                this.updateDisplayElements(listingId);
                return;
            }
        }
        
        // Update the listing
        listing[fieldName] = updatedValue;
        
        // Track the change
        this.trackListingChange(listingId, fieldName, updatedValue);
        
        // Update display
        this.updateDisplayElements(listingId);
    }

    /**
     * Track listing changes
     */
    trackListingChange(listingId, fieldName, newValue) {
        if (!this.pendingChanges.modified.has(listingId)) {
            this.pendingChanges.modified.set(listingId, {});
        }
        
        const changes = this.pendingChanges.modified.get(listingId);
        changes[fieldName] = newValue;
        
        this.hasUnsavedChanges = true;
        this.updateSaveButton();
        
        // Track in version control system
        if (adminVersionControlUI && adminVersionControlUI.isReady()) {
            adminVersionControlUI.getVersionManager().trackChange(
                `rental_listing_${listingId}`,
                null, // Previous value tracking could be added here
                JSON.stringify({ [fieldName]: newValue }),
                'update',
                {
                    action: 'edit',
                    listingId: listingId,
                    field: fieldName,
                    page: 'rentals.html',
                    contentType: 'rental_listing',
                    timestamp: new Date().toISOString()
                }
            );
        }
    }

    /**
     * Update display elements for a listing
     */
    updateDisplayElements(listingId) {
        const listing = this.rentalListings.find(l => l.id === listingId);
        if (!listing) return;
        
        const listingElement = document.querySelector(`[data-listing-id="${listingId}"]`);
        if (!listingElement) return;
        
        // Update all fields
        const priceElement = listingElement.querySelector('[data-field="rent_price"]');
        if (priceElement) {
            priceElement.textContent = `$${parseFloat(listing.rent_price || 0).toLocaleString()}`;
        }
        
        const sqftElement = listingElement.querySelector('[data-field="square_feet"]');
        if (sqftElement) {
            sqftElement.textContent = (listing.square_feet || 0).toLocaleString();
        }
        
        const bedsElement = listingElement.querySelector('[data-field="bedrooms_bathrooms"]');
        if (bedsElement) {
            bedsElement.textContent = `${listing.bedrooms || 0} bd / ${listing.bathrooms || 0} ba`;
        }
        
        const titleElement = listingElement.querySelector('[data-field="title"]');
        if (titleElement) {
            titleElement.textContent = listing.title || '';
        }
        
        const addressElement = listingElement.querySelector('[data-field="address"]');
        if (addressElement) {
            const mapLink = addressElement.querySelector('.map-link');
            const mapLinkHtml = mapLink ? mapLink.outerHTML : '<a href="#" class="map-link">📍 Map</a>';
            
            // Build address string with proper handling of empty values
            let addressParts = [listing.address];
            if (listing.city) addressParts.push(listing.city);
            if (listing.state) addressParts.push(listing.state);
            if (listing.zip_code) addressParts.push(listing.zip_code);
            
            const addressText = addressParts.join(', ');
            addressElement.innerHTML = `${addressText} ${mapLinkHtml}`;
        }

        const availableDateElement = listingElement.querySelector('[data-field="available_date"]');
        if (availableDateElement) {
            availableDateElement.textContent = listing.available_date || 'Available Now';
        }

        const descriptionElement = listingElement.querySelector('[data-field="description"]');
        if (descriptionElement) {
            descriptionElement.textContent = listing.description || '';
        }

        const appliancesElement = listingElement.querySelector('[data-field="appliances"]');
        if (appliancesElement) {
            appliancesElement.textContent = listing.appliances || '';
        }

        const petPolicyElement = listingElement.querySelector('[data-field="pet_policy"]');
        if (petPolicyElement) {
            petPolicyElement.textContent = listing.pet_policy || 'Contact for details';
        }
    }

    /**
     * Update save button state
     */
    updateSaveButton() {
        // This will be handled by the universal save button in the admin controls
        console.log(`Save button update - Has unsaved changes: ${this.hasUnsavedChanges}`);
    }

    /**
     * Get pending changes in format expected by version control system
     */
    getPendingChangesForVersionControl() {
        if (!this.hasUnsavedChanges) {
            return null;
        }
        
        console.log('📋 Providing pending rental listing changes to version control:');
        console.log(`   - Modified: ${this.pendingChanges.modified.size} listings`);
        console.log(`   - Added: ${this.pendingChanges.added.length} listings`);
        console.log(`   - Deleted: ${this.pendingChanges.deleted.size} listings`);
        
        return {
            added: [...this.pendingChanges.added],
            modified: this.pendingChanges.modified instanceof Map ? 
                Object.fromEntries(this.pendingChanges.modified) : 
                this.pendingChanges.modified,
            deleted: [...this.pendingChanges.deleted]
        };
    }

    /**
     * Clear pending changes
     */
    clearPendingChanges() {
        this.pendingChanges.modified.clear();
        this.pendingChanges.added = [];
        this.pendingChanges.deleted.clear();
        this.hasUnsavedChanges = false;
        
        // Remove visual indicators
        document.querySelectorAll('.listing-card').forEach(card => {
            card.classList.remove('pending-changes');
        });
        
        console.log('🧹 Cleared all pending rental listing changes');
    }

    /**
     * Update listing pending indicator
     */
    updateListingPendingIndicator(listingId) {
        const listingElement = document.querySelector(`[data-listing-id="${listingId}"]`);
        if (!listingElement) return;
        
        const hasChanges = this.pendingChanges.modified.has(listingId) || 
                          this.pendingChanges.deleted.has(listingId) ||
                          this.pendingChanges.added.some(l => l.id === listingId);
        
        if (hasChanges) {
            listingElement.classList.add('pending-changes');
        } else {
            listingElement.classList.remove('pending-changes');
        }
    }

    /**
     * Open image selector for listing
     */
    openImageSelector(listingId) {
        this.currentListingId = listingId;
        console.log(`Opening image selector for listing: ${listingId}`);
        
        // Use the existing image manager if available
        if (window.adminImageManager && typeof window.adminImageManager.showImageBrowser === 'function') {
            window.adminImageManager.showImageBrowser(({ publicUrl, signedUrl, filename }) => {
                console.log('✅ Image selected from global browser:', { publicUrl, signedUrl, filename });
                this.assignImageToListing(listingId, { 
                    url: publicUrl, 
                    signedUrl: signedUrl, 
                    fileName: filename,
                    filePath: filename
                });
            });
        } else {
            console.error('❌ Admin Image Manager not available:', {
                adminImageManager: !!window.adminImageManager,
                showImageBrowser: window.adminImageManager && typeof window.adminImageManager.showImageBrowser
            });
            alert('Image manager not available. Please ensure the admin image manager is loaded.');
        }
    }

    /**
     * Assign image to listing
     */
    async assignImageToListing(listingId, imageData) {
        console.log(`🖼️ Assigning image to listing ${listingId}:`, imageData);
        
        const listing = this.rentalListings.find(l => l.id === listingId);
        if (!listing) {
            console.error('❌ Listing not found for assignment.');
            return;
        }
        
        // Extract bucket path from public URL (similar to about-admin.js)
        // Example publicUrl: https://[project].supabase.co/storage/v1/object/public/wolf-property-images/images/property1.jpg
        // We need to save the path: "images/property1.jpg"
        const urlParts = new URL(imageData.url);
        const bucketPath = urlParts.pathname.split('/wolf-property-images/')[1];
        
        console.log(`  - Listing ID: ${listingId}`);
        console.log(`  - Filename: ${imageData.fileName}`);
        console.log(`  - Public URL (to save): ${imageData.url}`);
        console.log(`  - Signed URL (for display): ${imageData.signedUrl}`);
        console.log(`  - Extracted Bucket Path: ${bucketPath}`);
        
        // Update listing with new image
        listing.primary_image_url = imageData.url;
        listing.primary_image_filename = bucketPath; // Save the bucket path, not just filename
        
        // Track changes
        this.trackListingChange(listingId, 'primary_image_url', imageData.url);
        this.trackListingChange(listingId, 'primary_image_filename', bucketPath);
        
        // Update the image display with signed URL for immediate display
        const listingElement = document.querySelector(`[data-listing-id="${listingId}"]`);
        const imageElement = listingElement.querySelector('.listing-image img');
        if (imageElement) {
            imageElement.src = imageData.signedUrl || imageData.url;
            console.log('✅ Image display updated');
        }
    }

    /**
     * Add new rental listing
     */
    async addRentalListing() {
        console.log('➕ Adding new rental listing (pending)');
        
        try {
            // Create temporary ID for new listing
            const tempId = `temp_${Date.now()}`;
            
            // Create new listing data with neutral defaults
            const newListingData = {
                id: tempId,
                title: 'New Rental Property',
                address: 'Click to edit address',
                city: 'City',
                state: 'TX',
                zip_code: '',
                rent_price: 2000.00,
                square_feet: 1500,
                bedrooms: 3,
                bathrooms: 2,
                description: 'Click to edit this property description. Add details about the features, location, and amenities.',
                appliances: 'Dishwasher, Electric Range, Microwave',
                pet_policy: 'Contact for pet policy details',
                available_date: (() => {
                    const futureDate = new Date();
                    futureDate.setDate(futureDate.getDate() + 30);
                    const month = futureDate.getMonth() + 1;
                    const day = futureDate.getDate();
                    const year = futureDate.getFullYear().toString().slice(-2);
                    return `${month}/${day}/${year}`;
                })(),
                primary_image_url: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
                primary_image_filename: null,
                neighborhood: '',
                sort_order: this.rentalListings.length + 1,
                is_active: true,
                is_featured: false,
                isNew: true // Mark as new for UI purposes
            };
            
            // Add to pending changes
            this.pendingChanges.added.push(newListingData);
            
            // Track in version control system
            if (adminVersionControlUI && adminVersionControlUI.isReady()) {
                adminVersionControlUI.getVersionManager().trackChange(
                    `rental_listing_${tempId}`,
                    null, // no previous value
                    JSON.stringify(newListingData),
                    'create',
                    {
                        action: 'add',
                        listingTitle: newListingData.title,
                        page: 'rentals.html',
                        contentType: 'rental_listing',
                        timestamp: new Date().toISOString()
                    }
                );
            }
            
            this.hasUnsavedChanges = true;
            this.updateSaveButton();
            
            // Add to our local data
            this.rentalListings.push(newListingData);
            
            // Create and add the new listing element
            const listingElement = await this.createRentalListingElement(newListingData);
            
            const listingsContainer = document.getElementById('listings-container');
            listingsContainer.appendChild(listingElement);
            
            // Hide no listings message if shown
            const noListingsElement = document.getElementById('no-listings');
            if (noListingsElement) {
                noListingsElement.style.display = 'none';
            }
            
            console.log('✅ New rental listing added to pending changes');
            
            // Scroll to new listing
            listingElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
            
        } catch (error) {
            console.error('❌ Error adding rental listing:', error);
            alert(`Error adding rental listing: ${error.message}`);
        }
    }

    /**
     * Delete listing
     */
    deleteListing(listingId) {
        console.log(`🗑️ Marking listing ${listingId} for deletion`);
        
        const listing = this.rentalListings.find(l => l.id === listingId);
        if (!listing) return;
        
        if (listing.isNew) {
            // Remove from pending additions
            this.pendingChanges.added = this.pendingChanges.added.filter(l => l.id !== listingId);
            this.rentalListings = this.rentalListings.filter(l => l.id !== listingId);
            
            // Remove from DOM
            const listingElement = document.querySelector(`[data-listing-id="${listingId}"]`);
            if (listingElement) {
                listingElement.remove();
            }
        } else {
            // Mark existing listing for deletion
            this.pendingChanges.deleted.add(listingId);
            
            // Update display
            const listingElement = document.querySelector(`[data-listing-id="${listingId}"]`);
            if (listingElement) {
                listingElement.classList.add('pending-deletion');
                // Add pending deleted badge
                const existingBadge = listingElement.querySelector('.pending-badge');
                if (existingBadge) {
                    existingBadge.remove();
                }
                const deletedBadge = document.createElement('div');
                deletedBadge.className = 'pending-badge pending-deleted';
                deletedBadge.textContent = 'DELETED (PENDING)';
                listingElement.insertBefore(deletedBadge, listingElement.firstChild);
            }
        }
        
        this.hasUnsavedChanges = true;
        this.updateSaveButton();
        
        // Track in version control
        if (adminVersionControlUI && adminVersionControlUI.isReady()) {
            adminVersionControlUI.getVersionManager().trackChange(
                `rental_listing_${listingId}`,
                JSON.stringify(listing),
                null,
                'delete',
                {
                    action: 'delete',
                    listingTitle: listing.title,
                    page: 'rentals.html',
                    contentType: 'rental_listing',
                    timestamp: new Date().toISOString()
                }
            );
        }
    }

    /**
     * Save all pending changes to database (called by universal save button)
     */
    async saveAllChanges() {
        if (!this.hasUnsavedChanges) {
            console.log('No rental listing changes to save');
            return;
        }

        console.log('🏠 Saving all pending rental listing changes...');
        
        try {
            // Save modified listings
            for (const [listingId, listingChanges] of this.pendingChanges.modified) {
                const listing = this.rentalListings.find(l => l.id === listingId);
                if (listing) {
                    // Apply all changes to the listing
                    Object.assign(listing, listingChanges);
                    
                    // Save to database
                    const { error } = await this.dbService.saveRentalListing(listing);
                    if (error) {
                        throw new Error(`Failed to save listing ${listing.title}: ${error}`);
                    }
                }
            }

            // Save new listings (convert temp IDs to real IDs)
            const newListingsWithRealIds = [];
            for (const newListing of this.pendingChanges.added) {
                // Remove temporary fields before saving
                const { id: tempId, isNew, ...listingToSave } = newListing;

                const { rentalListing, error } = await this.dbService.saveRentalListing(listingToSave);
                if (error) {
                    throw new Error(`Failed to save new listing: ${error}`);
                }

                // Keep track of the mapping from temp ID to the newly saved listing
                newListingsWithRealIds.push({ tempId, realListing: rentalListing });
            }

            // Update local data: remove temp listings and add real ones
            this.rentalListings = this.rentalListings.filter(l => !l.id.startsWith('temp_'));
            newListingsWithRealIds.forEach(({ realListing }) => {
                this.rentalListings.push(realListing);
            });

            // Handle deleted listings (soft delete)
            for (const listingId of this.pendingChanges.deleted) {
                const { error } = await this.dbService.deleteRentalListing(listingId);
                if (error) {
                    throw new Error(`Failed to delete listing: ${error}`);
                }
            }

            // Clear pending changes and re-render UI
            this.clearPendingChanges();
            await this.renderRentalListings();

            console.log('✅ All rental listing changes saved successfully');

        } catch (error) {
            console.error('❌ Failed to save rental listing changes:', error);
            throw error; // Re-throw so universal save button can handle the error
        }
    }

    /**
     * Add admin controls specific to rentals page
     */
    addAdminControls() {
        const adminControls = document.querySelector('.admin-controls-content');
        if (!adminControls) {
            console.warn('❌ Admin controls not found');
            return;
        }

        // Check if controls already exist
        if (document.getElementById('rentals-admin-controls')) {
            console.log('⚠️ Rentals admin controls already exist, skipping...');
            return;
        }

        const rentalsControls = document.createElement('div');
        rentalsControls.id = 'rentals-admin-controls';
        rentalsControls.className = 'rentals-admin-controls';
        rentalsControls.innerHTML = `
            <div class="rentals-admin-section">
                <h4>🏠 Rental Listings Management</h4>
                <p style="color: rgba(255, 255, 255, 0.8); font-size: 14px; margin: 0 0 15px 0;">
                    Click on listing images to assign from bucket. Click text to edit. Changes are held until you save.
                </p>
                <div class="rentals-admin-buttons">
                    <button id="add-rental-listing-btn" class="btn btn-primary" style="background-color: #27ae60; margin-right: 10px;">
                        ➕ Add Rental Listing
                    </button>
                </div>
                <div id="rentals-changes-status" style="margin-top: 10px; font-size: 12px; color: rgba(255, 255, 255, 0.6);">
                    Changes are saved with version history for easy reverting
                </div>
            </div>
        `;

        adminControls.appendChild(rentalsControls);
    }

    /**
     * Add event listeners
     */
    addEventListeners() {
        // Add rental listing button
        document.addEventListener('click', (e) => {
            if (e.target && e.target.id === 'add-rental-listing-btn') {
                e.preventDefault();
                this.addRentalListing();
            }
        });

        // Handle clicking on "Add New Listing" pseudo-element
        if (document.body.classList.contains('admin-mode')) {
            const rentalListingsSection = document.querySelector('.rental-listings');
            if (rentalListingsSection) {
                rentalListingsSection.addEventListener('click', (e) => {
                    // Check if click is in the "Add New Listing" area (top-left)
                    const rect = rentalListingsSection.getBoundingClientRect();
                    const clickX = e.clientX - rect.left;
                    const clickY = e.clientY - rect.top;
                    
                    // Approximate area of the "Add New Listing" pseudo-element
                    if (clickX <= 250 && clickY <= 60 && clickY >= 20) {
                        this.addRentalListing();
                    }
                });
            }
        }
    }

    /**
     * Clear pending changes
     */
    clearPendingChanges() {
        this.pendingChanges = {
            modified: new Map(),
            added: [],
            deleted: new Set()
        };
        this.hasUnsavedChanges = false;
    }

    /**
     * Save all pending changes to database (called by universal save button)
     */
    async saveAllChanges() {
        if (!this.hasUnsavedChanges) {
            console.log('No rental listing changes to save');
            return;
        }

        console.log('💾 Saving all pending rental listing changes...');
        
        try {
            // Save modified listings
            for (const [listingId, listingChanges] of this.pendingChanges.modified) {
                const listing = this.rentalListings.find(l => l.id === listingId);
                if (listing) {
                    // Apply all changes to the listing
                    Object.assign(listing, listingChanges);
                    
                    // Save to database
                    const { error } = await this.dbService.saveRentalListing(listing);
                    if (error) {
                        throw new Error(`Failed to save listing ${listing.title}: ${error}`);
                    }
                }
            }

            // Save new listings (convert temp IDs to real IDs)
            const newListingsWithRealIds = [];
            for (const newListing of this.pendingChanges.added) {
                // Remove temporary fields before saving
                const { id: tempId, isNew, ...listingToSave } = newListing;

                const { rentalListing, error } = await this.dbService.saveRentalListing(listingToSave);
                if (error) {
                    throw new Error(`Failed to save new listing: ${error}`);
                }

                // Keep track of the mapping from temp ID to the newly saved listing
                newListingsWithRealIds.push({ tempId, realListing: rentalListing });
            }

            // Update local data: remove temp listings and add real ones
            this.rentalListings = this.rentalListings.filter(l => !l.id.startsWith('temp_'));
            newListingsWithRealIds.forEach(({ realListing }) => {
                this.rentalListings.push(realListing);
            });

            // Handle deleted listings (soft delete)
            for (const listingId of this.pendingChanges.deleted) {
                const { error } = await this.dbService.deleteRentalListing(listingId);
                if (error) {
                    throw new Error(`Failed to delete listing: ${error}`);
                }
            }

            // Clear pending changes and re-render UI
            this.clearPendingChanges();
            await this.renderRentalListings();

            console.log('✅ All rental listing changes saved successfully');

        } catch (error) {
            console.error('❌ Failed to save rental listing changes:', error);
            throw error; // Re-throw so universal save button can handle the error
        }
    }

    /**
     * Make all rental listings editable (called after rendering in admin mode)
     */
    makeAllListingsEditable() {
        const listingCards = document.querySelectorAll('.listing-card[data-listing-id]:not([data-listing-id="sample"])');
        listingCards.forEach(card => {
            this.makeRentalListingEditable(card);
        });
    }

    /**
     * Show sample listing for regular users (no database calls)
     */
    showSampleListing() {
        const listingsContainer = document.getElementById('listings-container');
        const noListingsElement = document.getElementById('no-listings');
        const sampleListing = listingsContainer.querySelector('[data-listing-id="sample"]');
        
        if (sampleListing) {
            sampleListing.style.display = 'block';
        }
        
        if (noListingsElement) {
            noListingsElement.style.display = 'none';
        }
        
        console.log('✅ Showing sample listing for regular users');
    }
}

// Create global instance
const rentalsAdminManager = new RentalsAdminManager();

// Make globally available for debugging and integration
window.rentalsAdminManager = rentalsAdminManager;

// Auto-initialize when admin logs in
document.addEventListener('DOMContentLoaded', () => {
    // Only initialize on rentals page
    if (!window.location.pathname.includes('rentals.html')) {
        return;
    }

    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.type === 'attributes' && 
                mutation.attributeName === 'class' && 
                mutation.target === document.body) {
                
                if (document.body.classList.contains('admin-mode')) {
                    rentalsAdminManager.initialize();
                } else {
                    rentalsAdminManager.cleanup();
                }
            }
        });
    });

    observer.observe(document.body, {
        attributes: true,
        attributeFilter: ['class']
    });

    // Initialize immediately if already in admin mode
    if (document.body.classList.contains('admin-mode')) {
        rentalsAdminManager.initialize();
    }
    
    // Only load rental listings for admin users or when specifically requested
    // This prevents database calls from blocking the page for regular users
    // Show sample listing for regular users
    rentalsAdminManager.showSampleListing();
    
    // Also load rental listings from database on page load (for non-admin users) - matching about page pattern
    rentalsAdminManager.loadRentalListingsFromDatabase();
    
    // Prevent accidental loss of unsaved changes
    window.addEventListener('beforeunload', (e) => {
        if (rentalsAdminManager.hasUnsavedChanges) {
            e.preventDefault();
            e.returnValue = 'You have unsaved changes to rental listings. Are you sure you want to leave?';
            return e.returnValue;
        }
    });
});

export default rentalsAdminManager; 