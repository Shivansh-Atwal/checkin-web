import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../utils/api';
import { useNavigate } from 'react-router-dom';
import {
  Bed,
  X,
  CreditCard,
  User,
  Phone,
  Calendar,
  MapPin
} from 'lucide-react';

interface Room {
  id: string;
  roomNumber: string;
  floorNumber: number;
  roomType: string;
  capacity: number;
  amenities: string;
  status: 'AVAILABLE' | 'OCCUPIED' | 'ADVANCE_BOOKED' | 'MAINTENANCE';
  checkIns?: any[];
  bookings?: any[];
}

interface Stats {
  totalRooms: number;
  availableRooms: number;
  occupiedRooms: number;
  bookedRooms: number;
  todayCheckins: number;
  todayCheckouts: number;
  todayRevenue: number;
  pendingPayments: number;
}

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);

  // Fetch Rooms
  const { data: roomsRes, isLoading: roomsLoading } = useQuery({
    queryKey: ['rooms'],
    queryFn: () => api.get('/rooms').then((res) => res.data),
  });

  // Fetch Stats
  const { data: statsRes } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: () => api.get('/admin/dashboard-stats').then((res) => res.data),
  });

  // Fetch Single Room Details (Active checkin/booking data)
  const { data: roomDetailsRes, isLoading: detailsLoading } = useQuery({
    queryKey: ['room-details', selectedRoom?.id],
    queryFn: () => {
      if (!selectedRoom) return null;
      return api.get(`/rooms/${selectedRoom.id}`).then((res) => res.data);
    },
    enabled: !!selectedRoom,
  });

  // Toggle Maintenance Mutation
  const updateStatusMutation = useMutation({
    mutationFn: (data: { roomId: string; status: string }) =>
      api.patch(`/rooms/${data.roomId}/status`, { status: data.status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rooms'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      if (selectedRoom) {
        setSelectedRoom((prev) => (prev ? { ...prev, status: prev.status === 'MAINTENANCE' ? 'AVAILABLE' : 'MAINTENANCE' } : null));
      }
    },
  });

  const rooms: Room[] = roomsRes?.data || [];
  const stats: Stats = statsRes?.data || {
    totalRooms: 0,
    availableRooms: 0,
    occupiedRooms: 0,
    bookedRooms: 0,
    todayCheckins: 0,
    todayCheckouts: 0,
    todayRevenue: 0,
    pendingPayments: 0,
  };

  const getStatusColor = (status: Room['status']) => {
    switch (status) {
      case 'AVAILABLE':
        return 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/25';
      case 'OCCUPIED':
        return 'bg-rose-500/15 border-rose-500/30 text-rose-400 hover:bg-rose-500/25';
      case 'ADVANCE_BOOKED':
        return 'bg-amber-500/15 border-amber-500/30 text-amber-400 hover:bg-amber-500/25';
      case 'MAINTENANCE':
        return 'bg-slate-500/10 border-slate-500/20 text-slate-400 hover:bg-slate-500/20';
    }
  };

  const getStatusBadge = (status: Room['status']) => {
    switch (status) {
      case 'AVAILABLE':
        return <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300">Available</span>;
      case 'OCCUPIED':
        return <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-rose-500/20 text-rose-300">Occupied</span>;
      case 'ADVANCE_BOOKED':
        return <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-500/20 text-amber-300">Booked</span>;
      case 'MAINTENANCE':
        return <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-700 text-slate-300">Maintenance</span>;
    }
  };

  return (
    <div className="space-y-8">
      {/* Stats Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Rooms */}
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl flex items-center shadow-md relative overflow-hidden">
          <div className="p-4 bg-blue-500/15 text-blue-400 rounded-xl mr-5">
            <Bed className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-semibold tracking-wider uppercase">Inventory Summary</p>
            <p className="text-3xl font-extrabold text-white mt-1">{stats.totalRooms} Rooms</p>
            <p className="text-xs text-slate-500 mt-0.5">
              {stats.availableRooms} Available / {stats.occupiedRooms} Occupied
            </p>
          </div>
          <div className="absolute -right-6 -bottom-6 w-16 h-16 bg-blue-500/5 rounded-full blur-xl" />
        </div>

        {/* Today Check-Ins */}

        {/* Today's Revenue */}
        

        {/* Outstanding Receivables */}
        

      </div>

      {/* Main Grid Header */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center border-b border-slate-800 pb-4">
        <h2 className="text-xl font-bold tracking-tight text-slate-200">Room Grid Status</h2>
        <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs font-semibold text-slate-400">
          <div className="flex items-center"><span className="w-3 h-3 bg-emerald-500 rounded-full mr-2"></span>Available</div>
          <div className="flex items-center"><span className="w-3 h-3 bg-rose-500 rounded-full mr-2"></span>Occupied</div>
          <div className="flex items-center"><span className="w-3 h-3 bg-amber-500 rounded-full mr-2"></span>Booked</div>
        </div>
      </div>

      {/* Grid of rooms */}
      {roomsLoading ? (
        <div className="text-center py-20 text-slate-500">Loading rooms inventory...</div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
          {rooms.map((room) => (
            <div
              key={room.id}
              onClick={() => setSelectedRoom(room)}
              className={`border p-5 rounded-2xl cursor-pointer transition-all duration-200 flex flex-col justify-between h-36 select-none ${getStatusColor(
                room.status
              )}`}
            >
              <div className="flex justify-between items-start">
                <span className="text-2xl font-bold tracking-tight font-mono text-white">
                  {room.roomNumber}
                </span>
                <span className="text-xs px-2 py-0.5 rounded-md bg-slate-950/45 text-slate-350">
                  Fl {room.floorNumber}
                </span>
              </div>
              <div>
                <p className="text-xs font-bold text-slate-300 tracking-wider truncate">
                  {room.roomType}
                </p>
                <div className="flex justify-between items-center mt-2">
                  <span className="text-sm font-semibold text-white">
                    {room.status === 'OCCUPIED' && room.checkIns?.[0] ? (
                      `₹${room.checkIns[0].pricePerNight.toFixed(2)}/nt`
                    ) : room.status === 'ADVANCE_BOOKED' && room.bookings?.[0] ? (
                      `₹${room.bookings[0].price.toFixed(2)}/nt`
                    ) : (
                      '₹ Custom'
                    )}
                  </span>
                  <span className="w-2.5 h-2.5 rounded-full bg-current" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Slide Drawer Modal */}
      {selectedRoom && (
        <div className="fixed inset-0 z-50 flex justify-end">
          {/* Overlay */}
          <div
            className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm"
            onClick={() => setSelectedRoom(null)}
          />

          {/* Drawer content */}
          <div className="relative w-full max-w-md bg-slate-900 border-l border-slate-800 shadow-2xl h-full flex flex-col justify-between z-10 animate-slide-in">
            <div>
              {/* Header */}
              <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-900/60 backdrop-blur-md sticky top-0">
                <div>
                  <h3 className="text-lg font-bold text-slate-100 flex items-center">
                    Room {selectedRoom.roomNumber} Details
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">{selectedRoom.roomType} Room</p>
                </div>
                <button
                  onClick={() => setSelectedRoom(null)}
                  className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Body */}
              <div className="p-6 space-y-6 overflow-y-auto max-h-[calc(100vh-160px)]">
                {/* Status Badge */}
                <div className="flex justify-between items-center bg-slate-950/50 p-4 rounded-xl border border-slate-800/80">
                  <span className="text-sm text-slate-400 font-medium">Current Status</span>
                  {getStatusBadge(selectedRoom.status)}
                </div>

                {/* Loading detail stubs */}
                {detailsLoading ? (
                  <div className="text-center py-10 text-slate-500 text-sm">Fetching context...</div>
                ) : (
                  <>
                    {/* OCCUPIED DETAILS */}
                    {selectedRoom.status === 'OCCUPIED' && roomDetailsRes?.data?.checkIns?.[0] && (
                      <div className="space-y-4">
                        <h4 className="text-xs font-semibold text-slate-400 tracking-wider uppercase">Active Stay Guest</h4>
                        <div className="bg-slate-950/30 border border-slate-800 rounded-xl p-4 space-y-3">
                          {roomDetailsRes.data.checkIns[0].registrationNumber && (
                            <div className="text-[10px] bg-emerald-500/10 text-emerald-400 font-mono font-bold px-2.5 py-1 rounded-lg border border-emerald-500/20 inline-block">
                              Registration No: {roomDetailsRes.data.checkIns[0].registrationNumber}
                            </div>
                          )}
                          <div className="flex items-center text-sm">
                            <User className="w-4 h-4 text-slate-500 mr-2.5 shrink-0" />
                            <span className="font-semibold text-slate-200">
                              {roomDetailsRes.data.checkIns[0].customer.fullName}
                            </span>
                          </div>
                          <div className="flex items-center text-sm">
                            <Phone className="w-4 h-4 text-slate-500 mr-2.5 shrink-0" />
                            <span className="text-slate-350">
                              {roomDetailsRes.data.checkIns[0].customer.mobileNumber}
                            </span>
                          </div>
                          {(roomDetailsRes.data.checkIns[0].customer.address || roomDetailsRes.data.checkIns[0].customer.city) && (
                            <div className="flex items-start text-sm">
                              <MapPin className="w-4 h-4 text-slate-500 mr-2.5 shrink-0 mt-0.5" />
                              <span className="text-slate-350 leading-tight">
                                {[
                                  roomDetailsRes.data.checkIns[0].customer.address,
                                  roomDetailsRes.data.checkIns[0].customer.city,
                                  roomDetailsRes.data.checkIns[0].customer.state,
                                  roomDetailsRes.data.checkIns[0].customer.country,
                                  roomDetailsRes.data.checkIns[0].customer.pincode
                                ].filter(Boolean).join(', ')}
                              </span>
                            </div>
                          )}
                          <div className="flex items-center text-sm">
                            <Calendar className="w-4 h-4 text-slate-500 mr-2.5 shrink-0" />
                            <span className="text-slate-400 text-xs">
                              In: {new Date(roomDetailsRes.data.checkIns[0].checkInTime).toLocaleString()}
                            </span>
                          </div>
                          <div className="flex items-center text-sm border-t border-slate-800/80 pt-2.5 mt-2.5">
                            <CreditCard className="w-4 h-4 text-slate-500 mr-2.5 shrink-0" />
                            <div className="flex-1 flex justify-between text-xs">
                              <span className="text-slate-400">Advance Paid:</span>
                              <span className="text-emerald-400 font-bold">₹{roomDetailsRes.data.checkIns[0].advancePaid}</span>
                            </div>
                          </div>
                          <div className="flex items-center text-sm">
                            <div className="w-4 mr-2.5" />
                            <div className="flex-1 flex justify-between text-xs font-semibold">
                              <span className="text-slate-400">Remaining Balance:</span>
                              <span className="text-rose-400">₹{roomDetailsRes.data.checkIns[0].remainingAmount}</span>
                            </div>
                          </div>
                          <div className="flex items-center text-sm">
                            <div className="w-4 mr-2.5" />
                            <div className="flex-1 flex justify-between text-xs font-semibold">
                              <span className="text-slate-400">Rate / Night:</span>
                              <span className="text-emerald-450 font-semibold">₹{roomDetailsRes.data.checkIns[0].pricePerNight}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* ADVANCE BOOKED DETAILS */}
                    {selectedRoom.status === 'ADVANCE_BOOKED' && roomDetailsRes?.data?.bookings?.[0] && (
                      <div className="space-y-4">
                        <h4 className="text-xs font-semibold text-slate-400 tracking-wider uppercase">Advance Reservation Details</h4>
                        <div className="bg-slate-950/30 border border-slate-800 rounded-xl p-4 space-y-3">
                          <div className="flex items-center text-sm">
                            <User className="w-4 h-4 text-slate-500 mr-2.5 shrink-0" />
                            <span className="font-semibold text-slate-200">
                              {roomDetailsRes.data.bookings[0].customer.fullName}
                            </span>
                          </div>
                          <div className="flex items-center text-sm">
                            <Phone className="w-4 h-4 text-slate-500 mr-2.5 shrink-0" />
                            <span className="text-slate-350">
                              {roomDetailsRes.data.bookings[0].customer.mobileNumber}
                            </span>
                          </div>
                          {(roomDetailsRes.data.bookings[0].customer.address || roomDetailsRes.data.bookings[0].customer.city) && (
                            <div className="flex items-start text-sm">
                              <MapPin className="w-4 h-4 text-slate-500 mr-2.5 shrink-0 mt-0.5" />
                              <span className="text-slate-350 leading-tight">
                                {[
                                  roomDetailsRes.data.bookings[0].customer.address,
                                  roomDetailsRes.data.bookings[0].customer.city,
                                  roomDetailsRes.data.bookings[0].customer.state,
                                  roomDetailsRes.data.bookings[0].customer.country,
                                  roomDetailsRes.data.bookings[0].customer.pincode
                                ].filter(Boolean).join(', ')}
                              </span>
                            </div>
                          )}
                          <div className="flex items-center text-sm">
                            <Calendar className="w-4 h-4 text-slate-500 mr-2.5 shrink-0" />
                            <span className="text-slate-400 text-xs">
                              Stay: {new Date(roomDetailsRes.data.bookings[0].checkInDate).toLocaleDateString()} to {new Date(roomDetailsRes.data.bookings[0].checkOutDate).toLocaleDateString()}
                            </span>
                          </div>
                          <div className="flex items-center text-sm border-t border-slate-800/80 pt-2.5 mt-2.5">
                            <CreditCard className="w-4 h-4 text-slate-500 mr-2.5 shrink-0" />
                            <div className="flex-1 flex justify-between text-xs">
                              <span className="text-slate-400">Paid Deposit:</span>
                              <span className="text-emerald-400 font-bold">₹{roomDetailsRes.data.bookings[0].advancePayment}</span>
                            </div>
                          </div>
                          <div className="flex items-center text-sm">
                            <div className="w-4 mr-2.5" />
                            <div className="flex-1 flex justify-between text-xs font-semibold">
                              <span className="text-slate-400">Rate / Night:</span>
                              <span className="text-emerald-450 font-semibold">₹{roomDetailsRes.data.bookings[0].price}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Amenities list */}
                    

                    {/* Room Capacity */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-950/20 p-4 border border-slate-800 rounded-xl text-center items-center">
                      <div>
                        <span className="text-xs text-slate-500 block">Cap Limit</span>
                        <span className="text-sm font-semibold text-slate-200 mt-0.5">{selectedRoom.capacity} Guests</span>
                      </div>
                      <div>
                        <span className="text-xs text-slate-500 block">Pricing Rate</span>
                        <span className="text-sm font-semibold text-slate-200 mt-0.5">
                          {selectedRoom.status === 'OCCUPIED' && roomDetailsRes?.data?.checkIns?.[0] ? (
                            `₹${roomDetailsRes.data.checkIns[0].pricePerNight}/night`
                          ) : selectedRoom.status === 'ADVANCE_BOOKED' && roomDetailsRes?.data?.bookings?.[0] ? (
                            `₹${roomDetailsRes.data.bookings[0].price}/night`
                          ) : (
                            'Custom per Stay'
                          )}
                        </span>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Actions footer */}
            <div className="p-6 border-t border-slate-800 space-y-3 bg-slate-900/40 sticky bottom-0">
              {/* AVAILABLE actions */}
              {selectedRoom.status === 'AVAILABLE' && (
                <div className="grid grid-cols-2 gap-4">
                  <button
                    onClick={() => {
                      setSelectedRoom(null);
                      navigate('/checkin', { state: { roomId: selectedRoom.id, roomNumber: selectedRoom.roomNumber } });
                    }}
                    className="py-3 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl shadow-lg shadow-emerald-600/10 text-center text-xs transition-colors cursor-pointer"
                  >
                    Check-In Guest
                  </button>
                  <button
                    onClick={() => {
                      setSelectedRoom(null);
                      navigate('/bookings', { state: { roomId: selectedRoom.id, roomNumber: selectedRoom.roomNumber } });
                    }}
                    className="py-3 px-4 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl shadow-lg shadow-blue-600/10 text-center text-xs transition-colors cursor-pointer"
                  >
                    Book Room
                  </button>
                </div>
              )}

              {/* OCCUPIED actions */}
              {selectedRoom.status === 'OCCUPIED' && roomDetailsRes?.data?.checkIns?.[0] && (
                <button
                  onClick={() => {
                    setSelectedRoom(null);
                    navigate('/checkout', { state: { checkInId: roomDetailsRes.data.checkIns[0].id } });
                  }}
                  className="w-full py-3 px-4 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl text-xs transition-colors cursor-pointer"
                >
                  Proceed to Check-Out
                </button>
              )}

              {/* BOOKED actions */}
              {selectedRoom.status === 'ADVANCE_BOOKED' && roomDetailsRes?.data?.bookings?.[0] && (
                <button
                  onClick={() => {
                    setSelectedRoom(null);
                    navigate('/checkin', { state: { bookingId: roomDetailsRes.data.bookings[0].id } });
                  }}
                  className="w-full py-3 px-4 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-xl text-xs transition-colors cursor-pointer"
                >
                  Convert Reservation to Check-In
                </button>
              )}

              {/* MAINTENANCE actions */}
              {selectedRoom.status === 'MAINTENANCE' && (
                <button
                  onClick={() => updateStatusMutation.mutate({ roomId: selectedRoom.id, status: 'AVAILABLE' })}
                  className="w-full py-3 px-4 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl text-xs border border-slate-750 transition-colors cursor-pointer"
                >
                  Mark Available (Clean)
                </button>
              )}

              {/* General Maintenance Trigger */}
              {selectedRoom.status === 'AVAILABLE' && (
                <button
                  onClick={() => updateStatusMutation.mutate({ roomId: selectedRoom.id, status: 'MAINTENANCE' })}
                  className="w-full py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-xl text-xs transition-colors cursor-pointer"
                >
                  Send to Maintenance Room
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
