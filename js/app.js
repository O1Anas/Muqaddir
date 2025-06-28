// DOM Elements
const gpsBtn = document.getElementById('gpsBtn');
const calculateBtn = document.getElementById('calculateBtn');
const downloadBtn = document.getElementById('downloadBtn');
const calculationMethodSelect = document.getElementById('calculationMethod');
const latitudeInput = document.getElementById('latitude');
const longitudeInput = document.getElementById('longitude');
const errorContainer = document.getElementById('errorContainer');
const yearInput = document.getElementById("year");
const addressInput = document.getElementById("address");

// Global state
let stats = null;
let chartData = null;
let previousApiUrl = null;

// Calculation methods mapping
const CALCULATION_METHODS = [
  { id: 'auto', name: 'Automatic' },
  { id: 1, name: "Karachi" },
  { id: 2, name: "North America (ISNA)" },
  { id: 3, name: "Muslim World League" },
  { id: 4, name: "Makkah" },
  { id: 5, name: "Egypt" },
  { id: 7, name: "Tehran" },
  { id: 8, name: "Gulf Region" },
  { id: 9, name: "Kuwait" },
  { id: 10, name: "Qatar" },
  { id: 11, name: "Singapore" },
  { id: 12, name: "France" },
  { id: 13, name: "Turkey" },
  { id: 14, name: "Russia" },
  { id: 15, name: "Moonsighting.com" },
  { id: 16, name: "Dubai" },
  { id: 17, name: "Malaysia (JAKIM)" },
  { id: 18, name: "Tunisia" },
  { id: 19, name: "Algeria" },
  { id: 20, name: "Indonesia" },
  { id: 21, name: "Morocco" },
  { id: 22, name: "Lisbon, Portugal" },
  { id: 23, name: "Jordan" }
];

// Download stats
const downloadStats = () => {
  if (!stats) return;
  const formattedStats = formatStatsForExport(stats);
  const blob = new Blob([JSON.stringify(formattedStats, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;

  const method = document.getElementById("calculationMethod")?.selectedOptions[0]?.text.replace(/\s+/g, "_") || "Unknown";
  const yearType = yearTypeSelect?.value === "1" ? "Hijri" : "Gregorian";
  const year = yearInput?.value || "";
  const lat = parseFloat(latitudeInput.value).toFixed(2);
  const long = parseFloat(longitudeInput.value).toFixed(2);

  a.download = `PS-stats-${method}-Lat_${lat}_Long_${long}_${yearType}_${year}.json`;
  a.click();
  URL.revokeObjectURL(url);
};

const showError = (error) => {
  if (!(error instanceof Error)) {
    error = new Error(error);
  }

  const stackLine = error.stack.split("\n").find(line => line.includes(".js"));
  const location = stackLine ? stackLine.match(/\((.*)\)/)?.[1] || stackLine.trim() : "unknown location";

  console.error(`${error.message} (at ${location})`);

  errorContainer.textContent = `${error.message} (at ${location})`;
  errorContainer.style.display = 'block';
  updateCalendarHeight();
};

const clearError = () => {
  errorContainer.textContent = '';
  errorContainer.style.display = 'none';
  updateCalendarHeight();
};

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
  storeHijriData();
  updatePlaceholder();

  // Initialize the suggestionSelected flag
  setSuggestionSelected(false);
  suggestionSelected = false;

  downloadBtn.addEventListener('click', downloadStats);

  // Set up address autocomplete
  const addressInput = document.getElementById('address');
  const suggestionsList = document.getElementById('addressSuggestions');

  // Add input event listener for autocomplete
  addressInput.addEventListener('input', async function() {
    const query = this.value.trim();

    // Reset the suggestion selected flag when the user types
    if (getSuggestionSelected()) {
      console.log('User is typing, resetting suggestion selected flag');
      setSuggestionSelected(false);
      suggestionSelected = false;
    }

    // Hide suggestions if input is too short
    if (query.length < 3) {
      suggestionsList.classList.remove('show');
      return;
    }

    // Skip if the query is the same as the last one
    if (query === lastInputValue) {
      return;
    }

    // Check if the query has changed significantly (more than just adding a character)
    const significantChange = !lastInputValue.startsWith(query) && !query.startsWith(lastInputValue);

    // If there's a significant change, clear the fetched queries set
    if (significantChange && fetchedQueries.size > 0) {
      console.log(`Query changed significantly, clearing fetched queries cache`);
      fetchedQueries.clear();
    }

    // Update the last input value
    lastInputValue = query;

    // Check if we already have suggestions that match the current input
    if (currentSuggestions.length > 0) {
      // Check if any current suggestion matches the new query
      const matchingSuggestions = currentSuggestions.filter(suggestion =>
        suggestion.display_name.toLowerCase().includes(query.toLowerCase())
      );

      if (matchingSuggestions.length > 0) {
        console.log(`Found ${matchingSuggestions.length} matching suggestions in current list`);
        showAddressSuggestions(matchingSuggestions);
        return;
      }
    }

    // If no matching suggestions or no current suggestions, fetch new ones
    try {
      const nominatimUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}`;
      fetchNominatim(nominatimUrl, query, true).then(suggestions => {
        if (query === lastInputValue) {
          showAddressSuggestions(suggestions);
          fetchedQueries.add(query);
        }
      });
    } catch (error) {}

  });

  // Add keyboard navigation for suggestions
  addressInput.addEventListener('keydown', handleSuggestionNavigation);

  // Hide suggestions when clicking outside (except for calculate button)
  document.addEventListener('click', function(event) {
    if ((event.target === calculateBtn || document.activeElement === calculateBtn) &&
        !getSuggestionSelected() && addressInput.value.trim().length >= 3) {
      return; // Keep suggestions visible when calculate button is clicked
    }

    if (!addressInput.contains(event.target) && !suggestionsList.contains(event.target)) {
      suggestionsList.classList.remove('show');
    }
  });

  // Hide suggestions when input loses focus (with exceptions)
  addressInput.addEventListener('blur', function() {
    setTimeout(() => {
      if (document.activeElement === calculateBtn ||
          suggestionsList.contains(document.activeElement) ||
          document.activeElement === addressInput) {
        return; // Keep suggestions visible in these cases
      }
      suggestionsList.classList.remove('show');
    }, 100);
  });

  // Show suggestions again when input is focused
  addressInput.addEventListener('focus', function() {
    const query = this.value.trim();

    // Show existing suggestions or fetch new ones
    if (currentSuggestions.length > 0) {
      showAddressSuggestions(currentSuggestions);
    } else if (query.length >= 3) {
      const nominatimUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}`;
      fetchNominatim(nominatimUrl, query, true).then(suggestions => {
        showAddressSuggestions(suggestions);
      }).catch(() => {});
    }
  });

  // Function to reposition dropdowns
  function repositionDropdowns() {
    const suggestionsList = document.getElementById('addressSuggestions');
    const dropdown = document.getElementById('locationDropdown');
    const addressRect = addressInput.getBoundingClientRect();

    // Get the exact width of the address input
    const exactWidth = addressInput.offsetWidth;

    if (suggestionsList.classList.contains('show')) {
      suggestionsList.style.top = (addressRect.bottom + window.scrollY) + 'px';
      suggestionsList.style.width = exactWidth + 'px';
      suggestionsList.style.left = addressRect.left + 'px';
    }

    if (dropdown.classList.contains('show')) {
      dropdown.style.top = (addressRect.bottom + window.scrollY) + 'px';
      dropdown.style.width = exactWidth + 'px';
      dropdown.style.left = addressRect.left + 'px';
    }
  }

  // Reposition dropdowns when window is resized
  window.addEventListener('resize', repositionDropdowns);

  // Reposition dropdowns when page is scrolled
  window.addEventListener('scroll', repositionDropdowns);
});
