const { max } = require("lodash");
const _ = require("lodash");

exports.composeQueries = (graphqlGraph, maxDepth) => {
    const root = graphqlGraph;
    const queryList = [];
    const curDepth = 1;
    _.forEach(root.fields, (field) => {
        const queryBody = generateQuery(field, "", curDepth, maxDepth)
        if (queryBody!="") {
            const query = "query { " + queryBody + " }";
            queryList.push(query);
        } 
    });
    // const generatedQueries = getCombinations(queryList);
    return queryList;
}

function generateQuery(field, queryBody, curDepth, maxDepth) {
    if (field.kind == "SCALAR" || field.kind == "ENUM") {
        queryBody += " "+field.name;
    } else if (field.kind == "OBJECT" && curDepth !=maxDepth) {
        var subQuery = "";
        const node = field.ref.reference;
        _.forEach(node.fields, (field) => {
            subQuery += generateQuery(field, queryBody, curDepth+1, maxDepth);
        });
        if (subQuery!="") {
            queryBody += " " + field.name + " { " + subQuery + " } ";
        }
    }
    return queryBody;
}

function getCombinations(queryList) {
    const generatedQueries = [];
    var f = function(prefix, list) {
        for (var i=0; i<list.length; i++) {
            generatedQueries.push(prefix + list[i]);
            f(prefix+list[i], list.slice(i+1));
        }
    }
    f('', queryList);
    return generatedQueries;
}
