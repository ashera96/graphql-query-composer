#!/usr/bin/env node

const fs = require("fs");
const program = require("commander");
const _ = require("lodash");
const { generateGraph } = require("./src/graph-generator");
const { composeQueries } = require("./src/query-composer");

// Collect provided args
program
  .option("--schema [value]", "path to graphql schema file")
  .option("--maxDepth [value]", "maximum query depth (default is 10)")
  .option(
    "--optionalArgumentsToInclude [items]",
    "comma seperated list of optional arguments to include (default is [])",
    getList
  )
  .option(
    "--aliasCount [value]",
    "number of times to include the generated base query (default is 1)"
  )
  .parse(process.argv);

function getList(value) {
  return value.split(" ");
}

const {
  schema,
  maxDepth = 10,
  optionalArgumentsToInclude = [],
  aliasCount = 1,
} = program;
const typeDef = fs.readFileSync(schema, "utf-8");

// Schema to graph conversion
const graphqlGraph = generateGraph(typeDef);
console.log(graphqlGraph);

// Composing queries by traversing the generated graph
const queries = composeQueries(
  graphqlGraph,
  maxDepth,
  optionalArgumentsToInclude,
  aliasCount
);

console.log(queries);
fs.writeFile('queries.graphql', queries.join('\n\n'), function(err){
  if(err) {
    console.log(err);
  } else {
    console.log('Composed queries added to queries.graphql');
  }
});