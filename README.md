interactiveJS
===
interactiveJS is a interactive JS-script interpreter written in JS for debugging and learning propose.

Based on the parser of UglifyJS (https://github.com/mishoo/UglifyJS), thanks for the great work!

js code evaluation
===

basic evaluation
---

* (1) js code is parsed (into a parse-tree) with the parser of Uglify-js
* (2) all local variables are renamed to be unique in the parse-tree
* (3) than the parse-tree is decomposed into
  * a chuck (parse-tree) c_i for each function f_i found in the code
  * the main chuck c (parsed-tree) (the code without the function definitions)
* (4) a bottom-up,left-right evaluation of c is performed
  * whenever hitting a function f_i, all parameters of f_i are assigned
    (to the unique renamed local variables),then the chuck c_i is evaluated 
    bottom-up,left-right

interactive evaluation
---

instead of a simple evaluation a evaluation-tree is build ontop of the
parse-tree in (4).
  * each node v in the parse-tree get a parent node which contains
    * v
    * the evaluation of v based on the evaluation of the parts of v
      (this can be easily archived via the bottom-up,left-right evaluation)
      (note that this style of evaluation obmitts double-evaluation!
      and gives simular results as if use a simple js-eval instead)

now we step through the tree in bottom-up,left-right order to show
a simulation of the evaluation of the code. Also we can simulate a debugger
and show the variable assignments for each statement and expression.

install
===
* fork https://github.com/traeger/interactiveJS into a directory of your choice (here /interactiveJS).
* fork https://github.com/mishoo/UglifyJS into /interactiveJS/js/UglifyJS
  (such that uglify-js.js lies in /interactiveJS/js/UglifyJS/uglify-js.js)

License
===
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