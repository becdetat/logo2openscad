# Feature - Workspaces - Questions and answers
Script Switcher UI: How would you like users to access their scripts?
Sidebar panel with a list of scripts. The sidebar should be collapsable - expanded by default, however the current sidebar collapse status should be stored in local storage.

Active Script Indication: How should users know which script is currently open?
The window title should be "Name of script - Logo2OpenSCAD". The name of the script should also be in the title of the Logo editor, like "Name of script - Logo". 

Script Management Actions: Where should the create/rename/delete actions be located?
Context manu and buttons in the UI panel.

Data Management:
Initial State: When a user first opens the app (no workspace exists yet), should we:

Auto-create a workspace with one "Untitled1" script?
Yes, auto-create the workspace

Current Script Selection: Should we remember which script was last opened and automatically open it on next session?
Yes

Unsaved Changes: If a user switches scripts while the current one has unsaved changes, should we:
Just save automatically in the background? Yes, keep the existing behaviour.

Deletion Confirmation: What should the confirmation message say when deleting a script?
"Are you sure you want to permanently delete this script?"

Technical Details:
LocalStorage Structure: Should each script be stored separately or should we store the entire workspace as one JSON object?
As one JSON object

Script Limits: Should there be a maximum number of scripts per workspace? Any concerns about localStorage size limits?
No

OpenSCAD Output: Does each script generate its own OpenSCAD output independently, or is there any concept of combining multiple scripts?
Independently, combining multiple scripts is out of scope (but a great idea)

Edge Cases:
Last Script Deletion: If a user deletes the last remaining script, what should happen?
Auto-create a new "Untitled1"? Yes

Name Validation: Besides uniqueness, are there any restrictions on script names (length, special characters, etc.)?
No restrictions

Auto-numbering: If a user creates multiple new scripts without naming them, should they be numbered automatically (e.g., "Untitled1", "Untitled2", "Untitled3")?
Yes

Create/Rename UI: How should the create and rename dialogs work?
Simple MUI dialog prompting for the script name

New Script Behavior: When a user creates a new script, should it:
Automatically switch to that new script? Yes

Rename Input Validation: Should we trim leading/trailing whitespace from script names? Should empty names be allowed (fall back to "Untitled1")?
Empty names should not be allowed. Trim leading and trailing whitespace.

Migration & Compatibility:
Existing User Data: Currently users have a single script saved in localStorage. When we deploy workspaces, should we:
Automatically migrate their current script into a new workspace as "Untitled1"? Yes

LocalStorage Key: What localStorage key(s) are currently being used for the existing script? Should we keep them for migration purposes?
Look this up when implementing. When they are migrated to the workspace model the existing key should be deleted.

UI Details:
Context Menu: Should the context menu appear when right-clicking on a script name in the sidebar list?
Yes. There should also be an ellipsis button next to the script which opens the context menu.

Sidebar Buttons: What buttons should appear in the sidebar? Just a "New Script" button, or also visible Delete/Rename buttons?
Just "new script".


