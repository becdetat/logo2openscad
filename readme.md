# Turtle2OpenSCAD

Client-side web app that converts a small Turtle script into OpenSCAD `polygon(points=[...])` output.

## Features

- 3 panes: Turtle script editor (Monaco), animated preview (Play/Pause), generated OpenSCAD output (read-only) with Copy button
- Turtle defaults: origin `(0, 0)`, heading up, degrees, pen down
- Supports multiple polygons via `PU`/`PD`
- Pen-up travel is shown dashed in the preview

## Turtle language

- Separators: newline and `;`
- Comments: `# ...` and `// ...` (to end of line)
- Numbers: decimals and negative values allowed
- Commands (long + short aliases):
	- `FD` / `FORWARD <n>`
	- `BK` / `BACK <n>`
	- `LT` / `LEFT <deg>`
	- `RT` / `RIGHT <deg>`
	- `PU` / `PENUP`
	- `PD` / `PENDOWN`

Invalid statements are reported and skipped; execution continues.

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
```json
services:
  turtle2openscad:
    image: becdetat/turtle2openscad:latest
    container_name: turtle2openscad
    ports:
      - 8080:80
    restart: unless-stopped
```
