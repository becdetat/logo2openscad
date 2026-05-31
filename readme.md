# Logo2OpenSCAD

Client-side web app that converts a small Logo "turtle" script into OpenSCAD `polygon(points=[...])` output.

## Features

- **Workspace Management**: Create, rename, and delete multiple Logo scripts within a single workspace
  - Collapsible sidebar for easy script navigation
  - Auto-save on every change
  - Automatic migration from older single-script format
- **3 Panes**: Logo script editor (Monaco), animated preview (Play/Pause), generated OpenSCAD output (read-only) with Copy button
- **Turtle Defaults**: origin `(0, 0)`, heading up, degrees, pen down
- **Multiple Polygons**: Supports via `PU`/`PD`
- **Preview**: Pen-up travel is shown dashed in the preview

## Self-hosting

Create a `docker-compose.yml` file like below:

```yml
services:
  logo2openscad:
    image: ghcr.io/becdetat/logo2openscad:latest
    container_name: logo2openscad
    ports:
      - 8080:80
    restart: unless-stopped
```

Then start the container:

```sh
docker compose up -d
```

To upgrade, pull then re-up:

```sh
docker compose pull
docker compose up -d
```

## Logo language

Only a very small, mangled subset of the [Berkeley Logo](https://people.eecs.berkeley.edu/~bh/usermanual) dialect is included, concentrating on commands and syntax that support drawing (turtle commands).

- Command separators: newline and `;`
- Single line comments: `# ...` and `// ...` (to end of line)
- Multi-line comments: `/* ... */`
- Numbers: decimals allowed
- Commands (long + short aliases):
	- `FD` / `FORWARD <n>`
	- `BK` / `BACK <n>`
	- `LT` / `LEFT <deg>`
	- `RT` / `RIGHT <deg>`
	- `PU` / `PENUP`
	- `PD` / `PENDOWN`
	- `ARC <angle>, <radius>` - draws an arc with turtle at center, starting at turtle's heading, extending clockwise through the angle. Turtle does not move. **Note:** When the angle is exactly 360 or -360 degrees, the arc is automatically converted to an optimized `circle(r=<radius>, $fn=<FN>)` command in the OpenSCAD output instead of generating a polygon with many points.
  - `SETX <n>` - move the turtle to the absolute X coordinate 
  - `SETY <n>` - move the turtle to the absolute Y coordinate 
  - `SETXY <n>, <n>` - move the turtle to the absolute X and Y coordinates
  - `SETH` / `SETHEADING <deg>` - turn the turtle to a new absolute heading, relative to the Y axis
  - `HOME` - move the turtle to the origin (0, 0) and set the heading to 0 degrees relative to the Y axis
  - `PRINT <arg1>, <arg2>, ...` - output text as a single-line comment in the OpenSCAD output. Arguments can be strings in brackets `[text]`, variables `:varname`, or expressions. Multiple arguments are comma-separated and output space-separated.
  - `EXTCOMMENTPOS [text]` - insert a comment into the OpenSCAD output at the turtle's current position. Useful for annotating specific points in the drawing. The comment text is enclosed in square brackets and is optional.
  - `EXTMARKER [text], <x>, <y>` - add a visual marker (red cross) in the preview and insert a position comment in the OpenSCAD output. Unlike EXTCOMMENTPOS, this shows the marker position in the preview canvas. Can be used without arguments to mark current position, with just a comment `[label]`, or with coordinates to mark a specific position without moving the turtle. Examples: `EXTMARKER`, `EXTMARKER [Corner 1]`, `EXTMARKER [Origin], 0, 0`
  - `EXTSETFN <value>` - set the resolution for arc drawing. FN (fragment number) controls how many segments are used to approximate arcs and circles. Default is 40 (producing 10 segments per 90° arc). This is inspired by OpenSCAD's `$fn` special variable. A 360° circle uses FN segments. Minimum value is 1. Decimal values are rounded down. Each arc drawn after EXTSETFN uses the current FN value, allowing different resolutions for different arcs. Examples: `EXTSETFN 3` creates triangles, `EXTSETFN 6` creates hexagons, `EXTSETFN 100` creates very smooth circles.
  - `EXTBEZIERCURVE [instructions]` - draw a Bézier curve using control points defined by `EXTDEFCONTROLPOINT` calls inside the instruction list. The instruction list is executed with the pen up — movements position the turtle but do not draw. The curve uses `FN × 4` steps. After completion, the turtle is at the final position and heading from the instruction list. Example:
    ```
    HOME
    EXTBEZIERCURVE [
        EXTDEFCONTROLPOINT   // P0 at (0, 0)
        FD 10
        EXTDEFCONTROLPOINT   // P1 at (0, 10)
        RT 90
        FD 10
        EXTDEFCONTROLPOINT   // P2 at (10, 10)
        RT 90
        FD 10
        EXTDEFCONTROLPOINT   // P3 at (10, 0)
    ]
    // Draws a cubic Bézier from (0,0) to (10,0) — turtle ends at (10,0), heading 180°
    ```
  - `EXTDEFCONTROLPOINT` - mark the turtle's current position as a Bézier control point within an `EXTBEZIERCURVE` instruction list. Has no effect outside `EXTBEZIERCURVE`.
- Note that commands that take more than one argument require a comma between arguments
- The following binary arithmetic operations are supported: `+`, `-`, `*`, `/`, `^`
- Unary minus is supported: `FORWARD -10` (equivalent to `BACK 10`)
- The following function calls can be used within numeric calculations: `SQRT`, `LN` (natural logarithm), `EXP` (exponent - e^x), and `LOG10` (base-10 logarithm)
- Brackets are supported for explicit operator precedence: `LEFT (10+20)*3` (equivalent to `LEFT 90`)
- Variables can be defined (using `MAKE "variable_name 10` - note the quote mark prefix to indicate the new variable name) and used in arithmetic operations (using a colon prefix like `:variable_name` to reference the variable):
  ```
  // Numeric variables
  MAKE "size 100
  FD :size
  MAKE "half :size / 2; FD :half;

  // Instruction list variables (macros/subroutines)
  MAKE "square [REPEAT 4 [FD 50; RT 90]]
  MAKE "step [FD 10; RT 90]
  
  // Execute instruction lists directly
  :square
  FD 20
  :square
  
  // Use in REPEAT
  MAKE "instructions [LT 90; FD 10]
  REPEAT 4 :instructions
  ```
- Loops can be created using the `REPEAT` command:
  ```
  // Draw a square
  REPEAT 4 [FD 50; RT 90]

  // Nested commands with variables
  MAKE "size 100
  REPEAT 3 [FD :size; LT 120]

  // Multiple commands in the instruction list
  REPEAT 6 [
    FD 10
    RT 30
    FD 20
    RT 30
  ]

  // Using expressions in the count
  MAKE "sides 6
  REPEAT :sides [FD 50; RT 360/:sides]

  // Using stored instruction lists
  MAKE "step [FD 10; RT 90]
  REPEAT 4 :step

  // Variables can be modified inside REPEAT
  MAKE "len 10
  REPEAT 4 [
    FD :len
    RT 90
    MAKE "len :len + 5
  ]

  // Complex expressions with operations
  REPEAT 3*2 [FD 10; RT 60]
  ```

Invalid statements are reported and skipped; execution continues.

See [Issues](https://github.com/becdetat/logo2openscad/issues) for more commands that are planned for implementation. Because of the scope of the project I'm not planning on making this into a full Logo dialect parser.

## Local development

### Workspace Storage

The app stores all scripts in browser localStorage under the key `logo2openscad:workspace`. Each workspace contains:
- Multiple scripts with unique names
- Script content and metadata (created/updated timestamps)
- Active script selection

The app automatically migrates from the older single-script format (`turtle2openscad:script`) on first load.

### Development Server

```pwsh
npm install
npm run dev
```

## Testing

The project uses Vitest for unit testing. Tests cover the core Logo graphics modules and workspace management:

- **parser.test.ts** - Tests the Logo script parser for commands, comments, expressions, variables, and REPEAT loops
- **interpreter.test.ts** - Tests the Logo interpreter for movement, turning, polygons, arcs, and state management
- **openscad.test.ts** - Tests OpenSCAD code generation including polygon output, comments, and number formatting
- **drawPreview.test.ts** - Tests canvas preview rendering including segment drawing, viewport scaling, and animation
- **useWorkspace.test.ts** - Tests workspace management including CRUD operations, validation, and migration
- **dialogs.test.tsx** - Tests UI dialogs for script creation, renaming, and deletion

Run tests:

```pwsh
# Run tests in watch mode (recommended during development)
npm test

# Run tests once
npm run test:run

# Run tests with interactive UI
npm run test:ui

# Generate coverage report
npm run test:coverage
```

## Build

```pwsh
npm run build
npm run preview
```

## Docker

Build and run locally:

```pwsh
docker build -t logo2openscad:local .
docker run --rm -p 8080:80 logo2openscad:local
```

Then open `http://localhost:8080`.

### Publish to GHCR (maintainers)

Push a semantic version tag with a leading `v`:

```pwsh
git tag v0.10.0
git push origin v0.10.0
```

GitHub Actions will build the root `Dockerfile` and push these tags to GHCR:

- `ghcr.io/becdetat/logo2openscad:0.10.0`
- `ghcr.io/becdetat/logo2openscad:0.10`
- `ghcr.io/becdetat/logo2openscad:latest`

The workflow uses the built-in `GITHUB_TOKEN`, so the repository needs permission to publish packages to GitHub Container Registry.


## Example Docker Compose
```yml
services:
  logo2openscad:
    image: ghcr.io/becdetat/logo2openscad:latest
    container_name: logo2openscad
    ports:
      - 8080:80
    restart: unless-stopped
```
