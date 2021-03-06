/*
To fork interactivJS goto https://github.com/traeger/interactiveJS.



interactivJS is released under the BSD license:

Copyright 2012 (c) Marco Tr�ger marco.traeger@googlemail.com.
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

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDER �AS IS� AND ANY
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

/* Executes the js-code associated with its parse-tree */
iJS.exec = function(parseTree) {
  eval(iJS.toCode(parseTree));
}

/* parseTree to pretty code converter */
iJS.P = new Object();
/* code generations for interactive code execution. */
iJS.G = new Object();
/* code execution, stepwise execution and debugging */
iJS.E = new Object();
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
    case "block":
      if(parseTree.length >= 2) {
        return iJS.P.blockToCode(parseTree[1], intent); 
      }
      else {
        return "";
      }
    case "__eval":
      return parseTree[2];
    default:
      error("unkown case iJS.P.toCode " + parseTree[0] + ": \n" + parseTree);
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
iJS.globalizeLocalVariables = function (parseTree, varContainer) {
  var scope = new iJS.G.Scope();
  var f = function (v) {
    return varContainer + "." + scope.globalize(v);
  }
  
  return iJS.G.preplaceLocalVariables(parseTree, f, scope);
}

/* scope naming object. Used to globalize local variables. */
iJS.G.Scope = function() {
  this.trace = [0];
  /* each variable name have a stack of global names
   * azzociated with the local name. The global name
   * depends on the scope where the local variable was
   * introduced in the current scope trace.
   * A global varibale name is higher in stack
   * iff it is neeper in a scope nesting we are in. */
  this.globalizedNames = [];
  /* local variable introduce stack of the current scope trace.
   * Each layer of the stack contains a list(array)
   * of the name of all local variables which
   * was introduced in scrope depth depth.
   * Thus, on the bottom of the stack are all local
   * variables which are introduced in the first scope.
   * In i'th lowest stackelement contains the list
   * of all local variables introduced in the (i-1)'th
   * nested scope. */
  this.localVarDeclerations = [[]];
}
iJS.G.Scope.prototype.down = function() {
  this.trace.push(0);
  this.localVarDeclerations.push([]);
}
iJS.G.Scope.prototype.up = function() {
  this.trace.pop();
  
  /* for each local variable which was introduced in the scope
   * we are leaving, remove the top mapping to a global variable
   * and leave the scope-depending nameing for outer scoped for this
   * local variable unchanged.
   * Thus, if we see a local variable of this name outside of this scrope
   * we give it the correct globalized scope name (and not the globaleized name
   * of the scope ne are leaving here). */
  var localVarDecls = this.localVarDeclerations.pop();
  var i;
  for(i = 0; i < localVarDecls.length; i++) {
    var global = this.globalizedNames[localVarDecls[i]];
    if(global != null) {
      global.pop();
    }
  }
}
iJS.G.Scope.prototype.next = function() {
  this.trace.push(this.trace.pop() + 1);
}
iJS.G.Scope.prototype.nest = function(f) {
  this.next(); this.down();
  var result = f();
  this.up();
  return result;
}
iJS.G.Scope.prototype.declareVar = function(v) {
  if(this.globalizedNames[v] == null) {
    this.globalizedNames[v] = [];
  }
  console.log(v + "__" + this.toVariableSuffix());
  this.globalizedNames[v].push(v + "__" + this.toVariableSuffix());
  this.localVarDeclerations[this.localVarDeclerations.length - 1].push(v);
}
/* creates an variable suffix out of the scope
 * PRIVATE */
iJS.G.Scope.prototype.toVariableSuffix = function() {
  /* we create an local copy of the scope trace */
  var out = this.trace.slice();
  out.pop();
  
  return iJS.H.intercalate("_", out);
}
iJS.G.Scope.prototype.globalize = function(v) {
  var globals = this.globalizedNames[v];
  if(globals == null)
    return null;
  return globals[globals.length - 1];
}

/* replace all local variables using f in a gobal scope */
iJS.G.preplaceLocalVariables = function (parseTree, f, scope) {
  var _f = function(p) {return iJS.G.preplaceLocalVariables(p, f, scope)};
  var _g = function(p) {return iJS.G.preplaceLocalVariablesScope(p, f, scope)};
  
  switch(parseTree[0]) {
    /* linecases */
    case "if":
      return [ parseTree[0],
        parseTree[1],
        scope.nest(function () { return _g(parseTree[2]); })
      ];
    case "defun":
    case "function":
      return scope.nest(function () {
        // declare function parameter as local variables such that they hiding variables with
        // the same name from outer scopes.
        parseTree[2].map(function (x) {scope.declareVar(x);});
        return [ parseTree[0],
          parseTree[1],
          parseTree[2].map(f),
          parseTree[3].map(_g)
        ];
      });
    case "block":
      if(parseTree.length >= 2) {
        return scope.nest(function() {
          return [parseTree[0], parseTree[1].map(_g)];
        }); 
      }
      else {
        return ["block"];
      }
    default:
      return iJS.H.sink(parseTree, _f);
  }
}

/* replace all local variables using f in a local scope */
iJS.G.preplaceLocalVariablesScope = function (parseTree, f, scope) {
  var _g = function(p) {return iJS.G.preplaceLocalVariablesScope(p, f, scope)}
  
  switch(parseTree[0]) {
    /* linecases */
    case "var":
      // register new variables here, such that they hiding variables with
      // the same name from outer scopes.
      parseTree[1].map(function (x) {scope.declareVar(x[0]);});
      return [ parseTree[0], parseTree[1].map(function (x) {return [f(x[0]), _g(x[1])];}) ];
    case "if":
      return [ parseTree[0],
        _g(parseTree[1]),
        scope.nest(function () { return _g(parseTree[2]); })
      ];
    case "defun":
    case "function":
      return scope.nest(function () {
        // declare function parameter as local variables such that they hiding variables with
        // the same name from outer scopes.
        parseTree[2].map(function (x) {scope.declareVar(x);});
        return [ parseTree[0],
          parseTree[1],
          parseTree[2].map(f),
          parseTree[3].map(_g)
        ];
      });
    /* expr cases */
    case "name":
      return [ parseTree[0], f(parseTree[1]) ];
    case "block":
      if(parseTree.length >= 2) {
        return scope.nest(function() {
          return [parseTree[0], parseTree[1].map(_g)];
        });
      }
      else {
        return ["block"];
      }
    default:
      return iJS.H.sink(parseTree, _g);
  }
}

/*****
 ***** code decomposer
 *****
 *****/

iJS.G.Decomposed = function() {
  /* a map from funhandle to function description (iJS.G.Fun) */
  this.funs = [];
  this.mainChuck = undefined;
}
/* register a function for this decomposition with
 * - 'params' - array of parameters of the function
 * - 'parseTree' - the parse-tree of the function
 *    (which is also decomposed, thus local functions
 *     are replace by a call funHandle)
 * a handle to the function chuck is returned
 * (of type iJS.G.Fun).
 *  funHandle = decomposed.addFun(params, parseTree)
 *  funHandle.call(1,2); // will call the function with arguments 1,2.
 */
iJS.G.Decomposed.prototype.addFun = function(params, parseTree) {
  var funHandle = this.funs.length;
  this.funs.push(new iJS.G.Fun(this, params, parseTree));
  return funHandle;
}
/* get a function description (iJS.G.Fun) by it's funHandle */
iJS.G.Decomposed.prototype.getFunByHandle = function(funHandle) {
  return this.funs[funHandle];
}
iJS.G.Fun = function(decomposed, params, parseTree) {
  this.decomposed = decomposed;
  this.params = params;
  this.parseTree = parseTree;
}

/* decompose code into
 * a chuck (parse-tree) c_i for each function f_i found in the code
 * the main chuck c (parsed-tree) (the code without the function definitions)
 *
 * d = iJS.G.decompose(parseTree)
 * d.main() - access to the main chuck
 * d.fun(name :: string) - access to the chuck of the function with name 'name'
 */
iJS.G.decompose = function(parseTree, varContainer) {
  /* parse-tree with globalized local variables */
  var glParseTree = iJS.globalizeLocalVariables(parseTree, varContainer);
  
  var decomposed = new iJS.G.Decomposed();
  decomposed.mainChuck = iJS.G.decompose0(glParseTree, decomposed)
  return decomposed;
}

/* inner helper for iJS.P.decompose */
iJS.G.decompose0 = function(parseTree, decomposed) {
  var _g = function(p) {return iJS.G.decompose0(p, decomposed)}
  
  switch(parseTree[0]) {
    case "defun":
    case "function":
      // extract function chuck
      funHandle = decomposed.addFun( parseTree[2], _g(["toplevel", parseTree[3]]) );
      
      /* variant 1 */
      if(parseTree[1] != null) {
        return ["__globalfun", parseTree[1], funHandle];
      }
      // return the funHandle, to know the function-chuck extracted here
      else {
        return ["__globalfun", null, funHandle];
      }
      
      /* variant 2 */
      // register the function name to call this function if one is available
        //if(parseTree[1] != null) {
        //  return ["stat", ["assign", true, ["name", parseTree[1]], ["__globalfun", funHandle]]];
        // }
      // return the funHandle, to know the function-chuck extracted here
        //else {
        //  return ["__globalfun", funHandle];
        //}
    default:
      return iJS.H.sink(parseTree, _g);
  }
}

/* Removes all variable delerations from the parse-tree and
 * replace them by simple assignments.
 * 
 * Beware that this may change the semantics of the code interpretation
 * of the parse-tree, since variables are no longer local in a scope if they
 * overlap with a variable of the same name in an outer scope.
 *
 * This function does not change the semantic of the code interpretation
 * of the parse-tree if all variables in the program (all! - including
 * variables not contained in the parse-tree itself) have unique names.
 */
iJS.G.rmVarDeclaration = function(parseTree) {
  var _f = function(p) {return iJS.G.rmVarDeclaration(p)};
  var q = function(x) {
    switch(x.length) {
      case 1:
        return ["stat", ["block"] ];
      case 2:
        return ["stat", ["assign", true, ["name", x[0]], _f(x[1])] ];
      default:
        console.error("iJS.G.rmVarDeclaration: unknow number of entries in " + x);
    }
  }
  
  switch(parseTree[0]) {
    case "var":
      return ["block", parseTree[1].map(q)];
    default:
      return iJS.H.sink(parseTree, _f);
  }
}

/*****
 ***** code execution
 *****
 *****/
/*
 * Converts all "__globalfun" constructs to
 * function calls of the function with the name 'nameOfCallback'.
 *
 * 'nameOfCallback' has to be the name of a function with the signature
 * iJS.G.Fun -> void - thus 'nameOfCallback'(fun) : E.
 *
 * The function 'nameOfCallback' will be called instead of fun whenever fun would be called.
 */
iJS.E.globalfunToEvalCallback = function(parseTree, nameOfCallback) {
  var _f = function(p) {return iJS.E.globalfunToEvalCallback(p, nameOfCallback)}
  
  switch(parseTree[0]) {
    case "__globalfun":
      /*
       * fun : iJS.G.Fun
       */
      var funHandle = parseTree[2];
      
      var funcall = ["return", ["call", nameOfCallback, [funHandle, "arguments"] ] ];
      if(parseTree[1] == null) {
        return ["defun", null, [], [funcall]];
      } else {
        return ["function", parseTree[1], [], [funcall]];
      }
    default:
      return iJS.H.sink(parseTree, _f);
  }
}

/*
 * decomposed : iJS.G.Decomposed
 */
iJS.E.exec = function(decomposed) {
  var _f = function(funHandle0, params0) {
    iJS.E.execFun(decomposed, funHandle0, params0)
  }
  
  var executeableCode = iJS.E.globalfunToEvalCallback(decomposed.mainChuck, "_f");
  iJS.exec(executeableCode);
}

iJS.E.execFun = function(decomposed, funHandle, params) {
  var _f = function(funHandle0, params0) {
    iJS.E.execFun(decomposed, funHandle0, params0)
  }
  
  var paramvalues = fun.params.map(function (paramname) {return eval(paramname)});
  var fun = decomposed.getFunByHandle(funHandle);
  var funParamNames = fun.params;
  var executeableCode = iJS.E.globalfunToEvalCallback(fun.parseTree, "_f");
  /* assign parameter values */
  for(var i = 0; i < params.length; i++) {
    eval(funParamNames[i] + " = " + params[i] + ";");
  }
  /* exec the function body code */
  iJS.exec(executeableCode);
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

/* Iterates over an array.
 *
 * The callback is a function with two arguments
 * (the current element, the recursive call to this functions)
 * the recursive call argument need to be called when the next
 * element should be iterated.
 *
 * Pattern:
  g = function(a, iterate) {
    .. do stuff with a ..
    iterate();
  }
  iJS.H.iterate(as, g);
 * this will call g for each element in as.
 *
 * This pattern allows asynchrone iterations - through events and
 * all that. Beware that this style of iteration generates a function
 * call stack of size 2*as.length .
 */
iJS.H.iterateRecursive = function(as, callback) {
  if(as.length == 0)
    return;
  else {
    a = as.shift();
    callback(
      a,
      function() {
        iJS.H.iterateRecursive(as, callback);
      }
    );
  }
}

/* sink the application of a function (f :: parseTree -> parseTree) down to all direct children
 * of the root node of a parse-tree.
 *
 * example:
 * iJS.H.sink(["binary", ["num", 1], ["binary", ["name", "x"], ["num", 2] ] ], f)
 *          = ["binary", f(["num", 1]), f(["binary", ["name", "x"], ["num", 2] ]) ] ) */
iJS.H.sink = function (parseTree, f) {
  switch(parseTree[0]) {
    case "eval":
    case "name":
    case "num":
    case "string":
      return parseTree;
    case "toplevel":
    case "array":
      return [ parseTree[0], parseTree[1].map(f) ];
    /* linecases */
    case "var":
      return [ parseTree[0], parseTree[1].map(function (x) {return [x[0], f(x[1])];}) ];
    case "stat":
    case "return":
      return [ parseTree[0], f(parseTree[1]) ];
    case "if":
      return [ parseTree[0], f(parseTree[1]), f(parseTree[2]) ];
    case "defun":
    case "function":
      return [ parseTree[0], parseTree[1], parseTree[2], parseTree[3].map(f) ];
    /* stmt cases */
    case "assign":
      return [ parseTree[0], parseTree[1], parseTree[2], f(parseTree[3]) ];
    case "call":
      return [ parseTree[0], f(parseTree[1]), parseTree[2].map(f) ];
    /* expr cases */
    case "sub":
      return [ parseTree[0], f(parseTree[1]), f(parseTree[2]) ];
    case "binary":
      return [ parseTree[0], parseTree[1], f(parseTree[2]), f(parseTree[3]) ];
    case "block":
      if(parseTree.length >= 2) {
        return [parseTree[0], parseTree[1].map(f)];
      }
      else {
        return ["block"];
      }
    default:
      error("unkown case in iJS.H.sinkRHS " + parseTree[0] + ": \n" + iJS.toCode(parseTree));
  }
}