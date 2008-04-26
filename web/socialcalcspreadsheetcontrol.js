//
// SocialCalcSpreadsheetControl
//
// The code module of the SocialCalc package that lets you embed a spreadsheet
// control with toolbar, etc., into a web page.
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

The Original Code is SocialCalc JavaScript SpreadsheetControl.

The Original Developer is the Initial Developer.

The Initial Developer of the Original Code is Socialtext, Inc. All portions of the code written by 
Socialtext, Inc., are Copyright (c) Socialtext, Inc. All Rights Reserved.

Contributor: Dan Bricklin.


EXHIBIT B. Attribution Information

When the SpreadsheetControl is producing and/or controlling the display the Graphic Image must be
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

Attribution URL: http://www.socialcalc.org/

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
   if (!SocialCalc.TableEditor) {
      alert("SocialCalc TableEditor code module needed");
      }

// *************************************
//
// SpreadsheetControl class:
//
// *************************************

// Global constants:

   SocialCalc.CurrentSpreadsheetControlObject = null; // right now there can only be one active at a time


// Constructor:

SocialCalc.SpreadsheetControl = function() {

   // Properties:

   this.parentNode = null;
   this.spreadsheetDiv = null;
   this.requestedHeight = 0;
   this.requestedWidth = 0;
   this.height = 0;
   this.width = 0;

   // Tab definitions: An array where each tab is an object of the form:
   //
   //    name: "name",
   //    text: "text-on-tab",
   //    html: "html-to-create div",
   //       replacements:
   //         "%s.": "SocialCalc", "%id.": spreadsheet.idPrefix, "%tbt.": spreadsheet.toolbartext
   //    view: "viewname", // view to show when selected; "sheet" or missing/null is spreadsheet
   //    onclick: function(spreadsheet, tab-name), missing/null is sheet default
   //    onclickFocus: text, // spreadsheet.idPrefix+text is given the focus if present instead of normal KeyboardFocus
   //       or if text isn't a string, that value (e.g., true) is used for SocialCalc.CmdGotFocus
   //    onunclick: function(spreadsheet, tab-name), missing/null is sheet default

   this.tabs = [];
   this.tabnums = {}; // when adding tabs, add tab-name: array-index to this object
   this.currentTab = -1; // currently selected tab index in this.tabs or -1 (maintained by SocialCalc.SetTab)

   // View definitions: An object where each view is an object of the form:
   //
   //    name: "name",
   //    element: node-in-the-dom, // filled in when initialized
   //    html: "html-to-create div",
   //       replacements:
   //         "%s.": "SocialCalc", "%id.": spreadsheet.idPrefix, "%tbt.": spreadsheet.toolbartext
   //
   // There is always a "sheet" view.

   this.views = {}; // {viewname: view-object, ...}

   // Dynamic properties:

   this.sheet = null;
   this.context = null;
   this.editor = null;

   this.spreadsheetDiv = null;
   this.editorDiv = null;

   this.sortrange = ""; // remembered range for sort tab

   // Constants:

   this.idPrefix = "SocialCalc-"; // prefix added to element ids used here
   this.multipartBoundary = "SocialCalcSpreadsheetControlSave"; // boundary used by SpreadsheetControlCreateSpreadsheetSave

   this.toolbarbackground = "background-color:#404040;";
   this.tabbackground = "background-color:#CCC;";
   this.tabselectedCSS = "padding:6px 30px 6px 8px;color:#FFF;background-color:#404040;cursor:default;border-right:1px solid #CCC;";
   this.tabplainCSS = "padding:6px 30px 6px 8px;color:#FFF;background-color:#808080;cursor:default;border-right:1px solid #CCC;";
   this.toolbartext = "font-size:smaller;font-weight:bold;color:#FFF;padding-bottom:4px;";

   // Callbacks:

   // Initialization Code:

   this.sheet = new SocialCalc.Sheet();
   this.context = new SocialCalc.RenderContext(this.sheet);
   this.context.showGrid=true;
   this.context.showRCHeaders=true;
   this.editor = new SocialCalc.TableEditor(this.context);

   SocialCalc.CurrentSpreadsheetControlObject = this; // remember this for rendezvousing on events

   // Default tabs:

   // Edit

   this.tabnums.edit = this.tabs.length;
   this.tabs.push({name: "edit", text: "Edit", html:
      ' <div id="%id.edittools">'+
      '  <input type="button" value="Undo" onclick="%s.DoCmd(this, \'undo\');" style="font-size:smaller;">'+
      '  <input type="button" value="Redo" onclick="%s.DoCmd(this, \'redo\');" style="font-size:smaller;">'+
      '  <input type="button" value="Copy" onclick="%s.DoCmd(this, \'copy\');" style="font-size:smaller;">'+
      '  <input type="button" value="Paste" onclick="%s.DoCmd(this, \'paste\');" style="font-size:smaller;">'+
      '  <input type="button" value="Fill Down" onclick="%s.DoCmd(this, \'filldown\');" style="font-size:smaller;">'+
      '  <input type="button" value="Fill Right" onclick="%s.DoCmd(this, \'fillright\');" style="font-size:smaller;">'+
      '  <input type="button" value="Erase" onclick="%s.DoCmd(this, \'erase\');" style="font-size:smaller;">'+
      '  <select id="%id.rowcolstufflist" size="1" onchange="%s.DoCmd(this, \'changed-rowcolstuff\');" onfocus="%s.CmdGotFocus(this);"></select>'+
      '  <select id="%id.rowcolstuffslist" size="1" onfocus="%s.CmdGotFocus(this);"></select>'+
      '  <input type="button" value="OK" onclick="%s.DoCmd(this, \'ok-rowcolstuff\');" style="font-size:smaller;">'+
      ' </div>',
      onclick: null});

   // Text

   this.tabnums.text = this.tabs.length;
   this.tabs.push({name: "text", text: "Text", html:
      ' <div id="%id.texttools" style="display:none;">'+
      '  <table cellspacing="0" cellpadding="0"><tr>'+
      '   <td style="vertical-align:top;padding-right:4px;">'+
      '    <div style="%tbt.">&nbsp;</div>'+
      '     <select id="%id.textlist" size="1" onchange="%s.DoCmd(this, \'changed-text\');" onfocus="%s.CmdGotFocus(this);"></select>'+
      '     <select id="%id.textslist" size="1" onfocus="%s.CmdGotFocus(this);"></select>'+
      '     <input type="button" value="OK" onclick="%s.DoCmd(this, \'ok-text\');" style="font-size:smaller;">'+
      '   </td>'+
      '  </tr></table>'+
      ' </div>',
      onclick: null});

   // Edit

   this.tabnums.format = this.tabs.length;
   this.tabs.push({name: "format", text: "Format", html:
      ' <div id="%id.formattools" style="display:none;">'+
      '  <input type="button" value="Border On" onclick="%s.DoCmd(this, \'borderon\');" style="font-size:smaller;">'+
      '  <input type="button" value="Border Off" onclick="%s.DoCmd(this, \'borderoff\');" style="font-size:smaller;">'+
      '  <input type="button" value="Merge Cells" onclick="%s.DoCmd(this, \'merge\');" style="font-size:smaller;">'+
      '  <input type="button" value="Unmerge" onclick="%s.DoCmd(this, \'unmerge\');" style="font-size:smaller;">'+
      ' </div>',
      onclick: null});

   // Sort

   this.tabnums.sort = this.tabs.length;
   this.tabs.push({name: "sort", text: "Sort", html:
      ' <div id="%id.sorttools" style="display:none;">'+
      '  <table cellspacing="0" cellpadding="0"><tr>'+
      '   <td style="vertical-align:top;padding-right:4px;width:160px;">'+
      '    <div style="%tbt.">Set Cells To Sort</div>'+
      '    <select id="%id.sortlist" size="1" onfocus="%s.CmdGotFocus(this);"><option selected>[select range]</option></select>'+
      '    <input type="button" value="OK" onclick="%s.DoCmd(this, \'ok-setsort\');" style="font-size:smaller;">'+
      '   </td>'+
      '   <td style="vertical-align:middle;padding-right:16px;width:100px;text-align:right;">'+
      '    <div style="%tbt.">&nbsp;</div>'+
      '    <input type="button" id="%id.sortbutton" value="Sort Cells A1:A1" onclick="%s.DoCmd(this, \'dosort\');" style="visibility:hidden;">'+
      '   </td>'+
      '   <td style="vertical-align:top;padding-right:16px;">'+
      '    <table cellspacing="0" cellpadding="0"><tr>'+
      '     <td style="vertical-align:top;">'+
      '      <div style="%tbt.">Major Sort</div>'+
      '      <select id="%id.majorsort" size="1" onfocus="%s.CmdGotFocus(this);"></select>'+
      '     </td><td>'+
      '      <input type="radio" name="majorsort" id="%id.majorsortup" value="up" checked><span style="font-size:smaller;color:#FFF;">Up</span><br>'+
      '      <input type="radio" name="majorsort" value="down"><span style="font-size:smaller;color:#FFF;">Down</span>'+
      '     </td>'+
      '    </tr></table>'+
      '   </td>'+
      '   <td style="vertical-align:top;padding-right:16px;">'+
      '    <table cellspacing="0" cellpadding="0"><tr>'+
      '     <td style="vertical-align:top;">'+
      '      <div style="%tbt.">Minor Sort</div>'+
      '      <select id="%id.minorsort" size="1" onfocus="%s.CmdGotFocus(this);"></select>'+
      '     </td><td>'+
      '      <input type="radio" name="minorsort" id="%id.minorsortup" value="up" checked><span style="font-size:smaller;color:#FFF;">Up</span><br>'+
      '      <input type="radio" name="minorsort" value="down"><span style="font-size:smaller;color:#FFF;">Down</span>'+
      '     </td>'+
      '    </tr></table>'+
      '   </td>'+
      '   <td style="vertical-align:top;padding-right:16px;">'+
      '    <table cellspacing="0" cellpadding="0"><tr>'+
      '     <td style="vertical-align:top;">'+
      '      <div style="%tbt.">Last Sort</div>'+
      '      <select id="%id.lastsort" size="1" onfocus="%s.CmdGotFocus(this);"></select>'+
      '     </td><td>'+
      '      <input type="radio" name="lastsort" id="%id.lastsortup" value="up" checked><span style="font-size:smaller;color:#FFF;">Up</span><br>'+
      '      <input type="radio" name="lastsort" value="down"><span style="font-size:smaller;color:#FFF;">Down</span>'+
      '     </td>'+
      '    </tr></table>'+
      '   </td>'+
      '  </tr></table>'+
      ' </div>',
      onclick: SocialCalc.SpreadsheetControlSortOnclick});

   // Audit

   this.tabnums.audit = this.tabs.length;
   this.tabs.push({name: "audit", text: "Audit", html:
      '<div id="%id.audittools" style="display:none;">'+
      ' <div style="%tbt.">&nbsp;</div>'+
      '</div>',
      view: "audit",
      onclick:
         function(s, t) {
            var i, j;
            var str = '<table cellspacing="0" cellpadding="0" style="margin-bottom:10px;"><tr><td style="padding:6px;"><b>Audit Trail This Session:</b><br><br>';
            var stack = s.sheet.changes.stack;
            var tos = s.sheet.changes.tos;
            for (i=0; i<stack.length; i++) {
               if (i==tos+1) str += '<br></td></tr><tr><td style="background-color:#EEE;padding:6px;">UNDONE STEPS:<br>';
               for (j=0; j<stack[i].command.length; j++) {
                  str += stack[i].command[j] + "<br>";
                  }
               }
            s.views.audit.element.firstChild.style.width = s.views.audit.element.style.width;
            s.views.audit.element.firstChild.style.height = s.views.audit.element.style.height;
            s.views.audit.element.firstChild.innerHTML = str+"</td></tr></table>";
            SocialCalc.CmdGotFocus(true);
            },
      onclickFocus: true
         });

   this.views["audit"] = {name: "audit", html:
      '<div id="%id.auditview" style="margin-right:10px;border:1px solid black;overflow:auto;">Audit Trail</div>'
      };

   // Comment

   this.tabnums.comment = this.tabs.length;
   this.tabs.push({name: "comment", text: "Comment", html:
      '<div id="%id.commenttools" style="display:none;">'+
      '<table cellspacing="0" cellpadding="0"><tr><td>'+
      '<textarea id="%id.commenttext" style="height:35px;width:600px;overflow:auto;" onfocus="%s.CmdGotFocus(this);"></textarea>'+
      '</td><td style="vertical-align:top;">'+
      '&nbsp;<input type="button" value="Save" onclick="%s.SpreadsheetControlCommentSet();" style="font-size:smaller;">'+
      '</td></tr></table>'+
      '</div>',
      view: "sheet",
      onclick: SocialCalc.SpreadsheetControlCommentOnclick,
      onunclick: SocialCalc.SpreadsheetControlCommentOnunclick
      });

   // Names

   this.tabnums.names = this.tabs.length;
   this.tabs.push({name: "names", text: "Names", html:
      '<div id="%id.namestools" style="display:none;">'+
      '  <table cellspacing="0" cellpadding="0"><tr>'+
      '   <td style="vertical-align:top;padding-right:24px;">'+
      '    <div style="%tbt.">Existing Names</div>'+
      '    <select id="%id.nameslist" size="1" onchange="%s.SpreadsheetControlNamesChangedName();" onfocus="%s.CmdGotFocus(this);"><option selected>[New]</option></select>'+
      '   </td>'+
      '   <td style="vertical-align:top;padding-right:6px;">'+
      '    <div style="%tbt.">Name</div>'+
      '    <input type="text" id="%id.namesname" style="font-size:smaller;width:75px;" onfocus="%s.CmdGotFocus(this);">'+
      '   </td>'+
      '   <td style="vertical-align:top;padding-right:6px;">'+
      '    <div style="%tbt.">Description</div>'+
      '    <input type="text" id="%id.namesdesc" style="font-size:smaller;width:150px;" onfocus="%s.CmdGotFocus(this);">'+
      '   </td>'+
      '   <td style="vertical-align:top;padding-right:6px;">'+
      '    <div style="%tbt.">Value</div>'+
      '    <input type="text" id="%id.namesvalue" width="16" style="font-size:smaller;width:100px;" onfocus="%s.CmdGotFocus(this);">'+
      '   </td>'+
      '   <td style="vertical-align:top;padding-right:12px;width:75px;">'+
      '    <div style="%tbt.">Set Value To</div>'+
      '    <input type="button" id="%id.namesrangeproposal" value="A1" onclick="%s.SpreadsheetControlNamesSetValue();" style="font-size:smaller;">'+
      '   </td>'+
      '   <td style="vertical-align:top;padding-right:6px;">'+
      '    <div style="%tbt.">&nbsp;</div>'+
      '    <input type="button" value="Save" onclick="%s.SpreadsheetControlNamesSave();" style="font-size:smaller;">'+
      '    <input type="button" value="Delete" onclick="%s.SpreadsheetControlNamesDelete()" style="font-size:smaller;">'+
      '   </td>'+
      '  </tr></table>'+
      '</div>',
      view: "sheet",
      onclick: SocialCalc.SpreadsheetControlNamesOnclick,
      onunclick: SocialCalc.SpreadsheetControlNamesOnunclick
      });

   // Clipboard

   this.tabnums.clipboard = this.tabs.length;
   this.tabs.push({name: "clipboard", text: "Clipboard", html:
      '<div id="%id.clipboardtools" style="display:none;">'+
      '  <table cellspacing="0" cellpadding="0"><tr>'+
      '   <td style="vertical-align:top;padding-right:24px;">'+
      '    <div style="%tbt.">'+
      '     The SocialCalc Copy and Paste commands on the Edit tab use a different clipboard than the normal system clipboard.'+
      '     The current contents of the SocialCalc clipboard is displayed below in tab-delimited format.'+
      '     You can paste from the system clipboard into the edit box below and then load the data into the SocialCalc'+
      '     clipboard by pressing the button.'+
      '    </div>'+
      '   </td>'+
      '  </tr></table>'+
      '</div>',
      view: "clipboard",
      onclick: SocialCalc.SpreadsheetControlClipboardOnclick,
      onclickFocus: "clipboardtext"
      });

   this.views["clipboard"] = {name: "clipboard", html:
      '<div id="%id.clipboardview" style="overflow:auto;">'+
      ' <input type="button" value="Load SocialCalc Clipboard With This" style="font-size:smaller;" onclick="%s.SpreadsheetControlClipboardLoad();">&nbsp; '+
      ' <input type="button" value="Clear SocialCalc Clipboard" style="font-size:smaller;" onclick="%s.SpreadsheetControlClipboardClear();"><br>'+
      ' <textarea id="%id.clipboardtext" style="height:400px;width:800px;overflow:auto;" onfocus="%s.CmdGotFocus(this);"></textarea>'+
      '</div>'
      };

   return;

   }

// Methods:

SocialCalc.SpreadsheetControl.prototype.InitializeSpreadsheetControl =
   function(node, height, width) {return SocialCalc.InitializeSpreadsheetControl(this, node, height, width);};
SocialCalc.SpreadsheetControl.prototype.SizeSSDiv = function() {return SocialCalc.SizeSSDiv(this);};
SocialCalc.SpreadsheetControl.prototype.FullRefreshAndRender = function() {return SocialCalc.FullRefreshAndRender(this);};
SocialCalc.SpreadsheetControl.prototype.ExecuteCommand = 
   function(combostr, sstr) {return SocialCalc.SpreadsheetControlExecuteCommand(this, combostr, sstr);};
SocialCalc.SpreadsheetControl.prototype.CreateSheetHTML = 
   function() {return SocialCalc.SpreadsheetControlCreateSheetHTML(this);};
SocialCalc.SpreadsheetControl.prototype.CreateSpreadsheetSave = 
   function() {return SocialCalc.SpreadsheetControlCreateSpreadsheetSave(this);};
SocialCalc.SpreadsheetControl.prototype.DecodeSpreadsheetSave = 
   function(str) {return SocialCalc.SpreadsheetControlDecodeSpreadsheetSave(this, str);};
SocialCalc.SpreadsheetControl.prototype.CreateCellHTML = 
   function(coord) {return SocialCalc.SpreadsheetControlCreateCellHTML(this, coord);};
SocialCalc.SpreadsheetControl.prototype.CreateCellHTMLSave = 
   function(range) {return SocialCalc.SpreadsheetControlCreateCellHTMLSave(this, range);};


// Sheet Methods to make things a little easier:

SocialCalc.SpreadsheetControl.prototype.ParseSheetSave = function(str) {return this.sheet.ParseSheetSave(str);};
SocialCalc.SpreadsheetControl.prototype.CreateSheetSave = function() {return this.sheet.CreateSheetSave();};


// Functions:

//
// InitializeSpreadsheetControl(spreadsheet, node, height, width)
//
// Creates the control elements and makes them the child of node (string or element).
// If present, height and width specify size.
// If either is 0 or null (missing), the maximum that fits on the screen is used.
//
// Displays the tabs and creates the views (other than "sheet").
// The first tab is set as selected, but onclick is not invoked.
//

SocialCalc.InitializeSpreadsheetControl = function(spreadsheet, node, height, width) {

   var html, child, i, vname, v;
   var tabs = spreadsheet.tabs;
   var views = spreadsheet.views;

   spreadsheet.requestedHeight = height;
   spreadsheet.requestedWidth = width;

   if (typeof node == "string") node = document.getElementById(node);

   if (node == null) {
      alert("SocialCalc.SpreadsheetControl not given parent node.");
      }

   spreadsheet.parentNode = node;

   // create node to hold spreadsheet control

   spreadsheet.spreadsheetDiv = document.createElement("div");

   spreadsheet.SizeSSDiv();

   for (child=node.firstChild; child!=null; child=node.firstChild) {
      node.removeChild(child);
      }

   // create the tabbed UI at the top

   html = '<div><div style="'+spreadsheet.toolbarbackground+'padding:12px 10px 16px 4px;height:35px;">';

   for (i=0; i<tabs.length; i++) {
      html += tabs[i].html;
      }

   html += '</div>'+
      '<div style="'+spreadsheet.tabbackground+'padding-bottom:4px;margin:0px 0px 8px 0px;">'+
      '<table cellpadding="0" cellspacing="0"><tr>';

   for (i=0; i<tabs.length; i++) {
      html += '  <td id="%id.' + tabs[i].name + 'tab" style="' +
         (i==0 ? spreadsheet.tabselectedCSS : spreadsheet.tabplainCSS) +
         '" onclick="%s.SetTab(this);">' + tabs[i].text + '</td>';
      }

   html += ' </tr></table></div></div>';

   html = html.replace(/\%s\./g, "SocialCalc.");
   html = html.replace(/\%id\./g, spreadsheet.idPrefix);
   html = html.replace(/\%tbt\./g, spreadsheet.toolbartext);
   spreadsheet.spreadsheetDiv.innerHTML = html;

   node.appendChild(spreadsheet.spreadsheetDiv);

   SocialCalc.DoCmd(null, "fill-rowcolstuff");
   SocialCalc.DoCmd(null, "fill-text");

   spreadsheet.editorDiv=spreadsheet.editor.CreateTableEditor(spreadsheet.width, spreadsheet.height-spreadsheet.spreadsheetDiv.firstChild.offsetHeight);
   spreadsheet.spreadsheetDiv.appendChild(spreadsheet.editorDiv);

   for (vname in views) {
      html = views[vname].html;
      html = html.replace(/\%s\./g, "SocialCalc.");
      html = html.replace(/\%id\./g, spreadsheet.idPrefix);
      html = html.replace(/\%tbt\./g, spreadsheet.toolbartext);
      v = document.createElement("div");
      v.style.display = "none";
      v.style.width = spreadsheet.width + "px";
      v.style.height = spreadsheet.height-spreadsheet.spreadsheetDiv.firstChild.offsetHeight + "px";

      v.innerHTML = html;
      spreadsheet.spreadsheetDiv.appendChild(v);
      views[vname].element = v;
      }

   views.sheet = {name: "sheet", element: spreadsheet.editorDiv};

   spreadsheet.editor.SchedulePositionCalculations();

   return;

   }

//
// obj = GetSpreadsheetControlObject()
//
// Returns the current spreadsheet control object
//

SocialCalc.GetSpreadsheetControlObject = function() {

   var csco = SocialCalc.CurrentSpreadsheetControlObject;
   if (csco) return csco;

   throw ("No current SpreadsheetControl object.");

   }


//
// resized = SocialCalc.SizeSSDiv(spreadsheet)
//
// Figures out a reasonable size for the spreadsheet, given any requested values and viewport.
// Sets ssdiv to that.
// Return true if different than existing values.
//

SocialCalc.SizeSSDiv = function(spreadsheet) {

   var sizes, pos, resized, nodestyle, newval;

   resized = false;

   sizes = SocialCalc.GetViewportInfo();
   pos = SocialCalc.GetElementPosition(spreadsheet.parentNode);
   pos.bottom = 0;

   nodestyle = spreadsheet.parentNode.style;

   if (nodestyle.marginTop) {
      pos.top += nodestyle.marginTop.slice(0,-2)-0;
      }
   if (nodestyle.marginBottom) {
      pos.bottom += nodestyle.marginBottom.slice(0,-2)-0;
      }

   newval = spreadsheet.requestedHeight || sizes.height - pos.top - pos.bottom - 10;
   if (spreadsheet.height != newval) {
      spreadsheet.height = newval;
      spreadsheet.spreadsheetDiv.style.height = newval + "px";
      resized = true;
      }
   newval = spreadsheet.requestedWidth || spreadsheet.parentNode.offsetWidth || 700;
   if (spreadsheet.width != newval) {
      spreadsheet.width = newval;
      spreadsheet.spreadsheetDiv.style.width = newval + "px";
      resized = true;
      }

   return resized;

   }


//
// SocialCalc.FullRefreshAndRender(spreadsheet)
//
// Do all pre-calculations for rendering and then render sheet, recalc'ing if necessary.
//

SocialCalc.FullRefreshAndRender = function(spreadsheet) {

   spreadsheet.context.CalculateCellSkipData();
   spreadsheet.editor.FitToEditTable();
   spreadsheet.context.PrecomputeSheetFonts();
   spreadsheet.context.CalculateColWidthData();
   spreadsheet.editor.EditorRenderSheet();
   spreadsheet.editor.SchedulePositionCalculations();
   if (spreadsheet.sheet.attribs.needsrecalc && spreadsheet.editor.recalcFunction) {
      spreadsheet.editor.recalcFunction(spreadsheet.editor);
      }

   }


//
// SocialCalc.SetTab(obj)
//
// The obj argument is either a string with the tab name or a DOM element with an ID
//

SocialCalc.SetTab = function(obj) {

   var newtab, tname, newtabnum, i, vname, ele;
   var menutabs = {};
   var tools = {};
   var spreadsheet = SocialCalc.GetSpreadsheetControlObject();
   var tabs = spreadsheet.tabs;
   var views = spreadsheet.views;

   if (typeof obj == "string") {
      newtab = obj;
      }
   else {
      newtab = obj.id.slice(spreadsheet.idPrefix.length,-3);
      }

   if (spreadsheet.currentTab != -1 && spreadsheet.tabs[spreadsheet.currentTab].onunclick) {
      spreadsheet.tabs[spreadsheet.currentTab].onunclick(spreadsheet, spreadsheet.tabs[spreadsheet.currentTab].name);
      }

   for (i=0; i<tabs.length; i++) {
      tname = tabs[i].name;
      menutabs[tname] = document.getElementById(spreadsheet.idPrefix+tname+"tab");
      tools[tname] = document.getElementById(spreadsheet.idPrefix+tname+"tools");
      if (tname==newtab) {
         newtabnum = i;
         tools[tname].style.display = "block";
         menutabs[tname].style.cssText = spreadsheet.tabselectedCSS;
         }
      else {
         tools[tname].style.display = "none";
         menutabs[tname].style.cssText = spreadsheet.tabplainCSS;
         }
      }

   spreadsheet.currentTab = newtabnum;

   if (tabs[newtabnum].onclick) {
      tabs[newtabnum].onclick(spreadsheet, newtab);
      }

   for (vname in views) {
      if ((!tabs[newtabnum].view && vname == "sheet") || tabs[newtabnum].view == vname) {
         views[vname].element.style.display = "block";
         }
      else {
         views[vname].element.style.display = "none";
         }
      }

   if (tabs[newtabnum].onclickFocus) {
      ele = tabs[newtabnum].onclickFocus;
      if (typeof ele == "string") {
         ele = document.getElementById(spreadsheet.idPrefix+ele);
         ele.focus();
         }
      SocialCalc.CmdGotFocus(ele);
      }
   else {
      SocialCalc.KeyboardFocus();
      }

   return;

   }

//
// SocialCalc.UpdateSortRangeProposal(editor)
//
// Updates sort range proposed in the UI in element idPrefix+sortlist
//

SocialCalc.UpdateSortRangeProposal = function(editor) {

   var ele = document.getElementById(SocialCalc.GetSpreadsheetControlObject().idPrefix+"sortlist");
   if (editor.range.hasrange) {
      ele.options[0].text = SocialCalc.crToCoord(editor.range.left, editor.range.top) + ":" +
                            SocialCalc.crToCoord(editor.range.right, editor.range.bottom);
      }
   else {
      ele.options[0].text = "[select range]";
      }

   }

//
// SocialCalc.LoadColumnChoosers(spreadsheet)
//
// Updates list of columns for choosing which to sort for Major, Minor, and Last sort
//

SocialCalc.LoadColumnChoosers = function(spreadsheet) {

   var col, colname, sele;
   var range = SocialCalc.ParseRange(spreadsheet.sortrange);
   sele = document.getElementById(spreadsheet.idPrefix+"majorsort");
   sele.options.length = 0;
   sele.options[sele.options.length] = new Option("[none]", "");
   for (var col=range.cr1.col; col<=range.cr2.col; col++) {
      colname = SocialCalc.rcColname(col);
      sele.options[sele.options.length] = new Option("Column "+colname, colname);
      }
   sele.selectedIndex = 1;
   sele = document.getElementById(spreadsheet.idPrefix+"minorsort");
   sele.options.length = 0;
   sele.options[sele.options.length] = new Option("[none]", "");
   for (var col=range.cr1.col; col<=range.cr2.col; col++) {
      colname = SocialCalc.rcColname(col);
      sele.options[sele.options.length] = new Option(colname, colname);
      }
   sele.selectedIndex = 0;
   sele = document.getElementById(spreadsheet.idPrefix+"lastsort");
   sele.options.length = 0;
   sele.options[sele.options.length] = new Option("[none]", "");
   for (var col=range.cr1.col; col<=range.cr2.col; col++) {
      colname = SocialCalc.rcColname(col);
      sele.options[sele.options.length] = new Option(colname, colname);
      }
   sele.selectedIndex = 0;

   }

//
// SocialCalc.CmdGotFocus(obj)
//
// Sets SocialCalc.Keyboard.passThru: obj should be element with focus or "true"
//

SocialCalc.CmdGotFocus = function(obj) {

   SocialCalc.Keyboard.passThru = obj;

   }


//
// SocialCalc.DoCmd(obj, which)
//
// xxx
//

SocialCalc.DoCmd = function(obj, which) {

   var combostr, sstr, cl, i, clele, slist, slistele, str, sele, rele;

   var spreadsheet = SocialCalc.GetSpreadsheetControlObject();
   var editor = spreadsheet.editor;

   which = which.substring(spreadsheet.idPrefix); // remove prefix

   switch (which) {
      case "undo":
         spreadsheet.sheet.SheetUndo();
         break;

      case "redo":
         spreadsheet.sheet.SheetRedo();
         break;

      case "fill-rowcolstuff":
      case "fill-text":
         cl = which.substring(5);
         clele = document.getElementById(spreadsheet.idPrefix+cl+"list");
         clele.length = 0;
         for (i=0; i<SocialCalc.SpreadsheetCmdTable[cl].length; i++) {
            clele.options[i] = new Option(SocialCalc.SpreadsheetCmdTable[cl][i].t);
            }
         which = "changed-"+cl; // fall through to changed code

      case "changed-rowcolstuff":
      case "changed-text":
         cl = which.substring(8);
         clele = document.getElementById(spreadsheet.idPrefix+cl+"list");
         slist = SocialCalc.SpreadsheetCmdTable.slists[SocialCalc.SpreadsheetCmdTable[cl][clele.selectedIndex].s]; // get sList for this command
         slistele = document.getElementById(spreadsheet.idPrefix+cl+"slist");
         slistele.length = 0; // reset
         for (i=0; i<(slist.length||0); i++) {
            slistele.options[i] = new Option(slist[i].t, slist[i].s);
            }
         return; // nothing else to do

      case "ok-rowcolstuff":
      case "ok-text":
         cl = which.substring(3);
         clele = document.getElementById(spreadsheet.idPrefix+cl+"list");
         slistele = document.getElementById(spreadsheet.idPrefix+cl+"slist");
         combostr = SocialCalc.SpreadsheetCmdTable[cl][clele.selectedIndex].c;
         sstr = slistele[slistele.selectedIndex].value;
         SocialCalc.SpreadsheetControlExecuteCommand(obj, combostr, sstr);
         break;

      case "ok-setsort":
         if (editor.range.hasrange) {
            spreadsheet.sortrange = SocialCalc.crToCoord(editor.range.left, editor.range.top) + ":" +
                       SocialCalc.crToCoord(editor.range.right, editor.range.bottom);
            }
         else {
            spreadsheet.sortrange = editor.ecell.coord+":"+editor.ecell.coord;
            }
         ele = document.getElementById(spreadsheet.idPrefix+"sortbutton");
         ele.value = "Sort "+spreadsheet.sortrange;
         ele.style.visibility = "visible";
         SocialCalc.LoadColumnChoosers(spreadsheet);
         if (obj && obj.blur) obj.blur();
         SocialCalc.KeyboardFocus();   
         return;

      case "dosort":
         if (spreadsheet.sortrange == "A1:A1") return;
         str = "sort "+spreadsheet.sortrange+" ";
         sele = document.getElementById(spreadsheet.idPrefix+"majorsort");
         rele = document.getElementById(spreadsheet.idPrefix+"majorsortup");
         str += sele.options[sele.selectedIndex].value + (rele.checked ? " up" : " down");
         sele = document.getElementById(spreadsheet.idPrefix+"minorsort");
         if (sele.selectedIndex>0) {
           rele = document.getElementById(spreadsheet.idPrefix+"minorsortup");
           str += " "+sele.options[sele.selectedIndex].value + (rele.checked ? " up" : " down");
           }
         sele = document.getElementById(spreadsheet.idPrefix+"lastsort");
         if (sele.selectedIndex>0) {
           rele = document.getElementById(spreadsheet.idPrefix+"lastsortup");
           str += " "+sele.options[sele.selectedIndex].value + (rele.checked ? " up" : " down");
           }
         spreadsheet.ExecuteCommand(str, "");
         break;

      default:
         combostr = SocialCalc.SpreadsheetCmdLookup[which] || "";
         sstr = SocialCalc.SpreadsheetCmdSLookup[which] || "";
         spreadsheet.ExecuteCommand(combostr, sstr);
         break;
      }

   spreadsheet.FullRefreshAndRender();

   if (obj && obj.blur) obj.blur();
   SocialCalc.KeyboardFocus();   

   }

SocialCalc.SpreadsheetCmdLookup = {
 'copy': 'copy %C all',
 'paste': 'paste %C all',
 'filldown': 'filldown %C all',
 'fillright': 'fillright %C all',
 'erase': 'erase %C all',
 'borderon': 'set %C bt %S%Nset %C br %S%Nset %C bb %S%Nset %C bl %S',
 'borderoff': 'set %C bt %S%Nset %C br %S%Nset %C bb %S%Nset %C bl %S',
 'merge': 'merge %C',
 'unmerge': 'unmerge %C'
 }

SocialCalc.SpreadsheetCmdSLookup = {
 'borderon': '1px solid rgb(0,0,0)',
 'borderoff': ''
 }

SocialCalc.SpreadsheetCmdTable = {
 cmd: [
  {t:"Fill Right", s:"ffal", c:"fillright %C %S"},
  {t:"Fill Down", s:"ffal", c:"filldown %C %S"},
  {t:"Copy", s:"all", c:"copy %C %S"},
  {t:"Cut", s:"all", c:"cut %C %S"},
  {t:"Paste", s:"ffal", c:"paste %C %S"},
  {t:"Erase", s:"ffal", c:"erase %C %S"},
  {t:"Insert", s:"rowcol", c:"insert%S %C"},
  {t:"Delete", s:"rowcol", c:"delete%S %C"},
  {t:"Merge Cells", s:"none", c:"merge %C"},
  {t:"Unmerge", s:"none", c:"unmerge %C"},
  {t:"Sort", s:"sortcol", c:"sort %R %S"},
  {t:"Cell Color", s:"colors", c:"set %C color %S"},
  {t:"Cell Background", s:"colors", c:"set %C bgcolor %S"},
  {t:"Cell Number Format", s:"ntvf", c:"set %C nontextvalueformat %S"},
  {t:"Cell Font", s:"fonts", c:"set %C font %S"},
  {t:"Cell Align", s:"cellformat", c:"set %C cellformat %S"},
  {t:"Cell Borders", s:"borderOnOff", c:"set %C bt %S%Nset %C br %S%Nset %C bb %S%Nset %C bl %S"},
  {t:"Column Width", s:"colWidths", c:"set %W width %S"},
  {t:"Default Color", s:"colors", c:"set sheet defaultcolor %S"},
  {t:"Default Background", s:"colors", c:"set sheet defaultbgcolor %S"},
  {t:"Default Number Format", s:"ntvf", c:"set sheet defaultnontextvalueformat %S"},
  {t:"Default Font", s:"fonts", c:"set sheet defaultfont %S"},
  {t:"Default Text Align", s:"cellformat", c:"set sheet defaulttextformat %S"},
  {t:"Default Number Align", s:"cellformat", c:"set sheet defaultnontextformat %S"},
  {t:"Default Column Width", s:"colWidths", c:"set sheet defaultcolwidth %S"}
  ],
 rowcolstuff: [
  {t:"Insert", s:"rowcol", c:"insert%S %C"},
  {t:"Delete", s:"rowcol", c:"delete%S %C"},
  {t:"Column Width", s:"colWidths", c:"set %W width %S"},
  {t:"Default Col Width", s:"colWidths", c:"set sheet defaultcolwidth %S"},
  {t:"Paste", s:"ffal", c:"paste %C %S"},
  {t:"Erase", s:"ffal", c:"erase %C %S"},
  {t:"Fill Right", s:"ffal", c:"fillright %C %S"},
  {t:"Fill Down", s:"ffal", c:"filldown %C %S"}
  ],
 text: [
  {t:"Cell Color", s:"colors", c:"set %C color %S"},
  {t:"Cell Background", s:"colors", c:"set %C bgcolor %S"},
  {t:"Cell Number Format", s:"ntvf", c:"set %C nontextvalueformat %S"},
  {t:"Cell Text Format", s:"tvf", c:"set %C textvalueformat %S"},
  {t:"Cell Font", s:"fonts", c:"set %C font %S"},
  {t:"Cell Align", s:"cellformat", c:"set %C cellformat %S"},
  {t:"Default Color", s:"colors", c:"set sheet defaultcolor %S"},
  {t:"Default Background", s:"colors", c:"set sheet defaultbgcolor %S"},
  {t:"Default Number Format", s:"ntvf", c:"set sheet defaultnontextvalueformat %S"},
  {t:"Default Text Format", s:"tvf", c:"set sheet defaulttextvalueformat %S"},
  {t:"Default Font", s:"fonts", c:"set sheet defaultfont %S"},
  {t:"Default Text Align", s:"cellformat", c:"set sheet defaulttextformat %S"},
  {t:"Default Number Align", s:"cellformat", c:"set sheet defaultnontextformat %S"}
  ],
 slists: {
  "colors": [
   {t:"Default", s:""},
   {t:"Black", s:"rgb(0,0,0)"},
   {t:"Dark Gray", s:"rgb(102,102,102)"}, // #666
   {t:"Gray", s:"rgb(204,204,204)"}, // #CCC
   {t:"White", s:"rgb(255,255,255)"},
   {t:"Red", s:"rgb(255,0,0)"},
   {t:"Dark Red", s:"rgb(153,0,0)"},
   {t:"Orange", s:"rgb(255,153,0)"},
   {t:"Yellow", s:"rgb(255,255,0)"},
   {t:"Light Yellow", s:"rgb(255,255,204)"},
   {t:"Green", s:"rgb(0,255,0)"},
   {t:"Dark Green", s:"rgb(0,153,0)"},
   {t:"Blue", s:"rgb(0,0,255)"},
   {t:"Dark Blue", s:"rgb(0,0,153)"},
   {t:"Light Blue", s:"rgb(204,204,255)"}
   ],
  "fonts": [ // style weight size family
   {t:"Default", s:""},
   {t:"Bold", s:"normal bold * *"},
   {t:"Italic", s:"italic normal * *"},
   {t:"Small", s:"* small *"},
   {t:"Medium", s:"* medium *"},
   {t:"Large", s:"* large *"},
   {t:"Bold Small", s:"normal bold small *"},
   {t:"Bold Medium", s:"normal bold medium *"},
   {t:"Bold Large", s:"normal bold large *"}
   ],
  "cellformat": [
   {t:"Default", s:""},
   {t:"Left", s:"left"},
   {t:"Right", s:"right"},
   {t:"Center", s:"center"}
   ],
  "borderOnOff": [
   {t:"On", s:"1px solid rgb(0,0,0)"},
   {t:"Off", s:""}
   ],
  "colWidths": [
   {t:"Default", s:""},
   {t:"20", s:"20"},
   {t:"40", s:"40"},
   {t:"60", s:"60"},
   {t:"80", s:"80"},
   {t:"100", s:"100"},
   {t:"120", s:"120"},
   {t:"140", s:"140"},
   {t:"160", s:"160"},
   {t:"180", s:"180"},
   {t:"200", s:"200"},
   {t:"220", s:"220"},
   {t:"240", s:"240"},
   {t:"260", s:"260"},
   {t:"280", s:"280"},
   {t:"300", s:"300"}
   ],
  "ntvf": [
   {t:"Default", s:""},
   {t:"1234", s:"0"},
   {t:"1,234", s:"#,##0"},
   {t:"1,234.5", s:"#,##0.0"},
   {t:"1,234.56", s:"#,##0.00"},
   {t:"1,234.567", s:"#,##0.000"},
   {t:"1,234%", s:"#,##0%"},
   {t:"1,234.5%", s:"#,##0.0%"},
   {t:"(1,234)", s:"#,##0_);(#,##0)"},
   {t:"(1,234.5)", s:"#,##0.0_);(#,##0.0)"},
   {t:"(1,234.56)", s:"#,##0.00_);(#,##0.00)"},
   {t:"00", s:"00"},
   {t:"000", s:"000"},
   {t:"0000", s:"0000"},
   {t:"$1,234.56", s:"$#,##0.00"},
   {t:"2006-01-04", s:"yyyy-mm-dd"},
   {t:"01:23:45", s:"hh:mm:ss"},
   {t:"2006-01-04 01:23:45", s:"yyyy-mm-dd hh:mm:ss"},
   {t:"Hidden", s:"hidden"}
   ],
  "tvf": [
   {t:"Default", s:""},
   {t:"Automatic", s:"general"},
   {t:"Plain Text", s:"text-plain"},
   {t:"HTML", s:"text-html"},
   {t:"Wiki", s:"text-wiki"},
   {t:"Hidden", s:"hidden"}
   ],
  "ffal": [ // Formulas, Formats, All
   {t:"All", s:"all"},
   {t:"Contents", s:"formulas"},
   {t:"Formats", s:"formats"}
   ],
  "all": [ // All
   {t:"All", s:"all"}
   ],
  "rowcol": [
   {t:"Row", s:"row"},
   {t:"Column", s:"col"}
   ],
  "sortcol": [
   {t:"A up", s:"A up"},
   {t:"B up", s:"B up"},
   {t:"C up", s:"C up"},
   {t:"A down", s:"A down"},
   {t:"B down", s:"B down"},
   {t:"C down", s:"C down"},
   {t:"A, B, C up", s:"A up B up C up"}
   ],
  "none": [ // nothing
   {t:" ", s:" "}
   ]
  }
 }


//
// SocialCalc.SpreadsheetControlExecuteCommand(obj, combostr, sstr)
//
// xxx
//

SocialCalc.SpreadsheetControlExecuteCommand = function(obj, combostr, sstr) {

   var i, commands;
   var spreadsheet = SocialCalc.GetSpreadsheetControlObject();
   var eobj = spreadsheet.editor;

   var str = {};
   str.P = "%";
   str.N = "\n"
   if (eobj.range.hasrange) {
      str.R = SocialCalc.crToCoord(eobj.range.left, eobj.range.top)+
             ":"+SocialCalc.crToCoord(eobj.range.right, eobj.range.bottom);
      str.C = str.R;
      str.W = SocialCalc.rcColname(eobj.range.left) + ":" + SocialCalc.rcColname(eobj.range.right);
      }
   else {
      str.C = eobj.ecell.coord;
      str.R = eobj.ecell.coord+":"+eobj.ecell.coord;
      str.W = SocialCalc.rcColname(SocialCalc.coordToCr(eobj.ecell.coord).col);
      }
   str.S = sstr;
   combostr = combostr.replace(/%C/g, str.C);
   combostr = combostr.replace(/%R/g, str.R);
   combostr = combostr.replace(/%N/g, str.N);
   combostr = combostr.replace(/%S/g, str.S);
   combostr = combostr.replace(/%W/g, str.W);
   combostr = combostr.replace(/%P/g, str.P);

   spreadsheet.sheet.ExecuteSheetCommand(combostr, true);

   }

//
// result = SocialCalc.SpreadsheetControlCreateSheetHTML(spreadsheet)
//
// Returns the HTML representation of the whole spreadsheet
//

SocialCalc.SpreadsheetControlCreateSheetHTML = function(spreadsheet) {

   var context, div, ele;

   var result = "";

   context = new SocialCalc.RenderContext(spreadsheet.sheet);
   context.CalculateCellSkipData();
   context.CalculateColWidthData();
   div = document.createElement("div");
   ele = context.RenderSheet(null, "html");
   div.appendChild(ele);
   delete context;
   result = div.innerHTML;
   delete ele;
   delete div;
   return result;

   }

//
// result = SocialCalc.SpreadsheetControlCreateCellHTML(spreadsheet, coord)
//
// Returns the HTML representation of a cell. Blank is "", not "&nbsp;".
//

SocialCalc.SpreadsheetControlCreateCellHTML = function(spreadsheet, coord) {

   var result = "";
   var cell = spreadsheet.sheet.cells[coord];

   if (!cell) return "";

   if (cell.displaystring == undefined) {
      result = SocialCalc.FormatValueForDisplay(spreadsheet.sheet, cell.datavalue, coord, "html");
      }
   else {
      result = cell.displaystring;
      }

   if (result == "&nbsp;") result = "";

   return result;

   }

//
// result = SocialCalc.SpreadsheetControlCreateCellHTMLSave(spreadsheet, range)
//
// Returns the HTML representation of a range of cells, or the whole sheet if range is null.
// The form is:
//    version:1.0
//    coord:cell-HTML
//    coord:cell-HTML
//    ...
//
// Empty cells are skipped. The cell-HTML is encoded with ":"=>"\c", newline=>"\n", and "\"=>"\".
//

SocialCalc.SpreadsheetControlCreateCellHTMLSave = function(spreadsheet, range) {

   var cr1, cr2, row, col, coord, cell, cellHTML;
   var result = [];
   var prange;

   if (range) {
      prange = SocialCalc.ParseRange(range);
      }
   else {
      prange = {cr1: {row: 1, col:1},
                cr2: {row: spreadsheet.sheet.attribs.lastrow, col: spreadsheet.sheet.attribs.lastcol}};
      }
   cr1 = prange.cr1;
   cr2 = prange.cr2;

   result.push("version:1.0");

   for (row=cr1.row; row <= cr2.row; row++) {
      for (col=cr1.col; col <= cr2.col; col++) {
         coord = SocialCalc.crToCoord(col, row);
         cell=spreadsheet.sheet.cells[coord];
         if (!cell) continue;
         if (cell.displaystring == undefined) {
            cellHTML = SocialCalc.FormatValueForDisplay(spreadsheet.sheet, cell.datavalue, coord, "html");
            }
         else {
            cellHTML = cell.displaystring;
            }
         if (cellHTML == "&nbsp;") continue;
         result.push(coord+":"+SocialCalc.encodeForSave(cellHTML));
         }
      }

   result.push(""); // one extra to get extra \n
   return result.join("\n");
   }

//
// TAB Routines
//

// Sort

SocialCalc.SpreadsheetControlSortOnclick = function(s, t) {

   SocialCalc.LoadColumnChoosers(s);
   s.editor.RangeChangeCallback.sort = SocialCalc.UpdateSortRangeProposal;
   SocialCalc.UpdateSortRangeProposal(s.editor)
   SocialCalc.KeyboardFocus();
   return;

   }

// Comment

SocialCalc.SpreadsheetControlCommentOnclick = function(s, t) {
   s.editor.MoveECellCallback.comment = SocialCalc.SpreadsheetControlCommentMoveECell;
   SocialCalc.SpreadsheetControlCommentDisplay(s, t);
   SocialCalc.KeyboardFocus();
   return;
   }

SocialCalc.SpreadsheetControlCommentDisplay = function(s, t) {
   var c = "";
   if (s.editor.ecell && s.editor.ecell.coord && s.sheet.cells[s.editor.ecell.coord]) {
      c = s.sheet.cells[s.editor.ecell.coord].comment || "";
      }
   document.getElementById(s.idPrefix+"commenttext").value = c;
   }

SocialCalc.SpreadsheetControlCommentMoveECell = function(editor) {
   SocialCalc.SpreadsheetControlCommentDisplay(SocialCalc.GetSpreadsheetControlObject(), "comment");
   }

SocialCalc.SpreadsheetControlCommentSet = function() {
   var s=SocialCalc.GetSpreadsheetControlObject();
   s.ExecuteCommand("set %C comment "+SocialCalc.encodeForSave(document.getElementById(s.idPrefix+"commenttext").value));
   var cell=SocialCalc.GetEditorCellElement(s.editor, s.editor.ecell.row, s.editor.ecell.col);
   s.editor.UpdateCellCSS(cell, s.editor.ecell.row, s.editor.ecell.col);
   SocialCalc.KeyboardFocus();
   }

SocialCalc.SpreadsheetControlCommentOnunclick = function(s, t) {
   delete s.editor.MoveECellCallback.comment;
   }

// Names

SocialCalc.SpreadsheetControlNamesOnclick = function(s, t) {
   document.getElementById(s.idPrefix+"namesname").value = "";
   document.getElementById(s.idPrefix+"namesdesc").value = "";
   document.getElementById(s.idPrefix+"namesvalue").value = "";
   s.editor.RangeChangeCallback.names = SocialCalc.SpreadsheetControlNamesRangeChange;
   s.editor.MoveECellCallback.names = SocialCalc.SpreadsheetControlNamesRangeChange;
   SocialCalc.SpreadsheetControlNamesRangeChange(s.editor);
   SocialCalc.SpreadsheetControlNamesFillNameList();
   SocialCalc.SpreadsheetControlNamesChangedName();
   }

SocialCalc.SpreadsheetControlNamesFillNameList = function() {
   var name, i;
   var namelist = [];
   var s=SocialCalc.GetSpreadsheetControlObject();
   var nl = document.getElementById(s.idPrefix+"nameslist");
   var currentname = document.getElementById(s.idPrefix+"namesname").value.toUpperCase().replace(/[^A-Z0-9_\.]/g, "");
   for (name in s.sheet.names) {
      namelist.push(name);
      }
   namelist.sort();
   nl.length = 0;
   if (namelist.length > 0) {
      nl.options[0] = new Option("[New]");
      }
   else {
      nl.options[0] = new Option("[None]");
      }
   for (i=0; i<namelist.length; i++) {
      name = namelist[i];
      nl.options[i+1] = new Option(name, name);
      if (name == currentname) {
         nl.options[i+1].selected = true;
         }
      }
   if (currentname == "") {
      nl.options[0].selected = true;
      }
   }

SocialCalc.SpreadsheetControlNamesChangedName = function() {
   var s=SocialCalc.GetSpreadsheetControlObject();
   var nl = document.getElementById(s.idPrefix+"nameslist");
   var name = nl.options[nl.selectedIndex].value;
   if (s.sheet.names[name]) {
      document.getElementById(s.idPrefix+"namesname").value = name;
      document.getElementById(s.idPrefix+"namesdesc").value = s.sheet.names[name].desc || "";
      document.getElementById(s.idPrefix+"namesvalue").value = s.sheet.names[name].definition || "";
      }
   else {
      document.getElementById(s.idPrefix+"namesname").value = "";
      document.getElementById(s.idPrefix+"namesdesc").value = "";
      document.getElementById(s.idPrefix+"namesvalue").value = "";
      }
   }

SocialCalc.SpreadsheetControlNamesRangeChange = function(editor) {
   var s = SocialCalc.GetSpreadsheetControlObject();
   var ele = document.getElementById(s.idPrefix+"namesrangeproposal");
   if (editor.range.hasrange) {
      ele.value = SocialCalc.crToCoord(editor.range.left, editor.range.top) + ":" +
                            SocialCalc.crToCoord(editor.range.right, editor.range.bottom);
      }
   else {
      ele.value = editor.ecell.coord;
      }
   }

SocialCalc.SpreadsheetControlNamesOnunclick = function(s, t) {
   delete s.editor.RangeChangeCallback.names;
   delete s.editor.MoveECellCallback.names;
   }

SocialCalc.SpreadsheetControlNamesSetValue = function() {
   var s = SocialCalc.GetSpreadsheetControlObject();
   document.getElementById(s.idPrefix+"namesvalue").value = document.getElementById(s.idPrefix+"namesrangeproposal").value;
   SocialCalc.KeyboardFocus();
   }

SocialCalc.SpreadsheetControlNamesSave = function() {
   var s = SocialCalc.GetSpreadsheetControlObject();
   var name = document.getElementById(s.idPrefix+"namesname").value;
   if (name != "") {
      s.ExecuteCommand("name define "+name+" "+document.getElementById(s.idPrefix+"namesvalue").value+"\n"+
         "name desc "+name+" "+document.getElementById(s.idPrefix+"namesdesc").value);
      SocialCalc.SpreadsheetControlNamesFillNameList();
      }
   s.sheet.RecalcSheet();
   s.FullRefreshAndRender();
   SocialCalc.SetTab(s.tabs[0].name); // return to first tab
   SocialCalc.KeyboardFocus();
   }

SocialCalc.SpreadsheetControlNamesDelete = function() {
   var s = SocialCalc.GetSpreadsheetControlObject();
   var name = document.getElementById(s.idPrefix+"namesname").value;
   if (name != "") {
      s.ExecuteCommand("name delete "+name);
      document.getElementById(s.idPrefix+"namesname").value = "";
      document.getElementById(s.idPrefix+"namesvalue").value = "";
      document.getElementById(s.idPrefix+"namesdesc").value = "";
      SocialCalc.SpreadsheetControlNamesFillNameList();
      }
   s.sheet.RecalcSheet();
   s.FullRefreshAndRender();
   SocialCalc.KeyboardFocus();
   }

// Clipboard

SocialCalc.SpreadsheetControlClipboardOnclick = function(s, t) {
   var s = SocialCalc.GetSpreadsheetControlObject();
   clipele = document.getElementById(s.idPrefix+"clipboardtext");
   clipele.value = SocialCalc.ConvertSaveToOtherFormat(SocialCalc.Clipboard.clipboard, "tab");
   return;
   }

SocialCalc.SpreadsheetControlClipboardLoad = function() {
   var s = SocialCalc.GetSpreadsheetControlObject();
   s.sheet.ExecuteSheetCommand("loadclipboard "+
      SocialCalc.encodeForSave(
         SocialCalc.ConvertOtherFormatToSave(document.getElementById(s.idPrefix+"clipboardtext").value, "tab"), true));
   SocialCalc.SetTab(s.tabs[0].name); // return to first tab
   SocialCalc.KeyboardFocus();
   }

SocialCalc.SpreadsheetControlClipboardClear = function() {
   var s = SocialCalc.GetSpreadsheetControlObject();
   var clipele = document.getElementById(s.idPrefix+"clipboardtext");
   clipele.value = "";
   s.sheet.ExecuteSheetCommand("clearclipboard", true);
   clipele.focus();
   }

///////////////////////
//
// SAVE / LOAD ROUTINES
//
///////////////////////

//
// result = SocialCalc.SpreadsheetControlCreateSpreadsheetSave(spreadsheet)
//
// Saves the spreadsheet's sheet data, editor settings, and audit trail (redo stack).
// The serialized data strings are concatenated together in multi-part MIME format.
// The first part lists the types of the subsequent parts (e.g., "sheet", "editor", and "audit")
// in this format:
//   # comments
//   version:1.0
//   part:type1
//   part:type2
//   ...
//

SocialCalc.SpreadsheetControlCreateSpreadsheetSave = function(spreadsheet) {

   var result;

   result = "socialcalc:version:1.0\n" +
      "MIME-Version: 1.0\nContent-Type: multipart/mixed; boundary="+
      spreadsheet.multipartBoundary + "\n" +
      "--" + spreadsheet.multipartBoundary + "\nContent-type: text/plain; charset=UTF-8\n\n" +
      "# SocialCalc Spreadsheet Control Save\nversion:1.0\npart:sheet\npart:edit\npart:audit\n" +
      "--" + spreadsheet.multipartBoundary + "\nContent-type: text/plain; charset=UTF-8\n\n" +
      spreadsheet.CreateSheetSave() +
      "--" + spreadsheet.multipartBoundary + "\nContent-type: text/plain; charset=UTF-8\n\n" +
      spreadsheet.editor.SaveEditorSettings() +
      "--" + spreadsheet.multipartBoundary + "\nContent-type: text/plain; charset=UTF-8\n\n" +
      spreadsheet.sheet.CreateAuditString() +
      "--" + spreadsheet.multipartBoundary + "--\n";

   return result;

   }


//
// parts = SocialCalc.SpreadsheetControlDecodeSpreadsheetSave(spreadsheet, str)
//
// Separates the parts from a spreadsheet save string, returning an object with the sub-strings.
//
//    {type1: {start: startpos, end: endpos}, type2:...}
//

SocialCalc.SpreadsheetControlDecodeSpreadsheetSave = function(spreadsheet, str) {

   var pos1, mpregex, searchinfo, boundary, boundaryregex, blanklineregex, start, ending, lines, i, lines, p, pnun;
   var parts = {};
   var partlist = [];

   pos1 = str.search(/^MIME-Version:\s1\.0/mi);
   if (pos1 < 0) return parts;

   mpregex = /^Content-Type:\s*multipart\/mixed;\s*boundary=(\S+)/mig;
   mpregex.lastIndex = pos1;

   searchinfo = mpregex.exec(str);
   if (mpregex.lastIndex <= 0) return parts;
   boundary = searchinfo[1];

   boundaryregex = new RegExp("^--"+boundary+"$", "mg");
   boundaryregex.lastIndex = mpregex.lastIndex;

   searchinfo = boundaryregex.exec(str); // find header top boundary
   blanklineregex = /^$/gm;
   blanklineregex.lastIndex = boundaryregex.lastIndex;
   searchinfo = blanklineregex.exec(str); // skip to after blank line
   if (!searchinfo) return parts;
   start = blanklineregex.lastIndex;
   boundaryregex.lastIndex = start;
   searchinfo = boundaryregex.exec(str); // find end of header
   if (!searchinfo) return parts;
   ending = searchinfo.index;

   lines = str.substring(start, ending).split(/\r\n|\n/); // get header as lines
   for (i=0;i<lines.length;i++) {
      line=lines[i];
      p = line.split(":");
      switch (p[0]) {
         case "version":
            break;
         case "part":
            partlist.push(p[1]);
            break;
         }
      }

   for (pnum=0; pnum<partlist.length; pnum++) { // get each part
      blanklineregex.lastIndex = ending;
      searchinfo = blanklineregex.exec(str); // find blank line ending mime-part header
      if (!searchinfo) return parts;
      start = blanklineregex.lastIndex;
      if (pnum==partlist.length-1) { // last one has different boundary
         boundaryregex = new RegExp("^--"+boundary+"--$", "mg");
         }
      boundaryregex.lastIndex = start;
      searchinfo = boundaryregex.exec(str); // find ending boundary
      if (!searchinfo) return parts;
      ending = searchinfo.index;
      parts[partlist[pnum]] = {start: start, end: ending}; // return position within full string
      }

   return parts;

   }

