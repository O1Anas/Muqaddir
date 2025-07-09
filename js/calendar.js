// Save all calendar events to localStorage
let _isSaving = false;

function _saveCalendarEvents(calendar) {
    if (!calendar || _isSaving) return;

    _isSaving = true;
    try {
        const events = calendar.getEvents();
        const eventsData = events.map(event => ({
            title: event.title,
            start: event.start,
            end: event.end,
            allDay: event.allDay,
            color: event.backgroundColor,
            backgroundColor: event.backgroundColor,
            textColor: event.textColor,
            borderColor: event.borderColor,
            extendedProps: event.extendedProps || {}
        }));
        localStorage.setItem('calendarEvents', JSON.stringify(eventsData));
    } catch (e) {
        console.error('Error saving calendar events:', e);
    } finally {
        _isSaving = false;
    }
}

// Load and restore calendar events from localStorage
function loadCalendarEvents(calendar) {
    if (!calendar) return;
    
    try {
        const savedEvents = localStorage.getItem('calendarEvents');
        if (savedEvents) {
            const events = JSON.parse(savedEvents);
            events.forEach(eventData => {
                // Convert string dates back to Date objects
                eventData.start = new Date(eventData.start);
                if (eventData.end) {
                    eventData.end = new Date(eventData.end);
                }
                calendar.addEvent(eventData);
            });
            console.log(`Restored ${events.length} events from localStorage`);
        }
    } catch (e) {
        console.error('Error loading calendar events:', e);
    }
}

// Update calendar height based on header
function updateCalendarHeight() {
  const header = document.querySelector('.header-container');
  if (header) {
    const headerHeight = header.offsetHeight;
    document.documentElement.style.setProperty('--header-height', `${headerHeight}px`);
  }
}

document.addEventListener('DOMContentLoaded', function() {

  // Initial update
  updateCalendarHeight();

  // Update on window resize
  window.addEventListener('resize', updateCalendarHeight);
  
  // Also update after fonts are loaded in case they affect the header height
  document.fonts.ready.then(updateCalendarHeight);


  const calendarEl = document.getElementById('calendar');
  
  // Create calendar instance and expose it globally
  const calendar = new FullCalendar.Calendar(calendarEl, {
    initialView: 'timeGrid4Days',
    headerToolbar: {
      left: 'prevYear,prev,today,next,nextYear',
      center: 'title',
      right: 'timeGridDay,timeGrid4Days,timeGridWeek,dayGridMonth'
    },
    views: {
      timeGrid4Days: {
        type: 'timeGrid',
        duration: { days: 4 },
        buttonText: '4 days'
      }
    },
    firstDay: -2, // Start week on Friday
    navLinks: true, // Allow clicking on day/week names to navigate
    editable: true,
    dayMaxEvents: true, // Show "more" link when too many events
    allDaySlot: false,
    nowIndicator: true,
    scrollTime: new Date().toTimeString().slice(0,8),  // scroll to the current time, e.g. "14:23:00"
    // Add these two lines to control visible time range
    // slotMinTime: '03:00:00',  // timeline starts at 3 AM ? no, some people use this time
    // slotMaxTime: '23:00:00',  // timeline ends at 10 PM ? no, some people use this time
    // height: 'auto',
    // You can add events here or fetch them dynamically
    events: [
      // Example event
      {
        title: 'Event 1',
        start: new Date(),
        allDay: false,
        duration: { hours: 2 },
      }
    ]
  });

  // Render the calendar
  calendar.render();
  
  // Load saved events
  loadCalendarEvents(calendar);
  
  // Expose the calendar instance and a utility object globally
  window.calendar = calendar;
  window.calendarUtils = {
    save: () => _saveCalendarEvents(calendar),
    load: () => loadCalendarEvents(calendar)
  };
  
  // Notify that the calendar is ready
  if (window.onCalendarReady) {
    window.onCalendarReady(calendar);
  }
  
  // Update height after calendar renders
  setTimeout(updateCalendarHeight, 100);
  
  // Add keyboard shortcuts for calendar navigation
  document.addEventListener('keydown', function(e) {
    // Only handle keys when not focused on input fields
    if (document.activeElement.tagName === 'INPUT') return;
    
    const key = e.key.toLowerCase();
    
    // 'v' key - cycle through views
    if (key === 'v') {
      e.preventDefault();
      const viewOrder = ['timeGridDay', 'timeGrid4Days', 'timeGridWeek', 'dayGridMonth'];
      const currentView = calendar.view.type;
      const currentIndex = viewOrder.indexOf(currentView);
      const nextIndex = (currentIndex + 1) % viewOrder.length;
      calendar.changeView(viewOrder[nextIndex]);
    }
    // 't' key - go to today
    else if (key === 't') {
      e.preventDefault();
      calendar.today();
    }
  });
  
  // Return the calendar instance for module systems
  return calendar;
});