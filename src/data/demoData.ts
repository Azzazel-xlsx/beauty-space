/**
 * DATOS DE DEMOSTRACIÓN / PRUEBAS (DEMO DATA)
 * 
 * Este módulo contiene registros ficticios de prueba (clientas, servicios, citas,
 * movimientos financieros y extras de nail art) para fines de demostración local.
 * 
 * NINGUNO de estos datos se carga automáticamente en entornos limpios o producción.
 * Para poblar datos de prueba manualmente en desarrollo, use la función `loadDemoData()`.
 */

import { Client, Service, Appointment, FinancialMovement, SpecialPrice, Extra } from '../types';

export const SEED_CLIENTS: Client[] = [
  {
    id: 'client-1',
    name: 'Lucía Méndez',
    phone: '+52 55 5432 1098',
    email: 'lucia.mendez@example.com',
    notes: 'Cliente VIP Diamante. Prefiere diseño floral minimalista y café con leche de almendras.',
    photoUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAfCHcOAPfDy6kGjzyxZw6RiWt1jw0ZjkZLcwLo1TqbBzRl46Qu1xvQTb6Gla396xyP11FUvxTudM8ZLGWuzv3g6SR2L7LHQucAnq2u_1TcK8U8F1-z796XJoDBpuKBOThnFRz_HkuUUCgNltlu7cz9jZ02br0Yz5p1HZDqJA6wAHBo1LVKThCCDBLiGPGkY5VJSl04n1C7_ykP8_z9JDDD-vLA8NB_aX_btxu95yCCJDbzK9mj2gjC',
    createdAt: '2023-01-15'
  },
  {
    id: 'client-2',
    name: 'Martina Rossi',
    phone: '+52 55 8765 4321',
    email: 'martina.rossi@example.com',
    notes: 'Amiga cercana de la fundadora. Le gusta el Kapping con Soft Gel y tonos nudes y pasteles.',
    photoUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBofdI6p2JFfm4lwiD03UfIz4kVMQldsbp-fwLam3qeXWycxcZR9bEmCvuU_Se0NsH8ZMy_X0CP_g__0W42tQTnuA78YZTFDgZW0RwZovPrVSetKSiMfPzgyB5V1SyLKVhwBsqLt-jKlSVlbQ8aikYF3KqwRqla6d7YxtwozCFAZ7Dv62be1tMHZkOfUM3d-iEP8jRqR4BxUnC-nQbRW1xom3sOZgIPtFNR9gwbX55Pj13M_tjEG8Kh',
    createdAt: '2023-03-22'
  },
  {
    id: 'client-3',
    name: 'Sofía Castro',
    phone: '+52 55 1122 3344',
    email: 'sofia.castro@example.com',
    notes: 'Cuenta actualmente pausada por viaje largo. Su servicio favorito es el Esmaltado Semipermanente.',
    photoUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuD9HIJrG8f59wWNWDQKR59Mb7molSuHZcoRik_7jmguz63utzQf6-uUZ_hx7KlA1i6Gyb9kDsFzXGf5prdFrm9fGTCD1BWN9HE-VYTC80rT-nwYwd_FMs8pNMXT-w6HZ5aYWWQfx1lX5ReJZNW9X09vHuYXd_csIRhHCuX4M6skrox9dqFgTsft-vln3SyhXAaX1ahv18oo4LIqPZhMJytmR8LYXixRcEglw-YfZfogs24t2D_kZoRH',
    createdAt: '2023-05-10'
  },
  {
    id: 'client-4',
    name: 'Valeria Castillo',
    phone: '+52 55 1234 5678',
    email: 'valeria.castillo@example.com',
    notes: 'Fiel seguidora del estilo coquette. Siempre pide adornos tridimensionales de moños.',
    photoUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBmWgXYqQmqLcdtJJhsjvpqkOIaeYooO2kYEPLBaeMNag2pxKBpQZO0OvxJFsXPxo053gGYQAgxJ0bs8hs55PsaYmzL7vrF2iELzv7F4M2VQVZ3mKSo-rjpAi3hw_9nPW3WCYdNuPt28ZgS480vb3umd18ngJ4vfpUW2XEHJpIlRJ9e301nLMYMx6eCmjDcYx9-14UvxVtU4dIbBgUAGqha44D54XwtGaV0TvJPkOfP99StX4feX3zr',
    createdAt: '2023-02-14'
  },
  {
    id: 'client-5',
    name: 'Mariana De la Rosa',
    phone: '+52 55 9876 5432',
    email: 'mariana.rosa@example.com',
    notes: 'Prefiere tonos oscuros o cereza en otoño. Muy puntual y reservada.',
    photoUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCrQFZ8zon5OqIdBYLBmY5ppuMsBNkToc86eUVA12msbRwaw1fMj0YzAyS3fpNUx4Ys4GaN3pCr1wXOAML3uF6SF6UhlnPQrW_V7ApAME5VqNP_OKnuTKk7Ko3ILG_Mvo-LAs2ktLdNeHtuqXqQVxEe7hcQgAJqHcNt0FKynnF9V5Ajk3H8pPQCBBwxYcPy39Xipxhy2Ql9XqqBdjFjDav-jLZr-tIYcXTaJHGriAJ7SY678kIWWoN6',
    createdAt: '2023-04-18'
  },
  {
    id: 'client-6',
    name: 'Camila Torres',
    phone: '+52 55 4433 2211',
    email: 'camila.torres@example.com',
    notes: 'Le encanta el Nail Art editorial y diseños geométricos modernos.',
    photoUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCcEbq6hKwbgCRyY5dtUsMWUPWY3kGfiMTavhdjYrhYDtFRG5CvnCT6HGQIIJ94JlNITsd-7ytXgPrKGLmCOp6ENzXPiQczDEmk6ljtbTc3UHJpAFahOzgtCGeSy5fLzYPkW7KbqanX9p-n3eiQmc2O-9q3IvlhCj2LKYvXe1rmgyJm1obgudu4--p4LBygM5ZSrEeDpfkE-1dJ95RxVst5M2iF6ggwMDdNRJfEr1VAATTDuGpei0Go',
    createdAt: '2023-06-01'
  },
  {
    id: 'client-7',
    name: 'Isabella Jiménez',
    phone: '+52 55 6677 8899',
    email: 'isabella.jimenez@example.com',
    notes: 'Prefiere atención silenciosa. Exigente con la alineación de la cutícula.',
    photoUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBQRRqRd7HBEQWSDUAXJCIHjRAQXA2n5D1diEHHN7Fe3V40Uz4GVn2ek4I0fmAQNZCl6L0dG5yBDNFvI_PpJws0gzl6f5gM3sq947Ev3p52_ScR80btPJFF2G1tYQwFzxjzjs8oeCLzBCPEhBS5atYoRMDAOw3hf-dHhVCR7SFH5MQcAZlZMjlXNTgzSYMp6Ok9SYKmELgZ_VSicCvUO2CLb0T3emI7f9ZZiaYzTuwRFwA_Xcu5otbg',
    createdAt: '2023-07-29'
  },
  {
    id: 'client-8',
    name: 'Carla Rivera',
    phone: '+52 55 3344 5566',
    email: 'carla.rivera@example.com',
    notes: 'Le gusta el retoque acrílico y los masajes de spa. Trae a su perrito a las sesiones.',
    photoUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDozwP_jdzjNY1s2fxlwyCnaP9vNfSOZTygULiECzsCQqJDCg3VTfIbBrpKRCpaO0jsbMN94wK6H1PCObtY4-h-3IBrdmXsQXvgKaBDdysFH0NL_vTjUXnSEOFb_STweo7ImTdnyod2loQoQegpPEUS5NboHLnXpkE0JZ2iUOPLAetQLbIBJzKi-CNxkceYu_eqafT9eJZsvhRRClwed3OBRuVPNIaFuYdpsw7nxDmUbIMOCS-IJgJh',
    createdAt: '2023-08-14'
  },
  {
    id: 'client-9',
    name: 'Valentina Moretti',
    phone: '+34 612 345 678',
    email: 'valentina.m@email.com',
    notes: 'Prefiere esmalte semipermanente mate. Sensibilidad leve en cutículas. Toma café con leche vegetal.',
    photoUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDOH_J7RhgqdXYsX3NCi5aBMi3tYJUSLVHyHT_STpc78QW6c3mOZEp2uZCUiuldxz_ogqa_6XSki_GvcGrzYlc1dpccBw-ufK_PsArQyeKsUQ4XIp7JvdcJBoHraHpO251dFaYlNYVZ_JsLTvOcT-SFonicy884E3EIf-8eYADQNIU6xBlt73OkuscwPJZgCWmpYUT0NTAmU6dhMTTRE5XsJIdmeZ7pJeZ7i2GPU3JVnDDakG9Y2xnr',
    createdAt: '2023-02-12'
  }
];

export const SEED_SERVICES: Service[] = [
  {
    id: 'service-1',
    name: 'Manicura Rusa',
    description: 'Limpieza profunda con torno, corte de cutícula y esmaltado de alta precisión.',
    basePrice: 850,
    priceHistory: [
      { date: '2024-01-01', price: 850 },
      { date: '2023-08-01', price: 780 },
      { date: '2023-01-01', price: 700 }
    ]
  },
  {
    id: 'service-2',
    name: 'Soft Gel Extensión',
    description: 'Sistema de extensión de uñas express con acabado natural y duradero.',
    basePrice: 650,
    priceHistory: [
      { date: '2023-11-01', price: 650 },
      { date: '2023-01-01', price: 550 }
    ]
  },
  {
    id: 'service-3',
    name: 'Nail Art Hand-Painted',
    description: 'Diseños artísticos a mano alzada. El precio varía según complejidad del diseño.',
    basePrice: 150,
    priceHistory: [
      { date: '2023-06-01', price: 150 }
    ]
  },
  {
    id: 'service-4',
    name: 'Gel X Extensiones',
    description: 'Soporte completo de extensión de gel suave, súper resistente y diseño semi-editorial.',
    basePrice: 1200,
    priceHistory: [
      { date: '2024-02-01', price: 1200 },
      { date: '2023-06-01', price: 1000 }
    ]
  },
  {
    id: 'service-5',
    name: 'Nail Art Editorial',
    description: 'Nivel avanzado de decoración, moños 3D, perlas, relieves y encapsulados de alta gama.',
    basePrice: 1500,
    priceHistory: [
      { date: '2023-10-01', price: 1500 }
    ]
  },
  {
    id: 'service-6',
    name: 'Retiro & Cuidado',
    description: 'Remoción segura de geles/acrílicos sin dañar la uña natural, más nutrición profunda.',
    basePrice: 400,
    priceHistory: [
      { date: '2023-01-01', price: 400 }
    ]
  },
  {
    id: 'service-7',
    name: 'Pedicura Luxury',
    description: 'Tratamiento completo de exfoliación, mascarilla, masaje de pies y esmaltado de alta gama.',
    basePrice: 1100,
    priceHistory: [
      { date: '2023-05-01', price: 1100 }
    ]
  }
];

export const SEED_SPECIAL_PRICES: SpecialPrice[] = [
  {
    id: 'special-1',
    clientId: 'client-1',
    serviceId: 'service-4',
    specialPrice: 4500,
    groupLabel: 'VIP DIAMANTE',
    isActive: true
  },
  {
    id: 'special-2',
    clientId: 'client-2',
    serviceId: 'service-2',
    specialPrice: 3200,
    groupLabel: 'AMIGA & FAMILIA',
    isActive: true
  },
  {
    id: 'special-3',
    clientId: 'client-3',
    serviceId: 'service-1',
    specialPrice: 1800,
    groupLabel: 'CUENTA PAUSADA',
    isActive: false
  }
];

export const SEED_APPOINTMENTS: Appointment[] = [
  {
    id: 'appt-1',
    clientId: 'client-1',
    serviceId: 'service-2',
    date: '2026-07-15',
    time: '09:00',
    duration: 90,
    isHomeVisit: true,
    status: 'completed',
    priceCharged: 650
  },
  {
    id: 'appt-2',
    clientId: 'client-8',
    serviceId: 'service-4',
    date: '2026-07-15',
    time: '11:30',
    duration: 120,
    isHomeVisit: false,
    status: 'completed',
    priceCharged: 1200
  },
  {
    id: 'appt-3',
    clientId: 'client-4',
    serviceId: 'service-5',
    date: '2026-07-16',
    time: '14:30',
    duration: 120,
    isHomeVisit: false,
    status: 'pending',
    priceCharged: 1500
  },
  {
    id: 'appt-4',
    clientId: 'client-5',
    serviceId: 'service-1',
    date: '2026-07-17',
    time: '16:00',
    duration: 60,
    isHomeVisit: false,
    status: 'pending',
    priceCharged: 850
  }
];

export const SEED_FINANCIALS: FinancialMovement[] = [
  {
    id: 'move-1',
    type: 'income',
    category: 'Manicura Rusa',
    amount: 14200,
    date: '2026-07-15',
    description: 'Servicio Manicura Rusa - Valeria Castillo',
    paymentMethod: 'EFECTIVO',
    clientName: 'Valeria Castillo'
  },
  {
    id: 'move-2',
    type: 'income',
    category: 'Soft Gel Extensión',
    amount: 4250,
    date: '2026-07-15',
    description: 'Pre-pago cita Lucía Méndez',
    paymentMethod: 'TRANSFERENCIA',
    clientName: 'Lucía Méndez'
  },
  {
    id: 'move-3',
    type: 'expense',
    category: 'Suministros & Esmaltes',
    amount: 12400,
    date: '2026-07-10',
    description: 'Colección esmaltes de otoño OPI & Gelish'
  },
  {
    id: 'move-4',
    type: 'expense',
    category: 'Mantenimiento Equipo',
    amount: 8200,
    date: '2026-07-05',
    description: 'Service completo torno profesional Marathon'
  },
  {
    id: 'move-5',
    type: 'expense',
    category: 'Publicidad & RRSS',
    amount: 13600,
    date: '2026-07-01',
    description: 'Campaña Instagram Ads Novias & Madrinas'
  },
  {
    id: 'move-6',
    type: 'income',
    category: 'Gel X Extensiones',
    amount: 68000,
    date: '2026-06-15',
    description: 'Acumulado mensual servicios de Junio',
    paymentMethod: 'TRANSFERENCIA'
  },
  {
    id: 'move-7',
    type: 'income',
    category: 'Nail Art Editorial',
    amount: 56050,
    date: '2026-07-12',
    description: 'Facturación acumulada Julio primera quincena',
    paymentMethod: 'TARJETA'
  }
];

export const SEED_EXTRAS: Extra[] = [
  {
    id: 'extra-1',
    name: 'Espejo',
    pricePerNail: 1000,
    serviceId: null,
    priceHistory: [{ date: '2024-01-01', price: 1000, reason: 'Tarifa inicial' }]
  },
  {
    id: 'extra-2',
    name: 'Aurora',
    pricePerNail: 1000,
    serviceId: null,
    priceHistory: [{ date: '2024-01-01', price: 1000, reason: 'Tarifa inicial' }]
  },
  {
    id: 'extra-3',
    name: 'Azúcar',
    pricePerNail: 1000,
    serviceId: null,
    priceHistory: [{ date: '2024-01-01', price: 1000, reason: 'Tarifa inicial' }]
  },
  {
    id: 'extra-4',
    name: 'Suéter',
    pricePerNail: 1200,
    serviceId: null,
    priceHistory: [{ date: '2024-01-01', price: 1200, reason: 'Tarifa inicial' }]
  },
  {
    id: 'extra-5',
    name: 'Perla',
    pricePerNail: 1000,
    serviceId: null,
    priceHistory: [{ date: '2024-01-01', price: 1000, reason: 'Tarifa inicial' }]
  },
  {
    id: 'extra-6',
    name: 'Glitter',
    pricePerNail: 1000,
    serviceId: null,
    priceHistory: [{ date: '2024-01-01', price: 1000, reason: 'Tarifa inicial' }]
  },
  {
    id: 'extra-7',
    name: 'Carey',
    pricePerNail: 1500,
    serviceId: null,
    priceHistory: [{ date: '2024-01-01', price: 1500, reason: 'Tarifa inicial' }]
  },
  {
    id: 'extra-8',
    name: 'Blooming',
    pricePerNail: 1500,
    serviceId: null,
    priceHistory: [{ date: '2024-01-01', price: 1500, reason: 'Tarifa inicial' }]
  },
  {
    id: 'extra-9',
    name: 'Ojo de gato',
    pricePerNail: 1500,
    serviceId: null,
    priceHistory: [{ date: '2024-01-01', price: 1500, reason: 'Tarifa inicial' }]
  },
  {
    id: 'extra-10',
    name: 'Relieve',
    pricePerNail: 1800,
    serviceId: null,
    priceHistory: [{ date: '2024-01-01', price: 1800, reason: 'Tarifa inicial' }]
  },
  {
    id: 'extra-11',
    name: '3D',
    pricePerNail: 2000,
    serviceId: null,
    priceHistory: [{ date: '2024-01-01', price: 2000, reason: 'Tarifa inicial' }]
  },
  {
    id: 'extra-12',
    name: 'Francés',
    pricePerNail: 1000,
    serviceId: null,
    priceHistory: [{ date: '2024-01-01', price: 1000, reason: 'Tarifa inicial' }]
  },
  {
    id: 'extra-13',
    name: 'Nail Art simple',
    pricePerNail: 1200,
    serviceId: null,
    priceHistory: [{ date: '2024-01-01', price: 1200, reason: 'Tarifa inicial' }]
  },
  {
    id: 'extra-14',
    name: 'Encapsulado',
    pricePerNail: 1500,
    serviceId: null,
    priceHistory: [{ date: '2024-01-01', price: 1500, reason: 'Tarifa inicial' }]
  },
  {
    id: 'extra-15',
    name: 'Naturaleza muerta',
    pricePerNail: 1500,
    serviceId: null,
    priceHistory: [{ date: '2024-01-01', price: 1500, reason: 'Tarifa inicial' }]
  },
  {
    id: 'extra-16',
    name: 'Dijes',
    pricePerNail: 1500,
    serviceId: null,
    priceHistory: [{ date: '2024-01-01', price: 1500, reason: 'Tarifa inicial' }]
  },
  {
    id: 'extra-17',
    name: 'Sticker',
    pricePerNail: 1200,
    serviceId: null,
    priceHistory: [{ date: '2024-01-01', price: 1200, reason: 'Tarifa inicial' }]
  },
  {
    id: 'extra-18',
    name: 'Hoja de oro',
    pricePerNail: 1000,
    serviceId: null,
    priceHistory: [{ date: '2024-01-01', price: 1000, reason: 'Tarifa inicial' }]
  },
  {
    id: 'extra-19',
    name: 'Diseño de cristales',
    pricePerNail: 1000,
    serviceId: null,
    priceHistory: [{ date: '2024-01-01', price: 1000, reason: 'Tarifa inicial' }]
  }
];

/**
 * Función explícita y opt-in para poblar datos de prueba en desarrollo.
 * NUNCA se invoca de forma automática al iniciar la app.
 */
export function loadDemoData(): {
  clients: Client[];
  services: Service[];
  specialPrices: SpecialPrice[];
  appointments: Appointment[];
  financials: FinancialMovement[];
  extras: Extra[];
} {
  return {
    clients: [...SEED_CLIENTS],
    services: [...SEED_SERVICES],
    specialPrices: [...SEED_SPECIAL_PRICES],
    appointments: [...SEED_APPOINTMENTS],
    financials: [...SEED_FINANCIALS],
    extras: [...SEED_EXTRAS]
  };
}
