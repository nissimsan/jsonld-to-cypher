/* eslint-disable guard-for-in */
/* eslint-disable max-len */

const {
  getPrimitiveTypeFromObject,
  predicateToPropertyName,
  getNodeType,
} = require('./utils');

const graphToCypher = async (graph) => {
  const args = {};
  const keys = JSON.stringify(Object.keys(graph.dict));
  const values = JSON.stringify(Object.values(graph.dict));

  let query = `CREATE ( g:Graph { uri: "${graph.id}", keys: ${keys}, values: ${values} } )\n`;
  const nodesMerged = [];
  const nodeIdToNodeName = {};
  for (const nodeIndex in graph.nodes) {
    const node = graph.nodes[nodeIndex];
    const nodeName = `n${nodeIndex}`;
    nodeIdToNodeName[node.id] = nodeName;
    if (Object.keys(node).length > 2) {
      const {id, value, ...props} = node;
      const propKeys = Object.keys(props);
      const rps = [];
      for (const ki in propKeys) {
        const k = propKeys[ki];
        const v = props[k];
        const niceName = k.split('/').pop().split('#').pop().replace('>', '');
        rps.push(`${niceName}: ${getPrimitiveTypeFromObject(v)}`);
      }
      const typedProperties = rps.join(', ');
      query += `MERGE ( ${nodeName} :Resource { uri: "${node.id}", ${typedProperties} } )\n`;
    } else {
      let nodeType = 'Resource';
      const maybeNewName = predicateToPropertyName(node.id);
      if (maybeNewName[0] !== maybeNewName[0].toLowerCase()) {
        nodeType = maybeNewName;
      }
      query += `MERGE ( ${nodeName} :${nodeType} { uri: "${node.id}" } )\n`;
    }
    nodesMerged.push(nodeName);
  }
  for (const edgeIndex in graph.links) {
    const edge = graph.links[edgeIndex];
    const edgeName = `e${edgeIndex}`;
    const sourceName = nodeIdToNodeName[edge.source];
    const targetName = nodeIdToNodeName[edge.target];
    if (targetName) {
      query += `CREATE (${sourceName})-[${edgeName}: ${edge.label} ]->(${targetName})\n`;
    }
  }
  query += `CREATE (g)-[namedGraphEdge: CONTAINS ]->(${
    nodeIdToNodeName[graph.id]
  })\n`;
  query += `RETURN g,${nodesMerged}\n`;
  return {query, args};
};

module.exports = graphToCypher;
