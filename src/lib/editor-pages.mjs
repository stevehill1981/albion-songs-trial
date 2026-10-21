// An explicit rollout boundary, shared by the UI and authenticated operations.
// Existing clients without a selection retain the original practice page.
export const EDITOR_PAGE='component-preview-trial';
export const EDITOR_PAGES=Object.freeze([EDITOR_PAGE,'managers','manager-darren-moore','manager-steve-clarke','manager-tony-mowbray']);
export const isEditorPage=id=>EDITOR_PAGES.includes(id);
