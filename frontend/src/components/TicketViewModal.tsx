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
  const inputRef = useRef<HTMLTextAreaElement>(null);

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

      // Add message optimistically to UI
      const optimisticMessage: Message = {
        id: `temp-${Date.now()}`,
        content: newMessage,
        userId: currentUser.discordId,
        isStaff: true,
        createdAt: new Date().toISOString(),
        username: currentUser.username,
        avatar: currentUser.avatar,
      };
      setMessages(prev => [...prev, optimisticMessage]);
      const messageContent = newMessage;
      setNewMessage('');

      // Send message to Discord
      await botsAPI.sendTicketMessage(botId, ticketId, {
        content: messageContent,
        userId: currentUser.discordId,
        username: currentUser.username,
        avatar: avatarUrl
      });

      // Don't fetch immediately - let the polling (3s) get the real message
      // This prevents the flicker of optimistic message disappearing/reappearing

      // Refocus input after sending
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    } catch (error: any) {
      console.error('Error sending message:', error);
      toast.error(error.response?.data?.message || 'Failed to send message');
      // Remove optimistic message on error
      await fetchMessages();
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

  const formatContent = (content: string) => {
    let formatted = content;

    // Replace Discord mentions <@USER_ID> with @username
    formatted = formatted.replace(/<@!?(\d+)>/g, '@User');

    return formatted;
  };

  const renderMessageContent = (content: string, isStaffMessage: boolean = false) => {
    const formatted = formatContent(content);

    // Check for image URLs
    const imageRegex = /(https?:\/\/[^\s]+\.(jpg|jpeg|png|gif|webp))/gi;
    const hasImage = imageRegex.test(formatted);

    const parts: React.ReactNode[] = [];
    let lastIndex = 0;

    // Regex for inline code: `code`
    const codeRegex = /`([^`]+)`/g;
    let match;

    let workingText = formatted;

    // Process inline code
    while ((match = codeRegex.exec(workingText)) !== null) {
      // Add text before code
      if (match.index > lastIndex) {
        parts.push(workingText.substring(lastIndex, match.index));
      }

      // Add code with styling - different style for staff messages (blue bg) vs user messages
      parts.push(
        <code
          key={`code-${match.index}`}
          className={`px-1.5 py-0.5 mx-0.5 rounded text-sm font-mono ${
            isStaffMessage
              ? 'bg-indigo-800 text-indigo-100'
              : 'bg-gray-200 text-gray-900'
          }`}
        >
          {match[1]}
        </code>
      );

      lastIndex = match.index + match[0].length;
    }

    // Add remaining text
    if (lastIndex < workingText.length) {
      parts.push(workingText.substring(lastIndex));
    }

    // Extract and display images separately
    const images: string[] = [];
    formatted.replace(imageRegex, (match) => {
      images.push(match);
      return match;
    });

    return (
      <>
        <div>{parts.length > 0 ? parts : formatted}</div>
        {images.length > 0 && (
          <div className="mt-2 space-y-2">
            {images.map((img, idx) => (
              <img
                key={`img-${idx}`}
                src={img}
                alt="Attachment"
                className="max-w-sm rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                onClick={() => window.open(img, '_blank')}
              />
            ))}
          </div>
        )}
      </>
    );
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
              {(() => {
                // Group messages by user and time
                const messageGroups: Array<{ messages: Message[], user: any, isStaff: boolean }> = [];

                messages.forEach((message, index) => {
                  const prevMessage = index > 0 ? messages[index - 1] : null;
                  const timeDiff = prevMessage ? (new Date(message.createdAt).getTime() - new Date(prevMessage.createdAt).getTime()) : Infinity;
                  const shouldGroup = prevMessage &&
                    prevMessage.userId === message.userId &&
                    timeDiff < 300000; // 5 minutes

                  if (shouldGroup) {
                    messageGroups[messageGroups.length - 1].messages.push(message);
                  } else {
                    const isCurrentUser = message.userId === currentUser.discordId;
                    messageGroups.push({
                      messages: [message],
                      user: isCurrentUser ? currentUser : {
                        username: message.username || 'User',
                        avatar: message.avatar,
                        discordId: message.userId
                      },
                      isStaff: message.isStaff
                    });
                  }
                });

                return messageGroups.map((group, groupIndex) => {
                  const isCurrentUser = group.messages[0].userId === currentUser.discordId;
                  const showOnRight = isCurrentUser || group.isStaff;

                  // Get avatar URL
                  let avatarUrl = null;
                  if (isCurrentUser && currentUser.avatar) {
                    avatarUrl = currentUser.avatar.startsWith('http')
                      ? currentUser.avatar
                      : `https://cdn.discordapp.com/avatars/${currentUser.discordId}/${currentUser.avatar}.png`;
                  } else if (group.user.avatar && group.user.discordId) {
                    avatarUrl = group.user.avatar.startsWith('http')
                      ? group.user.avatar
                      : `https://cdn.discordapp.com/avatars/${group.user.discordId}/${group.user.avatar}.png`;
                  }

                  return (
                    <div
                      key={`group-${groupIndex}`}
                      className={`flex gap-3 ${showOnRight ? 'justify-end' : 'justify-start'} mt-4`}
                    >
                      {!showOnRight && (
                        <div className="flex-shrink-0 w-10">
                          {avatarUrl ? (
                            <img src={avatarUrl} alt="Avatar" className="w-10 h-10 rounded-full" />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center">
                              <UserIcon className="w-6 h-6 text-gray-600" />
                            </div>
                          )}
                        </div>
                      )}
                      <div className="flex flex-col" style={{ maxWidth: '65%' }}>
                        <div className="flex items-baseline space-x-2 mb-1">
                          <span className="text-sm font-semibold text-gray-900">
                            {group.user.username}
                          </span>
                          <span className="text-xs text-gray-500">
                            {formatTime(group.messages[0].createdAt)}
                          </span>
                        </div>
                        <div
                          className={`${
                            showOnRight
                              ? 'bg-indigo-600 text-white rounded-2xl px-4 py-2 space-y-1'
                              : 'space-y-1'
                          }`}
                        >
                          {group.messages.map((msg) => (
                            <div key={msg.id} className="text-[15px] leading-[22px]">
                              {renderMessageContent(msg.content, showOnRight)}
                            </div>
                          ))}
                        </div>
                      </div>
                      {showOnRight && (
                        <div className="flex-shrink-0 w-10">
                          {avatarUrl ? (
                            <img src={avatarUrl} alt="Avatar" className="w-10 h-10 rounded-full" />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-indigo-300 flex items-center justify-center">
                              <UserIcon className="w-6 h-6 text-indigo-700" />
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                });
              })()}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        {/* Message Input */}
        <form onSubmit={handleSendMessage} className="px-6 py-4 border-t border-gray-200 bg-white rounded-b-lg">
          <div className="flex items-end space-x-3">
            <textarea
              ref={inputRef}
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage(e);
                }
              }}
              placeholder="Type your message... (Shift+Enter for new line)"
              className="flex-1 px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none min-h-[44px] max-h-32"
              rows={1}
              disabled={sending}
            />
            <button
              type="submit"
              disabled={!newMessage.trim() || sending}
              className="px-5 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center transition-all hover:scale-105 active:scale-95"
            >
              {sending ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              ) : (
                <PaperAirplaneIcon className="w-5 h-5" />
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
