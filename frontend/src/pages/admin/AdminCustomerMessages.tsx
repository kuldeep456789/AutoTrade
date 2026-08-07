import { useState, useEffect, useCallback } from 'react';
import { Mail, RefreshCw, CheckCircle2, Clock, MessageSquare, Send, MessageCircle } from 'lucide-react';
import { adminApi, type ContactMessage } from '../../services/adminApi';
import toast from 'react-hot-toast';

export default function AdminCustomerMessages() {
  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'pending' | 'resolved'>('all');
  const search = '';
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
        <div className="bg-white dark:bg-zinc-900/90 px-5 py-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider block mb-1">Total Messages</span>
            <p className="text-2xl font-extrabold text-zinc-900 dark:text-white leading-none">{messages.length}</p>
          </div>
          <div className="w-10 h-10 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
            <MessageSquare className="h-4 w-4 text-zinc-500" />
          </div>
        </div>
        <div className="bg-white dark:bg-zinc-900/90 px-5 py-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-orange-500 uppercase tracking-wider block mb-1">Pending Queries</span>
            <p className="text-2xl font-extrabold text-orange-500 leading-none">{pendingCount}</p>
          </div>
          <div className="w-10 h-10 rounded-full bg-orange-50 dark:bg-orange-500/10 flex items-center justify-center">
            <Clock className="h-4 w-4 text-orange-500" />
          </div>
        </div>
        <div className="bg-white dark:bg-zinc-900/90 px-5 py-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-emerald-500 uppercase tracking-wider block mb-1">Resolved Queries</span>
            <p className="text-2xl font-extrabold text-emerald-500 leading-none">{resolvedCount}</p>
          </div>
          <div className="w-10 h-10 rounded-full bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center">
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-zinc-900/90 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm overflow-hidden">
        {/* Filters */}
        <div className="p-3 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-center sm:justify-start bg-zinc-50/50 dark:bg-zinc-950/50">
          <div className="inline-flex bg-zinc-200/50 dark:bg-zinc-900/50 p-1 rounded-xl w-full sm:w-auto">
            {(['all', 'pending', 'resolved'] as const).map((status) => (
              <button
                key={status}
                onClick={() => setFilter(status)}
                className={`flex-1 sm:flex-none px-5 py-1.5 rounded-lg text-[13px] font-semibold capitalize transition-all cursor-pointer ${
                  filter === status 
                    ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-sm ring-1 ring-zinc-200/50 dark:ring-zinc-700/50' 
                    : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200'
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
                <div key={msg._id} className="p-4 hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition-colors">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-zinc-900 dark:text-white text-[13px]">{msg.name}</span>
                      <span className="text-zinc-300 dark:text-zinc-700">•</span>
                      <a
                        href={`mailto:${msg.email}?subject=Re: ${encodeURIComponent(msg.subject)}`}
                        className="text-[12px] text-zinc-500 hover:text-orange-500 hover:underline flex items-center gap-1 font-medium"
                      >
                        <Mail className="h-3 w-3" />
                        {msg.email}
                      </a>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest border ${
                          isResolved
                            ? 'bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20'
                            : 'bg-orange-50 text-orange-600 border-orange-200 dark:bg-orange-500/10 dark:text-orange-400 dark:border-orange-500/20'
                        }`}
                      >
                        {isResolved ? 'Resolved' : 'Pending'}
                      </span>
                      <span className="text-[11px] text-zinc-400 font-mono">
                        {new Date(msg.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  <h4 className="text-[13px] font-bold text-zinc-800 dark:text-zinc-200 mb-1">{msg.subject}</h4>
                  <p className="text-[13px] text-zinc-600 dark:text-zinc-300 leading-relaxed bg-zinc-50/50 dark:bg-zinc-950/50 px-3 py-2.5 rounded-lg border border-zinc-200 dark:border-zinc-800 mb-3 whitespace-pre-wrap">
                    {msg.message}
                  </p>

                  {/* Existing Admin Reply */}
                  {msg.adminReply && (
                    <div className="mb-3 px-3 py-2.5 rounded-lg bg-orange-50/50 dark:bg-orange-500/5 border border-orange-200 dark:border-orange-500/10 text-zinc-900 dark:text-white">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-orange-500 text-[10px] flex items-center gap-1 uppercase tracking-widest">
                          <MessageCircle className="h-3 w-3" />
                          Admin Reply
                        </span>
                        {msg.repliedAt && (
                          <span className="text-[10px] text-zinc-400 font-mono">
                            {new Date(msg.repliedAt).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                      <p className="text-zinc-700 dark:text-zinc-300 text-[13px] whitespace-pre-wrap">{msg.adminReply}</p>
                    </div>
                  )}

                  {/* Reply Input Box */}
                  {isReplying ? (
                    <div className="mt-2 flex flex-col gap-2 animate-fade-in">
                      <textarea
                        rows={2}
                        placeholder="Type your resolution reply here..."
                        value={replyText[msg._id] ?? msg.adminReply ?? ''}
                        onChange={(e) => setReplyText({ ...replyText, [msg._id]: e.target.value })}
                        className="w-full px-3 py-2 text-[13px] bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white border border-zinc-200 dark:border-zinc-800 rounded-lg focus:outline-none focus:border-orange-500 shadow-sm transition-colors"
                      />
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleSendReply(msg._id)}
                          disabled={updatingId === msg._id}
                          className="px-3 py-1.5 bg-zinc-900 dark:bg-white hover:bg-zinc-800 dark:hover:bg-zinc-100 text-white dark:text-zinc-900 rounded-md text-[11px] font-bold flex items-center gap-1.5 cursor-pointer shadow-sm transition-colors"
                        >
                          <Send className="h-3 w-3" />
                          {updatingId === msg._id ? 'Saving...' : 'Send Reply'}
                        </button>
                        <button
                          onClick={() => setReplyingId(null)}
                          className="px-3 py-1.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-300 rounded-md text-[11px] font-semibold hover:bg-zinc-50 dark:hover:bg-zinc-800 cursor-pointer transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center mt-1">
                      <button
                        onClick={() => {
                          setReplyingId(msg._id);
                          if (!replyText[msg._id] && msg.adminReply) {
                            setReplyText({ ...replyText, [msg._id]: msg.adminReply });
                          }
                        }}
                        className="text-[11px] font-bold text-zinc-500 hover:text-orange-500 flex items-center gap-1 cursor-pointer transition-colors"
                      >
                        <MessageCircle className="h-3 w-3" />
                        {msg.adminReply ? 'Edit Reply' : 'Reply to Customer'}
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
