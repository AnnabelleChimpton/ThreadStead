import { createContext } from 'react';

/**
 * The editor's preview drawn "As a visitor" (pages/template-preview.tsx).
 * Parts that ask the server who's looking, like FollowButton, answer for
 * the page's owner otherwise: in the preview, they show what someone signed
 * out sees. Only the preview sets it, never a live page.
 */
export const PreviewAsVisitor = createContext(false);
