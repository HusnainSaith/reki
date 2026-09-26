import { registerAs } from '@nestjs/config';
export default registerAs('intelligence',()=>({weatherApiKey:process.env.WEATHER_API_KEY,weatherBaseUrl:process.env.WEATHER_API_BASE_URL,aiProvider:process.env.AI_PROVIDER,aiKey:process.env.AI_API_KEY,aiBaseUrl:process.env.AI_BASE_URL,aiModel:process.env.AI_MODEL}));
