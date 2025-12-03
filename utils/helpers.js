// Generate unique room ID
const generateRoomId = () => {
  return Math.random().toString(36).substring(2, 15) + 
         Math.random().toString(36).substring(2, 15);
};

// Validate room ID format
const isValidRoomId = (roomId) => {
  return roomId && typeof roomId === 'string' && roomId.length > 10;
};

module.exports = {
  generateRoomId,
  isValidRoomId
};