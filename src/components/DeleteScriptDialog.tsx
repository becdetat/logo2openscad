import { Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle } from '@mui/material'

export type DeleteScriptDialogProps = {
  open: boolean
  scriptName: string
  onClose: () => void
  onConfirm: () => void
}

export function DeleteScriptDialog(props: DeleteScriptDialogProps) {
  return (
    <Dialog open={props.open} onClose={props.onClose} maxWidth="sm">
      <DialogTitle>Delete Script</DialogTitle>
      <DialogContent>
        <DialogContentText>
          Are you sure you want to permanently delete <strong>{props.scriptName}</strong>?
        </DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button onClick={props.onClose}>Cancel</Button>
        <Button 
          onClick={() => {
            props.onConfirm()
            props.onClose()
          }} 
          color="error"
          variant="contained"
        >
          Delete
        </Button>
      </DialogActions>
    </Dialog>
  )
}
