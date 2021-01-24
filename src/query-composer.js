const _ = require("lodash");

var depthLimit = null;
var optionalArgs = [];
var queryCounter = 0;

exports.composeQueries = (graphqlGraph, maxDepth, optionalArgumentsToInclude, aliasCount) => {
    const root = graphqlGraph;
    const queryList = [];
    const curDepth = 1;
    let entryPointCounter = 0;
    depthLimit = maxDepth;
    optionalArgs = optionalArgumentsToInclude;
    _.forEach(root.fields, (field) => {
        let { queryBody, variableDefinitions } = generateQuery(root, field, "", [], curDepth)
        // to remove replicated variable definitions
        variableDefinitions = _.uniq(variableDefinitions.reverse());
        // repeating the generated query using aliasing
        let aliasedQuery = '';
        entryPointCounter++;
        _.times(aliasCount, (i) => {
            aliasedQuery += `a${entryPointCounter}${i + 1}: ${queryBody} `;
        });
        queryBody = aliasedQuery;
        if (queryBody != "") {
            queryList.push({ queryBody: queryBody, varDefinition: variableDefinitions });
        }
    });
    const generatedQueries = getCombinations(queryList);
    return generatedQueries;
}

function generateQuery(curNode, field, queryBody, variableDefinitions, curDepth) {
    const argsToInclude = [];
    _.forEach(field.args, (argument) => {
        if (argument.isRequired || _.includes(optionalArgs, argument.argName)) {
            const variable = `$${curNode.name}__${field.name}__${argument.argName}`;
            const variableDefinition = variable + ": " + argument.argType;
            argsToInclude.push({ variableDefinition: variableDefinition, argument: `${argument.argName}: ${variable}` });
        }
    });
    if (field.kind == "SCALAR" || field.kind == "ENUM") {
        queryBody += ` ${field.name}${argsToInclude.length ? `(${_.map(argsToInclude, 'argument').join(', ')})` : ``}`;
        variableDefinitions.push(...(_.map(argsToInclude, 'variableDefinition')));
    } else if (field.kind == "OBJECT" && curDepth != depthLimit) {
        var subQuery = "";
        const node = field.ref.reference;
        _.forEach(node.fields, (f) => {
            subQuery += generateQuery(field, f, queryBody, variableDefinitions, curDepth + 1).queryBody;
        });
        if (subQuery != "") {
            queryBody += ` ${field.name}${argsToInclude.length ? `(${_.map(argsToInclude, 'argument').join(', ')})` : ``} { ${subQuery} }`;
            variableDefinitions.push(...(_.map(argsToInclude, 'variableDefinition')));
        }
    } else if (field.kind == "INTERFACE" && curDepth != depthLimit) {
        var subQuery = "";
        const commonFields = [];
        const node = field.ref.reference;
        _.forEach(node.fields, (f) => {
            commonFields.push(f.name);
            subQuery += generateQuery(field, f, queryBody, variableDefinitions, curDepth + 1).queryBody;
        });
        _.forEach(node.derivedTypes, (derivedType) => {
            var subSelection = "";
            const baseNode = derivedType.ref.reference;
            _.forEach(baseNode.fields, (f) => {
                if (!_.includes(commonFields, f.name)) {
                    subSelection += generateQuery(field, f, queryBody, variableDefinitions, curDepth + 1).queryBody;
                }
            });
            if (subSelection != "") {
                subQuery += " ... on " + derivedType.ref.name + " {" + subSelection + " }";
            }
        });
        if (subQuery != "") {
            queryBody += ` ${field.name}${argsToInclude.length ? `(${_.map(argsToInclude, 'argument').join(', ')})` : ``} {${subQuery} }`;
            variableDefinitions.push(...(_.map(argsToInclude, 'variableDefinition')));
        }
    } else if (field.kind == "UNION" && curDepth != depthLimit) {
        var subQuery = "";
        const node = field.ref.reference;
        _.forEach(node.possibleTypes, (possibleType) => {
            var subSelection = "";
            const typeNode = possibleType.ref.reference;
            _.forEach(typeNode.fields, (f) => {
                subSelection += generateQuery(field, f, queryBody, variableDefinitions, curDepth + 1).queryBody;
            });
            if (subSelection != "") {
                subQuery += " ... on " + possibleType.ref.name + " {" + subSelection + " }";
            }
        })
        if (subQuery != "") {
            queryBody += ` ${field.name}${argsToInclude.length ? `(${_.map(argsToInclude, 'argument').join(', ')})` : ``} {${subQuery} }`;
            variableDefinitions.push(...(_.map(argsToInclude, 'variableDefinition')));
        }
    }
    return { queryBody: queryBody, variableDefinitions: variableDefinitions };
}

function getCombinations(queryList) {
    const queryCombinations = [];
    const generatedQueries = [];
    var f = function (prefix, list) {
        for (var i = 0; i < list.length; i++) {
            const combinedQueryBody = prefix.queryBody + list[i].queryBody;
            const combinedVarDefinitions = _.concat(prefix.varDefinition, list[i].varDefinition);
            queryCombinations.push([combinedQueryBody, combinedVarDefinitions]);
            f({ queryBody: combinedQueryBody, varDefinition: combinedVarDefinitions }, list.slice(i + 1));
        }
    }
    f({ queryBody: '', varDefinition: [] }, queryList);
    _.forEach(queryCombinations, (combination) => {
        const queryBody = combination[0];
        const variableDefinitions = _.uniq(combination[1]);
        queryCounter++;
        const query = `query query${queryCounter}${variableDefinitions.length ? `(${variableDefinitions.join(', ')})` : ``} {${queryBody} }`;
        generatedQueries.push(query);
    })
    return generatedQueries;
}
