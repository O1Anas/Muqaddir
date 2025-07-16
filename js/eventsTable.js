// Use a flag to prevent multiple initializations
let isInitialized = false;

function initializeEventsTable() {
  if (isInitialized) return;
  isInitialized = true;

  // Initialize groups if needed
  if (!window.eventGroups) {
    console.error('eventGroups not loaded');
    return;
  }
  
  // Create default group if none exist
  if (window.eventGroups.getAllGroups().length === 0) {
    window.eventGroups.addGroup();
  }

  // Expose functions globally
  window.getAllEventsData = getAllEventsData;
  window.getEnabledPrayers = getEnabledPrayers;
  window.getGroups = () => window.eventGroups.getAllGroups();

  // Group-related functions are now in eventGroups.js

  function updateEventRowsWithGroupColor(groupId, color) {
    // Find all event rows that use this group and update their color
    document.querySelectorAll(`.event-actions-container select.group-dropdown option[value="${groupId}"]`).forEach(option => {
      const row = option.closest('tr');
      if (row) {
        const groupBadge = row.querySelector('.group-badge');
        if (groupBadge) {
          groupBadge.style.backgroundColor = color;
        }
      }
    });
  }

  function updateGroupsUI() {
    const groupsSection = document.querySelector('.groups-section');
    const label = groupsSection.querySelector('label');
    const addBtn = groupsSection.querySelector('.group-add-btn');
    
    // Clear only the group items
    groupsSection.querySelectorAll('.group-item:not(.group-add-btn)').forEach(item => item.remove());

    // Add existing groups
    window.eventGroups.getAllGroups().forEach(group => {
      const groupItem = document.createElement('div');
      groupItem.className = 'group-item';
      groupItem.dataset.groupId = group.id;
      groupItem.innerHTML = `
        <div class="group-color-container">
          <div class="group-color" style="background-color: ${group.color}" data-group-id="${group.id}"></div>
          <input type="color" class="group-color-picker" value="${group.color}" data-group-id="${group.id}">
        </div>
        <span class="group-name">${group.name}</span>
      `;
      groupsSection.insertBefore(groupItem, addBtn);
    });

    // Add color picker event listeners
    groupsSection.querySelectorAll('.group-color').forEach(colorEl => {
      let clickTimer;
      
      // Single click - show color picker
      colorEl.addEventListener('click', (e) => {
        e.stopPropagation();
        clearTimeout(clickTimer);
        clickTimer = setTimeout(() => {
          const picker = colorEl.nextElementSibling;
          picker.click(); // Trigger the color picker
        }, 200); // Delay to check for double click
      });
      
      // Double click - delete group
      colorEl.addEventListener('dblclick', (e) => {
        e.stopPropagation();
        clearTimeout(clickTimer);
        const groupId = parseInt(colorEl.dataset.groupId);
        if (confirm('Are you sure you want to delete this group? Events using this group will be unassigned.')) {
          // Delete the group
          if (window.eventGroups.deleteGroup(groupId)) {
            // Update any events using this group
            document.querySelectorAll(`.event-actions-container select.group-dropdown option[value="${groupId}"]`).forEach(option => {
              option.selected = false;
              option.closest('select').value = 'none';
            });
            // Update UI
            updateGroupsUI();
          }
        }
      });
    });

    // Handle color changes
    groupsSection.querySelectorAll('.group-color-picker').forEach(picker => {
      picker.addEventListener('input', (e) => {
        const groupId = parseInt(picker.dataset.groupId);
        const newColor = picker.value;
        if (window.eventGroups.updateGroupColor(groupId, newColor)) {
          const colorEl = picker.previousElementSibling;
          colorEl.style.backgroundColor = newColor;
          // Update any events using this group's color
          updateEventRowsWithGroupColor(groupId, newColor);
        }
      });
      
      // Hide the color picker input (we'll show our custom UI)
      picker.style.position = 'absolute';
      picker.style.opacity = '0';
      picker.style.pointerEvents = 'none';
      picker.style.width = '1px';
      picker.style.height = '1px';
    });

    // Add event listeners to new group items
    groupsSection.querySelectorAll('.group-item:not(.group-add-btn)').forEach(item => {
      item.addEventListener('dblclick', (e) => {
        // Don't trigger if we're clicking on the color picker
        if (e.target.closest('.group-color-container')) return;
        
        const nameSpan = item.querySelector('.group-name');
        const currentName = nameSpan.textContent;
        const groupId = parseInt(item.dataset.groupId);
        
        // Create input
        const input = document.createElement('input');
        input.value = currentName;
        input.className = 'group-name-edit';
        
        // Replace the span with input
        nameSpan.replaceWith(input);
        input.focus();
        
        const saveGroupName = () => {
          const newGroupName = input.value.trim();
          if (newGroupName && newGroupName !== currentName) {
            const group = window.eventGroups.getGroupById(groupId);
            if (group) {
              group.name = newGroupName;
              window.eventGroups.saveGroups();
              // Update the UI to reflect changes
              updateGroupsUI();
              return;
            }
          }
          // If no changes or invalid, just update UI to revert
          updateGroupsUI();
        };
        
        // Handle blur and enter key
        input.addEventListener('blur', saveGroupName, { once: true });
        input.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') {
            input.blur(); // This will trigger the blur event
            e.preventDefault();
          } else if (e.key === 'Escape') {
            updateGroupsUI(); // Just refresh to discard changes
          }
        });
      });
    });
  }
  
  const addBtn = document.querySelector('.group-add-btn');
  addBtn.addEventListener('click', () => {
    window.eventGroups.addGroup();
    updateGroupsUI(); // Make sure UI updates after adding a group
  });

  // DOM Elements
  const eventsTableBody = document.getElementById('eventsTableBody');
  const addEventBtn = document.getElementById('addEventBtn');
  const saveEventsBtn = document.getElementById('saveEventsBtn');
  
  // State
  let clickTimeout = null;
  
  // Update all group dropdowns in the events table
  window.updateGroupDropdowns = function() {
    const dropdowns = document.querySelectorAll('.group-dropdown');
    dropdowns.forEach(dropdown => {
      const currentValue = dropdown.value;
      const groupOptions = window.eventGroups.getAllGroups().map(g => 
        `<option value="${g.id}" style="--color: ${g.color}">${g.name}</option>`
      ).join('');
      
      dropdown.innerHTML = `
        <option value="none">No Group</option>
        ${groupOptions}
      `;
      
      // Restore the selected value if it still exists
      if (currentValue && dropdown.querySelector(`option[value="${currentValue}"]`)) {
        dropdown.value = currentValue;
      }
    });
  };

  // Initialize the table
  function init() {
    // Add initial events if needed
    if (eventsTableBody.children.length === 0) {
      addEventRow();
    }
    setupEventListeners();
    updateGroupsUI();
    window.updateGroupDropdowns(); // Initialize dropdowns
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
          <div class="event-actions-container">
            <select class="group-dropdown" name="group">
              <option value="none">No Group</option>
              ${window.eventGroups.getAllGroups().map(g => `
                <option value="${g.id}" style="--color: ${g.color}">${g.name}</option>
              `).join('')}
            </select>
            <button class="action-btn delete" title="Delete">🗑️</button>
          </div>
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
      
      // Get the selected group info
      const groupSelect = row.querySelector('.event-actions-container select');
      if (groupSelect && groupSelect.value !== 'none') {
        const selectedOption = groupSelect.options[groupSelect.selectedIndex];
        data.group = {
          id: groupSelect.value,
          name: selectedOption.text.trim(),
          color: getComputedStyle(selectedOption).getPropertyValue('--color').trim() || '#000000'
        };
      }
      
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
      localStorage.setItem('userEvents', JSON.stringify(events));
      
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