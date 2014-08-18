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
 when receiving the XML generated from the server, adds it to the <textarea>
 whose Id is "XMLFileContent" in the web page.
 */
function saveChanges(formId, xmlTextareaId) {
    var form = document.getElementById(formId);
    //form may be the div above the form if form was generated
    if (form.tagName.toLowerCase() != "form") {
        form = getFirstChildElement(form, "form");
    }
    var formArray = createFormDataArray(form);
    var xmlDoc = createXml(form, formArray);
    //if xmlTextareaId is defined, then it adds the xml inside it otherwise it returns it
    if (xmlTextareaId) {
        var xml = document.getElementById(xmlTextareaId);
        xml.value = innerXML(xmlDoc);
        //adds line breaks between two markups
        xml.value = xml.value.replace(/></g, ">\n<");
    } else {
        return xmlDoc;
    }
};

/*
 In order to construct or modify the XML file on the server
 create the array of the form entered values in the displayed input elements
 the array will be composed of pairs (XPath: value), which are the name and the
    value of each input field
 */
function createFormDataArray(form) {
    var inputElements = getInputs(form);
    var formArray = new Array();
    for (var i = 0 ; i < inputElements.length ; i++) {
        var inputElement = inputElements[i];
        
        //we don't send the non-displayed input elements
        if (isDisplayed(inputElement)) {
            //for the select we send the selected option value
            if ((inputElement.tagName.toLowerCase() == 'select')
                && (inputElement.options[inputElement.selectedIndex].value != '')) {
                addValueToFormArray(inputElement.name, inputElement.options[inputElement.selectedIndex].value, formArray);
            } else if ((inputElement.value) && (inputElement.value != '')) {
                //for the textarea we just send the value
                if (inputElement.tagName.toLowerCase() == 'textarea') {
                    addValueToFormArray(inputElement.name, inputElement.value, formArray);
                }
                //idem for input type=text
                else if (inputElement.getAttribute("type") == "text") {
                    addValueToFormArray(inputElement.name, inputElement.value, formArray);
                }
                //idem for input type=file
                else if (inputElement.getAttribute("type") == "file") {
                    addValueToFormArray(inputElement.name, inputElement.value, formArray);
                }
                //for the radio elements we only send the checked value
                else if (inputElement.getAttribute("type") == "radio"
                && inputElement.checked == true) {
                    addValueToFormArray(inputElement.name, inputElement.value, formArray);
                }
                //for the checkbox elements we only send the checked value and we concatenate 
                // the other checked values into a list of whitespace separated values
                else if (inputElement.getAttribute("type") == "checkbox"
                && inputElement.checked == true) {
                    addValueToFormArray(inputElement.name, inputElement.value, formArray);
                }
            }
        }
    }
    return formArray;
};

/*
 Must test if there is already a value associated to that name in the formArray.
 In that case, it is a <rng:list>, so the value must be concatenated to the actual one. 
 If the <rng:list> is inside an attribute, there may be xpaths finishing like @atts[2],
 in that case that [2] must be erased
 */
function addValueToFormArray(name, value, formArray) {
    name = name.replace(/@(.*)\[.*\]/, "@$1");
    if (!formArray[name]) {
        formArray[name] = value;
    } else {
        formArray[name] += " " + value;
    }
}

/*
 get the namespaces declared in the form
 */
function getNamespaces(form) {
    //the namespaces are declared in <namespace prefix="" uri=""/> markups
    var namespaceNodes = form.getElementsByTagName("namespace");
    var namespaces = new Array();
    for (var i = 0 ; i < namespaceNodes.length ; i++) {
        namespaces[namespaceNodes[i].getAttribute("prefix")] = namespaceNodes[i].getAttribute("uri");
    }
    return namespaces;
};

function createXml(form, formArray) {
    var xmlDoc = createDocument();
    var namespaces = getNamespaces(form);
    //fields in the form are in inverse order
    for (var xpath in formArray) {
        addFormElm(xpath, formArray[xpath], xmlDoc, namespaces);
    }
    // for the issue of <rng:oneOrMore> followed by <rng:choice>, erases empty markups, which is not supported
    eraseEmptyElements(xmlDoc.documentElement);
    return xmlDoc;
};

function addFormElm(xpath, value, xmlDoc, namespaces) {
    var currentElement = null;
    var addedValue = null;
    
    var xpathParts = xpath.split("/");
    for (var i = 1 ; i < xpathParts.length ; i++) {
        var nodeName = xpathParts[i];
        
        //case of a text node : this element name is text(), second ending
        // example in the request : /network/noise/neuron[2]/sample[1]/text()=1, 2, 3, 4, 5, 6, 7, 8, 9
        // the hexadecimal characters have already been decoded
        if (nodeName == "text()") {
            addedValue = replaceTextNodesDirectlyUnder(currentElement, value);
            
            //case of finding an attribute child (1st possible ending)
        } else if (nodeName.match("@")) {
            //remove the '@' at the beginning of the node name
            nodeName = nodeName.replace(/^@/, "");
            if (nodeName.match(/:/)) {
                var namespaceURI = getNamespaceURIFromNodeName(nodeName, namespaces);
                addedValue = xmlDoc.createAttributeNS(namespaceURI, nodeName);
                currentElement.setAttributeNodeNS(addedValue);
            } else {
                addedValue = xmlDoc.createAttribute(nodeName);
                currentElement.setAttributeNode(addedValue);
            }
            addedValue.value = value;
            
            //case of finding an element child, have to browse further the tree
        } else {
            //it may be possible to find /testSuite[]
            nodeName = nodeName.replace('[]', '');
            var namespaceURI = getNamespaceURIFromNodeName(nodeName, namespaces);
            //when using method getElementsByTagNameNS(), node name specified must be localName, i.e. without prefix
            var localName = removePrefix(nodeName);
            
            //start of the xpath browsing, init currentNode to the root
            if (!currentElement) {
                if(!xmlDoc.documentElement) {
                    //create the root node
                    var rootElement = xmlDoc.createElementNS(namespaceURI, nodeName);
                    xmlDoc.appendChild(rootElement);
                }
                currentElement = xmlDoc.documentElement;
                
                //case of several elements with the same name : element[2]
            } else if (nodeName.match(/\[/)) {
                var indexOfOpeningBracket = nodeName.indexOf("[");
                var indexOfClosingBracket = nodeName.indexOf("]");
                //WARNING : the index of the elements in XPath standardisation begins from 1 so this childNumber is index+1
                var childNumber =  parseInt(nodeName.substring(indexOfOpeningBracket + 1, indexOfClosingBracket));
                
                nodeName = nodeName.substring(0, indexOfOpeningBracket);
                localName = removePrefix(nodeName);
                //if this child doesn't exist, create it
                var alreadyCreatedChildNumber = currentElement.getElementsByTagNameNS(namespaceURI, localName).length;
                for (var j = alreadyCreatedChildNumber ; j < childNumber ; j++) {
                    var element = xmlDoc.createElementNS(namespaceURI, nodeName);
                    currentElement.appendChild(element);
                }
                currentElement = currentElement.getElementsByTagNameNS(namespaceURI, localName).item(childNumber-1);
                
                //usual case, finding a single element
            } else {
                // if this element doesn't exist, it has to be created
                if (currentElement.getElementsByTagNameNS(namespaceURI, localName).length == 0) {
                    var element = xmlDoc.createElementNS(namespaceURI, nodeName);
                    currentElement.appendChild(element);
                }
                // continues the xpath browsing
                currentElement = currentElement.getElementsByTagNameNS(namespaceURI, localName).item(0);
            }
        }
    }
    
    //if we finish that parsing without adding anything, that means we are in the third ending case, i.e. a string data node
    if (addedValue == null && currentElement != null) {
        addedValue = replaceTextNodesDirectlyUnder(currentElement, value);
    }
};

function replaceTextNodesDirectlyUnder(element, text) {
    var children = element.childNodes;
    for (var i = 0 ; i < children.length ; i++) {
        if (children.item(i).nodeType == 3) {
            element.removeChild(children.item(i));
        }
    }
    var textNode = element.ownerDocument.createTextNode(text);
    element.appendChild(textNode);
    return textNode;
};
/*
parentNode is an ELEMENT_NODE
*/
function eraseEmptyElements(parentNode) {
    var childNodes = parentNode.childNodes;
    for (var i = 0 ; i < childNodes.length ; i++) {
        var childNode = childNodes.item(i);
        if (childNode.nodeType == ELEMENT_NODE) {
            if (childNode.childNodes.length != 0) {
                eraseEmptyElements(childNode);
            //if childNode is empty
            } else if (childNode.attributes.length == 0) {
                parentNode.removeChild(childNode);
                i--;
            }
        }
    }
};
