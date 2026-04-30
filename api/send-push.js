export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { title, body, studentCode, isGlobal } = req.body;
  const appId = "2a9779af-a413-47f6-9196-9be1bf792bbe";
  const restApiKey = process.env.ONESIGNAL_REST_API_KEY;

  if (!restApiKey) {
    return res.status(500).json({ 
      error: 'ONESIGNAL_REST_API_KEY is not configured in environment variables' 
    });
  }

  const notificationBody = {
    app_id: appId,
    headings: { en: title, es: title },
    contents: { en: body, es: body },
    // URL to open when clicking the notification
    url: "https://estrellatdf---19-de-agosto.vercel.app/" 
  };

  if (isGlobal) {
    notificationBody.included_segments = ['All'];
  } else if (studentCode) {
    notificationBody.filters = [
      { field: 'tag', key: 'studentCode', relation: '=', value: studentCode.toUpperCase() }
    ];
  } else {
    return res.status(400).json({ error: 'Missing target (studentCode or isGlobal)' });
  }

  try {
    const response = await fetch('https://onesignal.com/api/v1/notifications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Authorization': `Basic ${restApiKey}`,
      },
      body: JSON.stringify(notificationBody),
    });

    const data = await response.json();
    if (!response.ok) {
      return res.status(response.status).json({ error: 'OneSignal API Error', details: data });
    }
    return res.status(200).json(data);
  } catch (error) {
    console.error('Error sending push notification:', error);
    return res.status(500).json({ error: 'Internal Server Error', message: error.message });
  }
}
