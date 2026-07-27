import { useState, useEffect, useCallback, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { driver, type DriveStep } from 'driver.js';
import 'driver.js/dist/driver.css';
import { modal } from './admin/Modal';
import { inputStyle, btnStyle } from './admin/shared';
import { useUser } from '../context/UserContext';
import { apiFetch, apiPost, apiPatch, apiDelete } from '../api';
import PwaInstallPrompt from './PwaInstallPrompt';
import PushNotificationBanner from './PushNotificationBanner';
import { formatPhoneNumber } from '../utils/phone';
import { subscribeToPushNotifications, usePushSubscriptionStatus } from '../utils/push';
import { isPasskeySupported, registerPasskey, loginWithPasskey, tryConditionalPasskeyLogin, hasRegisteredPasskey } from '../utils/passkey';

interface Shift {
  id: number;
  date: string;
  slot: string;
  startMin?: number | null;
  endMin?: number | null;
  zeitslot: { name: string; startTime: string; endTime: string; color: string; order?: number } | null;
  arbeitsbereich: { name: string; icon: string; color: string; order?: number } | null;
  arbeitsbereichId: number | null;
  maxVolunteers: number;
}
interface VolunteerShift { id: number; userId: number; date: string; slot: string; role: string; areaId: string | null; shiftId: number | null; shift: Shift | null; ratingWorkload?: number | null; ratingOrganization?: number | null; ratingFun?: number | null; ratingComment?: string | null; }
interface VolunteerChild { id: number; childName: string; childYear: number; }
interface Volunteer { id: number; name: string; email: string | null; phone: string | null; tournamentId: number | null; role?: string; consentGiven?: boolean; consentDate?: string; children?: VolunteerChild[]; }
// Nur noch 2 Vereinsfarben (primary + secondary)
interface Club { id: number; name: string; logo: string | null; primaryColor: string; secondaryColor: string; }
interface FoodCategory { id: number; name: string; icon: string; items: { id: number; name: string; price: string | null; unit: string }[]; }
interface FoodDonation { id: number; foodItemId: number; quantity: number; note: string | null; createdAt: string; foodDonationSlotId: number | null; foodItem: { id: number; name: string; unit: string; category: { id: number; name: string; icon: string } } | null; }
interface FoodDonationSlot { id: number; tournamentId: number; yearGroupId: number | null; yearGroup?: { id: number; name: string; birthYearStart: number; birthYearEnd: number } | null; foodItemId: number | null; targetQuantity: number; collected: number; foodItem: { id: number; name: string; unit: string; icon: string } | null; }

interface SelfServiceViewProps {
  /** Nach Login: Direkt zum Admin-Bereich springen (nur für Admin/Organizer). */
  onLoginAsAdmin?: () => void;
}

export default function SelfServiceView({ onLoginAsAdmin }: SelfServiceViewProps) {
  const { volunteer: ctxVolunteer, token: ctxToken, isLoggedIn: ctxLoggedIn, role, isAdmin, isOrganizer, login: contextLogin, logout: contextLogout } = useUser();
  const queryClient = useQueryClient();
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [volunteerShifts, setVolunteerShifts] = useState<VolunteerShift[]>([]);
  const [tournament, setTournament] = useState<any>(null);
  const [filterDate, setFilterDate] = useState('');
  const [filterTimesOfDay, setFilterTimesOfDay] = useState<Set<'morgen' | 'mittag' | 'nachmittag' | 'abend'>>(new Set());
  const [busy, setBusy] = useState(false);
  const [showRegisterForm, setShowRegisterForm] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regPasswordConfirm, setRegPasswordConfirm] = useState('');
  const [regChildren, setRegChildren] = useState<{ childName: string; childYear: string }[]>([{ childName: '', childYear: '' }]);
  const [consentGiven, setConsentGiven] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editChildren, setEditChildren] = useState<{ childName: string; childYear: string }[]>([{ childName: '', childYear: '' }]);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [resetNewPassword, setResetNewPassword] = useState('');
  const [resetNewPasswordConfirm, setResetNewPasswordConfirm] = useState('');
  const [forgotMessage, setForgotMessage] = useState('');
  const [clubPrimary, setClubPrimary] = useState('#0d6efd');
  const [clubSecondary, setClubSecondary] = useState('#6c757d');
  const [clubAccent, setClubAccent] = useState('#198754');
  const [clubLogo, setClubLogo] = useState<string | null>(null);
  const [tournamentName, setTournamentName] = useState('');
  const [availableTournaments, setAvailableTournaments] = useState<{id: number, name: string, status?: string}[]>([]);
  const [selectedTournamentId, setSelectedTournamentId] = useState<number | null>(null);
  const [hasSponsor, setHasSponsor] = useState(false);
  const [sponsorName, setSponsorName] = useState<string | null>(null);
  const [sponsorUrl, setSponsorUrl] = useState<string | null>(null);
  const [sponsorLogo, setSponsorLogo] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const { supported: pushSupported, subscribed: pushSubscribed, setSubscribed: setPushSubscribed } = usePushSubscriptionStatus();
  const [pushMenuLoading, setPushMenuLoading] = useState(false);
  const [passkeySupported, setPasskeySupported] = useState(false);
  const [passkeyLoading, setPasskeyLoading] = useState(false);

  useEffect(() => {
    isPasskeySupported().then(setPasskeySupported).catch(() => setPasskeySupported(false));
  }, []);
  const [activeSection, setActiveSection] = useState<'jobs' | 'verpflegung'>('jobs');
  const [foodCategories, setFoodCategories] = useState<FoodCategory[]>([]);
  const [myDonations, setMyDonations] = useState<FoodDonation[]>([]);
  const [foodDonationSlots, setFoodDonationSlots] = useState<FoodDonationSlot[]>([]);
  const [donationFoodId, setDonationFoodId] = useState(0);
  const [donationQuantity, setDonationQuantity] = useState('');
  const [donationNote, setDonationNote] = useState('');
  const [slotCommitments, setSlotCommitments] = useState<Record<number, number>>({});
  const [showPinModal, setShowPinModal] = useState<{name: string, pin: string} | null>(null);
  const [ratingModalVs, setRatingModalVs] = useState<VolunteerShift | null>(null);
  const [rateWorkload, setRateWorkload] = useState<number>(3);
  const [rateOrganization, setRateOrganization] = useState<number>(5);
  const [rateFun, setRateFun] = useState<number>(5);
  const [rateComment, setRateComment] = useState<string>('');

  useEffect(() => {
    // Reset-Token aus URL auslesen
    const urlParams = new URLSearchParams(window.location.search);
    const tokenParam = urlParams.get('token');
    if (tokenParam) {
      setResetToken(tokenParam);
      setShowResetPassword(true);
      return;
    }

    const savedToken = localStorage.getItem('token');
    const savedVolunteer = localStorage.getItem('volunteer');
    if (savedToken && savedVolunteer) {
      try {
        const vol = JSON.parse(savedVolunteer);
        contextLogin(savedToken, vol as any);
        if (vol?.tournamentId) {
          fetchClubColors(vol.tournamentId);
        }
        apiFetch('/api/self/available', { headers: { Authorization: 'Bearer ' + savedToken } })
          .then(d => applyAvailableData(d))
          .catch(() => {});
      } catch {
        localStorage.removeItem('token');
        localStorage.removeItem('volunteer');
      }
    }
  }, []);

  // Polling: Daten alle 60 Sekunden neu laden, wenn der User eingeloggt ist.
  // So werden Admin-Änderungen (z.B. Ausplanen) automatisch sichtbar.
  // Zusätzlich sofort bei Rückkehr auf den Tab/das Fenster: wer die Self-Service-
  // Seite schon offen hatte, während im Admin-Bereich etwas geändert wurde, soll
  // nicht bis zu 60 Sekunden auf die Aktualisierung warten müssen.
  useEffect(() => {
    if (!ctxLoggedIn) return;
    const interval = setInterval(() => {
      loadAvailable().catch(() => {});
    }, 60000);
    const onVisible = () => {
      if (document.visibilityState === 'visible') loadAvailable().catch(() => {});
    };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', onVisible);
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', onVisible);
    };
  }, [ctxLoggedIn, ctxToken]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchClubColors = async (tournamentId: number) => {
    try {
      const t = await apiFetch('/api/tournaments/' + tournamentId);
      if (t?.club) {
        setClubPrimary(t.club.primaryColor || '#0d6efd');
        setClubSecondary(t.club.secondaryColor || '#6c757d');
        setClubLogo(t.club.logo || null);
      }
      if (t?.name) setTournamentName(t.name);
      setHasSponsor(t?.hasSponsor || false);
      setSponsorName(t?.sponsorName || null);
      setSponsorUrl(t?.sponsorUrl || null);
      setSponsorLogo(t?.logo || null);
    } catch (e) {
      console.error('fetchClubColors error:', e);
    }
  };

  const minToTime = (min: number | null | undefined) => {
    if (min == null) return '';
    const h = Math.floor(min / 60);
    const m = min % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  };

  /** Zeitblöcke für die Uhrzeit-Filter-Chips, in Minuten seit Mitternacht -
      zentral definiert statt als Magic Numbers verstreut. Morgen: bis 12:00,
      Mittag: 12:00–14:00, Nachmittag: 14:00–18:00, Abend: ab 18:00. */
  const TIME_BLOCKS = {
    morgen: { label: 'Morgen', startMin: 0, endMin: 720 },
    mittag: { label: 'Mittag', startMin: 720, endMin: 840 },
    nachmittag: { label: 'Nachmittag', startMin: 840, endMin: 1080 },
    abend: { label: 'Abend', startMin: 1080, endMin: 1440 }
  } as const;

  /** Schicht matched einen Zeitblock, sobald sie hineinragt - nicht nur, wenn
      sie darin beginnt. Eine Schicht 11:00–14:00 reicht z.B. in "Morgen" UND
      "Mittag" hinein und soll bei beiden Filtern auftauchen. */
  const shiftOverlapsBlock = (startMin: number | null | undefined, endMin: number | null | undefined, block: { startMin: number; endMin: number }): boolean => {
    if (startMin == null) return false;
    const end = endMin != null && endMin > startMin ? endMin : startMin + 1;
    return startMin < block.endMin && end > block.startMin;
  };

  /** Schicht liegt zeitlich komplett in der Vergangenheit (Ende vor jetzt). */
  const isPastShift = (dateStr: string, endMin: number | null | undefined): boolean => {
    if (!dateStr) return false;
    const end = new Date(dateStr);
    if (endMin != null) end.setHours(Math.floor(endMin / 60), endMin % 60, 0, 0);
    else end.setHours(23, 59, 59, 999);
    return new Date() > end;
  };

  /** Dezenter Füllgrad-Balken am unteren Rand einer Schicht-Kachel (0 belegt = rot, teilweise = gelb, voll = grün). */
  const FillBar = ({ assigned, max }: { assigned: number; max: number }) => {
    const ratio = max > 0 ? Math.min(1, assigned / max) : 0;
    const color = ratio >= 1 ? '#198754' : ratio > 0 ? '#ffc107' : '#dc3545';
    return (
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 4, background: '#e9ecef' }}>
        <div style={{ width: `${ratio * 100}%`, height: '100%', background: color, transition: 'width 0.3s' }} />
      </div>
    );
  };

  /** Übernimmt die Antwort von /api/self/available in den lokalen State. */
  const applyAvailableData = (d: any) => {
    if (!d) return;

    const mapShift = (s: any) => ({
      ...s,
      date: s.day?.date || s.date,
      zeitslot: s.daySlot || s.timeSlot || s.zeitslot,
      arbeitsbereichId: s.workArea?.id || s.arbeitsbereichId,
      maxVolunteers: s.maxVolunteers,
      startMin: s.startMin ?? s.daySlot?.startMin ?? s.timeSlot?.startMin ?? null,
      endMin: s.endMin ?? s.daySlot?.endMin ?? s.timeSlot?.endMin ?? null,
      arbeitsbereich: s.workArea || s.arbeitsbereich
    });

    setShifts(d.shifts ? d.shifts.map(mapShift) : []);
    
    setVolunteerShifts(d.volunteerShifts ? d.volunteerShifts.map((vs: any) => ({
      ...vs,
      date: vs.shift?.day?.date || vs.shift?.date || vs.date,
      shift: vs.shift ? mapShift(vs.shift) : null
    })) : []);

    if (d.tournament) {
      setTournament(d.tournament);
      setTournamentName(d.tournament.name || '');
      setSelectedTournamentId(d.tournament.id);
      setAvailableTournaments(d.availableTournaments || []);
      setHasSponsor(d.tournament.hasSponsor || false);
      setSponsorName(d.tournament.sponsorName || null);
      setSponsorUrl(d.tournament.sponsorUrl || null);
      setSponsorLogo(d.tournament.logo || null);
      if (d.tournament.club) {
        setClubPrimary(d.tournament.club.primaryColor || '#0d6efd');
        setClubSecondary(d.tournament.club.secondaryColor || '#6c757d');
        setClubLogo(d.tournament.club.logo || null);
      }
    }
  };

  /** Gemeinsame Nachbereitung für jeden erfolgreichen Login (Passwort oder Passkey). */
  const applyLoginResult = async (data: any) => {
    contextLogin(data.token, data.user || data.volunteer);
    const vol = data.user || data.volunteer;
    if (vol?.tournamentId) {
      fetchClubColors(vol.tournamentId);
    }
    try {
      const data2 = await apiFetch('/api/self/available', { headers: { Authorization: 'Bearer ' + data.token } });
      applyAvailableData(data2);
    } catch { /* Verfügbarkeitsdaten optional – Login trotzdem erfolgreich */ }

    // Trigger Web Push Erlaubnis
    import('../utils/push').then(m => m.subscribeToPushNotifications().catch(() => {}));
  };

  /**
   * Nach einem frischen Passwort-Login/einer Registrierung aktiv anbieten,
   * einen Passkey einzurichten - statt das nur versteckt im Menü verfügbar
   * zu machen. Nur wenn das Gerät Passkeys unterstützt UND der User noch
   * keinen hat (sonst würde man bei jedem Login erneut gefragt).
   */
  const maybeOfferPasskeySetup = async () => {
    try {
      if (!(await isPasskeySupported())) return;
      if (await hasRegisteredPasskey()) return;
      const wantsSetup = await modal.confirm({
        title: 'Face ID / Fingerabdruck einrichten?',
        message: 'Möchtest du dich künftig ohne Passwort anmelden - mit Face ID, Fingerabdruck oder Windows Hello auf diesem Gerät?',
        variant: 'info'
      });
      if (!wantsSetup) return;
      await registerPasskey();
      await modal.alert({ title: 'Eingerichtet 🎉', message: 'Face ID / Fingerabdruck ist jetzt für die Anmeldung auf diesem Gerät eingerichtet.' });
    } catch (e: any) {
      // Abbruch durch den Nutzer (z.B. Systemdialog verlassen) ist kein Fehler,
      // dafür keine zusätzliche Fehlermeldung nach einem gerade erst
      // erfolgreichen Login zeigen.
      if (e?.name !== 'NotAllowedError') {
        await modal.alert({ title: 'Hinweis', message: e?.message || 'Passkey konnte nicht eingerichtet werden.' });
      }
    }
  };

  const login = async () => {
    try {
      const data = await apiPost('/api/auth/login', { email: loginEmail, password: loginPassword });
      await applyLoginResult(data);
      setLoginEmail('');
      setLoginPassword('');
      await maybeOfferPasskeySetup();
    } catch (e: any) { await modal.alert({ title: 'Fehler', message: e?.message || 'Login fehlgeschlagen' }); }
  };

  /**
   * Explizite Anmeldung per Passkey ohne Identifier-Zwang: der Browser bietet
   * über den "discoverable" Flow selbst alle auf diesem Gerät hinterlegten
   * Passkeys für diese Seite an (Systemdialog), unabhängig davon, ob im
   * Namens-/E-Mail-Feld schon etwas eingetragen wurde.
   */
  const loginPasskey = async () => {
    setPasskeyLoading(true);
    try {
      const data = await loginWithPasskey();
      await applyLoginResult(data);
      setLoginEmail('');
      setLoginPassword('');
    } catch (e: any) {
      // Abbruch durch den Nutzer (z.B. Systemdialog verlassen) ist kein Fehler.
      if (e?.name !== 'NotAllowedError') {
        await modal.alert({ title: 'Fehler', message: e?.message || 'Anmeldung mit Passkey fehlgeschlagen' });
      }
    } finally {
      setPasskeyLoading(false);
    }
  };

  // Conditional UI: sobald der Login-Bildschirm lädt, bietet der Browser -
  // ganz ohne Klick - direkt im Login-Feld einen Passkey-Vorschlag an, falls
  // Browser/Gerät das unterstützen und ein passender Passkey hinterlegt ist
  // (siehe autoComplete="username webauthn" am Eingabefeld weiter unten).
  useEffect(() => {
    if (ctxLoggedIn) return;
    let cancelled = false;
    tryConditionalPasskeyLogin()
      .then(async data => {
        if (cancelled || !data) return;
        await applyLoginResult(data);
      })
      .catch((e: any) => {
        // Conditional UI fehlgeschlagen — normal bei Neu-Registrierung
        // oder wenn kein Passkey auf dem Gerät existiert. Kein Fehler.
        if (import.meta.env.DEV && e?.name !== 'AbortError') {
          console.debug('[ConditionalPasskey] Nicht verfügbar:', e?.name);
        }
      });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ctxLoggedIn]);

  const logout = useCallback(() => {
    contextLogout();
    setShifts([]); setVolunteerShifts([]);
  }, [contextLogout]);

  const startTour = () => {
    // #tour-pwa-install existiert nur, wenn der Install-Hinweis gerade
    // angezeigt wird (nicht schon installiert, nicht weggeklickt, auf diesem
    // Gerät überhaupt möglich) - Schritt nur dann einbauen, sonst würde
    // driver.js auf ein nicht vorhandenes Element zeigen wollen.
    const steps: DriveStep[] = [];
    if (document.querySelector('#tour-pwa-install')) {
      steps.push({ element: '#tour-pwa-install', popover: { title: '📲 App installieren', description: 'Das ist kein Werbebanner, sondern lohnt sich wirklich: Als installierte App bekommst du Schicht-Updates direkt aufs Handy - ganz ohne E-Mail-Adresse - und findest die Seite künftig per Fingertipp auf deinem Homescreen, ohne die Adresse erneut einzutippen.', side: 'bottom' } });
    }
    steps.push(
      { element: '#tour-header', popover: { title: 'Dein Turnier', description: 'Hier siehst du, für welches Turnier du gerade eingeteilt bist. Falls du bei mehreren Turnieren aktiv bist, kannst du hier wechseln.', side: 'bottom' } },
      { element: '#tour-filter', popover: { title: 'Schichten filtern', description: 'Finde schneller die passende Schicht, indem du nach einem bestimmten Tag filterst.', side: 'bottom' } },
      { element: '#tour-tabs', popover: { title: 'Aufgaben-Bereiche', description: 'Wechsle hier zwischen Helfer-Schichten und Verpflegungs-Spenden (z.B. Kuchen oder Salate).', side: 'top' } },
      { element: '#tour-myshifts', popover: { title: 'Deine Zusagen', description: 'Hier findest du immer deine bereits zugesagten Schichten und Spenden im Überblick.', side: 'top' } }
    );
    const driverObj = driver({
      showProgress: true,
      nextBtnText: 'Weiter',
      prevBtnText: 'Zurück',
      doneBtnText: 'Fertig',
      steps
    });
    driverObj.drive();
    localStorage.setItem('hasSeenTour', 'true');
  };

  const loadAvailable = async (tId?: number) => {
    setBusy(true);
    try {
      const url = tId ? `/api/self/available?tournamentId=${tId}` : '/api/self/available';
      const data = await apiFetch(url, { headers: { Authorization: 'Bearer ' + ctxToken } });
      applyAvailableData(data);
    } catch { /* stumm - z.B. wenn (noch) kein Turnier zugewiesen */ } finally { setBusy(false); }
  };

  // Pull-to-Refresh statt Reload-Button: in nativen Apps (iOS Mail, Twitter,
  // Instagram) üblich mit Pfeil/Spinner-Indikator, damit der Nutzer erkennt,
  // dass das Ziehen einen Reload auslöst - ohne den bräuchte es wieder einen
  // Button. Reagiert nur, wenn ganz oben gescrollt UND nach unten gezogen
  // wird, damit normales Scrollen nicht beeinträchtigt wird.
  const [pullDistance, setPullDistance] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const pullStartY = useRef<number | null>(null);
  const PULL_THRESHOLD = 60;
  const PULL_MAX = 90;

  const handlePullStart = (e: React.TouchEvent) => {
    pullStartY.current = window.scrollY <= 0 && !refreshing ? e.touches[0].clientY : null;
  };

  const handlePullMove = (e: React.TouchEvent) => {
    if (pullStartY.current == null || refreshing) return;
    const delta = e.touches[0].clientY - pullStartY.current;
    if (delta > 0 && window.scrollY <= 0) {
      setPullDistance(Math.min(PULL_MAX, delta * 0.5));
      if (e.cancelable) e.preventDefault();
    } else {
      setPullDistance(0);
    }
  };

  const handlePullEnd = async () => {
    if (pullStartY.current == null) return;
    const shouldRefresh = pullDistance >= PULL_THRESHOLD;
    pullStartY.current = null;
    if (shouldRefresh) {
      setRefreshing(true);
      setPullDistance(PULL_THRESHOLD);
      await loadAvailable();
      setRefreshing(false);
    }
    setPullDistance(0);
  };

  const assign = async (shiftId: number, date: string) => {
    // Keine Erfolgsmeldung: die Kachel wechselt selbst sichtbar von "+" auf
    // "eingeplant", sobald loadAvailable() die aktualisierten Daten liefert -
    // erst DANACH, also nur bei tatsächlichem Erfolg. Ein zusätzlicher
    // "OK"-Klick bei jeder einzelnen Zuweisung wäre nur Reibung ohne
    // zusätzliche Information.
    try {
      await apiPost('/api/self/assign', { shiftId, date });
      await loadAvailable();
      queryClient.invalidateQueries({ queryKey: ['volunteerShifts'] });
    } catch (e: any) { await modal.alert({ title: 'Fehler', message: e?.message || 'Fehler bei der Zuweisung' }); }
  };

  const unassign = async (id: number) => {
    if (!(await modal.confirm({ title: 'Job abmelden', message: 'Möchtest du dich von diesem Job abmelden?', variant: 'warning' }))) {
      return;
    }
    try {
      await apiDelete('/api/self/unassign/' + id);
      await loadAvailable();
      try {
        queryClient.invalidateQueries({ queryKey: ['volunteerShifts'] });
      } catch (qErr) {
        // queryClient error (ignored)
      }
    } catch (e: any) { 
      await modal.alert({ title: 'Fehler', message: e?.message || 'Fehler bei der Abmeldung' }); 
    }
  };

  const openRatingModal = (vs: VolunteerShift) => {
    setRatingModalVs(vs);
    setRateWorkload(vs.ratingWorkload || 3);
    setRateOrganization(vs.ratingOrganization || 5);
    setRateFun(vs.ratingFun || 5);
    setRateComment(vs.ratingComment || '');
  };

  const saveRating = async () => {
    if (!ratingModalVs) return;
    try {
      await apiFetch(`/api/self/shifts/${ratingModalVs.id}/rating`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + ctxToken },
        body: JSON.stringify({
          ratingWorkload: rateWorkload,
          ratingOrganization: rateOrganization,
          ratingFun: rateFun,
          ratingComment: rateComment
        })
      });
      setRatingModalVs(null);
      await loadAvailable();
      queryClient.invalidateQueries({ queryKey: ['volunteerShifts'] });
      await modal.alert({ title: 'Danke!', message: 'Deine Bewertung wurde erfolgreich gespeichert.' });
    } catch (e: any) {
      await modal.alert({ title: 'Fehler', message: e?.message || 'Fehler beim Speichern der Bewertung' });
    }
  };

  const loadFood = async () => {
    try {
      const [cats, dons] = await Promise.all([
        apiFetch('/api/food/categories').catch(() => []),
        apiFetch('/api/food/donations').catch(() => ({ donations: [] }))
      ]);
      setFoodCategories(cats);
      setMyDonations(dons.donations || []);

      // Food Donation Slots laden und nach Kinder-Jahrgaengen filtern
      if (ctxVolunteer?.tournamentId) {
        const allSlots = await apiFetch('/api/food-donation-slots?tournamentId=' + ctxVolunteer?.tournamentId).catch(() => []);
        const childYears = ctxVolunteer?.children?.map((c: any) => c.childYear) || [];
        const relevantSlots = allSlots.filter((slot: FoodDonationSlot) => {
          if (!slot.yearGroup) return false;
          const yg = slot.yearGroup;
          // Direkt nach yearGroupId matchen
          if (childYears.some(y => y >= yg.birthYearStart && y <= yg.birthYearEnd)) return true;
          // Fallback: alter String-Vergleich
          if (childYears.includes(parseInt(yg.name))) return true;
          return false;
        });
        setFoodDonationSlots(relevantSlots);
      }
    } catch {}
  };

  const submitDonation = async () => {
    if (!donationFoodId || !donationQuantity) return await modal.alert({ title: 'Hinweis', message: 'Artikel und Menge auswählen!' });
    try {
      await apiPost('/api/food/donations', { foodItemId: donationFoodId, quantity: parseInt(donationQuantity), note: donationNote || null });
      setDonationFoodId(0);
      setDonationQuantity('');
      setDonationNote('');
      await loadFood();
    } catch (e: any) { await modal.alert({ title: 'Fehler', message: e?.message || 'Fehler beim Eintragen' }); }
  };

  const removeCommitment = (slotId: number) => {
    const newCommitments: Record<number, number> = {};
    Object.entries(slotCommitments).forEach(([k, v]) => { if (Number(k) !== slotId) newCommitments[Number(k)] = v; });
    setSlotCommitments(newCommitments);
  };

  const commitSlot = async (slotId: number, foodItemId?: number | null) => {
    if (!foodItemId) return await modal.alert({ title: 'Hinweis', message: 'Kein Artikel verfügbar!' });
    const qty = slotCommitments[slotId] ?? 0;
    if (qty <= 0) return await modal.alert({ title: 'Hinweis', message: 'Bitte Menge eingeben!' });
    try {
      await apiPost('/api/food/donations', { foodItemId: Number(foodItemId), quantity: qty, slotId });
      const newCommitments: Record<number, number> = {};
      Object.entries(slotCommitments).forEach(([k, v]) => { if (Number(k) !== slotId) newCommitments[Number(k)] = v; });
      setSlotCommitments(newCommitments);
      await loadFood();
    } catch (e: any) { await modal.alert({ title: 'Fehler', message: e?.message || 'Fehler beim Eintragen' }); }
  };

  const cancelDonation = async (id: number) => {
    if (!(await modal.confirm({ title: 'Eintrag löschen', message: 'Möchtest du diesen Eintrag wirklich löschen?', variant: 'danger' }))) return;
    try {
      await apiDelete('/api/food/donations/' + id);
      await loadFood();
    } catch (e: any) { await modal.alert({ title: 'Fehler', message: e?.message || 'Fehler beim Löschen' }); }
  };

  const changePassword = async () => {
    if (!currentPassword || !newPassword) { await modal.alert({ title: 'Hinweis', message: 'Bitte beide Felder ausfüllen' }); return; }
    try {
      await apiPatch('/api/auth/password', { currentPassword, newPassword });
      await modal.alert({ title: 'Erfolg', message: 'Passwort geändert!' });
      setMenuOpen(false); setCurrentPassword(''); setNewPassword('');
    } catch (e: any) { await modal.alert({ title: 'Fehler', message: e?.message || 'Fehler bei der Passwort-Änderung' }); }
  };

  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
  // Abgeschlossene Turniere sind im Umschalter jetzt browsebar (Historie),
  // aber nur zum Ansehen - neue Zusagen/Spenden dort lehnt das Backend ab.
  const isTournamentActive = !tournament || tournament.status === 'aktiv';

  const shadeColor = (color: string, percent: number) => {
    let R = parseInt(color.substring(1, 3), 16);
    let G = parseInt(color.substring(3, 5), 16);
    let B = parseInt(color.substring(5, 7), 16);
    R = Math.max(0, Math.min(255, R + Math.round(R * percent / 100)));
    G = Math.max(0, Math.min(255, G + Math.round(G * percent / 100)));
    B = Math.max(0, Math.min(255, B + Math.round(B * percent / 100)));
    return '#' + (R.toString(16).padStart(2, '0')) + (G.toString(16).padStart(2, '0')) + (B.toString(16).padStart(2, '0'));
  };

  /**
   * Vereine legen ihre Marken-Farben fest: primaryColor = Vereinsfarbe, secondaryColor = Aktionsfarbe
   * frei in den Stammdaten fest. Buttons/Header hier gingen bisher immer von
   * weißer Schrift darauf aus - bei einer hellen Vereinsfarbe (z.B. Weiß/Gelb)
   * unlesbar (weiß auf weiß). Kontrast per grober Luminanz statt hartkodiertem
   * '#fff' bestimmen.
   */
  const getContrastText = (hex: string) => {
    const R = parseInt(hex.substring(1, 3), 16) || 0;
    const G = parseInt(hex.substring(3, 5), 16) || 0;
    const B = parseInt(hex.substring(5, 7), 16) || 0;
    const luminance = 0.299 * R + 0.587 * G + 0.114 * B;
    return luminance > 150 ? '#212529' : '#fff';
  };
  const clubPrimaryText = getContrastText(clubPrimary);
  const clubSecondaryText = getContrastText(clubSecondary);
  const clubAccentText = getContrastText(clubAccent);

  /* ===== PIN WIEDERHERSTELLUNG SCREEN ===== */
  if (showPinModal) {
    return (
      <div style={{ maxWidth: 480, margin: '0 auto', minHeight: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: isMobile ? 20 : 40, background: 'linear-gradient(135deg, ' + clubAccent + ' 0%, ' + shadeColor(clubAccent, -30) + ' 100%)', boxSizing: 'border-box' }}>
        <div style={{ background: '#fff', borderRadius: 16, padding: isMobile ? 24 : 40, boxShadow: '0 20px 60px rgba(0,0,0,0.3)', textAlign: 'center' }}>
          <div style={{ fontSize: isMobile ? 48 : 64, marginBottom: 8 }}>🔐</div>
          <h2 style={{ margin: 0, color: '#333' }}>Wichtig: Deine Helfer-PIN!</h2>
          <p style={{ color: '#666', fontSize: 14, marginTop: 12, lineHeight: 1.5 }}>
            Da du keine E-Mail-Adresse angegeben hast, benötigst du diese PIN zwingend, falls du dein Passwort vergisst.
          </p>
          <div style={{ background: '#f8f9fa', padding: '16px', borderRadius: 10, margin: '20px 0', border: '2px dashed #adb5bd' }}>
            <div style={{ fontSize: 12, color: '#666', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 1 }}>Name für Login</div>
            <div style={{ fontSize: 20, fontWeight: 'bold', color: clubPrimary, marginBottom: 12 }}>{showPinModal.name}</div>
            
            <div style={{ fontSize: 12, color: '#666', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 1 }}>Wiederherstellungs-PIN</div>
            <div style={{ fontSize: 32, fontWeight: '900', color: '#dc3545', letterSpacing: 3 }}>{showPinModal.pin}</div>
          </div>
          <p style={{ color: '#dc3545', fontSize: 14, fontWeight: 'bold', marginTop: 0, marginBottom: 24 }}>
            ⚠️ Bitte schreibe dir diese Daten JETZT auf oder mache einen Screenshot!
          </p>
          <button onClick={() => setShowPinModal(null)} style={{ padding: '16px', width: '100%', background: clubAccent, color: clubAccentText, border: 'none', borderRadius: 10, cursor: 'pointer', fontWeight: 'bold', fontSize: 17, boxShadow: '0 4px 12px rgba(0,0,0,0.2)' }}>
            Ich habe mir die PIN gemerkt
          </button>
        </div>
      </div>
    );
  }

  /* ===== RESET PASSWORD SCREEN ===== */
  if (showResetPassword) {
    return (
      <div style={{ maxWidth: 480, margin: '0 auto', minHeight: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: isMobile ? 20 : 40, background: 'linear-gradient(135deg, ' + clubAccent + ' 0%, ' + shadeColor(clubAccent, -30) + ' 100%)', boxSizing: 'border-box' }}>
        <div style={{ background: '#fff', borderRadius: 16, padding: isMobile ? 24 : 40, boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
          <div style={{ textAlign: 'center', marginBottom: 24 }}>
            <div style={{ fontSize: isMobile ? 48 : 64, marginBottom: 8 }}>🔑</div>
            <h2 style={{ margin: 0, color: '#333' }}>Neues Passwort festlegen</h2>
            <p style={{ color: '#666', fontSize: 14, marginTop: 4 }}>Gib dein neues Passwort ein</p>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <input type="password" placeholder="Neues Passwort" value={resetNewPassword} onChange={e => setResetNewPassword(e.target.value)} style={{ padding: '14px 16px', border: '2px solid #e9ecef', borderRadius: 10, fontSize: 16, outline: 'none', boxSizing: 'border-box' }} />
            <input type="password" placeholder="Passwort bestaetigen" value={resetNewPasswordConfirm} onChange={e => setResetNewPasswordConfirm(e.target.value)} style={{ padding: '14px 16px', border: '2px solid #e9ecef', borderRadius: 10, fontSize: 16, outline: 'none', boxSizing: 'border-box' }} />
            <button onClick={async () => {
              if (resetNewPassword.length < 6) { await modal.alert({ title: 'Hinweis', message: 'Passwort muss mindestens 6 Zeichen haben' }); return; }
              if (resetNewPassword !== resetNewPasswordConfirm) { await modal.alert({ title: 'Hinweis', message: 'Passwörter stimmen nicht überein' }); return; }
              try {
                await apiPost('/api/auth/reset-password', { token: resetToken, newPassword: resetNewPassword });
                await modal.alert({ title: 'Erfolg', message: 'Passwort erfolgreich zurückgesetzt! Du kannst dich jetzt anmelden.' });
                setShowResetPassword(false);
              } catch (e: any) { await modal.alert({ title: 'Fehler', message: e?.message || 'Fehler beim Zurücksetzen' }); }
            }} style={{ padding: '16px', background: clubAccent, color: clubAccentText, border: 'none', borderRadius: 10, cursor: 'pointer', fontWeight: 'bold', fontSize: 17, boxShadow: '0 4px 12px rgba(0,0,0,0.2)' }}>Passwort zuruecksetzen</button>
            <button onClick={() => setShowResetPassword(false)} style={{ padding: '14px', background: 'transparent', border: '2px solid #6c757d', borderRadius: 10, cursor: 'pointer', fontWeight: 'bold', fontSize: 15, color: '#6c757d' }}>Zurueck</button>
          </div>
        </div>
      </div>
    );
  }

  /* ===== FORGOT PASSWORD SCREEN ===== */
  if (!ctxLoggedIn && showForgotPassword) {
    return (
      <div style={{ maxWidth: 480, margin: '0 auto', minHeight: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: isMobile ? 20 : 40, background: 'linear-gradient(135deg, ' + shadeColor(clubPrimary, 30) + ' 0%, ' + clubPrimary + ' 100%)', boxSizing: 'border-box' }}>
        <div style={{ background: '#fff', borderRadius: 16, padding: isMobile ? 24 : 40, boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
          <div style={{ textAlign: 'center', marginBottom: 24 }}>
            <div style={{ fontSize: isMobile ? 48 : 64, marginBottom: 8 }}>📧</div>
            <h2 style={{ margin: 0, color: '#333' }}>Passwort vergessen?</h2>
            <p style={{ color: '#666', fontSize: 14, marginTop: 4 }}>Gib deine Email ein und wir senden dir einen Link zum Zuruecksetzen</p>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <input type="text" placeholder="Name oder Email-Adresse" value={forgotEmail} onChange={e => setForgotEmail(e.target.value)} style={{ padding: '14px 16px', border: '2px solid #e9ecef', borderRadius: 10, fontSize: 16, outline: 'none', boxSizing: 'border-box' }} />
            {forgotMessage && <div style={{ padding: '12px 16px', background: '#d1e7dd', borderRadius: 10, fontSize: 14, color: '#0f5132', whiteSpace: 'pre-line' }}>{forgotMessage}</div>}
            <button onClick={async () => {
              if (!forgotEmail) { await modal.alert({ title: 'Hinweis', message: 'Bitte Name oder Email eingeben' }); return; }
              setForgotMessage('');
              try {
                if (forgotEmail.includes('@')) {
                  const data = await apiPost('/api/auth/forgot-password', { email: forgotEmail });
                  setForgotMessage(data.message);
                } else {
                  const data = await apiPost('/api/auth/forgot-password-push', { name: forgotEmail });
                  setForgotMessage(data.message);
                }
                setTimeout(() => setShowForgotPassword(false), 5000);
              } catch (e: any) { await modal.alert({ title: 'Fehler', message: e?.message || 'Fehler beim Senden' }); }
            }} style={{ padding: '16px', background: clubPrimary, color: clubPrimaryText, border: 'none', borderRadius: 10, cursor: 'pointer', fontWeight: 'bold', fontSize: 17, boxShadow: '0 4px 12px rgba(0,0,0,0.2)' }}>Push / E-Mail senden</button>
            <button onClick={async () => {
              const res = await modal.form({ title: 'Passwort per Helfer-PIN zuruecksetzen', fields: [ { key: 'pin', label: 'Deine Helfer-PIN', type: 'text' }, { key: 'newPassword', label: 'Neues Passwort (min. 6)', type: 'password' }] });
              if (!res) return;
              if (String(res.newPassword).length < 6) { await modal.alert({ title: 'Hinweis', message: 'Passwort zu kurz' }); return; }
              try {
                const resetRes = await apiPost('/api/auth/reset-by-pin', { name: forgotEmail, recoveryPin: res.pin, newPassword: res.newPassword });
                // Der PIN wird aus Sicherheitsgründen bei jeder Nutzung ersetzt.
                // Der neue PIN wird nur hier einmalig ausgeliefert – unbedingt anzeigen.
                await modal.alert({
                  title: 'Passwort zurückgesetzt',
                  message: resetRes?.recoveryPin
                    ? `Passwort erfolgreich zurückgesetzt!\n\nDeine PIN wurde aus Sicherheitsgründen erneuert. Neue Helfer-PIN:\n\n${resetRes.recoveryPin}\n\nBitte jetzt notieren – sie wird nicht erneut angezeigt.`
                    : 'Passwort erfolgreich zurueckgesetzt!'
                });
                setShowForgotPassword(false);
              } catch (e: any) { await modal.alert({ title: 'Fehler', message: e?.message || 'Ungueltige PIN oder Name' }); }
            }} style={{ padding: '14px', background: 'transparent', color: clubPrimary, border: '2px solid ' + clubPrimary, borderRadius: 10, cursor: 'pointer', fontWeight: 'bold', fontSize: 15 }}>Mit Helfer-PIN zuruecksetzen</button>
            <button onClick={() => setShowForgotPassword(false)} style={{ padding: '14px', background: 'transparent', border: 'none', borderRadius: 10, cursor: 'pointer', fontWeight: 'bold', fontSize: 15, color: '#6c757d', textDecoration: 'underline' }}>Zurueck zum Login</button>
          </div>
        </div>
      </div>
    );
  }

  /* ===== LOGIN SCREEN ===== */
  if (!ctxLoggedIn && !showRegisterForm && !showForgotPassword) {
    return (
      <div style={{ maxWidth: 480, margin: '0 auto', minHeight: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: isMobile ? 20 : 40, background: 'linear-gradient(135deg, ' + clubPrimary + ' 0%, ' + shadeColor(clubPrimary, -30) + ' 100%)', boxSizing: 'border-box' }}>
        <div style={{ background: '#fff', borderRadius: 16, padding: isMobile ? 24 : 40, boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
          <div style={{ textAlign: 'center', marginBottom: 24 }}>
            {clubLogo ? (
              <img src={clubLogo} alt="Verein" style={{ width: 200, height: 200, borderRadius: '22%', objectFit: 'cover', marginBottom: 12, boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }} />
            ) : (
              <img src="/logo.webp" alt="App Logo" style={{ width: 200, height: 200, objectFit: 'cover', borderRadius: '22%', marginBottom: 12, boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }} />
            )}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {/* Passkey als primäre, prominente Option - klar von der
                Passwort-Eingabe abgesetzt (Divider), statt zwei optisch
                gleichwertigen Buttons untereinander. */}
            {passkeySupported && (
              <>
                <button
                  disabled={passkeyLoading}
                  onClick={loginPasskey}
                  style={{ padding: '16px', background: clubAccent, color: clubAccentText, border: 'none', borderRadius: 10, cursor: passkeyLoading ? 'wait' : 'pointer', fontWeight: 'bold', fontSize: 16, boxShadow: '0 4px 12px rgba(0,0,0,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}
                >
                  <span style={{ fontSize: 20 }}>🔐</span>
                  <span>{passkeyLoading ? 'Wird geprüft...' : 'Mit Face ID / Fingerabdruck anmelden'}</span>
                </button>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '2px 0' }}>
                  <div style={{ flex: 1, height: 1, background: '#e9ecef' }} />
                  <span style={{ fontSize: 11, color: '#999', fontWeight: 700, letterSpacing: 0.5 }}>ODER MIT PASSWORT</span>
                  <div style={{ flex: 1, height: 1, background: '#e9ecef' }} />
                </div>
              </>
            )}
            <input type="text" placeholder="Name oder Email" value={loginEmail} onChange={e => setLoginEmail(e.target.value)} style={{ padding: '14px 16px', border: '2px solid #e9ecef', borderRadius: 10, fontSize: 16, outline: 'none', boxSizing: 'border-box' }} autoComplete="username webauthn" autoFocus />
            <input type="password" placeholder="Passwort" value={loginPassword} onChange={e => setLoginPassword(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') login(); }} style={{ padding: '14px 16px', border: '2px solid #e9ecef', borderRadius: 10, fontSize: 16, outline: 'none', boxSizing: 'border-box' }} autoComplete="current-password" />
            <button onClick={login} style={{ padding: '16px', background: clubPrimary, color: clubPrimaryText, border: 'none', borderRadius: 10, cursor: 'pointer', fontWeight: 'bold', fontSize: 17, boxShadow: '0 4px 12px rgba(0,0,0,0.2)' }}>Anmelden</button>
            <button onClick={() => setShowRegisterForm(true)} style={{ padding: '14px', background: 'transparent', color: clubPrimary, border: '2px solid ' + clubPrimary, borderRadius: 10, cursor: 'pointer', fontWeight: 'bold', fontSize: 15 }}>Registrieren</button>
            <button onClick={() => setShowForgotPassword(true)} style={{ padding: '12px', background: 'transparent', color: clubSecondary, border: 'none', borderRadius: 10, cursor: 'pointer', fontWeight: '500', fontSize: 14, textDecoration: 'underline' }}>Passwort vergessen?</button>
          </div>
        </div>
      </div>
    );
  }

  /* ===== REGISTER SCREEN ===== */
  if (showRegisterForm) {
    return (
      <div style={{ maxWidth: 480, margin: '0 auto', minHeight: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: isMobile ? 20 : 40, background: 'linear-gradient(135deg, ' + shadeColor(clubPrimary, 30) + ' 0%, ' + clubPrimary + ' 100%)', boxSizing: 'border-box' }}>
        <div style={{ background: '#fff', borderRadius: 16, padding: isMobile ? 24 : 40, boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
          <div style={{ textAlign: 'center', marginBottom: 24 }}>
            <div style={{ fontSize: isMobile ? 48 : 64, marginBottom: 8 }}>📝</div>
            <h2 style={{ margin: 0, color: '#333' }}>Neue Registrierung</h2>
            <p style={{ color: '#666', fontSize: 14, marginTop: 4 }}>Erstelle deinen Helfer-Account</p>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <input type="text" placeholder="Vor- und Nachname" value={regName} onChange={e => setRegName(e.target.value)} style={{ padding: '14px 16px', border: '2px solid #e9ecef', borderRadius: 10, fontSize: 16, outline: 'none', boxSizing: 'border-box' }} />
            <input type="email" placeholder="Email-Adresse (optional)" value={regEmail} onChange={e => setRegEmail(e.target.value)} style={{ padding: '14px 16px', border: '2px solid #e9ecef', borderRadius: 10, fontSize: 16, outline: 'none', boxSizing: 'border-box' }} />
            <input type="tel" placeholder="Handynummer (optional)" value={regPhone} onChange={e => setRegPhone(e.target.value)} onBlur={() => setRegPhone(formatPhoneNumber(regPhone) || regPhone)} style={{ padding: '14px 16px', border: '2px solid #e9ecef', borderRadius: 10, fontSize: 16, outline: 'none', boxSizing: 'border-box' }} />
            <div style={{ marginTop: 8 }}>
              <div style={{ fontWeight: 'bold', fontSize: 14, marginBottom: 8 }}>Kinder (optional)</div>
              {regChildren.map((child, idx) => (
                <div key={idx} style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                  <input type="text" placeholder="Name des Kindes" value={child.childName} onChange={e => { const n = [...regChildren]; n[idx].childName = e.target.value; setRegChildren(n); }} style={{ ...inputStyle, flex: 1, minWidth: 140 }} />
                  <input type="number" placeholder="Jg." value={child.childYear} onChange={e => { const n = [...regChildren]; n[idx].childYear = e.target.value; setRegChildren(n); }} style={{ ...inputStyle, width: 70, flexShrink: 0 }} />
                  {regChildren.length > 1 && (
                    <button type="button" onClick={() => { const n = regChildren.filter((_, i) => i !== idx); setRegChildren(n); }} style={{ ...btnStyle, background: '#ffe3e3', color: '#dc3545', border: 'none', padding: '8px 10px', fontSize: 16, flexShrink: 0 }}>×</button>
                  )}
                </div>
              ))}
              <button type="button" onClick={() => setRegChildren([...regChildren, { childName: '', childYear: '' }])} style={{ ...btnStyle, background: '#f8f9fa', border: '1px dashed #adb5bd', color: '#495057', padding: '8px 12px', fontSize: 14, marginTop: 4 }}>➕ Kind hinzufügen</button>
            </div>
            <input type="password" placeholder="Passwort" value={regPassword} onChange={e => setRegPassword(e.target.value)} style={{ padding: '14px 16px', border: '2px solid #e9ecef', borderRadius: 10, fontSize: 16, outline: 'none', boxSizing: 'border-box' }} />
            <input type="password" placeholder="Passwort bestaetigen" value={regPasswordConfirm} onChange={e => setRegPasswordConfirm(e.target.value)} style={{ padding: '14px 16px', border: '2px solid #e9ecef', borderRadius: 10, fontSize: 16, outline: 'none', boxSizing: 'border-box' }} />
            <label style={{ display: 'flex', alignItems: 'start', gap: 8, padding: '10px 12px', background: consentGiven ? '#e7f3ff' : '#fff', border: consentGiven ? '2px solid #0d6efd' : '2px solid #e9ecef', borderRadius: 10, cursor: 'pointer', fontSize: 13, color: '#555', lineHeight: 1.4 }}>
              <input type="checkbox" checked={consentGiven} onChange={e => setConsentGiven(e.target.checked)} style={{ marginTop: 2, flexShrink: 0, width: 18, height: 18, cursor: 'pointer' }} />
              <span>
                Ich habe die{' '}
                <a href="?view=privacy" target="_blank" rel="noopener noreferrer" style={{ color: '#0d6efd', textDecoration: 'underline', fontWeight: 'bold' }}>
                  Datenschutzerklärung
                </a>{' '}
                gelesen und stimme der Verarbeitung meiner Daten zu.{' '}
                <span style={{ color: '#dc3545' }}>*</span>
              </span>
            </label>
            <button onClick={async () => {
              if (!regName || !regPassword) { await modal.alert({ title: 'Hinweis', message: 'Bitte Name und Passwort ausfüllen' }); return; }
              if (regPassword !== regPasswordConfirm) { await modal.alert({ title: 'Hinweis', message: 'Passwörter stimmen nicht überein' }); return; }
              if (regPassword.length < 6) { await modal.alert({ title: 'Hinweis', message: 'Passwort muss mindestens 6 Zeichen haben' }); return; }
              if (!consentGiven) { await modal.alert({ title: 'Hinweis', message: 'Bitte Datenschutzerklärung akzeptieren' }); return; }
              if (regEmail.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(regEmail.trim())) { await modal.alert({ title: 'Hinweis', message: 'Bitte eine gültige Email-Adresse eingeben' }); return; }
              if (regPhone.trim() && !/^[0-9+\-\s]{5,20}$/.test(regPhone.trim())) { await modal.alert({ title: 'Hinweis', message: 'Bitte eine gültige Handynummer eingeben (nur Ziffern, Leerzeichen, + und -)' }); return; }
              const currentYear = new Date().getFullYear();
              for (const c of regChildren) {
                if (c.childYear && (parseInt(c.childYear) < 2000 || parseInt(c.childYear) > currentYear)) {
                  await modal.alert({ title: 'Hinweis', message: `Bitte ein gültiges Geburtsjahr für das Kind eingeben (2000-${currentYear})` });
                  return;
                }
              }
              try {
                const data = await apiPost('/api/auth/register', { name: regName, email: regEmail || null, phone: regPhone || null, password: regPassword, children: regChildren.filter(c => c.childName || c.childYear).map(c => ({ childName: c.childName || null, childYear: c.childYear ? parseInt(c.childYear) : null })), consentGiven: true });
                contextLogin(data.token, data.user || data.volunteer);
                setShowRegisterForm(false);
                setRegName(''); setRegEmail(''); setRegPhone(''); setRegPassword(''); setRegPasswordConfirm('');
                
                if (data.user?.recoveryPin) {
                  // Kein Passkey-Angebot direkt danach: die PIN-Anzeige ist
                  // sicherheitsrelevant (muss notiert werden) und soll nicht
                  // mit einem weiteren Dialog überlagert werden - Passkey
                  // lässt sich jederzeit später im Menü einrichten.
                  setShowPinModal({ name: data.user.name, pin: data.user.recoveryPin });
                } else {
                  await modal.alert({ title: 'Erfolg', message: 'Registrierung erfolgreich!' });
                  await maybeOfferPasskeySetup();
                }

                try {
                  const d = await apiFetch('/api/self/available', { headers: { Authorization: 'Bearer ' + data.token } });
                  applyAvailableData(d);
                } catch { /* Verfügbarkeitsdaten optional */ }
                
                // Trigger Web Push Erlaubnis
                import('../utils/push').then(m => m.subscribeToPushNotifications().catch(() => {}));
              } catch (e: any) { await modal.alert({ title: 'Fehler', message: e?.message || 'Fehler bei der Registrierung' }); }
            }} style={{ padding: '16px', background: clubPrimary, color: clubPrimaryText, border: 'none', borderRadius: 10, cursor: 'pointer', fontWeight: 'bold', fontSize: 17, boxShadow: '0 4px 12px rgba(0,0,0,0.2)' }}>Registrieren</button>
            <button onClick={() => setShowRegisterForm(false)} style={{ padding: '14px', background: 'transparent', border: '2px solid #6c757d', borderRadius: 10, cursor: 'pointer', fontWeight: 'bold', fontSize: 15, color: '#6c757d' }}>Zurueck zum Login</button>
          </div>
        </div>
      </div>
    );
  }

  /* ===== PROFIL BEARBEITEN ===== */
  if (showProfile) {
    return (
      <div style={{ maxWidth: 480, margin: '0 auto', minHeight: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: isMobile ? 20 : 40, background: 'linear-gradient(135deg, ' + shadeColor(clubPrimary, 30) + ' 0%, ' + clubPrimary + ' 100%)', boxSizing: 'border-box' }}>
        <div style={{ background: '#fff', borderRadius: 16, padding: isMobile ? 24 : 40, boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
          <div style={{ textAlign: 'center', marginBottom: 24 }}>
            <div style={{ fontSize: isMobile ? 48 : 64, marginBottom: 8 }}>👤</div>
            <h2 style={{ margin: 0, color: '#333' }}>Profil bearbeiten</h2>
            <p style={{ color: '#666', fontSize: 14, marginTop: 4 }}>Ändere deine Daten</p>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <input type="text" placeholder="Vor- und Nachname" value={editName} onChange={e => setEditName(e.target.value)} style={{ padding: '14px 16px', border: '2px solid #e9ecef', borderRadius: 10, fontSize: 16, outline: 'none', boxSizing: 'border-box' }} />
            <input type="email" placeholder="Email-Adresse" value={editEmail} onChange={e => setEditEmail(e.target.value)} style={{ padding: '14px 16px', border: '2px solid #e9ecef', borderRadius: 10, fontSize: 16, outline: 'none', boxSizing: 'border-box' }} />
            <input type="tel" placeholder="Handynummer" value={editPhone} onChange={e => setEditPhone(e.target.value)} onBlur={() => setEditPhone(formatPhoneNumber(editPhone) || editPhone)} style={{ padding: '14px 16px', border: '2px solid #e9ecef', borderRadius: 10, fontSize: 16, outline: 'none', boxSizing: 'border-box' }} />
            <div style={{ marginTop: 8 }}>
              <div style={{ fontWeight: 'bold', fontSize: 14, marginBottom: 8 }}>Kinder</div>
              {editChildren.map((child, idx) => (
                <div key={idx} style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                  <input type="text" placeholder="Name des Kindes" value={child.childName} onChange={e => { const n = [...editChildren]; n[idx].childName = e.target.value; setEditChildren(n); }} style={{ ...inputStyle, flex: 1, minWidth: 140 }} />
                  <input type="number" placeholder="Jg." value={child.childYear} onChange={e => { const n = [...editChildren]; n[idx].childYear = e.target.value; setEditChildren(n); }} style={{ ...inputStyle, width: 70, flexShrink: 0 }} />
                  {editChildren.length > 1 && (
                    <button type="button" onClick={() => { const n = editChildren.filter((_, i) => i !== idx); setEditChildren(n); }} style={{ ...btnStyle, background: '#ffe3e3', color: '#dc3545', border: 'none', padding: '8px 10px', fontSize: 16, flexShrink: 0 }}>×</button>
                  )}
                </div>
              ))}
              <button type="button" onClick={() => setEditChildren([...editChildren, { childName: '', childYear: '' }])} style={{ ...btnStyle, background: '#f8f9fa', border: '1px dashed #adb5bd', color: '#495057', padding: '8px 12px', fontSize: 14, marginTop: 4 }}>➕ Kind hinzufügen</button>
            </div>
            {ctxVolunteer?.consentGiven && (
              <div style={{ padding: '10px 14px', background: '#e7f3ff', borderRadius: 8, fontSize: 13, color: '#0d6efd' }}>
                ✅ Einwilligung zur Datenverarbeitung erteilt am {ctxVolunteer?.consentDate ? new Date(ctxVolunteer?.consentDate).toLocaleDateString('de-DE') : '—'}
              </div>
            )}
            <button onClick={async () => {
              if (editEmail.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(editEmail.trim())) { await modal.alert({ title: 'Hinweis', message: 'Bitte eine gültige Email-Adresse eingeben' }); return; }
              if (editPhone.trim() && !/^[0-9+\-\s]{5,20}$/.test(editPhone.trim())) { await modal.alert({ title: 'Hinweis', message: 'Bitte eine gültige Handynummer eingeben (nur Ziffern, Leerzeichen, + und -)' }); return; }
              {
                const currentYear = new Date().getFullYear();
                for (const c of editChildren) {
                  if (c.childYear && (parseInt(c.childYear) < 2000 || parseInt(c.childYear) > currentYear)) {
                    await modal.alert({ title: 'Hinweis', message: `Bitte ein gültiges Geburtsjahr für das Kind eingeben (2000-${currentYear})` });
                    return;
                  }
                }
              }
              try {
                const data = await apiPatch('/api/auth/profile', { name: editName, email: editEmail, phone: editPhone, children: editChildren.filter(c => c.childName || c.childYear).map(c => ({ childName: c.childName || null, childYear: c.childYear ? parseInt(c.childYear) : null })) });
                contextLogin(ctxToken, data);
                setShowProfile(false);
                await modal.alert({ title: 'Erfolg', message: 'Profil aktualisiert!' });
              } catch (e: any) { await modal.alert({ title: 'Fehler', message: e?.message || 'Fehler beim Aktualisieren' }); }
            }} style={{ padding: '16px', background: clubPrimary, color: clubPrimaryText, border: 'none', borderRadius: 10, cursor: 'pointer', fontWeight: 'bold', fontSize: 17, boxShadow: '0 4px 12px rgba(0,0,0,0.2)' }}>Speichern</button>
            <button onClick={() => setShowProfile(false)} style={{ padding: '14px', background: 'transparent', border: '2px solid #6c757d', borderRadius: 10, cursor: 'pointer', fontWeight: 'bold', fontSize: 15, color: '#6c757d' }}>Abbrechen</button>
          </div>
        </div>
      </div>
    );
  }

  /* ===== DASHBOARD ===== */
  return (
    <div
      onTouchStart={handlePullStart}
      onTouchMove={handlePullMove}
      onTouchEnd={handlePullEnd}
      style={{ maxWidth: 480, margin: '0 auto', padding: isMobile ? 16 : 24, paddingBottom: 80, background: '#f0f2f5', minHeight: '100vh', boxSizing: 'border-box' }}
    >
      {/* Pull-to-Refresh-Indikator: Pfeil dreht sich Richtung Auslöse-Schwelle,
          danach Spinner während des eigentlichen Reloads - Standard-Pattern
          bei nativen Apps (iOS Mail, Twitter/X, Instagram), damit klar wird,
          dass die Zieh-Geste einen Reload auslöst statt nur zu scrollen. */}
      {(pullDistance > 0 || refreshing) && (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: refreshing ? 40 : pullDistance, overflow: 'hidden', transition: refreshing ? 'height 0.15s' : undefined }}>
          <span style={{
            fontSize: 20,
            display: 'inline-block',
            transform: refreshing ? undefined : `rotate(${Math.min(180, (pullDistance / PULL_THRESHOLD) * 180)}deg)`,
            animation: refreshing ? 'spin 0.8s linear infinite' : undefined,
            opacity: Math.min(1, pullDistance / 30)
          }}>
            {refreshing ? '⏳' : '↓'}
          </span>
        </div>
      )}
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>

      <PwaInstallPrompt />

      {/* Header mit Logo, Name & Hamburger */}
      <div style={{ background: 'linear-gradient(135deg, ' + clubPrimary + ' 0%, ' + shadeColor(clubPrimary, -20) + ' 100%)', borderRadius: 20, padding: isMobile ? 16 : 20, marginBottom: 20, color: clubPrimaryText, position: 'relative' }}>
        <button
          onClick={startTour}
          title="Hilfe / Tour starten"
          style={{
            position: 'absolute', top: '50%', right: 64, transform: 'translateY(-50%)', width: 44, height: 44,
            background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: 10,
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, color: '#fff'
          }}
        >
          <span style={{ fontFamily: 'system-ui, sans-serif', fontWeight: 'bold' }}>?</span>
        </button>
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          style={{
            position: 'absolute', top: '50%', right: 12, transform: 'translateY(-50%)', width: 44, height: 44,
            background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: 10,
            cursor: 'pointer', display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', gap: 4
          }}
        >
          <span style={{ display: 'block', width: 22, height: 2.5, background: '#fff', borderRadius: 2, transition: 'all 0.2s', transform: menuOpen ? 'rotate(45deg) translate(5px, 5px)' : 'none' }} />
          <span style={{ display: 'block', width: 22, height: 2.5, background: '#fff', borderRadius: 2, transition: 'all 0.2s', opacity: menuOpen ? 0 : 1 }} />
          <span style={{ display: 'block', width: 22, height: 2.5, background: '#fff', borderRadius: 2, transition: 'all 0.2s', transform: menuOpen ? 'rotate(-45deg) translate(5px, -5px)' : 'none' }} />
        </button>

        {/* Hamburger Menü */}
        {menuOpen && (
          <div style={{ position: 'absolute', top: 56, right: 12, background: '#fff', borderRadius: 12, boxShadow: '0 8px 30px rgba(0,0,0,0.2)', padding: 8, zIndex: 100, minWidth: 200, color: '#333' }}>
            <div style={{ padding: '12px 16px', borderBottom: '1px solid #e9ecef', marginBottom: 8 }}>
              <div style={{ fontWeight: 'bold', fontSize: 15 }}>{ctxVolunteer?.name}</div>
              <div style={{ fontSize: 12, color: '#999' }}>{ctxVolunteer?.email || ''}</div>
            </div>
            <button onClick={() => {
              setMenuOpen(false);
              setShowProfile(true);
              setEditName(ctxVolunteer?.name || '');
              setEditEmail(ctxVolunteer?.email || '');
              setEditPhone(ctxVolunteer?.phone || '');
              setEditChildren((ctxVolunteer?.children || []).map((c: any) => ({ childName: c.childName || "", childYear: String(c.childYear || "") })) || [{ childName: '', childYear: '' }]);
            }} style={{ width: '100%', padding: '10px 16px', background: 'transparent', border: 'none', borderRadius: 8, cursor: 'pointer', textAlign: 'left', fontSize: 14, color: '#333' }}>👤 Profil bearbeiten</button>
            <button onClick={async () => {
              setMenuOpen(false);
              try {
                const data = await apiFetch('/api/auth/export');
                const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url; a.download = `turnier-planer-daten-${new Date().toISOString().slice(0,10)}.json`;
                a.click(); URL.revokeObjectURL(url);
              } catch { await modal.alert({ title: 'Fehler', message: 'Export fehlgeschlagen' }); }
            }} style={{ width: '100%', padding: '10px 16px', background: 'transparent', border: 'none', borderRadius: 8, cursor: 'pointer', textAlign: 'left', fontSize: 14, color: '#333' }}>📥 Meine Daten exportieren</button>
            <button onClick={async () => {
              setMenuOpen(false);
              const result = await modal.form({ title: 'Passwort ändern', fields: [{ key: 'currentPassword', label: 'Aktuelles Passwort', type: 'password' }, { key: 'newPassword', label: 'Neues Passwort (min. 6 Zeichen)', type: 'password' }] });
              if (!result) return;
              const cp = result.currentPassword as string;
              const np = result.newPassword as string;
              if (!cp || !np || np.length < 6) { await modal.alert({ title: 'Hinweis', message: 'Passwort muss mindestens 6 Zeichen haben' }); return; }
              try {
                await apiPatch('/api/auth/password', { currentPassword: cp, newPassword: np });
                await modal.alert({ title: 'Erfolg', message: 'Passwort geändert!' });
              } catch (e: any) { await modal.alert({ title: 'Fehler', message: e?.message || 'Fehler bei der Passwort-Änderung' }); }
            }} style={{ width: '100%', padding: '10px 16px', background: 'transparent', border: 'none', borderRadius: 8, cursor: 'pointer', textAlign: 'left', fontSize: 14, color: '#333' }}>🔑 Passwort ändern</button>
            {passkeySupported && (
              <button
                disabled={passkeyLoading}
                onClick={async () => {
                  setPasskeyLoading(true);
                  try {
                    await registerPasskey();
                    setMenuOpen(false);
                    await modal.alert({ title: 'Eingerichtet 🎉', message: 'Face ID / Fingerabdruck ist jetzt für die Anmeldung auf diesem Gerät eingerichtet.' });
                  } catch (e: any) {
                    // Abbruch durch den Nutzer (z.B. Systemdialog verlassen) ist kein Fehler.
                    if (e?.name !== 'NotAllowedError') {
                      await modal.alert({ title: 'Fehler', message: e?.message || 'Passkey konnte nicht eingerichtet werden.' });
                    }
                  } finally {
                    setPasskeyLoading(false);
                  }
                }}
                style={{ width: '100%', padding: '10px 16px', background: 'transparent', border: 'none', borderRadius: 8, cursor: passkeyLoading ? 'wait' : 'pointer', textAlign: 'left', fontSize: 14, color: '#333' }}
              >
                🔐 {passkeyLoading ? 'Wird eingerichtet...' : 'Face ID / Fingerabdruck einrichten'}
              </button>
            )}
            <button onClick={async () => {
              setMenuOpen(false);
              if (!(await modal.confirm({ title: 'Konto löschen', message: 'Bist du sicher, dass du dein Konto löschen möchtest? Diese Aktion kann nicht rückgängig gemacht werden. Alle personenbezogenen Daten werden entfernt.', variant: 'danger' }))) return;
              try {
                await apiDelete('/api/auth/account');
                await modal.alert({ title: 'Erfolg', message: 'Dein Konto wurde gelöscht.' });
                logout();
              } catch (e: any) { await modal.alert({ title: 'Fehler', message: e?.message || 'Fehler beim Löschen' }); }
            }} style={{ width: '100%', padding: '10px 16px', background: 'transparent', border: 'none', borderRadius: 8, cursor: 'pointer', textAlign: 'left', fontSize: 14, color: '#333' }}>🗑️ Konto löschen (Art. 17 DSGVO)</button>
            {pushSupported && (
              pushSubscribed ? (
                <div style={{ width: '100%', padding: '10px 16px', fontSize: 14, color: '#2e7d32', display: 'flex', alignItems: 'center', gap: 6 }}>
                  🔔 Push-Benachrichtigungen: Aktiv
                </div>
              ) : (
                <button
                  disabled={pushMenuLoading}
                  onClick={async () => {
                    setPushMenuLoading(true);
                    try {
                      const permission = await Notification.requestPermission();
                      if (permission !== 'granted') {
                        await modal.alert({ title: 'Hinweis', message: 'Benachrichtigungen wurden im Browser nicht erlaubt. Bitte berechtige die App in den Einstellungen.' });
                        return;
                      }
                      const ok = await subscribeToPushNotifications();
                      if (!ok) { await modal.alert({ title: 'Fehler', message: 'Konnte Push-Benachrichtigungen nicht aktivieren.' }); return; }
                      setPushSubscribed(true);
                      setMenuOpen(false);
                      await modal.alert({ title: 'Aktiviert 🎉', message: 'Du wirst nun bei Schicht-Änderungen sofort per Push auf diesem Gerät informiert!' });
                    } catch {
                      await modal.alert({ title: 'Fehler', message: 'Konnte Push-Benachrichtigungen nicht aktivieren.' });
                    } finally {
                      setPushMenuLoading(false);
                    }
                  }}
                  style={{ width: '100%', padding: '10px 16px', background: 'transparent', border: 'none', borderRadius: 8, cursor: pushMenuLoading ? 'wait' : 'pointer', textAlign: 'left', fontSize: 14, color: '#333' }}
                >
                  🔔 {pushMenuLoading ? 'Aktivieren...' : 'Push-Benachrichtigungen aktivieren'}
                </button>
              )
            )}
            {isAdmin || isOrganizer ? (
              <button onClick={() => { setMenuOpen(false); if (onLoginAsAdmin) onLoginAsAdmin(); }} style={{ width: '100%', padding: '10px 16px', background: 'transparent', border: 'none', borderRadius: 8, cursor: 'pointer', textAlign: 'left', fontSize: 14, color: '#333' }}>⚙️ Admin-Bereich</button>
            ) : null}
            <button onClick={() => { setMenuOpen(false); setShowRegisterForm(false); logout(); }} style={{ width: '100%', padding: '10px 16px', background: 'transparent', border: 'none', borderRadius: 8, cursor: 'pointer', textAlign: 'left', fontSize: 14, color: '#dc3545' }}>🚪 Abmelden</button>
            <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid #e9ecef', textAlign: 'center', fontSize: 10, color: '#ced4da' }}>
              <a href="?view=privacy" style={{ color: '#adb5bd' }}>Datenschutz</a>
              {' · '}
              <a href="?view=impressum" style={{ color: '#adb5bd' }}>Impressum</a>
            </div>
            <div style={{ paddingTop: 4, textAlign: 'center', fontSize: 10, color: '#ced4da', letterSpacing: 0.5 }}>{__APP_VERSION__} · {__GIT_SHA__}</div>
          </div>
        )}

        <div id="tour-header" style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          {clubLogo ? (
            <img src={clubLogo} alt={tournamentName} style={{ width: 48, height: 48, borderRadius: 12, objectFit: 'contain', border: '2px solid rgba(255,255,255,0.3)', flexShrink: 0, padding: 4, background: '#fff' }} />
          ) : (
            <img src="/logo.webp" alt="App Logo" style={{ width: 48, height: 48, objectFit: 'cover', borderRadius: '22%', flexShrink: 0, boxShadow: '0 2px 4px rgba(0,0,0,0.2)' }} />
          )}
          <div>
            {availableTournaments.length > 1 ? (
              <select
                value={selectedTournamentId || ''}
                onChange={e => loadAvailable(parseInt(e.target.value))}
                style={{ margin: 0, fontSize: isMobile ? 18 : 22, fontWeight: 'bold', background: 'transparent', border: 'none', color: '#fff', outline: 'none', cursor: 'pointer', appearance: 'none', WebkitAppearance: 'none', paddingRight: 16, backgroundImage: 'url("data:image/svg+xml;utf8,<svg fill=\'white\' height=\'24\' viewBox=\'0 0 24 24\' width=\'24\' xmlns=\'http://www.w3.org/2000/svg\'><path d=\'M7 10l5 5 5-5z\'/></svg>")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right center' }}
              >
                {/* Anstehend/Aktiv und Abgeschlossen getrennt gruppiert, statt
                    einer flachen Liste - so bleibt auf einen Blick klar, dass
                    ein Turnier schon vorbei ist. */}
                {(() => {
                  const upcoming = availableTournaments.filter(t => t.status === 'aktiv' || !t.status);
                  const past = availableTournaments.filter(t => t.status && t.status !== 'aktiv');
                  return (
                    <>
                      {upcoming.length > 0 && (
                        <optgroup label="Anstehend/Aktiv">
                          {upcoming.map(t => (
                            <option key={t.id} value={t.id} style={{ color: '#333' }}>{t.name}</option>
                          ))}
                        </optgroup>
                      )}
                      {past.length > 0 && (
                        <optgroup label="Abgeschlossen">
                          {past.map(t => (
                            <option key={t.id} value={t.id} style={{ color: '#333' }}>{t.name}</option>
                          ))}
                        </optgroup>
                      )}
                    </>
                  );
                })()}
              </select>
            ) : (
              <h2 style={{ margin: 0, fontSize: isMobile ? 18 : 22 }}>{tournamentName || 'Turnier'}</h2>
            )}
            <p style={{ margin: '2px 0 0', opacity: 0.85, fontSize: 13 }}>Hallo, {ctxVolunteer?.name}!</p>
          </div>
        </div>
      </div>

      <PushNotificationBanner primaryColor={clubSecondary} textColor={clubSecondaryText} />

      {/* Tabs: bewusst VOR der Filterzeile - erst den Bereich wählen (Jobs
          oder Verpflegung), dann die dafür relevanten Filter darunter sehen,
          statt umgekehrt. */}
      <div id="tour-tabs" style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        <button onClick={() => setActiveSection('jobs')} style={{ flex: 1, padding: '12px 0', border: 'none', borderRadius: 10, cursor: 'pointer', fontSize: 15, fontWeight: activeSection === 'jobs' ? '600' : '400', background: activeSection === 'jobs' ? clubSecondary : '#fff', color: activeSection === 'jobs' ? clubSecondaryText : '#666', boxShadow: activeSection === 'jobs' ? '0 2px 8px rgba(0,0,0,0.15)' : '0 1px 3px rgba(0,0,0,0.08)' }}>📋 Jobs</button>
        <button onClick={() => { setActiveSection('verpflegung'); loadFood(); }} style={{ flex: 1, padding: '12px 0', border: 'none', borderRadius: 10, cursor: 'pointer', fontSize: 15, fontWeight: activeSection === 'verpflegung' ? '600' : '400', background: activeSection === 'verpflegung' ? clubSecondary : '#fff', color: activeSection === 'verpflegung' ? clubSecondaryText : '#666', boxShadow: activeSection === 'verpflegung' ? '0 2px 8px rgba(0,0,0,0.15)' : '0 1px 3px rgba(0,0,0,0.08)' }}>🍞 Verpflegung</button>
      </div>

      {/* Filter: nur bei Jobs relevant (Verpflegungsziele sind nach Jahrgang,
          nicht nach Tag/Uhrzeit strukturiert - FoodDonationSlot hat gar kein
          Datumsfeld), vorher wurde die Filterzeile auch im Verpflegungs-Tab
          angezeigt, obwohl sie dort wirkungslos war. */}
      {activeSection === 'jobs' && (
      <div id="tour-filter" style={{ marginBottom: 16 }}>
        {/* Tag-Chips statt Dropdown: kein "Alle"-Chip mehr - ohne Auswahl
            werden ohnehin schon alle Tage gezeigt, ein Klick filtert, erneuter
            Klick auf den aktiven Chip hebt den Filter wieder auf. Chronologisch
            nach echtem Datum sortiert (vorher .sort() auf lokalisierte Datums-
            STRINGS wie "4.9.2026" - das sortiert bei zweistelligen Tagen
            lexikographisch falsch, z.B. "10.9." vor "4.9."). */}
        <div style={{ display: 'flex', gap: 6, overflowX: 'auto', justifyContent: 'center', flexWrap: 'wrap', marginBottom: 8, paddingBottom: 2 }}>
          {(() => {
            const uniqueDates = Array.from(new Map(shifts.map(s => [new Date(s.date).toLocaleDateString('de-DE'), new Date(s.date)])).entries())
              .sort((a, b) => a[1].getTime() - b[1].getTime());
            return uniqueDates.map(([dateKey, dateObj]) => {
              const active = filterDate === dateKey;
              return (
                <button
                  key={dateKey}
                  onClick={() => setFilterDate(active ? '' : dateKey)}
                  style={{
                    flexShrink: 0, padding: '10px 16px', borderRadius: 20, border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 600, whiteSpace: 'nowrap',
                    background: active ? clubPrimary : '#fff',
                    color: active ? clubPrimaryText : '#495057',
                    boxShadow: active ? 'none' : '0 1px 3px rgba(0,0,0,0.08)'
                  }}
                >
                  {dateObj.toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit' })}
                </button>
              );
            });
          })()}
        </div>

        {/* Uhrzeit-Chips (kombinierbar, aus TIME_BLOCKS abgeleitet). Kein
            "Nur kommende"-Toggle mehr - vergangene Slots werden jetzt immer
            ausgeblendet, siehe Filter-Kette weiter unten. Keine Emojis (Platz
            sparen), zentriert. */}
        <div style={{ display: 'flex', gap: 6, justifyContent: 'center', flexWrap: 'wrap' }}>
          {(Object.keys(TIME_BLOCKS) as (keyof typeof TIME_BLOCKS)[]).map(key => {
            const active = filterTimesOfDay.has(key);
            return (
              <button
                key={key}
                onClick={() => setFilterTimesOfDay(prev => {
                  const next = new Set(prev);
                  if (next.has(key)) next.delete(key); else next.add(key);
                  return next;
                })}
                style={{
                  padding: '8px 14px', borderRadius: 20, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap',
                  background: active ? clubSecondary : '#fff',
                  color: active ? clubSecondaryText : '#495057',
                  boxShadow: active ? 'none' : '0 1px 3px rgba(0,0,0,0.08)'
                }}
              >
                {TIME_BLOCKS[key].label}
              </button>
            );
          })}
        </div>
      </div>
      )}

      {/* Deine Jobs */}
      {activeSection === 'jobs' && volunteerShifts.filter(vs => vs.userId === ctxVolunteer?.id).length > 0 && (
        <div id="tour-myshifts" style={{ marginBottom: 24, padding: 16, border: `2px solid ${clubPrimary}`, borderRadius: 16, background: 'rgba(255, 255, 255, 0.4)', display: 'flex', flexDirection: 'column', gap: 10 }}>
          <h3 style={{ margin: '0 0 6px', fontSize: 16, color: clubPrimary, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span>⭐</span> Deine Jobs ({volunteerShifts.filter(vs => vs.userId === ctxVolunteer?.id).length})
          </h3>
          {volunteerShifts
            .filter(vs => vs.userId === ctxVolunteer?.id)
            .sort((a, b) => {
              const dateDiff = new Date(a.date).getTime() - new Date(b.date).getTime();
              if (dateDiff !== 0) return dateDiff;
              const timeDiff = (a.shift?.startMin ?? 0) - (b.shift?.startMin ?? 0);
              if (timeDiff !== 0) return timeDiff;
              const orderA = a.shift?.arbeitsbereich?.order ?? 9999;
              const orderB = b.shift?.arbeitsbereich?.order ?? 9999;
              if (orderA !== orderB) return orderA - orderB;
              return (a.shift?.arbeitsbereich?.name || '').localeCompare(b.shift?.arbeitsbereich?.name || '');
            })
            .map((vs, idx, myShifts) => {
              const s = vs.shift;
              const d = new Date(vs.date);
              const prevVs = idx > 0 ? myShifts[idx - 1] : null;
              const showDayHeader = !prevVs || new Date(prevVs.date).toDateString() !== d.toDateString();
              const assignedCount = volunteerShifts.filter(v => v.shiftId === s?.id).length;
              const remaining = (s?.maxVolunteers || 0) - assignedCount;
              // Bewertung erst möglich wenn Schicht zeitlich abgeschlossen ist
              const endMin = s?.endMin;
              const shiftOver = (() => {
                if (!vs.date || endMin == null) return false;
                const end = new Date(vs.date);
                end.setHours(Math.floor(endMin / 60), endMin % 60, 0, 0);
                return new Date() > end;
              })();
              const alreadyRated = !!(vs.ratingFun || vs.ratingWorkload || vs.ratingOrganization);
              return (
                <div key={vs.id}>
                  {showDayHeader && (
                    <div style={{ fontSize: 13, fontWeight: 'bold', color: clubPrimary, padding: '6px 0', marginTop: idx > 0 ? 8 : 0, borderTop: '1px solid #e9ecef' }}>
                      {d.toLocaleDateString('de-DE', { weekday: 'long', day: '2-digit', month: '2-digit' })}
                    </div>
                  )}
                  <div style={{ position: 'relative', background: '#fff', borderRadius: 12, padding: '12px 14px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)', display: 'flex', alignItems: 'center', gap: 10, borderLeft: '4px solid ' + clubAccent, overflow: 'hidden' }}>
                    <span style={{ fontSize: 20, flexShrink: 0 }}>{s?.arbeitsbereich?.icon || '📍'}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 15, fontWeight: 700, color: '#212529', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s?.arbeitsbereich?.name || '–'}</div>
                      <div style={{ fontSize: 12, color: '#666' }}>
                        {d.toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit' })}
                        {(s?.startMin != null || s?.endMin != null) && <> · {minToTime(s.startMin)}–{minToTime(s.endMin)}</>}
                      </div>
                    </div>
                    <span style={{ fontSize: 14, fontWeight: 700, color: remaining > 0 ? clubAccent : '#6c757d', flexShrink: 0 }}>{remaining}/{s?.maxVolunteers || 0}</span>
                    {shiftOver ? (
                      // Schicht vorbei → nur Bewertungs-Button
                      <button
                        onClick={() => openRatingModal(vs)}
                        title={alreadyRated ? 'Bewertung bearbeiten' : 'Schicht bewerten'}
                        style={{
                          height: 40,
                          padding: '0 14px',
                          borderRadius: 10,
                          border: 'none',
                          background: alreadyRated ? '#ffc107' : clubPrimary,
                          color: alreadyRated ? '#000' : '#fff',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 4,
                          fontWeight: 'bold',
                          fontSize: 13,
                          flexShrink: 0
                        }}
                      >
                        <span>{alreadyRated ? '⭐' : '📝'}</span>
                      </button>
                    ) : (
                      // Schicht noch nicht vorbei → nur Stornierungsbutton (bewusst
                      // Icon-only mit X, siehe Harmonisierung mit Verpflegung).
                      <button onClick={() => unassign(vs.id)} title="Abmelden" style={{ width: 40, height: 40, borderRadius: 10, border: 'none', background: '#fde8e8', color: '#dc3545', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0, fontSize: 20, fontWeight: 'bold' }}>
                        ✕
                      </button>
                    )}
                    <FillBar assigned={assignedCount} max={s?.maxVolunteers || 0} />
                  </div>
                </div>
              );
            })}
        </div>
      )}

      {/* Offene Jobs */}
      {activeSection === 'jobs' && (
        <>
          {busy && <div style={{ textAlign: 'center', padding: 40, color: '#666' }}>Lade Jobs...</div>}

          {!busy && isTournamentActive && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <h3 style={{ margin: '0 0 6px', fontSize: 16, color: clubPrimary }}>Offene Jobs</h3>
              {(() => {
                // Gefilterte Liste berechnen
                const filtered = shifts
                  .filter(s => !filterDate || new Date(s.date).toLocaleDateString('de-DE') === filterDate)
                  .filter(s => filterTimesOfDay.size === 0 || [...filterTimesOfDay].some(key => shiftOverlapsBlock(s.startMin, s.endMin, TIME_BLOCKS[key])))
                  .filter(s => !isPastShift(s.date, s.endMin))
                  .filter(s => {
                    // Verstecke den Job, wenn der aktuelle User bereits eingetragen ist
                    if (ctxToken && volunteerShifts.some(vs => vs.shiftId === s.id && vs.userId === ctxVolunteer?.id)) {
                      return false;
                    }
                    // Verstecke den Job, wenn er voll ist
                    const assignedCount = volunteerShifts.filter(vs => vs.shiftId === s.id).length;
                    return (s.maxVolunteers - assignedCount) > 0;
                  });
                
                // Wenn gefiltert leer → 404-Bild anzeigen
                if (filtered.length === 0 && shifts.length > 0) {
                  return (
                    <div style={{ 
                      padding: '48px 24px', 
                      background: `linear-gradient(135deg, ${clubPrimary}08, ${clubSecondary}08)`, 
                      borderRadius: 20, 
                      textAlign: 'center', 
                      boxShadow: '0 8px 32px rgba(0,0,0,0.06)',
                      border: `1px solid ${clubPrimary}15`,
                      animation: 'fadeIn 0.4s ease-out'
                    }}>
                      <img 
                        src="/404-dog.webp" 
                        alt="Keine Schichten gefunden" 
                        style={{ 
                          maxWidth: 260, 
                          height: 'auto', 
                          marginBottom: 20,
                          borderRadius: 16,
                          filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.15))',
                          transition: 'transform 0.3s ease'
                        }} 
                      />
                      <p style={{ 
                        color: '#666', 
                        fontSize: isMobile ? 14 : 15, 
                        lineHeight: 1.6,
                        maxWidth: 400,
                        margin: '0 auto'
                      }}>
                        Für diese Filterkombination sind keine offenen Jobs verfügbar.
                      </p>
                    </div>
                  );
                }
                
                // Sortierte Liste rendern
                return filtered
                  .sort((a, b) => {
                    const dateDiff = new Date(a.date).getTime() - new Date(b.date).getTime();
                    if (dateDiff !== 0) return dateDiff;
                    const timeDiff = (a.startMin ?? 0) - (b.startMin ?? 0);
                    if (timeDiff !== 0) return timeDiff;
                    const orderA = a.arbeitsbereich?.order ?? 9999;
                    const orderB = b.arbeitsbereich?.order ?? 9999;
                    if (orderA !== orderB) return orderA - orderB;
                    return (a.arbeitsbereich?.name || '').localeCompare(b.arbeitsbereich?.name || '');
                  })
            .map((slot, idx, sortedSlots) => {
              const prevSlot = idx > 0 ? sortedSlots[idx - 1] : null;
              const d = new Date(slot.date);
              const showDayHeader = !prevSlot || new Date(prevSlot.date).toDateString() !== d.toDateString();
              const dateStr = isNaN(d.getTime()) ? '' : d.toISOString().split('T')[0];
              const assigned = volunteerShifts.some(vs => vs.shiftId === slot.id && vs.userId === ctxVolunteer?.id);
              const myShift = volunteerShifts.find(vs => vs.shiftId === slot.id && vs.userId === ctxVolunteer?.id);
              const assignedCount = volunteerShifts.filter(vs => vs.shiftId === slot.id).length;
              const remaining = slot.maxVolunteers - assignedCount;

              return (
                <div key={slot.id}>
                  {showDayHeader && (
                    <div style={{ fontSize: 13, fontWeight: 'bold', color: clubPrimary, padding: '6px 0', marginTop: idx > 0 ? 8 : 0, borderTop: '1px solid #e9ecef' }}>
                      {new Date(slot.date).toLocaleDateString('de-DE', { weekday: 'long', day: '2-digit', month: '2-digit' })}
                    </div>
                  )}
                  <div style={{ position: 'relative', background: '#fff', borderRadius: 12, padding: '12px 14px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)', display: 'flex', alignItems: 'center', gap: 10, overflow: 'hidden' }}>
                    <span style={{ fontSize: 20, flexShrink: 0 }}>{slot.arbeitsbereich?.icon || '📍'}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 15, fontWeight: 700, color: '#212529', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{slot.arbeitsbereich?.name || '–'}</div>
                      <div style={{ fontSize: 12, color: '#666' }}>
                        {new Date(slot.date).toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit' })}
                        {(slot.startMin != null || slot.endMin != null) && <> · {minToTime(slot.startMin)}–{minToTime(slot.endMin)}</>}
                      </div>
                    </div>
                    <span style={{ fontSize: 14, fontWeight: 700, color: remaining > 0 ? clubAccent : '#6c757d', flexShrink: 0 }}>{remaining}/{slot.maxVolunteers}</span>
                    {assigned ? (
                      // Bewusst Icon-only mit X (Harmonisierung mit Verpflegung).
                      <button onClick={() => unassign(myShift!.id)} title="Abmelden" style={{ width: 40, height: 40, borderRadius: 10, border: 'none', background: '#fde8e8', color: '#dc3545', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0, fontSize: 18, fontWeight: 'bold' }}>
                        ✕
                      </button>
                    ) : remaining > 0 ? (
                      <button onClick={() => assign(slot.id, dateStr)} title="Zusagen" style={{ width: 40, height: 40, borderRadius: 10, border: 'none', background: clubSecondary, color: clubSecondaryText, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0 }}>
                        <span style={{ lineHeight: 1, fontWeight: 'bold', fontSize: 20 }}>+</span>
                      </button>
                    ) : (
                      <span style={{ width: 40, height: 40, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#e9ecef', color: '#adb5bd', fontSize: 20, flexShrink: 0 }}>✖</span>
                    )}
                    <FillBar assigned={assignedCount} max={slot.maxVolunteers} />
                  </div>
                </div>
              );
            });
            })()}
            </div>
          )}
        </>
      )}

      {/* Verpflegung */}
      {activeSection === 'verpflegung' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Meine Einträge */}
          {myDonations.length > 0 && (
            <div style={{ background: '#fff', borderRadius: 16, padding: 20, boxShadow: '0 2px 12px rgba(0,0,0,0.08)' }}>
              <h3 style={{ margin: '0 0 12px', fontSize: 16, fontWeight: '600', color: clubPrimary }}>📌 Meine Einträge ({myDonations.length})</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {myDonations.map(d => (
                  <div key={d.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 12, background: '#f8f9fa', borderRadius: 10 }}>
                    <div style={{ fontSize: 24 }}>{d.foodItem?.category?.icon || '🍽️'}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: '600', fontSize: 14, color: '#333' }}>{d.foodItem?.name || '–'}</div>
                      <div style={{ fontSize: 12, color: '#999' }}>{d.quantity} {d.foodItem?.unit} · {new Date(d.createdAt).toLocaleDateString('de-DE')}</div>
                      {d.note && <div style={{ fontSize: 12, color: '#666', marginTop: 2 }}>📝 {d.note}</div>}
                    </div>
                    <button onClick={() => cancelDonation(d.id)} title="Löschen" style={{ width: 36, height: 36, borderRadius: 8, border: 'none', background: '#fde8e8', color: '#dc3545', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>✕</button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Verpflegung für Kinder */}
          {foodDonationSlots.length > 0 && (
            <div style={{ background: '#fff', borderRadius: 16, padding: 20, boxShadow: '0 2px 12px rgba(0,0,0,0.08)' }}>
              <h3 style={{ margin: '0 0 12px', fontSize: 16, fontWeight: '600', color: clubPrimary }}>📊 Verpflegung für deine Kinder</h3>
              {(() => {
                // Nach Jahrgang gruppieren
                const grouped: Record<string, FoodDonationSlot[]> = {};
                foodDonationSlots.forEach(slot => {
                  const key = slot.yearGroup?.name || 'Ohne Jahrgang';
                  if (!grouped[key]) grouped[key] = [];
                  grouped[key].push(slot);
                });
                
                return Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b)).map(([yearName, slots]) => {
                  // Gesamtsumme für diesen Jahrgang
                  const totalTarget = slots.reduce((s, sl) => s + sl.targetQuantity, 0);
                  const totalCollected = slots.reduce((s, sl) => s + sl.collected, 0);
                  const progress = totalTarget > 0 ? Math.min(100, (totalCollected / totalTarget) * 100) : 0;
                  
                  // Zeige welche Kinder-Jahrgänge passen
                  const firstSlot = slots[0];
                  const matchingChildren = ctxVolunteer?.children?.filter(c => {
                    if (!c.childYear || !firstSlot.yearGroup) return false;
                    return c.childYear >= firstSlot.yearGroup.birthYearStart && c.childYear <= firstSlot.yearGroup.birthYearEnd;
                  }) || [];
                  
                  return (
                    <div key={yearName} style={{ marginBottom: 20 }}>
                      {/* Jahrgang-Header */}
                      <div style={{ background: '#f8f9fa', padding: '10px 14px', borderRadius: 10, marginBottom: 10, borderLeft: `4px solid ${clubPrimary}` }}>
                        <div style={{ fontWeight: '600', fontSize: 15, color: '#333' }}>{yearName}</div>
                        {matchingChildren.length > 0 && (
                          <div style={{ fontSize: 12, color: '#666', marginTop: 2 }}>
                            Für: {matchingChildren.map(c => c.childName ? `${c.childName} (${c.childYear})` : `Jahrgang ${c.childYear}`).join(', ')}
                          </div>
                        )}
                        <div style={{ fontSize: 13, color: '#666', marginTop: 4 }}>
                          {totalCollected} / {totalTarget} gesamt
                        </div>
                      </div>
                      {/* Fortschrittsbalken - gleiche Ampel-Logik wie bei den Job-Slots (rot/gelb/grün) */}
                      <div style={{ background: '#e9ecef', borderRadius: 4, height: 8, overflow: 'hidden', marginBottom: 10 }}>
                        <div style={{ width: `${progress}%`, height: '100%', background: progress >= 100 ? '#198754' : progress > 0 ? '#ffc107' : '#dc3545', borderRadius: 4 }} />
                      </div>
                      {/* Einzelne Artikel – erfüllte nach unten */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {slots
                          .sort((a, b) => {
                            const aDone = a.targetQuantity > 0 && a.collected >= a.targetQuantity;
                            const bDone = b.targetQuantity > 0 && b.collected >= b.targetQuantity;
                            if (aDone === bDone) return 0;
                            return aDone ? 1 : -1;
                          })
                          .map(slot => {
                          const remaining = slot.targetQuantity - slot.collected;
                          // Wie viel hat DER Helfer bereits für diesen Slot zugesagt?
                          const myCommitted = myDonations
                            .filter(d => d.foodDonationSlotId === slot.id)
                            .reduce((sum, d) => sum + d.quantity, 0);
                          const committed = slotCommitments[slot.id] || 0;
                          return (
                            <div key={slot.id} style={{ position: 'relative', padding: 12, background: '#f8f9fa', borderRadius: 10, overflow: 'hidden' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <span style={{ fontSize: 20, flexShrink: 0 }}>{slot.foodItem?.icon || '🍽️'}</span>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <div style={{ fontWeight: '600', fontSize: 14, color: '#333', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{slot.foodItem?.name || '–'}</div>
                                  <div style={{ fontSize: 12, color: '#999' }}>{slot.collected}/{slot.targetQuantity} {slot.foodItem?.unit}{remaining <= 0 && ' · ✓ Erfüllt'}</div>
                                </div>
                                {/* Zusage-Button: gleiche Höhe/Position wie bei den Jobs (rechts, Icon-only). */}
                                {remaining > 0 && !committed && (
                                  <button onClick={() => setSlotCommitments({ ...slotCommitments, [slot.id]: 1 })} title="Zusagen" style={{ width: 40, height: 40, borderRadius: 8, border: 'none', background: clubSecondary, color: clubSecondaryText, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0 }}>
                                    <span style={{ fontSize: 20, fontWeight: 'bold', lineHeight: 1 }}>+</span>
                                  </button>
                                )}
                              </div>
                              {/* Zeige wie viel der Helfer bereits bringt */}
                              {myCommitted > 0 && (
                                <div style={{ fontSize: 13, color: clubSecondary, fontWeight: '600', marginTop: 6 }}>
                                  ✅ Du bringst: {myCommitted} {slot.foodItem?.unit}
                                </div>
                              )}
                              {committed > 0 && (
                                <div style={{ marginTop: 8, display: 'flex', gap: 8, alignItems: 'center' }}>
                                  <input type="number" min="1" value={committed} onChange={e => setSlotCommitments({ ...slotCommitments, [slot.id]: parseInt(e.target.value) || 0 })} style={{ width: 70, padding: '8px 10px', border: '2px solid #e9ecef', borderRadius: 8, fontSize: 14, boxSizing: 'border-box' }} />
                                  <span style={{ fontSize: 13, color: '#666' }}>{slot.foodItem?.unit}</span>
                                  <button onClick={() => commitSlot(slot.id, slot.foodItemId!)} title="Zusagen" style={{ width: 40, height: 40, borderRadius: 8, border: 'none', background: clubSecondary, color: clubSecondaryText, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                      <polyline points="20 6 9 17 4 12" />
                                    </svg>
                                  </button>
                                  <button onClick={() => removeCommitment(slot.id)} title="Rücknahme" style={{ width: 40, height: 40, borderRadius: 8, border: 'none', background: '#fde8e8', color: '#dc3545', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', fontSize: 18, fontWeight: 'bold' }}>
                                    ✕
                                  </button>
                                </div>
                              )}
                              <FillBar assigned={slot.collected} max={slot.targetQuantity} />
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
          )}

          {/* Zusätzliche Verpflegung - nur bei aktivem Turnier eintragbar,
              abgeschlossene Turniere sind hier reine Historie. */}
          {isTournamentActive && (
          <div style={{ background: '#fff', borderRadius: 16, padding: 20, boxShadow: '0 2px 12px rgba(0,0,0,0.08)' }}>
            <h3 style={{ margin: '0 0 16px', fontSize: 16, fontWeight: '600', color: clubPrimary }}>🍞 Zusätzliche Verpflegung</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <select value={donationFoodId} onChange={e => setDonationFoodId(parseInt(e.target.value))} style={{ padding: '12px 14px', border: '2px solid #e9ecef', borderRadius: 10, fontSize: 15, outline: 'none', background: '#fff', boxSizing: 'border-box' }}>
                <option value={0}>-- Artikel auswählen --</option>
                {foodCategories.map(cat => (
                  <optgroup key={cat.id} label={`${cat.icon} ${cat.name}`}>
                    {cat.items.map(item => (
                      <option key={item.id} value={item.id}>{item.name} ({item.unit})</option>
                    ))}
                  </optgroup>
                ))}
              </select>
              <input value={donationQuantity} onChange={e => setDonationQuantity(e.target.value)} placeholder="Menge" type="number" min="1" style={{ padding: '12px 14px', border: '2px solid #e9ecef', borderRadius: 10, fontSize: 15, outline: 'none', boxSizing: 'border-box' }} />
              <input value={donationNote} onChange={e => setDonationNote(e.target.value)} placeholder="Notiz (optional)" style={{ padding: '12px 14px', border: '2px solid #e9ecef', borderRadius: 10, fontSize: 15, outline: 'none', boxSizing: 'border-box' }} />
              <button onClick={submitDonation} style={{ padding: '14px 0', background: clubSecondary, color: clubSecondaryText, border: 'none', borderRadius: 10, fontSize: 16, fontWeight: '600', cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,0.15)' }}>📦 Verpflegung eintragen</button>
            </div>
          </div>
          )}
        </div>
      )}

      {/* Menü schließen beim Klick außerhalb */}
      {menuOpen && <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 50 }} onClick={() => setMenuOpen(false)} />}

      {/* Sticky Sponsor Footer */}
      {hasSponsor && (
        <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, display: 'flex', justifyContent: 'center', pointerEvents: 'none', zIndex: 40 }}>
          <a 
            href={sponsorUrl || '#'} 
            target="_blank" 
            rel="noopener noreferrer" 
            onClick={(e) => {
              if (sponsorUrl) {
                e.preventDefault();
                modal.confirm({
                  title: 'Sponsor besuchen',
                  message: `Möchtest du zur Webseite von ${sponsorName || 'dem Sponsor'} wechseln?`,
                  variant: 'info'
                }).then(confirmed => {
                  if (confirmed) {
                    window.open(sponsorUrl, '_blank', 'noopener,noreferrer');
                  }
                });
              }
            }}
            style={{ width: '100%', maxWidth: 480, padding: '12px 16px', background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(8px)', borderTop: '1px solid rgba(0,0,0,0.05)', pointerEvents: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, boxSizing: 'border-box', boxShadow: '0 -4px 20px rgba(0,0,0,0.05)', textDecoration: 'none', cursor: sponsorUrl ? 'pointer' : 'default' }}
          >
            <span style={{ fontSize: 11, color: '#666', fontWeight: '500', textTransform: 'uppercase', letterSpacing: 0.5 }}>Powered By</span>
            {sponsorLogo ? (
              <img src={sponsorLogo} alt={sponsorName || 'Sponsor'} style={{ height: 28, objectFit: 'contain' }} onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
            ) : sponsorName ? (
              <span style={{ fontSize: 13, fontWeight: 'bold', color: clubPrimary }}>{sponsorName}</span>
            ) : null}
          </a>
        </div>
      )}

      {/* Rating Modal */}
      {ratingModalVs && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: '#fff', borderRadius: 16, padding: 24, maxWidth: 450, width: '100%', boxShadow: '0 10px 25px rgba(0,0,0,0.2)', display: 'flex', flexDirection: 'column', gap: 16, maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e9ecef', paddingBottom: 12 }}>
              <h3 style={{ margin: 0, fontSize: 18, color: clubPrimary }}>⭐ Schicht bewerten</h3>
              <button onClick={() => setRatingModalVs(null)} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#666' }}>✕</button>
            </div>
            <div style={{ fontSize: 13, color: '#555' }}>
              <strong>{ratingModalVs.shift?.arbeitsbereich?.name || 'Job'}</strong> am {new Date(ratingModalVs.date).toLocaleDateString('de-DE')} ({minToTime(ratingModalVs.shift?.startMin ?? 0)}–{minToTime(ratingModalVs.shift?.endMin ?? 0)})
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 14, fontWeight: 'bold', marginBottom: 6, color: '#333' }}>
                1. Stress & Auslastung: {['1 (Viel zu ruhig)', '2 (Eher ruhig)', '3 (Genau richtig)', '4 (Stressig)', '5 (Überlastet / Zu wenig Helfer)'][rateWorkload - 1]}
              </label>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'space-between' }}>
                {[1, 2, 3, 4, 5].map(star => (
                  <button key={star} type="button" onClick={() => setRateWorkload(star)} style={{ flex: 1, padding: '10px 0', borderRadius: 8, border: '2px solid ' + (rateWorkload === star ? clubPrimary : '#e9ecef'), background: rateWorkload === star ? clubPrimary + '15' : '#fff', fontWeight: 'bold', fontSize: 16, cursor: 'pointer' }}>
                    {star} {['😴', '🙂', '😊', '🥵', '🚨'][star - 1]}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 14, fontWeight: 'bold', marginBottom: 6, color: '#333' }}>
                2. Organisation & Einweisung: {['1 (Chaotisch)', '2 (Lückenhaft)', '3 (Okay)', '4 (Gut)', '5 (Perfekt organisiert)'][rateOrganization - 1]}
              </label>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'space-between' }}>
                {[1, 2, 3, 4, 5].map(star => (
                  <button key={star} type="button" onClick={() => setRateOrganization(star)} style={{ flex: 1, padding: '10px 0', borderRadius: 8, border: '2px solid ' + (rateOrganization === star ? clubPrimary : '#e9ecef'), background: rateOrganization === star ? clubPrimary + '15' : '#fff', fontWeight: 'bold', fontSize: 16, cursor: 'pointer' }}>
                    {star} ⭐
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 14, fontWeight: 'bold', marginBottom: 6, color: '#333' }}>
                3. Spaß & Stimmung: {['1 (Kein Spaß)', '2 (Eher zäh)', '3 (In Ordnung)', '4 (Gut)', '5 (Super Stimmung!)'][rateFun - 1]}
              </label>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'space-between' }}>
                {[1, 2, 3, 4, 5].map(star => (
                  <button key={star} type="button" onClick={() => setRateFun(star)} style={{ flex: 1, padding: '10px 0', borderRadius: 8, border: '2px solid ' + (rateFun === star ? clubPrimary : '#e9ecef'), background: rateFun === star ? clubPrimary + '15' : '#fff', fontWeight: 'bold', fontSize: 16, cursor: 'pointer' }}>
                    {star} {['😞', '😐', '🙂', '😄', '🤩'][star - 1]}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 14, fontWeight: 'bold', marginBottom: 6, color: '#333' }}>
                4. Notiz / Verbesserungsvorschlag (optional):
              </label>
              <textarea value={rateComment} onChange={e => setRateComment(e.target.value)} placeholder="Was können wir beim nächsten Mal besser machen? (z. B. fehlendes Material, Uhrzeit...)" rows={3} style={{ width: '100%', padding: '10px', border: '2px solid #e9ecef', borderRadius: 8, fontSize: 14, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }} />
            </div>

            <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
              <button onClick={() => setRatingModalVs(null)} style={{ flex: 1, padding: '12px', borderRadius: 10, border: '1px solid #ccc', background: '#fff', color: '#333', fontWeight: 'bold', cursor: 'pointer' }}>Abbrechen</button>
              <button onClick={saveRating} style={{ flex: 1, padding: '12px', borderRadius: 10, border: 'none', background: clubPrimary, color: clubPrimaryText, fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,0.15)' }}>Bewertung speichern</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
