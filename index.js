#!/usr/bin/env node

const fs = require("fs");
const program = require("commander");
const { generateGraph } = require("./src/graph-generator");
const { composeQueries } = require("./src/query-composer");

// Collect provided args
program
  .option("--schema [value]", "path to graphql schema file")
  .option("--maxDepth [value]", "maximum query depth (default is 10)")
  .parse(process.argv);

const { schema, maxDepth = 10 } = program;
const typeDef = fs.readFileSync(schema, "utf-8");
const graphqlGraph = generateGraph(typeDef);
console.log(graphqlGraph);
const queries = composeQueries(graphqlGraph, maxDepth);
console.log(queries);
