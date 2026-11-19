import React, { useEffect, useState } from 'react';
import { MessageSquare, Send } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { usePlatformData } from '../../contexts/PlatformDataContext';
import { formatDateTime, supabase } from '../../lib/supabase';
import { SupportTicket } from '../../types/database';
import { EmptyState, useToast } from '../../components/ui/Feedback';

export const SupportTicketsView: React.FC = () => {
  const { user, isPreviewMode } = useAuth();
  const { allTickets, ticketMessages, loadTicketMessages, refreshAll } = usePlatformData();
  const { showToast } = useToast();

  const [selected, setSelected] = useState<SupportTicket | null>(null);
  const [replyText, setReplyText] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (allTickets.length > 0 && !selected) {
      setSelected(allTickets[0]);
      loadTicketMessages(allTickets[0].id);
    }
  }, [allTickets, selected, loadTicketMessages]);

  const handleSelect = (t: SupportTicket) => {
    setSelected(t);
    loadTicketMessages(t.id);
  };

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selected || !replyText.trim()) return;
    if (isPreviewMode || !supabase || !user) {
      showToast('Connect Supabase as Admin to reply', 'warning');
      return;
    }

    setSending(true);
    try {
      const { error } = await supabase.from('support_messages').insert({
        ticket_id: selected.id,
        sender_id: user.id,
        sender_role: 'admin',
        message: replyText.trim(),
      });
      if (error) throw new Error(error.message);

      if (selected.status === 'open') {
        await supabase
          .from('support_tickets')
          .update({ status: 'in_progress', updated_at: new Date().toISOString() })
          .eq('id', selected.id);
      }

      await supabase.from('notifications').insert({
        user_id: selected.user_id,
        title: 'Support Reply Received',
        message: `Admin replied to your ticket "${selected.subject}".`,
        category: 'support',
      });

      setReplyText('');
      await Promise.all([loadTicketMessages(selected.id), refreshAll()]);
    } catch (err) {
      showToast((err as Error).message, 'error');
    } finally {
      setSending(false);
    }
  };

  const handleStatusChange = async (ticket: SupportTicket, status: SupportTicket['status']) => {
    if (isPreviewMode || !supabase) {
      showToast('Connect Supabase as Admin to update ticket status', 'warning');
      return;
    }
    const { error } = await supabase
      .from('support_tickets')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', ticket.id);
    if (error) {
      showToast(error.message, 'error');
      return;
    }
    setSelected({ ...ticket, status });
    await refreshAll();
    showToast(`Ticket marked ${status.replace('_', ' ')}`, 'success');
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display text-xl font-bold text-[#061844]">Support Tickets</h1>
        <p className="text-xs text-slate-500 mt-0.5">Reply to user inquiries and manage ticket statuses in real time.</p>
      </div>

      {allTickets.length === 0 ? (
        <EmptyState
          icon={<MessageSquare className="w-5 h-5" />}
          title="No Support Tickets"
          description="When users open support requests from the User Panel, conversations appear here."
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Ticket List */}
          <div className="lg:col-span-4 bg-white rounded-2xl border border-blue-100 divide-y divide-slate-100 overflow-hidden">
            {allTickets.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => handleSelect(t)}
                className={`w-full p-4 text-left transition-colors ${
                  selected?.id === t.id ? 'bg-blue-50' : 'hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-bold text-slate-900 truncate">{t.subject}</p>
                  <span className="text-[10px] font-bold uppercase text-[#1250C4] shrink-0">
                    {t.status.replace('_', ' ')}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  {t.profiles?.full_name || 'User'} · {formatDateTime(t.updated_at)}
                </p>
              </button>
            ))}
          </div>

          {/* Conversation */}
          <div className="lg:col-span-8 bg-white rounded-2xl border border-blue-100 flex flex-col min-h-[420px] overflow-hidden">
            {selected ? (
              <>
                <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="font-display font-bold text-sm text-[#061844]">{selected.subject}</h2>
                    <p className="text-[11px] text-slate-500">
                      {selected.profiles?.full_name} ({selected.profiles?.scania_id})
                    </p>
                  </div>
                  <select
                    value={selected.status}
                    onChange={(e) => handleStatusChange(selected, e.target.value as SupportTicket['status'])}
                    className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold"
                  >
                    <option value="open">Open</option>
                    <option value="in_progress">In Progress</option>
                    <option value="resolved">Resolved</option>
                    <option value="closed">Closed</option>
                  </select>
                </div>

                <div className="flex-1 p-4 space-y-3 overflow-y-auto max-h-[380px]">
                  {(ticketMessages[selected.id] || []).map((m) => (
                    <div
                      key={m.id}
                      className={`p-3 rounded-2xl text-xs max-w-[80%] ${
                        m.sender_role === 'admin'
                          ? 'ml-auto bg-[#1250C4] text-white'
                          : 'mr-auto bg-slate-100 text-slate-800'
                      }`}
                    >
                      <p className="leading-relaxed">{m.message}</p>
                      <span className="block text-[10px] opacity-70 mt-1">
                        {m.sender_role === 'admin' ? 'Admin' : 'User'} · {formatDateTime(m.created_at)}
                      </span>
                    </div>
                  ))}
                </div>

                <form onSubmit={handleSendReply} className="p-3 bg-slate-50 border-t border-slate-200 flex gap-2">
                  <input
                    type="text"
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder="Type an admin reply..."
                    className="flex-1 px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-xs"
                  />
                  <button
                    type="submit"
                    disabled={sending || !replyText.trim()}
                    className="px-4 py-2.5 rounded-xl bg-[#1250C4] text-white text-xs font-semibold inline-flex items-center gap-1.5 disabled:opacity-50"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Send Reply</span>
                  </button>
                </form>
              </>
            ) : (
              <div className="p-8 text-center text-xs text-slate-400">Select a ticket to view messages.</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
