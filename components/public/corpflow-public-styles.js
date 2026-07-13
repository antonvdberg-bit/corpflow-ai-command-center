/**
 * Restrained CorpFlowAI public palette — editorial + conversion surfaces.
 * Not LuxeMaurice gold/charcoal. Reuses approved CorpFlow tokens.
 */

export const CF = {
  bg: 'linear-gradient(135deg, #06111f 0%, #0b1f33 45%, #101827 100%)',
  text: '#eef6ff',
  textMuted: '#aebfd1',
  textFaint: '#9fb2c8',
  accent: '#2dd4bf',
  accentOn: '#031018',
  link: '#7dd3fc',
  panel: 'rgba(255,255,255,0.04)',
  panelBorder: 'rgba(255,255,255,0.10)',
  panelStrong: 'rgba(45,212,191,0.08)',
  panelStrongBorder: 'rgba(45,212,191,0.28)',
  maxWidth: 1120,
  narrowWidth: 800,
  wideWidth: 960,
  font: 'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
};

export const cfPage = {
  minHeight: '100vh',
  background: CF.bg,
  color: CF.text,
  fontFamily: CF.font,
};

export const cfShell = (maxWidth = CF.maxWidth) => ({
  maxWidth,
  margin: '0 auto',
  padding: '32px 20px 56px',
});

export const cfKicker = {
  fontSize: 11.5,
  letterSpacing: '0.16em',
  textTransform: 'uppercase',
  color: CF.link,
  margin: '0 0 10px',
  fontWeight: 700,
};

export const cfH1 = {
  margin: '0 0 12px',
  fontSize: 'clamp(30px, 5.5vw, 48px)',
  lineHeight: 1.08,
  letterSpacing: '-0.03em',
  maxWidth: 820,
};

export const cfLead = {
  margin: '0 0 20px',
  fontSize: 'clamp(16px, 2vw, 19px)',
  lineHeight: 1.65,
  color: '#dbe7f5',
  maxWidth: 720,
};

export const cfSection = { marginTop: 40 };

export const cfH2 = {
  margin: '0 0 12px',
  fontSize: 'clamp(22px, 3vw, 28px)',
  letterSpacing: '-0.02em',
  color: '#eef6ff',
};

export const cfBody = {
  color: CF.textMuted,
  lineHeight: 1.75,
  margin: '0 0 14px',
  fontSize: 15.5,
};

export const cfGrid = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
  gap: 16,
  marginTop: 16,
  minWidth: 0,
};

export const cfCard = {
  background: CF.panel,
  border: `1px solid ${CF.panelBorder}`,
  borderRadius: 18,
  padding: '22px 24px',
  minWidth: 0,
};

export const cfBtnBase = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  minHeight: 46,
  padding: '12px 20px',
  borderRadius: 14,
  fontWeight: 700,
  fontSize: 14.5,
  textDecoration: 'none',
  cursor: 'pointer',
  border: 'none',
  lineHeight: 1.2,
};

export const cfBtnPrimary = {
  ...cfBtnBase,
  background: CF.accent,
  color: CF.accentOn,
};

export const cfBtnSecondary = {
  ...cfBtnBase,
  background: 'rgba(255,255,255,0.09)',
  color: CF.text,
  border: `1px solid ${CF.panelBorder}`,
};

export const cfLink = {
  color: CF.link,
  textDecoration: 'none',
  fontWeight: 600,
};
