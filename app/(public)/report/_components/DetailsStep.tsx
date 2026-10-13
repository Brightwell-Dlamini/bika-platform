'use client';

import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  ArrowLeft,
  MapPin,
  Camera,
  X,
  AlertCircle,
  PhoneCall,
  Info,
} from 'lucide-react';
import {
  zCitizenReportSubmission,
  zRegion,
  zMode,
  zSeverity,
  zReportType,
  zPhoneEswatini,
  zEmail,
  zCoordinates,
} from '@/app/lib/schemas';
import type { Mode, ReportType, Severity, Region } from '@/app/types';
import { validateAndProcessImage } from '@/app/lib/uploads';

const formSchema = z
  .object({
    reportType: zReportType,
    mode: zMode,
    region: zRegion,
    category: z.string().min(2).max(120),
    location: z.string().min(3).max(200),
    description: z.string().min(10).max(4000),
    severity: zSeverity.default('MEDIUM'),
    reporterName: z.string().max(120).optional().nullable(),
    reporterPhone: zPhoneEswatini.optional().nullable(),
    reporterEmail: zEmail.optional().nullable(),
    isAnonymous: z.boolean().default(false),
    vehicleRegistration: z.string().max(20).optional().nullable(),
    operatorName: z.string().max(120).optional().nullable(),
    driverName: z.string().max(120).optional().nullable(),
    establishmentName: z.string().max(200).optional().nullable(),
    coordinates: zCoordinates.optional().nullable(),
  })
  .refine(
    (data) => data.isAnonymous || Boolean(data.reporterPhone || data.reporterEmail),
    {
      message: 'Provide a phone or email, or submit anonymously.',
      path: ['reporterPhone'],
    }
  )
  .refine(
    (data) => (data.reportType === 'emergency' ? data.severity === 'CRITICAL' : true),
    {
      message: 'Emergency reports must have CRITICAL severity.',
      path: ['severity'],
    }
  );

type FormValues = z.infer<typeof formSchema>;

const CATEGORIES: Record<Mode, string[]> = {
  'Road Transport': [
    'Dangerous Driving & Speeding',
    'Vehicle Overloading',
    'Unsafe Vehicle Condition',
    'Overcharging Commuter Fares',
    'Bus Rank Congestion',
    'Route Violation',
    'Driver Misconduct',
    'Unlicensed Operator',
  ],
  'Restaurant/Food': [
    'Food Poisoning / Contamination',
    'Hygiene & Sanitation Violation',
    'Expired Produce / Food Product',
    'Price Gouging / Overcharging',
    'Unlicensed Food Vendor',
    'Customer Conduct & Abuse',
  ],
};

interface DetailsStepProps {
  mode: Mode;
  reportType: ReportType;
  defaultValues: Partial<FormValues>;
  attachments: import('@/app/types').Attachment[];
  onAddAttachment: (a: import('@/app/types').Attachment) => void;
  onRemoveAttachment: (id: string) => void;
  onBack: () => void;
  onNext: (values: FormValues) => void;
}

export function DetailsStep({
  mode,
  reportType,
  defaultValues,
  attachments,
  onAddAttachment,
  onRemoveAttachment,
  onBack,
  onNext,
}: DetailsStepProps) {
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      mode,
      reportType,
      region: 'Manzini',
      category: CATEGORIES[mode][0]!,
      location: '',
      description: '',
      severity: reportType === 'emergency' ? 'CRITICAL' : 'MEDIUM',
      isAnonymous: false,
      reporterName: null,
      reporterPhone: null,
      reporterEmail: null,
      vehicleRegistration: null,
      operatorName: null,
      driverName: null,
      establishmentName: null,
      coordinates: null,
      ...defaultValues,
    },
    mode: 'onBlur',
  });

  const [imageError, setImageError] = React.useState<string | null>(null);
  const [isCompressing, setIsCompressing] = React.useState(false);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setImageError(null);
    setIsCompressing(true);
    try {
      for (const file of Array.from(files)) {
        if (attachments.length >= 5) {
          setImageError('Maximum 5 attachments per report.');
          break;
        }
        const result = await validateAndProcessImage(file);
        if (!result.success || !result.attachment) {
          setImageError(result.error || 'Could not process image.');
        } else {
          onAddAttachment(result.attachment);
        }
      }
    } finally {
      setIsCompressing(false);
      e.target.value = '';
    }
  };

  const handleDetectGPS = () => {
    if (typeof navigator === 'undefined' || !('geolocation' in navigator)) {
      form.setValue('location', 'Manzini Central Bus Rank');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        form.setValue('coordinates', { lat: pos.coords.latitude, lng: pos.coords.longitude }, { shouldDirty: true });
        form.setValue(
          'location',
          `GPS Pin: ${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)}`,
          { shouldDirty: true }
        );
      },
      () => {
        form.setValue('location', 'Manzini Central Bus Rank', { shouldDirty: true });
      }
    );
  };

  const isAnonymous = form.watch('isAnonymous');
  const severity = form.watch('severity');

  return (
    <form
      onSubmit={form.handleSubmit((values) => onNext(values))}
      className="max-w-3xl mx-auto bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 animate-fadeIn"
    >
      <div className="flex items-center justify-between border-b border-slate-800 pb-4">
        <div className="flex items-center space-x-3">
          <button type="button" onClick={onBack} className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors" aria-label="Back">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center space-x-2">
              <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-black uppercase ${reportType === 'emergency' ? 'bg-red-600 text-white' : 'bg-yellow-500/20 text-yellow-300'}`}>
                {reportType}
              </span>
              <span className="text-[10px] bg-slate-800 text-slate-300 px-2.5 py-0.5 rounded-full font-bold">
                {mode === 'Road Transport' ? 'Transport' : 'Trade & Food'}
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-extrabold text-white mt-1">Report details</h2>
          </div>
        </div>
      </div>

      {reportType === 'emergency' && (
        <div className="bg-red-950/90 border border-red-600/80 p-4 rounded-2xl text-xs space-y-2">
          <div className="flex items-center space-x-2 text-red-400 font-extrabold text-sm">
            <PhoneCall className="w-5 h-5 animate-pulse" />
            <span>FOR IMMEDIATE THREAT TO LIFE — CALL EMERGENCY HOTLINES:</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 font-bold">
            {[['POLICE', '999'], ['AMBULANCE', '977'], ['FIRE & RESCUE', '933'], ['DISASTER MGMT', '800-2452']].map(([label, number]) => (
              <div key={label} className="bg-slate-900 p-2 rounded-lg border border-red-500/30 text-center">
                <span className="text-slate-400 block text-[10px]">{label}</span>
                <span className="text-white text-sm">{number}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Photo-first */}
      <div className="bg-slate-950/50 border border-slate-800 rounded-2xl p-4 space-y-3">
        <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
          Photo evidence first (optional, max 5, ≤1MB each)
        </label>
        <p className="text-[11px] text-slate-500">
          Adding a photo early helps officers act faster. You can still complete the form without one.
        </p>
        {imageError && (
          <div className="p-3 rounded-xl bg-red-600/20 border border-red-500/50 text-red-200 text-xs font-semibold flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            <span>{imageError}</span>
          </div>
        )}
        <div className="flex items-center space-x-3">
          <label className="flex items-center space-x-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl px-4 py-2.5 text-xs font-semibold text-yellow-400 cursor-pointer transition-colors">
            <Camera className="w-4 h-4" />
            <span>{isCompressing ? 'Processing…' : 'Add photo'}</span>
            <input type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={handleImageUpload} className="hidden" disabled={attachments.length >= 5} />
          </label>
          <span className="text-[11px] text-slate-400">{attachments.length} / 5 attached</span>
        </div>
        {attachments.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {attachments.map((att) => (
              <div key={att.id} className="relative w-20 h-20 rounded-xl overflow-hidden border border-slate-700">
                <img src={att.url} alt={att.name} className="w-full h-full object-cover" />
                <button type="button" onClick={() => onRemoveAttachment(att.id)} className="absolute top-1 right-1 bg-red-600 text-white rounded-full p-0.5 opacity-80 hover:opacity-100" aria-label="Remove attachment">
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {(reportType === 'incident' || reportType === 'complaint') && (
        <div>
          <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">Category *</label>
          <select {...form.register('category')} className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white font-semibold focus:outline-none focus:border-yellow-500">
            {CATEGORIES[mode].map((cat) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>
      )}

      {(reportType === 'incident' || reportType === 'complaint') && (
        <div>
          <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">Severity</label>
          <div className="grid grid-cols-4 gap-2">
            {(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as Severity[]).map((s) => (
              <button key={s} type="button" onClick={() => form.setValue('severity', s, { shouldDirty: true })} className={`py-2 rounded-xl text-[10px] font-black border transition ${
                severity === s
                  ? s === 'CRITICAL' ? 'bg-red-600 border-red-500 text-white'
                    : s === 'HIGH' ? 'bg-orange-500 border-orange-400 text-white'
                    : s === 'MEDIUM' ? 'bg-yellow-500 border-yellow-400 text-slate-950'
                    : 'bg-sky-500 border-sky-400 text-white'
                  : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
              }`}>{s}</button>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">Region *</label>
          <select {...form.register('region')} className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-yellow-500">
            {(['Hhohho', 'Manzini', 'Shiselweni', 'Lubombo'] as Region[]).map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">Location / Rank / Station / Shop *</label>
          <div className="relative">
            <input {...form.register('location')} type="text" placeholder={mode === 'Road Transport' ? 'e.g. Manzini Main Bus Rank / MR3 Highway' : 'e.g. Shop 14, Mbabane Plaza'} className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 pr-9 text-sm text-white focus:outline-none focus:border-yellow-500" />
            <button type="button" onClick={handleDetectGPS} title="Pin GPS location" className="absolute right-2 top-2 text-yellow-400 hover:text-yellow-300">
              <MapPin className="w-5 h-5" />
            </button>
          </div>
          {form.formState.errors.location && (
            <p className="text-[11px] text-red-400 mt-1">{form.formState.errors.location.message}</p>
          )}
        </div>
      </div>

      <div>
        <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">What happened? *</label>
        <textarea {...form.register('description')} rows={4} placeholder="Describe what happened in detail. Include time of day, vehicle registration or establishment name where relevant." className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-yellow-500" />
        {form.formState.errors.description && (
          <p className="text-[11px] text-red-400 mt-1">{form.formState.errors.description.message}</p>
        )}
      </div>

      {mode === 'Road Transport' && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">Vehicle Reg</label>
            <input {...form.register('vehicleRegistration')} type="text" placeholder="PSD 412 BH" className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white font-mono uppercase focus:outline-none focus:border-yellow-500" />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">Operator</label>
            <input {...form.register('operatorName')} type="text" placeholder="Swazi Express" className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-yellow-500" />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">Driver</label>
            <input {...form.register('driverName')} type="text" placeholder="Optional" className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-yellow-500" />
          </div>
        </div>
      )}

      {mode === 'Restaurant/Food' && (
        <div>
          <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">Establishment Name</label>
          <input {...form.register('establishmentName')} type="text" placeholder="e.g. Mbabane Central Market Grill" className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-yellow-500" />
        </div>
      )}

      <div className="border-t border-slate-800 pt-4">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">Contact (optional)</span>
          <label className="flex items-center space-x-2 text-xs text-slate-400 cursor-pointer">
            <input type="checkbox" {...form.register('isAnonymous')} className="rounded bg-slate-800 border-slate-700 text-yellow-500 focus:ring-0" />
            <span>Submit anonymously</span>
          </label>
        </div>
        {!isAnonymous && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input {...form.register('reporterName')} type="text" placeholder="Your name" className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-yellow-500" />
            <input {...form.register('reporterPhone')} type="tel" placeholder="+268 7611 2233" className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-yellow-500" />
            {form.formState.errors.reporterPhone && (
              <p className="text-[11px] text-red-400 col-span-2">{form.formState.errors.reporterPhone.message}</p>
            )}
          </div>
        )}
        <div className="mt-3 flex items-start space-x-2 text-[11px] text-slate-500">
          <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          <span>Anonymous reports are accepted, but including contact details lets officers follow up directly.</span>
        </div>
      </div>

      <button
        type="submit"
        className={`w-full py-4 rounded-2xl font-black text-base tracking-wider shadow-xl transition-all ${
          reportType === 'emergency'
            ? 'bg-gradient-to-r from-red-600 to-red-700 text-white hover:brightness-110'
            : 'bg-gradient-to-r from-yellow-500 to-amber-500 text-slate-950 hover:brightness-110'
        }`}
      >
        {reportType === 'emergency' ? 'Review emergency report' : 'Review report'}
      </button>
    </form>
  );
}
