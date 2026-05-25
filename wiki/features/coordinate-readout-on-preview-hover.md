# Coordinate readout on preview hover

## Summary

Extend the existing hover tooltip on the preview canvas to also display the Logo-space (x, y) coordinate at the mouse cursor's position. Currently the tooltip shows the nearest segment's source line number and length. Adding the cursor's Logo-space coordinate makes it easy to determine values for commands like `SETXY`, `EXTMARKER`, or to debug offset issues.

## Detailed description

When the user hovers over the preview canvas and the cursor is within the segment hit-radius (8px), the existing tooltip already shows the source line number and segment length. This feature adds a third line showing the Logo-space coordinate directly under the cursor.

The coordinate is derived by applying the inverse of the canvas-to-Logo-space transform to the raw mouse position. This means the coordinate reflects where the cursor is on the canvas — not the nearest point on the segment — which is more useful for placing new commands at arbitrary positions.

The coordinate is formatted as `x: 123.45, y: 67.89` with fixed 2 decimal places. Clicking anywhere on the coordinate line copies the bare value `123.45, 67.89` to the clipboard, ready to paste into a `SETXY` or `EXTMARKER` command.

The readout only appears when a segment is being hovered (i.e. cursor is within the existing 8px hit-radius). When no segment is nearby, the tooltip does not appear and neither does the coordinate.

## User stories

- As a user, I want to see the Logo-space coordinate at my cursor when hovering a segment, so that I can quickly determine the values to use in `SETXY`, `EXTMARKER`, or other coordinate-based commands without trial and error.
- As a user, I want to click the coordinate in the tooltip to copy it to the clipboard, so that I can paste it directly into my script without retyping numbers.

## Key decisions

| Decision | Outcome |
|----------|---------|
| Cursor position vs. closest point on segment | Show the cursor's position transformed through the inverse canvas→Logo transform, not the nearest point on the segment. More useful for placing new commands anywhere on the canvas. |
| When to show the coordinate | Only when a segment is already hovered (within 8px hit-radius). Avoids a persistent readout cluttering the canvas and is consistent with the existing tooltip behaviour. |
| Display format | Labelled: `x: 123.45, y: 67.89`. Clear and unambiguous. |
| Coordinate precision | Fixed 2 decimal places. Short enough to read at a glance; Logo scripts rarely need sub-cent precision in coordinates. |
| Clipboard copy format | `123.45, 67.89` — the bare coordinate pair without labels, ready to paste as arguments to `SETXY` or `EXTMARKER`. |
| Copy trigger | Click anywhere on the coordinate line in the tooltip. No separate copy button needed given the small target. |

## Acceptance criteria

```gherkin
Feature: Coordinate readout on preview hover

  Scenario: Coordinate shows when hovering a segment
    Given the preview contains rendered segments
    When the user moves the cursor within 8px of a segment
    Then the tooltip shows the source line, segment length, AND the Logo-space coordinate
    And the coordinate is formatted as "x: <value>, y: <value>"
    And each value is shown to exactly 2 decimal places

  Scenario: Coordinate reflects cursor position, not segment endpoint
    Given the preview contains a segment from (0,0) to (100,0)
    When the user hovers at the canvas position corresponding to Logo-space (40, 0)
    Then the tooltip shows x: 40.00, y: 0.00
    And NOT x: 0.00 or x: 100.00 (the segment endpoints)

  Scenario: No coordinate when cursor is off all segments
    Given the preview contains rendered segments
    When the user moves the cursor more than 8px from any segment
    Then no tooltip appears

  Scenario: Coordinate updates as cursor moves along a segment
    Given the user is hovering a segment
    When the user moves the cursor along the segment
    Then the displayed coordinate updates continuously to reflect the new cursor position

  Scenario: Clicking the coordinate copies to clipboard
    Given the tooltip is showing a coordinate of x: 123.45, y: 67.89
    When the user clicks the coordinate line
    Then the clipboard contains "123.45, 67.89"
    And no labels or extra text are included

  Scenario: Coordinate is correct after zoom or pan
    Given the preview has been zoomed or panned
    When the user hovers a segment
    Then the displayed coordinate still reflects the correct Logo-space position
    And not the raw canvas pixel position
```

## Manual test steps

1. Open the app and load or type a script that produces visible segments in the preview (e.g. `FORWARD 100 RIGHT 90 FORWARD 100`).
2. Move the mouse slowly over a line in the preview until the hover tooltip appears.
3. Confirm the tooltip shows three pieces of information: source line, segment length, and a coordinate in the format `x: NNN.NN, y: NNN.NN`.
4. Move the cursor along the segment and confirm the coordinate values change continuously as the cursor moves.
5. Move the cursor away from all segments and confirm the tooltip disappears entirely.
6. While hovering a segment, click the coordinate line. Open a text editor or the script editor and paste — confirm the pasted text is `NNN.NN, NNN.NN` with no labels.
7. If zoom/pan is available: zoom in or pan the preview, then hover a segment and confirm the displayed coordinate still makes sense relative to the Logo script geometry (e.g. hovering the end of a `FORWARD 100` segment should show a coordinate around `(0, 100)` depending on heading).

## Implementation tasks

1. **Expose inverse transform from `drawPreview.ts`**
   - In `src/logo/drawPreview.ts`, update `createPreviewLayout()` to also return a `fromScreen` (or `toLogo`) function: `(p: { x: number; y: number }) => { x: number; y: number }`.
   - The inverse of `toScreen` is: `logoX = (screenX - centerX) / scale + midX`, `logoY = midY - (screenY - centerY) / scale`.
   - Store the current layout (including `fromScreen`) in a `ref` in `Preview.tsx` so the pointer-move handler can access it without re-rendering.

2. **Compute Logo-space coordinate in `handlePointerMove` (`Preview.tsx`)**
   - In `src/components/Preview.tsx`, after the existing hit-test in `handlePointerMove`, call `layoutRef.current.fromScreen({ x: canvasX, y: canvasY })` to get the Logo-space coordinate.
   - Add `logoX: number; logoY: number` fields to the `hoveredSegment` state shape (currently `{ line, length, x, y }`).

3. **Display the coordinate in the tooltip (`Preview.tsx`)**
   - In the tooltip JSX (around line 198–222 of `Preview.tsx`), add a new `Typography` line below the existing length line.
   - Format as `x: {logoX.toFixed(2)}, y: {logoY.toFixed(2)}`.
   - Wrap the line in a clickable element (e.g. `Box` with `onClick` and `sx={{ cursor: 'pointer' }}`).

4. **Clipboard copy on click**
   - In the click handler, call `navigator.clipboard.writeText(`${logoX.toFixed(2)}, ${logoY.toFixed(2)}`)`.
   - Optionally show brief visual feedback (e.g. change text to "Copied!" for 1s) — keep it lightweight.
