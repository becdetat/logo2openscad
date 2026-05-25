# Export Preview as PNG or SVG

## Summary

A "Save image" button on the preview pane allows users to download the current preview as a PNG or SVG file. The export captures exactly what is currently shown — respecting animation progress, the "Hide PU" setting, and all other display settings — and downloads the file with a name derived from the active script name and a timestamp. Useful for quick sharing, including in issues/PRs when reporting bugs or showing designs.

## Detailed description

Two export buttons appear in the Preview toolbar alongside existing controls. Clicking either triggers a browser file download immediately — no dialog, no extra configuration.

**PNG export** uses the existing canvas element directly. Because the canvas is rendered at the device pixel ratio for HiDPI displays, the exported PNG will be at native resolution (e.g. 2× on Retina displays), giving a crisp image. The background will be transparent.

**SVG export** re-implements the preview draw logic as SVG markup. The same coordinate transform (`PreviewLayout`) and the same visibility rules (animation progress, `hidePenUp`) are applied, so the SVG output is a faithful vector representation of what the canvas shows. Pen-up segments (if visible) are rendered with a dashed stroke, matching the canvas. Arc groups, the turtle head, markers, and grid axes are all included. The background will be transparent (no `<rect>` fill).

Both exports reflect the state at the moment the button is clicked — including mid-animation frames — and do not affect the running animation.

The filename format is `{scriptName}_{YYYY-MM-DD_HH-MM-SS}.png` / `.svg` where `scriptName` is the active script's name with whitespace replaced by underscores.

## User stories

- As a user, I want to export the current preview frame as a PNG so that I can share a raster screenshot in issues, PRs, or chat without leaving the app.
- As a user, I want to export the current preview as an SVG so that I can use the vector output in other design tools or documentation.
- As a user, I want the export to match exactly what I see on screen (animation state, hidden pen-up segments) so that I do not have to manually recreate the view.

## Key decisions

| Decision | Outcome |
|---|---|
| Export captures current animation state | Yes — clicking export downloads exactly what is currently rendered, including mid-animation frames. |
| Background colour | Transparent for both PNG and SVG. |
| Settings respected | Export matches the preview exactly: `hidePenUp`, animation progress, and all future display settings apply. |
| SVG in scope | Yes — SVG export is included, requiring a parallel SVG render path alongside the canvas renderer. |
| Default filename | `{scriptName}_{YYYY-MM-DD_HH-MM-SS}.{ext}` — script name with spaces replaced by underscores, plus an ISO-style local timestamp. |
| No export dialog | Downloads trigger immediately on click; no additional user input is required. |
| Grid axes in SVG | Included — the dashed axis lines are part of what is shown in the preview and should appear in the SVG. |

## Acceptance criteria

```gherkin
Feature: Export preview as PNG

  Scenario: Export PNG when preview has content
    Given a script is loaded and has renderable segments
    And the preview canvas is showing content
    When the user clicks the "PNG" export button
    Then a PNG file is downloaded
    And the filename matches the pattern "{scriptName}_{YYYY-MM-DD_HH-MM-SS}.png"
    And the image has a transparent background
    And the image resolution matches the canvas native resolution (device pixel ratio applied)

  Scenario: Export PNG respects animation state
    Given the animation is paused at 50% progress
    When the user clicks the "PNG" export button
    Then the exported PNG shows only the segments drawn up to the current progress

  Scenario: Export PNG respects Hide PU setting
    Given "Hide PU" is checked
    When the user clicks the "PNG" export button
    Then pen-up segments are absent from the exported PNG

  Scenario: Export PNG when preview is empty
    Given no script is loaded or the script produces no segments
    Then the "PNG" export button is disabled

Feature: Export preview as SVG

  Scenario: Export SVG when preview has content
    Given a script is loaded and has renderable segments
    And the preview canvas is showing content
    When the user clicks the "SVG" export button
    Then an SVG file is downloaded
    And the filename matches the pattern "{scriptName}_{YYYY-MM-DD_HH-MM-SS}.svg"
    And the SVG has a transparent background
    And the SVG viewBox matches the coordinate bounds of the visible segments

  Scenario: SVG output matches canvas visually
    Given any combination of segments, markers, and arc groups
    When the SVG is exported and opened in a browser
    Then the SVG visually matches the canvas preview:
      - pen-down segments are solid strokes
      - pen-up segments (if visible) are dashed strokes
      - the turtle head is a filled circle at the current position
      - markers appear as red crosses with optional comment labels
      - grid axes appear as dashed lines through the origin

  Scenario: Export SVG respects animation state
    Given the animation is paused at 50% progress
    When the user clicks the "SVG" export button
    Then the exported SVG contains only the segments drawn up to the current progress

  Scenario: Export SVG respects Hide PU setting
    Given "Hide PU" is checked
    When the user clicks the "SVG" export button
    Then pen-up segments are absent from the exported SVG

  Scenario: Export SVG when preview is empty
    Given no script is loaded or the script produces no segments
    Then the "SVG" export button is disabled
```

## Manual test steps

1. Open the app and load (or type) a script that draws several segments, including at least one pen-up move.
2. Let the animation play to completion so the full logo is visible.
3. Click the **PNG** button in the preview toolbar.
   - Verify a file downloads named like `my_script_2026-05-25_14-30-00.png`.
   - Open the file — it should show the full logo on a transparent background (checkerboard in an image viewer).
4. Click the **SVG** button.
   - Verify a file downloads with the same name stem but `.svg` extension.
   - Open the file in a browser — it should visually match the canvas.
5. Pause the animation at roughly halfway through playback.
   - Export both PNG and SVG.
   - Verify both files show only the segments drawn up to that point.
6. Check the **Hide PU** checkbox, then export PNG and SVG.
   - Verify pen-up segments (dashed lines) are absent from both exports.
7. Uncheck **Hide PU**, then export again.
   - Verify pen-up segments reappear in both exports.
8. Add a marker via the script (if supported). Export SVG and verify the marker cross and label appear.
9. Open the app with no script loaded (or a script that produces an error).
   - Verify both export buttons are disabled/greyed out.
10. On a HiDPI (Retina) display, export PNG and check the image dimensions in file properties — they should be 2× the canvas CSS pixel size.

## Implementation tasks

1. **Add `exportPng` function to `Preview.tsx`**
   - Call `canvasRef.current.toDataURL('image/png')` to get the data URL.
   - Create a temporary `<a>` element, set `href` to the data URL and `download` to the generated filename, then programmatically click it.
   - The canvas already renders at device pixel ratio, so no scaling is needed.
   - Derive the filename from `props.scriptName` (new prop, see task 4) and the current local timestamp.

2. **Create `src/logo/drawPreviewSvg.ts`**
   - Mirror the logic in `drawPreview.ts` but output an SVG string instead of drawing to a canvas.
   - Reuse `createPreviewLayout()` from `drawPreview.ts` for coordinate transforms.
   - Apply the same `RenderablePreviewSegment` filtering (progress, `hidePenUp`) used by the canvas renderer.
   - Render:
     - Dashed `<line>` elements for grid axes through the origin.
     - `<line>` or `<polyline>` elements for pen-down segments (solid stroke).
     - `<line>` elements with `stroke-dasharray` for pen-up segments.
     - A `<circle>` for the turtle head at the current position.
     - `<line>` crosses and optional `<text>` labels for markers.
   - Return a complete SVG string with `xmlns`, `viewBox`, and no background fill.
   - Accept the same inputs as `drawPreview`: `RenderablePreviewSegment[]`, `Marker[]`, theme colours, and settings.

3. **Add `exportSvg` function to `Preview.tsx`**
   - Call `drawPreviewSvg(...)` with current props/state.
   - Create a `Blob` of type `image/svg+xml`, generate an object URL, trigger a download via a temporary `<a>` element, then revoke the object URL.
   - Use the same filename helper as `exportPng`.

4. **Add `scriptName` prop to `Preview`**
   - Add `scriptName: string` to `PreviewProps` in `Preview.tsx`.
   - Pass `activeScript.name` (from `App.tsx`) into the `<Preview>` component.

5. **Add filename generation utility**
   - Add a small helper (inline in `Preview.tsx` or a shared util) that takes a script name and returns `{sanitisedName}_{YYYY-MM-DD_HH-MM-SS}`.
   - Sanitise by replacing whitespace with underscores and stripping characters that are invalid in filenames.

6. **Add export buttons to the Preview toolbar**
   - In `Preview.tsx`, add two `IconButton` or `Button` components to the existing toolbar (lines 132–169), labelled **PNG** and **SVG** (or with appropriate icons).
   - Disable both buttons when `props.hasSegments` is `false`.
   - Follow the existing MUI styling pattern used by the Play/Pause buttons.
