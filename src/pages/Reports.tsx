import React from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../utils/api';
import { useAuthStore } from '../store/authStore';
import { Map, TrendingUp, Calendar } from 'lucide-react';
import { formatDate } from '../utils/dateFormatter';

interface StateWiseSummary {
  state: string;
  customers: number;
  bednights: number;
}

interface ReportsData {
  stateWiseData: StateWiseSummary[];
}

interface CheckoutRecord {
  additionalCharges: number;
}

interface CheckInSummary {
  checkoutRecord?: CheckoutRecord | null;
}

interface PaymentLedgerItem {
  id: string;
  amount: number;
  paymentType: string;
  paymentDate: string;
  checkIn?: CheckInSummary | null;
}

const Reports: React.FC = () => {
  const { hasPermission } = useAuthStore();
  const canReadPayments = hasPermission('payments.read');

  // Initialize start date to 1st of the current month and end date to today
  const [startDate, setStartDate] = React.useState(() => {
    const d = new Date();
    d.setDate(1); // 1st of this month
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = React.useState(() => {
    return new Date().toISOString().split('T')[0];
  });

  // Fetch reports data
  const { data: reportsRes, isLoading: reportsLoading } = useQuery({
    queryKey: ['reports'],
    queryFn: () => api.get('/admin/reports').then((res) => res.data),
  });

  // Fetch payments ledger if authorized
  const { data: ledgerRes, isLoading: ledgerLoading } = useQuery({
    queryKey: ['payment-ledger'],
    queryFn: () => api.get('/stay/payments/ledger').then((res) => res.data),
    enabled: canReadPayments,
  });

  const reportData: ReportsData = reportsRes?.data || {
    stateWiseData: [],
  };

  const paymentsList: PaymentLedgerItem[] = ledgerRes?.data || [];

  // Filter payments by date range
  const filteredPayments = React.useMemo(() => {
    if (!paymentsList.length) return [];
    
    // Normalize date filters to midnight local times for inclusive comparison
    const start = new Date(`${startDate}T00:00:00`);
    const end = new Date(`${endDate}T23:59:59.999`);
    
    return paymentsList.filter((item) => {
      const pDate = new Date(item.paymentDate);
      return pDate >= start && pDate <= end;
    });
  }, [paymentsList, startDate, endDate]);

  // Compute total revenue and breakdown
  const { totalRevenue, additionalItemsRevenue, roomRevenue } = React.useMemo(() => {
    let total = 0;
    let additional = 0;
    
    filteredPayments.forEach((p) => {
      total += p.amount;
      if (p.paymentType === 'FULL' && p.checkIn?.checkoutRecord) {
        additional += p.checkIn.checkoutRecord.additionalCharges || 0;
      }
    });
    
    return {
      totalRevenue: total,
      additionalItemsRevenue: additional,
      roomRevenue: total - additional,
    };
  }, [filteredPayments]);

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

  const isLoading = reportsLoading || (canReadPayments && ledgerLoading);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-stretch sm:items-center border-b border-slate-800 pb-4">
        <div>
          <p className="text-sm font-semibold text-slate-350">Analyze demographic distributions and revenue metrics</p>
        </div>
        <div className="flex flex-wrap gap-2.5">
          <button
            onClick={handleExportCSV}
            className="flex items-center justify-center px-4 py-2 bg-slate-950 hover:bg-slate-900 border border-slate-700 hover:border-slate-600 text-white font-black rounded-xl text-xs shadow-lg shadow-slate-950/50 transition-colors cursor-pointer"
          >
            <Map className="w-4 h-4 mr-2" />
            Export State CSV
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-20 text-slate-500 font-bold text-sm">Aggregating analytics data...</div>
      ) : (
        <div className="space-y-6">
          {/* Revenue Section */}
          {canReadPayments ? (
            <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl space-y-6">
              {/* Card Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-800 pb-4 gap-4">
                <div className="flex items-center space-x-2.5">
                  <TrendingUp className="w-5 h-5 text-emerald-400" />
                  <div>
                    <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider">Revenue Analytics</h3>
                    <p className="text-xs text-slate-450 mt-0.5">Track occupancy and booking revenues</p>
                  </div>
                </div>

                {/* Date Filter */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 w-full sm:w-auto">
                  <div className="flex items-center bg-slate-950/40 border border-slate-800 px-3 py-1.5 rounded-xl text-xs text-slate-300 w-full sm:w-auto justify-center">
                    <Calendar className="w-3.5 h-3.5 text-blue-400 shrink-0 mr-2" />
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="bg-transparent text-slate-200 font-semibold outline-none w-full sm:w-28 text-center cursor-pointer"
                    />
                  </div>
                  <span className="text-slate-500 font-bold text-center self-center sm:self-auto text-xs">to</span>
                  <div className="flex items-center bg-slate-950/40 border border-slate-800 px-3 py-1.5 rounded-xl text-xs text-slate-300 w-full sm:w-auto justify-center">
                    <Calendar className="w-3.5 h-3.5 text-blue-400 shrink-0 mr-2" />
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="bg-transparent text-slate-200 font-semibold outline-none w-full sm:w-28 text-center cursor-pointer"
                    />
                  </div>
                </div>
              </div>

              {/* Revenue Displays Grid */}
              <div className="space-y-4">
                {/* Total Revenue Display */}
                <div className="bg-slate-950/30 border border-slate-850 p-6 rounded-xl text-center space-y-2">
                  <span className="text-xs text-slate-400 uppercase font-black tracking-wider block">Total Revenue</span>
                  <div className="text-4xl font-black text-emerald-400">
                    ₹{totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                  <p className="text-xs text-slate-500 font-mono">
                    Sum of all payments collected from {formatDate(startDate)} to {formatDate(endDate)}
                  </p>
                </div>

                {/* Sub-breakdowns */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="bg-slate-950/20 border border-slate-850/80 p-4 rounded-xl text-center space-y-1">
                    <span className="text-[10px] text-slate-450 uppercase font-bold tracking-wider block">Room Bookings Revenue</span>
                    <div className="text-xl font-extrabold text-blue-400">
                      ₹{roomRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                  </div>

                  <div className="bg-slate-950/20 border border-slate-850/80 p-4 rounded-xl text-center space-y-1">
                    <span className="text-[10px] text-slate-455 uppercase font-bold tracking-wider block">Additional Items Revenue</span>
                    <div className="text-xl font-extrabold text-indigo-400">
                      ₹{additionalItemsRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl text-center">
              <TrendingUp className="w-8 h-8 text-slate-600 mx-auto mb-3" />
              <h3 className="text-sm font-bold text-slate-400">Revenue Locked</h3>
              <p className="text-xs text-slate-500 mt-1">You require 'payments.read' permissions to view revenue data.</p>
            </div>
          )}

          {/* State-Wise Analytics Section */}
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
        </div>
      )}
    </div>
  );
};

export default Reports;
