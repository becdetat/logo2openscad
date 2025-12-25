import { Snackbar, Alert } from '@mui/material'

export type ErrorSnackbarProps = {
  message: string | null
  onClose: () => void
}

export function ErrorSnackbar(props: ErrorSnackbarProps) {
  return (
    <Snackbar
      open={!!props.message}
      autoHideDuration={6000}
      onClose={props.onClose}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
    >
      <Alert onClose={props.onClose} severity="error" sx={{ width: '100%' }}>
        {props.message}
      </Alert>
    </Snackbar>
  )
}
