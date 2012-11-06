/*
To fork interactivJS goto https://github.com/traeger/interactiveJS.



interactivJS is released under the BSD license:

Copyright 2012 (c) Marco TrŠger marco.traeger@googlemail.com.
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

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDER ÒAS ISÓ AND ANY
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
/* parsed to pretty code converter */
iJS.C = new Object();

/*****
 ***** config and initis
 *****
 *****/

/* exporter variable for Uglify-js/parser-js.js */
var exports = new Object();

/* tmp error handler - change this */
error = alert;

/*****
 ***** END
 ***** config and initis 
 *****/

/*****
 ***** parsed to pretty code converter
 ***** 
 *****/

/* intercalates an array with a seperator
 * intercalate(" - ", ["a","b","c"]) = "a - b - c" */ 
iJS.C.intercalate = function (seperator, as) {
  result = "";
  for(i in as) {
    if(i > 0) result += seperator;
    result += as[i];
  }
  return result;
}

/* given number of white spaces */
iJS.C.white = function (num) {
  result = "";
  for(var i = 0; i < num; i++)
    result += " ";
  return result;
}

/* toplevel */
iJS.C.toCode = function (parsed) {
  if(parsed[0] === "toplevel") {
    result = "";
    for(i = 0; i < parsed[1].length; i++) {
      result += iJS.C.lineToCode(parsed[1][i], 0);
      result += "\n";
    }
    return result;
  } else {
    error;
  }
}

/* line
 * creates an ending newline. */
iJS.C.lineToCode = function (parsed, intent) {
  switch(parsed[0]) {
    case "stat":
      return iJS.C.white(intent) + iJS.C.stmtToCode(parsed[1], intent) + "\n";
    case "if":
      return iJS.C.white(intent) + "if(" + iJS.C.exprToCode(parsed[1], intent) + ") " + iJS.C.intentCode(parsed[2], intent);
    case "defun":
      return iJS.C.white(intent) + "function " + parsed[1] + "(" + iJS.C.intercalate(",", parsed[2]) + ") " + iJS.C.blockToCode(parsed[3], intent);
    case "return":
      return iJS.C.white(intent) + "return " + iJS.C.exprToCode(parsed[1], intent) + ";\n";
    default:
      error("unkown line" + parsed);
  }
}

/* converts an array of lines of code, seperates each line by a newline, used iJS.C.lineToCode
 * creates an ending newline.
 */
iJS.C.linesToCode = function (parsed, intent) {
  result = "";
  for(i = 0; i < parsed.length; i++) {
    result += iJS.C.lineToCode(parsed[i], intent);
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
iJS.C.blockToCode = function (parsed, intent) {
  result = "{\n";
  result += iJS.C.linesToCode(parsed, intent + 2)
  result += iJS.C.white(intent) + "}\n"
  return result;
}

/* additional intention of the code
 * this functions checks whether the intented code is a block statement
 * if so a { ... }-block is created otherwise the statement is only intended.
 */
iJS.C.intentCode = function (parsed, intent) {
  if(parsed[0] === "block") {
    return iJS.C.blockToCode(parsed[1], intent);
  } else {
    return "\n"+ iJS.C.lineToCode(parsed, intent + 2);
  }
}

/* statement */
iJS.C.stmtToCode = function (parsed, intent) {
  switch(parsed[0]) {
    case "assign":
      return iJS.C.assignToCode(parsed[2], parsed[3], intent);
    default:
      error("unkown stmt" + parsed);
  }
}

/* assignment */
iJS.C.assignToCode = function (parsedLHS, parsedRHS, intent) {
  return iJS.C.exprToCode(parsedLHS, intent) + " = " + iJS.C.exprToCode(parsedRHS, intent) + ";";
}

/* expr */
iJS.C.exprToCode = function (parsed, intent) {
  switch(parsed[0]) {
    case "num":
      return parsed[1];
    case "name":
      return parsed[1];
    case "call":
      return iJS.C.callToCode(parsed[1], parsed[2], intent);
    case "sub":
      return iJS.C.exprToCode(parsed[1], intent) + "[" + iJS.C.exprToCode(parsed[2]) + "]";
    case "binary":
      return iJS.C.exprToCode(parsed[2], intent) + " " + parsed[1] + " " + iJS.C.exprToCode(parsed[3], intent)
    case "function":
      return "function(" + iJS.C.intercalate(parsed[2]) + ") " + iJS.C.blockToCode(parsed[3], intent);
    default:
      error("unkown expr" + parsed);
  }
}

/* function calls */
iJS.C.callToCode = function (name, params, intent) {
  /* partial fixed assign of parameter s.t. the new function
   * have only one argument for the use with Array.map
   */
  var expr = function(parsed) {
    return iJS.C.exprToCode(parsed, intent);
  }
  
  return iJS.C.exprToCode(name, intent) + "(" + iJS.C.intercalate(", ", params.map(expr) ) + ")";
}

/*****
 ***** END
 ***** parsed to pretty code converter
 *****/