/*
To fork interactivJS goto https://github.com/traeger/interactiveJS.



interactivJS is released under the BSD license:

Copyright 2012 (c) Marco Träger marco.traeger@googlemail.com.
Based on the parser of UglifyJS (https://github.com/mishoo/UglifyJS), thanks for the great work!

Redistribution and use in source and binary forms, with or without
modification, are permitted provided that the following conditions
are met:

    * Redistributions of source code must retain the above
      copyright notice, this list of conditions and the following
      disclaimer.

    * Redistributions in binary form must reproduce the above
      copyright notice, this list of conditions and the following
      disclaimer in the documentation and/or other materials
      provided with the distribution.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDER “AS IS” AND ANY
EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR
PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER BE
LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY,
OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO,
PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR
PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR
TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF
THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF
SUCH DAMAGE.
*/

iJS = new Object();

/* parseTree into pretty code converter */
iJS.toCode = function(parseTree, intent) {
  if(intent == undefined)
    intent = 0;
  
  return iJS.P.toCode(parseTree, intent);
}

/* parseTree to pretty code converter */
iJS.P = new Object();
/* code generations for interactive code execution. */
iJS.G = new Object();
/* helper */
iJS.H = new Object();

/*****
 ***** config and initis
 *****
 *****/

/* exporter variable for Uglify-js/parser-js.js */
var exports = new Object();

/* tmp error handler - change this */
error = alert;

/*****
 ***** parseTree to pretty code converter
 ***** 
 *****/

/* parseTree into pretty code converter */
iJS.P.toCode = function (parseTree, intent) {
  /* partial fixed assign of parameter s.t. the new function
   * have only one argument for the use with Array.map
   */
  var _f = function(parseTree) {
    return iJS.P.toCode(parseTree, intent);
  }
  switch(parseTree[0]) {
    case "toplevel":
      return iJS.P.linesToCode(parseTree[1], intent);
    /* linecases */
    case "var":
      return iJS.P.white(intent) + parseTree[1].map(function(x) {return x[0] + " = " + _f(x[1])} ) + ";\n";
    case "stat":
      return iJS.P.white(intent) + _f(parseTree[1]) + ";\n";
    case "if":
      return iJS.P.white(intent) + "if(" + _f(parseTree[1]) + ") " + iJS.P.intentCode(parseTree[2], intent);
    case "defun":
      return iJS.P.white(intent) + "function " + parseTree[1] + "(" + iJS.H.intercalate(",", parseTree[2]) + ") " + iJS.P.blockToCode(parseTree[3], intent);
    case "return":
      return iJS.P.white(intent) + "return " + _f(parseTree[1]) + ";\n";
    /* stmt cases */
    case "assign":
      return _f(parseTree[2]) + " = " + _f(parseTree[3]);
    case "call":
      return _f(parseTree[1]) + "(" + iJS.H.intercalate(", ", parseTree[2].map(_f) ) + ")";
    /* expr cases */
    case "num":
      return parseTree[1];
    case "name":
      return parseTree[1];
    case "string":
      return "\"" + parseTree[1] + "\"";
    case "sub":
      return _f(parseTree[1]) + "[" + _f(parseTree[2]) + "]";
    case "binary":
      return _f(parseTree[2]) + " " + parseTree[1] + " " + _f(parseTree[3])
    case "function":
      return "function(" + iJS.H.intercalate(", ", parseTree[2]) + ") " + iJS.P.blockToCode(parseTree[3], intent);
    case "array":
      return "[" + iJS.H.intercalate(", ", parseTree[1].map(_f) ) + "]";
    case "__eval":
      return parseTree[2];
    case "__paramassign":
      return iJS.P.white(intent) + parseTree[1].map(function(x) {return x[0] + " = " + _f(x[1])} ) + ";\n";
    default:
      error("unkown case " + parseTree[0] + ": \n" + parseTree);
  }
}

/* given number of white spaces */
iJS.P.white = function (num) {
  result = "";
  for(var i = 0; i < num; i++)
    result += " ";
  return result;
}

/* converts an array of lines of code, seperates each line by a newline, used iJS.P.lineToCode
 * creates an ending newline.
 */
iJS.P.linesToCode = function (parseTree, intent) {
  result = "";
  for(i = 0; i < parseTree.length; i++) {
    result += iJS.P.toCode(parseTree[i], intent);
  }
  return result;
}

/* block
 * creates an ending newline.
 * Example:
 * {
 *   bla;
 *   bla;
 * }
 */
iJS.P.blockToCode = function (parseTree, intent) {
  result = "{\n";
  result += iJS.P.linesToCode(parseTree, intent + 2)
  result += iJS.P.white(intent) + "}\n"
  return result;
}

/* additional intention of the code
 * this functions checks whether the intented code is a block statement
 * if so a { ... }-block is created otherwise the statement is only intended.
 */
iJS.P.intentCode = function (parseTree, intent) {
  if(parseTree[0] === "block") {
    return iJS.P.blockToCode(parseTree[1], intent);
  } else {
    return "\n"+ iJS.P.toCode(parseTree, intent + 2);
  }
}

/*****
 ***** find local variables
 *****
 *****/

/* all local variables in a gobal scope */
iJS.localVariables = function (parseTree) {
  switch(parseTree[0]) {
    case "toplevel":
    case "array":
      return iJS.H.unions(parseTree[1].map(iJS.localVariables));
    case "stat":
      return iJS.localVariables(parseTree[1]);
    case "if":
      return iJS.H.unions(parseTree[2].map(iJS.localVariablesScope));
    case "defun":
    case "function":
      return parseTree[2].concat(
        iJS.H.unions(parseTree[3].map(iJS.localVariablesScope))
      );
    case "assign":
      return iJS.localVariables(parseTree[3]);
    default:
      [];
  }
}

/* all glocal variables in a local scope */
iJS.localVariablesScope = function(parseTree) {
  switch(parseTree[0]) {
    case "toplevel":
    case "array":
      return iJS.H.unions(parseTree[1].map(iJS.localVariablesScope));
    case "var":
      return iJS.H.unions(parseTree[1].map(iJS.H.head));
    case "stat":
      return iJS.localVariablesScope(parseTree[1]);
    case "if":
      return iJS.H.unions(parseTree[2].map(iJS.localVariablesScope));
    case "defun":
    case "function":
      return parseTree[2].concat(
        iJS.H.unions(parseTree[3].map(iJS.localVariablesScope))
      );
    case "name":
      return [parseTree[1]];
    case "sub":
      return [parseTree[1]];
    case "assign":
      return iJS.localVariablesScope(parseTree[2]).concat(
        iJS.localVariablesScope(parseTree[3])
      );
    default:
      return [];
  }
}

/*
 * Rename all local variables, s.t. they are unique in the 'parse-tree'.
 * They are converted to global variables by defining them as
 * attributes of the variable 'container'.
 */
iJS.globalizeLocalVariables = function (parseTree, container) {
  var scope = new iJS.P.Scope();
  var f = function (v) {
    return container + "." + v + "__" + scope.toVariableSuffix();
  }
  
  return iJS.P.preplaceLocalVariables(parseTree, f, scope);
}

/* scope naming object */
iJS.P.Scope = function() {
  this.trace = [0];
}

iJS.P.Scope.prototype.down = function() {
  this.trace.push(0);
}

iJS.P.Scope.prototype.up = function() {
  this.trace.pop();
}

iJS.P.Scope.prototype.next = function() {
  this.trace.push(this.trace.pop() + 1);
}

iJS.P.Scope.prototype.nest = function(f) {
  this.next(); this.down();
  result = f();
  this.up();
  return result;
}

/* creates an variable suffix out of the scope */
iJS.P.Scope.prototype.toVariableSuffix = function() {
  /* we create an local copy of the trace */
  var out = this.trace.slice()
  out.pop();
  
  return iJS.H.intercalate("_", out);
}

/* replace all local variables using f in a gobal scope */
iJS.P.preplaceLocalVariables = function (parseTree, f, scope) {
  var _f = function(p) {return iJS.P.preplaceLocalVariables(p, f, scope)};
  var _g = function(p) {return iJS.P.preplaceLocalVariablesScope(p, f, scope)};
  
  switch(parseTree[0]) {
    case "toplevel":
    case "array":
      return [ parseTree[0], parseTree[1].map(_f) ];
    /* linecases */
    case "var":
      return [ parseTree[0], parseTree[1].map(function (x) {return [x[0], _f(x[1])];}) ];
    case "stat":
    case "return":
      return [ parseTree[0], _f(parseTree[1]) ];
    case "if":
      return [ parseTree[0],
        parseTree[1],
        scope.nest(function () { return parseTree[2].map(_g); })
      ];
    case "defun":
    case "function":
      return scope.nest(function () {
        var _q = function(x) {return ["__paramassign", [[f(x), ["name", x]]] ]; };
        
        return [ parseTree[0],
          parseTree[1],
          parseTree[2],
          parseTree[2].map(_q).concat(parseTree[3].map(_g))
        ];
      });
    /* stmt cases */
    case "assign":
      return [ parseTree[0], parseTree[1], _f(parseTree[2]), _f(parseTree[3]) ];
    case "call":
      return [ parseTree[0], parseTree[1], parseTree[2].map(_f) ];
    /* expr cases */
    case "name":
    case "num":
    case "string":
      return [ parseTree[0], parseTree[1] ];
    case "sub":
      return [ parseTree[0], _f(parseTree[1]), _f(parseTree[2]) ];
    case "binary":
      return [ parseTree[0], parseTree[1], _f(parseTree[2]), _f(parseTree[3]) ];
    default:
      error("unkown case " + parseTree[0] + ": \n" + parseTree);
  }
}

/* replace all local variables using f in a local scope */
iJS.P.preplaceLocalVariablesScope = function (parseTree, f, scope) {
  var _g = function(p) {return iJS.P.preplaceLocalVariablesScope(p, f, scope)}
  
  switch(parseTree[0]) {
    case "toplevel":
    case "array":
      return [ parseTree[0], parseTree[1].map(_g) ];
    /* linecases */
    case "var":
      return [ parseTree[0], parseTree[1].map(function (x) {return [f(x[0]), _g(x[1])];}) ];
    case "stat":
    case "return":
      return [ parseTree[0], _g(parseTree[1]) ];
    case "if":
      return [ parseTree[0],
        _g(parseTree[1]),
        scope.nest(function () { return parseTree[2].map(_g); })
      ];
    case "defun":
    case "function":
      return scope.nest(function () {
        var _q = function(x) {return ["__paramassign", [[f(x), ["name", x]]] ]; };
        
        return [ parseTree[0],
          parseTree[1],
          parseTree[2],
          parseTree[2].map(_q).concat(parseTree[3].map(_g))
        ];
      });
    /* stmt cases */
    case "assign":
      return [ parseTree[0], parseTree[1], _g(parseTree[2]), _g(parseTree[3]) ];
    case "call":
      return [ parseTree[0], _g(parseTree[1]), parseTree[2].map(_g) ];
    /* expr cases */
    case "name":
      return [ parseTree[0], f(parseTree[1]) ];
    case "num":
    case "string":
      return [ parseTree[0], parseTree[1] ];
    case "sub":
      return [ parseTree[0], _g(parseTree[1]), _g(parseTree[2]) ];
    case "binary":
      return [ parseTree[0], parseTree[1], _g(parseTree[2]), _g(parseTree[3]) ];
    default:
      error("unkown case " + parseTree[0] + ": \n" + parseTree);
  }
}

/*****
 ***** interactive code generator
 *****
 *****/

/* Generates linewise executable code from parseTree code (via Uglify-js).
 *
 * Generates functions to execute each line
 * of the input and put them all together
 * in an array (A).
 * The i'th line can be executed via
 * A[i]();
 *
 * TBD:
 * - local variable replacement
 * - handling of functions
 */
iJS.G.gen = function (parseTree) {
  if(parseTree[0] != "toplevel")
    error("toplevel expected");
  
  /* wraps a function around each line
   * of a parseTree input
   */
  var parseTreeLines = parseTree[1];
  var fwrapLines = [];
  for(i in parseTreeLines) {
    fwrapLines.push(
      [ "function", null, [], [parseTreeLines[i]] ]
    );
  }

  /* put them all together in an array,
   * generate pretty code, and execute it.
   */
  return eval(iJS.toCode(["array",fwrapLines]));
}

/* Iterates over an array.
 *
 * The callback is a function with two arguments
 * (the current element, the recursive call to this functions)
 * the recursive call argument need to be called when the next
 * element should be iterated.
 *
 * Pattern:
  g = function(a, iterator) {
    .. do stuff with a ..
    iterator();
  }
  iJS.G.iterate(as, g);
 * this will call g for each element in as.
 *
 * This pattern allows asynchrone iterations - through events and
 * all that. Beware that this style of iteration is very resource
 * intensive and generates a giant stack in some cases.
 */
iJS.G.interate = function(as, callback) {
  if(as.length == 0)
    return;
  else {
    a = as.shift();
    callback(
      a,
      function() {
        iJS.G.interate(as, callback);
      }
    );
  }
}

/* JUNK */
/* sink a function (f :: parseTree -> parseTree) down to all direct RHS children */
iJS.G.sinkRHS = function (parseTree, f) {
  var _f = function(p) {return f(p)}
  
  switch(parseTree[0]) {
    case "eval":
      return parseTree;
    case "name":
    case "num":
    case "string":
      return parseTree;
    case "toplevel":
    case "array":
      return [ parseTree[0], parseTree[1].map(_f) ];
    /* linecases */
    case "var":
      return [ parseTree[0], parseTree[1].map(function (x) {return [x[0], _f(x[1])];}) ];
    case "stat":
    case "return":
      return [ parseTree[0], _f(parseTree[1]) ];
    case "if":
      return [ parseTree[0], _f(parseTree[1]), parseTree[2].map(_f) ];
    case "defun":
    case "function":
      return [ parseTree[0], parseTree[1], parseTree[2], parseTree[3].map(_f) ];
    /* stmt cases */
    case "assign":
      return [ parseTree[0], parseTree[1], parseTree[2], _f(parseTree[3]) ];
    case "call":
      return [ parseTree[0], _f(parseTree[1]), parseTree[2].map(_f) ];
    /* expr cases */
    case "sub":
      return [ parseTree[0], _f(parseTree[1]), _f(parseTree[2]) ];
    case "binary":
      return [ parseTree[0], parseTree[1], _f(parseTree[2]), _f(parseTree[3]) ];
    default:
      error("unkown case " + parseTree[0] + ": \n" + parseTree);
  }
}

/* JUNK */
/* build an eval tree */
iJS.G.eval = function (parseTree) {  
  switch(parseTree[0]) {
    case "function":
    case "defun":
      return ["__eval", parseTree, eval(iJS.toCode(parseTree)), iJS.toCode(parseTree)];
  }
  
  var parseTree0 = iJS.G.sinkRHS(parseTree, iJS.G.eval);
  switch(parseTree0[0]) {
    case "toplevel":
      return parseTree0;
  }
  var code = iJS.toCode(parseTree0, 0);
  var evaled = eval(code);
  
  /* for some reasons (i dont know why) an array is evaled
   * as an real array and all toString() method will obmit the
   * brackets. So we have to create them on our own. */
  if(evaled != undefined && evaled.constructor == Array) {
    evaled = "[" + evaled + "]";
  }
  
  return ["__eval", parseTree0, evaled, code];
}

/*****
 ***** helper
 *****
 *****/

/* head of an array */
iJS.H.head = function (x) {return x[0]};

/* union of arrays to one array */
iJS.H.unions = function(ass) {
  var result = [];
  for(i = 0; i < ass.length; i++) {
    result = result.concat(ass[i]);
  }
  return result;
}

/* intercalates an array with a seperator
 * intercalate(" - ", ["a","b","c"]) = "a - b - c" */ 
iJS.H.intercalate = function (seperator, as) {
  var result = "";
  for(i in as) {
    if(i > 0) result += seperator;
    result += as[i];
  }
  return result;
}