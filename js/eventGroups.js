// Initialize window.eventGroups if it doesn't exist
if (!window.eventGroups) {
  window.eventGroups = {
    groups: [],
    
    // Generate a random hex color
    
    lastColor: [0, 0, 0],
    generateRandomColor: function () {
      const minDiff = 75;
      let rgb;
      do {
        const values = [0, 180, Math.floor(Math.random() * 181)];
        rgb = [0, 1, 2].sort(() => 0.5 - Math.random()).map(i => values[i]);
      } while (rgb.every((v, i) => Math.abs(v - this.lastColor[i]) < minDiff));
      this.lastColor = rgb;
      return '#' + rgb.map(v => v.toString(16).padStart(2, '0')).join('');
    },
    
    // Add a new group
    addGroup: function(name = '') {
      const color = this.generateRandomColor();
      const groupName = name || `Group ${this.groups.length + 1}`;
      const group = {
        id: Date.now(),
        name: groupName,
        color: color
      };
      this.groups.push(group);
      this.saveGroups();
      return group;
    },
    
    // Update a group's color
    updateGroupColor: function(groupId, color) {
      const group = this.groups.find(g => g.id === groupId);
      if (group) {
        group.color = color;
        this.saveGroups();
        return true;
      }
      return false;
    },
    
    // Delete a group
    deleteGroup: function(groupId) {
      const index = this.groups.findIndex(g => g.id === groupId);
      if (index !== -1) {
        this.groups.splice(index, 1);
        this.saveGroups();
        return true;
      }
      return false;
    },
    
    // Get all groups
    getAllGroups: function() {
      return [...this.groups];
    },
    
    // Get a group by ID
    getGroupById: function(id) {
      return this.groups.find(g => g.id === id);
    },
    
    // Save groups to localStorage and update UI
    saveGroups: function() {
      localStorage.setItem('eventGroups', JSON.stringify(this.groups));
      // Update group dropdowns in the events table if it exists
      if (window.updateGroupDropdowns) {
        window.updateGroupDropdowns();
      }
    },
    
    // Load groups from localStorage
    loadGroups: function() {
      const savedGroups = localStorage.getItem('eventGroups');
      if (savedGroups) {
        try {
          this.groups = JSON.parse(savedGroups);
        } catch (e) {
          console.error('Error loading groups:', e);
          this.groups = [];
        }
      }
      
      // Ensure we always have at least one group
      if (this.groups.length === 0) {
        this.addGroup();
      }
    },
    
    // Initialize the groups
    init: function() {
      this.loadGroups();
    }
  };
  
  // Initialize the groups
  window.eventGroups.init();
}
