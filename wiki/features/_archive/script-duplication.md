# Script Duplication

## Summary

Add a "Duplicate" option in the workspace sidebar's per-script context menu, alongside the existing Rename and Delete actions. Clicking Duplicate opens the standard script name dialog pre-filled with a suggested name derived from the original, lets the user accept or change the name, then creates the duplicate with the same content and switches to it immediately. A one-click way to branch off a working script before experimenting.

## Detailed description

The "Duplicate" menu item appears in the three-dot context menu for each script in the sidebar, between Rename and Delete (or after Rename). Clicking it opens the existing `ScriptDialog` component with:

- Title: "Duplicate Script"
- Name field pre-filled with a generated suggestion: `{originalName} copy`. If that name is already taken, the suggestion increments: `{originalName} copy 2`, `{originalName} copy 3`, and so on.

The user can accept the suggestion or type a different name. The same uniqueness and non-empty validation that applies to Rename and New Script applies here. On confirm:

1. A new `LogoScript` is created with a fresh UUID, the chosen name, the source script's content copied verbatim, and fresh `createdAt` / `updatedAt` timestamps.
2. The new script is added to the workspace's scripts array.
3. The new script becomes the active script (sidebar switches selection, editor loads the duplicate's content).
4. The sidebar auto-collapses, consistent with existing behaviour after New Script creation.

On cancel, nothing changes.

## User stories

- As a user, I want to duplicate a working script before making experimental changes, so that I can revert easily by switching back to the original.
- As a user, I want to choose the duplicate's name at creation time, so that I can keep my workspace organised without a separate rename step.

## Key decisions

| Decision | Outcome |
|---|---|
| Dialog vs. immediate duplication | Opens the name dialog (same as New Script) so the user can confirm or change the auto-suggested name before anything is created. |
| Pre-filled name suggestion | `{originalName} copy`, incrementing to `{originalName} copy 2`, `{originalName} copy 3`, etc. if the name is already taken. |
| Active script after duplication | The duplicate becomes the active script immediately, matching the behaviour of New Script creation. |
| Sidebar collapse after duplication | Sidebar auto-collapses, consistent with New Script and script-selection behaviour. |
| Content copied | The full source content is copied verbatim; no transformations are applied. |
| Menu position | "Duplicate" sits between "Rename" and "Delete" in the context menu. |

## Acceptance criteria

```gherkin
Feature: Script duplication

  Scenario: Duplicate appears in context menu
    Given the workspace sidebar is open
    And at least one script exists
    When the user opens the three-dot menu for a script
    Then a "Duplicate" option is visible between "Rename" and "Delete"

  Scenario: Duplicate opens name dialog with suggested name
    Given a script named "My Script" exists
    When the user clicks "Duplicate" on that script
    Then the name dialog opens with the title "Duplicate Script"
    And the name field is pre-filled with "My Script copy"

  Scenario: Suggested name increments if already taken
    Given scripts named "My Script", "My Script copy", and "My Script copy 2" exist
    When the user clicks "Duplicate" on "My Script"
    Then the name field is pre-filled with "My Script copy 3"

  Scenario: Confirming creates the duplicate and switches to it
    Given the name dialog is open for duplicating "My Script" with suggestion "My Script copy"
    When the user confirms without changing the name
    Then a new script named "My Script copy" is created
    And it contains the same content as "My Script"
    And "My Script copy" becomes the active script
    And the sidebar collapses

  Scenario: User can rename before confirming
    Given the name dialog is open for duplicating "My Script"
    When the user clears the name field and types "Experiment 1"
    And confirms
    Then a new script named "Experiment 1" is created with the source content
    And it becomes the active script

  Scenario: Duplicate name validation — empty name
    Given the name dialog is open for duplicating a script
    When the user clears the name field and confirms
    Then the dialog shows a validation error and the duplicate is not created

  Scenario: Duplicate name validation — name already taken
    Given a script named "My Script copy" already exists
    And the name dialog is open for duplicating "My Script" with suggestion "My Script copy 2"
    When the user changes the name to "My Script copy" and confirms
    Then the dialog shows a validation error and the duplicate is not created

  Scenario: Cancelling the dialog creates nothing
    Given the name dialog is open for duplicating a script
    When the user cancels
    Then no new script is created
    And the active script is unchanged

  Scenario: Original script is unchanged after duplication
    Given "My Script" with specific content exists
    When the user duplicates it as "My Script copy"
    Then "My Script" still exists with its original content unchanged
```

## Manual test steps

1. Open the app. Ensure at least one script exists in the sidebar.
2. Click the three-dot (⋮) menu on any script.
   - Verify "Duplicate" appears between "Rename" and "Delete".
3. Click "Duplicate".
   - Verify the dialog opens with the title "Duplicate Script".
   - Verify the name field is pre-filled with `{scriptName} copy`.
4. Accept the suggested name by clicking Confirm.
   - Verify a new script named `{scriptName} copy` appears in the sidebar.
   - Verify the editor switches to the new script.
   - Verify the new script's content matches the original.
   - Verify the sidebar collapses.
5. Reopen the sidebar and switch back to the original script.
   - Verify its name and content are unchanged.
6. Duplicate the same script again (now `{scriptName} copy` exists).
   - Verify the dialog pre-fills `{scriptName} copy 2`.
   - Confirm and verify `{scriptName} copy 2` is created.
7. Duplicate a script, change the name in the dialog to something custom, and confirm.
   - Verify the new script uses the custom name.
8. Duplicate a script, clear the name field entirely, and try to confirm.
   - Verify a validation error is shown and no script is created.
9. Duplicate a script, change the name to one that already exists, and try to confirm.
   - Verify a validation error is shown and no script is created.
10. Duplicate a script, then click Cancel.
    - Verify no new script was added and the active script is unchanged.

## Implementation tasks

1. **Add `duplicateScript(scriptId, newName)` to `useWorkspace.ts`**
   - Look up the source script by ID; throw if not found.
   - Validate `newName` using the existing `isNameUnique()` helper (same rules as `createScript` and `renameScript`).
   - Create a new `LogoScript` with `crypto.randomUUID()`, `newName`, the source's `content`, and fresh `createdAt` / `updatedAt` timestamps.
   - Append the new script to the `scripts` array and set `activeScriptId` to the new script's ID.
   - Return the new script (consistent with the return style of `createScript`).

2. **Add a name-suggestion helper in `useWorkspace.ts` (or a shared util)**
   - `generateDuplicateName(sourceName: string, scripts: LogoScript[]): string`
   - Try `{sourceName} copy`; if taken, try `{sourceName} copy 2`, `{sourceName} copy 3`, etc., until a unique name is found.
   - Reuse the existing `isNameUnique()` for each candidate.

3. **Add `handleDuplicateScript` in `App.tsx`**
   - Follow the same pattern as `handleCreateScript` and `handleRenameScript`.
   - On invocation: call `generateDuplicateName()` to get the suggested name, then open the `ScriptDialog` with the suggestion pre-filled and the title "Duplicate Script".
   - On dialog confirm: call `duplicateScript(scriptId, chosenName)`.
   - Store the target script ID in state (same pattern as rename uses a `renamingScriptId` state variable).

4. **Add "Duplicate" to the context menu in `WorkspaceSidebar.tsx`**
   - In the `MenuItem` list for each script's three-dot menu, add a "Duplicate" item positioned between "Rename" and "Delete".
   - On click, call the `onDuplicate(scriptId)` prop (new prop, mirroring `onRename` and `onDelete`).
   - Pass `onDuplicate={handleDuplicateScript}` from `App.tsx` into `<WorkspaceSidebar>`.

5. **Reuse `ScriptDialog` for the duplicate name prompt**
   - `ScriptDialog` already accepts a title and an initial name value; no changes to the component should be needed.
   - Confirm by checking the existing props interface in `ScriptDialog.tsx` — if it lacks a configurable title, add one (a single `title: string` prop defaulting to the current hardcoded value).
