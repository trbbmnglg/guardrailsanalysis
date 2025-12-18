// Tailwind CSS Configuration
tailwind.config = {
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        dark: {
            bg: '#0f111a',      // Main background (Deep Dark)
            panel: '#1e2130',   // Card/Sidebar background
            border: '#2d3246',  // Borders
            text: '#e2e8f0',    // Main text
            muted: '#94a3b8'    // Muted text
        },
        brand: {
            purple: '#8b5cf6',  // Primary accent
            glow: 'rgba(139, 92, 246, 0.5)'
        }
      },
      fontFamily: {
        sans: ['"Inter"', 'sans-serif'],
        heading: ['"Plus Jakarta Sans"', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      boxShadow: {
        'sidebar': '4px 0 15px rgba(0, 0, 0, 0.1)',
        'neon': '0 0 10px rgba(139, 92, 246, 0.3)',
      }
    }
  }
}