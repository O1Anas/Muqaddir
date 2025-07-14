// Use a flag to prevent multiple initializations
let isInitialized = false;

function initializeEventsTable() {
  if (isInitialized) return;
  isInitialized = true;

  // Expose functions globally
  window.getAllEventsData = getAllEventsData;
  window.getEnabledPrayers = getEnabledPrayers;
  
  // DOM Elements
  const eventsTableBody = document.getElementById('eventsTableBody');
  const addEventBtn = document.getElementById('addEventBtn');
  const saveEventsBtn = document.getElementById('saveEventsBtn');
  
  // State
  let clickTimeout = null;
  
  // Initialize the table
  function init() {
    // Add initial events if needed
    if (eventsTableBody.children.length === 0) {
      addEventRow();
    }
    setupEventListeners();
  }
  
  // Add a new event row
  function addEventRow(data = {}) {
    const row = document.createElement('tr');
    row.dataset.id = data.id || Date.now();
    
    const enabledPrayers = getEnabledPrayers();
    const startValue = data.start || (enabledPrayers[0] || '');
    
    row.innerHTML = `
      <td class="event-name">
        <div class="event-name-content">
          <input type="text" name="name" value="" class="event-input" placeholder="${data.name || 'New Event'}">
          <button class="action-btn delete" title="Delete">🗑️</button>
        </div>
      </td>
      <td class="event-time">
        <select name="start" class="event-input prayer-dropdown" ${!enabledPrayers.length ? 'disabled' : ''}>
          ${enabledPrayers.map(p => `<option value="${p}" ${p === startValue ? 'selected' : ''}>${p}</option>`).join('')}</select>
        <div class="time-adjustment">
          <select name="adjustmentType" class="event-input adjustment-type" data-column="start">
            <option value="+duration">+</option>
            <option value="-duration">-</option>
            <option value="+fraction">+ 1/</option>
            <option value="-fraction">- 1/</option>
          </select>
          <div class="adjustment-value">
            <input type="number" name="duration" class="event-input duration-input" min="0" max="1440" placeholder="minutes" data-column="start">
            <input type="number" name="fraction" class="event-input fraction-input" min="2" max="10" placeholder="fraction" style="display: none;" data-column="start">
          </div>
        </div>
      </td>
      <td class="event-time">
        <select name="end" class="event-input prayer-dropdown" ${!enabledPrayers.length ? 'disabled' : ''}>
          ${enabledPrayers.map(p => `<option value="${p}" ${p === data.end ? 'selected' : ''}>${p}</option>`).join('')}</select>
        <div class="time-adjustment">
          <select name="adjustmentType" class="event-input adjustment-type" data-column="end">
            <option value="+duration">+</option>
            <option value="-duration">-</option>
            <option value="+fraction">+ 1/</option>
            <option value="-fraction">- 1/</option>
          </select>
          <div class="adjustment-value">
            <input type="number" name="duration" class="event-input duration-input" min="0" max="1440" placeholder="minutes" data-column="end">
            <input type="number" name="fraction" class="event-input fraction-input" min="2" max="10" placeholder="fraction" style="display: none;" data-column="end">
          </div>
        </div>
      </td>
      <td class="event-conditions">
        <!-- <input type="text" name="conditions" value="" placeholder="${data.conditions || 'not on weekends'}" class="event-input"> -->
      </td>
    `;
    
    eventsTableBody.appendChild(row);
    return row;
  }
  
  // Update prayer dropdown with current enabled prayers
  function updatePrayerDropdown(dropdown) {
    const currentValue = dropdown.value;
    const enabledPrayers = getEnabledPrayers();
    
    // Save the current scroll position
    const scrollTop = dropdown.scrollTop;
    
    // Update dropdown options
    dropdown.innerHTML = enabledPrayers.map(p => 
      `<option value="${p}" ${p === currentValue ? 'selected' : ''}>${p}</option>`
    ).join('');
    
    // Restore the scroll position
    dropdown.scrollTop = scrollTop;
    
    // Enable/disable dropdown based on available prayers
    dropdown.disabled = enabledPrayers.length === 0;
  }
  
  // Update prayer dropdown for a row
  function updateRowPrayerDropdown(row) {
    const prayerDropdown = row.querySelector('.prayer-dropdown');
    if (prayerDropdown) {
      updatePrayerDropdown(prayerDropdown);
    }
  }
  
  // Get all events data
  function getAllEventsData() {
    const rows = eventsTableBody.querySelectorAll('tr');
    const events = [];
    
    rows.forEach(row => {
      const inputs = row.querySelectorAll('.event-input');
      const data = { id: row.dataset.id };
      
      inputs.forEach(input => {
        if (input.name === 'adjustmentType') {
          if (input.dataset.column === 'start') {
            data.startAdjustmentType = input.value;
          } else if (input.dataset.column === 'end') {
            data.endAdjustmentType = input.value;
          }
        } else if (input.name === 'duration' || input.name === 'fraction') {
          // Find the corresponding adjustment type input
          const adjustmentTypeInput = input.closest('.time-adjustment').querySelector('.adjustment-type');
          if (adjustmentTypeInput) {
            const adjustmentType = adjustmentTypeInput.value;
            const isDuration = adjustmentType.includes('duration');
            const isStart = input.dataset.column === 'start';
            
            if (isDuration && input.name === 'duration') {
              if (isStart) data.startOffsetValue = input.value;
              else data.endOffsetValue = input.value;
            } else if (!isDuration && input.name === 'fraction') {
              if (isStart) data.startOffsetValue = input.value;
              else data.endOffsetValue = input.value;
            }
          }
        } else {
          data[input.name] = input.value;
        }
      });
      
      // Clean up any undefined values
      Object.keys(data).forEach(key => {
        if (data[key] === undefined || data[key] === '') {
          delete data[key];
        }
      });
      
      events.push(data);
    });
    
    return events;
  }
  
  // Get enabled prayers from settings
  function getEnabledPrayers() {
    try {
      const saved = localStorage.getItem('prayerSettings');
      const settings = saved ? JSON.parse(saved) : {};
      const defaults = window.prayerTimesParser?.DEFAULT_PRAYER_EVENT_SETTINGS || {};
      const allowed = window.prayerTimesParser?.allowedPrayerEvents || [];
      
      return Object.keys({ ...defaults, ...settings })
        .filter(p => (settings[p]?.enabled ?? defaults[p]?.enabled !== false) && 
                    (allowed.length === 0 || allowed.includes(p)));
    } catch (e) {
      console.error('Error loading prayer settings:', e);
      return window.prayerTimesParser?.allowedPrayerEvents || 
             ['Fajr', 'Sunrise', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];
    }
  }
  
  // Handle delete button clicks
  function handleDeleteClick(e) {
    const target = e.target.closest('button.delete');
    if (!target) return;
    
    e.preventDefault();
    e.stopPropagation();
    
    const row = target.closest('tr');
    if (row) {
      row.remove();
      // Trigger save button pulsing when there are changes
      saveEventsBtn.classList.add('pulse');
    }
    
    return false;
  }
  
  // Setup event listeners
  function setupEventListeners() {
    // Add new event
    addEventBtn.addEventListener('click', () => {
      const row = addEventRow();
      updateRowPrayerDropdown(row);
      setupAdjustmentListeners(row);
      // Trigger save button pulsing when there are changes
      saveEventsBtn.classList.add('pulse');
    });
    
    // Setup adjustment listeners for existing rows
    const rows = eventsTableBody.querySelectorAll('tr');
    rows.forEach(row => setupAdjustmentListeners(row));
    
    // Save all events
    saveEventsBtn.addEventListener('click', () => {
      updateButtonIcon(saveEventsBtn, 'loading');
      
      const events = getAllEventsData();
      console.log('Saving all events:', events);
      
      // Here you would save all events to your storage/API
      // For now, we'll just log them
      
      // Remove pulse effect after saving
      saveEventsBtn.classList.remove('pulse');
      
      // Show saving animation
      saveEventsBtn.classList.add('saving');
      setTimeout(() => saveEventsBtn.classList.remove('saving'), 500);
      updateButtonIcon(saveEventsBtn, 'checkmark', 1000, 'save');
    });
    
    // Add event listeners for input changes
    eventsTableBody.addEventListener('input', () => {
      // Add pulse effect to save button when inputs change
      saveEventsBtn.classList.add('pulse');
    });
    
    // Add event listener for delete buttons
    eventsTableBody.addEventListener('click', handleDeleteClick);
  }
  
  // Handle adjustment type selection
  function setupAdjustmentListeners(row) {
    // Get all adjustment types and their corresponding inputs
    const adjustmentTypes = row.querySelectorAll('.adjustment-type');
    
    adjustmentTypes.forEach(adjustmentType => {
      const adjustmentValue = adjustmentType.closest('.time-adjustment').querySelector('.adjustment-value');
      const durationInput = adjustmentValue.querySelector('.duration-input');
      const fractionInput = adjustmentValue.querySelector('.fraction-input');

      if (adjustmentType) {
        adjustmentType.addEventListener('change', () => {
          const value = adjustmentType.value;
          durationInput.style.display = value === '+duration' || value === '-duration' ? 'inline' : 'none';
          fractionInput.style.display = value === '+fraction' || value === '-fraction' ? 'inline' : 'none';
        });
      }
    });
  }

  // Start the app
  init();
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', initializeEventsTable);