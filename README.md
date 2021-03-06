# GraphQL Query Composer
GraphQL Query Composer is a command-line tool that generates a set of resource-intensive queries for a given schema. Thus generated queries can thereby be used to stress test GraphQL APIs.

High-level architecture of the command-line tool usage:

![Tool Usage](./images/README_image.png?raw=true)

### Component 1:
Conversion of GraphQL Schema to a Graph: *src/graph-generator*

### Component 2:
Composing resource-intensive queries by traversing the GraphQL Graph: *src/query-composer*

## Usage
Installation
```
npm i graphql-query-composer -g
```
Refer to usage
```
graphql-query-composer --help
```

Usage of command-line tool
```
graphql-query-composer --schema ./sample-schemas/countries.graphql --maxDepth 6 --aliasCount 2
```

The generated set of queries can now be found in _./queries.graphql_ file (note that this file would appear under the directory where the above command was executed from).

Consider using various configurations to increase the test coverage. Maybe the API already blocks deeply nested queries, but this alone does not guarentee the API security. While setting the depth limit to the highest value possible, by incrementing the _aliasCount_, malicious clients can request the same result set over and over again as intended.

If any optional arguments need to be specified, the tool usage is as follows
```
graphql-query-composer --schema ./sample-schemas/countries.graphql --maxDepth 6 --aliasCount 2 --optionalArgumentsToInclude limit,offset
```

## Configurations
* `maxDepth` - Maximum query depth allowed (if not specifed, defaults to 10)
* `aliasCount` - Number of repetitions per base query (if not specified, defaults to 1). This configuration allows you to request the same result set over and over again.
* `optionalArgumentsToInclude` - Comma seperated list of optional arguments to include in the query (if not specified, all optional arguments are ignored) 

## Example

Consider the below schema
```gql
type Query {
    allPerson(first: Int): [Person!]!
    allPosts(first: Int): [Post!]!
}

type Person {
    name: String!
    age: Int
    posts: [Post]
}

type Post {
    title: String!
    author: Person!
}
```
Usage of the tool
```
graphql-query-composer --schema ./schema.graphql --maxDepth 4 --aliasCount 2
```

Output would look like so:
```gql
query query1 {a11: allPerson { name age posts { title author { name age } } } a12: allPerson { name age posts { title author { name age } } } }

query query2 {a21: allPosts { title author { name age posts { title } } } a22: allPosts { title author { name age posts { title } } } }

query query3 {a11: allPerson { name age posts { title author { name age } } } a12: allPerson { name age posts { title author { name age } } }  a21: allPosts { title author { name age posts { title } } } a22: allPosts { title author { name age posts { title } } } }
```




## Explanation
* Generates queries per entry point in schema (i.e. fields under Query operation type)
* Generates a combined query by concatenating all base queries
* Queries are bounded by a depth, while targetting the worst-case up until the depth limit
* Requesting duplicate results for base queries using aliases
* Optional arguments that can ensure a worst-case scenario can be included (eg: limit argument which default to 20, if specified to include in the query, when invoking the API can request 100 entries)

## Notes
Query depth used in this tool refers to the definition provided by <https://www.howtographql.com/advanced/4-security/> (not the query depth implied by <https://github.com/stems/graphql-depth-limit>).