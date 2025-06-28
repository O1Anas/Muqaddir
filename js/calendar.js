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
  
  const calendar = new FullCalendar.Calendar(calendarEl, {
    initialView: 'timeGrid4Days',
    headerToolbar: {
      left: 'prev,next today',
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
    buttonText: {
      today: 'Today',
      day: 'Day',
      month: 'Month',
      week: 'Week',
      list: 'List'
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

  calendar.render();
  
  // Update height after calendar renders
  setTimeout(updateCalendarHeight, 100);
});