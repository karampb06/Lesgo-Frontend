import { ENV } from '@/constants/env';
import { useAuth } from '@/contexts/auth-context';
import { createContext, PropsWithChildren, useCallback, useContext, useEffect, useMemo, useState } from 'react';

export type HangoutPlan = {
  id: string;
  title: string;
  location: string;
  scheduledAt: string;
  endsAt?: string;
  dateTimeLabel: string;
  participants: string[];
  avatarUrls: string[];
  participantProfiles: PlanParticipant[];
  inviteStatuses: PlanParticipant[];
};

export type PlanParticipant = {
  id: string;
  name: string;
  profilePicture?: string | null;
  status?: string;
};

type NewHangoutPlan = {
  id?: string;
  title: string;
  location: string;
  scheduledAt: string;
  endsAt?: string;
  dateTimeLabel: string;
  participants: string[];
  avatarUrls?: string[];
  participantProfiles?: PlanParticipant[];
  inviteStatuses?: PlanParticipant[];
};

type HangoutPlansContextValue = {
  plans: HangoutPlan[];
  addPlan: (plan: NewHangoutPlan) => HangoutPlan;
  cancelPlan: (planId: string) => Promise<void>;
  refreshPlans: () => Promise<void>;
  getPlanById: (planId: string | undefined) => HangoutPlan | undefined;
};

const HangoutPlansContext = createContext<HangoutPlansContextValue | null>(null);

function sortPlansByUpcomingDate(plans: HangoutPlan[]) {
  const now = Date.now();

  // Hide finished plans and keep the next hangouts at the top.
  return [...plans]
    .filter((plan) => {
      const expiresAt = new Date(plan.endsAt ?? plan.scheduledAt).getTime();
      return Number.isFinite(expiresAt) ? expiresAt > now : true;
    })
    .sort(
      (first, second) =>
        new Date(first.scheduledAt).getTime() - new Date(second.scheduledAt).getTime()
    );
}

export function HangoutPlansProvider({ children }: PropsWithChildren) {
  const { token } = useAuth();
  const [plans, setPlans] = useState<HangoutPlan[]>([]);

  const refreshPlans = useCallback(async () => {
    if (!token) {
      // A logged-out user should not keep seeing old plans.
      setPlans([]);
      return;
    }

    const response = await fetch(`${ENV.API_BASE_URL}/suggestions/plans`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    const data = await response.json().catch(() => null);

    if (!response.ok) {
      throw new Error(data?.message ?? data?.error ?? `Plans request failed with status ${response.status}`);
    }

    const backendPlans: HangoutPlan[] = (data.plans ?? []).map((plan: any) => {
      // The backend has changed shape a few times, so we normalize it here.
      const participantProfiles = normalizeParticipantProfiles(plan);
      const inviteStatuses = normalizeInviteStatuses(plan);
      const participants = normalizeParticipantNames(plan.participants);

      return {
        id: plan.id ?? plan._id,
        title: plan.title,
        location: plan.location ?? plan.place?.name ?? 'Selected place',
        scheduledAt: plan.scheduledAt ?? plan.startsAt,
        endsAt: plan.endsAt,
        dateTimeLabel: plan.dateTimeLabel ?? formatPlanLabel(plan.scheduledAt ?? plan.startsAt),
        participants,
        participantProfiles,
        inviteStatuses,
        avatarUrls: participantProfiles
          .map((participant) => participant.profilePicture)
          .filter(Boolean),
      };
    });

    setPlans(sortPlansByUpcomingDate(backendPlans));
  }, [token]);

  useEffect(() => {
    refreshPlans().catch((error) => {
      console.warn('Could not load hangout plans:', error);
    });
  }, [refreshPlans]);

  const value = useMemo<HangoutPlansContextValue>(
    () => ({
      plans,
      refreshPlans,
      cancelPlan: async (planId) => {
        if (planId.startsWith('local-')) {
          setPlans((currentPlans) => currentPlans.filter((plan) => plan.id !== planId));
          return;
        }

        if (!token) {
          throw new Error('You must be signed in to cancel a plan.');
        }

        await cancelBackendPlan(planId, token);

        setPlans((currentPlans) => currentPlans.filter((plan) => plan.id !== planId));
      },
      addPlan: (plan) => {
        const createdPlan: HangoutPlan = {
          ...plan,
          id: plan.id ?? `plan-${Date.now()}`,
          participantProfiles: plan.participantProfiles ?? [],
          inviteStatuses: plan.inviteStatuses ?? plan.participantProfiles ?? [],
          avatarUrls:
            plan.avatarUrls ??
            plan.participantProfiles?.flatMap((participant) =>
              participant.profilePicture ? [participant.profilePicture] : []
            ) ??
            [],
        };

        setPlans((currentPlans) => {
          const nextPlans = currentPlans.filter((currentPlan) => currentPlan.id !== createdPlan.id);

          return sortPlansByUpcomingDate([...nextPlans, createdPlan]);
        });

        return createdPlan;
      },
      getPlanById: (planId) => plans.find((plan) => plan.id === planId),
    }),
    [plans, refreshPlans, token]
  );

  return (
    <HangoutPlansContext.Provider value={value}>{children}</HangoutPlansContext.Provider>
  );
}

function formatPlanLabel(scheduledAt: string) {
  if (!scheduledAt) {
    return 'Upcoming';
  }

  return new Intl.DateTimeFormat('en-NZ', {
    weekday: 'short',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(scheduledAt));
}

async function cancelBackendPlan(planId: string, token: string) {
  // Try the cancel endpoint first, then fall back to older backend routes.
  const requests: RequestInit[] = [
    { method: 'PATCH' },
    { method: 'DELETE' },
    {
      method: 'PATCH',
      body: JSON.stringify({ status: 'cancelled' }),
    },
  ];
  const paths = [
    `/suggestions/plans/${planId}/cancel`,
    `/suggestions/plans/${planId}`,
    `/suggestions/plans/${planId}`,
  ];
  let lastError = `Cancel request failed for plan ${planId}`;

  for (let index = 0; index < paths.length; index += 1) {
    const response = await fetch(`${ENV.API_BASE_URL}${paths[index]}`, {
      ...requests[index],
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });
    const data = await response.json().catch(() => null);

    if (response.ok) {
      return;
    }

    lastError = data?.message ?? data?.error ?? `Cancel request failed with status ${response.status}`;
  }

  throw new Error(lastError);
}

function normalizeParticipantProfiles(plan: any): PlanParticipant[] {
  // Collect people from every backend field we know about.
  const sources = [
    ...(Array.isArray(plan.participantProfiles) ? plan.participantProfiles : []),
    ...(Array.isArray(plan.participants) ? plan.participants.filter((participant: any) => typeof participant !== 'string') : []),
  ];

  if (!sources.length && Array.isArray(plan.participants)) {
    return plan.participants
      .map((participant: any, index: number) => normalizeParticipantProfile(participant, index))
      .filter(Boolean) as PlanParticipant[];
  }

  return sources
    .map((participant: any, index: number) => normalizeParticipantProfile(participant, index))
    .filter(Boolean) as PlanParticipant[];
}

function normalizeInviteStatuses(plan: any): PlanParticipant[] {
  const sources = [
    ...(Array.isArray(plan.inviteStatuses) ? plan.inviteStatuses : []),
    ...(Array.isArray(plan.invites) ? plan.invites : []),
    ...(Array.isArray(plan.invitees) ? plan.invitees : []),
    ...(Array.isArray(plan.pendingInvites) ? plan.pendingInvites : []),
  ];

  return sources
    .map((participant: any, index: number) => normalizeParticipantProfile(participant, index))
    .filter(Boolean) as PlanParticipant[];
}

function normalizeParticipantProfile(participant: any, index: number): PlanParticipant | null {
  if (!participant) {
    return null;
  }

  if (typeof participant === 'string') {
    return {
      id: participant,
      name: participant,
      status: 'pending',
    };
  }

  const user = participant.user ?? participant.friend ?? participant.invitee ?? participant.participant ?? participant;
  const id = user.id ?? user._id ?? participant.id ?? participant._id ?? `participant-${index}`;
  const name = user.name ?? participant.name ?? user.email ?? participant.email;

  if (!name) {
    return null;
  }

  return {
    id,
    name,
    profilePicture: user.profilePicture ?? user.picture ?? participant.profilePicture ?? participant.picture,
    status: participant.status ?? user.status ?? 'pending',
  };
}

function normalizeParticipantNames(participants: any[]) {
  if (!Array.isArray(participants)) {
    return [];
  }

  return participants
    .map((participant) => {
      if (typeof participant === 'string') {
        return participant;
      }

      return participant?.name ?? participant?.email;
    })
    .filter(Boolean);
}

export function useHangoutPlans() {
  const context = useContext(HangoutPlansContext);

  if (!context) {
    throw new Error('useHangoutPlans must be used inside HangoutPlansProvider');
  }

  return context;
}
