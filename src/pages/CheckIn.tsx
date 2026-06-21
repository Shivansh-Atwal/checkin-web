import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../utils/api';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckSquare, Clock, Calendar, ShieldAlert, Loader2 } from 'lucide-react';

interface Room {
  id: string;
  roomNumber: string;
  roomType: string;
}

const compressImage = (file: File, quality = 0.7, maxWidth = 1024, maxHeight = 1024): Promise<File> => {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      return resolve(file);
    }

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          return resolve(file);
        }

        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (!blob) {
              return resolve(file);
            }
            const compressedFile = new File([blob], file.name, {
              type: 'image/jpeg',
              lastModified: Date.now(),
            });
            resolve(compressedFile);
          },
          'image/jpeg',
          quality
        );
      };
      img.onerror = (err) => reject(err);
    };
    reader.onerror = (err) => reject(err);
  });
};

const CheckIn: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();

  const [bookingId, setBookingId] = useState<string | null>(null);

  // Form inputs (Arrival Date and Time defaults)
  const [customerName, setCustomerName] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [roomId, setRoomId] = useState('');
  const [numberOfGuests, setNumberOfGuests] = useState(1);
  const [numberOfRooms, setNumberOfRooms] = useState(1); // Added number of rooms state
  const [arrivalDate, setArrivalDate] = useState(new Date().toISOString().split('T')[0]);
  const [arrivalTime, setArrivalTime] = useState(new Date().toTimeString().slice(0, 5));
  const [advancePaid, setAdvancePaid] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [idType, setIdType] = useState('Aadhaar Card');
  const [idNumber, setIdNumber] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [country, setCountry] = useState(''); // Nationality
  const [pincode, setPincode] = useState('');
  const [registrationNumber, setRegistrationNumber] = useState('');

  // Image Upload states
  const [frontImageLoading, setFrontImageLoading] = useState(false);
  const [frontImageUrl, setFrontImageUrl] = useState('');
  const [backImageLoading, setBackImageLoading] = useState(false);
  const [backImageUrl, setBackImageUrl] = useState('');
  const [photoLoading, setPhotoLoading] = useState(false);
  const [photoUrl, setPhotoUrl] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileUpload = async (
    file: File,
    type: 'documents' | 'customers',
    setUrl: (url: string) => void,
    setLoading: (load: boolean) => void
  ) => {
    setLoading(true);
    try {
      let fileToUpload = file;
      if (file.type.startsWith('image/')) {
        try {
          fileToUpload = await compressImage(file, 0.7, 1024, 1024);
        } catch (compressErr) {
          console.error("Compression failed, uploading original image", compressErr);
        }
      }

      const formData = new FormData();
      formData.append('document', fileToUpload);
      const res = await api.post(`/customers/upload?type=${type}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setUrl(res.data.data.fileUrl);
    } catch (err: any) {
      alert(err.response?.data?.error || 'File upload failed.');
    } finally {
      setLoading(false);
    }
  };

  // Pre-fill triggers
  useEffect(() => {
    if (location.state) {
      if (location.state.bookingId) {
        setBookingId(location.state.bookingId);
      }
      if (location.state.roomId) {
        setRoomId(location.state.roomId);
      }
    }
  }, [location.state]);

  // Fetch booking details if converting
  const { data: bookingRes } = useQuery({
    queryKey: ['booking-prefill', bookingId],
    queryFn: () => api.get(`/bookings/${bookingId}`).then((res) => res.data),
    enabled: !!bookingId,
  });

  // Fetch Available Rooms
  const { data: roomsRes } = useQuery({
    queryKey: ['available-rooms-checkin'],
    queryFn: () => api.get('/rooms?status=AVAILABLE').then((res) => res.data),
  });

  const rooms: Room[] = roomsRes?.data || [];
  const bookingRoomInRooms = bookingRes?.data && rooms.some((r) => r.id === bookingRes.data.roomId);
  const freeRoomsCount = rooms.length + (bookingId && !bookingRoomInRooms ? 1 : 0);

  // Pre-fill form from booking when fetched
  useEffect(() => {
    if (bookingRes?.data) {
      const b = bookingRes.data;
      setCustomerName(b.customer.fullName);
      setMobileNumber(b.customer.mobileNumber);
      setRoomId(b.roomId);
      setNumberOfGuests(b.numberOfGuests);
      setPriceCost(b.price);
      setAdvancePaid(0); // Additional paid on arrival
    }
  }, [bookingRes]);

  const [priceCost, setPriceCost] = useState(1000);

  // Submit Mutation
  const checkinMutation = useMutation({
    mutationFn: (payload: any) => {
      const endpoint = bookingId ? '/stay/checkin/booking' : '/stay/checkin/walkin';
      return api.post(endpoint, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rooms'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      navigate('/');
    },
    onError: (err: any) => {
      setError(err.response?.data?.error || 'Check-in failed.');
      setLoading(false);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Secondary validation block
    if (numberOfRooms > freeRoomsCount) {
      setError(`Requested ${numberOfRooms} rooms but only ${freeRoomsCount} rooms are currently free.`);
      return;
    }

    setLoading(true);
    setError(null);

    // Default stay calculations to 1 base night since check-out isn't scheduled
    const nights = 1;
    const totalEstimate = priceCost * nights * numberOfRooms;
    const remainingAmount = Math.max(0, totalEstimate - advancePaid);

    const payload: any = {
      numberOfGuests: Number(numberOfGuests),
      numberOfRooms: Number(numberOfRooms),
      arrivalDate,
      arrivalTime,
      advancePaid: Number(advancePaid),
      remainingAmount,
      paymentMethod,
      registrationNumber: registrationNumber || undefined,
      pricePerNight: Number(priceCost),
    };

    if (roomId) {
      payload.roomId = roomId;
    }

    if (bookingId) {
      payload.bookingId = bookingId;
    } else {
      payload.customerName = customerName;
      payload.mobileNumber = mobileNumber;
      payload.address = address;
      payload.city = city;
      payload.state = state;
      payload.country = country;
      payload.pincode = pincode;
      payload.document = {
        idType,
        idNumber,
        frontImageUrl: frontImageUrl || undefined,
        backImageUrl: backImageUrl || undefined,
        customerPhotoUrl: photoUrl || undefined,
      };
    }

    checkinMutation.mutate(payload);
  };

  const isOvercapacity = numberOfRooms > freeRoomsCount;

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      {/* Back button */}
      <button
        onClick={() => navigate('/')}
        className="flex items-center text-xs text-slate-400 hover:text-white transition-colors cursor-pointer"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to Dashboard
      </button>

      {error && (
        <div className="p-4 bg-rose-500/15 border border-rose-500/30 rounded-xl text-sm text-rose-200">
          {error}
        </div>
      )}

      {/* Main card */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
        <h3 className="text-lg font-bold text-white mb-5 flex items-center">
          <CheckSquare className="w-5 h-5 text-blue-500 mr-2.5" />
          {bookingId ? 'Booking Arrival Check-In' : 'Walk-In Customer Check-In'}
        </h3>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Guest Identity */}
          {!bookingId ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-450 mb-1.5">Guest Name</label>
                  <input
                    type="text"
                    required
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="e.g. Samuel L. Jackson"
                    className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-xl py-2.5 px-3.5 text-sm text-white outline-none"
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
                    className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-xl py-2.5 px-3.5 text-sm text-white outline-none"
                  />
                </div>
              </div>

              {/* Customer Address Details */}
              <div className="border-t border-slate-800/60 pt-4 space-y-4">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Address Details</h4>
                <div>
                  <label className="block text-xs font-semibold text-slate-450 mb-1.5">Street Address</label>
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="e.g. 123 Main St, Apartment 4B"
                    className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-xl py-2.5 px-3.5 text-sm text-white outline-none"
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-450 mb-1.5">City</label>
                    <input
                      type="text"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      placeholder="e.g. New York"
                      className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-xl py-2.5 px-3.5 text-sm text-white outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-450 mb-1.5">State</label>
                    <input
                      type="text"
                      value={state}
                      onChange={(e) => setState(e.target.value)}
                      placeholder="e.g. NY"
                      className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-xl py-2.5 px-3.5 text-sm text-white outline-none"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-450 mb-1.5">Pincode / Zip Code</label>
                    <input
                      type="text"
                      value={pincode}
                      onChange={(e) => setPincode(e.target.value)}
                      placeholder="e.g. 10001"
                      className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-xl py-2.5 px-3.5 text-sm text-white outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-450 mb-1.5">Nationality</label>
                    <input
                      type="text"
                      value={country}
                      onChange={(e) => setCountry(e.target.value)}
                      placeholder="e.g. Indian"
                      className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-xl py-2.5 px-3.5 text-sm text-white outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* ID upload inputs */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-slate-800/60 pt-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-450 mb-1.5">Government ID Type</label>
                  <select
                    value={idType}
                    onChange={(e) => setIdType(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-xl py-2.5 px-3.5 text-sm text-white outline-none"
                  >
                    <option value="Aadhaar Card">Aadhaar Card</option>
                    <option value="Passport">Passport</option>
                    <option value="Driving License">Driving License</option>
                    <option value="Voter ID">Voter ID</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-450 mb-1.5">ID Number</label>
                  <input
                    type="text"
                    required
                    value={idNumber}
                    onChange={(e) => setIdNumber(e.target.value)}
                    placeholder="Document reference number"
                    className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-xl py-2.5 px-3.5 text-sm text-white outline-none"
                  />
                </div>
              </div>

              {/* Government ID Image Uploads */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-450 mb-1.5">ID Front Image</label>
                  <div className="relative flex flex-col items-center justify-center border border-dashed border-slate-800 bg-slate-950/40 rounded-xl p-4 hover:border-slate-700 transition-colors">
                    {frontImageUrl ? (
                      <div className="w-full space-y-2 text-center">
                        <img
                          src={frontImageUrl.startsWith('/') ? `${import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000'}${frontImageUrl}` : frontImageUrl}
                          alt="ID Front"
                          className="h-28 mx-auto rounded-lg object-cover border border-slate-800"
                        />
                        <button
                          type="button"
                          onClick={() => setFrontImageUrl('')}
                          className="text-xs text-rose-400 hover:text-rose-350 transition-colors font-medium"
                        >
                          Remove Image
                        </button>
                      </div>
                    ) : (
                      <label className="w-full cursor-pointer text-center py-4">
                        <span className="text-xs text-slate-400 block font-medium">
                          {frontImageLoading ? 'Uploading Front Image...' : 'Click to Upload Front'}
                        </span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            if (e.target.files && e.target.files[0]) {
                              handleFileUpload(e.target.files[0], 'documents', setFrontImageUrl, setFrontImageLoading);
                            }
                          }}
                        />
                      </label>
                    )}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-450 mb-1.5">ID Back Image</label>
                  <div className="relative flex flex-col items-center justify-center border border-dashed border-slate-800 bg-slate-950/40 rounded-xl p-4 hover:border-slate-700 transition-colors">
                    {backImageUrl ? (
                      <div className="w-full space-y-2 text-center">
                        <img
                          src={backImageUrl.startsWith('/') ? `${import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000'}${backImageUrl}` : backImageUrl}
                          alt="ID Back"
                          className="h-28 mx-auto rounded-lg object-cover border border-slate-800"
                        />
                        <button
                          type="button"
                          onClick={() => setBackImageUrl('')}
                          className="text-xs text-rose-400 hover:text-rose-350 transition-colors font-medium"
                        >
                          Remove Image
                        </button>
                      </div>
                    ) : (
                      <label className="w-full cursor-pointer text-center py-4">
                        <span className="text-xs text-slate-400 block font-medium">
                          {backImageLoading ? 'Uploading Back Image...' : 'Click to Upload Back'}
                        </span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            if (e.target.files && e.target.files[0]) {
                              handleFileUpload(e.target.files[0], 'documents', setBackImageUrl, setBackImageLoading);
                            }
                          }}
                        />
                      </label>
                    )}
                  </div>
                </div>
              </div>

              {/* Passport Photo Upload */}
              <div className="grid grid-cols-1 gap-4 pt-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-450 mb-1.5">Customer Photo (Passport Size)</label>
                  <div className="relative flex flex-col items-center justify-center border border-dashed border-slate-800 bg-slate-950/40 rounded-xl p-4 hover:border-slate-700 transition-colors">
                    {photoUrl ? (
                      <div className="w-full space-y-2 text-center">
                        <img
                          src={photoUrl.startsWith('/') ? `${import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000'}${photoUrl}` : photoUrl}
                          alt="Customer Photo"
                          className="h-28 w-28 mx-auto rounded-full object-cover border border-slate-800"
                        />
                        <button
                          type="button"
                          onClick={() => setPhotoUrl('')}
                          className="text-xs text-rose-400 hover:text-rose-350 transition-colors font-medium block mx-auto"
                        >
                          Remove Photo
                        </button>
                      </div>
                    ) : (
                      <label className="w-full cursor-pointer text-center py-4">
                        <span className="text-xs text-slate-400 block font-medium">
                          {photoLoading ? 'Uploading Photo...' : 'Click to Upload Passport Photo'}
                        </span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            if (e.target.files && e.target.files[0]) {
                              handleFileUpload(e.target.files[0], 'customers', setPhotoUrl, setPhotoLoading);
                            }
                          }}
                        />
                      </label>
                    )}
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="bg-slate-950/40 p-4 border border-slate-800 rounded-xl text-sm space-y-1">
              <span className="text-xs text-slate-500">Reserved Guest Profile</span>
              <p className="font-semibold text-white">{customerName}</p>
              <p className="text-xs text-slate-400">{mobileNumber}</p>
            </div>
          )}

          {/* Allocation details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-slate-800/60 pt-4">
            <div>
              <label className="block text-xs font-semibold text-slate-450 mb-1.5">Room Allocation</label>
              {roomId ? (
                <div className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-3.5 text-sm text-slate-350">
                  {bookingId 
                    ? `Prefilled from Booking` 
                    : `Selected Room: ${rooms.find(r => r.id === roomId)?.roomNumber || 'Room ' + roomId}`}
                </div>
              ) : (
                <div className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-3.5 text-sm text-emerald-400 font-semibold font-mono">
                  Auto-Allocate Free Room
                </div>
              )}
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-450 mb-1.5">Number of Guests</label>
              <input
                type="number"
                min={1}
                value={numberOfGuests}
                onChange={(e) => setNumberOfGuests(Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-xl py-2.5 px-3.5 text-sm text-white outline-none"
              />
            </div>
          </div>

          {/* Rooms requested count */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-slate-800/60 pt-4">
            <div>
              <label className="block text-xs font-semibold text-slate-450 mb-1.5">Number of Rooms Requested</label>
              <input
                type="number"
                min={1}
                required
                value={numberOfRooms}
                onChange={(e) => setNumberOfRooms(Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-xl py-2.5 px-3.5 text-sm text-white outline-none"
              />
            </div>
            <div className="flex flex-col justify-end">
              <span className="text-xs text-slate-500 mb-1">Status of Free Rooms</span>
              <span className="text-sm font-semibold text-slate-350 px-1 py-2 font-mono">
                {freeRoomsCount} rooms are currently free
              </span>
            </div>
          </div>

          {/* Overcapacity Warnings */}
          {isOvercapacity && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs rounded-xl flex items-start">
              <ShieldAlert className="w-4.5 h-4.5 mr-2.5 mt-0.5 shrink-0" />
              <p>
                Cannot proceed: You requested {numberOfRooms} rooms, but only {freeRoomsCount} rooms are currently free (available).
              </p>
            </div>
          )}

          {/* Custom Stay Registration Number */}
          <div className="grid grid-cols-1 gap-4 border-t border-slate-800/60 pt-4">
            <div>
              <label className="block text-xs font-semibold text-slate-450 mb-1.5">Custom Registration Number (Optional)</label>
              <input
                type="text"
                value={registrationNumber}
                onChange={(e) => setRegistrationNumber(e.target.value)}
                placeholder="e.g. REG-999 (Leave blank to auto-generate)"
                className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-xl py-2.5 px-3.5 text-sm text-white placeholder-slate-650 outline-none transition-colors"
              />
            </div>
          </div>

          {/* Arrival Date & Arrival Time */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-slate-800/60 pt-4">
            <div>
              <label className="block text-xs font-semibold text-slate-450 mb-1.5 flex items-center">
                <Calendar className="w-3.5 h-3.5 text-slate-500 mr-1.5" />
                Arrival Date
              </label>
              <input
                type="date"
                required
                value={arrivalDate}
                onChange={(e) => setArrivalDate(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-xl py-2.5 px-3.5 text-sm text-white outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-450 mb-1.5 flex items-center">
                <Clock className="w-3.5 h-3.5 text-slate-500 mr-1.5" />
                Arrival Time
              </label>
              <input
                type="time"
                required
                value={arrivalTime}
                onChange={(e) => setArrivalTime(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-xl py-2.5 px-3.5 text-sm text-white outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-t border-slate-800/60 pt-4">
            <div>
              <label className="block text-xs font-semibold text-slate-450 mb-1.5">Stay Cost/Night (₹)</label>
              <input
                type="number"
                required
                value={priceCost}
                onChange={(e) => setPriceCost(Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-xl py-2.5 px-3.5 text-sm text-white outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-450 mb-1.5">Deposit Advance Paid (₹)</label>
              <input
                type="number"
                value={advancePaid}
                onChange={(e) => setAdvancePaid(Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-xl py-2.5 px-3.5 text-sm text-white outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-450 mb-1.5">Payment Method</label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-xl py-2.5 px-3.5 text-sm text-white outline-none"
              >
                <option value="Cash">Cash</option>
                <option value="UPI">UPI / QR Scan</option>
                <option value="Debit Card">Debit Card</option>
                <option value="Credit Card">Credit Card</option>
                <option value="Bank Transfer">Bank Transfer</option>
              </select>
            </div>
          </div>

          {/* Form Submit */}
          <div className="flex justify-end pt-4 border-t border-slate-800 mt-6">
            <button
              type="submit"
              disabled={loading || isOvercapacity}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 disabled:text-slate-500 text-white font-bold rounded-xl shadow-lg shadow-blue-500/10 text-xs transition-colors cursor-pointer flex items-center disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Allocating Stays...
                </>
              ) : (
                'Confirm Arrival & Check-In'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CheckIn;
