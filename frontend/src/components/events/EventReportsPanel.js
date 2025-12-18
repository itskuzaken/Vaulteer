"use client";

import { useCallback, useEffect, useState } from "react";
import Button from '@/components/ui/Button';
import { listEventReports, generateEventReport, getEventReportDownloadUrl } from '@/services/eventService';
import { useNotify } from '@/components/ui/NotificationProvider';

export default function EventReportsPanel({ eventUid, currentUser }) {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const notify = useNotify();

  const role = (currentUser?.role || 'volunteer').toLowerCase();
  const canManage = role === 'admin' || role === 'staff';

  const loadReports = useCallback(async () => {
    if (!eventUid) return;
    setLoading(true);
    try {
      const res = await listEventReports(eventUid, { limit: 50 });
      setReports(res.data || []);
    } catch (err) {
      console.error('Failed to list reports', err);
      notify?.push('Failed to load reports', 'error');
      setReports([]);
    } finally {
      setLoading(false);
    }
  }, [eventUid, notify]);

  useEffect(() => {
    loadReports();
  }, [loadReports]);

  const handleGenerate = async () => {
    if (!eventUid) return;
    setGenerating(true);
    try {
      await generateEventReport(eventUid, { format: 'csv' });
      notify?.push('Report generation queued', 'success');
      // Refresh list after a short delay to allow worker to insert row
      setTimeout(() => loadReports(), 500);
    } catch (err) {
      console.error('Failed to queue report', err);
      notify?.push('Failed to queue report', 'error');
    } finally {
      setGenerating(false);
    }
  };

  const handleDownload = async (report) => {
    try {
      const res = await getEventReportDownloadUrl(eventUid, report.report_id);
      const url = res.data?.downloadUrl;
      if (!url) throw new Error('No download URL');
      // Open in new tab
      if (typeof window !== 'undefined') window.open(url, '_blank');
    } catch (err) {
      console.error('Failed to get download URL', err);
      notify?.push('Failed to get download URL', 'error');
    }
  };

  if (!canManage) return null;

  return (
    <div className="mt-6 p-4 border rounded bg-white dark:bg-gray-800">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-semibold">Event Reports</h3>
        <div>
          <Button onClick={handleGenerate} disabled={generating} variant="primary">{generating ? 'Queuing...' : 'Generate Report'}</Button>
        </div>
      </div>

      {loading ? (
        <div>Loading reports…</div>
      ) : (
        <div className="space-y-2">
          {reports.length === 0 ? (
            <div className="text-sm text-gray-500">No reports available.</div>
          ) : (
            reports.map((r) => (
              <div key={r.report_id} className="flex items-center justify-between p-2 rounded hover:bg-gray-50 dark:hover:bg-gray-700">
                <div>
                  <div className="font-medium">{r.report_type} — {r.file_format.toUpperCase()}</div>
                  <div className="text-xs text-gray-500">Generated: {r.generated_at}</div>
                </div>
                <div>
                  <Button onClick={() => handleDownload(r)} variant="secondary">Download</Button>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
