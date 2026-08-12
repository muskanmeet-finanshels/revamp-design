/**
 * Finanshels semantic design tokens — synced from the web artifact's
 * tailwind.config.ts (brand orange #F16611, navy text #082032, Poppins type).
 */

const colors = {
  light: {
    // Legacy aliases
    text: '#082032',
    tint: '#F16611',

    // Core surfaces
    background: '#ffffff',
    foreground: '#082032',

    // Cards / elevated surfaces
    card: '#ffffff',
    cardForeground: '#082032',

    // Primary action color (brand orange)
    primary: '#F16611',
    primaryForeground: '#ffffff',
    primaryHover: '#D95C0F',
    primarySoft: '#FEF0E7',

    // Secondary
    secondary: '#F4F4F4',
    secondaryForeground: '#334756',

    // Muted
    muted: '#F9FAFB',
    mutedForeground: '#9CA3AF',

    // Accent
    accent: '#FFF7E9',
    accentForeground: '#334756',

    // Semantic status
    success: '#22C55E',
    successSoft: '#E9F9EF',
    destructive: '#EF4444',
    destructiveForeground: '#ffffff',
    destructiveSoft: '#FDECEC',
    info: '#334756',
    infoSoft: '#E6E9EB',
    warning: '#FFA533',
    warningSoft: '#FFF7E9',

    // Borders / inputs
    border: '#EEEEEE',
    input: '#DDDDDD',
  },

  // Border radius (px) — matches web --radius
  radius: 8,
};

export default colors;
