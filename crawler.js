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
        result.rows.map(function (item) {
            if (item.doc.visited) {
                pagesVisited.push(item.doc);
            } else {
                pagesToVisit.push(item.doc);
            }
        })

        crawl();
    }).catch(function (err) {
        console.log(err);
    });
}).catch(function (err) {
    let inicial_object = {
        link: START_URL,
        product: false,
        _id: 'initial',
        visited: false
    }
    put_object_db(inicial_object)
    pagesToVisit.push(inicial_object);
    crawl();
});

function crawl() {
    if (pagesToVisit.length == 0 || numPagesVisited == maxPageToVisite) {

        fs.writeFile('output.json', JSON.stringify(pagesVisited, null, 4), function (err) {
            console.log('URL successfully written! - Check your project directory for the output.json file');
        })

        db.allDocs({
            include_docs: true,
        }).then(function (result) {
            fs.writeFile('result.json', JSON.stringify(result, null, 4), function (err) {
                console.log('Result successfully written! - Check your project directory for the result.json file');
            });
        }).catch(function (err) {
            console.log(err);
        });


        return
    }
    let nextPage = pagesToVisit.pop();

    let visited = pagesVisited.filter(function (item) {
        return item.link == nextPage.link
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

    request({uri: url.link, jar: true}, function (error, response, body) {
        // Check status code (200 is HTTP OK)
        if (error) {
            callback();
            return;
        }

        numPagesVisited++
        // Parse the document body
        let $ = cheerio.load(body);
        console.log('enter to ', url.link)
        let url_object = {
            name: $('meta[itemprop="name"]').attr('content'),
            link: url.link,
            price: $('meta[itemprop="price"]').attr('content'),
            product_id: $('meta[itemprop="productID"]').attr('content'),
            product: $('meta[itemprop="price"]').attr('content') ? true : false,
            visited: true,
        }
        console.log(pagesVisited)

        let page_exist_in_db = pagesVisited.map(function (item) {
            return item.link == url.link
        })

        if (page_exist_in_db.length > 0) {
            console.log(page_exist_in_db[0])
            url_object['_id']=page_exist_in_db[0]._id
            url_object['_rev']=page_exist_in_db[0]._rev
            db.put(url_object).then(function (response) {
                console.log(response)
            }).catch(function (err) {
                console.log(err)
            });
        } else {
            put_object_db(url_object)
        }

        pagesVisited.push(url_object)
        result.push(url_object)

        collectInternalLinks($)
        callback();
    });
}

function put_object_db(url) {
    db.post(url).then(function (response) {
        // handle response
    }).catch(function (err) {

    });
}

function collectInternalLinks($) {
    let relativeLinks = $("a[href^='/']");
    let AbsoluteLinks = $("a[href^='http']");
    let SecureLinks = $("a[href^='https']");

    relativeLinks.each(function () {
        let url = checkUrl(baseUrl + $(this).attr('href'))
        if (url) {
            put_collect_url_db(url)
        }
    });

    AbsoluteLinks.each(function () {
        let url = checkUrl($(this).attr('href'))
        if (url) {
            put_collect_url_db(url)
        }
    });

    SecureLinks.each(function () {
        let url = checkUrl($(this).attr('href'))
        if (url) {
            put_collect_url_db(url)
        }
    });
}

function put_collect_url_db(url) {

    let temp = {
        visited: false,
        link: url,
    }
    pagesToVisit.push(temp);
    put_object_db(temp)
}

function checkUrl(temp_url) {
    let temp = pagesToVisit.filter(function (item) {
        return item == temp_url
    })

    temp_url = new URL(temp_url);

    if (temp.length > 0 || HOSTNAME != temp_url.hostname) {
        return false
    }


    return temp_url.protocol + "//" + temp_url.hostname + temp_url.pathname;
}
