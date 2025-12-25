import { useState } from 'react'
import {
  Box,
  Drawer,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Menu,
  MenuItem,
  Stack,
  Toolbar,
  Typography,
  Button,
} from '@mui/material'
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import AddIcon from '@mui/icons-material/Add'
import MoreVertIcon from '@mui/icons-material/MoreVert'
import type { LogoScript } from '../types/workspace'

const DRAWER_WIDTH = 240

export type WorkspaceSidebarProps = {
  collapsed: boolean
  onToggleCollapse: () => void
  scripts: LogoScript[]
  activeScriptId: string | null
  onSelectScript: (scriptId: string) => void
  onCreateScript: () => void
  onRenameScript: (scriptId: string) => void
  onDeleteScript: (scriptId: string) => void
}

export function WorkspaceSidebar(props: WorkspaceSidebarProps) {
  const [contextMenu, setContextMenu] = useState<{
    mouseX: number
    mouseY: number
    scriptId: string
  } | null>(null)

  const handleContextMenu = (event: React.MouseEvent, scriptId: string) => {
    event.preventDefault()
    setContextMenu({
      mouseX: event.clientX,
      mouseY: event.clientY,
      scriptId,
    })
  }

  const handleCloseContextMenu = () => {
    setContextMenu(null)
  }

  const handleRename = () => {
    if (contextMenu) {
      props.onRenameScript(contextMenu.scriptId)
      handleCloseContextMenu()
    }
  }

  const handleDelete = () => {
    if (contextMenu) {
      props.onDeleteScript(contextMenu.scriptId)
      handleCloseContextMenu()
    }
  }

  const handleEllipsisClick = (event: React.MouseEvent, scriptId: string) => {
    event.stopPropagation()
    setContextMenu({
      mouseX: event.clientX,
      mouseY: event.clientY,
      scriptId,
    })
  }

  return (
    <>
      <Drawer
        variant="permanent"
        sx={{
          width: props.collapsed ? 0 : DRAWER_WIDTH,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: DRAWER_WIDTH,
            boxSizing: 'border-box',
            transform: props.collapsed ? `translateX(-${DRAWER_WIDTH}px)` : 'translateX(0)',
            transition: (theme) =>
              theme.transitions.create('transform', {
                easing: theme.transitions.easing.sharp,
                duration: theme.transitions.duration.enteringScreen,
              }),
          },
        }}
      >
        <Toolbar />
        <Box sx={{ overflow: 'auto', display: 'flex', flexDirection: 'column', height: '100%' }}>
          <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ px: 2, py: 1 }}>
            <Typography variant="h6" component="div">
              Scripts
            </Typography>
            <IconButton size="small" onClick={props.onToggleCollapse} edge="end">
              <ChevronLeftIcon />
            </IconButton>
          </Stack>
          
          <Box sx={{ px: 2, pb: 1 }}>
            <Button
              fullWidth
              variant="outlined"
              startIcon={<AddIcon />}
              onClick={props.onCreateScript}
              size="small"
            >
              New Script
            </Button>
          </Box>

          <List sx={{ flexGrow: 1, pt: 0 }}>
            {props.scripts.map((script) => (
              <ListItem
                key={script.id}
                disablePadding
                onContextMenu={(e) => handleContextMenu(e, script.id)}
                secondaryAction={
                  <IconButton
                    edge="end"
                    size="small"
                    onClick={(e) => handleEllipsisClick(e, script.id)}
                    sx={{ mr: 0.5 }}
                  >
                    <MoreVertIcon fontSize="small" />
                  </IconButton>
                }
              >
                <ListItemButton
                  selected={script.id === props.activeScriptId}
                  onClick={() => props.onSelectScript(script.id)}
                >
                  <ListItemText 
                    primary={script.name}
                    primaryTypographyProps={{
                      noWrap: true,
                      sx: { pr: 1 }
                    }}
                  />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
        </Box>
      </Drawer>

      {/* Collapse button when sidebar is collapsed */}
      {props.collapsed && (
        <IconButton
          onClick={props.onToggleCollapse}
          sx={{
            position: 'fixed',
            left: 8,
            top: 72,
            zIndex: (theme) => theme.zIndex.drawer + 1,
          }}
        >
          <ChevronRightIcon />
        </IconButton>
      )}

      {/* Context Menu */}
      <Menu
        open={contextMenu !== null}
        onClose={handleCloseContextMenu}
        anchorReference="anchorPosition"
        anchorPosition={
          contextMenu !== null
            ? { top: contextMenu.mouseY, left: contextMenu.mouseX }
            : undefined
        }
      >
        <MenuItem onClick={handleRename}>Rename</MenuItem>
        <MenuItem onClick={handleDelete}>Delete</MenuItem>
      </Menu>
    </>
  )
}
