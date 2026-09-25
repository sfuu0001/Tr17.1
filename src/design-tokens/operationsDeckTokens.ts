/**
 * OPERATIONS_DECK V4.8 MESH DISPATCH - Design Tokens
 * Industrial High-Contrast Design System Specification
 * Standards-compliant: DTCG (Design Tokens Community Group) compatible
 */

export const operationsDeckTokens = {
  $name: 'Operations Deck Industrial Design System',
  $version: '4.8.0',
  $description: 'High-contrast white industrial telemetry & operations design system tokens for desktop and mobile folding views',
  
  // 1. Color System
  color: {
    base: {
      white: '#ffffff',
      black: '#000000',
      transparent: 'transparent'
    },
    neutral: {
      50: '#fbfbf9',   // Canvas tint / micro panel bg
      100: '#fafaf8',  // Secondary container surface
      200: '#f5f5f2',  // Hover surface & subtle divider
      300: '#f0f0eb',  // Divider hair-line
      400: '#e5e5e0',  // Primary card & container border
      500: '#d3d1cb',  // Medium emphasis border / inactive icon
      600: '#a0a09a',  // Muted caption / empty placeholder text
      700: '#767670',  // Secondary label & telemetry metadata
      800: '#333330',  // High readability body text
      900: '#1a1c1b',  // Active accent / dark container hover
      950: '#111110'   // Primary headline / dark foreground
    },
    status: {
      success: {
        bg: '#f0fdf4',
        border: 'rgba(21, 128, 61, 0.3)',
        solid: '#15803d',
        text: '#15803d',
        label: '营运在线 / 正常 / 恒温稳态'
      },
      info: {
        bg: '#eff6ff',
        border: 'rgba(37, 99, 235, 0.3)',
        solid: '#2563eb',
        text: '#2563eb',
        label: '外卖专送 / 堂食就席 / 调度流转'
      },
      warning: {
        bg: '#fffbeb',
        border: 'rgba(217, 119, 6, 0.3)',
        solid: '#d97706',
        text: '#d97706',
        label: '排队拥堵 / 即将到车 / 缓冲预警'
      },
      danger: {
        bg: '#fef2f2',
        border: 'rgba(220, 38, 38, 0.4)',
        solid: '#dc2626',
        text: '#dc2626',
        label: '紧急熔断 / 缺料故障 / 超时'
      },
      idle: {
        bg: '#fafaf8',
        border: '#d3d1cb',
        solid: '#767670',
        text: '#767670',
        label: '空置待命 / 维保离线'
      }
    }
  },

  // 2. Typography System
  typography: {
    fontFamily: {
      heading: '"Space Grotesk", system-ui, -apple-system, sans-serif',
      body: '"Space Grotesk", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "PingFang SC", "Microsoft YaHei", sans-serif',
      mono: '"Space Grotesk", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "PingFang SC", "Microsoft YaHei", sans-serif'
    },
    fontSize: {
      micro: '10px',
      xs: '11px',
      sm: '12px',
      base: '14px',
      md: '15px',
      lg: '18px',
      xl: '20px',
      '2xl': '24px',
      '3xl': '30px'
    },
    lineHeight: {
      none: '1',
      tight: '1.2',
      snug: '1.35',
      normal: '1.5',
      relaxed: '1.65'
    },
    fontWeight: {
      normal: '400',
      medium: '500',
      semibold: '600',
      bold: '700'
    },
    letterSpacing: {
      tighter: '-0.03em',
      tight: '-0.015em',
      normal: '0',
      wide: '0.04em',
      wider: '0.08em',
      widest: '0.12em'
    }
  },

  // 3. Spacing & Grid System
  spacing: {
    0: '0px',
    0.5: '2px',
    1: '4px',
    1.5: '6px',
    2: '8px',
    2.5: '10px',
    3: '12px',
    3.5: '14px',
    4: '16px',
    5: '20px',
    6: '24px',
    8: '32px',
    10: '40px',
    12: '48px'
  },

  // 4. Shape & Border Radii (Strict 3px micro-radii rule)
  radii: {
    none: '0px',
    sharp: '1px',
    badge: '2px',
    control: '3px',
    modal: '4px',
    full: '9999px'
  },

  // 5. Elevation & Shadows (Pure High-contrast industrial flat profile)
  elevation: {
    none: 'none',
    micro: '0 1px 1px rgba(0, 0, 0, 0.02)',
    card: '0 1px 2px rgba(0, 0, 0, 0.03)',
    dropdown: '0 4px 12px rgba(0, 0, 0, 0.08)',
    modal: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.05)'
  },

  // 6. Component Specs
  components: {
    header: {
      height: '52px',
      borderBottom: '1px solid #e5e5e0',
      background: '#ffffff'
    },
    button: {
      sm: { height: '24px', paddingX: '8px', fontSize: '11px', radius: '2px' },
      base: { height: '28px', paddingX: '10px', fontSize: '12px', radius: '3px' },
      lg: { height: '32px', paddingX: '12px', fontSize: '12px', radius: '3px' }
    },
    badge: {
      height: '18px',
      paddingX: '6px',
      fontSize: '10px',
      radius: '2px',
      fontWeight: '600'
    },
    card: {
      border: '1px solid #e5e5e0',
      radius: '3px',
      background: '#ffffff',
      foldedHeight: '38px',
      hoverBorder: '#1a1c1b'
    },
    cabinSlot: {
      aspectRatio: '1 / 1',
      height: '64px',
      radius: '2px',
      borderEmpty: '1px dashed #d3d1cb',
      borderActive: '1px solid #d3d1cb',
      borderCalling: '1px solid rgba(21, 128, 61, 0.6)'
    }
  },

  // 7. Motion & Transition
  motion: {
    duration: {
      fast: '150ms',
      normal: '200ms',
      slow: '300ms'
    },
    easing: {
      standard: 'cubic-bezier(0.2, 0.0, 0, 1.0)',
      decelerate: 'cubic-bezier(0.0, 0.0, 0.2, 1)',
      accelerate: 'cubic-bezier(0.3, 0.0, 1, 1)'
    }
  }
} as const;

export type OperationsDeckTokens = typeof operationsDeckTokens;
