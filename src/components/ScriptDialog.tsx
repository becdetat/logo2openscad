import { useState, useEffect } from 'react'
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, TextField } from '@mui/material'

export type ScriptDialogProps = {
  open: boolean
  title: string
  initialValue?: string
  onClose: () => void
  onConfirm: (name: string) => void
}

export function ScriptDialog(props: ScriptDialogProps) {
  const [name, setName] = useState(props.initialValue || '')
  const [error, setError] = useState('')

  // Reset state when dialog opens/closes or initialValue changes
  useEffect(() => {
    if (props.open) {
      setName(props.initialValue || '')
      setError('')
    }
  }, [props.open, props.initialValue])

  const handleConfirm = () => {
    const trimmedName = name.trim()
    
    if (!trimmedName) {
      setError('Script name cannot be empty')
      return
    }

    try {
      props.onConfirm(trimmedName)
      props.onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleConfirm()
    }
  }

  return (
    <Dialog open={props.open} onClose={props.onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{props.title}</DialogTitle>
      <DialogContent>
        <TextField
          autoFocus
          fullWidth
          label="Script name"
          value={name}
          onChange={(e) => {
            setName(e.target.value)
            setError('')
          }}
          onKeyPress={handleKeyPress}
          error={!!error}
          helperText={error}
          sx={{ mt: 1 }}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={props.onClose}>Cancel</Button>
        <Button onClick={handleConfirm} variant="contained">
          {props.title.includes('Rename') ? 'Rename' : 'Create'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
