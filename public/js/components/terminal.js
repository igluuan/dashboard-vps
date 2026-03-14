/**
 * Web Terminal
 */

const Terminal = {
  /**
   * Initialize terminal
   */
  init() {
    this.output = document.getElementById('terminal-output');
    this.input = document.getElementById('terminal-input');

    if (this.input) {
      this.input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          this.execute();
        }
      });
    }
  },

  /**
   * Handle keyboard shortcuts
   */
  handleKeyDown(event) {
    if (event.key === 'Enter') {
      event.preventDefault();
      this.execute();
    }
  },

  /**
   * Execute command
   */
  async execute() {
    if (!this.input) return;

    const command = this.input.value.trim();
    if (!command) return;

    // Add command to output
    this.print('$ ' + command);

    // Clear input
    this.input.value = '';

    // Execute command
    const result = await API.executeCommand(command);

    if (result) {
      if (result.stdout) {
        this.print(result.stdout);
      }
      if (result.stderr) {
        this.print('\x1b[31m' + result.stderr + '\x1b[0m');
      }
    } else {
      this.print('\x1b[31mErro ao executar comando\x1b[0m');
    }

    // Scroll to bottom
    this.scrollToBottom();
  },

  /**
   * Print to terminal output
   */
  print(text) {
    if (!this.output) return;

    const line = document.createElement('div');
    line.textContent = text;
    this.output.appendChild(line);

    this.scrollToBottom();
  },

  /**
   * Clear terminal output
   */
  clear() {
    if (!this.output) return;
    this.output.innerHTML = '';
  },

  /**
   * Scroll to bottom
   */
  scrollToBottom() {
    if (!this.output) return;
    this.output.scrollTop = this.output.scrollHeight;
  },

  /**
   * Focus input
   */
  focus() {
    this.input?.focus();
  }
};

// Make available globally
window.Terminal = Terminal;