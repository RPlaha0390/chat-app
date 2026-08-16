const express = require('express');
const {
  createConversation,
  listConversations,
  sendMessage,
  getMessages,
} = require('../controllers/conversationController');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.use(requireAuth); // every route in this file requires auth

router.post('/', createConversation);
router.get('/', listConversations);
router.post('/:id/messages', sendMessage);
router.get('/:id/messages', getMessages);

module.exports = router;
