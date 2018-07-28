const request = require('request');
const cheerio = require('cheerio');
const URL = require('url-parse');
const fs = require('fs');
const axios = require('axios');
const PouchDB = require('pouchdb');

let db = new PouchDB('crawler');
let pagesVisited = [];
let numPagesVisited = 0;
let maxPageToVisite = 2;
let pagesToVisit = [];
let result = [];

let START_URL = "https://www.miproteina.com.co";

let url = new URL(START_URL);
let baseUrl = url.protocol + "//" + url.hostname;
let HOSTNAME = url.hostname;


db.get('initial').then(function (doc) {
    //obtener todos los id
    //hacer la consulta uno a uno para saber cuales se han visitado y cuales no
    db.allDocs({
        include_docs: true,
    }).then(function (result) {
        result.rows.map(function(item){

        })
    }).catch(function (err) {
        console.log(err);
    });

}).catch(function (err) {
    db.put({
        url: START_URL,
        _id: 'initial'
    }).then(function (response) {
        // handle response
    }).catch(function (err) {

    });
});


pagesToVisit.push(START_URL);


crawl();


function crawl() {

    if (pagesToVisit.length == 0 || numPagesVisited == maxPageToVisite) {

        fs.writeFile('output.json', JSON.stringify(pagesVisited, null, 4), function (err) {
            console.log('URL successfully written! - Check your project directory for the output.json file');
        })

        fs.writeFile('result.json', JSON.stringify(result, null, 4), function (err) {
            console.log('Result successfully written! - Check your project directory for the result.json file');
        });

        return
    }

    let nextPage = pagesToVisit.pop();

    let visited = pagesVisited.filter(function (item) {
        return item == nextPage
    })

    if (visited.length > 0) {
        // We've already visited this page, so repeat the crawl
        crawl();
    } else {
        // New page we haven't visited
        visitPage(nextPage, crawl);
    }
}

function visitPage(url, callback) {
    // Add page to our set
    pagesVisited.push(url);
    numPagesVisited++

    request({uri: url, jar: true}, function (error, response, body) {
        // Check status code (200 is HTTP OK)
        /*if (error || response.statusCode !== 200) {
            callback();
            return;
        }*/
        // Parse the document body
        let $ = cheerio.load(body);
        console.log('enter to ', url)
        result.push({
            name: $('meta[itemprop="name"]').attr('content'),
            link: url,
            price: $('meta[itemprop="price"]').attr('content'),
            id: $('meta[itemprop="productID"]').attr('content'),
            visited:true,
        })
        collectInternalLinks($)
        callback();
    });
}

function collectInternalLinks($) {
    let relativeLinks = $("a[href^='/']");
    let AbsoluteLinks = $("a[href^='http']");
    let SecureLinks = $("a[href^='https']");

    relativeLinks.each(function () {
        let url = checkUrl(baseUrl + $(this).attr('href'))
        if (url) {
            pagesToVisit.push(url);
        }
    });

    AbsoluteLinks.each(function () {
        let url = checkUrl($(this).attr('href'))
        if (url) {
            pagesToVisit.push(url);
        }
    });

    SecureLinks.each(function () {
        let url = checkUrl($(this).attr('href'))
        if (url) {
            pagesToVisit.push(url);
        }
    });
}

function checkUrl(temp_url) {
    let temp = pagesToVisit.filter(function (item) {
        return item == url
    })

    temp_url = new URL(temp_url);

    if (temp.length > 0 || HOSTNAME != temp_url.hostname) {
        return false
    }


    return temp_url.protocol + "//" + temp_url.hostname + temp_url.pathname;
}
