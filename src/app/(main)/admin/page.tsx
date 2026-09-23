'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSession } from '@/lib/appwrite-session';

interface User {
  id: string;
  name: string;
  username: string;
  email: string;
  role: string;
  verified: boolean;
  createdAt: string;
  _count: {
    posts: number;
    followers: number;
  };
}

interface Stats {
  totalUsers: number;
  totalPosts: number;
  totalGroups: number;
  totalMessages: number;
  usersByRole: { role: string; count: number }[];
  recentUsers: User[];
}

interface EmailHealth {
  ok: boolean;
  reach: 'all' | 'owner-only' | 'none';
  providers: {
    provider: string;
    configured: boolean;
    ok: boolean;
    detail: string;
  }[];
}

const REACH_LABEL: Record<string, string> = {
  all: 'Reaching every recipient',
  'owner-only': 'Reaching the account owner only',
  none: 'Not able to send',
};

export default function AdminDashboard() {
  const { data: session } = useSession();
  const user = session?.user as any;
  const router = useRouter();
  const [stats, setStats] = useState<Stats | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'moderation' | 'system'>('overview');
  const [searchQuery, setSearchQuery] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [emailHealth, setEmailHealth] = useState<EmailHealth | null>(null);
  const [checkingEmail, setCheckingEmail] = useState(false);

  useEffect(() => {
    if (user && user.role !== 'admin') {
      router.push('/feed');
      return;
    }
    fetchStats();
    fetchUsers();
    fetchEmailHealth();
  }, [user, router]);

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/admin/stats', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/admin/users', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users || []);
      }
    } catch (error) {
      console.error('Failed to fetch users:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchEmailHealth = async () => {
    setCheckingEmail(true);
    try {
      const res = await fetch('/api/admin/email-health', { credentials: 'include' });
      if (res.ok) {
        setEmailHealth(await res.json());
      }
    } catch (error) {
      console.error('Failed to check email health:', error);
    } finally {
      setCheckingEmail(false);
    }
  };

  const handleRoleChange = async (userId: string, newRole: string) => {
    setActionLoading(userId);
    try {
      const res = await fetch(`/api/admin/users/${userId}/role`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole }),
        credentials: 'include',
      });
      if (res.ok) {
        setUsers(users.map(u => u.id === userId ? { ...u, role: newRole } : u));
      }
    } catch (error) {
      console.error('Failed to update role:', error);
    } finally {
      setActionLoading(null);
    }
  };

  const handleVerifyUser = async (userId: string, verified: boolean) => {
    setActionLoading(userId);
    try {
      const res = await fetch(`/api/admin/users/${userId}/verify`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ verified }),
        credentials: 'include',
      });
      if (res.ok) {
        setUsers(users.map(u => u.id === userId ? { ...u, verified } : u));
      }
    } catch (error) {
      console.error('Failed to verify user:', error);
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('Are you sure you want to delete this user?')) return;
    setActionLoading(userId);
    try {
      const res = await fetch(`/api/admin/users/${userId}`, { method: 'DELETE', credentials: 'include' });
      if (res.ok) {
        setUsers(users.filter(u => u.id !== userId));
      }
    } catch (error) {
      console.error('Failed to delete user:', error);
    } finally {
      setActionLoading(null);
    }
  };

  const filteredUsers = users.filter(u =>
    u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (user?.role !== 'admin') {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-4">Access Denied</h1>
          <p className="text-gray-400 mb-6">You need admin privileges to access this page.</p>
          <Link href="/feed" className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            Go to Feed
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <div className="bg-gray-900 border-b border-gray-800 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Admin Dashboard</h1>
            <p className="text-gray-400 text-sm">CampusConnect Administration</p>
          </div>
          <div className="flex items-center gap-4">
            <span className="px-3 py-1 bg-purple-600/20 text-purple-400 rounded-full text-sm font-medium">
              👑 Admin
            </span>
            <Link href="/feed" className="text-gray-400 hover:text-white">
              ← Back to Feed
            </Link>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-gray-900 border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex gap-1">
            {(['overview', 'users', 'moderation', 'system'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-3 text-sm font-medium capitalize transition-colors ${
                  activeTab === tab
                    ? 'text-blue-400 border-b-2 border-blue-400'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                {tab}
                {tab === 'system' && emailHealth && !emailHealth.ok && (
                  <span className="ml-2 inline-block w-2 h-2 rounded-full bg-red-500" />
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 py-6">
        {activeTab === 'overview' && stats && (
          <div className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'Total Users', value: stats.totalUsers, color: 'blue' },
                { label: 'Total Posts', value: stats.totalPosts, color: 'green' },
                { label: 'Total Groups', value: stats.totalGroups, color: 'purple' },
                { label: 'Total Messages', value: stats.totalMessages, color: 'pink' },
              ].map(stat => (
                <div key={stat.label} className="bg-gray-900 rounded-xl p-4 border border-gray-800">
                  <p className="text-gray-400 text-sm">{stat.label}</p>
                  <p className={`text-3xl font-bold text-${stat.color}-400`}>{stat.value}</p>
                </div>
              ))}
            </div>

            {/* Users by Role */}
            <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
              <h3 className="text-lg font-semibold mb-4">Users by Role</h3>
              <div className="space-y-3">
                {stats.usersByRole.map(r => (
                  <div key={r.role} className="flex items-center justify-between">
                    <span className="capitalize text-gray-300">{r.role}</span>
                    <div className="flex items-center gap-3">
                      <div className="w-32 bg-gray-800 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${
                            r.role === 'admin' ? 'bg-purple-500' :
                            r.role === 'teacher' ? 'bg-green-500' : 'bg-blue-500'
                          }`}
                          style={{ width: `${(r.count / stats.totalUsers) * 100}%` }}
                        />
                      </div>
                      <span className="text-gray-400 w-8 text-right">{r.count}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent Users */}
            <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
              <h3 className="text-lg font-semibold mb-4">Recent Users</h3>
              <div className="space-y-3">
                {stats.recentUsers.slice(0, 5).map(u => (
                  <div key={u.id} className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center text-sm font-medium">
                        {u.name.charAt(0)}
                      </div>
                      <div>
                        <p className="font-medium">{u.name}</p>
                        <p className="text-sm text-gray-400">{u.email}</p>
                      </div>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      u.role === 'admin' ? 'bg-purple-600/20 text-purple-400' :
                      u.role === 'teacher' ? 'bg-green-600/20 text-green-400' :
                      'bg-blue-600/20 text-blue-400'
                    }`}>
                      {u.role}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'users' && (
          <div className="space-y-4">
            {/* Search */}
            <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
              <input
                type="text"
                placeholder="Search users by name, email, or username..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
              />
            </div>

            {/* Users List */}
            <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
              {loading ? (
                <div className="p-8 text-center text-gray-400">Loading users...</div>
              ) : filteredUsers.length === 0 ? (
                <div className="p-8 text-center text-gray-400">No users found</div>
              ) : (
                <div className="divide-y divide-gray-800">
                  {filteredUsers.map(u => (
                    <div key={u.id} className="p-4 flex items-center justify-between hover:bg-gray-800/50">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-gray-700 flex items-center justify-center font-medium">
                          {u.name.charAt(0)}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-medium">{u.name}</p>
                            {u.verified && <span className="text-blue-400">✓</span>}
                            {u.role === 'admin' && <span className="text-purple-400">👑</span>}
                            {u.role === 'teacher' && <span className="text-green-400">📚</span>}
                          </div>
                          <p className="text-sm text-gray-400">@{u.username} · {u.email}</p>
                          <p className="text-xs text-gray-500">
                            {u._count.posts} posts · {u._count.followers} followers
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <select
                          value={u.role}
                          onChange={(e) => handleRoleChange(u.id, e.target.value)}
                          disabled={actionLoading === u.id}
                          className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-1 text-sm text-white"
                        >
                          <option value="student">Student</option>
                          <option value="teacher">Teacher</option>
                          <option value="admin">Admin</option>
                        </select>
                        <button
                          onClick={() => handleVerifyUser(u.id, !u.verified)}
                          disabled={actionLoading === u.id}
                          className={`px-3 py-1 rounded-lg text-sm ${
                            u.verified
                              ? 'bg-green-600/20 text-green-400 hover:bg-green-600/30'
                              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                          }`}
                        >
                          {u.verified ? 'Verified' : 'Verify'}
                        </button>
                        <button
                          onClick={() => handleDeleteUser(u.id)}
                          disabled={actionLoading === u.id}
                          className="px-3 py-1 bg-red-600/20 text-red-400 rounded-lg text-sm hover:bg-red-600/30"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'moderation' && (
          <div className="bg-gray-900 rounded-xl p-8 border border-gray-800 text-center">
            <div className="text-4xl mb-4">🛡️</div>
            <h3 className="text-xl font-semibold mb-2">Content Moderation</h3>
            <p className="text-gray-400 mb-6">
              Review reported content, manage flagged posts, and enforce community guidelines.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-2xl mx-auto">
              <div className="bg-gray-800 rounded-xl p-4">
                <p className="text-3xl font-bold text-yellow-400">0</p>
                <p className="text-gray-400 text-sm">Reported Posts</p>
              </div>
              <div className="bg-gray-800 rounded-xl p-4">
                <p className="text-3xl font-bold text-orange-400">0</p>
                <p className="text-gray-400 text-sm">Flagged Users</p>
              </div>
              <div className="bg-gray-800 rounded-xl p-4">
                <p className="text-3xl font-bold text-green-400">0</p>
                <p className="text-gray-400 text-sm">Resolved Today</p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'system' && (
          <div className="space-y-6">
            {/* Delivery summary */}
            <div className={`rounded-xl p-4 border ${
              emailHealth?.ok ? 'bg-green-600/10 border-green-600/30' : 'bg-red-600/10 border-red-600/30'
            }`}>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold">Email Delivery</h3>
                  <p className={`text-sm ${emailHealth?.ok ? 'text-green-400' : 'text-red-400'}`}>
                    {!emailHealth ? 'Checking providers…' : REACH_LABEL[emailHealth.reach]}
                  </p>
                </div>
                <button
                  onClick={fetchEmailHealth}
                  disabled={checkingEmail}
                  className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm hover:bg-gray-700 disabled:opacity-50"
                >
                  {checkingEmail ? 'Checking…' : 'Re-check'}
                </button>
              </div>
            </div>

            {/* Per-provider detail */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {(emailHealth?.providers ?? []).map(p => (
                <div key={p.provider} className="bg-gray-900 rounded-xl p-6 border border-gray-800">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-semibold capitalize">{p.provider}</h4>
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      p.ok ? 'bg-green-600/20 text-green-400' : 'bg-red-600/20 text-red-400'
                    }`}>
                      {p.ok ? 'Ready' : 'Not delivering'}
                    </span>
                  </div>
                  <p className="text-sm text-gray-400">{p.detail}</p>
                </div>
              ))}
            </div>

            {emailHealth && !emailHealth.ok && (
              <p className="text-sm text-amber-400">
                Password reset codes are not reaching everyone. Fix the provider above, then re-check.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
