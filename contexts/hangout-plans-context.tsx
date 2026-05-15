import { createContext, PropsWithChildren, useContext, useMemo, useState } from 'react';

export type HangoutPlan = {
  id: string;
  title: string;
  location: string;
  scheduledAt: string;
  dateTimeLabel: string;
  participants: string[];
  avatarUrls: string[];
};

type NewHangoutPlan = {
  title: string;
  location: string;
  scheduledAt: string;
  dateTimeLabel: string;
  participants: string[];
  avatarUrls?: string[];
};

type HangoutPlansContextValue = {
  plans: HangoutPlan[];
  addPlan: (plan: NewHangoutPlan) => HangoutPlan;
  getPlanById: (planId: string | undefined) => HangoutPlan | undefined;
};

const DEFAULT_AVATARS = [
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=100&q=80',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=100&q=80',
  'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=100&q=80',
];

const initialPlans: HangoutPlan[] = [
  {
    id: 'coffee-karam',
    title: 'Coffee with Karam',
    location: 'Cafe Nero',
    scheduledAt: '2026-05-13T10:00:00',
    dateTimeLabel: 'Tomorrow',
    participants: ['Karam'],
    avatarUrls: [DEFAULT_AVATARS[0]],
  },
  {
    id: 'bowling-karam',
    title: 'Bowling with Karam +2',
    location: 'Timezone',
    scheduledAt: '2026-05-16T18:00:00',
    dateTimeLabel: 'Saturday',
    participants: ['Karam', 'Harsh', 'Kunal'],
    avatarUrls: DEFAULT_AVATARS,
  },
  {
    id: 'food-festival',
    title: 'Food Festival 2026',
    location: 'City Park',
    scheduledAt: '2026-05-17T12:00:00',
    dateTimeLabel: 'This weekend',
    participants: ['Karam', 'Harsh', 'Kunal'],
    avatarUrls: DEFAULT_AVATARS,
  },
];

const HangoutPlansContext = createContext<HangoutPlansContextValue | null>(null);

function sortPlansByUpcomingDate(plans: HangoutPlan[]) {
  return [...plans].sort(
    (first, second) =>
      new Date(first.scheduledAt).getTime() - new Date(second.scheduledAt).getTime()
  );
}

export function HangoutPlansProvider({ children }: PropsWithChildren) {
  const [plans, setPlans] = useState(() => sortPlansByUpcomingDate(initialPlans));

  const value = useMemo<HangoutPlansContextValue>(
    () => ({
      plans,
      addPlan: (plan) => {
        const createdPlan: HangoutPlan = {
          ...plan,
          id: `plan-${Date.now()}`,
          avatarUrls: plan.avatarUrls ?? DEFAULT_AVATARS,
        };

        setPlans((currentPlans) => sortPlansByUpcomingDate([...currentPlans, createdPlan]));

        return createdPlan;
      },
      getPlanById: (planId) => plans.find((plan) => plan.id === planId),
    }),
    [plans]
  );

  return (
    <HangoutPlansContext.Provider value={value}>{children}</HangoutPlansContext.Provider>
  );
}

export function useHangoutPlans() {
  const context = useContext(HangoutPlansContext);

  if (!context) {
    throw new Error('useHangoutPlans must be used inside HangoutPlansProvider');
  }

  return context;
}
