import { describe, expect, it, beforeAll, beforeEach, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import React from 'react'
import { Preview } from '../src/components/Preview'
import type { LogoSegment } from '../src/logo/types'

function createTestLocalStorage() {
  const store = new Map<string, string>()

  return {
    get length() {
      return store.size
    },
    clear() {
      store.clear()
    },
    getItem(key: string) {
      return store.has(key) ? store.get(key)! : null
    },
    key(index: number) {
      return Array.from(store.keys())[index] ?? null
    },
    removeItem(key: string) {
      store.delete(key)
    },
    setItem(key: string, value: string) {
      store.set(key, String(value))
    },
  }
}

describe('Preview', () => {
  beforeAll(() => {
    vi.stubGlobal('localStorage', createTestLocalStorage())
    HTMLCanvasElement.prototype.getContext = vi.fn(() => ({
      clearRect: vi.fn(),
      save: vi.fn(),
      restore: vi.fn(),
      beginPath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      stroke: vi.fn(),
      arc: vi.fn(),
      fill: vi.fn(),
      setLineDash: vi.fn(),
      strokeStyle: '',
      fillStyle: '',
      lineWidth: 1,
    }))
  })

  beforeEach(() => {
    localStorage.clear()
    Object.defineProperty(window, 'devicePixelRatio', {
      value: 1,
      configurable: true,
    })
    Object.defineProperty(HTMLCanvasElement.prototype, 'getBoundingClientRect', {
      configurable: true,
      value: () => ({
        left: 0,
        top: 0,
        width: 400,
        height: 300,
        right: 400,
        bottom: 300,
        x: 0,
        y: 0,
        toJSON: () => ({}),
      }),
    })
  })

  it('shows source line and segment length on hover', () => {
    const activeSegments: LogoSegment[] = [
      {
        from: { x: 0, y: 0 },
        to: { x: 100, y: 0 },
        penDown: true,
        sourceLine: 7,
      },
    ]

    const { container } = render(
      <Preview
        isPlaying={false}
        speed={10}
        progress={1}
        activeSegments={activeSegments}
        markers={[]}
        hasSegments={true}
        onPlay={vi.fn()}
        onPause={vi.fn()}
        onSpeedChange={vi.fn()}
      />,
    )

    const canvas = container.querySelector('canvas')
    expect(canvas).toBeTruthy()

    fireEvent.pointerMove(canvas!, {
      clientX: 200,
      clientY: 150,
    })

    expect(screen.getByText('Source line: 7')).toBeDefined()
    expect(screen.getByText('Length: 100.00')).toBeDefined()
  })
})