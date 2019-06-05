
module.exports = () => {
  const epoch = Date.now();
  const date = new Date();

  return {
    epoch: epoch + '', // convert int to str
    date
  }
};