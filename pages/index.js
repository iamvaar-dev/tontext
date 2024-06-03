import { useEffect, useState } from 'react';
import io from 'socket.io-client';
import styles from '../styles/Home.module.css';

let socket;

const Home = () => {
  const [name, setName] = useState('');
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([]);
  const [chatStarted, setChatStarted] = useState(false);
  const [room, setRoom] = useState('');
  const [countdown, setCountdown] = useState(0);

  useEffect(() => {
    socket = io();

    socket.on('roomAssigned', ({ name: pairedName, room }) => {
      setRoom(room);
      setChatStarted(true);
      setMessages([{ name: 'System', message: `You are paired with ${pairedName}` }]);
    });

    socket.on('waitingForPair', () => {
      setMessages([{ name: 'System', message: 'Waiting for another user to join...' }]);
    });

    socket.on('message', ({ name, message }) => {
      setMessages((prevMessages) => [...prevMessages, { name, message }]);
    });

    socket.on('userLeft', ({ name }) => {
      setChatStarted(false);
      setMessages([{ name: 'System', message: `${name} left the chat. Waiting for a new user...` }]);
    });

    socket.on('sessionDisconnected', () => {
      setChatStarted(false);
      setMessages([{ name: 'System', message: 'Session disconnected. You can join a new chat.' }]);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const joinChat = () => {
    if (name) {
      socket.emit('join', { name });
    }
  };

  const sendMessage = () => {
    if (message) {
      const newMessage = { name: 'You', message };
      setMessages((prevMessages) => [...prevMessages, newMessage]);
      socket.emit('message', { name, message, room });
      setMessage('');
    }
  };

  const handleNameKeyPress = (e) => {
    if (e.key === 'Enter') {
      joinChat();
    }
  };

  const handleMessageKeyPress = (e) => {
    if (e.key === 'Enter') {
      sendMessage();
    }
  };

  const handleRematch = () => {
    socket.emit('rematch', { room, name });

    setCountdown(3);
    const interval = setInterval(() => {
      setCountdown(prevCountdown => {
        if (prevCountdown <= 1) {
          clearInterval(interval);
          setChatStarted(false);
          setName('');
          setMessage('');
          setMessages([]);
          setRoom('');
        }
        return prevCountdown - 1;
      });
    }, 1000);
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.headerText}>TONTEXT</h1>
      </header>
      <div className={styles.chatContainer}>
        <div className={styles.chatMessages} id="chat-messages">
          {messages.map((msg, index) => (
            <div key={index} className={`${styles.chatMessage} ${msg.name === 'You' ? styles.sent : styles.received}`}>
              <div className={`${styles.chatMessageBubble} ${msg.name === 'You' ? styles.sent : styles.received}`}>
                <strong>{msg.name}:</strong> {msg.message}
              </div>
            </div>
          ))}
        </div>
        {chatStarted && (
          <div className={styles.chatInput}>
            <input
              type="text"
              id="message-input"
              placeholder="Type your message..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyPress={handleMessageKeyPress}
            />
            <button onClick={sendMessage}>Send</button>
            <button onClick={handleRematch}>Rematch</button>
          </div>
        )}
        {!chatStarted && (
          <div className={styles.chatInput}>
            <input
              type="text"
              placeholder="Enter your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyPress={handleNameKeyPress}
            />
            <button onClick={joinChat}>Join Chat</button>
          </div>
        )}
        {countdown > 0 && (
          <div className={styles.countdown}>
            Rematching in {countdown}...
          </div>
        )}
      </div>
    </div>
  );
};

export default Home;
