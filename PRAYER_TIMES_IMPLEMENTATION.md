# Prayer Times Implementation

This document describes the logic and functionality of the prayer times implementation in the application, focusing on two main files:

## 1. prayerTimesParser.js

### Overview
This file handles the parsing of prayer times data from the Aladhan API and transforms it into FullCalendar events.

### Key Components

#### Constants
- `allowedPrayerEvents`: Array of prayer event names that will be processed
- `DEFAULT_PRAYER_EVENT_SETTINGS`: Default configuration for each prayer time including color, duration, and enabled status

#### Core Functions

1. **getPrayerSettings()**
   - Retrieves prayer settings from localStorage
   - Falls back to default settings if no saved settings exist
   - Handles errors gracefully by returning defaults

2. **parsePrayerDate(dateStr)**
   - Converts date strings from Aladhan API format (e.g., "01 Jan 2025") to JavaScript Date objects

3. **parsePrayerTime(timeStr)**
   - Parses time strings from Aladhan API (e.g., "06:43 (CET)")
   - Returns an array of [hours, minutes]

4. **transformPrayerTimesToEvents(prayerData)**
   - Converts raw prayer times data into FullCalendar event objects
   - Processes each day's prayer times
   - Applies prayer-specific settings (color, duration)
   - Filters out non-essential prayer times
   - Handles timezone information

5. **addPrayerTimesToCalendar(calendar, prayerData)**
   - Main function to add prayer times to the calendar
   - Removes existing prayer events before adding new ones
   - Processes events in batches for better performance
   - Updates event display properties based on current settings
   - Handles calendar refresh

6. **onCalendarReady(calendar)**
   - Initialization function called when the calendar is ready
   - Processes any pending prayer data
   - Loads saved prayer times from localStorage if available
   - Makes the calendar instance globally available

## 2. prayerEventControls.js

### Overview
This file manages the user interface and settings for prayer time events, including display preferences and interactions.

### Key Components

#### Core Functions

1. **loadPrayerSettings()**
   - Loads saved prayer settings from localStorage
   - Merges with default settings to ensure all properties exist
   - Handles errors by returning default settings

2. **savePrayerSettings()**
   - Saves current prayer settings to localStorage
   - Updates the UI to reflect changes
   - Handles error cases

3. **createPrayerControlHTML(prayer, settings)**
   - Generates HTML for a single prayer control
   - Includes prayer name, duration input, and styling
   - Respects enabled/disabled state

4. **initializePrayerControls()**
   - Sets up the prayer controls interface
   - Loads and applies saved settings to the UI
   - Updates visual state based on settings

5. **togglePrayerEnabled(prayerName)**
   - Toggles the enabled/disabled state of a prayer
   - Updates the UI and saves changes

6. **initPrayerControls()**
   - Sets up event listeners for prayer controls
   - Handles user interactions with prayer settings

7. **updatePrayerEventsInCalendar()**
   - Refreshes prayer events in the calendar
   - Applies current settings to all prayer events
   - Maintains scroll position during updates

### Event Handling
- Click events on prayer names to toggle enabled/disabled state
- Change events on duration inputs to update settings
- Save button click handler to persist changes

### State Management
- Tracks unsaved changes
- Maintains UI state based on prayer settings
- Handles persistence to localStorage

## Integration
- Both files work together to provide a complete prayer times solution
- `prayerTimesParser.js` handles data transformation and calendar integration
- `prayerEventControls.js` manages user preferences and UI interactions
- Communication between the two is primarily through:
  - `localStorage` for settings
  - Global functions and variables
  - The FullCalendar instance

## Data Flow
1. Prayer times data is fetched from Aladhan API
2. `prayerTimesParser.js` processes and transforms the data
3. Prayer times are displayed as events in FullCalendar
4. Users can modify settings through the UI controls
5. Changes are saved and immediately reflected in the calendar

## Error Handling
- Both files include error handling for:
  - Missing or invalid data
  - localStorage operations
  - Calendar interactions
- Fallback to default settings when errors occur
- Console logging for debugging purposes
