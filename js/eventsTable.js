// Use a flag to prevent multiple initializations
let isInitialized = false;

function initializeEventsTable() {
  if (isInitialized) return;
  isInitialized = true;
  
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
        <input type="text" name="name" value="${data.name || 'New Event'}" class="event-input">
      </td>
      <td class="event-time">
        <select name="start" class="event-input prayer-dropdown" ${!enabledPrayers.length ? 'disabled' : ''}>
          ${enabledPrayers.map(p => `<option value="${p}" ${p === startValue ? 'selected' : ''}>${p}</option>`).join('')}
        </select>
      </td>
      <td class="event-time">
        <input type="time" name="end" value="${data.end || '01:00'}" class="event-input">
      </td>
      <td class="event-conditions">
        <input type="text" name="conditions" value="${data.conditions || 'Everyday'}" class="event-input">
      </td>
      <td class="event-actions">
        <button class="action-btn save" title="Edit">✏️</button>
        <button class="action-btn delete" title="Delete">🗑️</button>
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
  
  // Toggle row edit mode
  function toggleEditMode(row, enable) {
    const inputs = row.querySelectorAll('.event-input');
    const saveBtn = row.querySelector('.save');
    
    // If enabling edit mode, refresh the prayer dropdown first
    if (enable) {
      const prayerDropdown = row.querySelector('.prayer-dropdown');
      if (prayerDropdown) {
        updatePrayerDropdown(prayerDropdown);
      }
    }
    
    inputs.forEach(input => input.disabled = !enable);
    row.classList.toggle('editing', enable);
    
    if (saveBtn) {
      saveBtn.innerHTML = enable ? '💾' : '✏️';
      saveBtn.title = enable ? 'Save' : 'Edit';
    }
    
    if (enable) {
      const firstInput = row.querySelector('input');
      if (firstInput) firstInput.focus();
    }
  }
  
  // Save row data
  function saveRow(row) {
    const inputs = row.querySelectorAll('.event-input');
    const data = {};
    
    inputs.forEach(input => {
      data[input.name] = input.value;
    });
    
    // Here you would typically save to a server
    console.log('Saving:', data);
    
    toggleEditMode(row, false);
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
  
  // Handle button clicks and double-clicks
  function handleTableClick(e) {
    const target = e.target.closest('button');
    if (!target) return;
    
    const row = target.closest('tr');
    const isSaveBtn = target.classList.contains('save');
    const isDeleteBtn = target.classList.contains('delete');
    
    // Handle single click on save button (for saving)
    if (isSaveBtn && e.type === 'click') {
      e.preventDefault();
      e.stopPropagation();
      
      if (row.classList.contains('editing')) {
        saveRow(row);
      }
      return false;
    } 
    // Handle double-click on pen emoji (for editing)
    else if (isSaveBtn && e.type === 'dblclick') {
      e.preventDefault();
      e.stopPropagation();
      
      if (!row.classList.contains('editing')) {
        toggleEditMode(row, true);
      }
      return false;
    }
    // Handle delete button
    else if (isDeleteBtn) {
      e.preventDefault();
      e.stopPropagation();
      row.remove();
      return false;
    }
  }
  
  // Setup event listeners
  function setupEventListeners() {
    // Add new event
    addEventBtn?.addEventListener('click', () => {
      const row = addEventRow();
      toggleEditMode(row, true);
    });
    
    // Save all events
    saveEventsBtn?.addEventListener('click', () => {
      saveEventsBtn.classList.add('saving');
      setTimeout(() => saveEventsBtn.classList.remove('saving'), 500);
      
      // Here you would save all events
      console.log('Saving all events...');
    });
    
      // Handle button interactions
    function handleButtonInteraction(e) {
      const button = e.target.closest('button');
      if (!button) return;
      
      clearTimeout(clickTimeout);
      
      if (e.type === 'dblclick') {
        // Only handle double-clicks on the save button
        if (button.classList.contains('save')) {
          handleTableClick(e);
        }
      } else {
        // Handle single clicks after a delay to check for double-click
        clickTimeout = setTimeout(() => {
          handleTableClick(e);
        }, 200);
      }
    }
    
    // Add event listeners to the table body
    eventsTableBody.addEventListener('click', handleButtonInteraction);
    eventsTableBody.addEventListener('dblclick', handleButtonInteraction);
  }
  
  // Start the app
  init();
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', initializeEventsTable);