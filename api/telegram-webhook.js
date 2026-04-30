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

  // 1. Comandos básicos
  if (text === '/START') {
    await sendTelegramMessage(token, chatId, "¡Bienvenido al sistema de notificaciones de la U.E. 19 de Agosto!\n\nPor favor, envíame el **CÓDIGO DE ESTUDIANTE** para vincular este chat.");
    return res.status(200).send('OK');
  }

  // 2. Consulta de Notas
  if (text === 'NOTAS' || text === '/NOTAS') {
    try {
      await signInAnonymously(auth);
      // Buscar qué código tiene este chat_id
      const userDoc = await getDoc(doc(db, 'artifacts', firebaseAppId, 'public', 'data', 'telegram_users', chatId.toString()));
      
      if (!userDoc.exists()) {
        await sendTelegramMessage(token, chatId, "⚠️ Aún no has vinculado un estudiante. Por favor, envía primero el **Código de Estudiante**.");
        return res.status(200).send('OK');
      }

      const studentCode = userDoc.data().studentCode;
      
      // Buscar materias de este estudiante
      const subjectsSnap = await getDocs(collection(db, 'artifacts', firebaseAppId, 'public', 'data', 'subjects'));
      let report = `📊 *Reporte de Calificaciones*\nEstudiante: ${studentCode}\n\n`;
      let found = false;

      subjectsSnap.forEach(subDoc => {
        const sub = subDoc.data();
        const student = (sub.students || []).find(s => s.code === studentCode);
        
        if (student) {
          found = true;
          report += `📘 *${sub.name}*\n`;
          // Mostrar promedio del 1er Trimestre (por ejemplo)
          const tri = sub.grades?.[1] || {};
          const stuGrades = tri[student.id] || {};
          const vals = Object.values(stuGrades);
          const avg = vals.length > 0 ? (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(2) : "S/N";
          report += `   Promedio T1: *${avg}*\n\n`;
        }
      });

      if (!found) {
        await sendTelegramMessage(token, chatId, "No se encontraron materias registradas para este código.");
      } else {
        await sendTelegramMessage(token, chatId, report);
      }
    } catch (e) {
      console.error(e);
      await sendTelegramMessage(token, chatId, "Error al consultar notas.");
    }
    return res.status(200).send('OK');
  }

  // 3. Intentar vincular código (6 caracteres)
  if (text.length === 6 && !text.includes('/')) {
    try {
      await signInAnonymously(auth);
      const profileDoc = await getDoc(doc(db, 'artifacts', firebaseAppId, 'public', 'data', 'parentProfiles', text));
      
      if (profileDoc.exists()) {
        // Guardar en telegram_registrations (para envíos masivos)
        const regRef = doc(db, 'artifacts', firebaseAppId, 'public', 'data', 'telegram_registrations', text);
        const regDoc = await getDoc(regRef);
        let chatIds = regDoc.exists() ? (regDoc.data().chatIds || []) : [];
        if (!chatIds.includes(chatId)) {
          chatIds.push(chatId);
          await setDoc(regRef, { chatIds, updatedAt: new Date().toISOString() }, { merge: true });
        }

        // Guardar en telegram_users (para consultas individuales)
        await setDoc(doc(db, 'artifacts', firebaseAppId, 'public', 'data', 'telegram_users', chatId.toString()), {
          studentCode: text,
          updatedAt: new Date().toISOString()
        });

        await sendTelegramMessage(token, chatId, `✅ ¡Vinculación exitosa!\n\nDesde ahora recibirás notificaciones y puedes escribir *NOTAS* en cualquier momento para ver las calificaciones.`);
      } else {
        await sendTelegramMessage(token, chatId, "❌ Código no encontrado.");
      }
    } catch (e) {
      console.error(e);
      await sendTelegramMessage(token, chatId, "Error en la vinculación.");
    }
  }

  return res.status(200).send('OK');
}

async function sendTelegramMessage(token, chatId, text) {
  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text: text, parse_mode: 'Markdown' })
  });
}
