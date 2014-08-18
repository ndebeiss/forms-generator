/*
Copyright or © or Copr. INRIA contributor(s) : Nicolas Debeissat

nicolas.debeissat@gmail.com (http://debeissat.nicolas.free.fr/)

This software is a computer program whose purpose is to generically
generate web forms from a XML specification and, with that form,
being able to generate the XML respecting that specification.

This software is governed by the CeCILL license under French law and
abiding by the rules of distribution of free software.  You can  use, 
modify and/ or redistribute the software under the terms of the CeCILL
license as circulated by CEA, CNRS and INRIA at the following URL
"http://www.cecill.info". 

As a counterpart to the access to the source code and  rights to copy,
modify and redistribute granted by the license, users are provided only
with a limited warranty  and the software's author,  the holder of the
economic rights,  and the successive licensors  have only  limited
liability. 

In this respect, the user's attention is drawn to the risks associated
with loading,  using,  modifying and/or developing or reproducing the
software by the user in light of its specific status of free software,
that may mean  that it is complicated to manipulate,  and  that  also
therefore means  that it is reserved for developers  and  experienced
professionals having in-depth computer knowledge. Users are therefore
encouraged to load and test the software's suitability as regards their
requirements in conditions enabling the security of their systems and/or 
data to be ensured and,  more generally, to use and operate it in the 
same conditions as regards security. 

The fact that you are presently reading this means that you have had
knowledge of the CeCILL license and that you accept its terms.

*/

/*
 get a form from the XSLT/GetForms servlet and calls getFormContent on it
 */
function getForm(chosenForm, maxRefs) {
    var xml_text = loadFile(chosenForm);
    var xml = createDocumentFromText(xml_text);
    if (endsWith(chosenForm, ".xsd")) {
        xml = applyXslt(xml, "forms/xsl/XSDtoRNG.xsl");
    }
    
    
    /*
     firefox XSLT processor does not support namespace::axis, so have to add <nsp:namespace prefix="" uri=""> 
    */
    var grammarNode = xml.getElementsByTagNameNS("http://relaxng.org/ns/structure/1.0", "grammar").item(0);
    if (grammarNode) {
        var grammarNodeAttrs = grammarNode.attributes;
        for (var i=0 ; i<grammarNodeAttrs.length ; i++) {
            if (grammarNodeAttrs[i].nodeName.match("xmlns")) {
                var namespace = xml.createElementNS("namespace_declaration", "nsp:namespace");
                var prefix = grammarNodeAttrs[i].localName.replace(/^xmlns$/, "");
                namespace.setAttribute("prefix", prefix);
                namespace.setAttribute("uri", grammarNodeAttrs[i].value);
                grammarNode.appendChild(namespace);
            }
        }
        if (maxRefs) {
            var paramMap = new Array();
            paramMap["maxRefs"] = maxRefs;
            var form = applyXslt(xml, "forms/xsl/RNGtoHTMLform_standalone.xsl", true, paramMap);
        } else {
            var form = applyXslt(xml, "forms/xsl/RNGtoHTMLform_standalone.xsl", true);
        }
        var formDiv = document.getElementById("form");
        removeChildren(formDiv);
        formDiv.appendChild(form);
        //form can not be used directly as it is a document fragment
        initSelectElements(document.getElementById("form"));
    }
};

function returnForm(chosenFormAsText) {
    var xml = createDocumentFromText(chosenFormAsText);
    return applyXslt(xml, "forms/xsl/RNGtoHTMLform_standalone.xsl", true);
};

/*
 when displaying form, the <select> must display the content of their initially
 selected option 
 */
function initSelectElements(form) {
    var selectElements = form.getElementsByTagName("select");
    for (var i=0 ; i<selectElements.length ; i++) {
        //we must be sure that this selectElement has not been previously hidden
        if (isDisplayed(selectElements[i])) {
            showOptionContent(selectElements[i]);
        }
    }
};

/*
 dynamic controls in order to modify the form
 */

function addOne(addButton) {
    //The source is the last <div class="multiple"> brother element of the addButton
    //(there is the removeButton between)
    var source = getLastChildElementByTagAndAtt(addButton.parentNode, "div", "class", "multiple");
    var nbElementsAdded = parseInt(addButton.getAttribute("nbelmtsadded"));
    var newIndex = nbElementsAdded + 1;
    //if all the elements have been removed, we just display the hidden left
    // source
    if (nbElementsAdded == 0) {
        source.style.display = "";
    } else {
        var sourceCloned = source.cloneNode(true);
        insertAfter(sourceCloned, source);
        //all the index in the XPath of the last content (i.e. under the
        // source) must be incremented
        setNewIndexUnder(sourceCloned, addButton, newIndex);
        var selectCloneds = sourceCloned.getElementsByTagName("select");
        var selects = source.getElementsByTagName("select");
        //synchronize the <select> elements
        for (var i=0 ; i<selectCloneds.length ; i++) {
            setSelected(selectCloneds[i], selects[i].options[selects[i].selectedIndex].text);
        }
        /*
                 synchronize the radio <input> elements, solves a bug that appears in
                 cloneNode() function, radio button state is not well kept in the source
                 because they all have the same name during cloning, so only one stays
                 checked.
                 At the 2nd cloning it is in the cloned radio buttons that the checked
                 state is not kept but I don't care ? I do it as well
                 */
        var radioCloneds = getElementsByAttribute(sourceCloned, "input", "type", "radio");
        var radios = getElementsByAttribute(source, "input", "type", "radio");
        for (var i=0 ; i<radioCloneds.length ; i++) {
            if (radioCloneds[i].checked) {
                radios[i].checked = true;
                //second case, the checked radios have been well kept in the source,
                // but not in the cloned radios
            } else if (radios[i].checked) {
                radioCloneds[i].checked = true;
            }
        }
    }
    //store the last index in the nbelmtsadded attribute of the input Element (i.e. the "+" button)
    addButton.setAttribute("nbelmtsadded", newIndex);
};


function removeOne(removeButton) {
    //the addButton element is just before the removeButton
    var addButton = getPreviousSiblingElement(removeButton, "input");
    //the <div> element must not disappear completely, if there is just one left, we
    // hide it
    var nbElementsAdded = parseInt(addButton.getAttribute("nbelmtsadded"));
    var newIndex = nbElementsAdded - 1;
    if (nbElementsAdded == 0) {
        return;
    }
    //The element to remove is the last <div class="multiple"> brother element of the removeButton
    var parentNode = removeButton.parentNode;
    var divTag = getLastChildElementByTagAndAtt(parentNode, "div", "class", "multiple");
    if (nbElementsAdded == 1) {
        divTag.style.display = "none";
    } else {
        parentNode.removeChild(divTag);
    }
    //must remove 1 to the nbelmtsadded attribute of the addButton element
    addButton.setAttribute("nbelmtsadded", newIndex);
};

function addCyclic(addButton) {
    var cyclicRefs = addButton.getAttribute("cyclic");
    var cyclic_placeRefs = addButton.getAttribute("cyclic_place");
    var cyclic = getNextSiblingElementByTagAndAtt(addButton, "div", "refs", cyclicRefs);
    var newCyclic = cyclic.cloneNode(true);
    var cyclic_place = getElementByTagClassRefs(cyclic, "div", "cyclic_place", cyclic_placeRefs);
    cyclic.style.display = "";
    cyclic_place.style.display = "";
    initSelectElements(cyclic);
    setNewCyclicXpathUnder(newCyclic, addButton.getAttribute("name"));
    duplicateIndentUnder(newCyclic);
    cyclic_place.appendChild(addButton);
    cyclic_place.appendChild(newCyclic);
};

/*
 example of button of multiple elements :
 <input type="button" value="+" onclick="addOne(this)" name="/retina-description-file/retina" nbelmtsadded="1"/>
 example of input inside a multiple element :
 <input type="text" name="/retina-description-file/retina/parvocellular-ganglion-layer[1]/something[2]/@additional-tau-transient"/>
 returns /retina-description-file/retina/parvocellular-ganglion-layer,/something[2]/@additional-tau-transient
 */
function splitAroundFirstBrackets(inputTag, addButton) {
    //may be a 'name' or a 'for' attribute
    var inputTagName = inputTag.getAttribute("name");
    if (!inputTagName) {
        inputTagName = inputTag.getAttribute("for");
    }
    var addButtonName = addButton.getAttribute("name");
    //get the index of the first "[" after the string addButtonName
    var indexOfFirstBracket = inputTagName.indexOf("[", addButtonName.length);
    var returnArray = new Array(2);
    if (indexOfFirstBracket != -1) {
        var indexOfFirstClosedBracket = inputTagName.indexOf("]", addButtonName.length);
        returnArray[0] = inputTagName.substr(0, indexOfFirstBracket);
        returnArray[1] = inputTagName.substring(indexOfFirstClosedBracket + 1);
    } else {
        returnArray[0] = inputTagName;
        returnArray[1] = "";
    }
    return returnArray;
};


/*
 this function displays the option selected, i.e. it displays the next <div>
 element whose name is the option selected
 all the input elements below the hidden divs are put to style="display: none"
 in order not to send their values when the XML file is generated
 */
function showOptionContent(selectElement) {
    var optionSelectedName = selectElement.options[selectElement.selectedIndex].text;
    var divTag = getNextSiblingElement(selectElement, "div");
    //goes on all the option available (i.e. all the next DIV element)
    // tagName is in upper case chars
    // checks it is a div and its class is choice_content
    while (divTag && divTag.tagName.toLowerCase() == "div" && divTag.getAttribute("class") == "choice_content") {
        if (divTag.getAttribute("name") == optionSelectedName) {
            divTag.style.display = "";
            //for the newly displayed <select>, we initialize their visible option
            var selectElementUnders = divTag.getElementsByTagName("select");
            for (var i=0 ; i<selectElementUnders.length ; i++) {
                showOptionContent(selectElementUnders[i]);
            }
        } else {
            divTag.style.display = "none";
        }
        //problems with white space nodes, the xsl:strip-space instruction doesn't
        // seem to work, so I use manageWhiteSpace functions
        divTag = node_after(divTag);
    }
};

function setNewIndexUnder(parentNode, addButton, newIndex) {
    for (var childNode = getFirstChildElement(parentNode) ; childNode ; childNode = getNextSiblingElement(childNode)) {
        //checks that is a xpath pointer (choice_content names must not be modified)
        if (childNode.getAttribute("name") && childNode.getAttribute("name").charAt(0) == "/") {
            //the element to change is the first [XX] after this string which is addButton.name
            //add 1 to the index of the last created element in order to create the XPath of the
            //newly created element (see example in splitAroundFirstBrackets comments)
            var splitResults = splitAroundFirstBrackets(childNode, addButton);
            childNode.setAttribute("name", splitResults[0] + "[" + newIndex + "]" + splitResults[1]);
        //also for labels
        } else if (childNode.getAttribute("for") && childNode.getAttribute("for").charAt(0) == "/") {
            var splitResults = splitAroundFirstBrackets(childNode, addButton);
            childNode.setAttribute("for", splitResults[0] + "[" + newIndex + "]" + splitResults[1]);
        }
        setNewIndexUnder(childNode, addButton, newIndex);
    }
};

function setNewCyclicXpathUnder(parentNode, xpathPrefix) {
    for (var childNode = getFirstChildElement(parentNode) ; childNode ; childNode = getNextSiblingElement(childNode)) {
        //checks that is a xpath pointer (choice_content names must not be modified)
        if (childNode.getAttribute("name") && childNode.getAttribute("name").charAt(0) == "/") {
            childNode.setAttribute("name", xpathPrefix + childNode.getAttribute("name"));
        } else if (childNode.getAttribute("for") && childNode.getAttribute("for").charAt(0) == "/") {
            childNode.setAttribute("for", xpathPrefix + childNode.getAttribute("for"));
        }
        setNewCyclicXpathUnder(childNode, xpathPrefix);
    }
};

function duplicateIndentUnder(parentNode) {
    var indents = getElementsByAttribute(parentNode, "span", "class", "indent");
    for (var i in indents) {
        var indent = indents[i];
        indent.parentNode.insertBefore(indent.cloneNode(true), indent);
    }
};


/*
 I do it like that instead of doing getElementsByTagName several times
 in order to have my input fields in the exact order of the form
 */
function getInputs(form, nameRegExp) {
    //var xpath = ".//textarea|.//select[@sendselect='yes']|.//input";
    //return applyXpath(form,xpath);
    var returnedArray = new Array();
    getInputsUnder(form, nameRegExp, returnedArray);
    return returnedArray;
};

function getInputsUnder(parentNode, nameRegExp, returnedArray) {
    for (var childNode = getFirstChildElement(parentNode) ; childNode ; childNode = getNextSiblingElement(childNode)) {
        var tagName = childNode.tagName.toLowerCase();
        if (tagName == "textarea" || tagName == "input" || (tagName == "select" && childNode.getAttribute("sendselect") == "yes")) {
            if (!nameRegExp || nameRegExp.test(childNode.getAttribute("name"))) {
                returnedArray.push(childNode);
            }
        } else {
            getInputsUnder(childNode, nameRegExp, returnedArray);
        }
    }
};

