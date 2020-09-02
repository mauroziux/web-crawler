const HCCrawler = require('headless-chrome-crawler')
const JSONLineExporter = require('headless-chrome-crawler/exporter/json-line')

const FILE = './tmp/result.json'

const exporter = new JSONLineExporter({
  file: FILE,
  fields: ['response.url', 'response.result.title', 'response.result.price', 'response.status', 'links.length',],
});

( async () => {
  const crawler = await HCCrawler.launch({
    // Function to be evaluated in browsers
    evaluatePage: ( () => ( {
      title: $('title').text(),
      price: $('meta[itemprop="price"]').attr('content'),
    } ) ),
    // Function to be called with evaluated results from browsers
    onSuccess: ( result => {
      console.log(result)
    } ),
    exporter
  })
  // Queue a request
  await crawler.queue('https://miproteina.com.co')
  await crawler.queue('https://miproteina.com.co/lipo-6-black-training.html')
  // Queue multiple requests
  //await crawler.queue(['https://example.net/', 'https://example.org/']);
  
  await crawler.onIdle() // Resolved when no queue is left
  await crawler.close() // Close the crawler
} )()
