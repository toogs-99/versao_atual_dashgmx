import { createDirectus, rest, staticToken } from '@directus/sdk';

// Use proxy in development to avoid CORS issues. SDK requires absolute URL.
export const directusUrl = import.meta.env.DEV
    ? window.location.origin + '/api'
    : import.meta.env.VITE_DIRECTUS_URL;

export const directus = createDirectus(directusUrl)
    .with(staticToken(import.meta.env.VITE_DIRECTUS_TOKEN))
    .with(rest());
