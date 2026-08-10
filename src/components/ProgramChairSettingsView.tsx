import React, { useState, useEffect } from 'react';
import { Search, Loader2, UserPlus, Trash2, ArrowLeft, Shield, Check } from 'lucide-react';
import { User } from '../types';

interface Person {
  officeremail: string;
  firstname: string;
  lastname: string;
  facultyid: string | null;
  facultyname: string | null;
  academic_position_id: string | null;
  academic_position_name?: string | null;
}

interface ProgramChair {
  program_chair_email: string;
  program_chair_academic_position_id: string;
  program_chair_firstname: string;
  program_chair_lastname: string;
  program_chair_facultyid: string;
  program_chair_facultyname: string;
}

export const ProgramChairSettingsView = ({ user, isMockUser }: { user: User; isMockUser: boolean }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<Person[]>([]);
  const [assignedChairs, setAssignedChairs] = useState<ProgramChair[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isLoadingChairs, setIsLoadingChairs] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null); // To trace email action progress
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Fetch currently assigned program chairs
  const fetchAssignedChairs = async () => {
    setIsLoadingChairs(true);
    try {
      const res = await fetch(import.meta.env.BASE_URL + 'api/program-chairs');
      if (res.ok) {
        const data = await res.json();
        setAssignedChairs(data);
      } else {
        console.error('Failed to fetch assigned chairs');
      }
    } catch (err) {
      console.error('Error fetching assigned chairs:', err);
    } finally {
      setIsLoadingChairs(false);
    }
  };

  useEffect(() => {
    fetchAssignedChairs();
  }, []);

  // Real-time Search Handler
  useEffect(() => {
    if (!searchTerm.trim()) {
      setSearchResults([]);
      return;
    }

    const delayDebounce = setTimeout(async () => {
      setIsSearching(true);
      try {
        const baseUrl = import.meta.env.BASE_URL.replace(/\/$/, '');
        const res = await fetch(`${baseUrl}/api/persons/search?q=${encodeURIComponent(searchTerm)}`);
        if (res.ok) {
          const data = await res.json();
          setSearchResults(data);
        } else {
          console.error('Failed to search academic staff');
        }
      } catch (err) {
        console.error('Error searching academic staff:', err);
      } finally {
        setIsSearching(false);
      }
    }, 400); // 400ms debounce for real-time search

    return () => clearTimeout(delayDebounce);
  }, [searchTerm]);

  const handleAssign = async (person: Person) => {
    setActionLoading(person.officeremail);
    setMessage(null);
    try {
      const res = await fetch(import.meta.env.BASE_URL + 'api/program-chairs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: person.officeremail,
          academic_position_id: person.academic_position_id || 'อ.',
          firstname: person.firstname || '',
          lastname: person.lastname || '',
          facultyid: person.facultyid || user.facultyId || '10',
          facultyname: person.facultyname || user.faculty || 'บัณฑิตวิทยาลัย'
        })
      });

      if (res.ok) {
        setMessage({ type: 'success', text: `บันทึกแต่งตั้ง ${person.firstname} ${person.lastname} เป็นประธานหลักสูตรเรียบร้อยแล้ว` });
        setSearchTerm('');
        setSearchResults([]);
        await fetchAssignedChairs();
      } else {
        const errorData = await res.json();
        setMessage({ type: 'error', text: errorData.error || 'เกิดข้อผิดพลาดในการแต่งตั้งประธานหลักสูตร' });
      }
    } catch (err) {
      console.error('Error assigning program chair:', err);
      setMessage({ type: 'error', text: 'เกิดข้อผิดพลาดในการสื่อสารกับเซิร์ฟเวอร์' });
    } finally {
      setActionLoading(null);
    }
  };

  const handleRemove = async (chair: ProgramChair) => {
    if (!window.confirm(`คุณแน่ใจหรือไม่ที่จะถอดถอน ${chair.program_chair_firstname} ${chair.program_chair_lastname} จากตำแหน่งประธานหลักสูตร?`)) {
      return;
    }

    setActionLoading(chair.program_chair_email);
    setMessage(null);
    try {
      const baseUrl = import.meta.env.BASE_URL.replace(/\/$/, '');
      const res = await fetch(`${baseUrl}/api/program-chairs/${encodeURIComponent(chair.program_chair_email)}`, {
        method: 'DELETE'
      });

      if (res.ok) {
        setMessage({ type: 'success', text: 'ถอดถอนผู้รับตำแหน่งประธานหลักสูตรเรียบร้อยแล้ว' });
        await fetchAssignedChairs();
      } else {
        const errorData = await res.json();
        setMessage({ type: 'error', text: errorData.error || 'เกิดข้อผิดพลาดในการถอดถอน' });
      }
    } catch (err) {
      console.error('Error removing program chair:', err);
      setMessage({ type: 'error', text: 'เกิดข้อผิดพลาดในการสื่อสารกับเซิร์ฟเวอร์' });
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="space-y-8 sm:space-y-12 animate-fadeIn pb-24">
      {/* Page Header */}
      <div className="bg-white p-6 sm:p-10 rounded-[30px] sm:rounded-[50px] border border-slate-100 shadow-xl shadow-slate-200/30 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-1 sm:w-2 h-full bg-kku-green" />
        <div className="space-y-4 max-w-4xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-kku-green/10 text-kku-green rounded-full text-[10px] font-black tracking-widest uppercase border border-kku-green/20 mb-2">
            System Administration Mode
          </div>
          <h3 className="text-2xl sm:text-4xl font-black text-slate-800 tracking-tight leading-tight">
            กำหนดรายชื่อประธานหลักสูตร
          </h3>
          <p className="text-slate-500 font-medium text-sm sm:text-base">
            ค้นหาข้อมูลอาจารย์ในคณะจากระบบ GSMIS เพื่อแต่งตั้งและให้สิทธิ์เข้าถึงแดชบอร์ดระดับประธานหลักสูตร 
            (ระบบกรองข้อมูลเฉพาะบุคลากรในตาราง gs_persons)
          </p>
        </div>
      </div>

      {/* Main Grid: Left Search - Right Assigned List */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Section: Search & Assign */}
        <div className="lg:col-span-6 bg-white p-6 sm:p-8 rounded-3xl border border-slate-100 shadow-lg space-y-6">
          <div className="flex items-center gap-2">
            <Shield className="text-kku-green" size={20} />
            <h4 className="font-black text-slate-800 text-lg sm:text-xl">ค้นหาและตั้งค่าประธานหลักสูตร</h4>
          </div>

          {message && (
            <div className={`p-4 rounded-2xl border text-sm font-bold flex items-center gap-2 ${
              message.type === 'success' 
                ? 'bg-emerald-50 text-emerald-700 border-emerald-100' 
                : 'bg-rose-50 text-rose-700 border-rose-100'
            }`}>
              {message.type === 'success' && <Check size={16} />}
              {message.text}
            </div>
          )}

          {/* Real-time Search Box */}
          <div className="relative">
            <div className="flex items-center gap-3 bg-slate-50 px-4 py-3 rounded-2xl border border-slate-100 focus-within:bg-white focus-within:border-kku-green focus-within:ring-4 focus-within:ring-kku-green/5 transition-all">
              <Search size={18} className="text-slate-400" />
              <input 
                type="text" 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="พิมพ์ชื่อหรือนามสกุล (ภาษาไทย) เพื่อค้นหาแบบเรียลไทม์..."
                className="w-full bg-transparent border-none py-1 text-sm font-bold text-slate-700 placeholder:text-slate-300 focus:ring-0 outline-none"
              />
              {isSearching && <Loader2 size={18} className="text-kku-green animate-spin" />}
            </div>
          </div>

          {/* Search Result Suggestions */}
          <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
            {searchResults.length > 0 ? (
              searchResults.map((person) => {
                const isAlreadyChair = assignedChairs.some(c => c.program_chair_email === person.officeremail);
                return (
                  <div 
                    key={person.officeremail} 
                    className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 bg-slate-50 hover:bg-slate-100/70 border border-slate-100 rounded-2xl gap-3 transition-colors"
                  >
                    <div className="space-y-1">
                      <div className="font-black text-slate-800 text-sm sm:text-base flex items-center gap-1.5 flex-wrap">
                        {person.academic_position_name || person.academic_position_id || 'อ.'} {person.firstname} {person.lastname}
                      </div>
                      <p className="text-xs text-slate-400 font-bold font-mono">{person.officeremail}</p>
                      <p className="text-xs text-kku-gold-darker font-medium">{person.facultyname || 'ไม่ระบุคณะ'}</p>
                    </div>
                    
                    <button
                      onClick={() => handleAssign(person)}
                      disabled={isAlreadyChair || actionLoading !== null}
                      className={`px-4 py-2 rounded-xl text-xs font-black flex items-center gap-2 transition-all w-full sm:w-auto justify-center ${
                        isAlreadyChair
                          ? 'bg-emerald-50 text-emerald-600 border border-emerald-200 cursor-not-allowed'
                          : 'bg-kku-green hover:bg-kku-green-dark text-white shadow-md shadow-kku-green/10'
                      }`}
                    >
                      {actionLoading === person.officeremail ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : isAlreadyChair ? (
                        <>
                          <Check size={14} /> แต่งตั้งแล้ว
                        </>
                      ) : (
                        <>
                          <UserPlus size={14} /> แต่งตั้งประธาน
                        </>
                      )}
                    </button>
                  </div>
                );
              })
            ) : searchTerm.trim() && !isSearching ? (
              <div className="text-center py-8 text-slate-400 font-bold text-sm">
                ไม่พบรายชื่ออาจารย์ตรงกับคำค้นหา "{searchTerm}"
              </div>
            ) : !searchTerm.trim() ? (
              <div className="text-center py-12 text-slate-300 text-sm font-bold border-2 border-dashed border-slate-100 rounded-2xl flex flex-col items-center gap-3">
                <Search size={32} className="text-slate-200" />
                เริ่มพิมพ์ชื่อเพื่อค้นหารายชื่ออาจารย์ที่นี่
              </div>
            ) : null}
          </div>
        </div>

        {/* Right Section: Currently Assigned List */}
        <div className="lg:col-span-6 bg-white p-6 sm:p-8 rounded-3xl border border-slate-100 shadow-lg space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Shield className="text-kku-gold" size={20} />
              <h4 className="font-black text-slate-800 text-lg sm:text-xl">รายชื่อประธานหลักสูตรปัจจุบัน</h4>
            </div>
            <span className="bg-slate-100 text-slate-600 px-3 py-1 rounded-full text-xs font-black">
              {assignedChairs.length} คน
            </span>
          </div>

          {isLoadingChairs ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <Loader2 size={24} className="text-kku-green animate-spin" />
              <p className="text-xs font-bold text-slate-400 animate-pulse">กำลังโหลดข้อมูลประธานหลักสูตร...</p>
            </div>
          ) : assignedChairs.length > 0 ? (
            <div className="space-y-3 max-h-[460px] overflow-y-auto pr-2 custom-scrollbar">
              {assignedChairs.map((chair) => (
                <div 
                  key={chair.program_chair_email}
                  className="flex items-center justify-between p-4 border border-slate-100 bg-white hover:bg-slate-50 rounded-2xl transition-all"
                >
                  <div className="space-y-1">
                    <p className="font-black text-slate-800 text-sm sm:text-base">
                      {chair.program_chair_academic_position_id || 'อ.'} {chair.program_chair_firstname} {chair.program_chair_lastname}
                    </p>
                    <p className="text-xs text-slate-400 font-bold font-mono">{chair.program_chair_email}</p>
                    <p className="text-xs text-kku-gold-darker font-bold">{chair.program_chair_facultyname}</p>
                  </div>

                  <button
                    onClick={() => handleRemove(chair)}
                    disabled={actionLoading !== null}
                    className="p-3 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all border border-transparent hover:border-rose-100"
                    title="ถอดถอนตำแหน่ง"
                  >
                    {actionLoading === chair.program_chair_email ? (
                      <Loader2 size={16} className="animate-spin text-slate-400" />
                    ) : (
                      <Trash2 size={16} />
                    )}
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-16 text-slate-300 text-sm font-bold border-2 border-dashed border-slate-100 rounded-2xl flex flex-col items-center gap-3">
              <Shield size={32} className="text-slate-200" />
              ยังไม่มีการแต่งตั้งประธานหลักสูตรในระบบขณะนี้
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
