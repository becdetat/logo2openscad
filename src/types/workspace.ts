export type LogoScript = {
  id: string              // Unique identifier (use crypto.randomUUID())
  name: string           // User-facing name (e.g., "Untitled1", "My Drawing")
  content: string        // The Logo script source code
  createdAt: number      // Timestamp
  updatedAt: number      // Timestamp
}

export type Workspace = {
  scripts: LogoScript[]
  activeScriptId: string | null  // ID of currently open script
  version: number                 // Schema version for future migrations (start at 1)
}
