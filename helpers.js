const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');
const assert = require('assert');

// Pre-calculate stuff that doesn't change from request to request
const datasetRegex = RegExp('.*\/view\/.+');
const template = fs.readFileSync(path.resolve(__dirname, "src", "index.html")).toString();
const parts = template.split("</head>");

// Pre-flight to make sure things are okay
assert(template.length > 0);
assert(parts.length == 2);

/**
 * Fetch the data from the Solr index needed to generate JSONLD for the given
 * Identifier
 * 
 * @param  {string} pid - Identifier of the dataset to query the Solr index for
 * @param  {function} callback - Callback function to convert the Solr response
 *  (JSON) to Schema.org JSONLD
 * 
 * @returns {string} TODO
 */
async function query (pid, callback) {
  // TODO: Handle error cases with proper callback
  let json;

  json = await fetch('https://cn.dataone.org/cn/v2/query/solr/?q=id:"' + pid + '"&fl=title&wt=json')
    .then(res => res.json())
    .then(json => callback(json));
  
  return json;
}
/**
 * Create a <script> element with Schema.org/Dataset JSON-LD in it
 * 
 * @param  {Object} json - TODO
 * 
 * @returns {string} TODO
 */
function buildDatasetScriptTag (json) {
  // TODO: Publish all properties
  // TODO: Make resilient to errors
  const jsonld = {
    "@context": {
      "@vocab": "http://schema.org"
    },
    "@type": "Dataset",
    "@id": "https://dataone.org/datasets/test",
    "name": json.response.docs[0].title
  }

  return '<script type="application/ld+json">' + 
    JSON.stringify(jsonld) + 
    '</script>';
}
/**
 * Dynamically generate the appropriate response to send back to the client
 * 
 * @param  {string} path - TODO
 * 
 * @returns TODO
 */
async function generateResponse (path) {
  if (!datasetRegex.test(path)) {
    return template;
  }

  const path_parts = path.split("/view/")

  // Fall back to returning the template if we don't parse a PID from the path
  if (path_parts.length != 2 || path_parts[1].length == 0) {
    return template;
  }

  const pid = path_parts[1];
  const query_result = await query(pid, buildDatasetScriptTag);

  return parts[0] + 
    query_result + 
    "</head>" + 
    parts[1];
}

module.exports = {
  generateResponse: generateResponse
}
