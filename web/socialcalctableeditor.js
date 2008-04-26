//
// SocialCalcTableEditor
//
// The code module of the SocialCalc package that displays a scrolling grid with panes
// and handles keyboard and mouse I/O.
//
// (c) Copyright 2008 Socialtext, Inc.
// All Rights Reserved.
//

/*

LEGAL NOTICES REQUIRED BY THE COMMON PUBLIC ATTRIBUTION LICENSE:

EXHIBIT A. Common Public Attribution License Version 1.0.

The contents of this file are subject to the Common Public Attribution License Version 1.0 (the 
"License"); you may not use this file except in compliance with the License. You may obtain a copy 
of the License at http://socialcalc.org. The License is based on the Mozilla Public License Version 1.1 but 
Sections 14 and 15 have been added to cover use of software over a computer network and provide for 
limited attribution for the Original Developer. In addition, Exhibit A has been modified to be 
consistent with Exhibit B.

Software distributed under the License is distributed on an "AS IS" basis, WITHOUT WARRANTY OF ANY 
KIND, either express or implied. See the License for the specific language governing rights and 
limitations under the License.

The Original Code is SocialCalc JavaScript TableEditor.

The Original Developer is the Initial Developer.

The Initial Developer of the Original Code is Socialtext, Inc. All portions of the code written by 
Socialtext, Inc., are Copyright (c) Socialtext, Inc. All Rights Reserved.

Contributor: Dan Bricklin.


EXHIBIT B. Attribution Information

When the TableEditor is producing and/or controlling the display the Graphic Image must be
displayed on the screen visible to the user in a manner comparable to that in the 
Original Code. The Attribution Phrase must be displayed as a "tooltip" or "hover-text" for
that image. The image must be linked to the Attribution URL so as to access that page
when clicked. If the user interface includes a prominent "about" display which includes
factual prominent attribution in a form similar to that in the "about" display included
with the Original Code, including Socialtext copyright notices and URLs, then the image
need not be linked to the Attribution URL but the "tool-tip" is still required.

Attribution Copyright Notice:

 Copyright (C) 2008 Socialtext, Inc.
 All Rights Reserved.

Attribution Phrase (not exceeding 10 words): SocialCalc

Attribution URL: http://www.socialcalc.org/xoattrib

Graphic Image: The contents of the sc-logo.gif file in the Original Code or
a suitable replacement from http://www.socialcalc.org/licenses specified as
being for SocialCalc.

Display of Attribution Information is required in Larger Works which are defined 
in the CPAL as a work which combines Covered Code or portions thereof with code 
not governed by the terms of the CPAL.

*/

//
// Some of the other files in the SocialCalc package are licensed under
// different licenses. Please note the licenses of the modules you use.
//
// Code History:
//
// Initially coded by Dan Bricklin of Software Garden, Inc., for Socialtext, Inc.
// Based in part on the SocialCalc 1.1.0 code written in Perl.
// The SocialCalc 1.1.0 code was:
//    Portions (c) Copyright 2005, 2006, 2007 Software Garden, Inc.
//    All Rights Reserved.
//    Portions (c) Copyright 2007 Socialtext, Inc.
//    All Rights Reserved.
// The Perl SocialCalc started as modifications to the wikiCalc(R) program, version 1.0.
// wikiCalc 1.0 was written by Software Garden, Inc.
// Unless otherwise specified, referring to "SocialCalc" in comments refers to this
// JavaScript version of the code, not the SocialCalc Perl code.
//

/*

See the comments in the main SocialCalc code module file of the SocialCalc package.

*/

   var SocialCalc;
   if (!SocialCalc) {
      alert("Main SocialCalc code module needed");
      SocialCalc = {};
      }

// *************************************
//
// Table Editor class:
//
// *************************************

// Constructor:

SocialCalc.TableEditor = function(context) {

   // properties:

   this.context = context; // editing context
   this.toplevel = null; // top level HTML element for this table editor
   this.fullgrid = null; // rendered editing context

   this.width = null;
   this.tablewidth = null;
   this.height = null;
   this.tableheight = null;

   this.inputBox = null;
   this.verticaltablecontrol = null;
   this.horizontaltablecontrol = null;

   this.logo = null;

   // dynamic properties:

   this.timeout = null; // if non-null, timer id
   this.ensureecell = false; // if true, ensure ecell is visible after timeout

   this.gridposition = null; // screen coords of full grid
   this.headposition = null; // screen coords of upper left of grid within header rows
   this.firstscrollingrow = null; // row number of top row in last (the scrolling) pane
   this.firstscrollingrowtop = null;  // position of top row in last (the scrolling) pane
   this.lastnonscrollingrow = null; // row number of last displayed row in last non-scrolling
                                    // pane, or zero (for thumb position calculations)
   this.lastvisiblerow = null; // used for paging down
   this.firstscrollingcol = null; // column number of top col in last (the scrolling) pane
   this.firstscrollingcolleft = null;  // position of top col in last (the scrolling) pane
   this.lastnonscrollingcol = null; // col number of last displayed column in last non-scrolling
                                    // pane, or zero (for thumb position calculations)
   this.lastvisiblecol = null; // used for paging right

   this.rowpositions = []; // screen positions of the top of some rows
   this.colpositions = []; // screen positions of the left side of some rows
   this.rowheight = []; // size in pixels of each row when last checked, or null/undefined, for page up
   this.colwidth = []; // size in pixels of each column when last checked, or null/undefined, for page left

   this.ecell = null; // either null or {coord: c, row: r, col: c}
   this.state = "start"; // the keyboard states: see EditorProcessKey

   this.workingvalues = {}; // values used during keyboard editing, etc.

   // constants:

   this.imageprefix = "images/sc"; // URL prefix for images (e.g., "/images/sc")
   this.pageUpDnAmount = 15; // number of rows to move cursor on PgUp/PgDn keys

   // callbacks

   this.recalcFunction = function(editor) {
      if (editor.context.sheetobj.RecalcSheet) {
         editor.context.sheetobj.RecalcSheet();
         editor.EditorRenderSheet();
         editor.SchedulePositionCalculations();
         }
      else return null;
      }; // if present, function(editor) {...}

   this.MoveECellCallback = {}; // all values are called with editor as arg; add with unique name, delete when done
   this.RangeChangeCallback = {}; // all values are called with editor as arg; add with unique name, delete when done

   // set initial cursor

   this.ecell = {coord: "A1", row: 1, col: 1};
   context.highlights.hascursor = true;
   context.highlights[this.ecell.coord] = "cursor";

   // initialize range data
   // Range has at least hasrange (true/false).
   // It may also have: anchorcoord, anchorrow, anchorcol, top, bottom, left, and right.

   this.range = {hasrange: false};

   }

// Methods:

SocialCalc.TableEditor.prototype.CreateTableEditor = function(width, height) {return SocialCalc.CreateTableEditor(this, width, height);};

SocialCalc.TableEditor.prototype.SaveEditorSettings = function() {return SocialCalc.SaveEditorSettings(this);};
SocialCalc.TableEditor.prototype.LoadEditorSettings = function(str, flags) {return SocialCalc.LoadEditorSettings(this, str, flags);};

SocialCalc.TableEditor.prototype.EditorRenderSheet = function() {SocialCalc.EditorRenderSheet(this);};
SocialCalc.TableEditor.prototype.EditorMouseRegister = function() {return SocialCalc.EditorMouseRegister(this);};
SocialCalc.TableEditor.prototype.EditorMouseRange = function(coord) {return SocialCalc.EditorMouseRange(this, coord);};

SocialCalc.TableEditor.prototype.EditorProcessKey = function(ch, e) {return SocialCalc.EditorProcessKey(this, ch, e);};
SocialCalc.TableEditor.prototype.EditorSaveEdit = function() {return SocialCalc.EditorSaveEdit(this);};
SocialCalc.TableEditor.prototype.EditorApplySetCommandsToRange = function(cmdline, type) {return SocialCalc.EditorApplySetCommandsToRange(this, cmdline, type);};

SocialCalc.TableEditor.prototype.MoveECellWithKey = function(ch) {return SocialCalc.MoveECellWithKey(this, ch);};
SocialCalc.TableEditor.prototype.MoveECell = function(newcell) {return SocialCalc.MoveECell(this, newcell);};
SocialCalc.TableEditor.prototype.ReplaceCell = function(cell, row, col) {SocialCalc.ReplaceCell(this, cell, row, col);};
SocialCalc.TableEditor.prototype.UpdateCellCSS = function(cell, row, col) {SocialCalc.UpdateCellCSS(this, cell, row, col);};
SocialCalc.TableEditor.prototype.SetECellHeaders = function(selected) {SocialCalc.SetECellHeaders(this, selected);};
SocialCalc.TableEditor.prototype.EnsureECellVisible = function() {SocialCalc.EnsureECellVisible(this);};
SocialCalc.TableEditor.prototype.RangeAnchor = function(coord) {SocialCalc.RangeAnchor(this, coord);};
SocialCalc.TableEditor.prototype.RangeExtend = function(coord) {SocialCalc.RangeExtend(this, coord);};
SocialCalc.TableEditor.prototype.RangeRemove = function() {SocialCalc.RangeRemove(this);};

SocialCalc.TableEditor.prototype.FitToEditTable = function() {SocialCalc.FitToEditTable(this);};
SocialCalc.TableEditor.prototype.CalculateEditorPositions = function() {SocialCalc.CalculateEditorPositions(this);};
SocialCalc.TableEditor.prototype.SchedulePositionCalculations = function() {SocialCalc.SchedulePositionCalculations(this);};
SocialCalc.TableEditor.prototype.DoPositionCalculations = function() {SocialCalc.DoPositionCalculations(this);};
SocialCalc.TableEditor.prototype.CalculateRowPositions = function(panenum, result) {return SocialCalc.CalculateRowPositions(this,  panenum, result);};
SocialCalc.TableEditor.prototype.CalculateColPositions = function(panenum, result) {return SocialCalc.CalculateColPositions(this,  panenum, result);};

SocialCalc.TableEditor.prototype.ScrollRelative = function(vertical, amount) {SocialCalc.ScrollRelative(this, vertical, amount);};
SocialCalc.TableEditor.prototype.PageRelative = function(vertical, direction) {SocialCalc.PageRelative(this, vertical, direction);};
SocialCalc.TableEditor.prototype.LimitLastPanes = function() {SocialCalc.LimitLastPanes(this);};

SocialCalc.TableEditor.prototype.ScrollTableUpOneRow = function() {return SocialCalc.ScrollTableUpOneRow(this);};
SocialCalc.TableEditor.prototype.ScrollTableDownOneRow = function() {return SocialCalc.ScrollTableDownOneRow(this);};
SocialCalc.TableEditor.prototype.ScrollTableLeftOneCol = function() {return SocialCalc.ScrollTableLeftOneCol(this);};
SocialCalc.TableEditor.prototype.ScrollTableRightOneCol = function() {return SocialCalc.ScrollTableRightOneCol(this);};

// Functions:

SocialCalc.CreateTableEditor = function(editor, width, height) {

   editor.toplevel = document.createElement("div");
   editor.width = width;
   editor.height = height;

   editor.griddiv = document.createElement("div");
   editor.tablewidth = width-20; // !!!!! Should be parameterized, not a constant
   editor.tableheight = height-20;
   editor.griddiv.style.width=editor.tablewidth+"px";
   editor.griddiv.style.height=editor.tableheight+"px";
//   editor.driddiv.style.backgroundImage="url(grid3.gif)"; // a nice grid for debugging positioning code
   editor.griddiv.style.overflow="hidden";
   editor.griddiv.style.cursor="default";

   editor.FitToEditTable();
   editor.context.CalculateColWidthData();

   editor.EditorRenderSheet();

   editor.griddiv.appendChild(editor.fullgrid);

   editor.verticaltablecontrol = new SocialCalc.TableControl(editor, true, editor.tableheight);
   editor.verticaltablecontrol.CreateTableControl();

   editor.horizontaltablecontrol = new SocialCalc.TableControl(editor, false, editor.tablewidth);
   editor.horizontaltablecontrol.CreateTableControl();

   editor.inputBox = new SocialCalc.InputBox(editor);

   var table, tbody, tr, td, img, anchor;

   table = document.createElement("table");
   editor.layouttable = table;
   table.cellSpacing = 0;
   table.cellPadding = 0;

   tbody = document.createElement("tbody");
   table.appendChild(tbody);

   tr = document.createElement("tr");
   tbody.appendChild(tr);
   td = document.createElement("td");
   td.appendChild(editor.griddiv);
   tr.appendChild(td);
   td = document.createElement("td");
   td.appendChild(editor.verticaltablecontrol.main);
   tr.appendChild(td);

   tr = document.createElement("tr");
   tbody.appendChild(tr);
   td = document.createElement("td");
   td.appendChild(editor.horizontaltablecontrol.main);
   tr.appendChild(td);

   td = document.createElement("td"); // logo display: Required by CPAL License for this code!
   td.style.background="url("+editor.imageprefix+"-logo.gif) no-repeat center center";
   td.innerHTML = "<a href='' onclick='return false;'><img src='"+editor.imageprefix+"-1x1.gif' border='0' width='18' height='18'></a>";
   tr.appendChild(td);
   editor.logo = td;
   SocialCalc.TooltipRegister(td.firstChild.firstChild, "SocialCalc", null);

   editor.toplevel.appendChild(editor.layouttable);

   //!!!! problem: this doesn't let wheel events go to inputBox because it is inside toplevel...
   SocialCalc.MouseWheelRegister(editor.toplevel, {WheelMove: SocialCalc.EditorProcessMouseWheel, editor: editor});

   SocialCalc.KeyboardSetFocus(editor);

   return editor.toplevel;

   }

//
// str = SaveEditorSettings(editor)
//
// Returns a string representation of the pane settings, etc.
//
// The format is:
//
//    version:1.0
//    rowpane:panenumber:firstnum:lastnum
//    colpane:panenumber:firstnum:lastnum
//    ecell:coord -- if set
//    range:anchorcoord:top:bottom:left:right -- if set
//

SocialCalc.SaveEditorSettings = function(editor) {

   var i;
   var context = editor.context;
   var range = editor.range;
   var result = "";

   result += "version:1.0\n";

   for (i=0; i<context.rowpanes.length; i++) {
      result += "rowpane:"+i+":"+context.rowpanes[i].first+":"+context.rowpanes[i].last+"\n";
      }
   for (i=0; i<context.colpanes.length; i++) {
      result += "colpane:"+i+":"+context.colpanes[i].first+":"+context.colpanes[i].last+"\n";
      }

   if (editor.ecell) {
      result += "ecell:"+editor.ecell.coord+"\n";
      }

   if (range.hasrange) {
      result += "range:"+range.anchorcoord+":"+range.top+":"+range.bottom+":"+range.left+":"+range.right+"\n";
      }

   return result;

   }

//
// LoadEditorSettings(editor, str, flags)
//
// Sets the editor settings based on str.
//
//

SocialCalc.LoadEditorSettings = function(editor, str, flags) {

   var lines=str.split(/\r\n|\n/);
   var parts=[];
   var line, i, cr, row, col, coord;
   var context = editor.context;
   var highlights, range;

   context.rowpanes = [{first: 1, last: 1}]; // reset to start
   context.colpanes = [{first: 1, last: 1}];
   editor.ecell = null;
   editor.range = {hasrange: false};
   range = editor.range;
   context.highlights = {};
   highlights = context.highlights;
   highlights.hascursor = null;

   for (i=0; i<lines.length; i++) {
      line=lines[i];
      parts = line.split(":");
      switch (parts[0]) {
         case "version":
            break;

         case "rowpane":
            context.rowpanes[parts[1]-0] = {first: parts[2]-0, last: parts[3]-0};
            break;

         case "colpane":
            context.colpanes[parts[1]-0] = {first: parts[2]-0, last: parts[3]-0};
            break;

         case "ecell":
            editor.ecell = SocialCalc.coordToCr(parts[1]);
            editor.ecell.coord = parts[1];
            highlights.hascursor = true;
            highlights[parts[1]] = "cursor";
            break;

         case "range":
            range.hasrange = true;
            range.anchorcoord = parts[1];
            cr = SocialCalc.coordToCr(range.anchorcoord);
            range.anchorrow = cr.row;
            range.anchorcol = cr.col;
            range.top = parts[2]-0;
            range.bottom = parts[3]-0;
            range.left = parts[4]-0;
            range.right = parts[5]-0;
            for (row=range.top; row<=range.bottom; row++) {
               for (col=range.left; col<=range.right; col++) {
                  coord = SocialCalc.crToCoord(col, row);
                  if (highlights[coord]!="cursor") {
                     highlights[coord] = "range";
                     }
                  }
               }
            break;
         }
      }

   return;

   }

//
// EditorRenderSheet(editor)
//
// Renders the sheet and updates editor.fullgrid.
// Sets event handlers.
//

SocialCalc.EditorRenderSheet = function(editor) {

   editor.fullgrid = editor.context.RenderSheet(editor.fullgrid);
   if (editor.ecell) editor.SetECellHeaders("selected");

   editor.EditorMouseRegister();

   }

SocialCalc.EditorMouseInfo = {

   // The registeredElements array is used to identify editor grid in which the mouse is doing things.

   // One item for each active editor, each an object with:
   //    .element, .editor

   registeredElements: [],

   editor: null, // editor being processed (between mousedown and mouseup)
   element: null, // element being processed

   mousedowncoord: "", // coord where mouse went down for drag range
   mouselastcoord: "" // coord where mouse last was during drag

   }

//
// EditorMouseRegister(editor)
//

SocialCalc.EditorMouseRegister = function(editor) {

   var mouseinfo = SocialCalc.EditorMouseInfo;
   var element = editor.fullgrid;
   var i;

   for (i=0; i<mouseinfo.registeredElements.length; i++) {
      if (mouseinfo.registeredElements[i].editor == editor) {
         break;
         }
      }

   if (i<mouseinfo.registeredElements.length) {
      mouseinfo.registeredElements[i].element = element;
      }
   else {
      mouseinfo.registeredElements.push({element: element, editor: editor});
      }

   if (element.addEventListener) { // DOM Level 2 -- Firefox, et al
      element.addEventListener("mousedown", SocialCalc.ProcessEditorMouseDown, false);
      element.addEventListener("dblclick", SocialCalc.ProcessEditorDblClick, false);
      }
   else if (element.attachEvent) { // IE 5+
      element.attachEvent("onmousedown", SocialCalc.ProcessEditorMouseDown);
      element.attachEvent("ondblclick", SocialCalc.ProcessEditorDblClick);
      }
   else { // don't handle this
      throw "Browser not supported";
      }

   return;

   }

SocialCalc.ProcessEditorMouseDown = function(e) {

   var editor, result, coord, textarea, wval, range;

   var event = e || window.event;

   var viewport = SocialCalc.GetViewportInfo();
   var clientX = event.clientX + viewport.horizontalScroll;
   var clientY = event.clientY + viewport.verticalScroll;

   var mouseinfo = SocialCalc.EditorMouseInfo;
   var ele = event.target || event.srcElement; // source object is often within what we want
   var mobj;

   for (mobj=null; !mobj && ele; ele=ele.parentNode) { // go up tree looking for one of our elements
      mobj = SocialCalc.LookupElement(ele, mouseinfo.registeredElements);
      }
   if (!mobj) {
      mouseinfo.editor = null;
      return; // not one of our elements
      }

   editor = mobj.editor;
   mouseinfo.editor = editor; // remember for later
   mouseinfo.element = ele;
   range = editor.range;
   result = SocialCalc.GridMousePosition(editor, clientX, clientY);
   coord = editor.context.cellskip[SocialCalc.crToCoord(result.col, result.row)];
   if (coord) {
      result.coord = coord;
      result.row = editor.context.coordToCR[coord].row;
      result.col = editor.context.coordToCR[coord].col;
      }

   if (!result.coord || result.rowheader || result.colheader) return; // not on a cell

   if (!range.hasrange) {
      if (e.shiftKey)
         editor.RangeAnchor();
      }

   coord = editor.MoveECell(result.coord);

   if (range.hasrange) {
      if (e.shiftKey)
         editor.RangeExtend();
      else
         editor.RangeRemove();
      }

   mouseinfo.mousedowncoord = coord; // remember if starting drag range select
   mouseinfo.mouselastcoord = coord;

   editor.EditorMouseRange(coord);

   SocialCalc.KeyboardSetFocus(editor);

   // Event code from JavaScript, Flanagan, 5th Edition, pg. 422
   if (ele.addEventListener) { // DOM Level 2 -- Firefox, et al
      ele.addEventListener("mousemove", SocialCalc.ProcessEditorMouseMove, true); // capture everywhere
      ele.addEventListener("mouseup", SocialCalc.ProcessEditorMouseUp, true); // capture everywhere
      }
   else if (ele.attachEvent) { // IE 5+
      ele.setCapture();
      ele.attachEvent("onmousemove", SocialCalc.ProcessEditorMouseMove);
      ele.attachEvent("onmouseup", SocialCalc.ProcessEditorMouseUp);
      ele.attachEvent("onlosecapture", SocialCalc.ProcessEditorMouseUp);
      }
   if (event.stopPropagation) event.stopPropagation(); // DOM Level 2
   else event.cancelBubble = true; // IE 5+
   if (event.preventDefault) event.preventDefault(); // DOM Level 2
   else event.returnValue = false; // IE 5+

   return;

   }

SocialCalc.EditorMouseRange = function(editor, coord) {

   var textarea, wval;
   var range = editor.range;

   if (editor.state == "input") { // editing a cell
      textarea = editor.inputBox.textarea;
      wval = editor.workingvalues;
      if (("(+-*/,:!&<>=^".indexOf(textarea.value.slice(-1))>=0 && textarea.value.slice(0,1)=="=") ||
          (textarea.value == "=")) {
         wval.partialexpr = textarea.value;
         }

      if (wval.partialexpr) { // if in pointing operation
         if (coord) {
            if (range.hasrange) {
               textarea.value = wval.partialexpr + SocialCalc.crToCoord(range.left, range.top) + ":" +
                  SocialCalc.crToCoord(range.right, range.bottom);
               }
            else {
               textarea.value = wval.partialexpr + coord;
               }
            }
         }
      else { // not in point -- done editing
         textarea.blur();
         editor.inputBox.ShowInputBox(false);
         editor.state = "start";
         editor.EditorSaveEdit();
         }
      }
   }

SocialCalc.ProcessEditorMouseMove = function(e) {

   var editor, element, result, coord, now, textarea, sheetobj, cellobj, wval;

   var event = e || window.event;

   var viewport = SocialCalc.GetViewportInfo();
   var clientX = event.clientX + viewport.horizontalScroll;
   var clientY = event.clientY + viewport.verticalScroll;

   var mouseinfo = SocialCalc.EditorMouseInfo;
   editor = mouseinfo.editor;
   if (!editor) return; // not us, ignore
   element = mouseinfo.element;

   result = SocialCalc.GridMousePosition(editor, clientX, clientY); // get cell with click
   coord = editor.context.cellskip[SocialCalc.crToCoord(result.col, result.row)];
   if (coord) result.coord = coord;

   if (result.coord!=mouseinfo.mouselastcoord) {
      if (!e.shiftKey && !editor.range.hasrange) {
         editor.RangeAnchor(mouseinfo.mousedowncoord);
         }
      editor.MoveECell(result.coord);
      editor.RangeExtend();
      }
   mouseinfo.mouselastcoord = result.coord;

   editor.EditorMouseRange(result.coord);

   if (event.stopPropagation) event.stopPropagation(); // DOM Level 2
   else event.cancelBubble = true; // IE 5+
   if (event.preventDefault) event.preventDefault(); // DOM Level 2
   else event.returnValue = false; // IE 5+

   return;

   }


SocialCalc.ProcessEditorMouseUp = function(e) {

   var editor, element, result, coord, now, textarea, sheetobj, cellobj, wval;

   var event = e || window.event;

   var viewport = SocialCalc.GetViewportInfo();
   var clientX = event.clientX + viewport.horizontalScroll;
   var clientY = event.clientY + viewport.verticalScroll;

   var mouseinfo = SocialCalc.EditorMouseInfo;
   editor = mouseinfo.editor;
   if (!editor) return; // not us, ignore
   element = mouseinfo.element;

   result = SocialCalc.GridMousePosition(editor, clientX, clientY); // get cell with click
   coord = editor.context.cellskip[SocialCalc.crToCoord(result.col, result.row)];
   if (coord) result.coord = coord;

   if (editor.range.hasrange) {
      editor.MoveECell(result.coord);
      editor.RangeExtend();
      }
   else if (result.coord && result.coord!=mouseinfo.mousedowncoord) {
      editor.RangeAnchor(mouseinfo.mousedowncoord);
      editor.MoveECell(result.coord);
      editor.RangeExtend();
      }

   editor.EditorMouseRange(result.coord);

   if (event.stopPropagation) event.stopPropagation(); // DOM Level 2
   else event.cancelBubble = true; // IE 5+
   if (event.preventDefault) event.preventDefault(); // DOM Level 2
   else event.returnValue = false; // IE 5+

   if (element.removeEventListener) { // DOM Level 2
      element.removeEventListener("mousemove", SocialCalc.ProcessEditorMouseMove, true);
      element.removeEventListener("mouseup", SocialCalc.ProcessEditorMouseUp, true);
      }
   else if (element.detachEvent) { // IE
      element.detachEvent("onlosecapture", SocialCalc.ProcessEditorMouseUp);
      element.detachEvent("onmouseup", SocialCalc.ProcessEditorMouseUp);
      element.detachEvent("onmousemove", SocialCalc.ProcessEditorMouseMove);
      element.releaseCapture();
      }

   return;

   }


SocialCalc.ProcessEditorDblClick = function(e) {

   var editor, result, coord, textarea, wval, range;

   var event = e || window.event;

   var viewport = SocialCalc.GetViewportInfo();
   var clientX = event.clientX + viewport.horizontalScroll;
   var clientY = event.clientY + viewport.verticalScroll;

   var mouseinfo = SocialCalc.EditorMouseInfo;
   var ele = event.target || event.srcElement; // source object is often within what we want
   var mobj;

   for (mobj=null; !mobj && ele; ele=ele.parentNode) { // go up tree looking for one of our elements
      mobj = SocialCalc.LookupElement(ele, mouseinfo.registeredElements);
      }
   if (!mobj) {
      mouseinfo.editor = null;
      return; // not one of our elements
      }

   editor = mobj.editor;
   mouseinfo.editor = editor; // remember for later
   mouseinfo.element = ele;
   range = editor.range;

   textarea = editor.inputBox.textarea;
   sheetobj = editor.context.sheetobj;

   switch (editor.state) {
      case "start":
         if (!editor.ecell) return true; // no ecell
         editor.state = "input";
         editor.inputBox.ShowInputBox(true);
         textarea.focus();
         cellobj = sheetobj.cells[editor.ecell.coord];
         textarea.value = "";
         if (cellobj) {
            switch (cellobj.datatype) {
               case "v":
                  textarea.value = cellobj.datavalue+"";
                  break;
               case "t":
                  textarea.value = "'"+cellobj.datavalue;
                  break;
               case "f":
                  textarea.value = "="+cellobj.formula;
                  break;
               case "c":
                  textarea.value = cellobj.formula;
                  break;
               }
            }
         if (textarea.selectionStart!=undefined) {
            textarea.selectionStart=textarea.value.length;
            textarea.selectionEnd=textarea.value.length;
            }
         wval = editor.workingvalues;
         wval.partialexpr = "";
         wval.ecoord = editor.ecell.coord;
         wval.erow = editor.ecell.row;
         wval.ecol = editor.ecell.col;
         break;

      case "input":
         break;

      default:
         break;
      }

   if (event.stopPropagation) event.stopPropagation(); // DOM Level 2
   else event.cancelBubble = true; // IE 5+
   if (event.preventDefault) event.preventDefault(); // DOM Level 2
   else event.returnValue = false; // IE 5+

   return;

   }


SocialCalc.EditorProcessKey = function(editor, ch, e) {

   var result, cell, cellobj, valueinfo, fch, coord;

   var textarea = editor.inputBox.textarea;
   var sheetobj = editor.context.sheetobj;
   var wval = editor.workingvalues;
   var range = editor.range;

   switch (editor.state) {
      case "start":
         if (e.shiftKey && ch.substr(0,2)=="[a") {
            ch = ch + "shifted";
            }
         if (ch=="[enter]") ch = "[adown]";
         if (ch=="[tab]") ch = e.shiftKey ? "[aleft]" : "[aright]";
         if (ch.substr(0,2)=="[a" || ch.substr(0,3)=="[pg" || ch=="[home]") {
            result = editor.MoveECellWithKey(ch);
            return !result;
            }
         if (ch=="[del]") {
            editor.EditorApplySetCommandsToRange("empty", "");
            break;
            }
         if (ch=="[esc]") {
            if (range.hasrange) {
               editor.RangeRemove();
               editor.MoveECell(range.anchorcoord);
               }
            return false;
            }
         if (ch.substr(0,1)=="[") return true; // some control key
         if (!editor.ecell) return true; // no ecell
         editor.state = "input";
         editor.inputBox.ShowInputBox(true);
         textarea.focus();
         textarea.value = ch;
         if (textarea.selectionStart!=undefined) {
            textarea.selectionStart=textarea.value.length;
            textarea.selectionEnd=textarea.value.length;
            }
         wval.partialexpr = "";
         wval.ecoord = editor.ecell.coord;
         wval.erow = editor.ecell.row;
         wval.ecol = editor.ecell.col;
         editor.RangeRemove();
         break;

      case "input":
         if (ch=="[esc]" || ch=="[enter]" || ch=="[tab]" || (ch && ch.substr(0,2)=="[a")) {
            if (("(+-*/,:!&<>=^".indexOf(textarea.value.slice(-1))>=0 && textarea.value.slice(0,1)=="=") ||
                (textarea.value == "=")) {
               wval.partialexpr = textarea.value;
               }
            if (wval.partialexpr) { // if in pointing operation
               if (e.shiftKey && ch.substr(0,2)=="[a") {
                  ch = ch + "shifted";
                  }
               coord = editor.MoveECellWithKey(ch);
               if (coord) {
                  if (range.hasrange) {
                     textarea.value = wval.partialexpr + SocialCalc.crToCoord(range.left, range.top) + ":" +
                        SocialCalc.crToCoord(range.right, range.bottom);
                     }
                  else {
                     textarea.value = wval.partialexpr + coord;
                     }
                  return false;
                  }
               }
            textarea.blur();
            editor.inputBox.ShowInputBox(false);
            editor.state = "start";
            if (ch != "[esc]") {
               editor.EditorSaveEdit();
               if (editor.ecell.coord != wval.ecoord) {
                  editor.MoveECell(wval.ecoord);
                  }
               if (ch=="[enter]") ch = "[adown]";
               if (ch=="[tab]") ch = e.shiftKey ? "[aleft]" : "[aright]";
               if (ch.substr(0,2)=="[a") {
                  editor.MoveECellWithKey(ch);
                  }
               }
            else {
               editor.RangeRemove();
               editor.MoveECell(wval.ecoord);
               }
            break;
            }
         if (wval.partialexpr && ch=="[backspace]") {
            textarea.value = wval.partialexpr;
            wval.partialexpr = "";
            editor.RangeRemove();
            editor.MoveECell(wval.ecoord);
            return false;
            }
         if (range.hasrange) {
            editor.RangeRemove();
            }
         editor.MoveECell(wval.ecoord);
         wval.partialexpr = ""; // not pointing
         return true;

      default:
         return true;
      }

   return false;

   }

SocialCalc.EditorSaveEdit = function(editor) {

   var result, cell, valueinfo, fch, type, value, cmdline, errortext;

   var textarea = editor.inputBox.textarea;
   var sheetobj = editor.context.sheetobj;
   var wval = editor.workingvalues;

   type = "text t";
   value = textarea.value;
   fch = value.charAt(0);
   if (fch=="=" && value.indexOf("\n")==-1) {
      type = "formula";
      value = value.substring(1);
      }
   else if (fch=="'") {
      type = "text t";
      value = value.substring(1);
      }
   else if (value.length==0) {
      type = "empty";
      }
   else {
      valueinfo = SocialCalc.DetermineValueType(value)
      if (valueinfo.type=="n" && textarea.value==(valueinfo.value+"")) { // see if don't need "constant"
         type = "value n";
         }
      else if (valueinfo.type=="t") {
         type = "text t";
         }
      else if (valueinfo.type=="") {
         type = "text t";
         }
      else {
         type = "constant "+valueinfo.type+" "+valueinfo.value;
         }
      }

   cmdline = "set "+wval.ecoord+" "+type+" "+value;
   errortext = sheetobj.ExecuteSheetCommand(cmdline, true);
/*!!!*/   if (errortext) alert(errortext);

   cell=SocialCalc.GetEditorCellElement(editor, wval.erow, wval.ecol);
   editor.ReplaceCell(cell, wval.erow, wval.ecol);
   editor.SchedulePositionCalculations();
   if (sheetobj.attribs.needsrecalc && editor.recalcFunction) editor.recalcFunction(editor);

   }

//
// SocialCalc.EditorApplySetCommandsToRange(editor, cmd)
//
// Takes ecell or range and does a "set" command with cmd.
//

SocialCalc.EditorApplySetCommandsToRange = function(editor, cmd) {

   var cell, row, col, line, errortext;

   var sheetobj = editor.context.sheetobj;
   var ecell = editor.ecell;
   var range = editor.range;

   if (range.hasrange) {
      coord = SocialCalc.crToCoord(range.left, range.top)+":"+SocialCalc.crToCoord(range.right, range.bottom);
      line = "set "+coord+" "+cmd;
      errortext = sheetobj.ExecuteSheetCommand(line, true);
      for (row=range.top; row<=range.bottom; row++) {
         for (col=range.left; col<=range.right; col++) {
            cell=SocialCalc.GetEditorCellElement(editor, row, col);
            editor.ReplaceCell(cell, row, col);
            }
         }
      }
   else {
      line = "set "+ecell.coord+" "+cmd;
      errortext = sheetobj.ExecuteSheetCommand(line, true);
      cell=SocialCalc.GetEditorCellElement(editor, ecell.row, ecell.col);
      editor.ReplaceCell(cell, ecell.row, ecell.col);
      }
   editor.SchedulePositionCalculations();
   if (sheetobj.attribs.needsrecalc && editor.recalcFunction) editor.recalcFunction(editor);

   }

SocialCalc.EditorProcessMouseWheel = function(event, delta, mousewheelinfo, wobj) {

   if (delta > 0) {
      wobj.functionobj.editor.ScrollRelative(true, -1);
      }
   if (delta < 0) {
      wobj.functionobj.editor.ScrollRelative(true, +1);
      }

   }

//
// GridMousePosition(editor, clientX, clientY)
//
// Returns an object with row and col numbers and coord (spans handled for coords),
// and rowheader/colheader true if in header (where coord will be undefined).
//

SocialCalc.GridMousePosition = function(editor, clientX, clientY) { 

   var row, col;
   var result = {};

   for (row=1; row<editor.rowpositions.length; row++) {
      if (!editor.rowheight[row]) continue; // not rendered yet -- may be above or below us
      if (editor.rowpositions[row]+editor.rowheight[row]>clientY) {
         break;
         }
      }
   for (col=1; col<editor.colpositions.length; col++) {
      if (!editor.colwidth[col]) continue;
      if (editor.colpositions[col]+editor.colwidth[col]>clientX) {
         break;
         }
      }

   result.row = row;
   result.col = col;

   if (editor.headposition) {
      if (clientX < editor.headposition.left) {
         result.rowheader = true;
         }
      else if (clientY < editor.headposition.top) {
         result.colheader = true;
         }
      else {
         result.coord = SocialCalc.crToCoord(result.col, result.row);
         }
      }

   if (editor.context.cellskip[result.coord]) { // handle skipped cells
      result.coord = editor.context.cellskip[result.coord];
      }

   return result;

}

//
// GetEditorCellElement(editor, row, col)
//
// Returns an object with element, the table cell element in the DOM that corresponds to row and column,
// as well as rowpane and colpane, the panes with the cell.
// If no such element, then returns null;
//

SocialCalc.GetEditorCellElement = function(editor, row, col) {

   var rowpane, colpane, c, coord;
   var rowindex = 0;
   var colindex = 0;

   for (rowpane=0; rowpane<editor.context.rowpanes.length; rowpane++) {
      if (row >= editor.context.rowpanes[rowpane].first && row <= editor.context.rowpanes[rowpane].last) {
         for (colpane=0; colpane<editor.context.colpanes.length; colpane++) {
            if (col >= editor.context.colpanes[colpane].first && col <= editor.context.colpanes[colpane].last) {
               rowindex += row - editor.context.rowpanes[rowpane].first + 2;
               for (c=editor.context.colpanes[colpane].first; c<=col; c++) {
                  coord=editor.context.cellskip[SocialCalc.crToCoord(c,row)];
                  if (!coord || !editor.context.CoordInPane(coord, rowpane, colpane)) // don't count col-spanned cells
                     colindex++;
                  }
               return {
                  element: editor.griddiv.firstChild.lastChild.childNodes[rowindex].childNodes[colindex],
                  rowpane: rowpane, colpane: colpane};
               }
            for (c=editor.context.colpanes[colpane].first; c<=editor.context.colpanes[colpane].last; c++) {
               coord=editor.context.cellskip[SocialCalc.crToCoord(c,row)];
               if (!coord || !editor.context.CoordInPane(coord, rowpane, colpane)) // don't count col-spanned cells
                  colindex++;
               }
            colindex += 1;
            }
         }
      rowindex += editor.context.rowpanes[rowpane].last - editor.context.rowpanes[rowpane].first + 1 + 1;
      }

   return null;
}

//
// cellcoord = MoveECellWithKey(editor, ch)
//
// Processes an arrow key, etc., moving the edit cell.
// If not a movement key, returns null.
//

SocialCalc.MoveECellWithKey = function(editor, ch) {

   var coord, row, col, cell;
   var shifted = false;

   if (!editor.ecell) {
      return null;
      }

   if (ch.slice(-7)=="shifted") {
      ch = ch.slice(0,-7);
      shifted = true;
      }

   row = editor.ecell.row;
   col = editor.ecell.col;
   cell = editor.context.sheetobj.cells[editor.ecell.coord];

   switch (ch) {
      case "[adown]":
         row += (cell && cell.rowspan) || 1;
         break;
      case "[aup]":
         row--;
         break;
      case "[pgdn]":
         row += editor.pageUpDnAmount + ((cell && cell.rowspan) || 1);
         break;
      case "[pgup]":
         row -= editor.pageUpDnAmount;
         break;
      case "[aright]":
         col += (cell && cell.colspan) || 1;
         break;
      case "[aleft]":
         col--;
         break;
      case "[home]":
         row = 1;
         col = 1;
         break;
      default:
         return null;
      }

   if (!editor.range.hasrange) {
      if (shifted)
         editor.RangeAnchor();
      }

   coord = editor.MoveECell(SocialCalc.crToCoord(col, row));

   if (editor.range.hasrange) {
      if (shifted)
         editor.RangeExtend();
      else
         editor.RangeRemove();
      }

   return coord;

   }

//
// cellcoord = MoveECell(editor, newecell)
//
// Takes a coordinate and returns the new edit cell coordinate (which may be
// different if newecell is covered by a span).
//

SocialCalc.MoveECell = function(editor, newcell) {

   var cell, f;

   var highlights = editor.context.highlights;

   if (editor.ecell) {
      if (editor.ecell.coord==newcell) return newcell;
      cell=SocialCalc.GetEditorCellElement(editor, editor.ecell.row, editor.ecell.col);
      highlights.hascursor = false;
      delete highlights[editor.ecell.coord];
      editor.UpdateCellCSS(cell, editor.ecell.row, editor.ecell.col);
      editor.SetECellHeaders(""); // set to regular col/rowname styles
      }
   newcell = editor.context.cellskip[newcell] || newcell;
   editor.ecell = SocialCalc.coordToCr(newcell);
   editor.ecell.coord = newcell;
   cell=SocialCalc.GetEditorCellElement(editor, editor.ecell.row, editor.ecell.col);
   highlights.hascursor = true;
   highlights[newcell] = "cursor";
   editor.UpdateCellCSS(cell, editor.ecell.row, editor.ecell.col);
   editor.SetECellHeaders("selected");

   if (editor.timeout) {
      editor.ensureecell = true; // wait for timeout
      }
   else {
      editor.EnsureECellVisible();
      }

   for (f in editor.MoveECellCallback) { // let others know
      editor.MoveECellCallback[f](editor);
      }

   return newcell;

   }

SocialCalc.EnsureECellVisible = function(editor) {

   var amount = 0;
   if (editor.ecell.row > editor.lastnonscrollingrow) {
      if (editor.ecell.row < editor.firstscrollingrow) {
         amount = editor.ecell.row - editor.firstscrollingrow;
         }
      else if (editor.ecell.row > editor.lastvisiblerow) {
         amount = editor.ecell.row - editor.lastvisiblerow;
         }
      if (amount!=0) editor.ScrollRelative(true, amount);
      }   
   amount = 0;
   if (editor.ecell.col > editor.lastnonscrollingcol) {
      if (editor.ecell.col < editor.firstscrollingcol) {
         amount = editor.ecell.col - editor.firstscrollingcol;
         }
      else if (editor.ecell.col > editor.lastvisiblecol) {
         amount = editor.ecell.col- editor.lastvisiblecol;
         }
      if (amount!=0) editor.ScrollRelative(false, amount);
      }

   }

SocialCalc.ReplaceCell = function(editor, cell, row, col) {

   var newelement, a;
   if (!cell) return;
   newelement = editor.context.RenderCell(row, col, cell.rowpane, cell.colpane, true, null);
   if (newelement) {
      // Don't use a real element and replaceChild, which seems to have focus issues with IE, Firefox, and speed issues
      cell.element.innerHTML = newelement.innerHTML;
      cell.element.style.cssText = ""; //!!! = newelement.style.cssText;
      cell.element.className = newelement.style.className;
      for (a in newelement.style) {
         if (newelement.style[a]!="cssText")
            cell.element.style[a] = newelement.style[a];
         }
      }
   }


SocialCalc.UpdateCellCSS = function(editor, cell, row, col) {

   var newelement, a;
   if (!cell) return;
   newelement = editor.context.RenderCell(row, col, cell.rowpane, cell.colpane, true, null);
   if (newelement) {
      cell.element.style.cssText = "";
      cell.element.className = newelement.style.className;
      for (a in newelement.style) {
         if (newelement.style[a]!="cssText")
            cell.element.style[a] = newelement.style[a];
         }
      }
   }


SocialCalc.SetECellHeaders = function(editor, selected) {

   var ecell = editor.ecell;
   var context = editor.context;

   var rowpane, colpane, first, last;
   var rowindex = 0;
   var colindex = 0;
   var headercell;

   if (!ecell) return;

   for (rowpane=0; rowpane<context.rowpanes.length; rowpane++) {
      first = context.rowpanes[rowpane].first;
      last = context.rowpanes[rowpane].last;
      if (ecell.row >= first && ecell.row <= last) {
         headercell = editor.fullgrid.childNodes[1].childNodes[2+rowindex+ecell.row-first].childNodes[0];
         if (headercell) {
            if (context.classnames) headercell.className=context.classnames[selected+"rowname"];
            if (context.explicitStyles) headercell.style.cssText=context.explicitStyles[selected+"rowname"];
            }
         }
      rowindex += last - first + 1 + 1;
      }

   for (colpane=0; colpane<context.colpanes.length; colpane++) {
      first = context.colpanes[colpane].first;
      last = context.colpanes[colpane].last;
      if (ecell.col >= first && ecell.col <= last) {
         headercell = editor.fullgrid.childNodes[1].childNodes[1].childNodes[1+colindex+ecell.col-first];
         if (headercell) {
            if (context.classnames) headercell.className=context.classnames[selected+"colname"];
            if (context.explicitStyles) headercell.style.cssText=context.explicitStyles[selected+"colname"];
            }
         }
      colindex += last - first + 1 + 1;
      }
   }

//
// RangeAnchor(editor, ecoord)
//
// Sets the anchor of a range to ecoord (or ecell if missing).
//

SocialCalc.RangeAnchor = function(editor, ecoord) {

   if (editor.range.hasrange) {
      editor.RangeRemove();
      }

   editor.RangeExtend(ecoord);

   }

//
// RangeExtend(editor, ecoord)
//
// Sets the other corner of the range to ecoord or, if missing, ecell.
//

SocialCalc.RangeExtend = function(editor, ecoord) {

   var a, cell, cr, coord, row, col, f;

   var highlights = editor.context.highlights;
   var range = editor.range;
   var ecell;
   if (ecoord) {
      ecell = SocialCalc.coordToCr(ecoord);
      ecell.coord = ecoord;
      }
   else ecell = editor.ecell;

   if (!ecell) return; // just in case

   if (!range.hasrange) { // called without RangeAnchor...
      range.anchorcoord = ecell.coord;
      range.anchorrow = ecell.row;
      range.top = ecell.row;
      range.bottom = ecell.row;
      range.anchorcol = ecell.col;
      range.left = ecell.col;
      range.right = ecell.col;
      range.hasrange = true;
      }

   if (range.anchorrow < ecell.row) {
      range.top = range.anchorrow;
      range.bottom = ecell.row;
      }
   else {
      range.top = ecell.row;
      range.bottom = range.anchorrow;
      }
   if (range.anchorcol < ecell.col) {
      range.left = range.anchorcol;
      range.right = ecell.col;
      }
   else {
      range.left = ecell.col;
      range.right = range.anchorcol;
      }

   for (coord in highlights) {
      if (highlights[coord]=="range")
         highlights[coord] = "unrange";
      }

   for (row=range.top; row<=range.bottom; row++) {
      for (col=range.left; col<=range.right; col++) {
         coord = SocialCalc.crToCoord(col, row);
         if (highlights[coord]!="cursor") {
            if (highlights[coord]=="unrange")
               highlights[coord] = "range";
            else
               highlights[coord] = "newrange";
            }
         }
      }

   for (coord in highlights) {

      switch (highlights[coord]) {
         case "unrange":
            delete highlights[coord];
            break;
         case "newrange":
            highlights[coord] = "range";
            break;
         case "range":
         case "cursor":
            continue;
         }

      cr = SocialCalc.coordToCr(coord);
      cell = SocialCalc.GetEditorCellElement(editor, cr.row, cr.col);
      editor.UpdateCellCSS(cell, cr.row, cr.col);

      }

   for (f in editor.RangeChangeCallback) { // let others know
      editor.RangeChangeCallback[f](editor);
      }

   return;

   }

//
// RangeRemove(editor)
//
// Turns off the range.
//

SocialCalc.RangeRemove = function(editor) {

   var cell, cr, coord, row, col, f;

   var highlights = editor.context.highlights;
   var range = editor.range;

   if (!range.hasrange) return;

   for (coord in highlights) {
      switch (highlights[coord]) {
         case "range":
            delete highlights[coord];
            break;
         case "cursor":
            continue;
         }
      cr = SocialCalc.coordToCr(coord);
      cell=SocialCalc.GetEditorCellElement(editor, cr.row, cr.col);
      editor.UpdateCellCSS(cell, cr.row, cr.col);
      }

   range.hasrange = false;

   for (f in editor.RangeChangeCallback) { // let others know
      editor.RangeChangeCallback[f](editor);
      }

   return;

   }

//
// FitToEditTable(editor)
//
// Figure out (through column width declarations and approximation of pixels per row)
// how many rendered rows and columns you need to be at least a little larger than
// the editor's editing area.
//

SocialCalc.FitToEditTable = function(editor) {

   var colnum, colname, colwidth, totalwidth, totalrows, rowpane, needed;

   var context=editor.context;
   var sheetobj=context.sheetobj;
   var sheetcolattribs=sheetobj.colattribs;

   // Calculate column width data

   totalwidth=context.showRCHeaders ? context.rownamewidth-0 : 0;
   for (colpane=0; colpane<context.colpanes.length-1; colpane++) { // Get width of all but last pane
      for (colnum=context.colpanes[colpane].first; colnum<=context.colpanes[colpane].last; colnum++) {
         colname=SocialCalc.rcColname(colnum);
         colwidth = sheetobj.colattribs.width[colname] || sheetobj.attribs.defaultcolwidth || SocialCalc.defaultvalues.defaultcolwidth;
         if (colwidth=="blank" || colwidth=="auto") colwidth="";
         totalwidth+=colwidth ? (colwidth-0) : 10;
         }
      }

   for (colnum=context.colpanes[colpane].first; colnum<=10000; colnum++) { //!!! max for safety, but makes that col max!!!
      colname=SocialCalc.rcColname(colnum);
      colwidth = sheetobj.colattribs.width[colname] || sheetobj.attribs.defaultcolwidth || SocialCalc.defaultvalues.defaultcolwidth;
      if (colwidth=="blank" || colwidth=="auto") colwidth="";
      totalwidth+=colwidth ? (colwidth-0) : 10;
      if (totalwidth > editor.tablewidth) break;
      }

   context.colpanes[colpane].last = colnum;

   // Calculate row height data

   totalrows=context.showRCHeaders ? 1 : 0;
   for (rowpane=0; rowpane<context.rowpanes.length-1; rowpane++) { // count all panes but last one
      totalrows += context.rowpanes[rowpane].last - context.rowpanes[rowpane].first + 1;
      }

   needed = editor.tableheight - totalrows * context.pixelsPerRow; // estimate amount needed

   context.rowpanes[rowpane].last = context.rowpanes[rowpane].first + Math.floor(needed / context.pixelsPerRow) + 1;

   }

//
// CalculateEditorPositions(editor)
//
// Calculate the screen positions and other values of various editing elements
// These values change and need to be recomputed when the pane first/last or cell contents change,
// as well as new column widths, etc.
//
// Note: Only call this after the grid has been rendered! You may have to wait for a timeout...
//

SocialCalc.CalculateEditorPositions = function(editor) {

   var rowpane, colpane, i;

   editor.gridposition = SocialCalc.GetElementPosition(editor.griddiv);
   editor.headposition =
      SocialCalc.GetElementPosition(editor.griddiv.firstChild.lastChild.childNodes[2].childNodes[1]); // 3rd tr 2nd td

   editor.rowpositions = [];
   for (rowpane=0; rowpane<editor.context.rowpanes.length; rowpane++) {
      editor.CalculateRowPositions(rowpane, editor.rowpositions);
      for (i=editor.context.rowpanes[rowpane].first; i<editor.context.rowpanes[rowpane].last-1; i++) {
         editor.rowheight[i] = editor.rowpositions[i+1] - editor.rowpositions[i];
         }
      }
   for (i=0; i<editor.rowpositions.length; i++) {
      if (editor.rowpositions[i]>editor.gridposition.top+editor.tableheight) break;
      }
   editor.lastvisiblerow = i-1;

   editor.colpositions = [];
   for (colpane=0; colpane<editor.context.colpanes.length; colpane++) {
      editor.CalculateColPositions(colpane, editor.colpositions);
      for (i=editor.context.colpanes[colpane].first; i<editor.context.colpanes[colpane].last; i++) {
         editor.colwidth[i] = editor.colpositions[i+1] - editor.colpositions[i];
         }
      editor.colwidth[i] = editor.context.colwidth[i]-0;
      }
   for (i=0; i<editor.colpositions.length; i++) {
      if (editor.colpositions[i]>editor.gridposition.left+editor.tablewidth) break;
      }
   editor.lastvisiblecol = i-1;

   editor.firstscrollingrow = editor.context.rowpanes[editor.context.rowpanes.length-1].first;
   editor.firstscrollingrowtop = editor.rowpositions[editor.firstscrollingrow] || editor.headposition.top;
   editor.lastnonscrollingrow = editor.context.rowpanes.length-1 > 0 ?
         editor.context.rowpanes[editor.context.rowpanes.length-2].last : 0;
   editor.firstscrollingcol = editor.context.colpanes[editor.context.colpanes.length-1].first;
   editor.firstscrollingcolleft = editor.colpositions[editor.firstscrollingcol] || editor.headposition.left;
   editor.lastnonscrollingcol = editor.context.colpanes.length-1 > 0 ?
         editor.context.colpanes[editor.context.colpanes.length-2].last : 0;

   // Now do the table controls

   editor.verticaltablecontrol.ComputeTableControlPositions();
   editor.horizontaltablecontrol.ComputeTableControlPositions();
   }

//
// SchedulePositionCalculations(editor)
//
// Set a timeout to allow for background layout and rendering by the browser after which to update
// editor visuals, sliders, etc.
//
// Note: Only call this after the DOM objects have been modified and are being (or have been) rendered!
//

SocialCalc.SchedulePositionCalculations = function(editor) {

   // Set a timeout in a short amount of time to relinquish the thread to something else and hopefully
   // get things rendered. After that, use a closure to do the actual recalculation.
   // Hopefully, a single timer event like this will not leak memory, even in old versions of IE.

   if (editor.timeout) window.clearTimeout(editor.timeout); // in case called more than once, just use latest

   editor.timeout = window.setTimeout(function(){SocialCalc.DoPositionCalculations(editor);}, 1);

   }

// DoPositionCalculations(editor)
//
// Update editor visuals, sliders, etc.
//
// Note: Only call this after the DOM objects have been modified and rendered!
//

SocialCalc.DoPositionCalculations = function(editor) {

   editor.timeout = null;

   editor.CalculateEditorPositions();
   editor.verticaltablecontrol.PositionTableControlElements();
   editor.horizontaltablecontrol.PositionTableControlElements();

   if (editor.ensureecell && editor.ecell) {
      editor.ensureecell = false;
      editor.EnsureECellVisible(); // this could cause another redisplay
      }

//!!! Need to now check to see if this positioned controls out of the editing area
//!!! (such as when there is a large wrapped cell and it pushes the pane boundary too far down).

   }

SocialCalc.CalculateRowPositions = function(editor, panenum, result) {

   var toprow, rowpane, rownum, offset, trowobj, cellposition;

   var context=editor.context;
   var sheetobj=context.sheetobj;

   var tbodyobj;

   if (!context.showRCHeaders) throw("Needs showRCHeaders=true");

   tbodyobj=editor.fullgrid.lastChild;

   // Calculate start of this pane as row in this table:

   toprow = 2;
   for (rowpane=0; rowpane<panenum; rowpane++) {
      toprow += context.rowpanes[rowpane].last - context.rowpanes[rowpane].first + 2; // skip pane and spacing row
      }

   offset = 0;
   for (rownum=context.rowpanes[rowpane].first; rownum<=context.rowpanes[rowpane].last; rownum++) {
      trowobj = tbodyobj.childNodes[toprow+offset];
      offset++;
      cellposition = SocialCalc.GetElementPosition(trowobj.firstChild);

// Safari has problem: If a cell in the row is high, cell 1 is centered and it returns top of centered part 
// but if you get position of row element, it always returns the same value (not the row's)
// So we require row number to be vertical aligned to top

      if (!result[rownum]) result[rownum] = cellposition.top; // first one takes precedence
      }

   return result;

   }

SocialCalc.CalculateColPositions = function(editor, panenum, result) {

   var leftcol, colpane, colnum, offset, trowobj, cellposition;

   var context=editor.context;
   var sheetobj=context.sheetobj;

   var tbodyobj;

   if (!context.showRCHeaders) throw("Needs showRCHeaders=true");

   tbodyobj=editor.fullgrid.lastChild;

   // Calculate start of this pane as column in this table:

   leftcol = 1;
   for (colpane=0; colpane<panenum; colpane++) {
      leftcol += context.colpanes[colpane].last - context.colpanes[colpane].first + 2; // skip pane and spacing col
      }

   trowobj = tbodyobj.childNodes[1]; // get heading row, which has all columns
   offset = 0;
   for (colnum=context.colpanes[colpane].first; colnum<=context.colpanes[colpane].last; colnum++) {
      cellposition = SocialCalc.GetElementPosition(trowobj.childNodes[leftcol+offset]);
      offset++;
      if (!result[colnum]) result[colnum] = cellposition.left; // first one takes precedence
      }

   return result;

   }


// ScrollRelative(editor, vertical, amount)
//
// If vertical true, scrolls up(-)/down(+), else left(-)/right(+)

SocialCalc.ScrollRelative = function(editor, vertical, amount) {

   var panes=vertical ? "rowpanes" : "colpanes";
   var context=editor.context;
   var plen=context[panes].length;
   var limit = plen>1 ? context[panes][plen-2].last+1 : 1; // don't scroll past here

   if (context[panes][plen-1].first+amount < limit) { // limit amount
      amount = (-context[panes][context[panes].length-1].first) + limit;
      }

   if (amount==1 && vertical) { // special case moves of 1 to do special scrolling code
      editor.ScrollTableUpOneRow();
      if (editor.ecell) editor.SetECellHeaders("selected");
      }
   else if (amount==-1 && vertical) {
      editor.ScrollTableDownOneRow();
      if (editor.ecell) editor.SetECellHeaders("selected");
      }
   else if (amount==0) {
      ; // do nothing
      }
   else {
      context[panes][context[panes].length-1].first += amount;
      context[panes][context[panes].length-1].last += amount;
      editor.FitToEditTable();
      context.CalculateColWidthData();
      editor.EditorRenderSheet();
      }

   editor.SchedulePositionCalculations();

   }

// PageRelative(editor, vertical, direction)
//
// If vertical true, pages up(direction is -)/down(+), else left(-)/right(+)

SocialCalc.PageRelative = function(editor, vertical, direction) {

   var context=editor.context;
   var panes=vertical ? "rowpanes" : "colpanes";
   var lastpane=context[panes][context[panes].length-1];
   var lastvisible=vertical ? "lastvisiblerow" : "lastvisiblecol";
   var sizearray=vertical ? editor.rowheight : editor.colwidth;
   var defaultsize=vertical ? SocialCalc.defaultvalues.assumedrowheight : SocialCalc.defaultvalues.defaultcolwidth;
   var size, newfirst, totalsize, current;

   if (direction > 0) { // down/right
      newfirst = editor[lastvisible];
      if (newfirst == lastpane.first) newfirst += 1; // move at least one
      }
   else {
      if (vertical) { // calculate amount to scroll
         totalsize = editor.tableheight - (editor.firstscrollingrowtop - editor.gridposition.top);
         }
      else {
         totalsize = editor.tablewidth - (editor.firstscrollingcolleft - editor.gridposition.left);
         }
      totalsize -= sizearray[editor[lastvisible]] > 0 ? sizearray[editor[lastvisible]] : defaultsize;

      for (newfirst=lastpane.first-1; newfirst>0; newfirst--) {
         size = sizearray[newfirst] > 0 ? sizearray[newfirst] : defaultsize;
         if (totalsize < size) break;
         totalsize -= size;
         }

      current = lastpane.first;
      if (newfirst >= current) newfirst = current-1; // move at least 1
      if (newfirst < 1) newfirst = 1;
      }

   lastpane.first = newfirst;
   lastpane.last = newfirst+1;
   editor.LimitLastPanes();
   editor.FitToEditTable();
   context.CalculateColWidthData();
   editor.EditorRenderSheet();
   editor.SchedulePositionCalculations();

   }

// LimitLastPanes(editor)
//
// Makes sure that the "first" of the last panes isn't before the last of the previous pane
//

SocialCalc.LimitLastPanes = function(editor) {

   var context=editor.context;
   var plen;

   plen = context.rowpanes.length;
   if (plen>1 && context.rowpanes[plen-1].first <= context.rowpanes[plen-2].last)
       context.rowpanes[plen-1].first = context.rowpanes[plen-2].last+1;

   plen = context.colpanes.length;
   if (plen>1 && context.colpanes[plen-1].first <= context.colpanes[plen-2].last)
       context.colpanes[plen-1].first = context.colpanes[plen-2].last+1;

   }

SocialCalc.ScrollTableUpOneRow = function(editor) {

   var toprow, rowpane, rownum, colnum, colpane, cell, oldrownum, maxspan, newbottomrow, newrow, oldchild, bottomrownum;
   var rowneedsrefresh={};

   var context=editor.context;
   var sheetobj=context.sheetobj;
   var tableobj=editor.fullgrid;

   var tbodyobj;

   tbodyobj=tableobj.lastChild;

   toprow = context.showRCHeaders ? 2 : 1;
   for (rowpane=0; rowpane<context.rowpanes.length-1; rowpane++) {
      toprow += context.rowpanes[rowpane].last - context.rowpanes[rowpane].first + 2; // skip pane and spacing row
      }

   tbodyobj.removeChild(tbodyobj.childNodes[toprow]);

   context.rowpanes[rowpane].first++;
   context.rowpanes[rowpane].last++;
   editor.FitToEditTable();
   context.CalculateColWidthData(); // !!! Maybe this should be done a little later?

   newbottomrow = context.RenderRow(context.rowpanes[rowpane].last, rowpane);
   tbodyobj.appendChild(newbottomrow);

   // if scrolled off a row with starting rowspans, replace rows for the largest rowspan

   maxrowspan = 1;
   oldrownum=context.rowpanes[rowpane].first - 1;

   for (colpane=0; colpane<context.colpanes.length; colpane++) {
      for (colnum=context.colpanes[colpane].first; colnum<=context.colpanes[colpane].last; colnum++) {
         coord=SocialCalc.crToCoord(colnum, oldrownum);
         if (context.cellskip[coord]) continue;
         cell=sheetobj.cells[coord];
         if (cell && cell.rowspan>maxrowspan) maxrowspan=cell.rowspan;
         }
      }

   if (maxrowspan>1) {
      for (rownum=1; rownum<maxrowspan; rownum++) {
         if (rownum+oldrownum >= context.rowpanes[rowpane].last) break;
         newrow=context.RenderRow(rownum+oldrownum, rowpane);
         oldchild=tbodyobj.childNodes[toprow+rownum-1];
         tbodyobj.replaceChild(newrow,oldchild);
         }
      }

   // if added a row that includes rowspans from above, update the size of those to include new row

   bottomrownum=context.rowpanes[rowpane].last;

   for (colpane=0; colpane<context.colpanes.length; colpane++) {
      for (colnum=context.colpanes[colpane].first; colnum<=context.colpanes[colpane].last; colnum++) {
         coord=context.cellskip[SocialCalc.crToCoord(colnum, bottomrownum)];
         if (!coord) continue; // only look at spanned cells
         rownum=context.coordToCR[coord].row-0;
         if (rownum==context.rowpanes[rowpane].last ||
             rownum<context.rowpanes[rowpane].first) continue; // this row (colspan) or starts above pane
         cell=sheetobj.cells[coord];
         if (cell && cell.rowspan>1) rowneedsrefresh[rownum]=true; // remember row num to update
         }
      }

   for (rownum in rowneedsrefresh) {
      newrow=context.RenderRow(rownum, rowpane);
      oldchild=tbodyobj.childNodes[(toprow+(rownum-context.rowpanes[rowpane].first))];
      tbodyobj.replaceChild(newrow,oldchild);
      }

   return tableobj;
   }

SocialCalc.ScrollTableDownOneRow = function(editor) {

   var toprow, rowpane, rownum, colnum, colpane, cell, newrownum, maxspan, newbottomrow, newrow, oldchild, bottomrownum;
   var rowneedsrefresh={};

   var context=editor.context;
   var sheetobj=context.sheetobj;
   var tableobj=editor.fullgrid;

   var tbodyobj;

   tbodyobj=tableobj.lastChild;

   toprow = context.showRCHeaders ? 2 : 1;
   for (rowpane=0; rowpane<context.rowpanes.length-1; rowpane++) {
      toprow += context.rowpanes[rowpane].last - context.rowpanes[rowpane].first + 2; // skip pane and spacing row
      }

   tbodyobj.removeChild(tbodyobj.childNodes[toprow+(context.rowpanes[rowpane].last-context.rowpanes[rowpane].first)]);

   context.rowpanes[rowpane].first--;
   context.rowpanes[rowpane].last--;
   editor.FitToEditTable();
   context.CalculateColWidthData(); //!!! Later????

   newrow = context.RenderRow(context.rowpanes[rowpane].first, rowpane);
   tbodyobj.insertBefore(newrow, tbodyobj.childNodes[toprow]);

   // if inserted a row with starting rowspans, replace rows for the largest rowspan

   maxrowspan = 1;
   newrownum=context.rowpanes[rowpane].first;

   for (colpane=0; colpane<context.colpanes.length; colpane++) {
      for (colnum=context.colpanes[colpane].first; colnum<=context.colpanes[colpane].last; colnum++) {
         coord=SocialCalc.crToCoord(colnum, newrownum);
         if (context.cellskip[coord]) continue;
         cell=sheetobj.cells[coord];
         if (cell && cell.rowspan>maxrowspan) maxrowspan=cell.rowspan;
         }
      }

   if (maxrowspan>1) {
      for (rownum=1; rownum<maxrowspan; rownum++) {
         if (rownum+newrownum > context.rowpanes[rowpane].last) break;
         newrow=context.RenderRow(rownum+newrownum, rowpane);
         oldchild=tbodyobj.childNodes[toprow+rownum];
         tbodyobj.replaceChild(newrow,oldchild);
         }
      }

   // if last row now includes rowspans or rowspans from above, update the size of those to remove deleted row

   bottomrownum=context.rowpanes[rowpane].last;

   for (colpane=0; colpane<context.colpanes.length; colpane++) {
      for (colnum=context.colpanes[colpane].first; colnum<=context.colpanes[colpane].last; colnum++) {
         coord=SocialCalc.crToCoord(colnum, bottomrownum);
         cell=sheetobj.cells[coord];
         if (cell && cell.rowspan>1) {
            rowneedsrefresh[bottomrownum]=true; // need to update this row
            continue;
            }
         coord=context.cellskip[SocialCalc.crToCoord(colnum, bottomrownum)];
         if (!coord) continue; // only look at spanned cells
         rownum=context.coordToCR[coord].row-0;
         if (rownum==bottomrownum ||
             rownum<context.rowpanes[rowpane].first) continue; // this row (colspan) or starts above pane
         cell=sheetobj.cells[coord];
         if (cell && cell.rowspan>1) rowneedsrefresh[rownum]=true; // remember row num to update
         }
      }

   for (rownum in rowneedsrefresh) {
      newrow=context.RenderRow(rownum, rowpane);
      oldchild=tbodyobj.childNodes[(toprow+(rownum-context.rowpanes[rowpane].first))];
      tbodyobj.replaceChild(newrow,oldchild);
      }

   return tableobj;
   }

SocialCalc.ScrollTableLeftOneCol = function(editor) {

   var context=editor.context;

   context.colpanes[context.colpanes.length-1].first++;
   context.colpanes[context.colpanes.length-1].last++;
   editor.FitToEditTable();
   context.CalculateColWidthData();

   return editor.EditorRenderSheet();
   }

SocialCalc.ScrollTableRightOneCol = function(editor) {

   var context=editor.context;

   context.colpanes[context.colpanes.length-1].first--;
   context.colpanes[context.colpanes.length-1].last--;
   editor.FitToEditTable();
   context.CalculateColWidthData();

   return editor.EditorRenderSheet();
   }

// *************************************
//
// InputBox class:
//
// This class deals with the text box, etc., for editing cell contents.
//
// *************************************

SocialCalc.InputBox = function(editor) {

   var functions;

   this.editor = editor; // the TableEditor this belongs to

   this.main = null; // main element containing all the others
   this.header = null;

   // computed position values:

   // constants:

   this.main = document.createElement("div");
   SocialCalc.setStyles(this.main, "display:none;position:absolute;filter:alpha(opacity=90);opacity:.9;backgroundColor:#FFD;border:1px solid #884;zIndex:100;");
   this.header = document.createElement("div");
   SocialCalc.setStyles(this.header, "backgroundColor:#884;height:8px;fontSize:2px;width:192px;");
   this.header.innerHTML = "&nbsp;";
   this.main.appendChild(this.header);
   this.textarea = document.createElement("textarea");
   SocialCalc.setStyles(this.textarea, "width:190px;overflow:auto;height:80px;backgroundColor:#FFD;border:none;");
   this.main.appendChild(this.textarea);
   this.footer = document.createElement("div");
   SocialCalc.setStyles(this.footer, "color:#884;backgroundColor:#FFD;textAlign:right;fontWeight:bold;padding:2px;fontSize:10px;borderTop:1px solid #884;");
   this.footer.innerHTML = "Enter to accept, Esc to Cancel";
   this.main.appendChild(this.footer);

   editor.toplevel.appendChild(this.main);

   functions = {MouseDown: SocialCalc.DragFunctionStart,
                MouseMove: SocialCalc.DragFunctionPosition, MouseUp: SocialCalc.DragFunctionPosition,
                positionobj: this.main
               };

   SocialCalc.DragRegister(this.header, true, true, functions);
   }

// Methods:

SocialCalc.InputBox.prototype.ShowInputBox = function(show) {return SocialCalc.ShowInputBox(this, show);};

// Functions:

SocialCalc.ShowInputBox = function(inputbox, show) {

   var cell, position;
   var editor = inputbox.editor;

   cell=SocialCalc.GetEditorCellElement(editor, editor.ecell.row, editor.ecell.col);
   if (cell) {
      position = SocialCalc.GetElementPosition(cell.element);
      inputbox.main.style.left = (position.left-1)+"px";
      inputbox.main.style.top = (position.top-9)+"px";
      }

   inputbox.main.style.display = show ? "block" : "none";

   }

// *************************************
//
// TableControl class:
//
// This class deals with the horizontal and verical scrollbars and pane sliders.
//
// +--------------+
// | Endcap       |
// +- - - - - - - +
// |              |
// +--------------+
// | Pane Slider  |
// +--------------+
// |              |
// | Less Button  |
// |              |
// +--------------+
// | Scroll Area  |
// |              |
// |              |
// +--------------+
// | Thumb        |
// +--------------+
// |              |
// +--------------+
// |              |
// | More Button  |
// |              |
// +--------------+
//
// *************************************

SocialCalc.TableControl = function(editor, vertical, size) {

   var functions;

   this.editor = editor; // the TableEditor this belongs to

   this.vertical = vertical; // true if vertical control, false if horizontal
   this.size = size; // length in pixels

   this.main = null; // main element containing all the others
   this.endcap = null; // the area at the top/left between the end and the pane slider
   this.paneslider = null; // the slider to adjust the pane split
   this.lessbutton = null; // the top/left scroll button
   this.morebutton = null; // the bottom/right scroll button
   this.scrollarea = null; // the area between the scroll buttons
   this.thumb = null; // the sliding thing in the scrollarea

   // computed position values:

   this.controlborder = null; // left or top screen position for vertical or horizontal control
   this.endcapstart = null; // top or left screen position for vertical or horizontal control
   this.panesliderstart = null;
   this.lessbuttonstart = null;
   this.morebuttonstart = null;
   this.scrollareastart = null;
   this.scrollareaend = null;
   this.scrollareasize = null;
   this.thumbpos = null;

   // constants:

   this.controlthickness = 20; // other dimension of complete control in pixels
   this.endcapthickness = 20;
   this.sliderthickness = 9;
   this.buttonthickness = 20;
   this.thumbthickness = 15;
   this.minscrollingpanesize = this.buttonthickness+this.buttonthickness+this.thumbthickness+20;

   }

// Methods:

SocialCalc.TableControl.prototype.CreateTableControl = function() {return SocialCalc.CreateTableControl(this);};
SocialCalc.TableControl.prototype.PositionTableControlElements = function() {SocialCalc.PositionTableControlElements(this);};
SocialCalc.TableControl.prototype.ComputeTableControlPositions = function() {SocialCalc.ComputeTableControlPositions(this);};

// Functions:

SocialCalc.CreateTableControl = function(control) {

   var functions, params;

   var imageprefix = control.editor.imageprefix;
   var vh = control.vertical ? "v" : "h";

   control.main = document.createElement("div");
   control.main.style.height = (control.vertical ? control.size : control.controlthickness)+"px";
   control.main.style.width = (control.vertical ? control.controlthickness : control.size)+"px";
   control.main.style.zIndex = 0;
   control.main.style.backgroundColor = "#EEE";
   control.main.style.backgroundImage="url("+imageprefix+"-main-"+vh+".gif)";

   control.main.style.display="none"; // wait for layout

   control.endcap = document.createElement("div");
   control.endcap.style.height = control.controlthickness+"px";
   control.endcap.style.width = control.controlthickness+"px";
   control.endcap.style.zIndex = 1;
   control.endcap.style.overflow = "hidden"; // IE will make the DIV at least font-size height...so use this
   control.endcap.style.position = "absolute";
   control.endcap.style.backgroundColor="#FFF";
   control.endcap.style.backgroundImage="url("+imageprefix+"-endcap-"+vh+".gif)";

   control.main.appendChild(control.endcap);

   control.paneslider = document.createElement("div");
   control.paneslider.style.height = (control.vertical ? control.sliderthickness : control.controlthickness)+"px";
   control.paneslider.style.overflow = "hidden"; // IE will make the DIV at least font-size height...so use this
   control.paneslider.style.width = (control.vertical ? control.controlthickness : control.sliderthickness)+"px";
   control.paneslider.style.position = "absolute";
   control.paneslider.style[control.vertical?"top":"left"] = "4px";
   control.paneslider.style.zIndex = 3;
   control.paneslider.style.backgroundColor="#CCC";
   control.paneslider.style.backgroundImage="url("+imageprefix+"-paneslider-"+vh+".gif)";

   functions = {MouseDown:SocialCalc.TCPSDragFunctionStart,
                    MouseMove: SocialCalc.TCPSDragFunctionMove, MouseUp: SocialCalc.TCPSDragFunctionStop};

   functions.control = control; // make sure this is there

   SocialCalc.DragRegister(control.paneslider, control.vertical, !control.vertical, functions);

   control.main.appendChild(control.paneslider);

   control.lessbutton = document.createElement("div");
   control.lessbutton.style.height = (control.vertical ? control.buttonthickness : control.controlthickness)+"px";
   control.lessbutton.style.width = (control.vertical ? control.controlthickness : control.buttonthickness)+"px";
   control.lessbutton.style.zIndex = 2;
   control.lessbutton.style.overflow = "hidden"; // IE will make the DIV at least font-size height...so use this
   control.lessbutton.style.position = "absolute";
   control.lessbutton.style.backgroundColor="#AAA";
   control.lessbutton.style.backgroundImage="url("+imageprefix+"-less-"+vh+"n.gif)"

   params = {repeatwait:500, repeatinterval:100,
             normalstyle: "backgroundImage:url("+imageprefix+"-less-"+vh+"n.gif);",
             downstyle: "backgroundImage:url("+imageprefix+"-less-"+vh+"d.gif);",
             hoverstyle: "backgroundImage:url("+imageprefix+"-less-"+vh+"h.gif);"};
   functions = {MouseDown:function(){control.editor.ScrollRelative(control.vertical, -1);},
                Repeat:function(){control.editor.ScrollRelative(control.vertical, -1);}};

   SocialCalc.ButtonRegister(control.lessbutton, params, functions);

   control.main.appendChild(control.lessbutton);

   control.morebutton = document.createElement("div");
   control.morebutton.style.height = (control.vertical ? control.buttonthickness : control.controlthickness)+"px";
   control.morebutton.style.width = (control.vertical ? control.controlthickness : control.buttonthickness)+"px";
   control.morebutton.style.zIndex = 2;
   control.morebutton.style.overflow = "hidden"; // IE will make the DIV at least font-size height...so use this
   control.morebutton.style.position = "absolute";
   control.morebutton.style.backgroundColor="#AAA";
   control.morebutton.style.backgroundImage="url("+imageprefix+"-more-"+vh+"n.gif)"

   params = {repeatwait:500, repeatinterval:100,
             normalstyle: "backgroundImage:url("+imageprefix+"-more-"+vh+"n.gif);",
             downstyle: "backgroundImage:url("+imageprefix+"-more-"+vh+"d.gif);",
             hoverstyle: "backgroundImage:url("+imageprefix+"-more-"+vh+"h.gif);"};
   functions = {MouseDown:function(){control.editor.ScrollRelative(control.vertical, +1);},
                Repeat:function(){control.editor.ScrollRelative(control.vertical, +1);}};

   SocialCalc.ButtonRegister(control.morebutton, params, functions);

   control.main.appendChild(control.morebutton);

   control.scrollarea = document.createElement("div");
   control.scrollarea.style.height = control.controlthickness+"px";
   control.scrollarea.style.width = control.controlthickness+"px";
   control.scrollarea.style.zIndex = 1;
   control.scrollarea.style.overflow = "hidden"; // IE will make the DIV at least font-size height...so use this
   control.scrollarea.style.position = "absolute";
   control.scrollarea.style.backgroundColor="#AAA";
   control.scrollarea.style.backgroundImage="url("+imageprefix+"-scrollarea-"+vh+".gif)";

   params = {repeatwait:500, repeatinterval:100};
   functions = {MouseDown:SocialCalc.ScrollAreaClick, Repeat:SocialCalc.ScrollAreaClick};
   functions.control = control;

   SocialCalc.ButtonRegister(control.scrollarea, params, functions);

   control.main.appendChild(control.scrollarea);

   control.thumb = document.createElement("div");
   control.thumb.style.height =  (control.vertical ? control.thumbthickness : control.controlthickness)+"px";
   control.thumb.style.width = (control.vertical ? control.controlthickness : control.thumbthickness)+"px";
   control.thumb.style.zIndex = 2;
   control.thumb.style.overflow = "hidden"; // IE will make the DIV at least font-size height...so use this
   control.thumb.style.position = "absolute";
   control.thumb.style.backgroundColor="#AAA";
   control.thumb.style.backgroundImage="url("+imageprefix+"-thumb-"+vh+"n.gif)";

   functions = {MouseDown:SocialCalc.TCTDragFunctionStart,
                MouseMove: SocialCalc.TCTDragFunctionMove,
                MouseUp: SocialCalc.TCTDragFunctionStop};
   functions.control = control; // make sure this is there
   SocialCalc.DragRegister(control.thumb, control.vertical, !control.vertical, functions);

   params = {normalstyle: "backgroundImage:url("+imageprefix+"-thumb-"+vh+"n.gif)", name:"Thumb",
             downstyle:  "backgroundImage:url("+imageprefix+"-thumb-"+vh+"d.gif)",
             hoverstyle:  "backgroundImage:url("+imageprefix+"-thumb-"+vh+"h.gif)"};
   SocialCalc.ButtonRegister(control.thumb, params, null); // give it button-like visual behavior

   control.main.appendChild(control.thumb);

   return control.main;

}

//
// ScrollAreaClick - Button function to process pageup/down clicks
//

SocialCalc.ScrollAreaClick = function(e, buttoninfo, bobj) {

   var control = bobj.functionobj.control;
   var bposition = SocialCalc.GetElementPosition(bobj.element);
   var clickpos = control.vertical ? buttoninfo.clientY : buttoninfo.clientX;

   control.editor.PageRelative(control.vertical, clickpos > control.thumbpos ? 1 : -1);

   return;

}

//
// PositionTableControlElements
//

SocialCalc.PositionTableControlElements = function(control) {

   var border, realend, thumbpos;

   var editor = control.editor;

   if (control.vertical) {
      border = control.controlborder+"px";
      control.endcap.style.top = control.endcapstart+"px";
      control.endcap.style.left = border;
      control.paneslider.style.top = control.panesliderstart+"px";
      control.paneslider.style.left = border
      control.lessbutton.style.top = control.lessbuttonstart+"px";
      control.lessbutton.style.left = border;
      control.morebutton.style.top = control.morebuttonstart+"px";
      control.morebutton.style.left = border;
      control.scrollarea.style.top = control.scrollareastart+"px";
      control.scrollarea.style.left = border;
      control.scrollarea.style.height = control.scrollareasize+"px";
      realend = Math.max(editor.context.sheetobj.attribs.lastrow, editor.firstscrollingrow+1);
      thumbpos = ((editor.firstscrollingrow-(editor.lastnonscrollingrow+1))*(control.scrollareasize-3*control.thumbthickness))/
         (realend-(editor.lastnonscrollingrow+1))+control.scrollareastart-1;
      thumbpos = Math.floor(thumbpos);
      control.thumb.style.top = thumbpos+"px";
      control.thumb.style.left = border;
      }
   else {
      border = control.controlborder+"px";
      control.endcap.style.left = control.endcapstart+"px";
      control.endcap.style.top = border;
      control.paneslider.style.left = control.panesliderstart+"px";
      control.paneslider.style.top = border
      control.lessbutton.style.left = control.lessbuttonstart+"px";
      control.lessbutton.style.top = border;
      control.morebutton.style.left = control.morebuttonstart+"px";
      control.morebutton.style.top = border;
      control.scrollarea.style.left = control.scrollareastart+"px";
      control.scrollarea.style.top = border;
      control.scrollarea.style.width = control.scrollareasize+"px";
      realend = Math.max(editor.context.sheetobj.attribs.lastcol, editor.firstscrollingcol+1);
      thumbpos = ((editor.firstscrollingcol-(editor.lastnonscrollingcol+1))*(control.scrollareasize-control.thumbthickness))/
         (realend-editor.lastnonscrollingcol)+control.scrollareastart-1;
      thumbpos = Math.floor(thumbpos);
      control.thumb.style.left = thumbpos+"px";
      control.thumb.style.top = border;
      }
   control.thumbpos = thumbpos;
   control.main.style.display="block";

   }

//
// ComputeTableControlPositions
//
// This routine computes the screen positions and other values needed for laying out
// the table control elements.
//

SocialCalc.ComputeTableControlPositions = function(control) {

   var editor = control.editor;

   if (!editor.gridposition || !editor.headposition) throw("Can't compute table control positions before editor positions");

   if (control.vertical) {
      control.controlborder = editor.gridposition.left+editor.tablewidth; // border=left position
      control.endcapstart = editor.gridposition.top; // start=top position
      control.panesliderstart = editor.firstscrollingrowtop-control.sliderthickness;
      control.lessbuttonstart = editor.firstscrollingrowtop-1;
      control.morebuttonstart = editor.gridposition.top+editor.tableheight-control.buttonthickness;
      control.scrollareastart = editor.firstscrollingrowtop-1+control.buttonthickness;
      control.scrollareaend = control.morebuttonstart-1;
      control.scrollareasize = control.scrollareaend-control.scrollareastart+1;
      }
   else {
      control.controlborder = editor.gridposition.top+editor.tableheight; // border=top position
      control.endcapstart = editor.gridposition.left; // start=left position
      control.panesliderstart = editor.firstscrollingcolleft-control.sliderthickness;
      control.lessbuttonstart = editor.firstscrollingcolleft-1;
      control.morebuttonstart = editor.gridposition.left+editor.tablewidth-control.buttonthickness;
      control.scrollareastart = editor.firstscrollingcolleft-1+control.buttonthickness;
      control.scrollareaend = control.morebuttonstart-1;
      control.scrollareasize = control.scrollareaend-control.scrollareastart+1;
      }
   }

////// TCPS - TableControl Pan Slider methods

//
// TCPSDragFunctionStart(event, draginfo, dobj)
//
// TableControlPaneSlider function for starting drag
//

SocialCalc.TCPSDragFunctionStart = function(event, draginfo, dobj) {

   var editor = dobj.functionobj.control.editor;

   SocialCalc.DragFunctionStart(event, draginfo, dobj);

   draginfo.trackingline = document.createElement("div");
   draginfo.trackingline.style.height = dobj.vertical ? "2px" :
      (editor.tableheight-(editor.headposition.top-editor.gridposition.top))+"px";
   draginfo.trackingline.style.width = dobj.vertical ? 
      (editor.tablewidth-(editor.headposition.left-editor.gridposition.left))+"px" : "2px";
   draginfo.trackingline.style.backgroundImage="url("+editor.imageprefix+"-trackingline-"+(dobj.vertical?"v":"h")+".gif)";;
   draginfo.trackingline.style.overflow = "hidden";
   draginfo.trackingline.style.position = "absolute";
   draginfo.trackingline.style.zIndex = 100;

   if (dobj.vertical) {
      row = SocialCalc.Lookup(draginfo.clientY+dobj.functionobj.control.sliderthickness, editor.rowpositions);
      draginfo.trackingline.style.top = (editor.rowpositions[row] || editor.headposition.top)+"px";
      draginfo.trackingline.style.left = editor.headposition.left+"px";
      }
   else {
      col = SocialCalc.Lookup(draginfo.clientX+dobj.functionobj.control.sliderthickness, editor.colpositions);
      draginfo.trackingline.style.top = editor.headposition.top+"px";
      draginfo.trackingline.style.left = (editor.colpositions[col] || editor.headposition.left)+"px";
      }

   editor.griddiv.appendChild(draginfo.trackingline);

   }

//
// TCPSDragFunctionMove(event, draginfo, dobj)
//

SocialCalc.TCPSDragFunctionMove = function(event, draginfo, dobj) {

   var row, col, max, min;
   var control = dobj.functionobj.control;
   var sliderthickness = control.sliderthickness;
   var editor = control.editor;

   if (dobj.vertical) {
      max = control.morebuttonstart - control.minscrollingpanesize - draginfo.offsetY; // restrict movement
      if (draginfo.clientY > max) draginfo.clientY = max;
      min = editor.headposition.top - sliderthickness - draginfo.offsetY;
      if (draginfo.clientY < min) draginfo.clientY = min;

      row = SocialCalc.Lookup(draginfo.clientY+sliderthickness, editor.rowpositions);
      draginfo.trackingline.style.top = (editor.rowpositions[row] || editor.headposition.top)+"px";
      }
   else {
      max = control.morebuttonstart - control.minscrollingpanesize - draginfo.offsetX;
      if (draginfo.clientX > max) draginfo.clientX = max;
      min = editor.headposition.left - sliderthickness - draginfo.offsetX;
      if (draginfo.clientX < min) draginfo.clientX = min;

      col = SocialCalc.Lookup(draginfo.clientX+sliderthickness, editor.colpositions);
      draginfo.trackingline.style.left = (editor.colpositions[col] || editor.headposition.left)+"px";
      }

   SocialCalc.DragFunctionPosition(event, draginfo, dobj);

   }

//
// TCPSDragFunctionStop(event, draginfo, dobj)
//

SocialCalc.TCPSDragFunctionStop = function(event, draginfo, dobj) {

   var row, col, max, min;
   var control = dobj.functionobj.control;
   var sliderthickness = control.sliderthickness;
   var editor = control.editor;

   if (dobj.vertical) {
      max = control.morebuttonstart - control.minscrollingpanesize - draginfo.offsetY; // restrict movement
      if (draginfo.clientY > max) draginfo.clientY = max;
      min = editor.headposition.top - sliderthickness - draginfo.offsetY;
      if (draginfo.clientY < min) draginfo.clientY = min;

      row = SocialCalc.Lookup(draginfo.clientY+sliderthickness, editor.rowpositions);
      if (row>editor.context.sheetobj.attribs.lastrow) row=editor.context.sheetobj.attribs.lastrow; // can't extend sheet here
      if (!row || row<=editor.context.rowpanes[0].first) { // set to no panes, leaving first pane settings
         if (editor.context.rowpanes.length>1) editor.context.rowpanes.length = 1;
         }
      else if (editor.context.rowpanes.length-1) { // has 2 already
         editor.context.SetRowPaneFirstLast(0, editor.context.rowpanes[0].first, row-1);
         editor.context.SetRowPaneFirstLast(1, row, row);
         }
      else {
         editor.context.SetRowPaneFirstLast(0, editor.context.rowpanes[0].first, row-1);
         editor.context.SetRowPaneFirstLast(1, row, row);
         }
      }
   else {
      max = control.morebuttonstart - control.minscrollingpanesize - draginfo.offsetX;
      if (draginfo.clientX > max) draginfo.clientX = max;
      min = editor.headposition.left - sliderthickness - draginfo.offsetX;
      if (draginfo.clientX < min) draginfo.clientX = min;

      col = SocialCalc.Lookup(draginfo.clientX+sliderthickness, editor.colpositions);
      if (col>editor.context.sheetobj.attribs.lastcol) col=editor.context.sheetobj.attribs.lastcol; // can't extend sheet here
      if (!col || col<=editor.context.colpanes[0].first) { // set to no panes, leaving first pane settings
         if (editor.context.colpanes.length>1) editor.context.colpanes.length = 1;
         }
      else if (editor.context.colpanes.length-1) { // has 2 already
         editor.context.SetColPaneFirstLast(0, editor.context.colpanes[0].first, col-1);
         editor.context.SetColPaneFirstLast(1, col, col);
         }
      else {
         editor.context.SetColPaneFirstLast(0, editor.context.colpanes[0].first, col-1);
         editor.context.SetColPaneFirstLast(1, col, col);
         }
      }

   editor.FitToEditTable();
   editor.context.CalculateColWidthData();

   editor.griddiv.removeChild(draginfo.trackingline);

   editor.EditorRenderSheet();

   editor.SchedulePositionCalculations();

   }

////// TCT - TableControl Thumb methods

//!!!! Note: Need to make start use same code as move/stop for determining row/col, since stop will set that
//!!!! Note: Need to make start/move/stop use positioning code that corresponds closer to
//!!!!       ComputeTableControlPositions calculations.

//
// TCTDragFunctionStart(event, draginfo, dobj)
//
// TableControlThumb function for starting drag
//

SocialCalc.TCTDragFunctionStart = function(event, draginfo, dobj) {

   var rowpane, colpane, row, col;

   var control = dobj.functionobj.control;
   var editor = control.editor;

   SocialCalc.DragFunctionStart(event, draginfo, dobj);

   draginfo.thumbstatus = document.createElement("div");
   draginfo.thumbstatus.style.height = "20px";
   draginfo.thumbstatus.style.width = "auto";
   draginfo.thumbstatus.style.border = "1px solid black";
   draginfo.thumbstatus.style.padding = "2px";
   draginfo.thumbstatus.style.backgroundColor = "#FFF";
   draginfo.thumbstatus.style.position = "absolute";
   draginfo.thumbstatus.style.zIndex = 100;

   if (dobj.vertical) {
      draginfo.thumbstatus.style.top = draginfo.clientY+"px";
      draginfo.thumbstatus.style.left = (control.controlborder-80)+"px";
      draginfo.thumbstatus.innerHTML = "Row "+editor.firstscrollingrow;
      }
   else {
      draginfo.thumbstatus.style.top = (control.controlborder-30)+"px";
      draginfo.thumbstatus.style.left = draginfo.clientX+"px";
      draginfo.thumbstatus.innerHTML = "Col "+SocialCalc.rcColname(editor.firstscrollingcol);
      }


   editor.toplevel.appendChild(draginfo.thumbstatus);

   }

//
// TCTDragFunctionMove(event, draginfo, dobj)
//

SocialCalc.TCTDragFunctionMove = function(event, draginfo, dobj) {

   var first, msg;
   var control = dobj.functionobj.control;
   var thumbthickness = control.thumbthickness;
   var editor = control.editor;

   if (dobj.vertical) {
      if (draginfo.clientY > control.scrollareaend - draginfo.offsetY - control.thumbthickness + 2)
         draginfo.clientY = control.scrollareaend - draginfo.offsetY - control.thumbthickness + 2;
      if (draginfo.clientY < control.scrollareastart - draginfo.offsetY - 1)
         draginfo.clientY = control.scrollareastart - draginfo.offsetY - 1;
      draginfo.thumbstatus.style.top = draginfo.clientY+"px";

      first =
         ((draginfo.clientY+draginfo.offsetY-control.scrollareastart+1)/(control.scrollareasize-control.thumbthickness))
         * (editor.context.sheetobj.attribs.lastrow-editor.lastnonscrollingrow)
         + editor.lastnonscrollingrow + 1;
      first = Math.floor(first);
      if (first <= editor.lastnonscrollingrow) first = editor.lastnonscrollingrow + 1;
      if (first > editor.context.sheetobj.attribs.lastrow) first = editor.context.sheetobj.attribs.lastrow;
      msg = "Row "+first;

      }
   else {
      if (draginfo.clientX > control.scrollareaend - draginfo.offsetX - control.thumbthickness + 2)
         draginfo.clientX = control.scrollareaend - draginfo.offsetX - control.thumbthickness + 2;
      if (draginfo.clientX < control.scrollareastart - draginfo.offsetX - 1)
         draginfo.clientX = control.scrollareastart - draginfo.offsetX - 1;
      draginfo.thumbstatus.style.left = draginfo.clientX+"px";

      first =
         ((draginfo.clientX+draginfo.offsetX-control.scrollareastart+1)/(control.scrollareasize-control.thumbthickness))
         * (editor.context.sheetobj.attribs.lastcol-editor.lastnonscrollingcol)
         + editor.lastnonscrollingcol + 1;
      first = Math.floor(first);
      if (first <= editor.lastnonscrollingcol) first = editor.lastnonscrollingcol + 1;
      if (first > editor.context.sheetobj.attribs.lastcol) first = editor.context.sheetobj.attribs.lastcol;
      msg = "Col "+SocialCalc.rcColname(first);
      }

   draginfo.thumbstatus.innerHTML = msg;

   SocialCalc.DragFunctionPosition(event, draginfo, dobj);

   }

//
// TCTDragFunctionStop(event, draginfo, dobj)
//

SocialCalc.TCTDragFunctionStop = function(event, draginfo, dobj) {

   var first;
   var control = dobj.functionobj.control;
   var editor = control.editor;

   if (dobj.vertical) {
      first =
         ((draginfo.clientY+draginfo.offsetY-control.scrollareastart+1)/(control.scrollareasize-control.thumbthickness))
         * (editor.context.sheetobj.attribs.lastrow-editor.lastnonscrollingrow)
         + editor.lastnonscrollingrow + 1;
      first = Math.floor(first);
      if (first <= editor.lastnonscrollingrow) first = editor.lastnonscrollingrow + 1;
      if (first > editor.context.sheetobj.attribs.lastrow) first = editor.context.sheetobj.attribs.lastrow;

      editor.context.SetRowPaneFirstLast(editor.context.rowpanes.length-1, first, first+1);
      }
   else {
      first =
         ((draginfo.clientX+draginfo.offsetX-control.scrollareastart+1)/(control.scrollareasize-control.thumbthickness))
         * (editor.context.sheetobj.attribs.lastcol-editor.lastnonscrollingcol)
         + editor.lastnonscrollingcol + 1;
      first = Math.floor(first);
      if (first <= editor.lastnonscrollingcol) first = editor.lastnonscrollingcol + 1;
      if (first > editor.context.sheetobj.attribs.lastcol) first = editor.context.sheetobj.attribs.lastcol;

      editor.context.SetColPaneFirstLast(editor.context.colpanes.length-1, first, first+1);
      }

   editor.FitToEditTable();
   editor.context.CalculateColWidthData();

   editor.toplevel.removeChild(draginfo.thumbstatus);

   editor.EditorRenderSheet();

   editor.SchedulePositionCalculations();

   }

// *************************************
//
// Dragging functions:
//
// *************************************

SocialCalc.DragInfo = {

   // There is only one of these -- no "new" is done.
   // Only one dragging operation can be active at a time.
   // The registeredElements array is used to decide which item to drag.

   // One item for each draggable thing, each an object with:
   //    .element, .vertical, .horizontal, .functionobj

   registeredElements: [],

   // Items used during a drag

   draggingElement: null, // item being processed (.element is the actual element)
   startX: 0,
   startY: 0,
   startZ: 0,
   clientX: 0, // modifyable version to restrict movement
   clientY: 0,
   offsetX: 0,
   offsetY: 0,
   horizontalScroll: 0, // retrieved at drag start
   verticalScroll: 0

   }

//
// DragRegister(element, vertical, horizontal, functionobj) - make element draggable
//

SocialCalc.DragRegister = function(element, vertical, horizontal, functionobj) {

   var draginfo = SocialCalc.DragInfo;
   draginfo.registeredElements.push(
      {element: element, vertical: vertical, horizontal: horizontal, functionobj: functionobj}
      );

   if (element.addEventListener) { // DOM Level 2 -- Firefox, et al
      element.addEventListener("mousedown", SocialCalc.DragMouseDown, false);
      }
   else if (element.attachEvent) { // IE 5+
      element.attachEvent("onmousedown", SocialCalc.DragMouseDown);
      }
   else { // don't handle this
      throw "Browser not supported";
      }

   }

//
// DragMouseDown(event)
//

SocialCalc.DragMouseDown = function(event) {

   var e = event || window.event;

   var draginfo = SocialCalc.DragInfo;

   var dobj = SocialCalc.LookupElement(e.target || e.srcElement, draginfo.registeredElements);
   if (!dobj) return;

   draginfo.draggingElement = dobj;

   var viewportinfo = SocialCalc.GetViewportInfo();
   draginfo.horizontalScroll = viewportinfo.horizontalScroll;
   draginfo.verticalScroll = viewportinfo.verticalScroll;

   draginfo.clientX = e.clientX + draginfo.horizontalScroll; // get document-relative coordinates
   draginfo.clientY = e.clientY + draginfo.verticalScroll;
   draginfo.startX = draginfo.clientX;
   draginfo.startY = draginfo.clientY;
   draginfo.startZ = dobj.element.style.zIndex;
   draginfo.offsetX = 0;
   draginfo.offsetY = 0;

   dobj.element.style.zIndex = "100";

   // Event code from JavaScript, Flanagan, 5th Edition, pg. 422
   if (document.addEventListener) { // DOM Level 2 -- Firefox, et al
      document.addEventListener("mousemove", SocialCalc.DragMouseMove, true); // capture everywhere
      document.addEventListener("mouseup", SocialCalc.DragMouseUp, true);
      }
   else if (dobj.element.attachEvent) { // IE 5+
      dobj.element.setCapture();
      dobj.element.attachEvent("onmousemove", SocialCalc.DragMouseMove);
      dobj.element.attachEvent("onmouseup", SocialCalc.DragMouseUp);
      dobj.element.attachEvent("onlosecapture", SocialCalc.DragMouseUp);
      }
   if (event.stopPropagation) event.stopPropagation(); // DOM Level 2
   else event.cancelBubble = true; // IE 5+
   if (event.preventDefault) event.preventDefault(); // DOM Level 2
   else event.returnValue = false; // IE 5+

   if (dobj && dobj.functionobj && dobj.functionobj.MouseDown) dobj.functionobj.MouseDown(e, draginfo, dobj);

   return false;

   }

//
// DragMouseMove(event)
//

SocialCalc.DragMouseMove = function(event) {

   var e = event || window.event;

   var draginfo = SocialCalc.DragInfo;
   draginfo.clientX = e.clientX + draginfo.horizontalScroll;
   draginfo.clientY = e.clientY + draginfo.verticalScroll;

   var dobj = draginfo.draggingElement;

   if (event.stopPropagation) event.stopPropagation(); // DOM Level 2
   else event.cancelBubble = true; // IE 5+

   if (dobj && dobj.functionobj && dobj.functionobj.MouseMove) dobj.functionobj.MouseMove(e, draginfo, dobj);

   return false;

   }

//
// DragMouseUp(event)
//

SocialCalc.DragMouseUp = function(event) {

   var e = event || window.event;

   var draginfo = SocialCalc.DragInfo;
   draginfo.clientX = e.clientX + draginfo.horizontalScroll;
   draginfo.clientY = e.clientY + draginfo.verticalScroll;

   var dobj = draginfo.draggingElement;

   dobj.element.style.zIndex = draginfo.startZ;

   if (dobj && dobj.functionobj.MouseUp) dobj.functionobj.MouseUp(e, draginfo, dobj);

   if (event.stopPropagation) event.stopPropagation(); // DOM Level 2
   else event.cancelBubble = true; // IE 5+

   if (document.removeEventListener) { // DOM Level 2
      document.removeEventListener("mousemove", SocialCalc.DragMouseMove, true);
      document.removeEventListener("mouseup", SocialCalc.DragMouseUp, true);
      // Note: In old (1.5?) versions of Firefox, this causes the browser to skip the MouseUp for
      // the button code. https://bugzilla.mozilla.org/show_bug.cgi?id=174320
      // Firefox 1.5 is <1% share (http://marketshare.hitslink.com/report.aspx?qprid=7)
      }
   else if (document.detachEvent) { // IE
      dobj.element.detachEvent("onlosecapture", SocialCalc.DragMouseUp);
      dobj.element.detachEvent("onmouseup", SocialCalc.DragMouseUp);
      dobj.element.detachEvent("onmousemove", SocialCalc.DragMouseMove);
      dobj.element.releaseCapture();
      }

   draginfo.draggingElement = null;

   return false;

   }

//
// DragFunctionStart(event, draginfo, dobj)
//

SocialCalc.DragFunctionStart = function(event, draginfo, dobj) {

   var val;
   var element = dobj.functionobj.positionobj || dobj.element;

   val = element.style.top.match(/\d*/);
   draginfo.offsetY = (val ? val[0]-0 : 0) - draginfo.clientY;
   val = element.style.left.match(/\d*/);
   draginfo.offsetX = (val ? val[0]-0 : 0) - draginfo.clientX;

   }

//
// DragFunctionPosition(event, draginfo, dobj)
//

SocialCalc.DragFunctionPosition = function(event, draginfo, dobj) {

   var element = dobj.functionobj.positionobj || dobj.element;

   if (dobj.vertical) element.style.top = (draginfo.clientY + draginfo.offsetY)+"px";
   if (dobj.horizontal) element.style.left = (draginfo.clientX + draginfo.offsetX)+"px";

   }

// *************************************
//
// Tooltip functions:
//
// *************************************

SocialCalc.TooltipInfo = {

   // There is only one of these -- no "new" is done.
   // Only one tooltip operation can be active at a time.
   // The registeredElements array is used to identify items.

   // One item for each element with a tooltip, each an object with:
   //    .element, .tiptext, .functionobj

   registeredElements: [],

   registered: false, // if true, an event handler has been registered for this functionality

   // Items used during hover over an element

   tooltipElement: null, // item being processed (.element is the actual element)
   timer: null, // timer object waiting to see if holding over element
   popupElement: null, // tooltip element being displayed
   clientX: 0, // modifyable version to restrict movement
   clientY: 0,
   offsetX: 2, // modifyable version to allow positioning
   offsetY: 10

   }

//
// TooltipRegister(element, tiptext, functionobj) - make element have a tooltip
//

SocialCalc.TooltipRegister = function(element, tiptext, functionobj) {

   var tooltipinfo = SocialCalc.TooltipInfo;
   tooltipinfo.registeredElements.push(
      {element: element, tiptext: tiptext, functionobj: functionobj}
      );

   if (tooltipinfo.registered) return; // only need to add event listener once

   if (document.addEventListener) { // DOM Level 2 -- Firefox, et al
      document.addEventListener("mousemove", SocialCalc.TooltipMouseMove, false);
      }
   else if (document.attachEvent) { // IE 5+
      document.attachEvent("onmousemove", SocialCalc.TooltipMouseMove);
      }
   else { // don't handle this
      throw "Browser not supported";
      }

   tooltipinfo.registered = true; // remember

   return;

   }

//
// TooltipMouseMove(event)
//

SocialCalc.TooltipMouseMove = function(event) {

   var e = event || window.event;

   var tooltipinfo = SocialCalc.TooltipInfo;

   tooltipinfo.viewport = SocialCalc.GetViewportInfo();
   tooltipinfo.clientX = e.clientX + tooltipinfo.viewport.horizontalScroll;
   tooltipinfo.clientY = e.clientY + tooltipinfo.viewport.verticalScroll;

   var tobj = SocialCalc.LookupElement(e.target || e.srcElement, tooltipinfo.registeredElements);

   if (tooltipinfo.timer) { // waiting to see if holding still: didn't hold still
      window.clearTimeout(tooltipinfo.timer); // cancel timer
      tooltipinfo.timer = null;
      }

   if (tooltipinfo.popupElement) { // currently displaying a tip: hide it
      SocialCalc.TooltipHide();
      }

   tooltipinfo.tooltipElement = tobj || null;

   if (!tobj || SocialCalc.ButtonInfo.buttonDown) return; // if not an object with a tip or a "button" is down, ignore

   tooltipinfo.timer = window.setTimeout(SocialCalc.TooltipWaitDone, 700);

   if (tooltipinfo.tooltipElement.element.addEventListener) { // Register event for mouse down which cancels tooltip stuff
      tooltipinfo.tooltipElement.element.addEventListener("mousedown", SocialCalc.TooltipMouseDown, false);
      }
   else if (tooltipinfo.tooltipElement.element.attachEvent) { // IE
      tooltipinfo.tooltipElement.element.attachEvent("onmousedown", SocialCalc.TooltipMouseDown);
      }

   return;

   }

//
// TooltipMouseDown(event)
//

SocialCalc.TooltipMouseDown = function(event) {

   var e = event || window.event;

   var tooltipinfo = SocialCalc.TooltipInfo;

   if (tooltipinfo.timer) {
      window.clearTimeout(tooltipinfo.timer); // cancel timer
      tooltipinfo.timer = null;
      }

   if (tooltipinfo.popupElement) { // currently displaying a tip: hide it
      SocialCalc.TooltipHide();
      }

   if (tooltipinfo.tooltipElement) {
      if (tooltipinfo.tooltipElement.element.removeEventListener) { // DOM Level 2 -- Firefox, et al
         tooltipinfo.tooltipElement.element.removeEventListener("mousedown", SocialCalc.TooltipMouseDown, false);
         }
      else if (tooltipinfo.tooltipElement.element.attachEvent) { // IE 5+
         tooltipinfo.tooltipElement.element.detachEvent("onmousedown", SocialCalc.TooltipMouseDown);
         }
      tooltipinfo.tooltipElement = null;
      }

   return;

   }

//
// TooltipDisplay(tobj)
//

SocialCalc.TooltipDisplay = function(tobj) {

   var tooltipinfo = SocialCalc.TooltipInfo;

   tooltipinfo.popupElement = document.createElement("div");
   tooltipinfo.popupElement.style.border = "1px solid black";
   tooltipinfo.popupElement.style.padding = "1px 2px 2px 2px";
   tooltipinfo.popupElement.style.textAlign = "center";
   tooltipinfo.popupElement.style.backgroundColor = "#FFF";
   tooltipinfo.popupElement.style.fontSize = "7pt";
   tooltipinfo.popupElement.innerHTML = tobj.tiptext;
   tooltipinfo.popupElement.style.position = "absolute";
   tooltipinfo.popupElement.style.width = "auto";
   tooltipinfo.popupElement.style.zIndex = 110;

   if (tooltipinfo.clientX > tooltipinfo.viewport.width/2) { // on right side of screen
      tooltipinfo.popupElement.style.bottom = (tooltipinfo.viewport.height - tooltipinfo.clientY + tooltipinfo.offsetY)+"px";
      tooltipinfo.popupElement.style.right = (tooltipinfo.viewport.width - tooltipinfo.clientX + tooltipinfo.offsetX)+"px";
      }
   else { // on left side of screen
      tooltipinfo.popupElement.style.bottom = (tooltipinfo.viewport.height - tooltipinfo.clientY + tooltipinfo.offsetY)+"px";
      tooltipinfo.popupElement.style.left = (tooltipinfo.clientX + tooltipinfo.offsetX)+"px";
      }

   document.body.appendChild(tooltipinfo.popupElement);

   }

//
// TooltipHide()
//

SocialCalc.TooltipHide = function() {

   var tooltipinfo = SocialCalc.TooltipInfo;

   if (tooltipinfo.popupElement) {
      tooltipinfo.popupElement.parentNode.removeChild(tooltipinfo.popupElement);
      tooltipinfo.popupElement = null;
      }

   }

//
// TooltipWaitDone()
//

SocialCalc.TooltipWaitDone = function() {

   var tooltipinfo = SocialCalc.TooltipInfo;

   tooltipinfo.timer = null;

   SocialCalc.TooltipDisplay(tooltipinfo.tooltipElement);

   }


// *************************************
//
// Button functions:
//
// *************************************

SocialCalc.ButtonInfo = {

   // There is only one of these -- no "new" is done.
   // Only one button operation can be active at a time.
   // The registeredElements array is used to identify items.

   // One item for each clickable element, each an object with:
   //    .element, .normalstyle, .hoverstyle, .downstyle, .repeatinterval, .functionobj
   //
   // .functionobj is an object with optional function objects for:
   //    mouseover, mouseout, mousedown, repeatinterval, mouseup

   registeredElements: [],

   // Items used during hover over an element, clicking, repeating, etc.

   buttonElement: null, // item being processed, hover or down (.element is the actual element)
   doingHover: false, // true if mouse is over one of our elements
   buttonDown: false, // true if button down and buttonElement not null
   timer: null, // timer object for repeating

   // Used while processing an event

   horizontalScroll: 0,
   verticalScroll: 0,
   clientX: 0,
   clientY: 0

   }

//
// ButtonRegister(element, paramobj, functionobj) - make element clickable
//
// The arguments (other than element) may be null (meaning no change for style and no repeat)
// The paramobj has the optional normalstyle, hoverstyle, downstyle, repeatwait, repeatinterval settings

SocialCalc.ButtonRegister = function(element, paramobj, functionobj) {

   var buttoninfo = SocialCalc.ButtonInfo;

   if (!paramobj) paramobj = {};

   buttoninfo.registeredElements.push(
      {name: paramobj.name, element: element, normalstyle: paramobj.normalstyle, hoverstyle: paramobj.hoverstyle, downstyle: paramobj.downstyle,
       repeatwait: paramobj.repeatwait, repeatinterval: paramobj.repeatinterval, functionobj: functionobj}
      );

   if (element.addEventListener) { // DOM Level 2 -- Firefox, et al
      element.addEventListener("mousedown", SocialCalc.ButtonMouseDown, false);
      element.addEventListener("mouseover", SocialCalc.ButtonMouseOver, false);
      element.addEventListener("mouseout", SocialCalc.ButtonMouseOut, false);
      }
   else if (element.attachEvent) { // IE 5+
      element.attachEvent("onmousedown", SocialCalc.ButtonMouseDown);
      element.attachEvent("onmouseover", SocialCalc.ButtonMouseOver);
      element.attachEvent("onmouseout", SocialCalc.ButtonMouseOut);
      }
   else { // don't handle this
      throw "Browser not supported";
      }

   return;

   }

//
// ButtonMouseOver(event)
//

SocialCalc.ButtonMouseOver = function(event) {

   var e = event || window.event;

   var buttoninfo = SocialCalc.ButtonInfo;

   var bobj = SocialCalc.LookupElement(e.target || e.srcElement, buttoninfo.registeredElements);

   if (!bobj) return;

   if (buttoninfo.buttonDown) {
      if (buttoninfo.buttonElement==bobj) {
         buttoninfo.doingHover = true; // keep track whether we are on the pressed button or not
         }
      return;
      }

   if (buttoninfo.buttonElement &&
          buttoninfo.buttonElement!=bobj && buttoninfo.doingHover) { // moved to a new one, undo hover there
      SocialCalc.setStyles(buttoninfo.buttonElement.element, buttoninfo.buttonElement.normalstyle);
      }

   buttoninfo.buttonElement = bobj; // remember this one is hovering
   buttoninfo.doingHover = true;

   SocialCalc.setStyles(bobj.element, bobj.hoverstyle); // set style (if provided)

   return;

   }

//
// ButtonMouseOut(event)
//

SocialCalc.ButtonMouseOut = function(event) {

   var e = event || window.event;

   var buttoninfo = SocialCalc.ButtonInfo;

   if (buttoninfo.buttonDown) {
      buttoninfo.doingHover = false; // keep track of overs and outs
      return;
      }

   var bobj = SocialCalc.LookupElement(e.target || e.srcElement, buttoninfo.registeredElements);

   if (buttoninfo.doingHover) { // if there was a hover, undo it
      if (buttoninfo.buttonElement)
         SocialCalc.setStyles(buttoninfo.buttonElement.element, buttoninfo.buttonElement.normalstyle);
      buttoninfo.buttonElement = null;
      buttoninfo.doingHover = false;
      }

   return;

   }

//
// ButtonMouseDown(event)
//

SocialCalc.ButtonMouseDown = function(event) {

   var e = event || window.event;

   var buttoninfo = SocialCalc.ButtonInfo;

   var viewportinfo = SocialCalc.GetViewportInfo();

   var bobj = SocialCalc.LookupElement(e.target || e.srcElement, buttoninfo.registeredElements);

   if (!bobj) return; // not one of our elements

   buttoninfo.buttonElement = bobj;
   buttoninfo.buttonDown = true;

   SocialCalc.setStyles(bobj.element, buttoninfo.buttonElement.downstyle);

   // Register event handler for mouse up

   // Event code from JavaScript, Flanagan, 5th Edition, pg. 422
   if (document.addEventListener) { // DOM Level 2 -- Firefox, et al
      document.addEventListener("mouseup", SocialCalc.ButtonMouseUp, true); // capture everywhere
      }
   else if (bobj.element.attachEvent) { // IE 5+
      bobj.element.setCapture();
      bobj.element.attachEvent("onmouseup", SocialCalc.ButtonMouseUp);
      bobj.element.attachEvent("onlosecapture", SocialCalc.ButtonMouseUp);
      }
   if (event.stopPropagation) event.stopPropagation(); // DOM Level 2
   else event.cancelBubble = true; // IE 5+
   if (event.preventDefault) event.preventDefault(); // DOM Level 2
   else event.returnValue = false; // IE 5+

   buttoninfo.horizontalScroll = viewportinfo.horizontalScroll;
   buttoninfo.verticalScroll = viewportinfo.verticalScroll;
   buttoninfo.clientX = e.clientX + buttoninfo.horizontalScroll; // get document-relative coordinates
   buttoninfo.clientY = e.clientY + buttoninfo.verticalScroll;

   if (bobj && bobj.functionobj && bobj.functionobj.MouseDown) bobj.functionobj.MouseDown(e, buttoninfo, bobj);

   if (bobj.repeatwait) { // if a repeat wait is set, then starting waiting for first repetition
      buttoninfo.timer = window.setTimeout(SocialCalc.ButtonRepeat, bobj.repeatwait);
      }

   return;

   }

//
// ButtonMouseUp(event)
//

SocialCalc.ButtonMouseUp = function(event) {

   var e = event || window.event;

   var buttoninfo = SocialCalc.ButtonInfo;
   var bobj = buttoninfo.buttonElement;

   if (buttoninfo.timer) { // if repeating, cancel it
      window.clearTimeout(buttoninfo.timer); // cancel timer
      buttoninfo.timer = null;
      }

   if (!buttoninfo.buttonDown) return; // already did this (e.g., in IE, releaseCapture fires losecapture)

   if (event.stopPropagation) event.stopPropagation(); // DOM Level 2
   else event.cancelBubble = true; // IE 5+
   if (event.preventDefault) event.preventDefault(); // DOM Level 2
   else event.returnValue = false; // IE 5+

   if (document.removeEventListener) { // DOM Level 2
      document.removeEventListener("mouseup", SocialCalc.ButtonMouseUp, true);
      }
   else if (document.detachEvent) { // IE
      bobj.element.detachEvent("onlosecapture", SocialCalc.ButtonMouseUp);
      bobj.element.detachEvent("onmouseup", SocialCalc.ButtonMouseUp);
      bobj.element.releaseCapture();
      }

   if (buttoninfo.buttonElement.downstyle) {
      if (buttoninfo.doingHover)
         SocialCalc.setStyles(bobj.element, buttoninfo.buttonElement.hoverstyle);
      else
         SocialCalc.setStyles(bobj.element, buttoninfo.buttonElement.normalstyle);
      }

   buttoninfo.buttonDown = false;

   }

//
// ButtonRepeat()
//

SocialCalc.ButtonRepeat = function() {

   var buttoninfo = SocialCalc.ButtonInfo;
   var bobj = buttoninfo.buttonElement;

   if (!bobj) return;

   if (bobj && bobj.functionobj && bobj.functionobj.Repeat) bobj.functionobj.Repeat(null, buttoninfo, bobj);

   buttoninfo.timer = window.setTimeout(SocialCalc.ButtonRepeat, bobj.repeatinterval || 100);

   }

// *************************************
//
// MouseWheel functions:
//
// *************************************

SocialCalc.MouseWheelInfo = {

   // There is only one of these -- no "new" is done.
   // The mousewheel only affects the one area the mouse pointer is over
   // The registeredElements array is used to identify items.

   // One item for each element to respond to the mousewheel, each an object with:
   //    .element, .functionobj

   registeredElements: []

   }

//
// MouseWheelRegister(element, functionobj) - make element respond to mousewheel
//

SocialCalc.MouseWheelRegister = function(element, functionobj) {

   var mousewheelinfo = SocialCalc.MouseWheelInfo;

   mousewheelinfo.registeredElements.push(
      {element: element, functionobj: functionobj}
      );

   if (element.addEventListener) { // DOM Level 2 -- Firefox, et al
      element.addEventListener("DOMMouseScroll", SocialCalc.ProcessMouseWheel, false);
      element.addEventListener("mousewheel", SocialCalc.ProcessMouseWheel, false); // Opera needs this
      }
   else if (element.attachEvent) { // IE 5+
      element.attachEvent("onmousewheel", SocialCalc.ProcessMouseWheel);
      }
   else { // don't handle this
      throw "Browser not supported";
      }

   return;

   }

SocialCalc.ProcessMouseWheel = function(e) {

   var event = e || window.event;
   var delta;

   if (SocialCalc.Keyboard.passThru) return; // ignore

   var mousewheelinfo = SocialCalc.MouseWheelInfo;
   var ele = event.target || event.srcElement; // source object is often within what we want
   var wobj;

   for (wobj=null; !wobj && ele; ele=ele.parentNode) { // go up tree looking for one of our elements
      wobj = SocialCalc.LookupElement(ele, mousewheelinfo.registeredElements);
      }
   if (!wobj) return; // not one of our elements

   if (event.wheelDelta) {
      delta = event.wheelDelta/120;
      }
   else delta = -event.detail/3;
   if (!delta) delta = 0;

   if (wobj.functionobj && wobj.functionobj.WheelMove) wobj.functionobj.WheelMove(event, delta, mousewheelinfo, wobj);

   if (event.preventDefault) event.preventDefault();
   event.returnValue = false;

   }

// *************************************
//
// Keyboard functions:
//
// *************************************

SocialCalc.keyboardTables = {

   specialKeysIE: {
      8: "[backspace]", 9: "[tab]", 13: "[enter]", 25: "[tab]", 27: "[esc]", 33: "[pgup]", 34: "[pgdn]",
      35: "[end]", 36: "[home]", 37: "[aleft]", 38: "[aup]", 39: "[aright]", 40: "[adown]", 45: "[ins]",
      46: "[del]"
      },

   controlKeysIE: {
      86: "[ctrl-v]"
      },

   specialKeysOpera: {
      8: "[backspace]", 9: "[tab]", 13: "[enter]", 25: "[tab]", 27: "[esc]", 33: "[pgup]", 34: "[pgdn]",
      35: "[end]", 36: "[home]", 37: "[aleft]", 38: "[aup]", 39: "[aright]", 40: "[adown]",
      45: "[ins]", // issues with releases before 9.5 - same as "-" ("-" changed in 9.5)
      46: "[del]" // issues with releases before 9.5 - same as "." ("." changed in 9.5)
      },

   controlKeysOpera: {
      86: "[ctrl-v]"
      },

   specialKeysSafari: {
      8: "[backspace]", 9: "[tab]", 13: "[enter]", 25: "[tab]", 27: "[esc]", 63232: "[aup]", 63233: "[adown]",
      63234: "[aleft]", 63235: "[aright]", 63272: "[del]", 63273: "[home]", 63275: "[end]", 63276: "[pgup]",
      63277: "[pgdn]"
      },

   controlKeysSafari: {
      118: "[ctrl-v]"
      },

   ignoreKeysSafari: {
      63236: "[f1]", 63237: "[f2]", 63238: "[f3]", 63239: "[f4]", 63240: "[f5]", 63241: "[f6]", 63242: "[f7]",
      63243: "[f8]", 63244: "[f9]", 63245: "[f10]", 63246: "[f11]", 63247: "[f12]", 63289: "[numlock]"
      },

   specialKeysFirefox: {
      8: "[backspace]", 9: "[tab]", 13: "[enter]", 25: "[tab]", 27: "[esc]", 33: "[pgup]", 34: "[pgdn]",
      35: "[end]", 36: "[home]", 37: "[aleft]", 38: "[aup]", 39: "[aright]", 40: "[adown]", 45: "[ins]",
      46: "[del]"
      },

   controlKeysFirefox: {
      118: "[ctrl-v]"
      },

   ignoreKeysFirefox: {
      16: "[shift]", 17: "[ctrl]", 18: "[alt]", 20: "[capslock]", 19: "[pause]", 44: "[printscreen]",
      91: "[windows]", 92: "[windows]", 112: "[f1]", 113: "[f2]", 114: "[f3]", 115: "[f4]", 116: "[f5]",
      117: "[f6]", 118: "[f7]", 119: "[f8]", 120: "[f9]", 121: "[f10]", 122: "[f11]", 123: "[f12]",
      144: "[numlock]", 145: "[scrolllock]", 224: "[cmd]"
      }
   }

SocialCalc.Keyboard = {
   areListener: false, // if true, we have been installed as a listener for keyboard events
   focusTable: null, // the table editor object that gets keystrokes or null
   passThru: null // if not null, control element with focus to pass keyboard events to (has blur method), or "true"
   };

SocialCalc.KeyboardSetFocus = function(editor) {

   SocialCalc.Keyboard.focusTable = editor;

   if (!SocialCalc.Keyboard.areListener) {
      document.onkeydown = SocialCalc.ProcessKeyDown;
      document.onkeypress = SocialCalc.ProcessKeyPress;
      SocialCalc.Keyboard.areListener = true;
      }
   if (SocialCalc.Keyboard.passThru) {
      if (SocialCalc.Keyboard.passThru.blur) {
         SocialCalc.Keyboard.passThru.blur();
         }
      SocialCalc.Keyboard.passThru = null;
      }
   window.focus();
   }

SocialCalc.KeyboardFocus = function() {

   SocialCalc.Keyboard.passThru = null;
   window.focus();

   }

SocialCalc.ProcessKeyDown = function(e) {

   var kt = SocialCalc.keyboardTables;

   var ch="";
   var status=true;

   if (SocialCalc.Keyboard.passThru) return; // ignore

   e = e || window.event;

   if (e.which==undefined) { // IE
      ch = kt.specialKeysIE[e.keyCode];
      if (!ch) {
         if (e.ctrlKey) {
            ch=kt.controlKeysIE[e.keyCode];
            }
         if (!ch)
            return true;
         }

      status = SocialCalc.ProcessKey(ch, e);

      if (!status) {
         if (e.preventDefault) e.preventDefault();
            e.returnValue = false;
         }
      }

   else { // don't do anything for other browsers - wait for keyPress
      ; // special key repeats are done as keypress in those browsers
      }

   return status;

   }

SocialCalc.ProcessKeyPress = function(e) {

   var kt = SocialCalc.keyboardTables;

   var ch="";

   if (SocialCalc.Keyboard.passThru) return; // ignore

   e = e || window.event;

   if (e.which==undefined) { // IE
      // Note: Esc and Enter will come through here, too, if not stopped at KeyDown
      ch=String.fromCharCode(e.keyCode); // convert to a character (special chars handled at ev1)
      }

   else { // not IE
      if (e.charCode==undefined) { // Opera
         if (e.which!=0) { // character
            if (e.which<32) { // special char
               ch = kt.specialKeysOpera[e.keyCode];
               if (!ch)
                  return true;
               }
            else {
               if (e.ctrlKey) {
                  ch=kt.controlKeysOpera[e.keyCode];
                  }
               else {
                  ch = String.fromCharCode(e.which);
                  }
               }
            }
         else { // special char
            ch = kt.specialKeysOpera[e.keyCode];
            if (!ch)
               return true;
            }
         }

      else if (e.keyCode==0 && e.charCode==0) { // OLPC Fn key or something
         return; // ignore
         }

      else if (e.keyCode==e.charCode) { // Safari
         ch = kt.specialKeysSafari[e.keyCode];
         if (!ch) {
            if (kt.ignoreKeysSafari[e.keyCode]) // pass this through
               return true;
            if (e.metaKey) {
               ch=kt.controlKeysSafari[e.keyCode];
               }
            else {
               ch = String.fromCharCode(e.which);
               }
            }
         }

      else { // Firefox
         ch = kt.specialKeysFirefox[e.keyCode];
         if (!ch) {
            if (kt.ignoreKeysFirefox[e.keyCode]) // pass this through
               return true;
            if (e.which) { // normal char
               if (e.ctrlKey || e.metaKey) {
                  ch = kt.controlKeysFirefox[e.which];
                  }
               else {
                  ch = String.fromCharCode(e.which);
                  }
               }
            else { // usually a special char
               return true; // old Firefox gives extra, empty keyPress for "/" - ignore
               }
            }
         }
      }

   var status = SocialCalc.ProcessKey(ch, e);

   if (!status) {
      if (e.preventDefault) e.preventDefault();
      e.returnValue = false;
      }

   return status;

   }

//
// status = SocialCalc.ProcessKey(ch, e)
//
// Take a key representation as a character string and dispatch to appropriate routine
//

SocialCalc.ProcessKey = function (ch, e) {

   var ft = SocialCalc.Keyboard.focusTable;

   if (!ft) return true; // we're not handling it -- let browser do default

   return ft.EditorProcessKey(ch, e);

   }


