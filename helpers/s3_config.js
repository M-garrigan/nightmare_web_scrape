
const { accessKeyID, secretAccessKey } = require('./config.js');

module.exports = {

  s3_metadata_config: {
    bucketName: 'nighmare-web-bucket',
    region: 'us-east-2',
    accessKeyId: accessKeyID,
    secretAccessKey: secretAccessKey
  },

  s3_zip_config = {
    bucketName: 'nighmare-web-bucket',
    dirName: 'news',
    region: 'us-east-2',
    accessKeyId: accessKeyID,
    secretAccessKey: secretAccessKey
  }
}