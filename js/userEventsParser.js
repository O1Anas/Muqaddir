// User Events Parser
class UserEventsParser {
    constructor() {
        this.calendar = null;
    }

    // Create events based on user-defined prayer intervals
    createPrayerIntervalEvents(userEvents) {
        try {
            const calendarEvents = JSON.parse(localStorage.getItem('calendarEvents')) || [];
            
            // Filter prayer events
            const prayerEvents = calendarEvents.filter(event => 
                event.extendedProps?.isPrayerTime
            );

            // Create a lookup map of prayer names to their times for all days
            const prayerTimesMap = new Map();
            prayerEvents.forEach(event => {
                // Get the date of this prayer event
                const eventDate = new Date(event.start).toISOString().split('T')[0];
                
                // Create a nested map structure: date -> prayer name -> times
                if (!prayerTimesMap.has(eventDate)) {
                    prayerTimesMap.set(eventDate, {});
                }
                
                prayerTimesMap.get(eventDate)[event.title] = {
                    start: event.start,
                    end: event.end
                };
            });

            // Convert user events to actual calendar events for all days 
            const resultingEvents = [];
            
            // For each day in the prayer times map
            prayerTimesMap.forEach((prayerTimes, date) => {
                
                userEvents.forEach(userEvent => {
                    
                    const startPrayer = prayerTimes[userEvent.start];
                    const endPrayer = prayerTimes[userEvent.end];

                    if (!startPrayer || !endPrayer) {
                        // console.warn(`Skipping event ${userEvent.name}: Prayer time not found for ${userEvent.start} or ${userEvent.end} on ${date}`);
                        return;
                    }

                    // Helper function to adjust time based on adjustment type and value
                const adjustTime = (time, adjustmentType, offsetValue) => {
                    if (!time || !adjustmentType || !offsetValue) return time;
                    
                    const minutes = parseInt(offsetValue, 10);
                    if (isNaN(minutes)) return time;
                    
                    const result = new Date(time);
                    
                    if (adjustmentType === '+duration') {
                        result.setMinutes(result.getMinutes() + minutes);
                    } else if (adjustmentType === '-duration') {
                        result.setMinutes(result.getMinutes() - minutes);
                    }
                    
                    return result;
                };

                // For start time:
                // - If offset is '0', always use startPrayer.end
                // - If offset is not '0' and adjustment is '-duration', use startPrayer.start
                // - Otherwise, use startPrayer.end
                const startBaseTime = (userEvent.startOffsetValue === '0' || userEvent.startAdjustmentType !== '-duration') 
                    ? startPrayer.end 
                    : startPrayer.start;
                
                // For end time:
                // - If offset is not '0' and adjustment is '+duration', use endPrayer.end
                // - Otherwise, use endPrayer.start
                const endBaseTime = (userEvent.endOffsetValue !== '0' && userEvent.endAdjustmentType === '+duration')
                    ? endPrayer.end
                    : endPrayer.start;
                
                const adjustedStart = adjustTime(
                    startBaseTime,
                    userEvent.startAdjustmentType,
                    userEvent.startOffsetValue
                );
                
                const adjustedEnd = adjustTime(
                    endBaseTime,
                    userEvent.endAdjustmentType,
                    userEvent.endOffsetValue
                );

                const event = {
                    id: `${userEvent.id}-${date}`, // Unique ID for each day
                    title: userEvent.name,
                    start: adjustedStart,
                    end: adjustedEnd,
                    color: userEvent.group ? userEvent.group.color : 'green',
                    extendedProps: {
                        isPrayerInterval: true,
                        startPrayer: userEvent.end,
                        endPrayer: userEvent.start,
                        date: date,
                        group: userEvent.group ? userEvent.group.name : null,
                        startAdjustment: userEvent.startAdjustmentType,
                        startOffset: userEvent.startOffsetValue,
                        endAdjustment: userEvent.endAdjustmentType,
                        endOffset: userEvent.endOffsetValue
                    }
                };
                    resultingEvents.push(event);
                });
            });

            return resultingEvents;
        } catch (error) {
            console.error('Error creating prayer interval events:', error);
            return [];
        }
    }

    // Add events to calendar
    addEventsToCalendar(calendar) {
        if (!calendar) {
            console.error('Error: Calendar not initialized');
            return;
        }

        // Get user-defined events
        const userEvents = window.getAllEventsData();
        
        const prayerIntervalEvents = this.createPrayerIntervalEvents(userEvents);

        // Remove existing prayer-anchored events
        const existingEvents = calendar.getEvents();
        existingEvents.forEach(event => {
            if (event.extendedProps?.isPrayerInterval) {
                event.remove();
            }
        });

        // Add prayer interval events
        prayerIntervalEvents.forEach(event => {
            if (!event.title || !event.start) return;
            
            calendar.addEvent({
                id: event.id,
                title: event.title,
                start: event.start,
                end: event.end,
                color: event.color,
                backgroundColor: event.color,
                extendedProps: event.extendedProps
            });
        });
    }
}

// Expose a single instance globally
window.userEventsParser = new UserEventsParser();


const saveEventsBtn = document.getElementById('saveEventsBtn');
saveEventsBtn.addEventListener('click', () => {
    window.userEventsParser.addEventsToCalendar(window.calendar);
});
