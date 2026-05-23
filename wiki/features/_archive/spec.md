# Turtle2OpenSCAD spec

Web application. Three panes. First is where you type Turtle script to define the shape. 

Second is where you see a preview of what the turtle draws. This should be animated, so you can see the path the turtle traverses.

Third is where an OpenSCAD `polygon` script is generated. This should automatically close the polygon. If the turtle script includes a pen up command then a pen down command it should generate multiple `polygon` commands, so that you can draw multiple polygons using the turtle script. This script should _not_ be editable. There should be a button to copy the OpenSCAD script to the clipboard.

No need to save anything to the server - this will be a client side application.

Technologies I want to use:
- React 
- Material UI
- TypeScript

## Turtle language

- Origin: `(0, 0)`
- Initial heading: facing the top of the screen
- Angles: degrees
- Pen: down by default
- Comments: `# ...` and `// ...` (to end of line)
- Statement separators: newline and `;`
- Numbers: decimals and negative values allowed
- Commands (long and short aliases):
	- `FD` / `FORWARD <n>`
	- `BK` / `BACK <n>`
	- `LT` / `LEFT <deg>`
	- `RT` / `RIGHT <deg>`
	- `PU` / `PENUP`
	- `PD` / `PENDOWN`
	- `ARC <angle> <radius>` - draws an arc of a circle with turtle at center, starting at turtle's heading, extending clockwise through the angle. Turtle does not move. Approximated as polygon points (configurable in Settings).
- Invalid statements: report an error and skip; continue executing remaining statements

## Preview

- Not automatic: provide Play and Pause buttons
- Provide a speed slider in segments/sec
- Editing the script auto-pauses playback and resets progress
- Pen-up travel is dashed

## OpenSCAD output

- Uses `polygon(points=[...])`
- Always auto-closes polygons
- If the turtle script includes a pen up then a pen down, generate multiple `polygon(...)` blocks
- Finalize the last polygon at end of script
- Degenerate polygons are allowed

I want to be able to build a docker image for this too. It should be self-hostable. Document steps for building and uploading the docker image to hub.docker.com in the `readme.md` file.

Also set up a .gitignore file for the project.

