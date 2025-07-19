// Events exporter module for handling calendar event exports

/**
 * Sanitizes a string to be used as a filename
 * @param {string} str - The string to sanitize
 * @returns {string} Sanitized string
 */
function sanitizeFilename(str) {
    // Allow Arabic letters (Unicode range \u0600-\u06FF) and basic filename-safe characters
    return str.replace(/[^\u0600-\u06FFa-zA-Z0-9\-_\. ]/g, '-')
              .replace(/-+/g, '-')
              .replace(/^-|-$/g, '')
              .trim();
}

/**
 * Creates and downloads an ICS file for a group of events
 * @param {string} groupName - Name of the group
 * @param {Array} events - Array of events to include in the ICS
 */
function createAndDownloadICS(groupName, events) {
    // console.log(`Creating ICS file for group: ${groupName} with ${events.length} events`);

    const ical = new ICAL.Component('vcalendar');

    // --- Key Fix: Robust Date Handling --- //

    // Helper to convert any input into a Date object using local time
    const toLocalDate = (dateInput) => {
        if (dateInput instanceof Date) {
            return dateInput;
        }
        return new Date(dateInput);
    };

    // Helper to format date as YYYY-MM-DDTHH:mm:ss (ICAL format, local time)
    const formatLocalDateTime = (date) => {
        const pad = n => n < 10 ? '0' + n : n;
        return date.getFullYear() + '-' +
               pad(date.getMonth() + 1) + '-' +
               pad(date.getDate()) + 'T' +
               pad(date.getHours()) + ':' +
               pad(date.getMinutes()) + ':' +
               pad(date.getSeconds());
    };

    // Helper to check if a date is the day before another (using local time)
    const isPreviousDay = (current, previous) => {
        const currentDay = new Date(current);
        currentDay.setHours(0, 0, 0, 0);
        
        const previousDay = new Date(previous);
        previousDay.setHours(0, 0, 0, 0);
        
        const oneDayInMs = 24 * 60 * 60 * 1000;
        return currentDay.getTime() - previousDay.getTime() === oneDayInMs;
    };

    // --- End of Fix --- //

    // Sort events by start time
    const sortedEvents = [...events].sort((a, b) => {
        return toLocalDate(a.start).getTime() - toLocalDate(b.start).getTime();
    });

    sortedEvents.forEach((event, index) => {
        // console.log(`[Event ${index}] Processing: "${event.title}"`);
        const vevent = new ICAL.Component('vevent');

        const start = toLocalDate(event.start);
        const end = event.end ? toLocalDate(event.end) : null;

        vevent.addPropertyWithValue('summary', event.title);
        // Use local time without timezone
        vevent.addPropertyWithValue('dtstart', formatLocalDateTime(start));
        if (end) {
            vevent.addPropertyWithValue('dtend', formatLocalDateTime(end));
        }

        if (event.location) {
            vevent.addPropertyWithValue('location', event.location);
        }

        let descriptionLines = [];
        if (event.description) {
            descriptionLines.push(event.description);
        }

        if (start && end) {
            const durationMs = end.getTime() - start.getTime();
            const durationHours = Math.floor(durationMs / (1000 * 60 * 60));
            const durationMinutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));

            let durationStr = '';
            if (durationHours > 0) {
                durationStr = `${durationHours}hr${durationHours !== 1 ? 's' : ''}`;
                if (durationMinutes > 0) {
                    durationStr += `${durationMinutes}min${durationMinutes !== 1 ? 's' : ''}`;
                }
            } else if (durationMinutes > 0) {
                durationStr = `${durationMinutes}min${durationMinutes !== 1 ? 's' : ''}`;
            } else {
                durationStr = '';
            }
            descriptionLines.push(`${durationStr}`);

            if (index > 0) {
                const prevEvent = sortedEvents[index - 1];
                const prevEventStart = toLocalDate(prevEvent.start);

                // console.log(`  - Comparing with Prev Event: "${prevEvent.title}"`);
                // console.log(`  - Prev Start:    ${prevEventStart}`);

                const titleMatch = prevEvent.title === event.title;
                const isPrevDay = isPreviousDay(start, prevEventStart);
                // console.log(`  - Title Match: ${titleMatch}, Is Previous Day: ${isPrevDay}`);

                if (titleMatch && isPrevDay) {
                    // console.log('    Match found! Calculating duration change.');
                    const prevEventEnd = toLocalDate(prevEvent.end);
                    const prevDurationMs = prevEventEnd.getTime() - prevEventStart.getTime();
                    const durationChangeMs = durationMs - prevDurationMs;

                    if (Math.abs(durationChangeMs) >= 60000) {
                        const changeMinutes = Math.round(durationChangeMs / (1000 * 60));
                        const direction = changeMinutes > 0 ? '+' : '-';
                        const absChange = Math.abs(changeMinutes);
                        const timeUnit = absChange === 1 ? 'min' : 'mins';
                        const changeLine = `${direction}${absChange}${timeUnit}`;
                        descriptionLines.push(changeLine);
                        // console.log(`    - Appending to description: "${changeLine}"`);
                    } else {
                        // console.log('    - Duration change is less than 1 minute, not adding line.');
                    }
                }
            }
        }

        if (descriptionLines.length > 0) {
            vevent.addPropertyWithValue('description', descriptionLines.join('\n'));
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
    
    // console.log(`Successfully created ICS file for group: ${groupName}`);
}

async function exportEventsToICS(calendar) {
    if (!calendar) {
        console.error('No calendar instance provided');
        return 0;
    }
    
    // Ask user if they want to export prayer times in Arabic
    const useArabic = confirm('Would you like to export prayer times in Arabic?\n\nClick OK for Arabic (e.g., "صَلاة الفَجر"), or Cancel for English (e.g., "Fajr").');
    // console.log('Starting event export process...');
    const events = calendar.getEvents();
    console.log('events from eventsExporter.js', events);
    console.log(`Found ${events.length} total events to process`);
    
    // Separate prayer events from other events
    const prayerEvents = [];
    const otherEvents = [];
    
    events.forEach(event => {
        if (event.extendedProps?.isPrayerTime) {
            // Create a copy of the event with only the properties we need
            const prayerEvent = {
                title: event.title,
                start: event.start,
                end: event.end,
                backgroundColor: event.backgroundColor,
                borderColor: event.borderColor,
                textColor: event.textColor,
                extendedProps: { ...event.extendedProps }
            };
            
            // If user wants Arabic, update the prayer names
            if (useArabic) {
                console.log('Prayer event object:', prayerEvent);
                console.log('Prayer event title:', prayerEvent.title);
                
                // Use prayerName from extendedProps if title is not available
                const prayerName = (prayerEvent.title || prayerEvent.extendedProps?.prayerName || '').toLowerCase();
                let arabicName = '';
                
                // Map English prayer names to Arabic
                switch(prayerName) { 
                    case 'fajr':
                        arabicName = 'Fajr - صَلاة الفَجر';
                        break;
                    case 'dhuhr':
                        arabicName = 'Dhuhr - صَلاة الظُّهر';
                        break;
                    case 'asr':
                        arabicName = 'Asr - صَلاة العَصر';
                        break;
                    case 'maghrib':
                        arabicName = 'Maghrib - صَلاة المَغرِب';
                        break;
                    case 'isha':
                        arabicName = 'Isha - صَلاة العِشاء';
                        break;
                    case 'sunrise':
                        arabicName = 'Sunrise - الشُّروق';
                        break;
                    default:
                        arabicName = prayerEvent.title; // Keep original if not matched
                }
                
                prayerEvent.title = arabicName;
            }
            
            prayerEvents.push(prayerEvent);
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
        // console.log(`Processing non-prayer event ${index + 1}/${otherEvents.length}: ${event.title}`);
        
        // Check for group in extendedProps (could be direct string or object with name property)
        let groupName = event.extendedProps?.group;
        
        // If group is an object, get the name property
        if (groupName && typeof groupName === 'object') {
            groupName = groupName.name;
        }
        
        // If no group name, use the event title as the group
        if (!groupName) {
            groupName = event.title || 'ungrouped';
            // console.log(`No group found for event '${event.title}', using title as group name`);
        } else {
            // console.log(`Found group '${groupName}' for event '${event.title}'`);
        }
        
        // Initialize group if it doesn't exist
        if (!groupedEvents[groupName]) {
            // console.log(`Creating new group: ${groupName}`);
            groupedEvents[groupName] = [];
        }
        
        groupedEvents[groupName].push(event);
    });
    
    // console.log(`Grouped remaining events into ${Object.keys(groupedEvents).length} groups`);
    // console.log('Group names:', Object.keys(groupedEvents));
    
    // Create a separate ICS file for each remaining group
    Object.entries(groupedEvents).forEach(([groupName, groupEvents]) => {
        // console.log(`Processing group '${groupName}' with ${groupEvents.length} events`);
        createAndDownloadICS(groupName, groupEvents);
    });
    
    filesCreated += Object.keys(groupedEvents).length;
    // console.log('Event export process completed');
    return filesCreated; // Return total number of files created
}

// Make the function globally available
window.exportEventsToICS = exportEventsToICS;

// Add click handler to existing export button
if (typeof exportBtn !== 'undefined') {
    exportBtn.addEventListener('click', async () => {
        // console.log('Export button clicked, starting export process...');
        try {
            updateButtonIcon(exportBtn, 'loading');
            const filesCreated = await exportEventsToICS(calendar);
            // console.log(`Successfully created ${filesCreated} ICS files`);
            updateButtonIcon(exportBtn, 'checkmark', 1000, 'download');
        } catch (error) {
            console.error('Error during export:', error);
            updateButtonIcon(exportBtn, 'error', 2000, 'download');
        }
    });
} else {
    console.warn('Export button not found. exportBtn is not defined.');
}