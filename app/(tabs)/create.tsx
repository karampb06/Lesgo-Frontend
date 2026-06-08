import { ENV } from '@/constants/env';
import { useAuth } from '@/contexts/auth-context';
import { useHangoutPlans } from '@/contexts/hangout-plans-context';
import { AppTheme, useAppTheme } from '@/contexts/theme-context';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import {
  ActivityIndicator,
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
  role: 'user' | 'assistant';
  content: string;
};

type AgentPlan = {
  id?: string;
  title?: string;
  location?: string;
  scheduledAt?: string;
  dateTimeLabel?: string;
  participants?: string[];
};

// Older AI suggestions screen. The newer smart planning flow lives in plans.tsx.
export default function AiSuggestionsScreen() {
  const { theme } = useAppTheme();
  const styles = React.useMemo(() => createStyles(theme), [theme]);
  const { token } = useAuth();
  const { addPlan } = useHangoutPlans();
  const scrollRef = React.useRef<ScrollView>(null);
  const hasStartedConversationRef = React.useRef(false);
  const [conversationId, setConversationId] = React.useState<string | null>(null);
  const [messages, setMessages] = React.useState<ChatMessage[]>([]);
  const [input, setInput] = React.useState('');
  const [statusMessage, setStatusMessage] = React.useState('');
  const [isStarting, setIsStarting] = React.useState(false);
  const [isSending, setIsSending] = React.useState(false);

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

  const startConversation = React.useCallback(async () => {
    if (!token || conversationId || isStarting || hasStartedConversationRef.current) {
      return;
    }

    hasStartedConversationRef.current = true;
    setIsStarting(true);
    setStatusMessage('');

    try {
      const data = await apiFetch('/agent/conversation/start', { method: 'POST' });
      setConversationId(data.conversationId);
      setMessages([
        {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          content: data.reply ?? 'Tell me what you want to plan.',
        },
      ]);
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : 'Could not start AI planner');
    } finally {
      setIsStarting(false);
    }
  }, [apiFetch, conversationId, isStarting, token]);

  React.useEffect(() => {
    startConversation();
  }, [startConversation]);

  React.useEffect(() => {
    scrollRef.current?.scrollToEnd({ animated: true });
  }, [messages, isSending]);

  const saveCreatedPlan = (plan?: AgentPlan) => {
    if (!plan?.id) {
      return;
    }

    addPlan({
      id: plan.id,
      title: plan.title ?? 'AI plan',
      location: plan.location ?? 'Selected place',
      scheduledAt: plan.scheduledAt ?? '',
      dateTimeLabel: plan.dateTimeLabel ?? '',
      participants: plan.participants ?? [],
    });
  };

  const sendMessage = async () => {
    const trimmedInput = input.trim();

    if (!trimmedInput || isSending) {
      return;
    }

    if (!conversationId) {
      setStatusMessage('AI planner is still starting.');
      return;
    }

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: trimmedInput,
    };

    setMessages((currentMessages) => [...currentMessages, userMessage]);
    setInput('');
    setIsSending(true);
    setStatusMessage('');

    try {
      const data = await apiFetch('/agent/chat', {
        method: 'POST',
        body: JSON.stringify({
          conversationId,
          message: trimmedInput,
        }),
      });

      saveCreatedPlan(data.plan);
      setMessages((currentMessages) => [
        ...currentMessages,
        {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          content: data.reply ?? 'I could not process that message.',
        },
      ]);
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : 'AI planner failed');
      setMessages((currentMessages) => [
        ...currentMessages,
        {
          id: `assistant-error-${Date.now()}`,
          role: 'assistant',
          content: error instanceof Error ? error.message : 'AI planner failed',
        },
      ]);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        <View style={styles.header}>
          <View style={styles.iconCircle}>
            <Ionicons name="sparkles-outline" size={24} color="#ffffff" />
          </View>
          <View style={styles.headerText}>
            <Text style={styles.title}>AI Planner</Text>
            <Text style={styles.subtitle}>Natural language plans</Text>
          </View>
          {isStarting ? <ActivityIndicator color="#1f5d86" /> : null}
        </View>

        <ScrollView
          ref={scrollRef}
          contentContainerStyle={styles.messages}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {messages.map((message) => {
            const isUser = message.role === 'user';

            return (
              <View
                key={message.id}
                style={[styles.messageBubble, isUser ? styles.userBubble : styles.assistantBubble]}
              >
                <Text style={[styles.messageText, isUser ? styles.userMessageText : styles.assistantMessageText]}>
                  {message.content}
                </Text>
              </View>
            );
          })}

          {isSending ? (
            <View style={[styles.messageBubble, styles.assistantBubble, styles.loadingBubble]}>
              <ActivityIndicator color="#1f5d86" />
            </View>
          ) : null}
        </ScrollView>

        {statusMessage ? <Text style={styles.statusText}>{statusMessage}</Text> : null}

        <View style={styles.composer}>
          <TextInput
            value={input}
            onChangeText={setInput}
            placeholder="Plan coffee with Aman tomorrow evening"
            placeholderTextColor="#748094"
            style={styles.input}
            multiline
            editable={!isSending}
          />
          <TouchableOpacity
            style={[styles.sendButton, (!input.trim() || isSending) && styles.disabledButton]}
            onPress={sendMessage}
            disabled={!input.trim() || isSending}
            activeOpacity={0.85}
          >
            <Ionicons name="send" size={20} color="#ffffff" />
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
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 14,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },

  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },

  headerText: {
    flex: 1,
  },

  title: {
    color: theme.colors.text,
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '900',
  },

  subtitle: {
    color: theme.colors.textMuted,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '700',
  },

  messages: {
    paddingHorizontal: 16,
    paddingVertical: 18,
    gap: 12,
  },

  messageBubble: {
    maxWidth: '86%',
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },

  userBubble: {
    alignSelf: 'flex-end',
    backgroundColor: theme.colors.primary,
    borderBottomRightRadius: 6,
  },

  assistantBubble: {
    alignSelf: 'flex-start',
    backgroundColor: theme.colors.surface,
    borderBottomLeftRadius: 6,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },

  loadingBubble: {
    minWidth: 58,
    alignItems: 'center',
  },

  messageText: {
    fontSize: 15,
    lineHeight: 21,
    fontWeight: '700',
  },

  userMessageText: {
    color: '#ffffff',
  },

  assistantMessageText: {
    color: theme.colors.text,
  },

  statusText: {
    color: theme.colors.danger,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '700',
    paddingHorizontal: 18,
    paddingBottom: 8,
  },

  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 10,
    backgroundColor: theme.colors.surface,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },

  input: {
    flex: 1,
    maxHeight: 112,
    minHeight: 46,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surfaceMuted,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: theme.colors.text,
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '700',
  },

  sendButton: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },

  disabledButton: {
    opacity: 0.5,
  },
});
