import { ENV } from '@/constants/env';
import { useAuth } from '@/contexts/auth-context';
import { createContext, PropsWithChildren, useCallback, useContext, useEffect, useMemo, useState } from 'react';

export type HangoutPlan = {
  id: string;
  title: string;
  location: string;
  scheduledAt: string;
  dateTimeLabel: string;
  participants: string[];
  avatarUrls: string[];
  participantProfiles: PlanParticipant[];
};

export type PlanParticipant = {
  id: string;
  name: string;
  profilePicture?: string | null;
};

type NewHangoutPlan = {
  id?: string;
  title: string;
  location: string;
  scheduledAt: string;
  dateTimeLabel: string;
  participants: string[];
  avatarUrls?: string[];
  participantProfiles?: PlanParticipant[];
};

type HangoutPlansContextValue = {
  plans: HangoutPlan[];
  addPlan: (plan: NewHangoutPlan) => HangoutPlan;
  refreshPlans: () => Promise<void>;
  getPlanById: (planId: string | undefined) => HangoutPlan | undefined;
};

const HangoutPlansContext = createContext<HangoutPlansContextValue | null>(null);

function sortPlansByUpcomingDate(plans: HangoutPlan[]) {
  return [...plans].sort(
    (first, second) =>
      new Date(first.scheduledAt).getTime() - new Date(second.scheduledAt).getTime()
  );
}

export function HangoutPlansProvider({ children }: PropsWithChildren) {
  const { token } = useAuth();
  const [plans, setPlans] = useState<HangoutPlan[]>([]);

  const refreshPlans = useCallback(async () => {
    if (!token) {
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

    const backendPlans: HangoutPlan[] = (data.plans ?? []).map((plan: any) => ({
      id: plan.id,
      title: plan.title,
      location: plan.location ?? plan.place?.name ?? 'Selected place',
      scheduledAt: plan.scheduledAt ?? plan.startsAt,
      dateTimeLabel: plan.dateTimeLabel ?? formatPlanLabel(plan.scheduledAt ?? plan.startsAt),
      participants: plan.participants ?? [],
      participantProfiles: plan.participantProfiles ?? [],
      avatarUrls: (plan.participantProfiles ?? [])
        .map((participant: PlanParticipant) => participant.profilePicture)
        .filter(Boolean),
    }));

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
      addPlan: (plan) => {
        const createdPlan: HangoutPlan = {
          ...plan,
          id: plan.id ?? `plan-${Date.now()}`,
          participantProfiles: plan.participantProfiles ?? [],
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
    [plans, refreshPlans]
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

export function useHangoutPlans() {
  const context = useContext(HangoutPlansContext);

  if (!context) {
    throw new Error('useHangoutPlans must be used inside HangoutPlansProvider');
  }

  return context;
}
