/**
 * The dashboard's scope lives in the URL and not in component state, so a
 * coordinator can bookmark "La Plata" and send that link to somebody else. The
 * server render reads the same parameter the filter writes, which is why the
 * name is declared once here rather than typed twice.
 */
export const MUNICIPALITY_PARAM = 'municipality';

/** The value meaning "no municipality chosen". Never written to the URL. */
export const ALL_MUNICIPALITIES = 'all';
