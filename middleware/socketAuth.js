const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Socket.io authentication middleware
const socketAuthMiddleware = async (socket, next) => {
  try {
    const token = socket.handshake.auth.token;

    if (!token) {
      // Allow anonymous users (no token)
      socket.user = null;
      return next();
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Get user from token
    const user = await User.findById(decoded.id).select('username email');

    if (!user) {
      socket.user = null;
      return next();
    }

    // Attach user to socket
    socket.user = {
      id: user._id.toString(),
      username: user.username,
      email: user.email
    };

    console.log(`✅ Authenticated socket: ${socket.id} -> ${user.username}`);
    next();
  } catch (error) {
    console.error('Socket auth error:', error.message);
    // Don't block connection, just mark as anonymous
    socket.user = null;
    next();
  }
};

module.exports = socketAuthMiddleware;