const WebSocket = require('ws');
const mongoose = require('mongoose');
const Message = require('./models/Message');
const User = require('./models/User');

mongoose.connect('mongodb+srv://admin-user:admin09@cluster93803.dqtj5jy.mongodb.net/lecture2?retryWrites=true&w=majority&appName=Cluster93803', { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('Connected to MongoDB'))
  .catch((err) => console.error('Could not connect to MongoDB', err));

const wss = new WebSocket.Server({ port: 8080 });
const clients = new Map();

wss.on('connection', function connection(ws) {
  ws.on('message', async function incoming(message) {
    const parsedMessage = JSON.parse(message);

    if (parsedMessage.type === 'setUsername') {
      let user = await User.findOne({ username: parsedMessage.username });
      if (!user) {
        user = new User({ username: parsedMessage.username, online: true });
        await user.save();
      } else {
        user.online = true;
        await user.save();
      }
      clients.set(ws, { username: parsedMessage.username, online: true });

      // Отправка истории сообщений новому пользователю
      const messages = await Message.find({}).sort({ timestamp: 1 }).limit(100).exec();
      ws.send(JSON.stringify({ type: 'messageHistory', messages }));

      broadcastUserList();
    } else if (parsedMessage.type === 'message') {
      const chatMessage = new Message({ user: parsedMessage.user, text: parsedMessage.text });
      await chatMessage.save();
      broadcastMessage(parsedMessage);
    } else if (parsedMessage.type === 'typing' || parsedMessage.type === 'stopTyping') {
      broadcastMessage(parsedMessage);
    }
  });

  ws.on('close', async function() {
    if (clients.has(ws)) {
      const userInfo = clients.get(ws);
      let user = await User.findOne({ username: userInfo.username });
      if (user) {
        user.online = false;
        await user.save();
      }
      clients.set(ws, { ...userInfo, online: false });
      broadcastUserList();
    }
    setTimeout(async () => {
      if (clients.has(ws) && !clients.get(ws).online) {
        clients.delete(ws);
        broadcastUserList();
      }
    }, 5000);
  });

  ws.send(JSON.stringify({ user: 'Server', text: 'Welcome to the chat!' }));

  function broadcastUserList() {
    User.find({}).then(users => {
      const userList = users.map(user => ({
        username: user.username,
        online: user.online
      }));
      wss.clients.forEach(function each(client) {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify({ type: 'userList', users: userList }));
        }
      });
    });
  }

  function broadcastMessage(message) {
    wss.clients.forEach(function each(client) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(message));
      }
    });
  }
});

console.log('WebSocket server is running on ws://localhost:8080');
