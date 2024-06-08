const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const socketIo = require('socket.io');
const express = require('express');

const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();

let waitingUsers = [];

app.prepare().then(() => {
  const server = express();

  // Health check endpoint
  server.get('/health', (req, res) => {
    res.status(200).send('OK');
  });

  // Catch-all for Next.js
  server.all('*', (req, res) => {
    const parsedUrl = parse(req.url, true);
    handle(req, res, parsedUrl);
  });

  const httpServer = createServer(server);

  const io = socketIo(httpServer, {
    path: '/socket.io'
  });

  io.on('connection', (socket) => {
    socket.on('join', ({ name }) => {
      const existingUser = waitingUsers.find(user => user.id === socket.id);
      if (existingUser) {
        return;
      }

      if (waitingUsers.length > 0) {
        const pairUser = waitingUsers.shift();
        if (pairUser.id === socket.id) {
          waitingUsers.push(pairUser);
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

    socket.on('rematch', ({ name, room }) => {
      socket.to(room).emit('userLeft', { name });
      io.in(room).clients((error, clients) => {
        if (error) throw error;
        clients.forEach(clientId => {
          io.sockets.sockets[clientId].leave(room);
          io.sockets.sockets[clientId].emit('rematchCountdown');
        });
      });
    });

    socket.on('disconnect', () => {
      waitingUsers = waitingUsers.filter(user => user.id !== socket.id);
    });
  });

  const PORT = process.env.PORT || 3000;
  httpServer.listen(PORT, (err) => {
    if (err) throw err;
    console.log(`> Ready on http://localhost:${PORT}`);
  });
});
