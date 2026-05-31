import { Separator } from 'react-resizable-panels'
import { Box } from '@mui/material'

export function ResizeHandle() {
    return (
        <Separator>
            <Box
                sx={{
                    width: 8,
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '4px',
                    cursor: 'col-resize',
                    '& .grip-dot': {
                        width: 3,
                        height: 3,
                        borderRadius: '50%',
                        backgroundColor: 'action.disabled',
                        opacity: 0,
                        transition: 'opacity 0.15s, background-color 0.15s',
                    },
                    '&:hover .grip-dot': {
                        opacity: 1,
                    },
                    '[data-separator][data-resize-handle-active] & .grip-dot': {
                        opacity: 1,
                        backgroundColor: 'primary.main',
                    },
                }}
            >
                <Box className="grip-dot" />
                <Box className="grip-dot" />
                <Box className="grip-dot" />
            </Box>
        </Separator>
    )
}
