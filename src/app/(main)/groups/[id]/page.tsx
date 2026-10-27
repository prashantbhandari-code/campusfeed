"use client";

import { useState, useEffect, useRef } from "react";
import { useSession } from "@/lib/auth/session";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";
import UserAvatar from "@/components/ui/UserAvatar";
import { HiArrowLeft, HiOutlinePlus, HiOutlineCollection, HiOutlineChat, HiOutlineChatAlt2, HiOutlineUsers, HiDotsHorizontal, HiOutlineTrash, HiOutlineShieldCheck } from "react-icons/hi";
import { useSocketEvent, useSocket } from "@/lib/hooks/useSocket";
import { publish } from "@/lib/realtime/bus";
import { groupEmoji } from "@/lib/chat/group-emoji";
import GroupChat from "@/components/chat/GroupChat";
import { formatLastSeen } from "@/lib/hooks/heartbeat";


interface GroupDetail { id: string; name: string; description: string | null; avatar: string | null; coverPhoto: string | null; type: string; department: string | null; batchYear: number | null; section: string | null; allowMemberPosts: boolean; memberCount: number; postCount: number; isMember: boolean; myRole: string | null; unreadCount: number; createdBy: { id: string; name: string; username: string; avatar: string | null }; members: { id: string; role: string; user: { id: string; name: string; username: string; avatar: string | null; department: string | null; lastSeen: Date | string | null } }[] }

interface Section { id: string; name: string; description: string | null; icon: string | null; color: string | null; order: number; postCount: number; createdBy: { id: string; name: string; avatar: string | null } }

interface GroupPost { id: string; content: string | null; images: string; createdAt: string; author: { id: string; name: string; username: string; avatar: string | null; department: string | null } }

const SECTION_COLORS = [{ bg: "bg-blue-600/20", text: "text-blue-400", border: "border-blue-500/30" }, { bg: "bg-green-600/20", text: "text-green-400", border: "border-green-500/30" }, { bg: "bg-purple-600/20", text: "text-purple-400", border: "border-purple-500/30" }, { bg: "bg-orange-600/20", text: "text-orange-400", border: "border-orange-500/30" }, { bg: "bg-pink-600/20", text: "text-pink-400", border: "border-pink-500/30" }, { bg: "bg-cyan-600/20", text: "text-cyan-400", border: "border-cyan-500/30" }];

function parseImages(imgs: string): string[] { try { return JSON.parse(imgs); } catch { return []; } }
function timeAgo(date: string) { const s = Math.floor((Date.now() - new Date(date).getTime()) / 1000); if (s < 60) return "just now"; if (s < 3600) return Math.floor(s/60)+"m"; if (s < 86400) return Math.floor(s/3600)+"h"; return Math.floor(s/86400)+"d"; }

export default function GroupDetailPage() {
  const { data: session } = useSession();
  const user = session?.user;
  const { onlineUsers } = useSocket(user?.id);
  const params = useParams();
  const router = useRouter();
  const groupId = params.id as string;

  const [group, setGroup] = useState<GroupDetail | null>(null);
  const [posts, setPosts] = useState<GroupPost[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [activeTab, setActiveTab] = useState<"posts" | "chat" | "sections" | "members">("posts");
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [sectionPosts, setSectionPosts] = useState<GroupPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [newPost, setNewPost] = useState("");
  const [posting, setPosting] = useState(false);
  const [showCreateSection, setShowCreateSection] = useState(false);
  const [newSection, setNewSection] = useState({ name: "", description: "", icon: "" });
  const [creatingSection, setCreatingSection] = useState(false);
  const [sectionPostContent, setSectionPostContent] = useState("");
  const [postingToSection, setPostingToSection] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [memberMenuId, setMemberMenuId] = useState<string | null>(null);
  const [togglingAnnounce, setTogglingAnnounce] = useState(false);
  // Deep link from the Messages > Groups tab: /groups/[id]?tab=chat opens the
  // chat directly. Read via window on mount (not useSearchParams, which would
  // force a Suspense boundary) and applied once the group has loaded.
  const wantedTab = useRef<"posts" | "chat" | "sections" | "members" | null>(null);

  useEffect(() => {
    const t = new URLSearchParams(window.location.search).get("tab");
    if (t === "posts" || t === "chat" || t === "sections" || t === "members") wantedTab.current = t;
    fetchGroup(); fetchPosts(); fetchSections();
  }, [groupId]);
  useEffect(() => { if (activeSection) fetchSectionPosts(activeSection); }, [activeSection]);

  const fetchGroup = async () => {
    try { const res = await fetch("/api/groups/" + groupId);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setGroup(data);
      setUnreadCount(data.unreadCount || 0);
      const wanted = wantedTab.current;
      wantedTab.current = null;
      // Honour the deep link, but never land a non-member on the chat tab.
      if (wanted && (wanted !== "chat" || data.isMember)) setActiveTab(wanted);
    } catch { toast.error("Group not found"); router.push("/groups"); } finally { setLoading(false); }
  };
  const fetchPosts = async () => { try { const r = await fetch("/api/groups/" + groupId + "/posts"); if (r.ok) setPosts(await r.json()); } catch (error) { console.error("Operation failed:", error); } };
  const fetchSections = async () => { try { const r = await fetch("/api/groups/" + groupId + "/sections"); if (r.ok) setSections(await r.json()); } catch (error) { console.error("Operation failed:", error); } };
  const fetchSectionPosts = async (sid: string) => { try { const r = await fetch("/api/sections/" + sid + "/posts"); if (r.ok) setSectionPosts(await r.json()); } catch (error) { console.error("Operation failed:", error); } };

  const handleJoin = async () => { try { await fetch("/api/groups/" + groupId + "/join", { method: "POST" }); fetchGroup(); fetchPosts(); fetchSections(); toast.success("Joined!"); } catch { toast.error("Failed"); } };
  const handleLeave = async () => {
    try {
      const r = await fetch("/api/groups/" + groupId + "/join", { method: "DELETE" });
      const data = await r.json().catch(() => ({}));
      if (data.deleted) {
        toast.success("You were the last member — group deleted");
        router.push("/groups");
        return;
      }
      fetchGroup();
      toast.success("Left");
    } catch { toast.error("Failed"); }
  };

  const handlePost = async () => {
    if (!newPost.trim()) return; setPosting(true);
    try { const res = await fetch("/api/groups/" + groupId + "/posts", { method: "POST", headers: {"Content-Type":"application/json"}, body: JSON.stringify({ content: newPost }) });
      if (!res.ok) throw new Error(); const post = await res.json(); setPosts([post, ...posts]); setNewPost(""); toast.success("Posted!");
    } catch { toast.error("Failed"); } finally { setPosting(false); }
  };

  // Count messages arriving while the chat tab is closed
  useSocketEvent("new-group-message", (msg: any) => {
    if (msg?.groupId === groupId && activeTab !== "chat" && msg.sender?.id !== user?.id) {
      setUnreadCount((c) => c + 1);
    }
  }, [groupId, activeTab, user?.id]);

  const isAdmin = group?.myRole === "admin";
  const canPost = !!group?.isMember && (group?.allowMemberPosts !== false || isAdmin);

  const toggleAnnounceMode = async () => {
    if (!group || togglingAnnounce) return;
    setTogglingAnnounce(true);
    try {
      const res = await fetch("/api/groups/" + groupId, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ allowMemberPosts: !group.allowMemberPosts }),
      });
      if (!res.ok) throw new Error();
      setGroup({ ...group, allowMemberPosts: !group.allowMemberPosts });
      toast.success(group.allowMemberPosts ? "Announcement mode ON — only admins can post" : "Members can post again");
    } catch { toast.error("Couldn't update setting"); } finally { setTogglingAnnounce(false); }
  };

  const changeRole = async (userId: string, role: "admin" | "member") => {
    setMemberMenuId(null);
    try {
      const res = await fetch(`/api/groups/${groupId}/members/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "role change failed");
      }
      toast.success(role === "admin" ? "Promoted to admin" : "Demoted to member");
      fetchGroup();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't change role");
    }
  };

  const kickMember = async (userId: string, name: string) => {
    setMemberMenuId(null);
    if (!confirm(`Remove ${name} from the group?`)) return;
    try {
      const res = await fetch(`/api/groups/${groupId}/members/${userId}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "remove failed");
      }
      toast.success(`${name} removed`);
      fetchGroup();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't remove member");
    }
  };

  const deleteGroup = async () => {
    if (!confirm(`Delete "${group?.name}" permanently? All posts, messages and sections will be removed.`)) return;
    try {
      const res = await fetch("/api/groups/" + groupId, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "delete failed");
      }
      toast.success("Group deleted");
      router.push("/groups");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't delete group");
    }
  };

  const handleCreateSection = async () => {
    if (!newSection.name.trim()) return; setCreatingSection(true);
    try { const res = await fetch("/api/groups/" + groupId + "/sections", { method: "POST", headers: {"Content-Type":"application/json"}, body: JSON.stringify(newSection) });
      if (!res.ok) throw new Error(); toast.success("Section created!"); setShowCreateSection(false); setNewSection({ name: "", description: "", icon: "" }); fetchSections();
    } catch { toast.error("Failed"); } finally { setCreatingSection(false); }
  };

  const handleSectionPost = async () => {
    if (!sectionPostContent.trim() || !activeSection) return; setPostingToSection(true);
    try { const res = await fetch("/api/sections/" + activeSection + "/posts", { method: "POST", headers: {"Content-Type":"application/json"}, body: JSON.stringify({ content: sectionPostContent }) });
      if (!res.ok) throw new Error(); const post = await res.json(); setSectionPosts([post, ...sectionPosts]); setSectionPostContent(""); toast.success("Posted!");
    } catch { toast.error("Failed"); } finally { setPostingToSection(false); }
  };

  if (loading) return <div className="min-h-screen bg-gray-50 dark:bg-dark-900 flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-500" /></div>;
  if (!group) return null;
  const emoji = groupEmoji(group.department);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-dark-900 pb-20 lg:pb-0">
      <div className="sticky top-0 z-10 bg-white/95 dark:bg-dark-900/95 backdrop-blur-sm border-b border-gray-200 dark:border-white/[0.06]">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          <button onClick={() => router.back()} className="p-1 text-gray-600 dark:text-gray-400"><HiArrowLeft className="text-xl" /></button>
          <div className="flex-1 min-w-0">
            <h1 className="font-semibold text-gray-900 dark:text-white truncate">{group.name}</h1>
            <p className="text-xs text-gray-500 dark:text-gray-400">{group.memberCount} members · {group.postCount} posts</p>
          </div>
          <button onClick={group.isMember ? handleLeave : handleJoin} className={"px-4 py-1.5 rounded-xl text-sm font-medium transition-all " + (group.isMember ? "bg-gray-100 dark:bg-dark-700 text-gray-500 dark:text-gray-400 hover:bg-red-50 dark:hover:bg-red-600/20 hover:text-red-500" : "bg-primary-600 hover:bg-primary-700 text-white")}>
            {group.isMember ? "Leave" : "Join"}
          </button>
        </div>
      </div>
      <div className="max-w-2xl mx-auto">
        <div className="h-32 bg-gradient-to-br from-primary-600 to-primary-800 flex items-center justify-center"><span className="text-6xl">{emoji}</span></div>
        <div className="px-4 py-3 border-b border-gray-200 dark:border-white/[0.06]">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">{group.name}</h2>
          {group.description && <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{group.description}</p>}
          <div className="flex gap-2 mt-2 flex-wrap">
            <span className="text-xs px-2 py-0.5 rounded-full bg-primary-600/20 text-primary-400">{group.type}</span>
            {group.department && <span className="text-xs px-2 py-0.5 rounded-full bg-blue-600/20 text-blue-400">{group.department}</span>}
            {group.batchYear && <span className="text-xs px-2 py-0.5 rounded-full bg-purple-600/20 text-purple-400">Batch {group.batchYear}</span>}
            {group.section && <span className="text-xs px-2 py-0.5 rounded-full bg-cyan-600/20 text-cyan-400">Sec {group.section}</span>}
            {isAdmin && <span className="text-xs px-2 py-0.5 rounded-full bg-amber-600/20 text-amber-400">👑 Admin</span>}
          </div>
          {group.isMember && group.allowMemberPosts === false && (
            <p className="text-xs text-orange-500 dark:text-orange-400 mt-2">📢 Announcement mode — only admins can post</p>
          )}
        </div>

        {/* Admin settings panel */}
        {isAdmin && (
          <div className="px-4 py-3 border-b border-gray-200 dark:border-white/[0.06] bg-gray-50 dark:bg-white/[0.02]">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-white">Announcement mode</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">When on, only admins can post</p>
              </div>
              <button
                onClick={toggleAnnounceMode}
                disabled={togglingAnnounce}
                aria-label="Toggle announcement mode"
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors shrink-0 ${
                  group.allowMemberPosts === false ? "bg-primary-600" : "bg-gray-300 dark:bg-gray-600"
                } ${togglingAnnounce ? "opacity-50" : ""}`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  group.allowMemberPosts === false ? "translate-x-6" : "translate-x-1"
                }`} />
              </button>
            </div>
            <button
              onClick={deleteGroup}
              className="mt-3 w-full flex items-center justify-center gap-2 py-2 text-sm font-medium rounded-xl bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-500/20 transition-colors"
            >
              <HiOutlineTrash className="text-sm" /> Delete group
            </button>
          </div>
        )}
        <div className="flex border-b border-gray-200 dark:border-white/[0.06]">
          {(["posts","chat","sections","members"] as const).map((tab) => (
            <button key={tab} onClick={() => { setActiveTab(tab); setActiveSection(null); }} className={"flex-1 py-3 text-sm font-medium capitalize transition-colors flex items-center justify-center gap-1.5 " + (activeTab === tab ? "text-primary-600 dark:text-primary-400 border-b-2 border-primary-600 dark:border-primary-400" : "text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white")}>
              {tab === "posts" && <HiOutlineChatAlt2 className="text-sm" />}
              {tab === "chat" && <HiOutlineChat className="text-sm" />}
              {tab === "sections" && <HiOutlineCollection className="text-sm" />}
              {tab === "members" && <HiOutlineUsers className="text-sm" />}
              {tab}
              {tab === "chat" && unreadCount > 0 && activeTab !== "chat" && (
                <span className="min-w-[18px] h-[18px] px-1 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* onRead fires once GroupChat's fetch has marked the group read server-side,
            so that is the moment the nav badge total actually changed. */}
        {activeTab === "chat" && (
          <GroupChat key={String(group.isMember)} groupId={groupId} isMember={group.isMember} isAdmin={isAdmin} onRead={() => { setUnreadCount(0); publish("groups-read"); }} />
        )}

        {activeTab === "posts" && (
          <div className="px-4 py-4 space-y-4">
            {canPost && (
              <div className="glass-card rounded-2xl p-4">
                <div className="flex gap-3">
                  <UserAvatar user={user ?? { name: "" }} size="sm" />
                  <div className="flex-1">
                    <textarea value={newPost} onChange={(e) => setNewPost(e.target.value)} placeholder={"Post in " + group.name + "..."} className="w-full bg-gray-100 dark:bg-dark-700 rounded-xl px-3 py-2 text-sm text-gray-900 dark:text-white resize-none focus:outline-none focus:ring-1 focus:ring-primary-500 min-h-[60px]" rows={2} />
                    <div className="flex justify-end mt-2">
                      <button onClick={handlePost} disabled={posting || !newPost.trim()} className="px-4 py-1.5 bg-primary-600 hover:bg-primary-700 rounded-xl text-sm font-medium disabled:opacity-50">{posting ? "Posting..." : "Post"}</button>
                    </div>
                  </div>
                </div>
              </div>
            )}
            {group.isMember && !canPost && (
              <div className="rounded-2xl border border-dashed border-orange-300 dark:border-orange-500/40 bg-orange-50 dark:bg-orange-500/10 px-4 py-3 text-center">
                <p className="text-sm text-orange-600 dark:text-orange-400">📢 Only admins can post announcements in this group</p>
              </div>
            )}
            {posts.length === 0 ? (
              <div className="text-center py-12"><span className="text-5xl mb-3 block">📝</span><p className="text-gray-500 dark:text-gray-400">No posts yet. Be the first!</p></div>
            ) : posts.map((post) => (
              <div key={post.id} className="glass-card rounded-2xl p-4">
                <div className="flex items-center gap-3 mb-3">
                  <UserAvatar user={post.author} size="sm" />
                  <div><p className="text-sm font-semibold text-gray-900 dark:text-white">{post.author.name}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">@{post.author.username} · {timeAgo(post.createdAt)}</p></div>
                </div>
                {post.content && <p className="text-sm text-gray-700 dark:text-gray-200 whitespace-pre-wrap">{post.content}</p>}
                {parseImages(post.images).length > 0 && <div className="grid grid-cols-2 gap-2 mt-3">{parseImages(post.images).map((img: string, i: number) => <img key={i} src={img} alt="" className="rounded-xl w-full aspect-square object-cover" />)}</div>}
              </div>
            ))}
          </div>
        )}

        {activeTab === "sections" && (
          <div className="px-4 py-4">
            {group.isMember && !activeSection && (
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Sections</h3>
                <button onClick={() => setShowCreateSection(true)} className="flex items-center gap-1 px-3 py-1.5 bg-primary-600 hover:bg-primary-700 rounded-xl text-sm font-medium"><HiOutlinePlus className="text-sm" />New Section</button>
              </div>
            )}
            {showCreateSection && (
              <div className="glass-card rounded-2xl p-5 mb-4">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Create Section</h3>
                <input type="text" value={newSection.name} onChange={(e) => setNewSection({...newSection, name: e.target.value})} placeholder="Section name (e.g., Announcements, Assignments)" className="w-full px-4 py-2.5 bg-gray-100 dark:bg-dark-700 border border-gray-200 dark:border-dark-500 rounded-xl text-sm text-gray-900 dark:text-white mb-3 focus:outline-none focus:border-primary-500" />
                <textarea value={newSection.description} onChange={(e) => setNewSection({...newSection, description: e.target.value})} placeholder="Description (optional)" className="w-full px-4 py-2.5 bg-gray-100 dark:bg-dark-700 border border-gray-200 dark:border-dark-500 rounded-xl text-sm text-gray-900 dark:text-white mb-3 resize-none" rows={2} />
                <input type="text" value={newSection.icon} onChange={(e) => setNewSection({...newSection, icon: e.target.value})} placeholder="Icon emoji (e.g., announcement, docs)" className="w-full px-4 py-2.5 bg-gray-100 dark:bg-dark-700 border border-gray-200 dark:border-dark-500 rounded-xl text-sm text-gray-900 dark:text-white mb-3 focus:outline-none focus:border-primary-500" />
                <div className="flex gap-2">
                  <button onClick={() => setShowCreateSection(false)} className="flex-1 py-2 bg-gray-100 dark:bg-dark-700 hover:bg-gray-200 dark:hover:bg-dark-600 rounded-xl text-sm font-medium text-gray-700 dark:text-gray-300">Cancel</button>
                  <button onClick={handleCreateSection} disabled={creatingSection || !newSection.name.trim()} className="flex-1 py-2 bg-primary-600 hover:bg-primary-700 rounded-xl text-sm font-medium disabled:opacity-50">{creatingSection ? "Creating..." : "Create"}</button>
                </div>
              </div>
            )}
            {!activeSection ? (
              sections.length === 0 ? (
                <div className="text-center py-12"><span className="text-5xl mb-3 block">📂</span><p className="text-gray-500 dark:text-gray-400">No sections yet</p><p className="text-gray-400 dark:text-gray-500 text-sm mt-1">Create sections to organize posts by topic</p></div>
              ) : (
                <div className="space-y-3">
                  {sections.map((section, i) => {
                    const cs = SECTION_COLORS[i % SECTION_COLORS.length];
                    return (
                      <button key={section.id} onClick={() => setActiveSection(section.id)} className="w-full glass-card rounded-2xl p-4 flex items-center gap-4 hover:shadow-md transition-all text-left">
                        <div className={"w-12 h-12 rounded-xl " + cs.bg + " " + cs.border + " border flex items-center justify-center text-2xl flex-shrink-0"}>{section.icon || "📁"}</div>
                        <div className="flex-1 min-w-0"><h4 className="font-semibold text-gray-900 dark:text-white">{section.name}</h4>
                          {section.description && <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{section.description}</p>}
                          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{section.postCount} posts</p></div>
                        <div className="text-gray-400"><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg></div>
                      </button>
                    );
                  })}
                </div>
              )
            ) : (
              <div>
                <button onClick={() => setActiveSection(null)} className="flex items-center gap-1 text-sm text-primary-600 dark:text-primary-400 mb-4 hover:underline"><HiArrowLeft className="text-sm" /> Back to Sections</button>
                {canPost && (
                  <div className="glass-card rounded-2xl p-4 mb-4">
                    <div className="flex gap-3">
                      <UserAvatar user={user ?? { name: "" }} size="sm" />
                      <div className="flex-1">
                        <textarea value={sectionPostContent} onChange={(e) => setSectionPostContent(e.target.value)} placeholder="Post in this section..." className="w-full bg-gray-100 dark:bg-dark-700 rounded-xl px-3 py-2 text-sm text-gray-900 dark:text-white resize-none focus:outline-none focus:ring-1 focus:ring-primary-500 min-h-[60px]" rows={2} />
                        <div className="flex justify-end mt-2">
                          <button onClick={handleSectionPost} disabled={postingToSection || !sectionPostContent.trim()} className="px-4 py-1.5 bg-primary-600 hover:bg-primary-700 rounded-xl text-sm font-medium disabled:opacity-50">{postingToSection ? "Posting..." : "Post"}</button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                {sectionPosts.length === 0 ? (
                  <div className="text-center py-12"><span className="text-5xl mb-3 block">📝</span><p className="text-gray-500 dark:text-gray-400">No posts in this section yet</p></div>
                ) : (
                  <div className="space-y-4">
                    {sectionPosts.map((post) => (
                      <div key={post.id} className="glass-card rounded-2xl p-4">
                        <div className="flex items-center gap-3 mb-3">
                          <UserAvatar user={post.author} size="sm" />
                          <div><p className="text-sm font-semibold text-gray-900 dark:text-white">{post.author.name}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">@{post.author.username} · {timeAgo(post.createdAt)}</p></div>
                        </div>
                        {post.content && <p className="text-sm text-gray-700 dark:text-gray-200 whitespace-pre-wrap">{post.content}</p>}
                        {parseImages(post.images).length > 0 && <div className="grid grid-cols-2 gap-2 mt-3">{parseImages(post.images).map((img: string, i: number) => <img key={i} src={img} alt="" className="rounded-xl w-full aspect-square object-cover" />)}</div>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {activeTab === "members" && (
          <div className="px-4 py-4 space-y-2" onClick={() => setMemberMenuId(null)}>
            {group.members.map((member) => {
              const isSelf = member.user.id === user?.id;
              const menuOpen = memberMenuId === member.id;
              const isOnline = onlineUsers?.includes(member.user.id) ?? false;
              return (
                <div key={member.id} className="relative flex items-center gap-3 p-3 rounded-xl hover:bg-gray-100 dark:hover:bg-dark-800 transition-colors">
                  <Link href={"/profile/" + member.user.username} className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="relative">
                      <UserAvatar user={member.user} size="sm" />
                      {(isOnline || !isSelf) && (
                        <div className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white dark:border-dark-900 ${
                          isOnline ? "bg-green-400" : "bg-gray-400"
                        }`} title={isOnline ? "Active now" : formatLastSeen(member.user.lastSeen)} />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{member.user.name}{isSelf && " (you)"}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                        @{member.user.username}
                        {!isSelf && !isOnline && member.user.lastSeen && (
                          <span className="text-gray-400 dark:text-gray-500">· {formatLastSeen(member.user.lastSeen)}</span>
                        )}
                      </p>
                    </div>
                    {member.role === "admin" && <span className="text-xs px-2 py-0.5 rounded-full bg-primary-600/20 text-primary-400">👑 Admin</span>}
                    {member.user.department && <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-dark-700 text-gray-500 dark:text-gray-400">{member.user.department}</span>}
                  </Link>
                  {isAdmin && !isSelf && (
                    <button
                      onClick={(e) => { e.stopPropagation(); setMemberMenuId(menuOpen ? null : member.id); }}
                      aria-label={`Actions for ${member.user.name}`}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-200 dark:hover:bg-white/10"
                    >
                      <HiDotsHorizontal className="text-lg" />
                    </button>
                  )}
                  {menuOpen && (
                    <div className="absolute right-2 top-full z-20 mt-1 w-52 bg-white dark:bg-dark-700 border border-gray-200 dark:border-white/[0.1] rounded-xl shadow-xl py-1 overflow-hidden" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => changeRole(member.user.id, member.role === "admin" ? "member" : "admin")}
                        className="w-full text-left px-4 py-2.5 text-sm text-gray-800 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-white/[0.06] flex items-center gap-2"
                      >
                        <HiOutlineShieldCheck className="text-sm text-amber-500" />
                        {member.role === "admin" ? "Remove as admin" : "Make admin"}
                      </button>
                      <button
                        onClick={() => kickMember(member.user.id, member.user.name)}
                        className="w-full text-left px-4 py-2.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 flex items-center gap-2"
                      >
                        <HiOutlineTrash className="text-sm" />
                        Remove from group
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

      </div>
    </div>
  );
}
