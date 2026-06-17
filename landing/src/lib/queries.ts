import { queryOptions } from "@tanstack/react-query";
import {
  fetchStats,
  fetchTryoutById,
  fetchTryouts,
  type TryoutFilters,
} from "./api/tryouts";
import { fetchChildren } from "./api/children";
import {
  fetchMyTryouts,
  fetchNotifications,
  fetchRegistrationById,
  fetchRegistrations,
} from "./api/registrations";
import { getCurrentParent } from "./api/auth";

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
};

export const parentQuery = () =>
  queryOptions({ queryKey: qk.parent, queryFn: getCurrentParent });

export const statsQuery = () =>
  queryOptions({ queryKey: qk.stats, queryFn: fetchStats });

export const tryoutsQuery = (filters: TryoutFilters = {}) =>
  queryOptions({ queryKey: qk.tryouts(filters), queryFn: () => fetchTryouts(filters) });

export const tryoutQuery = (id: string) =>
  queryOptions({ queryKey: qk.tryout(id), queryFn: () => fetchTryoutById(id) });

export const childrenQuery = () =>
  queryOptions({ queryKey: qk.children, queryFn: fetchChildren });

export const registrationsQuery = () =>
  queryOptions({ queryKey: qk.registrations, queryFn: fetchRegistrations });

export const registrationQuery = (id: string) =>
  queryOptions({ queryKey: qk.registration(id), queryFn: () => fetchRegistrationById(id) });

export const notificationsQuery = () =>
  queryOptions({ queryKey: qk.notifications, queryFn: fetchNotifications });

export const myTryoutsQuery = () =>
  queryOptions({ queryKey: qk.myTryouts, queryFn: fetchMyTryouts });