// DOM Elements
const yearTypeSelect = document.getElementById("yearType");

// Get current position
const getCurrentPosition = () => {
    return new Promise((resolve, reject) => {
        if (!navigator.geolocation) {
            reject(new Error('Geolocation is not supported by your browser'));
            return;
        }

        navigator.geolocation.getCurrentPosition(
            (position) => {
                resolve(position);
            },
            reject
        );
    });
};

gpsBtn.addEventListener('click', async () => {
    try {
        updateButtonIcon(gpsBtn, 'loading');
        // Check if we're requesting the same coordinates again
        const prevLat = latitudeInput.value.trim();
        const prevLng = longitudeInput.value.trim();

        const position = await getCurrentPosition();
        const { latitude, longitude } = position.coords;

        // Check if these are the same coordinates as before
        const isSameLocation = prevLat && prevLng &&
            Math.abs(parseFloat(prevLat) - latitude) < 0.0001 &&
            Math.abs(parseFloat(prevLng) - longitude) < 0.0001;

        // Insert coordinates into input boxes
        latitudeInput.value = latitude;
        longitudeInput.value = longitude;

        if (isSameLocation) {
            // Show equals sign for same coordinates
            updateButtonIcon(gpsBtn, 'equals', 1000, 'gps');
        } else {
            // Show checkmark only if not showing equals icon
            updateButtonIcon(gpsBtn, 'checkmark', 1000, 'gps');
        }
    } catch (err) {
        showError(err);
    } finally {
        addressInput.value = "";
    }
});

// Rate limiter for Nominatim API requests
let lastNominatimRequestTime = 0;
const NOMINATIM_RATE_LIMIT_MS = 1000; // 1 second minimum between requests
const TYPING_DEBOUNCE_MS = 300; // Wait for user to pause typing

// Track the current fetch request so we can abort it if needed
let currentFetchController = null;
let currentFetchTimeout = null;
let pendingFetchResolve = null;

// Enhanced cache for Nominatim results
const nominatimCache = new Map();
const CACHE_MAX_SIZE = 50; // Maximum number of cached queries
const CACHE_EXPIRY_MS = 30 * 60 * 1000; // Cache entries expire after 30 minutes

// Function to check cache for a query
function checkCache(query) {
    if (nominatimCache.has(query)) {
        const cacheEntry = nominatimCache.get(query);
        const now = Date.now();

        // Check if the cache entry is still valid
        if (now - cacheEntry.timestamp < CACHE_EXPIRY_MS) {
            // console.log(`[fetchNominatim] Cache hit for query: ${query}`);
            return cacheEntry.data;
        } else {
            // Remove expired cache entry
            // console.log(`[fetchNominatim] Removing expired cache entry for: ${query}`);
            nominatimCache.delete(query);
        }
    }
    return null;
}

// Function to add a result to the cache
function addToCache(query, data) {
    // Trim cache if it's too large
    if (nominatimCache.size >= CACHE_MAX_SIZE) {
        // Remove the oldest entry
        const oldestKey = nominatimCache.keys().next().value;
        nominatimCache.delete(oldestKey);
        // console.log(`[fetchNominatim] Cache full, removed oldest entry: ${oldestKey}`);
    }

    // Add the new entry
    nominatimCache.set(query, {
        data: data,
        timestamp: Date.now()
    });
    // console.log(`[fetchNominatim] Added to cache: ${query}`);
}

// Function to fetch from Nominatim with improved handling
async function fetchNominatim(url, query, abortPrevious = true) {
    // First check the cache
    const cachedResult = checkCache(query);
    if (cachedResult) {
        return cachedResult;
    }

    // Abort any previous fetch request if requested
    if (abortPrevious) {
        if (currentFetchController) {
            // console.log(`[fetchNominatim] Aborting previous request`);
            currentFetchController.abort();
            currentFetchController = null;
        }

        if (currentFetchTimeout) {
            // console.log(`[fetchNominatim] Clearing previous timeout`);
            clearTimeout(currentFetchTimeout);
            currentFetchTimeout = null;
        }

        if (pendingFetchResolve) {
            // console.log(`[fetchNominatim] Resolving pending promise with abort`);
            pendingFetchResolve(new Error('Request aborted'));
            pendingFetchResolve = null;
        }
    }

    // Create a new AbortController for this request
    currentFetchController = new AbortController();
    const signal = currentFetchController.signal;

    // Implement debouncing - wait for user to stop typing
    await new Promise((resolve) => {
        pendingFetchResolve = resolve;
        currentFetchTimeout = setTimeout(() => {
            pendingFetchResolve = null;
            resolve();
        }, TYPING_DEBOUNCE_MS);

        // Allow abort to cancel the timeout
        signal.addEventListener('abort', () => {
            if (currentFetchTimeout) {
                clearTimeout(currentFetchTimeout);
                currentFetchTimeout = null;
            }
            resolve(new Error('Debounce aborted'));
        });
    }).then(result => {
        if (result instanceof Error) throw result;
    }).catch(error => {
        if (error.message === 'Debounce aborted') {
            // console.log(`[fetchNominatim] Debounce period aborted`);
            throw new Error('Request aborted');
        }
        throw error;
    });

    // Check rate limiting
    const now = Date.now();
    const timeElapsed = now - lastNominatimRequestTime;

    // If less than 1 second has passed since the last request, wait
    if (timeElapsed < NOMINATIM_RATE_LIMIT_MS) {
        const waitTime = NOMINATIM_RATE_LIMIT_MS - timeElapsed;
        // console.log(`[fetchNominatim] Rate limiting: waiting ${waitTime}ms before next request`);
        try {
            await new Promise((resolve, reject) => {
                const timeout = setTimeout(resolve, waitTime);
                signal.addEventListener('abort', () => {
                    clearTimeout(timeout);
                    reject(new Error('Wait aborted'));
                });
            });
        } catch (error) {
            if (error.message === 'Wait aborted') {
                // console.log(`[fetchNominatim] Wait period aborted`);
                throw new Error('Request aborted');
            }
            throw error;
        }
    }

    // Now perform the actual fetch
    try {
        // console.log(`[fetchNominatim] Fetching: ${url}`);
        const startTime = performance.now();

        // Update the last request time BEFORE making the request
        // This ensures at least 1 second between the start of each request
        lastNominatimRequestTime = Date.now();

        // Set a timeout for the fetch operation
        const fetchPromise = fetch(url, { signal });
        const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Fetch timeout')), 5000); // 5 second timeout
        });

        // Race the fetch against the timeout
        const response = await Promise.race([fetchPromise, timeoutPromise]);

        const fetchTime = (performance.now() - startTime).toFixed(2);
        // console.log(`[fetchNominatim] Responded in ${fetchTime}ms with status: ${response.status}`);

        if (!response.ok) {
            throw new Error(`Nominatim API error: ${response.status}`);
        }

        const data = await response.json();

        // Add the result to the cache
        addToCache(query, data);

        return data;
    } catch (error) {
        if (error.name === 'AbortError' || error.message === 'Request aborted') {
            // console.log(`[fetchNominatim] Request aborted`);
            throw new Error('Request aborted');
        } else if (error.message === 'Fetch timeout') {
            // console.log(`[fetchNominatim] Request timed out after 5 seconds`);
            throw new Error('Request timed out');
        }
        throw error;
    } finally {
        // Clean up if this is the current controller
        if (currentFetchController && currentFetchController.signal === signal) {
            currentFetchController = null;
        }
    }
}

// Function to geocode an address using Nominatim
async function geocodeAddress(address) {
    // console.log(`[geocodeAddress] Starting geocoding for address: ${address}`);
    // console.log(`[geocodeAddress] suggestionSelected flag is: ${suggestionSelected}`);

    try {
        const nominatimUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}`;

        // Use the address as the query for caching
        const data = await fetchNominatim(nominatimUrl, address, true);
        // console.log(`[geocodeAddress] Nominatim returned ${data.length} results`);

        if (!data.length) {
            console.error(`[geocodeAddress] Nominatim returned no results for "${address}"`);
            throw new Error(`No results found for address: ${address}`);
        }

        // If there's only one result, use it directly
        if (data.length === 1) {
            const { lat, lon, display_name } = data[0];
            // console.log(`[geocodeAddress] Found single result with coordinates: ${lat}, ${lon}`);
            // console.log(`[geocodeAddress] Full address: ${display_name}`);

            // Update input fields with the coordinates and display name
            latitudeInput.value = lat;
            longitudeInput.value = lon;
            addressInput.value = display_name;
            // console.log(`[geocodeAddress] Updated address input with full display name: ${display_name}`);

            return {
                latitude: lat,
                longitude: lon,
                displayName: display_name
            };
        }
        // If there are multiple results, show the dropdown for user selection
        else {
            // console.log(`[geocodeAddress] Multiple results found (${data.length}), showing dropdown for user selection`);
            // console.log(`[geocodeAddress] Please select a location from the dropdown`);

            // Create a promise that will be resolved when the user selects a location
            return new Promise((resolve) => {
                // Only show an alert if a suggestion hasn't been selected
                if (!getSuggestionSelected()) {
                    // Show an alert to make sure the user notices the dropdown
                    alert(`Multiple locations found for "${address}". Please select one from the dropdown.`);
                }

                // Show the dropdown with the results
                showLocationDropdown(data, (selectedLocation) => {
                    const { lat, lon, display_name } = selectedLocation;
                    // console.log(`[geocodeAddress] Location selected with coordinates: ${lat}, ${lon}`);
                    // console.log(`[geocodeAddress] Selected address: ${display_name}`);

                    // Update input fields with the selected coordinates and display name
                    latitudeInput.value = lat;
                    longitudeInput.value = lon;
                    addressInput.value = display_name;
                    // console.log(`[geocodeAddress] Updated address input with selected display name: ${display_name}`);

                    // Set the suggestion selected flag
                    setSuggestionSelected(true);
                    suggestionSelected = true;
                    // console.log(`[geocodeAddress] Set suggestionSelected to true`);

                    resolve({
                        latitude: lat,
                        longitude: lon,
                        displayName: display_name
                    });
                });
            });
        }
    } catch (error) {
        console.error(`[geocodeAddress] Error: ${error.message}`);
        throw new Error(`Failed to geocode address: ${error.message}`);
    }
}

// Function to show the location dropdown with multiple results
function showLocationDropdown(locations, callback) {
    const dropdown = document.getElementById('locationDropdown');

    // Clear any existing items
    dropdown.innerHTML = '';

    // Create a header/title for the dropdown
    const header = document.createElement('div');
    header.className = 'location-item';
    header.style.fontWeight = 'bold';
    header.style.backgroundColor = '#f0f0f0';
    header.textContent = `Select a location (${locations.length} results):`;
    dropdown.appendChild(header);

    // Add each location as an option
    locations.forEach((location, index) => {
        const item = document.createElement('div');
        item.className = 'location-item';

        // Create a more structured display with type and name
        const locationName = document.createElement('div');
        locationName.textContent = location.display_name;

        // Add a small subtitle with the type of location and country if available
        const locationInfo = document.createElement('div');
        locationInfo.style.fontSize = '0.7rem';
        locationInfo.style.color = '#666';
        locationInfo.style.marginTop = '3px';

        // Format the location type and country
        let infoText = '';
        if (location.type) infoText += location.type;
        if (location.type && location.address && location.address.country) infoText += ' • ';
        if (location.address && location.address.country) infoText += location.address.country;

        locationInfo.textContent = infoText || `Result ${index + 1}`;

        item.appendChild(locationName);
        if (infoText) item.appendChild(locationInfo);

        item.setAttribute('data-index', index);

        item.addEventListener('click', () => {
            // When an item is clicked, hide the dropdown and call the callback
            dropdown.classList.remove('show');
            // Set the suggestion selected flag
            setSuggestionSelected(true);
            suggestionSelected = true;
            callback(location);
        });

        dropdown.appendChild(item);
    });

    // Add a 'Use First Result' option instead of cancel
    const useFirstItem = document.createElement('div');
    useFirstItem.className = 'location-item';
    useFirstItem.style.color = '#3182ce';
    useFirstItem.textContent = 'Use First Result';

    useFirstItem.addEventListener('click', () => {
        dropdown.classList.remove('show');
        // console.log(`User clicked 'Use First Result', using first result`);
        // Set the suggestion selected flag
        setSuggestionSelected(true);
        suggestionSelected = true;
        callback(locations[0]);
    });

    dropdown.appendChild(useFirstItem);

    // Position the dropdown correctly
    const addressRect = addressInput.getBoundingClientRect();
    const exactWidth = addressInput.offsetWidth;
    dropdown.style.top = (addressRect.bottom + window.scrollY) + 'px';
    dropdown.style.width = exactWidth + 'px';
    dropdown.style.left = addressRect.left + 'px';

    // Show the dropdown and make sure it's visible
    dropdown.classList.add('show');

    // Prevent any clicks on the dropdown from propagating to the document
    dropdown.addEventListener('click', (event) => {
        event.stopPropagation();
    });

    // Add a click event listener to the document to close the dropdown when clicking outside
    function closeDropdown(event) {
        if (!dropdown.contains(event.target) && event.target !== addressInput) {
            dropdown.classList.remove('show');
            document.removeEventListener('click', closeDropdown);

            // Use the first result instead of treating it as a cancellation
            // console.log(`User clicked outside dropdown, using first result`);
            // Set the suggestion selected flag
            setSuggestionSelected(true);
            suggestionSelected = true;
            callback(locations[0]);
        }
    }

    // Delay adding the click event listener to prevent immediate triggering
    setTimeout(() => {
        document.addEventListener('click', closeDropdown);
    }, 100);

    // Also close the dropdown when ESC key is pressed
    function handleKeyDown(event) {
        if (event.key === 'Escape') {
            dropdown.classList.remove('show');
            document.removeEventListener('keydown', handleKeyDown);
            document.removeEventListener('click', closeDropdown);

            // Use the first result instead of treating it as a cancellation
            // console.log(`User pressed ESC, using first result`);
            // Set the suggestion selected flag
            setSuggestionSelected(true);
            suggestionSelected = true;
            callback(locations[0]);
        }
    }

    document.addEventListener('keydown', handleKeyDown);
}

// Variables for autocomplete functionality
let currentSuggestions = [];
let selectedSuggestionIndex = -1;
let lastInputValue = ''; // Track the last input value to avoid duplicate requests
let fetchedQueries = new Set(); // Track queries we've already fetched suggestions for

// Use localStorage to track if a suggestion has been selected
function setSuggestionSelected(value) {
    localStorage.setItem('suggestionSelected', value ? 'true' : 'false');
    // console.log(`Set suggestionSelected to ${value}`);
}

function getSuggestionSelected() {
    return localStorage.getItem('suggestionSelected') === 'true';
}

// Initialize suggestionSelected from localStorage or default to false
let suggestionSelected = getSuggestionSelected();

// Function to show address suggestions
function showAddressSuggestions(suggestions) {
    const suggestionsList = document.getElementById('addressSuggestions');
    suggestionsList.innerHTML = '';
    currentSuggestions = suggestions;
    selectedSuggestionIndex = -1;

    if (suggestions.length === 0) {
        suggestionsList.classList.remove('show');
        return;
    }

    // Position the dropdown correctly
    const addressRect = addressInput.getBoundingClientRect();
    const exactWidth = addressInput.offsetWidth;
    suggestionsList.style.top = (addressRect.bottom + window.scrollY) + 'px';
    suggestionsList.style.width = exactWidth + 'px';
    suggestionsList.style.left = addressRect.left + 'px';

    suggestions.forEach((suggestion, index) => {
        const item = document.createElement('li');
        item.className = 'suggestion-item';
        item.setAttribute('data-index', index);

        // Create text container
        const textSpan = document.createElement('span');
        textSpan.className = 'suggestion-text';
        textSpan.textContent = suggestion.display_name;
        item.appendChild(textSpan);

        // Create coordinates container
        const coordsSpan = document.createElement('span');
        coordsSpan.className = 'suggestion-coords';
        // Extract integer part of coordinates
        const lat = parseFloat(suggestion.lat);
        const lon = parseFloat(suggestion.lon);
        // Format coordinates to show integer part
        const latInt = lat >= 0 ? Math.floor(lat) : Math.ceil(lat);
        const lonInt = lon >= 0 ? Math.floor(lon) : Math.ceil(lon);
        coordsSpan.textContent = `${latInt}°, ${lonInt}°`;
        item.appendChild(coordsSpan);

        item.addEventListener('click', () => {
            selectSuggestion(index);
        });

        item.addEventListener('mouseover', () => {
            // Update the selected index when hovering
            if (selectedSuggestionIndex !== -1) {
                const previousSelected = suggestionsList.querySelector('.active');
                if (previousSelected) previousSelected.classList.remove('active');
            }
            selectedSuggestionIndex = index;
            item.classList.add('active');
        });

        suggestionsList.appendChild(item);
    });

    suggestionsList.classList.add('show');

    // Call repositionDropdowns to ensure correct positioning
    setTimeout(repositionDropdowns, 0);
}

// Function to select a suggestion
function selectSuggestion(index) {
    if (index >= 0 && index < currentSuggestions.length) {
        const suggestion = currentSuggestions[index];
        addressInput.value = suggestion.display_name;
        latitudeInput.value = suggestion.lat;
        longitudeInput.value = suggestion.lon;
        document.getElementById('addressSuggestions').classList.remove('show');
        // console.log(`Selected suggestion: ${suggestion.display_name} (${suggestion.lat}, ${suggestion.lon})`);

        // Set the flag to indicate a suggestion has been selected
        setSuggestionSelected(true);
        suggestionSelected = true;
        // console.log('Suggestion selected, will not prompt for location selection');
    }
}

// Function to handle keyboard navigation in suggestions
function handleSuggestionNavigation(event) {
    const suggestionsList = document.getElementById('addressSuggestions');
    const suggestions = suggestionsList.querySelectorAll('.suggestion-item');

    if (!suggestionsList.classList.contains('show') || suggestions.length === 0) return;

    // Handle arrow up/down and enter keys
    if (event.key === 'ArrowDown') {
        event.preventDefault(); // Prevent cursor from moving in input
        selectedSuggestionIndex = Math.min(selectedSuggestionIndex + 1, suggestions.length - 1);
        updateSelectedSuggestion(suggestions);
    } else if (event.key === 'ArrowUp') {
        event.preventDefault(); // Prevent cursor from moving in input
        selectedSuggestionIndex = Math.max(selectedSuggestionIndex - 1, 0);
        updateSelectedSuggestion(suggestions);
    } else if (event.key === 'Enter' && selectedSuggestionIndex >= 0) {
        event.preventDefault(); // Prevent form submission
        selectSuggestion(selectedSuggestionIndex);
    } else if (event.key === 'Escape') {
        suggestionsList.classList.remove('show');
    }
}

// Function to update the selected suggestion visual state
function updateSelectedSuggestion(suggestions) {
    suggestions.forEach((item, index) => {
        if (index === selectedSuggestionIndex) {
            item.classList.add('active');
            // Scroll the item into view if needed
            item.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        } else {
            item.classList.remove('active');
        }
    });
}

yearTypeSelect.addEventListener("change", async () => {
    updatePlaceholder()
    let year = yearInput.value.trim();
    if (!year) return; // Prevents transformation if input is empty

    try {
        if (yearTypeSelect.value === "1") {
            // Convert Gregorian to Hijri
            const today = new Date();
            const day = today.getDate();
            const month = today.getMonth() + 1;
            const response = await fetch(`https://api.aladhan.com/v1/gToH?date=${day}-${month}-${year}`);
            if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
            const data = await response.json();
            yearInput.value = data.data.hijri.year;
        } else {
            // Convert Hijri to Gregorian
            let hijriDay, hijriMonth;
            try {
                const hijriData = localStorage.getItem("hijriData");
                if (hijriData) {
                    const hijri = JSON.parse(hijriData);
                    hijriDay = hijri.day;
                    hijriMonth = hijri.month.number;
                } else {
                    // Default to 1st of Muharram if no data available
                    // console.log("No hijriData in localStorage, using defaults");
                    hijriDay = 1;
                    hijriMonth = 1;
                }
            } catch (error) {
                console.error("Error parsing hijriData:", error);
                hijriDay = 1;
                hijriMonth = 1;
            }

            const response = await fetch(`https://api.aladhan.com/v1/hToG?date=${hijriDay}-${hijriMonth}-${year}`);
            if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
            const data = await response.json();
            yearInput.value = data.data.gregorian.year;
        }
    } catch (error) {
        console.error("Error converting year:", error);
        showError(new Error(`Failed to convert year: ${error.message}`));
    }
});

async function storeHijriData() {
    // console.log("Checking for Hijri data in localStorage...");
    const existingData = localStorage.getItem("hijriData");

    // Check if we need to fetch new data
    let needToFetch = false;

    if (!existingData) {
        // console.log("No Hijri data found in localStorage");
        needToFetch = true;
    } else {
        // Validate existing data
        try {
            const hijri = JSON.parse(existingData);
            if (!hijri || !hijri.year || !hijri.month || !hijri.day) {
                // console.log("Invalid Hijri data structure in localStorage");
                needToFetch = true;
            } else {
                // console.log(`Hijri data already stored: Year ${hijri.year}, Month ${hijri.month.en}, Day ${hijri.day}`);
            }
        } catch (error) {
            console.error("Error parsing stored Hijri data:", error);
            needToFetch = true;
        }
    }

    // Fetch new data if needed
    if (needToFetch) {
        try {
            // console.log("Fetching Hijri data from API...");
            const response = await fetch("https://api.aladhan.com/v1/gToH");

            if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);

            const data = await response.json();
            // console.log("Received Hijri data from API");

            if (!data.data || !data.data.hijri) {
                throw new Error("Invalid API response structure");
            }

            localStorage.setItem("hijriData", JSON.stringify(data.data.hijri));
            // console.log(`Stored new Hijri data: Year ${data.data.hijri.year}`);

            // Verify stored data
            const storedHijriData = localStorage.getItem("hijriData");
            try {
                JSON.parse(storedHijriData); // Just verify it can be parsed
                // console.log("Verified stored Hijri data is valid");
            } catch (error) {
                console.error("Error verifying stored Hijri data:", error);
            }
        } catch (error) {
            console.error("Error fetching Hijri data:", error);
        }
    }
}

function updatePlaceholder() {
    yearInput.min = yearTypeSelect.value === "1" ? "1" : "593";
    yearInput.max = yearTypeSelect.value === "1" ? "9665" : "9999";

    let hijriYear = "1446"; // Default Hijri year if all else fails
    try {
        const hijriData = localStorage.getItem("hijriData");
        if (hijriData) {
            const hijri = JSON.parse(hijriData);
            hijriYear = hijri.year;
        } else {
            // If no hijriData in localStorage, we'll use the default
            // console.log("No hijriData in localStorage, using default Hijri year");
        }
    } catch (error) {
        console.error("Error parsing hijriData:", error);
    }

    yearInput.placeholder = yearTypeSelect.value === "1" ? hijriYear : new Date().getFullYear();
}

calculateBtn.addEventListener('click', async () => {
    try {
        updateButtonIcon(calculateBtn, 'loading');
        // Get and validate input values
        let latitude = latitudeInput.value.trim();
        let longitude = longitudeInput.value.trim();
        let address = document.getElementById('address').value.trim();
        // console.log(`Initial input values - Latitude: ${latitude}, Longitude: ${longitude}, Address: ${address}`);
        // console.log(`suggestionSelected flag is: ${suggestionSelected}`);

        // Validate coordinates if provided
        if (latitude && longitude) {
            // console.log(`Validating coordinates: ${latitude}, ${longitude}`);
            latitude = parseFloat(latitude);
            longitude = parseFloat(longitude);

            if (isNaN(latitude) || isNaN(longitude)) {
                console.error(`Invalid coordinates - Latitude: ${latitude}, Longitude: ${longitude}`);
                throw new Error("Invalid latitude or longitude values");
            }

            // Update input fields with validated values
            // console.log(`Updating input fields with validated coordinates - Latitude: ${latitude}, Longitude: ${longitude}`);
            latitudeInput.value = latitude;
            longitudeInput.value = longitude;
        }

        // Use current position if no coordinates or address provided
        if (!address) {
            // console.log(`No address provided, checking for coordinates...`);
            if (!latitude || !longitude) {
                // console.log(`No coordinates provided, attempting to get current position...`);
                try {
                    // console.log(`Calling getCurrentPosition()...`);
                    const position = await getCurrentPosition();
                    updateButtonIcon(gpsBtn, 'checkmark', 1000, 'gps');
                    latitude = position.coords.latitude;
                    longitude = position.coords.longitude;
                    // console.log(`Current position obtained - Latitude: ${latitude}, Longitude: ${longitude}`);
                    latitudeInput.value = latitude;
                    longitudeInput.value = longitude;
                } catch (posError) {
                    console.error(`Failed to get current position: ${posError.message}`);
                    throw new Error("Failed to get current position. Please enter an address or coordinates.");
                }
            }
        }

        // Get year type and calculation method
        const yearType = yearTypeSelect.value;
        const calculationMethod = calculationMethodSelect.value;
        // console.log(`Year type: ${yearType === "1" ? "Hijri" : "Gregorian"}, Calculation method: ${calculationMethod}`);

        // Determine the year to use
        let year;
        if (yearType === "1") {
            // console.log(`Getting Hijri year...`);
            if (!yearInput || !yearInput.value.trim()) {
                // console.log(`No year input, checking localStorage for hijriData...`);
                try {
                    const hijriData = localStorage.getItem("hijriData");
                    if (hijriData) {
                        // console.log(`Found hijriData in localStorage`);
                        const hijri = JSON.parse(hijriData);
                        if (hijri && hijri.year) {
                            year = hijri.year;
                            // console.log(`Using Hijri year from localStorage: ${year}`);
                        } else {
                            throw new Error("Invalid hijriData structure in localStorage");
                        }
                    } else {
                        // console.log(`No hijriData in localStorage, fetching from API...`);
                        const response = await fetch("https://api.aladhan.com/v1/gToH");
                        if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
                        const data = await response.json();
                        year = data.data.hijri.year;
                        // console.log(`API returned Hijri year: ${year}`);

                        // Store the fetched Hijri data for future use
                        localStorage.setItem("hijriData", JSON.stringify(data.data.hijri));
                        // console.log(`Stored new hijriData in localStorage`);
                    }
                } catch (error) {
                    console.error(`Error fetching Hijri year: ${error.message}`);
                    // console.log(`Using default Hijri year 1446`);
                    year = "1446";
                }
            } else {
                year = yearInput.value.trim();
                // console.log(`Using user-provided Hijri year: ${year}`);
            }
        } else {
            year = yearInput && yearInput.value.trim() ? yearInput.value.trim() : new Date().getFullYear();
            // console.log(`Using Gregorian year: ${year}`);
        }

        // Determine calendar type based on year type
        const calendarType = yearType === "1" ? "hijriCalendar" : "calendar";
        // console.log(`Calendar type:`, yearType === "1" ? "hijri" : "gregorian");

        // Build API URL
        let apiUrl;

        // Check if we need to geocode the address
        if (address) {
            // Check if we need to geocode
            let needToGeocode = true;

            // If a suggestion has been selected from the dropdown, use those coordinates
            if (getSuggestionSelected()) {
                // console.log(`A suggestion was previously selected, using those coordinates`);
                // console.log(`Address: ${address}`);
                // console.log(`Coordinates: ${latitude}, ${longitude}`);
                needToGeocode = false;
                // Reset the flag for next time
                setSuggestionSelected(false);
                suggestionSelected = false;
            }
            // If the address looks like a full display_name from Nominatim and we have coordinates
            else if (latitude && longitude) {
                // Check if this address was previously geocoded by checking if it's a full display_name
                // Display names from Nominatim are typically long and contain commas
                if (address.includes(',') && address.length > 10) {
                    // console.log(`Using existing coordinates for previously geocoded address: ${address}`);
                    // console.log(`Coordinates: ${latitude}, ${longitude}`);
                    needToGeocode = false;
                    // Set the suggestion selected flag to prevent geocoding
                    setSuggestionSelected(true);
                    suggestionSelected = true;
                }
            }

            // If we need to geocode the address
            if (needToGeocode) {
                alert('Please select a location from the suggestions dropdown');
                // Focus and show suggestions after a small delay
                setTimeout(() => {
                    addressInput.focus();
                    if (address.trim().length >= 3) {
                        showAddressSuggestions(currentSuggestions.length > 0 ? currentSuggestions :
                            fetchNominatim(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address.trim())}`, address.trim(), true));
                    }
                }, 50);
                return;
            }
        }

        // Now build the API URL with the coordinates (either from geocoding or directly provided)
        // console.log(`Building URL with coordinates: ${latitude}, ${longitude}`);
        // Create a date object using the selected year and current month/day
        const selectedYear = parseInt(year, 10);
        const today = new Date();
        const startDate = new Date(selectedYear, today.getMonth(), today.getDate());

        // Calculate end date (6 months from start date)
        const endDate = new Date(startDate);
        endDate.setMonth(endDate.getMonth() + 11); // range is 1 month, max is 11 with this approach (still fast & optimized)

        // Format dates as DD-MM-YYYY
        const formatDate = (date) => {
            const day = String(date.getDate()).padStart(2, '0');
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const year = date.getFullYear();
            return `${day}-${month}-${year}`;
        };

        const startDateStr = formatDate(startDate);
        const endDateStr = formatDate(endDate);

        apiUrl = `https://api.aladhan.com/v1/calendar/from/${startDateStr}/to/${endDateStr}?latitude=${latitude}&longitude=${longitude}&method=${calculationMethod}`;
        // console.log(`API URL: ${apiUrl}`);

        // Check if this is a duplicate request
        if (apiUrl === previousApiUrl) {
            // console.log(`Same API request detected: ${apiUrl}`);
            // console.log(`Previous API URL: ${previousApiUrl}`);
            // console.log("No new calculations or UI updates needed.");

            // Show equals sign for duplicate request
            updateButtonIcon(calculateBtn, 'equals', 1000, 'calculate');
            return;
        }

        // Proceed with API request
        // console.log(`New request detected. Previous URL: ${previousApiUrl || 'none'}`);
        console.log(`Proceeding with request to: ${apiUrl}`);
        clearError();

        const response = await fetch(apiUrl);
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`Failed to fetch prayer times: ${errorData?.data || "Unknown error occurred"}`);
        }

        const data = await response.json();

        // Save the prayer times data to window for debugging
        window.prayerTimesData = data;
        // console.log('Received prayer times data:', data);

        try {
            // Always try to add prayer times to calendar
            // The function will handle the case when calendar is not ready yet
            addPrayerTimesToCalendar(window.calendar, data);

            // If we have a valid response, store the data in localStorage
            if (data && data.code === 200) {
                localStorage.setItem('lastPrayerTimesData', JSON.stringify(data));
                // console.log('Prayer times data saved to localStorage');
            }
        } catch (error) {
            console.error('Error processing prayer times:', error);
        }

        previousApiUrl = apiUrl;

        exportBtn.classList.add('show');

        // Show checkmark for successful calculation
        updateButtonIcon(calculateBtn, 'checkmark', 1000, 'calculate');
    } catch (err) {
        showError(err instanceof Error ? err : new Error('An error occurred'));
    }
});