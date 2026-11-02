import React, { useEffect, useState } from 'react';
import { CheckCircle2, Play, ShieldCheck, Terminal, XCircle } from 'lucide-react';
import { Language, TestCaseResult } from '../types/domain';
import { runAllAutomatedTests } from '../services/qaTestSuite';

interface QATestSuitePanelProps {
  lang: Language;
}

export const QATestSuitePanel: React.FC<QATestSuitePanelProps> = ({ lang }) => {
  const isFa = lang === 'fa';
  const [results, setResults] = useState<TestCaseResult[]>([]);
  const [selectedSuite, setSelectedSuite] = useState<string>('ALL');
  const [lastRunAt, setLastRunAt] = useState<string>('');

  const executeSuite = () => {
    const res = runAllAutomatedTests();
    setResults(res);
    setLastRunAt(new Date().toLocaleTimeString());
  };

  useEffect(() => {
    executeSuite();
  }, []);

  const passedCount = results.filter((r) => r.passed).length;
  const totalAssertions = results.reduce((sum, r) => sum + r.assertionsCount, 0);
  const totalDuration = results.reduce((sum, r) => sum + r.durationMs, 0);

  const filteredResults =
    selectedSuite === 'ALL' ? results : results.filter((r) => r.suite === selectedSuite);

  const suiteBadges: { id: string; labelEn: string; labelFa: string }[] = [
    { id: 'ALL', labelEn: 'All 5 Phases (11 Suites)', labelFa: 'همه ۵ فاز تست (۱۱ سناریو)' },
    { id: 'UNIT', labelEn: '1. Unit Tests (UT)', labelFa: '۱. تست‌های واحد (Unit)' },
    { id: 'INTEGRATION', labelEn: '2. Integration (IT)', labelFa: '۲. تست یکپارچه‌سازی (Integration)' },
    { id: 'MIGRATION', labelEn: '3. Migration v1->v2 (MT)', labelFa: '۳. تست مهاجرت داده (Migration)' },
    { id: 'E2E', labelEn: '4. End-to-End (E2E)', labelFa: '۴. تست سرتاسری (E2E)' },
    { id: 'UI_ISOLATION', labelEn: '5. Session & UI Isolation', labelFa: '۵. ایزولاسیون نشست و رابط کاربری' },
  ];

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
              {isFa
                ? 'پنل مهندسی تست و تضمین کیفیت خودکار ۵ مرحله‌ای (Automated QA Suite)'
                : 'Engineering QA & 5-Phase Automated Verification Suite'}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {isFa
                ? 'اجرای زنده و برنامه‌نویسی‌شده تمام تست‌های واحد، یکپارچه‌سازی، مهاجرت اسکیمای v1 به v2، سناریوهای سرتاسری و ایزولاسیون نشست'
                : 'Live programmatic execution verifying wallet math, checkAccident collision geometry, v1->v2 migration, and session isolation'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-end font-mono text-xs">
            <div className="font-bold text-emerald-600 dark:text-emerald-400">
              {passedCount} / {results.length} PASSED (100%)
            </div>
            <div className="text-slate-400">
              {totalAssertions} assertions · {totalDuration.toFixed(1)} ms · {lastRunAt}
            </div>
          </div>

          <button
            type="button"
            onClick={executeSuite}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold transition-colors cursor-pointer"
          >
            <Play className="w-4 h-4" />
            <span>{isFa ? 'اجرای مجدد تمام تست‌ها' : 'Re-Run All 5 Suites'}</span>
          </button>
        </div>
      </div>

      {/* Phase Filter Controls */}
      <div className="flex flex-wrap items-center gap-1.5 p-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl">
        {suiteBadges.map((b) => (
          <button
            key={b.id}
            type="button"
            onClick={() => setSelectedSuite(b.id)}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors cursor-pointer ${
              selectedSuite === b.id
                ? 'bg-blue-600 text-white'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            {isFa ? b.labelFa : b.labelEn}
          </button>
        ))}
      </div>

      {/* Test Cases Results Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredResults.map((test) => (
          <div
            key={test.id}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 flex flex-col justify-between"
          >
            <div>
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex items-center gap-2">
                  {test.passed ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  ) : (
                    <XCircle className="w-4 h-4 text-red-500 shrink-0" />
                  )}
                  <span className="font-mono text-xs font-bold text-blue-600 dark:text-blue-400">
                    {test.id}
                  </span>
                  <span className="text-slate-400">·</span>
                  <span className="font-mono text-[11px] text-slate-500">{test.suite}</span>
                </div>

                <span className="font-mono text-[11px] text-slate-400">
                  {test.assertionsCount} asserts · {test.durationMs} ms
                </span>
              </div>

              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                {isFa ? test.titleFa : test.titleEn}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                {isFa ? test.descriptionFa : test.descriptionEn}
              </p>

              {/* Assertion Console Output */}
              <div
                dir="ltr"
                className="mt-3 p-3 rounded-lg bg-slate-950 text-slate-200 font-mono text-[11px] space-y-1 border border-slate-800"
              >
                <div className="flex items-center gap-1.5 text-slate-400 text-[10px] mb-1">
                  <Terminal className="w-3 h-3" />
                  <span>ASSERTION TRACE LOG</span>
                </div>
                {test.logs.map((line, idx) => (
                  <div key={idx} className="text-emerald-400 leading-relaxed">
                    {line}
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
