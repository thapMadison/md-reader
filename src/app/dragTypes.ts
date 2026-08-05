/**
 * MIME type carried by a sidebar row dragged within the app, with the file's
 * name as its payload.
 *
 * A vendor-specific type rather than `text/plain` for two reasons: browsers
 * synthesize `text/plain` for many drags, so a stray text drag from another
 * application would masquerade as a row drag; and a row that also advertised
 * `text/plain` would be droppable into the editor textarea as literal text.
 *
 * Its other half is the `Files` check in `useLayoutState` — an OS file drag
 * always lists `Files` in `dataTransfer.types`, an internal drag never does, and
 * that difference is what keeps the "Drop to open" overlay from firing while the
 * user drags a row around the sidebar.
 */
export const INTERNAL_DRAG_TYPE = 'application/x-mdreader-file';
