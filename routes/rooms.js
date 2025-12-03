const express = require('express');
const { body, validationResult } = require('express-validator');
const Room = require('../models/Room');
const { protect, optionalAuth } = require('../middleware/auth');

const router = express.Router();

// Generate unique room ID
const generateRoomId = () => {
  return Math.random().toString(36).substring(2, 15) + 
         Math.random().toString(36).substring(2, 15);
};

// @route   POST /api/rooms
// @desc    Create a new room
// @access  Private
// @route   POST /api/rooms
// @desc    Create a new room
// @access  Private
router.post(
  '/',
  protect,
  [
    body('name')
      .optional()
      .trim()
      .isLength({ max: 50 })
      .withMessage('Room name must be less than 50 characters')
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    try {
      const roomId = generateRoomId();
      let { name, isPublic = true } = req.body;

      // If no name provided or empty, generate "Untitled Project N"
      if (!name || name.trim() === '' || name === 'Untitled Project') {
        // Find all untitled projects for this user
        const untitledRooms = await Room.find({
          creator: req.user.id,
          name: { $regex: /^Untitled Project( \d+)?$/i }
        }).select('name').sort({ createdAt: -1 });

        let maxNumber = 0;
        
        // Find the highest number
        untitledRooms.forEach(room => {
          if (room.name === 'Untitled Project') {
            maxNumber = Math.max(maxNumber, 1);
          } else {
            const match = room.name.match(/^Untitled Project (\d+)$/i);
            if (match) {
              const num = parseInt(match[1]);
              maxNumber = Math.max(maxNumber, num);
            }
          }
        });

        name = `Untitled Project ${maxNumber + 1}`;
      }

      const room = await Room.create({
        roomId,
        name,
        creator: req.user.id,
        isPublic,
        code: {
          html: '',
          css: '',
          js: ''
        }
      });

      res.status(201).json({
        success: true,
        room: {
          id: room._id,
          roomId: room.roomId,
          name: room.name,
          isPublic: room.isPublic,
          createdAt: room.createdAt
        }
      });
    } catch (error) {
      console.error('Create room error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error while creating room'
      });
    }
  }
);

// @route   GET /api/rooms/my-rooms
// @desc    Get current user's rooms
// @access  Private
router.get('/my-rooms', protect, async (req, res) => {
  try {
    const rooms = await Room.find({ creator: req.user.id })
      .select('roomId name isPublic lastModified createdAt')
      .sort({ lastModified: -1 });

    res.json({
      success: true,
      rooms
    });
  } catch (error) {
    console.error('Get rooms error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching rooms'
    });
  }
});

// @route   GET /api/rooms/:roomId
// @desc    Get room details
// @access  Public (with optional auth)
router.get('/:roomId', optionalAuth, async (req, res) => {
  try {
    const room = await Room.findOne({ roomId: req.params.roomId })
      .populate('creator', 'username');

    if (!room) {
      return res.status(404).json({
        success: false,
        message: 'Room not found'
      });
    }

    // Check if room is private and user is not the creator
    if (!room.isPublic && (!req.user || room.creator._id.toString() !== req.user.id)) {
      return res.status(403).json({
        success: false,
        message: 'This room is private'
      });
    }

    res.json({
      success: true,
      room: {
        id: room._id,
        roomId: room.roomId,
        name: room.name,
        isPublic: room.isPublic,
        creator: room.creator,
        code: room.code,
        lastModified: room.lastModified,
        createdAt: room.createdAt
      }
    });
  } catch (error) {
    console.error('Get room error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching room'
    });
  }
});

// @route   PUT /api/rooms/:roomId
// @desc    Update room name
// @access  Private (creator only)
router.put(
  '/:roomId',
  protect,
  [
    body('name')
      .trim()
      .isLength({ min: 1, max: 50 })
      .withMessage('Room name must be 1-50 characters')
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    try {
      const room = await Room.findOne({ roomId: req.params.roomId });

      if (!room) {
        return res.status(404).json({
          success: false,
          message: 'Room not found'
        });
      }

      // Check if user is the creator
      if (room.creator.toString() !== req.user.id) {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to update this room'
        });
      }

      room.name = req.body.name;
      await room.save();

      res.json({
        success: true,
        room: {
          id: room._id,
          roomId: room.roomId,
          name: room.name
        }
      });
    } catch (error) {
      console.error('Update room error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error while updating room'
      });
    }
  }
);

// @route   DELETE /api/rooms/:roomId
// @desc    Delete a room
// @access  Private (creator only)
router.delete('/:roomId', protect, async (req, res) => {
  try {
    const room = await Room.findOne({ roomId: req.params.roomId });

    if (!room) {
      return res.status(404).json({
        success: false,
        message: 'Room not found'
      });
    }

    // Check if user is the creator
    if (room.creator.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this room'
      });
    }

    await room.deleteOne();

    res.json({
      success: true,
      message: 'Room deleted successfully'
    });
  } catch (error) {
    console.error('Delete room error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while deleting room'
    });
  }
});

module.exports = router;