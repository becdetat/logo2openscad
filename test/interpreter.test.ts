import { describe, expect, it } from 'vitest'
import { executeLogo } from '../src/logo/interpreter'
import { parseLogo } from '../src/logo/parser'

describe('interpreter', () => {
  const defaultOptions = { arcPointsPer90Deg: 10 }

  describe('basic movement', () => {
    it('should move forward from origin', () => {
      const { commands } = parseLogo('FD 10')
      const result = executeLogo(commands, defaultOptions, [])
      
      expect(result.segments).toHaveLength(1)
      expect(result.segments[0].from).toEqual({ x: 0, y: 0 })
      expect(result.segments[0].to.y).toBeCloseTo(10)
      expect(result.segments[0].penDown).toBe(true)
    })

    it('should move backward', () => {
      const { commands } = parseLogo('BK 10')
      const result = executeLogo(commands, defaultOptions, [])
      
      expect(result.segments).toHaveLength(1)
      expect(result.segments[0].to.y).toBeCloseTo(-10)
    })

    it('should track pen up/down state', () => {
      const { commands } = parseLogo('PU\nFD 10\nPD\nFD 10')
      const result = executeLogo(commands, defaultOptions, [])
      
      expect(result.segments).toHaveLength(2)
      expect(result.segments[0].penDown).toBe(false)
      expect(result.segments[1].penDown).toBe(true)
    })

    it('should create multiple polygons with PU/PD', () => {
      const { commands } = parseLogo('FD 10\nPU\nFD 10\nPD\nFD 10')
      const result = executeLogo(commands, defaultOptions, [])
      
      expect(result.polygons).toHaveLength(2)
      expect(result.polygons[0].points.length).toBeGreaterThan(1)
      expect(result.polygons[1].points.length).toBeGreaterThan(1)
    })
  })

  describe('turning', () => {
    it('should turn left', () => {
      const { commands } = parseLogo('LT 90\nFD 10')
      const result = executeLogo(commands, defaultOptions, [])
      
      // LT 90 decreases heading to -90° (counterclockwise), pointing left (-X)
      expect(result.segments[0].to.x).toBeCloseTo(-10)
      expect(result.segments[0].to.y).toBeCloseTo(0)
    })

    it('should turn right', () => {
      const { commands } = parseLogo('RT 90\nFD 10')
      const result = executeLogo(commands, defaultOptions, [])
      
      // RT 90 increases heading to 90° (clockwise), pointing right (+X)
      expect(result.segments[0].to.x).toBeCloseTo(10)
      expect(result.segments[0].to.y).toBeCloseTo(0)
    })

    it('should set absolute heading', () => {
      const { commands } = parseLogo('SETH 90\nFD 10')
      const result = executeLogo(commands, defaultOptions, [])
      
      expect(result.segments[0].to.x).toBeCloseTo(10)
      expect(result.segments[0].to.y).toBeCloseTo(0)
    })
  })

  describe('position commands', () => {
    it('should set X coordinate', () => {
      const { commands } = parseLogo('SETX 50')
      const result = executeLogo(commands, defaultOptions, [])
      
      expect(result.segments[0].to.x).toBe(50)
      expect(result.segments[0].to.y).toBe(0)
    })

    it('should set Y coordinate', () => {
      const { commands } = parseLogo('SETY 50')
      const result = executeLogo(commands, defaultOptions, [])
      
      expect(result.segments[0].to.x).toBe(0)
      expect(result.segments[0].to.y).toBe(50)
    })

    it('should set both X and Y coordinates', () => {
      const { commands } = parseLogo('SETXY 30, 40')
      const result = executeLogo(commands, defaultOptions, [])
      
      expect(result.segments[0].to.x).toBe(30)
      expect(result.segments[0].to.y).toBe(40)
    })

    it('should return HOME', () => {
      const { commands } = parseLogo('FD 10\nRT 45\nHOME')
      const result = executeLogo(commands, defaultOptions, [])
      
      const lastSegment = result.segments[result.segments.length - 1]
      expect(lastSegment.to.x).toBeCloseTo(0)
      expect(lastSegment.to.y).toBeCloseTo(0)
    })
  })

  describe('arcs', () => {
    it('should generate arc segments', () => {
      const { commands } = parseLogo('ARC 90, 50')
      const result = executeLogo(commands, { arcPointsPer90Deg: 10 }, [])
      
      expect(result.segments.length).toBeGreaterThan(1)
      // All arc segments should have the same arcGroup ID
      const arcGroupId = result.segments[0].arcGroup
      expect(arcGroupId).toBeDefined()
      result.segments.forEach(seg => {
        expect(seg.arcGroup).toBe(arcGroupId)
      })
    })

    it('should respect arcPointsPer90Deg setting', () => {
      const { commands } = parseLogo('ARC 90, 50')
      const result1 = executeLogo(commands, { arcPointsPer90Deg: 5 }, [])
      const result2 = executeLogo(commands, { arcPointsPer90Deg: 10 }, [])
      
      expect(result2.segments.length).toBeGreaterThan(result1.segments.length)
    })
  })

  describe('expressions', () => {
    it('should evaluate arithmetic expressions', () => {
      const { commands } = parseLogo('FD 10 + 5')
      const result = executeLogo(commands, defaultOptions, [])
      
      expect(result.segments[0].to.y).toBeCloseTo(15)
    })

    it('should handle operator precedence', () => {
      const { commands } = parseLogo('FD 2 + 3 * 4')
      const result = executeLogo(commands, defaultOptions, [])
      
      expect(result.segments[0].to.y).toBeCloseTo(14)
    })

    it('should handle parentheses', () => {
      const { commands } = parseLogo('FD (2 + 3) * 4')
      const result = executeLogo(commands, defaultOptions, [])
      
      expect(result.segments[0].to.y).toBeCloseTo(20)
    })

    it('should handle exponentiation', () => {
      const { commands } = parseLogo('FD 2 ^ 3')
      const result = executeLogo(commands, defaultOptions, [])
      
      expect(result.segments[0].to.y).toBeCloseTo(8)
    })
  })

  describe('variables', () => {
    it('should store and retrieve variables', () => {
      const { commands } = parseLogo('MAKE "size 100\nFD :size')
      const result = executeLogo(commands, defaultOptions, [])
      
      expect(result.segments[0].to.y).toBeCloseTo(100)
    })

    it('should use variables in expressions', () => {
      const { commands } = parseLogo('MAKE "x 10\nFD :x * 2')
      const result = executeLogo(commands, defaultOptions, [])
      
      expect(result.segments[0].to.y).toBeCloseTo(20)
    })

    it('should update variable values', () => {
      const { commands } = parseLogo('MAKE "x 10\nMAKE "x 20\nFD :x')
      const result = executeLogo(commands, defaultOptions, [])
      
      expect(result.segments[0].to.y).toBeCloseTo(20)
    })

    it('should handle variables with expressions', () => {
      const { commands } = parseLogo('MAKE "size 50\nMAKE "double :size * 2\nFD :double')
      const result = executeLogo(commands, defaultOptions, [])
      
      expect(result.segments[0].to.y).toBeCloseTo(100)
    })
  })

  describe('REPEAT command', () => {
    it('should execute commands in loop', () => {
      const { commands } = parseLogo('REPEAT 4 [FD 10; RT 90]')
      const result = executeLogo(commands, defaultOptions, [])
      
      expect(result.segments).toHaveLength(4)
    })

    it('should create a square with REPEAT', () => {
      const { commands } = parseLogo('REPEAT 4 [FD 50; RT 90]')
      const result = executeLogo(commands, defaultOptions, [])
      
      const lastSegment = result.segments[result.segments.length - 1]
      expect(lastSegment.to.x).toBeCloseTo(0)
      expect(lastSegment.to.y).toBeCloseTo(0)
    })

    it('should handle REPEAT with variables', () => {
      const { commands } = parseLogo('MAKE "n 3\nREPEAT :n [FD 10]')
      const result = executeLogo(commands, defaultOptions, [])
      
      expect(result.segments).toHaveLength(3)
    })
  })

  describe('functions', () => {
    it('should evaluate SQRT function', () => {
      const { commands } = parseLogo('FD SQRT 16')
      const result = executeLogo(commands, defaultOptions, [])
      
      expect(result.segments[0].to.y).toBeCloseTo(4)
    })

    it('should evaluate LN function', () => {
      const { commands } = parseLogo('FD LN 2.718281828459045')
      const result = executeLogo(commands, defaultOptions, [])
      
      expect(result.segments[0].to.y).toBeCloseTo(1, 5)
    })

    it('should evaluate EXP function', () => {
      const { commands } = parseLogo('FD EXP 2')
      const result = executeLogo(commands, defaultOptions, [])
      
      expect(result.segments[0].to.y).toBeCloseTo(7.389, 3)
    })

    it('should evaluate LOG10 function', () => {
      const { commands } = parseLogo('FD LOG10 100')
      const result = executeLogo(commands, defaultOptions, [])
      
      expect(result.segments[0].to.y).toBeCloseTo(2)
    })
  })

  describe('complex shapes', () => {
    it('should draw a square', () => {
      const { commands } = parseLogo('REPEAT 4 [FD 100; RT 90]')
      const result = executeLogo(commands, defaultOptions, [])
      
      expect(result.polygons).toHaveLength(1)
      expect(result.polygons[0].points).toHaveLength(5) // 4 corners + closing point
    })

    it('should draw a hexagon', () => {
      const { commands } = parseLogo('REPEAT 6 [FD 50; RT 60]')
      const result = executeLogo(commands, defaultOptions, [])
      
      expect(result.polygons).toHaveLength(1)
      expect(result.polygons[0].points).toHaveLength(7) // 6 corners + closing point
    })

    it('should handle multiple separate shapes', () => {
      const { commands } = parseLogo('REPEAT 4 [FD 50; RT 90]\nPU\nFD 100\nPD\nREPEAT 3 [FD 50; RT 120]')
      const result = executeLogo(commands, defaultOptions, [])
      
      expect(result.polygons).toHaveLength(2)
    })
  })

  describe('comments', () => {
    it('should associate comments with polygons', () => {
      const { commands, comments } = parseLogo('# Draw a line\nFD 10\n# Turn\nRT 90\nFD 5')
      const result = executeLogo(commands, defaultOptions, comments)
      
      expect(result.polygons).toHaveLength(1)
      // With multiple commands and comments, the polygon should have comments
      expect(result.polygons[0].comments.length).toBeGreaterThan(0)
    })

    it('should track comments in commentsByPointIndex', () => {
      const { commands, comments } = parseLogo('FD 10\n// comment\nFD 10')
      const result = executeLogo(commands, defaultOptions, comments)
      
      expect(result.polygons[0].commentsByPointIndex.size).toBeGreaterThan(0)
    })
  })

  describe('EXTCOMMENTPOS command', () => {
    it('should generate position comment at origin', () => {
      const { commands, comments } = parseLogo('EXTCOMMENTPOS')
      const result = executeLogo(commands, defaultOptions, comments)
      
      expect(result.polygons).toHaveLength(1)
      // Comment should be in commentsByPointIndex for the next point (index 0)
      const commentsAtPoint = result.polygons[0].commentsByPointIndex.get(0)
      expect(commentsAtPoint).toBeDefined()
      expect(commentsAtPoint!.length).toBe(1)
      expect(commentsAtPoint![0].text).toBe('// Position: x=0, y=0')
    })

    it('should generate position comment with custom label', () => {
      const { commands, comments } = parseLogo('EXTCOMMENTPOS [Screw hole 1]')
      const result = executeLogo(commands, defaultOptions, comments)
      
      expect(result.polygons).toHaveLength(1)
      const commentsAtPoint = result.polygons[0].commentsByPointIndex.get(0)
      expect(commentsAtPoint).toBeDefined()
      expect(commentsAtPoint![0].text).toBe('// Screw hole 1: x=0, y=0')
    })

    it('should generate position comment after movement', () => {
      const { commands, comments } = parseLogo('SETXY 0, 0\nRT 45\nFD 10\nEXTCOMMENTPOS')
      const result = executeLogo(commands, defaultOptions, comments)
      
      expect(result.polygons).toHaveLength(1)
      // After SETXY and FD, there are 3 points (0, 1, 2). Comment should appear after point 2, which is at index 3
      const commentsAtPoint = result.polygons[0].commentsByPointIndex.get(3)
      expect(commentsAtPoint).toBeDefined()
      expect(commentsAtPoint![0].text).toContain('x=7.071068')
      expect(commentsAtPoint![0].text).toContain('y=7.071068')
    })

    it('should format numbers with 6 decimal places and trim trailing zeros', () => {
      const { commands, comments } = parseLogo('SETXY 7.071067811865476, 7.071067811865476\nEXTCOMMENTPOS')
      const result = executeLogo(commands, defaultOptions, comments)
      
      // SETXY adds point 1, so comment should be at index 2
      const commentsAtPoint = result.polygons[0].commentsByPointIndex.get(2)
      expect(commentsAtPoint).toBeDefined()
      expect(commentsAtPoint![0].text).toContain('x=7.071068')
      expect(commentsAtPoint![0].text).toContain('y=7.071068')
    })

    it('should place comment before next point when pen is down', () => {
      const { commands, comments } = parseLogo('FD 10\nEXTCOMMENTPOS [After first line]\nFD 10')
      const result = executeLogo(commands, defaultOptions, comments)
      
      expect(result.polygons).toHaveLength(1)
      // Comment should appear before the second point (index 2)
      const commentsAtPoint = result.polygons[0].commentsByPointIndex.get(2)
      expect(commentsAtPoint).toBeDefined()
      expect(commentsAtPoint![0].text).toBe('// After first line: x=0, y=10')
    })

    it('should add comment to polygon comments when pen is up', () => {
      const { commands, comments } = parseLogo('PU\nSETXY 10, 20\nEXTCOMMENTPOS [Pen up position]')
      const result = executeLogo(commands, defaultOptions, comments)
      
      // PU finalizes the initial polygon, then EXTCOMMENTPOS creates a new comment-only polygon
      expect(result.polygons).toHaveLength(2)
      // The position comment should be in the second polygon's comments array
      expect(result.polygons[1].comments.length).toBe(1)
      expect(result.polygons[1].comments[0].text).toBe('// Pen up position: x=10, y=20')
    })

    it('should handle multiple EXTCOMMENTPOS commands', () => {
      const { commands, comments } = parseLogo('EXTCOMMENTPOS [Start]\nFD 10\nEXTCOMMENTPOS [Middle]\nFD 10\nEXTCOMMENTPOS [End]')
      const result = executeLogo(commands, defaultOptions, comments)
      
      expect(result.polygons).toHaveLength(1)
      // Should have comments at indices 0, 2, and 3
      // Start at origin (index 0), Middle after first FD (index 2), End after second FD (index 3)
      const comments0 = result.polygons[0].commentsByPointIndex.get(0)
      const comments2 = result.polygons[0].commentsByPointIndex.get(2)
      const comments3 = result.polygons[0].commentsByPointIndex.get(3)
      
      expect(comments0).toBeDefined()
      expect(comments2).toBeDefined()
      expect(comments3).toBeDefined()
      
      expect(comments0![0].text).toContain('Start')
      expect(comments2![0].text).toContain('Middle')
      expect(comments3![0].text).toContain('End')
    })

    it('should work within REPEAT loops', () => {
      const { commands, comments } = parseLogo('REPEAT 2 [FD 10; EXTCOMMENTPOS [Corner]; RT 90]')
      const result = executeLogo(commands, defaultOptions, comments)
      
      expect(result.polygons).toHaveLength(1)
      // Should have position comments from both iterations
      const allComments: string[] = []
      result.polygons[0].commentsByPointIndex.forEach((comments) => {
        comments.forEach((c) => allComments.push(c.text))
      })
      
      const cornerComments = allComments.filter(c => c.includes('Corner'))
      expect(cornerComments.length).toBe(2)
    })

    it('should output comments when pen is up between polygons', () => {
      const { commands, comments } = parseLogo('PD\nFD 10\nPU\nEXTCOMMENTPOS [111]\nPD\nFD 10\nEXTCOMMENTPOS [222]\nPU\nEXTCOMMENTPOS [333]')
      const result = executeLogo(commands, defaultOptions, comments)
      
      // Should have 4 polygons: 
      // 1. First geometry (FD 10)
      // 2. Comment-only polygon for [111]
      // 3. Second geometry (FD 10) with [222]
      // 4. Comment-only polygon for [333]
      expect(result.polygons.length).toBeGreaterThanOrEqual(3)
      
      // Check that all three comments are present somewhere in the polygons
      const allComments: string[] = []
      result.polygons.forEach(poly => {
        poly.comments.forEach(c => allComments.push(c.text))
        poly.commentsByPointIndex.forEach(comments => {
          comments.forEach(c => allComments.push(c.text))
        })
      })
      
      expect(allComments.some(c => c.includes('111'))).toBe(true)
      expect(allComments.some(c => c.includes('222'))).toBe(true)
      expect(allComments.some(c => c.includes('333'))).toBe(true)
    })

    it('should mark pen-up polygons as commentOnly', () => {
      const { commands, comments } = parseLogo('PU\nEXTCOMMENTPOS [Test comment]')
      const result = executeLogo(commands, defaultOptions, comments)
      
      // Should have at least one polygon (possibly more from PU/PD transitions)
      expect(result.polygons.length).toBeGreaterThanOrEqual(1)
      // Find the comment-only polygon
      const commentOnlyPolygon = result.polygons.find(p => p.commentOnly === true)
      expect(commentOnlyPolygon).toBeDefined()
      expect(commentOnlyPolygon!.comments.some(c => c.text.includes('Test comment'))).toBe(true)
    })
  })

  describe('PRINT command', () => {
    it('should output text as a comment', () => {
      const { commands, comments } = parseLogo('PRINT [Hello, World!]')
      const result = executeLogo(commands, defaultOptions, comments)
      
      expect(result.polygons).toHaveLength(1)
      const commentsAtPoint = result.polygons[0].commentsByPointIndex.get(0)
      expect(commentsAtPoint).toBeDefined()
      expect(commentsAtPoint![0].text).toBe('// Hello, World!')
    })

    it('should output variable value', () => {
      const { commands, comments } = parseLogo('MAKE "x 100\nPRINT [X:], :x')
      const result = executeLogo(commands, defaultOptions, comments)
      
      expect(result.polygons).toHaveLength(1)
      const commentsAtPoint = result.polygons[0].commentsByPointIndex.get(0)
      expect(commentsAtPoint).toBeDefined()
      expect(commentsAtPoint![0].text).toBe('// X: 100')
    })

    it('should output expression result', () => {
      const { commands, comments } = parseLogo('PRINT [Result:], 10 + 20')
      const result = executeLogo(commands, defaultOptions, comments)
      
      expect(result.polygons).toHaveLength(1)
      const commentsAtPoint = result.polygons[0].commentsByPointIndex.get(0)
      expect(commentsAtPoint).toBeDefined()
      expect(commentsAtPoint![0].text).toBe('// Result: 30')
    })

    it('should output multiple arguments space-separated', () => {
      const { commands, comments } = parseLogo('MAKE "size 50\nPRINT [Size:], :size, [doubled:], :size * 2')
      const result = executeLogo(commands, defaultOptions, comments)
      
      expect(result.polygons).toHaveLength(1)
      const commentsAtPoint = result.polygons[0].commentsByPointIndex.get(0)
      expect(commentsAtPoint).toBeDefined()
      expect(commentsAtPoint![0].text).toBe('// Size: 50 doubled: 100')
    })

    it('should output empty text', () => {
      const { commands, comments } = parseLogo('PRINT []')
      const result = executeLogo(commands, defaultOptions, comments)
      
      expect(result.polygons).toHaveLength(1)
      const commentsAtPoint = result.polygons[0].commentsByPointIndex.get(0)
      expect(commentsAtPoint).toBeDefined()
      expect(commentsAtPoint![0].text).toBe('// ')
    })

    it('should output text at current position', () => {
      const { commands, comments } = parseLogo('FD 50\nPRINT [At 50]\nFD 50')
      const result = executeLogo(commands, defaultOptions, comments)
      
      expect(result.polygons).toHaveLength(1)
      // After first FD, there are 2 points. PRINT should be at index 2
      const commentsAtPoint = result.polygons[0].commentsByPointIndex.get(2)
      expect(commentsAtPoint).toBeDefined()
      expect(commentsAtPoint![0].text).toBe('// At 50')
    })

    it('should work with pen up', () => {
      const { commands, comments } = parseLogo('PU\nPRINT [Pen is up]')
      const result = executeLogo(commands, defaultOptions, comments)
      
      // With pen up and PRINT, it creates a polygon to hold the comment
      expect(result.polygons.length).toBeGreaterThanOrEqual(1)
      // Find the polygon with the comment
      const hasComment = result.polygons.some(p => 
        p.comments.some(c => c.text === '// Pen is up')
      )
      expect(hasComment).toBe(true)
    })

    it('should output multiple PRINT commands', () => {
      const { commands, comments } = parseLogo('PRINT [First]\nFD 10\nPRINT [Second]')
      const result = executeLogo(commands, defaultOptions, comments)
      
      expect(result.polygons).toHaveLength(1)
      
      // Collect all comments
      const allComments: string[] = []
      result.polygons[0].commentsByPointIndex.forEach((comments) => {
        comments.forEach((c) => allComments.push(c.text))
      })
      
      expect(allComments).toContain('// First')
      expect(allComments).toContain('// Second')
    })

    it('should format numbers correctly', () => {
      const { commands, comments } = parseLogo('PRINT [Pi:], 3.141592653589793')
      const result = executeLogo(commands, defaultOptions, comments)
      
      expect(result.polygons).toHaveLength(1)
      const commentsAtPoint = result.polygons[0].commentsByPointIndex.get(0)
      expect(commentsAtPoint).toBeDefined()
      // Should be limited to 6 decimal places
      expect(commentsAtPoint![0].text).toBe('// Pi: 3.141593')
    })

    it('should handle variable in expression', () => {
      const { commands, comments } = parseLogo('MAKE "x 10\nPRINT [x^2 =], :x ^ 2')
      const result = executeLogo(commands, defaultOptions, comments)
      
      expect(result.polygons).toHaveLength(1)
      const commentsAtPoint = result.polygons[0].commentsByPointIndex.get(0)
      expect(commentsAtPoint).toBeDefined()
      expect(commentsAtPoint![0].text).toBe('// x^2 = 100')
    })
  })
})
