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

                    const event = {
                        id: `${userEvent.id}-${date}`, // Unique ID for each day
                        title: userEvent.name,
                        start: startPrayer.end, // Prayer end time (to not interfere with a prayer's event time (that isn't 0 mins))
                        end: endPrayer.start,
                        color: userEvent.group ? userEvent.group.color : 'green',
                        extendedProps: {
                            isPrayerInterval: true,
                            startPrayer: userEvent.end,
                            endPrayer: userEvent.start,
                            date: date,
                            group: userEvent.group ? userEvent.group.name : null
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
