// Global variables
let calendar;
let icsFiles = []; // Will be populated dynamically
let eventSources = {};

// Available colors for different calendars
const availableColors = [
  '#3788d8', // Blue
  '#4CAF50', // Green
  '#9C27B0', // Purple
  '#FF5722', // Deep Orange
  '#607D8B', // Blue Grey
  '#795548', // Brown
  '#3F51B5', // Indigo
  '#009688'  // Teal
];

// Function to scan for ICS files
async function scanForICSFiles() {
  try {
    console.log('Scanning for ICS files...');
    
    // Hardcoded list of ICS files for testing
    const files = [
      'prayer_schedule.ics',
      'training_schedule.ics',
      'meow schedule.ics',
      'islamic_knowledge_schedule.ics'
    ];
    
    console.log('Found ICS files:', files);
    
    if (!Array.isArray(files) || files.length === 0) {
      console.warn('No .ics files found in the directory');
      return [];
    }
    
    // Convert to the format expected by the calendar
    return files.map((filename, index) => ({
      id: `ics-${filename.replace(/[^a-z0-9]/gi, '-').toLowerCase()}`,
      name: filename.replace(/\.ics$/i, '').replace(/[_-]/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
      filename: filename,
      color: availableColors[index % availableColors.length],
      enabled: true,
      lastModified: Date.now()
    }));
  } catch (error) {
    console.error('Error scanning for ICS files:', error);
    return [];
  }
}

// Initialize the calendar
function initCalendar() {
  const calendarEl = document.getElementById('calendar');
  if (!calendarEl) {
    throw new Error('Calendar element not found!');
  }
  
  const calendar = new FullCalendar.Calendar(calendarEl, {
    initialView: 'timeGridFourDay',
    headerToolbar: {
      left: 'prev,next today',
      center: 'title',
      right: 'timeGridDay,timeGridFourDay,timeGridWeek,dayGridMonth'
    },
    views: {
      timeGridFourDay: {
        type: 'timeGrid',
        duration: { days: 4 },
        buttonText: '4 Days',
        slotMinTime: '03:00:00',
        slotMaxTime: '23:00:00',
        allDaySlot: false,
        dayHeaderFormat: { weekday: 'short', day: 'numeric' },
        dayHeaderClassNames: 'fc-compact-header'
      },
      timeGridDay: {
        dayHeaderFormat: { weekday: 'long', month: 'short', day: 'numeric' },
        dayHeaderClassNames: 'fc-compact-header',
        allDaySlot: false
      },
      timeGridWeek: {
        dayHeaderFormat: { weekday: 'short' },
        dayHeaderClassNames: 'fc-compact-header',
        allDaySlot: false
      },
      dayGridMonth: {
        dayHeaderFormat: { weekday: 'short' },
        dayHeaderClassNames: 'fc-compact-header',
        fixedWeekCount: false,
        dayMaxEventRows: 3
      }
    },
    buttonText: {
      today: 'Today',
      month: 'Month',
      week: 'Week',
      day: 'Day',
      timeGridDay: 'Day',
      timeGridFourDay: '4 Days'
    },
    height: '100%',
    navLinks: true,
    nowIndicator: true,
    dayMaxEvents: true,
    slotMinTime: '03:00:00',
    slotMaxTime: '23:00:00',
    slotDuration: '00:30:00',
    slotLabelInterval: '01:00:00',
    allDaySlot: false,
    eventTimeFormat: {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
      meridiem: 'short'
    },
    dayHeaderFormat: { weekday: 'short' },
    dayHeaderClassNames: 'fc-compact-header',
    eventDidMount: function(info) {
      if (info.event.extendedProps.description) {
        info.el.setAttribute('title', info.event.extendedProps.description);
      }
    },
    loading: function(isLoading) {
      const loadingEl = document.getElementById('loading');
      if (loadingEl) {
        loadingEl.style.display = isLoading ? 'block' : 'none';
      }
    }
  });
  
  calendar.render();
  return calendar;
}

// Initialize controls for ICS files
function initICSControls() {
  const controlsContainer = document.getElementById('ics-controls');
  if (!controlsContainer) return;
  
  controlsContainer.innerHTML = ''; // Clear existing controls
  
  if (icsFiles.length === 0) {
    controlsContainer.innerHTML = '<p>No calendar files found. Add .ics files to the directory and refresh the page.</p>';
    return;
  }
  
  icsFiles.forEach((file) => {
    const controlId = file.id;
    const control = document.createElement('div');
    control.className = 'ics-control';
    control.title = file.filename;
    
    control.innerHTML = `
      <div class="control-row">
        <input type="checkbox" id="${controlId}-toggle" ${file.enabled ? 'checked' : ''}>
        <label for="${controlId}-toggle" class="filename">${file.name}</label>
      </div>
      <div class="control-row">
        <input type="color" id="${controlId}-color" value="${file.color}" aria-label="Color for ${file.name}">
      </div>
    `;
    
    // Add event listeners
    const toggle = control.querySelector(`#${controlId}-toggle`);
    const colorPicker = control.querySelector(`#${controlId}-color`);
    
    if (toggle && colorPicker) {
      toggle.addEventListener('change', () => updateICSSource(file.id, toggle.checked, colorPicker.value));
      colorPicker.addEventListener('input', () => updateICSSource(file.id, toggle.checked, colorPicker.value));
    }
    
    controlsContainer.appendChild(control);
  });
  
  // Set up the refresh button
  const refreshButton = document.getElementById('refresh-button');
  if (refreshButton) {
    refreshButton.addEventListener('click', async () => {
      const loadingEl = document.getElementById('loading');
      if (loadingEl) {
        loadingEl.textContent = 'Refreshing calendar data...';
        loadingEl.style.display = 'block';
      }
      
      try {
        icsFiles = await scanForICSFiles();
        initICSControls();
        await loadAllICSFiles();
      } catch (error) {
        console.error('Error refreshing calendars:', error);
      } finally {
        if (loadingEl) {
          loadingEl.style.display = 'none';
        }
      }
    });
  }
}

// Load all ICS files
async function loadAllICSFiles() {
  const loadingEl = document.getElementById('loading');
  try {
    if (loadingEl) {
      loadingEl.textContent = 'Loading calendar data...';
      loadingEl.style.display = 'block';
    }
    
    // Clear all existing events
    if (calendar) {
      calendar.getEventSources().forEach(source => source.remove());
    }
    eventSources = {};
    
    // Load all files in parallel
    const filePromises = icsFiles.map(async (file) => {
      try {
        console.log(`Processing file: ${file.filename}`);
        const events = await loadAndParseICS(file.filename);
        if (events && events.length > 0) {
          file.events = events;
          console.log(`Loaded ${events.length} events from ${file.filename}`);
          return { file, events };
        } else {
          console.warn(`No events found in ${file.filename}`);
          return null;
        }
      } catch (error) {
        console.error(`Error processing ${file.filename}:`, error);
        return null;
      }
    });
    
    // Wait for all files to be processed
    const results = (await Promise.all(filePromises)).filter(Boolean);
    
    // Add all enabled events to the calendar
    if (calendar) {
      calendar.batchRendering(() => {
        results.forEach(({ file, events }) => {
          if (file.enabled) {
            updateICSSource(file.id, true, file.color);
          }
        });
      });
    }
    
    console.log('Successfully loaded all calendar data');
  } catch (error) {
    console.error('Error loading calendar data:', error);
    const errorEl = document.getElementById('error');
    if (errorEl) {
      errorEl.textContent = `Error: ${error.message}`;
      errorEl.style.display = 'block';
    }
  } finally {
    if (loadingEl) {
      loadingEl.style.display = 'none';
    }
  }
}

// Initialize the application
document.addEventListener('DOMContentLoaded', async function() {
  console.log('DOM fully loaded, initializing application...');
  
  try {
    // Show loading message
    const loadingEl = document.getElementById('loading');
    if (loadingEl) {
      loadingEl.textContent = 'Initializing...';
      loadingEl.style.display = 'block';
    }
    
    // Initialize calendar
    calendar = initCalendar();
    console.log('Calendar initialized');
    
    // Scan for ICS files
    icsFiles = await scanForICSFiles();
    
    if (icsFiles.length === 0) {
      console.warn('No ICS files found');
      if (loadingEl) {
        loadingEl.textContent = 'No calendar files found. Please add .ics files to the directory.';
        loadingEl.style.color = 'orange';
      }
      return;
    }
    
    console.log(`Found ${icsFiles.length} ICS files:`, icsFiles);
    
    // Initialize controls
    initICSControls();
    
    // Load all ICS files
    await loadAllICSFiles();
    
    console.log('Application initialized successfully');
  } catch (error) {
    console.error('Error initializing application:', error);
    const errorEl = document.getElementById('error');
    if (errorEl) {
      errorEl.textContent = `Error: ${error.message}`;
      errorEl.style.display = 'block';
    }
  } finally {
    const loadingEl = document.getElementById('loading');
    if (loadingEl) {
      loadingEl.style.display = 'none';
    }
  }
});

// Helper function to format file size
function formatFileSize(bytes) {
  if (bytes === 0) return '';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

// Update an ICS source when its settings change
function updateICSSource(fileId, enabled, color) {
  const file = icsFiles.find(f => f.id === fileId);
  if (!file) return;
  
  // Update file properties
  file.enabled = enabled;
  if (color) {
    file.color = color;
  }
  
  // Remove existing source if it exists
  if (eventSources[fileId]) {
    eventSources[fileId].remove();
    delete eventSources[fileId];
  }
  
  // Add source if enabled and has events
  if (enabled && file.events && file.events.length > 0) {
    const source = {
      events: file.events,
      color: file.color,
      textColor: getContrastColor(file.color)
    };
    
    // Make sure we have a valid calendar instance
    if (!calendar) {
      console.error('Calendar not initialized');
      return;
    }
    
    try {
      eventSources[fileId] = calendar.addEventSource(source);
      console.log(`Updated source for ${fileId}:`, { enabled, color: file.color, eventCount: file.events.length });
    } catch (error) {
      console.error(`Error adding event source for ${fileId}:`, error);
    }
  } else {
    console.log(`Source for ${fileId} is disabled or has no events`);
  }
  
  // Update the file in the array
  const index = icsFiles.findIndex(f => f.id === fileId);
  if (index !== -1) {
    icsFiles[index] = file;
  }
}

// Helper function to get contrasting text color
function getContrastColor(hexColor) {
  // Convert hex to RGB
  const r = parseInt(hexColor.substr(1, 2), 16);
  const g = parseInt(hexColor.substr(3, 2), 16);
  const b = parseInt(hexColor.substr(5, 2), 16);
  
  // Calculate luminance
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  
  // Return black for light colors, white for dark colors
  return luminance > 0.5 ? '#000000' : '#ffffff';
}

// Load all ICS files
async function loadAllICSFiles() {
  try {
    // Show loading message
    const loadingEl = document.getElementById('loading');
    if (loadingEl) {
      loadingEl.textContent = 'Loading calendar data...';
      loadingEl.style.display = 'block';
    }
    
    // Clear all existing events
    calendar.getEventSources().forEach(source => source.remove());
    eventSources = {};
    
    // Load all files in parallel
    const filePromises = icsFiles.map(async (file) => {
      try {
        console.log(`Processing file: ${file.filename}`);
        const events = await loadAndParseICS(file.filename);
        if (events && events.length > 0) {
          file.events = events;
          console.log(`Loaded ${events.length} events from ${file.filename}`);
          return { file, events };
        } else {
          console.warn(`No events found in ${file.filename}`);
          return null;
        }
      } catch (error) {
        console.error(`Error processing ${file.filename}:`, error);
        return null;
      }
    });
    
    // Wait for all files to be processed
    const results = await Promise.all(filePromises);
    
    // Add all enabled events to the calendar
    calendar.batchRendering(() => {
      results.forEach(result => {
        if (!result) return;
        
        const { file, events } = result;
        if (file.enabled) {
          updateICSSource(file.id, true, file.color);
        }
      });
    });
    
    // Go to today's date
    calendar.gotoDate(new Date());
    
  } catch (error) {
    console.error('Error loading ICS files:', error);
    const loadingEl = document.getElementById('loading');
    if (loadingEl) {
      loadingEl.textContent = `Error: ${error.message}. Check console for details.`;
      loadingEl.style.color = 'red';
    }
  } finally {
    // Hide loading message when done
    const loadingEl = document.getElementById('loading');
    if (loadingEl) {
      loadingEl.style.display = 'none';
    }
  }
}

async function loadAndParseICS(filename) {
  if (!calendar) {
    throw new Error('Calendar not initialized');
  }
  
  // Show loading message
  const loadingEl = document.getElementById('loading');
  if (loadingEl) {
    loadingEl.textContent = `Loading ${filename}...`;
    loadingEl.style.display = 'block';
  }
  
  // Get file info first
  const fileInfo = {
    name: filename,
    size: 0,
    lastModified: 0
  };
  
  // Try to get file stats if possible
  try {
    const response = await fetch(filename, { method: 'HEAD' });
    if (response.ok) {
      const contentLength = response.headers.get('content-length');
      const lastModified = response.headers.get('last-modified');
      
      if (contentLength) fileInfo.size = parseInt(contentLength, 10);
      if (lastModified) fileInfo.lastModified = new Date(lastModified).getTime();
    }
  } catch (e) {
    console.warn(`Could not get file info for ${filename}:`, e);
  }
  
  try {
    console.log(`Loading ${filename}...`);
    
    // Load the ICS file
    const response = await fetch(filename);
    if (!response.ok) {
      throw new Error(`Failed to load ${filename}: ${response.status} ${response.statusText}`);
    }
    
    let icsData = await response.text();
    
    // Log the first 500 characters for debugging
    // console.log(`First 500 characters of ${filename}:`, icsData.substring(0, 500));
    
    // First, log the raw data for debugging
    // console.log('Raw ICS data start:', icsData.substring(0, 1000));
    
    // Normalize line endings to LF first
    icsData = icsData.replace(/\r\n?|\n/g, '\n');
    
    // Process each line to handle line folding and validate format
    const lines = icsData.split('\n');
    let processedLines = [];
    let currentLine = '';
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue; // Skip empty lines
      
      // Check if line starts with a valid property (contains : or ;)
      if (line.includes(':') || line.includes(';')) {
        // If we have a current line being built, push it before starting a new one
        if (currentLine) {
          processedLines.push(currentLine);
          currentLine = '';
        }
        currentLine = line;
      } else if (currentLine) {
        // This is a continuation line, append to current line with a space
        currentLine += ' ' + line.trim();
      } else {
        // This is a line that doesn't start with a property and isn't a continuation
        console.warn('Skipping malformed line:', line);
      }
    }
    
    // Add the last line if it exists
    if (currentLine) {
      processedLines.push(currentLine);
    }
    
    // Join with CRLF as per iCalendar spec
    icsData = processedLines.join('\r\n') + '\r\n';
    
    // console.log('Processed ICS data start:', icsData.substring(0, 1000));
    
    // Parse the ICS data with error handling for malformed content
    let jcalData;
    try {
      // First try parsing as-is
      jcalData = ICAL.parse(icsData);
      
      // Check if we have a valid VCALENDAR component
      if (!jcalData || jcalData[0] !== 'vcalendar') {
        throw new Error('Invalid ICS format - expected vcalendar as root');
      }
    } catch (parseError) {
      console.warn('Initial parse failed, attempting to fix encoding and retry:', parseError);
      
      // Try to fix encoding issues
      try {
        // Try with UTF-8 BOM removed and proper encoding
        const fixedIcsData = icsData
          .replace(/^\uFEFF/, '')  // Remove BOM if present
          .replace(/[^\x00-\x7F]/g, function(char) {
            // Escape non-ASCII characters
            return '\\' + char.charCodeAt(0).toString(16).toUpperCase();
          });
        
        jcalData = ICAL.parse(fixedIcsData);
        
        if (!jcalData || jcalData[0] !== 'vcalendar') {
          throw new Error('Still invalid after encoding fix');
        }
      } catch (secondError) {
        console.warn('Second parse attempt failed, trying fallback parser:', secondError);
        
        // Fallback: Try to extract just the essential parts
        const veventMatches = icsData.match(/BEGIN:VEVENT[\s\S]*?END:VEVENT/gi);
        if (veventMatches && veventMatches.length > 0) {
          console.log(`Found ${veventMatches.length} VEVENT blocks in fallback parsing`);
          
          // Create a minimal valid iCalendar with just these events
          const minimalIcs = [
            'BEGIN:VCALENDAR',
            'VERSION:2.0',
            'PRODID:-//Fallback Parser//',
            ...veventMatches,
            'END:VCALENDAR'
          ].join('\r\n');
          
          jcalData = ICAL.parse(minimalIcs);
          
          if (!jcalData || jcalData[0] !== 'vcalendar') {
            throw new Error('Fallback parser failed to create valid iCalendar');
          }
        } else {
          throw new Error(`Failed to parse ICS file after multiple attempts: ${parseError.message}`);
        }
      }
    }
    
    const comp = new ICAL.Component(jcalData);
    const vevents = comp.getAllSubcomponents('vevent');
    console.log(`Found ${vevents.length} events in ${filename}`);
    
    const events = [];
    
    vevents.forEach((vevent, index) => {
      try {
        const event = new ICAL.Event(vevent);
        const start = event.startDate.toJSDate();
        const end = event.endDate ? event.endDate.toJSDate() : new Date(start.getTime() + 3600000); // Default to 1 hour if no end time
        
        // Add file metadata to each event
        const extendedProps = {
          uid: event.uid || `event-${index}-${Date.now()}`,
          lastModified: event.lastModified ? event.lastModified.toJSDate() : new Date(),
          fileInfo: {
            name: filename,
            size: fileInfo.size,
            lastModified: fileInfo.lastModified || Date.now()
          }
        };
        
        events.push({
          title: event.summary || 'Untitled Event',
          start: start,
          end: end,
          allDay: event.startDate.isDate,
          description: event.description || '',
          location: event.location || '',
          extendedProps: extendedProps,
          backgroundColor: '', // Will be set by the calendar
          borderColor: ''     // Will be set by the calendar
        });
      } catch (e) {
        console.error(`Error parsing event ${index}:`, e);
      }
    });
    
    // Update the file info in our icsFiles array
    const fileIndex = icsFiles.findIndex(f => f.filename === filename);
    if (fileIndex !== -1) {
      icsFiles[fileIndex].fileSize = fileInfo.size;
      icsFiles[fileIndex].lastModified = fileInfo.lastModified || Date.now();
      
      // Update the UI if the control exists
      const control = document.querySelector(`.ics-control[title="${filename}"]`);
      if (control) {
        const fileInfoEl = control.querySelector('.file-info');
        if (fileInfoEl) {
          fileInfoEl.textContent = formatFileSize(fileInfo.size);
        }
      }
    }
    
    console.log(`Successfully parsed ${events.length} events from ${filename}`);
    return events;
  } catch (error) {
    console.error(`Error processing ${filename}:`, error);
    return [];
  } finally {
    // Hide loading message when done
    const loadingEl = document.getElementById('loading');
    if (loadingEl) {
      loadingEl.style.display = 'none';
    }
  }
}
