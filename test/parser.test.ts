import { describe, expect, it } from 'vitest'
import { parseLogo } from '../src/logo/parser'

describe('parser', () => {
  describe('basic commands', () => {
    it('should parse FD command', () => {
      const result = parseLogo('FD 10')
      expect(result.commands).toHaveLength(1)
      expect(result.commands[0].kind).toBe('FD')
      expect(result.diagnostics).toHaveLength(0)
    })

    it('should parse FORWARD alias', () => {
      const result = parseLogo('FORWARD 25')
      expect(result.commands).toHaveLength(1)
      expect(result.commands[0].kind).toBe('FD')
    })

    it('should parse BK command', () => {
      const result = parseLogo('BK 15')
      expect(result.commands).toHaveLength(1)
      expect(result.commands[0].kind).toBe('BK')
    })

    it('should parse LT and RT commands', () => {
      const result = parseLogo('LT 90\nRT 45')
      expect(result.commands).toHaveLength(2)
      expect(result.commands[0].kind).toBe('LT')
      expect(result.commands[1].kind).toBe('RT')
    })

    it('should parse PU and PD commands', () => {
      const result = parseLogo('PU\nPD')
      expect(result.commands).toHaveLength(2)
      expect(result.commands[0].kind).toBe('PU')
      expect(result.commands[1].kind).toBe('PD')
    })

    it('should parse SETH command', () => {
      const result = parseLogo('SETH 45')
      expect(result.commands).toHaveLength(1)
      expect(result.commands[0].kind).toBe('SETH')
    })

    it('should parse HOME command', () => {
      const result = parseLogo('HOME')
      expect(result.commands).toHaveLength(1)
      expect(result.commands[0].kind).toBe('HOME')
    })
  })

  describe('multi-argument commands', () => {
    it('should parse ARC command with two arguments', () => {
      const result = parseLogo('ARC 90, 50')
      expect(result.commands).toHaveLength(1)
      expect(result.commands[0].kind).toBe('ARC')
      expect(result.diagnostics).toHaveLength(0)
    })

    it('should parse SETXY command with two arguments', () => {
      const result = parseLogo('SETXY 10, 20')
      expect(result.commands).toHaveLength(1)
      expect(result.commands[0].kind).toBe('SETXY')
    })

    it('should report error for ARC without comma', () => {
      const result = parseLogo('ARC 90 50')
      expect(result.diagnostics.length).toBeGreaterThan(0)
    })

    it('should parse SETX command', () => {
      const result = parseLogo('SETX 100')
      expect(result.commands).toHaveLength(1)
      expect(result.commands[0].kind).toBe('SETX')
    })

    it('should parse SETY command', () => {
      const result = parseLogo('SETY -50')
      expect(result.commands).toHaveLength(1)
      expect(result.commands[0].kind).toBe('SETY')
    })
  })

  describe('comments', () => {
    it('should extract single-line # comments', () => {
      const result = parseLogo('# This is a comment\nFD 10')
      expect(result.comments).toHaveLength(1)
      expect(result.comments[0].text).toBe('# This is a comment')
      expect(result.commands).toHaveLength(1)
    })

    it('should extract single-line // comments', () => {
      const result = parseLogo('FD 10 // move forward')
      expect(result.comments).toHaveLength(1)
      expect(result.comments[0].text).toBe('// move forward')
    })

    it('should extract multi-line comments', () => {
      const result = parseLogo('/* Multi\nline\ncomment */\nFD 10')
      expect(result.comments).toHaveLength(1)
      expect(result.comments[0].text).toContain('Multi')
      expect(result.commands).toHaveLength(1)
    })

    it('should track line numbers for comments', () => {
      const result = parseLogo('FD 10\n# Comment on line 2\nFD 20')
      expect(result.comments[0].line).toBe(2)
    })

    it('should handle inline comments inside repeat blocks', () => {
      const code = `repeat 3 [
    repeat 4 [
        pd
        arc 360, 3
        pu
        fd 10   // adjust to suit
    ]
    fd 1.5
]`
      const result = parseLogo(code)
      expect(result.diagnostics).toHaveLength(0)
      expect(result.commands).toHaveLength(1)
      expect(result.commands[0].kind).toBe('REPEAT')
      expect(result.comments).toHaveLength(1)
      expect(result.comments[0].text).toBe('// adjust to suit')
    })
  })

  describe('expressions', () => {
    it('should parse arithmetic expressions', () => {
      const result = parseLogo('FD 10 + 5')
      expect(result.commands).toHaveLength(1)
      expect(result.diagnostics).toHaveLength(0)
    })

    it('should parse expressions with multiplication and division', () => {
      const result = parseLogo('FD 10 * 2 / 4')
      expect(result.commands).toHaveLength(1)
    })

    it('should parse expressions with exponentiation', () => {
      const result = parseLogo('FD 2 ^ 3')
      expect(result.commands).toHaveLength(1)
    })

    it('should parse expressions with parentheses', () => {
      const result = parseLogo('FD (10 + 5) * 2')
      expect(result.commands).toHaveLength(1)
    })

    it('should parse negative numbers', () => {
      const result = parseLogo('FD -10')
      expect(result.commands).toHaveLength(1)
    })
  })

  describe('variables', () => {
    it('should parse MAKE command', () => {
      const result = parseLogo('MAKE "size 100')
      expect(result.commands).toHaveLength(1)
      expect(result.commands[0].kind).toBe('MAKE')
      expect(result.commands[0].varName).toBe('size')
    })

    it('should parse variable references in expressions', () => {
      const result = parseLogo('MAKE "x 10\nFD :x')
      expect(result.commands).toHaveLength(2)
      expect(result.commands[1].kind).toBe('FD')
    })

    it('should report error for MAKE without quote', () => {
      const result = parseLogo('MAKE size 100')
      expect(result.diagnostics.length).toBeGreaterThan(0)
    })
  })

  describe('REPEAT command', () => {
    it('should parse simple REPEAT', () => {
      const result = parseLogo('REPEAT 4 [FD 10]')
      expect(result.commands).toHaveLength(1)
      expect(result.commands[0].kind).toBe('REPEAT')
      expect(result.commands[0].instructionList).toContain('FD 10')
    })

    it('should parse REPEAT with multiple commands', () => {
      const result = parseLogo('REPEAT 4 [FD 10; RT 90]')
      expect(result.commands).toHaveLength(1)
      expect(result.commands[0].instructionList).toContain('FD 10')
      expect(result.commands[0].instructionList).toContain('RT 90')
    })

    it('should parse multi-line REPEAT', () => {
      const result = parseLogo('REPEAT 4 [\n  FD 10\n  RT 90\n]')
      expect(result.commands).toHaveLength(1)
      expect(result.commands[0].kind).toBe('REPEAT')
    })
  })

  describe('functions', () => {
    it('should parse SQRT function', () => {
      const result = parseLogo('FD SQRT 16')
      expect(result.commands).toHaveLength(1)
    })

    it('should parse LN function', () => {
      const result = parseLogo('FD LN 10')
      expect(result.commands).toHaveLength(1)
    })

    it('should parse EXP function', () => {
      const result = parseLogo('FD EXP 2')
      expect(result.commands).toHaveLength(1)
    })

    it('should parse LOG10 function', () => {
      const result = parseLogo('FD LOG10 100')
      expect(result.commands).toHaveLength(1)
    })
  })

  describe('multiple commands', () => {
    it('should parse commands separated by newlines', () => {
      const result = parseLogo('FD 10\nLT 90\nFD 20')
      expect(result.commands).toHaveLength(3)
    })

    it('should parse commands separated by semicolons', () => {
      const result = parseLogo('FD 10; LT 90; FD 20')
      expect(result.commands).toHaveLength(3)
    })

    it('should parse mixed separators', () => {
      const result = parseLogo('FD 10; LT 90\nFD 20')
      expect(result.commands).toHaveLength(3)
    })
  })

  describe('error handling', () => {
    it('should report unknown command', () => {
      const result = parseLogo('UNKNOWN 10')
      expect(result.diagnostics.length).toBeGreaterThan(0)
      expect(result.diagnostics[0].message).toContain('Unknown command')
    })

    it('should handle empty input', () => {
      const result = parseLogo('')
      expect(result.commands).toHaveLength(0)
      expect(result.diagnostics).toHaveLength(0)
    })

    it('should handle whitespace-only input', () => {
      const result = parseLogo('   \n\n  ')
      expect(result.commands).toHaveLength(0)
    })
  })

  describe('EXTCOMMENTPOS command', () => {
    it('should parse EXTCOMMENTPOS without parameters', () => {
      const result = parseLogo('EXTCOMMENTPOS')
      expect(result.commands).toHaveLength(1)
      expect(result.commands[0].kind).toBe('EXTCOMMENTPOS')
      expect(result.commands[0].comment).toBeUndefined()
      expect(result.diagnostics).toHaveLength(0)
    })

    it('should parse EXTCOMMENTPOS with comment parameter in brackets', () => {
      const result = parseLogo('EXTCOMMENTPOS [Screw hole 1]')
      expect(result.commands).toHaveLength(1)
      expect(result.commands[0].kind).toBe('EXTCOMMENTPOS')
      expect(result.commands[0].comment).toBe('Screw hole 1')
      expect(result.diagnostics).toHaveLength(0)
    })

    it('should parse EXTCOMMENTPOS with empty brackets', () => {
      const result = parseLogo('EXTCOMMENTPOS []')
      expect(result.commands).toHaveLength(1)
      expect(result.commands[0].kind).toBe('EXTCOMMENTPOS')
      expect(result.commands[0].comment).toBe('')
      expect(result.diagnostics).toHaveLength(0)
    })

    it('should report error for EXTCOMMENTPOS with unclosed bracket', () => {
      const result = parseLogo('EXTCOMMENTPOS [comment')
      expect(result.diagnostics.length).toBeGreaterThan(0)
      expect(result.diagnostics[0].message).toContain('missing closing bracket')
    })

    it('should report error for EXTCOMMENTPOS with parameter not in brackets', () => {
      const result = parseLogo('EXTCOMMENTPOS comment')
      expect(result.diagnostics.length).toBeGreaterThan(0)
      expect(result.diagnostics[0].message).toContain('must be in brackets')
    })

    it('should parse EXTCOMMENTPOS with complex comment text', () => {
      const result = parseLogo('EXTCOMMENTPOS [Position at: corner 1, layer 2]')
      expect(result.commands).toHaveLength(1)
      expect(result.commands[0].kind).toBe('EXTCOMMENTPOS')
      expect(result.commands[0].comment).toBe('Position at: corner 1, layer 2')
      expect(result.diagnostics).toHaveLength(0)
    })

    it('should parse EXTCOMMENTPOS with nested brackets in comment', () => {
      const result = parseLogo('EXTCOMMENTPOS [Position [corner]]')
      expect(result.commands).toHaveLength(1)
      expect(result.commands[0].kind).toBe('EXTCOMMENTPOS')
      expect(result.commands[0].comment).toBe('Position [corner]')
      expect(result.diagnostics).toHaveLength(0)
    })
  })

  describe('EXTMARKER command', () => {
    it('should parse EXTMARKER without parameters', () => {
      const result = parseLogo('EXTMARKER')
      expect(result.commands).toHaveLength(1)
      expect(result.commands[0].kind).toBe('EXTMARKER')
      expect(result.commands[0].comment).toBeUndefined()
      expect(result.commands[0].value).toBeUndefined()
      expect(result.diagnostics).toHaveLength(0)
    })

    it('should parse EXTMARKER with comment only', () => {
      const result = parseLogo('EXTMARKER [Corner point]')
      expect(result.commands).toHaveLength(1)
      expect(result.commands[0].kind).toBe('EXTMARKER')
      expect(result.commands[0].comment).toBe('Corner point')
      expect(result.commands[0].value).toBeUndefined()
      expect(result.diagnostics).toHaveLength(0)
    })

    it('should parse EXTMARKER with comment and coordinates', () => {
      const result = parseLogo('EXTMARKER [Label], 5, -10')
      expect(result.commands).toHaveLength(1)
      expect(result.commands[0].kind).toBe('EXTMARKER')
      expect(result.commands[0].comment).toBe('Label')
      expect(result.commands[0].value).toBeDefined()
      expect(result.commands[0].value2).toBeDefined()
      expect(result.diagnostics).toHaveLength(0)
    })

    it('should parse EXTMARKER with coordinates only (no comment)', () => {
      const result = parseLogo('EXTMARKER 10, 20')
      expect(result.commands).toHaveLength(1)
      expect(result.commands[0].kind).toBe('EXTMARKER')
      expect(result.commands[0].comment).toBeUndefined()
      expect(result.commands[0].value).toBeDefined()
      expect(result.commands[0].value2).toBeDefined()
      expect(result.diagnostics).toHaveLength(0)
    })

    it('should parse EXTMARKER with expression coordinates', () => {
      const result = parseLogo('EXTMARKER [Test], :x + 5, :y * 2')
      expect(result.commands).toHaveLength(1)
      expect(result.commands[0].kind).toBe('EXTMARKER')
      expect(result.commands[0].comment).toBe('Test')
      expect(result.diagnostics).toHaveLength(0)
    })

    it('should report error for EXTMARKER with unclosed bracket', () => {
      const result = parseLogo('EXTMARKER [comment')
      expect(result.diagnostics.length).toBeGreaterThan(0)
      expect(result.diagnostics[0].message).toContain('missing closing bracket')
    })

    it('should report error for EXTMARKER with wrong number of coordinates', () => {
      const result = parseLogo('EXTMARKER 5')
      expect(result.diagnostics.length).toBeGreaterThan(0)
      expect(result.diagnostics[0].message).toContain('exactly 2 values')
    })
  })

  describe('PRINT command', () => {
    it('should parse PRINT with text in brackets', () => {
      const result = parseLogo('PRINT [Hello, World!]')
      expect(result.commands).toHaveLength(1)
      expect(result.commands[0].kind).toBe('PRINT')
      expect(result.commands[0].printArgs).toHaveLength(1)
      expect(result.commands[0].printArgs![0].type).toBe('string')
      expect(result.commands[0].printArgs![0].value).toBe('Hello, World!')
      expect(result.diagnostics).toHaveLength(0)
    })

    it('should parse PRINT with variable', () => {
      const result = parseLogo('PRINT :x')
      expect(result.commands).toHaveLength(1)
      expect(result.commands[0].kind).toBe('PRINT')
      expect(result.commands[0].printArgs).toHaveLength(1)
      expect(result.commands[0].printArgs![0].type).toBe('expression')
      expect(result.diagnostics).toHaveLength(0)
    })

    it('should parse PRINT with expression', () => {
      const result = parseLogo('PRINT 10 + 20')
      expect(result.commands).toHaveLength(1)
      expect(result.commands[0].kind).toBe('PRINT')
      expect(result.commands[0].printArgs).toHaveLength(1)
      expect(result.commands[0].printArgs![0].type).toBe('expression')
      expect(result.diagnostics).toHaveLength(0)
    })

    it('should parse PRINT with multiple arguments', () => {
      const result = parseLogo('PRINT [X:], :x, [doubled:], :x * 2')
      expect(result.commands).toHaveLength(1)
      expect(result.commands[0].kind).toBe('PRINT')
      expect(result.commands[0].printArgs).toHaveLength(4)
      expect(result.commands[0].printArgs![0].type).toBe('string')
      expect(result.commands[0].printArgs![0].value).toBe('X:')
      expect(result.commands[0].printArgs![1].type).toBe('expression')
      expect(result.commands[0].printArgs![2].type).toBe('string')
      expect(result.commands[0].printArgs![2].value).toBe('doubled:')
      expect(result.commands[0].printArgs![3].type).toBe('expression')
      expect(result.diagnostics).toHaveLength(0)
    })

    it('should parse PRINT with empty brackets', () => {
      const result = parseLogo('PRINT []')
      expect(result.commands).toHaveLength(1)
      expect(result.commands[0].kind).toBe('PRINT')
      expect(result.commands[0].printArgs).toHaveLength(1)
      expect(result.commands[0].printArgs![0].type).toBe('string')
      expect(result.commands[0].printArgs![0].value).toBe('')
      expect(result.diagnostics).toHaveLength(0)
    })

    it('should report error for PRINT without arguments', () => {
      const result = parseLogo('PRINT')
      expect(result.diagnostics.length).toBeGreaterThan(0)
      expect(result.diagnostics[0].message).toContain('requires at least one argument')
    })

    it('should report error for PRINT with unclosed bracket', () => {
      const result = parseLogo('PRINT [Hello')
      expect(result.diagnostics.length).toBeGreaterThan(0)
      expect(result.diagnostics[0].message).toContain('missing closing bracket')
    })

    it('should parse PRINT with nested brackets', () => {
      const result = parseLogo('PRINT [Hello [World]]')
      expect(result.commands).toHaveLength(1)
      expect(result.commands[0].kind).toBe('PRINT')
      expect(result.commands[0].printArgs![0].value).toBe('Hello [World]')
      expect(result.diagnostics).toHaveLength(0)
    })

    it('should parse PRINT with mixed string and expression', () => {
      const result = parseLogo('PRINT [Value:], 42')
      expect(result.commands).toHaveLength(1)
      expect(result.commands[0].printArgs).toHaveLength(2)
      expect(result.commands[0].printArgs![0].type).toBe('string')
      expect(result.commands[0].printArgs![1].type).toBe('expression')
      expect(result.diagnostics).toHaveLength(0)
    })
  })
})
