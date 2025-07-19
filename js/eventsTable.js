// Events Table Module
const EventsTable = (() => {
  let isInitialized = false;
  let eventsTableBody, saveEventsBtn;
  
  // DOM Elements
  const elements = {
    get tableBody() { return document.getElementById('eventsTableBody'); },
    get saveBtn() { return document.getElementById('saveEventsBtn'); },
    get addBtn() { return document.getElementById('addEventBtn'); },
    get groupsSection() { return document.querySelector('.groups-section'); }
  };

  // Initialize the events table
  function init() {
    if (isInitialized || !window.eventGroups) return;
    isInitialized = true;
    
    eventsTableBody = elements.tableBody;
    saveEventsBtn = elements.saveBtn;
    
    // Initialize groups if needed
    if (window.eventGroups.getAllGroups().length === 0) {
      window.eventGroups.addGroup();
    }
    
    // Expose public methods
    window.getAllEventsData = getAllEventsData;
    window.getEnabledPrayers = getEnabledPrayers;
    window.getGroups = () => window.eventGroups.getAllGroups();
    window.updateGroupDropdowns = updateGroupDropdowns;
    
    // Setup UI
    setupEventListeners();
    updateGroupsUI();
    updateGroupDropdowns();
    
    // Add initial event row if empty
    if (eventsTableBody.children.length === 0) {
      addEventRow();
    }
  }
  
  // Event Handlers
  function setupEventListeners() {
    // Add event button
    elements.addBtn?.addEventListener('click', () => addEventRow());
    
    // Handle adjustment type changes
    document.addEventListener('change', (e) => {
      if (e.target.matches('.adjustment-type')) {
        const adjustmentDiv = e.target.closest('.time-adjustment');
        if (!adjustmentDiv) return;
        
        const value = e.target.value;
        const isFraction = value.includes('fraction');
        const valueDiv = adjustmentDiv.querySelector('.adjustment-value');
        
        if (valueDiv) {
          const durationInput = valueDiv.querySelector('.duration-input');
          const fractionInput = valueDiv.querySelector('.fraction-input');
          
          if (durationInput) durationInput.style.display = isFraction ? 'none' : 'block';
          if (fractionInput) fractionInput.style.display = isFraction ? 'block' : 'none';
        }
      }
    });
    
    // Save button
    saveEventsBtn?.addEventListener('click', () => {
      updateButtonIcon(saveEventsBtn, 'loading');
      
      const events = getAllEventsData();
      console.log('Saving all events:', events);
      localStorage.setItem('userEvents', JSON.stringify(events));
      
      // Remove pulse effect after saving
      saveEventsBtn.classList.remove('pulse');
      
      // Show saving animation
      saveEventsBtn.classList.add('saving');
      setTimeout(() => saveEventsBtn.classList.remove('saving'), 500);
      updateButtonIcon(saveEventsBtn, 'checkmark', 1000, 'save');
    });
    
    // Delete button delegation
    eventsTableBody?.addEventListener('click', handleDeleteClick);
    
    // Group add button
    document.querySelector('.group-add-btn')?.addEventListener('click', () => {
      window.eventGroups.addGroup();
      updateGroupsUI();
    });
  }
  
  // Group Management
  function updateGroupsUI() {
    const groupsSection = elements.groupsSection;
    if (!groupsSection) return;
    
    const addBtn = groupsSection.querySelector('.group-add-btn');
    groupsSection.querySelectorAll('.group-item:not(.group-add-btn)').forEach(el => el.remove());
    
    // Add group items
    window.eventGroups.getAllGroups().forEach(group => {
      const groupItem = createGroupElement(group);
      groupsSection.insertBefore(groupItem, addBtn);
      setupGroupEventListeners(groupItem, group.id);
    });
  }
  
  function createGroupElement(group) {
    const div = document.createElement('div');
    div.className = 'group-item';
    div.dataset.groupId = group.id;
    div.innerHTML = `
      <div class="group-color-container">
        <div class="group-color" style="background-color: ${group.color}" 
             data-group-id="${group.id}"></div>
        <input type="color" class="group-color-picker" 
               value="${group.color}" data-group-id="${group.id}">
      </div>
      <span class="group-name">${group.name}</span>
    `;
    return div;
  }
  
  function setupGroupEventListeners(groupItem, groupId) {
    const colorEl = groupItem.querySelector('.group-color');
    const picker = groupItem.querySelector('.group-color-picker');
    const nameSpan = groupItem.querySelector('.group-name');
    
    // Color picker
    picker.style.cssText = 'position:absolute;opacity:0;pointer-events:none;width:1px;height:1px;';
    
    // Color click handler
    let clickTimer;
    colorEl.addEventListener('click', (e) => {
      e.stopPropagation();
      clearTimeout(clickTimer);
      clickTimer = setTimeout(() => picker.click(), 200);
    });
    
    // Double click to delete
    colorEl.addEventListener('dblclick', (e) => {
      e.stopPropagation();
      clearTimeout(clickTimer);
      if (confirm('Delete this group? Events using it will be unassigned.')) {
        if (window.eventGroups.deleteGroup(groupId)) {
          document.querySelectorAll(`.group-dropdown option[value="${groupId}"]`)
            .forEach(opt => opt.closest('select').value = 'none');
          updateGroupsUI();
        }
      }
    });
    
    // Color change handler
    picker.addEventListener('input', () => {
      const newColor = picker.value;
      if (window.eventGroups.updateGroupColor(groupId, newColor)) {
        colorEl.style.backgroundColor = newColor;
        updateEventRowsWithGroupColor(groupId, newColor);
      }
    });
    
    // Group name editing
    groupItem.addEventListener('dblclick', (e) => {
      if (e.target.closest('.group-color-container')) return;
      
      const input = document.createElement('input');
      input.value = nameSpan.textContent;
      input.className = 'group-name-edit';
      nameSpan.replaceWith(input);
      input.focus();
      
      const save = () => {
        const newName = input.value.trim();
        const group = window.eventGroups.getGroupById(groupId);
        if (newName && group && newName !== group.name) {
          group.name = newName;
          window.eventGroups.saveGroups();
        }
        updateGroupsUI();
      };
      
      input.addEventListener('blur', save, { once: true });
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') input.blur();
        else if (e.key === 'Escape') updateGroupsUI();
      });
    });
  }
  
  function updateEventRowsWithGroupColor(groupId, color) {
    document.querySelectorAll(`.group-dropdown option[value="${groupId}"]`)
      .forEach(opt => opt.style.setProperty('--color', color));
  }
  
  // Event Rows Management
  function addEventRow(data = {}) {
    const row = document.createElement('tr');
    row.dataset.id = data.id || Date.now();
    const prayers = getEnabledPrayers();
    const startValue = data.start || (prayers[0] || '');
    
    row.innerHTML = `
      <td class="event-name">
        <div class="event-name-content">
          <input type="text" name="name" class="event-input" 
                 placeholder="${data.name || 'New Event'}">
          <div class="event-actions-container">
            <select class="group-dropdown" name="group">
              <option value="none">No Group</option>
              ${window.eventGroups.getAllGroups().map(g => 
                `<option value="${g.id}" style="--color: ${g.color}">${g.name}</option>`
              ).join('')}
            </select>
            <button class="action-btn delete" title="Delete">🗑️</button>
          </div>
        </div>
      </td>
      ${createTimeColumn('start', startValue, prayers, data)}
      ${createTimeColumn('end', data.end || '', prayers, data)}
      <td class="event-conditions">
      <!-- <span class="event-conditions-content">(soon) example: not if end time > 7am<br>
      example: not if date is > 2026-04-17<br>
      example: not if day is monday</span> -->
      </td>
    `;
    
    eventsTableBody.appendChild(row);
    return row;
  }
  
  function createTimeColumn(prefix, value, prayers, data) {
    const isDisabled = prayers.length === 0;
    return `
      <td class="event-time">
        <select name="${prefix}" class="event-input prayer-dropdown" ${isDisabled ? 'disabled' : ''}>
          ${prayers.map(p => 
            `<option value="${p}" ${p === value ? 'selected' : ''}>${p}</option>`
          ).join('')}
        </select>
        <div class="time-adjustment">
          <select name="adjustmentType" class="event-input adjustment-type" data-column="${prefix}">
            <option value="+duration">+</option>
            <option value="-duration">-</option>
            <option value="+fraction">+ 1/</option>
            <option value="-fraction">- 1/</option>
          </select>
          <div class="adjustment-value">
            <input type="number" name="duration" class="event-input duration-input" 
                   min="0" max="1440" placeholder="minutes" data-column="${prefix}">
            <input type="number" name="fraction" class="event-input fraction-input" 
                   min="1" max="10" placeholder="fraction" style="display: none;" data-column="${prefix}">
          </div>
        </div>
      </td>
    `;
  }
  
  function handleDeleteClick(e) {
    const btn = e.target.closest('button.delete');
    if (!btn) return;
    
    e.preventDefault();
    e.stopPropagation();
    
    const row = btn.closest('tr');
    if (row) {
      row.remove();
      saveEventsBtn?.classList.add('pulse');
    }
    
    return false;
  }
  
  // Data Management
  function updateGroupDropdowns() {
    const groups = window.eventGroups.getAllGroups();
    document.querySelectorAll('.group-dropdown').forEach(dropdown => {
      const current = dropdown.value;
      dropdown.innerHTML = `<option value="none">No Group</option>${
        groups.map(g => 
          `<option value="${g.id}" style="--color: ${g.color}">${g.name}</option>`
        ).join('')
      }`;
      if (current && dropdown.querySelector(`option[value="${current}"]`)) {
        dropdown.value = current;
      }
    });
  }
  
  function getAllEventsData() {
    return Array.from(eventsTableBody?.querySelectorAll('tr') || []).map(row => {
      const data = { id: row.dataset.id };
      const groupSelect = row.querySelector('.group-dropdown');
      
      // Get group info if selected
      if (groupSelect?.value !== 'none') {
        const opt = groupSelect?.options[groupSelect.selectedIndex];
        if (opt) {
          data.group = {
            id: groupSelect.value,
            name: opt.text.trim(),
            color: getComputedStyle(opt).getPropertyValue('--color').trim() || '#000000'
          };
        }
      }
      
      // Process inputs
      row.querySelectorAll('.event-input').forEach(input => {
        if (!input.name) return;
        
        if (input.name === 'adjustmentType') {
          const col = input.dataset.column;
          if (col) data[`${col}AdjustmentType`] = input.value;
        } 
        else if (['duration', 'fraction'].includes(input.name)) {
          const adjustmentDiv = input.closest('.time-adjustment');
          if (!adjustmentDiv) return;
          
          const type = adjustmentDiv.querySelector('.adjustment-type')?.value;
          const col = input.dataset.column;
          
          if (type && col) {
            // Only process the input that matches the current adjustment type
            const isFractionType = type.includes('fraction');
            const isFractionInput = input.name === 'fraction';
            
            if ((isFractionType && isFractionInput) || (!isFractionType && !isFractionInput)) {
              const value = input.value === '' || input.value === null ? '0' : input.value;
              data[`${col}OffsetValue`] = value;
            }
          }
        }
        else if (input.value) {
          data[input.name] = input.value;
        }
      });
      
      return Object.fromEntries(
        Object.entries(data).filter(([_, v]) => v !== undefined && v !== '')
      );
    });
  }
  
  function getEnabledPrayers() {
    try {
      const settings = JSON.parse(localStorage.getItem('prayerSettings') || '{}');
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
  
  // Public API
  return { init };
})();

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => EventsTable.init());