// User Events Parser
class UserEventsParser {
    constructor() {
        this.calendar = null;
    }

    // Generate events between prayer times
    generatePrayerIntervalEvents() {
        try {
            const calendarEvents = JSON.parse(localStorage.getItem('calendarEvents')) || [];
            const prayerIntervals = [];

            // Find prayer events
            const prayerEvents = calendarEvents.filter(event => 
                event.extendedProps?.isPrayerTime
            );

            // Sort prayer events by start time
            prayerEvents.sort((a, b) => new Date(a.start) - new Date(b.start));

            // Create intervals between prayers
            for (let i = 0; i < prayerEvents.length - 1; i++) {
                const currentPrayer = prayerEvents[i];
                const nextPrayer = prayerEvents[i + 1];

                // Create event title (e.g., "Fajr to Sunrise")
                const title = `${currentPrayer.title} to ${nextPrayer.title}`;
                
                // Create interval event
                prayerIntervals.push({
                    title,
                    start: currentPrayer.end,
                    end: nextPrayer.start,
                    color: '#FFD700', // Gold color for intervals
                    extendedProps: {
                        isPrayerInterval: true,
                        startPrayer: currentPrayer.title,
                        endPrayer: nextPrayer.title
                    }
                });
            }

            return prayerIntervals;
        } catch (error) {
            console.error('Error generating prayer intervals:', error);
            return [];
        }
    }

    // Add events to calendar
    addEventsToCalendar(calendar) {
        if (!calendar) {
            console.error('Error: Calendar not initialized');
            return;
        }

        // Remove existing events
        calendar.removeAllEvents();

        // Get all events including prayer intervals
        const allEvents = [...window.getAllEventsData(), ...this.generatePrayerIntervalEvents()];

        // Add all events
        allEvents.forEach(event => {
            if (!event.title || !event.start) return;

            const eventObj = {
                id: event.id || Date.now() + Math.random(),
                title: event.title,
                start: event.start,
                end: event.end,
                color: event.color || 'green',
                backgroundColor: event.color || 'green',
                extendedProps: event.extendedProps || {}
            };

            calendar.addEvent(eventObj);
        });
    }
}

// Expose a single instance globally
window.userEventsParser = new UserEventsParser();


const saveEventsBtn = document.getElementById('saveEventsBtn');
saveEventsBtn.addEventListener('click', () => {
    window.userEventsParser.addEventsToCalendar(window.calendar);
});

