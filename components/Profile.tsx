import React, { useMemo, useState } from 'react';
import { User, MissionLog } from '../types';
import { User as UserIcon, Settings, Database, FileText, Shield, ChevronRight, Leaf, BarChart2, HelpCircle, Star } from 'lucide-react';
import { FIXED_GOOGLE_SHEET_URL } from '../services/storageService';
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer } from 'recharts';

interface Props {
  user: User;
  logs: MissionLog[];
  onOpenSettings: () => void;
  onOpenPolicy: (type: 'privacy' | 'terms') => void;
}

const Profile: React.FC<Props> = ({ user, logs = [], onOpenSettings, onOpenPolicy }) => {
  const [showImpactInfo, setShowImpactInfo] = useState(false);

  const impact = useMemo(() => {
    let co2 = 0;
    let plastic = 0;
    let trees = Math.floor(user.points / 200); 

    logs.forEach(log => {
        co2 += (log.points * 0.05);
        if (log.title.includes('텀블러') || log.title.includes('플라스틱') || log.title.includes('쓰레기') || log.title.includes('분리수거') || log.title.includes('컵')) {
            plastic += 1;
        }
    });

    return {
        co2: co2.toFixed(1),
        plastic,
        trees
    };
  }, [logs, user.points]);

  // Statistics Data Preparation
  const weeklyData = useMemo(() => {
      const today = new Date();
      const last7Days = [];
      
      for(let i=6; i>=0; i--) {
          const d = new Date(today);
          d.setDate(today.getDate() - i);
          const dateStr = d.toISOString().split('T')[0];
          const displayDate = `${d.getMonth()+1}/${d.getDate()}`;
          
          const dailyPoints = logs
            .filter(l => l.completedAt.startsWith(dateStr))
            .reduce((sum, curr) => sum + curr.points, 0);

          last7Days.push({ date: displayDate, points: dailyPoints });
      }
      return last7Days;
  }, [logs]);

  return (
    <div className="p-4 bg-slate-50 min-h-full pb-20">
      <div className="mb-6 text-center pt-6">
        <div className="w-24 h-24 bg-emerald-100 rounded-full mx-auto flex items-center justify-center mb-4 border-4 border-white shadow-md">
          <UserIcon className="w-12 h-12 text-emerald-600" />
        </div>
        <h2 className="text-xl font-bold text-slate-800">{user.name}</h2>
        <button onClick={onOpenSettings} className="mt-2 text-xs bg-slate-800 text-white px-3 py-1 rounded-full flex items-center gap-1 mx-auto">
          <Settings className="w-3 h-3" /> 설정
        </button>
      </div>

      <div className="space-y-4">
        {/* Statistics Section */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden p-5">
           <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
             <BarChart2 className="w-5 h-5 text-emerald-600"/> 활동 분석
           </h3>
           
           <div className="mb-2">
             <p className="text-xs font-bold text-slate-500 mb-2">주간 포인트 획득</p>
             <div className="h-40 w-full">
               <ResponsiveContainer width="100%" height="100%">
                 <BarChart data={weeklyData}>
                   <XAxis dataKey="date" fontSize={10} tickLine={false} axisLine={false} />
                   <Tooltip cursor={{fill: 'transparent'}} contentStyle={{borderRadius: '8px', fontSize: '12px'}} />
                   <Bar dataKey="points" fill="#10b981" radius={[4, 4, 0, 0]} barSize={20} />
                 </BarChart>
               </ResponsiveContainer>
             </div>
           </div>
        </div>

        {/* Environmental Impact Card */}
        <div className="bg-emerald-50 rounded-xl p-5 border border-emerald-100 shadow-sm transition-all">
           <div className="flex justify-between items-center mb-4">
             <h3 className="font-bold text-emerald-800 flex items-center gap-2">
               <Leaf className="w-5 h-5"/> 환경 영향 & 등급
             </h3>
             <button 
               onClick={() => setShowImpactInfo(!showImpactInfo)} 
               className="text-emerald-600 hover:text-emerald-800 p-1 rounded-full hover:bg-emerald-100 transition-colors"
               title="계산 기준 보기"
             >
               <HelpCircle className="w-5 h-5" />
             </button>
           </div>

           {showImpactInfo && (
             <div className="bg-white/80 p-3 rounded-lg mb-4 text-xs text-emerald-800 border border-emerald-100 animate-in slide-in-from-top-2 fade-in">
               <div className="mb-3 border-b border-emerald-100 pb-2">
                   <p className="font-bold mb-1 flex items-center gap-1"><Star className="w-3 h-3"/> 레벨 기준 (누적 포인트)</p>
                   <ul className="space-y-1">
                       <li className="flex justify-between"><span>🌱 새싹</span> <span className="font-bold">0 ~ 499 P</span></li>
                       <li className="flex justify-between"><span>🌷 꽃</span> <span className="font-bold">500 ~ 1,499 P</span></li>
                       <li className="flex justify-between"><span>🍎 열매</span> <span className="font-bold">1,500 ~ 2,999 P</span></li>
                       <li className="flex justify-between"><span>🌳 나무</span> <span className="font-bold">3,000+ P</span></li>
                   </ul>
               </div>
               <div>
                   <p className="font-bold mb-1">📊 환경 영향 계산</p>
                   <ul className="list-disc pl-4 space-y-1 opacity-90">
                     <li><span className="font-bold">CO₂:</span> 1 Point 당 0.05kg 감축</li>
                     <li><span className="font-bold">플라스틱:</span> 관련 미션 1회 당 1개</li>
                     <li><span className="font-bold">나무:</span> 누적 200 Point 당 1그루 식재 효과</li>
                   </ul>
               </div>
             </div>
           )}

           <div className="space-y-3">
             <div className="flex justify-between items-center text-sm">
               <span className="text-slate-600">절약한 CO₂</span>
               <span className="font-bold text-emerald-700 text-lg">{impact.co2}kg</span>
             </div>
             <div className="flex justify-between items-center text-sm">
               <span className="text-slate-600">줄인 플라스틱</span>
               <span className="font-bold text-emerald-700 text-lg">{impact.plastic}개</span>
             </div>
             <div className="flex justify-between items-center text-sm">
               <span className="text-slate-600">심은 나무</span>
               <span className="font-bold text-emerald-700 text-lg">{impact.trees}그루</span>
             </div>
           </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden p-4 mb-2">
          <h3 className="font-bold text-sm mb-2 flex items-center gap-2">
            <Database className="w-4 h-4"/> 데이터 연동 상태
          </h3>
          <div className="text-xs text-slate-500 space-y-1">
            <div className="flex justify-between"><span>날씨 API:</span> <span className="text-green-600">✅ Open-Meteo</span></div>
            <div className="flex justify-between"><span>Gemini AI:</span> <span className="text-green-600">✅ 자동 연동</span></div>
            <div className="flex justify-between">
                <span>Google Sheets:</span> 
                <span className={FIXED_GOOGLE_SHEET_URL ? "text-green-600" : "text-red-500"}>
                    {FIXED_GOOGLE_SHEET_URL ? "✅ 자동 저장 연동됨" : "⚠️ 설정 필요"}
                </span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
          <button onClick={() => onOpenPolicy('privacy')} className="w-full p-4 flex items-center justify-between hover:bg-slate-50 transition-colors border-b border-slate-50">
            <div className="flex items-center gap-3">
              <div className="bg-blue-50 p-2 rounded-lg"><FileText className="w-5 h-5 text-blue-500" /></div>
              <span className="text-slate-700 font-medium">개인정보처리방침</span>
            </div>
            <ChevronRight className="w-5 h-5 text-slate-300" />
          </button>
          <button onClick={() => onOpenPolicy('terms')} className="w-full p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
            <div className="flex items-center gap-3">
              <div className="bg-purple-50 p-2 rounded-lg"><Shield className="w-5 h-5 text-purple-500" /></div>
              <span className="text-slate-700 font-medium">이용약관</span>
            </div>
            <ChevronRight className="w-5 h-5 text-slate-300" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default Profile;