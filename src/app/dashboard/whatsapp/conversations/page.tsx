'use client';

import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  MessageSquare,
  Send,
  Search,
  Phone,
  Clock,
  CheckCheck,
  Check,
  AlertCircle,
  Loader2,
  Plus,
  MoreVertical,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface Message {
  id: string;
  from: string;
  to: string;
  content: string;
  type: 'text' | 'image' | 'document' | 'audio';
  status: 'sent' | 'delivered' | 'read' | 'failed';
  timestamp: string;
  isOwn: boolean;
  senderName?: string;
}

interface Conversation {
  id: string;
  phoneNumber: string;
  contactName: string;
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
  status: 'active' | 'inactive';
  avatar?: string;
}

export default function ConversationsPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageInput, setMessageInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Mock data - Replace with actual API calls
  useEffect(() => {
    const mockConversations: Conversation[] = [
      {
        id: '1',
        phoneNumber: '+212625061444',
        contactName: 'Mère de Ahmed',
        lastMessage: 'Merci pour la notification',
        lastMessageTime: '10:30',
        unreadCount: 0,
        status: 'active',
      },
      {
        id: '2',
        phoneNumber: '+212612345678',
        contactName: 'Père de Fatima',
        lastMessage: 'Quand est le prochain examen ?',
        lastMessageTime: 'Hier',
        unreadCount: 2,
        status: 'active',
      },
      {
        id: '3',
        phoneNumber: '+212698765432',
        contactName: 'Parent de Mohamed',
        lastMessage: 'D\'accord, merci',
        lastMessageTime: '2 jours',
        unreadCount: 0,
        status: 'inactive',
      },
    ];

    setConversations(mockConversations);
    setSelectedConversation(mockConversations[0]);
    setLoading(false);
  }, []);

  // Load messages for selected conversation
  useEffect(() => {
    if (!selectedConversation) return;

    const mockMessages: Message[] = [
      {
        id: '1',
        from: 'system',
        to: selectedConversation.phoneNumber,
        content: 'Bonjour, votre enfant a été marqué absent aujourd\'hui.',
        type: 'text',
        status: 'delivered',
        timestamp: '09:00',
        isOwn: true,
      },
      {
        id: '2',
        from: selectedConversation.phoneNumber,
        to: 'system',
        content: 'Merci pour la notification. Il était malade ce matin.',
        type: 'text',
        status: 'read',
        timestamp: '09:15',
        isOwn: false,
        senderName: selectedConversation.contactName,
      },
      {
        id: '3',
        from: 'system',
        to: selectedConversation.phoneNumber,
        content: 'Nous avons bien noté. Nous espérons son rétablissement rapide.',
        type: 'text',
        status: 'delivered',
        timestamp: '09:16',
        isOwn: true,
      },
      {
        id: '4',
        from: selectedConversation.phoneNumber,
        to: 'system',
        content: 'Merci pour la notification',
        type: 'text',
        status: 'read',
        timestamp: '10:30',
        isOwn: false,
        senderName: selectedConversation.contactName,
      },
    ];

    setMessages(mockMessages);
    scrollToBottom();
  }, [selectedConversation]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async () => {
    if (!messageInput.trim() || !selectedConversation) return;

    setSending(true);

    // Simulate sending message
    const newMessage: Message = {
      id: Date.now().toString(),
      from: 'system',
      to: selectedConversation.phoneNumber,
      content: messageInput,
      type: 'text',
      status: 'sent',
      timestamp: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
      isOwn: true,
    };

    setMessages([...messages, newMessage]);
    setMessageInput('');
    setSending(false);
    scrollToBottom();

    // In production, send to API
    // await fetch('/api/whatsapp/send-message', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify({
    //     to: selectedConversation.phoneNumber,
    //     message: messageInput,
    //   }),
    // });
  };

  const filteredConversations = conversations.filter(
    (conv) =>
      conv.contactName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      conv.phoneNumber.includes(searchQuery)
  );

  const getStatusIcon = (status: Message['status']) => {
    switch (status) {
      case 'sent':
        return <Check className="w-4 h-4 text-slate-400" />;
      case 'delivered':
        return <CheckCheck className="w-4 h-4 text-slate-400" />;
      case 'read':
        return <CheckCheck className="w-4 h-4 text-blue-500" />;
      case 'failed':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      default:
        return null;
    }
  };

  return (
    <div className="flex h-screen gap-4 p-4 bg-slate-50">
      {/* Conversations List */}
      <div className="w-80 flex flex-col bg-white rounded-lg shadow-sm border border-slate-200">
        <div className="p-4 border-b border-slate-200">
          <h2 className="text-lg font-bold text-slate-900 mb-3">Conversations</h2>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Rechercher..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        <ScrollArea className="flex-1">
          <div className="space-y-1 p-2">
            {filteredConversations.map((conv) => (
              <button
                key={conv.id}
                onClick={() => setSelectedConversation(conv)}
                className={cn(
                  'w-full text-left p-3 rounded-lg transition-colors',
                  selectedConversation?.id === conv.id
                    ? 'bg-green-50 border-l-4 border-green-600'
                    : 'hover:bg-slate-50'
                )}
              >
                <div className="flex items-start justify-between mb-1">
                  <h3 className="font-semibold text-slate-900 truncate">{conv.contactName}</h3>
                  {conv.unreadCount > 0 && (
                    <Badge className="bg-green-600 text-white text-xs">{conv.unreadCount}</Badge>
                  )}
                </div>
                <p className="text-sm text-slate-600 truncate">{conv.lastMessage}</p>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-xs text-slate-500">{conv.lastMessageTime}</span>
                  <Badge
                    variant="outline"
                    className={cn(
                      'text-xs',
                      conv.status === 'active' ? 'border-green-200 text-green-700' : 'border-slate-200 text-slate-600'
                    )}
                  >
                    {conv.status === 'active' ? '🟢 Actif' : '⚫ Inactif'}
                  </Badge>
                </div>
              </button>
            ))}
          </div>
        </ScrollArea>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col bg-white rounded-lg shadow-sm border border-slate-200">
        {selectedConversation ? (
          <>
            {/* Chat Header */}
            <div className="p-4 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-900">{selectedConversation.contactName}</h2>
                <p className="text-sm text-slate-600">{selectedConversation.phoneNumber}</p>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon">
                  <Phone className="w-5 h-5" />
                </Button>
                <Button variant="ghost" size="icon">
                  <MoreVertical className="w-5 h-5" />
                </Button>
              </div>
            </div>

            {/* Messages */}
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-4">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={cn('flex gap-2', msg.isOwn ? 'justify-end' : 'justify-start')}
                  >
                    <div
                      className={cn(
                        'max-w-xs px-4 py-2 rounded-lg',
                        msg.isOwn
                          ? 'bg-green-600 text-white rounded-br-none'
                          : 'bg-slate-100 text-slate-900 rounded-bl-none'
                      )}
                    >
                      <p className="text-sm">{msg.content}</p>
                      <div className="flex items-center justify-between gap-2 mt-1">
                        <span className="text-xs opacity-70">{msg.timestamp}</span>
                        {msg.isOwn && getStatusIcon(msg.status)}
                      </div>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>

            {/* Input Area */}
            <div className="p-4 border-t border-slate-200">
              <div className="flex gap-2">
                <Input
                  placeholder="Tapez votre message..."
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  disabled={sending}
                />
                <Button
                  onClick={handleSendMessage}
                  disabled={!messageInput.trim() || sending}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {sending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <MessageSquare className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-600">Sélectionnez une conversation pour commencer</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
