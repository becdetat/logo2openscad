export const helpContent = `# Logo2OpenSCAD Help

## Overview

Logo2OpenSCAD is a client-side web app that converts Logo scripts into OpenSCAD \`polygon(points=[...])\` output.

## Workspace

### Managing Scripts

The app supports multiple Logo scripts in a workspace:

- **Create**: Click the "New Script" button in the sidebar
- **Switch**: Click on any script in the sidebar to open it
- **Rename**: Right-click a script (or click the ⋮ button) and select "Rename"
- **Delete**: Right-click a script (or click the ⋮ button) and select "Delete"
- **Sidebar**: Click the chevron icons to collapse/expand the sidebar

All changes are automatically saved to your browser's local storage.

### Coordinate System
- **Origin**: (0, 0)
- **Initial heading**: Up (0°)
- **Angles**: Measured in degrees
- **Pen**: Starts down (drawing)

## Commands

### Movement Commands

#### FD / FORWARD \`distance\`
Move the turtle forward by the specified distance.

\`\`\`logo
FD 50           // Move forward 50 units
FORWARD 100     // Long form
FD 25 + 25      // With expressions
\`\`\`

#### BK / BACK \`distance\`
Move the turtle backward by the specified distance.

\`\`\`logo
BK 30
BACK 20 * 2
\`\`\`

---

### Turning Commands

#### LT / LEFT \`degrees\`
Turn the turtle left (counter-clockwise) by the specified angle.

\`\`\`logo
LT 90           // Turn left 90 degrees
LEFT 45
LT 30 * 3       // Turn left 90 degrees using expression
\`\`\`

#### RT / RIGHT \`degrees\`
Turn the turtle right (clockwise) by the specified angle.

\`\`\`logo
RT 90
RIGHT 45
\`\`\`

#### SETH / SETHEADING \`degrees\`
Set the turtle's heading to an absolute angle. 0° points up, angles increase clockwise.

\`\`\`logo
SETH 90         // Face right
SETHEADING 180  // Face down
SETH 0          // Face up
\`\`\`

---

### Position Commands

#### SETX \`x\`
Move the turtle to an absolute X coordinate (horizontal).

\`\`\`logo
SETX 100        // Move to x=100
\`\`\`

#### SETY \`y\`
Move the turtle to an absolute Y coordinate (vertical).

\`\`\`logo
SETY 50         // Move to y=50
\`\`\`

#### SETXY \`x\`, \`y\`
Move the turtle to an absolute position. **Note the comma separator.**

\`\`\`logo
SETXY 100, 50   // Move to (100, 50)
SETXY 0, 0      // Move to origin
\`\`\`

#### HOME
Move the turtle to the origin (0, 0) and reset heading to 0°.

\`\`\`logo
HOME
\`\`\`

---

### Pen Commands

#### PU / PENUP
Lift the pen - subsequent movements won't draw.

\`\`\`logo
PU
FD 50           // Move without drawing
\`\`\`

#### PD / PENDOWN
Lower the pen - subsequent movements will draw.

\`\`\`logo
PD
FD 50           // Draw a line
\`\`\`

---

### Arc Command

#### ARC \`angle\`, \`radius\`
Draw an arc with the turtle at center. Starts at the turtle's current heading, extends clockwise. **Note the comma separator.**

\`\`\`logo
ARC 180, 30     // Draw 180° arc with radius 30
ARC 90, 50      // Draw quarter circle
ARC 360, 20     // Draw full circle
\`\`\`

Arc resolution can be controlled with the EXTSETFN command (see Extension Commands below).

---

## Variables

### MAKE \`"varname\` \`expression\`
Define or update a variable. Variable names must be prefixed with \`"\` when defining.

\`\`\`logo
MAKE "size 100
MAKE "half :size / 2
\`\`\`

### Variable References
Use \`:varname\` to reference a variable's value (note the colon prefix).

\`\`\`logo
MAKE "len 50
FD :len         // Use the variable
MAKE "double :len * 2
\`\`\`

---

## Control Flow

### REPEAT \`count\` \`[instructionlist]\`
Execute the instruction list a specified number of times. Instructions must be enclosed in square brackets.

\`\`\`logo
// Draw a square
REPEAT 4 [FD 50; RT 90]

// Multi-line format
REPEAT 5 [
  FD 10
  RT 30
]

// With variables
MAKE "sides 6
REPEAT :sides [FD 40; RT 360/:sides]
\`\`\`

---

## Expressions

### Arithmetic Operators
- \`+\` Addition
- \`-\` Subtraction  
- \`*\` Multiplication
- \`/\` Division
- \`^\` Exponentiation

### Operator Precedence
1. Functions (SQRT, LN, etc.)
2. \`^\` (power)
3. \`*\`, \`/\` (multiply, divide)
4. \`+\`, \`-\` (add, subtract)

Use parentheses to override operator precedence: \`(10 + 20) * 3\`

### Unary Minus
\`\`\`logo
FD -10          // Equivalent to BK 10
RT -45          // Equivalent to LT 45
\`\`\`

---

## Functions

Mathematical functions can be used in any expression.

### SQRT \`x\`
Square root.

\`\`\`logo
FD SQRT 144     // FD 12
MAKE "x SQRT 100 + 10   // x = 20
\`\`\`

### LN \`x\`
Natural logarithm (base e).

\`\`\`logo
FD LN 2.718281828   // FD 1 (approximately)
\`\`\`

### EXP \`x\`
Exponential function (e^x).

\`\`\`logo
FD EXP 1        // FD 2.718281828 (e)
FD EXP 2        // FD 7.389...
\`\`\`

### LOG10 \`x\`
Base-10 logarithm.

\`\`\`logo
FD LOG10 100    // FD 2
FD LOG10 1000   // FD 3
\`\`\`

---

## Comments

### Single-line Comments
Use \`#\` or \`//\` to comment to end of line.

\`\`\`logo
FD 50           # This is a comment
RT 90           // This is also a comment
\`\`\`

### Multi-line Comments
Use \`/* ... */\` for multi-line comments.

\`\`\`logo
/*
This is a multi-line comment
It can span multiple lines
*/
FD 100
\`\`\`

### EXTCOMMENTPOS \`[text]\`
Insert a comment into the OpenSCAD output at the turtle's current position. Useful for 
annotating specific points in the drawing. The comment text is enclosed in square brackets
and is optional.

\`\`\`logo
EXTCOMMENTPOS [Corner point]
FD 50
EXTCOMMENTPOS           // Without text
\`\`\`

### EXTMARKER \`[text], X, Y\`
Add a visual marker (red cross) in the preview and insert a position comment in the OpenSCAD 
output. Unlike EXTCOMMENTPOS, this command shows the marker position in the preview canvas.

- **Without arguments**: Places marker at current turtle position
- **With comment**: \`EXTMARKER [label]\` - Labels the marker
- **With coordinates**: \`EXTMARKER [label], X, Y\` - Places marker at specified position without moving turtle

\`\`\`logo
// Mark the current position
FD 50
EXTMARKER [Corner 1]

// Mark a specific position without moving
FD 50
EXTMARKER [Origin], 0, 0

// Mark with variables
MAKE "x 10
MAKE "y 20
EXTMARKER [Point A], :x, :y
\`\`\`

### EXTSETFN \`value\`
Set the resolution for arc drawing. FN (fragment number) controls how many segments are used to approximate
arcs and circles. This command is inspired by OpenSCAD's \`$fn\` special variable.

- **Default**: FN = 40 (produces 10 segments per 90° arc)
- **Formula**: A 360° circle uses FN segments
- **Minimum**: FN must be at least 1
- **Decimals**: Values are rounded down to integers
- **Per-arc control**: Each arc drawn after EXTSETFN uses the current FN value

\`\`\`logo
// Default FN=40: smooth circle with 40 segments
ARC 360, 50

// Low resolution: pentagon (5 segments)
EXTSETFN 5
ARC 360, 30

// High resolution: very smooth circle (100 segments)
EXTSETFN 100
ARC 360, 40

// Triangle (3 segments)
EXTSETFN 3
ARC 360, 20

// Different resolution for different arcs
EXTSETFN 8          // Octagon
ARC 360, 25
EXTSETFN 12         // 12-sided polygon
ARC 360, 25
\`\`\`

**Examples**:
- \`EXTSETFN 3\`: 360° arc draws a triangle
- \`EXTSETFN 4\`: 360° arc draws a square
- \`EXTSETFN 6\`: 360° arc draws a hexagon
- \`EXTSETFN 100\`: Very smooth circles
- \`MAKE "fn 3; REPEAT 4 [EXTSETFN :fn; ARC 360, 25; MAKE "fn :fn + 1]\`: Draws polygons from triangle to hexagon

### PRINT \`arg1, arg2, ...\`
Output text as a single-line comment in the OpenSCAD output. Arguments are comma-separated and can be:
- **Strings in brackets**: \`[text]\`
- **Variables**: \`:varname\`
- **Expressions**: \`10 + 20\` or \`:size * 2\`

Multiple arguments are output space-separated.

\`\`\`logo
PRINT [Hello, World!]

MAKE "x 100
PRINT [X:], :x
// Output: // X: 100

PRINT [Size:], :x, [doubled:], :x * 2
// Output: // Size: 100 doubled: 200

PRINT [Starting the square]
REPEAT 4 [FD 50; RT 90]
PRINT [Square complete]
\`\`\`

---

## Syntax

### Command Separators
- **Newline**: Each command on its own line
- **Semicolon**: Multiple commands on one line

\`\`\`logo
FD 50; RT 90; FD 50
\`\`\`

### Multi-argument Commands
Commands that take multiple arguments require comma separation:
- \`ARC angle, radius\`
- \`SETXY x, y\`

---

## Examples

### Draw a Square
\`\`\`logo
REPEAT 4 [FD 100; RT 90]
\`\`\`

### Draw a Hexagon
\`\`\`logo
MAKE "sides 6
REPEAT :sides [FD 50; RT 360/:sides]
\`\`\`

### Draw a Star
\`\`\`logo
REPEAT 5 [FD 100; RT 144]
\`\`\`

### Draw Multiple Shapes
\`\`\`logo
// Square
REPEAT 4 [FD 50; RT 90]

// Move without drawing
PU
FD 100
PD

// Triangle
REPEAT 3 [FD 50; LT 120]
\`\`\`

### Using Variables and Expressions
\`\`\`logo
MAKE "base 50
MAKE "height SQRT 2 * :base

FD :base
RT 90
FD :height
\`\`\`

---

## Keyboard Shortcuts

- **Ctrl+Enter** or **Ctrl+S** (Cmd+Enter or Cmd+S on Mac): Run the preview animation

---

## Tips

1. **Preview Animation**: The preview updates only when you click Play or press Ctrl+Enter or Ctrl+S, not on every edit
2. **Error Handling**: Invalid commands are skipped and reported in the error panel
3. **Comments in Output**: Comments from your script are preserved in the OpenSCAD output
4. **Arc Resolution**: Use EXTSETFN to control the smoothness of arcs and circles
5. **Pen-up Travel**: Shown as dashed lines in the preview
`
