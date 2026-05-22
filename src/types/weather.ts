export interface WeatherCurrent {
  temperature_2m: number;
  apparent_temperature: number;
  weathercode: number;
  windspeed_10m: number;
  relativehumidity_2m: number;
  visibility: number;
  precipitation: number;
  is_day: number;
}

export interface WeatherDaily {
  time: string[];
  weathercode: number[];
  temperature_2m_max: number[];
  temperature_2m_min: number[];
  sunrise: string[];
  sunset: string[];
  uv_index_max: number[];
  precipitation_probability_max: number[];
  precipitation_sum: number[];
}

export interface WeatherResponse {
  current: WeatherCurrent;
  daily: WeatherDaily;
}
