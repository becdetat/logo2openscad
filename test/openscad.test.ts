import { describe, expect, it } from 'vitest'
import { generateOpenScad } from '../src/logo/openscad'
import type { LogoPolygon } from '../src/logo/types'

describe('openscad', () => {
  describe('basic polygon generation', () => {
    it('should generate OpenSCAD for a simple polygon', () => {
      const polygons: LogoPolygon[] = [
        {
          points: [
            { x: 0, y: 0 },
            { x: 10, y: 0 },
            { x: 10, y: 10 },
            { x: 0, y: 10 },
          ],
          comments: [],
          commentsByPointIndex: new Map(),
        },
      ]

      const result = generateOpenScad(polygons)

      expect(result).toContain('polygon(points=[')
      expect(result).toContain('[0, 0]')
      expect(result).toContain('[10, 0]')
      expect(result).toContain('[10, 10]')
      expect(result).toContain('[0, 10]')
      expect(result).toContain(']);')
    })

    it('should close polygons automatically', () => {
      const polygons: LogoPolygon[] = [
        {
          points: [
            { x: 0, y: 0 },
            { x: 10, y: 0 },
            { x: 10, y: 10 },
          ],
          comments: [],
          commentsByPointIndex: new Map(),
        },
      ]

      const result = generateOpenScad(polygons)

      // Should add closing point
      const pointCount = (result.match(/\[[\d.-]+, [\d.-]+\]/g) || []).length
      expect(pointCount).toBe(4) // 3 points + 1 closing point
    })

    it('should not duplicate closing point if already closed', () => {
      const polygons: LogoPolygon[] = [
        {
          points: [
            { x: 0, y: 0 },
            { x: 10, y: 0 },
            { x: 10, y: 10 },
            { x: 0, y: 0 }, // Already closed
          ],
          comments: [],
          commentsByPointIndex: new Map(),
        },
      ]

      const result = generateOpenScad(polygons)

      const pointCount = (result.match(/\[[\d.-]+, [\d.-]+\]/g) || []).length
      expect(pointCount).toBe(4)
    })
  })

  describe('multiple polygons', () => {
    it('should generate multiple polygon blocks', () => {
      const polygons: LogoPolygon[] = [
        {
          points: [
            { x: 0, y: 0 },
            { x: 10, y: 0 },
            { x: 10, y: 10 },
          ],
          comments: [],
          commentsByPointIndex: new Map(),
        },
        {
          points: [
            { x: 20, y: 20 },
            { x: 30, y: 20 },
            { x: 30, y: 30 },
          ],
          comments: [],
          commentsByPointIndex: new Map(),
        },
      ]

      const result = generateOpenScad(polygons)

      const polygonCount = (result.match(/polygon\(points=\[/g) || []).length
      expect(polygonCount).toBe(2)
      expect(result).toContain('[20, 20]')
      expect(result).toContain('[30, 30]')
    })

    it('should separate polygons with double newline', () => {
      const polygons: LogoPolygon[] = [
        {
          points: [{ x: 0, y: 0 }, { x: 10, y: 0 }],
          comments: [],
          commentsByPointIndex: new Map(),
        },
        {
          points: [{ x: 20, y: 20 }, { x: 30, y: 20 }],
          comments: [],
          commentsByPointIndex: new Map(),
        },
      ]

      const result = generateOpenScad(polygons)

      expect(result).toContain('\n\n')
    })
  })

  describe('number formatting', () => {
    it('should format numbers with appropriate precision', () => {
      const polygons: LogoPolygon[] = [
        {
          points: [
            { x: 1.123456789, y: 2.987654321 },
            { x: 10, y: 20 },
          ],
          comments: [],
          commentsByPointIndex: new Map(),
        },
      ]

      const result = generateOpenScad(polygons)

      // Should be limited to 6 decimal places
      expect(result).toContain('1.123457')
      expect(result).toContain('2.987654')
    })

    it('should handle negative numbers', () => {
      const polygons: LogoPolygon[] = [
        {
          points: [
            { x: -10, y: -20 },
            { x: 5, y: 15 },
          ],
          comments: [],
          commentsByPointIndex: new Map(),
        },
      ]

      const result = generateOpenScad(polygons)

      expect(result).toContain('[-10, -20]')
    })

    it('should trim trailing zeros', () => {
      const polygons: LogoPolygon[] = [
        {
          points: [
            { x: 10.5, y: 20.0 },
          ],
          comments: [],
          commentsByPointIndex: new Map(),
        },
      ]

      const result = generateOpenScad(polygons)

      expect(result).toContain('[10.5, 20]')
    })
  })

  describe('comments', () => {
    it('should include polygon-level comments', () => {
      const polygons: LogoPolygon[] = [
        {
          points: [
            { x: 0, y: 0 },
            { x: 10, y: 0 },
          ],
          comments: [
            { text: '// This is a polygon', line: 1 },
          ],
          commentsByPointIndex: new Map(),
        },
      ]

      const result = generateOpenScad(polygons)

      expect(result).toContain('// This is a polygon')
    })

    it('should include comments at specific point indices', () => {
      const commentsByPointIndex = new Map<number, Array<{ text: string; line: number }>>()
      commentsByPointIndex.set(1, [{ text: '// At second point', line: 2 }])

      const polygons: LogoPolygon[] = [
        {
          points: [
            { x: 0, y: 0 },
            { x: 10, y: 0 },
            { x: 10, y: 10 },
          ],
          comments: [],
          commentsByPointIndex,
        },
      ]

      const result = generateOpenScad(polygons)

      expect(result).toContain('// At second point')
      // Comment should appear before the second point
      const commentIndex = result.indexOf('// At second point')
      const secondPointIndex = result.indexOf('[10, 0]')
      expect(commentIndex).toBeLessThan(secondPointIndex)
    })

    it('should handle multi-line comments', () => {
      const polygons: LogoPolygon[] = [
        {
          points: [{ x: 0, y: 0 }, { x: 10, y: 0 }],
          comments: [
            { text: '/*\nMulti-line\ncomment\n*/', line: 1, endLine: 4 },
          ],
          commentsByPointIndex: new Map(),
        },
      ]

      const result = generateOpenScad(polygons)

      expect(result).toContain('/*')
      expect(result).toContain('Multi-line')
      expect(result).toContain('*/')
    })

    it('should place comments in correct order', () => {
      const commentsByPointIndex = new Map<number, Array<{ text: string; line: number }>>()
      commentsByPointIndex.set(0, [
        { text: '// First comment', line: 1 },
        { text: '// Second comment', line: 2 },
      ])

      const polygons: LogoPolygon[] = [
        {
          points: [{ x: 0, y: 0 }, { x: 10, y: 0 }],
          comments: [],
          commentsByPointIndex,
        },
      ]

      const result = generateOpenScad(polygons)

      const firstIndex = result.indexOf('// First comment')
      const secondIndex = result.indexOf('// Second comment')
      expect(firstIndex).toBeLessThan(secondIndex)
    })
  })

  describe('edge cases', () => {
    it('should handle empty polygon array', () => {
      const result = generateOpenScad([])

      expect(result).toBe('// No polygons')
    })

    it('should handle polygon with single point', () => {
      const polygons: LogoPolygon[] = [
        {
          points: [],
          comments: [],
          commentsByPointIndex: new Map(),
        },
      ]

      const result = generateOpenScad(polygons)

      // Should add origin point
      expect(result).toContain('[0, 0]')
    })

    it('should format commas correctly', () => {
      const polygons: LogoPolygon[] = [
        {
          points: [
            { x: 0, y: 0 },
            { x: 10, y: 0 },
            { x: 10, y: 10 },
          ],
          comments: [],
          commentsByPointIndex: new Map(),
        },
      ]

      const result = generateOpenScad(polygons)

      // Last point should not have a comma
      const lines = result.split('\n')
      const lastPointLine = lines.find(line => line.includes('[0, 0]') && line.includes('],'))
      const almostLastPointLine = lines.find(line => line.includes('[10, 10]') && !line.includes(',]'))
      
      expect(lastPointLine).toBeTruthy()
      expect(almostLastPointLine).toBeTruthy()
    })
  })

  describe('EXTCOMMENTPOS integration', () => {
    it('should output position comment in OpenSCAD format', () => {
      const commentsByPointIndex = new Map<number, Array<{ text: string; line: number }>>()
      commentsByPointIndex.set(0, [{ text: '// Position: x=0, y=0', line: 1 }])

      const polygons: LogoPolygon[] = [
        {
          points: [
            { x: 0, y: 0 },
            { x: 10, y: 0 },
          ],
          comments: [],
          commentsByPointIndex,
        },
      ]

      const result = generateOpenScad(polygons)

      expect(result).toContain('// Position: x=0, y=0')
      // Comment should appear before the first point
      const commentIndex = result.indexOf('// Position: x=0, y=0')
      const firstPointIndex = result.indexOf('[0, 0]')
      expect(commentIndex).toBeLessThan(firstPointIndex)
    })

    it('should output custom label position comment', () => {
      const commentsByPointIndex = new Map<number, Array<{ text: string; line: number }>>()
      commentsByPointIndex.set(1, [{ text: '// Screw hole 1: x=7.071068, y=7.071068', line: 2 }])

      const polygons: LogoPolygon[] = [
        {
          points: [
            { x: 0, y: 0 },
            { x: 7.071068, y: 7.071068 },
          ],
          comments: [],
          commentsByPointIndex,
        },
      ]

      const result = generateOpenScad(polygons)

      expect(result).toContain('// Screw hole 1: x=7.071068, y=7.071068')
      // Comment should appear before the second point
      const commentIndex = result.indexOf('// Screw hole 1')
      const secondPointIndex = result.indexOf('[7.071068, 7.071068]')
      expect(commentIndex).toBeLessThan(secondPointIndex)
    })

    it('should output comment-only polygon without geometry', () => {
      const polygons: LogoPolygon[] = [
        {
          points: [{ x: 0, y: 0 }],
          comments: [{ text: '// Test comment', line: 1 }],
          commentsByPointIndex: new Map(),
          commentOnly: true,
        },
      ]

      const result = generateOpenScad(polygons)

      // Should contain the comment
      expect(result).toContain('// Test comment')
      // Should NOT contain polygon geometry
      expect(result).not.toContain('polygon(')
      expect(result).not.toContain('[0, 0]')
    })

    it('should output multiple comment-only polygons correctly', () => {
      const polygons: LogoPolygon[] = [
        {
          points: [{ x: 10, y: 20 }],
          comments: [{ text: '// Comment 1', line: 1 }],
          commentsByPointIndex: new Map(),
          commentOnly: true,
        },
        {
          points: [{ x: 30, y: 40 }],
          comments: [{ text: '// Comment 2', line: 2 }],
          commentsByPointIndex: new Map(),
          commentOnly: true,
        },
      ]

      const result = generateOpenScad(polygons)

      // Should contain both comments
      expect(result).toContain('// Comment 1')
      expect(result).toContain('// Comment 2')
      // Should NOT contain polygon geometry
      expect(result).not.toContain('polygon(')
    })
  })
})
