import { queryOptions } from "@tanstack/react-query";
import {
  fetchClubs,
  fetchStats,
  fetchTryoutById,
  fetchTryouts,
  type TryoutFilters,
} from "./api/tryouts";
import { fetchChildren } from "./api/children";
import {
  cancelRegistrationById,
  fetchMyTryouts,
  fetchNotifications,
  fetchRegistrationById,
  fetchRegistrations,
  fetchTryoutRegistrationQuestions,
  fetchWaitlistEntry,
} from "./api/registrations";
import { getCurrentParent } from "./api/auth";
import { id } from "date-fns/locale";

export const qk = {
  parent: ["parent"] as const,
  stats: ["stats"] as const,
  tryouts: (f?: TryoutFilters) => ["tryouts", f ?? {}] as const,
  tryout: (id: string) => ["tryout", id] as const,
  children: ["children"] as const,
  registrations: ["registrations"] as const,
  registration: (id: string) => ["registration", id] as const,
  notifications: ["notifications"] as const,
  myTryouts: ["myTryouts"] as const,
  registrationQuestions: (tryoutId: string) => ["registrationQuestions", tryoutId] as const,
  cancelRegistration: ["cancelRegistration"] as const,
  clubs: ["clubs"] as const,
  waitlistEntry: (id: string) => ["waitlistEntry", id] as const,
};

export const parentQuery = () => queryOptions({ queryKey: qk.parent, queryFn: getCurrentParent });

export const statsQuery = () => queryOptions({ queryKey: qk.stats, queryFn: fetchStats });

export const tryoutsQuery = (filters: TryoutFilters = {}) =>
  queryOptions({ queryKey: qk.tryouts(filters), queryFn: () => fetchTryouts(filters) });

export const tryoutQuery = (id: string) =>
  queryOptions({ queryKey: qk.tryout(id), queryFn: () => fetchTryoutById(id) });

export const childrenQuery = () => queryOptions({ queryKey: qk.children, queryFn: fetchChildren });

export const registrationsQuery = () =>
  queryOptions({ queryKey: qk.registrations, queryFn: fetchRegistrations });

export const registrationQuery = (id: string) =>
  queryOptions({ queryKey: qk.registration(id), queryFn: () => fetchRegistrationById(id) });

export const notificationsQuery = () =>
  queryOptions({ queryKey: qk.notifications, queryFn: fetchNotifications });

export const myTryoutsQuery = () =>
  queryOptions({ queryKey: qk.myTryouts, queryFn: fetchMyTryouts });

export const cancelRegistration = (id: string) =>
  queryOptions({
    queryKey: qk.cancelRegistration,
    queryFn: () => cancelRegistrationById(id),
    enabled: !!id,
  });
export const registrationQuestionsQuery = (tryoutId: string) =>
  queryOptions({
    queryKey: qk.registrationQuestions(tryoutId),
    queryFn: () => fetchTryoutRegistrationQuestions(tryoutId),
    enabled: !!tryoutId,
    staleTime: 5 * 60 * 1000,
  });

export const clubsQuery = () =>
  queryOptions({
    queryKey: qk.clubs,
    queryFn: fetchClubs,
    staleTime: 5 * 60 * 1000,
  });

export const waitlistEntryQuery = (id: string) =>
  queryOptions({
    queryKey: qk.waitlistEntry(id),
    queryFn: () => fetchWaitlistEntry(id),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  });
