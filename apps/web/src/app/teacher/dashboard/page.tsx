'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { apiFetch } from '@/lib/api-client';
import { PageHeader } from '@/components/ui/page-header';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface MySection { id:string; course:{title:string;code:string}; enrolledCount:number; capacity:number; }
const LINKS=[
  {href:'/teacher/timetable',label:'My Timetable',desc:'Review your weekly teaching schedule.'},
  {href:'/teacher/attendance',label:'Mark Attendance',desc:'Open the register for one of your sections.'},
  {href:'/teacher/assignments',label:'Assignments',desc:'Publish coursework and review submissions.'},
  {href:'/teacher/grades',label:'Enter Grades',desc:'Enter component marks and save the grade sheet.'},
  {href:'/teacher/feedback',label:'Section Feedback',desc:'Review anonymous student evaluations.'},
];
export default function TeacherDashboardPage(){
 const {accessToken,profile}=useAuth(); const [sections,setSections]=useState<MySection[]>([]);
 useEffect(()=>{if(!accessToken||!profile?.teacherId)return;apiFetch<MySection[]>(`/teachers/${profile.teacherId}/sections`,{token:accessToken}).then(setSections).catch(()=>setSections([]));},[accessToken,profile?.teacherId]);
 const total=useMemo(()=>sections.reduce((n,s)=>n+s.enrolledCount,0),[sections]); const avg=sections.length?Math.round(total/sections.length):0;
 return <main className="min-w-0 overflow-x-hidden p-4 sm:p-6 lg:p-10"><PageHeader eyebrow="Faculty" title="Dashboard" subtitle={profile?.email??'Your teaching overview'} />
  <section className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3"><div className="rounded-2xl bg-slate-900 p-5 text-white shadow-sm sm:p-6"><p className="text-[11px] font-semibold uppercase tracking-[.14em] text-slate-400">Sections teaching</p><p className="mt-3 font-serif text-4xl font-semibold">{sections.length}</p><p className="mt-2 text-xs text-slate-400">Active teaching assignments</p></div><div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"><p className="text-[11px] font-semibold uppercase tracking-[.14em] text-slate-400">Students</p><p className="mt-3 font-serif text-4xl font-semibold text-slate-900">{total}</p><p className="mt-2 text-xs text-slate-400">Across all assigned sections</p></div><div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"><p className="text-[11px] font-semibold uppercase tracking-[.14em] text-slate-400">Average section</p><p className="mt-3 font-serif text-4xl font-semibold text-slate-900">{sections.length?avg:'—'}</p><p className="mt-2 text-xs text-slate-400">Students per section</p></div></section>
  {sections.length>0&&<section className="mb-8 rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm sm:p-6"><div className="mb-5 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between"><div><h2 className="font-serif text-lg font-semibold text-slate-900">Enrollment overview</h2><p className="mt-1 text-sm text-slate-500">Enrolled students against section capacity.</p></div><span className="font-data text-xs text-slate-400">{sections.length} sections</span></div><div className="h-[260px] w-full"><ResponsiveContainer width="100%" height="100%"><BarChart data={sections.map(s=>({code:s.course.code,enrolled:s.enrolledCount,capacity:s.capacity}))} margin={{top:8,right:8,left:-22,bottom:0}}><CartesianGrid vertical={false} stroke="var(--color-slate-100)"/><XAxis dataKey="code" tick={{fontSize:11,fill:'var(--color-slate-400)'}} axisLine={false} tickLine={false}/><YAxis allowDecimals={false} tick={{fontSize:11,fill:'var(--color-slate-400)'}} axisLine={false} tickLine={false} width={30}/><Tooltip contentStyle={{fontSize:12,borderRadius:10,border:'1px solid var(--color-slate-200)'}}/><Bar dataKey="capacity" fill="var(--color-slate-200)" radius={[5,5,0,0]} name="Capacity"/><Bar dataKey="enrolled" fill="var(--color-slate-900)" radius={[5,5,0,0]} name="Enrolled"/></BarChart></ResponsiveContainer></div></section>}
  <section><div className="mb-4"><h2 className="font-serif text-lg font-semibold text-slate-900">Quick actions</h2><p className="mt-1 text-sm text-slate-500">Everything you need for day-to-day teaching.</p></div><div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">{LINKS.map((link,i)=><Link key={link.href} href={link.href} className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-px hover:border-slate-300 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-slate-900/10"><div className="flex items-center justify-between"><span className="font-data text-[10px] font-semibold uppercase tracking-[.16em] text-slate-300">0{i+1}</span><span className="text-slate-300 transition group-hover:translate-x-1 group-hover:text-slate-700">→</span></div><h3 className="mt-7 font-medium text-slate-900">{link.label}</h3><p className="mt-1.5 text-sm leading-6 text-slate-500">{link.desc}</p></Link>)}</div></section>
 </main>;
}
