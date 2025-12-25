import { describe, expect, it, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import React from 'react'
import { ScriptDialog } from '../src/components/ScriptDialog'
import { DeleteScriptDialog } from '../src/components/DeleteScriptDialog'

describe('ScriptDialog', () => {
  it('should render with title', () => {
    render(
      <ScriptDialog
        open={true}
        title="Create New Script"
        onClose={vi.fn()}
        onConfirm={vi.fn()}
      />
    )
    
    expect(screen.getByText('Create New Script')).toBeDefined()
    expect(screen.getByLabelText('Script name')).toBeDefined()
  })

  it('should call onConfirm with trimmed name', () => {
    const onConfirm = vi.fn()
    render(
      <ScriptDialog
        open={true}
        title="Create New Script"
        onClose={vi.fn()}
        onConfirm={onConfirm}
      />
    )
    
    const input = screen.getByLabelText('Script name')
    fireEvent.change(input, { target: { value: '  Test Script  ' } })
    
    const createButton = screen.getByText('Create')
    fireEvent.click(createButton)
    
    expect(onConfirm).toHaveBeenCalledWith('Test Script')
  })

  it('should show error for empty name', () => {
    render(
      <ScriptDialog
        open={true}
        title="Create New Script"
        onClose={vi.fn()}
        onConfirm={vi.fn()}
      />
    )
    
    const createButton = screen.getByText('Create')
    fireEvent.click(createButton)
    
    expect(screen.getByText('Script name cannot be empty')).toBeDefined()
  })

  it('should use initialValue', () => {
    render(
      <ScriptDialog
        open={true}
        title="Rename Script"
        initialValue="Old Name"
        onClose={vi.fn()}
        onConfirm={vi.fn()}
      />
    )
    
    const input = screen.getByLabelText('Script name') as HTMLInputElement
    expect(input.value).toBe('Old Name')
    expect(screen.getByText('Rename')).toBeDefined()
  })

  it('should handle errors from onConfirm', () => {
    const onConfirm = vi.fn(() => {
      throw new Error('A script with this name already exists')
    })
    
    render(
      <ScriptDialog
        open={true}
        title="Create New Script"
        initialValue="Duplicate"
        onClose={vi.fn()}
        onConfirm={onConfirm}
      />
    )
    
    const createButton = screen.getByText('Create')
    fireEvent.click(createButton)
    
    expect(screen.getByText('A script with this name already exists')).toBeDefined()
  })
})

describe('DeleteScriptDialog', () => {
  it('should render with script name', () => {
    render(
      <DeleteScriptDialog
        open={true}
        scriptName="Test Script"
        onClose={vi.fn()}
        onConfirm={vi.fn()}
      />
    )
    
    expect(screen.getByText('Delete Script')).toBeDefined()
    expect(screen.getByText('Test Script')).toBeDefined()
    expect(screen.getByText(/Are you sure you want to permanently delete/)).toBeDefined()
  })

  it('should call onConfirm and onClose when delete clicked', () => {
    const onConfirm = vi.fn()
    const onClose = vi.fn()
    
    render(
      <DeleteScriptDialog
        open={true}
        scriptName="Test Script"
        onClose={onClose}
        onConfirm={onConfirm}
      />
    )
    
    const deleteButton = screen.getByText('Delete')
    fireEvent.click(deleteButton)
    
    expect(onConfirm).toHaveBeenCalled()
    expect(onClose).toHaveBeenCalled()
  })

  it('should call only onClose when cancel clicked', () => {
    const onConfirm = vi.fn()
    const onClose = vi.fn()
    
    render(
      <DeleteScriptDialog
        open={true}
        scriptName="Test Script"
        onClose={onClose}
        onConfirm={onConfirm}
      />
    )
    
    const cancelButton = screen.getByText('Cancel')
    fireEvent.click(cancelButton)
    
    expect(onConfirm).not.toHaveBeenCalled()
    expect(onClose).toHaveBeenCalled()
  })
})
