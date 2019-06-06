 
// WIP: should be `require('nightmare-lambda-pack')`
const binaryPack = require('./lib/bootstrap/nightmare-lambda-pack');

// WIP: should be `require('xvfb')`
const Xvfb = require('./lib/bootstrap/xvfb'); 

const Nightmare  = require('nightmare');
const fs = require('fs');
const AWS = require('aws-sdk');
const { accessKeyID, secretAccessKey } = require('./helpers/config.js');

const isOnLambda = binaryPack.isRunningOnLambdaEnvironment;

const electronPath = binaryPack.installNightmareOnLambdaEnvironment();


exports.handler = function(event, context){

  const xvfb = new Xvfb({
    // Xvfb executable will be at this path when unpacked from nigthmare-lambda-pack
    xvfb_executable: '/tmp/pck/Xvfb',  
    // in local environment execute callback of .start() without actual execution of Xvfb (for running in dev environment)
    dry_run: !isOnLambda         
  });
    
  xvfb.start((err, xvfbProcess) => {

    if (err) context.done(err);

    function done(err, result){
        xvfb.stop((err) => context.done(err, result));
    }

    // Main logic with call to done() upon completion or error

    const nightmare = Nightmare({
      show: false,                   // show actual browser window as Nightmare clicks through
      electronPath: electronPath    // you MUST specify electron path which you receive from installation
    });

    // TODO :: Parse incoming queue item here !!!

    nightmare
      .goto('https://duckduckgo.com/?q=apex+legends&t=h_&iar=news&ia=news')
      .wait(1000) 
      .evaluate( () => {
        const newsItems = [...document.querySelectorAll('.result')]; // convert the Nodelist to an array
        let upperLimit = 5; // we only want this number of results or less

        if (newsItems.length < upperLimit) {
          upperLimit = len;
        }

        if (upperLimit === 0) {
          return [];
        } else {
          let data = [];

          for (let i = 0; i < upperLimit; i += 1) {
            let title = newsItems[i].querySelector('.result__body .result__title .result__a').innerText;
            let body = newsItems[i].querySelector('.result__body .result__snippet').innerText;
            let source = newsItems[i].querySelector('.result__body .result__extras .result__extras__url .result__url').innerText;
            let sourceHref = newsItems[i].getAttribute('data-link');
            let time = newsItems[i].querySelector('.result__body .result__extras .result__extras__url .result__timestamp').innerText;

            let img = null;
            if (newsItems[i].querySelector('.result__body .result__body__img')) {
              img = newsItems[i].querySelector('.result__body .result__body__img').getAttribute('style');
        
              let split = img.split('.');
              split.shift();
              img = split.join('.');
            }

            data.push({ title, body, source, sourceHref, time, img });
          }
          return data;
        }
      })
      .end()
      .then( result => {

        if (result.length === 0) { // no news results found
          done(null, result);  // return the empty array
        } else {
          let streamKeyword ='chocotaco';

          // time stamp & file name
          const epoch = Date.now();
          const jsonFileName = `${epoch}.json`;
          
          // update local metadata.json
          let meta = fs.readFileSync('metadata.json');
          let metaParsed = JSON.parse(meta);
          metaParsed.news[streamKeyword] = jsonFileName;
          fs.writeFileSync('metadata.json', JSON.stringify(metaParsed));

          // Set config for s3 bucket
          AWS.config.update({
            accessKeyId: accessKeyID,
            secretAccessKey: secretAccessKey,
            region: 'us-east-2'
          });
          const s3 = new AWS.S3({apiVersion: '2006-03-01'});

          // Delete metadata.json file in S3 bucket
          s3.deleteObject({
            Bucket: 'nightmare-web-bucket',
            Key: "metadata.json"
            }, 
            (err, data) => {
              if (err) console.log(err, err.stack); // an error occurred
              else     console.log(data);
            }
          );
        
          // Send new metadata.json to s3
          s3.putObject({
            Body: JSON.stringify(metaParsed),
            Bucket: 'nightmare-web-bucket',
            Key: 'metadata.js'
            }, 
            (err, data) => {
              if (err) console.log(err, err.stack); // an error occurred
              else     console.log(data);
            }
          );

          // Send .json file with news results to s3
          s3.putObject({
            Body: JSON.stringify(result),
            Bucket: 'nightmare-web-bucket',
            Key: `news/${jsonFileName}`,
            }, 
            (err, data) => {
              if (err) console.log(err, err.stack); // an error occurred
              else     console.log(data);
            }
          )

        done(null, jsonResult);  // done() instead of context.done()
        }
      })
      .catch( error => {
          console.error('Search failed:', error);
          done(error);         // done() instead of context.done()
      });    

    });
};