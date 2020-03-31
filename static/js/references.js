const Cite = require('citation-js')

/**
 * Extract author information from a citation and convert to a single string.
 * The first letter of the given name is extracted and the people are separated by commas
 * @param {*} author - the author information given by citation-js
 */
function authorString(author) {
    var author_string = "";
    for (var i = 0; i < author.length; i++) {
        author_string += author[i].given[0] + ". "
        author_string += author[i].family
        if (i < author.length - 1) {
            author_string += ", "
        }
    }
    return author_string
}

/**
 * Extract venue information from the citation and return a string
 * @param {*} citation - The citation object from citation-js
 */
function venueString(citation) {
    var venue_string = '';
    venue_string += citation['container-title'];
    var date_parts = citation.issued["date-parts"][0];
    var year = extract_year(citation)
    if (year != 0) {
        venue_string += ", " + date_parts[0];
    }
    if (citation["publisher-place"]) {
        venue_string += ", " + citation["publisher-place"];
    }
    return venue_string
}

/**
 * Extract the citation information from the citation and return as a string
 * @param {*} citation - The citation object from citation-js
 */
function extract_year(citation) {
    date_parts = citation.issued["date-parts"][0];
    if (date_parts.length >= 1) {
        return date_parts[0]
    }
    return 0;
}

/**
 * Get the family name of the first author, return a string
 * @param {*} citation - The citation object from citation-js
 */
function extract_first_author_family(citation) {
    return citation.author[0].family
}

/**
 * Compare citations, return based on the publication year and break ties with the first authors family name
 * @param {*} a - The citation object from citation-js
 * @param {*} b - The citation object from citation-js
 */
function compare_citations(a, b) {
    var a_year = extract_year(a);
    var b_year = extract_year(b);
    if (a_year == b_year) {
        return extract_first_author_family(a) > extract_first_author_family(b) ? 1 : -1;
    }
    return a_year < b_year ? 1 : -1;
}

/**
 * Sort citations and permute the raw bibtext to match.
 * @param {*} citations - A list of citation objects
 * @param {List[str]} content - A list of bibtext strings
 */
function sort_citations(citations, content) {
    for (var i = 0; i < citations.length; i++) {
        citations[i] = [citations[i], i]
    }
    citations.sort((a, b) => compare_citations(a[0], b[0]));
    var indices = [];
    for (var i = 0; i < citations.length; i++) {
        indices.push(citations[i][1]);
        citations[i] = citations[i][0];
    }
    sorted_content = new Array(indices.length);
    for (var i = 0; i < indices.length; i++) {
        sorted_content[i] = content[indices[i]];
    }
    return [citations, sorted_content]
}

/**
 * Render out the references into the HTML
 * Note:
 *   This also adds a global onclick to the whole window so if you ever
 *   click on a modal object it will disappear. I couldn't put this on
 *   modal itself because it would make the modal content part unclickable?
 * @param {str} target - The id of the element we are going to be populating
 * @param {List[str]} content - The list of raw bibtext entries
 */
function create_references(target, content) {
    // Use citation-js to parse bibtext
    var bibs = [];
    for (var i = 0; i < content.length; i++) {
        var bib = new Cite(content[i])
        bibs.push(bib.data[0])
    }
    // sort the citations
    sorted = sort_citations(bibs, content);
    bibs = sorted[0];
    content = sorted[1];
    // extract the relevant information from the citations
    var publications = []
    for (var i = 0; i < bibs.length; i++) {
        publications.push({
            id: bibs[i]["citation-label"],
            modal_id: "modal-" + i,
            link: bibs[i].URL,
            title: bibs[i].title,
            authors: authorString(bibs[i].author),
            venue: venueString(bibs[i]),
            bibtext: content[i],
        });
    }
    // Render the publications into the HTML
    var app = new Vue({
        el: target,
        data: {
            publications: publications
        },
        methods: {
            showModal: function(id) {
                var modal = document.getElementById(id);
                modal.style.display = "block";
            },
            hideModal: function(id) {
                var modal = document.getElementById(id);
                modal.style.display = "none";
            }
        }
    })
    // Activate clipboard js for all the copy bibtext buttons
    clipboard = new ClipboardJS('.paper-button');
}

/**
 * Given a list of file names and a path prefix, read all files and render into html
 * @param {str} target - The string name of the element you are going to populate
 * @param {str} prefix - The string prefix to add to all file names
 * @param {str} citations - The index of citation files, each line represents a file to read
 */
function generate_references(target, prefix, citations) {
    var files = citations.split(/\r?\n/);
    files = files.filter(file => file != '');
    for (var i = 0; i < files.length; i++) {
        files[i] = prefix + files[i];
    }
    var target = document.getElementById(target)
    readFiles(files, create_references.bind(null, target))
}
