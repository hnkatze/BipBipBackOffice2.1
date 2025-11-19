/**
 * BipBip PrimeNG Theme Preset
 * Color principal de marca: #fb0021
 *
 * Este preset define los colores de la marca BipBip para PrimeNG.
 * Basado en el sistema de Design Tokens de PrimeNG.
 */

export const BipBipPreset = {
  primitive: {
    // Paleta de color principal de la marca (rojo #fb0021)
    bipbipred: {
      50: '#fee2e7',
      100: '#fcc5cf',
      200: '#fa8b9f',
      300: '#f9516f',
      400: '#fc1944',
      500: '#fb0021',  // Color principal de marca
      600: '#d10019',
      700: '#a70014',
      800: '#7d000f',
      900: '#53000a',
      950: '#2a0005',
    },
    // Colores neutros para backgrounds y superficies
    slate: {
      50: '#f8fafc',
      100: '#f1f5f9',
      200: '#e2e8f0',
      300: '#cbd5e1',
      400: '#94a3b8',
      500: '#64748b',
      600: '#475569',
      700: '#334155',
      800: '#1e293b',
      900: '#0f172a',
      950: '#020617',
    },
  },
  semantic: {
    // Color primario (usa el rojo de marca)
    primary: {
      50: '{bipbipred.50}',
      100: '{bipbipred.100}',
      200: '{bipbipred.200}',
      300: '{bipbipred.300}',
      400: '{bipbipred.400}',
      500: '{bipbipred.500}',
      600: '{bipbipred.600}',
      700: '{bipbipred.700}',
      800: '{bipbipred.800}',
      900: '{bipbipred.900}',
      950: '{bipbipred.950}',
    },
    // Colores de estado (success, info, warning, danger)
    colorScheme: {
      light: {
        primary: {
          color: '{bipbipred.500}',
          contrastColor: '#ffffff',
          hoverColor: '{bipbipred.600}',
          activeColor: '{bipbipred.700}',
        },
        highlight: {
          background: '{bipbipred.50}',
          focusBackground: '{bipbipred.100}',
          color: '{bipbipred.700}',
          focusColor: '{bipbipred.800}',
        },
        surface: {
          0: '#ffffff',
          50: '{slate.50}',
          100: '{slate.100}',
          200: '{slate.200}',
          300: '{slate.300}',
          400: '{slate.400}',
          500: '{slate.500}',
          600: '{slate.600}',
          700: '{slate.700}',
          800: '{slate.800}',
          900: '{slate.900}',
          950: '{slate.950}',
        },
      },
      dark: {
        primary: {
          color: '{bipbipred.400}',
          contrastColor: '{slate.950}',
          hoverColor: '{bipbipred.300}',
          activeColor: '{bipbipred.200}',
        },
        highlight: {
          background: 'color-mix(in srgb, {bipbipred.400}, transparent 84%)',
          focusBackground: 'color-mix(in srgb, {bipbipred.400}, transparent 76%)',
          color: 'rgba(255,255,255,.87)',
          focusColor: 'rgba(255,255,255,.87)',
        },
        surface: {
          0: '#ffffff',
          50: '{slate.50}',
          100: '{slate.100}',
          200: '{slate.200}',
          300: '{slate.300}',
          400: '{slate.400}',
          500: '{slate.500}',
          600: '{slate.600}',
          700: '{slate.700}',
          800: '{slate.800}',
          900: '{slate.900}',
          950: '{slate.950}',
        },
      },
    },
  },
  // CSS personalizado para multiselect chips en dark mode
  css: ({ dt }: any) => `
    /* Multiselect chips en dark mode */
    .dark .p-multiselect-chip,
    .dark .p-multiselect-label .p-chip {
      background: ${dt('primary.200')} !important;
      color: ${dt('slate.950')} !important;
    }

    .dark .p-multiselect-chip:hover,
    .dark .p-multiselect-label .p-chip:hover {
      background: ${dt('primary.200')} !important;
    }
  `,
};
