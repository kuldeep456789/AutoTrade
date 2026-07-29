import { useState, useEffect, useCallback } from 'react';
import { Search, Mail, RefreshCw, CheckCircle2, Clock, MessageSquare, Send, MessageCircle } from 'lucide-react';
import { adminApi, type ContactMessage } from '../../services/adminApi';
import toast from 'react-hot-toast';

export default function AdminCustomerMessages() {
  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'pending' | 'resolved'>('all');
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [replyingId, setReplyingId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState<{ [key: string]: string }>({});

  const fetchMessages = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await adminApi.messages.list();
      setMessages(data ?? []);
    } catch (err: any) {
      setError(err?.message ?? 'Failed to load contact messages');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  const handleSendReply = async (id: string) => {
    const text = (replyText[id] || '').trim();
    if (!text) {
      toast.error('Please enter a response message.');
      return;
    }

    try {
      setUpdatingId(id);
      const updated = await adminApi.messages.reply(id, text, 'resolved');
      setMessages(prev =>
        prev.map(msg => msg._id === id ? { ...msg, ...updated, adminReply: text, status: 'resolved', repliedAt: new Date().toISOString() } : msg)
      );
      toast.success('Response saved and sent to user account!');
      setReplyingId(null);
    } catch (err: any) {
      toast.error(err?.message ?? 'Failed to send response');
    } finally {
      setUpdatingId(null);
    }
  };

  const filtered = messages.filter((msg) => {
    const matchFilter = filter === 'all' || (msg.status || 'pending') === filter;
    const searchLower = search.toLowerCase();
    const matchSearch =
      (msg.name ?? '').toLowerCase().includes(searchLower) ||
      (msg.email ?? '').toLowerCase().includes(searchLower) ||
      (msg.subject ?? '').toLowerCase().includes(searchLower) ||
      (msg.message ?? '').toLowerCase().includes(searchLower) ||
      (msg.adminReply ?? '').toLowerCase().includes(searchLower);

    return matchFilter && matchSearch;
  });

  const pendingCount = messages.filter(m => (m.status || 'pending') === 'pending').length;
  const resolvedCount = messages.filter(m => m.status === 'resolved').length;

  return (
    <div className="space-y-6 pb-10">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-zinc-900 dark:text-white tracking-tight">Customer Messages</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            {loading ? 'Loading...' : `${messages.length} total messages received via Contact Us`}
          </p>
        </div>
        <button
          onClick={fetchMessages}
          className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm font-semibold text-zinc-700 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-800 shadow-sm cursor-pointer transition-colors"
        >
          <RefreshCw className={`h-4 w-4 text-orange-500 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-zinc-900/90 p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-xl backdrop-blur-md transition-colors duration-200">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Total Messages</span>
            <MessageSquare className="h-5 w-5 text-orange-500" />
          </div>
          <p className="text-3xl font-extrabold text-zinc-900 dark:text-white mt-2">{messages.length}</p>
        </div>
        <div className="bg-white dark:bg-zinc-900/90 p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-xl backdrop-blur-md transition-colors duration-200">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-orange-500 uppercase tracking-wider">Pending Queries</span>
            <Clock className="h-5 w-5 text-orange-500" />
          </div>
          <p className="text-3xl font-extrabold text-orange-500 mt-2">{pendingCount}</p>
        </div>
        <div className="bg-white dark:bg-zinc-900/90 p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-xl backdrop-blur-md transition-colors duration-200">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-500 uppercase tracking-wider">Resolved Queries</span>
            <CheckCircle2 className="h-5 w-5 text-emerald-500" />
          </div>
          <p className="text-3xl font-extrabold text-emerald-500 mt-2">{resolvedCount}</p>
        </div>
      </div>

      <div className="bg-white dark:bg-zinc-900/90 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-xl overflow-hidden backdrop-blur-md transition-colors duration-200">
        {/* Filters */}
        <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-zinc-50 dark:bg-zinc-950">
          <div className="flex bg-zinc-200/60 dark:bg-zinc-900 p-1 rounded-xl w-full md:w-auto">
            {(['all', 'pending', 'resolved'] as const).map((status) => (
              <button
                key={status}
                onClick={() => setFilter(status)}
                className={`flex-1 md:flex-none px-4 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all cursor-pointer ${
                  filter === status 
                    ? 'bg-orange-500 text-white shadow-md shadow-orange-500/20' 
                    : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
                }`}
              >
                {status} ({status === 'all' ? messages.length : status === 'pending' ? pendingCount : resolvedCount})
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="p-12 text-center text-zinc-500 dark:text-zinc-400 text-sm">Loading customer messages...</div>
        ) : error ? (
          <div className="p-12 text-center text-red-500 text-sm font-semibold">{error}</div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-zinc-500 dark:text-zinc-400 text-sm">
            {search || filter !== 'all' ? 'No messages match your search criteria.' : 'No customer messages received yet.'}
          </div>
        ) : (
          <div className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
            {filtered.map((msg) => {
              const isResolved = msg.status === 'resolved';
              const isReplying = replyingId === msg._id;
              return (
                <div key={msg._id} className="p-5 hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition-colors">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-zinc-900 dark:text-white text-base">{msg.name}</span>
                      <a
                        href={`mailto:${msg.email}?subject=Re: ${encodeURIComponent(msg.subject)}`}
                        className="text-xs text-orange-500 hover:underline flex items-center gap-1 font-semibold"
                      >
                        <Mail className="h-3.5 w-3.5" />
                        {msg.email}
                      </a>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-zinc-400">
                        {new Date(msg.createdAt).toLocaleString(undefined, {
                          dateStyle: 'medium',
                          timeStyle: 'short',
                        })}
                      </span>
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider border ${
                          isResolved
                            ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                            : 'bg-orange-500/10 text-orange-500 border-orange-500/20'
                        }`}
                      >
                        {isResolved ? 'Resolved' : 'Pending'}
                      </span>
                    </div>
                  </div>

                  <h4 className="text-sm font-bold text-zinc-800 dark:text-zinc-200 mb-1.5">{msg.subject}</h4>
                  <p className="text-sm text-zinc-600 dark:text-zinc-300 leading-relaxed bg-zinc-50 dark:bg-zinc-950 p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 mb-4 whitespace-pre-wrap">
                    {msg.message}
                  </p>

                  {/* Existing Admin Reply */}
                  {msg.adminReply && (
                    <div className="mb-4 p-4 rounded-xl bg-orange-500/10 border border-orange-500/20 text-zinc-900 dark:text-white text-sm">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="font-bold text-orange-500 text-xs flex items-center gap-1.5 uppercase tracking-wider">
                          <MessageCircle className="h-4 w-4" />
                          Admin Resolution Response:
                        </span>
                        {msg.repliedAt && (
                          <span className="text-[11px] text-zinc-400 font-mono">
                            {new Date(msg.repliedAt).toLocaleString()}
                          </span>
                        )}
                      </div>
                      <p className="text-zinc-800 dark:text-zinc-200 text-sm whitespace-pre-wrap">{msg.adminReply}</p>
                    </div>
                  )}

                  {/* Reply Input Box */}
                  {isReplying ? (
                    <div className="space-y-3 bg-zinc-50 dark:bg-zinc-950 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 mb-3 animate-fade-in">
                      <label className="block text-xs font-bold uppercase text-zinc-600 dark:text-zinc-400 tracking-wider">
                        Resolution Reply for {msg.email}:
                      </label>
                      <textarea
                        rows={3}
                        placeholder="Type your response / resolution here..."
                        value={replyText[msg._id] ?? msg.adminReply ?? ''}
                        onChange={(e) => setReplyText({ ...replyText, [msg._id]: e.target.value })}
                        className="w-full p-3 text-sm bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white border border-zinc-200 dark:border-zinc-800 rounded-xl focus:outline-none focus:border-orange-500"
                      />
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleSendReply(msg._id)}
                          disabled={updatingId === msg._id}
                          className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-md shadow-orange-500/20"
                        >
                          <Send className="h-3.5 w-3.5" />
                          {updatingId === msg._id ? 'Saving...' : 'Send Reply & Resolve'}
                        </button>
                        <button
                          onClick={() => setReplyingId(null)}
                          className="px-4 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-300 rounded-xl text-xs font-semibold hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3 pt-1">
                      <button
                        onClick={() => {
                          setReplyingId(msg._id);
                          if (!replyText[msg._id] && msg.adminReply) {
                            setReplyText({ ...replyText, [msg._id]: msg.adminReply });
                          }
                        }}
                        className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-orange-500 text-white hover:bg-orange-600 cursor-pointer transition-all flex items-center gap-1.5 shadow-md shadow-orange-500/20"
                      >
                        <MessageCircle className="h-3.5 w-3.5" />
                        {msg.adminReply ? 'Edit Reply' : 'Reply & Resolve'}
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
