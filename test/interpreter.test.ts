import { describe, expect, it } from 'vitest'
import { executeLogo } from '../src/logo/interpreter'
import { parseLogo } from '../src/logo/parser'

describe('interpreter', () => {

  describe('basic movement', () => {
    it('should move forward from origin', () => {
      const { commands } = parseLogo('FD 10')
      const result = executeLogo(commands, [])
      
      expect(result.segments).toHaveLength(1)
      expect(result.segments[0].from).toEqual({ x: 0, y: 0 })
      expect(result.segments[0].to.y).toBeCloseTo(10)
      expect(result.segments[0].penDown).toBe(true)
    })

    it('should move backward', () => {
      const { commands } = parseLogo('BK 10')
      const result = executeLogo(commands, [])
      
      expect(result.segments).toHaveLength(1)
      expect(result.segments[0].to.y).toBeCloseTo(-10)
    })

    it('should track pen up/down state', () => {
      const { commands } = parseLogo('PU\nFD 10\nPD\nFD 10')
      const result = executeLogo(commands, [])
      
      expect(result.segments).toHaveLength(2)
      expect(result.segments[0].penDown).toBe(false)
      expect(result.segments[1].penDown).toBe(true)
    })

    it('should create multiple polygons with PU/PD', () => {
      const { commands } = parseLogo('FD 10\nPU\nFD 10\nPD\nFD 10')
      const result = executeLogo(commands, [])
      
      expect(result.polygons).toHaveLength(2)
      expect(result.polygons[0].points.length).toBeGreaterThan(1)
      expect(result.polygons[1].points.length).toBeGreaterThan(1)
    })
  })

  describe('turning', () => {
    it('should turn left', () => {
      const { commands } = parseLogo('LT 90\nFD 10')
      const result = executeLogo(commands, [])
      
      // LT 90 decreases heading to -90° (counterclockwise), pointing left (-X)
      expect(result.segments[0].to.x).toBeCloseTo(-10)
      expect(result.segments[0].to.y).toBeCloseTo(0)
    })

    it('should turn right', () => {
      const { commands } = parseLogo('RT 90\nFD 10')
      const result = executeLogo(commands, [])
      
      // RT 90 increases heading to 90° (clockwise), pointing right (+X)
      expect(result.segments[0].to.x).toBeCloseTo(10)
      expect(result.segments[0].to.y).toBeCloseTo(0)
    })

    it('should set absolute heading', () => {
      const { commands } = parseLogo('SETH 90\nFD 10')
      const result = executeLogo(commands, [])
      
      expect(result.segments[0].to.x).toBeCloseTo(10)
      expect(result.segments[0].to.y).toBeCloseTo(0)
    })
  })

  describe('position commands', () => {
    it('should set X coordinate', () => {
      const { commands } = parseLogo('SETX 50')
      const result = executeLogo(commands, [])
      
      expect(result.segments[0].to.x).toBe(50)
      expect(result.segments[0].to.y).toBe(0)
    })

    it('should set Y coordinate', () => {
      const { commands } = parseLogo('SETY 50')
      const result = executeLogo(commands, [])
      
      expect(result.segments[0].to.x).toBe(0)
      expect(result.segments[0].to.y).toBe(50)
    })

    it('should set both X and Y coordinates', () => {
      const { commands } = parseLogo('SETXY 30, 40')
      const result = executeLogo(commands, [])
      
      expect(result.segments[0].to.x).toBe(30)
      expect(result.segments[0].to.y).toBe(40)
    })

    it('should return HOME', () => {
      const { commands } = parseLogo('FD 10\nRT 45\nHOME')
      const result = executeLogo(commands, [])
      
      const lastSegment = result.segments[result.segments.length - 1]
      expect(lastSegment.to.x).toBeCloseTo(0)
      expect(lastSegment.to.y).toBeCloseTo(0)
    })
  })

  describe('arcs', () => {
    it('should generate arc segments', () => {
      const { commands } = parseLogo('ARC 90, 50')
      const result = executeLogo(commands, [])
      
      expect(result.segments.length).toBeGreaterThan(1)
      // All arc segments should have the same arcGroup ID
      const arcGroupId = result.segments[0].arcGroup
      expect(arcGroupId).toBeDefined()
      result.segments.forEach(seg => {
        expect(seg.arcGroup).toBe(arcGroupId)
      })
    })

    it('should use EXTSETFN to control arc resolution', () => {
      // Default FN=40: 90° arc should have 10 segments (40/4 = 10 per 90°)
      const { commands: cmd1 } = parseLogo('ARC 90, 50')
      const result1 = executeLogo(cmd1, [])
      expect(result1.segments.length).toBe(10)

      // FN=20: 90° arc should have 5 segments (20/4 = 5 per 90°)
      const { commands: cmd2 } = parseLogo('EXTSETFN 20\nARC 90, 50')
      const result2 = executeLogo(cmd2, [])
      expect(result2.segments.length).toBe(5)

      // FN=80: 90° arc should have 20 segments (80/4 = 20 per 90°)
      const { commands: cmd3 } = parseLogo('EXTSETFN 80\nARC 90, 50')
      const result3 = executeLogo(cmd3, [])
      expect(result3.segments.length).toBe(20)
    })

    it('should allow different FN values for different arcs', () => {
      const { commands } = parseLogo('EXTSETFN 5\nARC 360, 50\nEXTSETFN 8\nARC 360, 30')
      const result = executeLogo(commands, [])
      
      // First arc (FN=5): pentagon (5 segments)
      // Second arc (FN=8): octagon (8 segments)
      expect(result.segments.length).toBe(13) // 5 + 8
    })

    it('should floor decimal FN values', () => {
      const { commands } = parseLogo('EXTSETFN 12.9\nARC 360, 50')
      const result = executeLogo(commands, [])
      expect(result.segments.length).toBe(12) // Floored to 12
    })

    it('should error on FN < 1', () => {
      const { commands } = parseLogo('EXTSETFN 0\nARC 360, 50')
      expect(() => executeLogo(commands, [])).toThrow(/at least 1/)
      
      const { commands: cmd2 } = parseLogo('EXTSETFN -5\nARC 360, 50')
      expect(() => executeLogo(cmd2, [])).toThrow(/at least 1/)
    })

    it('should create low-resolution polygons with low FN', () => {
      // Triangle (FN=3)
      const { commands: cmd1 } = parseLogo('EXTSETFN 3\nARC 360, 50')
      const result1 = executeLogo(cmd1, [])
      expect(result1.segments.length).toBe(3)

      // Square (FN=4)
      const { commands: cmd2 } = parseLogo('EXTSETFN 4\nARC 360, 50')
      const result2 = executeLogo(cmd2, [])
      expect(result2.segments.length).toBe(4)

      // Pentagon (FN=5)
      const { commands: cmd3 } = parseLogo('EXTSETFN 5\nARC 360, 50')
      const result3 = executeLogo(cmd3, [])
      expect(result3.segments.length).toBe(5)
    })

    it('should mark 360-degree arcs for circle generation', () => {
      const { commands } = parseLogo('ARC 360, 50')
      const result = executeLogo(commands, [])
      
      // Should still generate segments for preview
      expect(result.segments.length).toBeGreaterThan(0)
      
      // Should create a polygon with circle geometry
      expect(result.polygons.length).toBe(1)
      expect(result.polygons[0].circleGeometry).toBeDefined()
      expect(result.polygons[0].circleGeometry?.center).toEqual({ x: 0, y: 0 })
      expect(result.polygons[0].circleGeometry?.radius).toBe(50)
      expect(result.polygons[0].circleGeometry?.fn).toBe(40) // default FN
    })

    it('should respect custom FN for 360-degree arcs', () => {
      const { commands } = parseLogo('EXTSETFN 8\nARC 360, 30')
      const result = executeLogo(commands, [])
      
      expect(result.polygons.length).toBe(1)
      expect(result.polygons[0].circleGeometry).toBeDefined()
      expect(result.polygons[0].circleGeometry?.fn).toBe(8)
    })

    it('should not mark non-360 arcs for circle generation', () => {
      const { commands } = parseLogo('ARC 180, 50')
      const result = executeLogo(commands, [])
      
      expect(result.polygons.length).toBe(1)
      expect(result.polygons[0].circleGeometry).toBeUndefined()
    })

    it('should generate separate polygons for multiple arcs', () => {
      const { commands } = parseLogo('arc 45, 5\narc 45, 6')
      const result = executeLogo(commands, [])
      
      // Each arc should generate its own polygon
      expect(result.polygons.length).toBe(2)
      
      // First arc
      expect(result.polygons[0].points.length).toBeGreaterThan(1)
      
      // Second arc
      expect(result.polygons[1].points.length).toBeGreaterThan(1)
    })

    it('should allow mixing arcs with other drawing commands', () => {
      // Arc, then pen up, then another arc
      const { commands } = parseLogo('arc 45, 5\nPU\nFD 10\nPD\narc 45, 6')
      const result = executeLogo(commands, [])
      
      // Should have 3 polygons: first arc, (PU creates a break), second arc
      expect(result.polygons.length).toBe(2)
    })
  })

  describe('expressions', () => {
    it('should evaluate arithmetic expressions', () => {
      const { commands } = parseLogo('FD 10 + 5')
      const result = executeLogo(commands, [])
      
      expect(result.segments[0].to.y).toBeCloseTo(15)
    })

    it('should handle operator precedence', () => {
      const { commands } = parseLogo('FD 2 + 3 * 4')
      const result = executeLogo(commands, [])
      
      expect(result.segments[0].to.y).toBeCloseTo(14)
    })

    it('should handle parentheses', () => {
      const { commands } = parseLogo('FD (2 + 3) * 4')
      const result = executeLogo(commands, [])
      
      expect(result.segments[0].to.y).toBeCloseTo(20)
    })

    it('should handle exponentiation', () => {
      const { commands } = parseLogo('FD 2 ^ 3')
      const result = executeLogo(commands, [])
      
      expect(result.segments[0].to.y).toBeCloseTo(8)
    })
  })

  describe('variables', () => {
    it('should store and retrieve variables', () => {
      const { commands } = parseLogo('MAKE "size 100\nFD :size')
      const result = executeLogo(commands, [])
      
      expect(result.segments[0].to.y).toBeCloseTo(100)
    })

    it('should use variables in expressions', () => {
      const { commands } = parseLogo('MAKE "x 10\nFD :x * 2')
      const result = executeLogo(commands, [])
      
      expect(result.segments[0].to.y).toBeCloseTo(20)
    })

    it('should update variable values', () => {
      const { commands } = parseLogo('MAKE "x 10\nMAKE "x 20\nFD :x')
      const result = executeLogo(commands, [])
      
      expect(result.segments[0].to.y).toBeCloseTo(20)
    })

    it('should handle variables with expressions', () => {
      const { commands } = parseLogo('MAKE "size 50\nMAKE "double :size * 2\nFD :double')
      const result = executeLogo(commands, [])
      
      expect(result.segments[0].to.y).toBeCloseTo(100)
    })
    it('should store instruction list in variable', () => {
      const { commands } = parseLogo('MAKE "instructions [FD 10]\nREPEAT 2 :instructions')
      const result = executeLogo(commands, [])
      
      expect(result.segments.length).toBe(2)
      expect(result.segments[0].to.y).toBeCloseTo(10)
      expect(result.segments[1].to.y).toBeCloseTo(20)
    })

    it('should execute instruction list variable directly', () => {
      const { commands } = parseLogo('MAKE "square [REPEAT 4 [FD 10; RT 90]]\n:square')
      const result = executeLogo(commands, [])
      
      expect(result.segments.length).toBe(4)
      expect(result.segments[0].to.y).toBeCloseTo(10)
      expect(result.segments[3].to.x).toBeCloseTo(0)
    })

    it('should allow calling instruction list multiple times', () => {
      const { commands } = parseLogo('MAKE "move [FD 10]\n:move\nFD 5\n:move')
      const result = executeLogo(commands, [])
      
      expect(result.segments.length).toBe(3)
      expect(result.segments[0].to.y).toBeCloseTo(10)
      expect(result.segments[1].to.y).toBeCloseTo(15)
      expect(result.segments[2].to.y).toBeCloseTo(25)
    })

    it('should error when using instruction list in numeric expression', () => {
      const { commands } = parseLogo('MAKE "list [FD 10]\nFD :list')
      expect(() => executeLogo(commands, [])).toThrow(/not.*numeric expression/)
    })

    it('should error when using numeric variable as instruction list', () => {
      const { commands } = parseLogo('MAKE "num 10\nREPEAT 2 :num')
      expect(() => executeLogo(commands, [])).toThrow(/not an instruction list/)
    })

    it('should error when calling undefined variable', () => {
      const { commands } = parseLogo(':undefined')
      expect(() => executeLogo(commands, [])).toThrow(/Undefined variable/)
    })  })

  describe('REPEAT command', () => {
    it('should execute commands in loop', () => {
      const { commands } = parseLogo('REPEAT 4 [FD 10; RT 90]')
      const result = executeLogo(commands, [])
      
      expect(result.segments).toHaveLength(4)
    })

    it('should create a square with REPEAT', () => {
      const { commands } = parseLogo('REPEAT 4 [FD 50; RT 90]')
      const result = executeLogo(commands, [])
      
      const lastSegment = result.segments[result.segments.length - 1]
      expect(lastSegment.to.x).toBeCloseTo(0)
      expect(lastSegment.to.y).toBeCloseTo(0)
    })

    it('should handle REPEAT with variables', () => {
      const { commands } = parseLogo('MAKE "n 3\nREPEAT :n [FD 10]')
      const result = executeLogo(commands, [])
      
      expect(result.segments).toHaveLength(3)
    })
  })

  describe('functions', () => {
    it('should evaluate SQRT function', () => {
      const { commands } = parseLogo('FD SQRT 16')
      const result = executeLogo(commands, [])
      
      expect(result.segments[0].to.y).toBeCloseTo(4)
    })

    it('should evaluate LN function', () => {
      const { commands } = parseLogo('FD LN 2.718281828459045')
      const result = executeLogo(commands, [])
      
      expect(result.segments[0].to.y).toBeCloseTo(1, 5)
    })

    it('should evaluate EXP function', () => {
      const { commands } = parseLogo('FD EXP 2')
      const result = executeLogo(commands, [])
      
      expect(result.segments[0].to.y).toBeCloseTo(7.389, 3)
    })

    it('should evaluate LOG10 function', () => {
      const { commands } = parseLogo('FD LOG10 100')
      const result = executeLogo(commands, [])
      
      expect(result.segments[0].to.y).toBeCloseTo(2)
    })
  })

  describe('complex shapes', () => {
    it('should draw a square', () => {
      const { commands } = parseLogo('REPEAT 4 [FD 100; RT 90]')
      const result = executeLogo(commands, [])
      
      expect(result.polygons).toHaveLength(1)
      expect(result.polygons[0].points).toHaveLength(5) // 4 corners + closing point
    })

    it('should draw a hexagon', () => {
      const { commands } = parseLogo('REPEAT 6 [FD 50; RT 60]')
      const result = executeLogo(commands, [])
      
      expect(result.polygons).toHaveLength(1)
      expect(result.polygons[0].points).toHaveLength(7) // 6 corners + closing point
    })

    it('should handle multiple separate shapes', () => {
      const { commands } = parseLogo('REPEAT 4 [FD 50; RT 90]\nPU\nFD 100\nPD\nREPEAT 3 [FD 50; RT 120]')
      const result = executeLogo(commands, [])
      
      expect(result.polygons).toHaveLength(2)
    })
  })

  describe('comments', () => {
    it('should associate comments with polygons', () => {
      const { commands, comments } = parseLogo('# Draw a line\nFD 10\n# Turn\nRT 90\nFD 5')
      const result = executeLogo(commands, comments)
      
      expect(result.polygons).toHaveLength(1)
      // With multiple commands and comments, the polygon should have comments
      expect(result.polygons[0].comments.length).toBeGreaterThan(0)
    })

    it('should track comments in commentsByPointIndex', () => {
      const { commands, comments } = parseLogo('FD 10\n// comment\nFD 10')
      const result = executeLogo(commands, comments)
      
      expect(result.polygons[0].commentsByPointIndex.size).toBeGreaterThan(0)
    })
  })

  describe('EXTCOMMENTPOS command', () => {
    it('should generate position comment at origin', () => {
      const { commands, comments } = parseLogo('EXTCOMMENTPOS')
      const result = executeLogo(commands, comments)
      
      expect(result.polygons).toHaveLength(1)
      // Comment should be in commentsByPointIndex for the next point (index 0)
      const commentsAtPoint = result.polygons[0].commentsByPointIndex.get(0)
      expect(commentsAtPoint).toBeDefined()
      expect(commentsAtPoint!.length).toBe(1)
      expect(commentsAtPoint![0].text).toBe('// Position: x=0, y=0')
    })

    it('should generate position comment with custom label', () => {
      const { commands, comments } = parseLogo('EXTCOMMENTPOS [Screw hole 1]')
      const result = executeLogo(commands, comments)
      
      expect(result.polygons).toHaveLength(1)
      const commentsAtPoint = result.polygons[0].commentsByPointIndex.get(0)
      expect(commentsAtPoint).toBeDefined()
      expect(commentsAtPoint![0].text).toBe('// Screw hole 1: x=0, y=0')
    })

    it('should generate position comment after movement', () => {
      const { commands, comments } = parseLogo('SETXY 0, 0\nRT 45\nFD 10\nEXTCOMMENTPOS')
      const result = executeLogo(commands, comments)
      
      expect(result.polygons).toHaveLength(1)
      // After SETXY and FD, there are 3 points (0, 1, 2). Comment should appear after point 2, which is at index 3
      const commentsAtPoint = result.polygons[0].commentsByPointIndex.get(3)
      expect(commentsAtPoint).toBeDefined()
      expect(commentsAtPoint![0].text).toContain('x=7.071068')
      expect(commentsAtPoint![0].text).toContain('y=7.071068')
    })

    it('should format numbers with 6 decimal places and trim trailing zeros', () => {
      const { commands, comments } = parseLogo('SETXY 7.071067811865476, 7.071067811865476\nEXTCOMMENTPOS')
      const result = executeLogo(commands, comments)
      
      // SETXY adds point 1, so comment should be at index 2
      const commentsAtPoint = result.polygons[0].commentsByPointIndex.get(2)
      expect(commentsAtPoint).toBeDefined()
      expect(commentsAtPoint![0].text).toContain('x=7.071068')
      expect(commentsAtPoint![0].text).toContain('y=7.071068')
    })

    it('should place comment before next point when pen is down', () => {
      const { commands, comments } = parseLogo('FD 10\nEXTCOMMENTPOS [After first line]\nFD 10')
      const result = executeLogo(commands, comments)
      
      expect(result.polygons).toHaveLength(1)
      // Comment should appear before the second point (index 2)
      const commentsAtPoint = result.polygons[0].commentsByPointIndex.get(2)
      expect(commentsAtPoint).toBeDefined()
      expect(commentsAtPoint![0].text).toBe('// After first line: x=0, y=10')
    })

    it('should add comment to polygon comments when pen is up', () => {
      const { commands, comments } = parseLogo('PU\nSETXY 10, 20\nEXTCOMMENTPOS [Pen up position]')
      const result = executeLogo(commands, comments)
      
      // PU finalizes the initial polygon, then EXTCOMMENTPOS creates a new comment-only polygon
      expect(result.polygons).toHaveLength(2)
      // The position comment should be in the second polygon's comments array
      expect(result.polygons[1].comments.length).toBe(1)
      expect(result.polygons[1].comments[0].text).toBe('// Pen up position: x=10, y=20')
    })

    it('should handle multiple EXTCOMMENTPOS commands', () => {
      const { commands, comments } = parseLogo('EXTCOMMENTPOS [Start]\nFD 10\nEXTCOMMENTPOS [Middle]\nFD 10\nEXTCOMMENTPOS [End]')
      const result = executeLogo(commands, comments)
      
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
      const result = executeLogo(commands, comments)
      
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
      const result = executeLogo(commands, comments)
      
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
      const result = executeLogo(commands, comments)
      
      // Should have at least one polygon (possibly more from PU/PD transitions)
      expect(result.polygons.length).toBeGreaterThanOrEqual(1)
      // Find the comment-only polygon
      const commentOnlyPolygon = result.polygons.find(p => p.commentOnly === true)
      expect(commentOnlyPolygon).toBeDefined()
      expect(commentOnlyPolygon!.comments.some(c => c.text.includes('Test comment'))).toBe(true)
    })
  })

  describe('EXTMARKER command', () => {
    it('should add marker at current position', () => {
      const { commands, comments } = parseLogo('FD 10\nEXTMARKER')
      const result = executeLogo(commands, comments)
      
      expect(result.markers).toHaveLength(1)
      expect(result.markers[0].x).toBeCloseTo(0, 5)
      expect(result.markers[0].y).toBeCloseTo(10, 5)
      expect(result.markers[0].comment).toBeUndefined()
    })

    it('should add marker with comment', () => {
      const { commands, comments } = parseLogo('SETXY 5, 10\nEXTMARKER [Test marker]')
      const result = executeLogo(commands, comments)
      
      expect(result.markers).toHaveLength(1)
      expect(result.markers[0].x).toBeCloseTo(5, 5)
      expect(result.markers[0].y).toBeCloseTo(10, 5)
      expect(result.markers[0].comment).toBe('Test marker')
    })

    it('should add marker at specified coordinates', () => {
      const { commands, comments } = parseLogo('FD 100\nEXTMARKER [Origin], 0, 0')
      const result = executeLogo(commands, comments)
      
      expect(result.markers).toHaveLength(1)
      expect(result.markers[0].x).toBeCloseTo(0, 5)
      expect(result.markers[0].y).toBeCloseTo(0, 5)
      expect(result.markers[0].comment).toBe('Origin')
      // Turtle should still be at (0, 100)
      expect(result.segments[result.segments.length - 1].to.y).toBeCloseTo(100, 5)
    })

    it('should add marker with expression coordinates', () => {
      const { commands, comments } = parseLogo('MAKE "x 10\nMAKE "y 20\nEXTMARKER [Test], :x, :y + 5')
      const result = executeLogo(commands, comments)
      
      expect(result.markers).toHaveLength(1)
      expect(result.markers[0].x).toBeCloseTo(10, 5)
      expect(result.markers[0].y).toBeCloseTo(25, 5)
      expect(result.markers[0].comment).toBe('Test')
    })

    it('should add marker without moving turtle', () => {
      const { commands, comments } = parseLogo('FD 10\nEXTMARKER [Away], 50, 50\nFD 10')
      const result = executeLogo(commands, comments)
      
      expect(result.markers).toHaveLength(1)
      expect(result.markers[0].x).toBeCloseTo(50, 5)
      expect(result.markers[0].y).toBeCloseTo(50, 5)
      // Turtle movement should be unaffected
      expect(result.segments[result.segments.length - 1].to.y).toBeCloseTo(20, 5)
    })

    it('should generate comment like EXTCOMMENTPOS', () => {
      const { commands, comments} = parseLogo('FD 10\nEXTMARKER [Test]\nFD 10')
      const result = executeLogo(commands, comments)
      
      expect(result.polygons).toHaveLength(1)
      // After FD 10, polygon has: origin (index 0), end point (index 1)
      // EXTMARKER should add comment at index 2 (before next point, like EXTCOMMENTPOS)
      const commentsAtPoint = result.polygons[0].commentsByPointIndex.get(2)
      expect(commentsAtPoint).toBeDefined()
      expect(commentsAtPoint!.some(c => c.text.includes('Test') && c.text.includes('x=0') && c.text.includes('y=10'))).toBe(true)
    })

    it('should handle multiple markers', () => {
      const { commands, comments } = parseLogo('EXTMARKER [A], 0, 0\nFD 10\nEXTMARKER [B]\nEXTMARKER [C], 20, 20')
      const result = executeLogo(commands, comments)
      
      expect(result.markers).toHaveLength(3)
      expect(result.markers[0].comment).toBe('A')
      expect(result.markers[1].comment).toBe('B')
      expect(result.markers[2].comment).toBe('C')
    })
  })

  describe('PRINT command', () => {
    it('should output text as a comment', () => {
      const { commands, comments } = parseLogo('PRINT [Hello, World!]')
      const result = executeLogo(commands, comments)
      
      expect(result.polygons).toHaveLength(1)
      const commentsAtPoint = result.polygons[0].commentsByPointIndex.get(0)
      expect(commentsAtPoint).toBeDefined()
      expect(commentsAtPoint![0].text).toBe('// Hello, World!')
    })

    it('should output variable value', () => {
      const { commands, comments } = parseLogo('MAKE "x 100\nPRINT [X:], :x')
      const result = executeLogo(commands, comments)
      
      expect(result.polygons).toHaveLength(1)
      const commentsAtPoint = result.polygons[0].commentsByPointIndex.get(0)
      expect(commentsAtPoint).toBeDefined()
      expect(commentsAtPoint![0].text).toBe('// X: 100')
    })

    it('should output expression result', () => {
      const { commands, comments } = parseLogo('PRINT [Result:], 10 + 20')
      const result = executeLogo(commands, comments)
      
      expect(result.polygons).toHaveLength(1)
      const commentsAtPoint = result.polygons[0].commentsByPointIndex.get(0)
      expect(commentsAtPoint).toBeDefined()
      expect(commentsAtPoint![0].text).toBe('// Result: 30')
    })

    it('should output multiple arguments space-separated', () => {
      const { commands, comments } = parseLogo('MAKE "size 50\nPRINT [Size:], :size, [doubled:], :size * 2')
      const result = executeLogo(commands, comments)
      
      expect(result.polygons).toHaveLength(1)
      const commentsAtPoint = result.polygons[0].commentsByPointIndex.get(0)
      expect(commentsAtPoint).toBeDefined()
      expect(commentsAtPoint![0].text).toBe('// Size: 50 doubled: 100')
    })

    it('should output empty text', () => {
      const { commands, comments } = parseLogo('PRINT []')
      const result = executeLogo(commands, comments)
      
      expect(result.polygons).toHaveLength(1)
      const commentsAtPoint = result.polygons[0].commentsByPointIndex.get(0)
      expect(commentsAtPoint).toBeDefined()
      expect(commentsAtPoint![0].text).toBe('// ')
    })

    it('should output text at current position', () => {
      const { commands, comments } = parseLogo('FD 50\nPRINT [At 50]\nFD 50')
      const result = executeLogo(commands, comments)
      
      expect(result.polygons).toHaveLength(1)
      // After first FD, there are 2 points. PRINT should be at index 2
      const commentsAtPoint = result.polygons[0].commentsByPointIndex.get(2)
      expect(commentsAtPoint).toBeDefined()
      expect(commentsAtPoint![0].text).toBe('// At 50')
    })

    it('should work with pen up', () => {
      const { commands, comments } = parseLogo('PU\nPRINT [Pen is up]')
      const result = executeLogo(commands, comments)
      
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
      const result = executeLogo(commands, comments)
      
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
      const result = executeLogo(commands, comments)
      
      expect(result.polygons).toHaveLength(1)
      const commentsAtPoint = result.polygons[0].commentsByPointIndex.get(0)
      expect(commentsAtPoint).toBeDefined()
      // Should be limited to 6 decimal places
      expect(commentsAtPoint![0].text).toBe('// Pi: 3.141593')
    })

    it('should handle variable in expression', () => {
      const { commands, comments } = parseLogo('MAKE "x 10\nPRINT [x^2 =], :x ^ 2')
      const result = executeLogo(commands, comments)
      
      expect(result.polygons).toHaveLength(1)
      const commentsAtPoint = result.polygons[0].commentsByPointIndex.get(0)
      expect(commentsAtPoint).toBeDefined()
      expect(commentsAtPoint![0].text).toBe('// x^2 = 100')
    })
  })
})

