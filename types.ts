
export interface Member {
  id: string;
  name: string;
  avatar?: string;
}

export interface UserProfile {
  id: string;
  name: string;
  avatar: string;
}

export interface ChecklistCategory {
  id: string;
  label: string;
  en?: string;
  icon: string;
  color: string;
}

export interface ChecklistItem {
  id: string;
  category: string;
  title: string;
  isDone: boolean;
  assigneeIds?: string[];
}

export interface ExpenseSplit {
  memberId: string;
  ratio: number;
  amount: number;
}

export interface Expense {
  id: string;
  title: string;
  amount: number;
  currency: string;
  category: 'food' | 'transport' | 'hotel' | 'shopping' | 'others' | 'ticket' | 'fun' | 'medical';
  payerId: string;
  date: string;
  splits: ExpenseSplit[];
}

export interface ItineraryEvent {
  id: string;
  time: string;
  title: string;
  location: string;
  type: 'transport' | 'hotel' | 'breakfast' | 'lunch' | 'dinner' | 'snack' | 'attraction' | 'shopping';
  description?: string;
  imageUrl?: string;
  referenceUrl?: string;
}

export interface DayPlan {
  day: number;
  accommodation?: string;
  transportMode?: string;
  notes?: string;
  events: ItineraryEvent[];
  recommendations?: { title: string; location: string }[];
}

export interface TripStay {
  id: string;
  city: string;
  hotel: string;
  startDate: string;
  endDate: string;
  weather?: string;
  temp?: number;
}

export type TripSeason = 'spring' | 'summer' | 'autumn' | 'winter';

export interface Trip {
  id: string;
  title: string;
  destination: string;
  startDate: string;
  endDate: string;
  image: string;
  season?: TripSeason;
  intro?: string;
  members: Member[];
  stays: TripStay[];
  weather?: string;
  temp?: number;
  checklistCategories: ChecklistCategory[];
  checklist: ChecklistItem[];
  itinerary: DayPlan[];
  expenses: Expense[];
}

export type AppState = 'bookshelf' | 'in_trip';
export type TripTab = 'overview' | 'checklist' | 'planner' | 'wallet';