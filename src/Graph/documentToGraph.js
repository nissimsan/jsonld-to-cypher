/* eslint-disable guard-for-in */
/* eslint-disable max-len */
const jsonld = require('jsonld');
const uuid = require('uuid');

const {
  isRdfNode,
  removeAngleBrackets,
  removeEscapedQuotes,
  isBlankNode,
  predicateToPropertyName,
  getPrimitiveTypeFromObject,
  isDid,
} = require('./utils');

const patchGraph = ({subject, predicate, object, graph}) => {
  subject = removeAngleBrackets(subject);
  predicate = removeAngleBrackets(predicate);

  graph.nodes[subject] = {
    ...(graph.nodes[subject] || {id: subject}),
  };

  if (isBlankNode(subject) && isBlankNode(object)) {
    graph.links.push({
      source: removeAngleBrackets(subject),
      label: predicateToPropertyName(predicate),
      target: removeAngleBrackets(object),
    });
  }
  if (predicate === 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type') {
    object = removeAngleBrackets(object);
    graph.links.push({
      source: subject,
      label: 'type',
      target: object,
    });
    graph.nodes[object] = {
      ...(graph.nodes[object] || {id: object}),
    };
  } else if (predicate === 'https://www.w3.org/2018/credentials#issuer') {
    object = removeAngleBrackets(object);
    graph.links.push({
      source: subject,
      label: 'issuer',
      target: object,
    });
    graph.nodes[object] = {
      ...(graph.nodes[object] || {id: object}),
    };
  } else if (
    predicate === 'https://www.w3.org/2018/credentials#credentialSubject'
  ) {
    object = removeAngleBrackets(object);
    graph.links.push({
      source: subject,
      label: 'subject',
      target: object,
    });
    graph.nodes[object] = {
      ...(graph.nodes[object] || {id: object}),
    };
  } else if (
    predicate ===
    'https://w3id.org/vc-revocation-list-2020#revocationListCredential'
  ) {
    object = removeAngleBrackets(object);
    graph.links.push({
      source: subject,
      label: 'revocationListCredential',
      target: object,
    });
    graph.nodes[object] = {
      ...(graph.nodes[object] || {id: object}),
    };
  } else if (
    predicate === 'https://www.w3.org/2018/credentials#credentialStatus'
  ) {
    object = removeAngleBrackets(object);
    graph.links.push({
      source: subject,
      label: 'credentialStatus',
      target: object,
    });
    graph.nodes[object] = {
      ...(graph.nodes[object] || {id: object}),
    };
  } else if (predicate === 'https://w3id.org/security#proof') {
    object = removeAngleBrackets(object);
    // console.log({subject, predicate, object});
    graph.links.push({
      source: subject,
      label: 'proof',
      target: object,
    });
    graph.nodes[object] = {
      ...(graph.nodes[object] || {id: object}),
    };
  } else if (predicate === 'https://w3id.org/security#verificationMethod') {
    object = removeAngleBrackets(object);
    // console.log({subject, predicate, object});
    graph.links.push({
      source: subject,
      label: 'verificationMethod',
      target: object,
    });
    graph.nodes[object] = {
      ...(graph.nodes[object] || {id: object}),
    };
  } else {
    graph.nodes[predicate] = {
      ...(graph.nodes[predicate] || {id: predicate}),
    };
    if (isRdfNode(object)) {
      object = removeAngleBrackets(object);
      // add node
      graph.nodes[object] = {
        ...(graph.nodes[object] || {id: object}),
      };

      let label = predicateToPropertyName(object);

      if (isDid(label)) {
        label = 'controller';
      }
      // add edge
      graph.links.push({
        source: removeAngleBrackets(predicate),
        label,
        target: removeAngleBrackets(object),
      });
    } else {
      let label = predicateToPropertyName(predicate);
      if (isBlankNode(subject)) {
        label = 'has';
      }
      graph.links.push({
        source: removeAngleBrackets(subject),
        label,
        target: removeAngleBrackets(predicate),
      });
      // add predicate as subject property
      if (!graph.nodes[object]) {
        graph.nodes[subject] = {
          ...graph.nodes[subject],
          [predicateToPropertyName(removeAngleBrackets(predicate))]:
            getPrimitiveTypeFromObject(removeEscapedQuotes(object)),
        };
      }
    }
  }
};

const documentToGraph = async (doc, {documentLoader}) => {
  const canonized = await jsonld.canonize(doc, {
    algorithm: 'URDNA2015',
    format: 'application/n-quads',
    documentLoader,
  });
  // console.log(canonized);
  const id = doc.id || `urn:uuid:${uuid.v4()}`;
  const nodes = {[id]: {id}};
  const links = [];
  const graph = {id, nodes, links};
  const rows = canonized
      .split('\n')
      .filter((r) => r !== '')
      .map((r) => {
        return r.substring(0, r.length - 2);
      });

  for (const row of rows) {
    const match = row.match(
        /^(?<subject>(<([^<>]+)>|^_:c14n\d+)) (?<predicate>(<([^<>]+)>)) (?<object>(.+))/,
    );

    let {subject, predicate, object} = match.groups;

    if (object.includes('_:c14n')) {
      const objectParts = object.split('_:c14n');
      const objectValue = objectParts[0].trim();
      // TODO: handle proof sets / proof chains...
      // const objectGraph = object.replace(objectValue + ' ', '');
      // console.log({objectValue, objectGraph});
      object = objectValue;
      if (object === '') {
        object = '_:c14n' + objectParts[1];
      }
    }
    if (subject.startsWith('_:c14n')) {
      subject = `${id}:${subject}`;
    }
    if (object.startsWith('_:c14n')) {
      object = `${id}:${object}`;
    }

    patchGraph({subject, predicate, object, graph});
  }

  let lastRoot = id;
  graph.links.forEach((link) => {
    if (link.source.includes(id)) {
      lastRoot = link.source;
    }
  });

  const finalNodes = Object.values(graph.nodes);

  if (!doc.id) {
    finalNodes.splice(0, 1);
  }

  return {
    id: lastRoot,
    doc,
    nodes: finalNodes,
    links: graph.links,
  };
};

module.exports = documentToGraph;
