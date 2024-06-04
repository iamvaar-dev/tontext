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
  const [countdown, setCountdown] = useState(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
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
        setMessages((prevMessages) => [...prevMessages, { name: 'System', message: `${name} left the chat.` }]);
        setCountdown(3);
      });

      socket.on('rematchCountdown', () => {
        setCountdown(3);
      });

      const interval = setInterval(() => {
        if (countdown > 0) {
          setCountdown(countdown - 1);
        }
        if (countdown === 1) {
          window.location.reload();
        }
      }, 1000);

      return () => {
        clearInterval(interval);
        socket.disconnect();
      };
    }
  }, [countdown]);

  useEffect(() => {
    const savedName = sessionStorage.getItem('chatName');
    if (savedName) {
      setName(savedName);
    }
  }, []);

  const joinChat = () => {
    if (name) {
      socket.emit('join', { name });
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('chatName', name);
      }
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
    const chatName = sessionStorage.getItem('chatName');
    if (chatName) {
      socket.emit('rematch', { name: chatName, room });
      setCountdown(3);
    }
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>TONTEXT</header>
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
        {countdown !== null && <div className={styles.countdown}>Refreshing in {countdown}...</div>}
      </div>
    </div>
  );
};

export default Home;
