# Add a new command `EXTBEZIERCURVE` that takes a set of instructions and `EXTDEFCONTROLPOINT` commands that define control points and draws a Bezier curve using the points.

https://github.com/becdetat/logo2openscad/issues/52

Example:
```
HOME
EXTBEZIERCURVE [
    EXTDEFCONTROLPOINT
    FD 10
    EXTDEFCONTROLPOINT
    RT 90
    FD 10
    EXTDEFCONTROLPOINT
    RT  90
    FD 10
    EXTDEFCONTROLPOINT
]
```
Would create an third order Bezier curve from [0,0] to [10,0] using the control points set when EXTDEFCONTROLPOINT is called within the EXTBEZIERCURVE's list of instructions.

The "FD 10" commands in the example don't add to existing geometries - it's as if the list is executed with the pen up.

After running the EXBEZIERCURVE the pen should be located at the final position and in the final heading.

The current FN value multiplied by 4 (to get 360 degrees of arc) should be used to determine the number of steps when rendering the curve.

