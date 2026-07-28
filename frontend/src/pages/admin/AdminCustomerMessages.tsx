import { useState, useEffect, useCallback } from 'react';
import { Search, Mail, RefreshCw, CheckCircle2, Clock, MessageSquare, ExternalLink, Send, MessageCircle } from 'lucide-react';
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

  const handleStatusChange = async (id: string, newStatus: 'pending' | 'resolved') => {
    try {
      setUpdatingId(id);
      await adminApi.messages.updateStatus(id, newStatus);
      setMessages(prev =>
        prev.map(msg => msg._id === id ? { ...msg, status: newStatus } : msg)
      );
      toast.success(`Message marked as ${newStatus}`);
    } catch (err: any) {
      toast.error(err?.message ?? 'Failed to update status');
    } finally {
      setUpdatingId(null);
    }
  };

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
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Customer Messages</h1>
          <p className="text-sm text-gray-500 mt-1">
            {loading ? 'Loading...' : `${messages.length} total messages received via Contact Us`}
          </p>
        </div>
        <button
          onClick={fetchMessages}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 shadow-sm cursor-pointer transition-all"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-500">Total Messages</span>
            <MessageSquare className="h-5 w-5 text-gray-400" />
          </div>
          <p className="text-2xl font-bold text-gray-900 mt-2">{messages.length}</p>
        </div>
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-amber-600">Pending Queries</span>
            <Clock className="h-5 w-5 text-amber-500" />
          </div>
          <p className="text-2xl font-bold text-amber-700 mt-2">{pendingCount}</p>
        </div>
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-green-600">Resolved Queries</span>
            <CheckCircle2 className="h-5 w-5 text-green-500" />
          </div>
          <p className="text-2xl font-bold text-green-700 mt-2">{resolvedCount}</p>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        {/* Filters */}
        <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-gray-50/50">
          <div className="flex bg-gray-100 p-1 rounded-lg w-full md:w-auto">
            {(['all', 'pending', 'resolved'] as const).map((status) => (
              <button
                key={status}
                onClick={() => setFilter(status)}
                className={`flex-1 md:flex-none px-4 py-1.5 rounded-md text-sm font-medium capitalize transition-all cursor-pointer ${
                  filter === status ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {status} ({status === 'all' ? messages.length : status === 'pending' ? pendingCount : resolvedCount})
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="p-12 text-center text-gray-500">Loading customer messages...</div>
        ) : error ? (
          <div className="p-12 text-center text-red-500">{error}</div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            {search || filter !== 'all' ? 'No messages match your search criteria.' : 'No customer messages received yet.'}
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {filtered.map((msg) => {
              const isResolved = msg.status === 'resolved';
              const isReplying = replyingId === msg._id;
              return (
                <div key={msg._id} className="p-5 hover:bg-gray-50/50 transition-colors">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-gray-900 text-base">{msg.name}</span>
                      <a
                        href={`mailto:${msg.email}?subject=Re: ${encodeURIComponent(msg.subject)}`}
                        className="text-xs text-blue-600 hover:underline flex items-center gap-1 font-medium"
                      >
                        <Mail className="h-3.5 w-3.5" />
                        {msg.email}
                      </a>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-gray-400">
                        {new Date(msg.createdAt).toLocaleString(undefined, {
                          dateStyle: 'medium',
                          timeStyle: 'short',
                        })}
                      </span>
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider ${
                          isResolved
                            ? 'bg-green-100 text-green-800 border border-green-200'
                            : 'bg-amber-100 text-amber-800 border border-amber-200'
                        }`}
                      >
                        {isResolved ? 'Resolved' : 'Pending'}
                      </span>
                    </div>
                  </div>

                  <h4 className="text-sm font-semibold text-gray-800 mb-1.5">{msg.subject}</h4>
                  <p className="text-sm text-gray-600 leading-relaxed bg-gray-50 p-3.5 rounded-lg border border-gray-100 mb-4 whitespace-pre-wrap">
                    {msg.message}
                  </p>

                  {/* Existing Admin Reply */}
                  {msg.adminReply && (
                    <div className="mb-4 p-4 rounded-xl bg-blue-50/60 border border-blue-100 text-blue-900 text-sm">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="font-bold text-blue-900 text-xs flex items-center gap-1.5 uppercase tracking-wider">
                          <MessageCircle className="h-4 w-4 text-blue-600" />
                          Admin Resolution Response:
                        </span>
                        {msg.repliedAt && (
                          <span className="text-[11px] text-blue-600 font-mono">
                            {new Date(msg.repliedAt).toLocaleString()}
                          </span>
                        )}
                      </div>
                      <p className="text-blue-800 text-sm whitespace-pre-wrap">{msg.adminReply}</p>
                    </div>
                  )}

                  {/* Reply Input Box */}
                  {isReplying ? (
                    <div className="space-y-3 bg-gray-50 p-4 rounded-xl border border-gray-200 mb-3 animate-fade-in">
                      <label className="block text-xs font-bold uppercase text-gray-600 tracking-wider">
                        Resolution Reply for {msg.email}:
                      </label>
                      <textarea
                        rows={3}
                        placeholder="Type your response / resolution here..."
                        value={replyText[msg._id] ?? msg.adminReply ?? ''}
                        onChange={(e) => setReplyText({ ...replyText, [msg._id]: e.target.value })}
                        className="w-full p-3 text-sm bg-white border border-gray-300 rounded-lg outline-none focus:border-black"
                      />
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleSendReply(msg._id)}
                          disabled={updatingId === msg._id}
                          className="px-4 py-2 bg-black text-white rounded-lg text-xs font-bold hover:bg-gray-800 flex items-center gap-1.5 cursor-pointer"
                        >
                          <Send className="h-3.5 w-3.5" />
                          {updatingId === msg._id ? 'Saving...' : 'Send Reply & Resolve'}
                        </button>
                        <button
                          onClick={() => setReplyingId(null)}
                          className="px-4 py-2 bg-white border border-gray-200 text-gray-600 rounded-lg text-xs font-medium hover:bg-gray-100 cursor-pointer"
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
                        className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-black text-white hover:bg-zinc-800 cursor-pointer transition-all flex items-center gap-1.5"
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
