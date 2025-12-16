import React, { useState, useEffect, useRef } from 'react';
import { Mission, MissionState } from '../types';
import { Clock, Play, CheckSquare, ChevronLeft, Trash2, Footprints, Coffee, Wind, Droplets, CheckCircle } from 'lucide-react';

interface Props {
  mission: Mission;
  onClose: () => void;
  onComplete: (mission: Mission) => void;
}

const MissionFlow: React.FC<Props> = ({ mission, onClose, onComplete }) => {
  const [isMissionStarted, setIsMissionStarted] = useState(false);
  const [timeLeft, setTimeLeft] = useState(mission.estimatedTimeSeconds);
  const [showSuccess, setShowSuccess] = useState(false);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  useEffect(() => {
    if (isMissionStarted && timeLeft > 0) {
      timerRef.current = window.setInterval(() => {
        setTimeLeft((prev) => {
            if (prev <= 1) {
                if (timerRef.current) clearInterval(timerRef.current);
                return 0;
            }
            return prev - 1;
        });
      }, 1000);
    }
  }, [isMissionStarted]);

  const getIcon = (name?: string) => {
    const props = { className: "w-8 h-8" };
    switch(name) {
      case 'trash': return <Trash2 {...props} className="text-blue-500" />;
      case 'footprints': return <Footprints {...props} className="text-orange-500" />;
      case 'coffee': return <Coffee {...props} className="text-brown-500" />;
      case 'wind': return <Wind {...props} className="text-gray-500" />;
      case 'droplets': return <Droplets {...props} className="text-blue-400" />;
      default: return <CheckCircle {...props} className="text-green-600" />;
    }
  };

  const completeMission = () => {
    setShowSuccess(true);
    // Slight delay to allow render before notifying parent if needed, 
    // but usually parent just closes. Here we handle the UI until user closes or we auto close.
  };

  const handleCloseSuccess = () => {
    onComplete(mission);
  };

  if (showSuccess) {
    return (
      <div className="absolute inset-0 bg-black/70 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
        <div className="bg-white w-full max-w-sm rounded-2xl p-8 text-center shadow-2xl animate-in zoom-in duration-300">
            <div className="text-6xl mb-4 animate-bounce">🎉</div>
            <h2 className="text-2xl font-bold text-emerald-800 mb-2">미션 성공!</h2>
            <p className="text-slate-600 mb-6">
                <span className="font-bold text-emerald-600">+{mission.points}P</span> 획득
            </p>
            <div className="bg-emerald-50 rounded-xl p-4 mb-6">
                <div className="text-center font-bold text-emerald-600">이만큼 커졌어요!</div>
            </div>
            <button 
                onClick={handleCloseSuccess} 
                className="w-full bg-emerald-600 text-white py-3 rounded-xl font-bold hover:bg-emerald-700 transition-colors"
            >
                홈으로 돌아가기
            </button>
        </div>
      </div>
    );
  }

  return (
    <div className="absolute inset-0 bg-white z-40 flex flex-col animate-in fade-in slide-in-from-bottom-10 duration-300">
        <div className="p-4 bg-emerald-600 text-white flex items-center gap-2 shadow-md">
            <button onClick={onClose} className="p-1 hover:bg-emerald-700 rounded-full">
                <ChevronLeft className="w-6 h-6" />
            </button>
            <span className="font-bold text-lg">미션 수행</span>
        </div>
        
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
            <div className="w-24 h-24 bg-emerald-100 rounded-full flex items-center justify-center mb-6 animate-bounce-slow">
                {getIcon(mission.iconName)}
            </div>
            
            <h2 className="text-2xl font-bold text-slate-800 mb-2 break-words max-w-full px-4">{mission.title}</h2>
            <p className="text-slate-500 mb-6 max-w-xs break-words">{mission.description}</p>
            
            <div className="flex gap-4 mb-8 w-full max-w-xs">
                <div className="flex-1 bg-yellow-50 border border-yellow-100 p-3 rounded-xl">
                    <div className="text-xs text-yellow-600 font-bold mb-1">획득 포인트</div>
                    <div className="text-xl font-bold text-slate-800">+{mission.points} P</div>
                </div>
                <div className="flex-1 bg-blue-50 border border-blue-100 p-3 rounded-xl">
                    <div className="text-xs text-blue-600 font-bold mb-1">예상 소요</div>
                    <div className="text-xl font-bold text-slate-800">{mission.estimatedTimeSeconds}초</div>
                </div>
            </div>

            {isMissionStarted ? (
                <div className="w-full max-w-xs bg-slate-50 rounded-2xl p-6 border border-slate-200 mb-8 animate-in zoom-in duration-300">
                    <div className="flex items-center justify-center gap-2 text-slate-400 text-sm mb-2">
                        <Clock className="w-4 h-4" /> 남은 시간
                    </div>
                    <div className="text-4xl font-mono font-bold text-slate-800">
                        {Math.floor(timeLeft / 60).toString().padStart(2, '0')}:{ (timeLeft % 60).toString().padStart(2, '0') }
                    </div>
                    {timeLeft > 0 && <div className="text-xs text-emerald-500 mt-2 animate-pulse">미션 수행중...</div>}
                </div>
            ) : (
                <div className="w-full max-w-xs h-24 mb-8"></div> // Spacer
            )}

            {!isMissionStarted ? (
                <button 
                    onClick={() => setIsMissionStarted(true)} 
                    className="w-full max-w-xs bg-emerald-600 text-white py-4 rounded-xl font-bold text-lg shadow-lg hover:bg-emerald-700 transition-all active:scale-95 flex items-center justify-center gap-2"
                >
                    <Play className="w-5 h-5 fill-current" /> 미션 시작하기
                </button>
            ) : timeLeft === 0 ? (
                <button 
                    onClick={completeMission} 
                    className="w-full max-w-xs bg-blue-600 text-white py-4 rounded-xl font-bold text-lg shadow-lg hover:bg-blue-700 transition-all active:scale-95 flex items-center justify-center gap-2 animate-pulse"
                >
                    <CheckSquare className="w-5 h-5" /> 미션 완료!
                </button>
            ) : (
                <button 
                    disabled 
                    className="w-full max-w-xs bg-slate-300 text-slate-500 py-4 rounded-xl font-bold text-lg cursor-not-allowed flex items-center justify-center gap-2"
                >
                    <Clock className="w-5 h-5 animate-spin" /> 수행 중...
                </button>
            )}
        </div>
    </div>
  );
};

export default MissionFlow;