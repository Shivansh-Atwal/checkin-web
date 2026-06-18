import React from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../utils/api';
import { FileDown, Map } from 'lucide-react';

interface StateWiseSummary {
  state: string;
  customers: number;
  bednights: number;
}

interface ReportsData {
  stateWiseData: StateWiseSummary[];
}

const Reports: React.FC = () => {
  // Fetch reports data
  const { data: reportsRes, isLoading } = useQuery({
    queryKey: ['reports'],
    queryFn: () => api.get('/admin/reports').then((res) => res.data),
  });

  const reportData: ReportsData = reportsRes?.data || {
    stateWiseData: [],
  };

  // CSV Exporter for state-wise records
  const handleExportCSV = () => {
    if (!reportData.stateWiseData?.length) return;

    let csvContent = 'data:text/csv;charset=utf-8,';
    csvContent += 'State,Total Guests / Stays,Total Bednights Spent\n';
    
    reportData.stateWiseData.forEach((stat) => {
      const escapedState = `"${stat.state.replace(/"/g, '""')}"`;
      csvContent += `${escapedState},${stat.customers},${stat.bednights}\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'hotelflow_state_wise_report.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Export Header */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-stretch sm:items-center border-b border-slate-800 pb-4">
        <div>
          <p className="text-sm font-semibold text-slate-350">Analyze guest demographic distributions and origins</p>
        </div>
        <button
          onClick={handleExportCSV}
          className="flex items-center justify-center px-4 py-2.5 bg-slate-950 hover:bg-slate-900 border border-slate-700 hover:border-slate-600 text-white font-black rounded-xl text-xs shadow-lg shadow-slate-950/50 transition-colors cursor-pointer"
        >
          <FileDown className="w-4 h-4 mr-2" />
          Export State Report CSV
        </button>
      </div>

      {isLoading ? (
        <div className="text-center py-20 text-slate-500 font-bold text-sm">Aggregating analytics data...</div>
      ) : (
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl space-y-4">
          <div className="flex items-center space-x-2.5 border-b border-slate-800 pb-3">
            <Map className="w-5 h-5 text-indigo-400" />
            <div>
              <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider">State-Wise Analytics</h3>
              <p className="text-xs text-slate-450 mt-0.5">Overall distribution of guests and bednights spent by state</p>
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-800">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-850 border-b border-slate-800 text-slate-300 text-xs uppercase font-bold tracking-wider">
                  <th className="p-4">State</th>
                  <th className="p-4">Total Guests / Stays</th>
                  <th className="p-4">Total Bednights Spent</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-sm font-semibold text-slate-200 bg-slate-950/20">
                {reportData.stateWiseData && reportData.stateWiseData.length > 0 ? (
                  reportData.stateWiseData.map((stat) => (
                    <tr key={stat.state} className="hover:bg-slate-850/30 transition-colors">
                      <td className="p-4 font-bold text-white">{stat.state}</td>
                      <td className="p-4 font-mono text-slate-300">{stat.customers}</td>
                      <td className="p-4 font-mono text-indigo-400">{stat.bednights} nights</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={3} className="p-8 text-center text-slate-500 font-bold">No state-wise data available.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default Reports;
