/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { 
  Users, 
  LayoutDashboard, 
  GraduationCap, 
  Settings, 
  LogOut, 
  ChevronRight, 
  Bell, 
  Search, 
  Filter,
  CheckCircle2,
  Circle,
  Activity,
  ExternalLink,
  HelpCircle,
  ChevronDown,
  ShieldCheck,
  X,
  Menu,
  Loader2,
  Clock,
  Copy,
  AlertTriangle,
  AlertCircle
} from 'lucide-react';
import { BrowserRouter, Routes, Route, useSearchParams, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { MOCK_STUDENTS, MOCK_ADVISORS, MOCK_CURRICULUMS, MOCK_PLANS } from './data/mockData';
import { MILESTONES, MilestoneStatus, User, Role } from './types';
import { ProgramChairSettingsView } from './components/ProgramChairSettingsView';

// --- Helper Services ---
const handleSSOCallback = async (payload: any) => {
  const response = await fetch(import.meta.env.BASE_URL + 'api/auth/profile', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error || 'Failed to authenticate');
  }
  return response.json();
};

const fetchLJStudents = async (email?: string, role?: string, faculty?: string) => {
  const baseUrl = import.meta.env.BASE_URL.replace(/\/$/, '');
  let url = `${baseUrl}/api/life-journey/students`;
  const params = new URLSearchParams();
  if (email) params.append('email', email);
  if (role) params.append('role', role);
  if (faculty) params.append('faculty', faculty);
  
  if (params.toString()) {
    url += '?' + params.toString();
  }
  const response = await fetch(url);
  const data = await response.json();
  if (!response.ok) {
    return { 
      _error: true, 
      status: response.status, 
      statusText: response.statusText,
      data: data
    };
  }
  return data;
};

const getLJAccessUrl = async (studentCode: string) => {
  const baseUrl = import.meta.env.BASE_URL.replace(/\/$/, '');
  const response = await fetch(`${baseUrl}/api/life-journey/access/${studentCode}`);
  if (!response.ok) throw new Error('Failed to get access link');
  const data = await response.json();
  return data.url || data.accessUrl;
};

type DashboardType = 'STAFF' | 'ADVISOR' | 'PROGRAM';
type ViewState = 'LOGIN' | 'ROLE_SELECTION' | 'DASHBOARD';

const LoginView = ({ onLogin, isLoading: externalLoading }: { onLogin: (u: User) => void, isLoading?: boolean }) => {
  const [internalLoading, setInternalLoading] = useState(false);
  const [authUrl, setAuthUrl] = useState<string | null>(null);
  const isLoading = externalLoading || internalLoading;

  React.useEffect(() => {
    fetch(import.meta.env.BASE_URL + 'api/auth/url')
      .then(res => res.json())
      .then(data => setAuthUrl(data.url))
      .catch(err => console.error("Failed to load auth URL", err));
  }, []);

  const handleMockLogin = (type: 'STAFF' | 'PROFESSOR') => {
    setInternalLoading(true);
    setTimeout(() => {
      if (type === 'STAFF') {
        onLogin({ 
          name: 'คุณสมศรี เจ้าหน้าที่คณะ', 
          email: 'staff@kku.ac.th', 
          role: 'STAFF',
          faculty: 'วิศวกรรมศาสตร์',
          department: 'สำนักงานคณบดี'
        });
      } else {
        onLogin({ 
          name: 'ผศ.ดร.นนทวัฒน์ สมพงษ์', 
          email: 'professor@kku.ac.th', 
          role: 'ADVISOR',
          secondaryRoles: ['PROGRAM_CHAIR'],
          faculty: 'วิศวกรรมศาสตร์',
          department: 'คอมพิวเตอร์'
        });
      }
      setInternalLoading(false);
    }, 600);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full bg-white rounded-3xl shadow-xl p-10 border border-slate-100"
      >
        <div className="flex flex-col items-center mb-10">
          <div className="w-20 h-20 bg-[#aa2424] rounded-2xl flex items-center justify-center text-white font-black text-4xl mb-6 shadow-lg">
            GS
          </div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight">GS KKU Journey</h1>
          <p className="text-slate-500 font-medium mt-1">ระบบติดตามความก้าวหน้านักศึกษา</p>
        </div>

        <div className="space-y-4">
          <a 
            href={authUrl || '#'}
            className={`w-full bg-[#f36d21] hover:bg-[#e25c10] text-white p-6 rounded-2xl flex items-center justify-center gap-3 transition-all font-bold shadow-md shadow-orange-200 ${!authUrl && 'opacity-50 cursor-wait'}`}
          >
            <ShieldCheck size={24} />
            <span className="text-lg">เข้าสู่ระบบด้วย KKU SSO</span>
          </a>
          <div className="py-6 flex items-center gap-4">
            <div className="h-px flex-1 bg-slate-100"></div>
            <span className="text-[10px] font-black text-slate-300 uppercase tracking-[0.3em]">Quick Access for Dev</span>
            <div className="h-px flex-1 bg-slate-100"></div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {[
              { id: 'ADVISOR', label: 'ที่ปรึกษา', icon: <Users size={16} /> },
              { id: 'STAFF', label: 'เจ้าหน้าที่', icon: <Activity size={16} /> },
              { id: 'PROGRAM', label: 'ประธานฯ', icon: <ShieldCheck size={16} /> }
            ].map(role => (
              <button 
                key={role.id}
                onClick={() => handleMockLogin(role.id as any)}
                className="flex flex-col items-center gap-2 p-3 rounded-2xl bg-slate-50 border border-slate-100 hover:bg-kku-gold/5 hover:border-kku-gold/30 hover:text-kku-gold-darker transition-all group"
              >
                <div className="text-slate-400 group-hover:text-kku-gold transition-colors">{role.icon}</div>
                <span className="text-[10px] font-black uppercase tracking-tighter">{role.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-slate-100 text-center">
          <p className="text-[10px] text-slate-400 font-medium tracking-widest uppercase">GRADUATE SCHOOL, KHON KAEN UNIVERSITY</p>
        </div>
      </motion.div>
    </div>
  );
};

// Helper to construct academic prefix and name correctly from database attributes
const getUserDisplayName = (user: User | null): string => {
  if (!user) return "";
  
  // 1. If user.name already starts with an academic prefix, return as-is
  const hasPrefix = /^(ศ\.ดร\.|รศ\.ดร\.|ผศ\.ดร\.|อ\.ดร\.|ศ\.|รศ\.|ผศ\.|อ\.)/.test(user.name);
  if (hasPrefix) return user.name;
  
  // 2. Determine base prefix from academic position name or prefix
  let resolvedPrefix = "";
  if (user.academicPositionName) {
    const posLower = user.academicPositionName.toLowerCase().trim();
    
    // Check if position name contains abbreviations directly
    const commonAbbrs = ["ผศ.ดร.", "รศ.ดร.", "ศ.ดร.", "อ.ดร.", "ผศ.", "รศ.", "ศ.", "อ."];
    const matchedAbbr = commonAbbrs.find(abbr => posLower.startsWith(abbr) || posLower === abbr);
    if (matchedAbbr) {
      resolvedPrefix = matchedAbbr;
    } else if (posLower.includes("ศาสตราจารย์") && posLower.includes("รอง")) {
      resolvedPrefix = "รศ.";
    } else if (posLower.includes("ศาสตราจารย์") && posLower.includes("ผู้ช่วย")) {
      resolvedPrefix = "ผศ.";
    } else if (posLower.includes("ศาสตราจารย์")) {
      resolvedPrefix = "ศ.";
    } else if (posLower.includes("อาจารย์")) {
      resolvedPrefix = "อ.";
    } else if (posLower.includes("professor") && posLower.includes("associate")) {
      resolvedPrefix = "รศ.";
    } else if (posLower.includes("professor") && posLower.includes("assistant")) {
      resolvedPrefix = "ผศ.";
    } else if (posLower.includes("professor")) {
      resolvedPrefix = "ศ.";
    } else if (posLower.includes("lecturer")) {
      resolvedPrefix = "อ.";
    }
  }
  
  // If no prefix from position name but we have user.prefix, use that
  if (!resolvedPrefix && user.prefix) {
    resolvedPrefix = user.prefix.trim();
  }
  
  // Strip general civilian prefixes
  if (resolvedPrefix === "นาย" || resolvedPrefix === "นาง" || resolvedPrefix === "นางสาว" || resolvedPrefix === "คุณ" || resolvedPrefix === "น.ส." || resolvedPrefix === "นส.") {
    resolvedPrefix = "";
  }
  
  // 3. Check for doctor/Ph.D. degree
  const textToSearch = `${user.name} ${user.prefix || ""} ${user.academicPositionName || ""} ${user.email || ""}`.toLowerCase();
  const hasDoctor = textToSearch.includes("ดร.") || textToSearch.includes("dr.") || textToSearch.includes("doctor") || textToSearch.includes("ph.d");
  
  if (hasDoctor && resolvedPrefix && !resolvedPrefix.includes("ดร.")) {
    resolvedPrefix = resolvedPrefix + "ดร.";
  } else if (hasDoctor && !resolvedPrefix) {
    resolvedPrefix = "ดร.";
  }
  
  // 4. Default fallback for Academic Dashboard roles if everything is empty
  if (!resolvedPrefix && user.role !== "STAFF") {
    resolvedPrefix = "อ.";
  }
  
  return resolvedPrefix ? `${resolvedPrefix}${user.name}` : user.name;
};

const RoleSelectionView = ({ user, onSelect }: { user: User, onSelect: (type: DashboardType) => void }) => {
  const [isChairAssigned, setIsChairAssigned] = useState<boolean>(
    user.role === 'PROGRAM_CHAIR' || !!user.secondaryRoles?.includes('PROGRAM_CHAIR')
  );

  React.useEffect(() => {
    if (user.email) {
      fetch(import.meta.env.BASE_URL + 'api/program-chairs')
        .then(res => res.ok ? res.json() : [])
        .then((chairs: any[]) => {
          if (Array.isArray(chairs)) {
            const found = chairs.some((c: any) => 
              c.program_chair_email && c.program_chair_email.toLowerCase().trim() === user.email.toLowerCase().trim()
            );
            if (found) {
              setIsChairAssigned(true);
            }
          }
        })
        .catch(err => console.error("Error checking program chair status:", err));
    }
  }, [user.email]);

  const allRoles = useMemo(() => {
    const roles: DashboardType[] = [];
    const isStaff = user.role === 'STAFF' || user.secondaryRoles?.includes('STAFF');
    const isAdvisor = user.role === 'ADVISOR' || user.role === 'PROGRAM_CHAIR' || user.secondaryRoles?.includes('ADVISOR');
    const isProgramChair = user.role === 'PROGRAM_CHAIR' || user.secondaryRoles?.includes('PROGRAM_CHAIR') || isChairAssigned;

    if (isAdvisor) roles.push('ADVISOR');
    if (isProgramChair) roles.push('PROGRAM');
    if (isStaff) roles.push('STAFF');
    return roles;
  }, [user, isChairAssigned]);

  const rawFaculty = user.facultyname || user.sso_data?.facultyname || user.sso_data?.faculty_name || user.sso_data?.facultyName || user.sso_data?.faculty || user.faculty || '';
  const displayFaculty = rawFaculty ? (rawFaculty.startsWith('คณะ') ? rawFaculty : `คณะ${rawFaculty}`) : '';

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-4xl w-full"
      >
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-1 bg-kku-red/10 text-kku-red rounded-full text-[10px] font-black uppercase tracking-widest mb-6">
            <ShieldCheck size={14} />
            Authenticated
          </div>
          <h2 className="text-2xl sm:text-4xl font-black text-slate-800 tracking-tight mb-3 px-4">ยินดีต้อนรับ {getUserDisplayName(user)}</h2>
          <p className="text-sm sm:text-lg text-slate-500 font-medium px-4">
            สังกัด: {displayFaculty}
          </p>
          <div className="h-1 w-20 bg-kku-red mx-auto mt-6 rounded-full" />
        </div>

        <div className={`grid gap-8 ${
          allRoles.length === 1 ? 'grid-cols-1 max-w-md mx-auto' :
          allRoles.length === 2 ? 'grid-cols-1 md:grid-cols-2 max-w-3xl mx-auto' :
          'grid-cols-1 md:grid-cols-3'
        }`}>
          {allRoles.includes('ADVISOR') && (
            <motion.button 
              whileHover={{ y: -8 }}
              onClick={() => onSelect('ADVISOR')}
              className="bg-white p-10 rounded-[40px] shadow-2xl border border-slate-100 hover:border-kku-green transition-all flex flex-col items-center text-center group relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-kku-green/5 rounded-bl-full -mr-16 -mt-16 group-hover:bg-kku-green/10 transition-colors" />
              <div className="w-24 h-24 bg-kku-green/10 rounded-3xl flex items-center justify-center text-kku-green mb-8 group-hover:scale-110 group-hover:bg-kku-green group-hover:text-white transition-all duration-500">
                <GraduationCap size={48} />
              </div>
              <h3 className="text-2xl font-black text-slate-800 mb-3 tracking-tight">อาจารย์ที่ปรึกษา</h3>
              <p className="text-sm text-slate-500 leading-relaxed font-medium">จัดการและติดตามความก้าวหน้านักศึกษาในความดูแลของท่านโดยตรง</p>
              <div className="mt-8 flex items-center gap-2 text-kku-green font-bold text-sm uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">
                Select Role <ChevronRight size={16} />
              </div>
            </motion.button>
          )}

          {allRoles.includes('PROGRAM') && (
            <motion.button 
              whileHover={{ y: -8 }}
              onClick={() => onSelect('PROGRAM')}
              className="bg-white p-10 rounded-[40px] shadow-2xl border border-slate-100 hover:border-kku-gold transition-all flex flex-col items-center text-center group relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-kku-gold/5 rounded-bl-full -mr-16 -mt-16 group-hover:bg-kku-gold/10 transition-colors" />
              <div className="w-24 h-24 bg-kku-gold/10 rounded-3xl flex items-center justify-center text-kku-gold mb-8 group-hover:scale-110 group-hover:bg-kku-gold group-hover:text-white transition-all duration-500">
                <ShieldCheck size={48} />
              </div>
              <h3 className="text-2xl font-black text-slate-800 mb-3 tracking-tight">ประธานหลักสูตร</h3>
              <p className="text-sm text-slate-500 leading-relaxed font-medium">ดูภาพรวมสถิติ ผลงานวิจัย และแจ้งเตือนนักศึกษาทั้งหลักสูตร</p>
              <div className="mt-8 flex items-center gap-2 text-kku-gold font-bold text-sm uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">
                Select Role <ChevronRight size={16} />
              </div>
            </motion.button>
          )}

          {allRoles.includes('STAFF') && (
            <motion.button 
              whileHover={{ y: -8 }}
              onClick={() => onSelect('STAFF')}
              className="bg-white p-10 rounded-[40px] shadow-2xl border border-slate-100 hover:border-kku-red transition-all flex flex-col items-center text-center group relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-kku-red/5 rounded-bl-full -mr-16 -mt-16 group-hover:bg-kku-red/10 transition-colors" />
              <div className="w-24 h-24 bg-kku-red/10 rounded-3xl flex items-center justify-center text-kku-red mb-8 group-hover:scale-110 group-hover:bg-kku-red group-hover:text-white transition-all duration-500">
                <Users size={48} />
              </div>
              <h3 className="text-2xl font-black text-slate-800 mb-3 tracking-tight">เจ้าหน้าที่คณะ</h3>
              <p className="text-sm text-slate-500 leading-relaxed font-medium">ตรวจสอบเอกสารและสถานะสำคัญของนักศึกษาในระดับคณะ</p>
              <div className="mt-8 flex items-center gap-2 text-kku-red font-bold text-sm uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">
                Select Role <ChevronRight size={16} />
              </div>
            </motion.button>
          )}
        </div>
      </motion.div>
    </div>
  );
};

const Sidebar = ({ 
  activeDashboard, 
  user, 
  onLogout, 
  onSwitchRole,
  isOpen, 
  onClose,
  activeTab,
  setActiveTab
}: { 
  activeDashboard: DashboardType, 
  user: User, 
  onLogout: () => void, 
  onSwitchRole?: () => void,
  isOpen: boolean, 
  onClose: () => void,
  activeTab: 'dashboard' | 'program_chair_setting',
  setActiveTab: (tab: 'dashboard' | 'program_chair_setting') => void
}) => {
  return (
    <>
      {/* Mobile Backdrop */}
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40 lg:hidden"
          />
        )}
      </AnimatePresence>

      <div className={`fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-slate-200 flex flex-col transition-transform duration-300 transform lg:translate-x-0 lg:static lg:min-h-screen ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-kku-red rounded-lg flex items-center justify-center text-white font-bold text-xl">
              GS
            </div>
            <div>
              <h1 className="font-bold text-slate-800 leading-tight">GS KKU</h1>
              <p className="text-[10px] text-slate-500 uppercase tracking-wider">Life Journey Monitor</p>
            </div>
          </div>
          <button className="lg:hidden p-2 text-slate-400 hover:text-slate-600" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

      <nav className="flex-1 px-4 space-y-1 mt-4">
        <NavItem 
          icon={<LayoutDashboard size={20} />} 
          label="แดชบอร์ดหลัก" 
          active={activeTab === 'dashboard'} 
          onClick={() => { setActiveTab('dashboard'); onClose(); }}
        />

        {activeDashboard === 'STAFF' && (
          <NavItem 
            icon={<Users size={20} />} 
            label="กำหนดประธานหลักสูตร" 
            active={activeTab === 'program_chair_setting'} 
            onClick={() => { setActiveTab('program_chair_setting'); onClose(); }}
          />
        )}
        
        <div className="pt-8 pb-2 px-3">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">ACTIVE MODE</div>
          <div className={`px-3 py-2 rounded-xl text-[10px] font-black flex items-center gap-2 border ${
            activeDashboard === 'STAFF' ? 'bg-kku-green/5 text-kku-green border-kku-green/20' : 
            activeDashboard === 'ADVISOR' ? 'bg-kku-gold/5 text-kku-gold border-kku-gold/20' : 
            'bg-kku-red/5 text-kku-red border-kku-red/20'
          }`}>
            <div className={`w-1.5 h-1.5 rounded-full ${
              activeDashboard === 'STAFF' ? 'bg-kku-green' : 
              activeDashboard === 'ADVISOR' ? 'bg-kku-gold' : 
              'bg-kku-red'
            }`} />
            {activeDashboard === 'STAFF' ? 'เจ้าหน้าที่คณะ' : 
             activeDashboard === 'ADVISOR' ? 'อาจารย์ที่ปรึกษา' : 
             'ประธานหลักสูตร'}
          </div>

          {onSwitchRole && (
            <button
              onClick={onSwitchRole}
              className="mt-2 w-full text-left px-3 py-1.5 text-[11px] font-bold text-slate-500 hover:text-kku-gold hover:bg-slate-50 rounded-lg transition-colors flex items-center gap-1.5"
            >
              <ShieldCheck size={14} />
              สลับสิทธิ์การใช้งาน
            </button>
          )}
        </div>

        <div className="px-6 py-4">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">My Faculty</div>
          <p className="text-xs font-bold text-slate-700 truncate">
            {(() => {
              const raw = user?.facultyname || user?.sso_data?.facultyname || user?.sso_data?.faculty_name || user?.faculty || '';
              return raw ? (raw.startsWith('คณะ') ? raw : `คณะ${raw}`) : 'ไม่ระบุคณะ';
            })()}
          </p>
        </div>
      </nav>

      <div className="p-4 border-t border-slate-100">
        <button 
          onClick={onLogout}
          className="flex items-center gap-3 w-full px-3 py-2 text-slate-600 hover:text-kku-red transition-colors text-sm font-medium"
        >
          <LogOut size={20} />
          ออกจากระบบ
        </button>
      </div>
    </div>
    </>
  );
};

const NavItem = ({ icon, label, active = false, onClick }: { icon: React.ReactNode, label: string, active?: boolean, onClick?: () => void }) => (
  <button 
    onClick={onClick} 
    className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors w-full text-left ${active ? 'bg-kku-green text-white shadow-md shadow-kku-green/20' : 'text-slate-600 hover:bg-slate-100'}`}
  >
    {icon}
    {label}
  </button>
);

const PieChart = ({ count, total }: { count: number; total: number }) => {
  const pending = Math.max(0, total - count);
  const greenPercent = total > 0 ? Math.round((count / total) * 100) : 0;
  
  const size = 100;
  const strokeWidth = 14;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const greenDash = total > 0 ? (count / total) * circumference : 0;

  return (
    <div className="relative flex items-center justify-center flex-shrink-0">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="transform -rotate-90">
        {/* Orange Donut Circle (Pending / Background) */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="transparent"
          stroke="#F97316"
          strokeWidth={strokeWidth}
          className="transition-all duration-500 opacity-90"
        />
        {/* Green Donut Circle (Completed Segment) */}
        {total > 0 && count > 0 && (
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="transparent"
            stroke="#008850"
            strokeWidth={strokeWidth}
            strokeDasharray={`${greenDash} ${circumference}`}
            strokeDashoffset={0}
            strokeLinecap={count === total ? "butt" : "round"}
            className="transition-all duration-500"
          />
        )}
      </svg>
      {/* Center percentage indicator */}
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className="text-lg sm:text-xl font-black text-slate-800 tabular-nums leading-none">
          {greenPercent}%
        </span>
        <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-tighter mt-0.5">
          สำเร็จ
        </span>
      </div>
    </div>
  );
};

const StatCard = ({ label, count, total }: { label: string, count: number, total: number, key?: any }) => {
  const pending = Math.max(0, total - count);

  return (
    <div className="bg-white border border-slate-200/80 rounded-3xl p-4 sm:p-5 flex flex-col items-center text-center shadow-sm hover:shadow-md transition-all h-full justify-between">
      <p className="text-xs sm:text-sm font-black text-slate-700 uppercase tracking-tight mb-2 sm:mb-3 h-auto sm:h-8 flex items-center justify-center leading-tight">
        {label}
      </p>

      <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-5 w-full my-1">
        {/* Pie / Donut Chart */}
        <PieChart count={count} total={total} />

        {/* Legend & Stats */}
        <div className="flex sm:flex-col justify-around sm:justify-center gap-3 sm:gap-2.5 w-full sm:w-auto border-t sm:border-t-0 sm:border-l border-slate-100 pt-2.5 sm:pt-0 sm:pl-4">
          <div className="flex flex-col items-center sm:items-start">
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-kku-green flex-shrink-0" />
              <span className="text-2xl sm:text-3xl font-black text-kku-green tabular-nums">{count}</span>
            </div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">ดำเนินการแล้ว</span>
          </div>

          <div className="flex flex-col items-center sm:items-start">
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-orange-400 flex-shrink-0" />
              <span className="text-2xl sm:text-3xl font-black text-orange-400 tabular-nums">{pending}</span>
            </div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">รอดำเนินการ</span>
          </div>
        </div>
      </div>
    </div>
  );
};

const DashboardStats = ({ students }: { students: typeof MOCK_STUDENTS }) => {
  const stats = MILESTONES.map(milestone => {
    const doneCount = students.filter(s => 
      s.milestones.find(m => m.milestoneId === milestone.id)?.status === 'done'
    ).length;
    return {
      name: milestone.name,
      doneCount,
      total: students.length
    };
  });

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mb-8">
      {stats.map((stat, i) => (
        <StatCard 
          key={i} 
          label={stat.name} 
          count={stat.doneCount} 
          total={stat.total} 
        />
      ))}
    </div>
  );
};

const MilestoneDot = ({ status }: { status: MilestoneStatus }) => {
  switch (status) {
    case 'done':
      return (
        <div className="w-5 h-5 rounded-full bg-kku-green flex items-center justify-center text-white shadow-lg shadow-kku-green/30 animate-in zoom-in duration-300">
          <CheckCircle2 size={12} strokeWidth={3} />
        </div>
      );
    case 'pending':
    default:
      return <Circle className="w-4 h-4 text-orange-400" />;
  }
};

interface StudyDurationInfo {
  studentYear: number;
  currentSemester: number;
  totalSemesters: number;
  levelName: string;
  planName: string;
  planYears: number;
  planSemesters: number;
  maxYears: number;
  maxSemesters: number;
  alertType: 'NONE' | 'PLAN_WARNING' | 'MAX_WARNING';
  alertMessage: string | null;
}

const calculateStudyDurationInfo = (student: any): StudyDurationInfo => {
  const studentYear = student.studentYear || student.yearsOfStudy || 1;
  const currentSemester = student.currentSemester || student.semester || student.admitSemester || 1;
  const totalSemesters = (studentYear - 1) * 2 + currentSemester;

  const levelStr = (student.level || '').toString();
  const planStr = (student.plan || '').toString();
  const typeStr = (student.type || '').toString();
  const rawCurriculum = (student.curriculum || '').toString();
  const combinedInfo = `${levelStr} ${planStr} ${typeStr} ${rawCurriculum}`.toLowerCase();

  const isDoctorate = levelStr.includes('เอก') || combinedInfo.includes('เอก') || combinedInfo.includes('doctor');

  let planYears = 2;
  let maxYears = 5;

  if (isDoctorate) {
    if (
      combinedInfo.includes('1.2') || 
      combinedInfo.includes('2.2') || 
      planStr.includes('1.2') || 
      planStr.includes('2.2') ||
      typeStr.includes('1.2') ||
      typeStr.includes('2.2')
    ) {
      planYears = 4;
      maxYears = 8;
    } else {
      planYears = 3;
      maxYears = 6;
    }
  } else {
    planYears = 2;
    maxYears = 5;
  }

  const planSemesters = planYears * 2;
  const maxSemesters = maxYears * 2;

  let alertType: 'NONE' | 'PLAN_WARNING' | 'MAX_WARNING' = 'NONE';
  let alertMessage: string | null = null;

  if (totalSemesters === maxSemesters - 1) {
    alertType = 'MAX_WARNING';
    alertMessage = 'เหลือเวลาอีก 1 เทอม จะครบตามขยายเวลา';
  } else if (totalSemesters === planSemesters - 1) {
    alertType = 'PLAN_WARNING';
    alertMessage = 'เหลือเวลาตามแผนอีก 1 เทอม';
  }

  return {
    studentYear,
    currentSemester,
    totalSemesters,
    levelName: isDoctorate ? 'ปริญญาเอก' : 'ปริญญาโท',
    planName: student.plan ? `${student.plan} ${student.type || ''}`.trim() : 'ตามระเบียบ',
    planYears,
    planSemesters,
    maxYears,
    maxSemesters,
    alertType,
    alertMessage
  };
};

export interface ProposalEnrollmentWarningInfo {
  hasWarning: boolean;
  matchCount: number;
  threshold: number;
  matchedCourses: string[];
  levelGroup: 'MASTER' | 'DOCTOR';
  message: string;
}

const checkProposalEnrollmentWarning = (student: any): ProposalEnrollmentWarningInfo => {
  const levelStr = (student.level || '').toString();
  const planStr = (student.plan || '').toString();
  const typeStr = (student.type || '').toString();
  const rawCurriculum = (student.curriculum || '').toString();
  const combinedInfo = `${levelStr} ${planStr} ${typeStr} ${rawCurriculum}`.toLowerCase();

  const isDoctorate = levelStr.includes('เอก') || combinedInfo.includes('เอก') || combinedInfo.includes('doctor') || combinedInfo.includes('ph.d');

  const enrollments: any[] = student.enrollments || student.enrollment || student.courses || [];

  let matchCount = 0;
  const matchedCourses: string[] = [];

  if (isDoctorate) {
    // Doctoral degree: course codes ending with 996, 997, 998, 999
    // Threshold: 3 times
    const docSuffixes = ['996', '997', '998', '999'];
    for (const item of enrollments) {
      const code = (typeof item === 'string' ? item : (item.courseCode || item.code || '')).toString().trim();
      if (docSuffixes.some(s => code.endsWith(s))) {
        matchCount++;
        matchedCourses.push(code);
      }
    }
    const threshold = 3;
    const hasWarning = matchCount >= threshold;
    return {
      hasWarning,
      matchCount,
      threshold,
      matchedCourses,
      levelGroup: 'DOCTOR',
      message: 'เหลือเวลาอีก 1 ภาคการศึกษาที่จะครบข้อกำหนดการอนุมัติเค้าโครง ให้นักศึกษาดำเนินการยื่นเสนอเสนออนุมัติเค้าโครงวิทยานิพนธ์/การศึกษาอิสระ'
    };
  } else {
    // Master's degree: course codes ending with 897, 898, 899
    // Threshold: 1 time
    const masterSuffixes = ['897', '898', '899'];
    for (const item of enrollments) {
      const code = (typeof item === 'string' ? item : (item.courseCode || item.code || '')).toString().trim();
      if (masterSuffixes.some(s => code.endsWith(s))) {
        matchCount++;
        matchedCourses.push(code);
      }
    }
    const threshold = 1;
    const hasWarning = matchCount >= threshold;
    return {
      hasWarning,
      matchCount,
      threshold,
      matchedCourses,
      levelGroup: 'MASTER',
      message: 'เหลือเวลาอีก 1 ภาคการศึกษาที่จะครบข้อกำหนดการอนุมัติเค้าโครง ให้นักศึกษาดำเนินการยื่นเสนอเสนออนุมัติเค้าโครงวิทยานิพนธ์/การศึกษาอิสระ'
    };
  }
};

const StudentStatusMatrix = ({ students, title }: { students: typeof MOCK_STUDENTS, title?: string }) => {
  const [loadingStudentCode, setLoadingStudentCode] = useState<string | null>(null);
  const [modalInfo, setModalInfo] = useState<{ url: string; name: string; studentCode: string } | null>(null);
  const [durationModalStudent, setDurationModalStudent] = useState<any | null>(null);
  const [proposalWarningModalStudent, setProposalWarningModalStudent] = useState<any | null>(null);
  const [customError, setCustomError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleAccess = async (studentCode: string, name: string) => {
    setLoadingStudentCode(studentCode);
    setCustomError(null);
    try {
      const url = await getLJAccessUrl(studentCode);
      if (url) {
        setModalInfo({ url, name, studentCode });
        // Attempt to open the link directly
        const newWin = window.open(url, '_blank');
        if (!newWin || newWin.closed || typeof newWin.closed === 'undefined') {
          console.warn("Popup windows might be blocked by browser. Showing modal fallback.");
        }
      } else {
        throw new Error("No URL returned");
      }
    } catch (err: any) {
      console.error("Access link fetch failure:", err);
      setCustomError(`ขออภัย ไม่พบสิทธิ์เชื่อมโยงระบบ Journey Access หรือข้อมูลนักศึกษารหัส ${studentCode}`);
    } finally {
      setLoadingStudentCode(null);
    }
  };

  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      console.error("Copy failed", e);
    }
  };

  return (
    <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-200 overflow-hidden flex flex-col relative">
      {title && (
        <div className="px-8 py-5 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
          <h3 className="font-black text-slate-800 tracking-tight flex items-center gap-2">
            <Users size={18} className="text-kku-green" />
            {title}
          </h3>
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
            {students.length} รายการ
          </span>
        </div>
      )}
      <div className="overflow-auto max-h-[700px] relative scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent">
        <table className="w-full text-left border-separate border-spacing-0">
          <thead className="sticky top-0 z-20">
            <tr className="bg-slate-50/95 backdrop-blur-md">
              <th className="sticky left-0 z-30 bg-slate-50/95 backdrop-blur-md px-4 sm:px-8 pt-24 pb-4 whitespace-nowrap min-w-max align-bottom font-black text-slate-400 text-sm sm:text-base border-b border-r border-slate-200 uppercase tracking-[0.1em]">
                ชื่อ/รหัส นักศึกษา
              </th>
              {MILESTONES.map((m) => (
                <th key={m.id} className="p-0 relative min-w-[80px] sm:min-w-[100px] align-bottom pb-32 border-b border-slate-100 transition-colors hover:bg-slate-100/50">
                  <div className="absolute bottom-6 left-1/2 whitespace-nowrap -rotate-45 origin-bottom-left text-xs font-black text-slate-700 tracking-tight leading-tight uppercase">
                    {m.name}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {students.length === 0 ? (
              <tr>
                <td colSpan={MILESTONES.length + 1} className="py-20 text-center text-slate-400 font-bold italic">
                  ไม่พบข้อมูลนักศึกษาที่ระบุ
                </td>
              </tr>
            ) : (
              students.map((student) => {
                const isLoadingRow = loadingStudentCode === student.studentCode;
                const dInfo = calculateStudyDurationInfo(student);

                return (
                  <tr key={student.id} className="hover:bg-slate-50/80 transition-all group">
                    <td className="sticky left-0 z-10 bg-white group-hover:bg-slate-50/80 px-4 sm:px-8 py-4 border-r border-slate-100 transition-all shadow-[8px_0_15px_-10px_rgba(0,0,0,0.05)]">
                      <div className="flex flex-col gap-2">
                        {/* Interactive Clickable Name */}
                        <button 
                          onClick={() => handleAccess(student.studentCode, student.name)}
                          disabled={loadingStudentCode !== null}
                          className="font-bold text-slate-800 text-base sm:text-lg hover:text-kku-gold disabled:text-slate-400 transition-colors text-left group/name flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
                          title="ดูข้อมูลรายละเอียดใน Life Journey"
                        >
                          {student.name}
                          {isLoadingRow ? (
                            <Loader2 size={15} className="animate-spin text-kku-gold flex-shrink-0" />
                          ) : (
                            <ExternalLink size={15} className="opacity-0 group-hover/name:opacity-100 transition-opacity text-kku-gold flex-shrink-0" />
                          )}
                        </button>

                        {/* Interactive Clickable Student Code */}
                        <button
                          onClick={() => handleAccess(student.studentCode, student.name)}
                          disabled={loadingStudentCode !== null}
                          className="text-[10px] bg-slate-100 hover:bg-slate-200 hover:text-kku-gold text-slate-500 px-2 py-0.5 rounded font-mono font-bold shadow-sm w-fit whitespace-nowrap cursor-pointer transition-colors disabled:opacity-50 flex items-center gap-1"
                          title="คลิกเพื่อขอรหัสเข้าชม Life Journey"
                        >
                          {student.studentCode}
                        </button>

                        <div className="flex flex-col gap-1.5 whitespace-nowrap mt-1.5">
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-1.5 text-xs text-slate-500 font-bold">
                              <span className="text-kku-green uppercase tracking-wider opacity-85 w-16 text-[11px] sm:text-xs flex-shrink-0">GPA/Yr:</span> 
                              <span className="text-slate-800 font-black">{(student as any).gpa?.toFixed(2) || '0.00'}</span>
                              <span className="text-slate-300">/</span>
                              <button
                                type="button"
                                onClick={() => setDurationModalStudent(student)}
                                className="text-slate-700 font-black flex items-center gap-1 hover:text-kku-green transition-colors cursor-pointer group/yr"
                                title="คลิกเพื่อดูรายละเอียดระยะเวลาการศึกษา"
                              >
                                <span className="text-[11px] sm:text-xs font-bold text-slate-500 tracking-wide group-hover/yr:text-kku-green">Yr</span>
                                <span>{dInfo.studentYear}</span>
                              </button>
                            </div>

                            {/* Warning Badge if 1 semester left */}
                            {dInfo.alertType !== 'NONE' && (
                              <button
                                type="button"
                                onClick={() => setDurationModalStudent(student)}
                                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-black cursor-pointer transition-all border shadow-sm w-fit ${
                                  dInfo.alertType === 'MAX_WARNING'
                                    ? 'bg-red-50 text-red-600 border-red-200 hover:bg-red-100 hover:border-red-300'
                                    : 'bg-orange-50 text-orange-600 border-orange-200 hover:bg-orange-100 hover:border-orange-300'
                                }`}
                                title="คลิกเพื่อดูรายละเอียดระยะเวลาการศึกษาตามระเบียบ"
                              >
                                {dInfo.alertType === 'MAX_WARNING' ? (
                                  <AlertCircle size={11} className="flex-shrink-0 animate-pulse text-red-500" />
                                ) : (
                                  <AlertTriangle size={11} className="flex-shrink-0 text-orange-500" />
                                )}
                                <span>{dInfo.alertMessage}</span>
                              </button>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5 text-xs text-slate-500 font-bold">
                            <span className="text-amber-600 uppercase tracking-wider opacity-85 w-16 text-[11px] sm:text-xs flex-shrink-0">Paper:</span> 
                            <span className="text-slate-800 font-black">{(student as any).allPublication !== undefined ? (student as any).allPublication : (student.papers || 0)}</span>
                            <span className="text-[11px] sm:text-xs font-bold text-slate-500"> ชิ้น</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-xs text-slate-500 font-bold">
                            <span className="text-blue-500 uppercase tracking-wider opacity-85 w-16 text-[11px] sm:text-xs flex-shrink-0">Progress:</span> 
                            <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden w-20 flex-shrink-0">
                              <div 
                                  className="h-full bg-kku-green transition-all" 
                                  style={{ width: `${((student as any).milestoneStats?.completed / (student as any).milestoneStats?.total) * 100 || 0}%` }}
                              />
                            </div>
                            <span className="text-slate-700 font-black">{(student as any).milestoneStats?.completed}/{(student as any).milestoneStats?.total}</span>
                          </div>
                        </div>
                      </div>
                    </td>
                    {MILESTONES.map((milestone) => {
                      const m = student.milestones.find((ms) => ms.milestoneId === milestone.id);
                      const isProposal = milestone.id === 'proposal';
                      const isPendingProposal = isProposal && m?.status !== 'done';
                      const pWarning = isPendingProposal ? checkProposalEnrollmentWarning(student) : null;

                      return (
                        <td key={milestone.id} className="p-4 text-center border-r border-slate-50/50 last:border-0 relative">
                          <div className="flex flex-col items-center justify-center gap-1.5">
                            <MilestoneDot status={m?.status || 'pending'} />
                            {isPendingProposal && pWarning?.hasWarning && (
                              <button
                                type="button"
                                onClick={() => setProposalWarningModalStudent(student)}
                                className="p-1 rounded-full bg-amber-100 text-amber-700 border border-amber-300 hover:bg-amber-200 transition-all cursor-pointer shadow-sm animate-pulse flex items-center justify-center"
                                title="เตือนอนุมัติเค้าโครงวิทยานิพนธ์ (คลิกเพื่อดูรายละเอียด)"
                              >
                                <AlertTriangle size={13} className="text-amber-600 flex-shrink-0" />
                              </button>
                            )}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Access Error Modal Trigger */}
      {customError && (
        <div className="absolute bottom-4 right-4 z-50 animate-in fade-in slide-in-from-bottom-5 duration-300 bg-red-50 border border-red-200 rounded-2xl p-4 shadow-xl max-w-sm flex items-start gap-3">
          <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center text-red-600 flex-shrink-0">
            <X size={16} className="cursor-pointer" onClick={() => setCustomError(null)} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-red-800">ระบบขัดข้อง</p>
            <p className="text-[11px] text-red-600 mt-1 leading-relaxed">{customError}</p>
          </div>
          <button className="text-slate-400 hover:text-slate-600" onClick={() => setCustomError(null)}>
            <X size={14} />
          </button>
        </div>
      )}

      {/* --- TIMED ACCESS JOURNEY MODAL --- */}
      <AnimatePresence>
        {modalInfo && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            {/* Backdrop Click to close */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setModalInfo(null)}
              className="absolute inset-0"
            />

            {/* Modal Card content */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-100 z-10 flex flex-col"
            >
              <div className="p-8 pb-6 flex flex-col items-center text-center">
                {/* Visual Top Accent Indicator */}
                <div className="w-16 h-16 bg-gradient-to-tr from-kku-gold/20 to-amber-100 rounded-2xl flex items-center justify-center text-kku-gold mb-4 shadow-inner">
                  <ShieldCheck size={32} strokeWidth={2} />
                </div>

                <h3 className="text-xl font-black text-slate-800 tracking-tight">
                  เชื่อมโยงข้อมูลสู่ Life Journey
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  ระบบผ่านเข้าถึงข้อมูลนักศึกษาเพื่อการจัดการสถานะเชิงลึก
                </p>

                {/* Student Info Box */}
                <div className="w-full mt-6 bg-slate-50 border border-slate-100 rounded-2xl p-4 flex flex-col items-center gap-2">
                  <p className="text-base font-black text-slate-800">{modalInfo.name}</p>
                  <p className="text-xs font-mono font-bold bg-white text-kku-green border border-slate-200/60 px-3 py-1 rounded-full shadow-sm">
                    รหัสนักศึกษา: {modalInfo.studentCode}
                  </p>
                </div>

                {/* Important Security Rules Explanation */}
                <div className="w-full mt-6 space-y-4 text-left bg-orange-50/50 border border-orange-100/60 p-5 rounded-2xl">
                  <div className="flex gap-3">
                    <Clock size={18} className="text-orange-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-xs font-black text-orange-950">
                        ระยะเวลากุญแจความปลอดภัย (Journey Access Period)
                      </h4>
                      <p className="text-[11px] text-orange-850 mt-1 leading-relaxed">
                        ลิงก์คำขอนี้มีความปลอดภัยสูงและจะถือว่าหมดอายุภายใน <span className="font-bold underline">5 นาที</span> หากยังไม่มีการคลิกเข้าชมจริง
                      </p>
                    </div>
                  </div>

                  <div className="h-[1px] bg-orange-200/50 w-full" />

                  <div className="flex gap-3">
                    <ShieldCheck size={18} className="text-kku-green flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-xs font-black text-slate-800">
                        ขยายระยะเวลาใช้งาน (Access Key Extended)
                      </h4>
                      <p className="text-[11px] text-slate-600 mt-1 leading-relaxed">
                        เมื่อท่านเข้าสู่ระบบและยืนยันตัวผ่านลิงก์แรกสำเร็จ ระบบจะขยายอายุสิทธิ์ชมข้อมูล (Read-Only) สูงสุดเป็น <span className="font-bold text-slate-800 underline">1 ชั่วโมง</span> อัตโนมัติในคาบการซิงก์ปัจจุบัน
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons Footer */}
              <div className="p-6 bg-slate-50 border-t border-slate-100 flex flex-col gap-3">
                <button
                  onClick={() => {
                    window.open(modalInfo.url, '_blank');
                  }}
                  className="w-full bg-gradient-to-r from-kku-green to-emerald-600 hover:from-emerald-600 hover:to-kku-green text-white font-black py-3.5 px-6 rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-kku-green/20 transition-all text-sm cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
                >
                  <ExternalLink size={16} />
                  เปิดข้อมูลใน Life Journey ใหม่
                </button>

                <div className="flex gap-3">
                  <button
                    onClick={() => handleCopy(modalInfo.url)}
                    className="flex-1 border border-slate-200 hover:border-slate-350 bg-white hover:bg-slate-100 text-slate-700 font-bold py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 transition-all text-xs cursor-pointer"
                  >
                    <Copy size={14} className={copied ? "text-green-500 animate-bounce" : "text-slate-500"} />
                    {copied ? 'คัดลอกลิงก์สำเร็จแล้ว!' : 'คัดลอกลิงก์ (Copy Link)'}
                  </button>

                  <button
                    onClick={() => setModalInfo(null)}
                    className="px-4 border border-slate-200 bg-white hover:bg-slate-100 text-slate-600 font-bold py-2.5 rounded-xl transition-all text-xs cursor-pointer"
                  >
                    ปิด (Close)
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* --- STUDY DURATION DETAILS MODAL --- */}
      <AnimatePresence>
        {durationModalStudent && (() => {
          const dInfo = calculateStudyDurationInfo(durationModalStudent);
          return (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setDurationModalStudent(null)}
                className="absolute inset-0"
              />

              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 15 }}
                className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-100 z-10 flex flex-col"
              >
                <div className="p-6 pb-4 flex flex-col items-center text-center">
                  {/* Top Accent Icon */}
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-3 shadow-inner ${
                    dInfo.alertType === 'MAX_WARNING'
                      ? 'bg-red-50 text-red-600 border border-red-100'
                      : dInfo.alertType === 'PLAN_WARNING'
                      ? 'bg-orange-50 text-orange-600 border border-orange-100'
                      : 'bg-kku-green/10 text-kku-green'
                  }`}>
                    <Clock size={28} strokeWidth={2.2} />
                  </div>

                  <h3 className="text-lg font-black text-slate-800 tracking-tight">
                    รายละเอียดระยะเวลาการศึกษา
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    ข้อมูลการติดตามระยะเวลาการศึกษาตามระเบียบมหาวิทยาลัย
                  </p>

                  {/* Student Info Box */}
                  <div className="w-full mt-4 bg-slate-50 border border-slate-100 rounded-2xl p-3.5 flex flex-col items-center gap-1">
                    <p className="text-base font-black text-slate-800">{durationModalStudent.name}</p>
                    <p className="text-xs font-mono font-bold text-slate-500">
                      รหัสนักศึกษา: {durationModalStudent.studentCode}
                    </p>
                  </div>

                  {/* Current Status Box */}
                  <div className="w-full mt-4 space-y-3 text-left">
                    <div className="bg-emerald-50/60 border border-emerald-100 p-3.5 rounded-2xl flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-600">สถานะปัจจุบัน:</span>
                      <span className="text-sm font-black text-emerald-800">
                        อยู่ในปีที่ {dInfo.studentYear} เทอม {dInfo.currentSemester}
                      </span>
                    </div>

                    {/* Study Plan details */}
                    <div className="bg-slate-50 border border-slate-100 p-4 rounded-2xl space-y-2.5 text-xs">
                      <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                        <span className="font-bold text-slate-500">ระดับการศึกษา:</span>
                        <span className="font-black text-slate-800">{dInfo.levelName} ({dInfo.planName})</span>
                      </div>
                      <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                        <span className="font-bold text-slate-500">ระยะเวลาตามแผน:</span>
                        <span className="font-black text-slate-800">{dInfo.planYears} ปี ({dInfo.planSemesters} เทอม)</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-slate-500">ระยะเวลาขยายได้สูงสุด:</span>
                        <span className="font-black text-slate-800">{dInfo.maxYears} ปี ({dInfo.maxSemesters} เทอม)</span>
                      </div>
                    </div>

                    {/* Warning Alert Banner in Modal */}
                    {dInfo.alertType !== 'NONE' && (
                      <div className={`p-3.5 rounded-2xl border flex items-start gap-2.5 text-xs font-bold ${
                        dInfo.alertType === 'MAX_WARNING'
                          ? 'bg-red-50 text-red-800 border-red-200'
                          : 'bg-orange-50 text-orange-800 border-orange-200'
                      }`}>
                        {dInfo.alertType === 'MAX_WARNING' ? (
                          <AlertCircle size={18} className="text-red-500 flex-shrink-0 mt-0.5" />
                        ) : (
                          <AlertTriangle size={18} className="text-orange-500 flex-shrink-0 mt-0.5" />
                        )}
                        <div>
                          <p className="font-black">{dInfo.alertMessage}</p>
                          <p className="text-[11px] font-medium opacity-90 mt-0.5">
                            {dInfo.alertType === 'MAX_WARNING'
                              ? `ปัจจุบันอยู่ในเทอมสะสมที่ ${dInfo.totalSemesters} จากขยายเวลาสูงสุด ${dInfo.maxSemesters} เทอม`
                              : `ปัจจุบันอยู่ในเทอมสะสมที่ ${dInfo.totalSemesters} จากระยะเวลาตามแผน ${dInfo.planSemesters} เทอม`}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="p-4 bg-slate-50 border-t border-slate-100">
                  <button
                    onClick={() => setDurationModalStudent(null)}
                    className="w-full bg-slate-800 hover:bg-slate-900 text-white font-bold py-2.5 px-4 rounded-xl text-xs transition-colors cursor-pointer"
                  >
                    ปิด (Close)
                  </button>
                </div>
              </motion.div>
            </div>
          );
        })()}
      </AnimatePresence>

      {/* --- THESIS PROPOSAL WARNING MODAL --- */}
      <AnimatePresence>
        {proposalWarningModalStudent && (() => {
          const pWarning = checkProposalEnrollmentWarning(proposalWarningModalStudent);
          return (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setProposalWarningModalStudent(null)}
                className="absolute inset-0"
              />

              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 15 }}
                className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-100 z-10 flex flex-col"
              >
                <div className="p-6 pb-4 flex flex-col items-center text-center">
                  {/* Top Accent Icon */}
                  <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-3 shadow-inner bg-amber-50 text-amber-600 border border-amber-200">
                    <AlertTriangle size={28} strokeWidth={2.2} />
                  </div>

                  <h3 className="text-lg font-black text-slate-800 tracking-tight">
                    แจ้งเตือนยื่นอนุมัติเค้าโครงวิทยานิพนธ์
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    รายละเอียดคำแนะนำสำหรับการยื่นเสนอเค้าโครงฯ
                  </p>

                  {/* Student Info Box */}
                  <div className="w-full mt-4 bg-slate-50 border border-slate-100 rounded-2xl p-3.5 flex flex-col items-center gap-1">
                    <p className="text-base font-black text-slate-800">{proposalWarningModalStudent.name}</p>
                    <p className="text-xs font-mono font-bold text-slate-500">
                      รหัสนักศึกษา: {proposalWarningModalStudent.studentCode}
                    </p>
                  </div>

                  {/* Warning Message Box */}
                  <div className="w-full mt-4 p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-sm font-bold leading-relaxed text-center shadow-sm">
                    {pWarning.message}
                  </div>
                </div>

                <div className="p-4 bg-slate-50 border-t border-slate-100">
                  <button
                    onClick={() => setProposalWarningModalStudent(null)}
                    className="w-full bg-slate-800 hover:bg-slate-900 text-white font-bold py-2.5 px-4 rounded-xl text-xs transition-colors cursor-pointer"
                  >
                    ปิด (Close)
                  </button>
                </div>
              </motion.div>
            </div>
          );
        })()}
      </AnimatePresence>
    </div>
  );
};

export const STANDARD_PLANS = [
  'แผน ก แบบ ก 1',
  'แผน ก แบบ ก 2',
  'แผน ข',
  'แบบ 1.1',
  'แบบ 1.2',
  'แบบ 2.1',
  'แบบ 2.2',
];

export function isStudentInPlan(student: any, targetPlan: string): boolean {
  const p = (student.plan || '').toString().trim();
  const t = (student.type || '').toString().trim();
  const l = (student.level || '').toString().trim();
  const raw = `${p} ${t} ${l}`.toLowerCase();

  switch (targetPlan) {
    case 'แผน ก แบบ ก 1':
      if (p.includes('ก 1') || p.includes('ก1') || t === 'ก 1' || t === 'ก1') return true;
      if ((p.includes('แผน ก') || p === 'แผน ก') && (t === '1' || t === 'ก 1' || t === 'ก1' || (!t && !raw.includes('ก 2') && !raw.includes('ก2')))) {
        if (!raw.includes('1.1') && !raw.includes('1.2') && !raw.includes('2.1') && !raw.includes('2.2') && !raw.includes('ก 2') && !raw.includes('ก2')) {
          return true;
        }
      }
      return false;

    case 'แผน ก แบบ ก 2':
      if (p.includes('ก 2') || p.includes('ก2') || t === 'ก 2' || t === 'ก2') return true;
      if ((p.includes('แผน ก') || p === 'แผน ก') && (t === '2' || t === 'ก 2' || t === 'ก2')) {
        if (!raw.includes('2.1') && !raw.includes('2.2')) return true;
      }
      return false;

    case 'แผน ข':
      return p.includes('แผน ข') || p.includes('แบบ ข') || t.includes('ข') || raw.includes('แผน ข') || raw.includes('แบบ ข');

    case 'แบบ 1.1':
      return p.includes('1.1') || t.includes('1.1') || raw.includes('1.1');

    case 'แบบ 1.2':
      return p.includes('1.2') || t.includes('1.2') || raw.includes('1.2');

    case 'แบบ 2.1':
      return p.includes('2.1') || t.includes('2.1') || raw.includes('2.1');

    case 'แบบ 2.2':
      if (p.includes('2.2') || t.includes('2.2') || raw.includes('2.2')) return true;
      if ((l.includes('เอก') || raw.includes('เอก')) && (t === '2' || p.includes('แบบ 2'))) {
        if (!raw.includes('2.1') && !raw.includes('1.1') && !raw.includes('1.2')) return true;
      }
      return false;

    default:
      return false;
  }
}

const GroupByPlanBlock = ({ 
  plan, 
  students 
}: { 
  plan: string, 
  students: typeof MOCK_STUDENTS,
  key?: any 
}) => {
  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <h4 className="text-xl sm:text-2xl font-black text-slate-800 tracking-tight flex items-center gap-3">
          <div className="w-1.5 h-6 sm:h-8 bg-kku-green rounded-full" />
          <span>{plan.startsWith('แผน') || plan.startsWith('แบบ') || plan.startsWith('ไม่ระบุ') ? plan : `แผน ${plan}`}</span>
          <span className="text-xs font-bold text-slate-500 bg-slate-100 px-3 py-1 rounded-full font-mono shadow-sm">
            {students.length} คน
          </span>
        </h4>
      </div>
      
      {students.length > 0 ? (
        <StudentStatusMatrix students={students} />
      ) : (
        <div className="bg-white/50 backdrop-blur-sm border-2 border-dashed border-slate-200 rounded-[30px] py-10 text-center">
          <p className="text-slate-400 font-bold italic text-sm">ไม่มีนักศึกษาในแผนนี้</p>
        </div>
      )}
    </div>
  );
};

// --- AUTH CALLBACK COMPONENT ---
function AuthCallback() {
  const [searchParams] = useSearchParams();
  const params = useParams();
  const [processed, setProcessed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  React.useEffect(() => {
    if (processed) return;
    
    const code = searchParams.get('code');
    const token = searchParams.get('token');

    // Extract path parameters from window.location.pathname as a fallback if useParams() is empty
    const pathParts = window.location.pathname.split('/').filter(Boolean);
    const cbIndex = pathParts.indexOf('callback');
    let p1 = params.p1;
    let p2 = params.p2;
    let p3 = params.p3;
    let p4 = params.p4;

    if (cbIndex !== -1) {
      if (!p1) p1 = pathParts[cbIndex + 1];
      if (!p2) p2 = pathParts[cbIndex + 2];
      if (!p3) p3 = pathParts[cbIndex + 3];
      if (!p4) p4 = pathParts[cbIndex + 4];
    }
    
    const runCallback = async () => {
      setProcessed(true);
      try {
        const payload: any = {};
        if (p1) payload.p1 = p1;
        if (p2) payload.p2 = p2;
        if (p3) payload.p3 = p3;
        if (p4) payload.p4 = p4;
        if (code) payload.code = code;
        if (token) payload.token = token;

        if (Object.keys(payload).length === 0) {
          throw new Error("ไม่พบข้อมูลการยืนยันตัวตนใน URL (No auth params found)");
        }

        const userData = await handleSSOCallback(payload);
        localStorage.setItem('KKU_SSO_SESSION', JSON.stringify(userData));
        
        // นำทางกลับไปยังหน้าหลักของระบบเมื่อยืนยันตัวตนสำเร็จ
        window.location.href = import.meta.env.BASE_URL || '/';
      } catch (e: any) {
        console.error("AuthCallback Error:", e);
        setError(e.message || "เกิดข้อผิดพลาดในการยืนยันตัวตน");
      }
    };
    runCallback();
  }, [params, searchParams, processed]);

  if (error) {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-slate-50 p-6">
        <div className="bg-white p-8 rounded-3xl shadow-xl border border-red-100 max-w-sm text-center">
          <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <LogOut size={32} />
          </div>
          <h2 className="text-xl font-bold text-slate-800 mb-2">เข้าสู่ระบบไม่สำเร็จ</h2>
          <p className="text-slate-500 text-sm mb-6">{error}</p>
          <button 
            onClick={() => window.location.href = '/'}
            className="w-full bg-slate-800 text-white p-4 rounded-xl font-bold"
          >
            กลับสู่หน้าหลัก
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen items-center justify-center bg-slate-50 p-4">
      <div className="text-center w-full max-w-sm">
        <div className="mb-6 h-16 w-16 animate-spin rounded-full border-4 border-kku-green border-t-transparent mx-auto"></div>
        <h2 className="text-xl font-bold text-slate-800 mb-2 font-sans">ยืนยันตัวตนสำเร็จ!</h2>
        <p className="text-slate-500 font-medium">กำลังเชื่อมต่อข้อมูลโปรไฟล์กับระบบ GS KKU Journey...</p>
        <p className="text-slate-400 text-xs mt-4 uppercase tracking-widest font-bold">KHON KAEN UNIVERSITY</p>
      </div>
    </div>
  );
}

// --- MAIN CONTENT APP ---
function MainApp({ user: parentUser, setUser: setParentUser }: { user: User | null, setUser: (u: User | null) => void }) {
  const user = parentUser;
  const setUser = setParentUser;
  
  const availableRoles = useMemo(() => {
    if (!user) return [];
    const roles: DashboardType[] = [];
    if (user.role === 'STAFF' || user.secondaryRoles?.includes('STAFF')) roles.push('STAFF');
    if (user.role === 'ADVISOR' || user.secondaryRoles?.includes('ADVISOR')) roles.push('ADVISOR');
    if (user.role === 'PROGRAM_CHAIR' || user.secondaryRoles?.includes('PROGRAM_CHAIR')) roles.push('PROGRAM');
    return roles;
  }, [user]);

  const [view, setView] = useState<ViewState>('LOGIN');
  const [dashboardType, setDashboardType] = useState<DashboardType | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'program_chair_setting'>('dashboard');

  React.useEffect(() => {
    if (user) {
      if (dashboardType) {
        setView('DASHBOARD');
      } else {
        setView('ROLE_SELECTION');
      }
    } else {
      setView('LOGIN');
    }
  }, [user, dashboardType]);

  React.useEffect(() => {
    setActiveTab('dashboard');
  }, [dashboardType]);
  
  const isMockUser = useMemo(() => {
    return user?.email === 'staff@kku.ac.th' || user?.email === 'professor@kku.ac.th';
  }, [user]);

  const mappedMockStudents = useMemo(() => {
    return MOCK_STUDENTS.map((s, i) => {
      const isDoc = s.plan.includes('ป.เอก');
      const levelVal = isDoc ? 'ปริญญาเอก' : 'ปริญญาโท';
      const planVal = s.plan.includes('แบบ ข') ? 'แผน ข' : 'แผน ก';
      let typeVal = 'ก 2';
      if (s.plan.includes('1.1')) typeVal = '1.1';
      else if (s.plan.includes('1.2')) typeVal = '1.2';
      else if (s.plan.includes('ก 1')) typeVal = 'ก 1';
      else if (s.plan.includes('2')) typeVal = '2';
      
      return {
        ...s,
        level: levelVal,
        plan: planVal,
        type: typeVal,
      };
    });
  }, []);

  const [selectedLevel, setSelectedLevel] = useState<string>('ทั้งหมด');
  const [selectedCurriculum, setSelectedCurriculum] = useState<string>('ทั้งหมด');
  const [selectedPlan, setSelectedPlan] = useState<string>('ทั้งหมด');
  const [selectedType, setSelectedType] = useState<string>('ทั้งหมด');
  const [selectedSystem, setSelectedSystem] = useState<string>('ทั้งหมด');
  const [searchTerm, setSearchTerm] = useState('');
  const [allStudents, setAllStudents] = useState<any[]>([]);
  const [isDataLoading, setIsDataLoading] = useState(false);
  const [debugData, setDebugData] = useState<any>(null);
  const [showDebug, setShowDebug] = useState(false);

  // Derive dynamic options for cascading dropdowns
  const availableLevels = useMemo(() => {
    const currentStudents = (allStudents.length > 0 || !isMockUser) ? allStudents : mappedMockStudents;
    const unique = Array.from(new Set(currentStudents.map(s => s.level || 'ไม่ระบุระดับการศึกษา').filter(Boolean)));
    return ['ทั้งหมด', ...unique.sort()];
  }, [allStudents, mappedMockStudents, isMockUser]);

  const availableCurriculums = useMemo(() => {
    const currentStudents = (allStudents.length > 0 || !isMockUser) ? allStudents : mappedMockStudents;
    const levelFiltered = selectedLevel && selectedLevel !== 'ทั้งหมด' 
      ? currentStudents.filter(s => (s.level || 'ไม่ระบุระดับการศึกษา') === selectedLevel) 
      : currentStudents;
    const unique = Array.from(new Set(levelFiltered.map(s => s.curriculum).filter(Boolean)));
    return ['ทั้งหมด', ...unique.sort()];
  }, [allStudents, mappedMockStudents, selectedLevel, isMockUser]);

  const availablePlans = useMemo(() => {
    const currentStudents = (allStudents.length > 0 || !isMockUser) ? allStudents : mappedMockStudents;
    let filtered = currentStudents;
    if (selectedLevel && selectedLevel !== 'ทั้งหมด') {
      filtered = filtered.filter(s => (s.level || 'ไม่ระบุระดับการศึกษา') === selectedLevel);
    }
    if (selectedCurriculum && selectedCurriculum !== 'ทั้งหมด') {
      filtered = filtered.filter(s => s.curriculum === selectedCurriculum);
    }
    const unique = Array.from(new Set(filtered.map(s => s.plan).filter(Boolean)));
    return ['ทั้งหมด', ...unique.sort()];
  }, [allStudents, mappedMockStudents, selectedLevel, selectedCurriculum, isMockUser]);

  const availableTypes = useMemo(() => {
    const currentStudents = (allStudents.length > 0 || !isMockUser) ? allStudents : mappedMockStudents;
    let filtered = currentStudents;
    if (selectedLevel && selectedLevel !== 'ทั้งหมด') {
      filtered = filtered.filter(s => (s.level || 'ไม่ระบุระดับการศึกษา') === selectedLevel);
    }
    if (selectedCurriculum && selectedCurriculum !== 'ทั้งหมด') {
      filtered = filtered.filter(s => s.curriculum === selectedCurriculum);
    }
    if (selectedPlan && selectedPlan !== 'ทั้งหมด') {
      filtered = filtered.filter(s => s.plan === selectedPlan);
    }
    const unique = Array.from(new Set(filtered.map(s => s.type || 'ไม่ระบุแบบ').filter(Boolean)));
    return ['ทั้งหมด', ...unique.sort()];
  }, [allStudents, mappedMockStudents, selectedLevel, selectedCurriculum, selectedPlan, isMockUser]);

  const availableSystems = useMemo(() => {
    const currentStudents = (allStudents.length > 0 || !isMockUser) ? allStudents : mappedMockStudents;
    let filtered = currentStudents;
    if (selectedLevel && selectedLevel !== 'ทั้งหมด') {
      filtered = filtered.filter(s => (s.level || 'ไม่ระบุระดับการศึกษา') === selectedLevel);
    }
    if (selectedCurriculum && selectedCurriculum !== 'ทั้งหมด') {
      filtered = filtered.filter(s => s.curriculum === selectedCurriculum);
    }
    if (selectedPlan && selectedPlan !== 'ทั้งหมด') {
      filtered = filtered.filter(s => s.plan === selectedPlan);
    }
    if (selectedType && selectedType !== 'ทั้งหมด') {
      filtered = filtered.filter(s => (s.type || 'ไม่ระบุแบบ') === selectedType);
    }
    const unique = Array.from(new Set(filtered.map(s => s.system || 'ไม่ระบุระบบ').filter(Boolean)));
    return ['ทั้งหมด', ...unique.sort()];
  }, [allStudents, mappedMockStudents, selectedLevel, selectedCurriculum, selectedPlan, selectedType, isMockUser]);

  // Sync selections cascadingly if options change
  React.useEffect(() => {
    if (availableLevels.length > 0 && !availableLevels.includes(selectedLevel)) {
      setSelectedLevel('ทั้งหมด');
    }
  }, [availableLevels, selectedLevel]);

  React.useEffect(() => {
    if (availableCurriculums.length > 0 && !availableCurriculums.includes(selectedCurriculum)) {
      setSelectedCurriculum('ทั้งหมด');
    }
  }, [availableCurriculums, selectedCurriculum]);

  React.useEffect(() => {
    if (availablePlans.length > 0 && !availablePlans.includes(selectedPlan)) {
      setSelectedPlan('ทั้งหมด');
    }
  }, [availablePlans, selectedPlan]);

  React.useEffect(() => {
    if (availableTypes.length > 0 && !availableTypes.includes(selectedType)) {
      setSelectedType('ทั้งหมด');
    }
  }, [availableTypes, selectedType]);

  React.useEffect(() => {
    if (availableSystems.length > 0 && !availableSystems.includes(selectedSystem)) {
      setSelectedSystem('ทั้งหมด');
    }
  }, [availableSystems, selectedSystem]);

  React.useEffect(() => {
    if (view === 'DASHBOARD' && dashboardType) {
      setIsDataLoading(true);
      fetchLJStudents(user?.email, dashboardType, user?.faculty)
        .then(res => {
          console.log("DEBUG: Raw API Response from Life Journey:", res);
          setDebugData(res);
          
          if (res && res._error) {
            console.error("LJ API Error returned:", res);
            setAllStudents(isMockUser ? mappedMockStudents : []);
            return;
          }

          // Handle nested structure: data.items, items, or direct array
          let rawData: any[] = [];
          if (Array.isArray(res)) {
            rawData = res;
          } else if (res.data && Array.isArray(res.data.items)) {
            rawData = res.data.items;
          } else if (res.data && Array.isArray(res.data)) {
            rawData = res.data;
          } else if (res.items && Array.isArray(res.items)) {
            rawData = res.items;
          }
          
          if (rawData.length === 0 && !Array.isArray(res)) {
             console.warn("LJ Data Format: could not find student array in expected fields", res);
          }

          if (rawData.length === 0) {
            console.log("LJ API: Success but returned EMPTY list (or mapping failed)");
          }

          // We need to map them to our internal Student structure
          const mapped = rawData.map((s: any) => {
            const p = s.profile || {};
            const firstName = p.firstNameTH || p.firstNameEN || "";
            const lastName = p.lastNameTH || p.lastNameEN || "";
            let fullName = firstName || lastName ? `${firstName} ${lastName}`.trim() : (s.name || s.fullname || "");
            
            // Fallback to student code if name is empty
            if (!fullName || fullName === "") {
                fullName = s.studentCode ? `รหัส: ${s.studentCode}` : 'Unknown Student';
            }
            
            // 1. Level - ชื่อระดับปริญญา
            const educationLevel = p.level?.nameTH || s.level?.nameTH || p.levelName || s.levelName || 'ไม่ระบุระดับการศึกษา';

            // 2. Program - ชื่อหลักสูตร (แต่ไม่เอาแผน ไม่เอาแบบ)
            let rawCurriculum = p.program?.nameTH || s.program?.nameTH || p.program_name || s.program_name || s.curriculum || '';
            let curriculumName = '';
            
            if (rawCurriculum) {
              if (rawCurriculum === 'ปริญญาโท' || rawCurriculum === 'ปริญญาเอก' || rawCurriculum === educationLevel) {
                curriculumName = 'ไม่ระบุหลักสูตร';
              } else {
                curriculumName = rawCurriculum.split('แผน')[0].split('แบบ')[0].trim();
              }
            } else {
              curriculumName = 'ไม่ระบุหลักสูตร';
            }

            // 3. Plan - แผน เช่น แผน ก แผน ข
            let planName = s.programNamePlan || p.programNamePlan || s.plan || s.planName || '';
            planName = planName.trim();
            if (!planName) {
              if (rawCurriculum && rawCurriculum.includes('แผน')) {
                planName = rawCurriculum.substring(rawCurriculum.indexOf('แผน')).trim().split('แบบ')[0].trim();
              }
            }
            if (planName && planName.includes('แบบ')) {
              planName = planName.split('แบบ')[0].trim();
            }
            if (!planName) planName = 'ไม่ระบุแผน';

            // 4. Type - แบบ เช่น ก1
            let typeName = s.programNameType || p.programNameType || s.type || s.typeName || '';
            typeName = typeName.trim();
            if (!typeName) {
              if (rawCurriculum && rawCurriculum.includes('แบบ')) {
                typeName = rawCurriculum.substring(rawCurriculum.indexOf('แบบ')).trim();
              }
            }
            if (typeName && typeName.startsWith('แบบ')) {
              typeName = typeName.replace('แบบ', '').trim();
            }
            if (!typeName) typeName = 'ไม่ระบุแบบ';

            // 5. System - ระบบ เช่น นานาชาติ
            let systemName = s.programNameSystem || p.programNameSystem || s.system || s.systemName || '';
            systemName = systemName.trim();

            // 6. Faculty name and ID from API
            const studentFaculty = s.faculty || p.faculty || null;
            const studentFacultyName = studentFaculty?.nameTH || p.faculty_name || s.faculty_name || 'ไม่ระบุคณะ';
            const studentFacultyId = studentFaculty?.id || p.faculty_id || s.faculty_id || '';

            // Milestones list is inside s.milestones.data based on API Inspector
            const milestoneData = s.milestones || {};
            const rawMilestoneList = Array.isArray(milestoneData.data) ? milestoneData.data : (s.progress || []);

            // Extract advisor name(s) from 'advisors' array or 'profile.advisors'
            let resolvedAdvisor = 'No Advisor';
            let advisorsArray: any[] = [];
            if (Array.isArray(s.advisors)) {
              advisorsArray = s.advisors;
            } else if (p && Array.isArray(p.advisors)) {
              advisorsArray = p.advisors;
            }
            
            if (advisorsArray.length > 0) {
              const names = advisorsArray.map((adv: any) => {
                if (typeof adv === 'string') return adv;
                return adv?.nameTH || adv?.name || adv?.nameEN || adv?.officerName || '';
              }).filter(Boolean);
              if (names.length > 0) {
                resolvedAdvisor = names.join(', ');
              }
            } else {
              resolvedAdvisor = s.advisorName || s.advisor || 'No Advisor';
            }

            // Map each of the 9 standard MILESTONES to align perfectly with the columns
            const mappedMilestones = MILESTONES.map((mDef) => {
              // Find matching milestone in rawMilestoneList
              const found = rawMilestoneList.find((m: any) => {
                const apiId = m.id ? Number(m.id) : null;
                const title = (m.titleTH || m.titleEN || m.name || "").toLowerCase();
                
                if (mDef.id === 'advisor_gen') {
                  return apiId === 1 || title.includes("ที่ปรึกษาทั่วไป") || title.includes("advisor_gen") || title.includes("general advisor");
                }
                if (mDef.id === 'advisor_thesis') {
                  return apiId === 2 || title.includes("ที่ปรึกษาวิทยานิพนธ์") || title.includes("ที่ปรึกษาร่วม") || title.includes("thesis advisor");
                }
                if (mDef.id === 'english') {
                  return apiId === 3 || title.includes("ภาษาอังกฤษ") || title.includes("english") || title.includes("proficiency");
                }
                if (mDef.id === 'qe') {
                  return apiId === 4 || title.includes("คุณสมบัติ") || title.includes("qe") || title.includes("ce") || title.includes("qualifying");
                }
                if (mDef.id === 'proposal') {
                  return apiId === 6 || title.includes("เค้าโครง") || title.includes("proposal") || title.includes("โครงร่าง");
                }
                if (mDef.id === 'publication') {
                  return apiId === 9 || title.includes("เผยแพร่") || title.includes("publication") || title.includes("ตีพิมพ์");
                }
                if (mDef.id === 'defense') {
                  return apiId === 10 || title.includes("สอบวิทยานิพนธ์") || title.includes("defense") || title.includes("สอบการศึกษาอิสระ");
                }
                if (mDef.id === 'submission') {
                  return apiId === 11 || title.includes("ส่งเล่ม") || title.includes("submission");
                }
                if (mDef.id === 'graduation') {
                  return apiId === 12 || title.includes("สำเร็จการศึกษา") || title.includes("graduation") || title.includes("จบ");
                }
                return false;
              });

              // Status mapping: "COMPLETED" is green ('done') and others (or missing) are orange ('pending')
              let statusVal: 'done' | 'pending' = 'pending';
              let dateVal: string | undefined = undefined;

              let isSpecialCompleted = false;
              if (advisorsArray.length > 0) {
                if (mDef.id === 'advisor_gen') {
                  isSpecialCompleted = advisorsArray.some((adv: any) => {
                    const type = String(adv?.associationType || adv?.type || '').toLowerCase();
                    const name = String(adv?.nameTH || adv?.name || '').toLowerCase();
                    return type.includes('ทั่วไป') || type.includes('general') || type.includes('gen') || name.includes('ทั่วไป') || name.includes('general') || advisorsArray.length === 1;
                  });
                } else if (mDef.id === 'advisor_thesis') {
                  isSpecialCompleted = advisorsArray.some((adv: any) => {
                    const type = String(adv?.associationType || adv?.type || '').toLowerCase();
                    const name = String(adv?.nameTH || adv?.name || '').toLowerCase();
                    return type.includes('วิทยานิพนธ์') || type.includes('ร่วม') || type.includes('thesis') || type.includes('co-advisor') || name.includes('วิทยานิพนธ์') || name.includes('thesis') || (advisorsArray.length > 1 && !type.includes('ทั่วไป'));
                  });
                }
              }

              if (found) {
                const isCompleted = found.status === 'COMPLETED' || found.status === 'DONE' || found.status === 'done' || found.isCompleted;
                statusVal = (isCompleted || isSpecialCompleted) ? 'done' : 'pending';
                dateVal = found.completedAt || found.date || found.updatedAt;
              } else if (isSpecialCompleted) {
                statusVal = 'done';
              }

              return {
                milestoneId: mDef.id,
                status: statusVal,
                date: dateVal
              };
            });

            return {
              id: s.id || s.studentCode || Math.random().toString(36),
              studentCode: s.studentCode || s.code || 'N/A',
              name: fullName,
              curriculum: curriculumName,
              plan: planName,
              level: educationLevel,
              type: typeName,
              system: systemName,
              facultyName: studentFacultyName,
              facultyId: studentFacultyId,
              advisor: resolvedAdvisor,
              scholarship: s.scholarship || 'N/A',
              papers: s.allPublication !== undefined ? s.allPublication : (s.papersCount || s.totalPapers || 0),
              allPublication: s.allPublication !== undefined ? s.allPublication : (s.papersCount || s.totalPapers || 0),
              yearsOfStudy: s.studentYear !== undefined ? s.studentYear : (p.studentYear !== undefined ? p.studentYear : (s.years || s.yearsOfStudy || 0)),
              studentYear: s.studentYear !== undefined ? s.studentYear : (p.studentYear !== undefined ? p.studentYear : (s.years || s.yearsOfStudy || 0)),
              currentSemester: s.currentSemester ?? p.currentSemester ?? s.semester ?? p.semester ?? 1,
              admitSemester: s.admitSemester ?? p.admitSemester ?? s.admit_semester ?? p.admit_semester ?? 1,
              monthsOfStudy: s.months || s.monthsOfStudy || 0,
              gpa: s.gpa !== undefined ? s.gpa : (p.gpa !== undefined ? p.gpa : 0),
              enrollments: s.enrollments || p.enrollments || s.courses || [],
              studentStatusId: String(p.studentStatus?.id || s.studentStatus?.id || ''),
              studentStatusName: p.studentStatus?.nameTH || s.studentStatus?.nameTH || p.studentStatusName || s.studentStatusName || '',
              milestoneStats: {
                total: MILESTONES.length,
                completed: mappedMilestones.filter(m => m.status === 'done').length
              },
              milestones: mappedMilestones
            };
          });
          setAllStudents(mapped);
        })
        .catch(err => {
          console.error("LJ Fetch Fatal Error:", err);
          setDebugData({ 
            _error: true, 
            message: err.message, 
            info: "การเชื่อมต่อล้มเหลว (Network Error) กรุณาตรวจสอบ Console Log ของ Server",
            hint: "หากรันบนเครื่องตัวเอง (Local) กรุณาตรวจสอบว่ามีไฟล์ .env และตั้งค่า LJ_CLIENT_ID ครบถ้วน"
          });
          setAllStudents(isMockUser ? mappedMockStudents : []);
        })
        .finally(() => setIsDataLoading(false));
    }
  }, [view, dashboardType, user, mappedMockStudents, isMockUser]);
  
  const handleLogin = (u: User) => {
    setUser(u);
  };

  const activeAdvisor = useMemo(() => {
    if (!user) return MOCK_ADVISORS[0];
    if (user.role === 'ADVISOR' || user.secondaryRoles?.includes('ADVISOR')) {
      return user.name;
    }
    return MOCK_ADVISORS[0];
  }, [user]);

  const filteredStudents = useMemo(() => {
    if (!dashboardType) return [];
    
    // ใช้ข้อมูลจาก API ถ้ามี ถ้าไม่มีใช้ Mock (จะถูก set ใน useEffect) เฉพาะเมื่อเป็นบัญชี Mock
    let students = (allStudents.length > 0 || !isMockUser) ? allStudents : mappedMockStudents;
    
    // 1. กรองตามบทบาท (Role Base Filter)
    if (dashboardType === 'ADVISOR') {
      // หน้าอาจารย์: ดูเฉพาะนักศึกษาของตัวเอง (ทุกหลักสูตร ทุกแผน) โดยตัดคำนำหน้าออกเพื่อให้จับคู่กันได้สมบูรณ์และถูกต้อง
      students = students.filter(s => {
        if (!s.advisor || s.advisor === 'No Advisor') return false;
        const cleanedAdvisor = s.advisor.replace(/^(ศ\.ดร\.|รศ\.ดร\.|ผศ\.ดร\.|อ\.ดร\.|ศ\.|รศ\.|ผศ\.|อ\.|ดร\.|นาย|นางสาว|นาง|คุณ)\s*/g, '').trim();
        const cleanedActive = activeAdvisor.replace(/^(ศ\.ดร\.|รศ\.ดร\.|ผศ\.ดร\.|อ\.ดร\.|ศ\.|รศ\.|ผศ\.|อ\.|ดร\.|นาย|นางสาว|นาง|คุณ)\s*/g, '').trim();
        return cleanedAdvisor.includes(cleanedActive) || cleanedActive.includes(cleanedAdvisor);
      });
    } else {
      // หน้าเจ้าหน้าที่/ประธาน: กรองตามคณะของผู้ใช้งาน
      if (user?.faculty) {
        students = students.filter(s => {
          if (!s.facultyName || s.facultyName === 'ไม่ระบุคณะ') return true;
          const targetFaculty = user.faculty;
          const cleanTargetFaculty = targetFaculty.replace('คณะ', '').trim();
          const cleanStudentFaculty = s.facultyName.replace('คณะ', '').trim();
          return cleanStudentFaculty.includes(cleanTargetFaculty) || cleanTargetFaculty.includes(cleanStudentFaculty);
        });
      }
      // กรองตาม ระดับการศึกษา, หลักสูตร, แผน, แบบ และ ระบบ ที่เลือก
      if (selectedLevel && selectedLevel !== 'ทั้งหมด') {
        students = students.filter(s => (s.level || 'ไม่ระบุระดับการศึกษา') === selectedLevel);
      }
      if (selectedCurriculum && selectedCurriculum !== 'ทั้งหมด') {
        students = students.filter(s => s.curriculum === selectedCurriculum);
      }
      if (selectedPlan && selectedPlan !== 'ทั้งหมด') {
        students = students.filter(s => s.plan === selectedPlan);
      }
      if (selectedType && selectedType !== 'ทั้งหมด') {
        students = students.filter(s => (s.type || 'ไม่ระบุแบบ') === selectedType);
      }
      if (selectedSystem && selectedSystem !== 'ทั้งหมด') {
        students = students.filter(s => (s.system || 'ไม่ระบุระบบ') === selectedSystem);
      }
    }

    // 2. ค้นหาแบบ Real-time (ชื่อ หรือ รหัส)
    if (searchTerm) {
      const lower = searchTerm.toLowerCase();
      students = students.filter(s => 
        s.name.toLowerCase().includes(lower) || 
        s.studentCode.includes(searchTerm)
      );
    }

    return students;
  }, [dashboardType, user, allStudents, mappedMockStudents, selectedLevel, selectedCurriculum, selectedPlan, selectedType, selectedSystem, activeAdvisor, searchTerm, isMockUser]);

  if (view === 'LOGIN') return <LoginView onLogin={handleLogin} />;
  
  if (view === 'ROLE_SELECTION' && user) {
    return (
      <RoleSelectionView 
        user={user} 
        onSelect={(type) => {
          setDashboardType(type);
          setView('DASHBOARD');
        }} 
      />
    );
  }

  if (view === 'DASHBOARD' && user && dashboardType) {
    return (
      <div className="flex min-h-screen bg-slate-50 font-sans overflow-x-hidden">
        <Sidebar 
          activeDashboard={dashboardType} 
          user={user} 
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          onSwitchRole={() => {
            setDashboardType(null);
            setView('ROLE_SELECTION');
            setIsSidebarOpen(false);
          }}
          onLogout={() => {
            localStorage.removeItem('KKU_SSO_SESSION');
            setView('LOGIN');
            setUser(null);
            setDashboardType(null);
            setIsSidebarOpen(false);
          }} 
        />
        
        <main className="flex-1 min-w-0 flex flex-col relative w-full">
          {isDataLoading && (
            <div className="absolute inset-0 z-50 bg-white/70 backdrop-blur-[2px] flex items-center justify-center">
              <div className="flex flex-col items-center gap-4">
                <div className="w-12 h-12 border-4 border-kku-green border-t-transparent rounded-full animate-spin"></div>
                <p className="text-sm font-black text-slate-800 animate-pulse uppercase tracking-widest">กำลังดึงข้อมูลจาก Life Journey...</p>
              </div>
            </div>
          )}
          <header className="bg-white border-b border-slate-200 px-4 sm:px-8 py-4 flex items-center justify-between sticky top-0 z-30 shadow-sm">
            <div className="flex items-center gap-4">
              <button 
                onClick={() => setIsSidebarOpen(true)}
                className="lg:hidden p-2 text-slate-500 hover:bg-slate-100 rounded-xl"
              >
                <Menu size={24} />
              </button>
              <h2 className="font-black text-lg sm:text-xl text-slate-800 tracking-tight leading-tight">
                {dashboardType === 'STAFF' ? 'รายงานตรวจติดตาม' : 
                 dashboardType === 'PROGRAM' ? 'รายงานสถิติหลักสูตร' : 
                 'มอนิเตอร์นักศึกษา'}
              </h2>
            </div>
            <div className="flex items-center gap-3 sm:gap-6">
              <div className="flex items-center gap-3">
                <div className="text-right hidden sm:block">
                  <p className="text-sm font-black text-slate-800 leading-none mb-1.5 font-sans">
                    {getUserDisplayName(user)}
                  </p>
                  <p className="text-[10px] text-kku-gold-darker tracking-wide font-black">
                    {dashboardType === 'PROGRAM' ? 'ประธานหลักสูตร' :
                     dashboardType === 'STAFF' ? 'เจ้าหน้าที่คณะ' :
                     'อาจารย์ที่ปรึกษา'}
                  </p>
                </div>
                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-slate-200 rounded-xl sm:rounded-2xl border-2 border-white shadow-md overflow-hidden flex-shrink-0">
                  <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user.email}`} alt="Avatar" />
                </div>
              </div>
            </div>
          </header>

          <div className="flex-1 p-4 sm:p-8 max-w-7xl mx-auto w-full">
            {activeTab === 'program_chair_setting' ? (
              <ProgramChairSettingsView user={user} isMockUser={isMockUser} />
            ) : (
              <div className="space-y-8 sm:space-y-16">
                {dashboardType === 'ADVISOR' ? (
                  <>
                  {/* Advisor Profile Header */}
                  <div className="bg-white p-6 sm:p-10 rounded-[30px] sm:rounded-[50px] border border-slate-100 shadow-xl shadow-slate-200/30 text-center relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-1 sm:w-2 h-full bg-kku-gold" />
                    <div className="space-y-4 max-w-2xl mx-auto">
                      <div className="inline-flex items-center gap-2 px-3 py-1 bg-kku-gold/10 text-kku-gold rounded-full text-[10px] font-black tracking-widest uppercase border border-kku-gold/20 mb-2">
                        Official Academic Advisor
                      </div>
                      <h3 className="text-2xl sm:text-4xl font-black text-slate-800 tracking-tight leading-tight font-sans">
                        {getUserDisplayName(user)}
                      </h3>
                      <p className="text-slate-400 font-bold italic tracking-wide text-sm sm:text-lg">
                        อาจารย์ประจำคณะ{user.faculty}
                      </p>
                      <div className="flex justify-center gap-6 sm:gap-12 pt-4 sm:pt-6">
                        <div className="text-center">
                          <p className="text-3xl sm:text-5xl font-black text-kku-green tabular-nums">{filteredStudents.length}</p>
                          <p className="text-[10px] sm:text-[12px] font-black text-slate-400 uppercase tracking-widest mt-2 px-2">นศ. ในที่ปรึกษา</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-2 flex items-center gap-2">
                      <LayoutDashboard size={14} className="text-slate-300" />
                      Advisor Dashboard Summary
                    </p>
                    <DashboardStats students={filteredStudents} />
                  </div>

                  <div className="bg-white p-4 sm:p-6 rounded-3xl border border-slate-100 shadow-lg shadow-slate-200/20 flex flex-col md:flex-row items-center justify-between gap-4 sm:gap-6">
                    <div className="flex items-center gap-3 bg-slate-50 px-4 sm:px-6 py-3 rounded-2xl border border-slate-100 w-full max-w-xl shadow-inner transition-all focus-within:bg-white focus-within:border-kku-green focus-within:ring-4 focus-within:ring-kku-green/5">
                      <Search size={18} className="text-slate-400 flex-shrink-0" />
                      <input 
                        type="text" 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="สืบค้น ชื่อ หรือ รหัส..." 
                        className="w-full bg-transparent border-none py-1 text-sm font-bold text-slate-700 placeholder:text-slate-300 focus:ring-0"
                      />
                      {searchTerm && (
                        <button 
                          onClick={() => setSearchTerm('')}
                          className="p-1 hover:bg-slate-200 rounded-full text-slate-400"
                        >
                          <X size={14} />
                        </button>
                      )}
                    </div>
                    <div className="text-center md:text-right w-full md:w-auto">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">แสดงผล</p>
                      <p className="text-xl sm:text-2xl font-black text-slate-800 tabular-nums">
                        {filteredStudents.length} <span className="text-sm font-bold text-slate-300">คน</span>
                      </p>
                    </div>
                  </div>

                  <div className="space-y-12 pb-20">
                    {STANDARD_PLANS.map(plan => {
                      const planStudents = filteredStudents.filter(s => isStudentInPlan(s, plan));
                      return (
                        <GroupByPlanBlock 
                          key={plan} 
                          plan={plan} 
                          students={planStudents} 
                        />
                      );
                    })}
                    {(() => {
                      const unmatched = filteredStudents.filter(s => !STANDARD_PLANS.some(plan => isStudentInPlan(s, plan)));
                      if (unmatched.length === 0) return null;
                      return (
                        <GroupByPlanBlock 
                          key="ไม่ระบุแผน" 
                          plan="ไม่ระบุแผน / อื่น ๆ" 
                          students={unmatched} 
                        />
                      );
                    })()}
                  </div>
                </>
              ) : (
                <>
                  <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                    <div className="space-y-6">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-kku-green">
                          <Activity size={16} />
                          <span className="text-[10px] font-black uppercase tracking-[0.3em]">Overview Report</span>
                        </div>
                        <h3 className="text-2xl sm:text-4xl font-black text-slate-800 tracking-tight">
                          {dashboardType === 'STAFF' ? 'รายงานตรวจติดตาม' : 'รายงานสถิติตามหลักสูตร'}
                        </h3>
                      </div>
                      <div className="flex flex-wrap gap-3 items-center">
                        <FilterDropdown 
                          label="ระดับการศึกษา" 
                          value={selectedLevel} 
                          options={availableLevels} 
                          onChange={setSelectedLevel} 
                        />
                        <FilterDropdown 
                          label="หลักสูตร" 
                          value={selectedCurriculum} 
                          options={availableCurriculums} 
                          onChange={setSelectedCurriculum} 
                        />
                        <FilterDropdown 
                          label="แผน" 
                          value={selectedPlan} 
                          options={availablePlans} 
                          onChange={setSelectedPlan} 
                        />
                        <FilterDropdown 
                          label="แบบ" 
                          value={selectedType} 
                          options={availableTypes} 
                          onChange={setSelectedType} 
                        />
                        <FilterDropdown 
                          label="ระบบ" 
                          value={selectedSystem} 
                          options={availableSystems} 
                          onChange={setSelectedSystem} 
                        />
                      </div>
                    </div>
                    <div className="bg-white px-6 sm:px-10 py-4 sm:py-6 rounded-[30px] sm:rounded-[40px] border border-slate-200 shadow-xl shadow-slate-200/40 text-center min-w-[180px] sm:min-w-[220px] border-b-8 border-b-kku-green">
                      <p className="text-xs sm:text-sm font-black text-slate-400 uppercase tracking-[0.2em] mb-2 font-mono">
                        TOTAL_STUDENTS
                      </p>
                      <p className="text-3xl sm:text-5xl font-black text-slate-800 tabular-nums">
                        {filteredStudents.length} 
                        <span className="text-base sm:text-xl font-bold text-slate-300 ml-2">คน</span>
                      </p>
                    </div>
                  </header>

                  <div className="space-y-8">
                    <DashboardStats students={filteredStudents} />

                    <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-lg shadow-slate-200/20 flex flex-col md:flex-row items-center justify-between gap-6">
                      <div className="flex items-center gap-3 bg-slate-50 px-6 py-3 rounded-2xl border border-slate-100 w-full max-w-xl shadow-inner transition-all focus-within:bg-white focus-within:border-kku-green focus-within:ring-4 focus-within:ring-kku-green/5">
                        <Search size={18} className="text-slate-400" />
                        <input 
                          type="text" 
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          placeholder="สืบค้น ชื่อ หรือ รหัส..." 
                          className="w-full bg-transparent border-none py-1 text-sm font-bold text-slate-700 placeholder:text-slate-300 focus:ring-0"
                        />
                        {searchTerm && (
                          <button 
                            onClick={() => setSearchTerm('')}
                            className="p-1 hover:bg-slate-200 rounded-full text-slate-400"
                          >
                            <X size={14} />
                          </button>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">ผลการค้นหา</p>
                        <p className="text-2xl font-black text-slate-800 tabular-nums">
                          {filteredStudents.length} <span className="text-sm font-bold text-slate-300">คน</span>
                        </p>
                      </div>
                    </div>

                    <div className="space-y-6">
                      <div className="flex items-center justify-between">
                        <h4 className="font-black text-slate-800 flex items-center gap-3 text-xl sm:text-2xl tracking-tight">
                          <div className="w-1.5 h-6 sm:h-8 bg-kku-green rounded-full" />
                          รายการความก้าวหน้า {selectedPlan !== 'ทั้งหมด' ? `(${selectedPlan})` : ''}
                        </h4>
                      </div>
                      <StudentStatusMatrix students={filteredStudents} />
                      
                      {filteredStudents.length === 0 && (
                        <div className="bg-white/50 backdrop-blur-sm border-2 border-dashed border-slate-200 rounded-[40px] p-20 text-center">
                          <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
                            <Search size={24} className="text-slate-300" />
                          </div>
                          <h4 className="text-xl font-black text-slate-800 mb-2">ไม่พบข้อมูลนักศึกษา</h4>
                          <p className="text-slate-500 font-bold italic">ลองเปลี่ยนแผนการศึกษา หรือ ค้นหาด้วยชื่ออื่น</p>
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}


              </div>
            )}
          </div>
        </main>


      </div>
    );
  }
  return null;
}

// --- ROOT APP ---
function App() {
  const [user, setUser] = useState<User | null>(null);
  const [initialized, setInitialized] = useState(false);

  React.useEffect(() => {
    // 1. ตรวจสอบว่ามีข้อมูล session ส่งมาทาง URL query string หรือไม่ (สำหรับกรณี redirect จาก Cloud Run มา localhost:3000)
    const urlParams = new URLSearchParams(window.location.search);
    const sessionParam = urlParams.get('session');
    
    if (sessionParam) {
      try {
        const decodedUser = JSON.parse(decodeURIComponent(sessionParam));
        localStorage.setItem('KKU_SSO_SESSION', JSON.stringify(decodedUser));
        setUser(decodedUser);
        
        // ลบ query parameter ออกจาก URL เพื่อความสวยงามและไม่สับสนเวลา refresh
        const newUrl = window.location.origin + window.location.pathname;
        window.history.replaceState({}, document.title, newUrl);
      } catch (e) {
        console.error("Failed to parse URL session:", e);
      }
    } else {
      // 2. ถ้าไม่มี ให้โหลดจาก localStorage ปกติ
      const savedUser = localStorage.getItem('KKU_SSO_SESSION');
      if (savedUser) {
        try {
          setUser(JSON.parse(savedUser));
        } catch (e) {
          console.error("Session error:", e);
        }
      }
    }
    setInitialized(true);
  }, []);
  
  if (!initialized) return null;

  // Intercept callback route directly to prevent blank screen if BASE_URL differs from callback URL
  if (window.location.pathname.includes('/auth/callback')) {
    return (
      <BrowserRouter>
        <AuthCallback />
      </BrowserRouter>
    );
  }

  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <Routes>
        <Route path="/auth/callback/:p1/:p2/:p3/:p4" element={<AuthCallback />} />
        <Route path="/auth/callback/:p1/:p2/:p3" element={<AuthCallback />} />
        <Route path="/auth/callback" element={<AuthCallback />} />
        <Route path="*" element={<MainApp user={user} setUser={setUser} />} />
      </Routes>
    </BrowserRouter>
  );
}

const FilterDropdown = ({ label, value, options, onChange }: { label: string, value: string, options: string[], onChange: (v: string) => void }) => {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <div className="relative">
      <button onClick={() => setIsOpen(!isOpen)} className="px-4 py-2 bg-white border border-slate-200 rounded-xl shadow-sm text-sm font-bold text-slate-700 flex items-center justify-between gap-3 min-w-[200px] hover:border-kku-green transition-colors">
        <span className="text-slate-400 font-medium mr-1">{label}:</span>
        {value}
        <ChevronDown size={16} className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      <AnimatePresence>
        {isOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} className="absolute top-full left-0 mt-2 w-full bg-white border border-slate-200 rounded-xl shadow-xl z-50 overflow-hidden">
              {options.map(opt => (
                <button key={opt} className={`w-full text-left px-4 py-3 text-sm hover:bg-slate-50 transition-colors ${value === opt ? 'text-kku-green font-bold bg-kku-green/5' : 'text-slate-600'}`} onClick={() => { onChange(opt); setIsOpen(false); }}>
                  {opt}
                </button>
              ))}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

export default App;
