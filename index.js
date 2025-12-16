import { BotClient } from './src/BotClient.js';
import 'dotenv/config';

const client = new BotClient();
client.start();
