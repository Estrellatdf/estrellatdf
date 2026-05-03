
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
  const { message } = req.body;

  if (!message || !message.text) {
    return res.status(200).send('OK');
  }

  const chatId = message.chat.id;
  const rawText = message.text.trim().toUpperCase();
  const text = rawText;

  // Teclado principal
  const mainMenu = {
    keyboard: [
      [{ text: "📊 NOTAS" }, { text: "📅 ASISTENCIA" }],
      [{ text: "📢 COMUNICADOS" }, { text: "👤 MI PERFIL" }]
    ],
    resize_keyboard: true,
    one_time_keyboard: false
  };

  // 1. Comandos básicos
  if (text === '/START' || text === 'MENU' || text === 'INICIO') {
    const userDoc = await db.doc(`artifacts/${firebaseAppId}/public/data/telegram_users/${chatId}`).get();
    
    if (!userDoc.exists) {
      await sendTelegramMessage(token, chatId, "¡Bienvenido al sistema de notificaciones de la U.E. 19 de Agosto!\n\nPor favor, envíame el **CÓDIGO DE ESTUDIANTE** para vincular este chat.");
    } else {
      await sendTelegramMessage(token, chatId, "🏠 *Menú Principal*\nSelecciona una opción para consultar:", mainMenu);
    }
    return res.status(200).send('OK');
  }

  // 2. Consulta de Notas
  if (text.includes('NOTAS')) {
    try {
      const userDoc = await db.doc(`artifacts/${firebaseAppId}/public/data/telegram_users/${chatId}`).get();
      
      if (!userDoc.exists) {
        await sendTelegramMessage(token, chatId, "⚠️ Aún no has vinculado un estudiante. Por favor, envía primero el **Código de Estudiante**.");
        return res.status(200).send('OK');
      }

      const studentCode = userDoc.data().studentCode;
      const subjectsSnap = await db.collection(`artifacts/${firebaseAppId}/public/data/subjects`).get();
      
      let studentName = "";
      let found = false;
      let reportBody = "";

      subjectsSnap.forEach(subDoc => {
        try {
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
                annualSum += avg;
                trimestersWithData++;
                reportBody += `   T${t}: *${avg.toFixed(2)}*`;
              }
            }
            if (trimestersWithData > 0) {
              const finalAvg = annualSum / 3;
              const status = finalAvg >= 7 ? "✅ APROBADO" : "⚠️ SUPLETORIO / REMEDIAL";
              reportBody += `\n   *FINAL ANUAL: ${finalAvg.toFixed(2)}*`;
              reportBody += `\n   Estado: ${status}\n\n`;
            } else {
              reportBody += `\n   _Sin calificaciones aún_\n\n`;
            }
          }
        } catch (innerErr) { console.error(innerErr); }
      });

      if (!found) {
        await sendTelegramMessage(token, chatId, "No se encontraron materias.");
      } else {
        let report = `📊 *Reporte de Calificaciones*\n`;
        report += `Código: ${studentCode}\n`;
        if (studentName) report += `Estudiante: ${studentName}\n`;
        report += `\n` + reportBody;
        await sendTelegramMessage(token, chatId, report, mainMenu);
      }
    } catch (e) {
      console.error(e);
      await sendTelegramMessage(token, chatId, `⚠️ Error: ${e.message}`);
    }
    return res.status(200).send('OK');
  }

  // 3. Comunicados y Avisos
  if (text.includes('COMUNICADOS') || text.includes('AVISOS')) {
    try {
      const userDoc = await db.doc(`artifacts/${firebaseAppId}/public/data/telegram_users/${chatId}`).get();
      if (!userDoc.exists) {
        await sendTelegramMessage(token, chatId, "⚠️ Aún no has vinculado un estudiante.");
        return res.status(200).send('OK');
      }

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
        .sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0))
        .slice(0, 10);

      if (uniqueAnn.length === 0) {
        await sendTelegramMessage(token, chatId, "📭 No hay comunicados recientes.", mainMenu);
      } else {
        let report = `📢 *Comunicados y Avisos*\n`;
        if (studentName) report += `Estudiante: ${studentName}\n\n`;
        
        uniqueAnn.forEach(ann => {
          const typeIcon = ann.type === 'urgent' ? '🚨' : ann.type === 'event' ? '🗓️' : '📝';
          const source = ann.subjectName ? `[${ann.subjectName}]` : '[Global]';
          report += `${typeIcon} *${ann.title}* ${source}\n`;
          report += `_${ann.date}_\n${ann.body}\n\n`;
        });
        
        await sendTelegramMessage(token, chatId, report, mainMenu);
      }
    } catch (e) {
      console.error(e);
      await sendTelegramMessage(token, chatId, `⚠️ Error: ${e.message}`);
    }
    return res.status(200).send('OK');
  }

  // 4. Consulta de Asistencia
  if (text.includes('ASISTENCIA') || text.includes('FALTAS')) {
    try {
      const userDoc = await db.doc(`artifacts/${firebaseAppId}/public/data/telegram_users/${chatId}`).get();
      if (!userDoc.exists) {
        await sendTelegramMessage(token, chatId, "⚠️ Aún no has vinculado un estudiante.");
        return res.status(200).send('OK');
      }

      const studentCode = userDoc.data().studentCode;
      const subjectsSnap = await db.collection(`artifacts/${firebaseAppId}/public/data/subjects`).get();
      
      let studentName = "";
      let found = false;
      let reportBody = "";
      let totalAbsences = 0;

      subjectsSnap.forEach(subDoc => {
        try {
          const sub = subDoc.data();
          const student = (sub.students || []).find(s => s.code === studentCode);
          
          if (student) {
            found = true;
            if (!studentName) studentName = student.name;
            
            const attendance = sub.attendance?.[student.id] || {};
            const absences = Object.entries(attendance)
              .filter(([date, record]) => record.status === 'F')
              .sort((a, b) => b[0].localeCompare(a[0]));

            if (absences.length > 0) {
              totalAbsences += absences.length;
              reportBody += `📙 *${sub.name || 'Materia'}*\n`;
              reportBody += `   Faltas: *${absences.length}*\n`;
              absences.slice(0, 3).forEach(([date, record]) => {
                reportBody += `   • ${date}${record.note ? ` (${record.note})` : ''}\n`;
              });
              reportBody += `\n`;
            }
          }
        } catch (innerErr) { console.error(innerErr); }
      });

      if (!found) {
        await sendTelegramMessage(token, chatId, "No se encontraron materias.");
      } else {
        let report = `📅 *Reporte de Asistencia*\n`;
        if (studentName) report += `Estudiante: ${studentName}\n`;
        report += `Total Faltas: *${totalAbsences}*\n\n`;
        
        if (totalAbsences === 0) {
          report += "✅ ¡Excelente! No se registran faltas.";
        } else {
          report += reportBody;
        }
        await sendTelegramMessage(token, chatId, report, mainMenu);
      }
    } catch (e) {
      console.error(e);
      await sendTelegramMessage(token, chatId, `⚠️ Error: ${e.message}`);
    }
    return res.status(200).send('OK');
  }

  // 5. Perfil / Datos (Nuevo)
  if (text.includes('PERFIL') || text.includes('CARNET')) {
    try {
      const userDoc = await db.doc(`artifacts/${firebaseAppId}/public/data/telegram_users/${chatId}`).get();
      if (!userDoc.exists) {
        await sendTelegramMessage(token, chatId, "⚠️ Aún no has vinculado un estudiante.");
        return res.status(200).send('OK');
      }

      const studentCode = userDoc.data().studentCode;
      const profileDoc = await db.doc(`artifacts/${firebaseAppId}/public/data/parentProfiles/${studentCode}`).get();
      const profile = profileDoc.exists ? profileDoc.data().formData : null;

      // Buscar el nombre del estudiante
      let studentName = "";
      const subjectsSnap = await db.collection(`artifacts/${firebaseAppId}/public/data/subjects`).get();
      subjectsSnap.forEach(subDoc => {
        const s = (subDoc.data().students || []).find(st => st.code === studentCode);
        if (s && !studentName) studentName = s.name;
      });

      let report = `👤 *Perfil del Estudiante*\n`;
      report += `Nombre: *${studentName || 'No registrado'}*\n`;
      report += `Código: \`${studentCode}\`\n\n`;

      if (profile) {
        report += `📍 Dirección: ${profile.studentAddress || 'No registrada'}\n`;
        report += `🩸 Tipo Sangre: ${profile.studentBloodType || '-'}\n`;
        report += `📞 Teléfono: ${profile.studentPhone || '-'}\n`;
        report += `🎂 F. Nacimiento: ${profile.studentBirthDate || '-'}\n\n`;
        report += `👨‍👩‍👧 *Representante:* ${profile.representante1?.name || '-'}\n`;
        report += `📱 Contacto: ${profile.representante1?.phone || '-'}`;
      } else {
        report += `_Faltan datos de perfil. Regístralos en la aplicación web._`;
      }

      await sendTelegramMessage(token, chatId, report, mainMenu);
    } catch (e) {
      console.error(e);
      await sendTelegramMessage(token, chatId, `⚠️ Error: ${e.message}`);
    }
    return res.status(200).send('OK');
  }

  // 6. Vincular código
  if (text.length === 6 && !text.includes('/')) {
    try {
      const profileDoc = await db.doc(`artifacts/${firebaseAppId}/public/data/parentProfiles/${text}`).get();
      
      if (profileDoc.exists) {
        const regRef = db.doc(`artifacts/${firebaseAppId}/public/data/telegram_registrations/${text}`);
        const regDoc = await regRef.get();
        let chatIds = regDoc.exists ? (regDoc.data().chatIds || []) : [];
        if (!chatIds.includes(chatId)) {
          chatIds.push(chatId);
          await regRef.set({ chatIds, updatedAt: new Date().toISOString() }, { merge: true });
        }

        let studentName = "";
        const subjectsSnap = await db.collection(`artifacts/${firebaseAppId}/public/data/subjects`).get();
        subjectsSnap.forEach(subDoc => {
          const s = (subDoc.data().students || []).find(st => st.code === text);
          if (s && !studentName) studentName = s.name;
        });

        await db.doc(`artifacts/${firebaseAppId}/public/data/telegram_users/${chatId}`).set({
          studentCode: text,
          updatedAt: new Date().toISOString()
        });

        const welcomeMsg = studentName 
          ? `✅ ¡Vinculación exitosa para *${studentName}*!\n\nYa puedes usar el menú de abajo para consultar información.`
          : `✅ ¡Vinculación exitosa!\n\nYa puedes usar el menú de abajo para consultar información.`;

        await sendTelegramMessage(token, chatId, welcomeMsg, mainMenu);
      } else {
        await sendTelegramMessage(token, chatId, "❌ Código no encontrado.");
      }
    } catch (e) {
      console.error(e);
      await sendTelegramMessage(token, chatId, `⚠️ Error: ${e.message}`);
    }
  }

  return res.status(200).send('OK');
}

async function sendTelegramMessage(token, chatId, text, keyboard = null) {
  const body = {
    chat_id: chatId,
    text: text,
    parse_mode: 'Markdown'
  };
  if (keyboard) {
    body.reply_markup = keyboard;
  }

  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
}
