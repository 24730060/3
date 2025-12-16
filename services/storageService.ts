
import { User, MissionLog, SavedPlace, Mission } from '../types';

// Keys for storage
const USER_KEY = 'eco_user_v1';
const LOGS_KEY = 'eco_logs_v1';
const PLACES_KEY = 'eco_places_v1';
const WEEKLY_LOG_KEY = 'eco_weekly_log_v1';

// Google Sheet URL (from reference)
export const FIXED_GOOGLE_SHEET_URL = "https://script.google.com/macros/s/AKfycbymhKpGvkPIajl8yx8jD5uhVdj9Ob2Mvumo-sG9LUcX8Bm9TF4va3oY9SJBs20XtzxD/exec";

// Initial States
const INITIAL_USER: User = {
  name: '지구지킴이',
  points: 0,
  lifetimePoints: 0,
  totalMissionsCompleted: 0,
  stage: '새싹',
  inventory: []
};

const INITIAL_PLACES: SavedPlace[] = [
  { id: 1, name: '집', type: 'indoor', address: '서울시 강남구 (우리집)', lat: 37.5642, lon: 127.0016 },
  { id: 2, name: '회사', type: 'indoor', address: '서울시 중구 (사무실)', lat: 37.5635, lon: 126.9750 },
  { id: 3, name: '동네 공원', type: 'outdoor', address: '서울시 마포구 (공원)', lat: 37.5568, lon: 126.9237 },
];

export const getStageFromPoints = (points: number): string => {
  // Increased thresholds for harder leveling (based on lifetimePoints)
  if (points >= 3000) return '나무';
  if (points >= 1500) return '열매';
  if (points >= 500) return '꽃';
  return '새싹';
};

export const calculateStreak = (logs: MissionLog[]): number => {
  if (logs.length === 0) return 0;
  
  // Create a set of unique dates (YYYY-MM-DD)
  const distinctDates = new Set(logs.map(log => log.completedAt.split('T')[0]));
  
  let currentStreak = 0;
  const checkDate = new Date();
  const todayStr = checkDate.toISOString().split('T')[0];
  
  // If today has no record, check yesterday to continue streak
  if (!distinctDates.has(todayStr)) {
      checkDate.setDate(checkDate.getDate() - 1);
      const yesterdayStr = checkDate.toISOString().split('T')[0];
      if (!distinctDates.has(yesterdayStr)) {
          return 0; // No streak
      }
  }

  // Count backwards
  while (true) {
      const s = checkDate.toISOString().split('T')[0];
      if (distinctDates.has(s)) {
          currentStreak++;
          checkDate.setDate(checkDate.getDate() - 1);
      } else {
          break;
      }
  }
  
  return currentStreak;
};

export const getUser = (): User => {
  const stored = localStorage.getItem(USER_KEY);
  if (stored) {
    const parsed = JSON.parse(stored);
    // Migration for existing users without lifetimePoints or inventory
    if (parsed.lifetimePoints === undefined) {
      parsed.lifetimePoints = parsed.points;
    }
    if (parsed.inventory === undefined) {
      parsed.inventory = [];
    }
    return parsed;
  }
  return INITIAL_USER;
};

export const saveUser = (user: User): void => {
  localStorage.setItem(USER_KEY, JSON.stringify(user));
};

export const getLogs = (): MissionLog[] => {
  const stored = localStorage.getItem(LOGS_KEY);
  return stored ? JSON.parse(stored) : [];
};

export const saveLogs = (logs: MissionLog[]): void => {
  localStorage.setItem(LOGS_KEY, JSON.stringify(logs));
};

export const addLog = (log: MissionLog): void => {
  const logs = getLogs();
  logs.push(log);
  saveLogs(logs);
};

export const getSavedPlaces = (): SavedPlace[] => {
  const stored = localStorage.getItem(PLACES_KEY);
  return stored ? JSON.parse(stored) : INITIAL_PLACES;
};

export const saveSavedPlaces = (places: SavedPlace[]): void => {
  localStorage.setItem(PLACES_KEY, JSON.stringify(places));
};

export const updateUserPoints = (pointsToAdd: number): User => {
  const user = getUser();
  user.points += pointsToAdd;
  user.lifetimePoints += pointsToAdd; // Always increase lifetime points
  user.totalMissionsCompleted += 1;
  user.stage = getStageFromPoints(user.lifetimePoints); // Level up based on lifetime points
  saveUser(user);
  return user;
};

// Function to deduct points for shop purchases
export const deductUserPoints = (amount: number): User | null => {
  const user = getUser();
  if (user.points >= amount) {
    user.points -= amount;
    // Do NOT decrease lifetimePoints or change stage
    saveUser(user);
    return user;
  }
  return null; // Insufficient funds
};

export const purchaseItem = (itemId: string, cost: number): User | null => {
  const user = getUser();
  if (user.points >= cost) {
    user.points -= cost;
    if (!user.inventory.includes(itemId)) {
        user.inventory.push(itemId);
    }
    saveUser(user);
    return user;
  }
  return null;
}

// --- Google Sheet Logic ---
export const saveToGoogleSheet = async (mission: Mission, currentUserState: User) => {
  if (!FIXED_GOOGLE_SHEET_URL) {
    console.warn("Google Sheet URL is not set.");
    return { success: false, message: "URL 미설정" };
  }
  try {
    const payload = {
      user: currentUserState.name,
      mission: mission.title,
      points: mission.points,
      level: currentUserState.stage
    };
    
    // Using no-cors mode for fire-and-forget saving
    await fetch(FIXED_GOOGLE_SHEET_URL, {
      method: 'POST',
      body: JSON.stringify(payload),
      mode: 'no-cors', 
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    });
    
    console.log("Sent to Google Sheet");
    return { success: true, message: "전송 성공! (반영까지 3초)" };
  } catch (error: any) {
    console.error("Google Sheet Save Error:", error);
    return { success: false, message: "전송 실패" };
  }
};

export interface SyncResult {
    success: boolean;
    message: string;
    data?: {
        user: User;
        logs: MissionLog[];
    };
}

export const syncFromGoogleSheet = async (userName: string): Promise<SyncResult> => {
  if (!FIXED_GOOGLE_SHEET_URL) {
    return { success: false, message: "URL 미설정" };
  }

  try {
    // Force fresh fetch
    const response = await fetch(`${FIXED_GOOGLE_SHEET_URL}?t=${Date.now()}`);
    
    if (!response.ok) {
        throw new Error(`서버 응답 오류 (${response.status})`);
    }
    
    let rows;
    try {
        rows = await response.json();
    } catch (e) {
        throw new Error("데이터 형식 오류 (JSON 파싱 실패)");
    }
    
    if (!Array.isArray(rows)) {
        // Handle case where script might return {data: [...]} or just [...]
        if (rows.data && Array.isArray(rows.data)) {
            rows = rows.data;
        } else {
            throw new Error("데이터 형식 오류 (배열 아님)");
        }
    }

    // Filter logs for the current user
    const targetUser = userName.trim();
    const userRows = rows.filter((r: any) => r.user && String(r.user).trim() === targetUser);
    
    if (userRows.length === 0) {
        return { success: true, message: `⚠️ '${targetUser}'님의 기록이 시트에 없습니다.` };
    }

    // Reconstruct logs with aggressive number parsing
    const recoveredLogs: MissionLog[] = userRows.map((r: any, index: number) => {
        // Parse points: remove all non-numeric chars, default to 0
        const rawPoints = String(r.points || '0');
        const points = parseInt(rawPoints.replace(/[^0-9]/g, ''), 10) || 0;
        
        return {
            id: `rec-${index}-${Date.now()}`,
            missionId: `sheet-${index}`,
            title: r.mission || '복구된 미션',
            points: points,
            completedAt: r.timestamp || new Date().toISOString(),
            type: 'recovered'
        };
    });

    // Calculate total points
    const totalPoints = recoveredLogs.reduce((sum, log) => sum + log.points, 0);

    // Update Local Storage
    saveLogs(recoveredLogs);

    const currentUser = getUser();
    currentUser.lifetimePoints = totalPoints;
    // Restore spendable points (simplified: restored points = total earned points)
    currentUser.points = totalPoints; 
    currentUser.totalMissionsCompleted = recoveredLogs.length;
    currentUser.stage = getStageFromPoints(totalPoints);
    
    saveUser(currentUser);

    return { 
        success: true, 
        message: `✅ 복구 성공! 총 ${totalPoints}P (${recoveredLogs.length}건)`,
        data: {
            user: currentUser,
            logs: recoveredLogs
        }
    };

  } catch (error: any) {
    console.error("Sync Error:", error);
    return { success: false, message: "❌ 불러오기 실패: " + (error.message || "알 수 없음") };
  }
};
