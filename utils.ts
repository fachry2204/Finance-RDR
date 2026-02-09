
export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

export const formatDate = (dateString: string): string => {
  if (!dateString) return '-';
  
  // Mengantisipasi format YYYY-MM-DD dari database/input date
  // Kita split manual agar tidak terkena pergeseran Timezone browser (GMT+7 dsb)
  const parts = dateString.split('-');
  if (parts.length === 3) {
      const year = parts[0];
      const monthIndex = parseInt(parts[1]) - 1;
      const day = parts[2];

      const months = [
          'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
          'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
      ];

      // Jika monthIndex valid
      if (months[monthIndex]) {
          return `${day} ${months[monthIndex]} ${year}`;
      }
  }

  // Fallback jika format string berbeda (misal timestamp ISO lengkap)
  const options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long', year: 'numeric' };
  return new Date(dateString).toLocaleDateString('id-ID', options);
};

export const getCurrentDateFormatted = (): string => {
  const options: Intl.DateTimeFormatOptions = { 
    weekday: 'long', 
    day: 'numeric', 
    month: 'long', 
    year: 'numeric' 
  };
  return new Date().toLocaleDateString('id-ID', options);
};

export const generateId = (): string => {
  return Math.random().toString(36).substr(2, 9);
};

export const API_BASE_URL = '';
