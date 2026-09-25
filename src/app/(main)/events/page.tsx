"use client";

import { useState, useEffect } from "react";
import { useSession } from "@/lib/appwrite-session";
import UserAvatar from "@/components/UserAvatar";
import { HiOutlineCalendar, HiOutlineClock, HiOutlineLocationMarker, HiOutlinePlus, HiOutlineX } from "react-icons/hi";
import toast from "react-hot-toast";

const EVENT_TYPES = [
  { value: "meetup", label: "Meetup", emoji: "🤝" },
  { value: "fest", label: "Fest", emoji: "🎉" },
  { value: "workshop", label: "Workshop", emoji: "🛠️" },
  { value: "seminar", label: "Seminar", emoji: "📚" },
  { value: "cultural", label: "Cultural", emoji: "🎭" },
  { value: "sports", label: "Sports", emoji: "⚽" },
];

export default function EventsPage() {
  const { data: session } = useSession();
  const user = session?.user;
  const [events, setEvents] = useState<any[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [activeTab, setActiveTab] = useState<"upcoming"|"past"|"all">("upcoming");
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [type, setType] = useState("meetup");

  useEffect(() => { fetchEvents(); }, []);

  const fetchEvents = async () => {
    try { const res = await fetch("/api/events"); const data = await res.json(); setEvents(Array.isArray(data) ? data : []); } catch (error) { console.error("Operation failed:", error); } setLoading(false);
  };

  const handleCreate = async () => {
    if (!title.trim() || !startTime) { toast.error("Title and start time required"); return; }
    setCreating(true);
    try {
      const res = await fetch("/api/events", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title, description, location, startTime, endTime, type }) });
      if (res.ok) { toast.success("Event created!"); setShowCreate(false); setTitle(""); setDescription(""); setLocation(""); setStartTime(""); setEndTime(""); setType("meetup"); fetchEvents(); }
    } catch { toast.error("Failed"); }
    setCreating(false);
  };

  const now = new Date();
  const filtered = events.filter(e => { const d = new Date(e.startTime); if (activeTab === "upcoming") return d >= now; if (activeTab === "past") return d < now; return true; });
  const fmtDate = (s: string) => new Date(s).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
  const fmtTime = (s: string) => new Date(s).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
  const daysUntil = (s: string) => { const diff = Math.ceil((new Date(s).getTime() - now.getTime()) / 86400000); if (diff === 0) return "Today"; if (diff === 1) return "Tomorrow"; if (diff > 0) return "In " + diff + " days"; return Math.abs(diff) + " days ago"; };
  const getTypeInfo = (t: string) => EVENT_TYPES.find(x => x.value === t) || EVENT_TYPES[0];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-dark-950">
      <div className="max-w-2xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Events</h1>
          <button onClick={() => setShowCreate(true)} className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-medium transition-all">
            <HiOutlinePlus className="w-5 h-5" /><span className="hidden sm:inline">Create Event</span>
          </button>
        </div>
        <div className="flex gap-2 mb-6">
          {(["upcoming", "past", "all"] as const).map((tab) => (
            <button key={tab} onClick={() => setActiveTab(tab)} className={"px-4 py-2 rounded-xl text-sm font-medium transition-all " + (activeTab === tab ? "bg-primary-600 text-white" : "bg-white dark:bg-dark-900 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-white/[0.08]")}>
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>
        {loading ? (
          <div className="space-y-4">{[1,2,3].map(i => <div key={i} className="h-40 bg-white dark:bg-dark-900 rounded-2xl animate-pulse" />)}</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 bg-white dark:bg-dark-900 rounded-2xl border border-gray-200 dark:border-white/[0.08]">
            <HiOutlineCalendar className="w-16 h-16 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
            <p className="text-gray-500 dark:text-gray-400 text-lg">No {activeTab} events</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filtered.map((event) => {
              const ti = getTypeInfo(event.type);
              const isPast = new Date(event.startTime) < now;
              return (
                <div key={event.id} className={"bg-white dark:bg-dark-900 rounded-2xl border border-gray-200 dark:border-white/[0.08] overflow-hidden shadow-[0_2px_12px_rgba(0,0,0,0.04)] dark:shadow-[0_2px_12px_rgba(0,0,0,0.2)] " + (isPast ? "opacity-70" : "")}>
                  <div className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300">{ti.emoji} {ti.label}</span>
                      {!isPast ? <span className="text-xs font-medium text-primary-600 dark:text-primary-400">{daysUntil(event.startTime)}</span> : <span className="text-xs text-gray-400">Past</span>}
                    </div>
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">{event.title}</h3>
                    {event.description && <p className="text-sm text-gray-600 dark:text-gray-400 mb-3 line-clamp-2">{event.description}</p>}
                    <div className="space-y-2 mb-3">
                      <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400"><HiOutlineCalendar className="w-4 h-4 text-primary-500" /><span>{fmtDate(event.startTime)}</span></div>
                      <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400"><HiOutlineClock className="w-4 h-4 text-primary-500" /><span>{fmtTime(event.startTime)}{event.endTime && (" — " + fmtTime(event.endTime))}</span></div>
                      {event.location && <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400"><HiOutlineLocationMarker className="w-4 h-4 text-primary-500" /><span>{event.location}</span></div>}
                    </div>
                    <div className="flex items-center gap-2 pt-3 border-t border-gray-100 dark:border-white/[0.06]">
                      <UserAvatar user={event.creator} size="sm" />
                      <span className="text-xs text-gray-500 dark:text-gray-400">by <span className="font-medium text-gray-700 dark:text-gray-300">{event.creator.name}</span></span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      {showCreate && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setShowCreate(false)}>
          <div className="bg-white dark:bg-dark-900 rounded-2xl w-full max-w-lg max-h-[85vh] overflow-y-auto border border-gray-200 dark:border-white/[0.08] shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-white/[0.08]">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">Create Event</h2>
              <button onClick={() => setShowCreate(false)} aria-label="Close" className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-dark-800"><HiOutlineX className="w-5 h-5 text-gray-500" /></button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Event Type</label>
                <div className="flex flex-wrap gap-2">
                  {EVENT_TYPES.map(t => <button key={t.value} onClick={() => setType(t.value)} className={"px-3 py-1.5 rounded-xl text-sm font-medium " + (type === t.value ? "bg-primary-600 text-white" : "bg-gray-100 dark:bg-dark-800 text-gray-600 dark:text-gray-400")}>{t.emoji} {t.label}</button>)}
                </div>
              </div>
              <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Title *</label><input type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="Annual Tech Fest 2026" className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-dark-800 border border-gray-200 dark:border-white/[0.08] text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-primary-500/30" /></div>
              <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label><textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Tell people about this event..." rows={3} className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-dark-800 border border-gray-200 dark:border-white/[0.08] text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-primary-500/30 resize-none" /></div>
              <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Location</label><input type="text" value={location} onChange={e => setLocation(e.target.value)} placeholder="KIIT University" className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-dark-800 border border-gray-200 dark:border-white/[0.08] text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-primary-500/30" /></div>
              <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Start Time *</label><input type="datetime-local" value={startTime} onChange={e => setStartTime(e.target.value)} className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-dark-800 border border-gray-200 dark:border-white/[0.08] text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500/30" /></div>
              <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">End Time</label><input type="datetime-local" value={endTime} onChange={e => setEndTime(e.target.value)} className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-dark-800 border border-gray-200 dark:border-white/[0.08] text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500/30" /></div>
              <button onClick={handleCreate} disabled={creating || !title.trim() || !startTime} className="w-full py-3 bg-primary-600 hover:bg-primary-700 disabled:bg-gray-300 dark:disabled:bg-dark-700 text-white rounded-xl font-medium transition-all">{creating ? "Creating..." : "Create Event"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
