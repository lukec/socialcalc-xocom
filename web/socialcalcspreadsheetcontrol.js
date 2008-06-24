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
   this.viewheight = 0; // calculated amount for views below toolbar, etc.

   // Tab definitions: An array where each tab is an object of the form:
   //
   //    name: "name",
   //    text: "text-on-tab",
   //    html: "html-to-create div",
   //       replacements:
   //         "%s.": "SocialCalc", "%id.": spreadsheet.idPrefix, "%tbt.": spreadsheet.toolbartext
   //         Other replacements from spreadsheet.tabreplacements:
   //            replacementname: {regex: regular-expression-to-match-with-g, replacement: string}
   //    view: "viewname", // view to show when selected; "sheet" or missing/null is spreadsheet
   //    oncreate: function(spreadsheet, tab-name), // called when first created to initialize
   //    onclick: function(spreadsheet, tab-name), missing/null is sheet default
   //    onclickFocus: text, // spreadsheet.idPrefix+text is given the focus if present instead of normal KeyboardFocus
   //       or if text isn't a string, that value (e.g., true) is used for SocialCalc.CmdGotFocus
   //    onunclick: function(spreadsheet, tab-name), missing/null is sheet default

   this.tabs = [];
   this.tabnums = {}; // when adding tabs, add tab-name: array-index to this object
   this.tabreplacements = {}; // see use above
   this.currentTab = -1; // currently selected tab index in this.tabs or -1 (maintained by SocialCalc.SetTab)

   // View definitions: An object where each view is an object of the form:
   //
   //    name: "name",
   //    element: node-in-the-dom, // filled in when initialized
   //    replacements: {}, // see below
   //    html: "html-to-create div",
   //       replacements:
   //         "%s.": "SocialCalc", "%id.": spreadsheet.idPrefix, "%tbt.": spreadsheet.toolbartext
   //         Other replacements from viewobject.replacements:
   //            replacementname: {regex: regular-expression-to-match-with-g, replacement: string}
   //    oncreate: function(spreadsheet, viewobject), // called when first created to initialize
   //    needsresize: true/false/null, // if true, do resize calc after displaying
   //    onresize: function(spreadsheet, viewobject), // called if needs resize
   //    values: {} // optional values to share with onclick handlers, etc.
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

   this.idPrefix = "SocialCalc-"; // prefix added to element ids used here, should end in "-"
   this.multipartBoundary = "SocialCalcSpreadsheetControlSave"; // boundary used by SpreadsheetControlCreateSpreadsheetSave

   this.toolbarbackground = "background-color:#404040;";
   this.tabbackground = "background-color:#CCC;";
   this.tabselectedCSS = "font-size:small;padding:6px 30px 6px 8px;color:#FFF;background-color:#404040;cursor:default;border-right:1px solid #CCC;";
   this.tabplainCSS = "font-size:small;padding:6px 30px 6px 8px;color:#FFF;background-color:#808080;cursor:default;border-right:1px solid #CCC;";
   this.toolbartext = "font-size:x-small;font-weight:bold;color:#FFF;padding-bottom:4px;";

   // Callbacks:

   this.ExportCallback = null; // a function called for Clipboard Export button: this.ExportCallback(spreadsheet_control_object)

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
      ' <div id="%id.edittools" style="padding:10px 0px 0px 0px;">'+
'&nbsp;<img id="%id.button_undo" src="images/sc-undo.gif" style="vertical-align:bottom;">'+
' <img id="%id.button_redo" src="images/sc-redo.gif" style="vertical-align:bottom;">'+
' &nbsp;<img src="images/sc-divider1.gif" style="vertical-align:bottom;">&nbsp; '+
'<img id="%id.button_copy" src="images/sc-copy.gif" style="vertical-align:bottom;">'+
' <img id="%id.button_cut" src="images/sc-cut.gif" style="vertical-align:bottom;">'+
' <img id="%id.button_paste" src="images/sc-paste.gif" style="vertical-align:bottom;">'+
' &nbsp;<img src="images/sc-divider1.gif" style="vertical-align:bottom;">&nbsp; '+
'<img id="%id.button_delete" src="images/sc-delete.gif" style="vertical-align:bottom;">'+
' <img id="%id.button_pasteformats" src="images/sc-pasteformats.gif" style="vertical-align:bottom;">'+
' &nbsp;<img src="images/sc-divider1.gif" style="vertical-align:bottom;">&nbsp; '+
'<img id="%id.button_filldown" src="images/sc-filldown.gif" style="vertical-align:bottom;">'+
' <img id="%id.button_fillright" src="images/sc-fillright.gif" style="vertical-align:bottom;">'+
' &nbsp;<img src="images/sc-divider1.gif" style="vertical-align:bottom;">&nbsp; '+
'<img id="%id.button_alignleft" src="images/sc-alignleft.gif" style="vertical-align:bottom;">'+
' <img id="%id.button_aligncenter" src="images/sc-aligncenter.gif" style="vertical-align:bottom;">'+
' <img id="%id.button_alignright" src="images/sc-alignright.gif" style="vertical-align:bottom;">'+
' &nbsp;<img src="images/sc-divider1.gif" style="vertical-align:bottom;">&nbsp; '+
'<img id="%id.button_borderon" src="images/sc-borderson.gif" style="vertical-align:bottom;"> '+
' <img id="%id.button_borderoff" src="images/sc-bordersoff.gif" style="vertical-align:bottom;"> '+
' &nbsp;<img src="images/sc-divider1.gif" style="vertical-align:bottom;">&nbsp; '+
'<img id="%id.button_merge" src="images/sc-merge.gif" style="vertical-align:bottom;"> '+
' <img id="%id.button_unmerge" src="images/sc-unmerge.gif" style="vertical-align:bottom;"> '+
' &nbsp;<img src="images/sc-divider1.gif" style="vertical-align:bottom;">&nbsp; '+
'<img id="%id.button_insertrow" src="images/sc-insertrow.gif" style="vertical-align:bottom;"> '+
' <img id="%id.button_insertcol" src="images/sc-insertcol.gif" style="vertical-align:bottom;"> '+
'&nbsp; <img id="%id.button_deleterow" src="images/sc-deleterow.gif" style="vertical-align:bottom;"> '+
' <img id="%id.button_deletecol" src="images/sc-deletecol.gif" style="vertical-align:bottom;"> '+
      ' </div>',
      oncreate: null, //function(spreadsheet, viewobject) {SocialCalc.DoCmd(null, "fill-rowcolstuff");},
      onclick: null});

   // Settings (Format)

   this.tabnums.settings = this.tabs.length;
   this.tabs.push({name: "settings", text: "Format", html:
      '<div id="%id.settingstools" style="display:none;">'+
      ' <div id="%id.sheetsettingstoolbar" style="display:none;">'+
      '  <table cellspacing="0" cellpadding="0"><tr><td>'+
      '   <div style="%tbt.">SHEET SETTINGS:</div>'+
      '   </td></tr><tr><td>'+
      '   <input id="%id.settings-savesheet" type="button" value="Save" onclick="SocialCalc.SetttingsControlSave(\'sheet\');">'+
      '   <input type="button" value="Cancel" onclick="SocialCalc.SetttingsControlSave(\'cancel\');">'+
      '   <input type="button" value="Show Cell Settings" onclick="SocialCalc.SpreadsheetControlSettingsSwitch(\'cell\');return false;">'+
      '   </td></tr></table>'+
      ' </div>'+
      ' <div id="%id.cellsettingstoolbar" style="display:none;">'+
      '  <table cellspacing="0" cellpadding="0"><tr><td>'+
      '   <div style="%tbt.">CELL SETTINGS: <span id="%id.settingsecell">&nbsp;</span></div>'+
      '   </td></tr><tr><td>'+
      '  <input id="%id.settings-savecell" type="button" value="Save" onclick="SocialCalc.SetttingsControlSave(\'cell\');">'+
      '  <input type="button" value="Cancel" onclick="SocialCalc.SetttingsControlSave(\'cancel\');">'+
      '  <input type="button" value="Show Sheet Settings" onclick="SocialCalc.SpreadsheetControlSettingsSwitch(\'sheet\');return false;">'+
      '  </td></tr></table>'+
      ' </div>'+
      '</div>',
      view: "settings",
      onclick: function(s, t) {
         var sheetattribs = s.sheet.EncodeSheetAttributes();
         var cellattribs = s.sheet.EncodeCellAttributes(s.editor.ecell.coord);
         SocialCalc.SettingsControlLoadPanel(s.views.settings.values.sheetspanel, sheetattribs);
         SocialCalc.SettingsControlLoadPanel(s.views.settings.values.cellspanel, cellattribs);
         document.getElementById(s.idPrefix+"settingsecell").innerHTML = s.editor.ecell.coord;
         SocialCalc.SpreadsheetControlSettingsSwitch("cell");
         s.views.settings.element.style.height = s.viewheight+"px";
         s.views.settings.element.firstChild.style.height = s.viewheight+"px";

         var range;  // set save message
         if (s.editor.range.hasrange) {
            range = SocialCalc.crToCoord(s.editor.range.left, s.editor.range.top) + ":" +
               SocialCalc.crToCoord(s.editor.range.right, s.editor.range.bottom);
            }
         else {
            range = s.editor.ecell.coord;
            }
         document.getElementById(s.idPrefix+"settings-savecell").value = "Save to: "+range;
         },
//      onunclick: SocialCalc.SpreadsheetControlSettingsOnunclick
      onclickFocus: true
         });

   this.views["settings"] = {name: "settings", values: {},
      oncreate: function(s, viewobj) {
         var numberformats = "Default:|Custom:|Automatic:general|Auto w/ commas:[,]General|1234:0|1,234:#,##01,234.5:#,##0.0|1,234.56:#,##0.00|"+
            "1,234.567:#,##0.000|1,234%:#,##0%|1,234.5%:#,##0.0%|(1,234):#,##0_);(#,##0)|"+
            "(1,234.5):#,##0.0_);(#,##0.0)|(1,234.56):#,##0.00_);(#,##0.00)|00:00|000:000|0000:0000|"+
            "$1,234:$#,##0|$1,234.56:$#,##0.00|2006-01-04:yyyy-mm-dd|01\\c23\\c45:hh:mm:ss|"+
            "2006-01-04 01\\c23\\c45:yyyy-mm-dd hh:mm:ss|Hidden:hidden";
         var textformats = "Default:|Custom:|Automatic:general|Plain Text:text-plain|"+
            "HTML:text-html|Wiki:text-wiki|Hidden:hidden";
         var padsizes = "Default:|Custom:|No padding:0px|1 pixel:1px|2 pixels:2px|3 pixels:3px|4 pixels:4px|5 pixels:5px|"+
                  "6 pixels:6px|7 pixels:7px|8 pixels:8px|9 pixels:9px|10 pixels:10px|11 pixels:11px|"+
                  "12 pixels:12px|13 pixels:13px|14 pixels:14px|16 pixels:16px|"+
                  "18 pixels:18px|20 pixels:20px|22 pixels:22px|24 pixels:24px|28 pixels:28px|36 pixels:36px";
         var fontsizes = "Default:|Custom:|X-Small:x-small|Small:small|Medium:medium|Large:large|X-Large:x-large|"+
                  "6pt:6pt|7pt:7pt|8pt:8pt|9pt:9pt|10pt:10pt|11pt:11pt|12pt:12pt|14pt:14pt|16pt:16pt|18pt:18pt|"+
                  "20pt:20pt|22pt:22pt|24pt:24pt|28pt:28pt|36pt:36pt|48pt:48pt|72pt:72pt|"+
                  "8 pixels:8px|9 pixels:9px|10 pixels:10px|11 pixels:11px|"+
                  "12 pixels:12px|13 pixels:13px|14 pixels:14px|16 pixels:16px|"+
                  "18 pixels:18px|20 pixels:20px|22 pixels:22px|24 pixels:24px|28 pixels:28px|36 pixels:36px";
         var fontfamilies = "Default:|Custom:|Verdana:Verdana,Arial,Helvetica,sans-serif|"+
                  "Arial:arial,helvetica,sans-serif|Courier:'Courier New',Courier,monospace";

         viewobj.values.sheetspanel = {
            formatnumber: {setting: "numberformat", type: "CustomDropdown", id: s.idPrefix+"formatnumber",
               initialdata: numberformats},
            formattext: {setting: "textformat", type: "CustomDropdown", id: s.idPrefix+"formattext",
               initialdata: textformats},
            fontfamily: {setting: "fontfamily", type: "CustomDropdown", id: s.idPrefix+"fontfamily",
               initialdata: fontfamilies},
            fontlook: {setting: "fontlook", type: "Dropdown", id: s.idPrefix+"fontlook",
               initialdata: "Default:|Normal:normal normal|Bold:normal bold|Italic:italic normal|"+
                  "Bold Italic:italic bold"},
            fontsize: {setting: "fontsize", type: "CustomDropdown", id: s.idPrefix+"fontsize",
               initialdata: fontsizes},
            textalignhoriz: {setting: "textalignhoriz", type: "Dropdown", id: s.idPrefix+"textalignhoriz",
               initialdata: "Default:|Left:left|Center:center|Right:right"},
            numberalignhoriz: {setting: "numberalignhoriz", type: "Dropdown", id: s.idPrefix+"numberalignhoriz",
               initialdata: "Default:|Left:left|Center:center|Right:right"},
            alignvert: {setting: "alignvert", type: "Dropdown", id: s.idPrefix+"alignvert",
               initialdata: "Default:|Top:top|Middle:middle|Bottom:bottom"},
            textcolor: {setting: "textcolor", type: "ColorDropdown", id: s.idPrefix+"textcolor"},
            bgcolor: {setting: "bgcolor", type: "ColorDropdown", id: s.idPrefix+"bgcolor"},
            padtop: {setting: "padtop", type: "CustomDropdown", id: s.idPrefix+"padtop",
               initialdata: padsizes},
            padright: {setting: "padright", type: "CustomDropdown", id: s.idPrefix+"padright",
               initialdata: padsizes},
            padbottom: {setting: "padbottom", type: "CustomDropdown", id: s.idPrefix+"padbottom",
               initialdata: padsizes},
            padleft: {setting: "padleft", type: "CustomDropdown", id: s.idPrefix+"padleft",
               initialdata: padsizes},
            colwidth: {setting: "colwidth", type: "CustomDropdown", id: s.idPrefix+"colwidth",
               initialdata: "Default:|Custom:|20 pixels:20|40:40|60:60|80:80|100:100|120:120|140:140|"+
                  "160:160|180:180|200:200|220:220|240:240|260:260|280:280|300:300"}
            };
         viewobj.values.cellspanel = {
            cformatnumber: {setting: "numberformat", type: "CustomDropdown", id: s.idPrefix+"cformatnumber",
               initialdata: numberformats},
            cformattext: {setting: "textformat", type: "CustomDropdown", id: s.idPrefix+"cformattext",
               initialdata: textformats},
            cfontfamily: {setting: "fontfamily", type: "CustomDropdown", id: s.idPrefix+"cfontfamily",
               initialdata: fontfamilies},
            cfontlook: {setting: "fontlook", type: "Dropdown", id: s.idPrefix+"cfontlook",
               initialdata: "Default:|Normal:normal normal|Bold:normal bold|Italic:italic normal|"+
                  "Bold Italic:italic bold"},
            cfontsize: {setting: "fontsize", type: "CustomDropdown", id: s.idPrefix+"cfontsize",
               initialdata: fontsizes},
            calignhoriz: {setting: "alignhoriz", type: "Dropdown", id: s.idPrefix+"calignhoriz",
               initialdata: "Default:|Left:left|Center:center|Right:right"},
            calignvert: {setting: "alignvert", type: "Dropdown", id: s.idPrefix+"calignvert",
               initialdata: "Default:|Top:top|Middle:middle|Bottom:bottom"},
            ctextcolor: {setting: "textcolor", type: "ColorDropdown", id: s.idPrefix+"ctextcolor"},
            cbgcolor: {setting: "bgcolor", type: "ColorDropdown", id: s.idPrefix+"cbgcolor"},
            cbt: {setting: "bt", type: "BorderSide", id: s.idPrefix+"cbt"},
            cbr: {setting: "br", type: "BorderSide", id: s.idPrefix+"cbr"},
            cbb: {setting: "bb", type: "BorderSide", id: s.idPrefix+"cbb"},
            cbl: {setting: "bl", type: "BorderSide", id: s.idPrefix+"cbl"},
            cpadtop: {setting: "padtop", type: "CustomDropdown", id: s.idPrefix+"cpadtop",
               initialdata: padsizes},
            cpadright: {setting: "padright", type: "CustomDropdown", id: s.idPrefix+"cpadright",
               initialdata: padsizes},
            cpadbottom: {setting: "padbottom", type: "CustomDropdown", id: s.idPrefix+"cpadbottom",
               initialdata: padsizes},
            cpadleft: {setting: "padleft", type: "CustomDropdown", id: s.idPrefix+"cpadleft",
               initialdata: padsizes}
            };

         SocialCalc.SettingsControlInitializePanel(viewobj.values.sheetspanel);
         SocialCalc.SettingsControlInitializePanel(viewobj.values.cellspanel);
         },
      replacements: {
         itemtitle: {regex: /\%itemtitle\./g, replacement: 'style="padding:12px 10px 0px 10px;font-weight:bold;text-align:right;vertical-align:top;font-size:small;"'},
         sectiontitle: {regex: /\%sectiontitle\./g, replacement: 'style="padding:16px 10px 0px 0px;font-weight:bold;vertical-align:top;font-size:small;color:#C00;"'},
         parttitle: {regex: /\%parttitle\./g, replacement: 'style="font-weight:bold;font-size:x-small;padding:0px 0px 3px 0px;"'},
         itembody: {regex: /\%itembody\./g, replacement: 'style="padding:12px 0px 0px 0px;vertical-align:top;font-size:small;"'},
         bodypart: {regex: /\%bodypart\./g, replacement: 'style="padding:0px 10px 0px 0px;font-size:small;vertical-align:top;"'}
         },
      html:
      '<div id="%id.settingsview" style="margin-right:4px;border:1px solid black;overflow:auto;">'+
'<table id="%id.sheetsettingstable" style="display:none;" cellspacing="0" cellpadding="0">'+
'<tr>'+
' <td %itemtitle.><br>Default Format:</td>'+
' <td %itembody.>'+
'   <table cellspacing="0" cellpadding="0"><tr>'+
'    <td %bodypart.>'+
'     <div %parttitle.>Number</div>'+
'     <select id="%id.formatnumber-dd" onchange="SocialCalc.SettingsControlOnchange(this);" size="1"></select>'+
'     <input id="%id.formatnumber-ib" onchange="SocialCalc.SettingsControlOnchange(this);" type="text" size="15" value="">'+
'    </td>'+
'    <td %bodypart.>'+
'     <div %parttitle.>Text</div>'+
'     <select id="%id.formattext-dd" onchange="SocialCalc.SettingsControlOnchange(this);" size="1"></select>'+
'     <input id="%id.formattext-ib" onchange="SocialCalc.SettingsControlOnchange(this);" type="text" size="15" value="">'+
'    </td>'+
'   </tr></table>'+
' </td>'+
'</tr>'+
'<tr>'+
' <td %itemtitle.><br>Default Alignment:</td>'+
' <td %itembody.>'+
'   <table cellspacing="0" cellpadding="0"><tr>'+
'    <td %bodypart.>'+
'     <div %parttitle.>Text Horizontal</div>'+
'     <select id="%id.textalignhoriz-dd" onchange="SocialCalc.SettingsControlOnchange(this);" size="1"></select>'+
'    </td>'+
'    <td %bodypart.>'+
'     <div %parttitle.>Number Horizontal</div>'+
'     <select id="%id.numberalignhoriz-dd" onchange="SocialCalc.SettingsControlOnchange(this);" size="1"></select>'+
'    </td>'+
'    <td %bodypart.>'+
'     <div %parttitle.>Vertical</div>'+
'     <select id="%id.alignvert-dd" onchange="SocialCalc.SettingsControlOnchange(this);" size="1"></select>'+
'    </td>'+
'   </tr></table>'+
' </td>'+
'</tr>'+
'<tr>'+
' <td %itemtitle.><br>Default Font:</td>'+
' <td %itembody.>'+
'   <table cellspacing="0" cellpadding="0"><tr>'+
'    <td %bodypart.>'+
'     <div %parttitle.>Family</div>'+
'     <select id="%id.fontfamily-dd" onchange="SocialCalc.SettingsControlOnchange(this);" size="1"></select>'+
'     <input id="%id.fontfamily-ib" onchange="SocialCalc.SettingsControlOnchange(this);" type="text" size="7" value="">'+
'    </td>'+
'    <td %bodypart.>'+
'     <div %parttitle.>Bold & Italics</div>'+
'     <select id="%id.fontlook-dd" onchange="SocialCalc.SettingsControlOnchange(this);" size="1"></select>'+
'    </td>'+
'    <td %bodypart.>'+
'     <div %parttitle.>Size</div>'+
'     <select id="%id.fontsize-dd" onchange="SocialCalc.SettingsControlOnchange(this);" size="1"></select>'+
'     <input id="%id.fontsize-ib" onchange="SocialCalc.SettingsControlOnchange(this);" type="text" size="7" value="">'+
'    </td>'+
'   </tr></table>'+
' </td>'+
'</tr>'+
'<tr>'+
' <td %itemtitle.><br>Default Color:</td>'+
' <td %itembody.>'+
'   <table cellspacing="0" cellpadding="0"><tr>'+
'    <td %bodypart.>'+
'     <div %parttitle.>Text</div>'+
'     <select id="%id.textcolor-dd" onchange="SocialCalc.SettingsControlOnchange(this);" size="1"></select>'+
'     <input id="%id.textcolor-ib" onchange="SocialCalc.SettingsControlOnchange(this);" type="text" size="7" value="">'+
'     <span id="%id.textcolor-cs">&nbsp;&nbsp;&nbsp;</div>'+
'    </td>'+
'    <td %bodypart.>'+
'     <div %parttitle.>Background</div>'+
'     <select id="%id.bgcolor-dd" onchange="SocialCalc.SettingsControlOnchange(this);" size="1"></select>'+
'     <input id="%id.bgcolor-ib" onchange="SocialCalc.SettingsControlOnchange(this);" type="text" size="7" value="">'+
'     <span id="%id.bgcolor-cs">&nbsp;&nbsp;&nbsp;</div>'+
'    </td>'+
'   </tr></table>'+
' </td>'+
'</tr>'+
'<tr>'+
' <td %itemtitle.><br>Default Padding:</td>'+
' <td %itembody.>'+
'   <table cellspacing="0" cellpadding="0"><tr>'+
'    <td %bodypart.>'+
'     <div %parttitle.>Top</div>'+
'     <select id="%id.padtop-dd" onchange="SocialCalc.SettingsControlOnchange(this);" size="1"></select>'+
'     <input id="%id.padtop-ib" onchange="SocialCalc.SettingsControlOnchange(this);" type="text" size="3" value="">'+
'    </td>'+
'    <td %bodypart.>'+
'     <div %parttitle.>Right</div>'+
'     <select id="%id.padright-dd" onchange="SocialCalc.SettingsControlOnchange(this);" size="1"></select>'+
'     <input id="%id.padright-ib" onchange="SocialCalc.SettingsControlOnchange(this);" type="text" size="3" value="">'+
'    </td>'+
'    <td %bodypart.>'+
'     <div %parttitle.>Bottom</div>'+
'     <select id="%id.padbottom-dd" onchange="SocialCalc.SettingsControlOnchange(this);" size="1"></select>'+
'     <input id="%id.padbottom-ib" onchange="SocialCalc.SettingsControlOnchange(this);" type="text" size="3" value="">'+
'    </td>'+
'    <td %bodypart.>'+
'     <div %parttitle.>Left</div>'+
'     <select id="%id.padleft-dd" onchange="SocialCalc.SettingsControlOnchange(this);" size="1"></select>'+
'     <input id="%id.padleft-ib" onchange="SocialCalc.SettingsControlOnchange(this);" type="text" size="3" value="">'+
'    </td>'+
'   </tr></table>'+
' </td>'+
'</tr>'+
'<tr>'+
' <td %itemtitle.><br>Default Column Width:</td>'+
' <td %itembody.>'+
'   <table cellspacing="0" cellpadding="0"><tr>'+
'    <td %bodypart.>'+
'     <div %parttitle.>&nbsp;</div>'+
'     <select id="%id.colwidth-dd" onchange="SocialCalc.SettingsControlOnchange(this);" size="1"></select>'+
'     <input id="%id.colwidth-ib" onchange="SocialCalc.SettingsControlOnchange(this);" type="text" size="5" value="">'+
'    </td>'+
'   </tr></table>'+
' </td>'+
'</tr>'+
'</table>'+
'<table id="%id.cellsettingstable" cellspacing="0" cellpadding="0">'+
'<tr>'+
' <td %itemtitle.><br>Format:</td>'+
' <td %itembody.>'+
'   <table cellspacing="0" cellpadding="0"><tr>'+
'    <td %bodypart.>'+
'     <div %parttitle.>Number</div>'+
'     <select id="%id.cformatnumber-dd" onchange="SocialCalc.SettingsControlOnchange(this);" size="1"></select>'+
'     <input id="%id.cformatnumber-ib" onchange="SocialCalc.SettingsControlOnchange(this);" type="text" size="15" value="">'+
'    </td>'+
'    <td %bodypart.>'+
'     <div %parttitle.>Text</div>'+
'     <select id="%id.cformattext-dd" onchange="SocialCalc.SettingsControlOnchange(this);" size="1"></select>'+
'     <input id="%id.cformattext-ib" onchange="SocialCalc.SettingsControlOnchange(this);" type="text" size="15" value="">'+
'    </td>'+
'   </tr></table>'+
' </td>'+
'</tr>'+
'<tr>'+
' <td %itemtitle.><br>Alignment:</td>'+
' <td %itembody.>'+
'   <table cellspacing="0" cellpadding="0"><tr>'+
'    <td %bodypart.>'+
'     <div %parttitle.>Horizontal</div>'+
'     <select id="%id.calignhoriz-dd" onchange="SocialCalc.SettingsControlOnchange(this);" size="1"></select>'+
'    </td>'+
'    <td %bodypart.>'+
'     <div %parttitle.>Vertical</div>'+
'     <select id="%id.calignvert-dd" onchange="SocialCalc.SettingsControlOnchange(this);" size="1"></select>'+
'    </td>'+
'   </tr></table>'+
' </td>'+
'</tr>'+
'<tr>'+
' <td %itemtitle.><br>Font:</td>'+
' <td %itembody.>'+
'   <table cellspacing="0" cellpadding="0"><tr>'+
'    <td %bodypart.>'+
'     <div %parttitle.>Family</div>'+
'     <select id="%id.cfontfamily-dd" onchange="SocialCalc.SettingsControlOnchange(this);" size="1"></select>'+
'     <input id="%id.cfontfamily-ib" onchange="SocialCalc.SettingsControlOnchange(this);" type="text" size="7" value="">'+
'    </td>'+
'    <td %bodypart.>'+
'     <div %parttitle.>Bold & Italics</div>'+
'     <select id="%id.cfontlook-dd" onchange="SocialCalc.SettingsControlOnchange(this);" size="1"></select>'+
'    </td>'+
'    <td %bodypart.>'+
'     <div %parttitle.>Size</div>'+
'     <select id="%id.cfontsize-dd" onchange="SocialCalc.SettingsControlOnchange(this);" size="1"></select>'+
'     <input id="%id.cfontsize-ib" onchange="SocialCalc.SettingsControlOnchange(this);" type="text" size="7" value="">'+
'    </td>'+
'   </tr></table>'+
' </td>'+
'</tr>'+
'<tr>'+
' <td %itemtitle.><br>Color:</td>'+
' <td %itembody.>'+
'   <table cellspacing="0" cellpadding="0"><tr>'+
'    <td %bodypart.>'+
'     <div %parttitle.>Text</div>'+
'     <select id="%id.ctextcolor-dd" onchange="SocialCalc.SettingsControlOnchange(this);" size="1"></select>'+
'     <input id="%id.ctextcolor-ib" onchange="SocialCalc.SettingsControlOnchange(this);" type="text" size="7" value="">'+
'     <span id="%id.ctextcolor-cs">&nbsp;&nbsp;&nbsp;</div>'+
'    </td>'+
'    <td %bodypart.>'+
'     <div %parttitle.>Background</div>'+
'     <select id="%id.cbgcolor-dd" onchange="SocialCalc.SettingsControlOnchange(this);" size="1"></select>'+
'     <input id="%id.cbgcolor-ib" onchange="SocialCalc.SettingsControlOnchange(this);" type="text" size="7" value="">'+
'     <span id="%id.cbgcolor-cs">&nbsp;&nbsp;&nbsp;</div>'+
'    </td>'+
'   </tr></table>'+
' </td>'+
'</tr>'+
'<tr>'+
' <td %itemtitle.><br>Top Border:</td>'+
' <td %itembody.>'+
'   <table cellspacing="0" cellpadding="0"><tr>'+
'    <td %bodypart.>'+
'     <div %parttitle.>On/Off</div>'+
'     <input id="%id.cbt-onoff-bcb" onclick="SocialCalc.SettingsControlOnchangeBorder(this);" type="checkbox">'+
'    </td>'+
'    <td %bodypart.>'+
'     <div %parttitle.>Thickness</div>'+
'     <select id="%id.cbt-thickness-bdd" onchange="SocialCalc.SettingsControlOnchangeBorder(this);" size="1"></select>'+
'    </td>'+
'    <td %bodypart.>'+
'     <div %parttitle.>Style</div>'+
'     <select id="%id.cbt-style-bdd" onchange="SocialCalc.SettingsControlOnchangeBorder(this);" size="1"></select>'+
'    </td>'+
'    <td %bodypart.>'+
'     <div %parttitle.>Color</div>'+
'     <select id="%id.cbt-color-bcdd" onchange="SocialCalc.SettingsControlOnchangeBorder(this);" size="1"></select>'+
'     <input id="%id.cbt-color-bcib" onchange="SocialCalc.SettingsControlOnchangeBorder(this);" type="text" size="7" value="">'+
'     <span id="%id.cbt-color-cs">&nbsp;&nbsp;&nbsp;</div>'+
'    </td>'+
'   </tr></table>'+
' </td>'+
'</tr>'+
'<tr>'+
' <td %itemtitle.><br>Right Border:</td>'+
' <td %itembody.>'+
'   <table cellspacing="0" cellpadding="0"><tr>'+
'    <td %bodypart.>'+
'     <div %parttitle.>On/Off</div>'+
'     <input id="%id.cbr-onoff-bcb" onclick="SocialCalc.SettingsControlOnchangeBorder(this);" type="checkbox">'+
'    </td>'+
'    <td %bodypart.>'+
'     <div %parttitle.>Thickness</div>'+
'     <select id="%id.cbr-thickness-bdd" onchange="SocialCalc.SettingsControlOnchangeBorder(this);" size="1"></select>'+
'    </td>'+
'    <td %bodypart.>'+
'     <div %parttitle.>Style</div>'+
'     <select id="%id.cbr-style-bdd" onchange="SocialCalc.SettingsControlOnchangeBorder(this);" size="1"></select>'+
'    </td>'+
'    <td %bodypart.>'+
'     <div %parttitle.>Color</div>'+
'     <select id="%id.cbr-color-bcdd" onchange="SocialCalc.SettingsControlOnchangeBorder(this);" size="1"></select>'+
'     <input id="%id.cbr-color-bcib" onchange="SocialCalc.SettingsControlOnchangeBorder(this);" type="text" size="7" value="">'+
'     <span id="%id.cbr-color-cs">&nbsp;&nbsp;&nbsp;</div>'+
'    </td>'+
'   </tr></table>'+
' </td>'+
'</tr>'+
'<tr>'+
' <td %itemtitle.><br>Bottom Border:</td>'+
' <td %itembody.>'+
'   <table cellspacing="0" cellpadding="0"><tr>'+
'    <td %bodypart.>'+
'     <div %parttitle.>On/Off</div>'+
'     <input id="%id.cbb-onoff-bcb" onclick="SocialCalc.SettingsControlOnchangeBorder(this);" type="checkbox">'+
'    </td>'+
'    <td %bodypart.>'+
'     <div %parttitle.>Thickness</div>'+
'     <select id="%id.cbb-thickness-bdd" onchange="SocialCalc.SettingsControlOnchangeBorder(this);" size="1"></select>'+
'    </td>'+
'    <td %bodypart.>'+
'     <div %parttitle.>Style</div>'+
'     <select id="%id.cbb-style-bdd" onchange="SocialCalc.SettingsControlOnchangeBorder(this);" size="1"></select>'+
'    </td>'+
'    <td %bodypart.>'+
'     <div %parttitle.>Color</div>'+
'     <select id="%id.cbb-color-bcdd" onchange="SocialCalc.SettingsControlOnchangeBorder(this);" size="1"></select>'+
'     <input id="%id.cbb-color-bcib" onchange="SocialCalc.SettingsControlOnchangeBorder(this);" type="text" size="7" value="">'+
'     <span id="%id.cbb-color-cs">&nbsp;&nbsp;&nbsp;</div>'+
'    </td>'+
'   </tr></table>'+
' </td>'+
'</tr>'+
'<tr>'+
' <td %itemtitle.><br>Left Border:</td>'+
' <td %itembody.>'+
'   <table cellspacing="0" cellpadding="0"><tr>'+
'    <td %bodypart.>'+
'     <div %parttitle.>On/Off</div>'+
'     <input id="%id.cbl-onoff-bcb" onclick="SocialCalc.SettingsControlOnchangeBorder(this);" type="checkbox">'+
'    </td>'+
'    <td %bodypart.>'+
'     <div %parttitle.>Thickness</div>'+
'     <select id="%id.cbl-thickness-bdd" onchange="SocialCalc.SettingsControlOnchangeBorder(this);" size="1"></select>'+
'    </td>'+
'    <td %bodypart.>'+
'     <div %parttitle.>Style</div>'+
'     <select id="%id.cbl-style-bdd" onchange="SocialCalc.SettingsControlOnchangeBorder(this);" size="1"></select>'+
'    </td>'+
'    <td %bodypart.>'+
'     <div %parttitle.>Color</div>'+
'     <select id="%id.cbl-color-bcdd" onchange="SocialCalc.SettingsControlOnchangeBorder(this);" size="1"></select>'+
'     <input id="%id.cbl-color-bcib" onchange="SocialCalc.SettingsControlOnchangeBorder(this);" type="text" size="7" value="">'+
'     <span id="%id.cbl-color-cs">&nbsp;&nbsp;&nbsp;</div>'+
'    </td>'+
'   </tr></table>'+
' </td>'+
'</tr>'+
'<tr>'+
' <td %itemtitle.><br>Padding:</td>'+
' <td %itembody.>'+
'   <table cellspacing="0" cellpadding="0"><tr>'+
'    <td %bodypart.>'+
'     <div %parttitle.>Top</div>'+
'     <select id="%id.cpadtop-dd" onchange="SocialCalc.SettingsControlOnchange(this);" size="1"></select>'+
'     <input id="%id.cpadtop-ib" onchange="SocialCalc.SettingsControlOnchange(this);" type="text" size="3" value="">'+
'    </td>'+
'    <td %bodypart.>'+
'     <div %parttitle.>Right</div>'+
'     <select id="%id.cpadright-dd" onchange="SocialCalc.SettingsControlOnchange(this);" size="1"></select>'+
'     <input id="%id.cpadright-ib" onchange="SocialCalc.SettingsControlOnchange(this);" type="text" size="3" value="">'+
'    </td>'+
'    <td %bodypart.>'+
'     <div %parttitle.>Bottom</div>'+
'     <select id="%id.cpadbottom-dd" onchange="SocialCalc.SettingsControlOnchange(this);" size="1"></select>'+
'     <input id="%id.cpadbottom-ib" onchange="SocialCalc.SettingsControlOnchange(this);" type="text" size="3" value="">'+
'    </td>'+
'    <td %bodypart.>'+
'     <div %parttitle.>Left</div>'+
'     <select id="%id.cpadleft-dd" onchange="SocialCalc.SettingsControlOnchange(this);" size="1"></select>'+
'     <input id="%id.cpadleft-ib" onchange="SocialCalc.SettingsControlOnchange(this);" type="text" size="3" value="">'+
'    </td>'+
'   </tr></table>'+
' </td>'+
'</tr>'+
'</table>'+
'<br>'+
'</div>'
      };

   // Sort

   this.tabnums.sort = this.tabs.length;
   this.tabs.push({name: "sort", text: "Sort", html:
      ' <div id="%id.sorttools" style="display:none;">'+
      '  <table cellspacing="0" cellpadding="0"><tr>'+
      '   <td style="vertical-align:top;padding-right:4px;width:160px;">'+
      '    <div style="%tbt.">Set Cells To Sort</div>'+
      '    <select id="%id.sortlist" size="1" onfocus="%s.CmdGotFocus(this);"><option selected>[select range]</option></select>'+
      '    <input type="button" value="OK" onclick="%s.DoCmd(this, \'ok-setsort\');" style="font-size:x-small;">'+
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
      '      <input type="radio" name="majorsort" id="%id.majorsortup" value="up" checked><span style="font-size:x-small;color:#FFF;">Up</span><br>'+
      '      <input type="radio" name="majorsort" value="down"><span style="font-size:x-small;color:#FFF;">Down</span>'+
      '     </td>'+
      '    </tr></table>'+
      '   </td>'+
      '   <td style="vertical-align:top;padding-right:16px;">'+
      '    <table cellspacing="0" cellpadding="0"><tr>'+
      '     <td style="vertical-align:top;">'+
      '      <div style="%tbt.">Minor Sort</div>'+
      '      <select id="%id.minorsort" size="1" onfocus="%s.CmdGotFocus(this);"></select>'+
      '     </td><td>'+
      '      <input type="radio" name="minorsort" id="%id.minorsortup" value="up" checked><span style="font-size:x-small;color:#FFF;">Up</span><br>'+
      '      <input type="radio" name="minorsort" value="down"><span style="font-size:x-small;color:#FFF;">Down</span>'+
      '     </td>'+
      '    </tr></table>'+
      '   </td>'+
      '   <td style="vertical-align:top;padding-right:16px;">'+
      '    <table cellspacing="0" cellpadding="0"><tr>'+
      '     <td style="vertical-align:top;">'+
      '      <div style="%tbt.">Last Sort</div>'+
      '      <select id="%id.lastsort" size="1" onfocus="%s.CmdGotFocus(this);"></select>'+
      '     </td><td>'+
      '      <input type="radio" name="lastsort" id="%id.lastsortup" value="up" checked><span style="font-size:x-small;color:#FFF;">Up</span><br>'+
      '      <input type="radio" name="lastsort" value="down"><span style="font-size:x-small;color:#FFF;">Down</span>'+
      '     </td>'+
      '    </tr></table>'+
      '   </td>'+
      '  </tr></table>'+
      ' </div>',
      onclick: SocialCalc.SpreadsheetControlSortOnclick});
   this.editor.SettingsCallbacks.sort = {save: SocialCalc.SpreadsheetControlSortSave, load: SocialCalc.SpreadsheetControlSortLoad};

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
            var str = '<table cellspacing="0" cellpadding="0" style="margin-bottom:10px;"><tr><td style="font-size:small;padding:6px;"><b>Audit Trail This Session:</b><br><br>';
            var stack = s.sheet.changes.stack;
            var tos = s.sheet.changes.tos;
            for (i=0; i<stack.length; i++) {
               if (i==tos+1) str += '<br></td></tr><tr><td style="font-size:small;background-color:#EEE;padding:6px;">UNDONE STEPS:<br>';
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
      '<textarea id="%id.commenttext" style="font-size:small;height:32px;width:600px;overflow:auto;" onfocus="%s.CmdGotFocus(this);"></textarea>'+
      '</td><td style="vertical-align:top;">'+
      '&nbsp;<input type="button" value="Save" onclick="%s.SpreadsheetControlCommentSet();" style="font-size:x-small;">'+
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
      '    <input type="text" id="%id.namesname" style="font-size:x-small;width:75px;" onfocus="%s.CmdGotFocus(this);">'+
      '   </td>'+
      '   <td style="vertical-align:top;padding-right:6px;">'+
      '    <div style="%tbt.">Description</div>'+
      '    <input type="text" id="%id.namesdesc" style="font-size:x-small;width:150px;" onfocus="%s.CmdGotFocus(this);">'+
      '   </td>'+
      '   <td style="vertical-align:top;padding-right:6px;">'+
      '    <div style="%tbt.">Value</div>'+
      '    <input type="text" id="%id.namesvalue" width="16" style="font-size:x-small;width:100px;" onfocus="%s.CmdGotFocus(this);">'+
      '   </td>'+
      '   <td style="vertical-align:top;padding-right:12px;width:80px;">'+
      '    <div style="%tbt.">Set Value To</div>'+
      '    <input type="button" id="%id.namesrangeproposal" value="A1" onclick="%s.SpreadsheetControlNamesSetValue();" style="font-size:x-small;">'+
      '   </td>'+
      '   <td style="vertical-align:top;padding-right:6px;">'+
      '    <div style="%tbt.">&nbsp;</div>'+
      '    <input type="button" value="Save" onclick="%s.SpreadsheetControlNamesSave();" style="font-size:x-small;">'+
      '    <input type="button" value="Delete" onclick="%s.SpreadsheetControlNamesDelete()" style="font-size:x-small;">'+
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
      '     &nbsp;'+
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
      ' <div style="font-size:x-small;padding:5px 0px 10px 0px;">'+
      '  <b>Display Clipboard in:</b>'+
      '  <input type="radio" id="%id.clipboardformat-tab" name="%id.clipboardformat" checked onclick="%s.SpreadsheetControlClipboardFormat(\'tab\');"> Tab-delimited format &nbsp;'+
      '  <input type="radio" id="%id.clipboardformat-csv" name="%id.clipboardformat" onclick="%s.SpreadsheetControlClipboardFormat(\'csv\');"> CSV format &nbsp;'+
      '  <input type="radio" id="%id.clipboardformat-scsave" name="%id.clipboardformat" onclick="%s.SpreadsheetControlClipboardFormat(\'scsave\');"> SocialCalc-save format'+
      ' </div>'+
      ' <input type="button" value="Load SocialCalc Clipboard With This" style="font-size:x-small;" onclick="%s.SpreadsheetControlClipboardLoad();">&nbsp; '+
      ' <input type="button" value="Clear SocialCalc Clipboard" style="font-size:x-small;" onclick="%s.SpreadsheetControlClipboardClear();">&nbsp; '+
      ' <br>'+
      ' <textarea id="%id.clipboardtext" style="font-size:small;height:350px;width:800px;overflow:auto;" onfocus="%s.CmdGotFocus(this);"></textarea>'+
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

   var html, child, i, vname, v, style, button, bele;
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

   html = '<div><div style="'+spreadsheet.toolbarbackground+'padding:12px 10px 10px 4px;height:40px;">';

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

   for (style in spreadsheet.tabreplacements) {
      html = html.replace(spreadsheet.tabreplacements[style].regex, spreadsheet.tabreplacements[style].replacement);
      }
   html = html.replace(/\%s\./g, "SocialCalc.");
   html = html.replace(/\%id\./g, spreadsheet.idPrefix);
   html = html.replace(/\%tbt\./g, spreadsheet.toolbartext);
   spreadsheet.spreadsheetDiv.innerHTML = html;

   node.appendChild(spreadsheet.spreadsheetDiv);

   // Initialize SocialCalc buttons

spreadsheet.Buttons = {
   button_undo: {tooltip: "Undo", command: "undo"},
   button_redo: {tooltip: "Redo", command: "redo"},
   button_copy: {tooltip: "Copy", command: "copy"},
   button_cut: {tooltip: "Cut", command: "cut"},
   button_paste: {tooltip: "Paste", command: "paste"},
   button_pasteformats: {tooltip: "Paste Formats", command: "pasteformats"},
   button_delete: {tooltip: "Delete Contents", command: "delete"},
   button_filldown: {tooltip: "Fill Down", command: "filldown"},
   button_fillright: {tooltip: "Fill Right", command: "fillright"},
   button_alignleft: {tooltip: "Align Left", command: "align-left"},
   button_aligncenter: {tooltip: "Align Center", command: "align-center"},
   button_alignright: {tooltip: "Align Right", command: "align-right"},
   button_borderon: {tooltip: "Borders On", command: "borderon"},
   button_borderoff: {tooltip: "Borders Off", command: "borderoff"},
   button_merge: {tooltip: "Merge Cells", command: "merge"},
   button_unmerge: {tooltip: "Unmerge Cells", command: "unmerge"},
   button_insertrow: {tooltip: "Insert Row", command: "insertrow"},
   button_insertcol: {tooltip: "Insert Column", command: "insertcol"},
   button_deleterow: {tooltip: "Delete Row", command: "deleterow"},
   button_deletecol: {tooltip: "Delete Column", command: "deletecol"}
   }

   for (button in spreadsheet.Buttons) {
      bele = document.getElementById(spreadsheet.idPrefix+button);
      if (!bele) {alert("Button "+(spreadsheet.idPrefix+button)+" missing"); continue;}
      bele.style.border = "1px solid #404040";
      SocialCalc.TooltipRegister(bele, spreadsheet.Buttons[button].tooltip, {});
      SocialCalc.ButtonRegister(bele,
         {normalstyle: "border:1px solid #404040;backgroundColor:#404040;", hoverstyle: "border:1px solid #999;backgroundColor:#404040;", downstyle: "border:1px solid #FFF;backgroundColor:#888;"}, 
         {MouseDown: SocialCalc.DoButtonCmd, command: spreadsheet.Buttons[button].command});
      }

   // create formula bar

   spreadsheet.formulabarDiv = document.createElement("div");
   spreadsheet.formulabarDiv.style.height = "30px";
   spreadsheet.formulabarDiv.innerHTML = '<input type="text" size="60" value="">';// '<textarea rows="1" cols="60"></textarea>';
   spreadsheet.spreadsheetDiv.appendChild(spreadsheet.formulabarDiv);
   var inputbox = new SocialCalc.InputBox(spreadsheet.formulabarDiv.firstChild, spreadsheet.editor);

   // initialize tabs that need it

   for (i=0; i<tabs.length; i++) { // execute any tab-specific initialization code
      if (tabs[i].oncreate) {
         tabs[i].oncreate(spreadsheet, tabs[i].name);
         }
      }

   // create sheet view and others

   spreadsheet.viewheight = spreadsheet.height-
      (spreadsheet.spreadsheetDiv.firstChild.offsetHeight+spreadsheet.spreadsheetDiv.lastChild.offsetHeight);
   spreadsheet.editorDiv=spreadsheet.editor.CreateTableEditor(spreadsheet.width, spreadsheet.viewheight);

   spreadsheet.spreadsheetDiv.appendChild(spreadsheet.editorDiv);

   for (vname in views) {
      html = views[vname].html;
      for (style in views[vname].replacements) {
         html = html.replace(views[vname].replacements[style].regex, views[vname].replacements[style].replacement);
         }
      html = html.replace(/\%s\./g, "SocialCalc.");
      html = html.replace(/\%id\./g, spreadsheet.idPrefix);
      html = html.replace(/\%tbt\./g, spreadsheet.toolbartext);
      v = document.createElement("div");
      v.style.display = "none";
      v.style.width = spreadsheet.width + "px";
      v.style.height = spreadsheet.viewheight + "px";

      v.innerHTML = html;
      spreadsheet.spreadsheetDiv.appendChild(v);
      views[vname].element = v;
      if (views[vname].oncreate) {
         views[vname].oncreate(spreadsheet, views[vname]);
         }
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
   pos.right = 0;

   nodestyle = spreadsheet.parentNode.style;

   if (nodestyle.marginTop) {
      pos.top += nodestyle.marginTop.slice(0,-2)-0;
      }
   if (nodestyle.marginBottom) {
      pos.bottom += nodestyle.marginBottom.slice(0,-2)-0;
      }
   if (nodestyle.marginLeft) {
      pos.left += nodestyle.marginLeft.slice(0,-2)-0;
      }
   if (nodestyle.marginRight) {
      pos.right += nodestyle.marginRight.slice(0,-2)-0;
      }

   newval = spreadsheet.requestedHeight || sizes.height - pos.top - pos.bottom - 10;
   if (spreadsheet.height != newval) {
      spreadsheet.height = newval;
      spreadsheet.spreadsheetDiv.style.height = newval + "px";
      resized = true;
      }
   newval = spreadsheet.requestedWidth || sizes.width - pos.left - pos.right - 10 || 700; // !!! used to be: spreadsheet.parentNode.offsetWidth || 700;
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
   spreadsheet.context.PrecomputeSheetFontsAndLayouts();
   spreadsheet.context.CalculateColWidthData();
   spreadsheet.editor.EditorRenderSheet();
   spreadsheet.editor.DisplayCellContents();
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

   var newtab, tname, newtabnum, newview, i, vname, ele;
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
         newview = vname;
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

   if (views[newview].needsresize && views[vname].onresize) {
      views[newview].needsresize = false;
      views[newview].onresize(spreadsheet, views[newview]);
      }

   if (newview == "sheet" && views.sheet.needsrefresh) {
      views.sheet.needsrefresh = false;
      spreadsheet.FullRefreshAndRender();
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

   var sortrange, nrange, rparts, col, colname, sele;

   if (spreadsheet.sortrange && spreadsheet.sortrange.indexOf(":")==-1) { // sortrange is a named range
      nrange = SocialCalc.Formula.LookupName(spreadsheet.sheet, spreadsheet.sortrange || "");
      if (nrange.type == "range") {
         rparts = nrange.value.match(/^(.*)\|(.*)\|$/);
         sortrange = rparts[1] + ":" + rparts[2];
         }
      else {
         sortrange = "A1:A1";
         }
      }
   else {
      sortrange = spreadsheet.sortrange;
      }
   var range = SocialCalc.ParseRange(sortrange);
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
// SocialCalc.DoButtonCmd(e, buttoninfo, bobj)
//

SocialCalc.DoButtonCmd = function(e, buttoninfo, bobj) {

   SocialCalc.DoCmd(bobj.element, bobj.functionobj.command);

   }

//
// SocialCalc.DoCmd(obj, which)
//
// xxx
//

SocialCalc.DoCmd = function(obj, which) {

   var combostr, sstr, cl, i, clele, slist, slistele, str, sele, rele, lele, ele, sortrange, nrange, rparts;

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
         lele = document.getElementById(spreadsheet.idPrefix+"sortlist");
         if (lele.selectedIndex==0) {
            if (editor.range.hasrange) {
               spreadsheet.sortrange = SocialCalc.crToCoord(editor.range.left, editor.range.top) + ":" +
                          SocialCalc.crToCoord(editor.range.right, editor.range.bottom);
               }
            else {
               spreadsheet.sortrange = editor.ecell.coord+":"+editor.ecell.coord;
               }
            }
         else {
            spreadsheet.sortrange = lele.options[lele.selectedIndex].value;
            }
         ele = document.getElementById(spreadsheet.idPrefix+"sortbutton");
         ele.value = "Sort "+spreadsheet.sortrange;
         ele.style.visibility = "visible";
         SocialCalc.LoadColumnChoosers(spreadsheet);
         if (obj && obj.blur) obj.blur();
         SocialCalc.KeyboardFocus();   
         return;

      case "dosort":
         if (spreadsheet.sortrange && spreadsheet.sortrange.indexOf(":")==-1) { // sortrange is a named range
            nrange = SocialCalc.Formula.LookupName(spreadsheet.sheet, spreadsheet.sortrange || "");
            if (nrange.type != "range") return;
            rparts = nrange.value.match(/^(.*)\|(.*)\|$/);
            sortrange = rparts[1] + ":" + rparts[2];
            }
         else {
            sortrange = spreadsheet.sortrange;
            }
         if (sortrange == "A1:A1") return;
         str = "sort "+sortrange+" ";
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

      case "merge":
         combostr = SocialCalc.SpreadsheetCmdLookup[which] || "";
         sstr = SocialCalc.SpreadsheetCmdSLookup[which] || "";
         spreadsheet.ExecuteCommand(combostr, sstr);
         if (editor.range.hasrange) { // set ecell to upper left
            editor.MoveECell(SocialCalc.crToCoord(editor.range.left, editor.range.top));
            editor.RangeRemove();
            }
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
 'cut': 'cut %C all',
 'paste': 'paste %C all',
 'pasteformats': 'paste %C formats',
 'delete': 'erase %C formulas',
 'filldown': 'filldown %C all',
 'fillright': 'fillright %C all',
 'erase': 'erase %C all',
 'borderon': 'set %C bt %S%Nset %C br %S%Nset %C bb %S%Nset %C bl %S',
 'borderoff': 'set %C bt %S%Nset %C br %S%Nset %C bb %S%Nset %C bl %S',
 'merge': 'merge %C',
 'unmerge': 'unmerge %C',
 'align-left': 'set %C cellformat left',
 'align-center': 'set %C cellformat center',
 'align-right': 'set %C cellformat right',
 'align-default': 'set %C cellformat',
 'insertrow': 'insertrow %C',
 'insertcol': 'insertcol %C',
 'deleterow': 'deleterow %C',
 'deletecol': 'deletecol %C'
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

   var name, i;
   var namelist = [];
   var nl = document.getElementById(s.idPrefix+"sortlist");
   SocialCalc.LoadColumnChoosers(s);
   s.editor.RangeChangeCallback.sort = SocialCalc.UpdateSortRangeProposal;

   for (name in s.sheet.names) {
      namelist.push(name);
      }
   namelist.sort();
   nl.length = 0;
   nl.options[0] = new Option("[select range]");
   for (i=0; i<namelist.length; i++) {
      name = namelist[i];
      nl.options[i+1] = new Option(name, name);
      if (name == s.sortrange) {
         nl.options[i+1].selected = true;
         }
      }
   if (s.sortrange == "") {
      nl.options[0].selected = true;
      }

   SocialCalc.UpdateSortRangeProposal(s.editor);
   SocialCalc.KeyboardFocus();
   return;

   }

SocialCalc.SpreadsheetControlSortSave = function(s, setting) {
   // Format is:
   //    sort:sortrange:major-
//   return "sort:nothing to save at this time\n";
   return "";
   }

SocialCalc.SpreadsheetControlSortLoad = function(s, setting, line, flags) {
//   var parts;
//   parts = line.split(":");
//   alert(parts[1]);
   return true;
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
   document.getElementById(s.idPrefix+"clipboardformat-tab").checked = true;
   clipele.value = SocialCalc.ConvertSaveToOtherFormat(SocialCalc.Clipboard.clipboard, "tab");
   return;
   }

SocialCalc.SpreadsheetControlClipboardFormat = function(which) {
   var s = SocialCalc.GetSpreadsheetControlObject();
   clipele = document.getElementById(s.idPrefix+"clipboardtext");
   clipele.value = SocialCalc.ConvertSaveToOtherFormat(SocialCalc.Clipboard.clipboard, which);
   }

SocialCalc.SpreadsheetControlClipboardLoad = function() {
   var s = SocialCalc.GetSpreadsheetControlObject();
   var savetype = "tab";
   if (document.getElementById(s.idPrefix+"clipboardformat-csv").checked) {
      savetype = "csv";
      }
   else if (document.getElementById(s.idPrefix+"clipboardformat-scsave").checked) {
      savetype = "scsave";
      }
   s.sheet.ExecuteSheetCommand("loadclipboard "+
      SocialCalc.encodeForSave(
         SocialCalc.ConvertOtherFormatToSave(document.getElementById(s.idPrefix+"clipboardtext").value, savetype)), true);
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

SocialCalc.SpreadsheetControlClipboardExport = function() {
   var s = SocialCalc.GetSpreadsheetControlObject();
   if (s.ExportCallback) {
      s.ExportCallback(s);
      }
   SocialCalc.SetTab(s.tabs[0].name); // return to first tab
   SocialCalc.KeyboardFocus();
   }

// Settings

SocialCalc.SpreadsheetControlSettingsSwitch = function(target) {
   var s = SocialCalc.GetSpreadsheetControlObject();
   var sheettable = document.getElementById(s.idPrefix+"sheetsettingstable");
   var celltable = document.getElementById(s.idPrefix+"cellsettingstable");
   var sheettoolbar = document.getElementById(s.idPrefix+"sheetsettingstoolbar");
   var celltoolbar = document.getElementById(s.idPrefix+"cellsettingstoolbar");
   if (target=="sheet") {
      sheettable.style.display = "block";
      celltable.style.display = "none";
      sheettoolbar.style.display = "block";
      celltoolbar.style.display = "none";
      SocialCalc.SettingsControlSetCurrentPanel(s.views.settings.values.sheetspanel);
      }
   else {
      sheettable.style.display = "none";
      celltable.style.display = "block";
      sheettoolbar.style.display = "none";
      celltoolbar.style.display = "block";
      SocialCalc.SettingsControlSetCurrentPanel(s.views.settings.values.cellspanel);
      }
   }

SocialCalc.SetttingsControlSave = function(target) {
   var range;
   var s = SocialCalc.GetSpreadsheetControlObject();
   var sc = SocialCalc.SettingsControls;
   var panelobj = sc.CurrentPanel;
   var attribs = SocialCalc.SettingsControlUnloadPanel(panelobj);

   if (target=="sheet") {
      s.sheet.DecodeSheetAttributes(attribs);
      }
   else if (target=="cell") {
      if (s.editor.range.hasrange) {
         range = SocialCalc.crToCoord(s.editor.range.left, s.editor.range.top) + ":" +
            SocialCalc.crToCoord(s.editor.range.right, s.editor.range.bottom);
         }
      s.sheet.DecodeCellAttributes(s.editor.ecell.coord, attribs, range);
      }
   else { // Cancel
      }
   s.views.sheet.needsrefresh = true;
   SocialCalc.SetTab(s.tabs[0].name); // return to first tab
   SocialCalc.KeyboardFocus();
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


/*
* SettingsControls
*
* Each settings panel has an object in the following form:
*
*    {ctrl-name1: {setting: setting-nameA, type: ctrl-type, id: id-component},
*     ctrl-name2: {setting: setting-nameB, type: ctrl-type, id: id-component, initialdata: optional-initialdata-override},
*     ...}
*
* The ctrl-types are names that correspond to:
*
*    SocialCalc.SettingsControls.Controls = {
*       ctrl-type1: {
*          SetValue: function(panel-obj, ctrl-name, {def: true/false, val: value}) {...;},
*          GetValue: function(panel-obj, ctrl-name) {...return {def: true/false, val: value};},
*          Initialize: function(panel-obj, ctrl-name) {...;}, // used to fill dropdowns, etc.
*          InitialData: control-dependent, // used by Initialize (if no panel ctrlname.initialdata)
*          ChangedCallback: function(ctrl-name) {...;} // if not null, called by control when user changes value
*       }
*
*/

SocialCalc.SettingsControls = {
   Controls: {},
   CurrentPanel: null // panel object to search on events
   };

//
// SocialCalc.SettingsControlSetCurrentPanel(panel-object)
//

SocialCalc.SettingsControlSetCurrentPanel = function(panelobj) {

   SocialCalc.SettingsControls.CurrentPanel = panelobj;

   }


//
// SocialCalc.SettingsControlInitializePanel(panel-object)
//

SocialCalc.SettingsControlInitializePanel = function(panelobj) {

   var ctrlname;
   var sc = SocialCalc.SettingsControls;

   for (ctrlname in panelobj) {
      ctrl = sc.Controls[panelobj[ctrlname].type];
      if (ctrl && ctrl.Initialize) ctrl.Initialize(panelobj, ctrlname);
      }

   }


//
// SocialCalc.SettingsControlLoadPanel(panel-object, attribs)
//

SocialCalc.SettingsControlLoadPanel = function(panelobj, attribs) {

   var ctrlname;
   var sc = SocialCalc.SettingsControls;

   for (ctrlname in panelobj) {
      ctrl = sc.Controls[panelobj[ctrlname].type];
      if (ctrl && ctrl.SetValue) ctrl.SetValue(panelobj, ctrlname, attribs[panelobj[ctrlname].setting]);
      }

   }

//
// attribs = SocialCalc.SettingsControlUnloadPanel(panel-object)
//

SocialCalc.SettingsControlUnloadPanel = function(panelobj) {

   var ctrlname;
   var sc = SocialCalc.SettingsControls;
   var attribs = {};

   for (ctrlname in panelobj) {
      ctrl = sc.Controls[panelobj[ctrlname].type];
      if (ctrl && ctrl.GetValue) attribs[panelobj[ctrlname].setting] = ctrl.GetValue(panelobj, ctrlname);
      }

   return attribs;

   }

//
// SocialCalc.SettingsControls.DropdownSetValue
//

SocialCalc.SettingsControls.DropdownSetValue = function(panelobj, ctrlname, value) {

   if (!value) {alert(ctrlname+" no value"); return;}

   if (!value.def) {
      SocialCalc.SettingsSetOptionSelected(panelobj[ctrlname].id+"-dd", value.val);
      }
   else {
      SocialCalc.SettingsSetOptionSelected(panelobj[ctrlname].id+"-dd", 0);
      }

   }

//
// SocialCalc.SettingsControls.DropdownGetValue
//

SocialCalc.SettingsControls.DropdownGetValue = function(panelobj, ctrlname) {

   var ele = document.getElementById(panelobj[ctrlname].id+"-dd");
   if (!ele) return;

   if (ele.selectedIndex==0) { // default
      return {def: true, val: 0};
      }
   else {
      return {def: false, val: ele.options[ele.selectedIndex].value};
      }

   }

//
// SocialCalc.SettingsControls.DropdownInitialize
//

SocialCalc.SettingsControls.DropdownInitialize = function(panelobj, ctrlname) {

   var i, val, pos, otext;
   var sc = SocialCalc.SettingsControls;
   var initialdata = panelobj[ctrlname].initialdata || sc.Controls[panelobj[ctrlname].type].InitialData || "";
   var optionvals = initialdata.split(/\|/);

   var ele = document.getElementById(panelobj[ctrlname].id+"-dd");
   if (!ele) return;
   ele.length = 0; // reset
   for (i=0; i<(optionvals.length||0); i++) {
      val = optionvals[i];
      pos = val.indexOf(":");
      otext = val.substring(0, pos);
      if (otext.indexOf("\\")!=-1) { // escape any colons
         otext = otext.replace(/\\c/g,":");
         otext = otext.replace(/\\b/g,"\\");
         }
      ele.options[i] = new Option(otext, val.substring(pos+1));
      }

   }


SocialCalc.SettingsControls.Controls.Dropdown = {
   SetValue: SocialCalc.SettingsControls.DropdownSetValue,
   GetValue: SocialCalc.SettingsControls.DropdownGetValue,
   Initialize: SocialCalc.SettingsControls.DropdownInitialize,
   ChangedCallback: null
   }


//
// SocialCalc.SettingsControls.CustomDropdownSetValue
//

SocialCalc.SettingsControls.CustomDropdownSetValue = function(panelobj, ctrlname, value) {

   var found;

   if (!value) {alert(ctrlname+" no value"); return;}
   if (!panelobj[ctrlname]) {alert(ctrlname+" no id"); return;};

   if (!value.def) {
      found = SocialCalc.SettingsSetOptionSelected(panelobj[ctrlname].id+"-dd", value.val);
      if (!found) SocialCalc.SettingsSetOptionSelected(panelobj[ctrlname].id+"-dd", 1);
      document.getElementById(panelobj[ctrlname].id+"-ib").value = value.val;
      }
   else {
      SocialCalc.SettingsSetOptionSelected(panelobj[ctrlname].id+"-dd", 0);
      document.getElementById(panelobj[ctrlname].id+"-ib").value = "";
      }

   }

//
// SocialCalc.SettingsControls.CustomDropdownGetValue
//

SocialCalc.SettingsControls.CustomDropdownGetValue = function(panelobj, ctrlname) {

   var ele1 = document.getElementById(panelobj[ctrlname].id+"-dd");
   if (!ele1) return;
   var ele2 = document.getElementById(panelobj[ctrlname].id+"-ib");
   if (!ele1) return;

   if (ele1.selectedIndex==0) { // default
      return {def: true, val: 0};
      }
   else {
      return {def: false, val: ele2.value}; // custom value (which should mirror selected one)
      }

   }

SocialCalc.SettingsControls.Controls.CustomDropdown = {
   SetValue: SocialCalc.SettingsControls.CustomDropdownSetValue,
   GetValue: SocialCalc.SettingsControls.CustomDropdownGetValue,
   Initialize: SocialCalc.SettingsControls.DropdownInitialize,
   InitialData: "Default:|Custom:",
   ChangedCallback: null
   }


//
// SocialCalc.SettingsControls.ColorDropdownSetValue
//

SocialCalc.SettingsControls.ColorDropdownSetValue = function(panelobj, ctrlname, value) {

   var sc = SocialCalc.SettingsControls;
   var found;

   if (!value) {alert(ctrlname+" no value"); return;}

   if (!value.def) {
      found = SocialCalc.SettingsSetOptionSelected(panelobj[ctrlname].id+"-dd", value.val);
      if (!found) SocialCalc.SettingsSetOptionSelected(panelobj[ctrlname].id+"-dd", 1); // set custom - second item
      document.getElementById(panelobj[ctrlname].id+"-ib").value = "#"+sc.RGBToHex(value.val);
      document.getElementById(panelobj[ctrlname].id+"-cs").style.backgroundColor = "#"+sc.RGBToHex(value.val);
      document.getElementById(panelobj[ctrlname].id+"-cs").style.border = "1px solid #000";
      }
   else {
      SocialCalc.SettingsSetOptionSelected(panelobj[ctrlname].id+"-dd", 0); // set default - first item
      document.getElementById(panelobj[ctrlname].id+"-ib").value = "";
      document.getElementById(panelobj[ctrlname].id+"-cs").style.backgroundColor = "#FFFFFF";
      document.getElementById(panelobj[ctrlname].id+"-cs").style.border = "1px solid #CCC";
      }

   }

//
// SocialCalc.SettingsControls.ColorDropdownGetValue
//

SocialCalc.SettingsControls.ColorDropdownGetValue = function(panelobj, ctrlname) {

   var sc = SocialCalc.SettingsControls;
   var ele1 = document.getElementById(panelobj[ctrlname].id+"-dd");
   if (!ele1) return;
   var ele2 = document.getElementById(panelobj[ctrlname].id+"-ib");
   if (!ele1) return;

   if (ele1.selectedIndex==0) { // default
      return {def: true, val: 0};
      }
   else {
      return {def: false, val: sc.HexToRGB(ele2.value)}; // custom value (which should mirror selected one)
      }

   }

SocialCalc.SettingsControls.RGBToHex = function(val) {

   var sc = SocialCalc.SettingsControls;

   if (val=="") {
      return "000000";
      }
   var rgbvals = val.match(/(\d+)\D+(\d+)\D+(\d+)/);
   if (rgbvals) {
      return sc.ToHex(rgbvals[1])+sc.ToHex(rgbvals[2])+sc.ToHex(rgbvals[3]);
      }
   else {
      return "000000";
      }
   }

SocialCalc.SettingsControls.HexDigits="0123456789ABCDEF";

SocialCalc.SettingsControls.ToHex = function(num) {
   var sc = SocialCalc.SettingsControls;
   var first=Math.floor(num / 16);
   var second=num % 16;
   return sc.HexDigits.charAt(first)+sc.HexDigits.charAt(second);
   }

SocialCalc.SettingsControls.FromHex = function(str) {

   var sc = SocialCalc.SettingsControls;
   var first = sc.HexDigits.indexOf(str.charAt(0).toUpperCase());
   var second = sc.HexDigits.indexOf(str.charAt(1).toUpperCase());
   return ((first>=0)?first:0)*16+((second>=0)?second:0);
   }

SocialCalc.SettingsControls.HexToRGB = function(val) {

   var sc = SocialCalc.SettingsControls;

   return "rgb("+sc.FromHex(val.substring(1,3))+","+sc.FromHex(val.substring(3,5))+","+sc.FromHex(val.substring(5,7))+")";

   }

SocialCalc.SettingsControls.Controls.ColorDropdown = {
   SetValue: SocialCalc.SettingsControls.ColorDropdownSetValue,
   GetValue: SocialCalc.SettingsControls.ColorDropdownGetValue,
   Initialize: SocialCalc.SettingsControls.DropdownInitialize,
   InitialData: "Default:|Custom:|Black:rgb(0,0,0)|Dark-Gray:rgb(102,102,102)|Gray:rgb(204,204,204)|"+
      "White:rgb(255,255,255)|Red:rgb(255,0,0)|Dark Red:rgb(153,0,0)|Orange:rgb(255,153,0)|"+
      "Yellow:rgb(255,255,0)|Light Yellow:rgb(255,255,204)|Green:rgb(0,255,0)|Dark Green:rgb(0,153,0)|"+
      "Blue:rgb(0,0,255)|Dark Blue:rgb(0,0,153)|Light Blue:rgb(204,204,255)",
   ChangedCallback: null
   }


//
// SocialCalc.SettingsControls.BorderSideSetValue
//

SocialCalc.SettingsControls.BorderSideSetValue = function(panelobj, ctrlname, value) {

   var sc = SocialCalc.SettingsControls;
   var ele, found, idname, parts;
   var idstart = panelobj[ctrlname].id;

   if (!value) {alert(ctrlname+" no value"); return;}

   ele = document.getElementById(idstart+"-onoff-bcb"); // border checkbox
   if (!ele) return;

   if (value.val) { // border does not use default: it looks only to the value currently
      ele.checked = true;
      ele.value = value.val;
      parts = value.val.match(/(\S+)\s+(\S+)\s+(\S.+)/);
      idname = idstart+"-thickness-bdd";
      SocialCalc.SettingsSetOptionSelected(idname, parts[1]);
      SocialCalc.SettingsSetDisabled(idname, false);
      idname = idstart+"-style-bdd";
      SocialCalc.SettingsSetOptionSelected(idname, parts[2]);
      SocialCalc.SettingsSetDisabled(idname, false);
      idname = idstart+"-color-bcdd"; // border color dropdown
      found = SocialCalc.SettingsSetOptionSelected(idname, parts[3]);
      SocialCalc.SettingsSetDisabled(idname, false);
      if (!found) SocialCalc.SettingsSetOptionSelected(idname, 0); // set custom - first item here
      idname = idstart+"-color-bcib";
      SocialCalc.SettingsSetDisabled(idname, false);
      document.getElementById(idname).value = "#"+sc.RGBToHex(parts[3]);
      idname = idstart+"-color-cs";
      document.getElementById(idname).style.backgroundColor = parts[3];
      document.getElementById(idname).style.border = "1px solid #000";
      }
   else {
      ele.checked = false;
      ele.value = value.val;
      idname = panelobj[ctrlname].id+"-thickness-bdd";
      SocialCalc.SettingsSetOptionSelected(idname, "1px");
      SocialCalc.SettingsSetDisabled(idname, true);
      idname = idstart+"-style-bdd";
      SocialCalc.SettingsSetOptionSelected(idname, "solid");
      SocialCalc.SettingsSetDisabled(idname, true);
      idname = idstart+"-color-bcdd";
      SocialCalc.SettingsSetOptionSelected(idname, "rgb(0,0,0)");
      SocialCalc.SettingsSetDisabled(idname, true);
      idname = idstart+"-color-bcib";
      document.getElementById(idname).value = "#000000";
      SocialCalc.SettingsSetDisabled(idname, true);
      idname = idstart+"-color-cs";
      document.getElementById(idname).style.backgroundColor = "#FFF";
      document.getElementById(idname).style.border = "1px solid #CCC";
      }

   }

//
// SocialCalc.SettingsControls.BorderSideGetValue
//

SocialCalc.SettingsControls.BorderSideGetValue = function(panelobj, ctrlname) {

   var sc = SocialCalc.SettingsControls;
   var ele, value;
   var idstart = panelobj[ctrlname].id;

   ele = document.getElementById(idstart+"-onoff-bcb"); // border checkbox
   if (!ele) return;


   if (ele.checked) { // on
      ele = document.getElementById(idstart+"-thickness-bdd");
      value = ele.options[ele.selectedIndex].value;
      ele = document.getElementById(idstart+"-style-bdd");
      value += " " + ele.options[ele.selectedIndex].value;
      ele = document.getElementById(idstart+"-color-bcib");
      value += " " + sc.HexToRGB(ele.value);
      return {def: false, val: value};
      }
   else { // off
      return {def: false, val: ""};
      }

   }

//
// SocialCalc.SettingsControls.BorderSideInitialize
//

SocialCalc.SettingsControls.BorderSideInitialize = function(panelobj, ctrlname) {

   var sc = SocialCalc.SettingsControls;
   var initialdata = panelobj[ctrlname].initialdata || sc.Controls[panelobj[ctrlname].type].InitialData || "";

   var initDropDown = function(subcontrol, suffix) {
      var ele, optionvals, i, val, pos, otext;
      optionvals = initialdata[subcontrol].split(/\|/);
      ele = document.getElementById(panelobj[ctrlname].id+"-"+subcontrol+suffix);
      if (!ele) return;
      ele.length = 0; // reset
      for (i=0; i<(optionvals.length||0); i++) {
         val = optionvals[i];
         pos = val.indexOf(":");
         otext = val.substring(0, pos);
         if (otext.indexOf("\\")!=-1) { // escape any colons
            otext = otext.replace(/\\c/g,":");
            otext = otext.replace(/\\b/g,"\\");
            }
         ele.options[i] = new Option(otext, val.substring(pos+1));
         }
      }

   initDropDown("thickness", "-bdd");
   initDropDown("style", "-bdd");
   initDropDown("color", "-bcdd");

   }


//
// SocialCalc.SettingsControlOnchangeBorder = function(ele)
//

SocialCalc.SettingsControlOnchangeBorder = function(ele) {

   var idname, value, found, ele2;
   var sc = SocialCalc.SettingsControls;
   var panelobj = sc.CurrentPanel;

   var nameparts = ele.id.match(/(^.*\-)(\w+)\-(\w+)\-(\w+)$/);
   if (!nameparts) return;
   var prefix = nameparts[1];
   var ctrlname = nameparts[2];
   var ctrlsubid = nameparts[3]
   var ctrlidsuffix = nameparts[4];
   var ctrltype = panelobj[ctrlname].type;

   switch (ctrlidsuffix) {
      case "bcb": // border checkbox
         if (ele.checked) {
            sc.Controls[ctrltype].SetValue(sc.CurrentPanel, ctrlname, {def: false, val: ele.value || "1px solid rgb(0,0,0)"});
            }
         else {
            sc.Controls[ctrltype].SetValue(sc.CurrentPanel, ctrlname, {def: false, val: ""});
            }
         break;
      case "bdd": // plain drop down - ignore
         break;
      case "bcdd": // border color dropdown
         idname = prefix+ctrlname+"-"+ctrlsubid+"-bcib"; // border color input box
         document.getElementById(idname).value = "#"+sc.RGBToHex(ele.options[ele.selectedIndex].value);
         ele2 = document.getElementById(prefix+ctrlname+"-"+ctrlsubid+"-cs");
         ele2.style.backgroundColor = ele.options[ele.selectedIndex].value;
         ele2.style.border = "1px solid #000";
         break;
      case "bcib": // border color input box element
         idname = prefix+ctrlname+"-"+ctrlsubid+"-bcdd"; // border color dropdown
         value = sc.HexToRGB(ele.value);
         found = SocialCalc.SettingsSetOptionSelected(idname, value);
         if (!found) SocialCalc.SettingsSetOptionSelected(idname, 0); // set custom - first item here
         ele.value = "#"+sc.RGBToHex(value);
         break;
      }

   }


SocialCalc.SettingsControls.Controls.BorderSide = {
   SetValue: SocialCalc.SettingsControls.BorderSideSetValue,
   GetValue: SocialCalc.SettingsControls.BorderSideGetValue,
   Initialize: SocialCalc.SettingsControls.BorderSideInitialize,
   InitialData: {thickness: "1 pixel:1px", style: "Solid:solid",
      color: "Custom:|Black:rgb(0,0,0)|Dark-Gray:rgb(102,102,102)|Gray:rgb(204,204,204)|"+
         "White:rgb(255,255,255)|Red:rgb(255,0,0)|Dark Red:rgb(153,0,0)|Orange:rgb(255,153,0)|"+
         "Yellow:rgb(255,255,0)|Light Yellow:rgb(255,255,204)|Green:rgb(0,255,0)|Dark Green:rgb(0,153,0)|"+
         "Blue:rgb(0,0,255)|Dark Blue:rgb(0,0,153)|Light Blue:rgb(204,204,255)"},
   ChangedCallback: null
   }


SocialCalc.SettingsControlOnchange = function(ele) {

   var sc = SocialCalc.SettingsControls;
   var panelobj = sc.CurrentPanel;

   var nameparts = ele.id.match(/(^.*\-)(\w+)\-(\w+)$/);
   if (!nameparts) return;
   var prefix = nameparts[1];
   var ctrlname = nameparts[2];
   var ctrlidsuffix = nameparts[3];
   var ctrltype = panelobj[ctrlname].type;

   switch (ctrlidsuffix) {
      case "dd": // drop down - select element
         if (ele.selectedIndex==0) { // default is first item
            sc.Controls[ctrltype].SetValue(sc.CurrentPanel, ctrlname, {def: true, val: 0});
            }
         else {
            sc.Controls[ctrltype].SetValue(panelobj, ctrlname, {def: false, val: ele.options[ele.selectedIndex].value});
            }
         break;
      case "ib": // drop down - input box element
         if (ele.value=="") {
            sc.Controls[ctrltype].SetValue(panelobj, ctrlname, {def: true, val: 0});
            }
         else {
            sc.Controls[ctrltype].SetValue(panelobj, ctrlname, {def: false, val: (ctrltype=="ColorDropdown" ? sc.HexToRGB(ele.value) : ele.value)});
            }
         break;
      }

   }


SocialCalc.SettingsSetOptionSelected = function(ele_or_id, val) {

   var found = false;
   var ele = typeof ele_or_id == "string" ? document.getElementById(ele_or_id) : ele_or_id;
   if (!ele) {
      return false;
      }

   if (typeof val=="number") { // explicit item position
      ele.selectedIndex = val;
      return true;
      }

   for (var i=0; i<ele.options.length; i++) {
      if (ele.options[i].value==val) {
         ele.options[i].selected=true;
         found = true;
         }
      else {
         ele.options[i].selected=false;
         }
      }

   return found;

   }

SocialCalc.SettingsSetDisabled = function(ele_or_id, val) {

   var ele = typeof ele_or_id == "string" ? document.getElementById(ele_or_id) : ele_or_id;
   if (!ele) {
      return false;
      }

   ele.disabled = val;

   }

