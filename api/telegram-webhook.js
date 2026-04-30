import { initializeApp, getApps } from 'firebase/app';
import { getFirestore, doc, getDoc, setDoc } from 'firebase/firestore';
import { getAuth, signInAnonymously } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyDpo89i5887oP6uhkzsDdIAsKAFji2OqbY",
  authDomain: "estrellatdf---19-de-agosto.firebaseapp.com",
  projectId: "estrellatdf---19-de-agosto",
  storageBucket: "estrellatdf---19-de-agosto.firebasestorage.app",
  messagingSenderId: "312841032306",
  appId: "1:312841032306:web:bfaddeca92567b73e968eb",
  measurementId: "G-XEPFR2H731"
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApps()[0];
const db = getFirestore(app);
const auth = getAuth(app);
const firebaseAppId = "escuela-v1";

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
      // Autenticar para tener permisos de Firestore
      await signInAnonymously(auth);

      // Verificar si el código existe
      const profileDoc = await getDoc(doc(db, 'artifacts', firebaseAppId, 'public', 'data', 'parentProfiles', text));
      
      if (profileDoc.exists()) {
        // Guardar vinculación
        const regRef = doc(db, 'artifacts', firebaseAppId, 'public', 'data', 'telegram_registrations', text);
        const regDoc = await getDoc(regRef);
        
        let chatIds = [];
        if (regDoc.exists()) {
          chatIds = regDoc.data().chatIds || [];
        }
        
        if (!chatIds.includes(chatId)) {
          chatIds.push(chatId);
          await setDoc(regRef, { chatIds, updatedAt: new Date().toISOString() }, { merge: true });
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
