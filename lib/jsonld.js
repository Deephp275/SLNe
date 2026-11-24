// JSON for <script type="application/ld+json">. Escapes "<" (and the two Unicode line separators) so text like
// "</script>" in a product name can never close the tag and inject HTML or script into the page.
const LS = new RegExp('\\u2028', 'g');
const PS = new RegExp('\\u2029', 'g');
export const safeJson = (obj) => JSON.stringify(obj).replace(/</g, '\\u003c').replace(LS, '\\u2028').replace(PS, '\\u2029');
