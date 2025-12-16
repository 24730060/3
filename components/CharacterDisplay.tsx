
import React, { useState } from 'react';
import { User } from '../types';
import { ShoppingBag, X, Check } from 'lucide-react';

interface Props {
  user: User;
  onPurchase: (itemId: string, cost: number) => boolean;
}

// Updated thresholds to match storageService logic
const LEVEL_THRESHOLDS = [
  { name: '새싹', min: 0, max: 500, icon: '🌱', color: 'text-green-400' },
  { name: '꽃', min: 501, max: 1500, icon: '🌷', color: 'text-pink-400' },
  { name: '열매', min: 1501, max: 3000, icon: '🍎', color: 'text-red-400' },
  { name: '나무', min: 3001, max: 100000, icon: '🌳', color: 'text-emerald-600' },
];

interface Decoration {
  id: string;
  name: string;
  icon: string;
  cost: number;
  position: string; // Tailwind class for absolute positioning
  animation: string;
  layer: 'bg' | 'fg'; // Background or Foreground
}

const DECORATIONS: Decoration[] = [
  { id: 'bird', name: '파랑새', icon: '🐦', cost: 100, position: 'top-[20%] right-[20%]', animation: 'animate-bounce-slow', layer: 'bg' },
  { id: 'squirrel', name: '다람쥐', icon: '🐿️', cost: 150, position: 'bottom-[35%] right-[20%]', animation: 'animate-pulse', layer: 'fg' },
  { id: 'butterfly', name: '나비', icon: '🦋', cost: 50, position: 'top-[42%] left-[53%]', animation: 'animate-bounce', layer: 'fg' }, // On the leaf
  { id: 'rainbow', name: '무지개', icon: '🌈', cost: 300, position: 'top-[15%] left-1/2 -translate-x-1/2 scale-150', animation: 'opacity-80', layer: 'bg' }, // Behind
  { id: 'sun', name: '해님', icon: '☀️', cost: 120, position: 'top-[10%] right-[10%]', animation: 'animate-spin-slow', layer: 'bg' },
  { id: 'flower_patch', name: '꽃밭', icon: '🌻', cost: 80, position: 'bottom-[35%] right-[35%]', animation: '', layer: 'fg' },
  { id: 'rabbit', name: '토끼', icon: '🐇', cost: 200, position: 'bottom-[35%] left-[20%]', animation: 'animate-bounce', layer: 'fg' },
  { id: 'mushroom', name: '버섯', icon: '🍄', cost: 60, position: 'bottom-[38%] left-[35%]', animation: '', layer: 'fg' },
];

const CharacterDisplay: React.FC<Props> = ({ user, onPurchase }) => {
  const [showShop, setShowShop] = useState(false);
  
  // Use lifetimePoints to determine the Level Icon (so tree doesn't shrink when spending)
  const lifetimePoints = user.lifetimePoints; 
  // Use current points (wallet) for the Exp Bar and Text (so it decreases when spending)
  const currentPoints = user.points; 

  const currentLevelInfo = LEVEL_THRESHOLDS.find(l => lifetimePoints >= l.min && lifetimePoints <= l.max) || LEVEL_THRESHOLDS[LEVEL_THRESHOLDS.length - 1];

  // Calculate percentage based on current points relative to the level's capacity
  // This visualizes "Saving up energy" for the current stage
  const range = currentLevelInfo.max - currentLevelInfo.min;
  // If we used lifetimePoints, the bar would never go down. Using currentPoints makes it dynamic.
  // We clamp it to 100% max, but allow it to be low if points are spent.
  // The denominator is the 'size' of the current level.
  const percentage = Math.min(100, Math.max(0, (currentPoints / range) * 100));

  const handleBuy = (item: Decoration) => {
    if (user.inventory.includes(item.id)) return;
    const success = onPurchase(item.id, item.cost);
    if (!success) {
      alert("포인트가 부족합니다!");
    }
  };

  return (
    <div className="h-full flex flex-col bg-gradient-to-b from-blue-50 to-green-100 relative overflow-hidden">
      
      {/* Top Header Area */}
      <div className="absolute top-10 left-0 w-full text-center z-10 px-4">
        <h2 className="text-2xl font-bold text-emerald-800">나의 에코 포레스트</h2>
        <p className="text-emerald-600 text-sm mt-1">환경 활동으로 나무를 키워보세요!</p>
      </div>

      {/* Shop Button */}
      <button 
        onClick={() => setShowShop(true)}
        className="absolute top-4 right-4 z-30 bg-white p-3 rounded-full shadow-lg border border-slate-100 text-emerald-600 hover:bg-emerald-50 transition-all active:scale-95"
      >
        <ShoppingBag className="w-6 h-6" />
        <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded-full border border-white">
            {DECORATIONS.filter(d => !user.inventory.includes(d.id)).length}
        </span>
      </button>

      {/* Main Content (Tree & Decorations) */}
      <div className="flex-1 flex flex-col items-center justify-center z-10 relative w-full max-w-md mx-auto">
        
        {/* Background Decorations Layer (z-0) - Rainbow, Sun, Birds */}
        <div className="absolute inset-0 pointer-events-none z-0">
            {DECORATIONS.map((item) => {
                if (!user.inventory.includes(item.id) || item.layer !== 'bg') return null;
                return (
                    <div key={item.id} className={`absolute text-4xl filter drop-shadow-sm ${item.position} ${item.animation} transition-all duration-700`}>
                        {item.icon}
                    </div>
                );
            })}
        </div>

        {/* Main Character (z-10) */}
        <div className="relative group cursor-pointer transition-transform hover:scale-110 duration-500 z-10">
          <div className={`text-9xl filter drop-shadow-2xl animate-bounce-slow ${currentLevelInfo.color}`}>
            {currentLevelInfo.icon}
          </div>
        </div>

        {/* Foreground Decorations Layer (z-20) - Animals, Butterfly, Flowers */}
        <div className="absolute inset-0 pointer-events-none z-20">
            {DECORATIONS.map((item) => {
                if (!user.inventory.includes(item.id) || item.layer !== 'fg') return null;
                return (
                    <div key={item.id} className={`absolute text-4xl filter drop-shadow-md ${item.position} ${item.animation} transition-all duration-700`}>
                        {item.icon}
                    </div>
                );
            })}
        </div>
        
        {/* Stats Card */}
        <div className="mt-8 text-center bg-white/60 backdrop-blur-sm p-4 rounded-2xl shadow-lg w-3/4 max-w-xs z-30">
          <div className="text-slate-500 text-sm mb-1">Current Level</div>
          <div className={`text-2xl font-bold ${currentLevelInfo.color} mb-2`}>Lv. {user.stage}</div>
          
          <div className="w-full bg-slate-200 rounded-full h-3 mb-1 overflow-hidden">
            <div 
              className="bg-gradient-to-r from-emerald-400 to-emerald-600 h-3 rounded-full transition-all duration-1000 ease-out" 
              style={{ width: `${percentage}%` }}
            ></div>
          </div>
          
          <div className="flex justify-between text-xs text-slate-500 font-medium mt-1">
            <span>{currentPoints} Exp</span>
            <span>Next: {range} Exp</span>
          </div>
        </div>
      </div>
      
      <div className="absolute bottom-0 w-full h-32 bg-gradient-to-t from-green-200 to-transparent pointer-events-none z-0"></div>

      {/* Shop Modal */}
      {showShop && (
        <div className="absolute inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center animate-in fade-in">
          <div className="bg-white w-full sm:max-w-sm h-[80%] sm:h-auto sm:max-h-[80%] rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-10">
            <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-white z-10">
                <div>
                    <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">🛒 숲 꾸미기 상점</h3>
                    <p className="text-xs text-slate-500">포인트로 나만의 숲을 꾸며보세요!</p>
                </div>
                <button onClick={() => setShowShop(false)} className="p-2 bg-slate-100 rounded-full hover:bg-slate-200"><X className="w-5 h-5"/></button>
            </div>
            
            <div className="p-3 bg-emerald-50 border-b border-emerald-100 flex justify-between items-center px-6">
                <span className="text-sm font-bold text-emerald-800">보유 포인트</span>
                <span className="text-lg font-bold text-emerald-600">{currentPoints.toLocaleString()} P</span>
            </div>

            <div className="flex-1 overflow-y-auto p-4 grid grid-cols-2 gap-3 pb-20">
                {DECORATIONS.map((item) => {
                    const isOwned = user.inventory.includes(item.id);
                    const canAfford = currentPoints >= item.cost;

                    return (
                        <div key={item.id} className={`p-4 rounded-xl border flex flex-col items-center gap-2 transition-all ${isOwned ? 'bg-slate-50 border-slate-200 opacity-70' : canAfford ? 'bg-white border-slate-200 hover:border-emerald-400 hover:shadow-md cursor-pointer' : 'bg-slate-50 border-slate-100 opacity-50'}`}
                             onClick={() => !isOwned && canAfford && handleBuy(item)}
                        >
                            <div className="text-4xl mb-1">{item.icon}</div>
                            <div className="font-bold text-slate-700">{item.name}</div>
                            {isOwned ? (
                                <div className="text-xs font-bold text-green-600 bg-green-100 px-3 py-1 rounded-full flex items-center gap-1">
                                    <Check className="w-3 h-3" /> 보유중
                                </div>
                            ) : (
                                <button disabled={!canAfford} className={`text-xs font-bold px-3 py-1.5 rounded-full w-full ${canAfford ? 'bg-emerald-600 text-white' : 'bg-slate-300 text-slate-500'}`}>
                                    {item.cost} P
                                </button>
                            )}
                        </div>
                    );
                })}
            </div>
          </div>
        </div>
      )}
      
      <style>{`
        @keyframes bounce-slow {
          0%, 100% { transform: translateY(-5%); }
          50% { transform: translateY(5%); }
        }
        .animate-bounce-slow {
          animation: bounce-slow 3s infinite ease-in-out;
        }
        .animate-spin-slow {
          animation: spin 10s linear infinite;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default CharacterDisplay;
