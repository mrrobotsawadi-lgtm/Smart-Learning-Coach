import { type ReactNode, useEffect, useMemo, useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import { Link, Route, Switch, useLocation, Router as WouterRouter } from 'wouter';
import { useDiagnoseStudyWork, useHealthCheck } from '@workspace/api-client-react';
import type { StudyDiagnosis, StudyDiagnosisInput } from '@workspace/api-client-react';
import { Activity, ArrowLeft, ArrowRight, ArrowUpRight, BookOpen, Brain, Check, CheckCircle2, Clock3, Compass, Flame, GraduationCap, Languages, LoaderCircle, LockKeyhole, Menu, RotateCcw, Sparkles, Target, X } from 'lucide-react';

const queryClient = new QueryClient();
type Lang = 'en' | 'tr' | 'ar';
type Attempt = { id: string; date: string; subject: string; result: 'learned' | 'review'; errorType: string };
type CoachDiagnosis = StudyDiagnosis & { referenceExplanation?: string };
const initialQuestion = {
  id: 'tyt-math-01', exam: 'TYT', subject: 'Matematik', sourceLanguage: 'tr' as const,
  prompt: 'Bir sayının 3 katının 5 fazlası, aynı sayının 2 katının 11 eksiğine eşittir. Bu sayı kaçtır?',
  options: ['6', '8', '12', '16', '−16'], answerIndex: 4,
  referenceExplanation: 'Sayıya x diyelim. 3x + 5 = 2x − 11 denkleminden x = −16 bulunur. İşaretleri düzenlerken 5 ve −11 karşı tarafa geçince −16 elde edilir.',
};
const copy = {
  en: {
    overview:'Your learning space', welcome:'Welcome back.', subtitle:'Every mistake is a clue. Let’s follow one today.',
    overviewNav:'Overview', practiceNav:'Practice room', progress:'Your progress', week:'YOUR PRACTICE', questions:'questions explored', accuracy:'accuracy', streak:'day learning streak',
    patterns:'Patterns worth noticing', patternsSub:'Patterns are built from your own attempts.', improved:'improved', revisit:'to revisit', patternEmptyTitle:'Your patterns will take shape here', patternEmptyBody:'Complete a guided attempt first. We’ll only surface skills when your work gives us something real to notice.',
    focus:'Your next focus', focusSub:'One careful question can change a pattern.', focusEmptyTitle:'Begin with one guided question', focusEmptySub:'Your next focus will come from your own practice, not a preset guess.', start:'Start a practice', recent:'Recent practice', seeAll:'See all', noAttempts:'Your practice history starts here.', noAttemptsSub:'Complete one guided question and your learning trail will appear.',
    resultLearned:'Learned', resultReview:'Revisit', sampleLabel:'Original Turkish-language TYT-style sample · Not an official exam question', topic:'Mathematics · Algebra', improvedCount:'skills improved', revisitCount:'topics to revisit', attemptCount:'attempts', referenceUnavailable:'No explanation was returned for this attempt.',
    exam:'Choose your exam', active:'AVAILABLE NOW', tytdesc:'Build a strong foundation for the Turkish university entrance exam.', begin:'Practice TYT', sat:'COMING LATER', satdesc:'SAT practice is on its way. Your learning space is ready for it.', upcoming:'Not available yet',
    practiceTitle:'One question. A clearer understanding.', practiceIntro:'Work it through in your own words. We’ll look at the reasoning, not just the answer.',
    step:'GUIDED PRACTICE', question:'The question', yourAnswer:'Your answer', yourAnswerHint:'Choose the answer you reached', reasoning:'Your reasoning', reasoningHint:'Walk me through how you approached it…', send:'Look at my reasoning', sending:'Reading your work…', reset:'Start over',
    coach:'A closer look', confidence:'Coach confidence', reference:'Reference answer', correction:'A clearer path', diagnosis:'What happened', followup:'Try the idea again', followupSub:'A fresh question, same underlying skill.', check:'Check my answer', checking:'Checking…', correct:'You got it. The idea is settling in.', incorrect:'Not quite yet. Take another look at the explanation.', next:'Back to your overview', original:'Question language: Turkish', answer:'Answer', select:'Select an answer first', apiError:'We couldn’t reach your coach just now.', retry:'Try again', health:'Coach connection', available:'Ready to listen', disconnected:'Connection unavailable',
    brandLine:'a calmer way to learn', privateProgress:'Your progress stays on this device', desktopTitle:'TYT · Your personal study space', languageLabel:'Interface language', openNav:'Open navigation', closeNav:'Close navigation', noGrades:'No grades here. Just useful clues.', coachPlaceholder:'Share how you got there. Your coach will look for the reasoning behind the answer.', privacyNotice:'Your reasoning is sent to the AI coach for analysis. Please do not include personal details.',
    errorTypes:{ concept:'Concept gap', calculation:'Calculation slip', reading:'Reading the prompt', strategy:'Approach / strategy', careless:'Careless slip', no_error:'Your reasoning holds up', uncertain:'Still learning the pattern' },
  },
  tr: {
    overview:'Öğrenme alanın', welcome:'Tekrar hoş geldin.', subtitle:'Her yanlış bir ipucu. Bugün birinin izini sürelim.',
    overviewNav:'Genel bakış', practiceNav:'Çalışma odası', progress:'İlerlemen', week:'ÇALIŞMA GEÇMİŞİN', questions:'üzerinde çalışılan soru', accuracy:'doğruluk', streak:'günlük öğrenme serisi',
    patterns:'Dikkat çeken örüntüler', patternsSub:'Örüntüler kendi çalışmalarından doğar.', improved:'gelişen', revisit:'yeniden çalışılacak', patternEmptyTitle:'Örüntülerin burada şekillenecek', patternEmptyBody:'Önce rehberli bir çalışma tamamla. Yalnızca çalışmalarında gerçekten gördüğümüz becerileri paylaşacağız.',
    focus:'Sıradaki odağın', focusSub:'Dikkatli bir soru, bir örüntüyü değiştirebilir.', focusEmptyTitle:'Bir rehberli soruyla başla', focusEmptySub:'Sıradaki odağın hazır bir tahminden değil, kendi çalışmalarından gelecek.', start:'Alıştırmaya başla', recent:'Son çalışmalar', seeAll:'Tümünü gör', noAttempts:'Çalışma geçmişin burada başlıyor.', noAttemptsSub:'Bir rehberli soruyu tamamla, öğrenme yolun burada belirsin.',
    resultLearned:'Öğrenildi', resultReview:'Yeniden çalış', sampleLabel:'Özgün Türkçe TYT tarzı örnek · Resmî sınav sorusu değildir', topic:'Matematik · Cebir', improvedCount:'gelişen beceri', revisitCount:'yeniden çalışılacak konu', attemptCount:'çalışma', referenceUnavailable:'Bu çalışma için açıklama döndürülmedi.',
    exam:'Sınavını seç', active:'ŞİMDİ KULLANILABİLİR', tytdesc:'Türkiye üniversite sınavı için sağlam bir temel oluştur.', begin:'TYT çalış', sat:'YAKINDA', satdesc:'SAT çalışmaları yolda. Öğrenme alanın onu karşılamaya hazır.', upcoming:'Henüz kullanılamıyor',
    practiceTitle:'Bir soru. Daha net bir anlayış.', practiceIntro:'Kendi kelimelerinle çöz. Yalnızca yanıtına değil, akıl yürütmene bakacağız.',
    step:'REHBERLİ ÇALIŞMA', question:'Soru', yourAnswer:'Yanıtın', yourAnswerHint:'Ulaştığın yanıtı seç', reasoning:'Akıl yürütmen', reasoningHint:'Nasıl düşündüğünü adım adım anlat…', send:'Akıl yürütmeme bak', sending:'Yanıtın inceleniyor…', reset:'Baştan başla',
    coach:'Biraz daha yakından', confidence:'Koç güveni', reference:'Doğru yanıt', correction:'Daha net bir yol', diagnosis:'Neler oldu', followup:'Fikri yeniden dene', followupSub:'Yeni bir soru, aynı temel beceri.', check:'Yanıtımı kontrol et', checking:'Kontrol ediliyor…', correct:'Bildin. Fikir yerine oturuyor.', incorrect:'Henüz değil. Açıklamaya yeniden göz at.', next:'Genel bakışa dön', original:'Soru dili: Türkçe', answer:'Yanıt', select:'Önce bir yanıt seç', apiError:'Koçuna şu an ulaşamıyoruz.', retry:'Yeniden dene', health:'Koç bağlantısı', available:'Dinlemeye hazır', disconnected:'Bağlantı yok',
    brandLine:'daha sakin bir öğrenme yolu', privateProgress:'İlerlemen bu cihazda saklanır', desktopTitle:'TYT · Kişisel çalışma alanın', languageLabel:'Arayüz dili', openNav:'Gezinmeyi aç', closeNav:'Gezinmeyi kapat', noGrades:'Not yok. Yalnızca işe yarar ipuçları.', coachPlaceholder:'Nasıl çözdüğünü paylaş. Koçun yanıtın arkasındaki düşünceyi anlamaya çalışacak.', privacyNotice:'Çözümün analiz için yapay zekâ koçuna gönderilir. Lütfen kişisel bilgilerini paylaşma.',
    errorTypes:{ concept:'Kavram eksikliği', calculation:'İşlem hatası', reading:'Soruyu okuma', strategy:'Yaklaşım / strateji', careless:'Dikkatsizlik', no_error:'Akıl yürütmen doğru', uncertain:'Örüntü henüz netleşiyor' },
  },
  ar: {
    overview:'مساحة التعلّم', welcome:'مرحبًا بعودتك.', subtitle:'كل خطأ يحمل دلالة. لنكتشف واحدة اليوم.',
    overviewNav:'نظرة عامة', practiceNav:'جلسة تدريب', progress:'تقدّمك', week:'سجلّ التدريب', questions:'أسئلة استكشفتها', accuracy:'دقّة الإجابات', streak:'أيام التعلّم المتتالية',
    patterns:'أنماط تستحق الانتباه', patternsSub:'تتشكّل الأنماط من محاولاتك أنت.', improved:'تحسّنت', revisit:'تحتاج إلى مراجعة', patternEmptyTitle:'ستتشكّل أنماطك هنا', patternEmptyBody:'أكمل محاولة موجّهة أولًا. لن نعرض مهارة إلا عندما تمنحنا محاولاتك سببًا حقيقيًا لذلك.',
    focus:'تركيزك القادم', focusSub:'سؤال واحد بتأنٍ قد يغيّر نمطًا كاملًا.', start:'ابدأ التدريب', recent:'التدريب الأخير', seeAll:'عرض الكل', noAttempts:'سجل تدريبك يبدأ من هنا.', noAttemptsSub:'أكمل سؤالًا موجّهًا لتظهر رحلة تعلّمك هنا.',
    exam:'اختر امتحانك', active:'متاح الآن', tytdesc:'ابنِ أساسًا متينًا لامتحان دخول الجامعة في تركيا.', begin:'تدرّب على TYT', sat:'قريبًا', satdesc:'تدريب SAT قادم. مساحة تعلّمك مستعدة له.', upcoming:'غير متاح بعد',
    practiceTitle:'سؤال واحد. فهم أوضح.', practiceIntro:'حلّه بكلماتك. سننظر إلى طريقة تفكيرك لا إلى الإجابة فقط.',
    step:'تدريب موجّه', question:'السؤال', yourAnswer:'إجابتك', yourAnswerHint:'اختر الإجابة التي توصلت إليها', reasoning:'طريقة تفكيرك', reasoningHint:'اشرح لي كيف تعاملت مع السؤال…', send:'راجع طريقة تفكيري', sending:'نراجع إجابتك…', reset:'ابدأ من جديد',
    coach:'نظرة أقرب', confidence:'ثقة المدرّب', reference:'الإجابة المرجعية', correction:'طريقة أوضح', diagnosis:'ما الذي حدث', followup:'جرّب الفكرة مجددًا', followupSub:'سؤال جديد، والمهارة نفسها.', check:'تحقّق من إجابتي', checking:'جارٍ التحقق…', correct:'أحسنت. بدأت الفكرة تترسخ.', incorrect:'ليس بعد. ألقِ نظرة أخرى على الشرح.', next:'العودة إلى النظرة العامة', original:'لغة السؤال الأصلية: التركية', answer:'الإجابة', select:'اختر إجابة أولًا', apiError:'تعذّر الاتصال بمدرّبك الآن.', retry:'حاول مجددًا', health:'اتصال المدرّب', available:'مستعد للاستماع', disconnected:'الاتصال غير متاح',
    errorTypes:{ concept:'فجوة في المفهوم', calculation:'خطأ حسابي', reading:'قراءة السؤال', strategy:'النهج / الاستراتيجية', careless:'سهو غير مقصود', no_error:'تفكيرك سليم', uncertain:'النمط لا يزال قيد التعلّم' },
    brandLine:'تعلّم أكثر هدوءًا', privateProgress:'يُحفَظ تقدّمك على هذا الجهاز', desktopTitle:'TYT · مساحة دراستك الشخصية', languageLabel:'لغة الواجهة', openNav:'فتح التنقّل', closeNav:'إغلاق التنقّل', noGrades:'لا درجات هنا، بل إشارات مفيدة.', coachPlaceholder:'أخبرنا كيف وصلت إلى إجابتك. سيبحث المدرّب عن طريقة التفكير وراءها.', privacyNotice:'تُرسل طريقة تفكيرك إلى المدرّب الذكي لتحليلها. لا تُدرج معلومات شخصية.',
    focusEmptyTitle:'ابدأ بسؤال موجّه واحد', focusEmptySub:'سيأتي تركيزك القادم من تدريبك أنت، لا من تخمين جاهز.', resultLearned:'تم التعلّم', resultReview:'بحاجة إلى مراجعة', sampleLabel:'نموذج أصلي باللغة التركية على نمط TYT · ليس سؤالًا رسميًا', topic:'رياضيات · جبر', improvedCount:'مهارة تحسّنت', revisitCount:'موضوع للمراجعة', attemptCount:'محاولات', referenceUnavailable:'لم يُعَد شرح لهذه المحاولة.',
  },
} as const;
type Copy = (typeof copy)[Lang];

function App() {
  return <QueryClientProvider client={queryClient}><TooltipProvider><WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}><Router /></WouterRouter><Toaster /></TooltipProvider></QueryClientProvider>;
}
function Router() {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}><Switch><Route path="/" component={Home} /><Route path="/practice" component={Practice} /><Route component={NotFound} /></Switch></ErrorBoundary>;
}

function useCoachData() {
  const [lang, setLang] = useState<Lang>(() => (localStorage.getItem('coach-language') as Lang) || 'en');
  const [attempts, setAttempts] = useState<Attempt[]>(() => {
    try { return JSON.parse(localStorage.getItem('coach-attempts') || '[]') as Attempt[]; } catch { return []; }
  });
  useEffect(() => { localStorage.setItem('coach-language', lang); }, [lang]);
  useEffect(() => { localStorage.setItem('coach-attempts', JSON.stringify(attempts)); }, [attempts]);
  return { lang, setLang, t: copy[lang], attempts, setAttempts };
}

function localDateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
function currentDayStreak(attempts: Attempt[]) {
  const practiceDays = new Set(attempts.map((attempt) => localDateKey(new Date(attempt.date))).filter((key) => key !== 'NaN-NaN-NaN'));
  const today = new Date();
  const todayKey = localDateKey(today);
  const yesterday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1);
  const yesterdayKey = localDateKey(yesterday);
  let cursor = practiceDays.has(todayKey) ? today : practiceDays.has(yesterdayKey) ? yesterday : null;
  let streak = 0;
  while (cursor && practiceDays.has(localDateKey(cursor))) {
    streak += 1;
    cursor = new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate() - 1);
  }
  return streak;
}
type PatternSummary = { key: string; errorType: string; subject: string; learned: number; review: number; count: number };
function summarizePatterns(attempts: Attempt[]): PatternSummary[] {
  const grouped = new Map<string, PatternSummary>();
  for (const attempt of attempts) {
    const key = `${attempt.errorType}:${attempt.subject}`;
    const group = grouped.get(key) ?? { key, errorType: attempt.errorType, subject: attempt.subject, learned: 0, review: 0, count: 0 };
    group.count += 1;
    if (attempt.result === 'learned') group.learned += 1;
    else group.review += 1;
    grouped.set(key, group);
  }
  return [...grouped.values()].sort((a, b) => b.review - a.review || b.count - a.count);
}
function translatedError(t: Copy, errorType: string) {
  return t.errorTypes[errorType as keyof typeof t.errorTypes] ?? t.errorTypes.uncertain;
}
function translatedSubject(t: Copy, subject: string) {
  return subject === 'Matematik' || subject === 'Mathematics' ? t.topic : subject;
}

function Shell({ children, lang, setLang, t }: { children: ReactNode; lang: Lang; setLang: (l: Lang) => void; t: Copy }) {
  const [path] = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const health = useHealthCheck();
  const isRtl = lang === 'ar';
  return <div dir={isRtl ? 'rtl' : 'ltr'} className="app-shell min-h-[100dvh]">
    <aside className={`sidebar fixed inset-y-0 z-30 flex w-[248px] flex-col px-5 py-6 transition-transform duration-300 ${menuOpen ? 'translate-x-0' : isRtl ? 'translate-x-full md:translate-x-0 right-0' : '-translate-x-full md:translate-x-0 left-0'}`}>
      <Link href="/" className="mb-12 flex items-center gap-3 text-inherit no-underline" data-testid="link-brand">
        <span className="grid size-10 place-items-center rounded-xl bg-[#d2a17e] text-[#233d35]"><Brain size={21} /></span>
        <span><span className="block font-bold tracking-tight">nook</span><span className="text-[11px] text-[#b7c6bd]">{t.brandLine}</span></span>
      </Link>
      <div className="mb-3 px-3 text-[10px] font-bold uppercase tracking-[.16em] text-[#95aa9e]">{t.overview}</div>
      <nav className="space-y-1">
        <Link href="/" onClick={() => setMenuOpen(false)} className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm no-underline transition-colors ${path === '/' ? 'bg-[#36584c] text-white' : 'text-[#d4dfd7] hover:bg-[#2d4b40]'}`} data-testid="link-overview"><Activity size={17} />{t.overviewNav}</Link>
        <Link href="/practice" onClick={() => setMenuOpen(false)} className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm no-underline transition-colors ${path === '/practice' ? 'bg-[#36584c] text-white' : 'text-[#d4dfd7] hover:bg-[#2d4b40]'}`} data-testid="link-practice"><BookOpen size={17} />{t.practiceNav}</Link>
      </nav>
      <div className="mt-auto rounded-2xl border border-[#49665b] bg-[#2a493e] p-4">
        <div className="mb-3 flex items-center gap-2 text-xs text-[#b7c6bd]"><span className={`size-2 rounded-full ${health.isSuccess ? 'bg-[#a5c68a]' : 'bg-[#c98e72]'}`} />{t.health}</div>
        {health.isLoading ? <div className="h-4 w-24 animate-pulse rounded bg-[#456257]" /> : <p className="m-0 text-sm font-medium">{health.isSuccess ? t.available : t.disconnected}</p>}
      </div>
      <div className="mt-4 flex items-center gap-2 text-[11px] text-[#a9b9b0]"><LockKeyhole size={13} />{t.privateProgress}</div>
    </aside>
    {menuOpen && <button aria-label={t.closeNav} className="fixed inset-0 z-20 bg-[#15231e]/40 md:hidden" onClick={() => setMenuOpen(false)} data-testid="button-close-menu" />}
    <main className="min-h-[100dvh] md:ms-[248px]">
      <header className="sticky top-0 z-10 flex h-[70px] items-center justify-between border-b border-[#deddd3]/80 bg-[#f7f6f0]/90 px-5 backdrop-blur-md md:px-10">
        <button onClick={() => setMenuOpen(true)} className="grid size-10 place-items-center rounded-xl text-[#40554b] hover:bg-[#ecebe2] md:hidden" aria-label={t.openNav} data-testid="button-open-menu"><Menu size={20} /></button>
        <span className="hidden text-xs font-medium text-[#718078] md:block">{t.desktopTitle}</span>
        <div className="ms-auto flex items-center gap-3">
          <Languages size={16} className="text-[#6b7d73]" />
          <label className="sr-only" htmlFor="language-select">{t.languageLabel}</label>
          <select id="language-select" value={lang} onChange={(e) => setLang(e.target.value as Lang)} className="cursor-pointer rounded-lg border border-[#deddd3] bg-[#fbfaf6] px-2.5 py-2 text-xs font-semibold text-[#40554b] outline-none focus:ring-2 focus:ring-[#688878]" data-testid="select-language">
            <option value="en">English</option><option value="tr">Türkçe</option><option value="ar">العربية</option>
          </select>
          <div className="grid size-9 place-items-center rounded-full bg-[#e8d9ca] text-xs font-bold text-[#5b4334]" data-testid="text-student-avatar">D</div>
        </div>
      </header>
      <div className="mx-auto max-w-[1190px] px-5 py-8 md:px-10 md:py-10">{children}</div>
    </main>
  </div>;
}

function Home() {
  const { lang, setLang, t, attempts } = useCoachData();
  const count = attempts.length;
  const learned = attempts.filter((a) => a.result === 'learned').length;
  const accuracy = count ? Math.round((learned / count) * 100) : 0;
  const streak = currentDayStreak(attempts);
  const patterns = summarizePatterns(attempts);
  const revisitPattern = patterns.find((pattern) => pattern.review > 0);
  return <Shell lang={lang} setLang={setLang} t={t}>
    <section className="fade-up mb-9 flex flex-col justify-between gap-6 md:flex-row md:items-end">
      <div><p className="mb-2 text-xs font-bold uppercase tracking-[.17em] text-[#bd7958]">{t.overview}</p><h1 className="serif mb-2 text-[clamp(2rem,4vw,3.2rem)] font-semibold leading-tight tracking-[-.045em] text-[#293f36]" data-testid="text-welcome">{t.welcome}</h1><p className="m-0 text-sm text-[#718078]">{t.subtitle}</p></div>
      <div className="flex items-center gap-2 rounded-xl border border-[#dfded5] bg-[#fbfaf6] px-4 py-3 text-xs text-[#68766e]" data-testid="status-day-streak"><Flame size={16} className="text-[#bf7957]" /><span><strong className="text-[#34483e]">{streak}</strong> {t.streak}</span></div>
    </section>
    <section className="grid gap-5 lg:grid-cols-[1.6fr_1fr]">
      <div className="panel soft-shadow fade-up p-6 md:p-8">
        <div className="flex items-start justify-between gap-4"><div><p className="mb-2 text-[10px] font-bold tracking-[.18em] text-[#9b7560]">{t.week}</p><h2 className="serif mb-1 text-2xl font-semibold text-[#2b4037]">{t.progress}</h2><p className="m-0 text-sm text-[#78857d]">{count ? `${count} ${t.questions}` : t.noAttemptsSub}</p></div><div className="grid size-12 place-items-center rounded-2xl bg-[#edf1e8] text-[#547867]"><Activity size={21} /></div></div>
        <div className="mt-8 grid grid-cols-2 gap-5 md:grid-cols-3">
          <Metric value={String(count).padStart(2, '0')} label={t.questions} />
          <Metric value={`${accuracy}%`} label={t.accuracy} />
          <div className="col-span-2 md:col-span-1"><div className="mb-2 flex items-center justify-between text-xs"><span className="text-[#758078]">{t.accuracy}</span><span className="font-semibold text-[#375848]">{accuracy}%</span></div><div className="progress-track"><div className="progress-fill" style={{ width: `${accuracy}%` }} /></div></div>
        </div>
        {count === 0 && <div className="mt-7 rounded-xl bg-[#f4f2eb] px-4 py-3 text-xs text-[#788078]" data-testid="empty-progress">{t.patternEmptyBody}</div>}
      </div>
      <div className="relative overflow-hidden rounded-[1.15rem] bg-[#dbe6db] p-6 md:p-7">
        <div className="absolute -right-9 -top-10 size-40 rounded-full border-[22px] border-[#c4d7c5]/50" /><div className="absolute bottom-0 right-14 size-16 rounded-full bg-[#c0d1bf]/60" />
        <div className="relative"><div className="mb-5 grid size-10 place-items-center rounded-xl bg-[#f7f5eb] text-[#577c67]"><Target size={20} /></div><p className="mb-1 text-[10px] font-bold tracking-[.15em] text-[#718b77]">{t.focus}</p><h2 className="serif mb-2 text-xl font-semibold text-[#2d4839]" data-testid="text-next-focus">{revisitPattern ? translatedError(t, revisitPattern.errorType) : t.focusEmptyTitle}</h2><p className="mb-6 max-w-xs text-sm leading-relaxed text-[#64796a]">{revisitPattern ? `${translatedSubject(t, revisitPattern.subject)} · ${revisitPattern.review} ${t.revisit}` : t.focusEmptySub}</p><Link href="/practice" className="inline-flex items-center gap-2 rounded-xl bg-[#315846] px-4 py-3 text-sm font-semibold text-white no-underline transition hover:bg-[#244637]" data-testid="link-start-practice">{t.start}<ArrowRight size={16} /></Link></div>
      </div>
    </section>
    <section className="mt-8 grid gap-5 lg:grid-cols-[1.05fr_1fr]">
      <div className="panel p-6 md:p-7">
        <div className="mb-5"><p className="mb-1 text-[10px] font-bold uppercase tracking-[.16em] text-[#bd7958]">{t.patterns}</p><h2 className="serif m-0 text-xl font-semibold text-[#2b4037]">{t.patternsSub}</h2></div>
        {patterns.length === 0 ? <div className="rounded-xl bg-[#f5f3ed] p-5" data-testid="empty-patterns"><p className="m-0 text-sm font-semibold text-[#43564b]">{t.patternEmptyTitle}</p><p className="m-0 mt-2 text-xs leading-relaxed text-[#7d887f]">{t.patternEmptyBody}</p></div> : <div className="space-y-3">{patterns.slice(0, 4).map((pattern) => <PatternSummaryCard key={pattern.key} pattern={pattern} t={t} />)}</div>}
      </div>
      <div className="panel p-6 md:p-7">
        <div className="mb-5 flex items-center justify-between"><div><p className="mb-1 text-[10px] font-bold uppercase tracking-[.16em] text-[#bd7958]">{t.recent}</p><h2 className="serif m-0 text-xl font-semibold text-[#2b4037]">{count ? t.recent : t.noAttempts}</h2></div><Clock3 size={18} className="text-[#839087]" /></div>
        {attempts.length === 0 ? <div className="rounded-xl bg-[#f5f3ed] px-4 py-4 text-sm leading-relaxed text-[#78857d]" data-testid="empty-recent">{t.noAttemptsSub}</div> : <div className="space-y-2">{attempts.slice(0, 3).map((attempt) => <div key={attempt.id} className="flex items-center justify-between rounded-xl bg-[#f5f3ed] px-4 py-3" data-testid={`row-attempt-${attempt.id}`}><div><p className="m-0 text-sm font-semibold text-[#40554b]">{translatedSubject(t, attempt.subject)} · {translatedError(t, attempt.errorType)}</p><p className="m-0 mt-1 text-xs text-[#879088]">{new Date(attempt.date).toLocaleDateString(lang)}</p></div><span className="rounded-full bg-[#e4ece2] px-2.5 py-1 text-[10px] font-semibold text-[#50715a]" data-testid={`status-attempt-${attempt.id}`}>{attempt.result === 'learned' ? t.resultLearned : t.resultReview}</span></div>)}</div>}
        <Link href="/practice" className="mt-5 inline-flex items-center gap-1 text-xs font-bold text-[#50715e] no-underline hover:text-[#284c38]" data-testid="link-see-practice">{t.seeAll}<ArrowUpRight size={14} /></Link>
      </div>
    </section>
    <section className="mt-8">
      <div className="mb-4"><p className="mb-1 text-[10px] font-bold uppercase tracking-[.16em] text-[#bd7958]">{t.exam}</p><h2 className="serif m-0 text-2xl font-semibold text-[#2b4037]">{t.exam}</h2></div>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="panel flex flex-col justify-between gap-6 border-[#d7dfd4] p-6 md:flex-row md:items-center"><div className="flex gap-4"><div className="grid size-12 shrink-0 place-items-center rounded-2xl bg-[#e9efe6] text-[#4d755f]"><GraduationCap size={22} /></div><div><div className="mb-1 flex items-center gap-2"><h3 className="m-0 text-lg font-bold text-[#33483d]">TYT</h3><span className="rounded-full bg-[#e7efe4] px-2 py-1 text-[9px] font-bold tracking-wide text-[#5d7c62]">{t.active}</span></div><p className="m-0 max-w-xs text-sm leading-relaxed text-[#77837a]">{t.tytdesc}</p></div></div><Link href="/practice" className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-[#315846] px-4 py-3 text-sm font-semibold text-white no-underline hover:bg-[#244637]" data-testid="link-practice-tyt">{t.begin}<ArrowRight size={15} /></Link></div>
        <div className="flex items-center gap-4 rounded-[1.15rem] border border-dashed border-[#d3d3c7] bg-[#f2f0e9] p-6"><div className="grid size-12 shrink-0 place-items-center rounded-2xl bg-[#e7e4db] text-[#82867c]"><LockKeyhole size={20} /></div><div><div className="mb-1 flex items-center gap-2"><h3 className="m-0 text-lg font-bold text-[#656e66]">SAT</h3><span className="rounded-full bg-[#e6e4dc] px-2 py-1 text-[9px] font-bold tracking-wide text-[#7f847c]">{t.sat}</span></div><p className="m-0 max-w-sm text-sm leading-relaxed text-[#878b83]">{t.satdesc}</p></div></div>
      </div>
    </section>
  </Shell>;
}
function Metric({ value, label }: { value: string; label: string }) { return <div><div className="serif text-3xl font-semibold tracking-tight text-[#315846]" data-testid={`metric-${label}`}>{value}</div><div className="mt-1 text-xs text-[#78857d]">{label}</div></div>; }
function PatternSummaryCard({ pattern, t }: { pattern: PatternSummary; t: Copy }) {
  return <div className="rounded-xl border border-[#ece9df] bg-[#fbfaf6] p-4" data-testid={`card-pattern-${pattern.key}`}>
    <div className="flex items-start justify-between gap-3"><div><p className="m-0 text-sm font-semibold text-[#43564b]">{translatedError(t, pattern.errorType)}</p><p className="m-0 mt-1 text-xs text-[#7d887f]">{translatedSubject(t, pattern.subject)}</p></div><span className="rounded-full bg-[#f1eee5] px-2.5 py-1 text-[10px] font-semibold text-[#758078]">{pattern.count} {t.attemptCount}</span></div>
    <div className="mt-3 flex flex-wrap gap-2">{pattern.learned > 0 && <span className="rounded-full bg-[#e5eee4] px-2.5 py-1 text-[10px] font-semibold text-[#52715e]">{pattern.learned} {t.improved}</span>}{pattern.review > 0 && <span className="rounded-full bg-[#f4e9df] px-2.5 py-1 text-[10px] font-semibold text-[#a06c4e]">{pattern.review} {t.revisit}</span>}</div>
  </div>;
}

function Practice() {
  const { lang, setLang, t, setAttempts } = useCoachData();
  const [selected, setSelected] = useState<number | null>(null);
  const [reasoning, setReasoning] = useState('');
  const [diagnosis, setDiagnosis] = useState<CoachDiagnosis | null>(null);
  const [activeAttemptId, setActiveAttemptId] = useState('');
  const [practiceChoice, setPracticeChoice] = useState<number | null>(null);
  const [checked, setChecked] = useState(false);
  const [error, setError] = useState('');
  const mutation = useDiagnoseStudyWork();
  const { mutate, isPending } = mutation;
  const tLocal = t;
  const isRtl = lang === 'ar';
  const input: StudyDiagnosisInput | null = useMemo(() => {
    if (selected === null || !reasoning.trim()) return null;
    return { exam: 'TYT', subject: initialQuestion.subject, sourceLanguage: 'tr', explanationLanguage: lang, question: initialQuestion.prompt, studentWork: reasoning.trim(), selectedAnswer: initialQuestion.options[selected], referenceAnswer: initialQuestion.options[initialQuestion.answerIndex], referenceExplanation: initialQuestion.referenceExplanation };
  }, [selected, reasoning, lang]);
  const submit = () => {
    if (!input) { setError(tLocal.select); return; }
    setError('');
    setDiagnosis(null);
    setChecked(false);
    mutate({ data: input }, {
      onSuccess: (result) => {
        const localizedResult = result as CoachDiagnosis;
        setDiagnosis(localizedResult); setPracticeChoice(null); setChecked(false);
        const date = new Date().toISOString();
        if (activeAttemptId) {
          setAttempts((prev) => prev.map((attempt) => attempt.id === activeAttemptId ? { ...attempt, date, result: 'review', errorType: result.errorType } : attempt));
        } else {
          const id = `${Date.now()}`;
          setActiveAttemptId(id);
          setAttempts((prev) => [{ id, date, subject: initialQuestion.subject, result: 'review', errorType: result.errorType }, ...prev]);
        }
      },
      onError: () => setError(tLocal.apiError),
    });
  };
  const reset = () => { setSelected(null); setReasoning(''); setDiagnosis(null); setActiveAttemptId(''); setPracticeChoice(null); setChecked(false); setError(''); };
  const isCorrect = practiceChoice === diagnosis?.practice.answerIndex;
  const checkPractice = () => {
    if (practiceChoice === null || !diagnosis) { setError(tLocal.select); return; }
    setChecked(true);
    if (practiceChoice === diagnosis.practice.answerIndex) {
      setAttempts((prev) => prev.map((attempt) => attempt.id === activeAttemptId ? { ...attempt, result: 'learned' } : attempt));
    }
  };
  return <Shell lang={lang} setLang={setLang} t={t}>
    <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
      <div><Link href="/" className="mb-4 inline-flex items-center gap-1 text-xs font-semibold text-[#748279] no-underline hover:text-[#315846]" data-testid="link-back-overview"><ArrowLeft size={14} />{t.overviewNav}</Link><p className="mb-2 text-[10px] font-bold uppercase tracking-[.17em] text-[#bd7958]">{t.step}</p><h1 className="serif mb-2 text-[clamp(1.9rem,4vw,2.7rem)] font-semibold leading-tight tracking-[-.04em] text-[#293f36]" data-testid="text-practice-title">{t.practiceTitle}</h1><p className="m-0 max-w-2xl text-sm leading-relaxed text-[#758078]">{t.practiceIntro}</p></div>
      <button onClick={reset} className="inline-flex items-center gap-2 rounded-xl border border-[#deddd3] bg-[#fbfaf6] px-3.5 py-2.5 text-xs font-semibold text-[#617268] hover:bg-[#efeee6]" data-testid="button-reset-practice"><RotateCcw size={14} />{t.reset}</button>
    </div>
    <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1.12fr)_minmax(340px,.88fr)]">
      <section className="panel soft-shadow p-5 md:p-7">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2"><div className="flex items-center gap-2"><span className="rounded-full bg-[#e8eee5] px-2.5 py-1 text-[10px] font-bold text-[#52715e]">TYT</span><span className="text-xs text-[#829087]">{t.topic}</span></div><span className="flex items-center gap-1.5 text-[10px] text-[#8a938b]"><Languages size={13} />{t.original}</span></div>
        <p className="mb-4 text-[10px] font-semibold leading-relaxed text-[#9a785f]" data-testid="text-question-source">{t.sampleLabel}</p>
        <div className="rounded-2xl bg-[#f5f3ec] p-5 md:p-6" dir="ltr"><p className="mb-3 text-[10px] font-bold uppercase tracking-[.15em] text-[#a77a60]">{t.question}</p><p className="m-0 text-[17px] leading-[1.85] text-[#31453a]" lang="tr" data-testid="text-question">{initialQuestion.prompt}</p></div>
        <fieldset className="mt-6"><legend className="mb-1 text-sm font-bold text-[#43564b]">{t.yourAnswer}</legend><p className="mb-3 mt-0 text-xs text-[#8a938b]">{t.yourAnswerHint}</p><div className="grid gap-2 sm:grid-cols-2" dir="ltr">{initialQuestion.options.map((option, index) => <button key={option} type="button" onClick={() => setSelected(index)} className={`flex items-center gap-3 rounded-xl border px-4 py-3 text-start transition ${selected === index ? 'border-[#6b9276] bg-[#edf3eb] text-[#315846] ring-1 ring-[#6b9276]' : 'border-[#e5e2d8] bg-[#fbfaf6] text-[#5d6c62] hover:border-[#b9cabb]'}`} data-testid={`button-answer-${index}`}><span className={`grid size-7 shrink-0 place-items-center rounded-full text-xs font-bold ${selected === index ? 'bg-[#50745d] text-white' : 'bg-[#eeece5] text-[#758077]'}`}>{String.fromCharCode(65 + index)}</span><span className="text-sm">{option}</span>{selected === index && <Check size={15} className="ms-auto" />}</button>)}</div></fieldset>
        <div className="mt-6"><label htmlFor="reasoning" className="mb-2 block text-sm font-bold text-[#43564b]">{t.reasoning}</label><textarea id="reasoning" value={reasoning} onChange={(e) => setReasoning(e.target.value)} placeholder={t.reasoningHint} rows={4} maxLength={5000} className="w-full resize-y rounded-xl border border-[#e1ded4] bg-[#fbfaf6] px-4 py-3 text-sm leading-relaxed text-[#394c41] outline-none placeholder:text-[#a0a69e] focus:border-[#89a28d] focus:ring-2 focus:ring-[#e4ece2]" data-testid="input-reasoning" /><p className="mt-2 text-xs leading-relaxed text-[#929991]" data-testid="text-ai-privacy">{t.privacyNotice}</p></div>
        {error && <div role="alert" className="mt-4 flex flex-wrap items-center gap-2 rounded-xl bg-[#f9e9e2] px-4 py-3 text-sm text-[#a24f3f]" data-testid="status-error"><X size={16} />{error}{error === t.apiError && <button onClick={submit} className="ms-auto font-bold underline underline-offset-2" data-testid="button-retry-diagnosis">{t.retry}</button>}</div>}
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3"><span className="text-xs text-[#929991]">{t.noGrades}</span><button onClick={submit} disabled={isPending || !reasoning.trim() || selected === null} className="inline-flex items-center gap-2 rounded-xl bg-[#315846] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#244637] disabled:cursor-not-allowed disabled:opacity-50" data-testid="button-submit-diagnosis">{isPending ? <><LoaderCircle size={16} className="animate-spin" />{t.sending}</> : <>{t.send}<ArrowRight size={15} /></>}</button></div>
      </section>
      <section className="space-y-5">
        {!diagnosis && !isPending && <div className="panel flex min-h-[320px] flex-col items-center justify-center px-8 py-10 text-center"><div className="mb-4 grid size-14 place-items-center rounded-2xl bg-[#f0eee5] text-[#849188]"><Sparkles size={23} /></div><h2 className="serif mb-2 text-xl font-semibold text-[#43564b]">{t.coach}</h2><p className="m-0 max-w-xs text-sm leading-relaxed text-[#879188]">{t.coachPlaceholder}</p><div className="mt-6 flex items-center gap-2 text-[11px] text-[#8b968d]"><span className="size-1.5 rounded-full bg-[#8caa91]" />{t.available}</div></div>}
        {isPending && <div className="panel min-h-[320px] animate-pulse p-7" data-testid="status-diagnosis-loading"><div className="mb-7 h-4 w-28 rounded bg-[#e9e8de]" /><div className="mb-3 h-6 w-3/4 rounded bg-[#eeece3]" /><div className="mb-2 h-4 w-full rounded bg-[#eeece3]" /><div className="mb-2 h-4 w-5/6 rounded bg-[#eeece3]" /><div className="mt-8 h-24 rounded-2xl bg-[#f2f0e8]" /></div>}
        {diagnosis && <div className="panel fade-up overflow-hidden" data-testid="card-diagnosis">
          <div className="bg-[#e5eee4] px-6 py-5"><div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-[.12em] text-[#54745c]"><Sparkles size={15} />{t.coach}</div><h2 className="serif m-0 text-xl font-semibold text-[#2d4938]">{t.errorTypes[diagnosis.errorType]}</h2><div className="mt-4 flex items-center justify-between text-xs text-[#607466]"><span>{t.confidence}</span><strong data-testid="text-confidence">{Math.round(diagnosis.confidence * 100)}%</strong></div><div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[#cbdacb]"><div className="h-full rounded-full bg-[#688d6e] transition-[width]" style={{ width: `${Math.max(0, Math.min(diagnosis.confidence * 100, 100))}%` }} /></div></div>
          <div className="space-y-5 p-6">
            <DiagnosisPart title={t.diagnosis} text={diagnosis.diagnosis} testId="text-diagnosis" />
            <DiagnosisPart title={t.correction} text={diagnosis.correction} testId="text-correction" />
            <div className="rounded-xl border border-[#e7e4db] bg-[#f8f7f1] p-4" data-testid="text-reference-explanation"><p className="mb-1 text-[10px] font-bold uppercase tracking-[.12em] text-[#9b765f]">{t.reference} · {diagnosis.referenceAnswer}</p><p className="m-0 text-xs leading-relaxed text-[#6e7c72]">{diagnosis.referenceExplanation ?? t.referenceUnavailable}</p></div>
          </div>
        </div>}
      </section>
    </div>
    {diagnosis && <section className="panel fade-up mt-6 p-5 md:p-7" data-testid="card-followup" dir={isRtl ? 'rtl' : 'ltr'}>
      <div className="mb-5 flex items-start gap-3"><div className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#f1e6db] text-[#a66e50]"><Compass size={19} /></div><div><p className="mb-1 text-[10px] font-bold uppercase tracking-[.15em] text-[#b17b5f]">{t.followup}</p><h2 className="serif m-0 text-xl font-semibold text-[#33483d]">{t.followupSub}</h2></div></div>
      <div dir={isRtl ? 'rtl' : 'ltr'} className="rounded-xl bg-[#f5f3ec] p-5"><p className="mb-4 text-[15px] leading-relaxed text-[#34473d]" data-testid="text-followup-question">{diagnosis.practice.prompt}</p><div className="grid gap-2 sm:grid-cols-2">{diagnosis.practice.options.map((option, index) => <button key={`${option}-${index}`} onClick={() => { setPracticeChoice(index); setChecked(false); }} className={`flex items-center gap-3 rounded-xl border px-4 py-3 text-start text-sm transition ${practiceChoice === index ? 'border-[#6b9276] bg-[#edf3eb] text-[#315846]' : 'border-[#e5e2d8] bg-[#fbfaf6] text-[#5d6c62] hover:border-[#b9cabb]'}`} data-testid={`button-followup-${index}`}><span className="grid size-7 place-items-center rounded-full bg-[#eeece5] text-xs font-bold text-[#758077]">{String.fromCharCode(65 + index)}</span>{option}{practiceChoice === index && <Check size={15} className="ms-auto" />}</button>)}</div></div>
      {checked && <div className={`mt-4 flex items-start gap-3 rounded-xl px-4 py-4 ${isCorrect ? 'bg-[#e8f0e5] text-[#456a4f]' : 'bg-[#f8ede6] text-[#93644e]'}`} data-testid="status-practice-result"><CheckCircle2 size={18} className="mt-0.5 shrink-0" /><div><p className="m-0 text-sm font-bold">{isCorrect ? t.correct : t.incorrect}</p><p className="m-0 mt-1 text-xs leading-relaxed">{diagnosis.practice.explanation}</p></div></div>}
      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">{error && !isPending && <p className="m-0 text-xs text-[#a24f3f]">{error}</p>}<button onClick={checkPractice} disabled={checked && isCorrect} className="ms-auto inline-flex items-center gap-2 rounded-xl bg-[#315846] px-5 py-3 text-sm font-semibold text-white hover:bg-[#244637] disabled:opacity-50" data-testid="button-check-followup">{checked && isCorrect ? <><Check size={16} />{t.correct}</> : <>{t.check}<ArrowRight size={15} /></>}</button></div>
    </section>}
    <div className="mt-7 flex justify-end"><Link href="/" className="inline-flex items-center gap-2 text-xs font-semibold text-[#758278] no-underline hover:text-[#315846]" data-testid="link-next-overview">{t.next}<ArrowRight size={14} /></Link></div>
  </Shell>;
}
function DiagnosisPart({ title, text, testId }: { title: string; text: string; testId: string }) { return <div><p className="mb-1 text-[10px] font-bold uppercase tracking-[.12em] text-[#9b765f]">{title}</p><p className="m-0 text-sm leading-relaxed text-[#4d6054]" data-testid={testId}>{text}</p></div>; }
export default App;
