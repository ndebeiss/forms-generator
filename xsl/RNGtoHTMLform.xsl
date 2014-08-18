<?xml version="1.0" encoding="UTF-8"?>
<!--
Copyright or  or Copr. INRIA contributor(s) : Nicolas Debeissat

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

-->
<xsl:stylesheet	xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
    xmlns:rng="http://relaxng.org/ns/structure/1.0"
    xmlns:a="http://relaxng.org/ns/compatibility/annotations/1.0"
    version="2.0">
    
    <xsl:output method = "html" />
    <xsl:strip-space elements="*" />
    
    <xsl:variable name="namespaces" select="/rng:grammar/namespace::*"/>
    
    <xsl:template match="/">
        <form>
            <xsl:apply-templates select="rng:grammar"/>
        </form>
    </xsl:template>
    
    <xsl:template match="rng:grammar">
        <xsl:for-each select="namespace::*">
            <xsl:call-template name="namespaceDeclaration">
                <xsl:with-param name="prefix" select="local-name()"/>
                <xsl:with-param name="uri" select="current()"/>
            </xsl:call-template>
        </xsl:for-each>
        <xsl:apply-templates select="rng:start"/>
    </xsl:template>
    
    <!-- in order to send the namespaces and their prefix used in that form, I add markups :
        <namespace prefix="fml" namespace="http://facetsml"/> at the beginning of the form -->
    
    <xsl:template name="namespaceDeclaration">
        <xsl:param name="prefix"/>
        <xsl:param name="uri"/>
        <namespace prefix="{$prefix}" uri="{$uri}"/>
    </xsl:template>
    
    <xsl:template match="rng:start">
        <xsl:apply-templates>
            <!-- initializes the pathInXml variable containing the xpath of each input -->
            <xsl:with-param name="pathInXml" select="''" />
        </xsl:apply-templates>
    </xsl:template>
    
    <!-- with a <rng:ref> we need to look for its define -->
    
    <xsl:template match="rng:ref[@name]">
        <xsl:param name="pathInXml" />
        <xsl:param name="nodeName" select="@name" />
        <xsl:choose>
            <xsl:when test="/rng:grammar/rng:define[@name=$nodeName]">
                <xsl:apply-templates select="/rng:grammar/rng:define[@name=$nodeName]">
                    <xsl:with-param name="pathInXml" select="$pathInXml" />
                </xsl:apply-templates>                
            </xsl:when>
            <!-- if not found, we also look for its define in the schema included -->
            <xsl:otherwise>
                <xsl:apply-templates select="/rng:grammar/rng:include[@href]">
                    <xsl:with-param name="pathInXml" select="$pathInXml" />
                    <xsl:with-param name="nodeName" select="$nodeName" />
                </xsl:apply-templates>
            </xsl:otherwise>
        </xsl:choose>
    </xsl:template>
    
    <!-- look for the nodeName definition in the schema included -->
    
    <xsl:template match="rng:include[@href]">
        <xsl:param name="pathInXml" />
        <xsl:param name="nodeName" />
        <!-- need to add a history variable in order to avoid infinite loop if schemas include themselves and nodeName is not defined -->
        <xsl:param name="alreadyCheckedSchemas" />
        <xsl:param name="href" select="@href" />
        <xsl:choose>
            <!-- check if that schema has not already been browsed, if yes, stop the browsing, maybe another branch was successful -->
            <xsl:when test="contains($alreadyCheckedSchemas,$href)">
            </xsl:when>
            <xsl:when test="document($href)/rng:grammar/rng:define[@name=$nodeName]">
                <xsl:apply-templates select="document($href)/rng:grammar/rng:define[@name=$nodeName]">
                    <xsl:with-param name="pathInXml" select="$pathInXml" />
                </xsl:apply-templates>
            </xsl:when>
            <xsl:otherwise>
                <!-- if not found, we also look for its define in the schema included in the included schema-->
                <xsl:apply-templates select="document($href)/rng:grammar/rng:include[@href]">
                    <xsl:with-param name="pathInXml" select="$pathInXml" />
                    <xsl:with-param name="nodeName" select="$nodeName" />
                    <xsl:with-param name="alreadyCheckedSchemas" select="concat($alreadyCheckedSchemas,',',$href)" />
                </xsl:apply-templates>
            </xsl:otherwise>
        </xsl:choose>
    </xsl:template>
    
    
    <!-- with <rng:define> and <rng:interleave>, we just continue on
        the children, passing the parameter pathInXml -->
    
    <xsl:template match="rng:define[@name]|rng:interleave|rng:div|rng:group">
        <xsl:param name="pathInXml" />
        <xsl:apply-templates>
            <xsl:with-param name="pathInXml" select="$pathInXml" />
        </xsl:apply-templates>
    </xsl:template>
    
    <!-- with a <rng:optional> we add a <i> around its children and change color to blue -->
    
    <xsl:template match="rng:optional">
        <xsl:param name="pathInXml" />
        <div class="optional">
            <xsl:apply-templates>
                <xsl:with-param name="pathInXml" select="$pathInXml" />
            </xsl:apply-templates>
        </div>
    </xsl:template>
    
    <!-- don't know what to do with <rng:anyName> -->
    
    <xsl:template name="rng:anyName">
        <xsl:param name="pathInXml" />
        <xsl:call-template name="indent">
            <xsl:with-param name="pathInXml" select="$pathInXml" />
        </xsl:call-template>
        Any Name :
        <xsl:apply-templates>
            <xsl:with-param name="pathInXml" select="$pathInXml" />
        </xsl:apply-templates>
    </xsl:template>
    
    <!-- <rng:zeroOrMore> and <rng:oneOrMore> are treated the same, adding a [] to the pathInXml
        the children will manage with it (adding a [0] to their name in pathInXml) -->
    
    <xsl:template match="rng:zeroOrMore|rng:oneOrMore">
        <xsl:param name="pathInXml" />
        <xsl:call-template name="indent">
            <xsl:with-param name="pathInXml" select="$pathInXml" />
        </xsl:call-template>
        <input type="button" value="+" onclick="addOne(this)" name="{$pathInXml}" nbelmtsadded="1" class="addButton" />
        <input type="button" value="-" onclick="removeOne(this)" name="{$pathInXml}" class="rmvButton" />
        <div class="multiple" style="border: dashed; border-width: 1px">
            <!-- the easyest way to add a [0] on the children element in pathInXml is to put []
                on it now -->
            <xsl:apply-templates>
                <xsl:with-param name="pathInXml" select="concat($pathInXml,'[]')" />
            </xsl:apply-templates>
        </div>
        
    </xsl:template>
    
    <!-- with an <rng:element>, I continue on the children, adding the current element to
        the parameter pathInXml. The element name may have to be prefixed, depending
        on its namespace  -->
    
    <xsl:template match="rng:element">
        <xsl:param name="pathInXml" />
		<!-- support of rng:name markups -->
		<xsl:variable name="elementName">
			<xsl:choose>
				<xsl:when test="rng:name">
					<xsl:call-template name="addPrefix">
						<xsl:with-param name="namespace" select="rng:name/@ns"/>
						<xsl:with-param name="nodeName" select="rng:name/text()"/>
					</xsl:call-template>
				</xsl:when>
				<xsl:otherwise>
					<xsl:call-template name="addPrefix">
						<xsl:with-param name="namespace" select="/rng:grammar/@ns"/>
						<xsl:with-param name="nodeName" select="@name"/>
					</xsl:call-template>
				</xsl:otherwise>
			</xsl:choose>
		</xsl:variable>
        <xsl:variable name="newPathInXml">
            <xsl:choose>
                <xsl:when test="contains($pathInXml,'[]')">
                    <!-- if pathInXml contains [], that means the following element (the current one) can be repeated
                        so the pathInXml with is now : /neuroML/cells[] must become /neuroML/cells/cell[0] -->
                    <xsl:value-of select="concat(substring-before($pathInXml,'[]'),'/',$elementName,'[1]')" />
                </xsl:when>
                <xsl:otherwise>
                    <xsl:value-of select="concat($pathInXml,'/',$elementName)" />
                </xsl:otherwise>
            </xsl:choose>
        </xsl:variable>
        
        <div name="{$newPathInXml}" class="element">
            <xsl:choose>
                <!-- if the next markup is rng:text or rng:data, then the element name must be on the same line than its textarea,
                    otherwise make a <p> markup and continue.
                    I test the next markup and I also test if it is a rng:ref wich points on a rng:text or rng:data -->
                <xsl:when test="rng:text|rng:data|rng:ref[/rng:grammar/rng:define/rng:text[../@name = current()/rng:ref/@name]]|rng:ref[/rng:grammar/rng:define/rng:data[../@name = current()/rng:ref/@name]]">
                    <xsl:call-template name="indent">
                        <xsl:with-param name="pathInXml" select="$pathInXml" />
                    </xsl:call-template>
                    <label for="{$newPathInXml}" class="element">
                        <xsl:value-of select="$elementName" /> :
                    </label>
                    <xsl:apply-templates>
                        <xsl:with-param name="pathInXml" select="$newPathInXml" />
                    </xsl:apply-templates>
                </xsl:when>
                <xsl:otherwise>
                    <p name="{$newPathInXml}" class="element">
                        <xsl:call-template name="indent">
                            <xsl:with-param name="pathInXml" select="$pathInXml" />
                        </xsl:call-template>
                        <xsl:value-of select="$elementName" />
                    </p>
                    <xsl:apply-templates>
                        <xsl:with-param name="pathInXml" select="$newPathInXml" />
                    </xsl:apply-templates>
                </xsl:otherwise>
            </xsl:choose>
        </div>
    </xsl:template>
    
    <!-- with a markup rng:list, only supports that inside :
           <rng:zeroOrMore> or <rng:oneOrMore>
                <rng:choice>
                     <rng:value>...</rng:value>
                     <rng:value>...</rng:value>
                </rng:choice>
           create a list of checkboxes for each value -->
     
    <xsl:template match="rng:list">
        <xsl:param name="pathInXml"/>
        <xsl:choose>
            <xsl:when test="rng:zeroOrMore|rng:oneOrMore">
                <xsl:apply-templates mode="list">
                    <xsl:with-param name="pathInXml" select="$pathInXml"/>
                </xsl:apply-templates>                
            </xsl:when>
            <xsl:otherwise>
                <xsl:apply-templates>
                    <xsl:with-param name="pathInXml" select="$pathInXml"/>
                </xsl:apply-templates>
            </xsl:otherwise>
        </xsl:choose>
    </xsl:template>
    
    <xsl:template match="rng:zeroOrMore|rng:oneOrMore" mode="list">
        <xsl:param name="pathInXml"/>
        <xsl:apply-templates select="rng:choice" mode="list">
            <xsl:with-param name="pathInXml" select="$pathInXml"/>
        </xsl:apply-templates>
    </xsl:template>
    
    <xsl:template match="rng:choice" mode="list">
        <xsl:param name="pathInXml"/>
        <xsl:apply-templates select="rng:value" mode="list">
            <xsl:with-param name="pathInXml" select="$pathInXml"/>
        </xsl:apply-templates>
    </xsl:template>
    
    
    <!-- create the checkbox for that value.
    I must call that template with the whole xpath in match attribute because otherwise the
    pathInXml variable is not transmitted with firefox XSLT processor (?!?) -->
    
    <xsl:template match="rng:value" mode="list">
        <xsl:param name="pathInXml"/>
        <xsl:variable name="value" select="text()"/>
        <input type="checkbox" name="{$pathInXml}" value="{$value}" class="list" />
        <label for="{$pathInXml}" class="list_label"><xsl:value-of select="$value"/></label>
    </xsl:template>
    
    <!-- a choice element will create a dropdown list of choices (i.e. a <select> markup) :  -->
    
    <xsl:template match="rng:choice">
        <xsl:param name="pathInXml" />
        <xsl:choose>
            <!-- if choices are a list of value, then that <select> value will be a value in the XML, then I add a 
                flag sendselect="yes", it must be taken in account when building the XML -->
            <xsl:when test="rng:value">
                <select  style="height: 20px" name="{$pathInXml}" sendselect="yes" class="choice">
                    <!-- In order not to send values if nothing has been entered, the <select> has a blank value. 
                    When the form appears, that is that blank value which is selected -->
                    <option value="" name="{$pathInXml}" class="choice_option"></option>
                    <xsl:apply-templates select="rng:value" mode="choice">
                        <xsl:with-param name="pathInXml" select="$pathInXml" />
                    </xsl:apply-templates>
                </select>
            </xsl:when>
            <!-- if it is not <rng:value>, it should be <rng:ref> of <rng:element> -->
            <xsl:otherwise>
                <xsl:call-template name="indent">
                    <xsl:with-param name="pathInXml" select="$pathInXml" />
                </xsl:call-template>
                <select  style="height: 20px" onchange="showOptionContent(this)" name="{$pathInXml}" class="choice">
                    <xsl:apply-templates mode="choice">
                        <xsl:with-param name="pathInXml" select="$pathInXml" />
                    </xsl:apply-templates>
                </select>
                <!-- the content of the <rng:ref> (i.e. the corresponding define) or <rng:element> choices 
                    are added as hidden <div> after the <select> -->
                <xsl:apply-templates mode="addHidden">
                    <xsl:with-param name="pathInXml" select="$pathInXml" />            
                </xsl:apply-templates>
            </xsl:otherwise>
        </xsl:choose>
        
    </xsl:template>
    
    <!-- here we add the differents options to the <select> created above. Each <rng:ref> or <rng:element> name
        becomes an <option> -->
    
    <xsl:template match="rng:ref[@name]|rng:element[@name]" mode="choice">
        <xsl:param name="pathInXml" />
        <xsl:param name="nodeName" select="@name" />
        <option value="{$nodeName}" name="{$pathInXml}/{$nodeName}" class="choice_option">
            <xsl:value-of select="$nodeName" />
        </option>
    </xsl:template>
    
    <!-- then we add the content of the different <rng:ref> or <rng:element> as hidden <div> with a name attribute which
        is the name of the corresponding <rng:ref> or <rng:element> in order to link them -->
    
    <xsl:template match="rng:ref[@name]|rng:element[@name]" mode="addHidden">
        <xsl:param name="pathInXml" />
        <xsl:param name="nodeName" select="@name" />
        <div name="{$nodeName}" style="display: none" class="choice_content">
            <xsl:apply-templates select="current()">
                <xsl:with-param name="pathInXml" select="$pathInXml" />
            </xsl:apply-templates>
        </div>
    </xsl:template>
    
    <!-- if the choices were <rng:value> that becomes options of the <select> created above -->
    
    <xsl:template match="rng:value" mode="choice">
        <xsl:param name="pathInXml" />
        <xsl:param name="nodeName" select="text()" />
        <option value="{$nodeName}" name="{$pathInXml}/{$nodeName}" class="choice_option">
            <xsl:value-of select="$nodeName" />
        </option>
    </xsl:template>
    
    <!-- with a <rng:attribute>, we wait for a <rng:data> which will become an input field -->
    
    <xsl:template match="rng:attribute">
        <xsl:param name="pathInXml" />
		<!-- support of rng:name markups -->
		<xsl:variable name="attributeName">
			<xsl:choose>
				<xsl:when test="rng:name">
					<xsl:call-template name="addPrefix">
						<xsl:with-param name="namespace" select="rng:name/@ns"/>
						<xsl:with-param name="nodeName" select="rng:name/text()"/>
					</xsl:call-template>
				</xsl:when>
				<xsl:otherwise>
					<xsl:call-template name="addPrefix">
						<xsl:with-param name="namespace" select="/rng:grammar/@ns"/>
						<xsl:with-param name="nodeName" select="@name"/>
					</xsl:call-template>
				</xsl:otherwise>
			</xsl:choose>
		</xsl:variable>
		<xsl:variable name="newPathInXml" select="concat($pathInXml,'/@',$attributeName)" />
        <p style="margin: 1px">
            <xsl:call-template name="indent">
                <xsl:with-param name="pathInXml" select="$pathInXml" />
            </xsl:call-template>
            <label for="{$newPathInXml}" class="attribute">
                <xsl:value-of select="$attributeName" /> :
            </label>
            <!-- try to apply on every markups, may work. The input field must not be indented -->
            <xsl:apply-templates>
                <xsl:with-param name="pathInXml" select="$newPathInXml" />
            </xsl:apply-templates>
        </p>
    </xsl:template>
    
    <!-- a <rng:text> gives a big text input field with /text(), added to its xpath
        (which becomes the name of the input field) -->
    
    <xsl:template match="rng:text">
        <xsl:param name="pathInXml" />
        <xsl:call-template name="inputField">
            <xsl:with-param name="pathInXml" select="$pathInXml" />
            <xsl:with-param name="type" select="'textarea'"/>
        </xsl:call-template>
    </xsl:template>
    
    <!-- a <rng:data> finally calls for an input field, indented or no -->
    
    <xsl:template match="rng:data">
        <xsl:param name="pathInXml" />
        <xsl:call-template name="inputField">
            <xsl:with-param name="pathInXml" select="$pathInXml" />
            <xsl:with-param name="type" select="@type" />
        </xsl:call-template>
    </xsl:template>
    
    <!-- the <a:documentation> are just copied with all their content -->
    
    <xsl:template match="a:documentation">
        <div class="documentation">
            <xsl:copy-of select="current()" />
        </div>
    </xsl:template>
    
    <!-- When an input field is created, it will be two radio buttons (true/false) if data is boolean, a <textarea> if
        it was a <rng:text>, an <input type="file"> if it was a <rng:data type="anyURI"/>, 
        otherwise it will be an <input type="text"> 
        That inputField will be indented or no -->
    
    <xsl:template name="inputField">
        <xsl:param name="pathInXml" />
        <xsl:param name="type" />
        <xsl:choose>
            <xsl:when test="$type='boolean'">
                <input type="radio" value="true" name="{$pathInXml}" class="boolean" />
                true<xsl:text disable-output-escaping="yes">&amp;nbsp;&amp;nbsp;&amp;nbsp;&amp;nbsp;&amp;nbsp;&amp;nbsp;</xsl:text>
                <input type="radio" value="false" name="{$pathInXml}" class="boolean" />
                false
            </xsl:when>
            <xsl:when test="$type='textarea'">
                <textarea name="{$pathInXml}/text()" class="text" cols="90" rows="6" />
            </xsl:when>
            <xsl:when test="$type='anyURI'">
                <input type="file" name="{$pathInXml}" class="file" />
            </xsl:when>
            <xsl:otherwise>
                <input type="text" name="{$pathInXml}" class="data" />
            </xsl:otherwise>
        </xsl:choose>        
    </xsl:template>
    
    <!-- In order to indent, we split the pathInXml with the / separator and we call
        the function recursively until there is no separator left, the tab is composed of
        6 spaces (this space code is said to be the most cross-browser compatible) -->
    
    <xsl:template name="indent">
        <xsl:param name="pathInXml" />
        <xsl:if test="contains($pathInXml, '/')">
            <span class="indent"><xsl:text disable-output-escaping="yes">&amp;nbsp;&amp;nbsp;&amp;nbsp;&amp;nbsp;</xsl:text></span>
            <xsl:call-template name="indent">
                <xsl:with-param name="pathInXml" select="substring-after($pathInXml,'/')" />
            </xsl:call-template>
        </xsl:if>
    </xsl:template>
    
    <!-- If it doesn't already have a prefix, add the corresponding prefix to the element name.
        The passed parameter $namespace is the target namespace of the current schema (in case there are
        included schemas), so that is the namespace of the unprefixed elements.
        Then I get the corresponding prefix, browsing the global variable "namespaces", which is composed
        of the namespaces declared in the MAIN schema -->
    
    <xsl:template name="addPrefix">
        <xsl:param name="namespace"/>
        <xsl:param name="nodeName"/>
        <xsl:choose>
            <xsl:when test="contains($nodeName,':')">
                <xsl:value-of select="$nodeName"/>
            </xsl:when>
            <xsl:otherwise>
                <xsl:variable name="prefix">
                    <xsl:call-template name="getPrefix">
                        <xsl:with-param name="namespace" select="$namespace"/>
                    </xsl:call-template>
                </xsl:variable>
                <xsl:choose>
                    <xsl:when test="$prefix != ''">
                        <xsl:value-of select="concat($prefix,':',$nodeName)"/>
                    </xsl:when>
                    <xsl:otherwise>
                        <xsl:value-of select="$nodeName"/>
                    </xsl:otherwise>
                </xsl:choose>
            </xsl:otherwise>
        </xsl:choose>
    </xsl:template>
    
    <!-- I need this step to be able to check that the prefix returned is not empty
        especially when the namespace is the target namespace and it has not been specified
        as xmlns="someNamespace" -->
    
    <xsl:template name="getPrefix">
        <xsl:param name="namespace"/>
        <xsl:for-each select="$namespaces">
            <xsl:if test="current() = $namespace">
                <xsl:value-of select="local-name()"/>
            </xsl:if>
        </xsl:for-each>
    </xsl:template>
    
    
</xsl:stylesheet>