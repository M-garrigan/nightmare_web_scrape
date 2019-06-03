 
// WIP: should be `require('nightmare-lambda-pack')`
const binaryPack = require('./lib/bootstrap/nightmare-lambda-pack');

// WIP: should be `require('xvfb')`
const Xvfb = require('./lib/bootstrap/xvfb'); 

const Nightmare  = require('nightmare');
const fs = require('fs');
const AdmZip = require('adm-zip');

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

    nightmare
      .goto('https://duckduckgo.com/?q=apex+legends&t=h_&iar=news&ia=news')
      .wait('.js-vertical-results') // posibly change this to a 1000 ms delay
      .evaluate( () => {
        const newsItems = [...document.querySelectorAll('.result')]; // convert the Nodelist to an array
        let upperLimit = 5; // we only want this number of results

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
        let streamKeyword ='Apex_Legends';
        const jsonFileName = `${streamKeyword}.json`;

        // json stringify data
        let jsonResult = JSON.stringify(result);

        // make .json file to hold data
        fs.writeFileSync(jsonFileName, jsonResult);

        // __dirname ==  /Users/mac/Apps/nightmare_web_scrape

        // zip file
        const zip = new AdmZip();
        zip.addLocalFile(`${__dirname}/${jsonFileName}`);
        zip.writeZip(`${__dirname}/${streamKeyword}.zip`)
            
        // TODO
        // 1) make a name for the file (timestamp??)
        // 2) dynamic S3 folder with a file in it acting as a summary page
        //  Check item for timeout and if not found return nothing and do not generate a file to zip
        // 5) send file to s3 bucket
        // 6) erase file (locally)
        // 7) Fill out README.md file so that it is useful
        // 8) MAYBE:: a function to search out any old files to be erased
        // 9) Make this lambda consume data from a SQS stream
          
        done(null, jsonResult);  // done() instead of context.done()
      })
      .catch( error => {
          console.error('Search failed:', error);
          done(error);         // done() instead of context.done()
      });    

    });
};