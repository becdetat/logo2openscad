# Configurable comment verbosity

https://github.com/becdetat/logo2openscad/issues/16

Currently comments added to the Logo script are included fairly closely to the corresponding generated OpenSCAD commands.

I want the comment verbosity to be configurable.

Options:
- "No comments" - no comments are included in the output
- "Comments" - user's comments are included in the output
- "Verbose" - user's comments and each line of Logo is included in the output

Verbose mode might look like this. Input:
```
FD 10
RT 90
FD 10
RT 90
FD 10
```

Output:
```
polygon(points=[
  [0, 0],
// FD 10
  [0, 10],
// RT 90
// FD 10
  [-10, 10],
// RT 90
// FD 10
  [-10, 0],
  [0, 0]
]);
```



