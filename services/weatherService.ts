import { WeatherData } from '../types';

export const getCurrentWeather = async (lat: number, lon: number): Promise<WeatherData> => {
  try {
    const response = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code,is_day`
    );
    const data = await response.json();
    
    if (!data.current) {
      throw new Error('Weather data unavailable');
    }

    // Map WMO weather codes to simple strings
    const code = data.current.weather_code;
    let condition = '맑음';
    let main = 'Sunny';

    if (code >= 1 && code <= 3) { condition = '구름 조금'; main = 'Clouds'; }
    else if (code >= 45 && code <= 48) { condition = '안개'; main = 'Fog'; }
    else if (code >= 51 && code <= 67) { condition = '비'; main = 'Rain'; }
    else if (code >= 71 && code <= 77) { condition = '눈'; main = 'Snow'; }
    else if (code >= 80 && code <= 99) { condition = '비/폭풍'; main = 'Rain'; }

    return {
      temp: data.current.temperature_2m,
      condition: condition,
      main: main
    };
  } catch (error) {
    console.error("Weather fetch failed", error);
    // Fallback default
    return {
      temp: 20,
      condition: '맑음',
      main: 'Sunny'
    };
  }
};