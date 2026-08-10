/**
 * What this app treats as a markdown file, by name alone.
 *
 * One list, and it has to stay one list. The picker's filter, the drag-drop
 * snapshot path, and the remote gist listing all ask the same question, and the
 * last time two of them answered it separately they disagreed: the picker
 * offered `.md`/`.markdown` while the `<input>` fallback also accepted `.txt`,
 * so the same file was openable by one route and silently dropped by the other.
 *
 * Extracted from `openFiles.ts` into its own module because the gist service now
 * asks too, and a service reaching into another service's implementation file
 * for a constant is how that file becomes a grab bag.
 */
export const MD_EXTENSIONS = ['.md', '.markdown', '.txt'] as const;

/** Accept filter for `showOpenFilePicker`. */
export const MD_ACCEPT = { 'text/markdown': [...MD_EXTENSIONS] };

// Built from the list rather than written out again, so adding an extension
// above is the only edit an extension ever needs. Anchored at the end and
// case-insensitive: `NOTES.MD` is the same file to every filesystem this runs on.
const MD_EXTENSION_RE = new RegExp(`(${MD_EXTENSIONS.map((e) => `\\${e}`).join('|')})$`, 'i');

/**
 * Whether a bare filename looks like markdown.
 *
 * Name only — there is nothing else to go on. A gist listing carries no MIME
 * type, and `GET /gists` deliberately carries no content either, so the
 * extension is the whole of the evidence available before a download.
 */
export function isMarkdownFileName(name: string): boolean {
  return MD_EXTENSION_RE.test(name);
}
