import { useEffect } from 'react'

type ThemeVars = Record<string, string>

const THEMES: Record<string, ThemeVars> = {
  midnight: {
    '--pulse-bg-primary':   '15 23 42',
    '--pulse-bg-secondary': '24 36 60',
    '--pulse-bg-tertiary':  '30 45 75',
    '--pulse-bg-elevated':  '38 58 94',
    '--pulse-bg-modifier':  '48 72 110',
    '--pulse-bg-floating':  '8 14 28',
    '--pulse-surface-overlay': '30 45 75',
    '--pulse-surface-card':    '38 58 94',
    '--pulse-surface-input':   '18 28 50',
    '--pulse-brand':       '59 130 246',
    '--pulse-brand-hover': '37 99 235',
    '--pulse-brand-dim':   '29 78 216',
  },
  forest: {
    '--pulse-bg-primary':   '13 31 13',
    '--pulse-bg-secondary': '20 40 20',
    '--pulse-bg-tertiary':  '26 50 26',
    '--pulse-bg-elevated':  '33 62 33',
    '--pulse-bg-modifier':  '42 78 42',
    '--pulse-bg-floating':  '7 16 7',
    '--pulse-surface-overlay': '26 50 26',
    '--pulse-surface-card':    '33 62 33',
    '--pulse-surface-input':   '16 36 16',
    '--pulse-brand':       '34 197 94',
    '--pulse-brand-hover': '22 163 74',
    '--pulse-brand-dim':   '15 128 57',
  },
  'rose-gold': {
    '--pulse-bg-primary':   '31 15 24',
    '--pulse-bg-secondary': '46 21 37',
    '--pulse-bg-tertiary':  '58 28 48',
    '--pulse-bg-elevated':  '72 36 60',
    '--pulse-bg-modifier':  '88 45 74',
    '--pulse-bg-floating':  '17 8 14',
    '--pulse-surface-overlay': '58 28 48',
    '--pulse-surface-card':    '72 36 60',
    '--pulse-surface-input':   '36 18 30',
    '--pulse-brand':       '236 72 153',
    '--pulse-brand-hover': '219 39 119',
    '--pulse-brand-dim':   '190 24 93',
  },
  cyber: {
    '--pulse-bg-primary':   '17 15 31',
    '--pulse-bg-secondary': '26 23 48',
    '--pulse-bg-tertiary':  '33 30 63',
    '--pulse-bg-elevated':  '43 40 82',
    '--pulse-bg-modifier':  '55 52 100',
    '--pulse-bg-floating':  '9 8 18',
    '--pulse-surface-overlay': '33 30 63',
    '--pulse-surface-card':    '43 40 82',
    '--pulse-surface-input':   '20 18 40',
    '--pulse-brand':       '168 85 247',
    '--pulse-brand-hover': '139 56 222',
    '--pulse-brand-dim':   '109 36 181',
  },
  ocean: {
    '--pulse-bg-primary':   '10 22 40',
    '--pulse-bg-secondary': '14 32 62',
    '--pulse-bg-tertiary':  '18 42 80',
    '--pulse-bg-elevated':  '24 56 98',
    '--pulse-bg-modifier':  '32 70 116',
    '--pulse-bg-floating':  '5 12 24',
    '--pulse-surface-overlay': '18 42 80',
    '--pulse-surface-card':    '24 56 98',
    '--pulse-surface-input':   '10 26 50',
    '--pulse-brand':       '6 182 212',
    '--pulse-brand-hover': '8 145 178',
    '--pulse-brand-dim':   '14 116 144',
  },
}

const DEFAULT_VARS: ThemeVars = {
  '--pulse-bg-primary':   '26 27 30',
  '--pulse-bg-secondary': '36 37 39',
  '--pulse-bg-tertiary':  '43 45 49',
  '--pulse-bg-elevated':  '49 51 56',
  '--pulse-bg-modifier':  '59 61 67',
  '--pulse-bg-floating':  '17 18 20',
  '--pulse-surface-overlay': '43 45 49',
  '--pulse-surface-card':    '49 51 56',
  '--pulse-surface-input':   '30 31 34',
  '--pulse-brand':       '239 68 68',
  '--pulse-brand-hover': '220 38 38',
  '--pulse-brand-dim':   '185 28 28',
}

export function useTheme(themeName: string | null | undefined) {
  useEffect(() => {
    const vars = themeName ? (THEMES[themeName] ?? null) : null
    const root = document.documentElement
    const apply = vars ?? DEFAULT_VARS
    Object.entries(apply).forEach(([k, v]) => root.style.setProperty(k, v))
    // Reset keys not in the new theme to defaults
    if (vars) {
      Object.keys(DEFAULT_VARS).forEach(k => {
        if (!(k in vars)) root.style.setProperty(k, DEFAULT_VARS[k])
      })
    }
  }, [themeName])
}
