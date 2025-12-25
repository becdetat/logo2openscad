# Feature - Workspaces
## Overview
I want to allow users to have multiple documents in a workspace. A user can only have one workspace, however a workspace can contain many Logo scripts. Each script can have a name. Scripts live in the root of the workspace - folders are out of scope.

The workspace should be stored in local storage.

## Features
- Create a new Logo script - user gives it a name, default to "Untitled1"
- Select an existing Logo script to edit
- Rename an existing Logo script
- Logo script names must be unique - show a message if the user tries to create or rename a new script with an existing name
- Delete a Logo script (with confirmation)

# Future features (out of scope)
- Exporting the workspace (downloading a JSON file)
- Importing and combining a workspace
- Persisting the workspace to the server (will require creating an API and backing database)
- Folder structure

## Technical implementation

### Data Structures

#### Workspace Schema
```typescript
type LogoScript = {
  id: string              // Unique identifier (use crypto.randomUUID())
  name: string           // User-facing name (e.g., "Untitled1", "My Drawing")
  content: string        // The Logo script source code
  createdAt: number      // Timestamp
  updatedAt: number      // Timestamp
}

type Workspace = {
  scripts: LogoScript[]
  activeScriptId: string | null  // ID of currently open script
  version: number                 // Schema version for future migrations (start at 1)
}
```

#### LocalStorage Keys
- `logo2openscad:workspace` - Main workspace JSON object
- `logo2openscad:sidebar-collapsed` - Boolean for sidebar collapse state
- `turtle2openscad:script` - **Legacy key** - migrate and delete on first load

### State Management

Create a new `useWorkspace` hook to manage workspace state:
- Load workspace from localStorage on mount
- Provide methods: `createScript()`, `deleteScript()`, `renameScript()`, `selectScript()`, `updateScriptContent()`
- Auto-save workspace to localStorage on any change
- Handle name uniqueness validation
- Generate unique names for untitled scripts (Untitled1, Untitled2, etc.)

### Component Architecture

#### New Components

**WorkspaceSidebar**
- Collapsible sidebar (MUI Drawer)
- Displays list of scripts with active indicator
- "New Script" button at top
- Each script item has:
  - Script name (clickable to switch)
  - Ellipsis button (⋮) that opens context menu
  - Right-click context menu
- Context menu items: Rename, Delete
- Empty state (if no scripts somehow exist)

**ScriptDialog**
- Reusable MUI Dialog for create/rename operations
- Text input with label "Script name"
- Validates uniqueness and non-empty
- Shows error message for duplicate names
- Cancel/Confirm buttons

**DeleteScriptDialog**
- Simple confirmation dialog
- Message: "Are you sure you want to permanently delete this script?"
- Cancel/Delete buttons

#### Modified Components

**App.tsx**
- Replace single `source` state with workspace state
- Update document title: `{scriptName} - Logo2OpenSCAD`
- Pass script name to LogoEditor for its title
- Remove direct localStorage interaction (handled by useWorkspace)
- Add WorkspaceSidebar component to layout

**LogoEditor**
- Accept `scriptName` prop
- Update title to: `{scriptName} - Logo`

### Migration Strategy

On first load, check for legacy data:
1. Check if `logo2openscad:workspace` exists
   - If yes, load normally
   - If no, proceed with migration
2. Check for legacy key `turtle2openscad:script`
   - If exists, create new workspace with one script named "Untitled1" containing the legacy content
   - Delete the legacy key after successful migration
   - Save new workspace structure
3. If no legacy data, create workspace with empty "Untitled1" script

### Key Behaviors

**Auto-numbering Untitled Scripts**
- When creating a new script without a name, scan existing script names
- Find highest number in "UntitledN" pattern
- Increment and use "Untitled{N+1}"
- Example: If "Untitled1" and "Untitled3" exist, create "Untitled4"

**Auto-save**
- Debounce script content updates (existing behavior)
- Save workspace to localStorage on every state change
- No explicit "save" button needed

**Script Switching**
- Update `activeScriptId` in workspace
- Monaco editor content switches automatically via React state
- Preserve undo/redo history per script (may need to store Monaco model state)

**Name Validation**
- Trim whitespace from input
- Reject empty names (show error)
- Check uniqueness (case-sensitive)
- Show error message: "A script with this name already exists"

**Last Script Deletion**
- When deleting the only remaining script
- Auto-create new "Untitled1" script
- Set as active script
- Ensure workspace always has at least one script

## Implementation plan

### Phase 1: Core Infrastructure
1. **Create type definitions**
   - Add `LogoScript` and `Workspace` types to new file `src/types/workspace.ts`
   - Export types for use across components

2. **Implement useWorkspace hook**
   - Create `src/hooks/useWorkspace.ts`
   - Implement workspace loading/saving to localStorage
   - Implement CRUD operations for scripts
   - Implement migration logic from legacy storage
   - Add name validation and uniqueness checking
   - Add auto-numbering for untitled scripts
   - Test with unit tests

3. **Integration testing**
   - Test migration from legacy format
   - Test workspace persistence
   - Test edge cases (last script deletion, duplicate names)

### Phase 2: UI Components
1. **Create dialogs**
   - `src/components/ScriptDialog.tsx` - Create/rename dialog with validation
   - `src/components/DeleteScriptDialog.tsx` - Confirmation dialog

2. **Create WorkspaceSidebar**
   - `src/components/WorkspaceSidebar.tsx`
   - Implement collapsible drawer (controlled by localStorage state)
   - Script list with active highlighting
   - New Script button
   - Context menu (right-click + ellipsis button)
   - Wire up to useWorkspace hook

3. **Component styling**
   - Match existing Material-UI theme
   - Ensure responsive layout
   - Active script visual indication
   - Hover states for list items

### Phase 3: Integration
1. **Update App.tsx**
   - Replace `source` state with `useWorkspace` hook
   - Update document title based on active script name
   - Pass script name to LogoEditor
   - Add WorkspaceSidebar to layout
   - Adjust layout to accommodate sidebar (use MUI Grid/Box)

2. **Update LogoEditor**
   - Accept `scriptName` prop
   - Update title to show script name

3. **Testing**
   - Manual testing of all workspace operations
   - Test sidebar collapse/expand persistence
   - Test script switching
   - Verify auto-save behavior maintained

### Phase 4: Polish & Documentation
1. **Error handling**
   - Handle localStorage quota exceeded errors
   - Show user-friendly error messages
   - Graceful fallback if workspace corrupted

2. **Documentation**
   - Update readme.md with workspace feature
   - Add keyboard shortcuts documentation (if applicable)
   - Update help dialog with workspace information

3. **Final testing**
   - Cross-browser testing (Chrome, Firefox, Safari, Edge)
   - Test with large number of scripts
   - Test localStorage limits
   - Migration testing with various legacy states

### Testing Strategy
- **Unit tests**: useWorkspace hook, name validation, auto-numbering logic
- **Integration tests**: Component interactions, dialog flows
- **E2E tests** (if applicable): Full user workflows
- **Manual testing**: Migration scenarios, edge cases

### Rollout Considerations
- Deploy with migration logic active
- Monitor for localStorage errors in production
- Consider adding analytics to track workspace usage
- Keep legacy key cleanup code for at least one version cycle

## To do
- [ ] Run preview when changing scripts
- [ ] The workspace sidebar should work like a modal with an overlay on the rest of the application so it's obvious - at the moment it isn't obvious that you need to collapse the workspace sidebar to work in the application. When selecting a script it should collapse the sidebar.
- [ ] Default new script name should be "UntitledX" when creating a new script.


