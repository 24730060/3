import { GoogleGenAI, Type } from "@google/genai";
import { Mission, WeatherData, LocationInfo } from '../types';

export const generateEcoMissions = async (
  weather: WeatherData,
  location: LocationInfo,
  forcedType?: 'indoor' | 'outdoor',
  completedTitles: string[] = []
): Promise<{ missions: Mission[], locationContext: string }> => {
  try {
    const apiKey = process.env.API_KEY;
    
    // Explicit safety check
    if (!apiKey || apiKey.startsWith('VITE_')) {
        throw new Error("API Key is missing or invalid. Check Vercel Environment Variables.");
    }

    const ai = new GoogleGenAI({ apiKey });

    const typeContext = forcedType 
      ? (forcedType === 'indoor' ? "사용자는 현재 '실내'에 있습니다." : "사용자는 현재 '실외'에 있습니다.") 
      : "";

    const excludePrompt = completedTitles.length > 0
      ? `주의: 사용자가 오늘 이미 완료한 미션 목록입니다: [${completedTitles.join(', ')}]. 이 목록에 있는 미션과 똑같거나 매우 유사한 미션은 절대 추천하지 마세요. 새로운 미션을 제안해주세요.`
      : "";

    const prompt = `
      현재 사용자의 위치는 '${location.address}'이며, 날씨는 '${weather.condition}', 기온은 ${weather.temp}도 입니다.
      ${typeContext}
      
      ${excludePrompt}

      이 상황에 적합한 환경 보호 미션 3가지를 추천해주세요.
      
      **작성 가이드라인 (매우 중요):**
      1. 미션의 **설명(description)**은 반드시 다음 형식을 자연스럽게 변형하여 작성해주세요:
         "지금 **${location.address}**에는 **${weather.condition}**이니, [구체적인 행동]을 해보는 건 어떨까요?"
      2. 사용자가 현재의 날씨와 위치에 공감할 수 있도록 감성적으로 작성해주세요.
      3. 위치가 '실내'라면 전자기기 끄기, 물 절약, 분리수거 등을 추천하고, '실외'라면 쓰레기 줍기, 텀블러 사용, 대중교통 이용 등을 추천하세요.
      4. **시연(Demo) 목적이므로 미션 수행 시간(duration)은 10초에서 60초 사이로 짧게 설정해주세요.**
      
      응답은 JSON 스키마를 따라야 하며, iconName은 'trash', 'footprints', 'coffee', 'wind', 'droplets', 'check' 중 하나입니다.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            missions: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING },
                  description: { type: Type.STRING },
                  duration: { type: Type.INTEGER, description: "Duration in seconds" },
                  points: { type: Type.INTEGER },
                  iconName: { type: Type.STRING },
                  type: { type: Type.STRING, enum: ['indoor', 'outdoor', 'recycling', 'habit'] }
                },
                required: ['title', 'description', 'duration', 'points', 'iconName', 'type']
              }
            }
          }
        }
      }
    });

    const result = JSON.parse(response.text || '{}');
    const rawMissions = result.missions || [];
    
    const missions = rawMissions.map((m: any, index: number) => ({
      ...m,
      id: Date.now() + index,
      estimatedTimeSeconds: Math.min(Math.max(m.duration, 10), 60), 
      type: m.type || (forcedType || 'outdoor') // Fallback type
    }));

    return {
      missions,
      locationContext: forcedType === 'indoor' ? '실내 활동' : '야외 활동'
    };

  } catch (error) {
    console.error("Gemini mission generation failed:", error);
    // Fallback static missions - guarantees app doesn't look empty even if API fails
    return {
      locationContext: '기본 미션',
      missions: [
        {
          id: 'fallback-1',
          title: '주변 쓰레기 3개 줍기',
          description: `지금 ${location.address} 주변에 떨어진 쓰레기를 주워 깨끗한 거리를 만들어보세요. (AI 연결 확인 필요)`,
          estimatedTimeSeconds: 15, 
          points: 10,
          type: 'outdoor',
          iconName: 'trash'
        },
        {
          id: 'fallback-2',
          title: '텀블러 사용하기',
          description: '일회용 컵 대신 텀블러를 사용하여 지구를 지켜주세요.',
          estimatedTimeSeconds: 10, 
          points: 20,
          type: 'indoor',
          iconName: 'coffee'
        }
      ]
    };
  }
};