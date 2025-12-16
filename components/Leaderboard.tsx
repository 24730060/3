
import React from 'react';
import { User, MissionLog } from '../types';
import { Trophy, Zap, TrendingUp } from 'lucide-react';
import { getStageFromPoints } from '../services/storageService';

interface Props {
  currentUser: User;
  logs?: MissionLog[];
}

// 0~499: 새싹, 500~1499: 꽃, 1500~2999: 열매, 3000+: 나무
const MOCK_LEADERBOARD = [
  { id: 1, name: '지구지킴이1호', points: 3450 }, 
  { id: 2, name: '플라스틱제로', points: 2100 }, 
  { id: 3, name: '텀블러요정', points: 1250 }, 
  { id: 4, name: '에코라이프', points: 880 }, 
  { id: 5, name: '북극곰친구', points: 420 }, 
];

const Leaderboard: React.FC<Props> = ({ currentUser, logs = [] }) => {
  // Use lifetimePoints for ranking so spending points doesn't affect rank
  const myScore = currentUser.lifetimePoints ?? currentUser.points;

  // Sort leaderboard including current user
  const sortedList = [
    ...MOCK_LEADERBOARD.map(u => ({ ...u, level: getStageFromPoints(u.points) })),
    { 
      id: 99, 
      name: currentUser.name + '(나)', 
      points: myScore, 
      level: currentUser.stage 
    }
  ].sort((a, b) => b.points - a.points);
    
  // Find current user rank
  const myRank = sortedList.findIndex(u => u.id === 99) + 1;
  
  // Calculate this week's missions
  const getWeeklyMissionCount = () => {
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    return logs.filter(log => 
        new Date(log.completedAt) >= oneWeekAgo && 
        log.title !== '테스트 미션' // Exclude test missions
    ).length;
  };
  
  const weeklyCount = getWeeklyMissionCount();

  return (
    <div className="p-4 bg-slate-50 min-h-full pb-20">
      <div className="flex items-center gap-2 mb-4">
         <Trophy className="w-6 h-6 text-emerald-600" />
         <h1 className="text-xl font-bold text-slate-800">랭킹</h1>
      </div>

      {/* Redesigned Top Card */}
      <div className="bg-gradient-to-r from-emerald-500 to-teal-400 rounded-3xl p-6 text-white mb-6 shadow-lg shadow-emerald-200">
        <div className="flex justify-between items-end">
           {/* Left Column */}
           <div className="flex flex-col">
              <span className="text-emerald-100 text-sm font-medium mb-1">나의 순위</span>
              <div className="flex items-center gap-3">
                 <span className="text-5xl font-bold leading-none">{myRank}위</span>
                 <div className="flex flex-col gap-1 mt-1">
                    <span className="text-sm font-medium text-emerald-50 opacity-90">Lv. {currentUser.stage}</span>
                    <div className="flex items-center gap-0.5 text-base font-bold text-white">
                        <Zap className="w-3.5 h-3.5 fill-yellow-300 text-yellow-300" />
                        <span>{myScore.toLocaleString()}P (누적)</span>
                    </div>
                 </div>
              </div>
           </div>
           
           {/* Right Column */}
           <div className="flex flex-col items-end">
              <div className="flex items-center gap-1 text-emerald-100 text-xs font-medium mb-0.5">
                  <TrendingUp className="w-3 h-3" />
                  <span>이번 주</span>
              </div>
              <span className="text-emerald-50 text-xs font-medium">완료한 미션</span>
              <span className="text-3xl font-bold mt-1">{weeklyCount}개</span>
           </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex justify-between items-center">
          <span className="font-bold text-slate-700">주간 랭킹</span>
          <span className="text-xs text-slate-400">매주 월요일 초기화</span>
        </div>
        <div className="divide-y divide-slate-100">
          {sortedList.map((user, index) => (
            <div key={user.id} className={`flex items-center p-4 ${user.id === 99 ? 'bg-emerald-50' : ''}`}>
              <div className={`font-bold w-8 text-center ${index < 3 ? 'text-yellow-500' : 'text-slate-400'}`}>
                {index + 1}
              </div>
              <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center mr-3 text-lg">
                {user.level === '새싹' && '🌱'}
                {user.level === '꽃' && '🌷'}
                {user.level === '열매' && '🍎'}
                {user.level === '나무' && '🌳'}
              </div>
              <div className="flex-1">
                <div className="font-medium text-slate-700">{user.name}</div>
                {user.id === 99 && <div className="text-[10px] text-emerald-600 font-bold">나의 기록</div>}
              </div>
              <div className="flex flex-col items-end">
                <div className="font-semibold text-slate-600">{user.points.toLocaleString()} P</div>
                <div className="text-[10px] text-slate-400">{user.level}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Leaderboard;
