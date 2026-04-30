
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// Inicialización de Firebase Admin (usando variables de entorno o service account)
// Nota: En Vercel, si ya usas firebase-admin con service account, úsalo.
// Si no, podemos usar el SDK normal de cliente si es necesario, pero admin es mejor para APIs.

const firebaseConfig = {
  projectId: "estrellatdf---19-de-agosto",
};

if (!getApps().length) {
  initializeApp(firebaseConfig);
}

const db = getFirestore();
const appId = "escuela-v1";

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const token = "8714699056:AAEMenEJAvtlpecmm6qJQ-2DtnRJ4K2siJs";
  const { message } = req.body;

  if (!message || !message.text) {
    return res.status(200).send('OK');
  }

  const chatId = message.chat.id;
  const text = message.text.trim().toUpperCase();

  // 1. Comando de inicio
  if (text === '/START') {
    await sendTelegramMessage(token, chatId, "¡Bienvenido al sistema de notificaciones de la U.E. 19 de Agosto!\n\nPor favor, envíame el **CÓDIGO DE ESTUDIANTE** para vincular este chat.");
    return res.status(200).send('OK');
  }

  // 2. Intentar vincular código
  if (text.length === 6) {
    try {
      // Verificar si el código existe en perfiles de padres o materias
      const profileDoc = await db.doc(`artifacts/${appId}/public/data/parentProfiles/${text}`).get();
      
      if (profileDoc.exists) {
        // Guardar vinculación
        const regRef = db.doc(`artifacts/${appId}/public/data/telegram_registrations/${text}`);
        const regDoc = await regRef.get();
        
        let chatIds = [];
        if (regDoc.exists) {
          chatIds = regDoc.data().chatIds || [];
        }
        
        if (!chatIds.includes(chatId)) {
          chatIds.push(chatId);
          await regRef.set({ chatIds, updatedAt: new Date().toISOString() }, { merge: true });
        }

        await sendTelegramMessage(token, chatId, `✅ ¡Vinculación exitosa!\n\nDesde ahora recibirás las notificaciones de este estudiante directamente aquí.`);
      } else {
        await sendTelegramMessage(token, chatId, "❌ El código no es válido o aún no ha sido registrado por un docente. Por favor, verifica el código e inténtalo de nuevo.");
      }
    } catch (e) {
      console.error("Error vinculando Telegram:", e);
      await sendTelegramMessage(token, chatId, "⚠️ Hubo un error al procesar tu solicitud. Inténtalo más tarde.");
    }
  } else {
    await sendTelegramMessage(token, chatId, "Por favor, envía un código de estudiante válido (6 caracteres) para recibir notificaciones.");
  }

  return res.status(200).send('OK');
}

async function sendTelegramMessage(token, chatId, text) {
  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text: text,
      parse_mode: 'Markdown'
    })
  });
}
