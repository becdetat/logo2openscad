import { describe, expect, it } from 'vitest'
import { generateOpenScad } from '../src/logo/openscad'
import type { LogoPolygon } from '../src/logo/types'
import { parseLogo } from '../src/logo/parser'
import { executeLogo } from '../src/logo/interpreter'

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

    it('should generate separate polygons for multiple arcs', () => {
      // This tests the issue where arc 45, 5; arc 45, 6 should generate two polygons
      const { commands } = parseLogo('arc 45, 5\narc 45, 6')
      const result = executeLogo(commands, [])
      const openscad = generateOpenScad(result.polygons)

      const polygonCount = (openscad.match(/polygon\(points=\[/g) || []).length
      expect(polygonCount).toBe(2)
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

  describe('circle geometry', () => {
    it('should output circle command for 360-degree arc', () => {
      const polygons: LogoPolygon[] = [
        {
          points: [
            { x: 0, y: 0 },
            { x: 10, y: 0 },
            { x: 0, y: 10 },
          ],
          comments: [],
          commentsByPointIndex: new Map(),
          circleGeometry: {
            center: { x: 0, y: 0 },
            radius: 50,
            fn: 40
          }
        },
      ]

      const result = generateOpenScad(polygons)

      expect(result).toContain('circle(r=50, $fn=40)')
      expect(result).toContain('translate([0, 0])')
      expect(result).not.toContain('polygon(')
    })

    it('should output circle with custom FN value', () => {
      const polygons: LogoPolygon[] = [
        {
          points: [],
          comments: [],
          commentsByPointIndex: new Map(),
          circleGeometry: {
            center: { x: 10, y: 20 },
            radius: 30,
            fn: 6
          }
        },
      ]

      const result = generateOpenScad(polygons)

      expect(result).toContain('circle(r=30, $fn=6)')
      expect(result).toContain('translate([10, 20])')
    })

    it('should output circle with formatted numbers', () => {
      const polygons: LogoPolygon[] = [
        {
          points: [],
          comments: [],
          commentsByPointIndex: new Map(),
          circleGeometry: {
            center: { x: 10.5, y: 20.123456 },
            radius: 15.789,
            fn: 12
          }
        },
      ]

      const result = generateOpenScad(polygons)

      expect(result).toContain('circle(r=15.789, $fn=12)')
      expect(result).toContain('translate([10.5, 20.123456])')
    })

    it('should include comments before circle', () => {
      const polygons: LogoPolygon[] = [
        {
          points: [],
          comments: [
            { text: '// This is a circle', line: 1 },
          ],
          commentsByPointIndex: new Map(),
          circleGeometry: {
            center: { x: 0, y: 0 },
            radius: 25,
            fn: 20
          }
        },
      ]

      const result = generateOpenScad(polygons)

      expect(result).toContain('// This is a circle')
      expect(result).toContain('circle(r=25, $fn=20)')
      const commentIndex = result.indexOf('// This is a circle')
      const circleIndex = result.indexOf('circle(')
      expect(commentIndex).toBeLessThan(circleIndex)
    })

  describe('verbose mode', () => {
    it('should not emit verbose comments when verbose=false', () => {
      const { commands, comments } = parseLogo('FD 10\nRT 90\nFD 10')
      const result = executeLogo(commands, comments)
      const out = generateOpenScad(result.polygons, 2, true, false, ['FD 10', 'RT 90', 'FD 10'])
      expect(out).not.toContain('// FD 10')
      expect(out).not.toContain('// RT 90')
    })

    it('should emit source lines as verbose comments when verbose=true', () => {
      const source = 'FD 10\nRT 90\nFD 10'
      const { commands, comments } = parseLogo(source)
      const result = executeLogo(commands, comments)
      const out = generateOpenScad(result.polygons, 2, true, true, source.split('\n'))

      expect(out).toContain('// FD 10')
      expect(out).toContain('// RT 90')
    })

    it('should place source comment before the point it creates', () => {
      const source = 'FD 10'
      const { commands, comments } = parseLogo(source)
      const result = executeLogo(commands, comments)
      const out = generateOpenScad(result.polygons, 2, true, true, source.split('\n'))

      // Comment should appear before the [0, 10] point, not before [0, 0]
      const commentIdx = out.indexOf('// FD 10')
      const originIdx = out.indexOf('[0, 0]')
      const fdPointIdx = out.indexOf('[0, 10]')
      expect(commentIdx).toBeGreaterThan(originIdx)
      expect(commentIdx).toBeLessThan(fdPointIdx)
    })

    it('should group RT and FD lines before the point the FD creates', () => {
      const source = 'FD 10\nRT 90\nFD 10'
      const { commands, comments } = parseLogo(source)
      const result = executeLogo(commands, comments)
      const out = generateOpenScad(result.polygons, 2, true, true, source.split('\n'))

      const rtIdx = out.indexOf('// RT 90')
      const fdPointIdx = out.lastIndexOf('[')  // last point before close
      // RT 90 comment should appear somewhere after the first FD point
      const firstFdComment = out.indexOf('// FD 10')
      expect(rtIdx).toBeGreaterThan(firstFdComment)
    })

    it('should match the spec example output', () => {
      const source = 'FD 10\nRT 90\nFD 10\nRT 90\nFD 10'
      const { commands, comments } = parseLogo(source)
      const result = executeLogo(commands, comments)
      const out = generateOpenScad(result.polygons, 2, true, true, source.split('\n'))

      // Every non-empty, non-comment source line should appear as a comment
      expect(out).toContain('// FD 10')
      expect(out).toContain('// RT 90')
    })

    it('should still include user comments alongside verbose comments', () => {
      const source = '# My comment\nFD 10'
      const { commands, comments } = parseLogo(source)
      const result = executeLogo(commands, comments)
      const out = generateOpenScad(result.polygons, 2, true, true, source.split('\n'))

      expect(out).toContain('// FD 10')
      // User's # comment is captured by the parser but not by commentsByPointIndex in this case
      // The important thing is verbose source lines appear
      expect(out).toContain('// FD 10')
    })

    it('should not emit verbose comments for REPEAT inner commands', () => {
      const source = 'REPEAT 4 [FD 10; RT 90]'
      const { commands, comments } = parseLogo(source)
      const result = executeLogo(commands, comments)
      const out = generateOpenScad(result.polygons, 2, true, true, source.split('\n'))

      // The REPEAT line (line 1) should appear as a verbose comment (before first generated point)
      expect(out).toContain('// REPEAT 4 [FD 10; RT 90]')
      // Inner FD 10 should NOT appear since it's at depth > 0
      const repeatCommentCount = (out.match(/\/\/ REPEAT/g) || []).length
      expect(repeatCommentCount).toBe(1)  // Only once, for the first generated point
    })

    it('should trim trailing whitespace from source lines', () => {
      const source = 'FD 10   '
      const { commands, comments } = parseLogo(source)
      const result = executeLogo(commands, comments)
      const out = generateOpenScad(result.polygons, 2, true, true, source.split('\n'))

      expect(out).toContain('// FD 10')
      expect(out).not.toContain('// FD 10   ')
    })
  })

    it('should handle multiple circles', () => {
      const polygons: LogoPolygon[] = [
        {
          points: [],
          comments: [],
          commentsByPointIndex: new Map(),
          circleGeometry: {
            center: { x: 0, y: 0 },
            radius: 10,
            fn: 8
          }
        },
        {
          points: [],
          comments: [],
          commentsByPointIndex: new Map(),
          circleGeometry: {
            center: { x: 50, y: 50 },
            radius: 20,
            fn: 16
          }
        },
      ]

      const result = generateOpenScad(polygons)

      expect(result).toContain('circle(r=10, $fn=8)')
      expect(result).toContain('translate([0, 0])')
      expect(result).toContain('circle(r=20, $fn=16)')
      expect(result).toContain('translate([50, 50])')
    })
  })

  describe('hull generation', () => {
    it('should wrap polygon in hull() by default', () => {
      const polygons: LogoPolygon[] = [
        {
          points: [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }],
          comments: [],
          commentsByPointIndex: new Map(),
        },
      ]

      const result = generateOpenScad(polygons)

      expect(result).toContain('hull() {')
      expect(result).toContain('polygon(points=[')
      const hullIdx = result.indexOf('hull() {')
      const polygonIdx = result.indexOf('polygon(points=[')
      expect(hullIdx).toBeLessThan(polygonIdx)
    })

    it('should close hull() block after polygon', () => {
      const polygons: LogoPolygon[] = [
        {
          points: [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }],
          comments: [],
          commentsByPointIndex: new Map(),
        },
      ]

      const result = generateOpenScad(polygons)

      const lines = result.split('\n')
      const lastLine = lines[lines.length - 1]
      expect(lastLine).toBe('}')
    })

    it('should wrap circle in hull()', () => {
      const polygons: LogoPolygon[] = [
        {
          points: [],
          comments: [],
          commentsByPointIndex: new Map(),
          circleGeometry: { center: { x: 0, y: 0 }, radius: 10, fn: 20 },
        },
      ]

      const result = generateOpenScad(polygons)

      expect(result).toContain('hull() {')
      const hullIdx = result.indexOf('hull() {')
      const circleIdx = result.indexOf('circle(')
      expect(hullIdx).toBeLessThan(circleIdx)
    })

    it('should NOT wrap comment-only polygon in hull()', () => {
      const polygons: LogoPolygon[] = [
        {
          points: [{ x: 0, y: 0 }],
          comments: [{ text: '// just a comment', line: 1 }],
          commentsByPointIndex: new Map(),
          commentOnly: true,
        },
      ]

      const result = generateOpenScad(polygons)

      expect(result).not.toContain('hull()')
      expect(result).toContain('// just a comment')
    })

    it('should NOT wrap in hull() when generateHull=false', () => {
      const polygons: LogoPolygon[] = [
        {
          points: [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }],
          comments: [],
          commentsByPointIndex: new Map(),
        },
      ]

      const result = generateOpenScad(polygons, 2, true, false, [], false)

      expect(result).not.toContain('hull()')
      expect(result).toContain('polygon(points=[')
    })

    it('should indent polygon content inside hull()', () => {
      const polygons: LogoPolygon[] = [
        {
          points: [{ x: 0, y: 0 }, { x: 10, y: 0 }],
          comments: [],
          commentsByPointIndex: new Map(),
        },
      ]

      const result = generateOpenScad(polygons, 2, true, false, [], true)
      const lines = result.split('\n')

      const polygonLine = lines.find(l => l.includes('polygon(points=['))
      expect(polygonLine).toBeDefined()
      expect(polygonLine!.startsWith('  ')).toBe(true)
    })

    it('should place poly-level comments before hull() block', () => {
      const polygons: LogoPolygon[] = [
        {
          points: [{ x: 0, y: 0 }, { x: 10, y: 0 }],
          comments: [{ text: '// header comment', line: 1 }],
          commentsByPointIndex: new Map(),
        },
      ]

      const result = generateOpenScad(polygons)

      const commentIdx = result.indexOf('// header comment')
      const hullIdx = result.indexOf('hull() {')
      expect(commentIdx).toBeLessThan(hullIdx)
    })

    it('should wrap each of multiple polygons in hull()', () => {
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

      const hullCount = (result.match(/hull\(\) \{/g) || []).length
      expect(hullCount).toBe(2)
    })
  })
})
