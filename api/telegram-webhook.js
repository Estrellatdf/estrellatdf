
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT || '{}');

if (!getApps().length) {
  initializeApp({
    credential: cert(serviceAccount)
  });
}

const db = getFirestore();
const firebaseAppId = "escuela-v1";

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const token = "8714699056:AAEMenEJAvtlpecmm6qJQ-2DtnRJ4K2siJs";
  const { message, callback_query } = req.body;

  // Menu Inline
  const inlineMenu = {
    inline_keyboard: [
      [{ text: "📊 Ver Notas", callback_data: "NOTAS" }, { text: "📅 Asistencia", callback_data: "ASISTENCIA" }],
      [{ text: "📢 Comunicados", callback_data: "COMUNICADOS" }, { text: "👤 Mi Perfil", callback_data: "PERFIL" }]
    ]
  };

  // --- MANEJO DE CLICS EN BOTONES (Callback Query) ---
  if (callback_query) {
    const chatId = callback_query.message.chat.id;
    const data = callback_query.data;
    
    // Convertir el data en el "texto" que espera nuestra lógica existente
    await handleCommand(token, chatId, data, inlineMenu);
    return res.status(200).send('OK');
  }

  if (!message || !message.text) {
    return res.status(200).send('OK');
  }

  const chatId = message.chat.id;
  const text = message.text.trim().toUpperCase();

  // --- MANEJO DE MENSAJES DE TEXTO ---
  if (text === '/START' || text === 'MENU' || text === 'INICIO') {
    const userDoc = await db.doc(`artifacts/${firebaseAppId}/public/data/telegram_users/${chatId}`).get();
    
    if (!userDoc.exists) {
      await sendTelegramMessage(token, chatId, "¡Bienvenido al sistema de notificaciones de la U.E. 19 de Agosto!\n\nPor favor, envíame el **CÓDIGO DE ESTUDIANTE** para vincular este chat.");
    } else {
      await sendTelegramMessage(token, chatId, "🏠 *Menú Principal*\nSelecciona una opción para consultar:", inlineMenu);
    }
  } else if (text.length === 6 && !text.includes('/')) {
    // Vincular código
    await handleLinking(token, chatId, text, inlineMenu);
  } else {
    // Intentar manejar como comando
    await handleCommand(token, chatId, text, inlineMenu);
  }

  return res.status(200).send('OK');
}

// Función auxiliar para procesar comandos (Notas, Asistencia, etc)
async function handleCommand(token, chatId, cmd, menu) {
  const text = cmd.toUpperCase();

  // 1. NOTAS
  if (text.includes('NOTAS')) {
    try {
      const userDoc = await db.doc(`artifacts/${firebaseAppId}/public/data/telegram_users/${chatId}`).get();
      if (!userDoc.exists) return await sendTelegramMessage(token, chatId, "⚠️ No has vinculado un estudiante.");
      
      const studentCode = userDoc.data().studentCode;
      const subjectsSnap = await db.collection(`artifacts/${firebaseAppId}/public/data/subjects`).get();
      
      let studentName = "";
      let found = false;
      let reportBody = "";

      subjectsSnap.forEach(subDoc => {
        const sub = subDoc.data();
        const student = (sub.students || []).find(s => s.code === studentCode);
        if (student) {
          found = true;
          if (!studentName) studentName = student.name;
          reportBody += `📘 *${sub.name || 'Materia'}*\n`;
          const grades = sub.grades || {};
          let annualSum = 0;
          let trimestersWithData = 0;
          for (let t = 1; t <= 3; t++) {
            const triGrades = grades[t] || {};
            const stuGrades = triGrades[student.id] || {};
            const vals = Object.values(stuGrades).filter(v => typeof v === 'number');
            if (vals.length > 0) {
              const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
              annualSum += avg; trimestersWithData++;
              reportBody += `   T${t}: *${avg.toFixed(2)}*`;
            }
          }
          if (trimestersWithData > 0) {
            const finalAvg = annualSum / 3;
            reportBody += `\n   *FINAL ANUAL: ${finalAvg.toFixed(2)}*\n\n`;
          } else { reportBody += `\n   _Sin calificaciones aún_\n\n`; }
        }
      });

      if (!found) await sendTelegramMessage(token, chatId, "No se encontraron materias.");
      else {
        let report = `📊 *Reporte de Calificaciones*\nCódigo: ${studentCode}\n`;
        if (studentName) report += `Estudiante: ${studentName}\n`;
        report += `\n` + reportBody;
        await sendTelegramMessage(token, chatId, report, menu);
      }
    } catch (e) { await sendTelegramMessage(token, chatId, `⚠️ Error: ${e.message}`); }
  }

  // 2. COMUNICADOS
  else if (text.includes('COMUNICADOS') || text.includes('AVISOS')) {
    try {
      const userDoc = await db.doc(`artifacts/${firebaseAppId}/public/data/telegram_users/${chatId}`).get();
      if (!userDoc.exists) return;
      const studentCode = userDoc.data().studentCode;
      const settingsDoc = await db.doc(`artifacts/${firebaseAppId}/public/data/settings/general`).get();
      const globalAnn = settingsDoc.exists ? (settingsDoc.data().announcements || []) : [];
      const subjectsSnap = await db.collection(`artifacts/${firebaseAppId}/public/data/subjects`).get();
      let subjectAnn = [];
      let studentName = "";
      subjectsSnap.forEach(subDoc => {
        const sub = subDoc.data();
        const student = (sub.students || []).find(s => s.code === studentCode);
        if (student) {
          if (!studentName) studentName = student.name;
          const anns = (sub.announcements || []).map(a => ({ ...a, subjectName: sub.name }));
          subjectAnn = subjectAnn.concat(anns);
        }
      });
      const allAnn = [...globalAnn, ...subjectAnn];
      const uniqueAnn = Array.from(new Map(allAnn.map(a => [a.id, a])).values())
        .sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0)).slice(0, 10);

      if (uniqueAnn.length === 0) await sendTelegramMessage(token, chatId, "📭 No hay comunicados recientes.", menu);
      else {
        let report = `📢 *Comunicados y Avisos*\n`;
        if (studentName) report += `Estudiante: ${studentName}\n\n`;
        uniqueAnn.forEach(ann => {
          const typeIcon = ann.type === 'urgent' ? '🚨' : ann.type === 'event' ? '🗓️' : '📝';
          const source = ann.subjectName ? `[${ann.subjectName}]` : '[Global]';
          report += `${typeIcon} *${ann.title}* ${source}\n_${ann.date}_\n${ann.body}\n\n`;
        });
        await sendTelegramMessage(token, chatId, report, menu);
      }
    } catch (e) { await sendTelegramMessage(token, chatId, `⚠️ Error: ${e.message}`); }
  }

  // 3. ASISTENCIA
  else if (text.includes('ASISTENCIA') || text.includes('FALTAS')) {
    try {
      const userDoc = await db.doc(`artifacts/${firebaseAppId}/public/data/telegram_users/${chatId}`).get();
      if (!userDoc.exists) return;
      const studentCode = userDoc.data().studentCode;
      const subjectsSnap = await db.collection(`artifacts/${firebaseAppId}/public/data/subjects`).get();
      let studentName = "", found = false, reportBody = "", totalAbsences = 0;
      subjectsSnap.forEach(subDoc => {
        const sub = subDoc.data();
        const student = (sub.students || []).find(s => s.code === studentCode);
        if (student) {
          found = true; if (!studentName) studentName = student.name;
          const attendance = sub.attendance?.[student.id] || {};
          const absences = Object.entries(attendance).filter(([d, r]) => r.status === 'F').sort((a, b) => b[0].localeCompare(a[0]));
          if (absences.length > 0) {
            totalAbsences += absences.length;
            reportBody += `📙 *${sub.name}*\n   Faltas: *${absences.length}*\n`;
            absences.slice(0, 3).forEach(([d, r]) => { reportBody += `   • ${d}${r.note ? ` (${r.note})` : ''}\n`; });
            reportBody += `\n`;
          }
        }
      });
      if (!found) await sendTelegramMessage(token, chatId, "No se encontraron materias.");
      else {
        let report = `📅 *Reporte de Asistencia*\n`;
        if (studentName) report += `Estudiante: ${studentName}\n`;
        report += `Total Faltas: *${totalAbsences}*\n\n${totalAbsences === 0 ? "✅ ¡Excelente! No se registran faltas." : reportBody}`;
        await sendTelegramMessage(token, chatId, report, menu);
      }
    } catch (e) { await sendTelegramMessage(token, chatId, `⚠️ Error: ${e.message}`); }
  }

  // 4. PERFIL
  else if (text.includes('PERFIL') || text.includes('CARNET')) {
    try {
      const userDoc = await db.doc(`artifacts/${firebaseAppId}/public/data/telegram_users/${chatId}`).get();
      if (!userDoc.exists) return;
      const studentCode = userDoc.data().studentCode;
      const profileDoc = await db.doc(`artifacts/${firebaseAppId}/public/data/parentProfiles/${studentCode}`).get();
      const profile = profileDoc.exists ? profileDoc.data().formData : null;
      let studentName = "";
      const subjectsSnap = await db.collection(`artifacts/${firebaseAppId}/public/data/subjects`).get();
      subjectsSnap.forEach(sd => {
        const s = (sd.data().students || []).find(st => st.code === studentCode);
        if (s && !studentName) studentName = s.name;
      });
      let report = `👤 *Perfil del Estudiante*\nNombre: *${studentName || 'No registrado'}*\nCódigo: \`${studentCode}\`\n\n`;
      if (profile) {
        report += `📍 Dirección: ${profile.studentAddress || '-'}\n🩸 Tipo Sangre: ${profile.studentBloodType || '-'}\n📞 Teléfono: ${profile.studentPhone || '-'}\n👨‍👩‍👧 *Representante:* ${profile.representante1?.name || '-'}\n📱 Contacto: ${profile.representante1?.phone || '-'}`;
      } else { report += `_Faltan datos de perfil._`; }
      await sendTelegramMessage(token, chatId, report, menu);
    } catch (e) { await sendTelegramMessage(token, chatId, `⚠️ Error: ${e.message}`); }
  }
}

// Función auxiliar para vinculación
async function handleLinking(token, chatId, studentCode, menu) {
  try {
    const profileDoc = await db.doc(`artifacts/${firebaseAppId}/public/data/parentProfiles/${studentCode}`).get();
    if (profileDoc.exists) {
      const regRef = db.doc(`artifacts/${firebaseAppId}/public/data/telegram_registrations/${studentCode}`);
      const regDoc = await regRef.get();
      let chatIds = regDoc.exists ? (regDoc.data().chatIds || []) : [];
      if (!chatIds.includes(chatId)) {
        chatIds.push(chatId);
        await regRef.set({ chatIds, updatedAt: new Date().toISOString() }, { merge: true });
      }
      let studentName = "";
      const subjectsSnap = await db.collection(`artifacts/${firebaseAppId}/public/data/subjects`).get();
      subjectsSnap.forEach(subDoc => {
        const s = (subDoc.data().students || []).find(st => st.code === studentCode);
        if (s && !studentName) studentName = s.name;
      });
      await db.doc(`artifacts/${firebaseAppId}/public/data/telegram_users/${chatId}`).set({ studentCode, updatedAt: new Date().toISOString() });
      const welcomeMsg = studentName ? `✅ ¡Vinculación exitosa para *${studentName}*!\n\nUsa el menú para consultar:` : `✅ ¡Vinculación exitosa!`;
      await sendTelegramMessage(token, chatId, welcomeMsg, menu);
    } else {
      await sendTelegramMessage(token, chatId, "❌ Código no encontrado.");
    }
  } catch (e) { await sendTelegramMessage(token, chatId, `⚠️ Error: ${e.message}`); }
}

async function sendTelegramMessage(token, chatId, text, keyboard = null) {
  const body = { chat_id: chatId, text: text, parse_mode: 'Markdown' };
  if (keyboard) body.reply_markup = keyboard;
  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
}
