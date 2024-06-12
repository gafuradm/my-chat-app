"use client";
import { useState, useEffect } from 'react';
import styles from './Chat.module.css';

interface Message {
  user: string;
  text: string;
}

interface User {
  username: string;
  online: boolean;
  isTyping: boolean;
}

const Home = () => {
  const [message, setMessage] = useState('');
  const [chat, setChat] = useState<Message[]>([]);
  const [ws, setWs] = useState<WebSocket | null>(null);
  const [username, setUsername] = useState<string>('');
  const [enteredChat, setEnteredChat] = useState<boolean>(false);
  const [users, setUsers] = useState<User[]>([]);
  const [isTyping, setIsTyping] = useState<boolean>(false);
  const [isPartnerTyping, setIsPartnerTyping] = useState<boolean>(false);

  useEffect(() => {
    if (enteredChat) {
      const socket = new WebSocket('ws://localhost:8080');
      setWs(socket);

      socket.onopen = () => {
        socket.send(JSON.stringify({ type: 'setUsername', username }));
      };

      socket.onmessage = async (event) => {
        let data = event.data;
        if (event.data instanceof Blob) {
          data = await event.data.text();
        }
        const parsedData: any = JSON.parse(data);

        if (parsedData.type === 'userList') {
          setUsers(
            parsedData.users.map((user: any) => ({
              ...user,
              isTyping: false,
            }))
          );
          setIsPartnerTyping(
            parsedData.users.some(
              (user: any) => user.isTyping && user.username !== username
            )
          );
        } else if (parsedData.type === 'typing') {
          setIsPartnerTyping(true);
          setTimeout(() => {
            setIsPartnerTyping(false);
          }, 2000);
        } else if (parsedData.type === 'messageHistory') {
          setChat(parsedData.messages);
        } else {
          const chatMessage = parsedData as Message;
          setChat((prevChat) => [...prevChat, chatMessage]);
        }
      };

      return () => {
        socket.close();
      };
    }
  }, [enteredChat, username]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setIsTyping(false);
      if (ws && ws.readyState === WebSocket.OPEN && !message) {
        ws.send(JSON.stringify({ type: 'stopTyping', username }));
      }
    }, 1000);

    return () => {
      clearTimeout(timeout);
    };
  }, [isTyping, message, username, ws]);

  const sendMessage = () => {
    if (ws && ws.readyState === WebSocket.OPEN && username && message) {
      const msg = { type: 'message', user: username, text: message };
      ws.send(JSON.stringify(msg));
      setMessage('');
    }
  };

  const handleUsernameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUsername(e.target.value);
  };

  const handleUsernameSubmit = () => {
    setUsername(username.trim());
    setEnteredChat(true);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.value) {
      setIsTyping(true);
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'typing', username }));
      }
    } else {
      setIsTyping(false);
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'stopTyping', username }));
      }
    }
    setMessage(e.target.value);
  };

  const renderOnlineStatus = (user: User) => {
    return (
      <span className={user.online ? styles.online : styles.offline}>
        {user.username} {user.online ? 'Online' : 'Offline'}
        {user.isTyping && user.username !== username && ' (Partner is typing...)'}
      </span>
    );
  };

  return (
    <div className={styles.chatContainer}>
      {!enteredChat ? (
        <div className={styles.usernameContainer}>
          <input
            type="text"
            placeholder="Enter your username"
            value={username}
            onChange={handleUsernameChange}
            className={styles.inputField}
          />
          <button
            onClick={handleUsernameSubmit}
            disabled={!username}
            className={styles.enterButton}>
            Enter
          </button>
        </div>
      ) : (
        <>
          <div className={styles.header}>
            Chat with:
            {isPartnerTyping && <span> Partner is typing...</span>}
            {users.map((user) => (
              <div key={user.username}>
                {user.username !== username && renderOnlineStatus(user)}
              </div>
            ))}
          </div>
          <div className={styles.chatBox}>
            {chat.map((msg, index) => (
              <div
                key={index}
                className={
                  msg.user === username
                    ? styles.myMessage
                    : styles.otherMessage
                }
              >
                <strong>{msg.user} </strong>
                {msg.text}
              </div>
            ))}
          </div>
          <div className={styles.inputContainer}>
            <input
              type="text"
              value={message}
              onChange={handleInputChange}
              placeholder="Type your message..."
              className={styles.inputField}
            />
            <button onClick={sendMessage} className={styles.sendButton}>Send</button>
          </div>
        </>
      )}
    </div>
  );
};

export default Home;
