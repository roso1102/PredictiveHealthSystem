import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import './App.css';

import ScribeIcon from './components/ScribeIcon';
import TrendsIcon from './components/TrendsIcon';
import MenuIcon from './components/MenuIcon';
import ChevronLeftIcon from './components/ChevronLeftIcon';
import SearchIcon from './components/SearchIcon';
import BellIcon from './components/BellIcon';
import MicIcon from './components/MicIcon';
import SparklesIcon from './components/SparklesIcon';
import ConditionTag from './components/ConditionTag';
import InfoCard from './components/InfoCard';
import Modal from './components/Modal';
import SearchableDropdown from './components/SearchableDropdown';

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
    vitalTrends: { bp: [{date: 'Mar 25', value: '140/90'}, {date: 'Jun 25', value: '135/85'}, {date: 'Sep 25', value: '130/80'}] },
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
    vitalTrends: { bp: [{date: 'Jul 25', value: '132/82'}, {date: 'Aug 25', value: '130/84'}, {date: 'Sep 25', value: '130/80'}] },
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

const ContextualAIPrompt = ({ text }) => (
  <div className="mt-2 p-2 bg-yellow-100 border border-yellow-300 rounded-md text-xs text-yellow-800">
    <span className="font-bold mr-1">Expert Tip:</span>{text}
  </div>
);

const IntakeEditor = ({ noteText, setNoteText }) => {
    const [isListening, setIsListening] = useState(false);
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
        let final_transcript = '';
          for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
            final_transcript += event.results[i][0].transcript;
          }
        }
        if (final_transcript) {
            setNoteText(prev => prev + final_transcript + '. ');
          }
        };

        recognitionRef.current.onend = () => {
          setIsListening(false);
        };
      }
  }, [setNoteText]);

    useEffect(() => {
      if (noteText.toLowerCase().includes('fever')) {
        setContextualPrompt("Regional Alert: Dengue cases are high in your area. Consider checking for retro-orbital pain.");
      } else {
        setContextualPrompt('');
      }
    }, [noteText]);

    const handleListen = () => {
      if (isListening) {
        recognitionRef.current.stop();
        setIsListening(false);
      } else {
        recognitionRef.current.start();
        setIsListening(true);
      }
    };

    return (
      <div className="h-full flex flex-col">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-semibold" style={{ color: '#2C3E50' }}>Intake Notes</h2>
          <button onClick={handleListen} title="Start/Stop Dictation" className={`p-2 rounded-full ${isListening ? 'bg-red-100 animate-pulse' : 'bg-gray-100 hover:bg-gray-200'}`}>
            <MicIcon isListening={isListening} />
          </button>
        </div>
        <textarea
          value={noteText}
          onChange={(e) => setNoteText(e.target.value)}
          className="w-full flex-1 p-3 text-sm bg-white rounded-md border border-gray-300 focus:ring-2 focus:ring-[#26A69A] mt-2"
          placeholder="Type or use voice-to-text..."
        />
        {contextualPrompt && <ContextualAIPrompt text={contextualPrompt} />}
      </div>
    );
};
const SimpleLineChart = ({ data, title, color = '#000000' }) => {
    const points = useMemo(() => { 
        if (!data || data.length < 2) return ""; 
        const values = data.map(d => parseInt(String(d.value).split('/')[0])); 
        const minVal = Math.min(...values) - 5; 
        const maxVal = Math.max(...values) + 5; 
        const width = 300; 
        const height = 100; 
        return data.map((d, i) => { 
            const y = height - ((parseInt(String(d.value).split('/')[0]) - minVal) / (maxVal - minVal)) * height; 
            const x = (i / (data.length - 1)) * width; 
            return `${x},${y}`; 
        }).join(' '); 
    }, [data]); 

    if (!data || data.length === 0) return <div className="text-center text-gray-500 text-sm py-10">No trend data available</div>; 

    return ( 
        <div> 
            <h4 className="text-sm font-semibold text-gray-600">{title}</h4> 
            <svg viewBox="0 0 300 100" className="w-full h-auto"> 
                {points && <polyline fill="none" stroke={color} strokeWidth="2" points={points} />} 
                {points && data.map((d, i) => { 
                    const point = points.split(' ')[i]; if (!point) return null; 
                    const y = point.split(',')[1]; 
                    const x = (i / (data.length - 1)) * 300; 
                    return <circle key={i} cx={x} cy={y} r="3" fill={color} />; 
                })} 
            </svg> 
            <div className="flex justify-between text-xs text-gray-500 mt-1"> 
                {data.map(d => <span key={d.date}>{d.date}</span>)} 
            </div> 
        </div> 
    ); 
};

const SimpleBarChart = ({ data, color = '#000000' }) => { 
      const entries = useMemo(() => data ? Object.entries(data) : [], [data]); 
      const maxValue = useMemo(() => data && Object.values(data).length > 0 ? Math.max(...Object.values(data)) : 0, [data]); 

      if (!data || Object.keys(data).length === 0) return <div className="text-center text-gray-500 text-sm py-10">No data available</div>; 
      
      return ( 
          <div className="w-full h-48 p-4 border border-gray-200 rounded-lg bg-gray-50"> 
              <div className="flex items-end justify-around h-full"> 
                  {entries.map(([label, value]) => ( 
                      <div key={label} className="flex flex-col items-center w-1/5 h-full pt-2"> 
                          <div className="text-xs font-bold text-gray-700">{value}%</div> 
                          <div className="flex-grow w-full flex items-end"> 
                              <div className="w-3/4 mx-auto rounded-t" style={{ height: `${maxValue > 0 ? (value / maxValue) * 100 : 0}%`, backgroundColor: color }}></div> 
                          </div> 
                          <div className="mt-2 text-xs text-gray-500">{label}</div> 
                      </div> 
                  ))} 
              </div> 
          </div> 
      ); 
};

const RegionalTrendsView = () => {
    const [dateRange, setDateRange] = useState('Last 4 Weeks');
    const [compareDisease, setCompareDisease] = useState('Malaria');

    return (
        <div className="p-8 grid grid-cols-1 lg:grid-cols-5 gap-6" style={{backgroundColor: '#F8F8F8'}}>
            <div className="lg:col-span-5 bg-white p-4 rounded-lg shadow-md flex items-center justify-end space-x-4">
                <select value={dateRange} onChange={(e) => setDateRange(e.target.value)} className="text-sm border-gray-300 rounded-md focus:ring-teal-500 focus:border-teal-500">
                    <option>Last 4 Weeks</option>
                    <option>Last 3 Months</option>
                    <option>Last 6 Months</option>
                </select>
                <select value={compareDisease} onChange={(e) => setCompareDisease(e.target.value)} className="text-sm border-gray-300 rounded-md focus:ring-teal-500 focus:border-teal-500">
                    <option>Malaria</option>
                    <option>Viral Fever</option>
                </select>
            </div>
            <div className="lg:col-span-5 bg-white p-6 rounded-lg shadow-md space-y-4">
                <h3 className="font-semibold text-gray-700">Weekly Case Trends</h3>
                <SimpleLineChart data={mockRegionalData.trends['Dengue'].map((v,i) => ({date: `W${i+1}`, value: `${v}`}))} title="Dengue" color="#FF6B6B" />
                <SimpleLineChart data={mockRegionalData.trends[compareDisease].map((v,i) => ({date: `W${i+1}`, value: `${v}`}))} title={compareDisease} color="#FF8C42" />
            </div>
        </div>
    );
  };

const Sidebar = ({ isSidebarCollapsed, setSidebarCollapsed, activeView, setActiveView }) => {
    const newTeal = '#26A69A'; const darkTeal = '#00897B'; const lightTeal = '#4DB6AC';
    return (
        <aside style={{backgroundColor: newTeal}} className={`text-white flex flex-col fixed h-full shadow-lg transition-all duration-300 ease-in-out ${isSidebarCollapsed ? 'w-20' : 'w-64'}`}>
            <div className="flex items-center justify-between px-4 py-3 border-b" style={{borderColor: darkTeal}}>
                {!isSidebarCollapsed && <Link to="/"><h1 className="text-2xl font-bold text-white tracking-wider">Aignosis</h1></Link>}
                <button onClick={() => setSidebarCollapsed(!isSidebarCollapsed)} className="p-2 rounded-md" style={{'--hover-bg': lightTeal}} onMouseOver={e => e.currentTarget.style.backgroundColor=lightTeal} onMouseOut={e => e.currentTarget.style.backgroundColor='transparent'}> {isSidebarCollapsed ? <MenuIcon /> : <ChevronLeftIcon />} </button>
            </div>
            <nav className="flex-1 px-2 py-4 space-y-2">
                {[{ name: 'Consultation', icon: ScribeIcon }, { name: 'Regional Trends', icon: TrendsIcon }].map(item => (
                    <a href="#" key={item.name} onClick={() => setActiveView(item.name)} title={item.name} style={{'--active-bg': darkTeal, '--hover-bg': lightTeal}} className={`flex items-center p-3 text-sm font-medium rounded-md transition-colors ${isSidebarCollapsed ? 'justify-center' : ''} ${activeView === item.name ? 'text-white' : ''}`} onMouseOver={e => {if(activeView !== item.name) e.currentTarget.style.backgroundColor=lightTeal}} onMouseOut={e => {if(activeView !== item.name) e.currentTarget.style.backgroundColor='transparent'}} ref={el => { if(el) el.style.backgroundColor = activeView === item.name ? darkTeal : 'transparent'; }} >
                        <item.icon className={isSidebarCollapsed ? "h-6 w-6" : "h-5 w-5 mr-3"}/>
                        {!isSidebarCollapsed && item.name}
                    </a>
                ))}
            </nav>
            <div className="px-4 py-4 border-t" style={{borderColor: darkTeal}}>
                 <div className="flex items-center">
                    <div style={{backgroundColor: '#2C3E50'}} className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-gray-200">DK</div>
                    {!isSidebarCollapsed && <div className="ml-3"><p className="text-sm font-semibold">Dr. Kapoor</p><p className="text-xs text-teal-100">Cardiologist</p></div>}
                </div>
            </div>
        </aside>
      );
};

const Header = ({ activeView }) => (
    <header className="bg-white py-2 px-6 flex items-center justify-between border-b border-gray-200">
        <div className="flex items-center">
            <h1 className="text-xl font-bold" style={{color: '#2C3E50'}}>{activeView}</h1>
        </div>
        <div className="w-full max-w-md mx-4">
            <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"> <SearchIcon /> </div>
                <input type="text" placeholder="Search Patient by Name or ABHA ID..." className="block w-full bg-gray-100 border border-gray-200 rounded-md py-2 pl-10 pr-3 text-sm placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-teal-500 focus:border-teal-500" />
            </div>
        </div>
        <div className="flex items-center space-x-4">
            <button className="relative p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full"> <BellIcon /> <span className="absolute top-0 right-0 h-3 w-3 bg-red-500 rounded-full border-2 border-white"></span> </button>
            <div className="w-px h-6 bg-gray-200"></div>
            <div className="flex items-center"> <p className="text-sm text-gray-500">{new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</p> </div>
        </div>
    </header>
);

const Stepper = ({ consultationStep }) => {
  const steps = ['workspace', 'verify', 'finalize'];
  const labels = { workspace: 'Workspace', verify: 'Verify & Safety', finalize: 'Finalize' };
  const currentIdx = steps.indexOf(consultationStep);
  return (
    <div className="mb-4 bg-white rounded-lg border border-gray-200 px-4 py-3 flex items-center gap-3">
      {steps.map((step, idx) => (
        <React.Fragment key={step}>
          <div className={`text-sm font-medium ${idx <= currentIdx ? 'text-teal-700' : 'text-gray-400'}`}>{labels[step]}</div>
          {idx < steps.length - 1 && <div className="h-px flex-1 bg-gray-200" />}
        </React.Fragment>
      ))}
    </div>
  );
};

const ConfidenceBadge = ({ confidence }) => (
  <span className="text-xs font-semibold text-green-700 bg-green-100 px-2 py-1 rounded-full">
    {((confidence || 0) * 100).toFixed(0)}%
  </span>
);

const RegionalInsightCard = ({ regionalInsights }) => (
  <div className="bg-cyan-50 border border-cyan-200 rounded p-3">
    <h4 className="text-sm font-semibold text-cyan-900">Regional Insights</h4>
    <p className="text-sm text-cyan-800 mt-1">
      {regionalInsights?.summary || 'No regional trend context available.'}
    </p>
    {regionalInsights?.topDiseases?.length > 0 && (
      <div className="mt-2 flex flex-wrap gap-2">
        {regionalInsights.topDiseases.map((disease) => (
          <span key={disease} className="text-xs px-2 py-1 rounded-full bg-white border border-cyan-300 text-cyan-800">
            {disease}
          </span>
        ))}
      </div>
    )}
  </div>
);

const ConsultationWorkspace = ({ selectedPatient, patients, handlePatientSelect, noteText, setNoteText, aiResult, regionalInsights }) => {
  const [isDropdownOpen, setDropdownOpen] = useState(false);
  const hints = [];
  if (noteText.length < 30) hints.push('Add symptom duration and severity.');
  if (!noteText.toLowerCase().includes('bp')) hints.push('Consider adding vitals (BP/HR/Temp).');
  if (selectedPatient?.allergies?.length) hints.push(`Known allergy: ${selectedPatient.allergies.join(', ')}`);
  if (aiResult?.missingInfo?.length) hints.push(aiResult.missingInfo[0]);

  return (
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
      <div className="xl:col-span-12 bg-white border border-gray-200 rounded-lg p-4 relative">
        <div className="text-xs text-gray-500 mb-1">Current patient</div>
        <button onClick={() => setDropdownOpen(!isDropdownOpen)} className="w-full text-left p-2 rounded hover:bg-gray-50">
          <div className="font-semibold text-gray-900">{selectedPatient ? selectedPatient.name : 'Select patient'}</div>
          <div className="text-sm text-gray-500">{selectedPatient ? `${selectedPatient.age}Y ${selectedPatient.gender} • ABHA ...${selectedPatient.abhaId.slice(-4)}` : 'Choose a patient to begin'}</div>
        </button>
        {isDropdownOpen && <SearchableDropdown options={patients} onSelect={handlePatientSelect} onClose={() => setDropdownOpen(false)} />}
      </div>
      <div className="xl:col-span-4 bg-white border border-gray-200 rounded-lg p-4 space-y-3">
        <InfoCard title="Pre-existing Conditions">{selectedPatient?.preExistingConditions?.map(c => <ConditionTag key={c} text={c} color="orange" />)}</InfoCard>
        <InfoCard title="Known Allergies">{selectedPatient?.allergies?.map(a => <ConditionTag key={a} text={a} color="red" />)}</InfoCard>
        <InfoCard title="Active Medications">{selectedPatient?.currentMedications?.length ? selectedPatient.currentMedications.map(m => <ConditionTag key={m} text={m} color="blue" />) : <span className="text-xs text-gray-500">None reported</span>}</InfoCard>
      </div>
      <div className="xl:col-span-5 bg-white border border-gray-200 rounded-lg p-4 min-h-[520px]">
        <IntakeEditor noteText={noteText} setNoteText={setNoteText} />
      </div>
      <div className="xl:col-span-3 bg-white border border-gray-200 rounded-lg p-4">
        <h3 className="font-semibold text-gray-800 mb-2">Live Guidance</h3>
        <ul className="space-y-2 text-sm text-gray-700">
          {hints.map((hint, idx) => <li key={idx} className="bg-amber-50 border border-amber-200 rounded p-2">{hint}</li>)}
          {!hints.length && <li className="text-gray-500">No prompts right now.</li>}
        </ul>
        <div className="mt-4">
          <RegionalInsightCard regionalInsights={regionalInsights} />
        </div>
      </div>
    </div>
  );
};

const VerifyAndSafety = ({ aiResult, ddiAlerts, ddiAcknowledged, setDdiAcknowledged, errorMessage, regionalInsights }) => {
  if (!aiResult && !errorMessage) {
    return <div className="bg-white border border-gray-200 rounded-lg p-6 text-gray-500">Run analysis from Workspace first.</div>;
  }
  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
      <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-4">
        <h3 className="font-semibold text-gray-800">AI Verification</h3>
        {errorMessage && <div className="p-3 text-sm bg-red-50 border border-red-200 text-red-700 rounded">{errorMessage}</div>}
        {aiResult?.symptoms?.length > 0 && aiResult.symptoms.map((s, i) => (
          <div key={i} className="flex justify-between p-2 border rounded bg-gray-50"><span>{s.value}</span><ConfidenceBadge confidence={s.confidence} /></div>
        ))}
        <div className="space-y-2">
          <h4 className="text-sm font-semibold text-gray-700">Differential</h4>
          {aiResult?.diagnosis?.length ? aiResult.diagnosis.map((d, i) => (
            <div key={i} className={`p-3 rounded border-l-4 ${d.suggestion ? 'border-blue-400 bg-blue-50' : 'border-gray-300 bg-white'}`}>
              <div className="font-semibold text-gray-800">{d.description}</div>
              {d.code && d.code !== 'N/A' && <div className="text-xs text-gray-500">Code: {d.code}</div>}
            </div>
          )) : <div className="text-sm text-gray-500">No diagnosis generated.</div>}
        </div>
      </div>
      <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-4">
        <h3 className="font-semibold text-gray-800">Safety Check</h3>
        <RegionalInsightCard regionalInsights={regionalInsights} />
        {ddiAlerts?.length > 0 ? (
          <>
            {ddiAlerts.map((alert, i) => (
              <div key={i} className="p-3 bg-red-50 border border-red-200 text-red-700 rounded">
                <div className="font-semibold">{alert.drugA} + {alert.drugB}</div>
                <div className="text-sm">{alert.note || alert.description || 'Potential interaction detected.'}</div>
              </div>
            ))}
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={ddiAcknowledged} onChange={(e) => setDdiAcknowledged(e.target.checked)} />
              I reviewed and acknowledge interaction risks.
            </label>
          </>
        ) : (
          <div className="p-3 bg-green-50 border border-green-200 text-green-700 rounded text-sm">No interactions detected in current recommendations.</div>
        )}
      </div>
    </div>
  );
};

export default function App() {
  const [activeView, setActiveView] = useState('Consultation');
  const [selectedPatientId, setSelectedPatientId] = useState(mockPatients[0]?.id ?? null);
  const [patients, setPatients] = useState(mockPatients);
  const [isSidebarCollapsed, setSidebarCollapsed] = useState(true);
  const [modalContent, setModalContent] = useState(null);
  const [consultationStep, setConsultationStep] = useState('workspace');
  const [quickComplete, setQuickComplete] = useState(false);
  const [noteText, setNoteText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [aiResult, setAiResult] = useState(null);
  const [ddiAlerts, setDdiAlerts] = useState([]);
  const [ddiAcknowledged, setDdiAcknowledged] = useState(false);
  const [summaryDraft, setSummaryDraft] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const selectedPatient = useMemo(() => patients.find(p => p.id === selectedPatientId), [selectedPatientId, patients]);
  const regionalInsights = useMemo(() => {
    const trendEntries = Object.entries(mockRegionalData.trends || {});
    if (!trendEntries.length) return { summary: 'No trend data available.', topDiseases: [] };
    const ranked = trendEntries
      .map(([name, values]) => ({ name, latest: values[values.length - 1] || 0 }))
      .sort((a, b) => b.latest - a.latest);
    const topDiseases = ranked.slice(0, 2).map((d) => d.name);
    return {
      summary: `Recent local trend alert: ${topDiseases.join(' and ')} show the highest case activity.`,
      topDiseases,
    };
  }, []);

  // Dashboard currently uses local mock patient cards for context rendering.
  // Avoid noisy 404s from backend IDs that do not match mock IDs (1..4 vs Pxxxx).

  const handleProcessNotes = async () => {
    if (!noteText.trim() || !selectedPatient) return;
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
                current_medications: selectedPatient.currentMedications || []
            }),
        });

        if (geminiResponse.ok) {
            analysisResult = await geminiResponse.json();
        } else {
            const errorData = await geminiResponse.json();
            console.error("Gemini request failed:", errorData);
            const enrichedMessage = errorData.upstream_status
              ? `${errorData.error || 'Gemini request failed.'} (upstream ${errorData.upstream_status})`
              : (errorData.error || 'Gemini request failed.');
            setErrorMessage(enrichedMessage);
        }
    } catch (error) {
        console.error("Error with Gemini request:", error);
        setErrorMessage('Unable to complete AI analysis. Please try again.');
    }

    if (analysisResult) {
        setAiResult(analysisResult);

        if (analysisResult.medications && analysisResult.medications.length > 0) {
            const newMedications = analysisResult.medications.map(m => m.name);
            try {
                const ddiResponse = await fetch(`${API_BASE_URL}/ddi_check`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        current_medications: selectedPatient.currentMedications,
                        new_medications: newMedications
                    })
                });
                if (ddiResponse.ok) {
                    const ddiData = await ddiResponse.json();
                    if (ddiData.interactions) {
                        setDdiAlerts(ddiData.interactions);
                    }
                }
            } catch (error) {
                console.error("Error checking DDI:", error);
            }
        }
    }

    setIsProcessing(false);
    return !!analysisResult;
  };
  
  const handleRegenerateSummary = async () => {
    if (!selectedPatient) return;
    setIsProcessing(true);
    let newSummary = "Failed to generate summary due to an error."; // Default error message
    try {
        const response = await fetch(`${API_BASE_URL}/generate_summary`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(selectedPatient)
        });

        if (response.ok) {
            const data = await response.json();
            newSummary = data.summary;
        } else {
            const errorData = await response.json();
            console.error("Error generating summary:", errorData.error);
        }
    } catch (error) {
        console.error("Error generating summary:", error);
    }

    setPatients(prevPatients => prevPatients.map(p => 
        p.id === selectedPatientId ? { ...p, aiSummary: newSummary } : p
    ));
    setSummaryDraft(newSummary);
    setIsProcessing(false);
  };

  useEffect(() => {
    const style = document.createElement('style');
    style.innerHTML = `@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap'); body { font-family: 'Inter', sans-serif; }`;
    document.head.appendChild(style);
  }, []);

  const handlePatientSelect = (id) => {
    setSelectedPatientId(id);
    setNoteText('');
    setAiResult(null);
    setDdiAlerts([]);
    setSummaryDraft('');
    setErrorMessage('');
    setDdiAcknowledged(false);
    setConsultationStep('workspace');
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
        handlePatientSelect(null);
        return;
      }
      setConsultationStep('finalize');
      return;
    }
    if (consultationStep === 'finalize') {
      handlePatientSelect(null);
    }
  };

  const goBack = () => {
    if (consultationStep === 'finalize') setConsultationStep('verify');
    else if (consultationStep === 'verify') setConsultationStep('workspace');
  };

  const renderConsultationContent = () => {
    if (consultationStep === 'workspace') {
      return (
        <ConsultationWorkspace
          selectedPatient={selectedPatient}
          patients={patients}
          handlePatientSelect={handlePatientSelect}
          noteText={noteText}
          setNoteText={setNoteText}
          aiResult={aiResult}
          regionalInsights={regionalInsights}
        />
      );
    }
    if (consultationStep === 'verify') {
      return (
        <VerifyAndSafety
          aiResult={aiResult}
          ddiAlerts={ddiAlerts}
          ddiAcknowledged={ddiAcknowledged}
          setDdiAcknowledged={setDdiAcknowledged}
          errorMessage={errorMessage}
          regionalInsights={regionalInsights}
        />
      );
    }
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="font-semibold text-gray-800">Finalize & Handoff</h3>
          <button onClick={handleRegenerateSummary} disabled={isProcessing || !selectedPatient} className="flex items-center text-xs bg-teal-100 text-teal-700 font-semibold py-1 px-2 rounded border border-teal-200 hover:bg-teal-200 disabled:opacity-50">
            <SparklesIcon /> Regenerate Summary
          </button>
        </div>
        <textarea
          value={summaryDraft || selectedPatient?.aiSummary || ''}
          onChange={(e) => setSummaryDraft(e.target.value)}
          className="w-full min-h-[220px] p-3 border border-gray-300 rounded text-sm"
        />
        <div className="text-sm text-gray-500">Review this summary and save consultation to handoff.</div>
      </div>
    );
  };
  
  return (
    <div className="min-h-screen font-sans text-gray-700 flex" style={{fontFamily: "'Inter', sans-serif", backgroundColor: '#F8F8F8'}}>
      {modalContent && <Modal content={modalContent} onClose={() => setModalContent(null)} />}
      <Sidebar 
        isSidebarCollapsed={isSidebarCollapsed} 
        setSidebarCollapsed={setSidebarCollapsed} 
        activeView={activeView} 
        setActiveView={setActiveView} 
      />
      <main className={`flex-1 flex flex-col transition-all duration-300 ease-in-out ${isSidebarCollapsed ? 'ml-20' : 'ml-64'}`}>
        <Header activeView={activeView} />
        <div className="flex-1 overflow-y-auto relative">
          {activeView === 'Regional Trends' ? (
            <RegionalTrendsView />
          ) : (
            <div className="p-6">
              <Stepper consultationStep={consultationStep} />
              <div className="mb-4 flex items-center justify-between">
                <label className="text-sm flex items-center gap-2">
                  <input type="checkbox" checked={quickComplete} onChange={(e) => setQuickComplete(e.target.checked)} />
                  Quick complete mode
                </label>
                {errorMessage && <span className="text-sm text-red-600">{errorMessage}</span>}
              </div>
              {renderConsultationContent()}
              <div className="sticky bottom-0 mt-4 bg-white border border-gray-200 rounded-lg px-4 py-3 flex justify-between">
                <button
                  onClick={goBack}
                  disabled={consultationStep === 'workspace' || isProcessing}
                  className="px-4 py-2 rounded bg-gray-100 text-gray-700 disabled:opacity-50"
                >
                  Back
                </button>
                <button
                  onClick={goNext}
                  disabled={(consultationStep === 'workspace' && !canAnalyze) || (consultationStep === 'verify' && !canFinalize) || isProcessing}
                  className="px-4 py-2 rounded text-white bg-teal-600 disabled:bg-gray-400"
                >
                  {consultationStep === 'workspace' ? (isProcessing ? 'Analyzing...' : 'Analyze & Verify') : consultationStep === 'verify' ? (quickComplete ? 'Save Consultation' : 'Confirm Clinical Plan') : 'Start Next Patient'}
                </button>
              </div>
              {consultationStep === 'workspace' && analyzeReadinessMessage && (
                <div className="mt-2 text-xs text-gray-500">{analyzeReadinessMessage}</div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
