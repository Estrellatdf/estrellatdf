
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

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const token = "8714699056:AAEMenEJAvtlpecmm6qJQ-2DtnRJ4K2siJs";
  const { message, callback_query } = req.body;

  if (initError) {
    console.error("Firebase Admin Initialization Error:", initError);
    const chatId = message?.chat?.id || callback_query?.message?.chat?.id;
    if (chatId) {
      try {
        await sendTelegramMessage(token, chatId, `⚠️ *Error de Servidor*\nNo se pudo inicializar la base de datos (Firebase Admin).\n\n*Detalles:* \`${initError.message}\`\n\nPor favor, verifica la variable de entorno \`FIREBASE_SERVICE_ACCOUNT\` en tu panel de Vercel.`);
      } catch (sendErr) {
        console.error("Failed to send initialization error to Telegram:", sendErr);
      }
    }
    return res.status(200).send('OK');
  }

  // Menu Inline
  const inlineMenu = {
    inline_keyboard: [
      [{ text: "📊 Notas", callback_data: "NOTAS" }, { text: "📅 Asistencia", callback_data: "ASISTENCIA" }],
      [{ text: "📢 Avisos", callback_data: "COMUNICADOS" }, { text: "📚 Deberes", callback_data: "DEBERES" }],
      [{ text: "👥 Mis Hijos", callback_data: "HIJOS" }, { text: "👤 Perfil", callback_data: "PERFIL" }]
    ]
  };

  // --- MANEJO DE CLICS EN BOTONES (Callback Query) ---
  if (callback_query) {
    const chatId = callback_query.message.chat.id;
    const data = callback_query.data;
    
    if (data.startsWith('SET_ACTIVE_')) {
      const code = data.replace('SET_ACTIVE_', '');
      await db.doc(`artifacts/${firebaseAppId}/public/data/telegram_users/${chatId}`).update({ studentCode: code });
      await sendTelegramMessage(token, chatId, `🔄 Estudiante seleccionado: *${code}*\nAhora puedes consultar su información.`, inlineMenu);
    } else if (data.startsWith('DET_NOTAS_')) {
      const subjectId = data.replace('DET_NOTAS_', '');
      await handleDetailedGrades(token, chatId, subjectId);
    } else {
      await handleCommand(token, chatId, data, inlineMenu);
    }
    return res.status(200).send('OK');
  }

  if (!message || !message.text) {
    return res.status(200).send('OK');
  }

  const chatId = message.chat.id;
  const text = message.text.trim().toUpperCase();

  // --- MANEJO DE MENSAJES DE TEXTO ---
  const isMenuCommand = text === '/START' || text === 'MENU' || text === 'INICIO';
  
  // Lista de comandos conocidos para evitar que se interpreten como códigos
  const knownCommands = [
    'NOTAS', 'ASISTENCIA', 'FALTAS', 
    'COMUNICADOS', 'AVISOS', 
    'DEBERES', 'TAREAS', 'ACTIVIDADES', 
    'HIJOS', 'PERFIL', 'CARNET', 
    'HELP_LINK'
  ];
  const isKnownCommand = knownCommands.some(cmd => text.includes(cmd));

  // Intentar extraer un código de estudiante de 6 dígitos del texto
  // Usamos límites de palabra (\b) para extraer exactamente un token de 6 caracteres con el alfabeto del bot
  const codeMatch = text.match(/\b[A-HJ-NP-Z2-9]{6}\b/);
  const extractedCode = (!isMenuCommand && !isKnownCommand && codeMatch) ? codeMatch[0] : null;

  if (isMenuCommand) {
    const userDoc = await db.doc(`artifacts/${firebaseAppId}/public/data/telegram_users/${chatId}`).get();
    
    if (!userDoc.exists) {
      await sendTelegramMessage(token, chatId, "¡Bienvenido al sistema de notificaciones de la U.E. 19 de Agosto!\n\nPor favor, envíame el **CÓDIGO DE ESTUDIANTE** para vincular este chat.");
    } else {
      const userData = userDoc.data();
      const activeCode = userData.studentCode;
      await sendTelegramMessage(token, chatId, `🏠 *Menú Principal*\nEstudiante activo: \`${activeCode}\`\nSelecciona una opción:`, inlineMenu);
    }
  } else if (extractedCode) {
    await handleLinking(token, chatId, extractedCode, inlineMenu);
  } else {
    await handleCommand(token, chatId, text, inlineMenu);
  }

  return res.status(200).send('OK');
}

// Función auxiliar para procesar comandos
async function handleCommand(token, chatId, cmd, menu) {
  const text = cmd.toUpperCase();
  const userDoc = await db.doc(`artifacts/${firebaseAppId}/public/data/telegram_users/${chatId}`).get();
  if (!userDoc.exists) return await sendTelegramMessage(token, chatId, "⚠️ No has vinculado un estudiante.");
  
  const userData = userDoc.data();
  const studentCode = userData.studentCode;
  const allCodes = userData.studentCodes || [studentCode];

  // 0. CAMBIAR HIJO / GESTIONAR
  if (text.includes('HIJOS')) {
    try {
      const subjectsSnap = await db.collection(`artifacts/${firebaseAppId}/public/data/subjects`).get();
      let studentsInfo = [];
      for (const code of allCodes) {
        let name = "";
        subjectsSnap.forEach(sd => {
          const s = (sd.data().students || []).find(st => st.code === code);
          if (s && !name) name = s.name;
        });
        studentsInfo.push({ code, name });
      }
      const hijoButtons = {
        inline_keyboard: studentsInfo.map(s => ([{ text: `👤 ${s.name || s.code}`, callback_data: `SET_ACTIVE_${s.code}` }]))
      };
      hijoButtons.inline_keyboard.push([{ text: "➕ Vincular otro hijo", callback_data: "HELP_LINK" }]);
      await sendTelegramMessage(token, chatId, "👥 *Mis Estudiantes Vinculados*\nToca un nombre para seleccionarlo como activo:", hijoButtons);
    } catch (e) { await sendTelegramMessage(token, chatId, `⚠️ Error: ${e.message}`); }
    return;
  }

  if (text === "HELP_LINK") {
    return await sendTelegramMessage(token, chatId, "Para vincular a otro estudiante, simplemente envíame su **CÓDIGO DE 6 DÍGITOS** en cualquier momento.");
  }

  // 1. NOTAS
  if (text.includes('NOTAS')) {
    try {
      const subjectsSnap = await db.collection(`artifacts/${firebaseAppId}/public/data/subjects`).get();
      let studentName = "", found = false, reportBody = "";
      let subjectButtons = [];
      
      subjectsSnap.forEach(subDoc => {
        const sub = subDoc.data();
        const student = (sub.students || []).find(s => s.code === studentCode);
        
        if (student) {
          found = true; if (!studentName) studentName = student.name;
          reportBody += `📘 *${sub.name || 'Materia'}*\n`;
          subjectButtons.push([{ text: `🔍 Ver ${sub.name}`, callback_data: `DET_NOTAS_${subDoc.id}` }]);
          
          const grades = sub.grades || {};
          let annualSum = 0, trimestersWithData = 0;
          
          for (let t = 1; t <= 3; t++) {
            const acts = (sub.activities?.[t]) || [];
            const triGrades = grades[t]?.[student.id] || {};
            
            if (acts.length > 0 || triGrades['exam_final'] || triGrades['project_final']) {
              // Cálculo resumido (Fórmula 70/30)
              let sumActs = 0;
              acts.forEach(a => sumActs += (triGrades[a.id] || 0));
              const avgActs = acts.length > 0 ? sumActs / acts.length : 0;
              const wAct = avgActs * 0.7;
              const ex = parseFloat(triGrades['exam_final'] || 0);
              const pr = parseFloat(triGrades['project_final'] || 0);
              const wEx = (triGrades['project_final'] !== undefined) ? ((ex + pr) / 2) * 0.3 : ex * 0.3;
              
              const triTotal = wAct + wEx;
              annualSum += triTotal;
              trimestersWithData++;
              reportBody += `   T${t}: *${triTotal.toFixed(2)}*`;
            }
          }
          
          if (trimestersWithData > 0) {
            const finalAvg = annualSum / 3;
            const status = finalAvg >= 7 ? "✅ APROBADO" : "⚠️ SUPLETORIO / REMEDIAL";
            reportBody += `\n   *FINAL ANUAL: ${finalAvg.toFixed(2)}*\n   Estado: ${status}\n\n`;
          } else { reportBody += `\n   _Sin calificaciones_\n\n`; }
        }
      });
      
      if (!found) await sendTelegramMessage(token, chatId, "No se encontraron materias.");
      else {
        let report = `📊 *Resumen de Notas: ${studentName}*\nCódigo: ${studentCode}\n\n${reportBody}`;
        await sendTelegramMessage(token, chatId, report, { inline_keyboard: subjectButtons });
      }
    } catch (e) { await sendTelegramMessage(token, chatId, `⚠️ Error: ${e.message}`); }
  }

  // 2. COMUNICADOS (Solo vigentes: últimos 7 días o eventos futuros)
  else if (text.includes('COMUNICADOS') || text.includes('AVISOS')) {
    try {
      const settingsDoc = await db.doc(`artifacts/${firebaseAppId}/public/data/settings/general`).get();
      const globalAnn = settingsDoc.exists ? (settingsDoc.data().announcements || []) : [];
      const subjectsSnap = await db.collection(`artifacts/${firebaseAppId}/public/data/subjects`).get();
      let subjectAnn = [], studentName = "";
      
      subjectsSnap.forEach(subDoc => {
        const sub = subDoc.data();
        const student = (sub.students || []).find(s => s.code === studentCode);
        if (student) {
          if (!studentName) studentName = student.name;
          const anns = (sub.announcements || []).map(a => ({ ...a, subjectName: sub.name }));
          subjectAnn = subjectAnn.concat(anns);
        }
      });

      const now = new Date();
      const sevenDaysAgo = new Date(now.getTime() - (7 * 24 * 60 * 60 * 1000));
      
      const allAnn = [...globalAnn, ...subjectAnn];
      const activeAnn = Array.from(new Map(allAnn.map(a => [a.id, a])).values())
        .filter(ann => {
          const annDate = new Date(ann.date || 0);
          const isRecent = annDate >= sevenDaysAgo;
          const isFuture = annDate > now;
          return isRecent || isFuture;
        })
        .sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));

      if (activeAnn.length === 0) await sendTelegramMessage(token, chatId, "📭 No hay avisos nuevos o pendientes de esta semana.", menu);
      else {
        let report = `📢 *Avisos Recientes: ${studentName}*\n\n`;
        activeAnn.forEach(ann => {
          const typeIcon = ann.type === 'urgent' ? '🚨' : ann.type === 'event' ? '🗓️' : '📝';
          report += `${typeIcon} *${ann.title}* [${ann.subjectName || 'Global'}]\n_${ann.date}_\n${ann.body}\n\n`;
        });
        await sendTelegramMessage(token, chatId, report, menu);
      }
    } catch (e) { await sendTelegramMessage(token, chatId, `⚠️ Error: ${e.message}`); }
  }

  // 3. ASISTENCIA (Semanal + Acumulado)
  else if (text.includes('ASISTENCIA') || text.includes('FALTAS')) {
    try {
      const subjectsSnap = await db.collection(`artifacts/${firebaseAppId}/public/data/subjects`).get();
      let studentName = "", found = false, reportBody = "", totalAbsences = 0;
      
      const now = new Date();
      const startOfWeek = new Date(now.getTime() - (now.getDay() - 1) * 24 * 60 * 60 * 1000); // Lunes
      startOfWeek.setHours(0,0,0,0);

      subjectsSnap.forEach(subDoc => {
        const sub = subDoc.data();
        const student = (sub.students || []).find(s => s.code === studentCode);
        if (student) {
          found = true; if (!studentName) studentName = student.name;
          const attendance = sub.attendance?.[student.id] || {};
          
          const allAbsences = Object.entries(attendance).filter(([d, r]) => r.status === 'A');
          totalAbsences += allAbsences.length;

          const weekAbsences = allAbsences.filter(([dateStr]) => {
            const d = new Date(dateStr.split('#')[0]); // Quitar el id de sesión si existe
            return d >= startOfWeek;
          }).sort((a, b) => b[0].localeCompare(a[0]));

          if (weekAbsences.length > 0) {
            reportBody += `📙 *${sub.name}*\n   Faltas esta semana: *${weekAbsences.length}*\n`;
            weekAbsences.forEach(([d, r]) => { reportBody += `   • ${d}${r.note ? ` (${r.note})` : ''}\n`; });
            reportBody += `\n`;
          }
        }
      });

      if (!found) await sendTelegramMessage(token, chatId, "No se encontraron materias.");
      else {
        let report = `📅 *Control de Asistencia: ${studentName}*\n\n`;
        report += `📊 *Resumen Anual:* ${totalAbsences} faltas acumuladas.\n`;
        report += `🗓️ *Esta Semana:*\n${reportBody || "✅ Sin faltas esta semana."}`;
        await sendTelegramMessage(token, chatId, report, menu);
      }
    } catch (e) { await sendTelegramMessage(token, chatId, `⚠️ Error: ${e.message}`); }
  }

  // 4. DEBERES (Filtrado por pendientes)
  else if (text.includes('DEBERES') || text.includes('TAREAS') || text.includes('ACTIVIDADES')) {
    try {
      const subjectsSnap = await db.collection(`artifacts/${firebaseAppId}/public/data/subjects`).get();
      let studentName = "", found = false, reportBody = "";
      
      subjectsSnap.forEach(subDoc => {
        const sub = subDoc.data();
        const student = (sub.students || []).find(s => s.code === studentCode);
        
        if (student) {
          found = true; if (!studentName) studentName = student.name;
          let pendingActs = [];
          
          [1, 2, 3].forEach(t => {
            const trimesterGrades = sub.grades?.[t]?.[student.id] || {};
            const acts = (sub.activities?.[t] || []).filter(a => {
              // Condición: Tiene descripción Y NO tiene nota aún
              const hasDescription = !!a.description;
              const hasGrade = trimesterGrades[a.id] !== undefined && trimesterGrades[a.id] !== null;
              return hasDescription && !hasGrade;
            });
            
            if (acts.length > 0) pendingActs = pendingActs.concat(acts.map(a => ({ ...a, trimester: t })));
          });

          if (pendingActs.length > 0) {
            reportBody += `📙 *${sub.name}*\n`;
            pendingActs.forEach(act => {
              reportBody += `   • *${act.name}* (T${act.trimester})\n     _${act.description}_\n`;
            });
            reportBody += `\n`;
          }
        }
      });

      if (!found) await sendTelegramMessage(token, chatId, "No se encontraron materias.");
      else {
        let report = `📚 *Deberes Pendientes: ${studentName}*\n_Solo se muestran tareas sin calificar._\n\n${reportBody || "✅ ¡Felicidades! No hay deberes pendientes registrados."}`;
        await sendTelegramMessage(token, chatId, report, menu);
      }
    } catch (e) { await sendTelegramMessage(token, chatId, `⚠️ Error: ${e.message}`); }
  }

  // 5. PERFIL
  else if (text.includes('PERFIL') || text.includes('CARNET')) {
    try {
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
    // 1. Buscar el nombre del estudiante en todas las materias para validar el código
    let studentName = "";
    const subjectsSnap = await db.collection(`artifacts/${firebaseAppId}/public/data/subjects`).get();
    subjectsSnap.forEach(subDoc => {
      const s = (subDoc.data().students || []).find(st => st.code === studentCode);
      if (s && !studentName) studentName = s.name;
    });

    // 2. Si no se encontró el nombre en materias, verificar si existe al menos el perfil
    let codeIsValid = !!studentName;
    if (!codeIsValid) {
      const profileDoc = await db.doc(`artifacts/${firebaseAppId}/public/data/parentProfiles/${studentCode}`).get();
      codeIsValid = profileDoc.exists;
    }

    if (codeIsValid) {
      // 3. Actualizar registros de emisión de notificaciones
      const regRef = db.doc(`artifacts/${firebaseAppId}/public/data/telegram_registrations/${studentCode}`);
      const regDoc = await regRef.get();
      let chatIds = regDoc.exists ? (regDoc.data().chatIds || []) : [];
      if (!chatIds.includes(chatId)) {
        chatIds.push(chatId);
        await regRef.set({ chatIds, updatedAt: new Date().toISOString() }, { merge: true });
      }

      // 4. Actualizar perfil de usuario Telegram (Soporte Multi-Hijo)
      const userRef = db.doc(`artifacts/${firebaseAppId}/public/data/telegram_users/${chatId}`);
      const userDoc = await userRef.get();
      let studentCodes = userDoc.exists ? (userDoc.data().studentCodes || []) : [];
      
      // Si existía un studentCode individual viejo, migrarlo a la lista
      if (userDoc.exists && userDoc.data().studentCode && !studentCodes.includes(userDoc.data().studentCode)) {
        studentCodes.push(userDoc.data().studentCode);
      }
      if (!studentCodes.includes(studentCode)) {
        studentCodes.push(studentCode);
      }

      await userRef.set({ 
        studentCode, // El último vinculado queda como activo
        studentCodes, 
        updatedAt: new Date().toISOString() 
      }, { merge: true });

      const welcomeMsg = studentName 
        ? `✅ ¡Vinculación exitosa para *${studentName}*!\n\nSe ha añadido a tu lista. Ahora puedes consultar su información o cambiar de estudiante en el menú.`
        : `✅ ¡Vinculación exitosa!\n\nSe ha añadido a tu lista. Recuerda completar los datos del representante en el portal web para ver el perfil completo.`;

      await sendTelegramMessage(token, chatId, welcomeMsg, menu);
    } else {
      await sendTelegramMessage(token, chatId, "❌ Código no encontrado. Asegúrate de que el docente ya haya registrado al estudiante y te haya proporcionado el código correcto.");
    }
  } catch (e) { await sendTelegramMessage(token, chatId, `⚠️ Error: ${e.message}`); }
}

async function handleDetailedGrades(token, chatId, subjectId) {
  try {
    const userDoc = await db.doc(`artifacts/${firebaseAppId}/public/data/telegram_users/${chatId}`).get();
    const studentCode = userDoc.data().studentCode;
    const subDoc = await db.doc(`artifacts/${firebaseAppId}/public/data/subjects/${subjectId}`).get();
    
    if (!subDoc.exists) return await sendTelegramMessage(token, chatId, "No se encontró la materia.");
    
    const sub = subDoc.data();
    const student = (sub.students || []).find(s => s.code === studentCode);
    if (!student) return await sendTelegramMessage(token, chatId, "Estudiante no inscrito en esta materia.");

    let report = `🔎 *Detalle: ${sub.name}*\nEstudiante: ${student.name}\n\n`;
    
    [1, 2, 3].forEach(t => {
      const acts = (sub.activities?.[t]) || [];
      const triGrades = sub.grades?.[t]?.[student.id] || {};
      
      if (acts.length > 0 || triGrades['exam_final'] || triGrades['project_final']) {
        report += `*TRIMESTRE ${t}*\n`;
        acts.forEach(a => {
          const g = triGrades[a.id] !== undefined ? triGrades[a.id] : '-';
          report += `• ${a.name}: *${g}*\n`;
        });
        
        const ex = triGrades['exam_final'] !== undefined ? triGrades['exam_final'] : '-';
        const pr = triGrades['project_final'] !== undefined ? triGrades['project_final'] : '-';
        report += `📝 Examen: *${ex}*\n🎨 Proyecto: *${pr}*\n`;
        
        // Calcular total trimestral para el detalle
        let sumActs = 0;
        acts.forEach(a => sumActs += (triGrades[a.id] || 0));
        const avgActs = acts.length > 0 ? sumActs / acts.length : 0;
        const wAct = avgActs * 0.7;
        const exVal = parseFloat(triGrades['exam_final'] || 0);
        const prVal = parseFloat(triGrades['project_final'] || 0);
        const wEx = (triGrades['project_final'] !== undefined) ? ((exVal + prVal) / 2) * 0.3 : exVal * 0.3;
        report += `📉 Promedio T${t}: *${(wAct + wEx).toFixed(2)}*\n\n`;
      }
    });

    await sendTelegramMessage(token, chatId, report, { 
      inline_keyboard: [[{ text: "⬅️ Volver a Notas", callback_data: "NOTAS" }]] 
    });
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
