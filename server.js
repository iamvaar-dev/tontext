const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const socketIo = require('socket.io');

const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();

let waitingUsers = [];

app.prepare().then(() => {
  const server = createServer((req, res) => {
    const parsedUrl = parse(req.url, true);
    handle(req, res, parsedUrl);
  });

  const io = socketIo(server);

  io.on('connection', (socket) => {
    socket.on('join', ({ name }) => {
      // Exclude the current user from the waiting list
      waitingUsers = waitingUsers.filter(user => user.id !== socket.id);

      if (waitingUsers.length > 0) {
        const pairUser = waitingUsers.pop();
        const room = `${pairUser.id}#${socket.id}`;
        socket.join(room);
        pairUser.socket.join(room);

        socket.emit('roomAssigned', { name: pairUser.name, room });
        pairUser.socket.emit('roomAssigned', { name, room });
      } else {
        waitingUsers.push({ id: socket.id, name, socket });
        socket.emit('waitingForPair');
      }
    });

    socket.on('message', ({ name, message, room }) => {
      socket.to(room).emit('message', { name, message });
    });

    socket.on('disconnect', () => {
      waitingUsers = waitingUsers.filter(user => user.id !== socket.id);
    });

    socket.on('rematch', ({ room }) => {
      // Notify the other user in the room that user 1 left
      socket.to(room).emit('userLeft', { name: 'User 1' });
    });
  });

  server.listen(3000, (err) => {
    if (err) throw err;
    console.log('> Ready on http://localhost:3000');
  });
});