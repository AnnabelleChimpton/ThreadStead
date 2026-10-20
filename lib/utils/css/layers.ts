// Profile CSS mode names. The @layer order itself is declared once, in
// styles/globals.css; user and site CSS are injected unlayered by _app.tsx
// (see lib/utils/css/css-transform.ts for the transforms).

export type CSSMode = 'inherit' | 'override' | 'disable';
export type TemplateMode = 'default' | 'enhanced' | 'advanced';

