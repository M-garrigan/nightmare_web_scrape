
const { handler } = require('./main.js');


let context = {
  done: (err, result) => { 
    console.log('context::err - ', err);
    console.log('context::res - ', result);
  }
}
handler('event', context);