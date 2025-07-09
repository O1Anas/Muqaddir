class PrayerEventControls {
    constructor(prayerTimesParser) {
        this.parser = prayerTimesParser;
        this.controlsGrid = document.querySelector('.prayer-controls-grid');
        this.saveButton = document.getElementById('savePrayerSettings');
        this.originalSettings = {};
        this.currentSettings = {};
        this.unsavedChanges = false;

        if (!this.controlsGrid) return;

        this.init();
    }

    init() {
        this.loadSettings();
        this.populateControls();
        this.attachEventListeners();
        this.updateSaveButtonState();
    }

    loadSettings() {
        try {
            const savedSettings = localStorage.getItem('prayerSettings');
            this.originalSettings = savedSettings ? JSON.parse(savedSettings) : {};
            this.currentSettings = JSON.parse(JSON.stringify(this.originalSettings));
        } catch (e) {
            console.error('Error loading settings:', e);
            this.originalSettings = {};
            this.currentSettings = {};
        }
    }

    populateControls() {
        const defaultSettings = this.parser.DEFAULT_PRAYER_EVENT_SETTINGS;
        
        // Get all unique prayers from both sources
        const allPrayers = new Set([
            ...Object.keys(defaultSettings),
            ...Object.keys(this.currentSettings)
        ]);

        // Create an array with prayers in the order of allowedPrayerEvents, followed by any others
        const orderedPrayers = [
            ...this.parser.allowedPrayerEvents.filter(prayer => allPrayers.has(prayer)),
            ...Array.from(allPrayers).filter(prayer => !this.parser.allowedPrayerEvents.includes(prayer))
        ];

        this.controlsGrid.innerHTML = orderedPrayers
            .map(prayer => {
                // Merge default settings with current settings for this prayer
                const settings = {
                    ...defaultSettings[prayer],
                    ...(this.currentSettings[prayer] || {})
                };
                return this.createPrayerControlHTML(prayer, settings);
            })
            .join('');
    }

    createPrayerControlHTML(prayer, settings) {
        const isEnabled = settings.enabled !== false; // Default to true if not set
        const duration = settings.duration || 30;
        
        return `
            <div class="prayer-control" data-prayer="${prayer}">
                <span class="prayer-name ${!isEnabled ? 'disabled' : ''}" 
                      data-prayer="${prayer}">${prayer}</span>
                <div class="control-group">
                    <input type="number" 
                           value="${duration}" 
                           min="1" 
                           max="300" 
                           class="duration-input" 
                           data-prayer="${prayer}" 
                           title="Duration in minutes">
                </div>
            </div>
        `;
    }

    attachEventListeners() {
        // Toggle prayer enabled/disabled
        this.controlsGrid.addEventListener('click', (e) => {
            if (e.target.classList.contains('prayer-name')) {
                e.preventDefault();
                this.togglePrayerEnabled(e.target);
            }
        });

        // Track duration changes
        this.controlsGrid.addEventListener('change', (e) => {
            if (e.target.classList.contains('duration-input')) {
                this.handleDurationChange(e.target);
            }
        });

        // Save settings when save button is clicked
        if (this.saveButton) {
            this.saveButton.addEventListener('click', () => this.saveSettings());
        }
    }

    togglePrayerEnabled(element) {
        const prayer = element.dataset.prayer;
        if (!prayer) return;

        // Toggle the disabled class for UI
        element.classList.toggle('disabled');
        
        // Get the current enabled state from the UI
        const isEnabled = !element.classList.contains('disabled');
        
        // Get existing settings for this prayer from original settings or defaults
        const defaultSettings = this.parser.DEFAULT_PRAYER_EVENT_SETTINGS[prayer] || {};
        const existingSettings = this.originalSettings[prayer] || {};
        
        // Update current settings with existing settings and toggle the enabled state
        this.currentSettings[prayer] = {
            ...defaultSettings,
            ...existingSettings,
            ...this.currentSettings[prayer],
            enabled: isEnabled
        };
        
        this.markAsChanged();
    }

    handleDurationChange(input) {
        const prayer = input.dataset.prayer;
        const duration = parseInt(input.value, 10) || 30;
        
        if (!prayer) return;
        
        // Update current settings
        if (!this.currentSettings[prayer]) {
            this.currentSettings[prayer] = {};
        }
        this.currentSettings[prayer].duration = duration;
        
        this.markAsChanged();
    }

    markAsChanged() {
        this.unsavedChanges = true;
        this.updateSaveButtonState();
    }

    updateSaveButtonState() {
        if (!this.saveButton) return;
        
        // Update button state based on whether there are unsaved changes
        this.saveButton.disabled = !this.unsavedChanges;
        this.saveButton.classList.toggle('has-unsaved-changes', this.unsavedChanges);
        
        // Update title to show if there are unsaved changes
        this.saveButton.title = this.unsavedChanges 
            ? 'Save changes to apply to calendar' 
            : 'Settings are up to date';
    }

    saveSettings() {
        if (!this.unsavedChanges) return;

        try {
            updateButtonIcon(this.saveButton, 'loading');
            
            // Get existing settings to merge with
            const existingSettings = JSON.parse(localStorage.getItem('prayerSettings') || '{}');
            const defaultSettings = this.parser.DEFAULT_PRAYER_EVENT_SETTINGS || {};
            
            // Create a new settings object that preserves all prayer settings
            const allPrayers = new Set([
                ...Object.keys(defaultSettings),
                ...Object.keys(existingSettings),
                ...Object.keys(this.currentSettings)
            ]);
            
            const mergedSettings = {};
            
            // For each prayer, merge settings in the correct order of precedence
            allPrayers.forEach(prayer => {
                mergedSettings[prayer] = {
                    ...defaultSettings[prayer],
                    ...(existingSettings[prayer] || {}),
                    ...(this.currentSettings[prayer] || {})
                };
            });
            
            // Save merged settings to localStorage
            localStorage.setItem('prayerSettings', JSON.stringify(mergedSettings));
            
            // Update original settings to match current settings
            this.originalSettings = JSON.parse(JSON.stringify(mergedSettings));
            this.currentSettings = JSON.parse(JSON.stringify(mergedSettings));
            
            // Update the calendar with new settings
            this.updateCalendarWithNewSettings();
            
            // Update UI
            this.unsavedChanges = false;
            this.updateSaveButtonState();
            
            console.log('Prayer settings saved and calendar updated!');
            updateButtonIcon(this.saveButton, 'checkmark', 1000, 'save');
        } catch (e) {
            console.error('Error saving prayer settings:', e);
        }
    }

    updateCalendarWithNewSettings() {
        if (!this.parser || !this.parser.calendar) {
            console.warn('Parser or calendar not available for update.');
            return;
        }

        try {
            const lastData = localStorage.getItem('lastPrayerTimesData');
            if (lastData) {
                console.log('Updating calendar with new settings.');
                this.parser.addPrayerTimesToCalendar(JSON.parse(lastData));
            }
        } catch (e) {
            console.error('Error updating calendar with new settings:', e);
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    if (window.prayerTimesParser) {
        new PrayerEventControls(window.prayerTimesParser);
    } else {
        console.error('PrayerTimesParser not found. Controls not initialized.');
    }
});