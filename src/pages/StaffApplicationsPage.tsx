import React, { useState, useEffect } from 'react';
import { Header } from '../components/Header';
import { StatusBadge } from '../components/StatusBadge';
import { ApplicationRecord } from '../lib/types';
import { formatDateDisplay } from '../lib/formatters';
import { Search, ChevronLeft, ChevronRight, Sparkles, RefreshCw } from 'lucide-react';

interface StaffApplicationsPageProps {
  currentUser: any;
  onSelectApplication: (id: string) => void;
  onSignOut: () => void;
  onGoToApplicant?: () => void;
}

export const StaffApplicationsPage: React.FC<StaffApplicationsPageProps> = ({
  currentUser,
  onSelectApplication,
  onSignOut,
  onGoToApplicant
}) => {
  const [tab, setTab] = useState<'all' | 'needs_review' | 'needs_correction' | 'approved' | 'rejected'>('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState<{
    applications: ApplicationRecord[];
    counts: { all: number; needs_review: number; needs_correction: number; approved: number; rejected: number };
    total: number;
    page: number;
    totalPages: number;
  }>({
    applications: [],
    counts: { all: 0, needs_review: 0, needs_correction: 0, approved: 0, rejected: 0 },
    total: 0,
    page: 1,
    totalPages: 1
  });
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);

  const fetchApplications = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        tab,
        search,
        page: String(page)
      });
      const res = await fetch(`/api/staff/applications?${params.toString()}`, {
        headers: {
          'x-user-email': currentUser.email || '',
          'x-user-id': currentUser.uid || ''
        }
      });
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (err) {
      console.error('Failed to load applications:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApplications();
  }, [tab, page]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchApplications();
  };

  const handleSeedDemo = async () => {
    try {
      setSeeding(true);
      const res = await fetch('/api/staff/seed-demo', {
        method: 'POST',
        headers: {
          'x-user-email': currentUser.email || '',
          'x-user-id': currentUser.uid || ''
        }
      });
      if (res.ok) {
        await fetchApplications();
      }
    } catch (err) {
      console.error('Seed demo error:', err);
    } finally {
      setSeeding(false);
    }
  };

  const tabs: { key: typeof tab; label: string; count: number }[] = [
    { key: 'all', label: 'All', count: data.counts.all },
    { key: 'needs_review', label: 'Needs review', count: data.counts.needs_review },
    { key: 'needs_correction', label: 'Needs correction', count: data.counts.needs_correction },
    { key: 'approved', label: 'Approved', count: data.counts.approved },
    { key: 'rejected', label: 'Rejected', count: data.counts.rejected }
  ];

  return (
    <div className="min-h-screen bg-[#FAF8F4] flex flex-col">
      <Header
        onSignOut={onSignOut}
        userRole="staff"
        userEmail={currentUser?.email}
        onNavigateToApplicant={onGoToApplicant}
      />

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-8">
        {/* Title & Seed action */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-semibold text-[#1F1D1A] tracking-tight mb-1">
              Applications
            </h1>
            <p className="text-sm text-[#6B665E]">
              Review applicant credentials, document matches, and validation flags.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={fetchApplications}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-[#E4E0D8] hover:border-[#1F1D1A] text-xs font-medium text-[#6B665E] hover:text-[#1F1D1A] rounded-[6px] transition-colors cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Refresh</span>
            </button>

            {data.counts.all === 0 && (
              <button
                type="button"
                disabled={seeding}
                onClick={handleSeedDemo}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#FAF8F4] border border-[#B5532C] hover:bg-[#B5532C] hover:text-white text-xs font-medium text-[#B5532C] rounded-[6px] transition-colors cursor-pointer"
                title="Populate test applications clearly marked isDemo: true"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>{seeding ? 'Seeding...' : 'Seed demo applications'}</span>
              </button>
            )}
          </div>
        </div>

        {/* Status Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 mb-4 scrollbar-none">
          {tabs.map((t) => {
            const isActive = tab === t.key;
            return (
              <button
                key={t.key}
                type="button"
                onClick={() => {
                  setTab(t.key);
                  setPage(1);
                }}
                className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-[6px] text-sm font-medium transition-colors cursor-pointer whitespace-nowrap ${
                  isActive
                    ? 'bg-[#EAE6DF] text-[#1F1D1A]'
                    : 'bg-white border border-[#E4E0D8] text-[#6B665E] hover:text-[#1F1D1A]'
                }`}
              >
                <span>{t.label}</span>
                <span
                  className={`text-xs px-1.5 py-0.2 rounded-full ${
                    isActive ? 'bg-white/80 text-[#1F1D1A]' : 'bg-[#FAF8F4] text-[#6B665E]'
                  }`}
                >
                  {t.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Search Bar */}
        <form onSubmit={handleSearchSubmit} className="relative mb-6">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#6B665E]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, application ID, document or value"
            className="w-full h-11 pl-10 pr-4 bg-white border border-[#E4E0D8] rounded-[6px] text-sm text-[#1F1D1A] placeholder:text-[#A8A39D] focus:outline-none focus:ring-1 focus:ring-[#B5532C] focus:border-[#B5532C]"
          />
        </form>

        {/* Table Card */}
        <div className="bg-white border border-[#E4E0D8] rounded-[6px] shadow-sm overflow-hidden mb-4">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-[#FAF8F4] border-b border-[#E4E0D8] text-xs font-semibold text-[#6B665E]">
                <tr>
                  <th className="py-3 px-4 sm:px-6">Applicant</th>
                  <th className="py-3 px-4">Course</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Reason</th>
                  <th className="py-3 px-4 text-right">Submitted</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E4E0D8]">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-sm text-[#6B665E]">
                      Loading applications...
                    </td>
                  </tr>
                ) : data.applications.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-16 text-center text-sm text-[#6B665E]">
                      Nothing here right now.
                    </td>
                  </tr>
                ) : (
                  data.applications.map((app) => {
                    const reason =
                      app.problems && app.problems.length > 0
                        ? app.problems[0].title
                        : app.summary || 'All details match documents';

                    return (
                      <tr
                        key={app.id}
                        onClick={() => onSelectApplication(app.id)}
                        className="hover:bg-[#FAF8F4] cursor-pointer transition-colors"
                      >
                        <td className="py-4 px-4 sm:px-6">
                          <p className="font-medium text-[#1F1D1A] leading-tight">
                            {app.applicantName}
                          </p>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="text-xs text-[#6B665E] font-mono">{app.id}</span>
                            {app.isDemo && (
                              <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-semibold bg-[#FFF1EB] text-[#B5532C] border border-[#B5532C]/20">
                                Demo
                              </span>
                            )}
                          </div>
                        </td>

                        <td className="py-4 px-4 text-[#1F1D1A] max-w-xs truncate">
                          {app.course}
                        </td>

                        <td className="py-4 px-4 whitespace-nowrap">
                          <StatusBadge status={app.status} size="sm" />
                        </td>

                        <td className="py-4 px-4 text-xs text-[#6B665E] max-w-xs truncate">
                          {reason}
                        </td>

                        <td className="py-4 px-4 text-xs text-[#6B665E] text-right whitespace-nowrap">
                          {formatDateDisplay(app.submittedAt || app.createdAt)}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Footer */}
          {!loading && data.total > 0 && (
            <div className="px-4 sm:px-6 py-3 border-t border-[#E4E0D8] bg-[#FAF8F4] flex items-center justify-between text-xs text-[#6B665E]">
              <span>
                Showing {Math.min(1 + (page - 1) * 10, data.total)} to{' '}
                {Math.min(page * 10, data.total)} of {data.total} applications
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="inline-flex items-center gap-1 px-2.5 py-1 bg-white border border-[#E4E0D8] hover:border-[#1F1D1A] rounded text-[#1F1D1A] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span>Previous</span>
                </button>

                <button
                  type="button"
                  disabled={page >= data.totalPages}
                  onClick={() => setPage((p) => Math.min(data.totalPages, p + 1))}
                  className="inline-flex items-center gap-1 px-2.5 py-1 bg-white border border-[#E4E0D8] hover:border-[#1F1D1A] rounded text-[#1F1D1A] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <span>Next</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};
