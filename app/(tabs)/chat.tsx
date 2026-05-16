import { API_BASE_URL } from '@/constants/api';
import { useAuth } from '@/contexts/auth-context';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type ChatMessage = {
  id: string;
  senderId: string;
  content: string;
  createdAt: string;
};

export default function ChatScreen() {
  const router = useRouter();
  const { conversationId, title } = useLocalSearchParams<{
    conversationId?: string;
    title?: string;
  }>();
  const { token, user } = useAuth();
  const [messages, setMessages] = React.useState<ChatMessage[]>([]);
  const [draft, setDraft] = React.useState('');
  const [statusMessage, setStatusMessage] = React.useState('');

  const apiFetch = React.useCallback(
    async (path: string, options: RequestInit = {}) => {
      const response = await fetch(`${API_BASE_URL}${path}`, {
        ...options,
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          ...options.headers,
        },
      });
      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(data?.message ?? data?.error ?? `Request failed with status ${response.status}`);
      }

      return data;
    },
    [token]
  );

  const loadMessages = React.useCallback(async () => {
    if (!conversationId || !token) {
      return;
    }

    try {
      const data = await apiFetch(`/social/conversations/${conversationId}/messages`);
      setMessages(data.messages ?? []);
      setStatusMessage('');
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : 'Could not load messages');
    }
  }, [apiFetch, conversationId, token]);

  React.useEffect(() => {
    loadMessages();
    const interval = setInterval(loadMessages, 4000);

    return () => clearInterval(interval);
  }, [loadMessages]);

  const sendMessage = async () => {
    const content = draft.trim();

    if (!content || !conversationId) {
      return;
    }

    setDraft('');

    try {
      const data = await apiFetch(`/social/conversations/${conversationId}/messages`, {
        method: 'POST',
        body: JSON.stringify({ content }),
      });
      setMessages((currentMessages) => [...currentMessages, data.message]);
      setStatusMessage('');
    } catch (error) {
      setDraft(content);
      setStatusMessage(error instanceof Error ? error.message : 'Message could not be sent');
    }
  };

  return (
    <SafeAreaView style={styles.screen}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()} activeOpacity={0.8}>
            <Ionicons name="chevron-back" size={24} color="#ffffff" />
          </TouchableOpacity>
          <Text style={styles.title} numberOfLines={1}>{title ?? 'Chat'}</Text>
        </View>

        <ScrollView
          contentContainerStyle={styles.messagesContent}
          showsVerticalScrollIndicator={false}
        >
          {messages.map((message) => {
            const isMine = message.senderId === user?.backendId;

            return (
              <View
                key={message.id}
                style={[
                  styles.messageBubble,
                  isMine ? styles.myMessageBubble : styles.theirMessageBubble,
                ]}
              >
                <Text style={[styles.messageText, isMine ? styles.myMessageText : styles.theirMessageText]}>
                  {message.content}
                </Text>
                <Text style={[styles.messageTime, isMine ? styles.myMessageTime : styles.theirMessageTime]}>
                  {new Date(message.createdAt).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </Text>
              </View>
            );
          })}

          {!messages.length ? <Text style={styles.emptyText}>No messages yet</Text> : null}
        </ScrollView>

        {statusMessage ? <Text style={styles.statusText}>{statusMessage}</Text> : null}

        <View style={styles.composer}>
          <TextInput
            value={draft}
            onChangeText={setDraft}
            placeholder="Message"
            placeholderTextColor="#64748b"
            style={styles.input}
            multiline
          />
          <TouchableOpacity style={styles.sendButton} onPress={sendMessage} activeOpacity={0.85}>
            <Ionicons name="send" size={18} color="#ffffff" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#a9b2bd',
  },

  keyboardView: {
    flex: 1,
  },

  header: {
    height: 58,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    gap: 10,
  },

  backButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#1f5d86',
    alignItems: 'center',
    justifyContent: 'center',
  },

  title: {
    flex: 1,
    color: '#0f172a',
    fontSize: 20,
    fontWeight: '900',
  },

  messagesContent: {
    flexGrow: 1,
    paddingHorizontal: 12,
    paddingBottom: 16,
    justifyContent: 'flex-end',
  },

  messageBubble: {
    maxWidth: '82%',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 8,
  },

  myMessageBubble: {
    alignSelf: 'flex-end',
    backgroundColor: '#1f5d86',
  },

  theirMessageBubble: {
    alignSelf: 'flex-start',
    backgroundColor: '#ffffff',
  },

  messageText: {
    fontSize: 14,
    lineHeight: 19,
    fontWeight: '700',
  },

  myMessageText: {
    color: '#ffffff',
  },

  theirMessageText: {
    color: '#0f172a',
  },

  messageTime: {
    fontSize: 10,
    fontWeight: '700',
    marginTop: 4,
    textAlign: 'right',
  },

  myMessageTime: {
    color: '#dbeafe',
  },

  theirMessageTime: {
    color: '#64748b',
  },

  emptyText: {
    alignSelf: 'center',
    color: '#334155',
    fontSize: 13,
    fontWeight: '700',
  },

  statusText: {
    color: '#b91c1c',
    fontSize: 12,
    fontWeight: '800',
    paddingHorizontal: 12,
    paddingBottom: 6,
  },

  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 12,
    backgroundColor: '#a9b2bd',
  },

  input: {
    flex: 1,
    minHeight: 42,
    maxHeight: 96,
    borderRadius: 8,
    backgroundColor: '#ffffff',
    color: '#0f172a',
    fontSize: 14,
    fontWeight: '700',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },

  sendButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#1f5d86',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
