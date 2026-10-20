/**
 * "Did you know?" explainers behind the eye icon on the first screen's
 * service tiles (Jim, 2026-10-16): what separates glass replacement from a
 * full window, a patio door from a door system, and so on. Keyed by the
 * triage option id (src/lib/triage/triageTree.ts). Keep each under ~140
 * characters so it fits inside a phone-width tile.
 */
export const SERVICE_INFO: Record<string, string> = {
  'cat-glass':
    'Just the glass: a broken or foggy pane or sealed unit, swapped in your existing frame. Usually the faster, lower-cost fix.',
  'cat-window-frame':
    'The whole window comes out (frame, sash and glass) and a new one goes in. For rotted or failing frames, or a style upgrade.',
  'cat-storefront':
    'Commercial aluminum framing, entry doors and the glass in them. The whole system, not just one pane.',
  'cat-patio-pet':
    'Sliding or swinging patio doors, and pet doors set into glass or a door. A cracked patio pane alone is glass replacement.',
  'cat-shower-mirror':
    'Custom shower enclosures, framed or frameless, and mirrors cut to size. Starts with a virtual consultation.',
  'cat-hardware':
    'The glass is fine, but something won’t open, close or lock: locks, hinges, rollers, closers and handles.',
  'cat-multiservice': 'More than one of these at the same address. We combine them into one visit.',
  'cat-measurement':
    'We measure and record your glass now, so a future replacement is faster to quote and order.',
  'cat-other': 'Tabletops, skylights, custom pieces and anything else glass. A client manager reviews it and calls you.'
};
