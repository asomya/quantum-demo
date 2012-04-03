// Constructor for Shape objects to hold data for all drawn objects.
// For now they will just be defined as rectangles.
function Shape(x, y, w, h, fill, type, text) {
  // This is a very simple and unsafe constructor. All we're doing is checking if the values exist.
  // "x || 0" just means "if there is a value for x, use that. Otherwise use 0."
  // But we aren't checking anything else! We could put "Lalala" for the value of x 
  this.x = x || 0;
  this.y = y || 0;
  this.w = w || 1;
  this.h = h || 1;
  this.fill = fill || '#AAAAAA';
  this.type = type || 'node';
  this.text = text;
}

// Draws this shape to a given context
Shape.prototype.draw = function(ctx) {
  ctx.fillStyle = this.fill;
  ctx.fillRect(this.x, this.y, this.w, this.h);
  ctx.fillStyle = 'white';
  tx = this.x + (this.w/4);
  ty = this.y + (this.h/2);
  ctx.fillText(this.text, tx, ty);
  //ctx.strokeText(this.text, tx, ty);
}

// Determine if a point is inside the shape's bounds
Shape.prototype.contains = function(mx, my) {
  // All we have to do is make sure the Mouse X,Y fall in the area between
  // the shape's X and (X + Height) and its Y and (Y + Height)
  return  (this.x <= mx) && (this.x + this.w >= mx) &&
          (this.y <= my) && (this.y + this.h >= my);
}

function Image(img, dx, dy) {
    this.src = img;
    this.x = dx;
    this.y = dy;
}

function Line(start, end) {
    this.start = start
    this.end = end
}

function CanvasState(canvas) {
  // **** First some setup! ****
  
  this.canvas = canvas;
  this.width = canvas.width;
  this.height = canvas.height;
  this.ctx = canvas.getContext('2d');
  // This complicates things a little but but fixes mouse co-ordinate problems
  // when there's a border or padding. See getMouse for more detail
  var stylePaddingLeft, stylePaddingTop, styleBorderLeft, styleBorderTop;
  if (document.defaultView && document.defaultView.getComputedStyle) {
    this.stylePaddingLeft = parseInt(document.defaultView.getComputedStyle(canvas, null)['paddingLeft'], 10)      || 0;
    this.stylePaddingTop  = parseInt(document.defaultView.getComputedStyle(canvas, null)['paddingTop'], 10)       || 0;
    this.styleBorderLeft  = parseInt(document.defaultView.getComputedStyle(canvas, null)['borderLeftWidth'], 10)  || 0;
    this.styleBorderTop   = parseInt(document.defaultView.getComputedStyle(canvas, null)['borderTopWidth'], 10)   || 0;
  }
  // Some pages have fixed-position bars (like the stumbleupon bar) at the top or left of the page
  // They will mess up mouse coordinates and this fixes that
  var html = document.body.parentNode;
  this.htmlTop = html.offsetTop;
  this.htmlLeft = html.offsetLeft;

  // **** Keep track of state! ****
  
  this.valid = false; // when set to false, the canvas will redraw everything
  this.shapes = [];  // the collection of things to be drawn
  this.images = [];
  this.lines = [];
  this.dragging = false; // Keep track of when we are dragging
  // the current selected object. In the future we could turn this into an array for multiple selection
  this.selection = null;
  this.dblclick = null;
  this.dragoffx = 0; // See mousedown and mousemove events for explanation
  this.dragoffy = 0;
  
  // **** Then events! ****
  
  // This is an example of a closure!
  // Right here "this" means the CanvasState. But we are making events on the Canvas itself,
  // and when the events are fired on the canvas the variable "this" is going to mean the canvas!
  // Since we still want to use this particular CanvasState in the events we have to save a reference to it.
  // This is our reference!
  var myState = this;
  
  //fixes a problem where double clicking causes text to get selected on the canvas
  canvas.addEventListener('selectstart', function(e) { e.preventDefault(); return false; }, false);
  // Up, down, and move are for dragging
  canvas.addEventListener('mousedown', function(e) {
    var mouse = myState.getMouse(e);
    var mx = mouse.x;
    var my = mouse.y;
    var shapes = myState.shapes;
    var l = shapes.length;
    for (var i = l-1; i >= 0; i--) {
      if (shapes[i].contains(mx, my)) {
        var mySel = shapes[i];
        // Keep track of where in the object we clicked
        // so we can move it smoothly (see mousemove)
        myState.dragoffx = mx - mySel.x;
        myState.dragoffy = my - mySel.y;
        myState.dragging = true;
        myState.selection = mySel;
        myState.valid = false;
        return;
      }
    }
    // havent returned means we have failed to select anything.
    // If there was an object selected, we deselect it
    if (myState.selection) {
      myState.selection = null;
      myState.valid = false; // Need to clear the old selection border
    }
  }, true);
  canvas.addEventListener('mousemove', function(e) {
    if (myState.dragging){
      var mouse = myState.getMouse(e);
      // We don't want to drag the object by its top-left corner, we want to drag it
      // from where we clicked. Thats why we saved the offset and use it here
      myState.selection.x = mouse.x - myState.dragoffx;
      myState.selection.y = mouse.y - myState.dragoffy;   
      myState.valid = false; // Something's dragging so we must redraw
    }
  }, true);
  canvas.addEventListener('mouseup', function(e) {
    myState.dragging = false;
  }, true);
  // double click for making new shapes
  canvas.addEventListener('dblclick', function(e) {
    var mouse = myState.getMouse(e);
    var mx = mouse.x;
    var my = mouse.y;
    var shapes = myState.shapes;
    var l = shapes.length;
    for (var i = l-1; i >= 0; i--) {
        if (shapes[i].contains(mx, my)) {
            var mySel = shapes[i];
            if (myState.dblclick != null) {
                if (myState.dblclick != mySel) {
                    // One has to be a node and another a network
                    var types = [];
                    types.push(myState.dblclick.type);
                    types.push(mySel.type);
                    var net_found = 0;
                    var node_found = 0;
                    for(var nn = 0; nn < types.length; nn++) {
                        if (types[nn] == 'node'){
                            node_found = 1;
                        }
                        if (types[nn] == 'network'){
                            net_found = 1;
                        }
                    }
                    if (net_found == 0 || node_found == 0) {
                        // Clear selection
                        myState.dblclick = null;
                        return;
                    }
                    // Check if the selections are already connected
                    var lines = myState.lines;
                    var connected = 0;
                    for (var ln=0; ln < lines.length; ln++) {
                        if (lines[ln].start == myState.dblclick &&
                            lines[ln].end == mySel) {
                            connected++;
                        }
                        if (lines[ln].start == mySel &&
                            lines[ln].end == myState.dblclick) {
                            connected++;
                        }
                    }
                    if (connected == 1) {
                        console.log('Already connected');
                        myState.dblclick = null;
                        return;
                    }

                    // Check if the node is already connected to another network
                    var node = null;
                    if (myState.dblclick.type == 'node') {
                        node = myState.dblclick;
                    } else {
                        node = mySel;
                    }
                    newlines = new Array();
                    for (var ln=0; ln < lines.length; ln++) {
                        if (lines[ln].start == node || lines[ln].end == node) {
                            // Do not store this line 
                        } else {
                            newlines.push(lines[ln]);
                        }
                    }
                    myState.lines = newlines;
                    // Draw line between elements
                    myState.addLine(new Line(myState.dblclick, shapes[i]));
                    // Clear selection
                    myState.dblclick = null;
                    return;
                } else {
                    // Clear selection
                    myState.dblclick = null;
                    return;
                }
            }
            myState.dblclick = mySel;
            myState.valid = false;
            return;
        }
      }
  }, true);
  
  // **** Options! ****
  
  this.selectionColor = '#CC0000';
  this.dblclickColor = '#07ED45';
  this.dblclickWidth = 4;
  this.selectionWidth = 2;  
  this.interval = 30;
  setInterval(function() { myState.draw(); }, myState.interval);
}

CanvasState.prototype.addShape = function(shape) {
  this.shapes.push(shape);
  this.valid = false;
}

CanvasState.prototype.addLine = function(line) {
    this.lines.push(line);
    this.valid = false;
}

CanvasState.prototype.clear = function() {
  this.ctx.clearRect(0, 0, this.width, this.height);
}

CanvasState.prototype.addImage = function(image) {
    this.images.push(image)
    this.valid = false;
}

// While draw is called as often as the INTERVAL variable demands,
// It only ever does something if the canvas gets invalidated by our code
CanvasState.prototype.draw = function() {
  // if our state is invalid, redraw and validate!
  if (!this.valid) {
    var ctx = this.ctx;
    var shapes = this.shapes;
    this.clear();
    
    // ** Add stuff you want drawn in the background all the time here **
    
    // draw all shapes
    var l = shapes.length;
    for (var i = 0; i < l; i++) {
      var shape = shapes[i];
      // We can skip the drawing of elements that have moved off the screen:
      if (shape.x > this.width || shape.y > this.height ||
          shape.x + shape.w < 0 || shape.y + shape.h < 0) continue;
      shapes[i].draw(ctx);
    }
    
    // draw selection
    // right now this is just a stroke along the edge of the selected Shape
    if (this.selection != null) {
      ctx.strokeStyle = this.selectionColor;
      ctx.lineWidth = this.selectionWidth;
      var mySel = this.selection;
      ctx.strokeRect(mySel.x,mySel.y,mySel.w,mySel.h);
    }
   
    if (this.dblclick != null) {
      ctx.strokeStyle = this.dblclickColor;
      ctx.lineWidth = this.dblclickWidth;
      var mySel = this.dblclick;
      ctx.strokeRect(mySel.x,mySel.y,mySel.w,mySel.h);
    }
 
    // ** Add stuff you want drawn on top all the time here **
    // Draw lines
    var ln = this.lines.length;
    for (var i = 0; i < ln; i++) {
        var line = this.lines[i];
        // Get start element position
        var start_x = line.start.x
        var start_y = line.start.y
        // Get end element position
        var end_x = line.end.x
        var end_y = line.end.y

        cp_x = null;
        cp_y = null;
        // Check position of points relative to each other
        if (start_x > end_x) {
            // Left edge of start and right edge of end
            start_y = line.start.y + (line.start.h/2);
            end_x = line.end.x + line.end.w;
            end_y = line.end.y + (line.end.h/2);
            // Calculate control points between lines
            cp_x = (start_x - end_x)/2;
            cp_y = (end_y - start_y)/2;
        } else {
            // Right edge of start and left edge of end
            start_y = line.start.y + (line.start.h/2);
            start_x = line.start.x + line.start.w;
            end_y = line.end.y + (line.end.h/2);
            // Calculate control points between lines
            cp_x = (end_x - start_x)/2;
            cp_y = (end_y - start_y)/2;
        }

        ctx.beginPath();
        ctx.moveTo(start_x, start_y);
        ctx.lineTo(end_x, end_y);
        ctx.closePath();
        //ctx.quadraticCurveTo(cp_x, cp_y, end_x, end_y);
        ctx.lineWidth = 3;
        ctx.strokeStyle = "red"; // line color
        ctx.stroke();
    }

    this.valid = true;
  }
}


// Creates an object with x and y defined, set to the mouse position relative to the state's canvas
// If you wanna be super-correct this can be tricky, we have to worry about padding and borders
CanvasState.prototype.getMouse = function(e) {
  var element = this.canvas, offsetX = 0, offsetY = 0, mx, my;
  
  // Compute the total offset
  if (element.offsetParent !== undefined) {
    do {
      offsetX += element.offsetLeft;
      offsetY += element.offsetTop;
    } while ((element = element.offsetParent));
  }

  // Add padding and border style widths to offset
  // Also add the <html> offsets in case there's a position:fixed bar
  offsetX += this.stylePaddingLeft + this.styleBorderLeft + this.htmlLeft;
  offsetY += this.stylePaddingTop + this.styleBorderTop + this.htmlTop;

  mx = e.pageX - offsetX;
  my = e.pageY - offsetY;
  
  // We return a simple javascript object (a hash) with x and y defined
  return {x: mx, y: my};
}

// If you dont want to use <body onLoad='init()'>
// You could uncomment this init() reference and place the script reference inside the body tag
//init();

function init() {
  var s = new CanvasState(document.getElementById('box'));
  s.addShape(new Shape(40,40,50,50)); // The default is gray
  s.addShape(new Shape(60,140,40,60, 'lightskyblue'));
  // Lets make some partially transparent
  s.addShape(new Shape(80,150,60,30, 'rgba(127, 255, 212, .5)'));
  s.addShape(new Shape(125,80,30,80, 'rgba(245, 222, 179, .7)'));
}

// Now go make something amazing!
