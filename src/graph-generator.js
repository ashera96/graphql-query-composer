const _ = require("lodash");
const { Source, introspectionFromSchema, buildSchema } = require("graphql");

exports.generateGraph = (schema) => {
  const source = new Source(schema);
  const graphqlSchema = buildSchema(source);
  const introspection = introspectionFromSchema(graphqlSchema);
  return buildGraph(introspection.__schema);
};

function getNodes(schema) {
  const nodes = [];
  for (var i = 0; i < schema.types.length; i++) {
    isNode(schema.types[i]) ? nodes.push(schema.types[i]) : null;
  }
  return nodes;
}

function isNode(type) {
  return !(
    type.kind === "SCALAR" ||
    type.kind === "ENUM" ||
    type.kind === "INPUT_OBJECT" ||
    _.startsWith(type.name, "__")
  );
}

class Node {
  constructor(data) {
    this.name = data.name;
    this.kind = data.kind;
    if (this.kind === "UNION") {
      this.possibleTypes = [];
      _.forEach(data.possibleTypes, (possibleType) => {
        this.possibleTypes.push({
          ref: { name: possibleType.name, reference: null },
        });
      });
    } else {
      this.fields = [];
      _.forEach(data.fields, (field) => {
        const type = extractType(field.type);
        const args = [];
        _.forEach(field.args, (arg) => {
          const argName = arg.name;
          const argType = stringifyArgumentType(arg.type);
          args.push({
            argName: argName,
            argType: argType.argumentType,
            isRequired: argType.isRequired,
          });
        });
        this.fields.push({
          name: field.name,
          kind: type.kind,
          args: args,
          ref: { name: isNode(type) ? type.name : null, reference: null },
        });
      });
      if (this.kind === "INTERFACE") {
        this.derivedTypes = [];
        _.forEach(data.possibleTypes, (possibleType) => {
          this.derivedTypes.push({
            ref: { name: possibleType.name, reference: null },
          });
        });
      }
    }
  }
}

function extractType(type) {
  while (type.kind === "NON_NULL" || type.kind === "LIST") {
    type = type.ofType;
  }
  return type;
}

function stringifyArgumentType(type) {
  var wrappers = [];
  let left = "";
  let right = "";
  let argumentType = "";
  while (type.kind === "NON_NULL" || type.kind === "LIST") {
    wrappers.push(type.kind);
    type = type.ofType;
  }
  _.forEach(wrappers, (wrapper) => {
    switch (wrapper) {
      case "NON_NULL":
        right = "!" + right;
        break;
      case "LIST":
        left = left + "[";
        right = "]" + right;
        break;
    }
  });
  argumentType = argumentType.concat(left, type.name, right);
  const isRequired = argumentType.charAt(argumentType.length - 1) === "!";
  return {
    argumentType: argumentType,
    isRequired: isRequired,
  };
}

function buildGraph(schema) {
  // Create nodes
  var root = null;
  const nodes = [];
  const rootName = schema.queryType.name;
  const tempNodes = getNodes(schema);
  _.forEach(tempNodes, (nodeEntry) => {
    // Extracting the relevant information
    const node = new Node(nodeEntry);
    nodes.push(node);
    // Determining the root node
    node.name === rootName ? (root = node) : null;
  });
  // Conneciting the nodes
  connectNodes(root, nodes);
  return root;
}

function connectNodes(node, nodes) {
  if (node.kind === "UNION") {
    _.forEach(node.possibleTypes, (possibleType) => {
      if (possibleType.ref.reference === null) {
        possibleType.ref.reference = _.find(nodes, function (o) {
          return o.name === possibleType.ref.name;
        });
        connectNodes(possibleType.ref.reference, nodes);
      }
    });
  } else {
    _.forEach(node.fields, (field) => {
      if (field.ref.name != null && field.ref.reference === null) {
        field.ref.reference = _.find(nodes, function (o) {
          return o.name === field.ref.name;
        });
        connectNodes(field.ref.reference, nodes);
      }
    });
    if (node.kind === "INTERFACE") {
      _.forEach(node.derivedTypes, (derivedType) => {
        if (derivedType.ref.reference === null) {
          derivedType.ref.reference = _.find(nodes, function (o) {
            return o.name === derivedType.ref.name;
          });
          connectNodes(derivedType.ref.reference, nodes);
        }
      });
    }
  }
}
