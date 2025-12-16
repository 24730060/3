
import React, { useState } from 'react';
import { MissionLog } from '../types';
import { ChevronLeft, ChevronRight, CheckCircle, Calendar, X } from 'lucide-react';

interface Props {
  logs: MissionLog[];
}

const Diary: React.FC<Props> = ({ logs }) => {
  const [isMonthlyView, setIsMonthlyView] = useState(false);
  const [currentViewDate, setCurrentViewDate] = useState(new Date());
  const [selectedDateLog, setSelectedDateLog] = useState<{ date: string, missions: MissionLog[] } | null>(null);

  // Helper to generate weekly view data
  const generateWeeklyData = () => {
    const today = new Date();
    const weekData = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const dayLogs = logs.filter(l => l.completedAt.startsWith(dateStr));
      
      weekData.push({
        dayName: ['일', '월', '화', '수', '목', '금', '토'][d.getDay()],
        date: d.getDate(),
        fullDate: dateStr,
        isCompleted: dayLogs.length > 0,
        isToday: i === 0,
        logs: dayLogs
      });
    }
    return weekData;
  };

  const weeklyData = generateWeeklyData();

  // Helper for Monthly Grid
  const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

  const handlePrevMonth = (e: React.MouseEvent) => { 
    e.stopPropagation(); 
    setCurrentViewDate(new Date(currentViewDate.getFullYear(), currentViewDate.getMonth() - 1, 1)); 
  };
  
  const handleNextMonth = (e: React.MouseEvent) => { 
    e.stopPropagation(); 
    setCurrentViewDate(new Date(currentViewDate.getFullYear(), currentViewDate.getMonth() + 1, 1)); 
  };

  const renderCalendarGrid = () => {
    const year = currentViewDate.getFullYear();
    const month = currentViewDate.getMonth();
    const daysInMonth = getDaysInMonth(year, month);
    const firstDay = getFirstDayOfMonth(year, month);
    const days = [];

    // Empty cells
    for (let i = 0; i < firstDay; i++) { 
      days.push(<div key={`empty-${i}`} className="h-10"></div>); 
    }

    // Day cells
    for (let d = 1; d <= daysInMonth; d++) {
      const dateObj = new Date(year, month, d);
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const dayLogs = logs.filter(l => l.completedAt.startsWith(dateStr));
      const hasLogs = dayLogs.length > 0;
      const isToday = new Date().toDateString() === dateObj.toDateString();

      days.push(
        <div 
          key={d} 
          className="flex flex-col items-center justify-center h-10 cursor-pointer hover:bg-slate-50 rounded-lg relative"
          onClick={() => {
            // Allow clicking any date
            setSelectedDateLog({ date: dateStr, missions: dayLogs });
          }}
        >
          <span className={`text-sm font-bold ${isToday ? 'text-white bg-emerald-500 w-7 h-7 flex items-center justify-center rounded-full' : 'text-slate-700'}`}>
            {d}
          </span>
          {hasLogs && <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full mt-1"></div>}
        </div>
      );
    }
    return days;
  };

  return (
    <div>
      {/* Diary Header */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2"><span>📅 에코 다이어리</span></h3>
        <button 
          onClick={() => setIsMonthlyView(!isMonthlyView)} 
          className="text-xs font-medium text-slate-500 bg-white border border-slate-200 px-3 py-1.5 rounded-full hover:bg-slate-50 transition-colors shadow-sm flex items-center gap-1"
        >
          {isMonthlyView ? <><CheckCircle className="w-3 h-3"/> 주간 보기</> : <><Calendar className="w-3 h-3"/> 달력 보기</>}
        </button>
      </div>

      <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100 min-h-[140px]">
        {!isMonthlyView ? (
          <div>
            <div className="flex justify-between items-center mb-4">
              <span className="text-xs font-bold text-slate-400">최근 7일간의 활동</span>
            </div>
            <div className="flex justify-between items-center">
              {weeklyData.map((item, idx) => (
                <div 
                  key={idx} 
                  onClick={() => setSelectedDateLog({ date: item.fullDate, missions: item.logs })} 
                  className="flex flex-col items-center gap-2 cursor-pointer group"
                >
                  <span className={`text-xs font-medium ${item.isToday ? 'text-emerald-600' : 'text-slate-400'}`}>{item.dayName}</span>
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-all group-hover:scale-110 
                    ${item.isCompleted ? 'bg-green-100 border-green-200 text-green-600' : 
                      item.isToday ? 'bg-emerald-500 border-emerald-500 text-white shadow-md' : 'bg-transparent border-transparent text-slate-600 hover:bg-slate-50'}`}
                  >
                    {item.isCompleted ? '🌿' : item.date}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="animate-in fade-in duration-300">
             <div className="flex items-center justify-center gap-4 mb-4">
               <button onClick={handlePrevMonth} className="p-1 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600"><ChevronLeft className="w-5 h-5"/></button>
               <span className="font-bold text-lg text-slate-800 w-32 text-center">{currentViewDate.getFullYear()}년 {currentViewDate.getMonth() + 1}월</span>
               <button onClick={handleNextMonth} className="p-1 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600"><ChevronRight className="w-5 h-5"/></button>
             </div>
             <div className="grid grid-cols-7 gap-1 text-center mb-2">
               {['일','월','화','수','목','금','토'].map((d, i) => (
                 <span key={d} className={`text-xs font-bold ${i === 0 ? 'text-red-400' : i === 6 ? 'text-blue-400' : 'text-slate-400'}`}>{d}</span>
               ))}
             </div>
             <div className="grid grid-cols-7 gap-1">{renderCalendarGrid()}</div>
          </div>
        )}
      </div>

      {/* Log Detail Modal */}
      {selectedDateLog && (
        <div 
          className="fixed inset-0 bg-black/50 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4 backdrop-blur-sm" 
          onClick={() => setSelectedDateLog(null)}
        >
          <div className="bg-white w-full sm:max-w-sm rounded-t-2xl sm:rounded-2xl p-6 shadow-2xl animate-in slide-in-from-bottom-full sm:zoom-in duration-300" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-slate-800">{selectedDateLog.date} 활동 내역</h3>
              <button onClick={() => setSelectedDateLog(null)} className="p-1 hover:bg-slate-100 rounded-full"><X className="w-5 h-5 text-slate-400" /></button>
            </div>
            
            {selectedDateLog.missions.length > 0 ? (
              <div className="space-y-3">
                {selectedDateLog.missions.map((mission, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600">
                        <CheckCircle className="w-4 h-4" />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-slate-700 font-medium text-sm">{mission.title}</span>
                        <span className="text-xs text-slate-400">
                          {new Date(mission.completedAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} 완료
                        </span>
                      </div>
                    </div>
                    <span className="text-emerald-600 font-bold text-sm">+{mission.points}P</span>
                  </div>
                ))}
                <div className="mt-4 text-center text-slate-500 text-sm">
                  총 {selectedDateLog.missions.reduce((acc, cur) => acc + cur.points, 0)}포인트 획득
                </div>
              </div>
            ) : (
              <div className="py-10 text-center text-slate-400 flex flex-col items-center">
                <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-3">
                  <Calendar className="w-8 h-8 text-slate-300" />
                </div>
                <p>기록된 활동이 없습니다.</p>
                <p className="text-xs mt-1">오늘의 미션을 수행해보세요!</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Diary;
