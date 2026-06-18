import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../utils/api';
import { Search, X, Phone, Mail, MapPin } from 'lucide-react';

interface Customer {
  id: string;
  fullName: string;
  mobileNumber: string;
  alternateNumber?: string;
  email?: string;
  dob?: string;
  gender?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  pincode?: string;
  documents: Array<{
    idType: string;
    idNumber: string;
    frontImageUrl?: string;
    backImageUrl?: string;
    customerPhotoUrl?: string;
  }>;
}

const Customers: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  // Fetch Customers
  const { data: customersRes, isLoading } = useQuery({
    queryKey: ['customers', searchQuery],
    queryFn: () =>
      api.get(`/customers/search?q=${searchQuery}`).then((res) => res.data),
  });

  // Fetch Stay History
  const { data: historyRes, isLoading: historyLoading } = useQuery({
    queryKey: ['customer-history', selectedCustomer?.id],
    queryFn: () => {
      if (!selectedCustomer) return null;
      return api.get(`/customers/${selectedCustomer.id}`).then((res) => res.data);
    },
    enabled: !!selectedCustomer,
  });

  const customers: Customer[] = customersRes?.data || [];
  const customerHistory = historyRes?.data || null;

  return (
    <div className="space-y-6">
      {/* Search Header */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-stretch sm:items-center">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-3 w-4 h-4 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by Name, Mob, or Govt ID..."
            className="w-full bg-slate-900 border border-slate-850 rounded-xl py-2 pl-9 pr-4 text-sm text-white placeholder-slate-500 outline-none focus:border-blue-500"
          />
        </div>
      </div>

      {/* Customer List */}
      {isLoading ? (
        <div className="text-center py-20 text-slate-500 text-sm">Loading guests index...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {customers.map((c) => (
            <div
              key={c.id}
              onClick={() => setSelectedCustomer(c)}
              className="bg-slate-900 border border-slate-800 rounded-2xl p-5 hover:border-blue-500/50 cursor-pointer transition-all shadow-md flex justify-between items-start"
            >
              <div className="space-y-2">
                <h4 className="text-base font-bold text-white leading-tight">{c.fullName}</h4>
                <div className="space-y-1 text-xs text-slate-400">
                  <p className="flex items-center">
                    <Phone className="w-3.5 h-3.5 mr-2 text-slate-500" />
                    {c.mobileNumber}
                  </p>
                  {c.email && (
                    <p className="flex items-center">
                      <Mail className="w-3.5 h-3.5 mr-2 text-slate-500" />
                      {c.email}
                    </p>
                  )}
                  {c.city && (
                    <p className="flex items-center">
                      <MapPin className="w-3.5 h-3.5 mr-2 text-slate-500" />
                      {c.city}, {c.state}
                    </p>
                  )}
                </div>
              </div>
              <div className="px-2.5 py-1 bg-slate-800 text-slate-300 text-[10px] uppercase font-bold rounded-lg border border-slate-750">
                View History
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Slide Drawer Detail Modal */}
      {selectedCustomer && (
        <div className="fixed inset-0 z-50 flex justify-end">
          {/* Overlay */}
          <div
            className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm"
            onClick={() => setSelectedCustomer(null)}
          />

          {/* Drawer content */}
          <div className="relative w-full max-w-lg bg-slate-900 border-l border-slate-800 shadow-2xl h-full flex flex-col justify-between z-10 animate-slide-in">
            <div className="overflow-y-auto flex-1">
              {/* Header */}
              <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-900/60 backdrop-blur-md sticky top-0 z-10">
                <div>
                  <h3 className="text-lg font-bold text-white">{selectedCustomer.fullName}</h3>
                  <p className="text-xs text-slate-400 mt-0.5">Guest Profile Summary</p>
                </div>
                <button
                  onClick={() => setSelectedCustomer(null)}
                  className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Body */}
              <div className="p-6 space-y-6">
                {/* Contact and Demographics */}
                <div className="bg-slate-950/40 border border-slate-850 p-4 rounded-xl space-y-3 text-sm">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <span className="text-xs text-slate-500 block">Mobile Number</span>
                      <span className="font-semibold text-slate-200">{selectedCustomer.mobileNumber}</span>
                    </div>
                    <div>
                      <span className="text-xs text-slate-500 block">Alt Mobile</span>
                      <span className="font-semibold text-slate-200">{selectedCustomer.alternateNumber || 'N/A'}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-800/60">
                    <div>
                      <span className="text-xs text-slate-500 block">Date of Birth</span>
                      <span className="font-semibold text-slate-200">
                        {selectedCustomer.dob ? new Date(selectedCustomer.dob).toLocaleDateString() : 'N/A'}
                      </span>
                    </div>
                    <div>
                      <span className="text-xs text-slate-500 block">Gender</span>
                      <span className="font-semibold text-slate-200 capitalize">{selectedCustomer.gender || 'N/A'}</span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-800/60">
                    <span className="text-xs text-slate-500 block">Address</span>
                    <span className="font-semibold text-slate-200">
                      {[selectedCustomer.address, selectedCustomer.city, selectedCustomer.state, selectedCustomer.pincode]
                        .filter(Boolean)
                        .join(', ') || 'N/A'}
                    </span>
                  </div>
                </div>

                {/* Identity verification documents */}
                {selectedCustomer.documents?.[0] && (
                  <div className="space-y-3">
                    <h4 className="text-xs font-semibold text-slate-450 tracking-wider uppercase">Identity Verification</h4>
                    <div className="bg-slate-950/20 border border-slate-850 p-4 rounded-xl space-y-3 text-sm">
                      <div className="flex justify-between">
                        <div>
                          <span className="text-xs text-slate-500 block">ID Document Type</span>
                          <span className="font-semibold text-slate-200">{selectedCustomer.documents[0].idType}</span>
                        </div>
                        <div>
                          <span className="text-xs text-slate-500 block">Document Number</span>
                          <span className="font-semibold text-slate-200 font-mono">{selectedCustomer.documents[0].idNumber}</span>
                        </div>
                      </div>

                      {/* Display image stubs */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                        {selectedCustomer.documents[0].customerPhotoUrl && (
                          <div className="bg-slate-950 border border-slate-800 rounded-lg p-2 text-center text-[10px]">
                            <p className="text-slate-400 mb-1">Face Photo</p>
                            <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-300">Uploaded</span>
                          </div>
                        )}
                        {selectedCustomer.documents[0].frontImageUrl && (
                          <div className="bg-slate-950 border border-slate-800 rounded-lg p-2 text-center text-[10px]">
                            <p className="text-slate-400 mb-1">Front ID</p>
                            <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-300">Uploaded</span>
                          </div>
                        )}
                        {selectedCustomer.documents[0].backImageUrl && (
                          <div className="bg-slate-950 border border-slate-800 rounded-lg p-2 text-center text-[10px]">
                            <p className="text-slate-400 mb-1">Back ID</p>
                            <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-300">Uploaded</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Stay history timeline */}
                <div className="space-y-3">
                  <h4 className="text-xs font-semibold text-slate-450 tracking-wider uppercase">Stay History Logs</h4>
                  {historyLoading ? (
                    <div className="text-center py-6 text-slate-500 text-xs">Loading logs...</div>
                  ) : (
                    <div className="space-y-3">
                      {customerHistory?.bookings?.length === 0 ? (
                        <p className="text-xs text-slate-500 py-2">No past stays registered.</p>
                      ) : (
                        customerHistory?.bookings?.map((b: any) => (
                          <div key={b.id} className="bg-slate-950/20 border border-slate-850 p-4 rounded-xl flex justify-between items-center text-xs">
                            <div className="space-y-1">
                              <p className="font-semibold text-slate-200">Room {b.room.roomNumber}</p>
                              <p className="text-slate-400">
                                {new Date(b.checkInDate).toLocaleDateString()} - {new Date(b.checkOutDate).toLocaleDateString()}
                              </p>
                            </div>
                            <div className="text-right space-y-1">
                              <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-350 capitalize">{b.status.toLowerCase()}</span>
                              <p className="font-semibold text-emerald-400">₹{b.price}</p>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Customers;
