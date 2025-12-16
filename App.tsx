import React, { useState, useEffect, useRef } from 'react';
import { 
  User, Mission, WeatherData, Tab, MissionLog, LocationInfo, SavedPlace 
} from './types';
import { getCurrentWeather } from './services/weatherService';
import { generateEcoMissions } from './services/geminiService';
import { 
  getUser, updateUserPoints, addLog, getLogs, getSavedPlaces, saveSavedPlaces, saveToGoogleSheet, FIXED_GOOGLE_SHEET_URL, deductUserPoints, purchaseItem, syncFromGoogleSheet, calculateStreak
} from './services/storageService';

import { 
  Leaf, CloudRain, Sun, Wind, MapPin, Trophy, Info, CheckCircle, 
  Trash2, Footprints, Coffee, Droplets, Home, Settings, X, Search, 
  Crosshair, Plus, Edit3, Trash, Armchair, Tent, RefreshCw, Loader, Sparkles, Send, Snowflake, CloudFog, Sprout, Download, Flame, Star, Frown, Navigation
} from 'lucide-react';

import CharacterDisplay from './components/CharacterDisplay';
import MissionFlow from './components/MissionFlow';
import Diary from './components/Diary';
import Leaderboard from './components/Leaderboard';
import Profile from './components/Profile';

declare const L: any;

const App: React.FC = () => {
  // Global State
  const [activeTab, setActiveTab] = useState<Tab>(Tab.HOME);
  const [user, setUser] = useState<User>(getUser());
  const [weather, setWeather] = useState<WeatherData>({ temp: 20, condition: '맑음', main: 'Sunny' });
  // Updated default location to Yongsan-gu (removed City)
  const [location, setLocation] = useState<LocationInfo>({ latitude: 37.5326, longitude: 126.9900, address: '위치 확인 중...' });
  const [missions, setMissions] = useState<Mission[]>([]);
  const [logs, setLogs] = useState<MissionLog[]>(getLogs());
  const [savedPlaces, setSavedPlaces] = useState<SavedPlace[]>(getSavedPlaces());
  const [streak, setStreak] = useState(0);

  // UI State
  const [activeMission, setActiveMission] = useState<Mission | null>(null);
  const [showMapModal, setShowMapModal] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [locationContext, setLocationContext] = useState('');
  const [isLoadingMissions, setIsLoadingMissions] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [isSearching, setIsSearching] = useState(false); // Map search loading state
  const [hasSynced, setHasSynced] = useState(false); // Track if user has synced location/missions
  const [policyModal, setPolicyModal] = useState({ visible: false, title: '', content: '' });
  const [testStatus, setTestStatus] = useState<string | null>(null);
  const [restoreStatus, setRestoreStatus] = useState<string | null>(null);

  // Map State
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const debounceTimerRef = useRef<any>(null); // For optimizing address fetch
  
  const [searchQuery, setSearchQuery] = useState('');
  const [tempAddress, setTempAddress] = useState('');
  const [newPlaceType, setNewPlaceType] = useState<'indoor'|'outdoor'>('outdoor');
  const [newPlaceName, setNewPlaceName] = useState('');
  
  // Track current active location type preference (Indoor/Outdoor)
  const [currentLocationType, setCurrentLocationType] = useState<'indoor'|'outdoor'>('outdoor');

  // --- Helpers ---
  const getAddressFromCoords = async (lat: number, lon: number): Promise<string> => {
    try {
      // 1. BigDataCloud (Fast, Free, Client-side friendly)
      const response = await fetch(
        `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=ko`
      );
      const data = await response.json();
      const city = data.principalSubdivision || '';
      const district = data.locality || data.city || '';
      
      if (city || district) {
         return `${city} ${district}`.trim();
      }
      throw new Error("BDC Failed");
    } catch {
      // 2. Nominatim Fallback
      try {
        const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=14&addressdetails=1&accept-language=ko`);
        const data = await response.json();
        // Try to construct a cleaner address
        const addr = data.address || {};
        const district = addr.borough || addr.district || addr.city || '';
        const neighborhood = addr.quarter || addr.neighbourhood || addr.suburb || '';
        
        if (district || neighborhood) {
            return `${district} ${neighborhood}`.trim();
        }
        
        return data.display_name.split(',').slice(0, 2).join(' ');
      } catch {
        return `${lat.toFixed(4)}, ${lon.toFixed(4)}`;
      }
    }
  };

  const refreshData = async (lat: number, lon: number, forceType?: 'indoor'|'outdoor') => {
    setIsLoadingMissions(true);
    try {
      // Determine type: explicitly forced > currently active state > default fallback
      let type: 'indoor'|'outdoor' = forceType || currentLocationType;
      
      // Update the active state so subsequent refreshes (e.g. weather button) use this type
      setCurrentLocationType(type);

      const address = await getAddressFromCoords(lat, lon);
      const weatherData = await getCurrentWeather(lat, lon);
      setWeather(weatherData);
      setLocation({ latitude: lat, longitude: lon, address });
      setTempAddress(address); 

      const todayStr = new Date().toISOString().split('T')[0];
      const todayLogs = getLogs().filter(l => l.completedAt.startsWith(todayStr));
      const completedTitles = todayLogs.map(l => l.title);

      const { missions: aiMissions, locationContext: ctx } = await generateEcoMissions(
          weatherData, 
          { latitude: lat, longitude: lon, address }, 
          type,
          completedTitles
      );
      setMissions(aiMissions);
      setLocationContext(ctx);
      setHasSynced(true);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoadingMissions(false);
    }
  };

  // --- Location Logic (Robust) ---
  const handleCurrentLocation = () => {
    setIsLocating(true);

    const onSuccess = (lat: number, lon: number) => {
        setIsLocating(false);
        refreshData(lat, lon);
    };

    const onFail = async () => {
        console.warn("GPS failed, attempting IP fallback...");
        try {
            // Fallback: IP Location
            const res = await fetch('https://ipapi.co/json/');
            const data = await res.json();
            if (data.latitude && data.longitude) {
                onSuccess(data.latitude, data.longitude);
            } else {
                throw new Error("IP location failed");
            }
        } catch (e) {
            setIsLocating(false);
            console.warn("All location methods failed", e);
            // If it's the first load, we might silently fail, but if user clicked, we should alert?
            // For now, let's reset to default if we really can't find anything, or just keep previous state.
        }
    };

    if (!navigator.geolocation) {
        onFail();
        return;
    }

    navigator.geolocation.getCurrentPosition(
        (pos) => onSuccess(pos.coords.latitude, pos.coords.longitude),
        (err) => onFail(),
        { enableHighAccuracy: true, timeout: 5000 }
    );
  };

  // Initial Load Location Check
  useEffect(() => {
    handleCurrentLocation();
  }, []);

  // --- Map Logic (Fixed Center Pin) ---
  const initMap = () => {
    if (!mapContainerRef.current) return;
    if (mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
        zoomControl: false, // Cleaner UI for mobile
        attributionControl: false
    }).setView([location.latitude, location.longitude], 16);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19
    }).addTo(map);

    // Initial state
    (window as any).tempLat = location.latitude;
    (window as any).tempLng = location.longitude;
    setTempAddress(location.address);

    mapInstanceRef.current = map;

    // --- Optimization: Debounce Address Fetching ---
    // Instead of fetching on every pixel move, wait until user stops moving
    map.on('move', () => {
        setTempAddress("위치 이동 중...");
        if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    });

    map.on('moveend', () => {
        const center = map.getCenter();
        (window as any).tempLat = center.lat;
        (window as any).tempLng = center.lng;

        // Debounce: Wait 500ms after move ends before fetching API
        debounceTimerRef.current = setTimeout(async () => {
            const addr = await getAddressFromCoords(center.lat, center.lng);
            setTempAddress(addr);
        }, 500); 
    });
  };

  const handleMapSearch = async () => {
    if (!searchQuery) return;
    setIsSearching(true);
    
    try {
        let found = false;

        // Get current map center to prioritize nearby search
        let centerLat = location.latitude;
        let centerLon = location.longitude;
        if (mapInstanceRef.current) {
            const center = mapInstanceRef.current.getCenter();
            centerLat = center.lat;
            centerLon = center.lng;
        }

        // 1. Try Photon (Komoot) with location bias
        try {
            const response = await fetch(`https://photon.komoot.io/api/?q=${encodeURIComponent(searchQuery)}&lang=ko&limit=1&lat=${centerLat}&lon=${centerLon}`);
            const data = await response.json();
            if (data.features && data.features.length > 0) {
                const [lon, lat] = data.features[0].geometry.coordinates;
                // Just move the map. 'moveend' will trigger address fetch.
                if (mapInstanceRef.current) {
                    mapInstanceRef.current.setView([lat, lon], 16);
                }
                found = true;
            }
        } catch (e) {
            console.warn("Photon search failed, falling back...");
        }

        // 2. Fallback to Nominatim
        if (!found) {
            const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&accept-language=ko&limit=1`);
            const data = await response.json();
            if (data && data.length > 0) {
                const lat = parseFloat(data[0].lat);
                const lon = parseFloat(data[0].lon);
                if (mapInstanceRef.current) {
                    mapInstanceRef.current.setView([lat, lon], 16);
                }
                found = true;
            }
        }

        if (!found) {
            alert("검색 결과가 없습니다. 다른 검색어로 시도해보세요.");
        }
    } catch (e) {
        alert("검색 중 오류가 발생했습니다.");
    } finally {
        setIsSearching(false);
    }
  };

  const confirmLocation = () => {
    // Get latest coordinates from the map center
    let lat = location.latitude;
    let lon = location.longitude;
    
    if (mapInstanceRef.current) {
        const center = mapInstanceRef.current.getCenter();
        lat = center.lat;
        lon = center.lng;
    }
    
    if (newPlaceName) {
        const newId = Date.now();
        const newPlace: SavedPlace = {
            id: newId,
            name: newPlaceName,
            type: newPlaceType,
            address: tempAddress,
            lat,
            lon
        };
        const updated = [...savedPlaces, newPlace];
        setSavedPlaces(updated);
        saveSavedPlaces(updated);
        setNewPlaceName('');
    }

    setShowMapModal(false);
    refreshData(lat, lon, newPlaceType);
  };

  const handleCompleteMission = async (mission: Mission) => {
    const updatedUser = updateUserPoints(mission.points);
    setUser(updatedUser);

    const log: MissionLog = {
      id: Date.now().toString(),
      missionId: mission.id,
      title: mission.title,
      points: mission.points,
      completedAt: new Date().toISOString(),
      type: mission.type
    };
    addLog(log);
    setLogs(getLogs());

    if (FIXED_GOOGLE_SHEET_URL) {
      setTestStatus("전송 중...");
      const res = await saveToGoogleSheet(mission, updatedUser);
      setTestStatus(res.message);
      setTimeout(() => setTestStatus(null), 3000);
    }

    setActiveMission(null);
    setMissions(prev => prev.filter(m => m.id !== mission.id));
  };

  const handlePurchase = (itemId: string, cost: number) => {
    const result = purchaseItem(itemId, cost);
    if (result) {
        setUser(result);
        return true;
    }
    return false;
  };

  const handleGoogleSheetRestore = async () => {
    setRestoreStatus("데이터 찾는 중...");
    const res = await syncFromGoogleSheet(user.name);
    setRestoreStatus(res.message);
    
    if (res.success && res.data) {
        setUser(res.data.user);
        setLogs(res.data.logs);
    }
    setTimeout(() => setRestoreStatus(null), 3000);
  };

  useEffect(() => {
    setStreak(calculateStreak(logs));
  }, [logs]);

  // Leaflet Cleanup Logic
  useEffect(() => {
    if (showMapModal) {
      setTimeout(initMap, 100);
    } else {
      // Destroy map instance when modal closes to prevent grey screen on reopen
      if (mapInstanceRef.current) {
        mapInstanceRef.current.off();
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    }
  }, [showMapModal]);

  const getWeatherIcon = (main: string) => {
    switch (main) {
      case 'Rain': return <CloudRain className="w-8 h-8 text-blue-500" />;
      case 'Clouds': return <CloudFog className="w-8 h-8 text-gray-500" />;
      case 'Snow': return <Snowflake className="w-8 h-8 text-cyan-300" />;
      default: return <Sun className="w-8 h-8 text-orange-400" />;
    }
  };

  // --- Render ---

  return (
    // Mobile View Container Wrapper
    <div className="w-full h-full sm:h-[90vh] sm:max-w-md sm:rounded-[3rem] sm:border-[8px] sm:border-slate-800 bg-[#f0fdf4] relative overflow-hidden flex flex-col font-sans select-none shadow-2xl">
      
      {/* GLOBAL HEADER - Now visible on all tabs */}
      <div className="bg-emerald-600 px-4 py-3 flex justify-between items-center shadow-md z-30 shrink-0">
        <div className="flex items-center gap-2 text-white font-bold text-lg">
            <Leaf className="w-5 h-5 fill-white" /> EcoPlayer
        </div>
        <div className="flex items-center gap-3">
            <div className="bg-emerald-800/40 px-3 py-1.5 rounded-full text-white text-xs font-bold flex items-center gap-1.5 backdrop-blur-sm border border-emerald-500/30">
            <Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />
            {user.points.toLocaleString()} P
            </div>
            <button onClick={() => setShowSettings(true)}>
                <Settings className="w-5 h-5 text-white/90 hover:text-white transition-colors" />
            </button>
        </div>
      </div>

      <div className="flex-1 overflow-hidden relative flex flex-col bg-[#f0fdf4]">
        {/* 1. HOME TAB */}
        {activeTab === Tab.HOME && (
          <div className="flex-1 flex flex-col overflow-hidden animate-in fade-in">
              {/* Scrollable Content */}
              <div className="flex-1 overflow-y-auto pb-24 p-4 space-y-5 hide-scrollbar">
                  {/* Streak Banner */}
                  {streak > 0 ? (
                      <div className="bg-gradient-to-r from-orange-50 to-white border border-orange-100 rounded-2xl p-4 flex items-center justify-between shadow-sm relative overflow-hidden">
                          <div className="absolute right-0 top-0 opacity-10 pointer-events-none">
                              <Flame className="w-24 h-24 text-orange-500" />
                          </div>
                          <div>
                              <span className="text-xs font-bold text-orange-500 block mb-1">현재 연속 달성</span>
                              <div className="flex items-center gap-2">
                                  <span className="text-xl font-bold text-slate-800">{streak}일 연속 실천 중!</span>
                                  <Flame className="w-5 h-5 text-orange-500 fill-orange-500 animate-pulse" />
                              </div>
                          </div>
                          <div className="text-[10px] text-slate-400 font-medium text-right z-10 leading-tight">
                              매일 미션을 완료하여<br/>지구를 지켜주세요!
                          </div>
                      </div>
                  ) : (
                      <div className="bg-white border border-slate-100 rounded-2xl p-4 flex items-center gap-3 shadow-sm">
                          <div className="bg-slate-100 p-2.5 rounded-full">
                              <Flame className="w-5 h-5 text-slate-400" />
                          </div>
                          <div>
                              <div className="text-sm font-bold text-slate-700">연속 달성에 도전하세요!</div>
                              <div className="text-xs text-slate-400">오늘 첫 미션을 완료하고 불꽃을 켜보세요.</div>
                          </div>
                      </div>
                  )}

                  {/* Diary Section */}
                  <Diary logs={logs} />

                  {/* Weather & Location Grid */}
                  <div className="grid grid-cols-2 gap-3">
                      {/* Weather Card */}
                      <div className="bg-blue-50/50 p-4 rounded-3xl border border-blue-100 flex flex-col items-center justify-between min-h-[140px] relative overflow-hidden group">
                          <div className="absolute top-0 right-0 p-6 opacity-0 group-hover:opacity-10 transition-opacity">
                              <CloudRain className="w-16 h-16 text-blue-500" />
                          </div>
                          <div className="text-xs font-bold text-blue-400 w-full text-center mb-1">현재 날씨</div>
                          <div className="flex flex-col items-center z-10">
                              {getWeatherIcon(weather.main)}
                              <span className="text-xl font-bold text-slate-800 mt-2">{Math.round(weather.temp)}°C</span>
                          </div>
                          <button 
                              onClick={handleCurrentLocation}
                              disabled={isLoadingMissions || isLocating}
                              className="w-full mt-3 bg-white border border-blue-100 text-blue-500 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1 hover:bg-blue-50 transition-colors z-10"
                          >
                              {isLoadingMissions || isLocating ? <Loader className="w-3 h-3 animate-spin"/> : <RefreshCw className="w-3 h-3"/>}
                              실시간 연동
                          </button>
                      </div>

                      {/* Location Card */}
                      <div className="bg-emerald-50/50 p-4 rounded-3xl border border-emerald-100 flex flex-col items-center justify-between min-h-[140px] relative overflow-hidden group">
                          <div className="absolute top-0 right-0 p-6 opacity-0 group-hover:opacity-10 transition-opacity">
                              <MapPin className="w-16 h-16 text-emerald-500" />
                          </div>
                          <div className="text-xs font-bold text-emerald-400 w-full text-center mb-1">현재 위치</div>
                          <div className="flex flex-col items-center z-10 text-center w-full">
                              <MapPin className="w-8 h-8 text-emerald-500 mb-2" />
                              <span className="text-sm font-bold text-slate-800 leading-tight line-clamp-2 px-1 w-full truncate">
                                  {location.address}
                              </span>
                          </div>
                          <button 
                              onClick={() => setShowMapModal(true)}
                              className="w-full mt-3 bg-white border border-emerald-100 text-emerald-600 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1 hover:bg-emerald-50 transition-colors z-10"
                          >
                              <Navigation className="w-3 h-3"/>
                              위치 변경
                          </button>
                      </div>
                  </div>

                  {/* Mission Section */}
                  <div className="pt-2">
                      <div className="flex justify-between items-center mb-3 px-1">
                          <h3 className="font-bold text-slate-800 flex items-center gap-2 text-lg">
                              <Sparkles className="w-5 h-5 text-emerald-600 fill-emerald-100" /> Gemini 추천 미션
                          </h3>
                          <button 
                              onClick={handleCurrentLocation} 
                              disabled={isLoadingMissions || isLocating}
                              className="p-2 hover:bg-slate-100 rounded-full text-slate-400 transition-colors"
                          >
                              <RefreshCw className={`w-4 h-4 ${(isLoadingMissions || isLocating) ? 'animate-spin' : ''}`} />
                          </button>
                      </div>
                      
                      {isLoadingMissions || isLocating ? (
                          <div className="bg-white rounded-3xl p-8 border border-slate-100 text-center">
                              <Loader className="w-8 h-8 text-emerald-500 animate-spin mx-auto mb-3" />
                              <p className="text-sm text-slate-500">{isLocating ? '위치를 찾고 있어요...' : 'AI가 주변 환경을 분석하고 있어요...'}</p>
                          </div>
                      ) : !hasSynced ? (
                          <div className="bg-white rounded-3xl p-8 border border-slate-100 text-center flex flex-col items-center">
                              <Frown className="w-12 h-12 text-slate-300 mb-3" />
                              <p className="text-slate-500 text-sm font-medium">아직 실시간 연동이 되지 않았어요</p>
                              <button onClick={handleCurrentLocation} className="mt-2 text-xs text-emerald-600 underline">연동 시작하기</button>
                          </div>
                      ) : missions.length === 0 ? (
                          <div className="bg-white rounded-3xl p-8 border border-slate-100 text-center flex flex-col items-center">
                              <CheckCircle className="w-12 h-12 text-slate-200 mb-3" />
                              <p className="text-slate-500 text-sm font-medium">모든 미션을 완료했어요!</p>
                              <button onClick={() => refreshData(location.latitude, location.longitude)} className="mt-2 text-xs text-emerald-600 underline">새 미션 받기</button>
                          </div>
                      ) : (
                          <div className="space-y-3">
                              {missions.map((mission) => (
                                  <div 
                                      key={mission.id}
                                      onClick={() => setActiveMission(mission)}
                                      className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100 active:scale-[0.98] transition-all relative overflow-hidden cursor-pointer group"
                                  >
                                      <div className="flex items-start gap-4">
                                          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shrink-0
                                              ${mission.type === 'outdoor' ? 'bg-orange-50 text-orange-500' : 'bg-emerald-50 text-emerald-500'}`}>
                                              {mission.iconName === 'trash' && <Trash2 className="w-6 h-6"/>}
                                              {mission.iconName === 'footprints' && <Footprints className="w-6 h-6"/>}
                                              {mission.iconName === 'coffee' && <Coffee className="w-6 h-6"/>}
                                              {(!mission.iconName || ['wind', 'droplets', 'check'].includes(mission.iconName)) && <Wind className="w-6 h-6"/>}
                                          </div>
                                          <div className="flex-1 min-w-0">
                                              <div className="flex justify-between items-start mb-1">
                                                  <h4 className="font-bold text-slate-800 text-base truncate pr-2">{mission.title}</h4>
                                              </div>
                                              <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed mb-2">{mission.description}</p>
                                              <div className="flex items-center gap-2">
                                                  <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-md font-medium">
                                                      {mission.estimatedTimeSeconds}초 소요
                                                  </span>
                                                  <span className="text-[10px] bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded-md font-bold">
                                                      +{mission.points} P
                                                  </span>
                                              </div>
                                          </div>
                                      </div>
                                  </div>
                              ))}
                          </div>
                      )}
                  </div>
              </div>
          </div>
        )}

        {/* 2. FOREST TAB */}
        {activeTab === Tab.FOREST && (
          <CharacterDisplay user={user} onPurchase={handlePurchase} />
        )}

        {/* 3. RANK TAB */}
        {activeTab === Tab.RANK && (
          <div className="flex-1 overflow-y-auto pb-20 animate-in fade-in hide-scrollbar">
             <Leaderboard currentUser={user} logs={logs} />
          </div>
        )}

        {/* 4. INFO/PROFILE TAB */}
        {activeTab === Tab.INFO && (
          <div className="flex-1 overflow-y-auto pb-20 animate-in fade-in hide-scrollbar">
              <Profile 
                  user={user} 
                  logs={logs} 
                  onOpenSettings={() => setShowSettings(true)} 
                  onOpenPolicy={(type) => setPolicyModal({
                      visible: true, 
                      title: type === 'privacy' ? '개인정보처리방침' : '이용약관',
                      content: type === 'privacy' 
                          ? '본 앱은 사용자의 위치 정보를 AI 미션 생성 목적으로만 사용하며, 별도 서버에 저장하지 않습니다. (데모용)'
                          : '본 앱은 환경 보호 실천을 돕기 위한 서비스입니다.'
                  })}
              />
          </div>
        )}
      </div>

      {/* --- Bottom Navigation --- */}
      <div className="absolute bottom-0 left-0 w-full bg-white border-t border-slate-200 py-2 px-2 grid grid-cols-4 z-30 pb-safe">
        <button 
          onClick={() => setActiveTab(Tab.HOME)} 
          className={`flex flex-col items-center justify-center gap-1.5 py-2 rounded-xl transition-all ${activeTab === Tab.HOME ? 'text-emerald-600' : 'text-slate-400 hover:bg-slate-50'}`}
        >
          <Home className={`w-6 h-6 ${activeTab === Tab.HOME ? 'fill-emerald-100' : ''}`} />
          <span className="text-[10px] font-medium">홈</span>
        </button>
        <button 
          onClick={() => setActiveTab(Tab.FOREST)} 
          className={`flex flex-col items-center justify-center gap-1.5 py-2 rounded-xl transition-all ${activeTab === Tab.FOREST ? 'text-emerald-600' : 'text-slate-400 hover:bg-slate-50'}`}
        >
          <Sprout className={`w-6 h-6 ${activeTab === Tab.FOREST ? 'fill-emerald-100' : ''}`} />
          <span className="text-[10px] font-medium">내 나무</span>
        </button>
        <button 
          onClick={() => setActiveTab(Tab.RANK)} 
          className={`flex flex-col items-center justify-center gap-1.5 py-2 rounded-xl transition-all ${activeTab === Tab.RANK ? 'text-emerald-600' : 'text-slate-400 hover:bg-slate-50'}`}
        >
          <Trophy className={`w-6 h-6 ${activeTab === Tab.RANK ? 'fill-emerald-100' : ''}`} />
          <span className="text-[10px] font-medium">명예의 전당</span>
        </button>
        <button 
          onClick={() => setActiveTab(Tab.INFO)} 
          className={`flex flex-col items-center justify-center gap-1.5 py-2 rounded-xl transition-all ${activeTab === Tab.INFO ? 'text-emerald-600' : 'text-slate-400 hover:bg-slate-50'}`}
        >
          <Info className={`w-6 h-6 ${activeTab === Tab.INFO ? 'fill-emerald-100' : ''}`} />
          <span className="text-[10px] font-medium">정보</span>
        </button>
      </div>

      {/* --- Mission Flow Modal --- */}
      {activeMission && (
        <MissionFlow 
          mission={activeMission} 
          onClose={() => setActiveMission(null)}
          onComplete={handleCompleteMission}
        />
      )}

      {/* --- Map Modal --- */}
      {showMapModal && (
        <div className="absolute inset-0 bg-white z-50 flex flex-col animate-in slide-in-from-bottom-full duration-300">
           <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-white z-10">
              <h3 className="font-bold text-lg">위치 설정</h3>
              <button onClick={() => setShowMapModal(false)} className="p-2 bg-slate-100 rounded-full"><X className="w-5 h-5"/></button>
           </div>
           
           {/* Search Bar */}
           <div className="p-4 bg-slate-50 border-b border-slate-100 flex gap-2">
              <div className="flex-1 bg-white border border-slate-200 rounded-xl flex items-center px-3 overflow-hidden">
                 <Search className="w-4 h-4 text-slate-400 mr-2 shrink-0" />
                 <input 
                    type="text" 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="장소 검색 (예: 강남역, 한강공원)"
                    className="w-full py-3 text-sm outline-none min-w-0"
                    onKeyDown={(e) => e.key === 'Enter' && handleMapSearch()}
                 />
              </div>
              <button onClick={handleMapSearch} disabled={isSearching} className="bg-emerald-600 text-white px-4 rounded-xl font-bold text-sm whitespace-nowrap disabled:bg-slate-300 min-w-[60px] flex items-center justify-center">
                  {isSearching ? <Loader className="w-4 h-4 animate-spin"/> : '검색'}
              </button>
           </div>

           <div className="relative flex-1 bg-slate-100">
               <div ref={mapContainerRef} className="absolute inset-0 z-0"></div>
               {/* Center Pin Indicator (Visual only, actual logic uses marker) */}
               <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10 pointer-events-none mb-8">
                  {/* Sprout visual indicator same as map marker */}
                  <div className="w-10 h-10 bg-emerald-500 rounded-full border-[3px] border-white flex items-center justify-center shadow-lg animate-bounce">
                     <Sprout className="w-5 h-5 text-white fill-white" />
                  </div>
                  <div className="w-2 h-2 bg-black/20 rounded-full absolute -bottom-2 left-1/2 -translate-x-1/2 blur-[2px]"></div>
               </div>
           </div>

           <div className="p-5 bg-white rounded-t-3xl shadow-[0_-5px_20px_rgba(0,0,0,0.1)] z-20">
               {/* Saved Places (Favorites) Section */}
               <div className="mb-5">
                   <div className="flex items-center gap-1 mb-2">
                       <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                       <span className="text-xs font-bold text-slate-500">즐겨찾기</span>
                   </div>
                   <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-1">
                       {/* Plus Button */}
                       <button 
                           onClick={() => {
                              document.getElementById('place-name-input')?.focus();
                           }}
                           className="w-16 h-16 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-center shrink-0 active:scale-95 transition-transform hover:bg-slate-100"
                       >
                           <Plus className="w-6 h-6 text-slate-400" />
                       </button>
                       
                       {/* Saved Places */}
                       {savedPlaces.map(place => (
                           <button 
                               key={place.id}
                               onClick={() => {
                                   if (mapInstanceRef.current) {
                                       mapInstanceRef.current.setView([place.lat, place.lon], 16);
                                       setTempAddress(place.address);
                                       (window as any).tempLat = place.lat;
                                       (window as any).tempLng = place.lon;
                                       setNewPlaceType(place.type);
                                   }
                               }}
                               className="w-16 h-16 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col items-center justify-center gap-1 shrink-0 active:scale-95 transition-transform hover:border-emerald-500 hover:bg-emerald-50"
                           >
                               <span className="text-xl">
                                   {place.type === 'indoor' ? '🏠' : '🌳'}
                               </span>
                               <span className="text-[10px] font-bold text-slate-600 truncate max-w-full px-1">
                                   {place.name}
                               </span>
                           </button>
                       ))}
                   </div>
               </div>

               <div className="flex items-center gap-2 mb-4">
                  <MapPin className="w-5 h-5 text-emerald-600" />
                  <span className="font-bold text-slate-800 text-lg truncate">{tempAddress || '위치를 선택해주세요'}</span>
               </div>
               
               {/* Save Place UI */}
               <div className="mb-4 p-4 bg-slate-50 rounded-xl border border-slate-100">
                  <div className="flex items-center gap-2 mb-2">
                     <input 
                        id="place-name-input"
                        type="text" 
                        placeholder="장소 별명 (예: 우리집, 회사)" 
                        className="flex-1 bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-emerald-500"
                        value={newPlaceName}
                        onChange={(e) => setNewPlaceName(e.target.value)}
                     />
                  </div>
                  <div className="flex gap-2">
                      <button 
                        onClick={() => setNewPlaceType('outdoor')}
                        className={`flex-1 py-2 rounded-lg text-xs font-bold border transition-colors ${newPlaceType === 'outdoor' ? 'bg-emerald-100 border-emerald-200 text-emerald-700' : 'bg-white border-slate-200 text-slate-500'}`}
                      >
                          야외 (공원 등)
                      </button>
                      <button 
                        onClick={() => setNewPlaceType('indoor')}
                        className={`flex-1 py-2 rounded-lg text-xs font-bold border transition-colors ${newPlaceType === 'indoor' ? 'bg-blue-100 border-blue-200 text-blue-700' : 'bg-white border-slate-200 text-slate-500'}`}
                      >
                          실내 (집/회사)
                      </button>
                  </div>
               </div>

               <button 
                 onClick={confirmLocation}
                 className="w-full bg-emerald-600 text-white py-4 rounded-xl font-bold shadow-lg hover:bg-emerald-700 transition-all active:scale-95"
               >
                 이 위치로 설정하기
               </button>
           </div>
        </div>
      )}

      {/* --- Settings Modal --- */}
      {showSettings && (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4 backdrop-blur-sm">
           <div className="bg-white w-full max-w-sm rounded-2xl p-6 shadow-2xl animate-in zoom-in duration-200">
               <div className="flex justify-between items-center mb-6">
                   <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                       <Settings className="w-5 h-5" /> 설정
                   </h3>
                   <button onClick={() => setShowSettings(false)} className="p-1 hover:bg-slate-100 rounded-full"><X className="w-5 h-5"/></button>
               </div>
               
               <div className="space-y-4">
                   <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                       <label className="text-xs font-bold text-slate-500 block mb-2">사용자 이름</label>
                       <div className="flex gap-2">
                           <input 
                               type="text" 
                               value={user.name} 
                               onChange={(e) => setUser({...user, name: e.target.value})}
                               className="flex-1 bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-emerald-500"
                           />
                           <button onClick={() => {/* Save trigger implicit in state */ alert("저장되었습니다.")}} className="bg-slate-800 text-white px-3 rounded-lg text-xs font-bold">저장</button>
                       </div>
                   </div>

                   <div className="p-4 bg-blue-50 rounded-xl border border-blue-100">
                       <h4 className="font-bold text-blue-800 text-sm mb-2 flex items-center gap-2">
                           <Download className="w-4 h-4" /> 데이터 복구
                       </h4>
                       <p className="text-xs text-blue-600 mb-3 leading-relaxed">
                           기기를 변경했거나 데이터가 사라졌나요?<br/>
                           구글 시트에 저장된 기록을 불러옵니다.
                       </p>
                       <button 
                           onClick={handleGoogleSheetRestore}
                           disabled={!!restoreStatus}
                           className="w-full bg-white border border-blue-200 text-blue-600 py-2 rounded-lg text-sm font-bold hover:bg-blue-50 flex items-center justify-center gap-2"
                       >
                           {restoreStatus ? <><Loader className="w-3 h-3 animate-spin"/> {restoreStatus}</> : '데이터 불러오기'}
                       </button>
                   </div>
                   
                   <div className="pt-2 text-center text-xs text-slate-400">
                       버전 1.0.0 (Demo)
                   </div>
               </div>
           </div>
        </div>
      )}
      
      {/* Toast Notification for Sheet Status */}
      {testStatus && (
          <div className="fixed top-4 left-1/2 -translate-x-1/2 bg-black/80 text-white px-4 py-2 rounded-full text-xs z-[100] flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
              {testStatus.includes('성공') ? <CheckCircle className="w-3 h-3 text-green-400"/> : <Loader className="w-3 h-3 animate-spin"/>}
              {testStatus}
          </div>
      )}

      {/* Policy Modal */}
      {policyModal.visible && (
        <div className="fixed inset-0 bg-black/50 z-[70] flex items-center justify-center p-6 backdrop-blur-sm" onClick={() => setPolicyModal({...policyModal, visible: false})}>
            <div className="bg-white w-full max-w-sm rounded-2xl p-6 shadow-xl" onClick={e => e.stopPropagation()}>
                <h3 className="font-bold text-lg mb-4">{policyModal.title}</h3>
                <p className="text-slate-600 text-sm leading-relaxed mb-6">{policyModal.content}</p>
                <button onClick={() => setPolicyModal({...policyModal, visible: false})} className="w-full bg-slate-800 text-white py-3 rounded-xl font-bold">확인</button>
            </div>
        </div>
      )}

      {/* Styles for Leaflet & Animations */}
      <style>{`
        .custom-pin {
          display: flex;
          align-items: center;
          justify-content: center;
        }
        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
        .hide-scrollbar::-webkit-scrollbar {
            display: none;
        }
        .hide-scrollbar {
            -ms-overflow-style: none;
            scrollbar-width: none;
        }
      `}</style>
    </div>
  );
};

export default App;