document.addEventListener('DOMContentLoaded', function() {
  const sidebar = document.querySelector('.sidebar');
  const STORAGE_KEY = 'sidebarVisible';

  // Initialize sidebar state from localStorage or default to visible
  const isSidebarVisible = localStorage.getItem(STORAGE_KEY) !== 'false';
  updateSidebarState(isSidebarVisible);

  // Toggle sidebar visibility when 'f' key is pressed
  document.addEventListener('keydown', function(e) {
    if (e.key.toLowerCase() === 'f' && document.activeElement.tagName !== 'INPUT') {
      e.preventDefault();
      toggleSidebar();
    }
  });

  function toggleSidebar() {
    const isVisible = !sidebar.classList.contains('sidebar-hidden');
    updateSidebarState(!isVisible);
  }

  function updateSidebarState(show) {
    if (show) {
      sidebar.classList.remove('sidebar-hidden');
      sidebar.classList.add('sidebar-visible');
      localStorage.setItem(STORAGE_KEY, 'true');
      if (window.calendar) {
        window.calendar.changeView('timeGrid4Days');
      }
    } else {
      sidebar.classList.remove('sidebar-visible');
      sidebar.classList.add('sidebar-hidden');
      localStorage.setItem(STORAGE_KEY, 'false');
      if (window.calendar) {
        window.calendar.changeView('timeGridWeek');
      }
    }
  }
});