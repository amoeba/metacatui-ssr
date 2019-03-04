/**
 * Generate Schema.org-compliant JSONLD for the model bound to the view into
 *  the head tag of the page by `insertJSONLD`.
 *
 * Note: `insertJSONLD` should be called to do the actual inserting into the
 * DOM.
 */
function generateJSONLD (doc, nodeList) {
  var jsonld = {
    "@context": {
      "@vocab": "http://schema.org",
    },
    "@type": "Dataset",
  };

  if (doc.id) {
    jsonld['@id'] = 'https://dataone.org/datasets/' + encodeURIComponent(doc.id)
    jsonld['identifier'] = doc.id;
    jsonld['url'] = 'https://dataone.org/datasets/' + encodeURIComponent(doc.id)
  }

  if (doc.formatId) {
    jsonld['formatId'] = doc.formatId
  }

  if (doc.pubDate || doc.dateUploaded) {
    jsonld['datePublished'] = getDatePublishedText(doc)
  }

  if (doc.datasource) {
    jsonld['publisher'] = getPublisherText(doc, nodeList);
  }

  // Name
  if (doc.title) {
    jsonld['name'] = doc.title
  }

  // Creator
  if (doc.origin) {
    jsonld['creator'] = doc.origin
  }

  // Dataset/spatialCoverage
  if (doc.northBoundCoord &&
      doc.eastBoundCoord &&
      doc.southBoundCoord &&
      doc.westBoundCoord) {

    var spatialCoverage = {
      "@type": "Place",
      "additionalProperty": [
      {
        "@type": "PropertyValue",
        "additionalType": "http://dbpedia.org/resource/Coordinate_reference_system",
        "name": "Coordinate Reference System",
        "value": "http://www.opengis.net/def/crs/OGC/1.3/CRS84"
      }
      ],
      "geo": generateSchemaOrgGeo(doc.northBoundCoord,
                                       doc.eastBoundCoord,
                                       doc.southBoundCoord,
                                       doc.westBoundCoord),
      "subjectOf": {
        "@type": "CreativeWork",
        "fileFormat": "application/vnd.geo+json",
        "text": generateGeoJSONString(doc.northBoundCoord,
                                           doc.eastBoundCoord,
                                           doc.southBoundCoord,
                                           doc.westBoundCoord)
      }


    };

    jsonld.spatialCoverage = spatialCoverage;
  }

  // Dataset/temporalCoverage
  if (doc.beginDate && !doc.endDate) {
    jsonld.temporalCoverage = doc.beginDate;
  } else if (doc.beginDate && doc.endDate) {
    jsonld.temporalCoverage = doc.beginDate + '/' + doc.endDate;
  }

  // Dataset/variableMeasured
  if (doc.attributeName) {
    jsonld.variableMeasured = doc.attributeName;
  }

  // Dataset/description
  if (doc.abstract) {
    jsonld.description = doc.abstract;
  }

  // Dataset/keywords
  if (doc.keywords) {
    jsonld.keywords = doc.keywords.join(", ");
  }

  return jsonld;
};

/**
 * Generate a Schema.org/Place/geo from bounding coordinates
 *
 * Either generates a GeoCoordinates (when the north and east coords are
 * the same) or a GeoShape otherwise.
 */
function generateSchemaOrgGeo (north, east, south, west) {
  if (north === south) {
    return {
      "@type": "GeoCoordinates",
      "latitude" : north,
      "longitude" : west
    }
  } else {
    return {
      "@type": "GeoShape",
      "box": west + ", " + south + " " + east + ", " + north
    }
  }
};

/**
 * Creates a valid geoJSON string from the a set of bounding
 * coordinates from the Solr index (north, east, south, west).
 *
 * This function produces either a GeoJSON Point or Polygon depending on
 * whether the north and south bounding coordinates are the same.
 *
 * Part of the reason for factoring this out, in addition to code
 * organization issues, is that the GeoJSON spec requires us to modify
 * the raw result from Solr when the coverage crosses -180W which is common
 * for datasets that cross the Pacific Ocean. In this case, We need to
 * convert the east bounding coordinate from degrees west to degrees east.
 *
 * e.g., if the east bounding coordinate is 120 W and west bounding
 * coordinate is 140 E, geoJSON requires we specify 140 E as 220
 *
 * @param {number} north - North bounding coordinate
 * @param {number} east - East bounding coordinate
 * @param {number} south - South bounding coordinate
 * @param {number} west - West bounding coordinate
 */
function generateGeoJSONString (north, east, south, west) {
  if (north === south) {
    return generateGeoJSONPoint(north, east);
  } else {
    return generateGeoJSONPolygon(north, east, south, west);
  }
};

/**
 * Generate a GeoJSON Point object
 *
 * @param {number} north - North bounding coordinate
 * @param {number} east - East bounding coordinate
 *
 * Example:
 * {
 *	"type": "Point",
  *	"coordinates": [
  *			-105.01621,
  *			39.57422
  * ]}

*/
function generateGeoJSONPoint (north, east) {
  var preamble = "{\"type\":\"Point\",\"coordinates\":",
      inner = "[" + east + "," + north + "]",
      postamble = "}";

  return preamble + inner + postamble;
};

/**
 * Generate a GeoJSON Polygon object from a bounding box
 *
 * @param {number} north - North bounding coordinate
 * @param {number} east - East bounding coordinate
 * @param {number} south - South bounding coordinate
 * @param {number} west - West bounding coordinate
 *
 *
 * Example:
 *
 * {
 *   "type": "Polygon",
 *   "coordinates": [[
 *     [ 100, 0 ],
 *     [ 101, 0 ],
 *     [ 101, 1 ],
 *     [ 100, 1 ],
 *     [ 100, 0 ]
 * ]}
 *
 */
function generateGeoJSONPolygon (north, east, south, west) {
  var preamble = "{\"type\":\"Feature\",\"properties\":{},\"geometry\":{\"type\"\:\"Polygon\",\"coordinates\":[[";

  // Handle the case when the polygon wraps across the 180W/180E boundary
  if (east  < west) {
    east = 360 - east
  }

  var inner = "[" + west + "," + south + "]," +
              "[" + east + "," + south + "]," +
              "[" + east + "," + north + "]," +
              "[" + west + "," + north + "]," +
              "[" + west + "," + south + "]";

  var postamble = "]]}}";

  return preamble + inner + postamble;
};

/** Construct the best possible nodename from a given datasource (node ID).
 *
 * If the node ID is present in the nodeList, uses the node name instead of the
 * node identifier. Falls back to node ID otherwise.
 * 
 * nodeList is constructed at app boot, asynchronously, see 
 * helpers.js#loadNodeList.
 * 
 * @param doc {object} A Solr document
 * @param nodeList {Array} A copy of the nodeList as an Array of Objects with
 *   keys 'id' and 'name'.
 */
function getPublisherText (doc, nodeList) {
  var datasource = doc.datasource;
  let nodeName = null;

  for (let i = 0; i < nodeList.length; i++) {
    if (nodeList[i].id === datasource) {
      nodeName = nodeList[i].name;
    }
  }

  if (nodeName) {
    return nodeName;
  } else {
    return datasource;
  }
};


/**
 * Generate a string appropriate to be used as the publication date in a
 * dataset citation.
 */
function getDatePublishedText (doc) {
  // Dataset/datePublished
  // Prefer pubDate, fall back to dateUploaded so we have something to show
  if (doc.pubDate !== "") {
    return doc.pubDate
  } else {
    return this.model.get("dateUploaded")
  }
};


module.exports = {
  generateJSONLD: generateJSONLD
}
    