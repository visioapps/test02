// sw.js — Amblyup PWA — Notifications locales 7h55 + 18h00

const APP_URL = self.registration.scope;

// Calcule les ms jusqu'à la prochaine occurrence de h:m
function msUntilNext(h, m) {
  const now = new Date();
  const t = new Date(now);
  t.setHours(h, m, 0, 0);
  if (t <= now) t.setDate(t.getDate() + 1);
  return t.getTime() - now.getTime();
}

// Détermine l'œil du jour selon la prescription
function oeilDuJour() {
  const dow = new Date().getDay(); // 0=dim,1=lun,2=mar,3=mer,4=jeu,5=ven,6=sam
  if (dow === 1 || dow === 2) return 'Œil droit (OD) 👁';
  if (dow >= 3 && dow <= 5)   return 'Œil gauche (OG) 👁';
  return null; // sam/dim = pause
}

let _timerMatin = null;
let _timerSoir  = null;

function scheduleAll() {
  if (_timerMatin) clearTimeout(_timerMatin);
  if (_timerSoir)  clearTimeout(_timerSoir);

  // 7h55
  _timerMatin = setTimeout(async () => {
    const oeil = oeilDuJour();
    if (oeil) {
      await self.registration.showNotification('🏴‍☠️ Cache-œil de Jules !', {
        body: oeil + ' — Mets le cache maintenant ! Objectif 10h 🚀',
        icon: 'amblyup-logo.png',
        badge: 'amblyup-logo.png',
        vibrate: [200, 100, 200, 100, 200],
        tag: 'rappel-matin',
        renotify: true,
        data: { url: APP_URL, action: 'matin' },
        actions: [
          { action: 'ok',     title: '✅ Cache posé !' },
          { action: 'snooze', title: '⏰ +10 min' }
        ]
      });
    }
    scheduleAll(); // reprogramme pour le lendemain
  }, msUntilNext(7, 55));

  // 18h00
  _timerSoir = setTimeout(async () => {
    await self.registration.showNotification('🎉 Bravo Jules !', {
      body: "Il est 18h — retire le cache et dis-nous combien d'heures tu as porté ! ⭐",
      icon: 'amblyup-logo.png',
      badge: 'amblyup-logo.png',
      vibrate: [300, 100, 300],
      tag: 'rappel-soir',
      renotify: true,
      data: { url: APP_URL, action: 'soir' }
    });
    scheduleAll();
  }, msUntilNext(18, 0));
}

// ── Lifecycle ──
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', event => {
  event.waitUntil(clients.claim().then(() => scheduleAll()));
});

// ── Messages depuis l'app ──
self.addEventListener('message', event => {
  if (!event.data) return;

  if (event.data === 'SCHEDULE_NOTIFS') {
    scheduleAll();
    event.source && event.source.postMessage('SCHEDULED_OK');
  }

  // Boutons test dans Réglages
  if (event.data === 'TEST_MATIN') {
    const oeil = oeilDuJour() || 'Pause aujourd\'hui 😌';
    self.registration.showNotification('🏴‍☠️ Cache-œil de Jules ! [TEST]', {
      body: oeil + ' — Mets le cache maintenant ! Objectif 10h 🚀',
      icon: 'amblyup-logo.png',
      vibrate: [200, 100, 200],
      tag: 'test-matin',
      data: { url: APP_URL, action: 'matin' },
      actions: [
        { action: 'ok',     title: '✅ Cache posé !' },
        { action: 'snooze', title: '⏰ +10 min' }
      ]
    });
  }

  if (event.data === 'TEST_SOIR') {
    self.registration.showNotification('🎉 Bravo Jules ! [TEST]', {
      body: "Il est 18h — retire le cache et dis-nous combien d'heures tu as porté ! ⭐",
      icon: 'amblyup-logo.png',
      vibrate: [300, 100, 300],
      tag: 'test-soir',
      data: { url: APP_URL, action: 'soir' }
    });
  }
});

// ── Clic sur notification ──
self.addEventListener('notificationclick', event => {
  event.notification.close();

  // Snooze matin : reprogramme dans 10 min
  if (event.action === 'snooze') {
    setTimeout(() => {
      const oeil = oeilDuJour() || '';
      self.registration.showNotification('🏴‍☠️ Cache-œil de Jules !', {
        body: oeil + ' — Tu n\'as pas oublié le cache ? 😉',
        icon: 'amblyup-logo.png',
        vibrate: [200, 100, 200],
        tag: 'rappel-matin',
        renotify: true,
        data: { url: APP_URL, action: 'matin' }
      });
    }, 10 * 60 * 1000);
    return;
  }

  const isSoir = event.notification.data && event.notification.data.action === 'soir';
  const targetUrl = APP_URL;

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      for (const client of list) {
        if (client.url.startsWith(self.location.origin)) {
          client.focus();
          // Si notif soir → envoie message à l'app pour ouvrir la section "Jours à compléter"
          if (isSoir) {
            client.postMessage({ action: 'OPEN_PENDING' });
          }
          return;
        }
      }
      // Fenêtre fermée → ouvre l'app ; si soir, ajoute hash pour deep link
      return clients.openWindow(isSoir ? targetUrl + '?open=pending' : targetUrl);
    })
  );
});

// ── Push serveur futur ──
self.addEventListener('push', event => {
  if (!event.data) return;
  let d;
  try { d = event.data.json(); } catch(e) { d = { title: 'Amblyup', body: event.data.text() }; }
  event.waitUntil(self.registration.showNotification(d.title || 'Amblyup', {
    body: d.body || '',
    icon: 'amblyup-logo.png',
    vibrate: [200, 100, 200],
    tag: d.tag || 'amblyup',
    data: { url: d.url || APP_URL }
  }));
});
