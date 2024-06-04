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
      const existingUser = waitingUsers.find(user => user.id === socket.id);
      if (existingUser) {
        // User is already in the waiting list
        return;
      }

      if (waitingUsers.length > 0) {
        const pairUser = waitingUsers.shift();
        if (pairUser.id === socket.id) {
          // The user tried to pair with themselves
          waitingUsers.push(pairUser); // Re-add them to the waiting list
          return;
        }

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
  });

  server.listen(3000, (err) => {
    if (err) throw err;
    console.log('> Ready on http://localhost:3000');
  });
});
