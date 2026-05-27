# Snippet/template library

## Summary

A snippet library panel accessible via a toolbar button in the Logo editor header. When opened, it displays a curated set of built-in Logo snippets (square, equilateral triangle, hexagon, spiral, star, Bézier S-curve) with rendered thumbnails and code previews. Clicking a snippet inserts its code at the cursor position (replacing any active selection), exactly as if the user had pasted it. Designed to reduce friction for beginners learning Logo syntax and for experienced users who need a quick syntax reminder.

## Detailed description

### Trigger

A "Snippets" icon button appears in the `LogoEditor` header bar alongside the existing Rename and Help buttons. Clicking it opens the snippet panel as a MUI Popover anchored below the button.

### Panel layout

The panel is split into two areas:

- **Left column** — vertical list of snippet names. Clicking a row selects it and updates the right panel. Keyboard navigation (arrow keys) is supported; the first snippet is selected on open.
- **Right column** — shows the selected snippet's rendered thumbnail (a small SVG generated from the interpreter output) and its full source code in a read-only, syntax-highlighted code block.

An **Insert** button at the bottom confirms insertion and closes the panel. Double-clicking a snippet name in the list also inserts and closes.

### Insert behaviour

When a snippet is inserted:

- If the editor has a non-empty selection, the selected text is replaced by the snippet code.
- If there is no selection, the snippet code is inserted at the current cursor position inline (no forced newline).
- The cursor is placed at the end of the inserted text.
- The editor retains focus after insertion.
- The panel closes.

This is equivalent to the user pasting the snippet code.

### Snippet thumbnails

When the panel first opens, each snippet's code is run through the existing `parseLogo` + `executeLogo` pipeline. The resulting segments are rendered into a small fixed-size SVG (e.g. 120×120 px). Thumbnails are computed once per panel open and cached in component state.

### Built-in snippets

Six built-in snippets, each with inline comments on every meaningful line:

1. **Square** — four equal sides with 90° right turns; `MAKE "side` for size.
2. **Equilateral triangle** — three equal sides with 120° exterior turns; `MAKE "side` for size.
3. **Hexagon** — six equal sides with 60° exterior turns; `MAKE "side` for size.
4. **Spiral** — growing step length with a near-90° turn per step; `MAKE` variables for starting size, step count, and angle.
5. **5-pointed star** — five sides with 144° exterior turns; `MAKE "side` for size.
6. **Bézier S-curve** — demonstrates `EXTDEFCONTROLPOINT` and `EXTBEZIERCURVE` with named control points.

## User stories

- As a beginner, I want to insert a working square snippet so that I can see the syntax without reading the help docs.
- As an experienced user, I want a quick reference for the Bézier curve command syntax so that I don't have to remember the exact parameter order.
- As any user, I want to preview what a snippet produces before inserting it so that I can pick the right one.

## Key decisions

| Decision | Outcome |
|----------|---------|
| Trigger mechanism | Toolbar button only — consistent with existing Help/Rename pattern in `LogoEditor.tsx`; no right-click override needed |
| Panel type | MUI `Popover` anchored to the toolbar button; dismisses on outside click or Escape |
| Thumbnail generation | Runtime render via existing `parseLogo` + `executeLogo` on first panel open; no static assets required |
| Insertion semantics | Paste-equivalent: replaces selection if present, otherwise inserts at cursor; cursor moves to end of inserted text |
| Comments in snippets | Always included regardless of the app's comment-verbosity setting — comments are the teaching value |
| User-defined snippets | Out of scope; architecture uses a typed static array in `src/logo/snippets.ts` |
| Code preview | Read-only `<pre>` block styled to match the editor theme (dark/light); avoids spinning up a second Monaco instance |

## Acceptance criteria

```gherkin
Feature: Snippet template library

  Scenario: Opening the snippet panel
    Given the Logo editor is visible
    When I click the Snippets toolbar button
    Then the snippet panel opens as a popover
    And the first snippet in the list is selected by default
    And its thumbnail and code are displayed in the right panel

  Scenario: Browsing snippets
    Given the snippet panel is open
    When I click a different snippet in the list
    Then the right panel updates to show that snippet's thumbnail and code

  Scenario: Keyboard navigation
    Given the snippet panel is open
    When I press the down arrow key
    Then the next snippet in the list is selected
    And the right panel updates accordingly

  Scenario: Inserting at cursor with no selection
    Given the Logo editor has no active selection
    And the cursor is positioned mid-script
    When I open the snippet panel and click Insert for "Square"
    Then the square snippet code is inserted at the cursor position
    And the cursor is placed at the end of the inserted text
    And the panel closes

  Scenario: Inserting with an active selection
    Given the Logo editor has text selected
    When I open the snippet panel and click Insert for "Square"
    Then the selected text is replaced by the square snippet code
    And the cursor is placed at the end of the inserted text
    And the panel closes

  Scenario: Double-click inserts
    Given the snippet panel is open
    When I double-click a snippet name in the list
    Then the snippet is inserted and the panel closes

  Scenario: Dismissing without inserting
    Given the snippet panel is open
    When I click outside the panel or press Escape
    Then the panel closes without modifying the editor content

  Scenario: Editor retains focus after insert
    Given the snippet panel is open
    When I insert a snippet
    Then the Monaco editor has keyboard focus

  Scenario: Thumbnail rendering
    Given the snippet panel is open
    When I select any snippet
    Then a rendered thumbnail of its output is visible
    And the thumbnail visually represents the snippet's geometry

  Scenario: Snippet code includes comments
    When I inspect any built-in snippet's code in the panel
    Then each meaningful line has an inline comment beginning with #
```

## Manual test steps

1. Open the app. Confirm the Logo editor header shows a Snippets icon button near the existing Rename and Help buttons.
2. Click the Snippets button. Confirm a popover opens without navigating away or obscuring the editor significantly.
3. Confirm the left column lists all six snippets: Square, Equilateral Triangle, Hexagon, Spiral, 5-Pointed Star, Bézier S-Curve.
4. Confirm the first snippet is selected and its thumbnail and code appear in the right column immediately on open.
5. Click each snippet in turn. Confirm the right panel thumbnail and code update correctly for each one.
6. Confirm each code block contains inline `#` comments on meaningful lines.
7. Confirm each thumbnail visually resembles the shape it represents (square, triangle, hexagon, spiral, star, S-curve).
8. Press the down arrow key while the panel is focused. Confirm the selection moves down the list and the right panel updates.
9. Close the panel. Position the cursor mid-script (not at line start). Open Snippets, select Square, click Insert. Confirm the square code appears inline at that position.
10. Select some existing text in the editor. Open Snippets, select Hexagon, click Insert. Confirm the selection is replaced by the hexagon code.
11. After any insertion, confirm the cursor is positioned at the end of the inserted snippet text.
12. After any insertion, type a character. Confirm the editor has focus and the character appears.
13. Open the panel, do not insert anything, then press Escape. Confirm the panel closes and the editor is unchanged.
14. Open the panel, click outside it. Confirm it closes and the editor is unchanged.
15. Open the panel and double-click a snippet name. Confirm it inserts and the panel closes.
16. Toggle dark/light mode. Reopen the Snippets panel. Confirm the code preview block updates to match the current theme.

## Implementation tasks

1. **Create `src/logo/snippets.ts`** — define a `BuiltInSnippet` interface with fields `id: string`, `name: string`, `description: string`, and `code: string`. Export a `BUILT_IN_SNIPPETS: BuiltInSnippet[]` array with all six entries. Write snippet code strings with `MAKE` variables for tuneable dimensions and inline `#` comments. Verify each snippet parses without diagnostics by running `parseLogo` on each.

2. **Create `src/components/SnippetPanel.tsx`** — MUI `Popover` component with props `anchorEl: HTMLElement | null`, `open: boolean`, `onClose: () => void`, `onInsert: (code: string) => void`, and `isDarkMode: boolean`. Internal layout:
   - Left: MUI `List` with one `ListItemButton` per snippet; local `selectedId` state initialised to `BUILT_IN_SNIPPETS[0].id` on open.
   - Right: a fixed-size thumbnail `<svg>` element (render the selected snippet's segments) and a styled `<pre>` code block (monospace, theme-matched background/foreground).
   - Bottom: MUI `Button` labelled "Insert" that calls `onInsert(selectedSnippet.code)` then `onClose()`.
   - On open, run all snippets through `parseLogo` + `executeLogo` and cache the segment arrays in a `Map` held in `useRef` or `useMemo`.
   - Handle `onKeyDown` on the list for arrow-key navigation and Enter-to-insert.
   - Handle double-click on list items to insert.

3. **Add `insertSnippet` to `App.tsx`** — implement using `editorRef` and `monacoRef`:

   ```ts
   const insertSnippet = (code: string) => {
     const editor = editorRef.current
     const monaco = monacoRef.current
     if (!editor || !monaco) return
     const sel = editor.getSelection()
     const pos = editor.getPosition()
     const range = sel && !sel.isEmpty()
       ? sel
       : new monaco.Range(pos!.lineNumber, pos!.column, pos!.lineNumber, pos!.column)
     editor.executeEdits('snippet-insert', [{ range, text: code, forceMoveMarkers: true }])
     editor.focus()
   }
   ```

   Pass `insertSnippet` to `<LogoEditor>` as a new `onInsertSnippet` prop.

4. **Update `LogoEditor.tsx`** — add `onInsertSnippet: (code: string) => void` to `LogoEditorProps`. Add a local `anchorEl` state (`HTMLElement | null`). Add a Snippets `IconButton` (e.g. `StyleIcon`) to the header `Stack`. Render `<SnippetPanel>` inside the component, passing `anchorEl`, `open={Boolean(anchorEl)}`, `onClose={() => setAnchorEl(null)}`, `onInsert={props.onInsertSnippet}`, and `isDarkMode`.

5. **Segment rendering helper for thumbnails** — extract or reuse the SVG drawing logic from `Preview.tsx` into a small pure function `renderSegmentsToSvg(segments, width, height): React.ReactNode` (or equivalent). Use it in `SnippetPanel` for thumbnail rendering. If the existing Preview renders to a `<canvas>`, adapt it to produce an `<svg>` or render to an offscreen canvas and use a `<img src={dataUrl}>`.

6. **Verify and test** — follow the manual test steps above. Pay particular attention to: insertion with and without selection, cursor position after insert, thumbnail correctness for all six snippets, and theme switching.
