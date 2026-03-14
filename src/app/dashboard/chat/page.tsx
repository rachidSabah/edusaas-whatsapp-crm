'use client';

import { useEffect, useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import {
  MessageSquare,
  Send,
  User,
  Users,
  Loader2,
  Circle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface Message {
  id: string;
  senderId: string;
  senderName: string;
  senderRole: string;
  receiverId: string | null;
  receiverName: string | null;
  content: string;
  createdAt: string;
  isRead: number;
  isCurrentUser: boolean;
}

interface ChatUser {
  id: string;
  name: string;
  role: string;
  lastMessage?: string;
  lastMessageTime?: string;
  unreadCount?: number;
}

export default function ChatPage() {
  const [users, setUsers] = useState<ChatUser[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [selectedUser, setSelectedUser] = useState<ChatUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [messageInput, setMessageInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    if (selectedUser) {
      fetchMessages();
    }
  }, [selectedUser?.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/chat?users=true');
      const data = await response.json();
      setUsers(data.users || []);
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async () => {
    if (!selectedUser) return;
    try {
      const response = await fetch(`/api/chat?with=${selectedUser.id}`);
      const data = await response.json();
      setMessages(data.messages || []);
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageInput.trim() || !selectedUser) return;

    setSending(true);
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          receiverId: selectedUser.id,
          content: messageInput,
        }),
      });

      if (response.ok) {
        setMessageInput('');
        fetchMessages();
      }
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setSending(false);
    }
  };

  const getRoleBadge = (role: string) => {
    const colors: Record<string, string> = {
      SUPER_ADMIN: 'bg-purple-100 text-purple-700',
      ORG_ADMIN: 'bg-blue-100 text-blue-700',
      SCHOOL_MANAGER: 'bg-indigo-100 text-indigo-700',
      TEACHER: 'bg-green-100 text-green-700',
      USER: 'bg-slate-100 text-slate-700',
    };
    return (
      <Badge className={colors[role] || colors.USER} variant="secondary">
        {role === 'SUPER_ADMIN' ? 'Admin' : role === 'ORG_ADMIN' ? 'Admin' : role === 'SCHOOL_MANAGER' ? 'Manager' : role === 'TEACHER' ? 'Prof' : 'User'}
      </Badge>
    );
  };

  return (
    <div className="h-[calc(100vh-10rem)]">
      <div className="grid grid-cols-12 gap-4 h-full">
        {/* Users List */}
        <Card className="col-span-4 border-0 shadow-md flex flex-col h-full">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <Users className="w-5 h-5 text-green-600" />
                Contacts
              </CardTitle>
              <Badge variant="secondary">{users.length}</Badge>
            </div>
          </CardHeader>
          <CardContent className="flex-1 overflow-hidden p-0">
            <ScrollArea className="h-full">
              {loading ? (
                <div className="p-4 text-center">
                  <Loader2 className="w-6 h-6 mx-auto animate-spin text-green-600" />
                </div>
              ) : users.length === 0 ? (
                <div className="p-8 text-center text-slate-500">
                  <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>Aucun contact</p>
                </div>
              ) : (
                users.map((chatUser) => (
                  <div
                    key={chatUser.id}
                    onClick={() => setSelectedUser(chatUser)}
                    className={cn(
                      'p-4 border-b cursor-pointer hover:bg-slate-50 transition',
                      selectedUser?.id === chatUser.id && 'bg-green-50'
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <Avatar className="w-10 h-10">
                        <AvatarFallback className="bg-green-100 text-green-700">
                          {chatUser.name?.charAt(0) || '?'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="font-medium text-slate-900 truncate">
                            {chatUser.name}
                          </p>
                          {chatUser.unreadCount && chatUser.unreadCount > 0 && (
                            <Badge className="bg-green-600">
                              {chatUser.unreadCount}
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          {getRoleBadge(chatUser.role)}
                        </div>
                        {chatUser.lastMessage && (
                          <p className="text-sm text-slate-500 truncate mt-1">
                            {chatUser.lastMessage}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Chat Area */}
        <Card className="col-span-8 border-0 shadow-md flex flex-col h-full">
          {selectedUser ? (
            <>
              {/* Chat Header */}
              <CardHeader className="pb-3 border-b">
                <div className="flex items-center gap-3">
                  <Avatar>
                    <AvatarFallback className="bg-green-100 text-green-700">
                      {selectedUser.name?.charAt(0) || '?'}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">{selectedUser.name}</p>
                    <div className="flex items-center gap-2">
                      {getRoleBadge(selectedUser.role)}
                      <Circle className="w-2 h-2 fill-green-500 text-green-500" />
                      <span className="text-xs text-slate-500">En ligne</span>
                    </div>
                  </div>
                </div>
              </CardHeader>

              {/* Messages */}
              <CardContent className="flex-1 overflow-hidden p-0">
                <ScrollArea className="h-full p-4">
                  <div className="space-y-4">
                    {messages.length === 0 ? (
                      <div className="text-center py-8 text-slate-500">
                        <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-50" />
                        <p>Commencez la conversation</p>
                      </div>
                    ) : (
                      messages.map((message) => (
                        <div
                          key={message.id}
                          className={cn(
                            'flex gap-2',
                            message.isCurrentUser ? 'justify-end' : 'justify-start'
                          )}
                        >
                          {!message.isCurrentUser && (
                            <Avatar className="w-8 h-8">
                              <AvatarFallback className="bg-slate-100 text-slate-600 text-xs">
                                {message.senderName?.charAt(0) || '?'}
                              </AvatarFallback>
                            </Avatar>
                          )}
                          <div
                            className={cn(
                              'max-w-[70%] rounded-lg px-4 py-2',
                              message.isCurrentUser
                                ? 'bg-green-600 text-white'
                                : 'bg-slate-100 text-slate-900'
                            )}
                          >
                            <p className="text-sm">{message.content}</p>
                            <p
                              className={cn(
                                'text-xs mt-1',
                                message.isCurrentUser ? 'text-green-100' : 'text-slate-500'
                              )}
                            >
                              {format(new Date(message.createdAt), 'HH:mm', { locale: fr })}
                            </p>
                          </div>
                          {message.isCurrentUser && (
                            <Avatar className="w-8 h-8">
                              <AvatarFallback className="bg-green-100 text-green-600 text-xs">
                                Vous
                              </AvatarFallback>
                            </Avatar>
                          )}
                        </div>
                      ))
                    )}
                    <div ref={messagesEndRef} />
                  </div>
                </ScrollArea>
              </CardContent>

              {/* Input Area */}
              <div className="p-4 border-t">
                <form onSubmit={handleSendMessage} className="flex gap-2">
                  <Input
                    placeholder="Tapez votre message..."
                    value={messageInput}
                    onChange={(e) => setMessageInput(e.target.value)}
                    className="flex-1"
                  />
                  <Button
                    type="submit"
                    disabled={sending || !messageInput.trim()}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    {sending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                  </Button>
                </form>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-slate-500">
              <div className="text-center">
                <MessageSquare className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p>Sélectionnez un contact pour commencer</p>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
