// Hold color name → hex mapping
export const CLIMB_COLORS = {
  red:    '#C0392B',
  blue:   '#2471A3',
  green:  '#1E8449',
  yellow: '#D4AC0D',
  orange: '#CA6F1E',
  purple: '#7D3C98',
  pink:   '#C0527A',
  white:  '#D5D8DC',
  gray:   '#707B7C',
  black:  '#2C3E50',
  tan:    '#C4A882',
}

// Returns the hex color for a hold color name, falling back to a neutral zinc
export function climbColor(color) {
  if (!color) return '#52525b'
  return CLIMB_COLORS[color.toLowerCase()] ?? '#52525b'
}

// Full color option list used in climb creation / editing forms
export const COLOR_OPTIONS = [
  { value: 'red',    label: 'Red',    hex: '#C0392B' },
  { value: 'blue',   label: 'Blue',   hex: '#2471A3' },
  { value: 'green',  label: 'Green',  hex: '#1E8449' },
  { value: 'yellow', label: 'Yellow', hex: '#D4AC0D' },
  { value: 'orange', label: 'Orange', hex: '#CA6F1E' },
  { value: 'purple', label: 'Purple', hex: '#7D3C98' },
  { value: 'pink',   label: 'Pink',   hex: '#C0527A' },
  { value: 'white',  label: 'White',  hex: '#D5D8DC' },
  { value: 'gray',   label: 'Gray',   hex: '#707B7C' },
  { value: 'black',  label: 'Black',  hex: '#2C3E50' },
  { value: 'tan',    label: 'Tan',    hex: '#C4A882' },
]
