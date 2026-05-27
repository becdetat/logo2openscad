export type BuiltInSnippet = {
    id: string
    name: string
    description: string
    code: string
}

export const BUILT_IN_SNIPPETS: BuiltInSnippet[] = [
    {
        id: 'square',
        name: 'Square',
        description: 'Draw a square with four equal sides',
        code:
`MAKE "side 80  # size of each side
PD
REPEAT 4 [
  FD :side  # draw one side
  RT 90     # turn 90 degrees
]`,
    },
    {
        id: 'triangle',
        name: 'Equilateral Triangle',
        description: 'Draw an equilateral triangle',
        code:
`MAKE "side 100  # size of each side
PD
REPEAT 3 [
  FD :side   # draw one side
  RT 120     # exterior angle (360 / 3)
]`,
    },
    {
        id: 'hexagon',
        name: 'Hexagon',
        description: 'Draw a regular hexagon',
        code:
`MAKE "side 60  # size of each side
PD
REPEAT 6 [
  FD :side  # draw one side
  RT 60     # exterior angle (360 / 6)
]`,
    },
    {
        id: 'spiral',
        name: 'Spiral',
        description: 'Draw a growing spiral',
        code:
`MAKE "step 5    # starting step length
MAKE "count 36  # number of steps
MAKE "angle 91  # turn angle (slightly over 90 produces spiral)
PD
REPEAT :count [
  FD :step              # draw the current step
  RT :angle             # turn by the spiral angle
  MAKE "step :step + 3  # grow the step each iteration
]`,
    },
    {
        id: 'star',
        name: '5-Pointed Star',
        description: 'Draw a five-pointed star',
        code:
`MAKE "side 90  # length of each point
PD
REPEAT 5 [
  FD :side  # draw one side of the star
  RT 144    # exterior angle for a 5-pointed star
]`,
    },
    {
        id: 'bezier',
        name: 'Bézier S-Curve',
        description: 'Draw a smooth S-curve using Bézier control points',
        code:
`MAKE "size 60  # curve size
EXTSETFN 20    # smoothness (higher = smoother curve)
PD
# S-curve: four Bezier control points pulled in alternating directions
EXTBEZIERCURVE [
  EXTDEFCONTROLPOINT   # anchor: start position
  RT 80                # lean right for first handle
  FD :size             # place first control point
  EXTDEFCONTROLPOINT   # handle: first influence point
  LT 160               # lean left for second handle
  FD :size             # place second control point
  EXTDEFCONTROLPOINT   # handle: second influence point
  RT 80                # return to forward direction
  FD :size             # arrive at end
  EXTDEFCONTROLPOINT   # anchor: end position
]`,
    },
]
