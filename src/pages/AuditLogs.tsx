import React from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../utils/api';
import { Terminal } from 'lucide-react';

interface AuditLog {
  id: string;
  userName: string;
  action: string;
  timestamp: string;
  ipAddress: string;
  details: string;
}

const AuditLogs: React.FC = () => {
  // Fetch logs
  const { data: logsRes, isLoading } = useQuery({
    queryKey: ['audit-logs'],
    queryFn: () => api.get('/admin/audit-logs').then((res) => res.data),
  });

  const logs: AuditLog[] = logsRes?.data || [];

  return (
    <div className="space-y-6">
      <div className="border-b border-slate-800 pb-4">
        <p className="text-sm text-slate-400">Timeline history tracking of all system-wide admin and employee actions</p>
      </div>

      {isLoading ? (
        <div className="text-center py-20 text-slate-500 text-sm">Fetching system audit records...</div>
      ) : (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-x-auto shadow-xl">
          <div className="min-w-[768px]">
            <div className="p-5 border-b border-slate-800 bg-slate-850/45 flex items-center justify-between text-xs font-bold text-slate-400">
              <span>Action Description</span>
              <div className="flex space-x-12">
                <span className="w-24 text-left">Triggered By</span>
                <span className="w-28 text-left">IP Address</span>
                <span className="w-36 text-right">Timestamp</span>
              </div>
            </div>
            
            <div className="divide-y divide-slate-800">
              {logs.length === 0 ? (
                <div className="text-center py-20 text-slate-550 text-sm">No action logs found in database.</div>
              ) : (
                logs.map((log) => (
                  <div key={log.id} className="p-4 hover:bg-slate-850/30 transition-colors flex justify-between items-center text-sm">
                    <div className="flex items-center space-x-3 max-w-md">
                      <div className="p-2 bg-slate-800 text-slate-400 rounded-lg shrink-0">
                        <Terminal className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="font-semibold text-slate-200 leading-tight">{log.action}</p>
                        {log.details && (
                          <p className="text-[11px] text-slate-500 font-mono mt-1 leading-normal truncate max-w-sm" title={log.details}>
                            {log.details}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex space-x-12 text-xs text-slate-400 items-center shrink-0">
                      <span className="w-24 truncate font-medium text-slate-350">{log.userName}</span>
                      <span className="w-28 font-mono text-[11px] text-slate-455">{log.ipAddress || 'localhost'}</span>
                      <span className="w-36 text-right text-slate-500">
                        {new Date(log.timestamp).toLocaleString()}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AuditLogs;
