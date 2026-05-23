# Add EXTSCALE command

https://github.com/becdetat/logo2openscad/issues/50

Add a `EXTSCALE` command which takes a list of instructions (or a macro) and a scaling factor, and scales each FD or BK command accordingly.

For example:
```
MAKE "square [REPEAT 4, [FD 10; RT 90]]
EXTSCALE 0.8, :square'
```

Equivalent to:
```
FD 8
RT 90
FD 8
RT 90
FD 8
RT 90
FD 8
RT 90
```


