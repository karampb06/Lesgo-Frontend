import { ENV } from '@/constants/env';
import { useAuth } from '@/contexts/auth-context';
import { AppTheme, useAppTheme } from '@/contexts/theme-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import React from 'react';
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type UserSummary = {
  id: string;
  friendCode?: string;
  name: string;
  email: string;
  profilePicture?: string | null;
};

type Friendship = {
  id: string;
  status: string;
  friend?: UserSummary;
  requester?: UserSummary;
};

type Conversation = {
  id: string;
  type: 'direct' | 'group';
  title?: string;
  participants: UserSummary[];
  updatedAt?: string;
};

type ChatRow = {
  id: string;
  title: string;
  subtitle: string;
  initials: string;
  conversationId?: string;
  friend?: UserSummary;
  updatedAt?: string;
  type: 'direct' | 'group';
};

export default function MessagesScreen() {
  const { theme } = useAppTheme();
  const styles = React.useMemo(() => createStyles(theme), [theme]);
  const router = useRouter();
  const { token, user } = useAuth();
  const [friendCode, setFriendCode] = React.useState('');
  const [friends, setFriends] = React.useState<Friendship[]>([]);
  const [conversations, setConversations] = React.useState<Conversation[]>([]);
  const [statusMessage, setStatusMessage] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(false);
  const [isAddFriendVisible, setIsAddFriendVisible] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState<'all' | 'groups'>('all');

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

  const loadSocialData = React.useCallback(async () => {
    if (!token) {
      return;
    }

    setIsLoading(true);
    try {
      const [friendsData, conversationsData] = await Promise.all([
        apiFetch('/social/friends'),
        apiFetch('/social/conversations'),
      ]);

      setFriends(friendsData.friends ?? []);
      setConversations(conversationsData.conversations ?? []);
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : 'Could not load chats');
    } finally {
      setIsLoading(false);
    }
  }, [apiFetch, token]);

  React.useEffect(() => {
    loadSocialData();
  }, [loadSocialData]);

  useFocusEffect(
    React.useCallback(() => {
      loadSocialData();
    }, [loadSocialData])
  );

  const sendFriendRequest = async () => {
    if (!friendCode.trim()) {
      setStatusMessage('Friend code is required');
      return;
    }

    try {
      await apiFetch('/social/friends/request', {
        method: 'POST',
        body: JSON.stringify({ friendCode }),
      });
      setFriendCode('');
      setStatusMessage('Friend request sent');
      loadSocialData();
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : 'Friend request failed');
    }
  };

  const startChat = async (friend: UserSummary) => {
    try {
      const data = await apiFetch('/social/conversations/direct', {
        method: 'POST',
        body: JSON.stringify({ friendId: friend.id }),
      });

      router.push({
        pathname: '/(tabs)/chat',
        params: {
          conversationId: data.conversation.id,
          title: friend.name,
        },
      });
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : 'Could not open chat');
    }
  };

  const getConversationFriend = React.useCallback(
    (conversation: Conversation) =>
      conversation.participants.find((participant) => participant.id !== user?.backendId),
    [user?.backendId]
  );

  const chatRows = React.useMemo(() => {
    const conversationRows: ChatRow[] = conversations.map((conversation) => {
      const friend = conversation.type === 'direct' ? getConversationFriend(conversation) : undefined;
      const groupParticipants = conversation.participants
        .filter((participant) => participant.id !== user?.backendId)
        .map((participant) => participant.name);
      const groupParticipantTitle = groupParticipants.join(', ');
      const title =
        conversation.type === 'group'
          ? conversation.title ?? (groupParticipantTitle || 'Hangout group')
          : friend?.name ?? 'Chat';

      return {
        id: `conversation-${conversation.id}`,
        title,
        subtitle:
          conversation.type === 'group'
            ? 'Hangout group chat'
            : conversation.updatedAt
              ? new Date(conversation.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
              : 'Tap to continue',
        initials: getInitials(title),
        conversationId: conversation.id,
        updatedAt: conversation.updatedAt,
        type: conversation.type,
      };
    });
    const conversationFriendIds = new Set(
      conversations.map(getConversationFriend).filter(Boolean).map((friend) => friend?.id)
    );
    const friendRows: ChatRow[] = friends
      .map((friendship) => friendship.friend)
      .filter((friend): friend is UserSummary => Boolean(friend && !conversationFriendIds.has(friend.id)))
      .map((friend) => ({
        id: `friend-${friend.id}`,
        title: friend.name,
        subtitle: friend.friendCode ?? 'Start a chat',
        initials: getInitials(friend.name),
        friend,
        type: 'direct',
      }));

    const visibleRows = [...conversationRows, ...friendRows].filter((row) =>
      activeTab === 'groups' ? row.type === 'group' : row.type === 'direct'
    );

    return visibleRows.sort((first, second) => {
      const firstDate = first.updatedAt ? new Date(first.updatedAt).getTime() : 0;
      const secondDate = second.updatedAt ? new Date(second.updatedAt).getTime() : 0;

      return secondDate - firstDate;
    });
  }, [activeTab, conversations, friends, getConversationFriend, user?.backendId]);

  const openChatRow = (row: ChatRow) => {
    if (row.conversationId) {
      router.push({
        pathname: '/(tabs)/chat',
        params: {
          conversationId: row.conversationId,
          title: row.title,
        },
      });
      return;
    }

    if (row.friend) {
      startChat(row.friend);
    }
  };

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.content}>
        <View style={styles.headerRow}>
          <Text style={styles.title}>CHATS</Text>
          <TouchableOpacity
            style={styles.iconButton}
            onPress={() => setIsAddFriendVisible(true)}
            activeOpacity={0.85}
          >
            <Ionicons name="add" size={24} color="#ffffff" />
          </TouchableOpacity>
        </View>

        <View style={styles.segmentedControl}>
          <TouchableOpacity
            style={[styles.segmentButton, activeTab === 'all' && styles.activeSegmentButton]}
            onPress={() => setActiveTab('all')}
            activeOpacity={0.85}
          >
            <Text style={[styles.segmentText, activeTab === 'all' && styles.activeSegmentText]}>
              ALL CHATS
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.segmentButton, activeTab === 'groups' && styles.activeSegmentButton]}
            onPress={() => setActiveTab('groups')}
            activeOpacity={0.85}
          >
            <Text style={[styles.segmentText, activeTab === 'groups' && styles.activeSegmentText]}>
              GROUP CHATS
            </Text>
          </TouchableOpacity>
        </View>

        {statusMessage ? <Text style={styles.statusText}>{statusMessage}</Text> : null}

        {isLoading ? <ActivityIndicator color="#1f5d86" style={styles.loader} /> : null}

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.listContent}>
            {chatRows.length ? (
              chatRows.map((row) => (
                <TouchableOpacity
                  key={row.id}
                  style={styles.chatRow}
                  onPress={() => openChatRow(row)}
                  activeOpacity={0.85}
                >
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>{row.initials}</Text>
                  </View>
                  <View style={styles.rowCopy}>
                    <Text style={styles.rowTitle}>{row.title}</Text>
                    <Text style={styles.rowSubtitle}>{row.subtitle}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color="#64748b" />
                </TouchableOpacity>
              ))
            ) : (
              <View style={styles.emptyState}>
                <Text style={styles.emptyTitle}>
                  {activeTab === 'groups' ? 'No group chats yet' : 'No chats yet'}
                </Text>
                <Text style={styles.emptyText}>
                  {activeTab === 'groups'
                    ? 'Create a hangout plan to start a separate group chat.'
                    : 'Tap + to add a friend.'}
                </Text>
              </View>
            )}
        </ScrollView>
      </View>

      <Modal
        visible={isAddFriendVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsAddFriendVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalPanel}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Friend</Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setIsAddFriendVisible(false)}
                activeOpacity={0.85}
              >
                <Ionicons name="close" size={20} color="#0f172a" />
              </TouchableOpacity>
            </View>

            <TextInput
              value={friendCode}
              onChangeText={setFriendCode}
              placeholder="Friend code"
              placeholderTextColor="#64748b"
              autoCapitalize="characters"
              style={styles.friendCodeInput}
            />
            <TouchableOpacity style={styles.addFriendButton} onPress={sendFriendRequest} activeOpacity={0.85}>
              <Text style={styles.addFriendButtonText}>Send Request</Text>
            </TouchableOpacity>

            <Text style={styles.modalEmptyText}>
              Friend requests now appear from the home notification bell.
            </Text>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);

  if (!parts.length) {
    return '?';
  }

  return parts.slice(0, 2).map((part) => part[0].toUpperCase()).join('');
}

const createStyles = (theme: AppTheme) => StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },

  content: {
    flex: 1,
    paddingHorizontal: 14,
    paddingTop: 24,
    paddingBottom: 6,
  },

  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },

  title: {
    color: theme.colors.text,
    fontSize: 18,
    lineHeight: 22,
    fontWeight: '900',
  },

  iconButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },

  requestBadge: {
    position: 'absolute',
    top: -3,
    right: -3,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: theme.colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },

  requestBadgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '900',
  },

  segmentedControl: {
    width: 172,
    height: 34,
    borderRadius: 17,
    backgroundColor: theme.colors.surface,
    flexDirection: 'row',
    padding: 3,
    marginBottom: 14,
  },

  segmentButton: {
    flex: 1,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },

  activeSegmentButton: {
    backgroundColor: theme.colors.primary,
  },

  segmentText: {
    color: theme.colors.textMuted,
    fontSize: 9,
    fontWeight: '900',
  },

  activeSegmentText: {
    color: '#ffffff',
  },

  statusText: {
    color: theme.colors.text,
    fontSize: 12,
    fontWeight: '800',
    marginBottom: 8,
  },

  loader: {
    marginVertical: 6,
  },

  listContent: {
    paddingBottom: 18,
  },

  chatRow: {
    minHeight: 58,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 9,
  },

  avatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },

  avatarText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '900',
  },

  rowCopy: {
    flex: 1,
    paddingRight: 8,
  },

  rowTitle: {
    color: theme.colors.text,
    fontSize: 14,
    fontWeight: '900',
  },

  rowSubtitle: {
    color: theme.colors.textMuted,
    fontSize: 11,
    fontWeight: '700',
    marginTop: 2,
  },

  emptyState: {
    alignItems: 'center',
    paddingTop: 64,
  },

  emptyTitle: {
    color: theme.colors.text,
    fontSize: 17,
    fontWeight: '900',
  },

  emptyText: {
    color: theme.colors.textMuted,
    fontSize: 13,
    fontWeight: '700',
    marginTop: 4,
  },

  groupPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 72,
  },

  groupPlaceholderTitle: {
    color: theme.colors.text,
    fontSize: 18,
    fontWeight: '900',
    marginTop: 10,
  },

  groupPlaceholderText: {
    color: theme.colors.textMuted,
    fontSize: 13,
    fontWeight: '700',
    marginTop: 4,
  },

  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.45)',
    justifyContent: 'center',
    paddingHorizontal: 18,
  },

  modalPanel: {
    borderRadius: 8,
    backgroundColor: theme.colors.surface,
    padding: 16,
  },

  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },

  modalTitle: {
    color: theme.colors.text,
    fontSize: 20,
    fontWeight: '900',
  },

  closeButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: theme.colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },

  friendCodeInput: {
    height: 44,
    borderRadius: 8,
    backgroundColor: theme.colors.surfaceMuted,
    color: theme.colors.text,
    fontSize: 14,
    fontWeight: '700',
    paddingHorizontal: 12,
  },

  addFriendButton: {
    height: 42,
    borderRadius: 8,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },

  addFriendButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '900',
  },

  modalSectionTitle: {
    color: theme.colors.text,
    fontSize: 15,
    fontWeight: '900',
    marginTop: 18,
    marginBottom: 8,
  },

  requestRow: {
    minHeight: 52,
    borderRadius: 8,
    backgroundColor: theme.colors.surfaceMuted,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginBottom: 8,
  },

  acceptButton: {
    minWidth: 66,
    height: 32,
    borderRadius: 8,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
  },

  acceptButtonText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '900',
  },

  modalEmptyText: {
    color: theme.colors.textMuted,
    fontSize: 13,
    fontWeight: '700',
  },
});
