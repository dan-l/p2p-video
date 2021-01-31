const io = require('socket.io')();
const clients = [];

io.on('connection', client => {
  console.log('client has connected: ', client.id);
  clients.push(client.id);
  io.sockets.emit('usersList', clients);

  client.on('disconnect', () => {
    console.log('client has disconnected: ', client.id);
    const index = clients.indexOf(client.id);
    clients.splice(index, 1);
    io.sockets.emit('usersList', clients);
  });

  client.on('message', (message) => {
    console.log('sending message: ', message);
    if (!message.id) console.error('Cannot send message to unknown id');
    io.to(message.id).emit('message', message);
  });
});

io.listen(3000);
