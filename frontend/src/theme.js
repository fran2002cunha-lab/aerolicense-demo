export const c = {
  bgDeep:    '#020B16',
  bgSurface: '#081729',
  bgElevated:'#060F1E',
  bgCard:    '#0C1E34',
  bgHeader:  '#040C18',
  border:    '#162D4A',
  borderHover:'#2A5298',
  primary:   '#1D4ED8',
  primaryLt: '#60A5FA',
  primaryGlow:'#1D4ED840',
  text:      '#EDF2F8',
  textSub:   '#94A9C4',
  textMuted: '#5A7A9A',
  textDim:   '#243A55',
  green:     '#10B981',
  greenLt:   '#34D399',
  greenBg:   '#10B98115',
  amber:     '#F59E0B',
  amberLt:   '#FCD34D',
  amberBg:   '#F59E0B15',
  red:       '#EF4444',
  redLt:     '#F87171',
  redBg:     '#EF444415',
  purple:    '#8B5CF6',
  purpleLt:  '#A78BFA',
};

export const gradientPrimary  = 'linear-gradient(135deg, #1D4ED8 0%, #0EA5E9 100%)';
export const gradientSurface  = 'linear-gradient(160deg, #0C1E34 0%, #060F1E 100%)';
export const gradientHero     = 'linear-gradient(135deg, #020B16 0%, #0C1830 50%, #020B16 100%)';

export const shadow = {
  card:  '0 1px 3px rgba(0,0,0,.4), 0 4px 16px rgba(0,0,0,.25)',
  hover: '0 4px 24px rgba(29,78,216,.18), 0 1px 4px rgba(0,0,0,.4)',
  glow:  '0 0 0 1px #1D4ED840, 0 4px 24px rgba(29,78,216,.22)',
};

export const statusColor = {
  valid:         c.green,
  expiring_soon: c.amber,
  expired:       c.red,
};

export const statusLabel = {
  valid:         'Válido',
  expiring_soon: 'A expirar',
  expired:       'Expirado',
};

export const riskColor = {
  safe:      c.green,
  attention: c.amber,
  critical:  c.red,
};

export const riskLabel = {
  safe:      'SEGURO',
  attention: 'ATENÇÃO',
  critical:  'CRÍTICO',
};

export const pilotStatusBadge = (compliance_ok, expired) => {
  if (expired > 0) return { label: 'CRÍTICO',  color: c.red,   bg: c.redBg };
  if (!compliance_ok) return { label: 'ATENÇÃO', color: c.amber, bg: c.amberBg };
  return { label: 'CONFORME', color: c.green,  bg: c.greenBg };
};
