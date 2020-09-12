#!/usr/bin/env node

const fs = require('fs');
const program = require('commander');
const { getGraph } = require('./src/graph-generator.js');

// Collect provided args
program
    .option('--schema [value]', 'path to graphql schema file')
    .parse(process.argv);

const { schema } = program;
const typeDef = fs.readFileSync(schema, 'utf-8');
const graphqlGraph = getGraph(typeDef);
console.log(graphqlGraph);


