// Default prayer settings will be loaded from prayerEventControls.js

class PrayerTimesParser {
    constructor() {
        this.allowedPrayerEvents = [// 'Imsak', 'Sunset',
            'Fajr', 'Sunrise', 'Dhuhr', 'Asr',
            'Maghrib', 'Isha', 'Firstthird', 'Midnight', 'Lastthird'
        ];

        this.DEFAULT_PRAYER_EVENT_SETTINGS = {
            // Imsak: { color: '#4A6FA5', duration: 5, enabled: false },
            Fajr: { color: '#4A6FA5', duration: 30, enabled: true },
            Sunrise: { color: '#4A6FA5', duration: 5, enabled: true },
            Dhuhr: { color: '#4A6FA5', duration: 30, enabled: true },
            Asr: { color: '#4A6FA5', duration: 30, enabled: true },
            // Sunset: { color: '#4A6FA5', duration: 5, enabled: false },
            Maghrib: { color: '#4A6FA5', duration: 30, enabled: true },
            Isha: { color: '#4A6FA5', duration: 30, enabled: true },
            Firstthird: { color: '#4A6FA5', duration: 5, enabled: false },
            Midnight: { color: '#4A6FA5', duration: 5, enabled: false },
            Lastthird: { color: '#4A6FA5', duration: 5, enabled: false }
        };

        this.pendingPrayerData = null;
        this.calendar = null;
    }

    getPrayerSettings() {
        try {
            const savedSettings = localStorage.getItem('prayerSettings');
            if (savedSettings) {
                const parsedSettings = JSON.parse(savedSettings);
                // Create a deep copy of default settings
                const mergedSettings = JSON.parse(JSON.stringify(this.DEFAULT_PRAYER_EVENT_SETTINGS));
                
                // Merge saved settings on top of defaults
                Object.keys(parsedSettings).forEach(prayer => {
                    if (mergedSettings[prayer]) {
                        mergedSettings[prayer] = {
                            ...mergedSettings[prayer],
                            ...parsedSettings[prayer]
                        };
                    } else {
                        mergedSettings[prayer] = parsedSettings[prayer];
                    }
                });
                
                return mergedSettings;
            }
        } catch (e) {
            console.error('Error loading prayer settings, falling back to defaults:', e);
        }
        // Return a deep copy of default settings
        return JSON.parse(JSON.stringify(this.DEFAULT_PRAYER_EVENT_SETTINGS));
    }

    parsePrayerDate(dateStr) {
        const months = {
            'Jan': 0, 'Feb': 1, 'Mar': 2, 'Apr': 3, 'May': 4, 'Jun': 5,
            'Jul': 6, 'Aug': 7, 'Sep': 8, 'Oct': 9, 'Nov': 10, 'Dec': 11
        };
        const [day, month, year] = dateStr.split(' ');
        return new Date(year, months[month], parseInt(day));
    }

    parsePrayerTime(timeStr) {
        const timeMatch = timeStr.match(/^(\d{1,2}):(\d{2})/);
        return timeMatch ? [parseInt(timeMatch[1]), parseInt(timeMatch[2])] : null;
    }

    transformPrayerTimesToEvents(prayerData) {
        if (!prayerData?.data || !Array.isArray(prayerData.data)) {
            console.error('Invalid prayer data format:', prayerData);
            return [];
        }

        const prayerSettings = this.getPrayerSettings();
        const events = [];

        prayerData.data.forEach(dayData => {
            if (!dayData?.timings || !dayData.date?.readable) {
                console.warn('Skipping day - missing timings or date:', dayData);
                return;
            }

            const date = this.parsePrayerDate(dayData.date.readable);

            Object.entries(dayData.timings).forEach(([prayerName, timeStr]) => {
                const cleanPrayerName = prayerName.split('(')[0].trim();
                
                // Skip if not in allowed prayers
                if (!this.allowedPrayerEvents.includes(cleanPrayerName)) {
                    return;
                }
                
                // Get settings with fallback to defaults
                const settings = prayerSettings[cleanPrayerName] || this.DEFAULT_PRAYER_EVENT_SETTINGS[cleanPrayerName];
                
                // Skip if prayer is not enabled
                if (!settings || !settings.enabled) {
                    return;
                }

                const time = this.parsePrayerTime(timeStr);
                if (!time) return;

                const [hours, minutes] = time;
                const start = new Date(date);
                start.setHours(hours, minutes, 0, 0);

                // Use duration from settings with fallback to default
                const duration = settings.duration || 30;
                const end = new Date(start);
                end.setMinutes(start.getMinutes() + duration);

                // Ensure we have a valid color
                const color = settings.color || this.DEFAULT_PRAYER_EVENT_SETTINGS[cleanPrayerName]?.color || '#4A6FA5';

                events.push({
                    title: cleanPrayerName,
                    start,
                    end,
                    allDay: false,
                    color: color,
                    backgroundColor: color,
                    textColor: '#FFFFFF',
                    borderColor: 'rgba(255, 255, 255, 0.5)',
                    extendedProps: {
                        isPrayerTime: true,
                        prayerName: cleanPrayerName,
                        group: 'prayers'
                    }
                });
            });
        });

        console.log(`Generated ${events.length} prayer time events`);
        return events;
    }

    addPrayerTimesToCalendar(prayerData) {
        if (!this.calendar) {
            console.warn('Calendar not ready, storing prayer data for later.');
            this.pendingPrayerData = prayerData;
            return;
        }

        if (!prayerData) {
            console.warn('No prayer data provided.');
            return;
        }

        // Batch event updates to avoid recursive loops
        this.calendar.batchRendering(() => {
            // Remove existing prayer events
            const prayerEvents = this.calendar.getEvents().filter(event => event.extendedProps?.isPrayerTime);
            prayerEvents.forEach(event => event.remove());

            // Add new events
            const newEvents = this.transformPrayerTimesToEvents(prayerData);
            if (newEvents.length > 0) {
                this.calendar.addEventSource(newEvents);
                console.log(`Added ${newEvents.length} new prayer events.`);
            } else {
                console.warn('No prayer time events to add.');
            }
        });

        // Save all events at once after batch rendering is complete
        if (window.calendarUtils && typeof window.calendarUtils.save === 'function') {
            window.calendarUtils.save();
            // console.log('Saved prayer events to localStorage.');
        }
    }

    onCalendarReady(calendar) {
        this.calendar = calendar;

        // We don't need to load prayer times from localStorage here anymore
        // as they are now handled by the calendar's event storage system
        
        if (this.pendingPrayerData) {
            console.log('Processing pending prayer data.');
            this.addPrayerTimesToCalendar(this.pendingPrayerData);
            this.pendingPrayerData = null;
        }
    }
}

// Expose a single instance of the parser globally
window.prayerTimesParser = new PrayerTimesParser();

// For backward compatibility with existing calls if any
window.addPrayerTimesToCalendar = (calendar, prayerData) => {
    if (!window.prayerTimesParser.calendar) {
        window.prayerTimesParser.calendar = calendar;
    }
    window.prayerTimesParser.addPrayerTimesToCalendar(prayerData);
};

window.onCalendarReady = (calendar) => {
    window.prayerTimesParser.onCalendarReady(calendar);
};
