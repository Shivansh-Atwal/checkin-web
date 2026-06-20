import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../utils/api';
import { useAuthStore } from '../store/authStore';
import { Plus, X, Search, Phone, Ban, Pencil, MapPin, Globe, History, BookmarkCheck } from 'lucide-react';
import { useLocation } from 'react-router-dom';

interface Booking {
  id: string;
  bookingNumber: string;
  checkInDate: string;
  checkOutDate: string;
  numberOfGuests: number;
  advancePayment: number;
  price: number;
  status: string;
  notes: string;
  customerId: string;
  roomId: string;
  customer: {
    fullName: string;
    mobileNumber: string;
    address?: string;
    city?: string;
    state?: string;
    country?: string; // Nationality
    pincode?: string;
  };
  room: {
    id: string;
    roomNumber: string;
    roomType: string;
  };
  registrationNumber?: string;
}

interface Room {
  id: string;
  roomNumber: string;
  status: string;
  roomType: string;
}

const Bookings: React.FC = () => {
  const queryClient = useQueryClient();
  const location = useLocation();
  const { hasPermission } = useAuthStore();
  const [modalOpen, setModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Form / Edit states
  const [editingBooking, setEditingBooking] = useState<Booking | null>(null);
  const [customerName, setCustomerName] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [country, setCountry] = useState('');
  const [pincode, setPincode] = useState('');
  const [roomId, setRoomId] = useState('');
  const [checkInDate, setCheckInDate] = useState('');
  const [checkOutDate, setCheckOutDate] = useState('');
  const [numberOfGuests, setNumberOfGuests] = useState(1);
  const [price, setPrice] = useState(80);
  const [advancePayment, setAdvancePayment] = useState(0);
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState('CONFIRMED');
  const [registrationNumber, setRegistrationNumber] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);

  // Pre-fill room if navigated from dashboard
  React.useEffect(() => {
    if (location.state && location.state.roomId) {
      setRoomId(location.state.roomId);
      setModalOpen(true);
    }
  }, [location.state]);

  // Fetch Bookings
  const { data: bookingsRes, isLoading } = useQuery({
    queryKey: ['bookings', searchQuery],
    queryFn: () =>
      api.get(`/bookings?q=${searchQuery}`).then((res) => res.data),
  });

  // Fetch Available Rooms for Dropdown
  const { data: roomsRes } = useQuery({
    queryKey: ['available-rooms-dropdown'],
    queryFn: () => api.get('/rooms?status=AVAILABLE').then((res) => res.data),
  });

  const bookings: Booking[] = bookingsRes?.data || [];
  const rooms: Room[] = roomsRes?.data || [];

  // Create Booking Mutation
  const createBookingMutation = useMutation({
    mutationFn: (newBooking: any) => api.post('/bookings', newBooking),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      queryClient.invalidateQueries({ queryKey: ['rooms'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      closeModal();
    },
    onError: (err: any) => {
      setValidationError(err.response?.data?.error || 'Failed to create booking.');
    }
  });

  // Update Booking Mutation
  const updateBookingMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: any }) =>
      api.put(`/bookings/${id}`, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      queryClient.invalidateQueries({ queryKey: ['rooms'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      closeModal();
    },
    onError: (err: any) => {
      setValidationError(err.response?.data?.error || 'Failed to update booking.');
    }
  });

  // Cancel Booking Mutation
  const cancelBookingMutation = useMutation({
    mutationFn: (id: string) => api.patch(`/bookings/${id}/cancel`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      queryClient.invalidateQueries({ queryKey: ['rooms'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
    },
  });

  const openEditModal = (booking: Booking) => {
    setEditingBooking(booking);
    setCustomerName(booking.customer.fullName || '');
    setMobileNumber(booking.customer.mobileNumber || '');
    setAddress(booking.customer.address || '');
    setCity(booking.customer.city || '');
    setState(booking.customer.state || '');
    setCountry(booking.customer.country || '');
    setPincode(booking.customer.pincode || '');
    setRoomId(booking.roomId);
    
    setCheckInDate(new Date(booking.checkInDate).toISOString().split('T')[0]);
    setCheckOutDate(new Date(booking.checkOutDate).toISOString().split('T')[0]);
    
    setNumberOfGuests(booking.numberOfGuests);
    setPrice(booking.price);
    setAdvancePayment(booking.advancePayment);
    setNotes(booking.notes || '');
    setStatus(booking.status);
    setRegistrationNumber(booking.registrationNumber || '');
    setValidationError(null);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingBooking(null);
    setCustomerName('');
    setMobileNumber('');
    setAddress('');
    setCity('');
    setState('');
    setCountry('');
    setPincode('');
    setRoomId('');
    setCheckInDate('');
    setCheckOutDate('');
    setNumberOfGuests(1);
    setPrice(80);
    setAdvancePayment(0);
    setNotes('');
    setStatus('CONFIRMED');
    setRegistrationNumber('');
    setValidationError(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    if (new Date(checkOutDate) <= new Date(checkInDate)) {
      setValidationError('Check-out date must be after check-in date.');
      return;
    }

    const payload = {
      customerName,
      mobileNumber,
      address,
      city,
      state,
      country,
      pincode,
      roomId,
      checkInDate,
      checkOutDate,
      numberOfGuests: Number(numberOfGuests),
      price: Number(price),
      advancePayment: Number(advancePayment),
      notes,
      status,
      registrationNumber: registrationNumber || undefined,
    };

    const performBooking = async () => {
      if (editingBooking) {
        updateBookingMutation.mutate({ id: editingBooking.id, payload });
      } else {
        createBookingMutation.mutate(payload);
      }
    };
    performBooking();
  };

  const handleCancel = (id: string) => {
    if (confirm('Are you sure you want to cancel this reservation?')) {
      cancelBookingMutation.mutate(id);
    }
  };

  // Split bookings into active booked list and stay history list
  const bookedReservations = bookings.filter((b) => b.status === 'CONFIRMED');
  const stayRecords = bookings.filter((b) => b.status !== 'CONFIRMED');

  const selectRooms = React.useMemo(() => {
    if (editingBooking) {
      const alreadyIncluded = rooms.some((r) => r.id === editingBooking.roomId);
      if (!alreadyIncluded && editingBooking.room) {
        return [
          {
            id: editingBooking.roomId,
            roomNumber: editingBooking.room.roomNumber,
            roomType: editingBooking.room.roomType,
            status: 'CURRENTLY ASSIGNED'
          },
          ...rooms
        ];
      }
    }
    return rooms;
  }, [rooms, editingBooking]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'CONFIRMED':
        return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-500/20 text-blue-300 border border-blue-500/20">Booked</span>;
      case 'CHECKED_IN':
        return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/20">Checked In</span>;
      case 'CHECKED_OUT':
        return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-800 text-slate-400 border border-slate-700">Checked Out</span>;
      case 'CANCELLED':
        return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-500/20 text-rose-300 border border-rose-500/20">Cancelled</span>;
      default:
        return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-800 text-slate-400">{status}</span>;
    }
  };

  const renderBookingTable = (list: Booking[], showCancelAction: boolean) => {
    if (list.length === 0) {
      return (
        <div className="text-center py-12 text-slate-500 text-xs">
          No records found in this section.
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full min-w-[900px] border-collapse text-left">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-850/50 text-slate-450 text-[10px] uppercase tracking-wider font-bold">
                <th className="p-4">Ref Number</th>
                <th className="p-4">Guest Info</th>
                <th className="p-4">Room Allocation</th>
                <th className="p-4">Stay Dates</th>
                <th className="p-4">Advance Paid</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-xs text-slate-250">
              {list.map((booking) => (
                <tr key={booking.id} className="hover:bg-slate-850/20 transition-colors">
                  <td className="p-4 font-mono font-semibold text-blue-400">
                    <div>{booking.bookingNumber}</div>
                    {booking.registrationNumber && (
                      <div className="text-[10px] text-emerald-400 font-bold mt-0.5">
                        Reg: {booking.registrationNumber}
                      </div>
                    )}
                  </td>
                  <td className="p-4">
                    <p className="font-semibold text-white">{booking.customer.fullName}</p>
                    <p className="text-[11px] text-slate-450 flex items-center mt-0.5">
                      <Phone className="w-3 h-3 mr-1 text-slate-500" />
                      {booking.customer.mobileNumber}
                    </p>
                    {booking.customer.city && (
                      <p className="text-[10px] text-slate-500 flex items-center mt-1">
                        <MapPin className="w-2.5 h-2.5 mr-0.5" />
                        {booking.customer.city}, {booking.customer.state}
                      </p>
                    )}
                  </td>
                  <td className="p-4">
                    <p className="font-mono font-bold text-white">Room {booking.room?.roomNumber}</p>
                    <p className="text-[10px] text-slate-500 font-mono capitalize">{booking.room?.roomType}</p>
                  </td>
                  <td className="p-4 space-y-0.5">
                    <p><span className="text-slate-500 font-medium">Arrival:</span> {new Date(booking.checkInDate).toLocaleDateString()}</p>
                    <p><span className="text-slate-500 font-medium">Departure:</span> {new Date(booking.checkOutDate).toLocaleDateString()}</p>
                  </td>
                  <td className="p-4 font-semibold text-emerald-400">₹{booking.advancePayment}</td>
                  <td className="p-4">{getStatusBadge(booking.status)}</td>
                  <td className="p-4 text-right space-x-2">
                    {hasPermission('bookings.update') && (
                      <button
                        onClick={() => openEditModal(booking)}
                        className="p-1.5 bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white rounded-lg transition-colors cursor-pointer inline-flex"
                        title="Edit Details"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                    )}
                    {showCancelAction && booking.status === 'CONFIRMED' && hasPermission('bookings.cancel') && (
                      <button
                        onClick={() => handleCancel(booking.id)}
                        className="p-1.5 bg-rose-950/20 hover:bg-rose-950/50 text-rose-400 hover:text-rose-200 rounded-lg transition-colors cursor-pointer inline-flex"
                        title="Cancel Booking"
                      >
                        <Ban className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile Cards View */}
        <div className="md:hidden space-y-4">
          {list.map((booking) => (
            <div key={booking.id} className="bg-slate-950/30 border border-slate-800 p-4 rounded-xl space-y-3">
              <div className="flex justify-between items-center">
                <span className="font-mono font-bold text-blue-400 text-xs">
                  {booking.bookingNumber}
                </span>
                {getStatusBadge(booking.status)}
              </div>
              
              <div>
                <p className="font-bold text-white text-sm">{booking.customer.fullName}</p>
                <p className="text-xs text-slate-400 flex items-center mt-1">
                  <Phone className="w-3 h-3 mr-1.5 text-slate-500" />
                  {booking.customer.mobileNumber}
                </p>
                {booking.customer.city && (
                  <p className="text-[10px] text-slate-450 flex items-center mt-0.5">
                    <MapPin className="w-2.5 h-2.5 mr-1 text-slate-500" />
                    {booking.customer.city}, {booking.customer.state}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs border-t border-slate-800/80 pt-2.5">
                <div>
                  <span className="block text-[10px] uppercase text-slate-500 tracking-wider">Room Assigned</span>
                  <span className="font-mono font-bold text-white">Room {booking.room?.roomNumber}</span>
                  <span className="block text-[10px] text-slate-500">({booking.room?.roomType})</span>
                </div>
                <div>
                  <span className="block text-[10px] uppercase text-slate-500 tracking-wider">Advance Paid</span>
                  <span className="font-bold text-emerald-400">₹{booking.advancePayment}</span>
                </div>
              </div>

              <div className="flex justify-between items-end border-t border-slate-800/80 pt-2.5">
                <div className="text-[10px] space-y-0.5 text-slate-450">
                  <p><span className="text-slate-500">Check-in:</span> {new Date(booking.checkInDate).toLocaleDateString()}</p>
                  <p><span className="text-slate-500">Check-out:</span> {new Date(booking.checkOutDate).toLocaleDateString()}</p>
                </div>
                
                <div className="flex space-x-1.5">
                  {hasPermission('bookings.update') && (
                    <button
                      onClick={() => openEditModal(booking)}
                      className="p-1.5 bg-slate-800 hover:bg-slate-750 text-slate-350 hover:text-white rounded-lg transition-colors cursor-pointer"
                      title="Edit Details"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                  )}
                  {showCancelAction && booking.status === 'CONFIRMED' && hasPermission('bookings.cancel') && (
                    <button
                      onClick={() => handleCancel(booking.id)}
                      className="p-1.5 bg-rose-950/20 hover:bg-rose-950/55 text-rose-450 hover:text-rose-250 rounded-lg transition-colors cursor-pointer"
                      title="Cancel Booking"
                    >
                      <Ban className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-8">
      {/* Top action row */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-stretch sm:items-center bg-slate-900/40 p-4 rounded-2xl border border-slate-850">
        {/* Search */}
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3.5 top-3 w-4.5 h-4.5 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search Guest, Mobile, or Room..."
            className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 pl-10 pr-4 text-sm text-white placeholder-slate-550 outline-none focus:border-blue-500 transition-colors"
          />
        </div>

        {hasPermission('bookings.create') && (
          <button
            onClick={() => setModalOpen(true)}
            className="flex items-center justify-center px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl shadow-lg shadow-blue-500/10 text-xs tracking-wide transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4 mr-2" />
            Book Future Room
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="text-center py-20 text-slate-500 text-sm">Loading stay and booking records...</div>
      ) : (
        <div className="space-y-8 animate-fade-in">
          {/* Section 1: Booked Reservations */}
          <div className="bg-slate-900 border border-slate-850 rounded-2xl p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center tracking-wide uppercase">
                <BookmarkCheck className="w-4.5 h-4.5 text-blue-500 mr-2" />
                Booked Reservations (Future Stays)
                <span className="ml-2.5 px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 text-xs font-mono">
                  {bookedReservations.length}
                </span>
              </h3>
            </div>
            {renderBookingTable(bookedReservations, true)}
          </div>

          {/* Section 2: Stays History & Records */}
          <div className="bg-slate-900 border border-slate-850 rounded-2xl p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center tracking-wide uppercase">
                <History className="w-4.5 h-4.5 text-emerald-500 mr-2" />
                Stay Records & History (Check-In / Check-Out)
                <span className="ml-2.5 px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 text-xs font-mono">
                  {stayRecords.length}
                </span>
              </h3>
            </div>
            {renderBookingTable(stayRecords, false)}
          </div>
        </div>
      )}

      {/* Reservation Form / Edit Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center p-4 overflow-y-auto">
          <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={closeModal} />

          <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-850 rounded-2xl shadow-2xl p-6 z-10 my-8 animate-scale-in">
            <div className="flex justify-between items-center border-b border-slate-800 pb-4 mb-5">
              <h3 className="text-lg font-bold text-white">
                {editingBooking ? `Edit Details (${editingBooking.bookingNumber})` : 'Add Future Stay Reservation'}
              </h3>
              <button
                onClick={closeModal}
                className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {validationError && (
              <div className="mb-4 p-3.5 bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs rounded-xl">
                {validationError}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Primary Guest Identity */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-450 mb-1.5">Guest Full Name</label>
                  <input
                    type="text"
                    required
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="e.g. Samuel Jackson"
                    className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-xl py-2 px-3.5 text-sm text-white outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-450 mb-1.5">Mobile Number</label>
                  <input
                    type="tel"
                    required
                    value={mobileNumber}
                    onChange={(e) => setMobileNumber(e.target.value)}
                    placeholder="e.g. 9876543210"
                    className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-xl py-2 px-3.5 text-sm text-white outline-none"
                  />
                </div>
              </div>

              {/* Guest Address details */}
              <div className="bg-slate-950/45 p-4 rounded-xl border border-slate-850 space-y-3">
                <span className="text-[10px] font-bold text-slate-455 uppercase tracking-wider flex items-center">
                  <MapPin className="w-3.5 h-3.5 mr-1.5 text-slate-500" />
                  Address & Stay Details
                </span>
                <div>
                  <label className="block text-[10px] font-semibold text-slate-450 mb-1">Street Address</label>
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="e.g. 123 Main St, Apt 4B"
                    className="w-full bg-slate-900 border border-slate-800 focus:border-blue-500 rounded-lg py-1.5 px-3 text-xs text-white outline-none"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-450 mb-1">City</label>
                    <input
                      type="text"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      placeholder="New York"
                      className="w-full bg-slate-900 border border-slate-800 focus:border-blue-500 rounded-lg py-1.5 px-3 text-xs text-white outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-450 mb-1">State</label>
                    <input
                      type="text"
                      value={state}
                      onChange={(e) => setState(e.target.value)}
                      placeholder="NY"
                      className="w-full bg-slate-900 border border-slate-800 focus:border-blue-500 rounded-lg py-1.5 px-3 text-xs text-white outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-450 mb-1">Zip/Pincode</label>
                    <input
                      type="text"
                      value={pincode}
                      onChange={(e) => setPincode(e.target.value)}
                      placeholder="10001"
                      className="w-full bg-slate-900 border border-slate-800 focus:border-blue-500 rounded-lg py-1.5 px-3 text-xs text-white outline-none"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-slate-450 mb-1 flex items-center">
                    <Globe className="w-3 h-3 mr-1 text-slate-500" />
                    Nationality / Country
                  </label>
                  <input
                    type="text"
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    placeholder="e.g. Indian"
                    className="w-full bg-slate-900 border border-slate-800 focus:border-blue-500 rounded-lg py-1.5 px-3 text-xs text-white outline-none"
                  />
                </div>
              </div>

              {/* Stay Registration Number (Checked-in stays only) */}
              {editingBooking && (status === 'CHECKED_IN' || status === 'CHECKED_OUT') && (
                <div>
                  <label className="block text-xs font-semibold text-slate-450 mb-1.5">Stay Registration Number</label>
                  <input
                    type="text"
                    value={registrationNumber}
                    onChange={(e) => setRegistrationNumber(e.target.value)}
                    placeholder="Stay Registration Number (e.g. REG-101)"
                    className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-xl py-2 px-3.5 text-sm text-white outline-none"
                  />
                </div>
              )}

              {/* Booking dates */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-450 mb-1.5">Check-In Date</label>
                  <input
                    type="date"
                    required
                    value={checkInDate}
                    onChange={(e) => setCheckInDate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-xl py-2 px-3.5 text-sm text-white outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-450 mb-1.5">Check-Out Date</label>
                  <input
                    type="date"
                    required
                    value={checkOutDate}
                    onChange={(e) => setCheckOutDate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-xl py-2 px-3.5 text-sm text-white outline-none"
                  />
                </div>
              </div>

              {/* Room assignment & guests */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-450 mb-1.5">Assign Room</label>
                  <select
                    required
                    value={roomId}
                    onChange={(e) => setRoomId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-xl py-2 px-3.5 text-sm text-white outline-none"
                  >
                    <option value="">Select Room</option>
                    {selectRooms.map((r) => (
                      <option key={r.id} value={r.id}>
                        Room {r.roomNumber} ({r.roomType}) {(r as any).status ? `[${(r as any).status}]` : ''}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-450 mb-1.5">Number of Guests</label>
                  <input
                    type="number"
                    min={1}
                    value={numberOfGuests}
                    onChange={(e) => setNumberOfGuests(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-xl py-2 px-3.5 text-sm text-white outline-none"
                  />
                </div>
              </div>

              {/* Financial values & status */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                 <div>
                  <label className="block text-xs font-semibold text-slate-450 mb-1.5">Stay Cost/Night (₹)</label>
                  <input
                    type="number"
                    required
                    value={price}
                    onChange={(e) => setPrice(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-xl py-2 px-3.5 text-sm text-white outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-450 mb-1.5">Advance Paid (₹)</label>
                  <input
                    type="number"
                    value={advancePayment}
                    onChange={(e) => setAdvancePayment(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-xl py-2 px-3.5 text-sm text-white outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-450 mb-1.5">Reservation Status</label>
                  <select
                    disabled={true}
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 disabled:opacity-70 disabled:bg-slate-955 rounded-xl py-2 px-3.5 text-sm text-white outline-none"
                  >
                    <option value="CONFIRMED">Booked</option>
                    <option value="CHECKED_IN">Checked In</option>
                    <option value="CHECKED_OUT">Checked Out</option>
                    <option value="CANCELLED">Cancelled</option>
                  </select>
                </div>
              </div>

              {/* Stay Notes */}
              <div>
                <label className="block text-xs font-semibold text-slate-450 mb-1.5">Stay / Reservation Notes</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Any special requests or instructions..."
                  rows={2}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-xl py-2 px-3.5 text-sm text-white outline-none"
                />
              </div>

              {/* Action buttons */}
              <div className="flex justify-end space-x-3 pt-4 border-t border-slate-800 mt-6">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-750 text-slate-300 font-semibold rounded-xl text-xs border border-slate-750 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl text-xs shadow-lg shadow-blue-500/10 transition-colors cursor-pointer"
                >
                  {editingBooking ? 'Save Changes' : 'Confirm Reservation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Bookings;
