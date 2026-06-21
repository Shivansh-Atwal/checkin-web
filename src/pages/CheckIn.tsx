import React, { useState, useEffect, useRef } from 'react';
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

  const [customerName, setCustomerName] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestionField, setSuggestionField] = useState<'name' | 'mobile' | null>(null);

  const fetchSuggestions = async (val: string, field: 'name' | 'mobile') => {
    if (!val || val.length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    try {
      const res = await api.get(`/customers/search?q=${encodeURIComponent(val)}`);
      if (res.data && res.data.success) {
        setSuggestions(res.data.data);
        setSuggestionField(field);
        setShowSuggestions(true);
      }
    } catch (err) {
      console.error('Error fetching customer suggestions:', err);
    }
  };

  const handleSelectCustomer = (customer: any) => {
    setCustomerId(customer.id);
    setCustomerName(customer.fullName || '');
    setMobileNumber(customer.mobileNumber || '');
    setAddress(customer.address || '');
    setCity(customer.city || '');
    setState(customer.state || '');
    setCountry(customer.country || '');
    setPincode(customer.pincode || '');
    
    if (customer.documents && customer.documents.length > 0) {
      const doc = customer.documents[0];
      setIdType(doc.idType || 'Aadhaar Card');
      setIdNumber(doc.idNumber || '');
      setFrontImageUrl(doc.frontImageUrl || '');
      setBackImageUrl(doc.backImageUrl || '');
      setPhotoUrl(doc.customerPhotoUrl || '');
    } else {
      setIdType('Aadhaar Card');
      setIdNumber('');
      setFrontImageUrl('');
      setBackImageUrl('');
      setPhotoUrl('');
    }
    
    setShowSuggestions(false);
    setSuggestions([]);
  };

  const [selectedRoomIds, setSelectedRoomIds] = useState<string[]>([]);
  const [roomDropdownOpen, setRoomDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setRoomDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const [numberOfGuests, setNumberOfGuests] = useState(1);
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
        setSelectedRoomIds([location.state.roomId]);
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
      setSelectedRoomIds([b.roomId]);
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
    if (selectedRoomIds.length > freeRoomsCount) {
      setError(`Requested ${selectedRoomIds.length} rooms but only ${freeRoomsCount} rooms are currently free.`);
      return;
    }

    setLoading(true);
    setError(null);

    // Default stay calculations to 1 base night since check-out isn't scheduled
    const nights = 1;
    const totalEstimate = priceCost * nights * selectedRoomIds.length;
    const remainingAmount = Math.max(0, totalEstimate - advancePaid);

    const payload: any = {
      numberOfGuests: Number(numberOfGuests),
      arrivalDate,
      arrivalTime,
      advancePaid: Number(advancePaid),
      remainingAmount,
      paymentMethod,
      registrationNumber: registrationNumber || undefined,
      pricePerNight: Number(priceCost),
    };

    if (selectedRoomIds.length > 0) {
      payload.roomIds = selectedRoomIds;
    }

    if (bookingId) {
      payload.bookingId = bookingId;
    } else {
      if (customerId) {
        payload.customerId = customerId;
      }
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

  const isOvercapacity = selectedRoomIds.length > freeRoomsCount;

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
                <div className="relative">
                  <label className="block text-xs font-semibold text-slate-450 mb-1.5">Guest Name</label>
                  <input
                    type="text"
                    required
                    value={customerName}
                    onChange={(e) => {
                      const val = e.target.value;
                      setCustomerName(val);
                      setCustomerId(null);
                      fetchSuggestions(val, 'name');
                    }}
                    onBlur={() => setShowSuggestions(false)}
                    placeholder="e.g. Samuel L. Jackson"
                    className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-xl py-2.5 px-3.5 text-sm text-white outline-none"
                  />
                  {showSuggestions && suggestionField === 'name' && suggestions.length > 0 && (
                    <div className="absolute left-0 right-0 top-full mt-1.5 z-[99] bg-slate-950 border border-slate-850 rounded-xl shadow-2xl max-h-60 overflow-y-auto divide-y divide-slate-900">
                      {suggestions.map((cust) => (
                        <div
                          key={cust.id}
                          onMouseDown={(e) => {
                            e.preventDefault();
                            handleSelectCustomer(cust);
                          }}
                          className="p-3 hover:bg-slate-900 cursor-pointer transition-colors text-left"
                        >
                          <div className="flex justify-between items-start">
                            <p className="font-semibold text-white text-xs">{cust.fullName}</p>
                            <span className="text-[11px] text-slate-400 font-mono">{cust.mobileNumber}</span>
                          </div>
                          <div className="flex justify-between items-center mt-1 text-[10px] text-slate-500">
                            <span>{cust.city ? `${cust.city}, ${cust.state || ''}` : 'No address info'}</span>
                            {cust.documents && cust.documents.length > 0 && (
                              <span className="bg-slate-900 px-1.5 py-0.5 rounded text-[9px] text-blue-400 border border-slate-800 font-mono">
                                {cust.documents[0].idType}: {cust.documents[0].idNumber}
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="relative">
                  <label className="block text-xs font-semibold text-slate-450 mb-1.5">Mobile Number</label>
                  <input
                    type="tel"
                    required
                    value={mobileNumber}
                    onChange={(e) => {
                      const val = e.target.value;
                      setMobileNumber(val);
                      setCustomerId(null);
                      fetchSuggestions(val, 'mobile');
                    }}
                    onBlur={() => setShowSuggestions(false)}
                    placeholder="e.g. 9876543210"
                    className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-xl py-2.5 px-3.5 text-sm text-white outline-none"
                  />
                  {showSuggestions && suggestionField === 'mobile' && suggestions.length > 0 && (
                    <div className="absolute left-0 right-0 top-full mt-1.5 z-[99] bg-slate-950 border border-slate-850 rounded-xl shadow-2xl max-h-60 overflow-y-auto divide-y divide-slate-900">
                      {suggestions.map((cust) => (
                        <div
                          key={cust.id}
                          onMouseDown={(e) => {
                            e.preventDefault();
                            handleSelectCustomer(cust);
                          }}
                          className="p-3 hover:bg-slate-900 cursor-pointer transition-colors text-left"
                        >
                          <div className="flex justify-between items-start">
                            <p className="font-semibold text-white text-xs">{cust.fullName}</p>
                            <span className="text-[11px] text-slate-400 font-mono">{cust.mobileNumber}</span>
                          </div>
                          <div className="flex justify-between items-center mt-1 text-[10px] text-slate-500">
                            <span>{cust.city ? `${cust.city}, ${cust.state || ''}` : 'No address info'}</span>
                            {cust.documents && cust.documents.length > 0 && (
                              <span className="bg-slate-900 px-1.5 py-0.5 rounded text-[9px] text-blue-400 border border-slate-800 font-mono">
                                {cust.documents[0].idType}: {cust.documents[0].idNumber}
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
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
              {bookingId ? (
                <div>
                  <label className="block text-xs font-semibold text-slate-450 mb-1.5">Room Allocation</label>
                  <div className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-3.5 text-sm text-slate-350 flex flex-wrap gap-1.5">
                    {selectedRoomIds.map((id) => {
                      const room = rooms.find((r) => r.id === id);
                      return (
                        <span key={id} className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-xs font-semibold text-white">
                          Room {room?.roomNumber || 'Prefilled'}
                        </span>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="relative" ref={dropdownRef}>
                  <label className="block text-xs font-semibold text-slate-450 mb-1.5">Room Allocation</label>
                  <div
                    onClick={() => setRoomDropdownOpen(!roomDropdownOpen)}
                    className="w-full min-h-[44px] bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-xl py-2.5 px-3.5 text-sm text-white outline-none cursor-pointer flex items-center justify-between flex-wrap gap-1.5"
                  >
                    <div className="flex flex-wrap gap-1.5">
                      {selectedRoomIds.length > 0 ? (
                        selectedRoomIds.map((id) => {
                          const room = rooms.find((r) => r.id === id);
                          return (
                            <span
                              key={id}
                              className="inline-flex items-center px-2 py-0.5 rounded bg-blue-600/20 border border-blue-500/30 text-xs font-semibold text-blue-300"
                            >
                              Room {room?.roomNumber || id}
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedRoomIds(selectedRoomIds.filter((x) => x !== id));
                                }}
                                className="ml-1 text-blue-400 hover:text-blue-200 focus:outline-none"
                              >
                                &times;
                              </button>
                            </span>
                          );
                        })
                      ) : (
                        <span className="text-slate-500 text-sm">Select Rooms...</span>
                      )}
                    </div>
                    <span className="text-slate-400 text-xs">&#9662;</span>
                  </div>
                  {roomDropdownOpen && (
                    <div className="absolute left-0 right-0 top-full mt-1.5 z-[99] bg-slate-950 border border-slate-850 rounded-xl shadow-2xl max-h-60 overflow-y-auto p-2 space-y-1">
                      {rooms.length > 0 ? (
                        rooms.map((room) => {
                          const isSelected = selectedRoomIds.includes(room.id);
                          return (
                            <label
                              key={room.id}
                              className="flex items-center space-x-2.5 p-2 rounded-lg hover:bg-slate-900 cursor-pointer text-slate-350 hover:text-white transition-colors"
                            >
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => {
                                  if (isSelected) {
                                    setSelectedRoomIds(selectedRoomIds.filter((x) => x !== room.id));
                                  } else {
                                    setSelectedRoomIds([...selectedRoomIds, room.id]);
                                  }
                                }}
                                className="w-4 h-4 rounded border-slate-800 bg-slate-950 text-blue-600 focus:ring-blue-500"
                              />
                              <span className="text-xs font-medium">
                                Room {room.roomNumber} ({room.roomType})
                              </span>
                            </label>
                          );
                        })
                      ) : (
                        <div className="p-2 text-xs text-slate-500 text-center">No available rooms</div>
                      )}
                    </div>
                  )}
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

          {/* Rooms requested info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-slate-800/60 pt-4">
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
                Cannot proceed: You requested {selectedRoomIds.length} rooms, but only {freeRoomsCount} rooms are currently free (available).
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
