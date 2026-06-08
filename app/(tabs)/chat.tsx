import { ENV } from '@/constants/env';
import { useAuth } from '@/contexts/auth-context';
import { AppTheme, useAppTheme } from '@/contexts/theme-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
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
  const { theme } = useAppTheme();
  const styles = React.useMemo(() => createStyles(theme), [theme]);
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
      const response = await fetch(`${ENV.API_BASE_URL}${path}`, {
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

  useFocusEffect(
    React.useCallback(() => {
      loadMessages();
    }, [loadMessages])
  );

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
      loadMessages();
    } catch (error) {
      setDraft(content);
      setStatusMessage(error instanceof Error ? error.message : 'Message could not be sent');
    }
  };

  return (
    <SafeAreaView style={styles.screen}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()} activeOpacity={0.8}>
            <Ionicons name="chevron-back" size={20} color="#1f5d86" />
          </TouchableOpacity>
          <View style={styles.headerCopy}>
            <Text style={styles.title} numberOfLines={1}>{title ?? 'Chat'}</Text>
            <Text style={styles.subtitle} numberOfLines={1}>Direct chat</Text>
          </View>
        </View>

        <ScrollView
          style={styles.messagesScroll}
          contentContainerStyle={styles.messagesContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
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
            <Text style={styles.sendButtonText}>Send</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const createStyles = (theme: AppTheme) => StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },

  keyboardView: {
    flex: 1,
  },

  header: {
    minHeight: 50,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: theme.colors.surface,
  },

  backButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: theme.colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },

  headerCopy: {
    flex: 1,
  },

  title: {
    color: theme.colors.text,
    fontSize: 13,
    fontWeight: '900',
  },

  subtitle: {
    color: theme.colors.textMuted,
    fontSize: 10,
    fontWeight: '700',
    marginTop: 1,
  },

  messagesScroll: {
    flex: 1,
  },

  messagesContent: {
    flexGrow: 1,
    paddingHorizontal: 12,
    paddingTop: 14,
    paddingBottom: 12,
    justifyContent: 'flex-end',
  },

  messageBubble: {
    maxWidth: '74%',
    borderRadius: 3,
    paddingHorizontal: 10,
    paddingVertical: 7,
    marginBottom: 12,
  },

  myMessageBubble: {
    alignSelf: 'flex-end',
    backgroundColor: theme.colors.success,
  },

  theirMessageBubble: {
    alignSelf: 'flex-start',
    backgroundColor: theme.colors.primary,
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
    color: '#ffffff',
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
    color: '#d1fae5',
  },

  emptyText: {
    alignSelf: 'center',
    color: theme.colors.textMuted,
    fontSize: 13,
    fontWeight: '700',
  },

  statusText: {
    color: theme.colors.danger,
    fontSize: 12,
    fontWeight: '800',
    paddingHorizontal: 12,
    paddingBottom: 6,
  },

  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    paddingHorizontal: 10,
    paddingTop: 8,
    paddingBottom: 10,
    backgroundColor: theme.colors.surface,
  },

  input: {
    flex: 1,
    minHeight: 34,
    maxHeight: 88,
    borderRadius: 4,
    backgroundColor: theme.colors.surfaceMuted,
    color: theme.colors.text,
    fontSize: 12,
    fontWeight: '700',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },

  sendButton: {
    width: 58,
    minHeight: 34,
    borderRadius: 4,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },

  sendButtonText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '900',
  },
});
