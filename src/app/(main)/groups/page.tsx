"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import toast from "react-hot-toast";
import {
  HiOutlineUsers,
  HiOutlinePlus,
  HiOutlineSearch,
  HiOutlineAcademicCap,
  HiOutlineCalendar,
  HiOutlineUserGroup,
  HiOutlineCheck,
} from "react-icons/hi";

interface Group {
  id: string;
  name: string;
  description: string | null;
  avatar: string | null;
  type: string;
  department: string | null;
  batchYear: number | null;
  memberCount: number;
  postCount: number;
  isMember: boolean;
  createdBy: { id: string; name: string; avatar: string | null };
}

const TABS = [
  { id: "all", label: "All", icon: HiOutlineUsers },
  { id: "mine", label: "My Groups", icon: HiOutlineUserGroup },
  { id: "department", label: "Department", icon: HiOutlineAcademicCap },
  { id: "batch", label: "Batch", icon: HiOutlineCalendar },
];

const GROUP_EMOJIS: Record<string, string> = {
  CSE: "💻",
  IT: "🌐",
  ECE: "⚡",
  EEE: "🔌",
  Mechanical: "⚙️",
  Civil: "🏗️",
  "CSE (Data Science)": "📊",
  "CSE (AI & ML)": "🤖",
  "CSE (Cyber Security)": "🔐",
  "CSE (IoT)": "📡",
  Biotechnology: "🧬",
  Chemical: "🧪",
  Aerospace: "✈️",
  Automobile: "🚗",
  Mechatronics: "🔧",
  Architecture: "🏛️",
  Law: "⚖️",
  Management: "📈",
  "Media & Communication": "📺",
  Design: "🎨",
  Electrical: "⚡",
};

export default function GroupsPage() {
  const { data: session } = useSession();
  const user = session?.user as any;
  const [groups, setGroups] = useState<Group[]>([]);
  const [activeTab, setActiveTab] = useState("all");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newGroup, setNewGroup] = useState({
    name: "",
    description: "",
    type: "custom",
  });

  useEffect(() => {
    fetchGroups();
  }, [activeTab, search]);

  const fetchGroups = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (activeTab === "department") params.set("type", "department");
      if (activeTab === "batch") params.set("type", "batch");
      if (search) params.set("q", search);

      const res = await fetch(`/api/groups?${params}`);
      let data = await res.json();

      if (activeTab === "mine") {
        data = data.filter((g: Group) => g.isMember);
      }

      setGroups(data);
    } catch {
      toast.error("Failed to load groups");
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async (groupId: string) => {
    try {
      await fetch(`/api/groups/${groupId}/join`, { method: "POST" });
      fetchGroups();
      toast.success("Joined group!");
    } catch {
      toast.error("Failed to join");
    }
  };

  const handleLeave = async (groupId: string) => {
    try {
      await fetch(`/api/groups/${groupId}/join`, { method: "DELETE" });
      fetchGroups();
      toast.success("Left group");
    } catch {
      toast.error("Failed to leave");
    }
  };

  const handleCreate = async () => {
    if (!newGroup.name.trim()) {
      toast.error("Group name is required");
      return;
    }
    setCreating(true);
    try {
      const res = await fetch("/api/groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newGroup),
      });
      if (!res.ok) throw new Error();
      toast.success("Group created!");
      setShowCreate(false);
      setNewGroup({ name: "", description: "", type: "custom" });
      fetchGroups();
    } catch {
      toast.error("Failed to create group");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-dark-900 pb-20 md:pb-0">
      {/* Header */}
      <div className="bg-white dark:bg-dark-900 border-b border-gray-200 dark:border-white/[0.06]">
        <div className="max-w-2xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">Groups</h1>
            <button
              onClick={() => setShowCreate(!showCreate)}
              className="p-2 bg-primary-600 hover:bg-primary-700 rounded-xl transition-colors"
            >
              <HiOutlinePlus className="text-lg" />
            </button>
          </div>

          {/* Search */}
          <div className="relative mb-3">
            <HiOutlineSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search groups..."
              className="w-full pl-10 pr-4 py-2.5 bg-gray-100 dark:bg-dark-700 border border-gray-200 dark:border-dark-500 rounded-xl text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500"
            />
          </div>

          {/* Tabs */}
          <div className="flex gap-1 overflow-x-auto scrollbar-hide">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                    activeTab === tab.id
                      ? "bg-primary-600 text-white"
                      : "bg-gray-100 dark:bg-dark-700 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                  }`}
                >
                  <Icon className="text-sm" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-4">
        {/* Create Group Modal */}
        {showCreate && (
          <div className="bg-white dark:bg-dark-800 border border-gray-200 dark:border-white/[0.08] rounded-2xl p-5 mb-4 shadow-[0_4px_16px_rgba(0,0,0,0.06)] dark:shadow-[0_4px_16px_rgba(0,0,0,0.3)]">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Create New Group</h3>
            <input
              type="text"
              value={newGroup.name}
              onChange={(e) => setNewGroup({ ...newGroup, name: e.target.value })}
              placeholder="Group name"
              className="w-full px-4 py-2.5 bg-gray-100 dark:bg-dark-700 border border-gray-200 dark:border-dark-500 rounded-xl text-sm text-gray-900 dark:text-white mb-3 focus:outline-none focus:border-primary-500"
            />
            <textarea
              value={newGroup.description}
              onChange={(e) => setNewGroup({ ...newGroup, description: e.target.value })}
              placeholder="Description (optional)"
              className="w-full px-4 py-2.5 bg-gray-100 dark:bg-dark-700 border border-gray-200 dark:border-dark-500 rounded-xl text-sm text-gray-900 dark:text-white mb-3 resize-none focus:outline-none focus:border-primary-500"
              rows={2}
            />
            <div className="flex gap-2">
              <select
                value={newGroup.type}
                onChange={(e) => setNewGroup({ ...newGroup, type: e.target.value })}
                className="flex-1 px-3 py-2 bg-gray-100 dark:bg-dark-700 border border-gray-200 dark:border-dark-500 rounded-xl text-sm text-gray-900 dark:text-white"
              >
                <option value="custom">Custom Group</option>
                <option value="department">Department</option>
                <option value="batch">Batch</option>
              </select>
            </div>
            <div className="flex gap-2 mt-3">
              <button
                onClick={() => setShowCreate(false)}
                className="flex-1 py-2 bg-gray-100 dark:bg-dark-700 hover:bg-gray-200 dark:hover:bg-dark-600 rounded-xl text-sm font-medium text-gray-700 dark:text-gray-300 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={creating || !newGroup.name.trim()}
                className="flex-1 py-2 bg-primary-600 hover:bg-primary-700 rounded-xl text-sm font-medium transition-colors disabled:opacity-50"
              >
                {creating ? "Creating..." : "Create"}
              </button>
            </div>
          </div>
        )}

        {/* Groups List */}
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-500" />
          </div>
        ) : groups.length === 0 ? (
          <div className="text-center py-16">
            <span className="text-6xl mb-4 block">👥</span>
            <h3 className="text-lg font-semibold mb-2">No groups yet</h3>
            <p className="text-gray-500 dark:text-gray-400 text-sm">
              {search ? "Try a different search" : "Create the first group!"}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {groups.map((group) => {
              const emoji = GROUP_EMOJIS[group.department || ""] || "👥";
              return (
                <Link
                  key={group.id}
                  href={`/groups/${group.id}`}
                  className="bg-white dark:bg-dark-800 border border-gray-200 dark:border-white/[0.08] rounded-2xl p-4 flex items-center gap-3 hover:shadow-[0_4px_16px_rgba(0,0,0,0.06)] dark:hover:shadow-[0_4px_16px_rgba(0,0,0,0.3)] transition-all block"
                >
                  <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center text-2xl flex-shrink-0">
                    {group.avatar ? (
                      <img
                        src={group.avatar}
                        alt=""
                        className="w-full h-full object-cover rounded-xl"
                      />
                    ) : (
                      emoji
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-gray-900 dark:text-white truncate">{group.name}</h3>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-dark-700 text-gray-500 dark:text-gray-400 flex-shrink-0">
                        {group.type}
                      </span>
                    </div>
                    {group.description && (
                      <p className="text-sm text-gray-500 dark:text-gray-400 truncate mt-0.5">
                        {group.description}
                      </p>
                    )}
                    <div className="flex items-center gap-3 mt-1 text-xs text-gray-400 dark:text-gray-500">
                      <span>{group.memberCount} members</span>
                      <span>{group.postCount} posts</span>
                      {group.department && <span>{group.department}</span>}
                      {group.batchYear && <span>Batch {group.batchYear}</span>}
                    </div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      group.isMember ? handleLeave(group.id) : handleJoin(group.id);
                    }}
                    className={`px-4 py-2 rounded-xl text-sm font-medium transition-all flex-shrink-0 ${
                      group.isMember
                        ? "bg-gray-100 dark:bg-dark-700 text-gray-500 dark:text-gray-400 hover:bg-red-50 dark:hover:bg-red-600/20 hover:text-red-500 dark:hover:text-red-400"
                        : "bg-primary-600 hover:bg-primary-700 text-white"
                    }`}
                  >
                    {group.isMember ? (
                      <span className="flex items-center gap-1">
                        <HiOutlineCheck className="text-sm" /> Joined
                      </span>
                    ) : (
                      "Join"
                    )}
                  </button>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
