/**
 * Theme Management
 */

const Theme = {
  /**
   * Initialize theme
   */
  init() {
    // Check localStorage preference first, then system preference
    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

    if (savedTheme === 'light' || (!savedTheme && !prefersDark)) {
      document.body.classList.add('light-mode');
    }

    this.updateIcon();
  },

  /**
   * Toggle between light and dark
   */
  toggle() {
    const isLight = document.body.classList.contains('light-mode');

    if (isLight) {
      document.body.classList.remove('light-mode');
      localStorage.setItem('theme', 'dark');
    } else {
      document.body.classList.add('light-mode');
      localStorage.setItem('theme', 'light');
    }

    // Update chart colors
    if (window.Charts && Charts.updateColors) {
      Charts.updateColors();
    }

    this.updateIcon();
  },

  /**
   * Update theme icon
   */
  updateIcon() {
    const icon = document.getElementById('theme-icon');
    if (!icon) return;

    const isLight = document.body.classList.contains('light-mode');

    if (isLight) {
      icon.textContent = '☀️';
    } else {
      icon.textContent = '🌙';
    }
  },

  /**
   * Get current theme
   */
  getCurrent() {
    if (document.body.classList.contains('light-mode')) {
      return 'light';
    }
    return 'dark';
  },

  /**
   * Check if dark mode
   */
  isDark() {
    const isLight = document.body.classList.contains('light-mode');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    return !isLight && prefersDark;
  },

  /**
   * Get colors based on theme
   */
  getColors() {
    const isDarkMode = this.isDark();

    return {
      text: isDarkMode ? '#e8e8ea' : '#1a1a1e',
      textMuted: isDarkMode ? '#9898a0' : '#5c5c66',
      border: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
      grid: isDarkMode ? 'rgba(63,63,70,0.4)' : 'rgba(0,0,0,0.1)',
      accent: '#00d4aa',
      danger: '#ff4757',
      warning: '#ffa502'
    };
  }
};

// Make available globally
window.Theme = Theme;