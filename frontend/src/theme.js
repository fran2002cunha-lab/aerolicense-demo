export const c = {
  bgDeep:    '#030D1A',
  bgSurface: '#0B1E35',
  bgElevated:'#071425',
  bgHeader:  '#050F1C',
  border:    '#1E3A5F',
  primary:   '#1A56DB',
  primaryLt: '#38BDF8',
  text:      '#E8EFF8',
  textMuted: '#6B8BAD',
  textDim:   '#2A4A6A',
  green:     '#22C55E',
  amber:     '#F59E0B',
  red:       '#EF4444',
  purple:    '#A78BFA',
};

export const gradientPrimary = 'linear-gradient(135deg, #1A56DB, #0EA5E9)';

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
  if (expired > 0) return { label: 'CRÍTICO',  color: c.red };
  if (!compliance_ok) return { label: 'ATENÇÃO', color: c.amber };
  return { label: 'CONFORME', color: c.green };
};
