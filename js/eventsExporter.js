// Events exporter module for handling calendar event exports

/**
 * Sanitizes a string to be used as a filename
 * @param {string} str - The string to sanitize
 * @returns {string} Sanitized string
 */
function sanitizeFilename(str) {
    return str.replace(/[^a-zA-Z0-9\-_]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
}

/**
 * Creates and downloads an ICS file for a group of events
 * @param {string} groupName - Name of the group
 * @param {Array} events - Array of events to include in the ICS
 */
function createAndDownloadICS(groupName, events) {
    console.log(`Creating ICS file for group: ${groupName} with ${events.length} events`);
    
    const ical = new ICAL.Component('vcalendar');
    
    events.forEach((event, index) => {
        console.log(`Processing event ${index + 1}/${events.length}: ${event.title}`);
        const vevent = new ICAL.Component('vevent');
        
        // Add required properties
        vevent.addPropertyWithValue('summary', event.title);
        
        // Format dates as ISO strings
        const start = event.start instanceof Date ? event.start.toISOString() : event.start;
        vevent.addPropertyWithValue('dtstart', start);
        
        if (event.end) {
            const end = event.end instanceof Date ? event.end.toISOString() : event.end;
            vevent.addPropertyWithValue('dtend', end);
        }
        
        // Add optional properties
        if (event.location) {
            vevent.addPropertyWithValue('location', event.location);
        }
        
        if (event.description) {
            vevent.addPropertyWithValue('description', event.description);
        }
        
        ical.addSubcomponent(vevent);
    });
    
    // Generate the ICS file
    const icsData = ical.toString();
    const blob = new Blob([icsData], { type: 'text/calendar;charset=utf-8' });
    const url = window.URL.createObjectURL(blob);
    
    // Create a temporary link and trigger download
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    a.download = `${sanitizeFilename(groupName)}.ics`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
    
    console.log(`Successfully created ICS file for group: ${groupName}`);
}

async function exportEventsToICS(calendar) {
    if (!calendar) {
        console.error('No calendar instance provided');
        return 0;
    }
    
    console.log('Starting event export process...');
    const events = calendar.getEvents();
    console.log(`Found ${events.length} total events to process`);
    
    // Separate prayer events from other events
    const prayerEvents = [];
    const otherEvents = [];
    
    events.forEach(event => {
        if (event.extendedProps?.group === 'prayer') {
            prayerEvents.push(event);
        } else {
            otherEvents.push(event);
        }
    });
    
    let filesCreated = 0;
    
    // Process prayer events first
    if (prayerEvents.length > 0) {
        console.log(`Found ${prayerEvents.length} prayer events, exporting to prayers.ics`);
        createAndDownloadICS('prayer-events', prayerEvents);
        filesCreated++;
    } else {
        console.log('No prayer events found');
    }
    
    // Group remaining events by their group.name in extendedProps, or by title if no group
    const groupedEvents = {};
    
    otherEvents.forEach((event, index) => {
        console.log(`Processing non-prayer event ${index + 1}/${otherEvents.length}: ${event.title}`);
        
        // Check for group in extendedProps (could be direct string or object with name property)
        let groupName = event.extendedProps?.group;
        
        // If group is an object, get the name property
        if (groupName && typeof groupName === 'object') {
            groupName = groupName.name;
        }
        
        // If no group name, use the event title as the group
        if (!groupName) {
            groupName = event.title || 'ungrouped';
            console.log(`No group found for event '${event.title}', using title as group name`);
        } else {
            console.log(`Found group '${groupName}' for event '${event.title}'`);
        }
        
        // Initialize group if it doesn't exist
        if (!groupedEvents[groupName]) {
            console.log(`Creating new group: ${groupName}`);
            groupedEvents[groupName] = [];
        }
        
        groupedEvents[groupName].push(event);
    });
    
    console.log(`Grouped remaining events into ${Object.keys(groupedEvents).length} groups`);
    console.log('Group names:', Object.keys(groupedEvents));
    
    // Create a separate ICS file for each remaining group
    Object.entries(groupedEvents).forEach(([groupName, groupEvents]) => {
        console.log(`Processing group '${groupName}' with ${groupEvents.length} events`);
        createAndDownloadICS(groupName, groupEvents);
    });
    
    filesCreated += Object.keys(groupedEvents).length;
    console.log('Event export process completed');
    return filesCreated; // Return total number of files created
}

// Make the function globally available
window.exportEventsToICS = exportEventsToICS;

// Add click handler to existing export button
if (typeof exportBtn !== 'undefined') {
    exportBtn.addEventListener('click', async () => {
        console.log('Export button clicked, starting export process...');
        try {
            updateButtonIcon(exportBtn, 'loading');
            const filesCreated = await exportEventsToICS(calendar);
            console.log(`Successfully created ${filesCreated} ICS files`);
            updateButtonIcon(exportBtn, 'checkmark', 1000, 'download');
        } catch (error) {
            console.error('Error during export:', error);
            updateButtonIcon(exportBtn, 'error', 2000, 'download');
        }
    });
} else {
    console.warn('Export button not found. exportBtn is not defined.');
}