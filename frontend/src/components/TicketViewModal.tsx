'use client';

import React, { useState, useEffect, useRef } from 'react';
import { XMarkIcon, PaperAirplaneIcon, UserIcon, PhotoIcon, PaperClipIcon } from '@heroicons/react/24/outline';
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
  const [shouldAutoScroll, setShouldAutoScroll] = useState(true);
  const [optimisticMessages, setOptimisticMessages] = useState<Message[]>([]);
  const [attachmentUrl, setAttachmentUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch messages
  useEffect(() => {
    fetchMessages();
    // Poll for new messages every 3 seconds
    const interval = setInterval(fetchMessages, 3000);
    return () => clearInterval(interval);
  }, [botId, ticketId]);

  // Auto-scroll to bottom ONLY if user is at bottom or shouldAutoScroll is true
  useEffect(() => {
    if (shouldAutoScroll) {
      scrollToBottom();
    }
  }, [messages, optimisticMessages]);

  // Detect when user scrolls manually
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      const isAtBottom = scrollHeight - scrollTop - clientHeight < 100; // 100px threshold
      setShouldAutoScroll(isAtBottom);
    };

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, []);

  const fetchMessages = async () => {
    try {
      const response = await botsAPI.getTicketMessages(botId, ticketId, 100);
      const fetchedMessages = response.data.messages || [];

      // Remove optimistic messages that now exist in real messages (match by content and userId)
      setOptimisticMessages(prev =>
        prev.filter(optMsg =>
          !fetchedMessages.some(realMsg =>
            realMsg.content === optMsg.content &&
            realMsg.userId === optMsg.userId
          )
        )
      );

      setMessages(fetchedMessages);
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
    // Use scrollIntoView with instant behavior to avoid jerky animation
    messagesEndRef.current?.scrollIntoView({ behavior: 'instant', block: 'end' });
  };

  // Handle paste event for image upload
  const handlePaste = async (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];

      // Check if it's an image
      if (item.type.indexOf('image') !== -1) {
        e.preventDefault();
        const file = item.getAsFile();
        if (!file) continue;

        setUploading(true);
        toast.loading('Uploading image...', { id: 'upload' });

        try {
          // Convert file to base64
          const reader = new FileReader();

          reader.onload = async () => {
            try {
              const base64 = (reader.result as string).split(',')[1];

              // Upload to imgbb (free image hosting)
              const formData = new FormData();
              formData.append('image', base64);

              const response = await fetch(`https://api.imgbb.com/1/upload?key=d0db2f0b8d8661e8d4d2e7e8ee0a7ae7`, {
                method: 'POST',
                body: formData,
              });

              const data = await response.json();

              if (data.success) {
                setAttachmentUrl(data.data.url);
                toast.success('Image uploaded!', { id: 'upload' });
              } else {
                console.error('ImgBB error:', data);
                toast.error('Upload failed: ' + (data.error?.message || 'Unknown error'), { id: 'upload' });
              }
            } catch (error: any) {
              console.error('Upload error:', error);
              toast.error('Upload failed: ' + error.message, { id: 'upload' });
            } finally {
              setUploading(false);
            }
          };

          reader.onerror = () => {
            toast.error('Failed to read file', { id: 'upload' });
            setUploading(false);
          };

          reader.readAsDataURL(file);
        } catch (error: any) {
          console.error('Upload error:', error);
          toast.error('Upload failed: ' + error.message, { id: 'upload' });
          setUploading(false);
        }
        break;
      }
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newMessage.trim() || sending) return;

    setSending(true);

    // Construct full Discord avatar URL if we have an avatar hash
    let avatarUrl: string | undefined = undefined;
    if (currentUser.avatar) {
      // Check if it's already a full URL
      if (currentUser.avatar.startsWith('http')) {
        avatarUrl = currentUser.avatar;
      } else {
        // Construct Discord CDN URL from hash
        avatarUrl = `https://cdn.discordapp.com/avatars/${currentUser.discordId}/${currentUser.avatar}.png`;
      }
    }

    // Combine message with attachment URL if present
    let fullContent = newMessage;
    if (attachmentUrl.trim()) {
      fullContent = fullContent ? `${fullContent}\n${attachmentUrl}` : attachmentUrl;
    }

    // Add message optimistically to UI
    const optimisticMessage: Message = {
      id: `temp-${Date.now()}`,
      content: fullContent,
      userId: currentUser.discordId,
      isStaff: true,
      createdAt: new Date().toISOString(),
      username: currentUser.username,
      avatar: currentUser.avatar,
    };
    setOptimisticMessages(prev => [...prev, optimisticMessage]);
    const messageContent = fullContent;
    setNewMessage('');
    setAttachmentUrl('');

    try {

      // Send message to Discord
      await botsAPI.sendTicketMessage(botId, ticketId, {
        content: messageContent,
        userId: currentUser.discordId,
        username: currentUser.username,
        avatar: avatarUrl
      });

      // Optimistic message will be automatically removed when real message arrives in fetchMessages

      // Refocus input after sending
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    } catch (error: any) {
      console.error('Error sending message:', error);
      toast.error(error.response?.data?.message || 'Failed to send message');
      // Remove optimistic message on error
      setOptimisticMessages(prev => prev.filter(msg => msg.id !== optimisticMessage.id));
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
    let formatted = formatContent(content);

    // Extract all media types and embeds
    const media: Array<{ type: string; url: string; embed?: string }> = [];
    const linkEmbeds: Array<{ url: string; domain: string }> = [];
    let textWithoutMedia = formatted;

    // YouTube URLs - keep the URL in text, don't remove it
    const youtubeRegex = /(https?:\/\/)?(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/gi;
    Array.from(formatted.matchAll(youtubeRegex)).forEach(match => {
      media.push({ type: 'youtube', url: match[0], embed: match[4] });
      // Don't remove YouTube URLs from text - they should be visible above the embed
    });

    // Video files
    const videoRegex = /(https?:\/\/\S+?\.(mp4|webm|mov|avi|mkv)(\?\S*)?)/gi;
    Array.from(formatted.matchAll(videoRegex)).forEach(match => {
      media.push({ type: 'video', url: match[0] });
      textWithoutMedia = textWithoutMedia.replace(match[0], '').trim();
    });

    // Image files (including Discord CDN, Imgur, etc.)
    const imageRegex = /(https?:\/\/\S+?\.(jpg|jpeg|png|gif|webp|bmp|svg)(\?\S*)?)/gi;
    Array.from(formatted.matchAll(imageRegex)).forEach(match => {
      media.push({ type: 'image', url: match[0] });
      textWithoutMedia = textWithoutMedia.replace(match[0], '').trim();
    });

    // Extract other URLs for embeds (Trello, generic links, etc.) - but not media URLs or YouTube
    const genericUrlRegex = /(https?:\/\/[^\s]+)/gi;
    Array.from(formatted.matchAll(genericUrlRegex)).forEach(match => {
      const url = match[0];
      // Skip if it's a media URL or YouTube (YouTube is handled separately in media section)
      const isYoutube = /youtube\.com\/watch\?v=|youtu\.be\//i.test(url);
      const isMediaUrl = media.some(m => m.url === url && m.type !== 'youtube');

      if (!isYoutube && !isMediaUrl) {
        try {
          const urlObj = new URL(url);
          linkEmbeds.push({ url, domain: urlObj.hostname });
        } catch (e) {
          // Invalid URL, skip
        }
      }
    });

    formatted = textWithoutMedia;

    // Parse Discord markdown
    const parseText = (text: string): React.ReactNode => {
      // Split by different markdown patterns, process in order of precedence
      const parts: React.ReactNode[] = [];
      let remaining = text;
      let key = 0;

      // Helper to process a segment recursively
      const processSegment = (segment: string, depth = 0): React.ReactNode => {
        if (depth > 5) return segment; // Prevent infinite recursion

        // URLs (make them clickable and styled like Discord)
        const urlMatch = segment.match(/(https?:\/\/[^\s]+)/);
        if (urlMatch) {
          const before = segment.substring(0, urlMatch.index);
          const url = urlMatch[1];
          const after = segment.substring(urlMatch.index! + urlMatch[0].length);
          return (
            <>
              {before && processSegment(before, depth + 1)}
              <a
                key={`url-${key++}`}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 hover:underline cursor-pointer"
                onClick={(e) => e.stopPropagation()}
              >
                {url}
              </a>
              {after && processSegment(after, depth + 1)}
            </>
          );
        }

        // Code blocks (highest priority)
        const codeBlockMatch = segment.match(/```([\s\S]*?)```/);
        if (codeBlockMatch) {
          const before = segment.substring(0, codeBlockMatch.index);
          const code = codeBlockMatch[1];
          const after = segment.substring(codeBlockMatch.index! + codeBlockMatch[0].length);
          return (
            <>
              {before && processSegment(before, depth + 1)}
              <pre
                key={`cb-${key++}`}
                className={`block my-1 px-3 py-2 rounded font-mono text-sm overflow-x-auto ${
                  isStaffMessage ? 'bg-indigo-900 text-indigo-100' : 'bg-gray-800 text-gray-100'
                }`}
              >
                {code}
              </pre>
              {after && processSegment(after, depth + 1)}
            </>
          );
        }

        // Inline code
        const codeMatch = segment.match(/`([^`]+)`/);
        if (codeMatch) {
          const before = segment.substring(0, codeMatch.index);
          const code = codeMatch[1];
          const after = segment.substring(codeMatch.index! + codeMatch[0].length);
          return (
            <>
              {before && processSegment(before, depth + 1)}
              <code
                key={`code-${key++}`}
                className={`px-1.5 py-0.5 mx-0.5 rounded text-sm font-mono ${
                  isStaffMessage ? 'bg-indigo-800 text-indigo-100' : 'bg-gray-200 text-gray-900'
                }`}
              >
                {code}
              </code>
              {after && processSegment(after, depth + 1)}
            </>
          );
        }

        // Bold **text** or __text__
        const boldMatch = segment.match(/\*\*([^\*]+)\*\*|__([^_]+)__/);
        if (boldMatch) {
          const before = segment.substring(0, boldMatch.index);
          const text = boldMatch[1] || boldMatch[2];
          const after = segment.substring(boldMatch.index! + boldMatch[0].length);
          return (
            <>
              {before && processSegment(before, depth + 1)}
              <strong key={`bold-${key++}`} className="font-bold">
                {processSegment(text, depth + 1)}
              </strong>
              {after && processSegment(after, depth + 1)}
            </>
          );
        }

        // Italic *text* or _text_ (single asterisk/underscore)
        const italicMatch = segment.match(/(?<!\*)\*([^\*]+)\*(?!\*)|(?<!_)_([^_]+)_(?!_)/);
        if (italicMatch) {
          const before = segment.substring(0, italicMatch.index);
          const text = italicMatch[1] || italicMatch[2];
          const after = segment.substring(italicMatch.index! + italicMatch[0].length);
          return (
            <>
              {before && processSegment(before, depth + 1)}
              <em key={`italic-${key++}`} className="italic">
                {processSegment(text, depth + 1)}
              </em>
              {after && processSegment(after, depth + 1)}
            </>
          );
        }

        // Strikethrough ~~text~~
        const strikeMatch = segment.match(/~~([^~]+)~~/);
        if (strikeMatch) {
          const before = segment.substring(0, strikeMatch.index);
          const text = strikeMatch[1];
          const after = segment.substring(strikeMatch.index! + strikeMatch[0].length);
          return (
            <>
              {before && processSegment(before, depth + 1)}
              <span key={`strike-${key++}`} className="line-through">
                {processSegment(text, depth + 1)}
              </span>
              {after && processSegment(after, depth + 1)}
            </>
          );
        }

        // No markdown found, return as-is
        return segment;
      };

      return processSegment(formatted);
    };

    return (
      <>
        {formatted && <div className="break-words mb-2">{parseText(formatted)}</div>}
        {media.length > 0 && (
          <div className="space-y-2">
            {media.map((item, idx) => {
              if (item.type === 'youtube') {
                return (
                  <iframe
                    key={`yt-${idx}`}
                    width="400"
                    height="225"
                    src={`https://www.youtube.com/embed/${item.embed}`}
                    frameBorder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    className="rounded-lg"
                  />
                );
              }

              if (item.type === 'video') {
                return (
                  <video
                    key={`vid-${idx}`}
                    controls
                    className="max-w-md rounded-lg"
                  >
                    <source src={item.url} />
                    Your browser doesn't support video playback.
                  </video>
                );
              }

              // Default: image
              return (
                <img
                  key={`img-${idx}`}
                  src={item.url}
                  alt="Attachment"
                  className="max-w-sm rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                  onClick={() => window.open(item.url, '_blank')}
                  onError={(e) => {
                    // If image fails to load, hide it
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
              );
            })}
          </div>
        )}
        {linkEmbeds.length > 0 && (
          <div className="space-y-2 mt-2">
            {linkEmbeds.map((link, idx) => (
              <a
                key={`embed-${idx}`}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className={`block border rounded-lg p-3 hover:bg-opacity-80 transition-colors ${
                  isStaffMessage ? 'border-gray-600 bg-gray-800' : 'border-gray-300 bg-gray-100'
                }`}
              >
                <div className="flex items-start space-x-3">
                  <div className={`flex-shrink-0 w-10 h-10 rounded flex items-center justify-center ${
                    isStaffMessage ? 'bg-gray-600' : 'bg-gray-200'
                  }`}>
                    <PaperClipIcon className={`w-5 h-5 ${isStaffMessage ? 'text-gray-300' : 'text-gray-600'}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className={`text-sm font-medium truncate ${
                      isStaffMessage ? 'text-gray-100' : 'text-gray-900'
                    }`}>
                      {link.domain}
                    </div>
                    <div className={`text-xs truncate ${
                      isStaffMessage ? 'text-gray-400' : 'text-gray-500'
                    }`}>
                      {link.url}
                    </div>
                  </div>
                </div>
              </a>
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
                // Combine real messages with optimistic messages
                const allMessages = [...messages, ...optimisticMessages];

                // Group messages by user and time
                const messageGroups: Array<{ messages: Message[], user: any, isStaff: boolean }> = [];

                allMessages.forEach((message, index) => {
                  const prevMessage = index > 0 ? allMessages[index - 1] : null;
                  const timeDiff = prevMessage ? (new Date(message.createdAt).getTime() - new Date(prevMessage.createdAt).getTime()) : Infinity;

                  // Check if message contains media (images, videos, YouTube)
                  const hasMedia = /https?:\/\/\S+?\.(jpg|jpeg|png|gif|webp|bmp|svg|mp4|webm|mov|avi|mkv)(\?\S*)?/gi.test(message.content) ||
                                   /youtube\.com\/watch\?v=|youtu\.be\//gi.test(message.content);

                  // Never group messages with media - they always show separately
                  const shouldGroup = !hasMedia && prevMessage &&
                    prevMessage.userId === message.userId &&
                    timeDiff < 120000 && // 2 minutes
                    // Also check previous message doesn't have media
                    !/https?:\/\/\S+?\.(jpg|jpeg|png|gif|webp|bmp|svg|mp4|webm|mov|avi|mkv)(\?\S*)?/gi.test(prevMessage.content) &&
                    !/youtube\.com\/watch\?v=|youtu\.be\//gi.test(prevMessage.content);

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
                  let avatarUrl: string | null = null;
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
                              ? 'bg-gray-700 text-white rounded-2xl px-4 py-2 space-y-1'
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
          {/* Attachment URL input */}
          {attachmentUrl && (
            <div className="mb-3 flex items-center gap-2 px-3 py-2 bg-indigo-50 rounded-lg border border-indigo-200">
              <PhotoIcon className="w-5 h-5 text-indigo-600 flex-shrink-0" />
              <input
                type="text"
                value={attachmentUrl}
                onChange={(e) => setAttachmentUrl(e.target.value)}
                placeholder="Paste image/file URL..."
                className="flex-1 bg-transparent text-sm text-gray-700 outline-none"
              />
              <button
                type="button"
                onClick={() => setAttachmentUrl('')}
                className="text-gray-400 hover:text-gray-600"
              >
                <XMarkIcon className="w-4 h-4" />
              </button>
            </div>
          )}
          <div className="flex items-end space-x-2">
            <button
              type="button"
              onClick={() => {
                if (!attachmentUrl) {
                  const url = prompt('Paste image/file URL:');
                  if (url) setAttachmentUrl(url);
                }
              }}
              className="px-3 py-3 text-gray-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-colors"
              title="Add image/file"
            >
              <PhotoIcon className="w-5 h-5" />
            </button>
            <textarea
              ref={inputRef}
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onPaste={handlePaste}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage(e);
                }
              }}
              placeholder="Type your message... (Shift+Enter for new line, Ctrl+V to paste image)"
              className="flex-1 px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none min-h-[44px] max-h-32"
              rows={1}
              disabled={sending || uploading}
            />
            <button
              type="submit"
              disabled={(!newMessage.trim() && !attachmentUrl.trim()) || sending}
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
