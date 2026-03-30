import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';

import Modal from './components/Modal';
import Icon from './components/Icon';
import SimpleLineChart from './components/SimpleLineChart';
import PatientsView from './views/PatientsView.jsx';
import HistoryView from './views/HistoryView.jsx';
import TrendsMapView from './views/TrendsMapView.jsx';

const SAVED_CONSULTATIONS_KEY = 'aignosis_saved_consultations';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:5000';

const mockPatients = [
  {
    id: 1, name: 'Priya Sharma', age: 34, gender: 'F', bloodGroup: 'O+', abhaId: '12-3656-7890-1234',
    status: 'Ongoing',
    aiSummary: "Patient with a history of chronic hypertension and Type 2 Diabetes. Recent visits for viral fever. High risk for cardiovascular events; monitor BP closely. Penicillin allergy noted.",
    preExistingConditions: ['Hypertension', 'Type 2 Diabetes'],
    allergies: ['Penicillin'],
    currentMedications: ['Clarithromycin', 'Amlodipine', 'Simvastatin'],
    recurringIllnesses: ['Migraine', 'Allergic Rhinitis'],
    drugInteractions: [{ drugA: 'Amlodipine', drugB: 'Simvastatin', risk: 'Moderate', note: 'Increased risk of myopathy.' }],
    vitalTrends: { bp: [{ date: 'Mar 25', value: '140/90' }, { date: 'Jun 25', value: '135/85' }, { date: 'Sep 25', value: '130/80' }] },
    visitHistory: [
      { date: '14 Sep 2025', diagnosis: 'Viral Fever, Suspected Dengue', notes: 'Patient presents with high fever, headache, and body aches. Prescribed Paracetamol.', clinic: { name: 'Apollo Clinic, Koramangala', location: { lat: 12.9352, lon: 77.6245 } } },
      { date: '02 Jun 2025', diagnosis: 'Annual Check-up', notes: 'Routine check-up. All vitals normal. Blood work ordered.', clinic: { name: 'Manipal Hospital, Old Airport Road', location: { lat: 12.9602, lon: 77.6482 } } },
      { date: '15 Mar 2025', diagnosis: 'Allergic Reaction', notes: 'Mild skin rash due to an unknown allergen. Prescribed antihistamines.', clinic: { name: 'Fortis Hospital, Bannerghatta Road', location: { lat: 12.8762, lon: 77.5954 } } },
    ]
  },
  {
    id: 2, name: 'Anand Kumar', age: 58, gender: 'M', bloodGroup: 'A+', abhaId: '23-4567-8901-2345',
    status: 'Incoming',
    aiSummary: "Middle-aged male with controlled hypertension. Recent check-up for diabetes showed slightly elevated fasting blood sugar. Low risk profile, but dietary discipline is key.",
    preExistingConditions: ['Hypertension'],
    allergies: ['None Reported'],
    currentMedications: [],
    recurringIllnesses: [],
    drugInteractions: [],
    vitalTrends: { bp: [{ date: 'Jul 25', value: '132/82' }, { date: 'Aug 25', value: '130/84' }, { date: 'Sep 25', value: '130/80' }] },
    visitHistory: [
      { date: '13 Sep 2025', diagnosis: 'Hypertension Follow-up', notes: 'BP is stable at 130/80 mmHg. Continue current medication.', clinic: { name: 'Sakra World Hospital, Devarabisanahalli', location: { lat: 12.9255, lon: 77.6776 } } },
      { date: '10 Aug 2025', diagnosis: 'Diabetes Check-up', notes: 'Fasting blood sugar is slightly elevated. Advised dietary changes.', clinic: { name: 'Sakra World Hospital, Devarabisanahalli', location: { lat: 12.9255, lon: 77.6776 } } },
    ]
  },
  {
    id: 3, name: 'Sunita Devi', age: 45, gender: 'F', bloodGroup: 'B-', abhaId: '34-5678-9012-3456',
    status: 'Incoming',
    aiSummary: "Patient with a known history of Asthma and dust mite allergy. Requires immediate attention for exacerbations but is otherwise stable. No other chronic conditions reported.",
    preExistingConditions: ['Asthma'],
    allergies: ['Dust Mites'],
    currentMedications: [],
    recurringIllnesses: ['Bronchitis'],
    drugInteractions: [],
    vitalTrends: {},
    visitHistory: [
      { date: '12 Sep 2025', diagnosis: 'Asthma Exacerbation', notes: 'Patient experienced shortness of breath. Administered nebulizer.', clinic: { name: 'St. John\'s Medical College Hospital, Koramangala', location: { lat: 12.9288, lon: 77.6183 } } },
    ]
  },
  {
    id: 4, name: 'Ramesh Singh', age: 62, gender: 'M', bloodGroup: 'AB+', abhaId: '45-6789-0123-4567',
    status: 'Completed',
    aiSummary: "Post-op cataract surgery patient. Follow-up complete, vision has improved significantly. No complications reported.",
    preExistingConditions: ['Cataract (Post-Op)'],
    allergies: ['None Reported'],
    currentMedications: [],
    recurringIllnesses: [],
    drugInteractions: [],
    vitalTrends: {},
    visitHistory: [
      { date: '11 Sep 2025', diagnosis: 'Post-Op Follow-up', notes: 'Wound healing well. Vision acuity is 20/20.', clinic: { name: 'Narayana Nethralaya, Rajajinagar', location: { lat: 12.9902, lon: 77.5518 } } },
    ]
  }
];

const mockRegionalData = {
  trends: {
    Dengue: [3, 5, 8, 15, 27, 40],
    Malaria: [2, 3, 2, 5, 8, 10],
    'Viral Fever': [10, 15, 22, 18, 25, 35],
  },
};

function initials(name) {
  if (!name) return '?';
  return name.split(/\s+/).map((p) => p[0]).join('').slice(0, 2).toUpperCase();
}

/** Regional health alert — same treatment in workspace & verify (kept visually prominent). */
function RegionalHealthAlertPanel({ regionalInsights }) {
  return (
    <div className="bg-surface-container-lowest border border-primary/15 p-5 rounded-2xl text-on-surface shadow-sm relative overflow-hidden">
      <div className="absolute -right-4 -top-4 opacity-[0.08] scale-150 pointer-events-none text-primary">
        <Icon name="coronavirus" className="text-8xl" />
      </div>
      <div className="relative z-10">
        <div className="flex items-center gap-2 mb-3">
          <Icon name="location_on" className="text-sm text-primary" />
          <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Regional health alert</span>
        </div>
        <p className="text-sm font-medium leading-snug mb-3 text-on-surface">{regionalInsights?.summary}</p>
        {regionalInsights?.topDiseases?.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {regionalInsights.topDiseases.map((d) => (
              <span key={d} className="text-[10px] px-2 py-1 rounded bg-primary/10 text-primary font-bold uppercase border border-primary/15">
                {d}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

const ConfidenceBadge = ({ confidence }) => (
  <span className="text-xs font-semibold text-primary bg-primary/10 px-2 py-1 rounded-full">{((confidence || 0) * 100).toFixed(0)}%</span>
);

function WorkspaceScreen({
  selectedPatient,
  patients,
  handlePatientSelect,
  noteText,
  setNoteText,
  regionalInsights,
  voiceOn,
  setVoiceOn,
  onStructurize,
}) {
  const [contextualPrompt, setContextualPrompt] = useState('');
  const recognitionRef = useRef(null);

  useEffect(() => {
    if ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'en-IN';
      recognitionRef.current.onresult = (event) => {
        let finalTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          }
        }
        if (finalTranscript) {
          setNoteText((prev) => prev + finalTranscript + '. ');
        }
      };
      recognitionRef.current.onend = () => setVoiceOn(false);
    }
  }, [setNoteText, setVoiceOn]);

  useEffect(() => {
    if (noteText.toLowerCase().includes('fever')) {
      setContextualPrompt('Regional alert: Dengue activity is elevated in your area. Consider retro-orbital pain and platelet trends.');
    } else {
      setContextualPrompt('');
    }
  }, [noteText]);

  useEffect(() => {
    if (!voiceOn || !recognitionRef.current) return;
    try {
      recognitionRef.current.start();
    } catch {
      /* already started */
    }
    return () => {
      try {
        recognitionRef.current?.stop();
      } catch {
        /* ignore */
      }
    };
  }, [voiceOn]);

  const hints = [];
  if (noteText.length < 30) hints.push('Add symptom duration and severity.');
  if (!noteText.toLowerCase().includes('bp')) hints.push('Consider documenting vitals (BP / HR / Temp).');
  const sigAllergies =
    selectedPatient?.allergies?.filter((a) => a && !/^none reported$/i.test(String(a).trim())) || [];
  if (sigAllergies.length) hints.push(`Documented allergies: ${sigAllergies.join(', ')}.`);

  const queueStatusLabel = (p) => {
    if (p.status === 'Ongoing') return 'In progress';
    if (p.status === 'Incoming') return 'Scheduled';
    return 'Completed';
  };

  return (
    <div className="flex flex-col xl:flex-row flex-1 min-h-0 overflow-hidden">
      {/* Patient queue */}
      <section className="w-full xl:w-72 shrink-0 bg-surface-container-low border-b xl:border-b-0 xl:border-r border-outline-variant/10 max-h-48 xl:max-h-none overflow-y-auto">
        <div className="p-4 sm:p-6">
          <h2 className="text-sm font-semibold text-on-surface mb-1">Patient queue</h2>
          <p className="text-xs text-on-surface-variant mb-4">Today&apos;s list</p>
          <div className="space-y-2">
            {patients.map((p) => {
              const sel = selectedPatient?.id === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => handlePatientSelect(p.id)}
                  className={`w-full text-left p-3.5 rounded-xl transition-colors ${
                    sel
                      ? 'bg-surface-container-lowest border-l-4 border-primary shadow-sm'
                      : 'bg-transparent hover:bg-surface-container-lowest/70 border border-transparent'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1 gap-2">
                    <p className="font-semibold text-on-surface truncate">{p.name}</p>
                    <span className="text-[11px] text-on-surface-variant shrink-0 tabular-nums">{queueStatusLabel(p)}</span>
                  </div>
                  <p className="text-xs text-on-surface-variant/90">ABHA …{p.abhaId.slice(-4)}</p>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* Intake editor */}
      <section className="flex-1 bg-surface-container-lowest flex flex-col min-h-0 min-w-0">
        <div className="flex-1 p-4 sm:p-6 lg:p-10 flex flex-col gap-6 lg:gap-8 max-w-4xl mx-auto w-full overflow-y-auto">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-outline-variant/20 pb-6">
            <div>
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-on-surface">Clinical intake</h2>
              <p className="text-sm text-on-surface-variant mt-1">Step 1 — history, exam findings, and plan notes</p>
            </div>
            <div className="flex items-center gap-4 bg-surface-container-low p-1.5 rounded-full px-4 self-start sm:self-auto">
              <span className="text-xs font-bold text-on-surface-variant whitespace-nowrap">Voice dictation</span>
              <button
                type="button"
                onClick={() => setVoiceOn(!voiceOn)}
                className={`w-11 h-6 rounded-full relative transition-colors ${voiceOn ? 'bg-primary' : 'bg-outline-variant/50'}`}
                aria-pressed={voiceOn}
              >
                <span
                  className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${voiceOn ? 'right-1' : 'left-1'}`}
                />
              </button>
            </div>
          </div>

          <div className="relative flex-1 min-h-[280px] sm:min-h-[400px] group">
            <textarea
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              className="w-full h-full min-h-[280px] sm:min-h-[400px] resize-none border-none focus:ring-0 p-0 text-base sm:text-lg leading-relaxed text-on-surface placeholder:text-slate-300 bg-transparent"
              placeholder="Start typing or use voice to capture clinical observations..."
            />
            <div className="absolute bottom-4 right-0 flex flex-wrap gap-2 justify-end">
              <button
                type="button"
                onClick={onStructurize}
                className="primary-gradient text-on-primary px-4 py-2 rounded-full text-xs font-bold shadow-lg flex items-center gap-2 hover:opacity-90 transition-opacity"
              >
                <Icon name="auto_awesome" className="text-sm" />
                Structurize note
              </button>
            </div>
          </div>

          <div className="rounded-xl border border-outline-variant/25 bg-surface-container-low/40 p-4 space-y-4">
            <h3 className="text-sm font-semibold text-on-surface">Decision support</h3>
            {contextualPrompt && (
              <div className="text-sm text-on-surface leading-relaxed pl-3 border-l-2 border-primary/35">
                <span className="font-medium text-primary">Tip · </span>
                {contextualPrompt}
              </div>
            )}
            {hints.length > 0 && (
              <ul className="space-y-2 text-sm text-on-surface-variant">
                {hints.map((hint, idx) => (
                  <li key={idx} className="pl-3 border-l-2 border-outline-variant/50 text-on-surface">
                    {hint}
                  </li>
                ))}
              </ul>
            )}
            {!contextualPrompt && hints.length === 0 && (
              <p className="text-sm text-on-surface-variant">No automated nudges yet — add more detail in the note above as needed.</p>
            )}
            <details className="group border-t border-outline-variant/20 pt-3">
              <summary className="text-xs font-medium text-primary cursor-pointer list-none flex items-center gap-1 [&::-webkit-details-marker]:hidden">
                <Icon name="expand_more" className="text-base transition-transform group-open:rotate-180" />
                Suggested documentation prompts
              </summary>
              <div className="mt-3 flex flex-col sm:flex-row gap-2">
                <button
                  type="button"
                  className="flex-1 text-left px-3 py-2.5 rounded-lg bg-surface-container-low hover:bg-surface-container text-sm text-on-surface border border-outline-variant/15 transition-colors"
                >
                  <span className="font-medium text-on-surface-variant text-xs block mb-0.5">Respiratory</span>
                  Asthma / triggers / occupational exposure
                </button>
                <button
                  type="button"
                  className="flex-1 text-left px-3 py-2.5 rounded-lg bg-surface-container-low hover:bg-surface-container text-sm text-on-surface border border-outline-variant/15 transition-colors"
                >
                  <span className="font-medium text-on-surface-variant text-xs block mb-0.5">Vitals</span>
                  Home BP / peak flow if in chart
                </button>
              </div>
            </details>
          </div>
        </div>
      </section>

      {/* Chart review */}
      <section className="w-full xl:w-80 shrink-0 bg-surface-container-low p-4 sm:p-6 flex flex-col gap-6 overflow-y-auto border-t xl:border-t-0 xl:border-l border-outline-variant/10">
        <div>
          <h2 className="text-sm font-semibold text-on-surface">Chart review</h2>
          <p className="text-xs text-on-surface-variant mt-0.5">Problem list &amp; safety context</p>
        </div>
        {selectedPatient && (
          <div className="bg-surface-container-lowest p-5 rounded-2xl shadow-sm space-y-5 ring-1 ring-outline-variant/10">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-secondary-container flex items-center justify-center text-secondary font-bold text-lg">
                {initials(selectedPatient.name)}
              </div>
              <div className="min-w-0">
                <p className="font-bold text-on-surface truncate">{selectedPatient.name}</p>
                <p className="text-[11px] text-on-surface-variant">
                  {selectedPatient.age} yrs • {selectedPatient.gender} • {selectedPatient.bloodGroup}
                </p>
              </div>
            </div>
            <div className="space-y-4 pt-1">
              <div>
                <p className="text-xs font-medium text-on-surface mb-2">Allergies</p>
                {sigAllergies.length > 0 ? (
                  <ul className="space-y-1.5">
                    {sigAllergies.map((a) => (
                      <li
                        key={a}
                        className="text-sm pl-3 border-l-2 border-error font-medium text-on-surface"
                      >
                        {a}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-on-surface-variant">None documented</p>
                )}
              </div>
              <div>
                <p className="text-xs font-medium text-on-surface mb-2">Active problems</p>
                {selectedPatient.preExistingConditions?.length ? (
                  <ul className="list-disc list-inside text-sm text-on-surface space-y-1 marker:text-primary/60">
                    {selectedPatient.preExistingConditions.map((c) => (
                      <li key={c}>{c}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-on-surface-variant">None listed</p>
                )}
              </div>
              <div>
                <p className="text-xs font-medium text-on-surface mb-2">Medications</p>
                {selectedPatient.currentMedications?.length ? (
                  <ul className="space-y-1.5 text-sm text-on-surface">
                    {selectedPatient.currentMedications.map((m) => (
                      <li key={m} className="leading-snug">
                        {m}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-on-surface-variant">None reported</p>
                )}
              </div>
            </div>
          </div>
        )}

        <RegionalHealthAlertPanel regionalInsights={regionalInsights} />

        <div className="space-y-3 mt-2">
          <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Recent vitals trend (BP)</p>
          {selectedPatient?.vitalTrends?.bp?.length ? (
            selectedPatient.vitalTrends.bp.slice(-2).map((row) => (
              <div key={row.date} className="flex justify-between items-center bg-surface-container p-3 rounded-lg">
                <span className="text-xs font-medium text-on-surface">{row.date}</span>
                <span className="text-xs font-bold text-primary">{row.value}</span>
              </div>
            ))
          ) : (
            <p className="text-xs text-on-surface-variant">No vitals on file.</p>
          )}
        </div>
      </section>
    </div>
  );
}

function VerifyAndSafety({ aiResult, ddiAlerts, ddiAcknowledged, setDdiAcknowledged, errorMessage, regionalInsights, selectedPatient }) {
  if (!aiResult && !errorMessage) {
    return (
      <div className="p-8 rounded-2xl bg-surface-container-lowest text-on-surface-variant text-center max-w-lg mx-auto ring-1 ring-outline-variant/10">
        <Icon name="analytics" className="text-4xl text-primary mb-4 opacity-50 mx-auto" />
        Run intelligent analysis from the workspace step first.
      </div>
    );
  }

  const missing = Array.isArray(aiResult?.missingInfo)
    ? aiResult.missingInfo
    : aiResult?.missingInfo
      ? [aiResult.missingInfo]
      : [];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 p-4 sm:p-6 lg:p-8 max-w-[1600px] mx-auto w-full">
      <section className="lg:col-span-3 space-y-6 order-2 lg:order-1">
        <div className="bg-surface-container-lowest rounded-xl p-6 ring-1 ring-outline-variant/10">
          <div className="flex items-start justify-between mb-6 gap-2">
            <div>
              <span className="text-xs font-medium text-on-surface-variant mb-1 block">Chart at a glance</span>
              <h2 className="text-xl font-bold text-on-surface tracking-tight leading-tight">{selectedPatient?.name || '—'}</h2>
              <p className="text-sm text-on-surface-variant">
                {selectedPatient?.age}y • {selectedPatient?.gender} • ABHA …{selectedPatient?.abhaId?.slice(-4)}
              </p>
            </div>
            <div className="w-12 h-12 bg-secondary-container text-primary rounded-lg flex items-center justify-center shrink-0">
              <Icon name="person" className="text-3xl" />
            </div>
          </div>
          <div className="p-4 bg-surface-container-low rounded-lg">
            <p className="text-xs font-medium text-on-surface-variant block mb-2">AI chart summary</p>
            <p className="text-sm font-medium leading-relaxed text-on-surface">{selectedPatient?.aiSummary?.slice(0, 220)}…</p>
          </div>
          <div className="pt-4 border-t border-outline-variant/20 mt-4">
            <p className="text-xs font-medium text-on-surface-variant block mb-2">Allergy list</p>
            <ul className="text-xs space-y-2 text-on-surface-variant">
              {selectedPatient?.allergies?.map((a) => (
                <li key={a} className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary/40" />
                  {a}
                </li>
              ))}
            </ul>
          </div>
        </div>
        <RegionalHealthAlertPanel regionalInsights={regionalInsights} />
      </section>

      <section className="lg:col-span-5 space-y-6 order-1 lg:order-2">
        <header className="mb-2">
          <h3 className="text-2xl font-bold tracking-tight text-on-surface">Differential &amp; extraction</h3>
          <p className="text-sm text-on-surface-variant">Review suggested diagnoses and structured findings.</p>
        </header>
        {errorMessage && (
          <div className="p-4 rounded-xl bg-error-container/50 border border-error/20 text-error text-sm">{errorMessage}</div>
        )}
        {aiResult?.symptoms?.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-on-surface">Symptoms</h4>
            {aiResult.symptoms.map((s, i) => (
              <div key={i} className="flex justify-between items-center p-3 rounded-lg bg-surface-container-low">
                <span className="text-sm text-on-surface">{s.value}</span>
                <ConfidenceBadge confidence={s.confidence} />
              </div>
            ))}
          </div>
        )}
        <div className="space-y-4">
          {aiResult?.diagnosis?.length ? (
            aiResult.diagnosis.map((d, i) => {
              const conf = d.confidence != null ? Number(d.confidence) : 0.5;
              const high = conf >= 0.65;
              return (
                <div
                  key={i}
                  className={`group relative rounded-xl p-6 transition-all hover:ring-2 hover:ring-primary/20 ${
                    high ? 'bg-surface-container-lowest ring-1 ring-outline-variant/10' : 'bg-surface-container-lowest/50 border border-transparent'
                  }`}
                >
                  <div className="flex justify-between items-start mb-4 gap-2 flex-wrap">
                    <div>
                      <h4 className={`text-lg font-bold text-on-surface ${high ? '' : 'opacity-80'}`}>{d.description}</h4>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <span
                          className={`px-2 py-0.5 text-[10px] font-bold rounded uppercase ${
                            high ? 'bg-primary/10 text-primary' : 'bg-slate-200 text-on-surface-variant'
                          }`}
                        >
                          {high ? 'High relevance' : 'Consider'}
                        </span>
                        <span className={`text-sm font-bold ${high ? 'text-primary' : 'text-on-surface-variant'}`}>
                          {(conf * 100).toFixed(0)}%
                        </span>
                        {d.code && d.code !== 'N/A' && (
                          <span className="text-xs text-on-surface-variant">ICD: {d.code}</span>
                        )}
                      </div>
                    </div>
                    {d.source_url && (
                      <a
                        href={d.source_url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-primary hover:underline text-xs flex items-center gap-1 font-medium shrink-0"
                      >
                        <Icon name="open_in_new" className="text-sm" />
                        {d.source_title || 'Source'}
                      </a>
                    )}
                  </div>
                </div>
              );
            })
          ) : (
            <p className="text-sm text-on-surface-variant">No diagnosis entries returned.</p>
          )}
        </div>
        {missing.length > 0 && (
          <div className="bg-primary-container/5 rounded-xl p-5 border-l-4 border-primary-container">
            <div className="flex gap-4">
              <Icon name="error_outline" className="text-primary-container text-2xl shrink-0" />
              <div>
                <h5 className="text-sm font-semibold text-primary-container mb-1">Missing information</h5>
                {missing.map((m, i) => (
                  <p key={i} className="text-sm text-on-surface font-medium">
                    {m}
                  </p>
                ))}
              </div>
            </div>
          </div>
        )}
      </section>

      <section className="lg:col-span-4 space-y-6 order-3">
        <div className="bg-surface-container-lowest rounded-xl p-6 shadow-sm ring-1 ring-outline-variant/10">
          <div className="flex items-center gap-3 mb-6">
            <Icon name="gpp_maybe" className="text-error text-2xl" filled />
            <h3 className="text-lg font-bold text-on-surface">Safety check</h3>
          </div>
          {ddiAlerts?.length > 0 ? (
            <>
              {ddiAlerts.map((alert, i) => (
                <div key={i} className="bg-error-container/30 rounded-lg p-5 border border-error/10 mb-6">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-error rounded-lg shrink-0">
                      <Icon name="warning" className="text-on-error text-lg" filled />
                    </div>
                    <div>
                      <h4 className="text-sm font-extrabold text-error uppercase tracking-wider mb-1">Interaction alert</h4>
                      <p className="text-on-surface font-bold text-sm">
                        {alert.drugA} + {alert.drugB}
                      </p>
                      <p className="text-xs text-on-surface-variant mt-2 leading-relaxed">{alert.note || alert.description}</p>
                    </div>
                  </div>
                </div>
              ))}
              <label className="flex items-start gap-3 cursor-pointer group p-4 bg-surface-container-low rounded-lg border border-outline-variant/20">
                <input
                  type="checkbox"
                  checked={ddiAcknowledged}
                  onChange={(e) => setDdiAcknowledged(e.target.checked)}
                  className="mt-1 rounded border-outline-variant text-primary focus:ring-primary-container"
                />
                <span className="text-sm font-semibold text-on-surface group-hover:text-primary transition-colors">
                  I have reviewed clinical risks and acknowledge interaction mitigation as appropriate.
                </span>
              </label>
            </>
          ) : (
            <div className="flex items-center gap-3 px-4 py-3 bg-secondary-container/30 rounded-lg">
              <Icon name="verified_user" className="text-secondary" />
              <span className="text-xs font-medium text-on-secondary-container">No drug interactions flagged for current recommendations.</span>
            </div>
          )}
        </div>
        <div className="p-6 bg-surface-container rounded-xl ring-1 ring-outline-variant/10">
          <h4 className="text-sm font-medium text-on-surface-variant mb-4">Audit trail</h4>
          <div className="space-y-4">
            <div className="flex gap-3">
              <div className="w-px min-h-[2rem] bg-outline-variant/30 relative">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-primary" />
              </div>
              <div>
                <p className="text-[11px] font-bold text-on-surface">Analysis initialized</p>
                <p className="text-[10px] text-on-surface-variant">Intelligent analysis pipeline</p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="w-px min-h-[2rem] bg-outline-variant/30 relative">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-slate-300" />
              </div>
              <div>
                <p className="text-[11px] font-bold text-on-surface/70">Safety acknowledgement</p>
                <p className="text-[10px] text-on-surface-variant">{ddiAlerts?.length ? (ddiAcknowledged ? 'Complete' : 'Pending') : 'N/A'}</p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function FinalizeScreen({ selectedPatient, summaryDraft, setSummaryDraft, onRegenerate, isProcessing }) {
  return (
    <div className="max-w-[1400px] mx-auto p-4 sm:p-6 lg:p-10 w-full">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">
        <div className="lg:col-span-3 space-y-6 order-2 lg:order-1">
          <div className="p-6 rounded-2xl bg-surface-container-lowest shadow-sm border border-outline-variant/10">
            <div className="flex items-center justify-between mb-6">
              <span className="text-[11px] font-bold uppercase tracking-wider text-on-surface-variant">Active patient</span>
              <span className="px-2 py-0.5 rounded bg-primary-container/10 text-primary text-[10px] font-bold uppercase">In progress</span>
            </div>
            <div className="flex flex-col items-center text-center">
              <div className="w-20 h-20 rounded-2xl bg-secondary-container flex items-center justify-center text-2xl font-bold text-secondary mb-4">
                {initials(selectedPatient?.name)}
              </div>
              <h2 className="text-xl font-bold text-on-surface tracking-tight">{selectedPatient?.name}</h2>
              <p className="text-sm text-on-surface-variant mb-4">
                {selectedPatient?.age}y • {selectedPatient?.gender} • …{selectedPatient?.abhaId?.slice(-4)}
              </p>
            </div>
          </div>
        </div>
        <div className="lg:col-span-6 space-y-6 order-1 lg:order-2">
          <section className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-4">
              <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-on-surface">Consultation summary</h2>
              <span className="text-sm font-medium text-primary flex items-center gap-1">
                <Icon name="auto_fix_high" className="text-sm" />
                Intelligent draft
              </span>
            </div>
            <div className="p-6 sm:p-8 rounded-2xl bg-surface-container-lowest shadow-sm ring-1 ring-outline-variant/10">
              <div className="flex items-center gap-2 mb-6">
                <span className="w-1.5 h-6 bg-primary rounded-full" />
                <h3 className="text-lg font-bold text-on-surface">Clinical findings &amp; plan</h3>
              </div>
              <textarea
                value={summaryDraft}
                onChange={(e) => setSummaryDraft(e.target.value)}
                className="w-full min-h-[240px] sm:min-h-[320px] p-4 sm:p-6 rounded-xl bg-surface-container-low border-none focus:ring-2 focus:ring-primary/10 text-on-surface leading-relaxed text-base resize-none"
                spellCheck
              />
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 mt-8 pt-6 border-t border-outline-variant/20">
                <button
                  type="button"
                  className="flex-1 py-3 px-4 rounded-xl primary-gradient text-on-primary font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-primary/10 hover:opacity-95 transition-all"
                >
                  <Icon name="save" className="text-lg" />
                  Save to EHR
                </button>
                <button
                  type="button"
                  className="flex-1 py-3 px-4 rounded-xl bg-surface-container-highest text-primary font-bold text-sm flex items-center justify-center gap-2 hover:bg-secondary-container transition-all"
                >
                  <Icon name="print" className="text-lg" />
                  Print summary
                </button>
                <button
                  type="button"
                  className="p-3 rounded-xl bg-surface-container-highest text-primary hover:bg-secondary-container transition-all self-center"
                  aria-label="Share"
                >
                  <Icon name="share" className="text-lg" />
                </button>
              </div>
              <div className="mt-6 flex justify-end">
                <button
                  type="button"
                  onClick={onRegenerate}
                  disabled={isProcessing || !selectedPatient}
                  className="text-sm font-bold text-primary bg-surface-container-high px-4 py-2 rounded-xl hover:bg-surface-container-highest disabled:opacity-50 flex items-center gap-2"
                >
                  <Icon name="auto_awesome" />
                  Regenerate summary
                </button>
              </div>
            </div>
          </section>
        </div>
        <div className="lg:col-span-3 order-3">
          <div className="p-6 rounded-2xl bg-surface-container-lowest border border-outline-variant/15 text-on-surface shadow-sm relative overflow-hidden">
            <div className="absolute -top-12 -right-12 w-32 h-32 bg-primary/10 blur-[60px] rounded-full pointer-events-none" />
            <div className="relative z-10">
              <span className="text-[11px] font-bold uppercase tracking-widest text-on-surface-variant">Queue</span>
              <p className="text-sm mt-4 text-on-surface-variant leading-relaxed">Review the summary, then use the bottom bar to save and start the next patient.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function BottomStepper({ consultationStep }) {
  const steps = [
    { id: 'workspace', label: 'Workspace', sub: 'Intake & notes' },
    { id: 'verify', label: 'Verify & Safety', sub: 'Validation' },
    { id: 'finalize', label: 'Finalize', sub: 'Reporting' },
  ];
  const currentIdx = steps.findIndex((s) => s.id === consultationStep);

  return (
    <div className="flex flex-wrap items-center gap-4 sm:gap-8 lg:gap-12 justify-center lg:justify-start w-full lg:w-auto">
      {steps.map((s, idx) => {
        const active = idx === currentIdx;
        const done = idx < currentIdx;
        return (
          <div
            key={s.id}
            className={`flex items-center gap-3 min-w-0 ${active ? 'text-teal-600' : done ? 'text-primary/80' : 'text-slate-400 opacity-80'}`}
          >
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                active ? 'bg-teal-600 text-white' : done ? 'bg-primary/20 text-primary' : 'border border-slate-300 text-slate-500'
              }`}
            >
              {idx + 1}
            </div>
            <div className="hidden sm:block min-w-0">
              <p className="text-[10px] uppercase tracking-wider font-bold truncate">{s.label}</p>
              <p className="text-[9px] opacity-60 truncate">{s.sub}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function dashboardSection(pathname) {
  const sub = pathname.replace(/^\/dashboard\/?/, '').replace(/\/$/, '') || 'workspace';
  const key = sub.split('/')[0] || 'workspace';
  if (['workspace', 'patients', 'history', 'trends'].includes(key)) return key;
  return 'workspace';
}

export default function App() {
  const location = useLocation();
  const navigate = useNavigate();
  const routeSection = useMemo(() => dashboardSection(location.pathname), [location.pathname]);

  useEffect(() => {
    if (location.pathname === '/dashboard' || location.pathname === '/dashboard/') {
      navigate('/dashboard/workspace', { replace: true });
      return;
    }
    const raw = location.pathname.replace(/^\/dashboard\/?/, '').replace(/\/$/, '');
    const key = raw.split('/')[0] || 'workspace';
    if (raw && !['workspace', 'patients', 'history', 'trends'].includes(key)) {
      navigate('/dashboard/workspace', { replace: true });
    }
  }, [location.pathname, navigate]);

  const [selectedPatientId, setSelectedPatientId] = useState(mockPatients[0]?.id ?? null);
  const [patients, setPatients] = useState(mockPatients);
  const [searchQuery, setSearchQuery] = useState('');
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [modalContent, setModalContent] = useState(null);
  const [consultationStep, setConsultationStep] = useState('workspace');
  const [quickComplete, setQuickComplete] = useState(false);
  const [noteText, setNoteText] = useState('');
  const [voiceOn, setVoiceOn] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [aiResult, setAiResult] = useState(null);
  const [ddiAlerts, setDdiAlerts] = useState([]);
  const [ddiAcknowledged, setDdiAcknowledged] = useState(false);
  const [summaryDraft, setSummaryDraft] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [savedConsultations, setSavedConsultations] = useState(() => {
    try {
      const raw = localStorage.getItem(SAVED_CONSULTATIONS_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });
  const [notifications, setNotifications] = useState([]);
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem(SAVED_CONSULTATIONS_KEY, JSON.stringify(savedConsultations));
    } catch {
      /* ignore quota / private mode */
    }
  }, [savedConsultations]);

  const selectedPatient = useMemo(() => patients.find((p) => p.id === selectedPatientId), [selectedPatientId, patients]);
  const filteredPatients = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return patients;
    return patients.filter((p) => p.name.toLowerCase().includes(q) || p.abhaId.toLowerCase().includes(q));
  }, [patients, searchQuery]);
  const unreadCount = useMemo(() => notifications.filter((n) => !n.read).length, [notifications]);
  const regionalInsights = useMemo(() => {
    const trendEntries = Object.entries(mockRegionalData.trends || {});
    if (!trendEntries.length) return { summary: 'No trend data available.', topDiseases: [] };
    const ranked = trendEntries
      .map(([name, values]) => ({ name, latest: values[values.length - 1] || 0 }))
      .sort((a, b) => b.latest - a.latest);
    const topDiseases = ranked.slice(0, 2).map((d) => d.name);
    return {
      summary: `Influenza and ${topDiseases.join(' / ')} show elevated activity in the selected region (mock trends).`,
      topDiseases,
    };
  }, []);

  const addNotification = (title, message) => {
    setNotifications((prev) => [
      {
        id: Date.now() + Math.random(),
        title,
        message,
        read: false,
        timestamp: new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
      },
      ...prev,
    ]);
  };

  const markAllNotificationsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const selectFirstFilteredPatient = () => {
    if (filteredPatients.length > 0) {
      handlePatientSelect(filteredPatients[0].id);
    }
  };

  const saveConsultation = (mode = 'standard') => {
    if (!selectedPatient) return;
    const record = {
      id: Date.now(),
      mode,
      patientId: selectedPatient.id,
      patientName: selectedPatient.name,
      noteText,
      diagnosis: aiResult?.diagnosis || [],
      summary: summaryDraft || selectedPatient.aiSummary || '',
      savedAt: new Date().toISOString(),
    };
    setSavedConsultations((prev) => [record, ...prev]);
    addNotification(
      'Consultation saved',
      `${selectedPatient.name} saved (${mode === 'quick' ? 'quick complete' : 'finalized'}).`
    );
  };

  const handleProcessNotes = async () => {
    if (!noteText.trim() || !selectedPatient) return false;
    setIsProcessing(true);
    setAiResult(null);
    setDdiAlerts([]);
    setErrorMessage('');
    setDdiAcknowledged(false);

    let analysisResult = null;

    try {
      const geminiResponse = await fetch(`${API_BASE_URL}/gemini_analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: noteText,
          region: 'Bengaluru',
          current_medications: selectedPatient.currentMedications || [],
        }),
      });

      if (geminiResponse.ok) {
        analysisResult = await geminiResponse.json();
        addNotification('Intelligent analysis complete', 'Review differential and safety before continuing.');
      } else {
        const errorData = await geminiResponse.json().catch(() => ({}));
        const enrichedMessage = errorData.upstream_status
          ? `${errorData.error || 'Request failed.'} (upstream ${errorData.upstream_status})`
          : errorData.error || 'Intelligent analysis failed.';
        setErrorMessage(enrichedMessage);
        addNotification('Analysis error', enrichedMessage);
      }
    } catch (error) {
      console.error('Gemini request error:', error);
      setErrorMessage('Unable to complete intelligent analysis. Please try again.');
      addNotification('Analysis error', 'Network or server error.');
    }

    if (analysisResult) {
      setAiResult(analysisResult);

      if (analysisResult.medications && analysisResult.medications.length > 0) {
        const newMedications = analysisResult.medications.map((m) => m.name);
        try {
          const ddiResponse = await fetch(`${API_BASE_URL}/ddi_check`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              current_medications: selectedPatient.currentMedications,
              new_medications: newMedications,
            }),
          });
          if (ddiResponse.ok) {
            const ddiData = await ddiResponse.json();
            if (ddiData.interactions) {
              setDdiAlerts(ddiData.interactions);
              if (ddiData.interactions.length > 0) {
                addNotification('Drug interaction alert', `${ddiData.interactions.length} potential interaction(s).`);
              }
            }
          }
        } catch (e) {
          console.error('DDI check error:', e);
        }
      }
    }

    setIsProcessing(false);
    return !!analysisResult;
  };

  const handleRegenerateSummary = async () => {
    if (!selectedPatient) return;
    setIsProcessing(true);
    let newSummary = 'Failed to generate summary.';
    try {
      const response = await fetch(`${API_BASE_URL}/generate_summary`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(selectedPatient),
      });

      if (response.ok) {
        const data = await response.json();
        newSummary = data.summary;
        addNotification('Summary generated', 'Handoff summary was refreshed.');
      } else {
        const errorData = await response.json().catch(() => ({}));
        addNotification('Summary error', errorData.error || 'Failed to generate summary.');
      }
    } catch (error) {
      console.error('Summary error:', error);
      addNotification('Summary error', 'Unexpected failure.');
    }

    setPatients((prev) => prev.map((p) => (p.id === selectedPatientId ? { ...p, aiSummary: newSummary } : p)));
    setSummaryDraft(newSummary);
    setIsProcessing(false);
  };

  const goWorkspace = () => navigate('/dashboard/workspace');

  const handlePatientSelect = (id) => {
    setSelectedPatientId(id);
    setNoteText('');
    setAiResult(null);
    setDdiAlerts([]);
    setSummaryDraft('');
    setErrorMessage('');
    setDdiAcknowledged(false);
    setConsultationStep('workspace');
    setMobileNavOpen(false);
  };

  const structurizeNote = () => {
    setNoteText((prev) => {
      const header = 'CHIEF COMPLAINT:\nHISTORY:\nEXAM:\nASSESSMENT:\nPLAN:\n\n';
      return prev.includes('CHIEF COMPLAINT') ? prev : header + prev;
    });
    addNotification('Note template', 'Structured headings prepended to your note.');
  };

  const canAnalyze = selectedPatient && noteText.trim().length > 10 && !isProcessing;
  const canFinalize = aiResult && (ddiAlerts.length === 0 || ddiAcknowledged);
  const analyzeReadinessMessage = !selectedPatient
    ? 'Select a patient to continue.'
    : noteText.trim().length <= 10
      ? 'Add at least 10+ characters in intake notes.'
      : '';

  const goNext = async () => {
    if (consultationStep === 'workspace') {
      if (!canAnalyze) return;
      const ok = await handleProcessNotes();
      if (ok) setConsultationStep('verify');
      return;
    }
    if (consultationStep === 'verify') {
      if (!canFinalize) return;
      if (quickComplete) {
        saveConsultation('quick');
        handlePatientSelect(mockPatients[0]?.id ?? null);
        return;
      }
      setConsultationStep('finalize');
      if (!summaryDraft && selectedPatient?.aiSummary) setSummaryDraft(selectedPatient.aiSummary);
      return;
    }
    if (consultationStep === 'finalize') {
      saveConsultation('standard');
      handlePatientSelect(mockPatients[0]?.id ?? null);
    }
  };

  const goBack = () => {
    if (consultationStep === 'finalize') setConsultationStep('verify');
    else if (consultationStep === 'verify') setConsultationStep('workspace');
  };

  const saveDraft = () => {
    addNotification('Draft saved', 'Intake text stored in this session only.');
  };

  const navLinkClass = (active) =>
    `flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
      active
        ? 'text-teal-700 font-semibold border-r-4 border-teal-600 bg-teal-50/80'
        : 'text-slate-600 hover:text-teal-600 hover:bg-slate-100/80'
    }`;

  return (
    <div className="bg-background text-on-surface min-h-screen flex overflow-hidden h-[100dvh]">
      {modalContent && <Modal content={modalContent} onClose={() => setModalContent(null)} />}

      {/* Mobile drawer backdrop */}
      <button
        type="button"
        aria-label="Close menu"
        className={`fixed inset-0 z-40 bg-black/40 transition-opacity lg:hidden ${mobileNavOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={() => setMobileNavOpen(false)}
      />

      <aside
        className={`fixed left-0 top-0 z-50 h-full w-64 max-w-[85vw] border-r border-slate-200/80 bg-surface-container-lowest flex flex-col py-6 font-sans antialiased text-slate-900 shadow-[2px_0_12px_-4px_rgba(0,0,0,0.06)] transition-transform duration-200 ease-out lg:translate-x-0 ${
          mobileNavOpen ? 'translate-x-0 shadow-xl' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="px-6 mb-8">
          <Link to="/" className="block" onClick={() => setMobileNavOpen(false)}>
            <h1 className="text-xl font-bold text-teal-700">Aignosis</h1>
            <p className="text-[10px] uppercase tracking-widest text-on-surface-variant font-bold opacity-70">Clinical workspace</p>
          </Link>
        </div>
        <nav className="flex-1 space-y-1 px-3">
          <NavLink
            to="/dashboard/workspace"
            end
            onClick={() => setMobileNavOpen(false)}
            className={({ isActive }) => navLinkClass(isActive)}
          >
            <Icon name="dashboard" />
            <span>Workspace</span>
          </NavLink>
          <NavLink
            to="/dashboard/patients"
            onClick={() => setMobileNavOpen(false)}
            className={({ isActive }) => navLinkClass(isActive)}
          >
            <Icon name="group" />
            <span>Patients</span>
          </NavLink>
          <NavLink
            to="/dashboard/history"
            onClick={() => setMobileNavOpen(false)}
            className={({ isActive }) => navLinkClass(isActive)}
          >
            <Icon name="history" />
            <span>History</span>
          </NavLink>
          <NavLink
            to="/dashboard/trends"
            onClick={() => setMobileNavOpen(false)}
            className={({ isActive }) => navLinkClass(isActive)}
          >
            <Icon name="trending_up" />
            <span>Trends</span>
          </NavLink>
        </nav>
        <div className="mt-auto px-3 space-y-1 border-t border-slate-200/20 pt-4">
          <button
            type="button"
            className="w-full primary-gradient text-on-primary py-2.5 rounded-lg font-semibold text-sm shadow-md hover:opacity-90 mb-4"
            onClick={() => {
              handlePatientSelect(mockPatients[0]?.id ?? null);
              setConsultationStep('workspace');
              setMobileNavOpen(false);
              goWorkspace();
            }}
          >
            New assessment
          </button>
          <a className={`${navLinkClass(false)} text-sm`} href="#" onClick={(e) => e.preventDefault()}>
            <Icon name="settings" />
            <span>Settings</span>
          </a>
          <a className={`${navLinkClass(false)} text-sm`} href="#" onClick={(e) => e.preventDefault()}>
            <Icon name="help" />
            <span>Help</span>
          </a>
          <div className="mt-6 flex items-center gap-3 px-3 py-4 bg-surface-container-lowest rounded-xl shadow-sm">
            <div className="w-10 h-10 rounded-full bg-secondary-container flex items-center justify-center text-sm font-bold text-secondary">DK</div>
            <div className="overflow-hidden min-w-0">
              <p className="text-xs font-bold truncate">Dr. Kapoor</p>
              <p className="text-[10px] text-on-surface-variant">Attending</p>
            </div>
          </div>
        </div>
      </aside>

      <main className="flex-1 flex flex-col relative overflow-hidden min-w-0 lg:ml-64">
        <header className="sticky top-0 z-30 flex items-center justify-between gap-2 px-4 sm:px-8 h-16 shrink-0 bg-white/95 backdrop-blur-md border-b border-slate-200/60">
          <div className="flex items-center gap-2 lg:hidden shrink-0">
            <button
              type="button"
              className="p-2 rounded-lg text-on-surface hover:bg-surface-container-low"
              onClick={() => setMobileNavOpen(true)}
              aria-label="Open menu"
            >
              <Icon name="menu" />
            </button>
          </div>
          <div className="flex items-center gap-3 flex-1 min-w-0 bg-surface-container-low px-3 sm:px-4 py-2 rounded-full focus-within:ring-2 focus-within:ring-teal-500/20 transition-all max-w-full sm:max-w-md lg:max-w-xl xl:max-w-2xl">
            <Icon name="search" className="text-slate-400 shrink-0" />
            <input
              className="bg-transparent border-none text-sm w-full focus:ring-0 text-on-surface placeholder:text-on-surface-variant/70 min-w-0"
              placeholder="Search patients, files, or trends..."
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') selectFirstFilteredPatient();
              }}
            />
          </div>
          <div className="flex items-center gap-3 sm:gap-6 shrink-0">
            <div className="hidden sm:flex items-center gap-4">
              <button
                type="button"
                className="relative p-1 text-slate-400 hover:text-teal-500 transition-all"
                onClick={() => setNotificationsOpen(!notificationsOpen)}
                aria-expanded={notificationsOpen}
              >
                <Icon name="notifications" />
                {unreadCount > 0 && <span className="absolute top-1 right-1 w-2 h-2 bg-error rounded-full border-2 border-white" />}
              </button>
              <button type="button" className="p-1 text-slate-400 hover:text-teal-500 hidden md:inline-flex">
                <Icon name="help" />
              </button>
              <button type="button" className="p-1 text-slate-400 hover:text-teal-500 hidden md:inline-flex">
                <Icon name="schedule" />
              </button>
            </div>
            <div className="h-8 w-px bg-slate-200 hidden sm:block" />
            <div className="flex items-center gap-2 text-right">
              <div className="hidden md:block">
                <p className="text-xs font-bold truncate max-w-[120px]">
                  {routeSection === 'workspace'
                    ? 'Workspace'
                    : routeSection === 'trends'
                      ? 'Trends'
                      : routeSection === 'patients'
                        ? 'Patients'
                        : routeSection === 'history'
                          ? 'History'
                          : 'Workspace'}
                </p>
                <p className="text-[10px] text-teal-600 font-medium uppercase tracking-wider">Session active</p>
              </div>
            </div>
          </div>
          {notificationsOpen && (
            <div className="absolute right-4 top-14 w-[min(100vw-2rem,24rem)] max-h-96 overflow-y-auto bg-surface-container-lowest border border-outline-variant/20 rounded-xl shadow-xl z-50">
              <div className="flex items-center justify-between p-3 border-b border-outline-variant/20">
                <h3 className="text-sm font-semibold text-on-surface">Notifications</h3>
                <button type="button" onClick={markAllNotificationsRead} className="text-xs text-primary hover:underline">
                  Mark all read
                </button>
              </div>
              <div className="divide-y divide-outline-variant/10">
                {notifications.length === 0 && <div className="p-4 text-sm text-on-surface-variant">No notifications yet.</div>}
                {notifications.map((n) => (
                  <div key={n.id} className={`p-3 ${n.read ? '' : 'bg-primary/5'}`}>
                    <div className="text-sm font-semibold text-on-surface">{n.title}</div>
                    <div className="text-xs text-on-surface-variant mt-1">{n.message}</div>
                    <div className="text-[11px] text-on-surface-variant/70 mt-2">{n.timestamp}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </header>

        <div
          className={`flex-1 flex flex-col min-h-0 overflow-hidden ${routeSection === 'workspace' ? 'pb-24 sm:pb-20' : ''}`}
        >
          {routeSection === 'trends' ? (
            <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden overscroll-y-contain">
              <TrendsMapView apiBaseUrl={API_BASE_URL} />
            </div>
          ) : routeSection === 'patients' ? (
            <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden overscroll-y-contain">
              <PatientsView apiBaseUrl={API_BASE_URL} onGoWorkspace={goWorkspace} />
            </div>
          ) : routeSection === 'history' ? (
            <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden overscroll-y-contain">
              <HistoryView
                savedConsultations={savedConsultations}
                onGoWorkspace={goWorkspace}
                onClear={() => setSavedConsultations([])}
              />
            </div>
          ) : (
            <>
              <div className="px-4 sm:px-6 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4 border-b border-outline-variant/10 bg-surface-container-low/50 shrink-0">
                <label className="text-sm flex items-center gap-2 cursor-pointer shrink-0">
                  <input
                    type="checkbox"
                    checked={quickComplete}
                    onChange={(e) => setQuickComplete(e.target.checked)}
                    className="rounded border-outline-variant text-primary"
                  />
                  <span className="font-medium text-on-surface">Quick complete</span>
                </label>
                <p className="text-xs sm:text-sm text-on-surface-variant flex flex-wrap items-center gap-x-2 gap-y-1">
                  {quickComplete && (
                    <>
                      <span className="font-medium text-primary">Fast track on</span>
                      <span className="text-on-surface-variant/40 hidden sm:inline" aria-hidden>
                        ·
                      </span>
                    </>
                  )}
                  <span>{filteredPatients.length} matches</span>
                  <span className="text-on-surface-variant/40" aria-hidden>
                    ·
                  </span>
                  <span>{savedConsultations.length} saved</span>
                  <span className="text-on-surface-variant/40" aria-hidden>
                    ·
                  </span>
                  <span>{unreadCount} unread</span>
                </p>
              </div>

              <div className="flex-1 overflow-y-auto min-h-0">
                {consultationStep === 'workspace' && (
                  <WorkspaceScreen
                    selectedPatient={selectedPatient}
                    patients={filteredPatients}
                    handlePatientSelect={handlePatientSelect}
                    noteText={noteText}
                    setNoteText={setNoteText}
                    regionalInsights={regionalInsights}
                    voiceOn={voiceOn}
                    setVoiceOn={setVoiceOn}
                    onStructurize={structurizeNote}
                  />
                )}
                {consultationStep === 'verify' && (
                  <VerifyAndSafety
                    aiResult={aiResult}
                    ddiAlerts={ddiAlerts}
                    ddiAcknowledged={ddiAcknowledged}
                    setDdiAcknowledged={setDdiAcknowledged}
                    errorMessage={errorMessage}
                    regionalInsights={regionalInsights}
                    selectedPatient={selectedPatient}
                  />
                )}
                {consultationStep === 'finalize' && (
                  <FinalizeScreen
                    selectedPatient={selectedPatient}
                    summaryDraft={summaryDraft || selectedPatient?.aiSummary || ''}
                    setSummaryDraft={setSummaryDraft}
                    onRegenerate={handleRegenerateSummary}
                    isProcessing={isProcessing}
                  />
                )}
              </div>

              {analyzeReadinessMessage && consultationStep === 'workspace' && (
                <div className="px-6 py-2 text-xs text-on-surface-variant border-t border-outline-variant/10 bg-surface-container-low/30 shrink-0">
                  {analyzeReadinessMessage}
                </div>
              )}
              {errorMessage && consultationStep === 'verify' && (
                <div className="px-6 py-2 text-xs text-error shrink-0">{errorMessage}</div>
              )}
            </>
          )}
        </div>

        {routeSection === 'workspace' && (
          <footer className="fixed bottom-0 left-0 right-0 lg:left-64 z-40 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 px-4 sm:px-8 py-3 sm:py-4 bg-white/95 backdrop-blur-xl border-t border-slate-200/60 shadow-[0_-4px_24px_-8px_rgba(0,0,0,0.06)]">
            <BottomStepper consultationStep={consultationStep} />
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-4 w-full sm:w-auto">
              <button
                type="button"
                onClick={saveDraft}
                className="px-4 sm:px-6 py-2.5 text-on-surface-variant hover:opacity-90 transition-opacity text-xs font-bold uppercase tracking-widest order-2 sm:order-1"
              >
                Save draft
              </button>
              <div className="flex gap-2 order-1 sm:order-2">
                <button
                  type="button"
                  onClick={goBack}
                  disabled={consultationStep === 'workspace' || isProcessing}
                  className="px-4 py-3 rounded-xl bg-surface-container-high text-on-surface text-xs font-bold uppercase tracking-wide disabled:opacity-40"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={goNext}
                  disabled={
                    (consultationStep === 'workspace' && !canAnalyze) ||
                    (consultationStep === 'verify' && !canFinalize) ||
                    isProcessing
                  }
                  className="primary-gradient px-4 sm:px-8 py-3 text-on-primary rounded-xl shadow-lg shadow-primary/20 hover:opacity-95 transition-all text-xs font-bold uppercase tracking-wide flex items-center justify-center gap-2 disabled:opacity-40 disabled:grayscale flex-1 sm:flex-initial min-h-[44px]"
                >
                  {consultationStep === 'workspace' && <Icon name="analytics" className="text-sm" />}
                  {consultationStep === 'workspace'
                    ? isProcessing
                      ? 'Running analysis…'
                      : 'Run intelligent analysis'
                    : consultationStep === 'verify'
                      ? quickComplete
                        ? 'Save consultation'
                        : 'Confirm clinical plan'
                      : 'Start next patient'}
                </button>
              </div>
            </div>
          </footer>
        )}
      </main>
    </div>
  );
}
