'use client';


import React, { useState, useEffect } from 'react';
import { Card, Button, Badge, ProgressBar, Input } from '../components/UIElements';
import { ICONS } from '../constants';
import { AppRoute } from '../types';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell, AreaChart, Area } from 'recharts';
import { adminService, type UserFormData } from '../src/services/admin.service';
import type { User } from '../types';

interface AdminDashboardProps {
  currentSubRoute: AppRoute;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ currentSubRoute }) => {
  // User management state
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [formData, setFormData] = useState<UserFormData>({
    name: '',
    email: '',
    password: '',
    role: 'student',
    isActive: true,
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Load users when viewing users section
  useEffect(() => {
    if (currentSubRoute === AppRoute.ADMIN_USERS) {
      loadUsers();
    }
  }, [currentSubRoute, currentPage, searchTerm]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const data = await adminService.getUsers({
        page: currentPage,
        limit: 10,
        search: searchTerm,
      });
      setUsers(data.users);
      setTotalPages(data.totalPages);
    } catch (error: any) {
      console.error('Failed to load users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = () => {
    setEditingUser(null);
    setFormData({
      name: '',
      email: '',
      password: '',
      role: 'student',
      isActive: true,
    });
    setShowModal(true);
  };

  const handleEditUser = (user: User) => {
    setEditingUser(user);
    setFormData({
      name: user.name,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
      avatar: user.avatar,
    });
    setShowModal(true);
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);
      if (editingUser) {
        await adminService.updateUser(editingUser.id, formData);
      } else {
        if (!formData.password) {
          alert('Password is required for new users');
          return;
        }
        await adminService.createUser(formData);
      }
      setShowModal(false);
      loadUsers();
    } catch (error: any) {
      alert(error.message || 'Operation failed');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (user: User) => {
    if (!confirm(`Are you sure you want to delete ${user.name}?`)) return;

    try {
      setLoading(true);
      await adminService.deleteUser(user.id);
      loadUsers();
    } catch (error: any) {
      alert(error.message || 'Failed to delete user');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async (user: User) => {
    try {
      await adminService.updateUser(user.id, { isActive: !user.isActive });
      loadUsers();
    } catch (error: any) {
      alert(error.message || 'Failed to update status');
    }
  };
  
  const stats = [
    { label: 'Total Explorers', value: '42.5k', change: '+12%', icon: ICONS.Profile, color: 'text-indigo-600', bg: 'bg-indigo-100' },
    { label: 'Active Sessions', value: '1,204', change: '+5%', icon: ICONS.Focus, color: 'text-emerald-600', bg: 'bg-emerald-100' },
    { label: 'Reports Pending', value: '12', change: '-2%', icon: ICONS.Admin, color: 'text-rose-600', bg: 'bg-rose-100' },
    { label: 'AI Usage (Tokens)', value: '8.4M', change: '+25%', icon: ICONS.Sparkles, color: 'text-amber-600', bg: 'bg-amber-100' },
  ];

  const chartData = [
    { name: 'Mon', usage: 400, growth: 240 },
    { name: 'Tue', usage: 300, growth: 139 },
    { name: 'Wed', usage: 600, growth: 980 },
    { name: 'Thu', usage: 800, growth: 390 },
    { name: 'Fri', usage: 500, growth: 480 },
    { name: 'Sat', usage: 200, growth: 380 },
    { name: 'Sun', usage: 150, growth: 430 },
  ];

  const renderActiveSection = () => {
    switch (currentSubRoute) {
      case AppRoute.ADMIN:
        return (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {stats.map((s, i) => (
                <Card key={i} className="flex items-center gap-5 border-b-8 border-slate-100">
                  <div className={`w-14 h-14 ${s.bg} ${s.color} rounded-[1.5rem] flex items-center justify-center shadow-lg`}>
                    <s.icon size={28} strokeWidth={3} />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{s.label}</p>
                    <h4 className="text-2xl font-black text-slate-800">{s.value}</h4>
                    <span className={`text-[10px] font-black ${s.change.startsWith('+') ? 'text-emerald-500' : 'text-rose-500'}`}>{s.change} vs last month</span>
                  </div>
                </Card>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <Card className="lg:col-span-2">
                <h3 className="text-xl font-black text-slate-800 mb-8">Platform Traffic</h3>
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData}>
                      <defs>
                        <linearGradient id="colorUsage" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#818cf8" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#818cf8" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12, fontWeight: 'bold'}} />
                      <Tooltip contentStyle={{borderRadius: '20px', border: 'none', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)'}} />
                      <Area type="monotone" dataKey="usage" stroke="#818cf8" strokeWidth={4} fillOpacity={1} fill="url(#colorUsage)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </Card>
              <Card>
                <h3 className="text-xl font-black text-slate-800 mb-8">Active Study Sessions</h3>
                <div className="space-y-4">
                  {[
                    { label: 'Intro to Bio', val: 80, color: 'bg-emerald-500' },
                    { label: 'Calculus Chat', val: 65, color: 'bg-indigo-500' },
                    { label: 'Art History', val: 30, color: 'bg-rose-500' },
                    { label: 'Python Lab', val: 90, color: 'bg-amber-500' },
                  ].map((s, i) => (
                    <div key={i} className="space-y-1.5">
                      <div className="flex justify-between text-xs font-bold text-slate-600">
                        <span>{s.label}</span>
                        <span>{s.val}% Load</span>
                      </div>
                      <ProgressBar progress={s.val} color={s.color} />
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          </div>
        );
      case AppRoute.ADMIN_USERS:
        return (
          <>
            <Card noPadding className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="p-6 border-b-2 border-slate-50 flex items-center justify-between">
                <h3 className="text-xl font-black text-slate-800">User Directory</h3>
                <div className="flex gap-2">
                  <Input 
                    placeholder="Search users..." 
                    className="w-64" 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                  <Button variant="primary" onClick={handleCreateUser}>
                    <ICONS.Plus size={18} className="mr-2" /> Add User
                  </Button>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    <tr>
                      <th className="px-6 py-4">User</th>
                      <th className="px-6 py-4">Role</th>
                      <th className="px-6 py-4">Status</th>
                      <th className="px-6 py-4">Joined</th>
                      <th className="px-6 py-4">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y-2 divide-slate-50 font-bold">
                    {loading && users.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                          Loading users...
                        </td>
                      </tr>
                    ) : users.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                          No users found
                        </td>
                      </tr>
                    ) : (
                      users.map((user) => {
                        const userInitials = user.name.split(' ').map(n => n[0]).join('').toUpperCase();
                        const joinDate = new Date(user.createdAt).toLocaleDateString();
                        
                        return (
                          <tr key={user.id} className="hover:bg-slate-50/50">
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                {user.avatar ? (
                                  <img src={user.avatar} className="w-10 h-10 rounded-xl object-cover" alt={user.name} />
                                ) : (
                                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-400 to-indigo-600 flex items-center justify-center text-white font-black text-sm">
                                    {userInitials}
                                  </div>
                                )}
                                <div className="leading-tight">
                                  <p className="text-sm text-slate-800">{user.name}</p>
                                  <p className="text-[10px] text-slate-400 uppercase tracking-tight">{user.email}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <Badge variant={user.role === 'admin' ? 'indigo' : user.role === 'mentor' ? 'amber' : 'slate'} className="capitalize">
                                {user.role}
                              </Badge>
                            </td>
                            <td className="px-6 py-4">
                              <button
                                onClick={() => handleToggleStatus(user)}
                                className="cursor-pointer"
                              >
                                <Badge variant={user.isActive ? 'emerald' : 'rose'}>
                                  {user.isActive ? 'Active' : 'Inactive'}
                                </Badge>
                              </button>
                            </td>
                            <td className="px-6 py-4 text-sm text-slate-400">{joinDate}</td>
                            <td className="px-6 py-4">
                              <div className="flex gap-2">
                                <Button 
                                  variant="ghost" 
                                  size="icon"
                                  onClick={() => handleEditUser(user)}
                                  title="Edit user"
                                >
                                  <ICONS.Profile size={18} />
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="icon"
                                  onClick={() => handleDeleteUser(user)}
                                  title="Delete user"
                                  className="text-rose-500 hover:text-rose-600"
                                >
                                  <ICONS.Trash size={18} />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
              
              {/* Pagination */}
              {totalPages > 1 && (
                <div className="p-6 border-t-2 border-slate-50 flex items-center justify-between">
                  <p className="text-sm text-slate-500 font-bold">
                    Page {currentPage} of {totalPages}
                  </p>
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      disabled={currentPage === 1}
                      onClick={() => setCurrentPage(p => p - 1)}
                    >
                      Previous
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      disabled={currentPage === totalPages}
                      onClick={() => setCurrentPage(p => p + 1)}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </Card>

            {/* User Form Modal */}
            {showModal && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                <Card className="w-full max-w-md">
                  <h3 className="text-2xl font-black text-slate-800 mb-6">
                    {editingUser ? 'Edit User' : 'Create New User'}
                  </h3>
                  
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-500 uppercase ml-1">Full Name</label>
                      <Input 
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="John Doe"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-500 uppercase ml-1">Email</label>
                      <Input 
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        placeholder="john@example.com"
                      />
                    </div>

                    {!editingUser && (
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-500 uppercase ml-1">Password</label>
                        <Input 
                          type="password"
                          value={formData.password || ''}
                          onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                          placeholder="••••••••"
                        />
                      </div>
                    )}

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-500 uppercase ml-1">Role</label>
                      <select 
                        value={formData.role}
                        onChange={(e) => setFormData({ ...formData, role: e.target.value as any })}
                        className="w-full px-4 py-3 bg-white border-2 border-slate-200 rounded-2xl text-sm font-bold text-slate-700 focus:outline-none focus:border-indigo-400"
                      >
                        <option value="student">Student</option>
                        <option value="mentor">Mentor</option>
                        <option value="admin">Admin</option>
                      </select>
                    </div>

                    <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-2xl">
                      <input 
                        type="checkbox"
                        checked={formData.isActive}
                        onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                        className="w-5 h-5 rounded border-2 border-slate-300"
                      />
                      <label className="text-sm font-bold text-slate-700">Account Active</label>
                    </div>
                  </div>

                  <div className="flex gap-3 mt-6">
                    <Button 
                      variant="outline" 
                      className="flex-1"
                      onClick={() => setShowModal(false)}
                      disabled={loading}
                    >
                      Cancel
                    </Button>
                    <Button 
                      variant="primary" 
                      className="flex-1"
                      onClick={handleSubmit}
                      disabled={loading}
                    >
                      {loading ? 'Saving...' : editingUser ? 'Update User' : 'Create User'}
                    </Button>
                  </div>
                </Card>
              </div>
            )}
          </>
        );
      case AppRoute.ADMIN_MODERATION:
        return (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
             <div className="lg:col-span-2 space-y-6">
                <Card noPadding>
                  <div className="p-6 border-b-2 border-slate-50 flex items-center justify-between">
                    <h3 className="text-xl font-black text-slate-800">Flagged Activity</h3>
                    <Badge variant="rose">12 New</Badge>
                  </div>
                  <div className="p-4 space-y-4">
                    {[
                      { user: 'BannedUser12', reason: 'Spamming Study Buddy', room: 'Physics 101', time: '5m ago' },
                      { user: 'AnonExplorer', reason: 'Inappropriate Drawing', room: 'Art Class', time: '12m ago' },
                      { user: 'BotHunter', reason: 'Suspicious API activity', room: 'Global', time: '1h ago' },
                    ].map((m, i) => (
                      <div key={i} className="flex items-center justify-between p-4 bg-slate-50 rounded-[1.5rem] border-2 border-transparent hover:border-rose-100 transition-all">
                        <div className="flex gap-4 items-center">
                          <div className="w-12 h-12 bg-rose-100 text-rose-600 rounded-xl flex items-center justify-center font-black">!</div>
                          <div>
                            <p className="text-sm font-black text-slate-800">{m.user} <span className="text-[10px] text-slate-400 uppercase font-bold ml-2">in {m.room}</span></p>
                            <p className="text-xs text-rose-500 font-bold">{m.reason}</p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                           <Button variant="secondary" size="sm">Dismiss</Button>
                           <Button variant="danger" size="sm">Take Action</Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
             </div>
             <Card className="h-fit">
                <h3 className="text-xl font-black text-slate-800 mb-6">Moderator Notes</h3>
                <div className="space-y-4">
                  <div className="p-4 bg-indigo-50 rounded-2xl">
                    <p className="text-xs font-bold text-indigo-700 italic">"Keep an eye on the Physics board, some users are trying to break the focus timer logic."</p>
                    <p className="text-[10px] text-indigo-400 mt-2 uppercase font-black">— Admin Donna</p>
                  </div>
                  <textarea className="w-full h-32 bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 text-sm font-medium focus:outline-none focus:border-indigo-400" placeholder="Add a global note..." />
                  <Button variant="primary" className="w-full">Save Note</Button>
                </div>
             </Card>
          </div>
        );
      case AppRoute.ADMIN_AI:
        return (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
             <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="bg-amber-50 border-amber-100">
                  <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest mb-1">Token Usage</p>
                  <h4 className="text-3xl font-black text-slate-800">842,500</h4>
                  <div className="mt-4"><ProgressBar progress={65} color="bg-amber-400" /></div>
                </Card>
                <Card className="bg-indigo-50 border-indigo-100">
                  <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-1">Success Rate</p>
                  <h4 className="text-3xl font-black text-slate-800">99.8%</h4>
                  <div className="mt-4"><ProgressBar progress={99} color="bg-indigo-500" /></div>
                </Card>
                <Card className="bg-emerald-50 border-emerald-100">
                  <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-1">Avg Latency</p>
                  <h4 className="text-3xl font-black text-slate-800">1.2s</h4>
                  <div className="mt-4"><ProgressBar progress={30} color="bg-emerald-500" /></div>
                </Card>
             </div>
             <Card>
                <h3 className="text-xl font-black text-slate-800 mb-8">AI Prompt Success Distribution</h3>
                <div className="h-[400px]">
                   <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData}>
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12, fontWeight: 'bold'}} />
                        <Tooltip contentStyle={{borderRadius: '20px', border: 'none', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)'}} />
                        <Bar dataKey="usage" radius={[10, 10, 10, 10]} barSize={50} fill="#fbbf24" />
                        <Bar dataKey="growth" radius={[10, 10, 10, 10]} barSize={50} fill="#818cf8" />
                      </BarChart>
                   </ResponsiveContainer>
                </div>
             </Card>
          </div>
        );
      default:
        return (
          <div className="flex flex-col items-center justify-center h-80 text-center animate-in fade-in zoom-in duration-500">
            <div className="text-8xl mb-6">🛠️</div>
            <h3 className="text-2xl font-black text-slate-800">Module Under Construction</h3>
            <p className="text-slate-500 font-bold max-w-sm mt-2">The management portal for this section is being tuned by the robot squad. Check back soon!</p>
            <Button variant="outline" className="mt-8">View Platform Status</Button>
          </div>
        );
    }
  };

  return (
    <div className="space-y-8 pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between px-2 gap-4">
        <div>
          <h2 className="text-3xl font-black text-slate-800 tracking-tight">Admin Command Center</h2>
          <p className="text-slate-500 font-bold">Total control over the Collabry universe.</p>
        </div>
        <div className="flex gap-2">
           <Button variant="secondary" className="gap-2 px-6">
             <ICONS.Sparkles size={18} /> Diagnostics
           </Button>
           <Button variant="primary" className="gap-2 px-6 shadow-xl shadow-indigo-100">
             <ICONS.Plus size={18} /> New Event
           </Button>
        </div>
      </div>

      <div className="relative min-h-[500px]">
        {renderActiveSection()}
      </div>
    </div>
  );
};

export default AdminDashboard;

