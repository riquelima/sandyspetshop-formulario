import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { Appointment, ServiceType, PetWeight } from './types';
import { SERVICES, WORKING_HOURS, MAX_CAPACITY_PER_SLOT, LUNCH_HOUR, PET_WEIGHT_OPTIONS, BASE_PRICES, ADDON_SERVICES, AddonService } from './constants';
import { supabase } from './supabaseClient';


// --- HELPER FUNCTIONS ---
const isSameDay = (date1: Date, date2: Date): boolean =>
  date1.getFullYear() === date2.getFullYear() &&
  date1.getMonth() === date2.getMonth() &&
  date1.getDate() === date2.getDate();

const isWeekend = (date: Date): boolean => {
  const day = date.getDay();
  return day === 0 || day === 6; // Sunday or Saturday
};

const isPastDate = (date: Date): boolean => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date < today;
}

const formatWhatsapp = (value: string): string => {
  return value
    .replace(/\D/g, '')
    .replace(/^(\d{2})(\d)/, '($1) $2')
    .replace(/(\d{5})(\d)/, '$1-$2')
    .slice(0, 15);
};

// --- SVG ICONS ---
const ChevronLeftIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>;
const ChevronRightIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>;
const PawIcon = () => <img src="https://static.thenounproject.com/png/pet-icon-6939415-512.png" alt="Pet Icon" className="h-5 w-5 opacity-60" />;
const UserIcon = () => <img src="https://static.thenounproject.com/png/profile-icon-709597-512.png" alt="User Icon" className="h-5 w-5 opacity-60" />;
const WhatsAppIcon = () => <img src="https://static.thenounproject.com/png/whatsapp-icon-6592278-512.png" alt="WhatsApp Icon" className="h-5 w-5 opacity-60" />;
const SuccessIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-24 w-24 text-green-500 mx-auto mb-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>;


// --- UI COMPONENTS ---
const Calendar: React.FC<{ selectedDate: Date; onDateChange: (date: Date) => void; }> = ({ selectedDate, onDateChange }) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const startOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
  const endOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
  const startDate = new Date(startOfMonth);
  startDate.setDate(startDate.getDate() - startOfMonth.getDay());
  const endDate = new Date(endOfMonth);
  endDate.setDate(endDate.getDate() + (6 - endOfMonth.getDay()));
  const days: Date[] = [];
  let day = new Date(startDate);
  while (day <= endDate) {
    days.push(new Date(day));
    day.setDate(day.getDate() + 1);
  }
  const handlePrevMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  const handleNextMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  const dayNames = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

  return (
    <div className="bg-white p-4 rounded-xl shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <button type="button" onClick={handlePrevMonth} className="p-2 rounded-full hover:bg-gray-100 transition-colors"><ChevronLeftIcon /></button>
        <h3 className="font-bold text-lg text-gray-800 capitalize">
          {currentMonth.toLocaleString('pt-BR', { month: 'long', year: 'numeric' })}
        </h3>
        <button type="button" onClick={handleNextMonth} className="p-2 rounded-full hover:bg-gray-100 transition-colors"><ChevronRightIcon /></button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-sm text-gray-500">
        {dayNames.map((d, i) => <div key={i} className="font-semibold">{d}</div>)}
        {days.map((d, i) => {
          const isSelected = isSameDay(d, selectedDate);
          const isCurrentMonth = d.getMonth() === currentMonth.getMonth();
          const isDisabled = isWeekend(d) || !isCurrentMonth || isPastDate(d);
          let btnClass = "w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300";
          if (isDisabled) btnClass += " text-gray-300 cursor-not-allowed";
          else {
            if (isSelected) btnClass += " bg-blue-600 text-white font-bold shadow-lg transform scale-110";
            else btnClass += " hover:bg-blue-100";
          }
          return (
            <button type="button" key={i} onClick={() => !isDisabled && onDateChange(d)} disabled={isDisabled} className={btnClass}>
              {d.getDate()}
            </button>
          );
        })}
      </div>
    </div>
  );
};

const TimeSlotPicker: React.FC<{ selectedService: ServiceType | null; selectedDate: Date; appointments: Appointment[]; onTimeSelect: (time: number) => void; selectedTime: number | null; }> = ({ selectedService, selectedDate, appointments, onTimeSelect, selectedTime }) => {
    const slotCounts = useMemo(() => {
        const counts: Record<number, number> = {};
        WORKING_HOURS.forEach(hour => counts[hour] = 0);
        const appointmentsForDay = appointments.filter(app => isSameDay(app.startTime, selectedDate));
        
        appointmentsForDay.forEach(app => {
            const startHour = app.startTime.getHours();
            const duration = Math.round((app.endTime.getTime() - app.startTime.getTime()) / (1000 * 60 * 60));
            for (let i = 0; i < duration; i++) {
                const hour = startHour + i;
                counts[hour] = (counts[hour] || 0) + 1;
            }
        });
        return counts;
    }, [selectedDate, appointments]);

    const isSlotAvailable = useCallback((hour: number): boolean => {
        if (!selectedService) return false;
        const serviceDuration = SERVICES[selectedService].duration;

        // Business day ends at 19:00. A 2-hour service starting at 17:00 should end at 19:00.
        if (hour + serviceDuration > 19) {
            return false;
        }

        // Check all slots required by the service duration.
        for (let i = 0; i < serviceDuration; i++) {
            const checkHour = hour + i;
            
            // Cannot book over lunch break.
            if (checkHour === LUNCH_HOUR) {
                return false;
            }

            // Check capacity for the given hour.
            if ((slotCounts[checkHour] || 0) >= MAX_CAPACITY_PER_SLOT) {
                return false;
            }
        }
        
        return true;
    }, [selectedService, slotCounts]);

    if (!selectedService) return <div className="text-center text-gray-500 p-4 bg-gray-100 rounded-lg">Por favor, selecione um serviço na etapa anterior.</div>;
    if (isWeekend(selectedDate) || isPastDate(selectedDate)) return <div className="text-center text-gray-500 p-4 bg-gray-100 rounded-lg">Não há agendamentos para fins de semana ou datas passadas.</div>;

    return (
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
            {WORKING_HOURS.map(hour => {
                const available = isSlotAvailable(hour);
                return (
                    <button type="button" key={hour} onClick={() => available && onTimeSelect(hour)} disabled={!available}
                        className={`p-3 rounded-lg text-sm font-semibold transition-all duration-200 transform ${
                            selectedTime === hour ? 'bg-blue-600 text-white shadow-lg scale-105'
                            : !available ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                            : 'bg-white hover:bg-blue-100 hover:scale-105 text-gray-800 shadow-sm'
                        }`}
                    >
                        {`${String(hour).padStart(2, '0')}:00`}
                    </button>
                );
            })}
        </div>
    );
};

// --- MAIN APP COMPONENT ---
export default function App() {
  const [step, setStep] = useState(1);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [formData, setFormData] = useState({ petName: '', ownerName: '', whatsapp: '' });
  const [selectedService, setSelectedService] = useState<ServiceType | null>(null);
  const [selectedWeight, setSelectedWeight] = useState<PetWeight | null>(null);
  const [selectedAddons, setSelectedAddons] = useState<Record<string, boolean>>({});
  const [totalPrice, setTotalPrice] = useState(0);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedTime, setSelectedTime] = useState<number | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    const fetchAppointments = async () => {
        const today = new Date();
        today.setHours(0,0,0,0);
        const { data, error } = await supabase
            .from('appointments')
            .select('*')
            .gte('start_time', today.toISOString());

        if (error) {
            console.error('Error fetching appointments:', error);
        } else if (data) {
            const fetchedAppointments: Appointment[] = data
                .map((item: any) => {
                    const serviceKey = Object.keys(SERVICES).find(key => SERVICES[key as ServiceType].label === item.service) as ServiceType | undefined;
                    
                    if (!serviceKey) {
                        console.warn(`Invalid or unknown service label "${item.service}" found in database for appointment ${item.id}. Skipping.`);
                        return null;
                    }
            
                    return {
                        id: item.id,
                        petName: item.pet_name,
                        ownerName: item.owner_name,
                        whatsapp: item.whatsapp,
                        service: serviceKey,
                        startTime: new Date(item.start_time),
                        endTime: new Date(item.end_time),
                    };
                })
                .filter((app): app is Appointment => app !== null);
            setAppointments(fetchedAppointments);
        }
    };

    fetchAppointments();
}, []);


  useEffect(() => { setSelectedTime(null); }, [selectedDate, selectedService]);
  
  useEffect(() => {
    if (!selectedService || !selectedWeight) { setTotalPrice(0); return; }
    const basePrice = BASE_PRICES[selectedWeight][selectedService];
    let addonsPrice = 0;
    Object.keys(selectedAddons).forEach(addonId => {
        if (selectedAddons[addonId]) {
            const addon = ADDON_SERVICES.find(a => a.id === addonId);
            if (addon) addonsPrice += addon.price;
        }
    });
    setTotalPrice(basePrice + addonsPrice);
  }, [selectedService, selectedWeight, selectedAddons]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: name === 'whatsapp' ? formatWhatsapp(value) : value }));
  };

  const handleWeightChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
      const newWeight = e.target.value as PetWeight;
      setSelectedWeight(newWeight);
      const newAddons = {...selectedAddons};
      ADDON_SERVICES.forEach(addon => {
          if (selectedAddons[addon.id]) {
            const isExcluded = addon.excludesWeight?.includes(newWeight);
            const requiresNotMet = addon.requiresWeight && !addon.requiresWeight.includes(newWeight);
            if(isExcluded || requiresNotMet) newAddons[addon.id] = false;
          }
      });
      setSelectedAddons(newAddons);
  }
  
  const handleAddonToggle = (addonId: string) => {
    const newAddons = { ...selectedAddons };
    newAddons[addonId] = !newAddons[addonId];
    if (addonId === 'patacure1' && newAddons[addonId]) newAddons['patacure2'] = false;
    else if (addonId === 'patacure2' && newAddons[addonId]) newAddons['patacure1'] = false;
    setSelectedAddons(newAddons);
  };

  const changeStep = (nextStep: number) => {
    setIsAnimating(true);
    setTimeout(() => {
      setStep(nextStep);
      setIsAnimating(false);
    }, 300); // Animation duration
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedService || !selectedTime) return;
    setIsSubmitting(true);
    
    const startTime = new Date(selectedDate);
    startTime.setHours(selectedTime, 0, 0, 0);
    const duration = SERVICES[selectedService].duration;
    const endTime = new Date(startTime.getTime() + duration * 60 * 60 * 1000);

    const newAppointment: Appointment = { id: new Date().toISOString(), petName: formData.petName, ownerName: formData.ownerName, whatsapp: formData.whatsapp, service: selectedService, startTime, endTime };
    
    const submissionData = {
        id: newAppointment.id, startTime: newAppointment.startTime.toISOString(), petName: newAppointment.petName, ownerName: newAppointment.ownerName,
        whatsapp: newAppointment.whatsapp, service: SERVICES[newAppointment.service].label, weight: PET_WEIGHT_OPTIONS[selectedWeight!],
        addons: ADDON_SERVICES.filter(addon => selectedAddons[addon.id]).map(addon => addon.label), price: totalPrice,
    };

    const supabasePayload = {
      start_time: startTime.toISOString(),
      end_time: endTime.toISOString(),
      pet_name: formData.petName,
      owner_name: formData.ownerName,
      whatsapp: formData.whatsapp,
      service: SERVICES[selectedService].label,
      weight: PET_WEIGHT_OPTIONS[selectedWeight!],
      addons: ADDON_SERVICES.filter(addon => selectedAddons[addon.id]).map(addon => addon.label),
      price: totalPrice,
    };
    
    try {
        const { error: supabaseError } = await supabase.from('appointments').insert([supabasePayload]);
        if (supabaseError) throw supabaseError;

        await Promise.all([
          fetch("https://script.google.com/macros/s/AKfycbw5TO-nb7hriuJoG4s2UQXANNFurLdsybOpOwuNXH7OeSDt3oFmHTgVHya7hUoO_hrDsQ/exec", { method: 'POST', mode: 'no-cors', body: JSON.stringify(submissionData) }),
          fetch("https://n8n.intelektus.tech/webhook/form-agendamento", { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(submissionData) })
        ]);

        setAppointments(prev => [...prev, newAppointment]);
        setIsModalOpen(true);
        setTimeout(() => {
            setIsModalOpen(false);
            setFormData({ petName: '', ownerName: '', whatsapp: '' });
            setSelectedService(null); setSelectedWeight(null); setSelectedAddons({}); setSelectedTime(null); setTotalPrice(0); setIsSubmitting(false);
            changeStep(1);
        }, 4000);
    } catch (error: any) {
        console.error("Error submitting appointment:", error);
        let userMessage = 'Não foi possível concluir o agendamento. Tente novamente.';
        
        if (error && typeof error === 'object' && error.message) {
            // Handle Supabase/Postgrest errors which have a clear message
            userMessage += `\n\nErro: ${error.message}`;
            if (error.details) {
                 userMessage += `\nDetalhes: ${error.details}`;
            }
        } else {
            // Fallback for other errors: try to stringify them
            try {
                userMessage += `\n\nDebug Info: ${JSON.stringify(error, null, 2)}`;
            } catch {
                // If stringifying fails, just convert to a simple string
                userMessage += `\n\nDebug Info: ${String(error)}`;
            }
        }

        alert(userMessage);
        setIsSubmitting(false);
    }
  };

  const isStep1Valid = formData.petName && formData.ownerName && formData.whatsapp.length > 13;
  const isStep2Valid = selectedService && selectedWeight;
  const isStep3Valid = selectedTime !== null;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      <header className="text-center mb-6">
          <img src="https://i.imgur.com/M3Gt3OA.png" alt="Sandy's Pet Shop Logo" className="h-20 w-20 mx-auto mb-2"/>
          <h1 className="font-brand text-5xl text-blue-800">Sandy's Pet Shop</h1>
          <p className="text-gray-600 text-lg">Agendamento Online</p>
      </header>

      <main className="w-full max-w-2xl bg-white rounded-2xl shadow-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex justify-between items-center text-sm font-semibold text-gray-500">
                {['Dados', 'Serviços', 'Horário', 'Resumo'].map((name, index) => (
                    <div key={name} className={`flex items-center gap-2 ${step > index + 1 ? 'text-blue-600' : ''} ${step === index + 1 ? 'text-blue-600 font-bold' : ''}`}>
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center transition-all ${step >= index + 1 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-500'}`}>
                            {step > index + 1 ? '✓' : index + 1}
                        </div>
                        <span className="hidden sm:inline">{name}</span>
                    </div>
                ))}
            </div>
        </div>

        <form onSubmit={handleSubmit} className={`p-6 sm:p-8 transition-all duration-300 ${isAnimating ? 'animate-slideOutToLeft' : 'animate-slideInFromRight'}`}>
          {step === 1 && (
            <div className="space-y-5">
              <h2 className="text-2xl font-bold text-gray-800">Informações do Pet e Dono</h2>
              <div>
                  <label htmlFor="petName" className="block text-sm font-medium text-gray-700">Nome do Pet</label>
                  <div className="relative mt-1"><span className="absolute inset-y-0 left-0 flex items-center pl-3"><PawIcon/></span><input type="text" name="petName" id="petName" value={formData.petName} onChange={handleInputChange} required className="block w-full pl-10 pr-3 py-2.5 bg-gray-50 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-gray-900"/></div>
              </div>
              <div>
                  <label htmlFor="ownerName" className="block text-sm font-medium text-gray-700">Seu Nome</label>
                  <div className="relative mt-1"><span className="absolute inset-y-0 left-0 flex items-center pl-3"><UserIcon/></span><input type="text" name="ownerName" id="ownerName" value={formData.ownerName} onChange={handleInputChange} required className="block w-full pl-10 pr-3 py-2.5 bg-gray-50 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-gray-900"/></div>
              </div>
              <div>
                  <label htmlFor="whatsapp" className="block text-sm font-medium text-gray-700">WhatsApp</label>
                  <div className="relative mt-1"><span className="absolute inset-y-0 left-0 flex items-center pl-3"><WhatsAppIcon/></span><input type="tel" name="whatsapp" id="whatsapp" value={formData.whatsapp} onChange={handleInputChange} required placeholder="(XX) XXXXX-XXXX" maxLength={15} className="block w-full pl-10 pr-3 py-2.5 bg-gray-50 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-gray-900"/></div>
              </div>
            </div>
          )}
          
          {step === 2 && (
            <div className="space-y-6">
                <h2 className="text-2xl font-bold text-gray-800">Escolha os Serviços</h2>
                <div>
                    <h3 className="text-md font-semibold text-gray-700 mb-2">1. Serviço Principal</h3>
                    <div className="grid grid-cols-2 gap-4">
                        {(Object.keys(SERVICES) as ServiceType[]).map(key => (
                            <button type="button" key={key} onClick={() => setSelectedService(key)} className={`p-4 rounded-xl text-center font-semibold transition-all border-2 flex flex-col items-center justify-center h-full ${selectedService === key ? 'bg-blue-600 text-white border-blue-600 shadow-lg' : 'bg-white hover:bg-blue-50 border-gray-200'}`}>
                                <span className="text-lg">{SERVICES[key].label}</span>
                            </button>
                        ))}
                    </div>
                </div>
                <div>
                    <label htmlFor="petWeight" className="block text-md font-semibold text-gray-700 mb-2">2. Peso do Pet</label>
                    <select id="petWeight" value={selectedWeight || ''} onChange={handleWeightChange} required className="block w-full py-3 px-3 bg-gray-50 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-gray-900">
                        <option value="" disabled>Selecione o peso</option>
                        {(Object.keys(PET_WEIGHT_OPTIONS) as PetWeight[]).map(key => (<option key={key} value={key}>{PET_WEIGHT_OPTIONS[key]}</option>))}
                    </select>
                </div>
                <div>
                     <h3 className="text-md font-semibold text-gray-700 mb-2">3. Serviços Adicionais (Opcional)</h3>
                     <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
                        {ADDON_SERVICES.map(addon => {
                            const isDisabled = !selectedWeight || !selectedService || addon.excludesWeight?.includes(selectedWeight!) || (addon.requiresWeight && !addon.requiresWeight.includes(selectedWeight!)) || (addon.requiresService && addon.requiresService !== selectedService);
                            return (
                                <label key={addon.id} className={`flex items-center p-3 rounded-lg border-2 transition-all ${isDisabled ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'cursor-pointer hover:bg-blue-50'} ${selectedAddons[addon.id] ? 'border-blue-500 bg-blue-50' : 'border-gray-200'}`}>
                                    <input type="checkbox" onChange={() => handleAddonToggle(addon.id)} checked={!!selectedAddons[addon.id]} disabled={isDisabled} className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                                    <span className="ml-2.5">{addon.label}</span>
                                </label>
                            );
                        })}
                     </div>
                 </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6">
                <h2 className="text-2xl font-bold text-gray-800">Selecione Data e Hora</h2>
                <div>
                    <h3 className="text-md font-semibold text-gray-700 mb-2 text-center">Data</h3>
                    <Calendar selectedDate={selectedDate} onDateChange={setSelectedDate} />
                </div>
                <div>
                    <h3 className="text-md font-semibold text-gray-700 mb-2 text-center">Horários Disponíveis</h3>
                    <TimeSlotPicker selectedDate={selectedDate} selectedService={selectedService} appointments={appointments} onTimeSelect={setSelectedTime} selectedTime={selectedTime}/>
                </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-4">
              <h2 className="text-2xl font-bold text-gray-800 text-center">Confirme seu Agendamento</h2>
              <div className="p-4 bg-gray-50 rounded-lg space-y-2 text-gray-700">
                <p><strong>Pet:</strong> {formData.petName}</p>
                <p><strong>Responsável:</strong> {formData.ownerName}</p>
                <p><strong>Data:</strong> {selectedDate.toLocaleDateString('pt-BR')}</p>
                <p><strong>Horário:</strong> {selectedTime}:00</p>
                <p><strong>Serviço:</strong> {SERVICES[selectedService!].label}</p>
                <p><strong>Peso:</strong> {PET_WEIGHT_OPTIONS[selectedWeight!]}</p>
                {ADDON_SERVICES.filter(a => selectedAddons[a.id]).length > 0 && (
                  <p><strong>Adicionais:</strong> {ADDON_SERVICES.filter(a => selectedAddons[a.id]).map(a => a.label).join(', ')}</p>
                )}
              </div>
              <div className="mt-4 pt-4 border-t border-gray-200 text-center">
                  <h4 className="text-lg font-medium text-gray-600">Valor Total Estimado</h4>
                  <p className="text-4xl font-bold text-blue-800">R$ {totalPrice.toFixed(2).replace('.', ',')}</p>
              </div>
            </div>
          )}
        
          <div className="mt-8 flex justify-between items-center">
            {step > 1 && (
              <button type="button" onClick={() => changeStep(step - 1)} className="bg-gray-200 text-gray-800 font-bold py-2.5 px-5 rounded-lg hover:bg-gray-300 transition-colors">Voltar</button>
            )}
            <div className="flex-grow"></div>
            {step < 4 && <button type="button" onClick={() => changeStep(step + 1)} disabled={(step === 1 && !isStep1Valid) || (step === 2 && !isStep2Valid) || (step === 3 && !isStep3Valid)} className="w-full md:w-auto bg-blue-600 text-white font-bold py-2.5 px-5 rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed ml-auto">Avançar</button>}
            {step === 4 && <button type="submit" disabled={isSubmitting} className="w-full md:w-auto bg-green-500 text-white font-bold py-2.5 px-5 rounded-lg hover:bg-green-600 transition-colors disabled:bg-gray-300 disabled:text-gray-500">{isSubmitting ? 'Agendando...' : 'Confirmar Agendamento'}</button>}
          </div>

        </form>
      </main>

      {isModalOpen && (
        <div className="fixed inset-0 bg-blue-600 bg-opacity-90 flex items-center justify-center z-50 animate-fadeIn p-4">
            <div className="text-center bg-white p-8 rounded-2xl shadow-2xl max-w-sm mx-auto animate-scaleIn">
                <SuccessIcon />
                <h2 className="text-3xl font-bold text-blue-800 mb-2">Agendado com Sucesso!</h2>
                <p className="text-gray-600">Recebemos seu pedido de agendamento. Você receberá uma confirmação em breve no WhatsApp. Obrigado!</p>
            </div>
        </div>
      )}
    </div>
  );
}