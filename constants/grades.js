// Full V-grade ordering array (V0–V17)
export const V_GRADE_ORDER = [
  'V0','V1','V2','V3','V4','V5','V6','V7','V8',
  'V9','V10','V11','V12','V13','V14','V15','V16','V17',
]

// Grade scale used for the filter slider (VB–V10)
export const GRADE_SCALE = ['VB', 'V0', 'V1', 'V2', 'V3', 'V4', 'V5', 'V6', 'V7', 'V8', 'V9', 'V10']
export const GRADE_SCALE_MAX = GRADE_SCALE.length - 1

// Grade labels shown on the gym distribution chart
export const CHART_GRADES = ['VB', 'V0', 'V1', 'V2', 'V3', 'V4', 'V5', 'V6', 'V7', 'V8', 'V9', 'V10']

// Rope grades in order
export const ROPE_GRADES = [
  '5.6','5.7','5.8','5.9','5.9+',
  '5.10-','5.10','5.10+',
  '5.11-','5.11','5.11+',
  '5.12-','5.12','5.12+',
  '5.13-','5.13','5.13+',
  '5.14-','5.14','5.14+',
  '5.15-','5.15','5.15+',
]

// Zone disciplines that use rope grades
export const ROPE_DISCIPLINES = ['Lead', 'Top Rope', 'Autobelay']

// Hex colors for V-grades (VB–V17), used in bar charts
export const GRADE_HEX = {
  VB: '#15803d',
  V0: '#16a34a', V1: '#22c55e', V2: '#84cc16',
  V3: '#eab308', V4: '#fb923c', V5: '#f97316',
  V6: '#ef4444', V7: '#dc2626', V8: '#be123c',
  V9: '#be185d', V10: '#9333ea', V11: '#7e22ce',
  V12: '#6d28d9', V13: '#4338ca', V14: '#1d4ed8',
  V15: '#0369a1', V16: '#0e7490', V17: '#0f766e',
}
