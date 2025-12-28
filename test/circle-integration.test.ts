import { describe, expect, it } from 'vitest'
import { executeLogo } from '../src/logo/interpreter'
import { parseLogo } from '../src/logo/parser'
import { generateOpenScad } from '../src/logo/openscad'

describe('360-degree arc to circle integration', () => {
  it('should convert 360-degree arc to circle in OpenSCAD', () => {
    const script = 'ARC 360, 50'
    const { commands, comments } = parseLogo(script)
    const { polygons } = executeLogo(commands, comments)
    const openscad = generateOpenScad(polygons)
    
    expect(openscad).toContain('circle(r=50, $fn=40)')
    expect(openscad).toContain('translate([0, 0])')
    expect(openscad).not.toContain('polygon(')
  })

  it('should use custom FN value for circle', () => {
    const script = 'EXTSETFN 6\nARC 360, 25'
    const { commands, comments } = parseLogo(script)
    const { polygons } = executeLogo(commands, comments)
    const openscad = generateOpenScad(polygons)
    
    expect(openscad).toContain('circle(r=25, $fn=6)')
  })

  it('should handle multiple circles', () => {
    const script = 'EXTSETFN 3\nARC 360, 10\nSETXY 20, 20\nEXTSETFN 4\nARC 360, 15'
    const { commands, comments } = parseLogo(script)
    const { polygons } = executeLogo(commands, comments)
    const openscad = generateOpenScad(polygons)
    
    expect(openscad).toContain('circle(r=10, $fn=3)')
    expect(openscad).toContain('translate([0, 0])')
    expect(openscad).toContain('circle(r=15, $fn=4)')
    expect(openscad).toContain('translate([20, 20])')
  })

  it('should not convert non-360 arcs to circle', () => {
    const script = 'ARC 180, 50'
    const { commands, comments } = parseLogo(script)
    const { polygons } = executeLogo(commands, comments)
    const openscad = generateOpenScad(polygons)
    
    expect(openscad).toContain('polygon(')
    expect(openscad).not.toContain('circle(')
  })

  it('should handle circles with comments', () => {
    const script = '// My circle\nARC 360, 30'
    const { commands, comments } = parseLogo(script)
    const { polygons } = executeLogo(commands, comments)
    const openscad = generateOpenScad(polygons)
    
    expect(openscad).toContain('// My circle')
    expect(openscad).toContain('circle(r=30, $fn=40)')
  })

  it('should handle circle at offset position', () => {
    const script = 'SETXY 100, 200\nARC 360, 45'
    const { commands, comments } = parseLogo(script)
    const { polygons } = executeLogo(commands, comments)
    const openscad = generateOpenScad(polygons)
    
    expect(openscad).toContain('translate([100, 200])')
    expect(openscad).toContain('circle(r=45, $fn=40)')
  })

  it('should mix polygons and circles', () => {
    const script = 'FD 50\nRT 90\nFD 50\nPU\nSETXY 100, 0\nPD\nARC 360, 25'
    const { commands, comments } = parseLogo(script)
    const { polygons } = executeLogo(commands, comments)
    const openscad = generateOpenScad(polygons)
    
    // First shape should be a polygon
    expect(openscad).toContain('polygon(')
    // Second shape should be a circle
    expect(openscad).toContain('circle(r=25, $fn=40)')
    expect(openscad).toContain('translate([100, 0])')
  })

  it('should not create duplicate polygons after 360-degree arc', () => {
    const script = 'ARC 360, 25\nFD 50'
    const { commands, comments } = parseLogo(script)
    const { polygons } = executeLogo(commands, comments)
    
    // Should have 2 polygons: one circle, one for the line
    expect(polygons.length).toBe(2)
    expect(polygons[0].circleGeometry).toBeDefined()
    expect(polygons[1].circleGeometry).toBeUndefined()
  })
})
