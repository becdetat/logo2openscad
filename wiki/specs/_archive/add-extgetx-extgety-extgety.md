# Add EXTGETX, EXTGETY, EXTGETH functions

https://github.com/becdetat/logo2openscad/issues/51

Add helper functions that allow setting a variable to the current X, Y, and heading values.

For example:
```
MAKE "pinx EXTGETX
MAKE "piny EXTGETY
MAKE "pinh EXTGETH
```

This would allow using the values in calculations, or being able to return to a stored position and heading.


