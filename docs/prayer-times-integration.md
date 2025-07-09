# Prayer Times Integration with FullCalendar - Development Plan

## 1. File Structure Updates

### New Files:
1. `js/prayerTimesParser.js` - Main logic for prayer times calendar integration
2. `js/icsExporter.js` - Handles exporting events to .ics format
3. `css/prayer-times.css` - Styles for prayer times controls
4. `test/prayerTimes.test.js` - Unit tests for prayer times functionality

### Modified Files:
1. `index.html` - Add new script and stylesheet references
2. `js/calendar.js` - Update to integrate with prayer times
3. `js/sidebar.js` - Add prayer times section to sidebar
4. `css/sidebar.css` - Add styles for prayer times controls

## 2. Implementation Phases

### Phase 1: Core Integration (2-3 days)
1. **Create `prayerTimesParser.js`**:
   - [x] Add function to fetch prayer times from Aladhan API
   - Transform prayer times into FullCalendar events
   - Add events to calendar with default colors
   - Implement basic error handling

2. **Update `calendar.js`**:
   - Initialize prayer times when calendar loads
   - Add event sources for prayer times
   - Handle calendar view changes to update prayer times

3. **Add basic UI controls**:
   - Create prayer times section in sidebar
   - Add toggle switches for each prayer
   - Add color pickers for each prayer

### Phase 2: User Preferences (1-2 days)
1. **Implement local storage**:
   - Save prayer visibility states
   - Save color preferences
   - Load preferences on page load

2. **Enhance UI**:
   - Add prayer icons
   - Style prayer time items
   - Add tooltips for better UX

### Phase 3: Export Functionality (1 day)
1. **Create `icsExporter.js`**:
   - Generate .ics file for prayer times
   - Handle recurring events for daily prayers
   - Add export button and handler

2. **Add export UI**:
   - Add export button to prayer times section
   - Add options for export range (day/week/month/year)
   - Add success/error feedback

### Phase 4: Testing & Polish (1-2 days)
1. **Write unit tests**:
   - Test prayer time fetching and transformation
   - Test calendar event creation
   - Test export functionality

2. **Cross-browser testing**:
   - Test in Chrome, Firefox, Safari, Edge
   - Test on mobile devices
   - Test with different timezones

3. **Performance optimization**:
   - Optimize event rendering
   - Implement debouncing for rapid view changes
   - Cache prayer times where appropriate

## 3. Implementation Details

### Prayer Times Calendar Integration
```javascript
// Prayer time event source for FullCalendar
async function getPrayerTimeEvents(fetchInfo, successCallback, failureCallback) {
  try {
    const response = await fetch(/* Aladhan API URL with params */);
    const data = await response.json();
    const events = transformPrayerTimesToEvents(data.data.timings);
    successCallback(events);
  } catch (error) {
    console.error('Error fetching prayer times:', error);
    failureCallback(error);
  }
}

function transformPrayerTimesToEvents(timings) {
  // Convert prayer times to FullCalendar events
  return Object.entries(timings).map(([prayer, time]) => ({
    title: prayer,
    start: `TODAY ${time}`,
    allDay: false,
    color: getPrayerColor(prayer),
    extendedProps: {
      prayer: true
    }
  }));
}
```

### Calendar Integration
```javascript
document.addEventListener('DOMContentLoaded', function() {
  // ... existing code ...
  
  const calendar = new FullCalendar.Calendar(calendarEl, {
    // ... existing config ...
    eventSources: [
      {
        events: getPrayerTimeEvents
      }
      // other event sources...
    ]
  });

  window.calendar = calendar; // Make calendar globally available
});
```

### Prayer Times UI
```html
<!-- Add to sidebar div in index.html -->
<div class="prayer-times-section">
  <h3>Prayer Times</h3>
  <div class="prayer-times-list" id="prayerTimesList">
    <!-- Dynamically populated -->
  </div>
  <button id="exportPrayerTimes" class="export-btn">Export to Calendar</button>
</div>
```

### ICS Export Functionality
```javascript
function exportPrayerTimesToIcs(prayerTimes, range = 'month') {
  // Create calendar component
  const cal = ical();
  
  // Add prayer events
  prayerTimes.forEach(prayer => {
    cal.createEvent({
      start: prayer.start,
      end: prayer.end,
      summary: prayer.title,
      description: `Prayer Time: ${prayer.title}`
    });
  });
  
  // Trigger download
  const blob = new Blob([cal.toString()], { type: 'text/calendar' });
  // ... download logic
}
```

## 4. Testing Strategy

### Unit Tests:
1. **Prayer time transformation**
   - Test date parsing
   - Test event creation
   - Test timezone handling

2. **Calendar integration**
   - Test event source
   - Test view changes
   - Test event rendering

3. **Export functionality**
   - Test .ics generation
   - Test download behavior
   - Test with different date ranges

### Manual Testing:
1. Verify prayer times accuracy
2. Test UI interactions
3. Test across different devices and screen sizes

## 5. Implementation Order

1. Start with `prayerTimesParser.js` and basic calendar integration
2. Add sidebar UI for prayer times
3. Implement user preferences
4. Add export functionality
5. Write tests and polish

---

*Last updated: June 30, 2025*
