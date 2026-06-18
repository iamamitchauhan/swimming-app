import { useEffect } from "react";
import type { LucideIcon } from "lucide-react";
import { CheckCircle2, Clock, XCircle, MapPin, CalendarDays, PlusCircle, X } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { parentQuery, myTryoutsQuery } from "@/lib/queries";
import { formatDate } from "@/lib/format";

const THEME_CLASSES: Record<string, string> = {
  ocean: "bg-linear-to-br from-sky-500 to-blue-700",
  sunset: "bg-linear-to-br from-orange-400 to-pink-600",
  forest: "bg-linear-to-br from-emerald-500 to-teal-700",
  midnight: "bg-linear-to-br from-slate-700 to-slate-900",
  coral: "bg-linear-to-br from-rose-400 to-orange-500",
};

function themeBg(theme?: string) {
  return THEME_CLASSES[theme ?? ""] ?? "bg-linear-to-br from-indigo-700 to-slate-900";
}

const STATUS_STYLES: Record<string, { bg: string; text: string; Icon: LucideIcon; label: string }> =
  {
    offered: { bg: "bg-blue-100", text: "text-blue-700", Icon: CheckCircle2, label: "Offered" },
    registered: {
      bg: "bg-green-100",
      text: "text-green-700",
      Icon: CheckCircle2,
      label: "Registered",
    },
    waitlisted: { bg: "bg-yellow-100", text: "text-yellow-700", Icon: Clock, label: "Waitlisted" },
    cancelled: { bg: "bg-red-100", text: "text-red-600", Icon: XCircle, label: "Cancelled" },
    pending: { bg: "bg-blue-100", text: "text-blue-700", Icon: Clock, label: "Pending" },
    approved: { bg: "bg-green-100", text: "text-green-700", Icon: CheckCircle2, label: "Approved" },
    rejected: { bg: "bg-red-100", text: "text-red-600", Icon: XCircle, label: "Rejected" },
  };

export default function RegistrationsPage() {
  const navigate = useNavigate();
  const { data: parent, isLoading } = useQuery(parentQuery());
  const { data: tryouts = [], isLoading: loadingTryouts } = useQuery(myTryoutsQuery());

  useEffect(() => {
    if (!isLoading && !parent) navigate("/login");
  }, [isLoading, parent, navigate]);

  if (!parent) return null;

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <h1 className="font-display text-3xl font-bold sm:text-4xl">My Registrations</h1>
      <p className="mt-1 text-muted-foreground">Track every registration in one place.</p>

      {loadingTryouts ? (
        <div className="mt-10 text-center text-muted-foreground">Loading registrations…</div>
      ) : tryouts.length === 0 ? (
        <Card className="mt-8 p-10 text-center">
          <p className="text-muted-foreground">You haven't registered for any tryouts yet.</p>
          <Button asChild className="btn-cta mt-4">
            <Link to="/tryouts">Browse tryouts</Link>
          </Button>
        </Card>
      ) : (
        <div className="mt-8 space-y-6">
          {tryouts.map((item) => {
            const t = item.tryout;
            return (
              <div
                key={t._id}
                className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden"
              >
                {/* Tryout hero */}
                <div className={`relative h-24 ${themeBg(t.theme)}`}>
                  {t.bannerUrl && (
                    <img
                      src={t.bannerUrl}
                      alt=""
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                  )}
                  <div className="absolute inset-0 bg-linear-to-t from-black/50 to-transparent" />
                  <div className="absolute bottom-3 left-4 right-4 flex items-end justify-between">
                    <h2 className="font-bold text-white text-lg drop-shadow">{t.name}</h2>
                    {t.location && (
                      <span className="text-white/80 text-xs flex items-center gap-1">
                        <MapPin className="size-3" />
                        {t.location}
                      </span>
                    )}
                  </div>
                </div>

                {/* Per-swimmer registrations */}
                <div className="divide-y divide-gray-50">
                  {item.children.map((c) => {
                    const s = STATUS_STYLES[c.status] ?? STATUS_STYLES.registered;
                    return (
                      <div key={c.registrationId} className="p-4">
                        <div className="flex items-start justify-between gap-3">
                          {/* Swimmer info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-semibold text-gray-900">
                                {c.firstName} {c.lastName}
                              </span>
                              <span className="text-gray-400 text-sm">
                                · Age {c.ageOnTryoutDay}
                              </span>
                            </div>
                            <div className="mt-2 space-y-1">
                              <div className="flex items-center gap-2 text-sm text-gray-500">
                                <CalendarDays className="size-3.5 shrink-0" />
                                <span>Registered {formatDate(c.registeredAt)}</span>
                              </div>
                            </div>

                            {/* <div className="mt-2 space-y-1">
                              <div className="flex items-center gap-2 text-sm text-gray-500">
                                <CalendarDays className="size-3.5 shrink-0" />
                                <span>Registration closes in X days</span>
                              </div>
                            </div> */}
                          </div>

                          {/* Status */}
                          <div className="shrink-0 flex flex-col gap-4">
                            <span
                              className={`text-xs font-semibold px-2.5 py-1 rounded-full flex items-center gap-1 ${s.bg} ${s.text}`}
                            >
                              <s.Icon className="size-3.5" />
                              {s.label}
                            </span>

                            {["Registered", "Waitlisted"].includes(s.label) && (
                              <span
                                onClick={() => {
                                  alert("Work in progress");
                                }}
                                className={`text-xs font-semibold px-2.5 py-1 rounded-full flex items-center gap-1 text-red-600 hover:text-red-700 cursor-pointer`}
                              >
                                <X className="size-3.5" />
                                Cancel
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Add another swimmer CTA */}
                {
                  <div className="px-4 py-3 bg-gray-50 border-t border-gray-100">
                    <Link
                      to={`/tryouts/${t._id}`}
                      className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
                    >
                      <PlusCircle className="size-4" /> Add another swimmer for this tryout
                    </Link>
                  </div>
                }
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
