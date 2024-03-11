const io = require("socket.io-client");
const socket = io.connect("http:/119.3.88.210:39202");

module.exports = {
  socket,
};
