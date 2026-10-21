# Reliable text input and a document-style editor

## Approved repair prototype

The user approved a parent-owned text field over the selected words, retaining
all preview sandbox restrictions and the existing draft/preview/publish rules.
No dependency, account, permission, service or paid plan changes.

Root cause reproduced in native Safari with a credential-free local fixture:
parent-registered document click, keydown and input counters stay at zero inside
`sandbox="allow-same-origin"`, while an ordinary frame increments each counter.
Text visibly changes in both. The preview's sandbox must remain unchanged.
The adjacent parent-owned heading field saves correctly. Test draft #64 was
reopened and checked, then closed without merging; only its heading changed.

1. Add `src/editor/visual/inline-overlay.mjs`: a plain textarea owned by the
   parent document, visually aligned with the selected heading/paragraph.
   Keep plain text, native paste/undo/IME, Escape cancellation and explicit finish.
   Track position only while active; remove the field, restore the original node
   and cancel animation work on finish. No callbacks inside the sandbox.
2. Adapt `src/editor/visual/index.mjs` to use this input while retaining the
   existing draft model, grouping, pending actual-Astro render and save safeguards.
3. Test the real module in Safari using a fixed local sandboxed fixture: typing,
   adjacent model updates, paste/newlines, Escape, finish, focus and cleanup.
   Run existing tests/build, then push a hosted candidate for approval.
   This prototype does not claim iframe click/double-click handlers work in Safari.

## Confirmed UI direction: document canvas + live preview

Marie chose this direction after asking for a UI similar to Notion. The editor's
mode is Operate: writing and arranging researched pages without web knowledge.
Keep Albion navy, white and the throstle in restrained navigation details; preserve
the public museum design. This section is a design brief, not authorisation to
introduce new content schemas, permissions or services.

- Left: searchable page navigation, current-page indication and saved-draft state.
  Start with the five supported pages. Existing collections can group pages, but
  must not be presented as parent/child routes. Real nested hierarchy still needs
  an agreed route/redirect contract. Keep other pages reachable in the current CMS.
- Centre: a calm writing canvas. The title and supported text are ordinary editable
  fields styled as document content. Reveal block actions on focus as well as hover.
  A labelled Add block button and keyboard-accessible block menu can support `/`.
  Move up/down remains available when drag-and-drop is added. Explicit controls
  handle columns/sections; do not let browser HTML become stored museum content.
- Alongside or in a preview drawer: the real Astro-rendered website, desktop/phone
  toggle, last-good preview during incomplete input and visible connection errors.
  The document canvas edits the existing JSON model; the preview remains the actual
  Astro components. Full saved-page checks still gate publication.
- Show sources, linked prose, image credits and calculated performance through
  focused block details. Preserve unknown fields and uncertainty labels. Protect
  calculated statistics from free typing. Reusable layouts remain independent
  copies and retain their current content contract.
- Top: page name, clear Unsaved/Saving/Saved/Failed feedback, Save draft, checked
  preview and Publish. Keep reload/reopening, conflicts, uncertain writes and exact
  approval explicit. On a narrow screen switch between writing and preview; never
  squeeze both into unusable columns. No autosave-to-publication.

First UI review should demonstrate one real supported page, changing/undoing text,
block selection/details and immediate preview with existing save controls. New-page
creation, nested routes, block insertion/reordering and saved-layout authoring follow
in bounded stages with their data/behaviour agreements. Do not imply these controls
are functional in a concept. Marie's own account/invitation remains a handover step.

## Prototype verification

All 137 tests and the full build pass. Native Safari against the actual overlay
and draft modules passed normal typing, pasted mixed case/newlines, Escape
restoration, explicit finish and grouped undo. Other content remained identical;
ending an edit removed its field. Chromium's in-app browser also reported draft
updates and intact other blocks. The preview sandbox still permits same-origin
access only; scripts remain prohibited. Composition guards and scheduler cleanup
have unit coverage; a real IME session and touch keyboard have not been tested.

The focused design detector reported one warning on the pre-existing Arial font
in the editor shell. This input repair does not change that incumbent typography.
The Notion-style document canvas remains a confirmed design brief, not a built UI.
The complete authenticated overlay/save workflow remains for a publication-approved
live browser check; the old live editor's adjacent fields remain usable meanwhile.
