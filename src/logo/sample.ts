export const defaultLogoScript = `// Square
pendown
forward 50
right 90
forward 50
right 90
forward 50
right 90
forward 50

// Move without drawing
penup
forward 80

/*
Draw a 180 degree arc with a radius of 30mm and setting an FN of 40 segments per 360 degrees of arc
*/
EXTSETFN 40
pendown
arc 180, 30
`
