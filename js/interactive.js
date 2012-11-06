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

/* parsed into pretty code converter */
iJS.toCode = function(parsed) {
  return iJS.P.toCode(parsed);
}

/* parsed to pretty code converter */
iJS.P = new Object();

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

/* parsed into pretty code converter */
iJS.P.toCode = function (parsed, intent) {
  switch(parsed[0]) {
    case "toplevel":
      return iJS.P.linesToCode(parsed[1], 0);
    /* linecases */
    case "var":
      return "var " + parsed[1] + ";\n";
    case "stat":
      return iJS.P.white(intent) + iJS.P.toCode(parsed[1], intent) + ";\n";
    case "if":
      return iJS.P.white(intent) + "if(" + iJS.P.toCode(parsed[1], intent) + ") " + iJS.P.intentCode(parsed[2], intent);
    case "defun":
      return iJS.P.white(intent) + "function " + parsed[1] + "(" + iJS.P.intercalate(",", parsed[2]) + ") " + iJS.P.blockToCode(parsed[3], intent);
    case "return":
      return iJS.P.white(intent) + "return " + iJS.P.toCode(parsed[1], intent) + ";\n";
    /* stmt cases */
    case "assign":
      return iJS.P.toCode(parsed[2], intent) + " = " + iJS.P.toCode(parsed[3], intent);
    case "call":
      /* partial fixed assign of parameter s.t. the new function
       * have only one argument for the use with Array.map
       */
      var expr = function(parsed) {
        return iJS.P.toCode(parsed, intent);
      }
      return iJS.P.toCode(parsed[1], intent) + "(" + iJS.P.intercalate(", ", parsed[2].map(expr) ) + ")";
    /* expr cases */
    case "num":
      return parsed[1];
    case "name":
      return parsed[1];
    case "string":
      return "\"" + parsed[1] + "\"";
    case "sub":
      return iJS.P.toCode(parsed[1], intent) + "[" + iJS.P.toCode(parsed[2]) + "]";
    case "binary":
      return iJS.P.toCode(parsed[2], intent) + " " + parsed[1] + " " + iJS.P.toCode(parsed[3], intent)
    case "function":
      return "function(" + iJS.P.intercalate(", ", parsed[2]) + ") " + iJS.P.blockToCode(parsed[3], intent);
    default:
      error("unkown case " + parsed[0] + ": \n" + parsed);
  }
}

/* intercalates an array with a seperator
 * intercalate(" - ", ["a","b","c"]) = "a - b - c" */ 
iJS.P.intercalate = function (seperator, as) {
  result = "";
  for(i in as) {
    if(i > 0) result += seperator;
    result += as[i];
  }
  return result;
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
iJS.P.linesToCode = function (parsed, intent) {
  result = "";
  for(i = 0; i < parsed.length; i++) {
    result += iJS.P.toCode(parsed[i], intent);
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
iJS.P.blockToCode = function (parsed, intent) {
  result = "{\n";
  result += iJS.P.linesToCode(parsed, intent + 2)
  result += iJS.P.white(intent) + "}\n"
  return result;
}

/* additional intention of the code
 * this functions checks whether the intented code is a block statement
 * if so a { ... }-block is created otherwise the statement is only intended.
 */
iJS.P.intentCode = function (parsed, intent) {
  if(parsed[0] === "block") {
    return iJS.P.blockToCode(parsed[1], intent);
  } else {
    return "\n"+ iJS.P.toCode(parsed, intent + 2);
  }
}

/*****
 ***** END
 ***** parsed to pretty code converter
 *****/

/*****
 ***** find local variables
 *****
 *****/



/*****
 ***** END
 ***** find local variables
 *****/