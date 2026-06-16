import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

let db;
let initError = null;

try {
  const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT || '{}');
  if (!getApps().length) {
    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
      initializeApp({
        credential: cert(serviceAccount)
      });
    } else {
      initializeApp();
    }
  }
  db = getFirestore();
} catch (err) {
  initError = err;
}

const firebaseAppId = "escuela-v1";
const telegramToken = "8714699056:AAEMenEJAvtlpecmm6qJQ-2DtnRJ4K2siJs";

export default async function handler(req, res) {
  if (initError) {
    console.error("Firebase Admin Initialization Error:", initError);
    return res.status(500).json({ error: 'Database Connection Error', details: initError.message });
  }
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { title, body, studentCode, isGlobal } = req.body;
  const appId = "2a9779af-a413-47f6-9196-9be1bf792bbe";
  const restApiKey = process.env.ONESIGNAL_REST_API_KEY;

  if (!restApiKey) {
    return res.status(500).json({ error: 'ONESIGNAL_REST_API_KEY is not configured' });
  }

  const host = req.headers.host;
  const protocol = req.headers['x-forwarded-proto'] || 'https';
  const baseUrl = `${protocol}://${host}/`;

  const notificationBody = {
    app_id: appId,
    headings: { en: title, es: title },
    contents: { en: body, es: body },
    url: baseUrl
  };

  // --- 1. CONFIGURAR FILTROS ONESIGNAL ---
  if (isGlobal) {
    notificationBody.included_segments = ['All'];
  } else if (studentCode) {
    if (Array.isArray(studentCode)) {
      const filters = [];
      studentCode.forEach((code, index) => {
        filters.push({ field: 'tag', key: 'studentCode', relation: '=', value: code.toUpperCase() });
        if (index < studentCode.length - 1) filters.push({ operator: 'OR' });
      });
      notificationBody.filters = filters;
    } else {
      notificationBody.filters = [{ field: 'tag', key: 'studentCode', relation: '=', value: studentCode.toUpperCase() }];
    }
  } else {
    return res.status(400).json({ error: 'Missing target' });
  }

  try {
    // --- 2. ENVIAR PUSH ONESIGNAL ---
    const osResponse = await fetch('https://onesignal.com/api/v1/notifications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Authorization': `Basic ${restApiKey}`,
      },
      body: JSON.stringify(notificationBody),
    });

    // --- 3. ENVIAR TELEGRAM ---
    try {
      let targetChatIds = [];
      if (isGlobal) {
        const regs = await db.collection(`artifacts/${firebaseAppId}/public/data/telegram_registrations`).get();
        regs.forEach(docSnap => { targetChatIds = targetChatIds.concat(docSnap.data().chatIds || []); });
      } else if (studentCode) {
        const codes = Array.isArray(studentCode) ? studentCode : [studentCode];
        for (const code of codes) {
          const regDoc = await db.doc(`artifacts/${firebaseAppId}/public/data/telegram_registrations/${code.toUpperCase()}`).get();
          const data = regDoc.data();
          if (data) targetChatIds = targetChatIds.concat(data.chatIds || []);
        }
      }

      // Eliminar duplicados
      targetChatIds = [...new Set(targetChatIds)];

      for (const chatId of targetChatIds) {
        await fetch(`https://api.telegram.org/bot${telegramToken}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId,
            text: `🔔 *${title}*\n\n${body}\n\n[Abrir Aplicación](${baseUrl})`,
            parse_mode: 'Markdown'
          })
        });
      }
    } catch (teleErr) {
      console.error("Error enviando a Telegram:", teleErr);
    }

    const data = await osResponse.json();
    if (!osResponse.ok) return res.status(osResponse.status).json({ error: 'OneSignal API Error', details: data });
    return res.status(200).json(data);
    
  } catch (error) {
    console.error('Error general de envío:', error);
    return res.status(500).json({ error: 'Internal Server Error', message: error.message });
  }
}
