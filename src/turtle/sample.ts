export const defaultTurtleScript = `// Square
pendown;
forward 50;
right 90;
forward 50;
right 90;
forward 50;
right 90;
forward 50;

// Move without drawing
penup;
forward 80;

/*
Draw a 180 degree arc
with a radius of 30mm
*/
pendown;
arc 180, 30;
`
