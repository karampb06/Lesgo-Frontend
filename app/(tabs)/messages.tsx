import { API_BASE_URL } from '@/constants/api';
import { useAuth } from '@/contexts/auth-context';
import { useRouter } from 'expo-router';
import React from 'react';
import {
  ActivityIndicator,
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
  participants: UserSummary[];
  updatedAt?: string;
};

export default function MessagesScreen() {
  const router = useRouter();
  const { token, user } = useAuth();
  const [friendCode, setFriendCode] = React.useState('');
  const [friends, setFriends] = React.useState<Friendship[]>([]);
  const [requests, setRequests] = React.useState<Friendship[]>([]);
  const [conversations, setConversations] = React.useState<Conversation[]>([]);
  const [statusMessage, setStatusMessage] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(false);

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

  const loadSocialData = React.useCallback(async () => {
    if (!token) {
      return;
    }

    setIsLoading(true);
    try {
      const [friendsData, requestsData, conversationsData] = await Promise.all([
        apiFetch('/social/friends'),
        apiFetch('/social/friends/requests'),
        apiFetch('/social/conversations'),
      ]);

      setFriends(friendsData.friends ?? []);
      setRequests(requestsData.requests ?? []);
      setConversations(conversationsData.conversations ?? []);
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : 'Could not load messages');
    } finally {
      setIsLoading(false);
    }
  }, [apiFetch, token]);

  React.useEffect(() => {
    loadSocialData();
  }, [loadSocialData]);

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

  const acceptRequest = async (requestId: string) => {
    try {
      await apiFetch(`/social/friends/${requestId}/accept`, { method: 'POST' });
      setStatusMessage('Friend request accepted');
      loadSocialData();
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : 'Could not accept request');
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

  const getConversationTitle = (conversation: Conversation) => {
    const otherParticipants = conversation.participants.filter(
      (participant) => participant.id !== user?.backendId
    );

    return otherParticipants.map((participant) => participant.name).join(', ') || 'Chat';
  };

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.headerRow}>
          <Text style={styles.title}>Messages</Text>
          <TouchableOpacity style={styles.refreshButton} onPress={loadSocialData} activeOpacity={0.8}>
            <Text style={styles.refreshText}>{isLoading ? '...' : 'Refresh'}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.friendCodeCard}>
          <Text style={styles.friendCodeLabel}>Your Friend Code</Text>
          <Text style={styles.friendCodeValue}>{user?.friendCode ?? 'Unavailable'}</Text>
        </View>

        <View style={styles.addRow}>
          <TextInput
            value={friendCode}
            onChangeText={setFriendCode}
            placeholder="Friend code"
            placeholderTextColor="#64748b"
            autoCapitalize="characters"
            style={styles.addInput}
          />
          <TouchableOpacity style={styles.addButton} onPress={sendFriendRequest} activeOpacity={0.85}>
            <Text style={styles.addButtonText}>Add</Text>
          </TouchableOpacity>
        </View>

        {statusMessage ? <Text style={styles.statusText}>{statusMessage}</Text> : null}

        <SectionTitle title="Requests" />
        {requests.length ? (
          requests.map((request) => (
            <View key={request.id} style={styles.listRow}>
              <View style={styles.rowCopy}>
                <Text style={styles.rowTitle}>{request.requester?.name ?? 'Unknown user'}</Text>
                <Text style={styles.rowSubtitle}>{request.requester?.friendCode}</Text>
              </View>
              <TouchableOpacity
                style={styles.smallButton}
                onPress={() => acceptRequest(request.id)}
                activeOpacity={0.85}
              >
                <Text style={styles.smallButtonText}>Accept</Text>
              </TouchableOpacity>
            </View>
          ))
        ) : (
          <EmptyState label="No pending requests" />
        )}

        <SectionTitle title="Friends" />
        {friends.length ? (
          friends.map((friendship) => {
            const friend = friendship.friend;

            if (!friend) {
              return null;
            }

            return (
              <View key={friendship.id} style={styles.listRow}>
                <View style={styles.rowCopy}>
                  <Text style={styles.rowTitle}>{friend.name}</Text>
                  <Text style={styles.rowSubtitle}>{friend.friendCode}</Text>
                </View>
                <TouchableOpacity
                  style={styles.smallButton}
                  onPress={() => startChat(friend)}
                  activeOpacity={0.85}
                >
                  <Text style={styles.smallButtonText}>Chat</Text>
                </TouchableOpacity>
              </View>
            );
          })
        ) : (
          <EmptyState label="No friends yet" />
        )}

        <SectionTitle title="Chats" />
        {isLoading ? <ActivityIndicator color="#1f5d86" /> : null}
        {conversations.length ? (
          conversations.map((conversation) => (
            <TouchableOpacity
              key={conversation.id}
              style={styles.chatRow}
              onPress={() =>
                router.push({
                  pathname: '/(tabs)/chat',
                  params: {
                    conversationId: conversation.id,
                    title: getConversationTitle(conversation),
                  },
                })
              }
              activeOpacity={0.85}
            >
              <Text style={styles.rowTitle}>{getConversationTitle(conversation)}</Text>
              <Text style={styles.rowSubtitle}>
                {conversation.updatedAt ? new Date(conversation.updatedAt).toLocaleString() : ''}
              </Text>
            </TouchableOpacity>
          ))
        ) : (
          <EmptyState label="No chats yet" />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function SectionTitle({ title }: { title: string }) {
  return <Text style={styles.sectionTitle}>{title}</Text>;
}

function EmptyState({ label }: { label: string }) {
  return <Text style={styles.emptyText}>{label}</Text>;
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#a9b2bd',
  },

  content: {
    paddingHorizontal: 12,
    paddingTop: 24,
    paddingBottom: 28,
  },

  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },

  title: {
    color: '#0f172a',
    fontSize: 26,
    fontWeight: '900',
  },

  refreshButton: {
    minWidth: 72,
    height: 34,
    borderRadius: 8,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
  },

  refreshText: {
    color: '#1f5d86',
    fontSize: 12,
    fontWeight: '900',
  },

  friendCodeCard: {
    borderRadius: 8,
    backgroundColor: '#eef2fa',
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
  },

  friendCodeLabel: {
    color: '#64748b',
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
  },

  friendCodeValue: {
    color: '#0f172a',
    fontSize: 20,
    fontWeight: '900',
    marginTop: 2,
  },

  addRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },

  addInput: {
    flex: 1,
    height: 42,
    borderRadius: 8,
    backgroundColor: '#ffffff',
    color: '#0f172a',
    fontSize: 14,
    fontWeight: '700',
    paddingHorizontal: 12,
  },

  addButton: {
    width: 74,
    height: 42,
    borderRadius: 8,
    backgroundColor: '#1f5d86',
    alignItems: 'center',
    justifyContent: 'center',
  },

  addButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '900',
  },

  statusText: {
    color: '#0f172a',
    fontSize: 12,
    fontWeight: '800',
    marginBottom: 8,
  },

  sectionTitle: {
    color: '#0f172a',
    fontSize: 18,
    fontWeight: '900',
    marginTop: 18,
    marginBottom: 8,
  },

  listRow: {
    minHeight: 58,
    borderRadius: 8,
    backgroundColor: '#ffffff',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 8,
  },

  chatRow: {
    minHeight: 58,
    borderRadius: 8,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 8,
  },

  rowCopy: {
    flex: 1,
    paddingRight: 10,
  },

  rowTitle: {
    color: '#0f172a',
    fontSize: 15,
    fontWeight: '900',
  },

  rowSubtitle: {
    color: '#64748b',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 2,
  },

  smallButton: {
    minWidth: 68,
    height: 34,
    borderRadius: 8,
    backgroundColor: '#1f5d86',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
  },

  smallButtonText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '900',
  },

  emptyText: {
    color: '#334155',
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 4,
  },
});
