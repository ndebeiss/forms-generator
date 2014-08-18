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
 intialization functions, those functions are called in order to take a xml file
 from the server and puts its values into the form
 */


/*
 Will initialize the <input> fieds, the <select> fields and the addButtons of the form.
 initialize rootNode to the firt child element of data, xpath to the name of the
 root node. 
 */
function initInputElements(xmlFileInit, form) {
    eraseFormValues(form);
    var data = loadXMLDoc(xmlFileInit);
    //have to normalize document in order not to have several text nodes for one big long text node
    //seems that the long text in markups are split by the Dom parser
	if (data.normalizeDocument) {
		data.normalizeDocument();
	} else if (data.documentElement.normalize) {
		data.documentElement.normalize();
	}
    var rootNode = getFirstChildElement(data);
    // if there has been a parsererror
    if (rootNode.tagName == "parsererror") {
        var errorMessageDiv = document.createElement("div");
        errorMessageDiv.innerHTML = textContent(rootNode);
        insertAfter(errorMessageDiv, form);
    } else {
        var xpath = "/" + rootNode.nodeName;
        addData(rootNode, xpath, form);
    }
};

/*
 reinitializes the form 
 */
function eraseFormValues(form) {
    //for all the <input>, <textarea>, <select> to send, found, reinitializes their value
    var inputs = getInputs(form);
    for (var i = 0 ; i < inputs.length ; i++) {
        var input = inputs[i];
        if (input.tagName.toLowerCase() == "input") {            
            if (input.getAttribute("type") == "button") {
                //reinitializes the adding buttons in order to have only one element under
                if (input.getAttribute("value") == "+") {
                    addMultipleElements(input, 1);
                }
                //must not treat file, checkbox, or radio
            } else if (input.getAttribute("type") == "text" || input.getAttribute("type") == "textarea") {
                input.value = "";
            }            
        } else if (input.tagName.toLowerCase() == "select") {
            setSelected(input, "");
        }
    }
};

/*
 main function of the form initialization
 If domNode has attributes,  set the value of the corresponding input fields
 Then it spends through the child nodes of domNode
    If it is a multiple element in the xml file, gets the number of nodes to add
 and call addMultipleElements on the corresponding addButton
 
    If it is an element, recursively call addData on it
    If it is a text node, set the value of the corresponding input field
 
 */
function addData(domNode, xpath, form) {
    //IE doesn't support DOM function hasAttributes()
    if (domNode.attributes && domNode.attributes.length > 0) {
        for (var i = 0 ; i < domNode.attributes.length ; i++) {
            var attributeName = domNode.attributes[i].name;
            var attributeValue = domNode.attributes[i].value;
            setData(xpath + "/@" + attributeName, attributeValue, form);
        }
    }
    for (var i = 0 ; i < domNode.childNodes.length ; i++) {
        if (domNode.childNodes[i].nodeType == ELEMENT_NODE) {
            var childNode = domNode.childNodes[i];
            //must test if it is a multiple
            var nodeName = childNode.nodeName;
            var nodeIndex = getIndexAmongMultiple(childNode, xpath, form);
            if (nodeIndex != 0) {
                //calculate the total number of multiple in order to add from the beginning all the needed ones
                //that way, values are not duplicated as it is empty for now.
                var nbNodes = nodeIndex;
                var currentNode = getNextSiblingElement(childNode);
                while (currentNode) {
                    //if nodes are concurrent, i.e. under the same multiple choice, they could be erased,
                    //so a new node has to be created for each one and their index is incremented
                    if (currentNode.tagName.toLowerCase() != childNode.tagName.toLowerCase()) {
                        var areConcurrent = areConcurrentMarkups(childNode, currentNode, xpath, form);
                        if (!areConcurrent) {
                            break;
                        }
                    }
                    nbNodes++;
                    currentNode = getNextSiblingElement(currentNode);
                }
                var addButton = getCorrespondingAddButton(xpath, nodeName, form);
                addMultipleElements(addButton, nbNodes);
                nodeName += "[" + nodeIndex + "]";
            }
            addData(domNode.childNodes[i], xpath + "/" + nodeName, form);
        } else if (domNode.childNodes[i].nodeType == TEXT_NODE) {
            if (!is_all_ws(domNode.childNodes[i])) {
                /*
			                 if it is a text node in the XML file, it can be defined in the
			                   schema as <rng:text/>, meaning the xpath will be ../sample/text()
			                 or it can be a <rng:data type="text"/> inside an element node.
			                   in that case, the xpath will be just ../sample
			                 I cover both cases with that.
			            */
                var value = textContent(domNode.childNodes[i]);
                setData(xpath, value, form);
                setData(xpath + "/text()", value, form);
            }
        }
    }
};

/*
 sets the data of that (xpath,value) pair, which means finding the corresponding
 input fields and call setAttribute() on it
 */
function setData(xpath, value, form) {
    var inputs = getInputFields(xpath, form);
    //manage the case of a list (whitespace-separated values)
    if (value.match(" ") && inputs.length > 1) {
        var values = value.split(" ");
        var j = 0;
        for (var i = 0 ; i < inputs.length && j < values.length ; i++) {
            //if the input is a checkbox, then the order of the values is not important, we pass the whole value 
            if (inputs[i].getAttribute("type") == "checkbox") {
                setAttribute(inputs[i], value);
            //if it succeeded to assign the value to the input, goes to the next value
            } else if (setAttribute(inputs[i], values[j])) {
                j++;
            }
        }
    } else {
        //there may be several input with this xpath as name in the case of radio buttons or list
        for (var i = 0 ; i < inputs.length ; i++) {
            setAttribute(inputs[i], value);
        }
    }
};

/*
xpath must be escaped and must add a possible [1] to all the elements (regular expression '(\[1\])?')
because if the node is single in the xml file, they could be other nodes of the same name,
then the xpath input field to look for is xpath[1]
*/
function getNameRegExp(xpath) {
    var regExp = escapeRegExp(xpath);
    regExp = regExp.replace(/(\w)\//g, "$1(\\[1\\])?/");
    return regExp;
};

/*
 finds the input fields whose "name" attribute corresponds to that xpath.
 When parsing the XML initialization file, there may be multiple elements which
 are single, meaning that their xpath expression has an additional [1] in the form.
 It can not be known parsing the XML.
 */
function getInputFields(xpath, form) {
    var regExp = getNameRegExp(xpath);
    //adds the final (\[1\])? if needed (no 'text()' or '@' of attributes))
    if (!xpath.match("text\(\)") && !xpath.match("@")) {
        regExp = regExp + "(\\[1\\])?";
    }
    regExp = new RegExp("^" + regExp + "$");
    var inputs = getInputs(form, regExp);
    return inputs;
};

/*
 sets the value of that inputElement to the data
 the input field can be :
    <input type="text"/> <input type="file"/> <input type="radio"/> <input type="checkbox"/>
    <textarea />
    <select />
  returns true if the value has been set
 */
function setAttribute(inputElement, data) {
    //allows the initialization of SELECT elements
    if (!isDisplayed(inputElement)) {
        setOptionDisplayed(inputElement);
    }
    if (inputElement.tagName.toLowerCase() == "select") {
        return setSelected(inputElement, data);
    } else if (inputElement.tagName.toLowerCase() == "textarea") {
        inputElement.value = data;
        return true;
    } else if (inputElement.getAttribute("type") == "text") {
        inputElement.value = data;
        return true;
        //security issue, can not set programmatically the value of an input type="file" so I put a message
    } else if (inputElement.getAttribute("type") == "file") {
        var text = "<i>!it is not allowed to programmatically set the value of that input type=file to : <br />" + data + "</i>";
        if (inputElement.nextSibling && inputElement.nextSibling.getAttribute("id") == "warningtext") {
            inputElement.nextSibling.innerHTML = text;
        } else {
            var warningText = document.createElement("div");
            warningText.setAttribute("id", "warningtext");
            warningText.innerHTML = text;
            insertAfter(warningText, inputElement);
        }
        return true;
        //if it is a radio button, it must be checked only if it is the current which is the good one
    } else if (inputElement.getAttribute("type") == "radio" && inputElement.getAttribute("value") == data) {
        inputElement.checked = true;
        return true;
        //for the checkbox buttons, the data must be a list of white-space separated values
        // like : X-ON X-OFF
        // so I check if data contains the value
    } else if (inputElement.getAttribute("type") == "checkbox" && data.match(inputElement.getAttribute("value"))) {
        inputElement.checked = true;
        return true;
    }
    return false;
};



/*
 if an inputElement is not displayed because the option selected is wrong,
 the corresponding SELECT element is changed.
 */
function setOptionDisplayed(inputElement) {
    //goes up until finding the <div> element of the selection
    var divTag = getFirstAncestorByTagAndClass(inputElement, "div", "choice_content");
    // the name of this div element is the option which must be selected
    var divTagName = divTag.getAttribute("name");
    //the corresponding SELECT element is the previous brother
    var selectElement = getPreviousSiblingElement(divTag, "select");
    setSelected(selectElement, divTagName);
    //not sure it works if there is no explicit display style attribute (if it
    //is only the div element above which is not displayed)
    if(!isDisplayed(selectElement)) {
        //must be recursive if this select is not displayed itself
        setOptionDisplayed(inputElement);
    }
    showOptionContent(selectElement);
};

/*
 if this domNode is single, return 0, otherwise return its index
 tricky bug : in the case of <rng:oneOrMore> followed by <rng:choice>, must also count the other choices
 */
function getIndexAmongMultiple(domNode, xpath, form) {
    var nbNodesBefore = 0;
    var tagName = domNode.tagName;
    var currentNode = getPreviousSiblingElement(domNode);
    while (currentNode) {
        if (currentNode.tagName.toLowerCase() != domNode.tagName.toLowerCase()) {
            var areConcurrent = areConcurrentMarkups(domNode, currentNode, xpath, form);
            if (!areConcurrent) {
                break;
            }
        }
        nbNodesBefore++;
        currentNode = getPreviousSiblingElement(currentNode);
    }
    //if the node is not single, adds 1 to the index as xpath indexes begins with 1
    if (nbNodesBefore != 0) {
        nbNodesBefore++;
        //in case the node is the first of a multiple
    } else if (getNextSiblingElement(domNode, tagName)) {
        nbNodesBefore++;
    }
    return nbNodesBefore;
};

/*
finds if markups are concurrent. They are concurrent if they belong to two different <option>
 of the same <select> and that <select> is under an add button (so it has an index 1)
*/
function areConcurrentMarkups(domNode1, domNode2, xpath, form) {
    var xpath1 = getNameRegExp(xpath + "/" + domNode1.nodeName + "[1]");
    var xpath2 = getNameRegExp(xpath + "/" + domNode2.nodeName + "[1]");
    var divs1 = getElementsByAttribute(form, "div", "name", xpath1);
    var divs2 = getElementsByAttribute(form, "div", "name", xpath2);
    if (divs1.length > 0 && divs2.length > 0) {
        var div1 = divs1[0];
        var div2 = divs2[0];
        if (div1 && div2) {
            var choiceContent1 = getFirstAncestorByTagAndClass(div1, "div", "choice_content");
            var choiceContent2 = getFirstAncestorByTagAndClass(div2, "div", "choice_content");
            if (choiceContent1 && choiceContent2) {
                var parent1 = choiceContent1.parentNode;
                var parent2 = choiceContent2.parentNode;
                //if both nodes are concurrent in a choice
                if (parent1.isSameNode(parent2)) {
                    var select = getPreviousSiblingElement(choiceContent1, "select");
                    //if select is directly under a multiple (what we are looking for), then xpath of that select finishes by []
                    var name = select.getAttribute("name");
                    return /\[\]$/.test(name);
                }
            }
        }
    }
    return false;
};

/*
 find the corresponding addButton to that xpath and that nodeName.
 There may be several addButton with the same xpath, the good one has a div
 node with attribute name = xpath/nodeName[.*]
 */
function getCorrespondingAddButton(xpath, nodeName, form) {
    var addButtons = getInputFields(xpath, form);
    //if there is no confusion possible, there will still be the "+" and the "-" buttons
    if (addButtons.length == 2) {
        return addButtons[0];
    } else {
        for (var i = 0 ; i < addButtons.length ; i += 2) {
            var nextDiv = getNextSiblingElement(addButtons[i], "div");
            if (getElementsByAttribute(nextDiv, "div", "name", xpath + "/" + nodeName + "\\[.*\\]").length > 0) {
                return addButtons[i];
            }
        }
    }
};

/*
 programmatically pushes the addButton numberOfElements times
*/
function addMultipleElements(addButton, numberOfElements) {
    var multipleElementsAlreadyAdded = parseInt(addButton.getAttribute("nbelmtsadded"));
    for (var i = multipleElementsAlreadyAdded ; i < numberOfElements ; i++) {
        addOne(addButton);
    }
    //there may also be too many elements
    multipleElementsAlreadyAdded = parseInt(addButton.getAttribute("nbelmtsadded"));
    for (var i = multipleElementsAlreadyAdded ; i > numberOfElements && i > 1 ; i--) {
        //the removeButton is the button just after the addButton
        removeButton = getNextSiblingElement(addButton, "input");
        removeOne(removeButton);
    }
};
