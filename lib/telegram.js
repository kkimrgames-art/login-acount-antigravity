import TelegramBot from 'node-telegram-bot-api';
import { logError, retryWithBackoff, telegramCircuitBreaker } from './security';

const token = process.env.TELEGRAM_BOT_TOKEN;
const adminIds = process.env.TELEGRAM_ADMIN_IDS?.split(',').map(id => parseInt(id.trim())) || [];

let bot = null;
let isInitialized = false;
let initializationAttempts = 0;
const MAX_INIT_ATTEMPTS = 5;

// Message queue to prevent flooding
const messageQueue = [];
let isProcessingQueue = false;

async function processMessageQueue() {
  if (isProcessingQueue || messageQueue.length === 0) return;
  
  isProcessingQueue = true;
  
  while (messageQueue.length > 0) {
    const { chatId, message, options } = messageQueue.shift();
    
    try {
      await retryWithBackoff(
        async () => {
          return await telegramCircuitBreaker.execute(async () => {
            return await bot.sendMessage(chatId, message, options);
          });
        },
        {
          maxRetries: 3,
          initialDelay: 1000,
          onRetry: (error, attempt) => {
            logError(error, { context: 'telegram-send-message', attempt, chatId });
          }
        }
      );
      
      // Rate limit: wait 50ms between messages
      await new Promise(resolve => setTimeout(resolve, 50));
    } catch (error) {
      logError(error, { context: 'telegram-message-queue', chatId });
    }
  }
  
  isProcessingQueue = false;
}

function queueMessage(chatId, message, options = {}) {
  messageQueue.push({ chatId, message, options });
  processMessageQueue();
}

export function initBot() {
  if (!token) {
    console.warn('⚠️  Telegram bot token not configured');
    return null;
  }

  if (isInitialized && bot) {
    console.log('✅ Bot already initialized');
    return bot;
  }

  if (initializationAttempts >= MAX_INIT_ATTEMPTS) {
    console.error('❌ Max initialization attempts reached');
    return null;
  }

  initializationAttempts++;

  try {
    // Use webhook mode for Render (more reliable than polling)
    bot = new TelegramBot(token, { polling: false });

    // Set webhook if in production
    if (process.env.NEXT_PUBLIC_APP_URL && process.env.NODE_ENV === 'production') {
      const webhookUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/telegram/webhook`;
      bot.setWebHook(webhookUrl).catch(error => {
        logError(error, { context: 'set-webhook' });
        // Fallback to polling if webhook fails
        bot = new TelegramBot(token, { polling: true });
      });
    } else {
      // Use polling for development
      bot = new TelegramBot(token, { polling: true });
    }

    // Error handling
    bot.on('polling_error', (error) => {
      logError(error, { context: 'telegram-polling' });
    });

    bot.on('webhook_error', (error) => {
      logError(error, { context: 'telegram-webhook' });
    });

    // Command: /start
    bot.onText(/\/start/, (msg) => {
      const chatId = msg.chat.id;
      if (!isAdmin(chatId)) {
        queueMessage(chatId, '⛔ غير مصرح لك باستخدام هذا البوت');
        return;
      }
      queueMessage(chatId, 
        '👋 مرحباً بك في بوت إدارة حسابات Antigravity\n\n' +
        'الأوامر المتاحة:\n' +
        '/create - إنشاء رابط تسجيل دخول جديد\n' +
        '/list - عرض جميع الحسابات\n' +
        '/stats - إحصائيات الحسابات\n' +
        '/health - حالة النظام'
      );
    });

    // Command: /create
    bot.onText(/\/create/, async (msg) => {
      const chatId = msg.chat.id;
      if (!isAdmin(chatId)) {
        queueMessage(chatId, '⛔ غير مصرح لك باستخدام هذا البوت');
        return;
      }

      try {
        queueMessage(chatId, '⏳ جاري إنشاء الرابط...');

        const response = await retryWithBackoff(
          async () => {
            const res = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/telegram/create-link`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ chatId }),
              signal: AbortSignal.timeout(15000) // 15 second timeout
            });
            
            if (!res.ok) {
              const error = await res.json();
              throw new Error(error.error || 'Failed to create link');
            }
            
            return await res.json();
          },
          {
            maxRetries: 3,
            initialDelay: 2000
          }
        );

        if (response.success) {
          queueMessage(chatId, 
            `✅ تم إنشاء رابط التسجيل:\n\n${response.link}\n\n` +
            `📋 معرف الرابط: ${response.linkId}\n` +
            `⏰ صالح لمدة 24 ساعة`
          );
        } else {
          queueMessage(chatId, `❌ خطأ: ${response.error}`);
        }
      } catch (error) {
        logError(error, { context: 'telegram-create-command', chatId });
        
        if (error.name === 'AbortError') {
          queueMessage(chatId, '❌ انتهت مهلة الطلب. يرجى المحاولة مرة أخرى');
        } else if (error.message === 'Circuit breaker is OPEN') {
          queueMessage(chatId, '❌ الخدمة مشغولة حالياً. يرجى المحاولة بعد دقيقة');
        } else {
          queueMessage(chatId, `❌ خطأ في الاتصال. يرجى المحاولة مرة أخرى`);
        }
      }
    });

    // Command: /list
    bot.onText(/\/list/, async (msg) => {
      const chatId = msg.chat.id;
      if (!isAdmin(chatId)) {
        queueMessage(chatId, '⛔ غير مصرح لك باستخدام هذا البوت');
        return;
      }

      try {
        queueMessage(chatId, '⏳ جاري جلب الحسابات...');

        const response = await retryWithBackoff(
          async () => {
            const res = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/telegram/list-accounts`, {
              signal: AbortSignal.timeout(15000)
            });
            
            if (!res.ok) throw new Error('Failed to fetch accounts');
            return await res.json();
          },
          { maxRetries: 3, initialDelay: 2000 }
        );

        if (response.success && response.accounts.length > 0) {
          // Split into chunks to avoid message length limit
          const accounts = response.accounts;
          const chunkSize = 20;
          
          for (let i = 0; i < accounts.length; i += chunkSize) {
            const chunk = accounts.slice(i, i + chunkSize);
            let message = i === 0 ? `📊 إجمالي الحسابات: ${accounts.length}\n\n` : '';
            
            chunk.forEach((acc, idx) => {
              const globalIdx = i + idx + 1;
              message += `${globalIdx}. ${acc.email}\n`;
              message += `   📅 ${new Date(acc.created_at).toLocaleDateString('ar')}\n\n`;
            });
            
            queueMessage(chatId, message);
          }
        } else {
          queueMessage(chatId, '📭 لا توجد حسابات مسجلة بعد');
        }
      } catch (error) {
        logError(error, { context: 'telegram-list-command', chatId });
        queueMessage(chatId, '❌ خطأ في جلب الحسابات');
      }
    });

    // Command: /stats
    bot.onText(/\/stats/, async (msg) => {
      const chatId = msg.chat.id;
      if (!isAdmin(chatId)) {
        queueMessage(chatId, '⛔ غير مصرح لك باستخدام هذا البوت');
        return;
      }

      try {
        queueMessage(chatId, '⏳ جاري جلب الإحصائيات...');

        const response = await retryWithBackoff(
          async () => {
            const res = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/telegram/stats`, {
              signal: AbortSignal.timeout(15000)
            });
            
            if (!res.ok) throw new Error('Failed to fetch stats');
            return await res.json();
          },
          { maxRetries: 3, initialDelay: 2000 }
        );

        if (response.success) {
          queueMessage(chatId, 
            `📊 إحصائيات النظام:\n\n` +
            `👥 إجمالي الحسابات: ${response.totalAccounts}\n` +
            `🔗 الروابط النشطة: ${response.activeLinks}\n` +
            `✅ الحسابات الجديدة اليوم: ${response.todayAccounts}\n` +
            `📅 آخر تسجيل: ${response.lastAccount || 'لا يوجد'}`
          );
        }
      } catch (error) {
        logError(error, { context: 'telegram-stats-command', chatId });
        queueMessage(chatId, '❌ خطأ في جلب الإحصائيات');
      }
    });

    // Command: /health
    bot.onText(/\/health/, async (msg) => {
      const chatId = msg.chat.id;
      if (!isAdmin(chatId)) {
        queueMessage(chatId, '⛔ غير مصرح لك باستخدام هذا البوت');
        return;
      }

      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/health`, {
          signal: AbortSignal.timeout(10000)
        });
        
        const data = await response.json();
        
        queueMessage(chatId, 
          `🏥 حالة النظام:\n\n` +
          `✅ الحالة: ${data.status}\n` +
          `🕐 الوقت: ${new Date(data.timestamp).toLocaleString('ar')}\n` +
          `📦 الإصدار: ${data.version}`
        );
      } catch (error) {
        queueMessage(chatId, '❌ النظام غير متاح حالياً');
      }
    });

    isInitialized = true;
    console.log('✅ Telegram bot initialized successfully');
    return bot;
  } catch (error) {
    logError(error, { context: 'bot-initialization', attempt: initializationAttempts });
    
    // Retry initialization after delay
    if (initializationAttempts < MAX_INIT_ATTEMPTS) {
      setTimeout(() => {
        console.log(`🔄 Retrying bot initialization (${initializationAttempts}/${MAX_INIT_ATTEMPTS})...`);
        initBot();
      }, 5000 * initializationAttempts);
    }
    
    return null;
  }
}

export function isAdmin(chatId) {
  return adminIds.includes(chatId);
}

export function getBot() {
  return bot;
}

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('📴 Shutting down bot gracefully...');
  if (bot) {
    bot.stopPolling();
  }
});

process.on('SIGINT', () => {
  console.log('📴 Shutting down bot gracefully...');
  if (bot) {
    bot.stopPolling();
  }
  process.exit(0);
});
