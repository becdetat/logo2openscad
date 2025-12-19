# Turtle2OpenSCAD

Client-side web app that converts a small Turtle script into OpenSCAD `polygon(points=[...])` output.

## Features

- 3 panes: Turtle script editor (Monaco), animated preview (Play/Pause), generated OpenSCAD output (read-only) with Copy button
- Turtle defaults: origin `(0, 0)`, heading up, degrees, pen down
- Supports multiple polygons via `PU`/`PD`
- Pen-up travel is shown dashed in the preview

## Turtle language

Only a very small subset of the Berkeley Logo dialect is included. At the moment only basic movement and pen up/down commands are supported.

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
- Note that commands that take more than one argument require a comma between arguments
- The following binary mathematical operations are supported: `+`, `-`, `*`, `/`, `^`
- Unary mathematical minus is supported: `FORWARD -10` (equivalent to `BACK 10`)
- Brackets are supported for explicit operator precedence: `LEFT (10+20)*3` (equivalent to `LEFT 90`)


Invalid statements are reported and skipped; execution continues.

See the [Issues](https://github.com/becdetat/turtle2openscad/issues) for more commands that are planned for implementation. Because of the scope of the project I'm not planning on making this into a full Logo dialect parser. The `LOOP` command is probably as complex as is needed.

## Local development

```pwsh
Set-Location "c:\development\becdetat\turtle2openscad"
npm install
npm run dev
```

## Build

```pwsh
Set-Location "c:\development\becdetat\turtle2openscad"
npm run build
npm run preview
```

## Docker

Build and run locally:

```pwsh
Set-Location "c:\development\becdetat\turtle2openscad"
docker build -t turtle2openscad:local .
docker run --rm -p 8080:80 turtle2openscad:local
```

Then open `http://localhost:8080`.

### Build + push to Docker Hub

1) Create a Docker Hub repo (e.g. `YOUR_DOCKERHUB_USER/turtle2openscad`).

2) Login:

```pwsh
docker login
```

3) Build + tag:

```pwsh
$USER = "YOUR_DOCKERHUB_USER"
$TAG = "0.1.0"
docker build -t "$USER/turtle2openscad:$TAG" .
docker tag "$USER/turtle2openscad:$TAG" "$USER/turtle2openscad:latest"
```

4) Push:

```pwsh
docker push "$USER/turtle2openscad:$TAG"
docker push "$USER/turtle2openscad:latest"
```

## Docker Compose
```yml
services:
  turtle2openscad:
    image: becdetat/turtle2openscad:latest
    container_name: turtle2openscad
    ports:
      - 8080:80
    restart: unless-stopped
```
