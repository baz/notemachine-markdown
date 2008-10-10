// basil at oiledmachine dot com
// 
// NoteMachine is a widget which allows you to store persistent notes
//
// v0.1		20071103		Initial.
// v0.2		20071110		Fixed bug where upon first load, the toggle editor button had to be clicked twice to
//							function.
//							Fixed bug where upon hide, then show, the popup menu is out of sync with the 
//							displayed note.


// global vars
var _currentNote = 1;
var _editorView = 1;

// Function: load()
// Called by HTML body element's onload event when the widget is ready to start
//
function load()
{
    setupParts();
	checkStorageLocation();
	populatePopupMenu();
	openFirstNote();
}

//
// Function: remove()
// Called when the widget has been removed from the Dashboard
//
function remove()
{
    // Stop any timers to prevent CPU usage
    // Remove any preferences as needed
    // widget.setPreferenceForKey(null, createInstancePreferenceKey("your-key"));
}

//
// Function: hide()
// Called when the widget has been hidden
//
function hide()
{
    // Stop any timers to prevent CPU usage
	saveCurrentNote();
}

//
// Function: show()
// Called when the widget has been shown
//
function show()
{
	// in case there has been some note deletions through Finder
	populatePopupMenu();
}

//
// Function: sync()
// Called when the widget has been synchronized with .Mac
//
function sync()
{
    // Retrieve any preference values that you need to be synchronized here
    // Use this for an instance key's value:
    // instancePreferenceValue = widget.preferenceForKey(null, createInstancePreferenceKey("your-key"));
    //
    // Or this for global key's value:
    // globalPreferenceValue = widget.preferenceForKey(null, "your-key");
}

//
// Function: showBack(event)
// Called when the info button is clicked to show the back of the widget
//
// event: onClick event from the info button
//
function showBack(event)
{
    var front = document.getElementById("front");
    var back = document.getElementById("back");

    if (window.widget) {
        widget.prepareForTransition("ToBack");
    }

    front.style.display = "none";
    back.style.display = "block";

    if (window.widget) {
        setTimeout('widget.performTransition();', 0);
    }
}

//
// Function: showFront(event)
// Called when the done button is clicked from the back of the widget
//
// event: onClick event from the done button
//
function showFront(event)
{
    var front = document.getElementById("front");
    var back = document.getElementById("back");

    if (window.widget) {
        widget.prepareForTransition("ToFront");
    }

    front.style.display="block";
    back.style.display="none";

    if (window.widget) {
        setTimeout('widget.performTransition();', 0);
    }
}

if (window.widget) {
    widget.onremove = remove;
    widget.onhide = hide;
    widget.onshow = show;
    widget.onsync = sync;
}

function getFileName(note) {
	return "~/Library/NoteMachine/note"+note+".txt";
}

function checkStorageLocation() {
	if (widget.system("ls ~/Library/NoteMachine",null).status==1) {
		widget.system("mkdir ~/Library/NoteMachine",null);
	}
}

function getNumNotes()
{
	// count how many notes we have
	numNotes = widget.system("ls ~/Library/NoteMachine | egrep 'note*' | wc -l", null).outputString;
	numNotes = numNotes.replace(/^\s+|\s+$/g,"")
	// do this so that first time user has the popup menu populated with one entry at least
	if (numNotes == 0) {
		numNotes = 1;
	}
	return numNotes;
}

function getCurrentNoteNum()
{
	return _currentNote;
}

function setCurrentNoteNum(num)
{
	_currentNote = num;
}

function getEditorView()
{
	return _editorView;
}

function setEditorView(bool)
{
	_editorView = bool;
}

function saveCurrentNote()
{
	var currentNoteNum = getCurrentNoteNum();
	var text = String(document.getElementById("textArea").value);
	var catproc = widget.system("/bin/cat > "+getFileName(currentNoteNum), endHandler);
	catproc.write(text);
	catproc.close();
}

function endHandler() { }

function newNote(event)
{
	// Creates a new note and populates the popup menu accordingly
	// save current note first
	saveCurrentNote();

	// create new txt file to hold persistent data
	var newNoteNum = getNumNotes();
	newNoteNum = parseInt(newNoteNum)+1;
	widget.system("touch "+getFileName(newNoteNum),null);

	// populate popup
	populatePopupMenu();

	// switch to note
	// change popup selection
	var newPopupSelectedIndex = newNoteNum-1;
	setPopupIndex(newPopupSelectedIndex);
	// set new current note
	setCurrentNoteNum(newNoteNum);
	// now clear textarea contents for this new note
	document.getElementById("textArea").value = "";
}

function setPopupIndex(index)
{
	var popupToChange = document.getElementById("noteNumPopup");
	popupToChange.object.setSelectedIndex(index);
}

function deleteNote(event)
{
    // delete the note that is currently being shown
	var currentNoteNum = getCurrentNoteNum();
	widget.system("rm -f "+getFileName(currentNoteNum), null);
	// now it is deleted, go through all note files and rename in order
	// gives notes1-9
	var allNoteFiles = widget.system("ls ~/Library/NoteMachine | egrep 'note[0-9][^0-9]' | sort", null).outputString;
	// gives rest of notes, notes10-*
	allNoteFiles = allNoteFiles + widget.system("ls ~/Library/NoteMachine | egrep 'note[0-9]{2}' | sort", null).outputString;
	if (allNoteFiles.length>0)
		var filesArray = allNoteFiles.split("\n");
	else
		var filesArray = new Array();
	// loop through all files and rename
	for (var i=0; i<filesArray.length-1; i++) {
		widget.system("mv ~/Library/NoteMachine/"+filesArray[i]+" "+getFileName(i+1), null);
	}
	
	populatePopupMenu();
	
	// change popup selection
	var newPopupSelectedIndex = (currentNoteNum-2)>=0 ? currentNoteNum-2 : 0;
	setPopupIndex(newPopupSelectedIndex);
	// set new current note
	var newNoteNum = (currentNoteNum-1)>1 ? currentNoteNum-1 : 1;
	setCurrentNoteNum(newNoteNum);
	// now cat contents of previous note
	catContents(newNoteNum);
}

function catContents(noteNum)
{
	var catText = widget.system("/bin/cat "+getFileName(noteNum), null).outputString;
	var textAreaToChange = document.getElementById("textArea");
	if (typeof(catText) == 'string')
		textAreaToChange.value = String(catText);
	else
		textAreaToChange.value = "";
}

function openFirstNote()
{
	// used to populate on first load
	catContents(1);
}

function populatePopupMenu()
{
	// populate menu with number of notes
	var popupToChange = document.getElementById("noteNumPopup");
	// new number of notes but not if just started with one note
	var numNotes = getNumNotes();
	var newPopupOptions = new Array(numNotes);
	for (var i=0; i<numNotes; i++) {
		var newPopupOptionLabel = i+1;
		newPopupOptions[i] = [newPopupOptionLabel, i+1];
	}
	popupToChange.object.setOptions(newPopupOptions);
	// set index to current note
	setPopupIndex(_currentNote-1);
}

function toggleEditor(event)
{
	if (getEditorView()) { // editor is viewable, so close it and open scrollarea
		var itemToResize = document.getElementById("textArea");
		var newDimensions = {width: 411, height: 0};
		resize(itemToResize, newDimensions);
		
		// fade in scrollarea
		var itemToResize = document.getElementById("scrollArea");
		var fadeHandler = function(a, c, s, f){ itemToResize.style.opacity = c; };
		new AppleAnimator(500, 13, 0.0, 1.0, fadeHandler).start();
	
		// open scrollarea
		var newDimensions = {width: 411, height: 330};
		resize(itemToResize, newDimensions);
		
		// set scrollarea visible
		itemToResize.style.visibility = 'visible';
		
		// now we must invoke markdown to markup our text and set the content
		// first save our file
		saveCurrentNote();
		// call perl markdown script
		var currentFilename = getFileName(_currentNote);
		var newScrollAreaContent = widget.system("perl Markdown.pl --html4tags "+currentFilename, null).outputString;
		// assign new content to scrollarea
		itemToResize.object.content.innerHTML = newScrollAreaContent;
		itemToResize.object.refresh();

		// set global var
		setEditorView(0);
		
	} else { // editor is not viewable, so open it and close scrollarea
		var itemToResize = document.getElementById("textArea");
		var newDimensions = {width: 411, height: 330};
		resize(itemToResize, newDimensions);
		
		// close scrollarea
		var itemToResize = document.getElementById("scrollArea");
		var newDimensions = {width: 411, height: 0};
		resize(itemToResize, newDimensions);
		
		// fade out scrollarea
		var fadeHandler = function(a, c, s, f){ itemToResize.style.opacity = c; };
		new AppleAnimator(500, 13, 1.0, 0.0, fadeHandler).start();
		
		// set global var
		setEditorView(1);
		
	}
}

function switchToNote(event)
{
	// check which view we are in
	if (getEditorView()) { // editor is viewable, so switch notes as per usual
		_switchNote();
	} else { // editor is not viewable, so switch to editor and then switch notes
		// note: copied from above
		var itemToResize = document.getElementById("textArea");
		var newDimensions = {width: 411, height: 330};
		resize(itemToResize, newDimensions);
		
		// close scrollarea
		var itemToResize = document.getElementById("scrollArea");
		var newDimensions = {width: 411, height: 0};
		resize(itemToResize, newDimensions);
		
		// fade out scrollarea
		var fadeHandler = function(a, c, s, f){ itemToResize.style.opacity = c; };
		new AppleAnimator(500, 13, 1.0, 0.0, fadeHandler).start();
		
		// set global var
		setEditorView(1);
		
		_switchNote();
	}

}

function _switchNote()
{
    // Switches to the note selected in the popup
	// save note
	saveCurrentNote();	
	// cat contents of popupValue page
	var popupValue = document.getElementById("noteNumPopup");
	popupValue = popupValue.object.getValue();
	catContents(popupValue);	
	// set current note
	setCurrentNoteNum(popupValue);
}

function resize(itemToResize, newDimensions)
{
	var oldWidth = parseInt(document.defaultView.getComputedStyle(itemToResize, null).getPropertyValue("width"));
	var oldHeight = parseInt(document.defaultView.getComputedStyle(itemToResize, null).getPropertyValue("height"));
	var startingRect = new AppleRect (0, 0, oldWidth, oldHeight);
	var finishingRect = new AppleRect (0, 0, newDimensions.width, newDimensions.height);
	var resizeHandler = function(rectAnimation, currentRect, startingRect, finishingRect) 
	{
		itemToResize.style.width = currentRect.right + "px";
		itemToResize.style.height = currentRect.bottom + "px";
	};
	var currentRectAnimation = new AppleRectAnimation( startingRect, finishingRect, resizeHandler );
	var currentAnimator = new AppleAnimator (500, 13);
	currentAnimator.addAnimation(currentRectAnimation);
	currentAnimator.start();
}
