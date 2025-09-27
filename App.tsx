
import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { Appointment, ServiceType, PetWeight } from './types';
import { SERVICES, WORKING_HOURS, MAX_CAPACITY_PER_SLOT, LUNCH_HOUR, PET_WEIGHT_OPTIONS, BASE_PRICES, ADDON_SERVICES, AddonService } from './constants';

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
    .replace(/\D/g, '') // Remove tudo que não é dígito
    .replace(/^(\d{2})(\d)/, '($1) $2') // Coloca parênteses em volta dos dois primeiros dígitos
    .replace(/(\d{5})(\d)/, '$1-$2')   // Coloca hífen entre o quinto e o sexto dígitos (para celular)
    .slice(0, 15); // Limita o tamanho máximo para (XX) XXXXX-XXXX
};

// --- SVG ICONS ---

const ChevronLeftIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
  </svg>
);

const ChevronRightIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
  </svg>
);


// --- UI COMPONENTS ---

interface CalendarProps {
  selectedDate: Date;
  onDateChange: (date: Date) => void;
}

const Calendar: React.FC<CalendarProps> = ({ selectedDate, onDateChange }) => {
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

  const handlePrevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  const dayNames = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

  return (
    <div className="bg-white p-4 rounded-lg shadow-inner">
      <div className="flex items-center justify-between mb-4">
        <button type="button" onClick={handlePrevMonth} className="p-2 rounded-full hover:bg-gray-100">
          <ChevronLeftIcon className="w-5 h-5 text-gray-600" />
        </button>
        <h3 className="font-bold text-lg text-gray-800">
          {currentMonth.toLocaleString('pt-BR', { month: 'long', year: 'numeric' })}
        </h3>
        <button type="button" onClick={handleNextMonth} className="p-2 rounded-full hover:bg-gray-100">
          <ChevronRightIcon className="w-5 h-5 text-gray-600" />
        </button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-sm text-gray-500">
        {dayNames.map((d, i) => <div key={i} className="font-semibold">{d}</div>)}
        {days.map((d, i) => {
          const isSelected = isSameDay(d, selectedDate);
          const isCurrentMonth = d.getMonth() === currentMonth.getMonth();
          const isDisabled = isWeekend(d) || !isCurrentMonth || isPastDate(d);
          
          let btnClass = "w-10 h-10 rounded-full flex items-center justify-center transition-colors";
          if (isDisabled) {
            btnClass += " text-gray-300 cursor-not-allowed";
          } else {
            if (isSelected) {
              btnClass += " bg-blue-500 text-white font-bold shadow-md";
            } else {
              btnClass += " hover:bg-blue-100";
            }
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

interface TimeSlotPickerProps {
    selectedService: ServiceType | null;
    selectedDate: Date;
    appointments: Appointment[];
    onTimeSelect: (time: number) => void;
    selectedTime: number | null;
}

const TimeSlotPicker: React.FC<TimeSlotPickerProps> = ({ selectedService, selectedDate, appointments, onTimeSelect, selectedTime }) => {
    
    const slotCounts = useMemo(() => {
        const counts: Record<number, number> = {};
        WORKING_HOURS.forEach(hour => counts[hour] = 0);

        const appointmentsForDay = appointments.filter(app => isSameDay(app.startTime, selectedDate));
        
        appointmentsForDay.forEach(app => {
            const startHour = app.startTime.getHours();
            const duration = Math.round((app.endTime.getTime() - app.startTime.getTime()) / (1000 * 60 * 60));

            for (let i = 0; i < duration; i++) {
                const hour = startHour + i;
                if (counts[hour] !== undefined) {
                    counts[hour]++;
                }
            }
        });
        return counts;
    }, [selectedDate, appointments]);

    const isSlotAvailable = useCallback((hour: number): boolean => {
        if (!selectedService) return false;

        const serviceDuration = SERVICES[selectedService].duration;

        // Rule: Service cannot end after 6 PM (18:00)
        if (hour + serviceDuration > 18) {
            return false;
        }

        if (serviceDuration === 1) {
             if (hour === LUNCH_HOUR) return false;
             return (slotCounts[hour] || 0) < MAX_CAPACITY_PER_SLOT;
        }

        if (serviceDuration === 2) {
            const nextHour = hour + 1;
            
            // Rule: Cannot start at or cross lunch time, except for the 11:00 slot
            if (hour === LUNCH_HOUR || nextHour === LUNCH_HOUR) {
                if (hour === 11) { // 11:00 to 13:00 booking is allowed
                     return (slotCounts[11] || 0) < MAX_CAPACITY_PER_SLOT;
                }
                return false;
            }
            
            // Check capacity for both hours
            return (slotCounts[hour] || 0) < MAX_CAPACITY_PER_SLOT && (slotCounts[nextHour] || 0) < MAX_CAPACITY_PER_SLOT;
        }

        return true; // Should not be reached with current services
    }, [selectedService, slotCounts]);

    if (!selectedService) {
        return <div className="text-center text-gray-500 py-4">Por favor, selecione um serviço para ver os horários.</div>;
    }

    if (isWeekend(selectedDate) || isPastDate(selectedDate)) {
        return <div className="text-center text-gray-500 py-4">Não há agendamentos para fins de semana ou datas passadas.</div>
    }

    return (
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
            {WORKING_HOURS.map(hour => {
                const available = isSlotAvailable(hour);
                return (
                    <button
                        type="button"
                        key={hour}
                        onClick={() => available && onTimeSelect(hour)}
                        disabled={!available}
                        className={`p-2 rounded-lg text-sm font-semibold transition-all ${
                            selectedTime === hour
                                ? 'bg-blue-500 text-white shadow-lg scale-105'
                                : !available
                                ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                                : 'bg-gray-100 hover:bg-blue-100 text-gray-800'
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
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [formData, setFormData] = useState({
      petName: '',
      ownerName: '',
      whatsapp: ''
  });
  
  const [selectedService, setSelectedService] = useState<ServiceType | null>(null);
  const [selectedWeight, setSelectedWeight] = useState<PetWeight | null>(null);
  const [selectedAddons, setSelectedAddons] = useState<Record<string, boolean>>({});
  const [totalPrice, setTotalPrice] = useState(0);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedTime, setSelectedTime] = useState<number | null>(null);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    // Reset time when date or service changes
    setSelectedTime(null);
  }, [selectedDate, selectedService]);
  
  useEffect(() => {
    if (!selectedService || !selectedWeight) {
        setTotalPrice(0);
        return;
    }

    const basePrice = BASE_PRICES[selectedWeight][selectedService];
    let addonsPrice = 0;

    Object.keys(selectedAddons).forEach(addonId => {
        if (selectedAddons[addonId]) {
            const addon = ADDON_SERVICES.find(a => a.id === addonId);
            if (addon) {
                addonsPrice += addon.price;
            }
        }
    });

    setTotalPrice(basePrice + addonsPrice);
}, [selectedService, selectedWeight, selectedAddons]);


  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    if (name === 'whatsapp') {
      setFormData(prev => ({ ...prev, [name]: formatWhatsapp(value) }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleServiceChange = (service: ServiceType) => {
    setSelectedService(service);
  };
  
  const handleWeightChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
      const newWeight = e.target.value as PetWeight;
      setSelectedWeight(newWeight);

      // Reset incompatible addons when weight changes
      const newAddons = {...selectedAddons};
      ADDON_SERVICES.forEach(addon => {
          if (selectedAddons[addon.id]) {
            const isExcluded = addon.excludesWeight?.includes(newWeight);
            const requiresNotMet = addon.requiresWeight && !addon.requiresWeight.includes(newWeight);
            if(isExcluded || requiresNotMet) {
                newAddons[addon.id] = false;
            }
          }
      });
      setSelectedAddons(newAddons);
  }
  
  const handleAddonToggle = (addonId: string) => {
    const newAddons = { ...selectedAddons };
    
    // Toggle the selected addon
    newAddons[addonId] = !newAddons[addonId];

    // Mutually exclusive logic for Patacure
    if (addonId === 'patacure1' && newAddons[addonId]) {
        newAddons['patacure2'] = false;
    } else if (addonId === 'patacure2' && newAddons[addonId]) {
        newAddons['patacure1'] = false;
    }

    setSelectedAddons(newAddons);
  };

  const isFormValid = !!(formData.petName && formData.ownerName && formData.whatsapp && selectedService && selectedWeight && selectedTime !== null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid) {
        alert("Por favor, preencha todos os campos e selecione serviço, peso e horário.");
        return;
    }
    
    setIsSubmitting(true);

    const startTime = new Date(selectedDate);
    startTime.setHours(selectedTime!, 0, 0, 0);
    const duration = SERVICES[selectedService!].duration;
    const endTime = new Date(startTime.getTime() + duration * 60 * 60 * 1000);
    
    const newAppointment: Appointment = {
      id: new Date().toISOString(),
      petName: formData.petName,
      ownerName: formData.ownerName,
      whatsapp: formData.whatsapp,
      service: selectedService!,
      startTime,
      endTime,
    };

    const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbw5TO-nb7hriuJoG4s2UQXANNFurLdsybOpOwuNXH7OeSDt3oFmHTgVHya7hUoO_hrDsQ/exec";
    const N8N_WEBHOOK_URL = "https://n8n.intelektus.tech/webhook/form-agendamento";
    
    const selectedAddonLabels = ADDON_SERVICES
      .filter(addon => selectedAddons[addon.id])
      .map(addon => addon.label);

    const submissionData = {
        id: newAppointment.id,
        startTime: newAppointment.startTime.toISOString(),
        petName: newAppointment.petName,
        ownerName: newAppointment.ownerName,
        whatsapp: newAppointment.whatsapp,
        service: SERVICES[newAppointment.service].label,
        weight: PET_WEIGHT_OPTIONS[selectedWeight!],
        addons: selectedAddonLabels,
        price: totalPrice,
    };

    try {
        const googleSheetRequest = fetch(GOOGLE_SCRIPT_URL, {
            method: 'POST',
            mode: 'no-cors',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(submissionData),
        });

        const n8nWebhookRequest = fetch(N8N_WEBHOOK_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(submissionData),
        });
        
        // Wait for both requests to complete
        await Promise.all([googleSheetRequest, n8nWebhookRequest]);

        // On successful submission, update local state
        setAppointments(prev => [...prev, newAppointment]);
        setIsModalOpen(true);

        setTimeout(() => {
            setIsModalOpen(false);
            // Reset form
            setFormData({ petName: '', ownerName: '', whatsapp: '' });
            setSelectedService(null);
            setSelectedWeight(null);
            setSelectedAddons({});
            setSelectedTime(null);
            setTotalPrice(0);
            setIsSubmitting(false);
        }, 3000);

    } catch (error) {
        console.error("Error submitting data:", error);
        alert(`Não foi possível concluir o agendamento. Tente novamente.\nDetalhes: ${error instanceof Error ? error.message : String(error)}`);
        setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-blue-50 min-h-screen flex items-center justify-center p-4">
      <main className="w-full max-w-5xl bg-white rounded-2xl shadow-xl overflow-hidden">
        
        <form onSubmit={handleSubmit} className="flex flex-col md:flex-row">
        
            <div className="w-full md:w-3/5 p-6 md:p-8">
              <header className="flex flex-col md:flex-row items-center text-center md:text-left mb-6">
                <img src="https://i.imgur.com/M3Gt3OA.png" alt="Sandy's Pet Shop Logo" className="h-16 w-16 mr-0 md:mr-4 mb-2 md:mb-0"/>
                <div>
                    <h1 className="font-cookie text-5xl text-blue-800 tracking-wide">Sandy's Pet Shop</h1>
                    <p className="text-gray-600">Agende o banho & tosa do seu pet</p>
                </div>
              </header>

              <div className="space-y-4">
                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <label htmlFor="petName" className="block text-sm font-medium text-gray-700">Nome do Pet</label>
                        <div className="relative mt-1">
                            <span className="absolute inset-y-0 left-0 flex items-center pl-3">
                                <img src="https://static.thenounproject.com/png/pet-icon-7176996-512.png" alt="Ícone de Pet" className="h-5 w-5 opacity-50"/>
                            </span>
                            <input type="text" name="petName" id="petName" value={formData.petName} onChange={handleInputChange} required className="block w-full pl-10 pr-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"/>
                        </div>
                    </div>
                     <div>
                        <label htmlFor="ownerName" className="block text-sm font-medium text-gray-700">Nome do Responsável</label>
                        <div className="relative mt-1">
                            <span className="absolute inset-y-0 left-0 flex items-center pl-3">
                                <img src="https://static.thenounproject.com/png/profile-icon-709597-512.png" alt="Ícone de Responsável" className="h-5 w-5 opacity-50"/>
                            </span>
                            <input type="text" name="ownerName" id="ownerName" value={formData.ownerName} onChange={handleInputChange} required className="block w-full pl-10 pr-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"/>
                        </div>
                    </div>
                </div>
                <div>
                    <label htmlFor="whatsapp" className="block text-sm font-medium text-gray-700">WhatsApp</label>
                    <div className="relative mt-1">
                        <span className="absolute inset-y-0 left-0 flex items-center pl-3">
                            <img src="https://static.thenounproject.com/png/whatsapp-icon-6272210-512.png" alt="Ícone do WhatsApp" className="h-5 w-5 opacity-50"/>
                        </span>
                        <input type="tel" name="whatsapp" id="whatsapp" value={formData.whatsapp} onChange={handleInputChange} required placeholder="(XX) XXXXX-XXXX" maxLength={15} className="block w-full pl-10 pr-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"/>
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                         <h3 className="text-sm font-medium text-gray-700 mb-2">Serviço Principal</h3>
                         <div className="grid grid-cols-2 gap-3">
                             {(Object.keys(SERVICES) as ServiceType[]).map(key => (
                                 <button type="button" key={key} onClick={() => handleServiceChange(key)} className={`p-3 rounded-lg text-center font-semibold transition-all border-2 h-full ${selectedService === key ? 'bg-blue-500 text-white border-blue-500 shadow-md' : 'bg-white hover:bg-blue-50 border-gray-200'}`}>
                                     {SERVICES[key].label}
                                 </button>
                             ))}
                         </div>
                    </div>
                    <div>
                        <label htmlFor="petWeight" className="block text-sm font-medium text-gray-700 mb-2">Peso do Pet</label>
                        <select id="petWeight" value={selectedWeight || ''} onChange={handleWeightChange} required className="block w-full py-3 px-3 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500">
                            <option value="" disabled>Selecione o peso</option>
                            {(Object.keys(PET_WEIGHT_OPTIONS) as PetWeight[]).map(key => (
                                <option key={key} value={key}>{PET_WEIGHT_OPTIONS[key]}</option>
                            ))}
                        </select>
                    </div>
                </div>

                 <div>
                     <h3 className="text-sm font-medium text-gray-700 mb-2">Serviços Adicionais</h3>
                     <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-sm">
                        {ADDON_SERVICES.map(addon => {
                            const isExcluded = addon.excludesWeight?.includes(selectedWeight!);
                            const requiresNotMet = (addon.requiresWeight && !addon.requiresWeight.includes(selectedWeight!)) || (addon.requiresService && addon.requiresService !== selectedService);
                            const isDisabled = !selectedWeight || !selectedService || isExcluded || requiresNotMet;

                            return (
                                <label key={addon.id} className={`flex items-center p-2 rounded-lg border-2 transition-all ${isDisabled ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'cursor-pointer hover:bg-blue-50'} ${selectedAddons[addon.id] ? 'border-blue-500 bg-blue-50' : 'border-gray-200'}`}>
                                    <input type="checkbox" onChange={() => handleAddonToggle(addon.id)} checked={!!selectedAddons[addon.id]} disabled={isDisabled} className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                                    <span className="ml-2">{addon.label}</span>
                                </label>
                            );
                        })}
                     </div>
                 </div>

                <button type="submit" disabled={!isFormValid || isSubmitting} className="w-full bg-blue-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors hidden md:block mt-4">
                    {isSubmitting ? 'Agendando...' : 'Agendar Horário'}
                </button>
              </div>
            </div>

            <div className="w-full md:w-2/5 p-6 md:p-8 bg-gray-50/70 border-l border-gray-200">
                <div className="space-y-4">
                    <div>
                        <h3 className="text-lg font-semibold text-gray-800 mb-2 text-center">Selecione a Data</h3>
                        <Calendar selectedDate={selectedDate} onDateChange={setSelectedDate} />
                    </div>
                    <div>
                        <h3 className="text-lg font-semibold text-gray-800 mb-2 text-center">Horários Disponíveis</h3>
                        <TimeSlotPicker 
                            selectedDate={selectedDate}
                            selectedService={selectedService}
                            appointments={appointments}
                            onTimeSelect={setSelectedTime}
                            selectedTime={selectedTime}
                        />
                    </div>
                    {totalPrice > 0 && (
                        <div className="mt-4 pt-4 border-t border-gray-200 text-center">
                            <h4 className="text-md font-medium text-gray-600">Valor Total Estimado</h4>
                            <p className="text-3xl font-bold text-blue-800">
                                R$ {totalPrice.toFixed(2).replace('.', ',')}
                            </p>
                        </div>
                    )}
                </div>
                
                <div className="mt-6 md:hidden">
                    <button type="submit" disabled={!isFormValid || isSubmitting} className="w-full bg-blue-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors">
                        {isSubmitting ? 'Agendando...' : 'Agendar Horário'}
                    </button>
                </div>
            </div>

        </form>

      </main>

      {isModalOpen && (
        <div className="fixed inset-0 bg-blue-600 flex items-center justify-center z-50 animate-fadeIn" style={{ animationDuration: '0.3s' }}>
            <div className="text-center">
                <img 
                    src="https://i.imgur.com/M3Gt3OA.png" 
                    alt="Sandy's Pet Shop Logo" 
                    className="h-32 w-32 md:h-40 md:w-40 mx-auto mb-6 rounded-full shadow-2xl opacity-0 animate-scaleIn"
                    style={{ animationDelay: '0.2s' }}
                />
                <h2 
                    className="text-3xl md:text-4xl font-bold text-white tracking-tight opacity-0 animate-fadeInUp"
                    style={{ animationDelay: '0.5s' }}
                >
                    Agendamento Confirmado!
                </h2>
                <p 
                    className="text-blue-100 mt-2 text-lg opacity-0 animate-fadeInUp"
                    style={{ animationDelay: '0.7s' }}
                >
                    Obrigado por escolher o Sandy's Pet Shop!
                </p>
            </div>
        </div>
      )}
    </div>
  );
}
