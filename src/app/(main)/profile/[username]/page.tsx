"use client";

import { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { useParams, useRouter } from "next/navigation";
import UserAvatar from "@/components/UserAvatar";
import PostCard from "@/components/PostCard";
import EditProfile from "@/components/EditProfile";
import FollowersModal from "@/components/FollowersModal";
import { HiOutlineMail, HiCamera, HiHeart, HiOutlineLogout, HiOutlinePlus } from "react-icons/hi";
import { signOut } from "next-auth/react";
import Link from "next/link";
import { parseImages } from "@/lib/utils";
import toast from "react-hot-toast";

export default function ProfilePage() {
  const { data: session } = useSession();
  const params = useParams();
  const router = useRouter();
  const username = params.username as string;
  const currentUser = session?.user as any;

  const [profile, setProfile] = useState<any>(null);
  const [posts, setPosts] = useState<any[]>([]);
  const [isFollowing, setIsFollowing] = useState(false);
  const [doesFollowYou, setDoesFollowYou] = useState(false);
  const [followersCount, setFollowersCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"posts" | "grid">("posts");
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [showFollowersModal, setShowFollowersModal] = useState(false);
  const [showFollowingModal, setShowFollowingModal] = useState(false);
  const coverFileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchProfile();
  }, [username]);

  const fetchProfile = async () => {
    try {
      const usersRes = await fetch(`/api/users?q=${username}`);
      const users = await usersRes.json();
      const userData = users[0];
      if (!userData) { setLoading(false); return; }

      setProfile(userData);
      setFollowersCount(userData._count?.followers || 0);

      const postsRes = await fetch(`/api/posts?userId=${userData.id}`);
      const postsData = await postsRes.json();
      setPosts(postsData);

      const isSelfProfile = userData.id === currentUser?.id;
      if (!isSelfProfile) {
        const followCheck = await fetch(`/api/users/${userData.id}/follow`);
        const followData = await followCheck.json();
        setIsFollowing(followData.isFollowing);
        setDoesFollowYou(followData.doesFollowYou);
      }
    } catch {} finally {
      setLoading(false);
    }
  };

  const handleFollow = async () => {
    try {
      const res = await fetch(`/api/users/${profile.id}/follow`, { method: "POST" });
      const data = await res.json();
      setIsFollowing(data.isFollowing);
      setDoesFollowYou(data.doesFollowYou);
      setFollowersCount((prev) => data.isFollowing ? prev + 1 : prev - 1);
    } catch {}
  };

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingCover(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      const data = await res.json();
      if (data.url) {
        // Update profile with cover photo
        await fetch("/api/users/profile", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ coverPhoto: data.url }),
        });
        setProfile({ ...profile, coverPhoto: data.url });
        toast.success("Cover photo updated!");
      }
    } catch {
      toast.error("Failed to upload cover photo");
    } finally {
      setUploadingCover(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-6">
        <div className="glass rounded-2xl overflow-hidden animate-pulse">
          <div className="h-40 bg-gray-200 dark:bg-dark-600" />
          <div className="p-6">
            <div className="flex items-center gap-6">
              <div className="w-24 h-24 bg-gray-200 dark:bg-dark-700 rounded-full -mt-12 border-4 border-white dark:border-dark-900" />
              <div className="flex-1">
                <div className="h-6 bg-gray-200 dark:bg-dark-600 rounded w-1/3 mb-3" />
                <div className="h-4 bg-dark-600 rounded w-1/4" />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-6">
        <div className="glass rounded-2xl p-12 text-center">
          <p className="text-gray-400 text-lg">User not found</p>
        </div>
      </div>
    );
  }

  const isSelf = profile.id === currentUser?.id;

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      {/* Profile Card */}
      <div className="glass rounded-2xl overflow-hidden mb-4">
        {/* Cover Photo */}
        <div className="relative h-40 bg-gradient-to-br from-campus-900 via-campus-700 to-primary-800">
          {profile.coverPhoto && (
            <img src={profile.coverPhoto} alt="Cover" className="w-full h-full object-cover" />
          )}
          {/* Cover pattern overlay */}
          <div className="absolute inset-0 opacity-20">
            <div className="absolute top-4 right-4 text-6xl opacity-30">🎓</div>
            <div className="absolute bottom-4 left-4 text-4xl opacity-20">📚</div>
          </div>
          {isSelf && (
            <button
              onClick={() => coverFileRef.current?.click()}
              disabled={uploadingCover}
              className="absolute bottom-3 right-3 bg-black/60 hover:bg-black/80 rounded-full p-2 transition-colors"
            >
              <HiCamera className="text-white text-sm" />
            </button>
          )}
          <input
            ref={coverFileRef}
            type="file"
            accept="image/*"
            onChange={handleCoverUpload}
            className="hidden"
          />
          {uploadingCover && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-white" />
            </div>
          )}
        </div>

        {/* Profile Info */}
        <div className="px-6 pb-6">
          <div className="flex flex-col sm:flex-row items-center sm:items-end gap-4 -mt-12 mb-4">
            <div className="relative">
              <UserAvatar user={profile} size="xl" />
              {isSelf && (
                <button
                  onClick={() => setShowEditProfile(true)}
                  className="absolute -bottom-1 -right-1 bg-primary-600 hover:bg-primary-700 rounded-full p-1.5 border-2 border-white dark:border-dark-900 transition-colors shadow-lg"
                >
                  <HiCamera className="text-xs text-white" />
                </button>
              )}
            </div>
            <div className="flex-1 text-center sm:text-left sm:pb-1">
              {isSelf ? (
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowEditProfile(true)}
                    className="px-5 py-1.5 border border-gray-300 dark:border-white/20 rounded-lg text-sm font-semibold hover:bg-gray-50 dark:hover:bg-white/5 transition-all text-gray-700 dark:text-white"
                  >
                    Edit Profile
                  </button>
                  <Link
                    href="/create"
                    className="px-4 py-1.5 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-sm font-semibold transition-all flex items-center gap-1.5"
                  >
                    <HiOutlinePlus className="text-sm" />
                    Post
                  </Link>
                  <button
                    onClick={() => signOut({ callbackUrl: "/login" })}
                    className="px-3 py-1.5 border border-red-500/30 text-red-400 rounded-lg text-sm font-semibold hover:bg-red-500/10 transition-all"
                    title="Sign out"
                  >
                    <HiOutlineLogout className="text-lg" />
                  </button>
                </div>
              ) : (
                <div className="flex gap-2 justify-center sm:justify-start">
                  <button
                    onClick={handleFollow}
                    className={`px-6 py-1.5 rounded-lg text-sm font-semibold transition-all ${
                      isFollowing
                        ? "bg-gray-200 dark:bg-dark-600 hover:bg-gray-300 dark:hover:bg-dark-500 text-gray-700 dark:text-white"
                        : doesFollowYou
                        ? "bg-green-600 hover:bg-green-700"
                        : "bg-primary-600 hover:bg-primary-700"
                    }`}
                  >
                    {isFollowing ? "Following" : doesFollowYou ? "Follow Back" : "Follow"}
                  </button>
                  <button
                    onClick={() => router.push(`/messages/${profile.id}`)}
                    className="px-4 py-1.5 border border-white/20 rounded-lg text-sm hover:bg-white/5 transition-all"
                  >
                    <HiOutlineMail className="text-lg" />
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Name & Username */}
          <h1 className="text-2xl font-bold text-center sm:text-left">{profile.name}</h1>
          <div className="flex items-center gap-2 mb-3 justify-center sm:justify-start">
              <p className="text-gray-500">@{profile.username}</p>
              {!isSelf && doesFollowYou && (
                <span className="text-xs bg-primary-600/20 text-primary-400 px-2 py-0.5 rounded-full border border-primary-500/30">Follows you</span>
              )}
            </div>

          {/* Student Info Badges */}
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mb-3">
            {profile.department && (
              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-campus-600/20 text-campus-300 border border-campus-500/30">
                {profile.department}
              </span>
            )}
            {profile.batchYear && (
              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-purple-600/20 text-purple-300 border border-purple-500/30">
                Batch {profile.batchYear}
              </span>
            )}
            {profile.rollNumber && (
              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 dark:bg-dark-600 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-white/10">
                #{profile.rollNumber}
              </span>
            )}
          </div>

          {profile.bio && <p className="text-gray-300 mb-4 text-center sm:text-left">{profile.bio}</p>}

          {/* Stats */}
          <div className="flex justify-center sm:justify-start gap-8 text-sm">
            <div>
              <span className="font-bold">{posts.length}</span>{" "}
              <span className="text-gray-500">{posts.length === 1 ? "post" : "posts"}</span>
            </div>
            <button
              onClick={() => setShowFollowersModal(true)}
              className="hover:opacity-80 transition-opacity"
            >
              <span className="font-bold">{followersCount}</span>{" "}
              <span className="text-gray-500">{followersCount === 1 ? "follower" : "followers"}</span>
            </button>
            <button
              onClick={() => setShowFollowingModal(true)}
              className="hover:opacity-80 transition-opacity"
            >
              <span className="font-bold">{profile._count?.following || 0}</span>{" "}
              <span className="text-gray-500">{(profile._count?.following || 0) === 1 ? "following" : "following"}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 dark:border-white/10">
        <button
          onClick={() => setActiveTab("posts")}
          className={`flex-1 py-3 text-sm font-semibold transition-all ${
            activeTab === "posts" ? "text-white border-b-2 border-white" : "text-gray-500"
          }`}
        >
          📸 Posts
        </button>
        <button
          onClick={() => setActiveTab("grid")}
          className={`flex-1 py-3 text-sm font-semibold transition-all ${
            activeTab === "grid" ? "text-white border-b-2 border-white" : "text-gray-500"
          }`}
        >
          🔲 Grid
        </button>
      </div>

      {/* Content */}
      {activeTab === "posts" ? (
        posts.length === 0 ? (
          <div className="p-12 text-center">
            <div className="text-5xl mb-4">📝</div>
            <p className="text-gray-400 font-medium">No posts yet</p>
            <p className="text-gray-500 text-sm mt-1">Share what&apos;s on your mind!</p>
          </div>
        ) : (
          posts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              onDelete={() => setPosts(posts.filter((p) => p.id !== post.id))}
            />
          ))
        )
      ) : (
        /* 3-Column Photo Grid — Instagram style */
        posts.length === 0 ? (
          <div className="p-12 text-center">
            <div className="text-5xl mb-4">📸</div>
            <p className="text-gray-400 font-medium">No photos yet</p>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-0.5">
            {posts.map((post) => {
              const postImages = parseImages(post.images);
              const firstImage = postImages[0];
              return (
                <div
                  key={post.id}
                  className="relative aspect-square bg-dark-800 cursor-pointer group"
                  onClick={() => {
                    setActiveTab("posts");
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                >
                  {firstImage ? (
                    <img src={firstImage} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center p-2">
                      <p className="text-xs text-gray-500 text-center line-clamp-3">{post.content}</p>
                    </div>
                  )}
                  {/* Hover overlay */}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
                    <span className="text-white text-sm font-semibold flex items-center gap-1">
                      <HiHeart className="text-white" /> {post.likesCount || 0}
                    </span>
                    <span className="text-white text-sm font-semibold flex items-center gap-1">
                      💬 {post.commentsCount || 0}
                    </span>
                  </div>
                  {/* Multi-image indicator */}
                  {postImages.length > 1 && (
                    <div className="absolute top-2 right-2">
                      <span className="text-white text-xs">🔲</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )
      )}

      {/* Edit Profile Modal */}
      {showFollowersModal && (
        <FollowersModal
          isOpen={showFollowersModal}
          onClose={() => setShowFollowersModal(false)}
          userId={profile.id}
          type="followers"
          count={followersCount}
        />
      )}
      {showFollowingModal && (
        <FollowersModal
          isOpen={showFollowingModal}
          onClose={() => setShowFollowingModal(false)}
          userId={profile.id}
          type="following"
          count={profile._count?.following || 0}
        />
      )}
      {showEditProfile && (
        <EditProfile
          user={profile}
          onClose={() => setShowEditProfile(false)}
          onUpdated={(updated) => {
            setProfile({ ...profile, ...updated });
          }}
        />
      )}
    </div>
  );
}
