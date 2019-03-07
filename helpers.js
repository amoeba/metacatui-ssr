const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');
const assert = require('assert');
const { DOMParser } = require('xmldom');
const urlencode = require('urlencode');

const { generateJSONLD } = require("./schemaorg.js");

// Pre-calculate stuff that doesn't change from request to request
const QUERY_TIMEOUT = 3000; // In ms, timeout for Solr queries
const datasetRegex = RegExp('.*\/view\/.+');
const template = fs.readFileSync(path.resolve(__dirname, "src", "index.html")).toString();
const parts = template.split("</head>");

let nodeList = []; // Fulfilled by loadNodeList, kinda hacky but it works
loadNodeList(); // Async btw

// Pre-flight to make sure things are okay
assert(template.length > 0);
assert(parts.length == 2);

async function loadNodeList () {
  let response = await fetch('https://search.dataone.org/cn/v2/node');
  let text = await response.text();
  var parser = new DOMParser();
  var doc = parser.parseFromString(text, "application/xml");
  var nodeEls = doc.getElementsByTagName('node');

  let nodes = [];

  for (let i = 0; i < nodeEls.length; i++) {
    nodes.push({
      id: nodeEls.item(i).getElementsByTagName('identifier')[0].textContent,
      name: nodeEls.item(i).getElementsByTagName('name')[0].textContent
    })
  }
  
  nodeList = nodes;
}

/**
 * Fetch the data from the Solr index needed to generate JSONLD for the given
 * Identifier
 * 
 * Note that this function enforces a timeout equal to QUERY_TIMEOUT and, if
 * the timeout is hit returns null which causes the server to respond with 
 * the template HTML with no script tag.
 * 
 * @param  {string} identifier - Identifier of the dataset to query the Solr
 *   about
 * 
 * @returns {Object} Solr response
 */
async function query (identifier) {
  return await fetch(
    'https://search.dataone.org/cn/v2/query/solr/?q=id:"' + identifier + '"&fl=*&wt=json',
    { "timeout" : QUERY_TIMEOUT })
    .then(res => {
      if (res.ok) {
        return res.json();
      } else {
        return null;
      }
    })
    .catch(err => {
      console.log('error in query()', err);

      return null;
    });
}

/**
 * Create a <script> element with Schema.org/Dataset JSON-LD in it
 * 
 * @param  {Object} json - TODO
 * 
 * @returns {string} TODO
 */
function buildDatasetScriptTag (json) {
  var metaTagString = "";

  // Fail out fast, but gracefully!, if the JSON we're passed isn't right
  if (
    !json || !json.response || !json.response.docs
  ) {
    console.log(
      'Unexpected response format, probably indicating a ' +
      'malformed query. Response is ' + 
      JSON.stringify(json)
    );

    return '';
  }

  if (json.response.docs.length !== 1) {
    console.log(
      'Expected a single Solr document as a result but got ' + 
      json.response.docs.length + 
      ' instead. Response is: ' + 
      JSON.stringify(json)
    );
    
    return '';
  }

  const doc = json.response.docs[0];

  // TODO: Publish all properties
  // TODO: Make resilient to errors
  const jsonld = generateJSONLD(doc, nodeList);

  return metaTagString + 
    '<script type="application/ld+json">' + 
    JSON.stringify(jsonld) + 
    '</script>';
}


/**
 * Dynamically generate the appropriate response to send back to the client
 * 
 * @param  {Express.req} req - The raw Express.js request object
 * 
 * @returns {string} Optionally modified template HTML as a string
 */
async function generateResponse (req) {
  const path = req.path;

  if (!datasetRegex.test(path)) {
    return template;
  }

  // Parse the URL path in a way that's safe even if the path parts aren't
  // properly URL-encoded
  const path_parts = path.split("/view/")

  // Fall back to returning the template if we don't parse a PID from the path
  if (path_parts.length != 2 || path_parts[1].length == 0) {
    return template;
  }

  const pid = urlencode.decode(path_parts[1]); // Decoded just in case
  const solrResult = await query(pid);

  if (!solrResult) {
    return template;
  }

  const tagText = await buildDatasetScriptTag(solrResult);

  return parts[0] + 
    tagText + 
    "</head>" + 
    parts[1];
}

module.exports = {
  generateResponse: generateResponse
}
