 
// WIP: should be `require('nightmare-lambda-pack')`
const binaryPack = require('./lib/bootstrap/nightmare-lambda-pack');

// WIP: should be `require('xvfb')`
const Xvfb       = require('./lib/bootstrap/xvfb'); 

const Nightmare  = require('nightmare');

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

    // ...
    // Main logic with call to done() upon completion or error
    // ...

    const nightmare = Nightmare({
      show: false,                   // show actual browser window as Nightmare clicks through
      electronPath: electronPath    // you MUST specify electron path which you receive from installation
    });

        nightmare
          .goto('https://duckduckgo.com')
          .type('#search_form_input_homepage', 'apex legends')
          .click('#search_button_homepage')
          .wait('.module--news__items')
          .evaluate( () => {
            const parseNews = limit => {
              let nodeArr = [];
            
              if (limit === 0) return nodeArr;
              else {
            
                for (let i = 1; i <= limit; i += 1) {
                  let img = null;
                  if (document.querySelector(`.module--news__items :nth-child(${i}) .module--news__image-wrapper .module--news__image`)) {
                    img = document.querySelector(`.module--news__items :nth-child(${i}) .module--news__image-wrapper .module--news__image`).getAttribute('style');
                    // split string by '.'
                    let split = img.split('.');
                    split.shift();
                    img = split.join('.');
                  }
                  
                  let body = document.querySelector(`.module--news__items :nth-child(${i}) .module--news__body a`).innerText;
                  let source = document.querySelector(`.module--news__items :nth-child(${i}) .module--news__footer .module--news__more-at .module--news__source`).innerText;
                  let sourceHref = document.querySelector(`.module--news__items :nth-child(${i}) .module--news__body a`).getAttribute('href');
                  let time = document.querySelector(`.module--news__items :nth-child(${i}) .module--news__footer .tile__time`).innerText;
              
                  nodeArr.push({
                    img: img,
                    body: body,
                    source: source,
                    sourceHref, sourceHref,
                    time: time
                  });
                }
              }
              return nodeArr
            }

            let len = document.querySelector('.module--news__items').childNodes.length;
            let upperLimit = 5;

            if (len < 5) {
              upperLimit = len;
            }
           
            return parseNews(upperLimit);
          })
          .end()
          .then( result => {
            // json stringify data
            // write data to file
            // send file to s3 bucket
            // erase file (locally)
              
            done(null, result);  // done() instead of context.done()
          })
          .catch( error => {
              console.error('Search failed:', error);
              done(error);         // done() instead of context.done()
          });    

    });
};