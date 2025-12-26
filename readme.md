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
	- `ARC <angle>, <radius>` - draws an arc with turtle at center, starting at turtle's heading, extending clockwise through the angle. Turtle does not move.
  - `SETX <n>` - move the turtle to the absolute X coordinate 
  - `SETY <n>` - move the turtle to the absolute Y coordinate 
  - `SETXY <n>, <n>` - move the turtle to the absolute X and Y coordinates
  - `SETH` / `SETHEADING <deg>` - turn the turtle to a new absolute heading, relative to the Y axis
  - `HOME` - move the turtle to the origin (0, 0) and set the heading to 0 degrees relative to the Y axis
  - `PRINT <arg1>, <arg2>, ...` - output text as a single-line comment in the OpenSCAD output. Arguments can be strings in brackets `[text]`, variables `:varname`, or expressions. Multiple arguments are comma-separated and output space-separated.
  - `EXTSETFN <value>` - set the resolution for arc drawing. FN (fragment number) controls how many segments are used to approximate arcs and circles. Default is 40 (producing 10 segments per 90° arc). This is inspired by OpenSCAD's `$fn` special variable. A 360° circle uses FN segments. Minimum value is 1. Decimal values are rounded down. Each arc drawn after EXTSETFN uses the current FN value, allowing different resolutions for different arcs. Examples: `EXTSETFN 3` creates triangles, `EXTSETFN 6` creates hexagons, `EXTSETFN 100` creates very smooth circles.
- Note that commands that take more than one argument require a comma between arguments
- The following binary arithmetic operations are supported: `+`, `-`, `*`, `/`, `^`
- Unary minus is supported: `FORWARD -10` (equivalent to `BACK 10`)
- The following function calls can be used within numeric calculations: `SQRT`, `LN` (natural logarithm), `EXP` (exponent - e^x), and `LOG10` (base-10 logarithm)
- Brackets are supported for explicit operator precedence: `LEFT (10+20)*3` (equivalent to `LEFT 90`)
- Variables can be defined (using `MAKE "variable_name 10` - note the quote mark prefix to indicate the new variable name) and used in arithmetic operations (using a colon prefix like `:variable_name` to reference the variable):
  ```
  MAKE "size 100
  FD :size
  MAKE "half :size / 2; FD :half;
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

### Build + push to Docker Hub

1) Tag a new release in Git
```pwsh
git tag 0.6.0
git push origin 0.6.0
```

2) Docker log in, build + tag:
```pwsh
docker login
docker build -t "becdetat/logo2openscad:0.6.0" .
docker tag "becdetat/logo2openscad:0.6.0" "becdetat/logo2openscad:latest"
```

3) Push:
```pwsh
docker push "becdetat/logo2openscad:0.6.0"
docker push "becdetat/logo2openscad:latest"
```

4) Create new release in Github


## Example Docker Compose
```yml
services:
  logo2openscad:
    image: becdetat/logo2openscad:latest
    container_name: logo2openscad
    ports:
      - 8080:80
    restart: unless-stopped
```
