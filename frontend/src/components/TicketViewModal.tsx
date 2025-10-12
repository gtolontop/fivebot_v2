'use client';

import React, { useState, useEffect, useRef } from 'react';
import { XMarkIcon, PaperAirplaneIcon, UserIcon } from '@heroicons/react/24/outline';
import { botsAPI } from '@/utils/api';
import toast from 'react-hot-toast';

interface Message {
  id: string;
  content: string;
  userId: string;
  isStaff: boolean;
  createdAt: string;
  username?: string;
  avatar?: string;
}

interface TicketViewModalProps {
  botId: string;
  ticketId: string;
  ticketNumber: number;
  onClose: () => void;
  currentUser: { id: string; discordId: string; username: string; avatar?: string };
}

export default function TicketViewModal({
  botId,
  ticketId,
  ticketNumber,
  onClose,
  currentUser
}: TicketViewModalProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  // Fetch messages
  useEffect(() => {
    fetchMessages();
    // Poll for new messages every 3 seconds
    const interval = setInterval(fetchMessages, 3000);
    return () => clearInterval(interval);
  }, [botId, ticketId]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const fetchMessages = async () => {
    try {
      const response = await botsAPI.getTicketMessages(botId, ticketId, 100);
      setMessages(response.data.messages || []);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching messages:', error);
      if (loading) {
        toast.error('Failed to load messages');
        setLoading(false);
      }
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newMessage.trim() || sending) return;

    setSending(true);

    try {
      // Construct full Discord avatar URL if we have an avatar hash
      let avatarUrl = undefined;
      if (currentUser.avatar) {
        // Check if it's already a full URL
        if (currentUser.avatar.startsWith('http')) {
          avatarUrl = currentUser.avatar;
        } else {
          // Construct Discord CDN URL from hash
          avatarUrl = `https://cdn.discordapp.com/avatars/${currentUser.discordId}/${currentUser.avatar}.png`;
        }
      }

      await botsAPI.sendTicketMessage(botId, ticketId, {
        content: newMessage,
        userId: currentUser.discordId,
        username: currentUser.username,
        avatar: avatarUrl
      });

      setNewMessage('');
      // Fetch messages immediately to show the sent message
      await fetchMessages();
      toast.success('Message sent');
    } catch (error: any) {
      console.error('Error sending message:', error);
      toast.error(error.response?.data?.message || 'Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl h-[80vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              Ticket #{ticketNumber}
            </h2>
            <p className="text-sm text-gray-500">View and respond to this ticket</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        {/* Messages */}
        <div
          ref={messagesContainerRef}
          className="flex-1 overflow-y-auto p-6 space-y-4 bg-gray-50"
        >
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-500">
              <UserIcon className="w-16 h-16 mb-4 opacity-50" />
              <p>No messages yet</p>
              <p className="text-sm">Be the first to respond!</p>
            </div>
          ) : (
            <>
              {messages.map((message) => {
                // Check if message is from current user
                const isCurrentUser = message.userId === currentUser.id;
                const showOnRight = isCurrentUser || message.isStaff;

                return (
                  <div
                    key={message.id}
                    className={`flex ${showOnRight ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[70%] rounded-lg px-4 py-2 ${
                        showOnRight
                          ? 'bg-indigo-600 text-white'
                          : 'bg-white text-gray-900 border border-gray-200'
                      }`}
                    >
                      <div className="flex items-center space-x-2 mb-1">
                        <span className={`text-xs font-medium ${
                          showOnRight ? 'text-indigo-200' : 'text-gray-500'
                        }`}>
                          {isCurrentUser ? currentUser.username : (message.username || (message.isStaff ? 'Staff' : 'User'))}
                        </span>
                        <span className={`text-xs ${
                          showOnRight ? 'text-indigo-200' : 'text-gray-400'
                        }`}>
                          {formatTime(message.createdAt)}
                        </span>
                      </div>
                      <p className="text-sm whitespace-pre-wrap break-words">
                        {message.content}
                      </p>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        {/* Message Input */}
        <form onSubmit={handleSendMessage} className="px-6 py-4 border-t border-gray-200 bg-white">
          <div className="flex space-x-3">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type your message..."
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              disabled={sending}
            />
            <button
              type="submit"
              disabled={!newMessage.trim() || sending}
              className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 transition-colors"
            >
              {sending ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              ) : (
                <>
                  <span>Send</span>
                  <PaperAirplaneIcon className="w-5 h-5" />
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
